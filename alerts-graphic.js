(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  const selectedWfo = (params.get("wfo") || "").replace(/^K/i, "").toUpperCase();
  const query = /^[A-Z0-9]{3}$/.test(selectedWfo) ? `wfo=${encodeURIComponent(selectedWfo)}` : "";
  let radarEnabled = params.get("radar") === "1";
  let satelliteEnabled = params.get("satellite") === "1";
  const graphic = document.querySelector("#graphic");
  const title = document.querySelector("#productTitle");
  const detail = document.querySelector("#productDetail");
  const text = document.querySelector("#productText");
  const wfoLink = document.querySelector("#wfoLink");
  const panel = document.querySelector(".product-panel");
  const localTitle = document.querySelector("#localTitle");
  const localOfficeMeta = document.querySelector("#localOfficeMeta");
  const wfoCodeBadge = document.querySelector("#wfoCodeBadge");
  const neighborNav = document.querySelector("#wfoNeighborNav");
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const summary = document.querySelector("#alertSummary");
  const search = document.querySelector("#wfoSearch");
  const searchResults = document.querySelector("#wfoSearchResults");
  const refreshButton = document.querySelector("#refreshMap");
  let fullscreenButton = document.querySelector("#fullscreenMap");
  const mapCard = document.querySelector("#mapCard") || graphic?.closest(".graphic-card");
  let products = new Map();
  let localCwaBounds = null;

  if (wfoCodeBadge && selectedWfo) wfoCodeBadge.textContent = selectedWfo;

  function geometryBounds(geometry) {
    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    const walk = (value) => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === "number") {
        bounds[0] = Math.min(bounds[0], value[0]); bounds[1] = Math.min(bounds[1], value[1]);
        bounds[2] = Math.max(bounds[2], value[0]); bounds[3] = Math.max(bounds[3], value[1]);
      } else value.forEach(walk);
    };
    walk(geometry?.coordinates);
    return bounds.every(Number.isFinite) ? bounds : null;
  }

  function renderNeighborOffices(features, currentFeature) {
    if (!neighborNav || !currentFeature) return;
    const currentBounds = geometryBounds(currentFeature.geometry);
    if (!currentBounds) return;
    const origin = [(currentBounds[0] + currentBounds[2]) / 2, (currentBounds[1] + currentBounds[3]) / 2];
    const longitudeScale = Math.max(0.2, Math.cos(origin[1] * Math.PI / 180));
    const directions = [
      { key: "nw", arrow: "↖", label: "Northwest", angle: 135 },
      { key: "n", arrow: "↑", label: "North", angle: 90 },
      { key: "ne", arrow: "↗", label: "Northeast", angle: 45 },
      { key: "w", arrow: "←", label: "West", angle: 180 },
      { key: "e", arrow: "→", label: "East", angle: 0 },
      { key: "sw", arrow: "↙", label: "Southwest", angle: -135 },
      { key: "s", arrow: "↓", label: "South", angle: -90 },
      { key: "se", arrow: "↘", label: "Southeast", angle: -45 }
    ];
    const candidates = (features || []).map((feature) => {
      const officeCode = String(feature.properties?.CWA || feature.properties?.WFO || "").replace(/^K/i, "").toUpperCase();
      const bounds = geometryBounds(feature.geometry);
      if (!bounds || !/^[A-Z0-9]{3}$/.test(officeCode) || officeCode === selectedWfo) return null;
      const center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
      const dx = (center[0] - origin[0]) * longitudeScale;
      const dy = center[1] - origin[1];
      return { feature, code: officeCode, angle: Math.atan2(dy, dx) * 180 / Math.PI, distance: Math.hypot(dx, dy) };
    }).filter(Boolean);
    const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    const used = new Set();
    const offices = directions.map((direction) => {
      const match = candidates
        .filter((candidate) => !used.has(candidate.code) && angleDifference(candidate.angle, direction.angle) <= 35)
        .sort((a, b) => a.distance - b.distance || angleDifference(a.angle, direction.angle) - angleDifference(b.angle, direction.angle))[0];
      if (match) used.add(match.code);
      return { ...direction, office: match };
    });
    neighborNav.innerHTML = `<span class="wfo-neighbor-current"><strong>${esc(selectedWfo)}</strong><small>Current office</small></span>` + offices.map(({ key, arrow, label, office }) => {
      if (!office) return `<span class="wfo-neighbor-empty is-${key}" aria-hidden="true"></span>`;
      const props = office.feature.properties || {};
      const place = props.CITY || props.CITYSTATE || office.code;
      return `<a class="wfo-neighbor-link is-${key}" href="/wfo.html?wfo=${encodeURIComponent(office.code)}" aria-label="${esc(label)} to WFO ${esc(office.code)}, ${esc(place)}" title="${esc(label)} · ${esc(place)} (${esc(office.code)})"><b aria-hidden="true">${arrow}</b><span><strong>${esc(office.code)}</strong><small>${esc(place)}</small></span></a>`;
    }).join("");
  }

  function forecastLocation(event) {
    const svg = graphic?.querySelector("svg");
    if (!svg || !localCwaBounds) return null;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    const width = 1400, height = 900, mapTop = 122, panelWidth = 330, mapWidth = width - panelWidth, padding = 38;
    const bbox = [localCwaBounds[0] - 1.1, localCwaBounds[1] - .8, localCwaBounds[2] + 1.1, localCwaBounds[3] + .8];
    const longitudeScale = Math.cos(((bbox[1] + bbox[3]) / 2) * Math.PI / 180);
    const scale = Math.min((mapWidth - padding * 2) / ((bbox[2] - bbox[0]) * longitudeScale), (height - mapTop - padding * 2) / (bbox[3] - bbox[1]));
    const offsetX = (mapWidth - (bbox[2] - bbox[0]) * longitudeScale * scale) / 2;
    const offsetY = (height - mapTop - (bbox[3] - bbox[1]) * scale) / 2 + mapTop;
    if(local.x<0||local.x>mapWidth||local.y<mapTop||local.y>height)return null;
    return { lon: bbox[0] + (local.x - offsetX) / (longitudeScale * scale), lat: bbox[3] - (local.y - offsetY) / scale };
  }

  // Product text belongs in a focused surface, not below the map.  Build the
  // drawer controls here so national and local pages stay on the same template.
  let closeButton = document.querySelector("#productClose");
  let scrim = document.querySelector("#productScrim");
  if (panel && !closeButton) {
    closeButton = document.createElement("button");
    closeButton.id = "productClose";
    closeButton.className = "drawer-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close product details");
    closeButton.textContent = "×";
    panel.prepend(closeButton);
  }
  if (panel && !scrim) {
    scrim = document.createElement("button");
    scrim.id = "productScrim";
    scrim.className = "drawer-scrim";
    scrim.type = "button";
    scrim.setAttribute("aria-label", "Close product details");
    panel.before(scrim);
  }
  const closeDrawer = () => document.body.removeAttribute("data-product-open");
  const openDrawer = () => document.body.setAttribute("data-product-open", "true");
  closeButton?.addEventListener("click", closeDrawer);
  scrim?.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });

  let radarButton = document.querySelector("#radarToggle");
  const mapActions = document.querySelector(".map-actions");
  if (!radarButton) {
    radarButton = document.createElement("button");
    radarButton.id = "radarToggle";
    radarButton.type = "button";
    if (mapActions) mapActions.prepend(radarButton);
  }
  // Local office maps have the same presentation controls as the national
  // map, including a portable copy of the generated SVG.
  if (selectedWfo && !fullscreenButton && mapActions) {
    fullscreenButton = document.createElement("button");
    fullscreenButton.id = "fullscreenMap";
    fullscreenButton.type = "button";
    fullscreenButton.textContent = "Full screen";
    mapActions.append(fullscreenButton);
  }
  let saveButton = document.querySelector("#saveMap");
  if (!saveButton && mapActions) {
    saveButton = document.createElement("button");
    saveButton.id = "saveMap";
    saveButton.type = "button";
    saveButton.textContent = "Export PNG";
    mapActions.append(saveButton);
  }
  const updateRadarButton = () => {
    if (!radarButton) return;
    radarButton.textContent = radarEnabled ? "IEM radar: on" : "IEM radar";
    radarButton.classList.toggle("is-active", radarEnabled);
    radarButton.setAttribute("aria-pressed", String(radarEnabled));
  };
  radarButton?.addEventListener("click", () => { radarEnabled = !radarEnabled; updateRadarButton(); load(); });
  updateRadarButton();

  let satelliteButton = document.querySelector("#satelliteToggle");
  if (!selectedWfo && !satelliteButton && mapActions) {
    satelliteButton = document.createElement("button");
    satelliteButton.id = "satelliteToggle";
    satelliteButton.type = "button";
    mapActions.prepend(satelliteButton);
  }
  const updateSatelliteButton = () => {
    if (!satelliteButton) return;
    satelliteButton.textContent = satelliteEnabled ? "GeoColor: on" : "GeoColor";
    satelliteButton.classList.toggle("is-active", satelliteEnabled);
    satelliteButton.setAttribute("aria-pressed", String(satelliteEnabled));
  };
  satelliteButton?.addEventListener("click", () => { satelliteEnabled = !satelliteEnabled; updateSatelliteButton(); load(); });
  updateSatelliteButton();

  if (localTitle && query) {
    localTitle.textContent = `WFO ${selectedWfo} active weather`;
    fetch(`/api/public/wfo?code=${encodeURIComponent(selectedWfo)}`, { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : null)
      .then((office) => {
        if (!office) return;
        const place = [office.city, office.state].filter(Boolean).join(", ") || office.cityState || selectedWfo;
        localTitle.textContent = `${place} active weather`;
        if (localOfficeMeta) localOfficeMeta.textContent = `National Weather Service forecast office · WFO ${selectedWfo}`;
        document.title = `ZASNet · ${place} Weather`;
      }).catch(() => {});
    fetch("/data/generated/awips/cwa.geojson", { cache: "force-cache" }).then((response) => response.json()).then((data) => {
      const cwa = (data.features || []).find((feature) => String(feature.properties?.CWA || feature.properties?.WFO || "").toUpperCase() === selectedWfo);
      localCwaBounds = geometryBounds(cwa?.geometry);
      renderNeighborOffices(data.features || [], cwa);
    }).catch(() => {});
  }

  async function loadSummary() {
    if (!summary) return;
    if (selectedWfo) return;
    try {
      const response = await fetch("/api/public/summary", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      summary.innerHTML = `<span><strong>${data.total || 0}</strong> active products</span><span><strong>${data.offices || 0}</strong> offices affected</span>`;
    } catch { summary.innerHTML = "<span>Active product summary unavailable</span>"; }
  }

  function renderLocalSummary(features) {
    if (!summary || !selectedWfo) return;
    const productNames = {
      "FW.W": "Red Flag Warning", "TOR": "Tornado Warning", "SVR": "Severe Thunderstorm Warning",
      "FFW": "Flash Flood Warning", "FLW": "Flood Warning", "FAY": "Flood Advisory",
      "WS.W": "Winter Storm Warning", "BZ.W": "Blizzard Warning", "IS.W": "Ice Storm Warning",
      "TOA": "Tornado Watch", "SVA": "Severe Thunderstorm Watch"
    };
    const localProducts = new Map();
    features.forEach((feature, index) => {
      const p = feature.properties || {};
      const offices = [p.cwa, p.wfo, p.office, p.issuer]
        .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[ ,/]+/))
        .map((value) => String(value).replace(/^K/i, "").toUpperCase());
      if (!offices.includes(selectedWfo)) return;
      const key = p.productId || p.id || `${p.productName || p.product || "product"}-${p.issuedAt || index}`;
      if (!localProducts.has(key)) localProducts.set(key, p);
    });
    const counts = new Map();
    localProducts.forEach((p) => {
      const code = String(p.product || "").toUpperCase();
      const name = p.productName || p.hazardName || p.event || productNames[code] || code || "Weather product";
      const current = counts.get(name) || { count: 0, color: p.color || "#1769aa" };
      current.count += 1;
      counts.set(name, current);
    });
    const total = localProducts.size;
    const productChips = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .map(([name, item]) => `<span class="product-summary-row" style="--product-color:${esc(item.color)}"><b>${esc(name)}</b><small>${item.count} active</small></span>`)
      .join("");
    summary.innerHTML = productChips || '<span class="product-summary-empty">No active products for this office</span>';
    if (localOfficeMeta) localOfficeMeta.textContent = `WFO ${selectedWfo} · ${total} active ${total === 1 ? "product" : "products"} · Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  let searchTimer = 0;
  async function runSearch() {
    const value = search?.value.trim() || "";
    if (value.length < 2) { if (searchResults) searchResults.hidden = true; return; }
    try {
      const response = await fetch(`/api/public/wfo?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await response.json();
      const matches = data.matches || [];
      if (!matches.length) { searchResults.hidden = true; return; }
      searchResults.innerHTML = matches.map((office) => `<button type="button" data-wfo-search="${esc(office.code)}">${esc([office.city, office.state].filter(Boolean).join(", ") || office.code)} · ${esc(office.code)}</button>`).join("");
      searchResults.hidden = false;
    } catch { if (searchResults) searchResults.hidden = true; }
  }
  search?.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 180); });
  searchResults?.addEventListener("click", (event) => {
    const code = event.target.closest("[data-wfo-search]")?.dataset.wfoSearch;
    if (code) location.assign(`/wfo.html?wfo=${encodeURIComponent(code)}`);
  });
  refreshButton?.addEventListener("click", () => { load(); loadSummary(); });
  fullscreenButton?.addEventListener("click", () => { if (!mapCard) return; document.fullscreenElement ? document.exitFullscreen?.() : mapCard.requestFullscreen?.(); });
  saveButton?.addEventListener("click", async () => {
    const svg = graphic?.querySelector("svg");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg).replaceAll('href="/', `href="${location.origin}/`);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Number(svg.getAttribute("width")) || 1400; canvas.height = Number(svg.getAttribute("height")) || 900;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `zasnet-${selectedWfo ? selectedWfo.toLowerCase() : "national"}-active-weather.png`;
    link.click();
  });

  let lastMapUpdatedAt = "";

  async function loadProductCatalog() {
    // The catalog contains metadata only (not the multi-MB geometry payload),
    // so it is also suitable for national legend-to-product-text lookups.
    const catalogUrl = `/api/public/alerts?format=catalog${selectedWfo ? `&wfo=${encodeURIComponent(selectedWfo)}` : ""}`;
    const alertResponse = await fetch(catalogUrl, { cache: "no-store" });
    if (!alertResponse.ok) throw new Error("Alert details unavailable");
    const data = await alertResponse.json();
    products = new Map();
    const list = Array.isArray(data.products) ? data.products : [];
    list.forEach((product) => {
      const key = product.productId || product.id;
      if (key && !products.has(key)) products.set(key, product);
    });
    // renderLocalSummary historically expected geojson features; synthesize that shape.
    renderLocalSummary(list.map((product) => ({ properties: product })));
    if (data.updatedAt) lastMapUpdatedAt = String(data.updatedAt);
  }

  async function fetchProductText(product) {
    if (!product) return "";
    if (typeof product.text === "string" && product.text.trim()) return product.text;
    const id = product.id || product.productId;
    if (!id) return "";
    try {
      const response = await fetch(`/api/public/alerts/${encodeURIComponent(id)}.txt`, { cache: "no-store" });
      if (!response.ok) return "";
      const body = await response.text();
      product.text = body;
      return body;
    } catch {
      return "";
    }
  }

  async function load() {
    try {
      // Bypass browser/proxy cache every poll (same as pre-speedup behavior with t=).
      // Server still memoizes SVG generation by store.updatedAt in memory.
      if (!selectedWfo) {
        try {
          const summaryResponse = await fetch("/api/public/summary", { cache: "no-store" });
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.updatedAt) lastMapUpdatedAt = String(summaryData.updatedAt);
          }
        } catch {
          /* map still loads */
        }
      }
      const bust = `t=${Date.now()}&u=${encodeURIComponent(lastMapUpdatedAt || "0")}`;
      const parts = [query, radarEnabled ? "radar=1" : "", satelliteEnabled ? "satellite=1" : "", bust].filter(Boolean).join("&");
      const svgUrl = `/api/public/alert-map.svg?${parts}`;
      // Start catalog in parallel with the map so local pages paint sooner.
      const catalogPromise = loadProductCatalog().catch((error) => {
        console.warn("[public-map] catalog unavailable", error);
      });
      const svgResponse = await fetch(svgUrl, { cache: "no-store" });
      if (!svgResponse.ok) throw new Error("Alert graphic unavailable");
      graphic.innerHTML = await svgResponse.text();
      // The national SVG is scaled down substantially on phones, which made
      // its fixed-width state outlines look much heavier than they do on
      // desktop. Keep local-office maps unchanged and thin only this view.
      if (!selectedWfo && window.matchMedia("(max-width: 720px)").matches) {
        graphic.querySelectorAll(".state-boundaries path").forEach((path) => {
          path.style.strokeWidth = "1.15";
        });
      }
      // The SVG is generated on the server (UTC), but the visitor should see
      // the issue/update time in the time zone configured on their own device.
      graphic.querySelectorAll("text").forEach((node) => {
        const match = node.textContent.match(/^(.*\bUpdated )(.+)$/);
        if (!match) return;
        const timestamp = new Date(match[2]);
        if (!Number.isFinite(timestamp.getTime())) return;
        node.textContent = `${match[1]}${timestamp.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;
      });
      await catalogPromise;
      graphic.querySelectorAll("[data-alert-id], [data-alert-product]").forEach((element) => {
        if (selectedWfo && element.classList.contains("alert-shape")) return;
        const activate = () => element.dataset.alertProduct
          ? showProductGroup(element.dataset.alertProduct, element.dataset.alertIds)
          : show(element.dataset.alertId);
        element.addEventListener("click", activate);
        element.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault(); activate();
        });
      });
      graphic.querySelectorAll("[data-wfo]").forEach((element) => element.addEventListener("click", (event) => {
        const code = String(element.dataset.wfo || "").replace(/^K/i, "").toUpperCase();
        if (!/^[A-Z0-9]{3}$/.test(code)) return;
        if (!selectedWfo) { location.assign(`/wfo.html?wfo=${encodeURIComponent(code)}`); return; }
      }));
      if (selectedWfo) graphic.querySelector("svg")?.addEventListener("click", (event) => {
        if (event.target.closest(".legend-row")) return;
        const point = forecastLocation(event);
        if (point) location.assign(`/forecast-beta?lat=${point.lat.toFixed(4)}&lon=${point.lon.toFixed(4)}&wfo=${encodeURIComponent(selectedWfo)}`);
      });
    } catch (error) {
      if (!graphic.querySelector("svg")) {
        graphic.innerHTML = `<div class="data-unavailable"><strong>Weather map temporarily unavailable</strong><span>${esc(error.message || "The latest map could not be loaded.")}</span><button id="retryAlertMap" type="button">Try again</button></div>`;
        graphic.querySelector("#retryAlertMap")?.addEventListener("click", load, { once: true });
      }
    }
  }

  async function show(key) {
    const p = products.get(key);
    if (!p) return;
    const formatTime = (value) => {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "Not available";
    };
    const issuer = String(p.wfo || "").replace(/^K/i, "").toUpperCase();
    const area = [p.countyName, p.countyState].filter(Boolean).join(", ") || p.locationPhrase || "Issued area";
    title.textContent = p.productName || p.product || "Active weather product";
    detail.textContent = `${area} · Issued by ${issuer || "ZASNet"} · ${formatTime(p.issuedAt)} to ${formatTime(p.expiresAt)}`;
    text.textContent = "Loading product text…";
    text.hidden = false;
    const localOffice = String(p.cwa || issuer || "").replace(/^K/i, "").toUpperCase();
    if (wfoLink && /^[A-Z0-9]{3}$/.test(localOffice) && !selectedWfo) {
      wfoLink.href = `/wfo.html?wfo=${encodeURIComponent(localOffice)}`;
      wfoLink.textContent = `Open ${localOffice} local map →`;
      wfoLink.hidden = false;
    } else if (wfoLink && selectedWfo) {
      wfoLink.href = "/";
      wfoLink.textContent = "Back to national map →";
      wfoLink.hidden = false;
    } else if (wfoLink) wfoLink.hidden = true;
    openDrawer();
    const body = await fetchProductText(p);
    // Ignore stale responses if the visitor selected another product.
    if (products.get(key) !== p) return;
    text.textContent = body || "No product text is available for this alert.";
  }

  async function showProductGroup(productName, encodedIds) {
    let visibleIds = [];
    try { visibleIds = JSON.parse(encodedIds || "[]"); } catch { /* malformed generated attribute */ }
    const allowed = new Set(visibleIds.map(String));
    const matches = [...products.entries()]
      .filter(([key, product]) => allowed.size ? allowed.has(String(key)) : product.productName === productName)
      .map(([, product]) => product);
    if (!matches.length) return;
    if (matches.length === 1) {
      const key = matches[0].productId || matches[0].id;
      show(key);
      return;
    }
    const formatTime = (value) => {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "Not available";
    };
    title.textContent = productName || "Active weather products";
    detail.textContent = `${matches.length} active products shown · Loading issued text…`;
    text.textContent = "Loading product text…";
    text.hidden = false;
    if (wfoLink) wfoLink.hidden = true;
    openDrawer();
    const bodies = await Promise.all(matches.map((product) => fetchProductText(product)));
    detail.textContent = `${matches.length} active products shown · Select text below for each issued area`;
    text.textContent = matches.map((product, index) => {
      const issuer = String(product.wfo || "").replace(/^K/i, "").toUpperCase();
      const area = [product.countyName, product.countyState].filter(Boolean).join(", ") || product.locationPhrase || "Issued area";
      const heading = `${index + 1} OF ${matches.length} — ${area} — ${issuer || "ZASNet"} — EXPIRES ${formatTime(product.expiresAt)}`;
      return `${heading}\n\n${bodies[index] || product.text || "No product text is available for this alert."}`;
    }).join("\n\n========================================\n\n");
  }

  load();
  loadSummary();
  window.setInterval(() => { load(); loadSummary(); }, 30000);
})();
