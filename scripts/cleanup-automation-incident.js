#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),data=path.join(root,"data"),stamp=new Date().toISOString().replace(/[:.]/g,"-") ,backup=path.join(data,"cleanup-backups",`automation-incident-${stamp}`);
fs.mkdirSync(backup,{recursive:true});
const files={gfe:"gfe-products.json",public:"public-alerts.json",drafts:"wfo-auto-drafts.json"};
const stores={};
for(const [key,name] of Object.entries(files)){const source=path.join(data,name);fs.copyFileSync(source,path.join(backup,name));stores[key]=JSON.parse(fs.readFileSync(source,"utf8"));}
const automatedEvents=(stores.gfe.events||[]).filter((event)=>event.automated===true),eventIds=new Set(automatedEvents.map((event)=>event.id)),publicIds=new Set([...eventIds].map((id)=>`gfe:${id}`)),removedPublicAlerts=(stores.public.warnings||[]).filter((warning)=>publicIds.has(warning.id)).length;
stores.gfe.events=(stores.gfe.events||[]).filter((event)=>!eventIds.has(event.id));
stores.public.warnings=(stores.public.warnings||[]).filter((warning)=>!publicIds.has(warning.id));
stores.drafts.drafts=(stores.drafts.drafts||[]).filter((draft)=>draft.automated!==true&&draft.issuedBy!=="wfo-automation");
const now=new Date().toISOString();stores.gfe.updatedAt=now;stores.public.updatedAt=now;stores.drafts.updatedAt=now;
fs.writeFileSync(path.join(data,files.gfe),JSON.stringify(stores.gfe,null,2));
fs.writeFileSync(path.join(data,files.public),JSON.stringify(stores.public,null,2));
fs.writeFileSync(path.join(data,files.drafts),JSON.stringify(stores.drafts,null,2));
console.log(JSON.stringify({backup,removedGfeEvents:automatedEvents.length,removedPublicAlerts,remainingGfeEvents:stores.gfe.events.length,remainingPublicAlerts:stores.public.warnings.length,remainingDrafts:stores.drafts.drafts.length},null,2));
