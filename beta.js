(() => {
  "use strict";
  const refreshMs = 60_000;
  const updateLine = document.querySelector("#updateLine");
  const detailCard = document.querySelector("#detailCard");
  const controls = {
    official: document.querySelector("#officialToggle"),
    issued: document.querySelector("#issuedToggle"),
    radar: document.querySelector("#radarToggle")
  };
  const map = new maplibregl.Map({
    container: "betaMap", center: [-96, 38.5], zoom: 4,
    style: { version: 8, sources: { base: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256, attribution: "© OpenStreetMap © CARTO" } }, layers: [{ id: "base", type: "raster", source: "base" }] }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

  const empty = { type: "FeatureCollection", features: [] };
  const normalize = (data, source) => ({ type: "FeatureCollection", features: (data.features || []).filter((f) => f.geometry).map((f) => ({ ...f, properties: { ...(f.properties || {}), betaSource: source } })) });
  function colorExpression() { return ["match", ["get", "event"], "Tornado Warning", "#e74c3c", "Severe Thunderstorm Warning", "#ef6c45", "Flash Flood Warning", "#35a8df", "Flood Warning", "#35a8df", "#c78bff"]; }
  function ensureLayers() {
    map.addSource("official", { type: "geojson", data: empty });
    map.addSource("issued", { type: "geojson", data: empty });
    map.addSource("radar", { type: "raster", tiles: ["/api/public/radar/iem/{z}/{x}/{y}?product=n0q"], tileSize: 256, attribution: "Radar: IEM NEXRAD composite" });
    map.addLayer({ id: "radar", type: "raster", source: "radar", paint: { "raster-opacity": .54, "raster-saturation": -.2, "raster-contrast": .08 } });
    map.addLayer({ id: "official-fill", type: "fill", source: "official", paint: { "fill-color": colorExpression(), "fill-opacity": .28 } });
    map.addLayer({ id: "official-line", type: "line", source: "official", paint: { "line-color": colorExpression(), "line-width": 2 } });
    map.addLayer({ id: "issued-fill", type: "fill", source: "issued", paint: { "fill-color": ["coalesce", ["get", "color"], "#ffcc4d"], "fill-opacity": .2 } });
    map.addLayer({ id: "issued-line", type: "line", source: "issued", paint: { "line-color": ["coalesce", ["get", "color"], "#ffcc4d"], "line-width": 2.5, "line-dasharray": [2, 1] } });
    ["official-fill", "issued-fill"].forEach((id) => { map.on("mouseenter", id, () => map.getCanvas().style.cursor = "pointer"); map.on("mouseleave", id, () => map.getCanvas().style.cursor = ""); });
    map.on("click", ["official-fill", "issued-fill"], (e) => showDetail(e.features[0]));
  }
  function showDetail(feature) {
    const p = feature.properties || {}; const title = p.event || p.product || p.kind || "Weather alert";
    const status = p.headline || p.senderName || p.office || "Active alert";
    const until = p.ends || p.expiresAt || p.expires || "Time not available";
    detailCard.innerHTML = `<p class="detail-label">${p.betaSource === "official" ? "Official NWS" : "ZASNet issued"}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(status)}<br><strong>Until:</strong> ${escapeHtml(formatTime(until))}</p>`;
    new maplibregl.Popup({ closeButton: false, offset: 10 }).setLngLat(eCenter(feature, map.getCenter())).setHTML(`<strong>${escapeHtml(title)}</strong><br>${escapeHtml(formatTime(until))}`).addTo(map);
  }
  function eCenter(f, fallback) { const c = f.geometry?.coordinates; if (f.geometry?.type === "Point") return c; const ring = f.geometry?.type === "Polygon" ? c[0] : f.geometry?.type === "MultiPolygon" ? c[0][0] : null; if (!ring?.length) return fallback; return ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]); }
  function formatTime(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : String(value); }
  function escapeHtml(value) { return String(value || "—").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[c]); }
  async function refresh() {
    updateLine.textContent = "Refreshing alerts…";
    const [official, issued] = await Promise.allSettled([fetch("/api/nws/alerts/active", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))), fetch("/api/public/alerts?format=geojson", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))]);
    const officialData = official.status === "fulfilled" ? normalize(official.value, "official") : empty;
    const issuedData = issued.status === "fulfilled" ? normalize(issued.value, "issued") : empty;
    map.getSource("official").setData(officialData); map.getSource("issued").setData(issuedData);
    const errors = [official, issued].filter(x => x.status === "rejected").length;
    updateLine.textContent = errors ? "Some alert layers are temporarily unavailable." : `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${officialData.features.length} official alerts`;
  }
  function syncVisibility() { map.setLayoutProperty("official-fill", "visibility", controls.official.checked ? "visible" : "none"); map.setLayoutProperty("official-line", "visibility", controls.official.checked ? "visible" : "none"); map.setLayoutProperty("issued-fill", "visibility", controls.issued.checked ? "visible" : "none"); map.setLayoutProperty("issued-line", "visibility", controls.issued.checked ? "visible" : "none"); map.setLayoutProperty("radar", "visibility", controls.radar.checked ? "visible" : "none"); }
  map.on("load", () => { ensureLayers(); syncVisibility(); refresh().catch(() => { updateLine.textContent = "Alert data is temporarily unavailable."; }); window.setInterval(() => refresh().catch(() => {}), refreshMs); Object.values(controls).forEach(c => c.addEventListener("change", syncVisibility)); });
})();
