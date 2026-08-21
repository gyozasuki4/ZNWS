/**
 * ZASNetwork public alerts map — active products + radar.
 * Radar sources:
 *  - IEM NEXRAD n0q composite (default)
 *  - RainViewer — multi-frame animated composite
 *  - NOAA MRMS WMS — base reflectivity image service
 * Stack: basemap → radar → watch/warn fills → outlines → product labels
 */
(() => {
  "use strict";

  const ALERTS_GEOJSON_URL = "/api/public/alerts?format=geojson";
  const RAINVIEWER_MAPS_URL = "/api/public/radar/rainviewer/maps";
  const ALERTS_REFRESH_MS = 30_000;
  const RADAR_FRAME_MS = 420;
  const RADAR_META_REFRESH_MS = 3 * 60_000;

  const statusLine = document.querySelector("#statusLine");
  const alertList = document.querySelector("#alertList");
  const alertCount = document.querySelector("#alertCount");
  const radarToggle = document.querySelector("#radarToggle");
  const radarSourceSelect = document.querySelector("#radarSourceSelect");
  const radarPlayButton = document.querySelector("#radarPlayButton");
  const radarPlayIcon = document.querySelector("#radarPlayIcon");
  const radarPlayLabel = document.querySelector("#radarPlayLabel");
  const radarPreviousButton = document.querySelector("#radarPreviousButton");
  const radarNextButton = document.querySelector("#radarNextButton");
  const radarSpeedSelect = document.querySelector("#radarSpeedSelect");
  const radarTimeLabel = document.querySelector("#radarTimeLabel");
  const radarProductSelect = document.querySelector("#radarProductSelect");
  const radarOpacity = document.querySelector("#radarOpacity");
  const radarLegend = document.querySelector("#radarLegend");
  const radarLegendTitle = document.querySelector("#radarLegendTitle");
  const radarLegendScale = document.querySelector("#radarLegendScale");
  const satelliteToggle = document.querySelector("#satelliteToggle");
  const locationSearchForm = document.querySelector("#locationSearchForm");
  const locationSearch = document.querySelector("#locationSearch");
  const locationResults = document.querySelector("#locationResults");
  const mapActiveCount = document.querySelector("#mapActiveCount");
  const satelliteStatus = document.querySelector("#satelliteStatus");
  const wpcEroToggle = document.querySelector("#wpcEroToggle");
  const wpcEroDaySelect = document.querySelector("#wpcEroDay");
  const productDialog = document.querySelector("#productDialog");
  const dialogTitle = document.querySelector("#dialogTitle");
  const dialogBody = document.querySelector("#dialogBody");

  let features = [];
  let selectedId = null;
  let alertsTimer = null;
  let radarMetaTimer = null;
  let radarFrameTimer = null;
  let iemRefreshKey = Date.now();

  let radarSourceId = "iem"; // iem (default) | rainviewer | noaa-wms
  let radarProductId = "n0q";
  let radarEnabled = true;
  let radarPlaying = false;
  if (radarSpeedSelect) {
    radarSpeedSelect.value = localStorage.getItem("zasnet-radar-animation-speed") || "900";
    if (radarSpeedSelect.selectedIndex < 0) radarSpeedSelect.value = "900";
  }
  let radarOpacityValue = 0.78;
  let satelliteEnabled = localStorage.getItem("public-geocolor-enabled") === "true";
  let locationMarker = null;
  let wpcEroEnabled = localStorage.getItem("public-wpc-ero-enabled") === "true";
  let wpcEroDay = Math.max(1, Math.min(5, Number(localStorage.getItem("public-wpc-ero-day")) || 1));
  let wpcEroTimer = null;
  let rainviewerHost = "https://tilecache.rainviewer.com";
  let rainviewerFrames = []; // { time, path }
  let rainviewerIndex = 0;

  const map = new maplibregl.Map({
    container: "publicMap",
    style: {
      version: 8,
      glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
      sources: {},
      layers: [
        {
          id: "basemap",
          type: "background",
          paint: { "background-color": "#18211f" }
        }
      ]
    },
    center: [-98.2, 38.4],
    zoom: 4.15,
    minZoom: 3.25,
    maxBounds: [[-128, 22], [-63, 53]],
    dragRotate: false,
    touchPitch: false,
    attributionControl: true
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");

  function setSatelliteVisible(visible) {
    satelliteEnabled = Boolean(visible);
    localStorage.setItem("public-geocolor-enabled", String(satelliteEnabled));
    if (satelliteToggle) satelliteToggle.checked = satelliteEnabled;
    if (satelliteStatus) satelliteStatus.textContent = satelliteEnabled ? "GeoColor on" : "Off";
    if (!map.isStyleLoaded()) return;
    if (!map.getSource("public-geocolor")) {
      map.addSource("public-geocolor", { type: "raster", tiles: ["/api/public/satellite/nesdis/geocolor/{z}/{x}/{y}"], tileSize: 256, attribution: "GOES-19 GeoColor · NOAA / SSEC RealEarth", maxzoom: 9 });
      map.addLayer({ id: "public-geocolor", type: "raster", source: "public-geocolor", paint: { "raster-opacity": .72, "raster-fade-duration": 250 } }, map.getLayer("public-radar") ? "public-radar" : undefined);
    }
    map.setLayoutProperty("public-geocolor", "visibility", satelliteEnabled ? "visible" : "none");
    restackRadarUnderAlerts();
  }

  function setStatus(text) {
    if (statusLine) {
      statusLine.textContent = text;
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function shortTime(isoOrSec) {
    if (isoOrSec == null || isoOrSec === "") {
      return "—";
    }
    try {
      const d =
        typeof isoOrSec === "number"
          ? new Date(isoOrSec < 1e12 ? isoOrSec * 1000 : isoOrSec)
          : new Date(isoOrSec);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return String(isoOrSec);
    }
  }

  function rainviewerTileUrl(path) {
    // Proxied XYZ — color 4 ≈ NEXRAD-style; 1_1 = smooth + snow
    const q = new URLSearchParams({
      path,
      color: "4",
      options: "1_1",
      size: "256"
    });
    return `/api/public/radar/rainviewer/tile/{z}/{x}/{y}?${q.toString()}`;
  }

  const iemProducts = {
    n0q: "BR",
    n0r: "REF"
  };

  function iemProductLabel() {
    return iemProducts[radarProductId] || iemProducts.n0q;
  }

  function iemTileUrl() {
    const q = new URLSearchParams({ product: radarProductId, v: String(iemRefreshKey) });
    return `/api/public/radar/iem/{z}/{x}/{y}?${q.toString()}`;
  }

  function noaaWmsTileUrl() {
    // Higher-res WMS tiles + png32 transparency
    return "/api/public/radar-wms?bbox={bbox-epsg-3857}&width=512&height=512&format=image/png32";
  }

  function radarAttribution() {
    if (radarSourceId === "rainviewer") {
      return 'Radar: <a href="https://www.rainviewer.com/api.html">RainViewer</a>';
    }
    if (radarSourceId === "iem") {
      return 'Radar: <a href="https://mesonet.agron.iastate.edu/">IEM</a> NEXRAD composite';
    }
    return 'Radar: <a href="https://www.weather.gov/">NOAA/NWS</a> MRMS base reflectivity';
  }

  function removeRadarLayers() {
    ["public-radar", "public-radar-under"].forEach((id) => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    });
    if (map.getSource("public-radar")) {
      map.removeSource("public-radar");
    }
  }

  function currentRadarTiles() {
    if (radarSourceId === "rainviewer") {
      const frame = rainviewerFrames[rainviewerIndex] || rainviewerFrames[rainviewerFrames.length - 1];
      if (!frame) {
        return null;
      }
      return [rainviewerTileUrl(frame.path)];
    }
    if (radarSourceId === "iem") {
      return [iemTileUrl()];
    }
    return [noaaWmsTileUrl()];
  }

  /** Stack: basemap → county/zone alerts → radar → issued polygons → labels. */
  function restackRadarUnderAlerts() {
    try {
      if (map.getLayer("wpc-ero-fill")) map.moveLayer("wpc-ero-fill");
      if (map.getLayer("wpc-ero-outline")) map.moveLayer("wpc-ero-outline");
      if (map.getLayer("alerts-lower-fill")) {
        map.moveLayer("alerts-lower-fill");
      }
      if (map.getLayer("alerts-lower-outline")) {
        map.moveLayer("alerts-lower-outline");
      }
      if (map.getLayer("public-radar")) {
        map.moveLayer("public-radar");
      }
      if (map.getLayer("public-state-lines")) map.moveLayer("public-state-lines");
      if (map.getLayer("public-city-labels")) map.moveLayer("public-city-labels");
      if (map.getLayer("alerts-fill")) {
        map.moveLayer("alerts-fill");
      }
      if (map.getLayer("alerts-outline")) {
        map.moveLayer("alerts-outline");
      }
      if (map.getLayer("alerts-label")) {
        map.moveLayer("alerts-label");
      }
    } catch {
      /* ignore */
    }
  }

  async function loadWpcEro() {
    if (!wpcEroEnabled) return;
    const response = await fetch(`/api/public/wpc-ero?day=${wpcEroDay}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!map.getSource("wpc-ero")) {
      map.addSource("wpc-ero", { type: "geojson", data });
      map.addLayer({ id: "wpc-ero-fill", type: "fill", source: "wpc-ero", paint: { "fill-color": ["match", ["to-number", ["get", "dn"]], 1, "#38A800", 2, "#FFFE00", 3, "#F50000", 4, "#FF69C5", "#38A800"], "fill-opacity": 0.28 } });
      map.addLayer({ id: "wpc-ero-outline", type: "line", source: "wpc-ero", paint: { "line-color": ["match", ["to-number", ["get", "dn"]], 1, "#00734C", 2, "#E69800", 3, "#8A0000", 4, "#FF00FF", "#00734C"], "line-width": 2 } });
    } else {
      map.getSource("wpc-ero").setData(data);
    }
    restackRadarUnderAlerts();
  }

  function removeWpcEro() {
    ["wpc-ero-outline", "wpc-ero-fill"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource("wpc-ero")) map.removeSource("wpc-ero");
  }

  function ensureRadarLayer() {
    const tiles = currentRadarTiles();
    if (!tiles) {
      return;
    }

    if (!map.getSource("public-radar")) {
      map.addSource("public-radar", {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: radarAttribution(),
        // Allow overzoom so radar stays sharp when zoomed into a cell
        maxzoom: 12
      });
      // Add below alert fills so warnings remain visible over the radar.
      const beforeId = map.getLayer("alerts-fill") ? "alerts-fill" : undefined;
      map.addLayer(
        {
          id: "public-radar",
          type: "raster",
          source: "public-radar",
          paint: {
            "raster-opacity": radarOpacityValue,
            "raster-fade-duration": 0,
            "raster-resampling": "linear"
          }
        },
        beforeId
      );
    } else {
      const src = map.getSource("public-radar");
      if (src && typeof src.setTiles === "function") {
        src.setTiles(tiles);
      }
    }

    if (map.getLayer("public-radar")) {
      map.setPaintProperty("public-radar", "raster-opacity", radarOpacityValue);
      map.setLayoutProperty("public-radar", "visibility", radarEnabled ? "visible" : "none");
      restackRadarUnderAlerts();
    }
  }

  function updateRadarTimeLabel() {
    if (!radarTimeLabel) {
      return;
    }
    if (!radarEnabled) {
      radarTimeLabel.textContent = "Radar off";
      return;
    }
    if (radarSourceId === "rainviewer" && rainviewerFrames.length) {
      const frame = rainviewerFrames[rainviewerIndex];
      const t = shortTime(frame.time);
      radarTimeLabel.textContent = `Updated ${t} · ${rainviewerIndex + 1}/${rainviewerFrames.length}`;
      return;
    }
    if (radarSourceId === "iem") {
      radarTimeLabel.textContent = `IEM ${iemProductLabel()} · auto-updating`;
      return;
    }
    radarTimeLabel.textContent = "NOAA MRMS · auto-updating";
  }

  function updateRadarLegend() {
    if (!radarLegend) return;
    radarLegend.hidden = !radarEnabled;
    if (radarLegendTitle) radarLegendTitle.textContent = radarSourceId === "rainviewer" ? "Radar intensity" : "Reflectivity · dBZ";
    if (radarLegendScale) radarLegendScale.innerHTML = radarSourceId === "rainviewer"
      ? "<span>Light</span><span>Moderate</span><span>Heavy</span>"
      : "<span>-20</span><span>20</span><span>40</span><span>60+</span>";
  }

  function setRadarPlaying(on) {
    radarPlaying = Boolean(on) && radarSourceId === "rainviewer" && radarEnabled;
    if (radarPlayIcon) {
      radarPlayIcon.textContent = radarPlaying ? "❚❚" : "▶";
    }
    if (radarPlayLabel) radarPlayLabel.textContent = radarPlaying ? "Pause" : "Play";
    if (radarPlayButton) {
      radarPlayButton.disabled = radarSourceId !== "rainviewer" || !radarEnabled;
      radarPlayButton.setAttribute("aria-pressed", String(radarPlaying));
      radarPlayButton.setAttribute("aria-label", radarPlaying ? "Pause radar animation" : "Play radar animation");
      radarPlayButton.title =
        radarSourceId !== "rainviewer" ? "Animation available for RainViewer only" : radarPlaying ? "Pause" : "Play";
    }
    if (radarFrameTimer) {
      window.clearInterval(radarFrameTimer);
      radarFrameTimer = null;
    }
    if (radarPlaying && rainviewerFrames.length > 1) {
      radarFrameTimer = window.setInterval(() => {
        rainviewerIndex = (rainviewerIndex + 1) % rainviewerFrames.length;
        ensureRadarLayer();
        updateRadarTimeLabel();
      }, Number(radarSpeedSelect?.value || RADAR_FRAME_MS));
    }
    [radarPreviousButton, radarNextButton].forEach(button => { if (button) button.disabled = radarSourceId !== "rainviewer" || !radarEnabled || rainviewerFrames.length < 2; });
    if (radarSpeedSelect) radarSpeedSelect.disabled = radarSourceId !== "rainviewer" || !radarEnabled;
  }
  function stepRadarFrame(delta) {
    if (radarSourceId !== "rainviewer" || !radarEnabled || rainviewerFrames.length < 2) return;
    setRadarPlaying(false);
    rainviewerIndex = (rainviewerIndex + delta + rainviewerFrames.length) % rainviewerFrames.length;
    ensureRadarLayer();
    updateRadarTimeLabel();
  }

  async function loadRainviewerFrames() {
    const res = await fetch(RAINVIEWER_MAPS_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`RainViewer maps HTTP ${res.status}`);
    }
    const data = await res.json();
    rainviewerHost = data.host || rainviewerHost;
    const past = (data.radar && data.radar.past) || [];
    const nowcast = (data.radar && data.radar.nowcast) || [];
    // Past frames + a couple nowcast steps for a smooth loop feel
    rainviewerFrames = past
      .concat(nowcast.slice(0, 3))
      .filter((f) => f && f.path)
      .map((f) => ({ time: f.time, path: f.path }));
    if (!rainviewerFrames.length) {
      throw new Error("No RainViewer frames");
    }
    rainviewerIndex = Math.max(0, rainviewerFrames.length - 1);
  }

  async function setupRadarSource(id) {
    radarSourceId = id || radarSourceSelect?.value || "iem";
    if (radarSourceSelect && radarSourceSelect.value !== radarSourceId) {
      radarSourceSelect.value = radarSourceId;
    }
    removeRadarLayers();
    setRadarPlaying(false);
    updateRadarProductControl();
    updateRadarLegend();

    try {
      if (radarSourceId === "rainviewer") {
        await loadRainviewerFrames();
        ensureRadarLayer();
        setRadarPlaying(radarEnabled);
        updateRadarTimeLabel();
        return;
      }
      // static sources (IEM default)
      ensureRadarLayer();
      updateRadarTimeLabel();
    } catch (error) {
      console.warn("Radar source failed, falling back to IEM", error);
      if (radarSourceId !== "iem") {
        radarSourceId = "iem";
        if (radarSourceSelect) {
          radarSourceSelect.value = "iem";
        }
        removeRadarLayers();
        ensureRadarLayer();
        updateRadarTimeLabel();
        updateRadarLegend();
        setStatus(`Radar fallback (IEM): ${error.message}`);
      }
    }
  }

  function updateRadarProductControl() {
    if (!radarProductSelect) {
      return;
    }
    radarProductSelect.value = iemProducts[radarProductId] ? radarProductId : "n0q";
    radarProductSelect.disabled = radarSourceId !== "iem" || !radarEnabled;
    radarProductSelect.title =
      radarSourceId === "iem" ? "IEM radar product" : "Product selection is available for IEM radar";
  }

  function ensureAlertLayers() {
    if (map.getSource("public-alerts")) {
      return;
    }
    map.addSource("public-alerts", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
    const lowerTier = ["==", ["get", "geometryTier"], "area"];
    const warningTier = ["==", ["get", "geometryTier"], "polygon"];
    map.addLayer({
      id: "alerts-lower-fill",
      type: "fill",
      source: "public-alerts",
      filter: lowerTier,
      layout: { "fill-sort-key": ["-", 1000, ["coalesce", ["to-number", ["get", "priority"]], 200]] },
      paint: { "fill-color": ["coalesce", ["get", "color"], "#DB7093"], "fill-opacity": 1, "fill-antialias": false, "fill-outline-color": "rgba(0,0,0,0)" }
    });
    map.addLayer({
      id: "alerts-lower-outline",
      type: "line",
      source: "public-alerts",
      filter: lowerTier,
      paint: { "line-color": ["coalesce", ["get", "color"], "#DB7093"], "line-width": 0, "line-opacity": 0 }
    });
    // Issued alert polygons sit above radar regardless of product name.
    map.addLayer({
      id: "alerts-fill",
      type: "fill",
      source: "public-alerts",
      filter: warningTier,
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#DB7093"],
        "fill-opacity": 1,
        "fill-antialias": false,
        "fill-outline-color": "rgba(0,0,0,0)"
      }
    });
    map.addLayer({
      id: "alerts-outline",
      type: "line",
      source: "public-alerts",
      filter: warningTier,
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#DB7093"],
        "line-width": 0,
        "line-opacity": 0
      }
    });
    // One label per product (isLabelHost) — above radar so readable
    map.addLayer({
      id: "alerts-label",
      type: "symbol",
      source: "public-alerts",
      filter: ["==", ["get", "isLabelHost"], 1],
      layout: {
        "text-field": ["coalesce", ["get", "productId"], ["concat", ["get", "product"], ["get", "etnLabel"]]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-offset": [0, 0.15],
        "text-allow-overlap": false,
        "symbol-z-order": "source"
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#0b0d10",
        "text-halo-width": 1.5
      }
    });
  }

  /** Stable key for one logical product (watch/warning), not per-county. */
  function productKey(p) {
    if (!p) {
      return "";
    }
    if (p.productId) {
      return String(p.productId);
    }
    if (p.product && (p.etnLabel || p.etn)) {
      return `${p.product}${p.etnLabel || p.etn}`;
    }
    return String(p.id || "");
  }

  /**
   * Sidebar: one card per watch/warning productId (never one per county).
   */
  function uniqueAlertCards(feats) {
    const byKey = new Map();
    (feats || []).forEach((f) => {
      const p = f.properties || {};
      const key = productKey(p);
      if (!key) {
        return;
      }
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: p.id,
          productId: p.productId || key,
          product: p.product,
          productName: p.productName,
          etnLabel: p.etnLabel,
          color: p.color,
          expiresAt: p.expiresAt,
          locationPhrase: p.locationPhrase || "",
          text: p.text || "",
          kind: p.kind,
          countyCount: 0,
          countyNames: new Set(),
          states: new Set()
        });
      }
      const card = byKey.get(key);
      // Prefer the record id from the label host / first feature
      if (p.isLabelHost === 1 || p.isLabelHost === true) {
        card.id = p.id;
      }
      if (p.countyName) {
        const ckey = `${p.countyState || ""}:${p.countyName}`;
        if (!card.countyNames.has(ckey)) {
          card.countyNames.add(ckey);
          card.countyCount += 1;
        }
      } else if (p.countyState) {
        card.countyCount += 1;
      }
      if (p.countyState) {
        card.states.add(String(p.countyState).toUpperCase());
      }
      if (p.locationPhrase && (!card.locationPhrase || p.locationPhrase.length > card.locationPhrase.length)) {
        card.locationPhrase = p.locationPhrase;
      }
      if (p.text && (!card.text || p.text.length > card.text.length)) {
        card.text = p.text;
      }
    });
    return [...byKey.values()].map((c) => {
      const stateLine =
        c.states.size > 0 ? [...c.states].sort().join("-") : c.locationPhrase || "";
      return {
        ...c,
        locationPhrase: stateLine,
        states: undefined,
        countyNames: undefined
      };
    });
  }

  /**
   * Map data: keep only the newest record per productId, and force a single
   * isLabelHost=1 so we never stamp the watch id on every county.
   */
  function prepareMapFeatures(rawFeatures) {
    const list = rawFeatures || [];
    // Newest record id per product key
    const bestRecord = new Map();
    list.forEach((f) => {
      const p = f.properties || {};
      const key = productKey(p);
      if (!key || !p.id) {
        return;
      }
      const score = Math.max(
        new Date(p.expiresAt || 0).getTime() || 0,
        new Date(p.issuedAt || 0).getTime() || 0
      );
      const prev = bestRecord.get(key);
      if (!prev || score >= prev.score) {
        bestRecord.set(key, { recordId: p.id, score });
      }
    });

    const filtered = list.filter((f) => {
      const p = f.properties || {};
      const key = productKey(p);
      if (!key) {
        return true;
      }
      const best = bestRecord.get(key);
      return !best || best.recordId === p.id;
    });

    // Exactly one label host per product key
    const labeled = new Set();
    return filtered.map((f) => {
      const p = { ...(f.properties || {}) };
      const key = productKey(p);
      let host = 0;
      if (key && !labeled.has(key)) {
        host = 1;
        labeled.add(key);
      }
      p.isLabelHost = host;
      return { ...f, properties: p };
    });
  }

  function setRadarVisible(on) {
    radarEnabled = Boolean(on);
    if (map.getLayer("public-radar")) {
      map.setLayoutProperty("public-radar", "visibility", radarEnabled ? "visible" : "none");
    }
    if (!radarEnabled) {
      setRadarPlaying(false);
    } else if (radarSourceId === "rainviewer") {
      setRadarPlaying(true);
    }
    updateRadarProductControl();
    updateRadarTimeLabel();
    updateRadarLegend();
  }

  function renderList() {
    if (!alertList) {
      return;
    }
    const cards = uniqueAlertCards(features);
    if (alertCount) {
      alertCount.textContent = String(cards.length);
    }
    if (mapActiveCount) mapActiveCount.textContent = String(cards.length);
    if (!cards.length) {
      alertList.innerHTML = '<p class="empty">No active alerts.</p>';
      return;
    }

    alertList.innerHTML = cards
      .map((p) => {
        const cardKey = p.productId || p.id;
        const selected =
          selectedId === p.id || selectedId === p.productId || selectedId === cardKey
            ? " is-selected"
            : "";
        const area =
          p.locationPhrase ||
          (p.countyCount > 0 ? `${p.countyCount} counties` : "");
        return `<button type="button" class="alert-card${selected}" data-id="${cardKey}">
          <div class="product"><span class="swatch" style="background:${p.color || "#DB7093"}"></span>${p.productId || `${p.product || "???"}${p.etnLabel || ""}`}</div>
          <div class="meta">${p.productName || ""} · until ${shortTime(p.expiresAt)}${area ? "<br>" + area : ""}</div>
        </button>`;
      })
      .join("");

    alertList.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        focusAlert(btn.getAttribute("data-id"), true);
      });
    });
  }

  function focusAlert(id, openDialog) {
    selectedId = id;
    renderList();
    // Fit all county polygons for this product (match by record id or productId)
    const members = features.filter((f) => {
      const p = f.properties || {};
      return p.id === id || p.productId === id || productKey(p) === id;
    });
    if (!members.length) {
      return;
    }
    try {
      const bounds = new maplibregl.LngLatBounds();
      const walk = (coords) => {
        if (typeof coords[0] === "number") {
          bounds.extend(coords);
          return;
        }
        coords.forEach(walk);
      };
      members.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          walk(feature.geometry.coordinates);
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 700 });
      }
    } catch {
      /* ignore */
    }
    const withText = members.find((f) => f.properties && f.properties.text);
    if (openDialog && withText) {
      showProduct(withText.properties);
    }
  }

  function showProduct(props) {
    if (!productDialog) {
      return;
    }
    dialogTitle.textContent = `${props.productId || props.product || ""} · ${props.productName || ""}`;
    dialogBody.textContent = props.text || "No product text.";
    if (typeof productDialog.showModal === "function") {
      productDialog.showModal();
    }
  }

  function chooseLocation(result) {
    const lon = Number(result.longitude), lat = Number(result.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    map.flyTo({ center: [lon, lat], zoom: 9, essential: true });
    locationMarker?.remove();
    const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${escapeHtml(result.label || "Selected location")}</strong><br><a href="/forecast-beta?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}">Open point forecast →</a>`);
    locationMarker = new maplibregl.Marker({ color: "#f2ba4b" }).setLngLat([lon, lat]).setPopup(popup).addTo(map);
    locationMarker.togglePopup();
    if (locationResults) { locationResults.hidden = true; locationResults.innerHTML = ""; }
  }

  async function searchLocations() {
    const query = String(locationSearch?.value || "").trim();
    if (query.length < 2 || !locationResults) return;
    locationResults.hidden = false;
    locationResults.innerHTML = "<button type=\"button\" disabled>Searching…</button>";
    try {
      const response = await fetch(`/api/public/location-search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      locationResults.innerHTML = (payload.results || []).map((result, index) => `<button type="button" data-location-index="${index}">${escapeHtml(result.label || "Location")}</button>`).join("") || '<button type="button" disabled>No matching U.S. location found</button>';
      locationResults.querySelectorAll("[data-location-index]").forEach((button) => button.addEventListener("click", () => chooseLocation(payload.results[Number(button.dataset.locationIndex)])));
    } catch (error) {
      locationResults.innerHTML = `<button type="button" disabled>Search unavailable: ${escapeHtml(error.message || error)}</button>`;
    }
  }

  async function loadAlerts() {
    try {
      const res = await fetch(ALERTS_GEOJSON_URL, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const fc = await res.json();
      features = prepareMapFeatures(fc.features || []);
      if (map.getSource("public-alerts")) {
        map.getSource("public-alerts").setData({
          type: "FeatureCollection",
          features
        });
      }
      // Radar must sit above county fills
      ensureRadarLayer();
      restackRadarUnderAlerts();
      renderList();
      const cards = uniqueAlertCards(features);
      const t = fc.updatedAt ? shortTime(fc.updatedAt) : "—";
      setStatus(`${cards.length} active · alerts ${t}`);
    } catch (error) {
      setStatus(`Alerts unavailable (${error.message})`);
    }
  }

  map.on("load", async () => {
    try {
      const mapBase = await fetch("/api/public/tropics/basemap?v=major-cities", { cache: "force-cache" }).then((response) => response.json());
      map.addSource("public-land", { type: "geojson", data: { type: "FeatureCollection", features: mapBase.features || [] } });
      map.addLayer({ id: "public-land", type: "fill", source: "public-land", paint: { "fill-color": "#242d29", "fill-opacity": 1 } });
      map.addLayer({ id: "public-state-lines", type: "line", source: "public-land", paint: { "line-color": "#65716a", "line-opacity": .72, "line-width": ["interpolate", ["linear"], ["zoom"], 3, .6, 7, 1.25] } });
      map.addSource("public-cities", { type: "geojson", data: { type: "FeatureCollection", features: mapBase.cities || [] } });
      map.addLayer({ id: "public-city-labels", type: "symbol", source: "public-cities", minzoom: 3.3, layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 3.3, 9, 7, 11], "text-allow-overlap": false, "symbol-sort-key": ["-", 10000000, ["coalesce", ["get", "population"], 0]] }, paint: { "text-color": "#d8d2c5", "text-halo-color": "#18211f", "text-halo-width": 1.5, "text-halo-blur": .5 } });
    } catch (error) {
      console.warn("Public basemap unavailable", error);
    }
    ensureAlertLayers();
    setSatelliteVisible(satelliteEnabled);
    if (wpcEroToggle) wpcEroToggle.checked = wpcEroEnabled;
    if (wpcEroDaySelect) wpcEroDaySelect.value = String(wpcEroDay);
    if (wpcEroEnabled) loadWpcEro().catch((error) => console.warn("WPC ERO load failed", error));
    await setupRadarSource(radarSourceSelect?.value || "iem");
    setRadarVisible(Boolean(radarToggle?.checked));
    loadAlerts();

    alertsTimer = window.setInterval(loadAlerts, ALERTS_REFRESH_MS);
    radarMetaTimer = window.setInterval(() => {
      if (radarSourceId === "rainviewer" && radarEnabled) {
        loadRainviewerFrames()
          .then(() => {
            ensureRadarLayer();
            updateRadarTimeLabel();
          })
          .catch((err) => console.warn("RainViewer refresh failed", err));
      } else if (radarEnabled && radarSourceId === "iem") {
        // Force MapLibre and the browser to request the latest IEM tiles.
        iemRefreshKey = Date.now();
        ensureRadarLayer();
      }
    }, RADAR_META_REFRESH_MS);
    wpcEroTimer = window.setInterval(() => {
      if (wpcEroEnabled) loadWpcEro().catch((error) => console.warn("WPC ERO refresh failed", error));
    }, 5 * 60_000);
  });

  map.on("error", (event) => {
    if (event?.sourceId !== "public-geocolor") return;
    satelliteEnabled = false;
    localStorage.setItem("public-geocolor-enabled", "false");
    if (satelliteToggle) satelliteToggle.checked = false;
    if (satelliteStatus) satelliteStatus.textContent = "Unavailable";
    if (map.getLayer("public-geocolor")) map.setLayoutProperty("public-geocolor", "visibility", "none");
    setStatus("GeoColor is temporarily unavailable; alerts and radar remain live.");
  });

  map.on("click", (event) => {
    const upper = map.queryRenderedFeatures(event.point, { layers: ["alerts-fill"] });
    const lower = map.queryRenderedFeatures(event.point, { layers: ["alerts-lower-fill"] });
    const seen = new Set();
    const stack = [...upper, ...lower].filter((feature) => {
      const id = feature.properties?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (!stack.length) {
      const ero = map.getLayer("wpc-ero-fill") ? map.queryRenderedFeatures(event.point, { layers: ["wpc-ero-fill"] })[0] : null;
      if (!ero) return;
      const p = ero.properties || {};
      const names = { 1: "Marginal · at least 5%", 2: "Slight · at least 15%", 3: "Moderate · at least 40%", 4: "High · at least 70%" };
      new maplibregl.Popup({ closeButton: true, maxWidth: "320px" }).setLngLat(event.lngLat).setHTML(`<strong>WPC ERO Day ${wpcEroDay}</strong><br>${names[Number(p.dn)] || p.outlook || "Excessive rainfall risk"}<br><small>${p.valid_time || `${p.start_time || ""} – ${p.end_time || ""}`}</small>`).addTo(map);
      return;
    }

    let index = 0;
    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "300px" }).setLngLat(event.lngLat);
    const renderPopupPage = () => {
      const props = stack[index].properties || {};
      selectedId = props.id;
      renderList();
      const idLabel = props.productId || `${props.product || ""} ${props.etnLabel || ""}`;
      const wfoCode = String(props.wfo || "").replace(/^K/i, "").toUpperCase();
      const wfoLink = /^[A-Z0-9]{3}$/.test(wfoCode)
        ? `<br><a href="/wfo.html?wfo=${encodeURIComponent(wfoCode)}" style="display:inline-block;margin-top:7px;color:#9bddff">Open WFO ${wfoCode} local map</a>`
        : "";
      const navigation = stack.length > 1
        ? `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px;gap:8px"><button type="button" data-popup-prev aria-label="Previous product" style="cursor:pointer">&#8592;</button><span>${index + 1} of ${stack.length}</span><button type="button" data-popup-next aria-label="Next product" style="cursor:pointer">&#8594;</button></div>`
        : "";
      popup.setHTML(`<strong>${idLabel}</strong><br>${props.productName || ""}<br><span style="opacity:.75">Until ${shortTime(props.expiresAt)}</span>${navigation}<br><button type="button" data-popup-read style="margin-top:6px;cursor:pointer">Read product</button>${wfoLink}`).addTo(map);
      window.setTimeout(() => {
        const root = popup.getElement();
        root?.querySelector("[data-popup-prev]")?.addEventListener("click", () => {
          index = (index - 1 + stack.length) % stack.length;
          renderPopupPage();
        });
        root?.querySelector("[data-popup-next]")?.addEventListener("click", () => {
          index = (index + 1) % stack.length;
          renderPopupPage();
        });
        root?.querySelector("[data-popup-read]")?.addEventListener("click", () => {
          const current = stack[index].properties || {};
          const full = features.find((x) => x.properties && x.properties.id === current.id);
          showProduct(full ? full.properties : current);
        });
      }, 0);
    };
    renderPopupPage();
  });

  ["alerts-fill", "alerts-lower-fill"].forEach((layerId) => {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  });

  if (radarToggle) {
    radarToggle.addEventListener("change", () => setRadarVisible(radarToggle.checked));
  }
  satelliteToggle?.addEventListener("change", () => setSatelliteVisible(satelliteToggle.checked));
  locationSearchForm?.addEventListener("submit", (event) => { event.preventDefault(); searchLocations(); });
  if (wpcEroToggle) {
    wpcEroToggle.addEventListener("change", () => {
      wpcEroEnabled = wpcEroToggle.checked;
      localStorage.setItem("public-wpc-ero-enabled", String(wpcEroEnabled));
      if (wpcEroEnabled) loadWpcEro().catch((error) => setStatus(`WPC ERO unavailable (${error.message})`));
      else removeWpcEro();
    });
  }
  if (wpcEroDaySelect) {
    wpcEroDaySelect.addEventListener("change", () => {
      wpcEroDay = Math.max(1, Math.min(5, Number(wpcEroDaySelect.value) || 1));
      localStorage.setItem("public-wpc-ero-day", String(wpcEroDay));
      if (wpcEroEnabled) loadWpcEro().catch((error) => setStatus(`WPC ERO unavailable (${error.message})`));
    });
  }
  if (radarSourceSelect) {
    radarSourceSelect.addEventListener("change", () => {
      setupRadarSource(radarSourceSelect.value);
    });
  }
  if (radarProductSelect) {
    radarProductSelect.addEventListener("change", () => {
      radarProductId = iemProducts[radarProductSelect.value] ? radarProductSelect.value : "n0q";
      if (radarSourceId === "iem") {
        ensureRadarLayer();
        updateRadarTimeLabel();
      }
    });
  }
  if (radarPlayButton) {
    radarPlayButton.addEventListener("click", () => {
      if (radarSourceId !== "rainviewer" || !radarEnabled) {
        return;
      }
      setRadarPlaying(!radarPlaying);
    });
  }
  radarPreviousButton?.addEventListener("click", () => stepRadarFrame(-1));
  radarNextButton?.addEventListener("click", () => stepRadarFrame(1));
  radarSpeedSelect?.addEventListener("change", () => {
    localStorage.setItem("zasnet-radar-animation-speed", radarSpeedSelect.value);
    if (radarPlaying) setRadarPlaying(true);
  });
  if (radarOpacity) {
    radarOpacity.addEventListener("input", () => {
      radarOpacityValue = Number(radarOpacity.value) / 100;
      if (map.getLayer("public-radar")) {
        map.setPaintProperty("public-radar", "raster-opacity", radarOpacityValue);
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    if (alertsTimer) window.clearInterval(alertsTimer);
    if (radarMetaTimer) window.clearInterval(radarMetaTimer);
    if (radarFrameTimer) window.clearInterval(radarFrameTimer);
    if (wpcEroTimer) window.clearInterval(wpcEroTimer);
  });
})();
