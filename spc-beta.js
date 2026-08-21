(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const empty = { type: "FeatureCollection", features: [] };
  let state = window.SpcDesk.createState();
  let counties = empty;
  let states = empty;
  let active = [];
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

  const map = new maplibregl.Map({
    container: "spcBetaMap", center: [-96, 38], zoom: 4,
    preserveDrawingBuffer: true,
    style: { version: 8, sources: { base: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256, attribution: "© OpenStreetMap © CARTO" } }, layers: [{ id: "base", type: "raster", source: "base" }] }
  });
  map.addControl(new maplibregl.NavigationControl(), "bottom-right");

  function notice(message, error = false) { $("betaNotice").textContent = message; $("betaNotice").classList.toggle("error", error); }
  function fc(features = []) { return { type: "FeatureCollection", features }; }
  function fips(item) { return String(item?.fips || item?.ugc || ""); }
  function syncForm() {
    state.product = $("product").value; state.validHours = Number($("hours").value) || 6;
    state.hailId = $("hail").value; state.windId = $("wind").value;
    state.tornadoes = state.product === "TOA" || $("tornadoes").checked; state.pds = $("pds").checked;
    state.intenseTornadoes = $("intenseTornadoes").checked; state.veryLargeHail = $("veryLargeHail").checked; state.significantWind = $("significantWind").checked;
    state.portionsText = $("portions").value; state.discussion = $("summary").value; state.forecaster = $("forecaster").value;
    state.replacing = $("replacing").value; state.axisOverride = $("axis").value;
    $("tornadoes").checked = state.tornadoes; $("tornadoes").disabled = state.product === "TOA";
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
    $("issue").disabled = editing; $("update").disabled = !editing; $("cancel").disabled = !editing;
    $("issue").textContent = `Issue NEW to production${state.counties.length ? ` · ${state.counties.length} counties` : ""}`;
    $("draftStatus").textContent = areaResolved
      ? `Area resolved · ${state.counties.length} counties / ${state.states.length} states`
      : state.polygon ? "Area changed · resolve counties" : "Draft not generated";
    renderCwaChecklist();
    renderOverlapWorkflow();
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
    $("activeWatches").innerHTML = live.length ? live.map((w) => `<button class="watch-item" data-watch="${w.id}" style="--watch:${w.color || "#db7093"}"><span><strong>${w.productId || w.id} <em data-watch-expires="${w.expiresAt || ""}"></em></strong><small>${w.productName || w.product} · ${w.counties?.length || 0} counties · until ${String(w.expiresAt || "").slice(11,16)}Z</small></span><i></i></button>`).join("") : "<p>No active SPC watches.</p>";
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
    const loadVersion = ++activeLoadVersion;
    try {
      const response = await fetch("/api/ops/products", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const nextActive = (await response.json()).warnings || [];
      if (loadVersion !== activeLoadVersion) return;
      active = nextActive; renderActive(); render(); notice(`Loaded ${active.filter((w) => w.kind === "spc-watch" && w.status === "active").length} active watches.`);
    } catch (error) { notice(`Could not load active watches: ${error.message}`, true); }
  }
  function acceptLoadedWatches(watches) {
    if (!Array.isArray(watches)) return;
    active = watches;
    renderActive();
    render();
  }
  window.addEventListener("spc-beta-watches-loaded", (event) => acceptLoadedWatches(event.detail));
  function setRadarVisible(visible) {
    if (!map.isStyleLoaded()) return;
    const id = "beta-iem-radar";
    if (!visible) { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); return; }
    if (!map.getSource(id)) map.addSource(id, { type: "raster", tiles: ["/api/public/radar/iem/{z}/{x}/{y}"], tileSize: 256, attribution: "IEM NEXRAD composite" });
    if (!map.getLayer(id)) map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": .78 } }, map.getLayer("cwas") ? "cwas" : undefined);
  }
  async function setOutlookVisible(key, visible) {
    if (!map.isStyleLoaded()) return;
    const sourceId = `beta-outlook-${key}`, fillId = `${sourceId}-fill`, lineId = `${sourceId}-line`;
    if (!visible) { if (map.getLayer(lineId)) map.removeLayer(lineId); if (map.getLayer(fillId)) map.removeLayer(fillId); if (map.getSource(sourceId)) map.removeSource(sourceId); return; }
    try {
      const response = await fetch(`/api/spc/outlook/${key}`, { cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json();
      if (map.getSource(sourceId)) map.getSource(sourceId).setData(data); else {
        map.addSource(sourceId, { type: "geojson", data });
        const before = map.getLayer("cwas") ? "cwas" : undefined;
        map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": ["coalesce", ["get","fill"], ["get","color"], "#c084fc"], "fill-opacity": .3 } }, before);
        map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": ["coalesce", ["get","stroke"], ["get","fill"], "#fff"], "line-width": 1.5, "line-opacity": .9 } }, before);
      }
    } catch (error) { notice(`SPC ${key} outlook unavailable: ${error.message}`, true); }
  }
  function newDraft() {
    state = window.SpcDesk.createState(); removed = []; drawing = false; placingBox = false; areaResolved = false; $("productText").value = "";
    ["portions", "summary", "replacing", "axis", "forecaster"].forEach((id) => $(id).value = "");
    $("watchNumber").value = ""; $("expiration").value = ""; originalExpiresAt = null;
    $("hours").disabled = false;
    $("product").value = state.product; $("hours").value = state.validHours; $("pds").checked = false; $("intenseTornadoes").checked = false; $("veryLargeHail").checked = false; $("significantWind").checked = false; syncForm(); render(); notice("New independent Beta draft ready.");
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
    render(); notice(`Loaded ${record.productId || record.id}. Edit counties or details, then issue CON or CAN.`);
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
  function generate() {
    syncForm();
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
    ctx.fillStyle = "#f2ba4b"; ctx.font = "800 14px system-ui,sans-serif"; ctx.textAlign = "right"; ctx.fillText("ZASNET SPC BETA", canvas.width - 25, 46); ctx.textAlign = "left";
    return canvas.toDataURL("image/png");
  }
  async function uploadWatchSnapshot(record) {
    const dataUrl = buildWatchSnapshot(record);
    const response = await fetch("/api/ops/map-snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, productId: record.productId, wfo: "SPC", dataUrl }) });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Snapshot HTTP ${response.status}`); return payload;
  }
  async function issue() {
    syncForm();
    if (state.polygon && !areaResolved) await resolveCounties();
    if (!areaResolved || !state.counties.length) return notice("No counties were resolved. Adjust the box and press Resolve counties before issuing.", true);
    generate(); if (!state.text) return;
    $("issue").disabled = true;
    try {
      const numberResponse = await fetch("/api/spc/watch-number", { method: "POST" });
      const numberPayload = await numberResponse.json(); if (!numberResponse.ok) throw new Error(numberPayload.error || "Watch number allocation failed");
      const now = new Date(); const expire = window.SpcDesk.computeExpireTime(now, state.validHours);
      state.watchNumber = Number(numberPayload.watchNumber); state.watchId = `SPC-${state.product}-${window.SpcDesk.formatWatchNumber(state.watchNumber)}-${now.getTime()}`;
      state.action = "NEW"; state.status = "active"; state.practice = $("practice").checked; state.issuedAt = now.toISOString(); state.expiresAt = expire.toISOString(); state.segment = 0;
      originalExpiresAt = state.expiresAt; $("watchNumber").value = window.SpcDesk.formatProductId(state.product, state.watchNumber); $("expiration").value = expire.toISOString().replace("T", " ").slice(0,16) + "Z";
      state.text = window.SpcTemplates.generateWatchText(state, { now, expireAt: expire, otherWatches: active }); $("productText").value = state.text;
      const record = window.SpcDesk.snapshot(state); record.practice = state.practice; record.sourceSystem = "spc-beta";
      record.timeline = [{ validFrom: record.issuedAt, validTo: record.expiresAt, action: "NEW", polygon: record.displayGeometry || record.polygon, expiresAt: record.expiresAt, text: record.text }];
      let response = await fetch("/api/ops/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record] }) });
      if (!response.ok) throw new Error(`Ops store HTTP ${response.status}`);
      let distribution = null;
      if (!record.practice) {
        // Use the Beta map for the same Mattermost map attachment consumed by
        // the production distribution pipeline. Snapshot failure is nonfatal.
        try { await uploadWatchSnapshot(record); } catch (snapshotError) { console.warn("SPC Beta snapshot unavailable", snapshotError); }
        response = await fetch("/api/public/alerts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record], focusIds: [record.id] }) });
        const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Distribution HTTP ${response.status}`); distribution = payload.distribution;
      }
      active.push(record); renderActive();
      const channels = distribution ? ["publicSite", "mattermost", "warningServer", "placefile"].filter((key) => distribution[key]?.delivered).length : 0;
      newDraft(); renderActive(); notice(record.practice ? `Issued ${record.productId} in Practice Mode. Editor cleared for the next watch.` : `Issued ${record.productId} to production · ${channels}/4 distribution channels confirmed. Editor cleared for the next watch.`);
    } catch (error) { notice(`Issue failed: ${error.message}`, true); } finally { render(); }
  }
  async function publishLifecycle(record) {
    // Invalidate an in-flight active-watch request before saving this newer
    // record. The successful caller updates `active` from this exact record.
    activeLoadVersion += 1;
    let response = await fetch("/api/ops/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record] }) });
    if (!response.ok) throw new Error(`Ops store HTTP ${response.status}`);
    if (record.practice) return null;
    try { await uploadWatchSnapshot(record); } catch (snapshotError) { console.warn("SPC Beta lifecycle snapshot unavailable", snapshotError); }
    response = await fetch("/api/public/alerts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warnings: [record], focusIds: [record.id] }) });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Distribution HTTP ${response.status}`); return payload.distribution;
  }
  function lifecycleRecord(action, now, expire) {
    state.action = action; state.status = action === "CAN" ? "cancelled" : "active"; state.expiresAt = expire.toISOString(); state.segment = (Number(state.segment) || 0) + 1;
    state.text = window.SpcTemplates.generateWatchText(state, { now, expireAt: expire, otherWatches: active }); $("productText").value = state.text;
    const record = window.SpcDesk.snapshot(state); record.practice = Boolean(state.practice); record.sourceSystem = "spc-beta";
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
      const record = lifecycleRecord("CON", now, expire); await publishLifecycle(record);
      const index = active.findIndex((w) => w.id === record.id); if (index >= 0) active[index] = record; else active.push(record);
      renderActive(); newDraft(); renderActive(); notice(`Issued ${record.productId} continuation/update (CON) to production. Editor cleared for the next product.`);
    } catch (error) { notice(`Update failed: ${error.message}`, true); } finally { activeMutationInFlight = false; render(); }
  }
  async function cancelWatch() {
    if (state.status !== "active" || !state.watchId) return;
    if (!window.confirm(`Cancel ${window.SpcDesk.formatProductId(state.product, state.watchNumber)}? This publishes CAN immediately.`)) return;
    $("cancel").disabled = true; activeMutationInFlight = true;
    try {
      syncForm(); const now = new Date(), record = lifecycleRecord("CAN", now, now); await publishLifecycle(record);
      const index = active.findIndex((w) => w.id === record.id); if (index >= 0) active[index] = record; else active.push(record);
      renderActive(); newDraft(); notice(`Cancelled ${record.productId} (CAN) across production outputs.`);
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
    for (const id of ["active", "draft", "included", "overlap", "removed", "vertices", "cwa-hover"]) map.addSource(id, { type: "geojson", data: empty });
    map.addLayer({ id: "active-fill", type: "fill", source: "active", paint: { "fill-color": ["get","color"], "fill-opacity": .18 } });
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
    let layerPrefs = {};
    try { layerPrefs = JSON.parse(localStorage.getItem("spc-beta-layers") || "{}") || {}; } catch { layerPrefs = {}; }
    $("layerRadar").checked = Boolean(layerPrefs.radar); setRadarVisible(layerPrefs.radar);
    document.querySelectorAll("[data-outlook]").forEach((input) => { input.checked = Boolean(layerPrefs[input.dataset.outlook]); if (input.checked) void setOutlookVisible(input.dataset.outlook, true); });
    if (Array.isArray(window.__spcBetaInitialWatches)) acceptLoadedWatches(window.__spcBetaInitialWatches);
    await loadActive(); render();
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
  $("placeBox").onclick = () => { newDraft(); $("rotation").value = $("orientation").value === "ew" ? "90" : "0"; placingBox = true; notice("Click the map to place the center of the watch box."); };
  $("draw").onclick = () => { state.vertices = []; state.boxCenter = null; state.polygon = null; state.counties = []; state.states = []; removed = []; areaResolved = false; placingBox = false; drawing = true; render(); notice("Freehand drawing armed. Click vertices on the national map."); };
  $("finish").onclick = () => { if (state.vertices.length < 3) return; state.polygon = window.SpcDesk.verticesToPolygon(state.vertices); drawing = false; render(); resolveCounties(); };
  $("clearArea").onclick = () => { state.vertices=[];state.boxCenter=null;state.polygon=null;state.counties=[];state.states=[];removed=[];state.text="";areaResolved=false;drawing=false;placingBox=false;render();notice("Watch area cleared."); };
  $("resolve").onclick = resolveCounties;
  ["rotation","boxLength","boxWidth","slant"].forEach((id) => $(id).addEventListener("input", () => applyBox(true)));
  $("orientation").onchange = () => { $("rotation").value = $("orientation").value === "ew" ? "90" : "0"; applyBox(true); };
  $("newDraft").onclick = newDraft; $("refreshWatches").onclick = loadActive; $("generate").onclick = generate; $("issue").onclick = issue; $("update").onclick = updateWatch; $("cancel").onclick = cancelWatch;
  $("activeWatches").onclick = (event) => { const button = event.target.closest("[data-watch]"); if (button) loadWatch(button.dataset.watch); };
  $("activeWatches").onmouseover = (event) => { const button = event.target.closest("[data-watch]"); if (button && button.dataset.watch !== hoveredWatchId) setHoveredWatch(button.dataset.watch); };
  $("activeWatches").onmouseleave = () => setHoveredWatch("");
  $("cwaChecklist").onchange = (event) => { const input = event.target.closest("[data-cwa]"); if (!input) return; state.wfoInclude[input.dataset.cwa] = input.checked; applyCwaSelection(); notice(`${input.dataset.cwa} ${input.checked ? "included in" : "removed from"} the draft. ${state.counties.length} counties currently included.`); };
  $("cwaChecklist").onmouseover = (event) => { const row = event.target.closest("[data-cwa-row]"); if (row) setHoveredCwa(row.dataset.cwaRow); };
  $("cwaChecklist").onmouseleave = () => setHoveredCwa("");
  $("overlapWorkflow").onclick = (event) => { if (event.target.closest("#removeOverlaps")) removeOverlappingCounties(); };
  $("copy").onclick = () => navigator.clipboard.writeText($("productText").value || "").then(() => notice("Product text copied."));
  $("product").onchange = () => { syncForm(); render(); };
  $("layerRadar").onchange = () => { setRadarVisible($("layerRadar").checked); saveLayerPrefs(); };
  function saveLayerPrefs() { const prefs = { radar: $("layerRadar").checked }; document.querySelectorAll("[data-outlook]").forEach((input) => prefs[input.dataset.outlook] = input.checked); localStorage.setItem("spc-beta-layers", JSON.stringify(prefs)); }
  document.querySelectorAll("[data-outlook]").forEach((input) => input.onchange = () => { void setOutlookVisible(input.dataset.outlook, input.checked); saveLayerPrefs(); });
  // Watch inventory is independent of MapLibre and the large boundary files.
  // Start it immediately so a slow/failed map asset cannot strand the list.
  void loadActive();
  window.setInterval(loadActive, 15000);
  window.setInterval(refreshCountdowns, 1000);
})();
