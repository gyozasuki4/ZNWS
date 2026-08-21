(() => {
  "use strict";

  document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="/public-brand.css">');
  const code = (new URLSearchParams(location.search).get("wfo") || "OHX").replace(/^K/i, "").toUpperCase();
  const title = document.querySelector("#officeTitle");
  const name = document.querySelector("#officeName");
  const list = document.querySelector("#productList");
  const alertsUrl = `/api/public/alerts?format=geojson&wfo=${encodeURIComponent(code)}`;
  const map = new maplibregl.Map({
    container: "wfoMap",
    center: [-86.7, 36.2],
    zoom: 6,
    style: {
      version: 8,
      sources: { base: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256 } },
      layers: [{ id: "base", type: "raster", source: "base" }]
    }
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  const boundsFor = (geometry) => {
    const bounds = new maplibregl.LngLatBounds();
    const walk = (value) => typeof value[0] === "number" ? bounds.extend(value) : value.forEach(walk);
    walk(geometry.coordinates);
    return bounds;
  };
  const unique = (features) => [...new Map(features.map((feature) => [feature.properties.productId || feature.properties.id, feature])).values()];

  function renderList(features) {
    const products = unique(features);
    list.innerHTML = products.length
      ? products.map((feature) => {
          const p = feature.properties;
          return `<button class="product" data-id="${p.productId || p.id}"><strong><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></i>${p.productId}</strong><small>${p.productName || p.product} · until ${new Date(p.expiresAt).toLocaleString()}</small></button>`;
        }).join("")
      : '<p class="empty">No active local products.</p>';
    list.querySelectorAll("[data-id]").forEach((button) => {
      button.onclick = () => {
        const feature = features.find((item) => (item.properties.productId || item.properties.id) === button.dataset.id);
        if (feature) map.fitBounds(boundsFor(feature.geometry), { padding: 70, maxZoom: 9 });
      };
    });
  }

  async function loadAlerts() {
    const response = await fetch(alertsUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const alerts = await response.json();
    map.getSource("alerts")?.setData(alerts);
    renderList(alerts.features || []);
    return alerts;
  }

  map.on("load", async () => {
    try {
      const [cwas, alerts] = await Promise.all([
        fetch("/data/generated/awips/cwa.geojson").then((response) => response.json()),
        fetch(alertsUrl, { cache: "no-store" }).then((response) => response.json())
      ]);
      const cwa = cwas.features.find((feature) => (feature.properties.CWA || feature.properties.WFO) === code);
      name.textContent = cwa ? `${code} · ${cwa.properties.CITYSTATE}` : `WFO ${code}`;
      title.textContent = `Local weather · WFO ${code}`;
      map.addSource("cwa", { type: "geojson", data: cwa || { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "cwa-fill", type: "fill", source: "cwa", paint: { "fill-color": "#6bbbe8", "fill-opacity": 0.06 } });
      map.addLayer({ id: "cwa-line", type: "line", source: "cwa", paint: { "line-color": "#9bdcff", "line-width": 2 } });
      map.addSource("alerts", { type: "geojson", data: alerts });
      map.addLayer({ id: "alerts-fill", type: "fill", source: "alerts", paint: { "fill-color": ["coalesce", ["get", "color"], "#f2b84b"], "fill-opacity": 0.34 } });
      map.addLayer({ id: "alerts-line", type: "line", source: "alerts", paint: { "line-color": ["coalesce", ["get", "color"], "#f2b84b"], "line-width": 2 } });
      if (cwa) map.fitBounds(boundsFor(cwa.geometry), { padding: 45, maxZoom: 7 });
      renderList(alerts.features || []);
      map.on("click", "alerts-fill", (event) => {
        const p = event.features[0].properties;
        new maplibregl.Popup().setLngLat(event.lngLat).setHTML(`<strong>${p.productId}</strong><br>${p.productName}<br><small>Until ${new Date(p.expiresAt).toLocaleString()}</small>`).addTo(map);
      });
      map.on("click", (event) => {
        const hit = map.queryRenderedFeatures(event.point, { layers: ["alerts-fill"] });
        if (!hit.length) new maplibregl.Popup().setLngLat(event.lngLat).setText("No active issued products at this location.").addTo(map);
      });
      window.setInterval(() => loadAlerts().catch((error) => console.warn("Local alerts refresh failed", error)), 30_000);
    } catch (error) {
      title.textContent = "Local map unavailable";
      list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
  });
})();
