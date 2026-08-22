(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const empty = { type: "FeatureCollection", features: [] };
  let state = window.SpcDesk.createState();
  let counties = empty;
  let states = empty;
  let active = [];
  let discussions = empty;
  let drawing = false;
  let removed = [];
  let placingBox = false;
  let dragHandle = null;
  let ignoreNextClick = false;
  let originalExpiresAt = null;
  let areaResolved = false;
  let hoveredWatchId = "";
  let hoverFlashTimer = null;
  let hoverCwaTimer = null;
  // A lifecycle publish and the 15-second poll can overlap. Ignore any poll
  // that began before a local publish, otherwise its stale response can paint
  // the pre-update county set until the next refresh.
  let activeLoadVersion = 0;
  let activeMutationInFlight = false;
  let activeLoadPromise = null;
  let lastDistributionJob = null;
  let distributionQueue = Promise.resolve();
  const outlookControllers = new Map();
  let discussionController = null;
  let discussionFlashTimer = null;
  let discussionFlashIndex = -1;
  const draftStorageKey = "spc-ops-draft-v1";
  let draftSaveTimer = null;
  let draftRestoreComplete = false;

  const map = new maplibregl.Map({
    container: "spcBetaMap", center: [-96, 38], zoom: 4,
    preserveDrawingBuffer: false,
    style: { version: 8, sources: { base: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256, attribution: "© OpenStreetMap © CARTO" } }, layers: [{ id: "base", type: "raster", source: "base" }] }
  });
  map.addControl(new maplibregl.NavigationControl(), "bottom-right");

  function notice(message, error = false) { $("betaNotice").textContent = message; $("betaNotice").classList.toggle("error", error); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]); }
  function fc(features = []) { return { type: "FeatureCollection", features }; }
  function fips(item) { return String(item?.fips || item?.ugc || ""); }
  function openSidebarSection(target) {
    const wanted=target?.closest?.(".card")||target;if(!wanted?.classList?.contains("card"))return;
    if(!wanted.parentElement?.classList.contains("watch-editor-drawer"))return;
    wanted.parentElement.querySelectorAll(":scope > .editor-step").forEach((card)=>card.classList.toggle("editor-step-active",card===wanted));
    wanted.parentElement.querySelectorAll("[data-editor-step]").forEach((button)=>button.setAttribute("aria-selected",String(button.dataset.editorStep===wanted.dataset.editorStep)));
    try{localStorage.setItem("spc-ops-open-section",wanted.dataset.sidebarSection||"");}catch{/* preferences unavailable */}
  }
  function setWatchEditorOpen(open=true,target=null) {
    document.body.classList.toggle("watch-editor-open",open);$("watchEditorDrawer")?.setAttribute("aria-hidden",String(!open));if(open&&target)openSidebarSection(target?.closest?.(".card")||target);
  }
  function setupWatchEditorDrawer() {
    const desk=document.querySelector(".desk"),header=desk?.querySelector(".desk-header");if(!desk||!header)return;
    const launch=document.createElement("button");launch.id="openWatchEditor";launch.type="button";launch.className="watch-editor-launch";launch.textContent="Watch Editor";header.append(launch);
    const backdrop=document.createElement("button");backdrop.type="button";backdrop.className="watch-editor-backdrop";backdrop.setAttribute("aria-label","Close Watch Editor");document.body.append(backdrop);
    const drawer=document.createElement("aside");drawer.id="watchEditorDrawer";drawer.className="watch-editor-drawer";drawer.setAttribute("aria-hidden","true");drawer.innerHTML='<header><div><small>SPC issuance workflow</small><h2>Watch Editor</h2></div><button id="closeWatchEditor" type="button" aria-label="Close Watch Editor">×</button></header><div id="watchEditorMode" class="watch-editor-mode is-new"><span><b>NEW</b><em>Creating a new watch</em></span><button id="exitWatchEdit" type="button" hidden>Exit edit</button></div><nav class="watch-editor-steps" aria-label="Watch creation steps"></nav>';document.body.append(drawer);
    [$("product"),$("orientation"),$("portions"),$("productText")].map((node)=>node?.closest(".card")).filter(Boolean).forEach((card)=>drawer.append(card));
    launch.onclick=()=>setWatchEditorOpen(true,$("product"));backdrop.onclick=()=>setWatchEditorOpen(false);$("closeWatchEditor").onclick=()=>setWatchEditorOpen(false);
  }
  function setupSidebarAccordion() {
    const cards=[...document.querySelectorAll(".watch-editor-drawer > .card")];
    const labels=["Setup","Area","Details","Review"],nav=document.querySelector(".watch-editor-steps");
    cards.forEach((card,index)=>{card.classList.add("editor-step");card.dataset.editorStep=String(index);const button=document.createElement("button");button.type="button";button.dataset.editorStep=String(index);button.innerHTML=`<b>${index+1}</b><span>${labels[index]||`Step ${index+1}`}</span>`;button.onclick=()=>openSidebarSection(card);nav?.append(button);});
    openSidebarSection(cards[0]);
  }
  function syncForm() {
    state.product = $("product").value; state.validHours = Number($("hours").value) || 6;
    state.hailId = $("hail").value; state.windId = $("wind").value;
    state.tornadoes = state.product === "TOA" || $("tornadoes").checked; state.pds = $("pds").checked;
    state.intenseTornadoes = $("intenseTornadoes").checked; state.veryLargeHail = $("veryLargeHail").checked; state.significantWind = $("significantWind").checked;
    state.portionsText = $("portions").value; state.discussion = $("summary").value; state.forecaster = $("forecaster").value;
    state.replacing = $("replacing").value; state.axisOverride = $("axis").value;
    $("tornadoes").checked = state.tornadoes; $("tornadoes").disabled = state.product === "TOA";
  }
  function scheduleDraftSave() {
    if (!draftRestoreComplete) return;
    window.clearTimeout(draftSaveTimer);
    draftSaveTimer = window.setTimeout(() => {
      try {
        const compactState = { ...state, counties: [], resolvedCounties: [], places: [] };
        const fields = Object.fromEntries(["product","hours","hail","wind","tornadoes","intenseTornadoes","veryLargeHail","significantWind","pds","practice","portions","summary","replacing","axis","forecaster","productText","orientation","rotation","boxLength","boxWidth","slant"].map((id) => {
          const element = $(id); return [id, element?.type === "checkbox" ? Boolean(element.checked) : element?.value ?? ""];
        }));
        localStorage.setItem(draftStorageKey, JSON.stringify({ savedAt: Date.now(), state: compactState, includedFips: state.counties.map(fips), resolvedFips: (state.resolvedCounties || []).map(fips), removedFips: removed.map(fips), areaResolved, fields }));
      } catch (error) { console.warn("SPC Ops draft autosave unavailable", error); }
    }, 350);
  }
  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
      if (!saved || Date.now() - Number(saved.savedAt || 0) > 7 * 86400000) return false;
      // Never reopen an active watch as the editor's implicit draft after an
      // Electron/browser restart. Active watches remain available in the
      // inventory for an explicit CON/CAN selection; startup should be NEW.
      if (saved.state?.status === "active" || saved.state?.watchId) {
        localStorage.removeItem(draftStorageKey);
        return false;
      }
      state = Object.assign(window.SpcDesk.createState(), saved.state || {});
      const desiredCodes=new Set([...(saved.includedFips||[]),...(saved.resolvedFips||[]),...(saved.removedFips||[])].map(String));
      const records = new Map([...desiredCodes].map((code) => [code,window.SpcDesk.countyRecordFromFips(code,counties,{})]).filter(([,record])=>record));
      state.counties = (saved.includedFips || []).map((code) => records.get(String(code))).filter(Boolean);
      state.resolvedCounties = (saved.resolvedFips || saved.includedFips || []).map((code) => records.get(String(code))).filter(Boolean);
      removed = (saved.removedFips || []).map((code) => records.get(String(code))).filter(Boolean);
      areaResolved = Boolean(saved.areaResolved && state.counties.length);
      for (const [id, value] of Object.entries(saved.fields || {})) { const element = $(id); if (!element) continue; if (element.type === "checkbox") element.checked = Boolean(value); else element.value = value; }
      originalExpiresAt = state.status === "active" ? state.expiresAt || null : null;
      syncForm(); render();
      notice(`Recovered SPC draft saved ${new Date(saved.savedAt).toLocaleTimeString()} · ${state.counties.length} counties.`);
      return true;
    } catch (error) { console.warn("SPC Ops draft recovery unavailable", error); return false; }
  }
  function countyFeatures(list, properties = {}) { return window.SpcDesk.countyDisplayFeatures({ counties: list }, properties); }
  function liveOtherWatches(excludeId = state.watchId) {
    const now = Date.now();
    return active.filter((watch) => watch.kind === "spc-watch" && watch.status === "active" && watch.id !== excludeId && (!watch.expiresAt || new Date(watch.expiresAt).getTime() > now));
  }
  function overlapDetails(list = state.counties, excludeId = state.watchId) {
    const owners = new Map();
    liveOtherWatches(excludeId).forEach((watch) => (watch.counties || []).forEach((county) => {
      const key = fips(county); if (!key) return;
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(watch);
    }));
    return (list || []).map((county) => ({ county, watches: owners.get(fips(county)) || [] })).filter((item) => item.watches.length);
  }
  function destination(origin, bearing, miles) {
    return window.turf.destination(window.turf.point(origin), Number(miles) || 0, Number(bearing) || 0, { units: "miles" }).geometry.coordinates;
  }
  function buildBox(center, bearing, halfLength, halfWidth, slantMiles) {
    const back = destination(center, bearing + 180, halfLength), front = destination(center, bearing, halfLength), halfSlant = slantMiles / 2;
    return [
      destination(destination(back, bearing + 180, halfSlant), bearing - 90, halfWidth),
      destination(destination(front, bearing + 180, halfSlant), bearing - 90, halfWidth),
      destination(destination(front, bearing, halfSlant), bearing + 90, halfWidth),
      destination(destination(back, bearing, halfSlant), bearing + 90, halfWidth)
    ];
  }
  function applyBox(clearAreas = true) {
    if (!state.boxCenter) return;
    state.boxBearing = Number($("rotation").value) || 0; state.boxHalfLength = Math.max(25, (Number($("boxLength").value) || 360) / 2);
    state.boxHalfWidth = Math.max(15, (Number($("boxWidth").value) || 120) / 2); state.boxSlantMiles = Number($("slant").value) || 0;
    state.vertices = buildBox(state.boxCenter, state.boxBearing, state.boxHalfLength, state.boxHalfWidth, state.boxSlantMiles);
    state.polygon = window.SpcDesk.verticesToPolygon(state.vertices);
    if (clearAreas) { state.counties = []; state.resolvedCounties = []; state.states = []; removed = []; state.text = ""; areaResolved = false; }
    render();
  }
  function render() {
    const meta = window.SpcDesk.getProductMeta(state.product);
    const included = countyFeatures(state.counties, { color: meta.color });
    map.getSource("draft")?.setData(fc(state.polygon ? [{ type: "Feature", properties: { color: meta.color }, geometry: state.polygon }] : []));
    map.getSource("included")?.setData(fc(included));
    map.getSource("overlap")?.setData(fc(countyFeatures(overlapDetails().map((item) => item.county))));
    map.getSource("removed")?.setData(fc(countyFeatures(removed)));
    const handles = (state.vertices || []).map((coordinates, index) => ({ type: "Feature", properties: { index, kind: "corner" }, geometry: { type: "Point", coordinates } }));
    if (state.boxCenter) handles.push({ type: "Feature", properties: { kind: "center" }, geometry: { type: "Point", coordinates: state.boxCenter } });
    map.getSource("vertices")?.setData(fc(handles));
    $("finish").disabled = !(drawing && state.vertices.length >= 3);
    $("countyCount").textContent = `${state.counties.length} count${state.counties.length === 1 ? "y" : "ies"}`;
    $("stateCount").textContent = `${state.states.length} state${state.states.length === 1 ? "" : "s"}`;
    $("resolve").disabled = !state.polygon;
    const editing = state.status === "active" && Boolean(state.watchId);
    $("issue").disabled = editing; $("issue").hidden = editing; $("update").disabled = !editing; $("cancel").disabled = !editing;
    $("update").closest(".lifecycle").hidden = !editing;
    $("product").disabled = editing; $("practice").disabled = editing;
    const mode=$("watchEditorMode");if(mode){mode.classList.toggle("is-edit",editing);mode.classList.toggle("is-new",!editing);mode.querySelector("b").textContent=editing?"EDIT / CON":"NEW";mode.querySelector("em").textContent=editing?`${state.productId||window.SpcDesk.formatProductId(state.product,state.watchNumber)} · original expiration retained`:"Creating a new watch";$("exitWatchEdit").hidden=!editing;}
    $("issue").textContent = `Issue NEW to production${state.counties.length ? ` · ${state.counties.length} counties` : ""}`;
    $("draftStatus").textContent = areaResolved
      ? `Area resolved · ${state.counties.length} counties / ${state.states.length} states`
      : state.polygon ? "Area changed · resolve counties" : "Draft not generated";
    renderCwaChecklist();
    renderOverlapWorkflow();
    scheduleDraftSave();
  }
  function renderOverlapWorkflow() {
    const host = $("overlapWorkflow"); if (!host) return;
    const overlaps = overlapDetails();
    if (!overlaps.length) { host.hidden = true; host.innerHTML = ""; return; }
    const watchLabels = [...new Set(overlaps.flatMap((item) => item.watches.map((watch) => watch.productId || watch.id)))];
    host.hidden = false;
    host.innerHTML = `<strong>${overlaps.length} overlapping count${overlaps.length === 1 ? "y" : "ies"}</strong>Already included in ${watchLabels.join(", ")}. They remain in this draft unless explicitly removed.<br><button id="removeOverlaps" type="button">Remove overlapping counties</button>`;
  }
  function removeOverlappingCounties() {
    const overlaps = overlapDetails(); if (!overlaps.length) return;
    const labels = [...new Set(overlaps.flatMap((item) => item.watches.map((watch) => watch.productId || watch.id)))];
    if (!window.confirm(`Remove ${overlaps.length} counties already covered by ${labels.join(", ")} from this draft?`)) return;
    const overlapFips = new Set(overlaps.map((item) => fips(item.county)));
    const dropped = state.counties.filter((county) => overlapFips.has(fips(county)));
    state.counties = state.counties.filter((county) => !overlapFips.has(fips(county)));
    const removedFips = new Set(removed.map(fips));
    dropped.forEach((county) => { if (!removedFips.has(fips(county))) removed.push(county); });
    state.text = ""; areaResolved = state.counties.length > 0; recalcStates(); render();
    notice(`Removed ${dropped.length} overlapping counties from the draft. Click a black county to add it back.`);
  }
  function renderCwaChecklist() {
    const host = $("cwaChecklist"); if (!host) return;
    const groups = window.SpcDesk.groupCountiesByWfo(state.resolvedCounties || []);
    host.innerHTML = groups.length ? `<strong class="cwa-heading">CWA inclusion</strong>${groups.map((group) => {
      const included = state.wfoInclude?.[group.wfo] !== false;
      return `<label class="check cwa-row" data-cwa-row="${group.wfo}"><input type="checkbox" data-cwa="${group.wfo}" ${included ? "checked" : ""}><span><b>${group.wfo}</b> · ${group.count} count${group.count === 1 ? "y" : "ies"} · ${group.states.join("/")}</span></label>`;
    }).join("")}` : '<p class="help">Resolve counties to populate intersecting CWAs.</p>';
  }
  function applyCwaSelection() {
    const full = state.resolvedCounties || [];
    state.counties = window.SpcDesk.applyWfoInclude(full, state.wfoInclude);
    const included = new Set(state.counties.map(fips)); removed = full.filter((county) => !included.has(fips(county)));
    recalcStates(); state.text = ""; areaResolved = state.counties.length > 0; render();
  }
  function recalcStates() {
    const counts = new Map(); state.counties.forEach((c) => counts.set(c.state, (counts.get(c.state) || 0) + 1));
    state.states = [...counts].filter(([abbr]) => abbr).map(([abbr, count]) => ({ abbr, count }));
  }
  function activeFeatures() {
    // The SPC desk is intentionally isolated from WFO/zone-based hazards.
    // Only SPC watch records belong in this inventory and map source.
    return active.filter((w) => w.kind === "spc-watch" && w.status === "active" && (!w.expiresAt || new Date(w.expiresAt) > new Date()))
      .flatMap((w) => window.SpcDesk.countyDisplayFeatures(w, { id: w.id, hovered: w.id === hoveredWatchId ? 1 : 0, color: w.color || window.SpcDesk.getProductMeta(w.product).color }));
  }
  function timeLeft(value) {
    const ms = new Date(value || 0).getTime() - Date.now(); if (!Number.isFinite(ms) || ms <= 0) return "Expired";
    const totalMinutes = Math.ceil(ms / 60000), hours = Math.floor(totalMinutes / 60), minutes = totalMinutes % 60;
    return hours ? `${hours}h ${String(minutes).padStart(2,"0")}m left` : `${minutes}m left`;
  }
  function refreshCountdowns() {
    document.querySelectorAll("[data-watch-expires]").forEach((node) => { const text = timeLeft(node.dataset.watchExpires); node.textContent = text; node.classList.toggle("urgent", /^([1-9]|[12][0-9])m left$/.test(text)); });
  }
  function renderActive() {
    const live = active.filter((w) => w.kind === "spc-watch" && w.status === "active" && (!w.expiresAt || new Date(w.expiresAt) > new Date()));
    $("activeWatches").innerHTML = live.length ? live.map((w) => `<button class="watch-item${state.watchId===w.id?" is-selected":""}" data-watch="${w.id}" aria-pressed="${state.watchId===w.id}" style="--watch:${w.color || "#db7093"}"><span><strong>${w.productId || w.id} <em data-watch-expires="${w.expiresAt || ""}"></em></strong><small>${w.productName || w.product} · ${w.counties?.length || 0} counties · until ${String(w.expiresAt || "").slice(11,16)}Z</small></span><i></i></button>`).join("") : "<p>No active SPC watches.</p>";
    map.getSource("active")?.setData(fc(activeFeatures()));
    refreshCountdowns();
  }
  function setHoveredWatch(id) {
    hoveredWatchId = id || ""; map.getSource("active")?.setData(fc(activeFeatures()));
    window.clearInterval(hoverFlashTimer); hoverFlashTimer = null;
    if (!hoveredWatchId || !map.getLayer("active-hover")) return;
    let bright = true; map.setPaintProperty("active-hover", "line-opacity", 1);
    hoverFlashTimer = window.setInterval(() => { bright = !bright; if (map.getLayer("active-hover")) map.setPaintProperty("active-hover", "line-opacity", bright ? 1 : .2); }, 360);
  }
  function setHoveredCwa(code) {
    window.clearInterval(hoverCwaTimer); hoverCwaTimer = null;
    const group = window.SpcDesk.groupCountiesByWfo(state.resolvedCounties || []).find((item) => item.wfo === code);
    map.getSource("cwa-hover")?.setData(fc(group ? countyFeatures(group.counties, { cwa: code }) : []));
    if (!group || !map.getLayer("cwa-hover-line")) return;
    let bright = true; map.setPaintProperty("cwa-hover-line", "line-opacity", 1); map.setPaintProperty("cwa-hover-fill", "fill-opacity", .24);
    hoverCwaTimer = window.setInterval(() => { bright = !bright; if (map.getLayer("cwa-hover-line")) { map.setPaintProperty("cwa-hover-line", "line-opacity", bright ? 1 : .3); map.setPaintProperty("cwa-hover-fill", "fill-opacity", bright ? .24 : .07); } }, 360);
  }
  async function loadActive() {
    if (activeMutationInFlight) return;
    if (activeLoadPromise) return activeLoadPromise;
    const loadVersion = ++activeLoadVersion;
    activeLoadPromise = (async () => {
      try {
        const response = await fetch("/api/ops/products?scope=active-spc", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextActive = (await response.json()).warnings || [];
        if (loadVersion !== activeLoadVersion) return;
        active = nextActive; renderActive(); render(); notice(`Loaded ${active.filter((w) => w.kind === "spc-watch" && w.status === "active").length} active watches.`);
      } catch (error) { notice(`Could not load active watches: ${error.message}`, true); }
      finally { activeLoadPromise = null; }
    })();
    return activeLoadPromise;
  }
  function acceptLoadedWatches(watches) {
    if (!Array.isArray(watches)) return;
    active = watches;
    renderActive();
    render();
  }
  window.addEventListener("spc-ops-watches-loaded", (event) => acceptLoadedWatches(event.detail));
  function setRadarVisible(visible) {
    if (!map.isStyleLoaded()) return;
    const id = "beta-iem-radar";
    if (!visible) { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); return; }
    if (!map.getSource(id)) map.addSource(id, { type: "raster", tiles: ["/api/public/radar/iem/{z}/{x}/{y}"], tileSize: 256, attribution: "IEM NEXRAD composite" });
    if (!map.getLayer(id)) map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": .78 } }, map.getLayer("cwas") ? "cwas" : undefined);
  }
  function applySelectedOperationalLayers() {
    if (!map.isStyleLoaded()) { window.setTimeout(applySelectedOperationalLayers,250); return; }
    setRadarVisible(Boolean($("layerRadar")?.checked));
    if(map.getLayer("discussion-fill"))map.setLayoutProperty("discussion-fill","visibility",$("layerDiscussions")?.checked?"visible":"none");
    if(map.getLayer("discussion-halo"))map.setLayoutProperty("discussion-halo","visibility",$("layerDiscussions")?.checked?"visible":"none");
    if(map.getLayer("discussion-line"))map.setLayoutProperty("discussion-line","visibility",$("layerDiscussions")?.checked?"visible":"none");
    if(map.getLayer("discussion-flash"))map.setLayoutProperty("discussion-flash","visibility",$("layerDiscussions")?.checked?"visible":"none");
    if($("layerDiscussions")?.checked)void loadDiscussions();
    document.querySelectorAll("[data-outlook]").forEach((input)=>void setOutlookVisible(input.dataset.outlook,Boolean(input.checked)));
  }
  async function setOutlookVisible(key, visible) {
    if (!map.isStyleLoaded()) return;
    const sourceId = `beta-outlook-${key}`, fillId = `${sourceId}-fill`, lineId = `${sourceId}-line`;
    outlookControllers.get(key)?.abort();
    outlookControllers.delete(key);
    if (!visible) { if (map.getLayer(lineId)) map.removeLayer(lineId); if (map.getLayer(fillId)) map.removeLayer(fillId); if (map.getSource(sourceId)) map.removeSource(sourceId); return; }
    const controller = new AbortController(); outlookControllers.set(key, controller);
    try {
      const response = await fetch(`/api/spc/outlook/${key}`, { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json();
      if (controller.signal.aborted || !document.querySelector(`[data-outlook="${key}"]`)?.checked) return;
      if (map.getSource(sourceId)) map.getSource(sourceId).setData(data); else {
        map.addSource(sourceId, { type: "geojson", data });
        const before = map.getLayer("cwas") ? "cwas" : undefined;
        map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": ["coalesce", ["get","fill"], ["get","color"], "#c084fc"], "fill-opacity": .3 } }, before);
        map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": ["coalesce", ["get","stroke"], ["get","fill"], "#fff"], "line-width": 1.5, "line-opacity": .9 } }, before);
      }
    } catch (error) { if (error.name !== "AbortError") notice(`SPC ${key} outlook unavailable: ${error.message}`, true); }
    finally { if (outlookControllers.get(key) === controller) outlookControllers.delete(key); }
  }
  function discussionLabel(feature, index) {
    const properties=feature?.properties||{},detail=properties.detail||{},number=detail.number||properties.discussion_number||properties.discussionNumber||properties.md||properties.number||properties.label||properties.name||index+1;
    const rawTitle=detail.concerning||properties.headline||properties.title||properties.name||"Mesoscale Discussion",title=String(rawTitle).replace(/\s+Valid\s+\d{6}Z[\s\S]*$/i,"").trim();
    return { number:String(number).replace(/^MD\s*/i,""), title, valid:detail.valid||properties.folderpath||properties.expire||properties.expires||properties.end_time||properties.valid_time||"", probability:detail.watchProbability, areas:detail.areasAffected||"", summary:detail.summary||"", discussion:detail.discussion||"", peakTornado:detail.peakTornado||"", peakWind:detail.peakWind||"", peakHail:detail.peakHail||"", productUrl:detail.productUrl||properties.popupinfo||"" };
  }
  function discussionThreat(item) {
    const text=`${item.title} ${item.summary} ${item.discussion}`.toLowerCase(),usable=(value)=>value&&!/^(?:n\/?a|none|0(?:\.0+)?(?:\s*(?:in|mph))?)$/i.test(String(value).trim());
    const tornado=usable(item.peakTornado)||/\btornad(?:o|oes|ic)\b/.test(text),wind=usable(item.peakWind)||/\b(?:damaging winds?|wind damage|severe wind gusts?)\b/.test(text),hail=usable(item.peakHail)||/\b(?:large|severe|significant|very large) hail\b/.test(text);
    const probability=Number(item.probability),threats=[tornado&&"TOR",wind&&"Wind",hail&&"Hail"].filter(Boolean).join(" / ")||"General";
    if(probability>=80)return {key:"watch-extreme",label:`${probability}% · ${threats}`,color:"#ef4444"};
    if(probability>=60)return {key:"watch-high",label:`${probability}% · ${threats}`,color:"#f97316"};
    if(probability>=40)return {key:"watch-medium",label:`${probability}% · ${threats}`,color:"#facc15"};
    if(probability>=20)return {key:"watch-low",label:`${probability}% · ${threats}`,color:"#38bdf8"};
    return {key:"watch-unlikely",label:`${Number.isFinite(probability)?`${probability}%`:"No %"} · ${threats}`,color:"#a855f7"};
  }
  function renderDiscussions() {
    const features=discussions.features||[],host=$("discussionList");
    const ordered=features.map((feature,index)=>({feature,index,item:discussionLabel(feature,index)})).sort((a,b)=>(Number(b.item.probability)||-1)-(Number(a.item.probability)||-1)||Number(b.item.number)-Number(a.item.number));
    host.innerHTML=ordered.length?ordered.map(({item,index})=>{const threat=discussionThreat(item),probability=Number.isFinite(Number(item.probability))?`${item.probability}%`:"—",chips=[[`Watch`,probability,"probability"],[`TOR`,item.peakTornado||(/tornad/i.test(`${item.title} ${item.summary}`)?"Possible":"—"),"tornado"],[`Wind`,item.peakWind||"—","wind"],[`Hail`,item.peakHail||"—","hail"]];return `<article class="md-item md-${threat.key}" data-discussion="${index}" style="--md-color:${threat.color}"><div class="md-signals">${chips.map(([label,value,key])=>`<span class="md-signal ${key}"><b>${esc(label)}</b>${esc(value)}</span>`).join("")}</div><button class="watch-item" type="button" style="--watch:${threat.color}"><span><strong>MD ${esc(item.number)} <em>${esc(threat.label)}</em></strong><small>${esc(item.title)}</small></span><i></i></button>${item.valid?`<p class="md-valid"><b>Valid:</b> ${esc(item.valid)}</p>`:""}${item.summary?`<details class="md-discussion"><summary>Discussion</summary><p>${esc(item.summary)}</p>${item.productUrl?`<a href="${esc(item.productUrl.replace(/^http:/,"https:"))}" target="_blank" rel="noopener">Full SPC discussion</a>`:""}</details>`:item.productUrl?`<a href="${esc(item.productUrl.replace(/^http:/,"https:"))}" target="_blank" rel="noopener">Full SPC discussion</a>`:""}</article>`;}).join(""):"<p>No active mesoscale discussions.</p>";
    host.querySelectorAll("[data-discussion]").forEach((card)=>{const actions=document.createElement("span");actions.className="md-create-actions";actions.innerHTML=`<button class="md-create-trigger" type="button" data-create-watch="${card.dataset.discussion}">Create watch</button>`;card.append(actions);});
  }
  function flashDiscussion(index=-1) {
    discussionFlashIndex=Number.isFinite(Number(index))?Number(index):-1;
    window.clearInterval(discussionFlashTimer);discussionFlashTimer=null;
    if(!map.getLayer("discussion-flash"))return;
    map.setFilter("discussion-flash",["==",["get","mdIndex"],discussionFlashIndex]);
    map.setPaintProperty("discussion-flash","line-opacity",discussionFlashIndex<0?0:1);
    if(discussionFlashIndex<0)return;
    let bright=true;discussionFlashTimer=window.setInterval(()=>{if(!map.getLayer("discussion-flash")){window.clearInterval(discussionFlashTimer);return;}bright=!bright;map.setPaintProperty("discussion-flash","line-opacity",bright?1:.18);map.setPaintProperty("discussion-flash","line-width",bright?8:4);},320);
  }
  function mdOptionValue(raw, options, field, fallback) {
    const values=[...String(raw||"").matchAll(/\d+(?:\.\d+)?/g)].map((match)=>Number(match[0])).filter(Number.isFinite);if(!values.length)return fallback;
    const midpoint=values.length>1?(values[0]+values[1])/2:values[0],choices=options.filter((item)=>Number(item[field])>0);
    const choice=choices.reduce((best,item)=>{if(!best)return item;const distance=Math.abs(Number(item[field])-midpoint),bestDistance=Math.abs(Number(best[field])-midpoint);return distance<bestDistance||(distance===bestDistance&&Number(item[field])>Number(best[field]))?item:best;},null);
    return choice?.id||fallback;
  }
  async function createWatchFromDiscussion(index,requestedProduct) {
    const feature=discussions.features?.[Number(index)];if(!feature?.geometry)return notice("This MD has no usable polygon.",true);
    const item=discussionLabel(feature,Number(index)),text=`${item.title} ${item.summary} ${item.discussion}`,tornado=/\btornad(?:o|oes|ic)\b/i.test(text)||Boolean(item.peakTornado&&!/^(?:n\/?a|none)$/i.test(item.peakTornado));
    const windValue=Number(String(item.peakWind||"").match(/\d+(?:\.\d+)?/)?.[0])||0,hailValue=Number(String(item.peakHail||"").match(/\d+(?:\.\d+)?/)?.[0])||0;
    state=window.SpcDesk.createState();removed=[];drawing=false;placingBox=false;areaResolved=false;originalExpiresAt=null;
    state.product=["TOA","SVA"].includes(requestedProduct)?requestedProduct:"";state.polygon=structuredClone(feature.geometry);state.vertices=feature.geometry.type==="Polygon"?(feature.geometry.coordinates?.[0]||[]).slice(0,-1):[];
    state.hailId=mdOptionValue(item.peakHail,window.SpcDesk.HAIL_OPTIONS||[],"inches","1.00");state.windId=mdOptionValue(item.peakWind,window.SpcDesk.WIND_OPTIONS||[],"mph","70");state.tornadoes=tornado;state.intenseTornadoes=/EF[2-5]|strong tornado/i.test(`${item.peakTornado} ${text}`);state.veryLargeHail=hailValue>=2;state.significantWind=windValue>=80;state.portionsText="";state.discussion="";
    $("product").value=state.product;$("hours").value=state.validHours;$("hours").disabled=false;$("hail").value=state.hailId;$("wind").value=state.windId;$("tornadoes").checked=state.tornadoes;$("intenseTornadoes").checked=state.intenseTornadoes;$("veryLargeHail").checked=state.veryLargeHail;$("significantWind").checked=state.significantWind;$("pds").checked=false;$("portions").value=state.portionsText;$("summary").value=state.discussion;$("replacing").value="";$("axis").value="";$("watchNumber").value="";$("expiration").value="";$("productText").value="";
    syncForm();render();const bounds=window.turf.bbox(feature);map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:80,maxZoom:7});
    setWatchEditorOpen(true,$("product"));notice(`Loading MD ${item.number} into the Watch Editor…`);await resolveCounties();if(areaResolved){scheduleDraftSave();notice(`MD ${item.number} loaded with ${state.counties.length} counties. Select Tornado Watch or Severe Thunderstorm Watch, then review and generate the product.`);$("product")?.focus();}
  }
  async function loadDiscussions() {
    discussionController?.abort(); const controller=new AbortController(); discussionController=controller;
    try { const response=await fetch("/api/discussions/spc",{cache:"no-store",signal:controller.signal}); if(!response.ok)throw new Error(`HTTP ${response.status}`); discussions=await response.json(); (discussions.features||[]).forEach((feature,index)=>{const threat=discussionThreat(discussionLabel(feature,index));feature.properties={...(feature.properties||{}),mdColor:threat.color,mdThreat:threat.label,mdIndex:index};}); map.getSource("discussions")?.setData(discussions); renderDiscussions(); }
    catch(error){if(error.name!=="AbortError")$("discussionList").innerHTML=`<p>Discussion feed unavailable (${esc(error.message)}).</p>`;}
    finally{if(discussionController===controller)discussionController=null;}
  }
  function newDraft() {
    state = window.SpcDesk.createState(); removed = []; drawing = false; placingBox = false; areaResolved = false; $("productText").value = "";
    ["portions", "summary", "replacing", "axis", "forecaster"].forEach((id) => $(id).value = "");
    $("watchNumber").value = ""; $("expiration").value = ""; originalExpiresAt = null;
    $("hours").disabled = false; $("product").disabled = false; $("practice").disabled = false;
    $("product").value = state.product; $("hours").value = state.validHours; $("pds").checked = false; $("intenseTornadoes").checked = false; $("veryLargeHail").checked = false; $("significantWind").checked = false; syncForm(); render(); notice("New SPC operations draft ready.");
  }
  function loadWatch(id) {
    const record = active.find((w) => w.id === id); if (!record) return;
    state = Object.assign(window.SpcDesk.createState(), structuredClone(record), { watchId: record.id, status: "active", action: "CON", vertices: [] });
    state.counties = structuredClone(record.counties || []); state.resolvedCounties = structuredClone(state.counties); removed = []; drawing = false; placingBox = false;
    areaResolved = state.counties.length > 0;
    $("product").value = state.product; $("hours").value = state.validHours || 6; $("hail").value = state.hailId || "1.00"; $("wind").value = state.windId || "70";
    $("tornadoes").checked = state.tornadoes !== false; $("pds").checked = Boolean(state.pds); $("practice").checked = Boolean(state.practice);
    $("intenseTornadoes").checked = Boolean(state.intenseTornadoes); $("veryLargeHail").checked = Boolean(state.veryLargeHail); $("significantWind").checked = Boolean(state.significantWind);
    $("portions").value = state.portionsText || ""; $("summary").value = state.discussion || ""; $("forecaster").value = state.forecaster || ""; $("productText").value = state.text || "";
    $("replacing").value = state.replacing || ""; $("axis").value = state.axisOverride || "";
    $("watchNumber").value = window.SpcDesk.formatProductId(state.product, state.watchNumber); originalExpiresAt = state.expiresAt;
    $("expiration").value = originalExpiresAt ? new Date(originalExpiresAt).toISOString().replace("T", " ").slice(0, 16) + "Z" : "";
    $("hours").disabled = true;
    if ((!state.boxCenter || !state.boxHalfLength || !state.boxHalfWidth) && state.polygon?.type === "Polygon" && state.polygon.coordinates?.[0]?.length >= 4) {
      const ring = state.polygon.coordinates[0].slice(0, 4);
      state.vertices = ring;
      state.boxCenter = window.turf.centroid({ type: "Feature", properties: {}, geometry: state.polygon }).geometry.coordinates;
      state.boxBearing = window.turf.bearing(window.turf.point(ring[0]), window.turf.point(ring[1]));
      if (state.boxBearing < 0) state.boxBearing += 360;
      state.boxHalfLength = window.turf.distance(window.turf.point(ring[0]), window.turf.point(ring[1]), { units: "miles" }) / 2;
      state.boxHalfWidth = window.turf.distance(window.turf.point(ring[1]), window.turf.point(ring[2]), { units: "miles" }) / 2;
      state.boxSlantMiles = 0;
    }
    if (state.boxCenter && state.boxHalfLength && state.boxHalfWidth) {
      $("rotation").value = String(Math.round(Number(state.boxBearing) || 0)); $("boxLength").value = String(Math.round(Number(state.boxHalfLength) * 2));
      $("boxWidth").value = String(Math.round(Number(state.boxHalfWidth) * 2)); $("slant").value = String(Math.round(Number(state.boxSlantMiles) || 0));
      state.vertices = buildBox(state.boxCenter, Number(state.boxBearing) || 0, Number(state.boxHalfLength), Number(state.boxHalfWidth), Number(state.boxSlantMiles) || 0);
    }
    setWatchEditorOpen(true,$("product"));render(); notice(`Loaded ${record.productId || record.id}. Edit counties or details, then issue CON or CAN.`);
    const bounds = window.turf.bbox({ type: "Feature", properties: {}, geometry: record.displayGeometry || record.polygon }); map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]], { padding: 80 });
  }
  async function resolveCounties() {
    if (!state.polygon) return;
    const button = $("resolve"), prior = button.textContent; button.disabled = true; button.textContent = "Resolving…"; notice("Resolving counties against the national boundary database…");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const resolved = window.SpcDesk.resolveAreas(state.polygon, counties, { features: [] });
      state.counties = resolved.counties; state.resolvedCounties = structuredClone(resolved.counties); state.states = resolved.states; state.places = []; state.text = ""; state.wfoInclude = {};
      window.SpcDesk.groupCountiesByWfo(state.resolvedCounties).forEach((group) => { state.wfoInclude[group.wfo] = true; });
      removed = []; areaResolved = state.counties.length > 0; render();
      if (areaResolved) notice(`Area resolved successfully: ${state.counties.length} counties in ${state.states.length} states. Colored counties are included; click one to remove it.`);
      else notice("No counties intersected the watch box. Confirm the box is over the United States and try again.", true);
    } catch (error) { areaResolved = false; notice(`County resolution failed: ${error.message}`, true); }
    finally { button.textContent = prior; button.disabled = !state.polygon; }
  }
  async function generate() {
    const button=$("generate"),prior=button?.textContent;
    try {
      if(button){button.disabled=true;button.textContent="Generating…";}
      syncForm();
      if(!["TOA","SVA"].includes(state.product))return notice("Select Tornado Watch or Severe Thunderstorm Watch before generating the product.",true);
      if(state.polygon&&!state.counties.length)await resolveCounties();
      if (!state.polygon || !state.counties.length) return notice("Draw a watch and resolve at least one county first.", true);
      const now = new Date();
      const editing = state.status === "active" && Boolean(state.watchId);
      const expireAt = editing && originalExpiresAt
        ? new Date(originalExpiresAt)
        : window.SpcDesk.computeExpireTime(now, state.validHours);
      if (Number.isNaN(expireAt.getTime())) return notice("The watch expiration is invalid. Reload the active watch before generating text.", true);
      state.text = window.SpcTemplates.generateWatchText(state, { now, expireAt, otherWatches: active });
      $("productText").value = state.text;
      $("expiration").value = expireAt.toISOString().replace("T", " ").slice(0,16) + "Z";
      $("draftStatus").textContent = `${state.counties.length} counties · ready for review`;
      notice(editing ? `CON text generated; original expiration retained at ${$("expiration").value}.` : "Draft product generated.");
      openSidebarSection($("productText"));
      return true;
    } catch(error) {
      state.text="";$("productText").value="";$("draftStatus").textContent="Generation failed";notice(`Text generation failed: ${error.message}`,true);console.error("[spc-ops] text generation failed",error);return false;
    } finally {if(button){button.disabled=false;button.textContent=prior||"Generate";}}
  }
  function buildWatchSnapshot(record) {
    const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 800;
    const ctx = canvas.getContext("2d"), header = 82, pad = 0;
    const geometries = (record.counties || []).map((county) => county.geometry).filter(Boolean);
    if (!geometries.length && (record.displayGeometry || record.polygon)) geometries.push(record.displayGeometry || record.polygon);
    const points = [];
    const collect = (value) => { if (!Array.isArray(value)) return; if (typeof value[0] === "number" && typeof value[1] === "number") points.push(value); else value.forEach(collect); };
    geometries.forEach((geometry) => collect(geometry.coordinates));
    if (!points.length) throw new Error("Watch has no drawable snapshot geometry");
    let minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0])), minY = Math.min(...points.map((p) => p[1])), maxY = Math.max(...points.map((p) => p[1]));
    const rawSpanX = Math.max(.2, maxX - minX), rawSpanY = Math.max(.2, maxY - minY);
    minX -= rawSpanX * .22; maxX += rawSpanX * .22; minY -= rawSpanY * .22; maxY += rawSpanY * .22;
    let spanX = Math.max(.2, maxX - minX), spanY = Math.max(.2, maxY - minY); const mapW = canvas.width - pad * 2, mapH = canvas.height - header - pad * 2;
    const targetAspect = mapW / mapH, currentAspect = spanX / spanY;
    if (currentAspect < targetAspect) { const add = (spanY * targetAspect - spanX) / 2; minX -= add; maxX += add; }
    else { const add = (spanX / targetAspect - spanY) / 2; minY -= add; maxY += add; }
    spanX = maxX - minX; spanY = maxY - minY;
    const scale = Math.min(mapW / spanX, mapH / spanY), offsetX = pad, offsetY = header + pad;
    const project = ([lng, lat]) => [offsetX + (lng - minX) * scale, offsetY + (maxY - lat) * scale];
    ctx.fillStyle = "#111820"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#202a33"; ctx.fillRect(0, header, canvas.width, canvas.height - header);
    const drawRing = (ring, fill = true) => { if (!ring?.length) return; ctx.beginPath(); ring.forEach((point, index) => { const [x,y] = project(point); if (index) ctx.lineTo(x,y); else ctx.moveTo(x,y); }); ctx.closePath(); if (fill) ctx.fill(); ctx.stroke(); };
    const drawGeometry = (geometry, fill = true) => {
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
      polygons.forEach((polygon) => polygon.forEach((ring) => drawRing(ring, fill)));
    };
    // Deterministic basemap context: state land fill, national state borders,
    // and surrounding county lines. This does not depend on WebGL/raster tiles.
    ctx.save(); ctx.beginPath(); ctx.rect(pad, header + pad, mapW, mapH); ctx.clip();
    ctx.globalAlpha = 1; ctx.fillStyle = "#303b45"; ctx.strokeStyle = "#7f8d99"; ctx.lineWidth = 1.2;
    (states.features || []).forEach((feature) => drawGeometry(feature.geometry, true));
    ctx.fillStyle = "transparent"; ctx.strokeStyle = "rgba(157,172,184,.34)"; ctx.lineWidth = .55;
    (counties.features || []).forEach((feature) => drawGeometry(feature.geometry, false));
    ctx.fillStyle = record.color || window.SpcDesk.getProductMeta(record.product).color; ctx.globalAlpha = .64; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.3;
    geometries.forEach((geometry) => drawGeometry(geometry, true));
    const snapshotOverlaps = overlapDetails(record.counties || [], record.id).map((item) => item.county.geometry).filter(Boolean);
    if (snapshotOverlaps.length) {
      const tile = document.createElement("canvas"); tile.width = 14; tile.height = 14; const tileCtx = tile.getContext("2d");
      tileCtx.strokeStyle = "rgba(255,220,120,.95)"; tileCtx.lineWidth = 3; tileCtx.beginPath(); tileCtx.moveTo(-3,14); tileCtx.lineTo(14,-3); tileCtx.moveTo(4,17); tileCtx.lineTo(17,4); tileCtx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = ctx.createPattern(tile, "repeat"); ctx.strokeStyle = "rgba(255,225,145,.95)"; ctx.lineWidth = 1.5;
      snapshotOverlaps.forEach((geometry) => drawGeometry(geometry, true));
    }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.fillStyle = "rgba(6,9,13,.94)"; ctx.fillRect(0, 0, canvas.width, header); ctx.fillStyle = "#f5f8fb"; ctx.font = "800 27px system-ui,sans-serif"; ctx.fillText(`${record.productId || "SPC WATCH"} · ${record.action || "NEW"}`, 26, 35);
    ctx.fillStyle = "#aebbc7"; ctx.font = "600 15px system-ui,sans-serif"; ctx.fillText(`${record.productName || window.SpcDesk.getProductMeta(record.product).name} · ${(record.counties || []).length} counties · until ${String(record.expiresAt || "").slice(11,16)}Z`, 26, 61);
    ctx.fillStyle = "#f2ba4b"; ctx.font = "800 14px system-ui,sans-serif"; ctx.textAlign = "right"; ctx.fillText("ZASNET SPC OPS", canvas.width - 25, 46); ctx.textAlign = "left";
    return canvas.toDataURL("image/png");
  }
  async function uploadWatchSnapshot(record) {
    const dataUrl = buildWatchSnapshot(record);
    const response = await fetch("/api/ops/map-snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, productId: record.productId, wfo: "SPC", dataUrl }) });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Snapshot HTTP ${response.status}`); return payload;
  }
  const deliveryLabels = { snapshot: "Snapshot", publicSite: "Public", mattermost: "Mattermost", warningServer: "Warning server", placefile: "Placefile" };
  function renderDistributionJob() {
    const panel = $("spcDelivery"), job = lastDistributionJob;
    if (!panel) return;
    panel.hidden = !job;
    if (!job) return;
    const pending = job.pending, results = job.results || {};
    $("spcDeliveryTitle").textContent = `${job.record.productId} ${job.record.action || "NEW"}`;
    $("spcDeliverySummary").textContent = pending ? "Delivery running…" : job.failed ? "Delivery needs attention" : "Delivery complete";
    $("spcDeliveryChannels").innerHTML = Object.entries(deliveryLabels).map(([key,label]) => {
      const item = results[key], state = pending && !item ? "pending" : item?.delivered ? "ok" : "failed";
      const detail = item?.detail || item?.error || (state === "pending" ? "Waiting" : state === "ok" ? "Confirmed" : "Not confirmed");
      return `<span class="delivery-channel ${state}" title="${esc(detail)}"><i></i>${esc(label)}</span>`;
    }).join("");
    const retry = $("retrySpcDistribution"); retry.hidden = pending || !job.failed; retry.disabled = pending;
  }
  async function distributeRecord(record, forceNotify = false) {
    const results = {};
    const job = { record, results, pending: true, failed: false };
    lastDistributionJob = job; renderDistributionJob();
    try {
      await uploadWatchSnapshot(record); results.snapshot = { delivered: true, detail: "Snapshot uploaded" };
    } catch (error) {
      console.warn("SPC Ops snapshot unavailable", error); results.snapshot = { delivered: false, detail: error.message };
    }
    try {
      const response = await fetch("/api/public/alerts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record], focusIds: [record.id], ...(forceNotify ? { notifyMattermost: true } : {}) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Distribution HTTP ${response.status}`);
      Object.assign(results, payload.distribution || {});
    } catch (error) {
      for (const key of ["publicSite","mattermost","warningServer","placefile"]) results[key] = { delivered: false, detail: error.message };
    }
    for (const key of ["publicSite","mattermost","warningServer","placefile"]) results[key] ||= { delivered: false, detail: "No confirmation returned" };
    job.pending = false;
    job.failed = Object.keys(deliveryLabels).some((key) => !results[key]?.delivered);
    renderDistributionJob();
    if (job.failed) notice(`${record.productId} was saved, but one or more delivery steps need retry.`, true);
    else notice(`${record.productId} saved and all 5 delivery steps confirmed.`);
  }
  function queueDistribution(record) {
    distributionQueue = distributionQueue.catch(() => {}).then(() => distributeRecord(record, false));
  }
  async function saveAuthoritativeRecord(record) {
    activeLoadVersion += 1;
    const response = await fetch("/api/ops/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record] }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Ops store HTTP ${response.status}`);
    }
  }
  function acceptSavedRecord(record) {
    const index = active.findIndex((watch) => watch.id === record.id);
    if (index >= 0) active[index] = record; else active.push(record);
    renderActive(); newDraft(); renderActive(); setWatchEditorOpen(false);
  }
  async function issue() {
    syncForm();
    const draftBeforeIssue = structuredClone(state);
    const areaResolvedBeforeIssue = areaResolved;
    const removedBeforeIssue = structuredClone(removed);
    if (state.polygon && !areaResolved) await resolveCounties();
    if (!areaResolved || !state.counties.length) return notice("No counties were resolved. Adjust the box and press Resolve counties before issuing.", true);
    await generate(); if (!state.text) return;
    $("issue").disabled = true;
    try {
      const numberResponse = await fetch("/api/spc/watch-number", { method: "POST" });
      const numberPayload = await numberResponse.json(); if (!numberResponse.ok) throw new Error(numberPayload.error || "Watch number allocation failed");
      const now = new Date(); const expire = window.SpcDesk.computeExpireTime(now, state.validHours);
      state.watchNumber = Number(numberPayload.watchNumber); state.watchId = `SPC-${state.product}-${window.SpcDesk.formatWatchNumber(state.watchNumber)}-${now.getTime()}`;
      state.action = "NEW"; state.status = "active"; state.practice = $("practice").checked; state.issuedAt = now.toISOString(); state.expiresAt = expire.toISOString(); state.segment = 0;
      originalExpiresAt = state.expiresAt; $("watchNumber").value = window.SpcDesk.formatProductId(state.product, state.watchNumber); $("expiration").value = expire.toISOString().replace("T", " ").slice(0,16) + "Z";
      state.text = window.SpcTemplates.generateWatchText(state, { now, expireAt: expire, otherWatches: active }); $("productText").value = state.text;
      const record = window.SpcDesk.snapshot(state); record.practice = state.practice; record.sourceSystem = "spc-ops";
      record.timeline = [{ validFrom: record.issuedAt, validTo: record.expiresAt, action: "NEW", polygon: record.displayGeometry || record.polygon, expiresAt: record.expiresAt, text: record.text }];
      await saveAuthoritativeRecord(record);
      acceptSavedRecord(record);
      notice(record.practice ? `Issued ${record.productId} in Practice Mode. Editor cleared.` : `Issued ${record.productId}. Authoritative save confirmed; delivery is running in the background.`);
      if (!record.practice) queueDistribution(record);
    } catch (error) {
      // NEW becomes active locally before the authoritative PUT so the
      // generated record can be built. If that PUT fails, restore the draft
      // instead of marooning the editor in CON/CAN mode.
      state = draftBeforeIssue;
      areaResolved = areaResolvedBeforeIssue;
      removed = removedBeforeIssue;
      notice(`Issue failed: ${error.message}`, true);
    } finally { render(); }
  }
  function lifecycleRecord(action, now, expire) {
    state.action = action; state.status = action === "CAN" ? "cancelled" : "active"; state.expiresAt = expire.toISOString(); state.segment = (Number(state.segment) || 0) + 1;
    state.text = window.SpcTemplates.generateWatchText(state, { now, expireAt: expire, otherWatches: active }); $("productText").value = state.text;
    const record = window.SpcDesk.snapshot(state); record.practice = Boolean(state.practice); record.sourceSystem = "spc-ops";
    const timeline = Array.isArray(state.timeline) ? structuredClone(state.timeline) : [];
    if (timeline.length) timeline[timeline.length - 1].validTo = now.toISOString();
    if (action !== "CAN") timeline.push({ validFrom: now.toISOString(), validTo: expire.toISOString(), action, polygon: record.displayGeometry || record.polygon, expiresAt: record.expiresAt, text: record.text });
    record.timeline = timeline.slice(-40); state.timeline = record.timeline; return record;
  }
  async function updateWatch() {
    if (state.status !== "active" || !state.watchId) return;
    syncForm(); if (!state.counties.length) return notice("An update must retain at least one county. Cancel the watch instead.", true);
    $("update").disabled = true; activeMutationInFlight = true;
    try {
      const now = new Date(), expire = originalExpiresAt ? new Date(originalExpiresAt) : state.expiresAt ? new Date(state.expiresAt) : window.SpcDesk.computeExpireTime(now, state.validHours);
      if (Number.isNaN(expire.getTime())) throw new Error("The original watch expiration is invalid");
      const record = lifecycleRecord("CON", now, expire); await saveAuthoritativeRecord(record);
      acceptSavedRecord(record); notice(`${record.productId} continuation saved; delivery is running in the background.`); if (!record.practice) queueDistribution(record);
    } catch (error) { notice(`Update failed: ${error.message}`, true); } finally { activeMutationInFlight = false; render(); }
  }
  async function cancelWatch() {
    if (state.status !== "active" || !state.watchId) return;
    if (!window.confirm(`Cancel ${window.SpcDesk.formatProductId(state.product, state.watchNumber)}? This publishes CAN immediately.`)) return;
    $("cancel").disabled = true; activeMutationInFlight = true;
    try {
      syncForm(); const now = new Date(), record = lifecycleRecord("CAN", now, now); await saveAuthoritativeRecord(record);
      acceptSavedRecord(record); notice(`${record.productId} cancellation saved; delivery is running in the background.`); if (!record.practice) queueDistribution(record);
    } catch (error) { notice(`Cancellation failed: ${error.message}`, true); } finally { activeMutationInFlight = false; render(); }
  }

  map.on("load", async () => {
    map.addSource("cwas", { type: "geojson", data: "/data/generated/awips/cwa.geojson" });
    map.addLayer({ id: "cwas", type: "line", source: "cwas", paint: { "line-color": "#8c99a6", "line-width": 1.1, "line-opacity": .72 } });
    map.addSource("counties", { type: "geojson", data: empty });
    map.addLayer({ id: "county-lines", type: "line", source: "counties", paint: { "line-color": "#b8c4ce", "line-width": .8, "line-opacity": .78 } });
    map.addLayer({ id: "county-hit", type: "fill", source: "counties", paint: { "fill-color": "#fff", "fill-opacity": 0 } });
    map.addSource("states", { type: "geojson", data: empty });
    map.addLayer({ id: "state-lines", type: "line", source: "states", paint: { "line-color": "#e3e9ee", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.8, 6, 2.8, 9, 3.4], "line-opacity": .95 } });
    map.addSource("discussions", { type: "geojson", data: empty });
    map.addLayer({ id: "discussion-fill", type: "fill", source: "discussions", paint: { "fill-color": ["coalesce",["get","mdColor"],"#4cc9f0"], "fill-opacity": .2 } });
    map.addLayer({ id: "discussion-halo", type: "line", source: "discussions", paint: { "line-color": "#05080c", "line-width": 6, "line-opacity": .92 } });
    map.addLayer({ id: "discussion-line", type: "line", source: "discussions", paint: { "line-color": ["coalesce",["get","mdColor"],"#4cc9f0"], "line-width": 2.7, "line-dasharray": [3,1.5] } });
    map.addLayer({ id: "discussion-flash", type: "line", source: "discussions", filter: ["==",["get","mdIndex"],-1], paint: { "line-color": ["coalesce",["get","mdColor"],"#4cc9f0"], "line-width": 8, "line-opacity": 0, "line-blur": .4 } });
    for (const id of ["active", "draft", "included", "overlap", "removed", "vertices", "cwa-hover"]) map.addSource(id, { type: "geojson", data: empty });
    // The solid issued-watch footprint is the base operational overlay. Radar,
    // outlooks, discussions, and geographic boundaries are drawn above it.
    map.addLayer({ id: "active-fill", type: "fill", source: "active", paint: { "fill-color": ["get","color"], "fill-opacity": 1 } }, "cwas");
    map.addLayer({ id: "active-outline", type: "line", source: "active", paint: { "line-color": ["get","color"], "line-width": 2.4, "line-opacity": .95 } });
    map.addLayer({ id: "active-hover", type: "line", source: "active", filter: ["==", ["get","hovered"], 1], paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 1, "line-blur": 1 } });
    // Keep county divisions above watch shading so operators can resolve the
    // exact county footprint even where multiple SPC watches overlap.
    map.moveLayer("county-lines");
    map.addLayer({ id: "draft-fill", type: "fill", source: "draft", paint: { "fill-color": ["get","color"], "fill-opacity": .12 } });
    map.addLayer({ id: "draft-line", type: "line", source: "draft", paint: { "line-color": ["get","color"], "line-width": 3, "line-dasharray": [2,1] } });
    map.addLayer({ id: "included", type: "fill", source: "included", paint: { "fill-color": ["get","color"], "fill-opacity": .58 } });
    const hatch = document.createElement("canvas"); hatch.width = 12; hatch.height = 12; const hatchCtx = hatch.getContext("2d"); hatchCtx.strokeStyle = "#ffd36f"; hatchCtx.lineWidth = 3; hatchCtx.beginPath(); hatchCtx.moveTo(-2,12); hatchCtx.lineTo(12,-2); hatchCtx.moveTo(4,16); hatchCtx.lineTo(16,4); hatchCtx.stroke(); map.addImage("watch-overlap-hatch", hatchCtx.getImageData(0, 0, hatch.width, hatch.height));
    map.addLayer({ id: "overlap", type: "fill", source: "overlap", paint: { "fill-pattern": "watch-overlap-hatch", "fill-opacity": .92 } });
    map.addLayer({ id: "removed", type: "fill", source: "removed", paint: { "fill-color": "#000", "fill-opacity": .92 } });
    map.addLayer({ id: "cwa-hover-fill", type: "fill", source: "cwa-hover", paint: { "fill-color": "#ffffff", "fill-opacity": .24 } });
    map.addLayer({ id: "cwa-hover-line", type: "line", source: "cwa-hover", paint: { "line-color": "#f2ba4b", "line-width": 3.5, "line-opacity": 1 } });
    map.addLayer({ id: "vertices", type: "circle", source: "vertices", paint: { "circle-radius": 5, "circle-color": "#f2ba4b", "circle-stroke-color": "#111", "circle-stroke-width": 2 } });
    const [countyResult, stateResult] = await Promise.allSettled([
      fetch("/data/generated/awips/counties.geojson").then((response) => {
        if (!response.ok) throw new Error(`County boundaries HTTP ${response.status}`);
        return response.json();
      }),
      fetch("/data/generated/awips/states.geojson").then((response) => {
        if (!response.ok) throw new Error(`State boundaries HTTP ${response.status}`);
        return response.json();
      })
    ]);
    if (countyResult.status === "fulfilled") {
      counties = window.SpcDesk.normalizeCountyFeatureCollection(countyResult.value);
      map.getSource("counties").setData(counties);
    }
    if (stateResult.status === "fulfilled") {
      states = stateResult.value;
      map.getSource("states").setData(states);
    }
    const boundaryErrors = [countyResult, stateResult].filter((result) => result.status === "rejected");
    $("betaMapStatus").textContent = boundaryErrors.length
      ? `Watch inventory ready · ${boundaryErrors.length} boundary layer${boundaryErrors.length === 1 ? "" : "s"} unavailable`
      : `${counties.features.length.toLocaleString()} national counties ready`;
    draftRestoreComplete = true;
    restoreDraft();
    let layerPrefs = {};
    try { layerPrefs = JSON.parse(localStorage.getItem("spc-ops-layers") || localStorage.getItem("spc-beta-layers") || "{}") || {}; } catch { layerPrefs = {}; }
    $("layerRadar").checked = Boolean(layerPrefs.radar); setRadarVisible(layerPrefs.radar);
    $("layerDiscussions").checked = layerPrefs.discussions !== false;
    ["discussion-fill","discussion-halo","discussion-line","discussion-flash"].forEach((id)=>map.setLayoutProperty(id,"visibility",$("layerDiscussions").checked?"visible":"none"));
    document.querySelectorAll("[data-outlook]").forEach((input) => { input.checked = Boolean(layerPrefs[input.dataset.outlook]); if (input.checked) void setOutlookVisible(input.dataset.outlook, true); });
    applySelectedOperationalLayers();
    map.once("idle",applySelectedOperationalLayers);
    render();
  });
  map.on("click", (event) => {
    if (ignoreNextClick) { ignoreNextClick = false; return; }
    if (placingBox) {
      state.boxCenter = [event.lngLat.lng, event.lngLat.lat]; placingBox = false; drawing = false; applyBox(true); notice("Watch box placed. Drag center/corners or adjust values, then Resolve counties."); return;
    }
    if (drawing) { state.vertices.push([event.lngLat.lng,event.lngLat.lat]); render(); return; }
    if (!state.polygon) return;
    const hit = map.queryRenderedFeatures(event.point, { layers: ["county-hit"] })[0]; if (!hit) return;
    const record = window.SpcDesk.countyRecordFromFips(hit.properties?.FIPS || hit.properties?.GEOID, counties, hit.properties); if (!record) return;
    const index = state.counties.findIndex((c) => fips(c) === fips(record));
    if (index >= 0) { removed.push(state.counties[index]); state.counties.splice(index,1); }
    else { state.counties.push(record); removed = removed.filter((c) => fips(c) !== fips(record)); }
    areaResolved = true; state.text = ""; recalcStates(); render(); notice(`${record.name || "County"}, ${record.state || ""} ${index >= 0 ? "marked for removal" : "included"}. ${state.counties.length} counties remain.`);
  });
  map.on("mousedown", "vertices", (event) => {
    const feature = event.features?.[0]; if (!feature || !state.boxCenter) return;
    dragHandle = { kind: feature.properties.kind, index: Number(feature.properties.index) }; map.dragPan.disable();
  });
  map.on("mousemove", (event) => {
    if (!dragHandle || !state.boxCenter) return;
    const cursor = [event.lngLat.lng,event.lngLat.lat];
    if (dragHandle.kind === "center") state.boxCenter = cursor;
    else {
      const distance = window.turf.distance(window.turf.point(state.boxCenter), window.turf.point(cursor), { units: "miles" });
      const cursorBearing = window.turf.bearing(window.turf.point(state.boxCenter), window.turf.point(cursor));
      const delta = ((cursorBearing - state.boxBearing) * Math.PI) / 180;
      $("boxLength").value = String(Math.max(50, Math.round(Math.abs(distance * Math.cos(delta)) * 2)));
      $("boxWidth").value = String(Math.max(30, Math.round(Math.abs(distance * Math.sin(delta)) * 2)));
    }
    applyBox(true);
  });
  map.on("mouseup", () => { if (!dragHandle) return; dragHandle = null; ignoreNextClick = true; map.dragPan.enable(); notice("Box adjusted. Resolve counties to apply the new area."); });
  $("placeBox").onclick = () => { const editing=state.status==="active"&&Boolean(state.watchId);if(!editing)newDraft();$("rotation").value = $("orientation").value === "ew" ? "90" : "0"; placingBox = true; notice(editing?`Click the map to replace ${state.productId||"the watch"} box; counties will require re-resolution.`:"Click the map to place the center of the watch box."); };
  $("draw").onclick = () => { state.vertices = []; state.boxCenter = null; state.polygon = null; state.counties = []; state.states = []; removed = []; areaResolved = false; placingBox = false; drawing = true; render(); notice("Freehand drawing armed. Click vertices on the national map."); };
  $("finish").onclick = () => { if (state.vertices.length < 3) return; state.polygon = window.SpcDesk.verticesToPolygon(state.vertices); drawing = false; render(); resolveCounties(); };
  $("clearArea").onclick = () => { state.vertices=[];state.boxCenter=null;state.polygon=null;state.counties=[];state.states=[];removed=[];state.text="";areaResolved=false;drawing=false;placingBox=false;render();notice("Watch area cleared."); };
  $("resolve").onclick = resolveCounties;
  ["rotation","boxLength","boxWidth","slant"].forEach((id) => $(id).addEventListener("input", () => applyBox(true)));
  $("orientation").onchange = () => { $("rotation").value = $("orientation").value === "ew" ? "90" : "0"; applyBox(true); };
  $("newDraft").onclick = newDraft; $("refreshWatches").onclick = loadActive; $("generate").onclick = generate; $("issue").onclick = issue; $("update").onclick = updateWatch; $("cancel").onclick = cancelWatch;
  $("retrySpcDistribution").onclick = () => { if (lastDistributionJob && !lastDistributionJob.pending) void distributeRecord(lastDistributionJob.record, true); };
  $("activeWatches").onclick = (event) => { const button = event.target.closest("[data-watch]"); if (button) loadWatch(button.dataset.watch); };
  $("activeWatches").onmouseover = (event) => { const button = event.target.closest("[data-watch]"); if (button && button.dataset.watch !== hoveredWatchId) setHoveredWatch(button.dataset.watch); };
  $("activeWatches").onmouseleave = () => setHoveredWatch("");
  $("discussionList").onclick = async (event) => { const card=event.target.closest("[data-discussion]"),create=event.target.closest("[data-create-watch]");if(create){event.stopPropagation();await createWatchFromDiscussion(Number(create.dataset.createWatch));return;} if(event.target.closest("details,a"))return; const button=card;if(!button)return; const feature=discussions.features?.[Number(button.dataset.discussion)]; if(!feature?.geometry)return; const bounds=window.turf.bbox(feature); map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:90,maxZoom:7}); };
  $("discussionList").onmouseover = (event) => { const card=event.target.closest("[data-discussion]"); if(card&&Number(card.dataset.discussion)!==discussionFlashIndex)flashDiscussion(Number(card.dataset.discussion)); };
  $("discussionList").onmouseleave = () => flashDiscussion(-1);
  $("cwaChecklist").onchange = (event) => { const input = event.target.closest("[data-cwa]"); if (!input) return; state.wfoInclude[input.dataset.cwa] = input.checked; applyCwaSelection(); notice(`${input.dataset.cwa} ${input.checked ? "included in" : "removed from"} the draft. ${state.counties.length} counties currently included.`); };
  $("cwaChecklist").onmouseover = (event) => { const row = event.target.closest("[data-cwa-row]"); if (row) setHoveredCwa(row.dataset.cwaRow); };
  $("cwaChecklist").onmouseleave = () => setHoveredCwa("");
  $("overlapWorkflow").onclick = (event) => { if (event.target.closest("#removeOverlaps")) removeOverlappingCounties(); };
  $("copy").onclick = () => navigator.clipboard.writeText($("productText").value || "").then(() => notice("Product text copied."));
  $("product").onchange = () => { syncForm(); render(); };
  document.querySelector(".desk")?.addEventListener("input", (event) => { if (event.target.matches("input,select,textarea")) scheduleDraftSave(); });
  $("layerRadar").onchange = () => { setRadarVisible($("layerRadar").checked); saveLayerPrefs(); };
  $("layerDiscussions").onchange = () => { ["discussion-fill","discussion-halo","discussion-line","discussion-flash"].forEach((id)=>{if(map.getLayer(id))map.setLayoutProperty(id,"visibility",$("layerDiscussions").checked?"visible":"none");}); if(!$("layerDiscussions").checked)flashDiscussion(-1); if($("layerDiscussions").checked)void loadDiscussions(); saveLayerPrefs(); };
  $("refreshDiscussions").onclick = () => void loadDiscussions();
  function saveLayerPrefs() { const prefs = { radar: $("layerRadar").checked, discussions: $("layerDiscussions").checked }; document.querySelectorAll("[data-outlook]").forEach((input) => prefs[input.dataset.outlook] = input.checked); localStorage.setItem("spc-ops-layers", JSON.stringify(prefs)); }
  document.querySelectorAll("[data-outlook]").forEach((input) => input.onchange = () => { void setOutlookVisible(input.dataset.outlook, input.checked); saveLayerPrefs(); });
  setupWatchEditorDrawer();
  setupSidebarAccordion();
  $("exitWatchEdit").onclick = () => { newDraft(); openSidebarSection($("product")); notice("Exited watch edit mode. New SPC operations draft ready."); };
  // Watch inventory is independent of MapLibre and the large boundary files.
  // Start it immediately so a slow/failed map asset cannot strand the list.
  void loadActive();
  window.setInterval(() => { if (!document.hidden) void loadActive(); }, 15000);
  window.setInterval(refreshCountdowns, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) outlookControllers.forEach((controller) => controller.abort());
    else { void loadActive(); if($("layerDiscussions").checked)void loadDiscussions(); document.querySelectorAll("[data-outlook]:checked").forEach((input) => void setOutlookVisible(input.dataset.outlook, true)); }
  });
})();
