(() => {
  "use strict";
  const id = new URLSearchParams(location.search).get("id") || "";
  const host = document.querySelector("#coneMap");
  if (!id || !host) return;
  if (!globalThis.maplibregl) {
    host.textContent = "The interactive storm map could not load. Please refresh the page.";
    return;
  }
  const pageTitle = document.querySelector("#title");
  const pageDetails = document.querySelector("#details");
  const latest = document.querySelector("#latest");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[character]);
  const empty = { type:"FeatureCollection", features:[] };
  const compass = (degrees) => {
    const value = Number(degrees), names = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    return Number.isFinite(value) ? `${names[Math.round(value / 22.5) % 16]} ${Math.round(value)}°` : "—";
  };
  const advisoryKind = (feature) => {
    const text = `${feature.properties?.name || ""} ${feature.properties?.description || ""}`.toLowerCase();
    const watch = text.includes("watch"), surge = text.includes("storm surge"), hurricane = text.includes("hurricane");
    return { kind:watch ? "watch" : "warning", label:surge ? `Storm surge ${watch ? "watch" : "warning"}` : hurricane ? `Hurricane ${watch ? "watch" : "warning"}` : `Tropical storm ${watch ? "watch" : "warning"}`, color:surge ? "#d381c3" : hurricane ? "#ef6356" : "#f1bd59" };
  };
  const forecastWind = (feature) => Number((`${feature.properties?.name || ""} ${feature.properties?.description || ""}`.match(/(\d{2,3})\s*(?:kt|kts|knots)/i) || [])[1]);
  const intensity = (knots) => knots >= 137 ? ["Category 5","#9f57c7"] : knots >= 113 ? ["Category 4","#c56aba"] : knots >= 96 ? ["Category 3","#d95745"] : knots >= 83 ? ["Category 2","#e47e42"] : knots >= 64 ? ["Category 1","#e9b34d"] : knots >= 34 ? ["Tropical storm","#f0d05d"] : ["Tropical depression","#8fac72"];
  const allCoordinates = (geometry, output = []) => { if (!geometry) return output; const walk = (value) => Array.isArray(value) && typeof value[0] === "number" ? output.push(value) : Array.isArray(value) && value.forEach(walk); walk(geometry.coordinates); return output; };
  Promise.all([fetch(`/api/public/tropics/storm?id=${encodeURIComponent(id)}`, { cache:"no-store" }).then((response) => response.json()),fetch("/api/public/tropics/basemap?v=major-cities",{cache:"force-cache"}).then((response)=>response.json())]).then(([data,mapBase]) => {
    if (data.error) throw new Error(data.error);
    const storm = data.storm, cone = data.cone || empty, track = data.track || empty;
    if (pageTitle) pageTitle.textContent = `${storm.name} forecast cone`;
    if (pageDetails) pageDetails.textContent = `${storm.classification} · ${storm.intensity} kt · ${new Date(storm.lastUpdate).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" })}`;
    if (latest) {
      const advisoryUrl = /^https:\/\/www\.nhc\.noaa\.gov\//i.test(String(storm.publicAdvisory?.url || "")) ? storm.publicAdvisory.url : "";
      latest.innerHTML = `<article><h3>${escapeHtml(storm.name)} · ${escapeHtml(storm.classification)}</h3><p><b>${escapeHtml(storm.intensity)} kt</b> maximum sustained winds · ${escapeHtml(storm.pressure)} mb</p><p>Position: ${escapeHtml(storm.latitude)} · ${escapeHtml(storm.longitude)}</p>${advisoryUrl ? `<a href="${escapeHtml(advisoryUrl)}" target="_blank" rel="noopener">Read latest official NHC advisory →</a>` : ""}</article>`;
    }
    const trackPoints = (track.features || []).filter((feature) => feature.geometry?.type === "Point").map((feature, index) => { const [intensityLabel,intensityColor] = intensity(forecastWind(feature)); return { ...feature, properties:{ ...(feature.properties || {}), pointIndex:index, label:String(feature.properties?.name || "").replace(/forecast\s*/i, "F"), intensityLabel, intensityColor } }; });
    const trackLine = trackPoints.length > 1 ? { type:"FeatureCollection", features:[{ type:"Feature", properties:{}, geometry:{ type:"LineString", coordinates:trackPoints.map((feature) => feature.geometry.coordinates) } }] } : empty;
    const advisoryFeatures = [...(data.advisories?.wind?.features || []), ...(data.advisories?.surge?.features || [])].map((feature) => { const meta = advisoryKind(feature); return { ...feature, properties:{ ...(feature.properties || {}), ...meta } }; });
    const advisories = { type:"FeatureCollection", features:advisoryFeatures };
    host.innerHTML = `<div class="tc-map-shell"><div class="tc-map-header"><div><span>Official NHC forecast</span><strong>${storm.name} · ${storm.classification}</strong></div><dl><div><dt>Wind</dt><dd>${storm.intensity} kt</dd></div><div><dt>Pressure</dt><dd>${storm.pressure} mb</dd></div><div><dt>Motion</dt><dd>${compass(storm.movementDir)} · ${storm.movementSpeed} mph</dd></div><div><dt>Updated</dt><dd>${new Date(storm.lastUpdate).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" })}</dd></div></dl></div><div class="tc-map-modes" role="group" aria-label="Storm map mode"><button class="is-active" data-tc-mode="forecast">Forecast</button><button data-tc-mode="models">Models</button><button data-tc-mode="satellite">Satellite</button><select data-tc-satellite aria-label="Satellite product"><option value="geocolor">GeoColor</option><option value="abi13">Clean infrared</option><option value="abi10">Water vapor</option></select><button data-tc-export>Export PNG</button></div><div id="interactiveStormMap" class="tc-map"></div><div class="tc-map-legends"><div class="tc-intensity-legend"><strong>Forecast intensity</strong><div>${[["TD","#8fac72"],["TS","#f0d05d"],["1","#e9b34d"],["2","#e47e42"],["3","#d95745"],["4","#c56aba"],["5","#9f57c7"]].map(([label,color])=>`<span><i style="--intensity:${color}"></i>${label}</span>`).join("")}</div></div><div class="tc-advisory-legend"></div></div><img class="tc-map-logo" src="/ZNWS.png" alt="ZASNet Weather Service"></div>`;
    const legend = host.querySelector(".tc-advisory-legend"), modes = host.querySelector(".tc-map-modes"), satelliteSelect = host.querySelector("[data-tc-satellite]");
    const legendItems = [...new Map(advisoryFeatures.map((feature) => [`${feature.properties.label}:${feature.properties.kind}`, feature.properties])).values()];
    legend.innerHTML = `<strong>Tropical advisories</strong>${legendItems.map((item) => `<span><i style="--advisory:${item.color}" class="${item.kind}"></i>${item.label}</span>`).join("") || "<span>No coastal watches or warnings</span>"}`;
    const map = new maplibregl.Map({ container:"interactiveStormMap", center:[storm.longitudeNumeric,storm.latitudeNumeric], zoom:5, canvasContextAttributes:{ preserveDrawingBuffer:true }, style:{ version:8, glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf", sources:{ geocolor:{ type:"raster", tiles:["/api/public/satellite/nesdis/geocolor/{z}/{x}/{y}"], tileSize:256 }, abi13:{ type:"raster", tiles:["/api/public/satellite/nesdis/abi13/{z}/{x}/{y}"], tileSize:256 }, abi10:{ type:"raster", tiles:["/api/public/satellite/nesdis/abi10/{z}/{x}/{y}"], tileSize:256 } }, layers:[{ id:"base", type:"background", paint:{ "background-color":"#f4f9fc" } },...["geocolor","abi13","abi10"].map((source) => ({ id:`sat-${source}`, type:"raster", source, layout:{ visibility:"none" }, paint:{ "raster-opacity":.82,"raster-contrast":.08 } }))] } });
    map.addControl(new maplibregl.NavigationControl({ showCompass:false }), "top-right");
    map.on("load", () => {
      map.addSource("custom-land", { type:"geojson", data:{ type:"FeatureCollection", features:mapBase.features || [] } }); map.addLayer({ id:"custom-land", type:"fill", source:"custom-land", paint:{ "fill-color":"#ffffff","fill-opacity":1 } },"sat-geocolor"); map.addLayer({ id:"state-outlines", type:"line", source:"custom-land", paint:{ "line-color":"#7f929f","line-opacity":.82,"line-width":["interpolate",["linear"],["zoom"],3,.7,7,1.35] } });
      map.addSource("cone", { type:"geojson", data:cone }); map.addLayer({ id:"cone-fill", type:"fill", source:"cone", paint:{ "fill-color":"#768894","fill-opacity":.18 } }); map.addLayer({ id:"cone-line", type:"line", source:"cone", paint:{ "line-color":"#607581","line-opacity":.88,"line-width":1.6 } });
      map.addSource("advisories", { type:"geojson", data:advisories }); map.addLayer({ id:"advisory-area", type:"fill", source:"advisories", filter:["==",["geometry-type"],"Polygon"], paint:{ "fill-color":["get","color"],"fill-opacity":.18 } }); map.addLayer({ id:"advisory-warning", type:"line", source:"advisories", filter:["==",["get","kind"],"warning"], paint:{ "line-color":["get","color"],"line-width":4 } }); map.addLayer({ id:"advisory-watch", type:"line", source:"advisories", filter:["==",["get","kind"],"watch"], paint:{ "line-color":["get","color"],"line-width":4,"line-dasharray":[2,1.4] } });
      map.addSource("track-line", { type:"geojson", data:trackLine }); map.addLayer({ id:"track-line", type:"line", source:"track-line", paint:{ "line-color":"#17324a","line-width":2.7 } });
      map.addSource("track-points", { type:"geojson", data:{ type:"FeatureCollection", features:trackPoints } }); map.addLayer({ id:"track-points", type:"circle", source:"track-points", paint:{ "circle-radius":6,"circle-color":["get","intensityColor"],"circle-stroke-color":"#ffffff","circle-stroke-width":1.8 } }); map.addLayer({ id:"track-labels", type:"symbol", source:"track-points", layout:{ "text-field":["get","label"],"text-font":["Noto Sans Bold"],"text-size":10,"text-offset":[0,1.35],"text-anchor":"top","text-allow-overlap":false }, paint:{ "text-color":"#17324a","text-halo-color":"#ffffff","text-halo-width":2 } });
      map.addSource("current", { type:"geojson", data:{ type:"FeatureCollection", features:[{ type:"Feature", properties:{}, geometry:{ type:"Point", coordinates:[storm.longitudeNumeric,storm.latitudeNumeric] } }] } }); map.addLayer({ id:"current", type:"circle", source:"current", paint:{ "circle-radius":9,"circle-color":"#ef6356","circle-stroke-color":"#fff","circle-stroke-width":2 } });
      map.addSource("custom-cities", { type:"geojson", data:{ type:"FeatureCollection", features:mapBase.cities || [] } }); map.addLayer({ id:"city-labels", type:"symbol", source:"custom-cities", minzoom:3.3, layout:{ "text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-size":["interpolate",["linear"],["zoom"],3.3,9,7,11],"text-allow-overlap":false,"symbol-sort-key":["-",10000000,["coalesce",["get","population"],0]] }, paint:{ "text-color":"#526b7c","text-halo-color":"#ffffff","text-halo-width":1.5,"text-halo-blur":.5 } });
      map.addSource("guidance", { type:"geojson", data:empty }); map.addLayer({ id:"guidance-casing", type:"line", source:"guidance", layout:{ visibility:"none" }, paint:{ "line-color":"#0b0c0a","line-opacity":.55,"line-width":3 } }); map.addLayer({ id:"guidance", type:"line", source:"guidance", layout:{ visibility:"none" }, paint:{ "line-color":["coalesce",["get","color"],"#f1bd59"],"line-opacity":.78,"line-width":1.3 } });
      const points = [[storm.longitudeNumeric,storm.latitudeNumeric],...trackPoints.map((feature)=>feature.geometry.coordinates),...cone.features.flatMap((feature)=>allCoordinates(feature.geometry))]; if(points.length) map.fitBounds(points.reduce((bounds,point)=>bounds.extend(point),new maplibregl.LngLatBounds(points[0],points[0])),{ padding:{top:125,bottom:55,left:45,right:45},maxZoom:7,duration:0 });
      map.on("mouseenter", "track-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "track-points", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "track-points", (event) => {
        const feature = event.features?.[0], properties = feature?.properties || {}, coordinates = feature?.geometry?.coordinates || event.lngLat.toArray();
        const description = String(properties.description || "Official NHC forecast position and intensity.").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const match = (pattern) => (description.match(pattern) || []).slice(1);
        const [forecastHour] = match(/(\d+)\s*hr Forecast/i), [validAt] = match(/Valid at:\s*(.+?)(?=\s+Location:|$)/i);
        const [windKnots,windMph] = match(/Maximum Wind:\s*(\d+)\s*knots?\s*\((\d+)\s*mph\)/i);
        const [gustKnots,gustMph] = match(/Wind Gusts:\s*(\d+)\s*knots?\s*\((\d+)\s*mph\)/i);
        const [motion] = match(/Motion:\s*(.+?)(?=\s+Minimum Pressure:|$)/i), [pressure] = match(/Minimum Pressure:\s*(\d+)\s*mb/i);
        const position = `${Math.abs(Number(coordinates[1])).toFixed(1)}°${coordinates[1] >= 0 ? "N" : "S"} · ${Math.abs(Number(coordinates[0])).toFixed(1)}°${coordinates[0] >= 0 ? "E" : "W"}`;
        const content = document.createElement("div");
        content.className = "tc-point-popup";
        const head = document.createElement("div"); head.className = "tc-popup-head";
        const title = document.createElement("div"), eyebrow = document.createElement("span"), heading = document.createElement("strong"), badge = document.createElement("b");
        eyebrow.textContent = forecastHour ? "Official forecast point" : "Current position";
        heading.textContent = forecastHour ? `${forecastHour}-hour forecast` : "Advisory position";
        badge.textContent = properties.intensityLabel || "Forecast"; badge.style.setProperty("--point-color", properties.intensityColor || "#e2a84b");
        title.append(eyebrow, heading); head.append(title, badge); content.append(head);
        if (validAt) { const time = document.createElement("time"); time.textContent = validAt; content.append(time); }
        if (windKnots) {
          const wind = document.createElement("div"), label = document.createElement("span"), value = document.createElement("strong"), secondary = document.createElement("small");
          wind.className = "tc-popup-wind"; label.textContent = "Maximum sustained wind"; value.textContent = `${windKnots} kt`; secondary.textContent = windMph ? `${windMph} mph` : "";
          wind.append(label, value, secondary); content.append(wind);
        }
        const grid = document.createElement("dl"); grid.className = "tc-popup-grid";
        const addMetric = (label, value) => { if (!value) return; const item = document.createElement("div"), term = document.createElement("dt"), detail = document.createElement("dd"); term.textContent = label; detail.textContent = value; item.append(term,detail); grid.append(item); };
        addMetric("Wind gusts", gustKnots ? `${gustKnots} kt${gustMph ? ` · ${gustMph} mph` : ""}` : "");
        addMetric("Pressure", pressure ? `${pressure} mb` : ""); addMetric("Motion", motion); addMetric("Position", position);
        content.append(grid);
        new maplibregl.Popup({ offset:12, maxWidth:"330px", className:"tc-forecast-popup" }).setLngLat(coordinates).setDOMContent(content).addTo(map);
      });
    });
    let guidanceLoaded = false;
    const setMode = async (mode) => {
      modes.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.tcMode === mode)); satelliteSelect.hidden = mode !== "satellite";
      ["geocolor","abi13","abi10"].forEach((product) => map.setLayoutProperty(`sat-${product}`,"visibility",mode === "satellite" && satelliteSelect.value === product ? "visible" : "none"));
      ["guidance","guidance-casing"].forEach((layer) => map.setLayoutProperty(layer,"visibility",mode === "models" ? "visible" : "none"));
      if (mode === "models" && !guidanceLoaded) { guidanceLoaded = true; const data = await fetch(`/api/nhc/guidance?storm=${encodeURIComponent(id)}`,{cache:"no-store"}).then((response)=>response.json()); if(data.features) map.getSource("guidance")?.setData(data); }
    };
    modes.addEventListener("click", (event) => { const mode = event.target.closest("[data-tc-mode]")?.dataset.tcMode; if(mode) setMode(mode).catch(()=>{}); }); satelliteSelect.addEventListener("change",()=>setMode("satellite")); satelliteSelect.hidden = true;
    host.querySelector("[data-tc-export]").addEventListener("click", async () => {
      map.triggerRepaint(); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const source = map.getCanvas(), canvas = document.createElement("canvas");
      const headerHeight = 154, footerHeight = 78, mapHeight = 668;
      canvas.width = 1400; canvas.height = 900; const context = canvas.getContext("2d");
      const sourceRatio = source.width / source.height, frameRatio = canvas.width / mapHeight;
      const cropWidth = sourceRatio > frameRatio ? source.height * frameRatio : source.width;
      const cropHeight = sourceRatio > frameRatio ? source.height : source.width / frameRatio;
      const cropX = (source.width - cropWidth) / 2, cropY = (source.height - cropHeight) / 2;
      context.fillStyle = "#e9e3d7"; context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(source,cropX,cropY,cropWidth,cropHeight,0,headerHeight,canvas.width,mapHeight);
      context.fillStyle = "#e9e3d7"; context.fillRect(0,0,canvas.width,headerHeight); context.fillStyle = "#d39a42"; context.fillRect(0,headerHeight-5,canvas.width,5);
      const updated = new Date(storm.lastUpdate).toLocaleString([], { month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short" });
      context.fillStyle = "#6f7068"; context.font = "800 12px Arial"; context.fillText("OFFICIAL NHC FORECAST",32,27);
      context.textAlign = "right"; context.fillText(`LAST UPDATED · ${updated.toUpperCase()}`,1368,27); context.textAlign = "left";
      context.fillStyle = "#24251f"; context.font = "800 32px Arial"; context.fillText(`${String(storm.name).toUpperCase()} · ${String(storm.classification).toUpperCase()}`,32,65);
      const stats = [["MAXIMUM WIND",`${storm.intensity} kt`],["MINIMUM PRESSURE",`${storm.pressure} mb`],["MOVEMENT",`${compass(storm.movementDir)} · ${storm.movementSpeed} mph`]];
      stats.forEach(([label,value],index)=>{const x=32+index*450;context.fillStyle="#7b7b72";context.font="800 10px Arial";context.fillText(label,x,101);context.fillStyle="#252620";context.font="800 20px Arial";context.fillText(String(value),x,128);if(index<2){context.fillStyle="#c7c1b6";context.fillRect(x+410,91,1,40);}});
      const legendY = headerHeight + mapHeight - 73; context.fillStyle = "rgba(239,234,224,.94)"; context.fillRect(22,legendY,706,54);
      context.fillStyle="#6f7068";context.font="800 10px Arial";context.fillText("FORECAST INTENSITY",38,legendY+20);
      [["TD","#8fac72"],["TS","#d2ae32"],["Cat 1","#d4962e"],["Cat 2","#db7136"],["Cat 3","#cf4d3d"],["Cat 4","#b75caa"],["Cat 5","#9150b8"]].forEach(([label,color],index)=>{const x=172+index*76;context.fillStyle=color;context.beginPath();context.arc(x,legendY+28,6,0,Math.PI*2);context.fill();context.fillStyle="#34352f";context.font="700 11px Arial";context.fillText(label,x+11,legendY+32);});
      context.fillStyle="#252620"; context.fillRect(0,canvas.height-footerHeight,canvas.width,footerHeight);
      context.fillStyle="#9c9b91"; context.font="800 10px Arial"; context.fillText("TROPICAL ADVISORIES",30,canvas.height-47);
      if (legendItems.length) legendItems.slice(0,3).forEach((item,index)=>{const x=30+index*235;context.strokeStyle=item.color;context.lineWidth=4;context.setLineDash(item.kind==="watch"?[9,6]:[]);context.beginPath();context.moveTo(x,canvas.height-25);context.lineTo(x+32,canvas.height-25);context.stroke();context.setLineDash([]);context.fillStyle="#dfd9ce";context.font="700 11px Arial";context.fillText(item.label,x+43,canvas.height-21);}); else { context.fillStyle="#dfd9ce";context.font="700 11px Arial";context.fillText("No coastal watches or warnings",30,canvas.height-21); }
      const logo = new Image(); logo.src="/ZNWS.png"; await new Promise((resolve)=>{logo.onload=resolve;logo.onerror=resolve;}); if(logo.complete&&logo.naturalWidth)context.drawImage(logo,1304,canvas.height-70,54,54);
      const link=document.createElement("a");link.download=`${String(storm.name||id).toLowerCase().replace(/[^a-z0-9]+/g,"-")}-forecast-map.png`;link.href=canvas.toDataURL("image/png");link.click();
    });
  }).catch((error) => {
    host.innerHTML = `<div class="tc-map-shell" style="display:grid;place-items:center;padding:32px"><p>${escapeHtml(error.message || "The interactive storm map is temporarily unavailable.")}</p></div>`;
  });
})();
