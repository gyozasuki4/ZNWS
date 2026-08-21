#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),output=path.join(root,"data","coastal-flood-criteria.json"),headers={"User-Agent":"ZASNetWeather/1.0 (https://zasnetwx.com/)"};
async function json(url){const response=await fetch(url,{headers});if(!response.ok)throw new Error(`${response.status} ${url}`);return response.json();}
function number(body,...keys){for(const key of keys){const value=Number(body?.[key]);if(Number.isFinite(value)&&value>0)return value;}return null;}
async function main(){
  const inventory=await json("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels"),stations=(inventory.stations||[]).filter((station)=>!station.greatlakes);
  const rows=[];let cursor=0;
  async function worker(){while(cursor<stations.length){const station=stations[cursor++];try{const [levels,datums]=await Promise.all([json(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${station.id}/floodlevels.json?units=english`),json(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${station.id}/datums.json?units=english`)]),mllw=Number((datums.datums||[]).find((item)=>String(item.name).toUpperCase()==="MLLW")?.value),minor=number(levels,"nws_minor","nos_minor"),moderate=number(levels,"nws_moderate","nos_moderate"),major=number(levels,"nws_major","nos_major");if(!Number.isFinite(mllw)||!Number.isFinite(minor)||!Number.isFinite(moderate))continue;rows.push({stationId:String(station.id),name:station.name||String(station.id),state:String(station.state||"").toUpperCase(),lat:Number(station.lat),lon:Number(station.lng??station.lon),sourceMinor:Number.isFinite(Number(levels.nws_minor))?"NWS":"NOS",sourceModerate:Number.isFinite(Number(levels.nws_moderate))?"NWS":"NOS",datum:"MLLW",minorFeet:Math.round((minor-mllw)*100)/100,moderateFeet:Math.round((moderate-mllw)*100)/100,majorFeet:Number.isFinite(major)?Math.round((major-mllw)*100)/100:null});}catch(error){process.stderr.write(`${station.id}: ${error.message}\n`);}}}
  await Promise.all(Array.from({length:8},worker));rows.sort((a,b)=>a.state.localeCompare(b.state)||a.stationId.localeCompare(b.stationId));
  fs.writeFileSync(output,JSON.stringify({generatedAt:new Date().toISOString(),datum:"MLLW",method:"NWS thresholds preferred, NOS fallback; station-datum values converted by subtracting the station MLLW datum value",stationCount:rows.length,stations:rows},null,2)+"\n");console.log(`${rows.length} stations -> ${output}`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
