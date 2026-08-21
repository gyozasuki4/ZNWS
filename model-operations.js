(() => {
  "use strict";
  const esc=(value)=>String(value??"").replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const boundsText=(bounds)=>bounds?`${Math.abs(bounds.south).toFixed(2)}–${Math.abs(bounds.north).toFixed(2)}°N · ${Math.abs(bounds.west).toFixed(2)}–${Math.abs(bounds.east).toFixed(2)}°W`:"Bounds unavailable";
  const lead=(hours)=>{const value=Math.max(...(hours||[0])),whole=Math.floor(value),minutes=Math.round((value-whole)*60);return `F${String(whole).padStart(2,"0")}${minutes?`:${String(minutes).padStart(2,"0")}`:""}`;};
  const forecastEnd=(sector)=>{
    const hours=Math.max(...(sector.forecastHours||[0])),initialization=new Date(sector.runTime);
    if(!Number.isFinite(initialization.getTime()))return {time:"Time unavailable",lead:lead(sector.forecastHours)};
    const valid=new Date(initialization.getTime()+hours*3_600_000);
    return {
      time:new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(valid),
      lead:lead(sector.forecastHours)
    };
  };
  const productGroups={Severe:["refc","refcuh75","uh03","runuh03","mucape","mucin","sbcape","sbcin","srh01","srh03","bs06","lightning","maxuvv","maxdvv"],Surface:["temperature","dewpoint","humidity","wind","gust","pressure","visibility","cloud","ceiling"],Precipitation:["prate","apcp","preciptype","pwat","snowwe","fzra"]};
  const productNames={refc:"Reflectivity",refcuh75:"REF + UH75",uh03:"Hourly 0–3 km UH",runuh03:"Run-max 0–3 km UH",mucape:"MUCAPE",mucin:"MUCIN",sbcape:"SBCAPE",sbcin:"SBCIN",srh01:"SRH 0–1 km",srh03:"SRH 0–3 km",bs06:"Bulk shear",lightning:"Lightning",maxuvv:"Max updraft",maxdvv:"Max downdraft",temperature:"Temperature",dewpoint:"Dew point",humidity:"Humidity",wind:"Wind",gust:"Gust",pressure:"MSLP",visibility:"Visibility",cloud:"Cloud cover",ceiling:"Ceiling",prate:"Precip rate",apcp:"Accum precip",preciptype:"Precip type",pwat:"PWAT",snowwe:"Snow water eq.",fzra:"Freezing rain"};
  const colors=["#9caf88","#d5b85a","#68a7c2"];
  function coverageMap(sectors,generatedAt){
    const revision=encodeURIComponent(generatedAt||Date.now());
    document.querySelector("#coverageMap").innerHTML=`<img src="/api/public/models/operations-map.svg?v=${revision}" alt="United States map showing current ZNWS-WRF sector coverage">`;
    document.querySelector("#coverageLegend").innerHTML=sectors.map((sector,index)=>`<span><i style="background:${colors[index%colors.length]}"></i><strong>${esc(sector.domain)}</strong> ${esc(boundsText(sector.bounds))}</span>`).join("");
  }
  function productMarkup(products){
    return Object.entries(productGroups).map(([group,codes])=>{const available=codes.filter((code)=>products.includes(code));return available.length?`<div class="product-group"><strong>${group}</strong><div>${available.map((code)=>`<span>${esc(productNames[code]||code)}</span>`).join("")}</div></div>`:"";}).join("");
  }
  async function load(){
    try{
      const response=await fetch("/api/public/models/operations-update.json",{cache:"no-store"}),data=await response.json();
      if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
      document.querySelector("#updateTitle").textContent=data.title||"ZNWS-WRF Operations Update";
      document.querySelector("#updateSummary").textContent=data.visible?(data.summary||"Experimental mesoscale sectors are active."):"No public WRF operations update is active.";
      document.querySelector("#updateState").textContent=data.visible?"Active update":"No active notice";
      document.querySelector("#updateState").className=data.visible?"active":"";
      document.querySelector("#sectorCount").textContent=data.visible?data.sectors.length:"0";
      document.querySelector("#updateTimes").textContent=data.visible?`Updated ${new Date(data.updatedAt).toLocaleString()}${data.expiresAt?` · Expires ${new Date(data.expiresAt).toLocaleString()}`:""}`:"";
      const sectors=data.visible?data.sectors:[];
      coverageMap(sectors,data.generatedAt);
      document.querySelector("#sectorGrid").innerHTML=sectors.length?sectors.map((sector)=>{const ending=forecastEnd(sector);return `<article class="sector-card"><div class="sector-head"><div><span>Experimental sector</span><strong>${esc(sector.domain)}</strong></div><i class="${esc(sector.status||"published")}">${esc(sector.status||"published")}</i></div><div class="sector-stats"><div><span>Grid spacing</span><strong>${Number(sector.spacing)||"—"} km</strong></div><div><span>Forecast through</span><strong>${esc(ending.time)}</strong><small>${esc(ending.lead)} · local time</small></div><div><span>Published products</span><strong>${sector.products.length}</strong></div></div><div class="bounds-line"><span>Requested bounds</span><strong>${esc(boundsText(sector.bounds))}</strong></div><div class="product-groups">${productMarkup(sector.products)}</div><div class="sector-card-footer"><span>Inventory updated ${sector.generatedAt?new Date(sector.generatedAt).toLocaleString():"—"}</span><a href="/models?source=ncep">View ${esc(sector.domain)} →</a></div></article>`;}).join(""):`<div class="empty-card">No experimental WRF sectors are currently published.</div>`;
    }catch(error){document.querySelector("#updateSummary").textContent="The operations update is temporarily unavailable.";document.querySelector("#sectorGrid").innerHTML=`<div class="empty-card">${esc(error.message)}</div>`;}
  }
  load();setInterval(load,60_000);
})();
