#!/usr/bin/env node
"use strict";

const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),data=path.join(root,"data"),gfePath=path.join(data,"gfe-products.json");
const store=JSON.parse(fs.readFileSync(gfePath,"utf8")),now=Date.now();
const live=(store.events||[]).filter((event)=>event.automated===true&&event.status==="active"&&Date.parse(event.endTime||0)>now).sort((a,b)=>Date.parse(a.issuedAt)-Date.parse(b.issuedAt));
const covered=new Set(),redundant=[];
for(const event of live){
  const zones=event.zoneIds||[],keys=zones.map((zone)=>`${event.wfo}|${event.hazardName}|${zone}`),fresh=keys.filter((key)=>!covered.has(key));
  if(zones.length&&fresh.length===0)redundant.push(event);
  else keys.forEach((key)=>covered.add(key));
}
const ids=new Set(redundant.map((event)=>event.id)),stamp=new Date().toISOString(),safeStamp=stamp.replace(/[:.]/g,"-");
const backupDir=path.join(data,"cleanup-backups",`redundant-automation-${safeStamp}`);fs.mkdirSync(backupDir,{recursive:true});fs.copyFileSync(gfePath,path.join(backupDir,"gfe-products.json"));
for(const event of store.events||[]){if(!ids.has(event.id))continue;event.status="incident-duplicate";event.updatedAt=stamp;event.fields={...(event.fields||{}),incidentDuplicate:"true"};event.details=`Quarantined after the Aug 7 automation incident because every zone was already covered by an earlier active ${event.hazardName}.`;}
store.updatedAt=stamp;const temporary=`${gfePath}.quarantine.tmp`;fs.writeFileSync(temporary,JSON.stringify(store,null,2));fs.renameSync(temporary,gfePath);
console.log(JSON.stringify({backupDir,quarantined:redundant.map((event)=>({id:event.id,zones:event.zoneIds?.length||0})),count:redundant.length},null,2));
