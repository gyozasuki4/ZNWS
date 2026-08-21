(() => {
  "use strict";
  const host=document.querySelector("#domainStatus"),overall=document.querySelector("#overallState"),overallText=document.querySelector("#overallStatus"),lastChecked=document.querySelector("#lastChecked"),refreshButton=document.querySelector("#refreshStatus"),utcToggle=document.querySelector("#utcTimes"),filter=document.querySelector("#domainFilter"),productionRows=document.querySelector("#productionRows"),scheduleRows=document.querySelector("#scheduleRows");
  let currentData=null,currentDomain="all";
  const groupFor=(code)=>["REFC","UH25","UH03","RUNUH03","MUCAPE","MUCIN","MLCAPE","MLCIN","SRH01","SRH03","BS06","MAXUVV","MAXDVV","LTNG"].includes(code)?"Severe weather":["TMP2M","DPT2M","RH2M","WIND10M","WDIR10M","GUST","MSLP","VIS","TCDC","CEIL"].includes(code)?"Surface":["PRATE","APCP","PTYPE","PWAT","SNOW","FZRA"].includes(code)?"Precipitation":"Other";
  const fmt=(value,utc=utcToggle.checked)=>value?new Date(value).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short",...(utc?{timeZone:"UTC"}:{})}):"Unknown";
  const lead=(hours)=>{if(!hours?.length)return"No frames";const last=hours.at(-1),minutes=Math.round(last*60);return `${hours.length} · F${String(Math.floor(minutes/60)).padStart(2,"0")}${minutes%60?`:${String(minutes%60).padStart(2,"0")}`:""}`;};
  const coord=(value,positive,negative)=>`${Math.abs(Number(value)).toFixed(2)}°${Number(value)>=0?positive:negative}`;
  const bounds=(value)=>value?`${coord(value.north,"N","S")} · ${coord(value.south,"N","S")} · ${coord(value.west,"E","W")} · ${coord(value.east,"E","W")}`:"Unavailable";
  const freshness=(value)=>{const minutes=(Date.now()-Date.parse(value))/60000;if(!Number.isFinite(minutes))return"Unknown";if(minutes<2)return"Just now";if(minutes<60)return`${Math.round(minutes)} min ago`;if(minutes<1440)return`${Math.round(minutes/60)} hr ago`;return`${Math.round(minutes/1440)} d ago`;};
  const bytes=(value)=>Number.isFinite(Number(value))?`${(Number(value)/1073741824).toFixed(Number(value)>107374182400?0:1)} GB`:"Unknown";
  const duration=(minutes)=>{if(!Number.isFinite(minutes)||minutes<=0)return"Measuring";if(minutes<60)return`About ${Math.ceil(minutes)} min`;const hours=Math.ceil(minutes/6)/10;if(hours<24)return`About ${hours} hr`;return`About ${(hours/24).toFixed(1)} days`;};
  const relativeFuture=(value)=>{const minutes=Math.round((Date.parse(value)-Date.now())/60000);if(!Number.isFinite(minutes))return"";if(minutes<=0&&minutes>-60)return"due now";if(minutes>0&&minutes<60)return`in ${minutes} min`;if(minutes>=60)return`in ${Math.floor(minutes/60)} hr ${minutes%60} min`;return"";};
  const statusClass=(status)=>["failed","denied","unavailable"].includes(status)?"unavailable":status==="running"?"running":status==="complete"?"complete":["scheduled","approved","queued","pending_approval"].includes(status)?"scheduled":"delayed";
  function renderProductionBoard(data){
    document.querySelector("#boardValidTime").textContent=`Valid at ${fmt(data.generatedAt)}`;
    productionRows.replaceChildren(...data.domains.map((domain)=>{
      const run=domain.runs[0],row=document.createElement("tr");
      if(!run){
        row.innerHTML=`<td><strong>${domain.domain}</strong><small>Experimental WRF</small></td><td>—</td><td><span class="board-state unavailable">Unavailable</span></td><td>No published run</td><td>0 files</td><td>—</td><td></td>`;
        return row;
      }
      const hours=[...new Set(run.products.flatMap((item)=>item.hours||[]))].sort((a,b)=>a-b),last=hours.at(-1);
      const state=statusClass(run.status),link=document.createElement("a");
      link.href=`/models?source=ncep&run=${encodeURIComponent(`${domain.domain}-${run.runId}`)}`;link.textContent="View";
      const cells=[
        `<strong>${domain.domain}</strong><small>${run.spacing||"?"} km · ${run.physicsPreset||"OPERATIONAL"}</small>`,
        fmt(run.initializationTime),
        `<span class="board-state ${state}">${run.status||"unknown"}</span>`,
        Number.isFinite(last)?`Through F${String(Math.floor(last)).padStart(2,"0")}${last%1?`:30`:""}`:"No frames",
        `${run.products.length} types<small>${Number(run.productCount||0).toLocaleString()} files</small>`,
        `${freshness(run.generatedAt)}<small>${fmt(run.generatedAt)}</small>`
      ];
      cells.forEach((html)=>{const td=document.createElement("td");td.innerHTML=html;row.append(td);});
      const action=document.createElement("td");action.append(link);row.append(action);return row;
    }));
  }
  function renderSchedules(data){
    // Server already filters, but keep the same active/approved rule client-side
    // so a stale or intermediate payload never reintroduces terminal schedules.
    const activeSchedule=(request)=>
      ["hourly","scheduled"].includes(String(request.frequency||"").toLowerCase())
      && (String(request.decision||"").toLowerCase()==="approved"
        || (!request.decision&&["scheduled","approved","queued","running"].includes(String(request.state||request.status||"").toLowerCase())))
      && !["cancelled","complete","denied","failed"].includes(String(request.state||request.status||"").toLowerCase());
    const schedules=(data.schedules||[]).filter(activeSchedule);
    document.querySelector("#activeSchedules").textContent=String(schedules.length);
    if(!schedules.length){scheduleRows.innerHTML="<p>No recurring model runs are currently scheduled.</p>";return;}
    scheduleRows.replaceChildren(...schedules.map((item)=>{
      const row=document.createElement("article"),state=statusClass(item.status);
      row.innerHTML=`<div><span class="schedule-domain">${item.domain}</span><strong>${item.name||"Scheduled forecast"}</strong></div><span class="board-state ${state}">${item.status}</span><dl><div><dt>Cadence</dt><dd>Every ${item.cadenceHours||1} hour${Number(item.cadenceHours||1)===1?"":"s"}</dd></div><div><dt>Forecast</dt><dd>F${String(item.forecastHours||0).padStart(2,"0")} per run</dd></div><div><dt>Active window</dt><dd>${fmt(item.scheduleStart)} – ${fmt(item.scheduleEnd)}</dd></div><div class="next-run"><dt>Next run</dt><dd>${item.nextRunAt?`${fmt(item.nextRunAt)}<small>${relativeFuture(item.nextRunAt)}</small>`:"Awaiting API time"}</dd></div></dl>`;
      return row;
    }));
  }
  function renderLanes(data){
    const laneRows=document.querySelector("#laneRows"),lanes=Array.isArray(data.lanes)?data.lanes:[];
    if(!lanes.length){laneRows.innerHTML=`<p>${data.lanesError?"Execution status is temporarily unavailable.":"No forecast is currently using the compute lane."}</p>`;return;}
    laneRows.replaceChildren(...lanes.map((lane)=>{
      const row=document.createElement("article"),running=Boolean(lane.activeRunId);
      row.innerHTML=`<div><span class="schedule-domain">${lane.id}</span><strong>${running?lane.activeRunId:"Idle"}</strong></div><span class="board-state ${running?"running":"complete"}">${running?"Running":"Available"}</span><dl><div><dt>Domains</dt><dd>${lane.domains.join(" · ")||"Not reported"}</dd></div><div><dt>CPU allocation</dt><dd>${lane.cpus||"Not reported"}</dd></div><div><dt>MPI ranks</dt><dd>${lane.mpiRanks||"—"}</dd></div><div><dt>Priority</dt><dd>${(data.scheduler?.priority||[]).join(" → ")}</dd></div></dl>`;
      return row;
    }));
  }
  function renderPrewarm(data){
    const item=data.prewarm||{},state=document.querySelector("#prewarmState"),remaining=document.querySelector("#prewarmRemaining"),processed=document.querySelector("#prewarmProcessed"),rate=document.querySelector("#prewarmRate"),eta=document.querySelector("#prewarmEta"),failures=document.querySelector("#prewarmFailures"),storage=document.querySelector("#prewarmStorage"),current=document.querySelector("#prewarmCurrent"),updated=document.querySelector("#prewarmUpdated"),bar=document.querySelector("#prewarmProgressBar"),progress=bar.parentElement;
    const stale=item.updatedAt&&Date.now()-Date.parse(item.updatedAt)>180_000,batchTotal=Math.max(1,Math.min(Number(item.batchSize)||120,Number(item.total)||0)),percent=Math.max(0,Math.min(100,Number(item.processed||0)/batchTotal*100));
    const phase=item.breakdown?.phase==="backfill"?"backfill":"latest";
    state.className=`board-state ${stale?"delayed":item.running?"running":"complete"}`;state.textContent=stale?"Status delayed":item.running?(phase==="latest"?"Generating latest":"Backfilling history"):"Caught up";
    remaining.textContent=Number(item.queued||0).toLocaleString();processed.textContent=`${Number(item.processed||0).toLocaleString()} / ${batchTotal.toLocaleString()}`;rate.textContent=item.framesPerMinute?`${Number(item.framesPerMinute).toFixed(1)} / min`:"Measuring";eta.textContent=duration(Number(item.queued||0)/Number(item.framesPerMinute||0));failures.textContent=Number(item.failed||0).toLocaleString();storage.textContent=bytes(item.storage?.availableBytes);
    if(item.current){const [source,run,product,region,forecast]=item.current.split(":");current.textContent=`${source?.toUpperCase()} · ${run} · ${product} · ${region} · ${forecast?.toUpperCase()}`;}else current.textContent=item.running?"Updating queue…":"All discovered frames are cached";
    updated.textContent=`${phase==="latest"?"Latest-run priority":"Historical backfill"} · ${Number(item.breakdown?.backfillQueued||0).toLocaleString()} older-run frames waiting · ${item.regions||0} HRRR regions · ${item.linkedWrfSectors||0} linked WRF sectors · GFS full US · updated ${freshness(item.updatedAt)}`;
    bar.style.width=`${percent}%`;progress.setAttribute("aria-valuenow",String(Math.round(percent)));
    const fillChips=(id,entries)=>{const target=document.querySelector(id);target.replaceChildren(...entries.map(([label,value])=>{const chip=document.createElement("b");chip.textContent=`${label} ${Number(value).toLocaleString()}`;return chip;}));if(!entries.length){const empty=document.createElement("i");empty.textContent="No queued frames";target.append(empty);}};
    fillChips("#prewarmSources",Object.entries(item.breakdown?.sources||{}).map(([key,value])=>[key.toUpperCase()==="NCEP"?"WRF":key.toUpperCase(),value]));
    fillChips("#prewarmProducts",Object.entries(item.breakdown?.products||{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([key,value])=>[key,value]));
    document.querySelector("#prewarmScope").textContent=`${item.concurrency||1}-frame low-priority concurrency. HRRR: all ${item.regions||0} permanent regions. WRF: only ${item.linkedWrfSectors||0} exact linked sectors. GFS: full US plus basin views for supported products. GFS products: ${(item.gfsProducts||[]).join(", ")}. HRRR/WRF priority products: ${(item.products||[]).join(", ")}.`;
    const regionGrid=document.querySelector("#prewarmRegionGrid"),regionItems=Object.values(item.breakdown?.coverage?.regions||{}).sort((a,b)=>a.source.localeCompare(b.source)||a.region.localeCompare(b.region));
    regionGrid.replaceChildren(...regionItems.map((entry)=>{const total=Math.max(0,Number(entry.total)||0),remainingCount=Math.max(0,Number(entry.remaining)||0),done=Math.max(0,total-remainingCount),completion=total?done/total*100:100,card=document.createElement("article"),sourceName=entry.source==="ncep"?"WRF":entry.source==="gfs"?"GFS":"HRRR";card.innerHTML=`<header><span>${sourceName}</span><strong></strong><em>${completion.toFixed(0)}%</em></header><div><i style="width:${completion.toFixed(1)}%"></i></div><p>${done.toLocaleString()} complete · ${remainingCount.toLocaleString()} remaining · ${total.toLocaleString()} total</p>`;card.querySelector("strong").textContent=entry.region==="national"?"United States":entry.region.replace(/-/g," ");return card;}));
    if(!regionItems.length){const empty=document.createElement("p");empty.textContent="Region coverage will appear after the worker completes its next inventory scan.";regionGrid.append(empty);}
  }
  function updateFilter(){
    host.querySelectorAll(".domain-card").forEach((card)=>{card.hidden=currentDomain!=="all"&&card.dataset.domain!==currentDomain;});
    filter.querySelectorAll("button").forEach((button)=>button.classList.toggle("active",button.dataset.domain===currentDomain));
  }
  function productGroups(products){
    const grouped=new Map();
    products.forEach((product)=>{const group=groupFor(product.code);if(!grouped.has(group))grouped.set(group,[]);grouped.get(group).push(product);});
    const container=document.createElement("div");container.className="product-groups";
    grouped.forEach((items,label)=>{
      const section=document.createElement("section");section.className="product-group";
      const heading=document.createElement("h3");heading.textContent=label;
      const row=document.createElement("div");row.className="products";
      items.forEach((product)=>{const chip=document.createElement("span");chip.className="product-chip";const code=document.createElement("b");code.textContent=product.code;const detail=document.createElement("small");detail.textContent=` · ${lead(product.hours)}`;chip.append(code,detail);row.append(chip);});
      section.append(heading,row);container.append(section);
    });
    return container;
  }
  function render(data){
    currentData=data;
    const allRuns=data.domains.flatMap((domain)=>domain.runs),online=data.domains.filter((domain)=>domain.runs.length&&!domain.error).length,files=allRuns.reduce((sum,run)=>sum+Number(run.productCount||0),0);
    overall.className=`overall-state ${online?"is-good":"is-error"}`;overallText.textContent=online===3?"All publishing domains available":online?`${online} publishing domain${online===1?"":"s"} available`:"No model data available";lastChecked.textContent=`Checked ${fmt(data.generatedAt,false)}`;
    document.querySelector("#domainsOnline").textContent=`${online} / 3`;document.querySelector("#retainedRuns").textContent=String(allRuns.length);document.querySelector("#publishedFiles").textContent=files.toLocaleString();
    renderPrewarm(data);renderProductionBoard(data);renderLanes(data);renderSchedules(data);
    host.replaceChildren(...data.domains.map((domain)=>{
      const card=document.createElement("article");card.className="domain-card";card.dataset.domain=domain.domain;
      const head=document.createElement("header");head.className="domain-head";
      const nameWrap=document.createElement("div");nameWrap.className="domain-name";const kicker=document.createElement("span");kicker.textContent="Experimental WRF domain";const title=document.createElement("h2");title.textContent=domain.domain;nameWrap.append(kicker,title);
      const state=document.createElement("span");state.className=`domain-state ${domain.runs.length?"":"empty"}`;state.textContent=domain.runs.length?`${domain.runs.length} retained`:"No data";head.append(nameWrap,state);card.append(head);
      if(domain.error){const error=document.createElement("p");error.className="domain-error";error.textContent=`Inventory unavailable: ${domain.error}`;card.append(error);return card;}
      const list=document.createElement("div");list.className="run-list";
      domain.runs.forEach((run,index)=>{
        const section=document.createElement("section");section.className="run";
        const runTitle=document.createElement("div");runTitle.className="run-title";const name=document.createElement("strong");name.textContent=`${fmt(run.initializationTime)} initialization`;const status=document.createElement("em");status.className=run.status;status.textContent=index===0?`${run.status} · latest`:run.status;runTitle.append(name,status);
        const meta=document.createElement("div");meta.className="run-meta";[`${run.spacing||"?"} km grid`,`${run.physicsPreset||"OPERATIONAL"} physics`,`${run.productCount} published files`,`Updated ${freshness(run.generatedAt)}`].forEach((text)=>{const span=document.createElement("span");span.textContent=text;meta.append(span);});
        const maximumFrames=Math.max(1,...run.products.map((product)=>product.frames||0)),completeProducts=run.products.filter((product)=>product.frames===maximumFrames).length,progress=document.createElement("div");progress.className="progress";progress.title=`${completeProducts} of ${run.products.length} products have ${maximumFrames} frames`;const bar=document.createElement("i");bar.style.width=`${run.status==="complete"?100:Math.max(8,completeProducts/Math.max(1,run.products.length)*100)}%`;progress.append(bar);
        const extent=document.createElement("div");extent.className="bounds";extent.textContent=`Usable grid · ${bounds(run.usableGridBounds||run.gridBounds)}`;
        const actions=document.createElement("div");actions.className="run-actions";const viewer=document.createElement("a");viewer.href=`/models?source=ncep&run=${encodeURIComponent(`${domain.domain}-${run.runId}`)}`;viewer.textContent="View run";actions.append(viewer);
        section.append(runTitle,meta,progress,productGroups(run.products),extent,actions);list.append(section);
      });
      if(!domain.runs.length){const empty=document.createElement("p");empty.className="empty-domain";empty.textContent="No products have been published for this domain yet.";list.append(empty);}
      card.append(list);return card;
    }));updateFilter();
  }
  async function refresh(){
    refreshButton.disabled=true;refreshButton.textContent="Refreshing…";
    try{const response=await fetch("/api/public/models/status.json",{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);render(data);}
    catch(error){overall.className="overall-state is-error";overallText.textContent="Status unavailable";lastChecked.textContent=error.message;host.innerHTML='<div class="loading-card"><span>Model status could not be loaded. Retrying automatically.</span></div>';}
    finally{refreshButton.disabled=false;refreshButton.textContent="Refresh";}
  }
  filter.addEventListener("click",(event)=>{const button=event.target.closest("button[data-domain]");if(!button)return;currentDomain=button.dataset.domain;updateFilter();});
  utcToggle.addEventListener("change",()=>{if(currentData)render(currentData);});
  refreshButton.addEventListener("click",refresh);
  refresh();setInterval(refresh,60_000);
})();
