(() => {
  "use strict";
  fetch("/api/public/models/operations-update.json", { cache: "no-store" }).then(response => response.json()).then(data => {
    const link = document.querySelector("#activeModelSectors");
    if (link && data.visible) { link.hidden = false; link.querySelector("span").textContent = `${data.sectors.length} active sector${data.sectors.length === 1 ? "" : "s"}`; }
  }).catch(() => {});

  const form = document.querySelector("#homeLocationForm"), input = document.querySelector("#homeLocationSearch"), results = document.querySelector("#homeLocationResults");
  const locate = document.querySelector("#useMyLocation"), status = document.querySelector("#localWeatherStatus"), content = document.querySelector("#localWeatherContent"), alertCounter = document.querySelector("#localAlertCounter");
  if (!form || !input || !results || !locate || !status || !content) return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const weatherVisual=(description,isDaytime=true,className="")=>(window.znwsWeatherVisual||(()=>""))(description,isDaytime,className);
  const forecastWeatherVisual=(description,isDaytime=true,className="")=>(window.znwsWeatherVisual||(()=>""))(description,isDaytime,className);


  const fahrenheit = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 9 / 5 + 32)}°` : "—";
  const modelRegion = (lat, lon) => lon < -112 ? "west" : lon < -101 ? (lat > 40 ? "northern-plains" : "southern-plains") : lon < -91 ? (lat > 40 ? "central-us" : "southern-plains") : lon < -80 ? (lat < 36 ? "southeast" : "ohio-valley") : lat > 39 ? "northeast" : "southeast";
  const setStatus = (message, error = false) => { status.hidden = false; status.textContent = message; status.classList.toggle("is-error", error); };
  async function loadLocalWeather(point) {
    const lat = Number(point.latitude), lon = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    results.hidden = true; content.hidden = true; setStatus("Loading local NWS conditions and forecast…");
    try {
      const response = await fetch(`/api/public/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const location = data.location || {}, observation = data.observation || {}, periods = (data.forecast || []).slice(0, 2), alerts = data.alerts || [];
      const label = point.label || [location.city, location.state].filter(Boolean).join(", ") || "Selected location";
      const wfo = String(location.wfo || "").replace(/^K/i, "").toUpperCase(), region = modelRegion(lat, lon);
      const humidity = Number(observation.relativeHumidity?.value), windKph = Number(observation.windSpeed?.value), windMph = Number.isFinite(windKph) ? Math.round(windKph * .621371) : null;
      const forecastUrl=`/forecast-beta?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}${wfo ? `&wfo=${encodeURIComponent(wfo)}` : ""}`;
      const currentDescription=observation.textDescription||periods[0]?.shortForecast||"Current conditions unavailable",currentHour=new Date(observation.timestamp||Date.now()).getHours();
      content.innerHTML = `<section class="local-current"><div class="local-current-head"><div class="local-current-title">${weatherVisual(currentDescription,currentHour>=6&&currentHour<19,"home-current-icon")}<h3>Current conditions</h3></div><strong>${fahrenheit(observation.temperature?.value)}</strong></div><p>${esc(currentDescription)}</p><div class="local-condition-row"><span>Humidity <b>${Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "—"}</b></span><span>Wind <b>${windMph === null ? "—" : `${windMph} mph`}</b></span></div></section><section class="local-forecast"><h3>Next two periods</h3><div class="local-periods">${periods.map(period => `<article class="has-weather-icon">${weatherVisual(period.shortForecast,period.isDaytime,"home-weather-icon")}<div><strong>${esc(period.name)}</strong><span>${esc(period.temperature)}°${esc(period.temperatureUnit || "F")}</span><small>${esc(period.shortForecast || "Forecast details unavailable")}</small></div></article>`).join("") || "<p>Forecast periods are temporarily unavailable.</p>"}</div><div class="local-links"><a href="${forecastUrl}">Full forecast</a><a href="/public.html">Live radar</a>${wfo ? `<a href="/wfo.html?wfo=${encodeURIComponent(wfo)}">WFO ${esc(wfo)}</a>` : ""}<a href="/models?region=${encodeURIComponent(region)}">Local models</a></div></section>`;
      const currentWeatherIcon=content.querySelector(".home-current-icon");
      if(currentWeatherIcon)currentWeatherIcon.outerHTML=forecastWeatherVisual(currentDescription,currentHour>=6&&currentHour<19,"home-current-icon");
      content.querySelectorAll(".local-periods .home-weather-icon").forEach((icon,index)=>{const period=periods[index];if(period)icon.outerHTML=forecastWeatherVisual(period.shortForecast,period.isDaytime,"home-weather-icon");});
      content.hidden = false; status.hidden = true;
      const panel = document.querySelector("#localWeather"), title = document.querySelector("#localWeatherTitle");
      panel.classList.add("has-location"); title.textContent = label; form.hidden = true;
      locate.innerHTML = `<span aria-hidden="true">↺</span> Change`; locate.setAttribute("aria-label", "Change local weather location");
      if(alertCounter){alertCounter.hidden=false;alertCounter.href=`${forecastUrl}#hazards`;alertCounter.querySelector("strong").textContent=String(alerts.length);alertCounter.classList.toggle("has-alerts",alerts.length>0);alertCounter.querySelector("span").textContent=alerts.length===1?"Active alert":"Active alerts";}
      try { localStorage.setItem("zasnet-home-location", JSON.stringify({ latitude: lat, longitude: lon, label })); } catch { /* optional */ }
    } catch (error) { setStatus(error.message || "Local weather is temporarily unavailable.", true); }
  }
  async function search() {
    const query = input.value.trim();
    if (query.length < 2) { setStatus("Enter at least two characters or a five-digit ZIP code.", true); return; }
    results.hidden = true; setStatus("Searching locations…");
    try {
      const response = await fetch(`/api/public/location-search?q=${encodeURIComponent(query)}`, { cache: "no-store" }), data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (!data.results?.length) { setStatus("No matching U.S. locations were found.", true); return; }
      results.innerHTML = data.results.map((item, index) => `<button type="button" data-location="${index}">${esc(item.label)}</button>`).join("");
      results.hidden = false; status.hidden = true;
      results.onclick = event => { const button = event.target.closest("[data-location]"); if (button) loadLocalWeather(data.results[Number(button.dataset.location)]); };
    } catch (error) { setStatus(error.message || "Location search is temporarily unavailable.", true); }
  }
  form.addEventListener("submit", event => { event.preventDefault(); search(); });
  locate.addEventListener("click", () => {
    const panel = document.querySelector("#localWeather"), title = document.querySelector("#localWeatherTitle");
    if (panel.classList.contains("has-location")) {
      panel.classList.remove("has-location"); title.textContent = "Your local weather"; form.hidden = false; results.hidden = true;
      if(alertCounter)alertCounter.hidden=true;
      locate.innerHTML = `<span aria-hidden="true">◎</span>`; locate.setAttribute("aria-label", "Use my location");
      window.setTimeout(() => input.focus(), 40); return;
    }
    if (!navigator.geolocation) { setStatus("Location services are not supported by this browser.", true); return; }
    locate.disabled = true; setStatus("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(position => {
      locate.disabled = false;
      loadLocalWeather({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: "Your location" });
    }, error => { locate.disabled = false; setStatus(error.code === 1 ? "Location permission was not granted. Search by city or ZIP instead." : "Your location could not be determined.", true); }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 });
  });
  try { const saved = JSON.parse(localStorage.getItem("zasnet-home-location") || "null"); if (saved) loadLocalWeather(saved); } catch { /* no saved location */ }
})();
