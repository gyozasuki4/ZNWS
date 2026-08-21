(() => {
  "use strict";
  const empty = { type: "FeatureCollection", features: [] };
  const regions = {
    conus: { title: "Contiguous U.S.", bounds: [[-126, 23], [-66, 51]] },
    alaska: { title: "Alaska", bounds: [[-171, 50], [-129, 72]] },
    hawaii: { title: "Hawaii", bounds: [[-161.2, 18.4], [-154.4, 22.7]] },
    caribbean: { title: "Caribbean", bounds: [[-68.5, 16.5], [-64, 19.3]] }
  };
  let stations = empty;
  let activeField = "locations";
  const map = new maplibregl.Map({
    container: "nexradMap", center: [-97, 38], zoom: 3.4,
    style: { version: 8, sources: { base: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256, attribution: "© OpenStreetMap © CARTO" } }, layers: [{ id: "base", type: "raster", source: "base" }] }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 110 }), "bottom-left");

  function addLayers() {
    map.addSource("stations", { type: "geojson", data: stations });
    map.addLayer({ id: "station-dot", type: "circle", source: "stations", paint: { "circle-radius": 3.5, "circle-color": "#9caf88", "circle-stroke-color": "#101510", "circle-stroke-width": 1.2 } });
    map.addLayer({ id: "station-label", type: "symbol", source: "stations", layout: { "text-field": ["get", "id"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 7, 14], "text-offset": [0, -.25], "text-anchor": "bottom", "text-allow-overlap": false }, paint: { "text-color": "#c8d8b8", "text-halo-color": "#101510", "text-halo-width": 2 } });
    applyField(activeField);
  }
  const temperatureColor = property => ["interpolate", ["linear"], ["get", property], 40, "#70a7d8", 60, "#8fac72", 80, "#e2c650", 100, "#df7b4f", 120, "#d94b42"];
  const statusAge = ["to-number", ["get", "levelTwoAgeMinutes"], 9999];
  const statusColor = ["case", ["any", ["!", ["has", "levelTwoLastReceivedTime"]], ["==", ["get", "levelTwoLastReceivedTime"], null]], "#77776f", ["<", statusAge, 5], "#36c85f", ["<", statusAge, 15], "#f0cf32", "#ef493f"];
  function gradientLegend(title, ticks, colors) { return `<span>${title}</span><div class="data-ramp" style="background:linear-gradient(90deg,${colors.join(",")})"></div><div class="data-ticks">${ticks.map(t => `<b>${t}</b>`).join("")}</div>`; }
  function applyField(field) {
    activeField = field;
    document.querySelectorAll("#dataChoices button").forEach(button => { const active = button.dataset.field === field; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
    if (!map.getLayer("station-label")) return;
    const settings = {
      locations: { title: "Radar locations", filter: null, label: ["format", ["get", "id"], { "font-scale": 1 }, ["concat", "\n", ["get", "name"]], { "font-scale": .62 }], color: "#c8d8b8", dot: "#9caf88", legend: "<span>Radar locations</span><p>WSR-88D site ID and location</p>" },
      shelter: { title: "Shelter temperature", property: "shelterTempF", suffix: "°F", color: temperatureColor("shelterTempF"), legend: gradientLegend("Shelter temperature °F", ["40", "60", "80", "100", "120"], ["#70a7d8", "#8fac72", "#e2c650", "#df7b4f", "#d94b42"]) },
      leavingair: { title: "Transmitter leaving-air temperature", property: "leavingAirTempF", suffix: "°F", color: temperatureColor("leavingAirTempF"), legend: gradientLegend("Transmitter leaving air °F", ["40", "60", "80", "100", "120"], ["#70a7d8", "#8fac72", "#e2c650", "#df7b4f", "#d94b42"]) },
      power: { title: "Transmitter peak power", property: "transmitterPowerKw", suffix: " kW", color: ["case", ["<", ["get", "transmitterPowerKw"], 650], "#ef493f", ["<=", ["get", "transmitterPowerKw"], 750], "#36c85f", "#ef493f"], legend: "<span>XMR peak power</span><div class=\"status-items\"><b><i class=\"red\"></i>Below 650 kW</b><b><i class=\"green\"></i>650–750 kW</b><b><i class=\"red\"></i>Above 750 kW</b></div>" },
      status: { title: "Level 2 data status", property: "levelTwoAgeMinutes", suffix: " min", color: "#eee9df", dot: statusColor, legend: "<span>Level 2 data age</span><div class=\"status-items\"><b><i class=\"green\"></i>Under 5 min</b><b><i class=\"yellow\"></i>5–15 min</b><b><i class=\"red\"></i>15+ min</b></div>" }
    }[field];
    const hasValue = settings.property ? ["!=", ["get", settings.property], null] : null;
    const valueLabel = settings.property
      ? ["case", hasValue, ["concat", ["to-string", ["get", settings.property]], settings.suffix], "N/A"]
      : "";
    const label = settings.label || ["format", valueLabel, { "font-scale": 1.05 }, ["concat", "\n", ["get", "id"]], { "font-scale": .62 }];
    map.setFilter("station-label", null);
    map.setLayoutProperty("station-label", "text-field", label);
    map.setLayoutProperty("station-label", "text-allow-overlap", field === "locations" ? false : true);
    map.setLayoutProperty("station-label", "text-ignore-placement", field !== "locations");
    map.setPaintProperty("station-label", "text-color", settings.color);
    map.setPaintProperty("station-dot", "circle-color", settings.dot || ["case", hasValue || true, settings.color, "#77776f"]);
    map.setPaintProperty("station-dot", "circle-radius", field === "status" ? 7 : 3);
    map.setPaintProperty("station-dot", "circle-stroke-color", field === "status" ? "#eee9df" : "#111210");
    map.setPaintProperty("station-dot", "circle-stroke-width", field === "status" ? 1.5 : 1);
    document.querySelector("#dataKey").innerHTML = settings.legend;
    document.querySelector("#viewTitle").textContent = `${settings.title} · ${document.querySelector("#regionChoices .is-active")?.textContent || "Contiguous U.S."}`;
  }
  function chooseRegion(key) {
    const region = regions[key]; if (!region) return;
    document.querySelectorAll("#regionChoices button").forEach(b => { const active = b.dataset.region === key; b.classList.toggle("is-active", active); b.setAttribute("aria-pressed", String(active)); });
    const fieldTitle = document.querySelector("#dataChoices .is-active")?.textContent || "Locations";
    document.querySelector("#viewTitle").textContent = `${fieldTitle} · ${region.title}`;
    map.fitBounds(region.bounds, { padding: 34, duration: 700 });
  }
  map.on("load", async () => {
    try {
      const response = await fetch("/api/radar/stations", { cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`);
      stations = await response.json(); addLayers();
      const reporting = Number(stations.properties?.reporting) || stations.features.filter(f => Number.isFinite(Number(f.properties?.shelterTempF))).length;
      document.querySelector("#stationCount").textContent = `${reporting} of ${stations.features.length} sites reporting`;
      document.querySelector("#updatedAt").textContent = `Source: NOAA / NWS · Updated ${new Date(stations.properties?.generatedAt || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      document.querySelector("#mapStatus").textContent = "Ready";
    } catch { addLayers(); document.querySelector("#stationCount").textContent = "Station feed unavailable"; document.querySelector("#mapStatus").textContent = "Data unavailable"; }
  });
  document.querySelectorAll("#regionChoices button").forEach(b => b.addEventListener("click", () => chooseRegion(b.dataset.region)));
  document.querySelectorAll("#dataChoices button").forEach(b => b.addEventListener("click", () => applyField(b.dataset.field)));
})();
