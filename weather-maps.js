(() => {
  "use strict";
  const productPicker = document.querySelector(".product-picker");
  const productRail = document.querySelector(".outlook-controls");
  const viewerControls = document.querySelector(".viewer-controls");
  const viewerSource = document.querySelector(".viewer-source");
  const footerMeta = document.querySelector(".outlook-footer-meta");
  const regionalGroup = [...document.querySelectorAll("#regionSelect optgroup")].find((group) => group.label === "Regional views");
  if (regionalGroup && !regionalGroup.querySelector('option[value="philadelphia-dma"]')) regionalGroup.prepend(new Option("Philadelphia DMA", "philadelphia-dma"));
  if (productPicker && viewerControls) viewerControls.prepend(productPicker);
  const severeGroup = [...document.querySelectorAll("#productChoices optgroup")].find(group => group.label === "HRRR analysis · Severe");
  if (severeGroup) {
    severeGroup.append(new Option("Derived supercell composite", "hrrr-scp"));
    severeGroup.append(new Option("Derived fixed-layer STP", "hrrr-stp"));
  }
  const minimumRhOption=document.querySelector('#forecastChoices option[value="ndfd-minrh"]');
  if(minimumRhOption&&!document.querySelector('#forecastChoices option[value="ndfd-maxrh"]'))minimumRhOption.after(new Option("Maximum humidity · daily","ndfd-maxrh"));
  productRail?.remove();
  if (viewerSource && footerMeta) footerMeta.append(viewerSource);
  const regionNames = { "": "National view", northeast: "Northeast", maine: "Maine", oregon: "Oregon", arizona: "Arizona", wyoming: "Wyoming", tennessee: "Tennessee", "north-dakota": "North Dakota", wisconsin: "Wisconsin", "ohio-valley": "Ohio Valley", southeast: "Southeast", "central-us": "Central US", "southern-plains": "Southern Plains", "northern-plains": "Northern Plains", "philadelphia-dma": "Philadelphia DMA", west: "West" };
  const hrrrAnalysisProducts = ["smokeobs", "smokevert", "hrrr-refc", "hrrr-cape", "hrrr-mucape", "hrrr-mlcape", "hrrr-mlcin", "hrrr-srh01", "hrrr-srh03", "hrrr-scp", "hrrr-stp", "hrrr-rh", "hrrr-gust"];
  const query = new URLSearchParams(location.search), allowedProducts = ["fronts", "surface", "forecast", "radar", "satellite", "mrms", "snow", "drought", "airquality", ...hrrrAnalysisProducts, "smoke", "stormreports", "riverflood", "sigflood", "qpf", "climate", "fireweather", "lightning", "ero"];
  const allowedSurface = ["temperature", "dewpoint", "humidity", "wind", "gust", "pressure", "visibility"], allowedForecast = ["ndfd-wx", "ndfd-t", "ndfd-apparentt", "ndfd-td", "ndfd-rh", "ndfd-pop12", "ndfd-qpf", "ndfd-windspd", "ndfd-winddir", "ndfd-windgust", "ndfd-sky", "ndfd-minrh", "ndfd-maxrh", "ndfd-snowamt", "ndfd-iceaccum", "ndfd-heatrisk", "ndfd-severe", "ndfd-hailprob", "ndfd-tornadoprob", "ndfd-windprob"], allowedSatellite = ["geocolor", "abi13", "abi10"], allowedFire = ["firedanger", "redflagconditions", "activefires", "firedetections"], allowedClimate = ["climate610temp", "climate610precip", "climate814temp", "climate814precip", "climatemonthtemp", "climatemonthprecip", "climateseasontemp", "climateseasonprecip"];
  const allowedPrecipitation = ["rate", "15m", "1h", "3h", "6h", "12h", "24h", "48h", "72h", "mesh", "mesh60", "shi", "posh"];
  const precipitationNames = { rate: "Precipitation rate", "15m": "Radar-only QPE · 15 minutes", "1h": "Radar-only QPE · 1 hour", "3h": "Radar-only QPE · 3 hours", "6h": "Radar-only QPE · 6 hours", "12h": "Radar-only QPE · 12 hours", "24h": "Radar-only QPE · 24 hours", "48h": "Radar-only QPE · 48 hours", "72h": "Radar-only QPE · 72 hours", mesh: "Maximum estimated hail size", mesh60: "Maximum hail size · previous 60 minutes", shi: "Severe Hail Index", posh: "Probability of severe hail" };
  allowedForecast.push("ndfd-maxt", "ndfd-mint");
  const forecastNames = { "ndfd-wx": "Hourly weather type", "ndfd-t": "Hourly temperature", "ndfd-apparentt": "Hourly apparent temperature", "ndfd-td": "Hourly dew point", "ndfd-rh": "Hourly relative humidity", "ndfd-maxt": "Daily high temperature", "ndfd-mint": "Overnight low temperature", "ndfd-pop12": "12-hour precipitation chance", "ndfd-qpf": "Forecast precipitation amount", "ndfd-windspd": "Hourly sustained wind", "ndfd-winddir": "Hourly wind direction", "ndfd-windgust": "Hourly forecast wind gusts", "ndfd-sky": "Hourly forecast sky cover", "ndfd-minrh": "Daily minimum humidity", "ndfd-maxrh": "Daily maximum humidity", "ndfd-snowamt": "Period snow accumulation", "ndfd-iceaccum": "Period ice accumulation", "ndfd-heatrisk": "Daily heat risk", "ndfd-severe": "Severe-weather probability", "ndfd-hailprob": "Hail probability", "ndfd-tornadoprob": "Tornado probability", "ndfd-windprob": "Damaging-wind probability" };
  let product = allowedProducts.includes(query.get("product")) ? query.get("product") : "fronts", surfaceProduct = allowedSurface.includes(query.get("surface")) ? query.get("surface") : "temperature", forecastProduct = allowedForecast.includes(query.get("forecast")) ? query.get("forecast") : "ndfd-apparentt", forecastValidTime = product === "forecast" ? query.get("valid") || "" : "", smokeValidTime = hrrrAnalysisProducts.includes(product) ? query.get("valid") || "" : "", satelliteProduct = allowedSatellite.includes(query.get("satellite")) ? query.get("satellite") : "geocolor", fireProduct = allowedFire.includes(query.get("fire")) ? query.get("fire") : "firedanger", climateProduct = allowedClimate.includes(query.get("climate")) ? query.get("climate") : "climate610temp", precipitationProduct = allowedPrecipitation.includes(query.get("mrms") || query.get("precip")) ? (query.get("mrms") || query.get("precip")) : "24h", day = Math.max(1, Math.min(8, Number(query.get("day")) || 1));
  const image = document.querySelector("#weatherMapImage"), imageFrame = image.closest(".image-frame"), mapQueryTooltip = document.querySelector("#mapQueryTooltip"), imageStatus = document.querySelector("#imageStatus"), dayControl = document.querySelector("#dayControl"), observationControl = document.querySelector("#observationControl"), forecastControl = document.querySelector("#forecastControl"), forecastTimeControl = document.querySelector("#forecastTimeControl"), forecastTimeChoices = document.querySelector("#forecastTimeChoices"), forecastTimePrevious = document.querySelector("#forecastTimePrevious"), forecastTimeNext = document.querySelector("#forecastTimeNext"), satelliteControl = document.querySelector("#satelliteControl"), fireControl = document.querySelector("#fireControl"), climateControl = document.querySelector("#climateControl"), state = document.querySelector("#mapState"), meaning = document.querySelector("#mapMeaning"), status = document.querySelector("#mapStatus"), preloadStatus = document.querySelector("#mapPreloadStatus"), caption = document.querySelector("#mapCaption"), regionSelect = document.querySelector("#regionSelect"), sourceName = document.querySelector("#sourceName"), officialLink = document.querySelector("#officialLink"), openMap = document.querySelector("#openMap");
  image.decoding = "async";
  image.fetchPriority = "high";
  const precipitationControl = document.createElement("div");
  precipitationControl.className = "control-group";
  precipitationControl.id = "precipitationControl";
  precipitationControl.hidden = true;
  precipitationControl.innerHTML = `<span>MRMS product</span><select id="precipitationChoices" aria-label="MRMS product">${allowedPrecipitation.map(value => `<option value="${value}">${precipitationNames[value]}</option>`).join("")}</select>`;
  observationControl.after(precipitationControl);
  const precipitationChoices = precipitationControl.querySelector("select");
  const smokeTimeControl = document.createElement("div");
  smokeTimeControl.className = "control-group";
  smokeTimeControl.id = "smokeTimeControl";
  smokeTimeControl.hidden = true;
  const smokeHours = Array.from({ length: 13 }, (_, offset) => {
    const time = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 - offset * 3_600_000);
    return { value: time.toISOString(), label: offset === 0 ? "Latest analysis" : `${offset} hour${offset === 1 ? "" : "s"} ago · ${time.toLocaleString([], { weekday: "short", hour: "numeric", timeZoneName: "short" })}` };
  });
  smokeTimeControl.innerHTML = `<span>Analysis hour</span><div class="forecast-time-stepper"><button id="smokeTimePrevious" type="button" aria-label="Previous smoke analysis hour" title="Previous analysis hour">←</button><select id="smokeTimeChoices" aria-label="HRRR smoke analysis hour">${smokeHours.map(item => `<option value="${item.value}">${item.label}</option>`).join("")}</select><button id="smokeTimeNext" type="button" aria-label="Next smoke analysis hour" title="Next analysis hour">→</button></div>`;
  precipitationControl.after(smokeTimeControl);
  const smokeTimeChoices = smokeTimeControl.querySelector("select");
  const smokeTimePrevious = smokeTimeControl.querySelector("#smokeTimePrevious");
  const smokeTimeNext = smokeTimeControl.querySelector("#smokeTimeNext");
  if (smokeValidTime) smokeTimeChoices.value = smokeValidTime;
  if (smokeTimeChoices.selectedIndex < 0) {
    smokeTimeChoices.selectedIndex = 0;
    smokeValidTime = "";
  }
  function syncSmokeTimeArrows() {
    smokeTimePrevious.disabled = smokeTimeChoices.selectedIndex >= smokeTimeChoices.options.length - 1;
    smokeTimeNext.disabled = smokeTimeChoices.selectedIndex <= 0;
  }
  function stepSmokeTime(direction) {
    const next = Math.max(0, Math.min(smokeTimeChoices.options.length - 1, smokeTimeChoices.selectedIndex + direction));
    if (next === smokeTimeChoices.selectedIndex) return;
    smokeTimeChoices.selectedIndex = next;
    smokeValidTime = smokeTimeChoices.value;
    syncSmokeTimeArrows();
    update();
  }
  syncSmokeTimeArrows();
  const satelliteLoopControl = document.createElement("div");
  satelliteLoopControl.className = "control-group satellite-loop-control";
  satelliteLoopControl.hidden = true;
  satelliteLoopControl.innerHTML = `<div class="satellite-loop-heading"><span>GeoColor animation</span><small id="satelliteLoopTime" aria-live="polite"></small></div><div class="satellite-loop-toolbar"><button id="satelliteLoopPrevious" class="satellite-loop-step" type="button" aria-label="Previous GeoColor frame" title="Previous frame"><span aria-hidden="true">‹</span></button><button id="satelliteLoopPlay" class="satellite-loop-play" type="button" aria-label="Play GeoColor loop" aria-pressed="false"><span aria-hidden="true">▶</span> Play</button><button id="satelliteLoopNext" class="satellite-loop-step" type="button" aria-label="Next GeoColor frame" title="Next frame"><span aria-hidden="true">›</span></button><label class="satellite-loop-speed"><span>Speed</span><select id="satelliteLoopSpeed" aria-label="GeoColor animation speed"><option value="1400">Slow</option><option value="900" selected>Normal</option><option value="500">Fast</option></select></label></div><div class="satellite-loop-track"><input id="satelliteLoopTimeline" type="range" min="0" max="11" value="11" step="1" aria-label="GeoColor loop timeline"><div><span>Older</span><span>Latest</span></div></div>`;
  satelliteControl.after(satelliteLoopControl);
  const satelliteLoopPrevious = satelliteLoopControl.querySelector("#satelliteLoopPrevious"), satelliteLoopPlay = satelliteLoopControl.querySelector("#satelliteLoopPlay"), satelliteLoopNext = satelliteLoopControl.querySelector("#satelliteLoopNext"), satelliteLoopSpeed = satelliteLoopControl.querySelector("#satelliteLoopSpeed"), satelliteLoopTimeline = satelliteLoopControl.querySelector("#satelliteLoopTimeline"), satelliteLoopTime = satelliteLoopControl.querySelector("#satelliteLoopTime");
  const satelliteFrameCount = matchMedia("(max-width: 700px)").matches ? 8 : 12;
  const latestSatelliteFrame = Math.floor((Date.now() - 10 * 60_000) / (10 * 60_000)) * 10 * 60_000;
  const satelliteFrames = Array.from({ length: satelliteFrameCount }, (_, index) => new Date(latestSatelliteFrame - (satelliteFrameCount - 1 - index) * 10 * 60_000).toISOString());
  let satelliteFrameIndex = satelliteFrames.length - 1, satelliteLoopTimer = 0, satelliteAutoplayStarted = false;
  satelliteLoopSpeed.value = localStorage.getItem("zasnet-satellite-animation-speed") || "900";
  if (satelliteLoopSpeed.selectedIndex < 0) satelliteLoopSpeed.value = "900";
  const satellitePreloads = new Map(), satellitePreloadQueue = [];
  let activeSatellitePreloads = 0;
  satelliteLoopTimeline.max = String(satelliteFrames.length - 1);
  satelliteLoopTimeline.value = String(satelliteFrameIndex);
  function satelliteFrameLabel(value) {
    return new Date(value).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }
  function satelliteFrameUrl(index) {
    const region = regionSelect.value, suffix = region ? `-${region}` : "";
    return `/api/public/maps/static/satellite-geocolor${suffix}.svg?valid=${encodeURIComponent(satelliteFrames[index])}&tz=${encodeURIComponent(browserTimeZone)}`;
  }
  function syncSatelliteLoopUi() {
    satelliteLoopTimeline.value = String(satelliteFrameIndex);
    satelliteLoopTime.textContent = `${satelliteFrameIndex + 1} of ${satelliteFrames.length} · ${satelliteFrameLabel(satelliteFrames[satelliteFrameIndex])}`;
  }
  function stopSatelliteLoop() {
    window.clearInterval(satelliteLoopTimer);
    satelliteLoopTimer = 0;
    satelliteLoopPlay.innerHTML = '<span aria-hidden="true">▶</span> Play';
    satelliteLoopPlay.setAttribute("aria-label", "Play GeoColor loop");
    satelliteLoopPlay.setAttribute("aria-pressed", "false");
  }
  function showSatelliteFrame(index) {
    satelliteFrameIndex = (index + satelliteFrames.length) % satelliteFrames.length;
    syncSatelliteLoopUi();
    update();
  }
  function startSatelliteLoop() {
    stopSatelliteLoop();
    satelliteLoopPlay.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    satelliteLoopPlay.setAttribute("aria-label", "Pause GeoColor loop");
    satelliteLoopPlay.setAttribute("aria-pressed", "true");
    satelliteLoopTimer = window.setInterval(() => showSatelliteFrame(satelliteFrameIndex + 1), Number(satelliteLoopSpeed.value));
  }
  function runSatellitePreloadQueue() {
    while (activeSatellitePreloads < 2 && satellitePreloadQueue.length) {
      const url = satellitePreloadQueue.shift(), entry = satellitePreloads.get(url);
      if (!entry || entry.state !== "queued") continue;
      entry.state = "loading";
      activeSatellitePreloads += 1;
      entry.image.onload = () => { entry.state = "ready"; activeSatellitePreloads -= 1; syncPreloadStatus(); runSatellitePreloadQueue(); };
      entry.image.onerror = () => { satellitePreloads.delete(url); activeSatellitePreloads -= 1; syncPreloadStatus(); runSatellitePreloadQueue(); };
      entry.image.src = url;
    }
  }
  function preloadSatelliteFrames() {
    if (product !== "satellite" || satelliteProduct !== "geocolor") return;
    const indexes = Array.from({ length: satelliteFrames.length }, (_, index) => index).sort((a, b) => Math.abs(a - satelliteFrameIndex) - Math.abs(b - satelliteFrameIndex));
    indexes.forEach(index => {
      const url = satelliteFrameUrl(index);
      if (satellitePreloads.has(url)) return;
      const preloadImage = new Image();
      preloadImage.decoding = "async";
      preloadImage.fetchPriority = "low";
      satellitePreloads.set(url, { image: preloadImage, state: "queued" });
      satellitePreloadQueue.push(url);
    });
    syncPreloadStatus();
    runSatellitePreloadQueue();
    if (satellitePreloads.size > 72) {
      for (const [url, entry] of satellitePreloads) {
        if (satellitePreloads.size <= 48) break;
        if (entry.state === "ready") satellitePreloads.delete(url);
      }
    }
  }
  syncSatelliteLoopUi();
  let forecastTimeRequest = 0;
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const forecastPreloads = new Map();
  const forecastPreloadQueue = [];
  let activeForecastPreloads = 0;
  const smokePreloads = new Map();
  const smokePreloadQueue = [];
  let activeSmokePreloads = 0;
  function absoluteMapUrl(url) { return new URL(url, location.href).href; }
  function syncPreloadStatus() {
    let urls = [], cache = null;
    if (product === "forecast" && forecastTimeChoices.options.length && forecastValidTime) {
      urls = [...forecastTimeChoices.options].map(option => option.value && forecastMapUrl(option.value)).filter(Boolean); cache = forecastPreloads;
    } else if (hrrrAnalysisProducts.includes(product)) {
      urls = [...smokeTimeChoices.options].map(option => option.value && smokeMapUrl(option.value)).filter(Boolean); cache = smokePreloads;
    } else if (product === "satellite" && satelliteProduct === "geocolor") {
      urls = satelliteFrames.map((_, index) => satelliteFrameUrl(index)); cache = satellitePreloads;
    }
    preloadStatus.hidden = !urls.length;
    if (!urls.length) return;
    const displayed = image.classList.contains("is-loaded") ? absoluteMapUrl(image.currentSrc || image.src) : "";
    const ready = urls.filter(url => displayed === absoluteMapUrl(url) || cache.get(url)?.state === "ready").length;
    preloadStatus.textContent = ready >= urls.length ? `Preloaded ${urls.length}/${urls.length}` : `Preloading ${ready}/${urls.length}`;
    preloadStatus.classList.toggle("is-ready", ready >= urls.length);
  }
  let mapQueryTimer = 0, mapQueryRequest = 0, mapQueryController = null;
  function hideMapQuery() {
    window.clearTimeout(mapQueryTimer);
    mapQueryController?.abort();
    mapQueryTooltip.hidden = true;
  }
  function positionMapQuery(clientX, clientY) {
    const frameRect = imageFrame.getBoundingClientRect(), width = mapQueryTooltip.offsetWidth || 240, height = mapQueryTooltip.offsetHeight || 70;
    mapQueryTooltip.style.left = `${Math.max(8, Math.min(frameRect.width - width - 8, clientX - frameRect.left + 14))}px`;
    mapQueryTooltip.style.top = `${Math.max(8, Math.min(frameRect.height - height - 8, clientY - frameRect.top + 14))}px`;
  }
  async function queryForecastMap(event) {
    const queryProduct = product === "forecast" ? forecastProduct : product === "surface" ? surfaceProduct : "";
    if (!queryProduct || (product === "forecast" && !forecastValidTime) || !image.classList.contains("is-loaded")) { hideMapQuery(); return; }
    const rect = image.getBoundingClientRect(), x = (event.clientX - rect.left) * 1400 / rect.width, y = (event.clientY - rect.top) * 900 / rect.height;
    if (x < 0 || x > 1400 || y < 122 || y > 776) { hideMapQuery(); return; }
    const request = ++mapQueryRequest;
    mapQueryController?.abort();
    mapQueryController = new AbortController();
    mapQueryTooltip.hidden = false;
    mapQueryTooltip.textContent = "Loading forecast value…";
    positionMapQuery(event.clientX, event.clientY);
    const params = new URLSearchParams({ product: queryProduct, region: regionSelect.value, x: x.toFixed(1), y: y.toFixed(1) });
    if (product === "forecast") params.set("valid", forecastValidTime);
    try {
      const response = await fetch(`/api/public/maps/value.json?${params}`, { cache: "no-store", signal: mapQueryController.signal });
      const payload = await response.json();
      if (request !== mapQueryRequest) return;
      if (!response.ok) throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
      const title = document.createElement("strong"), value = document.createElement("span"), detail = document.createElement("small");
      title.textContent = payload.available ? `${payload.label}: ${payload.value}` : "Point data unavailable";
      value.textContent = payload.available ? (payload.location || `${payload.lat.toFixed(2)}, ${payload.lon.toFixed(2)}`) : payload.reason;
      detail.textContent = `${Number(payload.lat).toFixed(2)}°, ${Number(payload.lon).toFixed(2)}° · ${product === "forecast" ? "Valid" : "Analyzed"} ${forecastTimeLabel(payload.validTime)}`;
      mapQueryTooltip.replaceChildren(title, value, detail);
      positionMapQuery(event.clientX, event.clientY);
    } catch (error) {
      if (error.name === "AbortError" || request !== mapQueryRequest) return;
      mapQueryTooltip.textContent = "Forecast value temporarily unavailable";
      positionMapQuery(event.clientX, event.clientY);
    }
  }
  function forecastMapUrl(validTime) {
    const region = regionSelect.value, suffix = region ? `-${region}` : "";
    return `/api/public/maps/static/${forecastProduct}${suffix}.svg?valid=${encodeURIComponent(validTime)}&tz=${encodeURIComponent(browserTimeZone)}`;
  }
  function runForecastPreloadQueue() {
    while (activeForecastPreloads < 2 && forecastPreloadQueue.length) {
      const url = forecastPreloadQueue.shift();
      const entry = forecastPreloads.get(url);
      if (!entry || entry.state !== "queued") continue;
      entry.state = "loading";
      activeForecastPreloads += 1;
      entry.image.onload = () => { entry.state = "ready"; activeForecastPreloads -= 1; syncPreloadStatus(); runForecastPreloadQueue(); };
      entry.image.onerror = () => { forecastPreloads.delete(url); activeForecastPreloads -= 1; syncPreloadStatus(); runForecastPreloadQueue(); };
      entry.image.src = url;
    }
  }
  function preloadNearbyForecastTimes() {
    if (product !== "forecast" || !forecastValidTime) return;
    const index = forecastTimeChoices.selectedIndex, count = forecastTimeChoices.options.length;
    if (count < 2) return;
    const indexes = Array.from({ length: count }, (_, optionIndex) => optionIndex).sort((a, b) => Math.abs(a - index) - Math.abs(b - index));
    indexes.forEach((optionIndex) => {
      const validTime = forecastTimeChoices.options[optionIndex]?.value;
      if (!validTime) return;
      const url = forecastMapUrl(validTime);
      if (forecastPreloads.has(url)) return;
      const preloadImage = new Image();
      preloadImage.decoding = "async";
      preloadImage.fetchPriority = "low";
      forecastPreloads.set(url, { image: preloadImage, state: "queued" });
      forecastPreloadQueue.push(url);
    });
    syncPreloadStatus();
    runForecastPreloadQueue();
    if (forecastPreloads.size > 96) {
      for (const [url, entry] of forecastPreloads) {
        if (forecastPreloads.size <= 72) break;
        if (entry.state === "ready") forecastPreloads.delete(url);
      }
    }
  }
  function smokeMapUrl(validTime, selectedProduct = product) {
    const region = regionSelect.value, suffix = region ? `-${region}` : "";
    return `/api/public/maps/static/${selectedProduct}${suffix}.svg?valid=${encodeURIComponent(validTime)}&tz=${encodeURIComponent(browserTimeZone)}`;
  }
  function runSmokePreloadQueue() {
    while (activeSmokePreloads < 2 && smokePreloadQueue.length) {
      const url = smokePreloadQueue.shift(), entry = smokePreloads.get(url);
      if (!entry || entry.state !== "queued") continue;
      entry.state = "loading";
      activeSmokePreloads += 1;
      entry.image.onload = () => { entry.state = "ready"; activeSmokePreloads -= 1; syncPreloadStatus(); runSmokePreloadQueue(); };
      entry.image.onerror = () => { smokePreloads.delete(url); activeSmokePreloads -= 1; syncPreloadStatus(); runSmokePreloadQueue(); };
      entry.image.src = url;
    }
  }
  function preloadNearbySmokeTimes() {
    if (!hrrrAnalysisProducts.includes(product)) return;
    const index = smokeTimeChoices.selectedIndex;
    const indexes = Array.from({ length: smokeTimeChoices.options.length }, (_, optionIndex) => optionIndex).sort((a, b) => Math.abs(a - index) - Math.abs(b - index));
    indexes.forEach((optionIndex) => {
      const option = smokeTimeChoices.options[optionIndex];
      if (!option?.value) return;
      const url = smokeMapUrl(option.value);
      if (smokePreloads.has(url)) return;
      const preloadImage = new Image();
      preloadImage.decoding = "async";
      preloadImage.fetchPriority = "low";
      smokePreloads.set(url, { image: preloadImage, state: "queued" });
      smokePreloadQueue.push(url);
    });
    syncPreloadStatus();
    runSmokePreloadQueue();
    if (smokePreloads.size > 72) {
      for (const [url, entry] of smokePreloads) {
        if (smokePreloads.size <= 48) break;
        if (entry.state === "ready") smokePreloads.delete(url);
      }
    }
  }
  function syncForecastTimeArrows() {
    forecastTimePrevious.disabled = false;
    forecastTimeNext.disabled = false;
  }
  function stepForecastTime(direction) {
    const count = forecastTimeChoices.options.length;
    if (!count || !forecastTimeChoices.value) return;
    const nextIndex = forecastTimeChoices.selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= count) return;
    forecastTimeChoices.selectedIndex = nextIndex;
    forecastValidTime = forecastTimeChoices.value;
    syncForecastTimeArrows();
    update();
    preloadNearbyForecastTimes();
  }
  async function refreshForecastTimes() {
    const request = ++forecastTimeRequest, selectedProduct = forecastProduct;
    forecastTimeChoices.disabled = true;
    try {
      const response = await fetch(`/api/public/maps/ndfd-times.json?product=${encodeURIComponent(selectedProduct)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (request !== forecastTimeRequest || selectedProduct !== forecastProduct) return;
      const times = Array.isArray(payload.times) ? payload.times : [];
      if (!times.includes(forecastValidTime)) forecastValidTime = payload.default || times[0] || "";
      forecastTimeChoices.innerHTML = times.map(value => `<option value="${value}">${forecastTimeLabel(`${value}Z`)}</option>`).join("") || '<option value="">Latest available</option>';
      forecastTimeChoices.value = forecastValidTime;
      syncForecastTimeArrows();
      update();
      preloadNearbyForecastTimes();
    } catch {
      forecastTimeChoices.innerHTML = '<option value="">Latest available</option>';
      forecastValidTime = "";
    } finally { if (request === forecastTimeRequest) { forecastTimeChoices.disabled = false; syncForecastTimeArrows(); } }
  }
  function forecastTimeLabel(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Unknown time";
    return date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }
  function validTimeLabel(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "unknown time";
    const local = date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const utc = date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
    return `${local} (${utc} UTC)`;
  }
  async function updateFreshnessStatus(mapUrl) {
    const url = new URL(mapUrl, location.href);
    url.pathname = url.pathname.replace(/\.svg$/, ".status.json");
    url.search = "";
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metadata = await response.json();
    const validMs = Date.parse(metadata.validAt || "");
    const staleMs = Number(metadata.staleAfterMinutes) * 60_000;
    if (!Number.isFinite(validMs) || !Number.isFinite(staleMs) || staleMs <= 0) {
      status.dataset.freshness = "unknown";
      status.textContent = "Freshness unavailable";
      status.title = metadata.generatedAt ? `Map generated ${validTimeLabel(metadata.generatedAt)}` : "The source does not publish a usable valid time.";
      return;
    }
    const ageMs = Math.max(0, Date.now() - validMs);
    const level = ageMs >= staleMs ? "stale" : ageMs >= staleMs * 0.75 ? "delayed" : "fresh";
    status.dataset.freshness = level;
    const timePrefix = metadata.timeBasis === "retrieved" ? "retrieved" : "valid";
    status.textContent = `${level === "fresh" ? "Fresh" : level === "delayed" ? "Delayed" : "Stale"} · ${validTimeLabel(metadata.validAt)}`;
    status.title = `${timePrefix === "retrieved" ? "Latest data retrieved" : "Source valid"} ${validTimeLabel(metadata.validAt)}. Expected to update within ${metadata.staleAfterMinutes} minutes.`;
  }
  function syncStateUrl(region) {
    const url = new URL(location.href);
    url.searchParams.set("product", product);
    [["surface", surfaceProduct, product === "surface"], ["forecast", forecastProduct, product === "forecast"], ["satellite", satelliteProduct, product === "satellite"], ["fire", fireProduct, product === "fireweather"], ["climate", climateProduct, product === "climate"], ["mrms", precipitationProduct, product === "mrms"]].forEach(([key, value, active]) => active ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    if (product === "forecast" && forecastValidTime) url.searchParams.set("valid", forecastValidTime); else if (hrrrAnalysisProducts.includes(product) && smokeValidTime) url.searchParams.set("valid", smokeValidTime); else if (product === "satellite" && satelliteProduct === "geocolor") url.searchParams.set("valid", satelliteFrames[satelliteFrameIndex]); else url.searchParams.delete("valid");
    if (["ero", "qpf"].includes(product) || (product === "fireweather" && fireProduct === "firedanger")) url.searchParams.set("day", String(day)); else url.searchParams.delete("day");
    if (region) url.searchParams.set("region", region); else url.searchParams.delete("region");
    history.replaceState({}, "", url);
  }
  function update() {
    hideMapQuery();
    const activeProduct = product === "surface" ? surfaceProduct : product === "forecast" ? forecastProduct : product === "fireweather" ? fireProduct : product === "climate" ? climateProduct : product === "mrms" ? (["rate", "15m", "1h", "3h", "6h", "12h", "24h", "48h", "72h"].includes(precipitationProduct) ? `precipitation-${precipitationProduct}` : `mrms-${precipitationProduct}`) : product, fireProducts = ["firedanger", "redflagconditions", "activefires", "firedetections"], climateProducts = ["climate610temp", "climate610precip", "climate814temp", "climate814precip", "climatemonthtemp", "climatemonthprecip", "climateseasontemp", "climateseasonprecip"], fronts = activeProduct === "fronts", analyzed = ["temperature", "dewpoint", "humidity", "wind", "gust", "pressure", "visibility"].includes(activeProduct), mapped = analyzed || activeProduct.startsWith("ndfd-") || activeProduct.startsWith("hrrr-") || activeProduct.startsWith("precipitation-") || activeProduct.startsWith("mrms-") || ["radar", "mrms", "snow", "drought", "airquality", "smokeobs", "smokevert", "smoke", "stormreports", "riverflood", "sigflood", "lightning", ...fireProducts, ...climateProducts].includes(activeProduct), region = regionSelect.value, suffix = region ? `-${region}` : "";
    const satelliteNames = { geocolor: "GeoColor satellite", abi13: "Clean infrared satellite", abi10: "Water-vapor satellite" }, productNames = { radar: "Radar", temperature: "Current temperatures", dewpoint: "Current dew point", humidity: "Current relative humidity", wind: "Current wind speed", gust: "Current wind gusts", pressure: "Surface pressure", visibility: "Current visibility", precipitation: "24-hour precipitation", snow: "Current snow depth", drought: "U.S. Drought Monitor", airquality: "PM2.5 air quality", smokeobs: "HRRR near-surface smoke analysis", smokevert: "HRRR vertically integrated smoke analysis", "hrrr-refc":"HRRR composite reflectivity analysis","hrrr-cape":"HRRR surface CAPE analysis","hrrr-mucape":"HRRR most-unstable CAPE analysis","hrrr-mlcape":"HRRR mixed-layer CAPE analysis","hrrr-mlcin":"HRRR mixed-layer CIN analysis","hrrr-srh01":"HRRR 0–1 km helicity analysis","hrrr-srh03":"HRRR 0–3 km helicity analysis","hrrr-rh":"HRRR relative humidity analysis","hrrr-gust":"HRRR wind gust analysis", smoke: "Surface smoke forecast", stormreports: "Recent storm reports", riverflood: "Observed river flooding", sigflood: "Significant river flood outlook", firedanger: "SPC fire-weather outlook", redflagconditions: "Observed red flag conditions", activefires: "Active wildfires", firedetections: "Satellite fire detections", climate610temp: "6–10 day temperature outlook", climate610precip: "6–10 day precipitation outlook", climate814temp: "8–14 day temperature outlook", climate814precip: "8–14 day precipitation outlook", climatemonthtemp: "Monthly temperature outlook", climatemonthprecip: "Monthly precipitation outlook", climateseasontemp: "Seasonal temperature outlook", climateseasonprecip: "Seasonal precipitation outlook", lightning: "Lightning density" };
    productNames["hrrr-scp"] = "Derived HRRR supercell composite analysis";
    productNames["hrrr-stp"] = "Derived HRRR fixed-layer STP analysis";
    const file = fronts ? `fronts${suffix}.svg` : product === "satellite" ? `satellite-${satelliteProduct}${suffix}.svg` : product === "qpf" ? `qpf-day${Math.min(day, 3)}${suffix}.svg` : activeProduct === "firedanger" ? `firedanger-day${day}${suffix}.svg` : mapped ? `${activeProduct}${suffix}.svg` : `ero-day${day}${suffix}.svg`;
    const url = activeProduct.startsWith("ndfd-") && forecastValidTime ? forecastMapUrl(forecastValidTime) : hrrrAnalysisProducts.includes(product) && smokeValidTime ? smokeMapUrl(smokeValidTime) : product === "satellite" && satelliteProduct === "geocolor" ? satelliteFrameUrl(satelliteFrameIndex) : `/api/public/maps/static/${file}?refresh=${Date.now()}&tz=${encodeURIComponent(browserTimeZone)}`;
    syncStateUrl(region);
    dayControl.hidden = !(["ero", "qpf"].includes(product) || (product === "fireweather" && fireProduct === "firedanger"));
    document.querySelectorAll("#dayChoices option").forEach(option => { const value = Number(option.value); option.hidden = (product === "qpf" && value > 3) || (product === "ero" && value > 5); });
    observationControl.hidden = product !== "surface";
    precipitationControl.hidden = product !== "mrms";
    smokeTimeControl.hidden = !hrrrAnalysisProducts.includes(product);
    forecastControl.hidden = product !== "forecast";
    forecastTimeControl.hidden = product !== "forecast";
    satelliteControl.hidden = product !== "satellite";
    satelliteLoopControl.hidden = product !== "satellite" || satelliteProduct !== "geocolor";
    fireControl.hidden = product !== "fireweather";
    climateControl.hidden = product !== "climate";
    syncPreloadStatus();
    state.textContent = fronts ? `Latest surface fronts · ${regionNames[region]}` : product === "satellite" ? `${satelliteNames[satelliteProduct]} · ${regionNames[region]}` : product === "qpf" ? `Day ${Math.min(day, 3)} forecast precipitation · ${regionNames[region]}` : activeProduct === "firedanger" ? `SPC Day ${day} fire-weather outlook · ${regionNames[region]}` : mapped ? `${productNames[activeProduct] || forecastNames[activeProduct]} · ${regionNames[region]}` : `Day ${day} excessive rainfall outlook · ${regionNames[region]}`;
    meaning.textContent = climateProducts.includes(activeProduct) ? "Climate Prediction Center probabilities for temperatures or precipitation leaning above, near, or below normal during the selected period." : activeProduct === "sigflood" ? "Areas where significant river flooding is possible, likely, or already occurring or imminent. This does not depict every minor or flash flood." : activeProduct === "redflagconditions" ? "Observed NOAA analysis highlighting where low relative humidity and strong surface wind overlap. This is conditions guidance, not a Red Flag Warning." : activeProduct === "activefires" ? "Current NIFC wildfire incidents with the latest available mapped fire perimeters." : activeProduct === "firedetections" ? "Satellite heat detections analyzed by NOAA HMS; these may include wildfires, prescribed burns, and agricultural fires." : activeProduct === "smokevert" ? "Latest hourly HRRR-Smoke analysis of total smoke mass through the full atmospheric column." : activeProduct === "smokeobs" ? "Latest hourly HRRR-Smoke analysis of fire-emitted fine particulate matter at approximately 8 meters above ground." : product === "satellite" ? "Latest NOAA/NESDIS satellite imagery beneath county, state, and city overlays." : activeProduct === "radar" ? "Latest IEM national NEXRAD radar mosaic beneath county, state, and city overlays." : product === "qpf" ? "WPC liquid-equivalent precipitation forecast for the selected 24-hour period." : activeProduct === "firedanger" ? `SPC Day ${day} areas where dry fuels and forecast weather support wildfire ignition or spread.` : activeProduct === "lightning" ? "NOAA derived lightning-strike density during the latest 15-minute period." : fronts ? "A fixed WPC surface map with fronts and pressure systems, state borders, and city labels." : analyzed ? `The actual NOAA RTMA 2.5-km ${activeProduct} analysis, colorized beneath borders and labels.` : activeProduct.startsWith("precipitation-") ? "NOAA MRMS multi-sensor precipitation accumulated over the previous 24 hours." : activeProduct === "snow" ? "The latest NOAA NOHRSC national snow-depth analysis." : activeProduct === "drought" ? "The latest weekly U.S. Drought Monitor classification, from abnormally dry through exceptional drought." : activeProduct === "airquality" ? "NOAA forecast guidance for near-surface fine particulate matter (PM2.5)." : activeProduct === "smoke" ? "NOAA forecast guidance showing hourly average smoke near the surface." : activeProduct === "stormreports" ? "Official NWS local storm reports received during the previous 24 hours." : activeProduct === "riverflood" ? "Observed river gauges colored by current flood category." : "Solid WPC risk areas are layered beneath state borders and city labels.";
    caption.textContent = climateProducts.includes(activeProduct) ? "NOAA Climate Prediction Center · Updated automatically" : activeProduct === "sigflood" ? "NOAA significant river flood outlook · Updated daily" : activeProduct === "redflagconditions" ? "NOAA RTMA observed humidity + wind · Updated hourly" : activeProduct === "activefires" ? "NIFC WFIGS · Automatically refreshed" : ["smokeobs", "smokevert"].includes(activeProduct) ? "NOAA HRRR-Smoke analysis · 12-hour history available" : activeProduct === "firedetections" ? "NOAA HMS · Updated throughout daylight hours" : product === "satellite" && satelliteProduct === "geocolor" ? `NOAA/NESDIS GeoColor loop · ${satelliteFrameLabel(satelliteFrames[satelliteFrameIndex])}` : product === "satellite" ? `NOAA/NESDIS ${satelliteNames[satelliteProduct]} · Latest imagery` : activeProduct === "radar" ? "IEM NEXRAD composite · Latest available" : product === "qpf" ? `WPC Day ${Math.min(day, 3)} QPF · Updated twice daily` : activeProduct === "lightning" ? "NOAA nowCOAST · Updated about every 15 minutes" : activeProduct === "firedanger" ? `SPC Day ${day} fire-weather outlook` : fronts ? "WPC national forecast chart · Latest available" : analyzed ? `The actual NOAA RTMA analyzed ${activeProduct} · Updated hourly` : ["stormreports", "riverflood"].includes(activeProduct) ? "NOAA / NWS · Updated every 15 minutes" : activeProduct.startsWith("precipitation-") ? "NOAA MRMS 24-hour precipitation" : activeProduct === "snow" ? "NOAA NOHRSC snow depth · Updated daily" : activeProduct === "drought" ? "U.S. Drought Monitor · Updated weekly Thursday" : ["airquality", "smoke"].includes(activeProduct) ? "NOAA forecast guidance · Updated automatically" : `WPC Day ${day} excessive rainfall outlook · Latest issuance`;
    officialLink.href = climateProducts.includes(activeProduct) ? "https://www.cpc.ncep.noaa.gov/" : activeProduct === "sigflood" ? "https://water.noaa.gov/about/significant-river-flood-outlook" : activeProduct === "redflagconditions" ? "https://nomads.ncep.noaa.gov/" : activeProduct === "activefires" ? "https://data-nifc.opendata.arcgis.com/" : ["smokeobs", "smokevert"].includes(activeProduct) ? "https://rapidrefresh.noaa.gov/hrrr/HRRRsmoke/" : activeProduct === "firedetections" ? "https://www.ospo.noaa.gov/products/land/hms.html" : activeProduct === "radar" ? "https://mesonet.agron.iastate.edu/" : product === "satellite" ? "https://www.star.nesdis.noaa.gov/GOES/" : product === "qpf" ? "https://www.wpc.ncep.noaa.gov/#page=qpf" : activeProduct === "firedanger" ? "https://www.spc.noaa.gov/products/fire_wx/" : activeProduct === "lightning" ? "https://nowcoast.noaa.gov/" : fronts ? "https://www.wpc.ncep.noaa.gov/html/sfc2.shtml" : analyzed ? "https://nomads.ncep.noaa.gov/" : activeProduct === "stormreports" ? "https://www.weather.gov/source/crh/lsrmap.html" : activeProduct === "riverflood" ? "https://water.noaa.gov/" : activeProduct === "snow" ? "https://www.nohrsc.noaa.gov/nsa/" : activeProduct.startsWith("precipitation-") ? "https://mrms.nssl.noaa.gov/qvs/product_viewer/" : activeProduct === "drought" ? "https://www.drought.gov/data-maps-tools/us-drought-monitor" : ["airquality", "smoke"].includes(activeProduct) ? "https://airquality.weather.gov/" : "https://www.wpc.ncep.noaa.gov/qpf/excessive_rainfall_outlook_ero.php";
    if (activeProduct.startsWith("ndfd-")) {
      meaning.textContent = "National Digital Forecast Database guidance for the nearest available valid forecast time.";
      caption.textContent = "NOAA / NWS Digital Forecast Database · Automatically refreshed";
      officialLink.href = "https://digital.weather.gov/";
    }
    if (activeProduct === "hrrr-scp") {
      meaning.textContent = "Derived from same-hour HRRR most-unstable CAPE, 0–3 km storm-relative helicity, and 0–6 km bulk wind difference. Higher values indicate increasingly favorable supercell environments.";
    } else if (activeProduct === "hrrr-stp") {
      meaning.textContent = "Fixed-layer Significant Tornado Parameter derived from same-hour HRRR surface CAPE, 0–1 km storm-relative helicity, 0–6 km bulk wind difference, surface LCL height, and surface CIN.";
    }
    if (activeProduct.startsWith("hrrr-")) {
      caption.textContent = "NOAA HRRR analysis · 12-hour history available";
      officialLink.href = "https://rapidrefresh.noaa.gov/hrrr/";
    }
    if (product === "mrms") {
      state.textContent = `${precipitationNames[precipitationProduct]} · ${regionNames[region]}`;
      const descriptions = { rate: "Instantaneous surface precipitation rate.", mesh: "Current maximum estimated hail size.", mesh60: "Maximum estimated hail size during the previous 60 minutes.", shi: "Severe Hail Index indicating hail-growth potential.", posh: "Probability that hail reaches severe size." };
      meaning.textContent = descriptions[precipitationProduct] || "Radar-only precipitation accumulated during the selected period.";
      caption.textContent = "NOAA / NWS MRMS · Updated automatically";
      officialLink.href = "https://mrms.nssl.noaa.gov/qvs/product_viewer/";
    }
    const source = activeProduct.startsWith("ndfd-") ? ["NOAA / NWS NDFD", "Official NDFD"] : climateProducts.includes(activeProduct) ? ["NOAA / CPC", "Official CPC"] : activeProduct === "radar" ? ["IEM / NEXRAD", "Official IEM"] : product === "satellite" ? ["NOAA / NESDIS", "Official NOAA"] : activeProduct === "firedanger" ? ["NOAA / SPC", "Official SPC"] : activeProduct === "activefires" ? ["NIFC / WFIGS", "Official NIFC"] : ["smokeobs", "smokevert"].includes(activeProduct) ? ["NOAA / HRRR", "Official NOAA"] : activeProduct === "firedetections" ? ["NOAA / HMS", "Official NOAA"] : activeProduct.startsWith("precipitation-") || activeProduct.startsWith("mrms-") ? ["NOAA / MRMS", "Official NOAA"] : activeProduct === "snow" ? ["NOAA / NOHRSC", "Official NOAA"] : activeProduct === "drought" ? ["U.S. Drought Monitor", "Official USDM"] : ["riverflood", "sigflood"].includes(activeProduct) ? ["NOAA / NWPS", "Official NWPS"] : ["stormreports", "airquality", "smoke", "lightning", "redflagconditions"].includes(activeProduct) || analyzed ? ["NOAA / NWS", "Official NOAA"] : ["NOAA / WPC", "Official WPC"];
    sourceName.textContent = activeProduct.startsWith("hrrr-") ? "NOAA / HRRR" : source[0];
    officialLink.textContent = activeProduct.startsWith("hrrr-") ? "Official NOAA" : source[1];
    if (!satelliteLoopTimer || !image.classList.contains("is-loaded")) { imageStatus.hidden = false; imageStatus.textContent = "Building weather map…"; image.classList.remove("is-loaded"); status.textContent = "Loading"; }
    image.alt = product === "satellite" ? `${satelliteNames[satelliteProduct]} map · ${regionNames[region]}` : fronts ? `WPC surface fronts map · ${regionNames[region]}` : product === "qpf" ? `WPC Day ${Math.min(day, 3)} forecast precipitation map · ${regionNames[region]}` : mapped ? `${productNames[activeProduct] || forecastNames[activeProduct]} map · ${regionNames[region]}` : `WPC Day ${day} excessive rainfall outlook · ${regionNames[region]}`;
    image.src = url; openMap.href = url;
  }
  image.addEventListener("load", () => { const loadedUrl = image.currentSrc || image.src; image.classList.add("is-loaded"); imageStatus.hidden = true; preloadNearbyForecastTimes(); preloadNearbySmokeTimes(); preloadSatelliteFrames(); syncPreloadStatus(); if (product === "satellite" && satelliteProduct === "geocolor" && !satelliteAutoplayStarted) { satelliteAutoplayStarted = true; window.setTimeout(() => { if (product === "satellite" && satelliteProduct === "geocolor" && !satelliteLoopTimer) startSatelliteLoop(); }, 350); } updateFreshnessStatus(loadedUrl).catch(() => { status.dataset.freshness = "unknown"; status.textContent = "Freshness unavailable"; }); });
  image.addEventListener("error", () => { imageStatus.hidden = false; imageStatus.textContent = "This weather map is temporarily unavailable."; status.textContent = "Unavailable"; });
  image.addEventListener("pointermove", event => { if (event.pointerType === "touch") return; window.clearTimeout(mapQueryTimer); mapQueryTimer = window.setTimeout(() => queryForecastMap(event), 180); });
  image.addEventListener("pointerleave", hideMapQuery);
  image.addEventListener("click", event => { if (event.pointerType === "touch" || matchMedia("(hover: none)").matches) queryForecastMap(event); });
  document.querySelector("#productChoices").addEventListener("change", event => { product = event.target.value; if (product !== "satellite") stopSatelliteLoop(); if (product === "qpf" && day > 3) day = 3; if (product === "ero" && day > 5) day = 5; document.querySelector("#dayChoices").value = String(day); event.target.blur(); update(); if (product === "forecast") refreshForecastTimes(); });
  document.querySelector("#observationChoices").addEventListener("change", event => { surfaceProduct = event.target.value; update(); });
  precipitationChoices.addEventListener("change", event => { precipitationProduct = event.target.value; update(); });
  smokeTimeChoices.addEventListener("change", event => { smokeValidTime = event.target.value; syncSmokeTimeArrows(); update(); });
  smokeTimePrevious.addEventListener("click", () => stepSmokeTime(1));
  smokeTimeNext.addEventListener("click", () => stepSmokeTime(-1));
  document.querySelector("#forecastChoices").addEventListener("change", event => {
    forecastProduct = event.target.value;
    forecastValidTime = "";
    event.target.blur();
    update();
    refreshForecastTimes();
  });
  forecastTimeChoices.addEventListener("change", event => { forecastValidTime = event.target.value; syncForecastTimeArrows(); update(); });
  forecastTimePrevious.addEventListener("click", () => stepForecastTime(-1));
  forecastTimeNext.addEventListener("click", () => stepForecastTime(1));
  document.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (hrrrAnalysisProducts.includes(product)) {
      const formControl = event.target.closest?.("input, textarea, select");
      if (formControl && formControl !== smokeTimeChoices) return;
      event.preventDefault();
      stepSmokeTime(event.key === "ArrowLeft" ? 1 : -1);
      return;
    }
    if (product !== "forecast") return;
    const formControl = event.target.closest?.("input, textarea, select");
    if (formControl && formControl !== forecastTimeChoices) return;
    event.preventDefault();
    stepForecastTime(event.key === "ArrowLeft" ? -1 : 1);
  });
  document.querySelector("#satelliteChoices").addEventListener("change", event => { satelliteProduct = event.target.value; if (satelliteProduct !== "geocolor") stopSatelliteLoop(); update(); });
  satelliteLoopPrevious.addEventListener("click", () => { stopSatelliteLoop(); showSatelliteFrame(satelliteFrameIndex - 1); });
  satelliteLoopNext.addEventListener("click", () => { stopSatelliteLoop(); showSatelliteFrame(satelliteFrameIndex + 1); });
  satelliteLoopPlay.addEventListener("click", () => satelliteLoopTimer ? stopSatelliteLoop() : startSatelliteLoop());
  satelliteLoopSpeed.addEventListener("change", () => { localStorage.setItem("zasnet-satellite-animation-speed", satelliteLoopSpeed.value); if (satelliteLoopTimer) startSatelliteLoop(); });
  satelliteLoopTimeline.addEventListener("input", event => { stopSatelliteLoop(); showSatelliteFrame(Number(event.target.value)); });
  document.querySelector("#fireChoices").addEventListener("change", event => { fireProduct = event.target.value; update(); });
  document.querySelector("#climateChoices").addEventListener("change", event => { climateProduct = event.target.value; update(); });
  document.querySelector("#dayChoices").addEventListener("change", event => { day = Number(event.target.value); update(); });
  regionSelect.addEventListener("change", update);
  window.installTemporaryMapRegions?.(regionSelect);
  document.querySelector("#exportMap").addEventListener("click", () => { const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth || 1400; canvas.height = image.naturalHeight || 900; canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `zasnet-${product}${product === "ero" ? `-day${day}` : ""}-map.png`; link.click(); });
  if (product === "qpf" && day > 3) day = 3;
  if (product === "ero" && day > 5) day = 5;
  regionSelect.value = Object.hasOwn(regionNames, query.get("region") || "") ? query.get("region") || "" : "";
  document.querySelector("#observationChoices").value = surfaceProduct;
  precipitationChoices.value = precipitationProduct;
  document.querySelector("#forecastChoices").value = forecastProduct;
  document.querySelector("#satelliteChoices").value = satelliteProduct;
  document.querySelector("#fireChoices").value = fireProduct;
  document.querySelector("#climateChoices").value = climateProduct;
  document.querySelector("#dayChoices").value = String(day);
  document.querySelector("#productChoices").value = product;
  update(); if (product === "forecast") refreshForecastTimes(); window.setInterval(update, 5 * 60_000);
})();
