#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),zonesPath=path.join(root,"data/generated/native/public-zones.geojson"),outputPath=path.join(root,"data/winter-weather-history.json");
const products=[{hazard:"Winter Weather Advisory",phenomena:"WW",significance:"Y"},{hazard:"Winter Storm Watch",phenomena:"WS",significance:"A"},{hazard:"Winter Storm Warning",phenomena:"WS",significance:"W"}];
const yearArg=process.argv.find(v=>/^--year=\d{4}$/.test(v)),years=yearArg?[+yearArg.split("=")[1]]:[2024,2025];
const selected=process.argv.find(v=>v.startsWith("--wfos="));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchJson(url){const r=await fetch(url,{headers:{"User-Agent":"ZASNetWX winter-weather research backtest"}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}: ${url}`);return r.json();}
async function main(){
 const zones=JSON.parse(fs.readFileSync(zonesPath,"utf8")),all=[...new Set(zones.features.map(f=>f.properties.CWA).filter(Boolean))].sort(),wanted=selected?new Set(selected.slice(7).toUpperCase().split(",")):null,wfos=wanted?all.filter(w=>wanted.has(w)):all,events=[],failures=[];
 for(const year of years)for(const wfo of wfos)for(const product of products){const url=`https://mesonet.agron.iastate.edu/json/vtec_events.py?wfo=${wfo}&year=${year}&phenomena=${product.phenomena}&significance=${product.significance}`;try{const p=await fetchJson(url);for(const e of p.events||[])events.push({...e,hazard:product.hazard,archiveYear:year});}catch(error){failures.push({wfo,year,hazard:product.hazard,error:error.message});}await sleep(1050);}
 const byWfo={};for(const wfo of wfos){byWfo[wfo]={};for(const p of products){const a=events.filter(e=>e.wfo===wfo&&e.hazard===p.hazard),d=a.map(e=>(Date.parse(e.init_expire||e.expire)-Date.parse(e.issue))/36e5).filter(Number.isFinite).sort((x,y)=>x-y);byWfo[wfo][p.hazard]={events:a.length,medianInitialDurationHours:d.length?Math.round(d[Math.floor(d.length/2)]*10)/10:null};}}
 const result={generatedAt:new Date().toISOString(),researchOnly:true,source:"Iowa Environmental Mesonet VTEC archive",years,offices:wfos.length,eventCount:events.length,failures,totals:Object.fromEntries(products.map(p=>[p.hazard,events.filter(e=>e.hazard===p.hazard).length])),byWfo,events};fs.writeFileSync(outputPath,`${JSON.stringify(result,null,2)}\n`);console.log(JSON.stringify({outputPath,offices:wfos.length,events:events.length,totals:result.totals,failures:failures.length},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
