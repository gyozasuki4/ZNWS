#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const store=JSON.parse(fs.readFileSync(path.join(root,"data","gfe-products.json"),"utf8"));
const now=new Date(),nowIso=now.toISOString(),wmoTime=`${String(now.getUTCDate()).padStart(2,"0")}${String(now.getUTCHours()).padStart(2,"0")}${String(now.getUTCMinutes()).padStart(2,"0")}`;
const candidates=(store.events||[]).filter((event)=>event.automated===true&&event.hazardName==="Flood Watch"&&event.status==="active"&&Date.parse(event.endTime)>now.getTime()&&!/\* ADDITIONAL DETAILS\.\.\./.test(String(event.productText||"")));

function formatTime(iso,wfo){
  const zone={CTP:"America/New_York",ILN:"America/New_York",JKL:"America/New_York",LWX:"America/New_York",PBZ:"America/New_York",RLX:"America/New_York",RNK:"America/New_York"}[wfo]||"UTC";
  return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:zone,timeZoneName:"short"}).format(new Date(iso));
}

function reissueText(event){
  const source=String(event.productText||"").replace(/\r\n?/g,"\n"),lines=source.split("\n"),headlineIndex=lines.findIndex((line)=>/^\.\.\..+\.\.\.$/.test(line.trim())),wmoIndex=lines.findIndex((line)=>/^WGUS\d{2}\s+K[A-Z0-9]{3}\s+\d{6}$/.test(line.trim())),productIndex=lines.findIndex((line)=>/^FFA[A-Z0-9]{3}$/.test(line.trim())),serviceIndex=lines.findIndex((line)=>/^ZASNet Weather Service\b/.test(line.trim())),ugcIndex=lines.findIndex((line)=>/^[A-Z]{3}\d{3}(?:-[A-Z]{3}\d{3})*-\d{6}-$/.test(line.trim())),vtecIndex=lines.findIndex((line)=>/^\/O\.[A-Z]{3}\./.test(line.trim())),hydroIndex=lines.findIndex((line)=>/^\/00000\./.test(line.trim()));
  if([headlineIndex,wmoIndex,productIndex,serviceIndex,ugcIndex,vtecIndex,hydroIndex].some((index)=>index<0))throw new Error(`${event.id}: bulletin structure is incomplete`);
  const area=(event.zones||[]).map((zone)=>zone.name||zone.id).filter(Boolean).join(", ")||"the watch area",when=lines.find((line)=>/^\* WHEN\.\.\./.test(line))?.replace(/^\* WHEN\.\.\./,"").replace(/\.$/,"")||"Through the watch period",qpf=source.match(/forecast rainfall totaling around ([\d.]+) inches/i)?.[1],issuedLabel=formatTime(nowIso,event.wfo),headline=lines[headlineIndex].trim().replace(" IN EFFECT "," REMAINS IN EFFECT ");
  lines[wmoIndex]=lines[wmoIndex].replace(/\d{6}\s*$/,wmoTime);lines[vtecIndex]=lines[vtecIndex].replace(/^\/O\.[A-Z]{3}\./,"/O.CON.");
  const header=["000",lines[wmoIndex].trim(),lines[productIndex].trim(),"","Flood Watch",lines[serviceIndex].trim(),issuedLabel,"",lines[ugcIndex].trim(),lines[vtecIndex].trim(),lines[hydroIndex].trim(),area,issuedLabel,"",headline];
  const details=Number(qpf)>=1?`Forecast guidance shows basin-average rainfall up to around ${qpf} inches, with locally higher amounts possible in repeated storms. The affected area overlaps a WPC Excessive Rainfall Outlook risk area.`:"Repeated heavy rainfall and the WPC Excessive Rainfall Outlook indicate a localized flash-flood threat. Exact totals will vary considerably, especially where storms train over the same locations.";
  const body=["* WHAT...Flash flooding caused by excessive rainfall continues to be possible.","",`* WHERE...Portions of the following forecast zones: ${area}.`,"",`* WHEN...${when}.`,"",`* IMPACTS...${event.impacts||"Excessive runoff may result in flooding of rivers, creeks, streams, and other low-lying and flood-prone locations."}`,"","* ADDITIONAL DETAILS...",`  - ${details}`,"","PRECAUTIONARY/PREPAREDNESS ACTIONS...","","Monitor later forecasts and be ready to act if Flood or Flash Flood Warnings are issued. Avoid low-lying and flood-prone areas, highway dips, and underpasses.","","&&","","$$","","AUTOMATED"];
  return `${header.join("\n")}\n\n${body.join("\n")}`;
}

async function main(){
  const results=[];
  for(const original of candidates){
    const firstZone=String(original.zoneIds?.[0]||"");
    if(!firstZone)throw new Error(`${original.id}: no zone available for NWS verification`);
    const response=await fetch(`https://api.weather.gov/alerts/active?zone=${encodeURIComponent(firstZone.replace(/^([A-Z]{2})(\d{3})$/,"$1Z$2"))}`,{headers:{"User-Agent":"ZASNetWeather/1.0 (https://zasnetwx.com/)",Accept:"application/geo+json"}});
    if(!response.ok)throw new Error(`${original.id}: NWS verification returned ${response.status}`);
    const inventory=await response.json(),confirmed=(inventory.features||[]).some((feature)=>feature.properties?.event==="Flood Watch"&&!((feature.properties?.parameters?.VTEC||[]).some((value)=>/^\/O\.(?:CAN|EXP|UPG)\./i.test(String(value))))&&Date.parse(feature.properties?.expires||0)>Date.now());
    if(!confirmed){results.push({id:original.id,status:"skipped-no-active-nws-confirmation"});continue;}
    const event={...original,action:"CON",updatedAt:nowIso,productText:reissueText(original),history:[...(original.history||[]),{action:"CON",issuedAt:nowIso,startTime:original.startTime,endTime:original.endTime,zoneIds:original.zoneIds,productText:reissueText(original)}]};
    const published=await fetch("http://127.0.0.1:8080/api/gfe/products",{method:"PUT",headers:{"content-type":"application/json","x-authentik-username":"wfo-automation","x-authentik-name":"WFO Automation","x-authentik-groups":"automation"},body:JSON.stringify({event})});
    const body=await published.json();if(!published.ok)throw new Error(`${original.id}: publish failed: ${body.detail||body.error||published.status}`);
    results.push({id:original.id,status:"reissued",zones:original.zoneIds?.length||0,updatedAt:nowIso});
  }
  console.log(JSON.stringify({candidateCount:candidates.length,results},null,2));
}

main().catch((error)=>{console.error(error.stack||error.message);process.exitCode=1;});
