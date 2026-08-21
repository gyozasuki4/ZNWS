(() => { "use strict";
  const params = new URLSearchParams(location.search); let savedPoint={};try{savedPoint=JSON.parse(localStorage.getItem("forecast-last-point")||"{}");}catch{} let lat = Number(params.get("lat")??savedPoint.lat), lon = Number(params.get("lon")??savedPoint.lon), requestNumber = 0;
  let metricUnits=localStorage.getItem("forecast-units")==="metric",lastForecastData=null;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const forecastTemperature=amount=>metricUnits?(Number(amount)-32)*5/9:Number(amount);
  const forecastWind=text=>metricUnits?String(text||"").replace(/\d+(?:\.\d+)?/g,value=>String(Math.round(Number(value)*1.60934))).replace(/mph/gi,"km/h"):String(text||"");
  const windDirectionDegrees=(direction)=>{const points=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];const index=points.indexOf(String(direction||"").trim().toUpperCase());return index<0?null:index*22.5;};
  const windArrow=(direction)=>{const degrees=windDirectionDegrees(direction);return degrees==null?"":`<i class="wind-direction-arrow" style="--wind-direction:${degrees+180}deg" aria-hidden="true">↑</i>`;};
  const weatherVisual=(description,isDaytime=true,className="",iconUrl=null)=>(window.znwsWeatherVisual||(()=>""))(description,isDaytime,className,iconUrl);


  const impactBadges=(period)=>{const text=String(period.shortForecast||""),precip=Number(period.probabilityOfPrecipitation?.value),temperature=Number(period.temperature),wind=Math.max(...(String(period.windSpeed||"").match(/\d+(?:\.\d+)?/g)?.map(Number)||[0]));return [precip>=70?"High precip":"",wind>=25?"Strong wind":"",temperature>=100?"Extreme heat":"",temperature<=20?"Bitter cold":"",/thunder/i.test(text)?"Thunderstorms":"",/freezing|ice|sleet/i.test(text)?"Wintry mix":/snow/i.test(text)?"Snow":""].filter(Boolean);};
  const time = (v, options = {}) => { const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", ...options }) : "Not available"; };
  const value = (item, convert = x => x, suffix = "") => Number.isFinite(item?.value) ? `${Math.round(convert(item.value))}${suffix}` : "—";
  const back = document.querySelector("#backLink"), wfo = (params.get("wfo") || "").replace(/^K/i, "").toUpperCase();
  const returnToWfo = document.createElement("a");
  returnToWfo.id = "returnToWfo";
  returnToWfo.hidden = true;
  document.querySelector(".forecast-page-actions")?.prepend(returnToWfo);
  const locationSearchForm = document.querySelector("#forecastLocationSearch"), locationSearchInput = document.querySelector("#forecastLocationQuery"), locationSearchResults = document.querySelector("#forecastLocationResults");
  const setWfoLinks = (code) => {
    const normalized = String(code || "").replace(/^K/i, "").toUpperCase();
    if (!/^[A-Z0-9]{3}$/.test(normalized)) return;
    const href = `/wfo.html?wfo=${encodeURIComponent(normalized)}`;
    back.href = href;
    back.textContent = `WFO ${normalized}`;
    returnToWfo.href = href;
    returnToWfo.textContent = `← Return to WFO ${normalized}`;
    returnToWfo.hidden = false;
  };
  setWfoLinks(wfo);
  const emptyGeoJson = { type:"FeatureCollection", features:[] };
  let pointMarker, latestAlertData = emptyGeoJson, radarEnabled = true, radarRefreshKey = Date.now();
  const mapStatus = document.querySelector("#mapStatus");
  let map = null;
  try {
    map = new maplibregl.Map({
      container:"forecastMap", center:Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : [-96, 38], zoom:8,
      style:{ version:8, sources:{ base:{ type:"raster", tiles:["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"], tileSize:256, attribution:"© OpenStreetMap © CARTO" } }, layers:[{ id:"base", type:"raster", source:"base", paint:{ "raster-saturation":-.35, "raster-contrast":.05 } }] }
    });
  } catch (error) {
    if (mapStatus) mapStatus.textContent = "Interactive map could not start on this device. Forecast data is still available below.";
  }
  if (map) {
  map.addControl(new maplibregl.NavigationControl({ showCompass:false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth:110, unit:"imperial" }), "bottom-right");
  map.on("load", () => {
    map.addSource("point-alerts", { type:"geojson", data:emptyGeoJson });
    map.addSource("iem-radar", { type:"raster", tiles:[`/api/public/radar/iem/{z}/{x}/{y}?product=n0q&v=${radarRefreshKey}`], tileSize:256, attribution:"Radar: IEM NEXRAD composite" });
    const zoneFilter = ["match",["get","areaType"],["zone","county"],true,false];
    const polygonFilter = ["match",["get","areaType"],["zone","county"],false,true];
    map.addLayer({ id:"zws-zone-fill", type:"fill", source:"point-alerts", filter:zoneFilter, paint:{ "fill-color":["coalesce",["get","color"],"#ffb347"], "fill-opacity":.2 } });
    map.addLayer({ id:"zws-zone-line", type:"line", source:"point-alerts", filter:zoneFilter, paint:{ "line-color":["coalesce",["get","color"],"#ffb347"], "line-width":2.2 } });
    map.addLayer({ id:"iem-radar", type:"raster", source:"iem-radar", paint:{ "raster-opacity":.5,"raster-saturation":-.2,"raster-contrast":.08,"raster-fade-duration":0 } });
    map.addLayer({ id:"zws-polygon-fill", type:"fill", source:"point-alerts", filter:polygonFilter, paint:{ "fill-color":["coalesce",["get","color"],"#ffb347"], "fill-opacity":.18 } });
    map.addLayer({ id:"zws-polygon-line", type:"line", source:"point-alerts", filter:polygonFilter, paint:{ "line-color":["coalesce",["get","color"],"#ffb347"], "line-width":3.4 } });
    syncForecastRadar(false);
    map.getSource("point-alerts").setData(latestAlertData);
    setMapPoint(false);
    map.resize();
    if (mapStatus) mapStatus.hidden = true;
  });
  map.on("error", (event) => {
    if (!map.loaded() && mapStatus) mapStatus.textContent = "Map tiles are taking longer than expected to load.";
  });
  map.on("click", (event) => {
    lat = event.lngLat.lat; lon = event.lngLat.lng;
    const next = new URL(location.href); next.searchParams.set("lat", lat.toFixed(4)); next.searchParams.set("lon", lon.toFixed(4)); history.pushState({}, "", next);
    setMapPoint(false); load().catch(showError);
  });
  const mapStage = document.querySelector(".map-stage");
  if (mapStage && globalThis.ResizeObserver) new ResizeObserver(() => map?.resize()).observe(mapStage);
  window.addEventListener("orientationchange", () => window.setTimeout(() => map?.resize(), 150));
  }
  function syncForecastRadar(refresh = false) {
    if (!map?.getLayer("iem-radar")) return;
    map.setLayoutProperty("iem-radar", "visibility", radarEnabled ? "visible" : "none");
    if (refresh && radarEnabled) { radarRefreshKey = Date.now(); map.getSource("iem-radar")?.setTiles([`/api/public/radar/iem/{z}/{x}/{y}?product=n0q&v=${radarRefreshKey}`]); }
    const button = document.querySelector("#forecastRadarToggle");
    if (button) { button.textContent = radarEnabled ? "Radar on" : "Radar off"; button.setAttribute("aria-pressed", String(radarEnabled)); }
  }
  function setMapPoint(recenter = true) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    document.querySelector("#mapCoordinates").textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    if (!map) return;
    if (!pointMarker) {
      const marker = document.createElement("div"); marker.className = "forecast-point-marker"; marker.setAttribute("aria-label", "Selected forecast point");
      pointMarker = new maplibregl.Marker({ element:marker, anchor:"center" }).setLngLat([lon, lat]).addTo(map);
    }
    else pointMarker.setLngLat([lon, lat]);
    if (recenter && map.loaded()) map.easeTo({ center:[lon, lat], duration:650 });
  }
  function alertKind(feature) { const type = feature.properties?.areaType; return type === "zone" ? "Zone" : type === "county" ? "County" : "Polygon"; }
  function safeColor(value, fallback) { return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? value : fallback; }
  function cleanProductText(value) {
    const lines = String(value || "").replace(/\r/g, "").split("\n");
    while (lines.length && (!lines[0].trim() || /^(?:[A-Z]{4}\d{2}\s+[A-Z]{4}\s+\d{6}|[A-Z0-9]{4,12})$/.test(lines[0].trim()))) lines.shift();
    return lines.join("\n").replace(/^\s*(?:&&|\$\$)\s*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  }
  function spcStyle(properties) {
    const dn = Number(properties.dn ?? properties.DN), label = String(properties.label || properties.LABEL || properties.label2 || properties.LABEL2 || "Convective outlook");
    const colors = { 2:"#9bd39b", 3:"#5ca35c", 4:"#f2dc5d", 5:"#ef9b45", 6:"#e85b5b", 8:"#f05ac8" };
    return { label, color:colors[dn] || "#6fb879" };
  }
  function alertLevel(name) {
    const value = String(name || "").toLowerCase();
    if (/emergency|warning/.test(value)) return { key:"warning", label:"Warning" };
    if (/watch/.test(value)) return { key:"watch", label:"Watch" };
    if (/advisory/.test(value)) return { key:"advisory", label:"Advisory" };
    return { key:"statement", label:"Statement" };
  }
  function renderHazards(data) {
    const rank = { warning:0, watch:1, advisory:2, statement:3 };
    const productNames = {
      "FW.W":"Red Flag Warning", "TOR":"Tornado Warning", "SVR":"Severe Thunderstorm Warning",
      "FFW":"Flash Flood Warning", "FLW":"Flood Warning", "FAY":"Flood Advisory",
      "WS.W":"Winter Storm Warning", "BZ.W":"Blizzard Warning", "IS.W":"Ice Storm Warning",
      "TOA":"Tornado Watch", "SVA":"Severe Thunderstorm Watch"
    };
    const alertName = (properties = {}) => {
      const code = String(properties.product || "").toUpperCase();
      return properties.productName || properties.hazardName || properties.event || productNames[code] || code || "Weather alert";
    };
    const alerts = [...(data.alerts || [])].sort((a, b) => rank[alertLevel(a.properties?.productName || a.properties?.product).key] - rank[alertLevel(b.properties?.productName || b.properties?.product).key] || new Date(a.properties?.expiresAt || 0) - new Date(b.properties?.expiresAt || 0)), spc = data.spc || [], host = document.querySelector("#hazards");
    const cards = alerts.map((feature) => {
      const p = feature.properties || {}, name = alertName(p), level = alertLevel(name), color = safeColor(p.color, "#ffb347"), area = p.locationPhrase || [p.countyName,p.countyState].filter(Boolean).join(", ") || "Issued area", copy = cleanProductText(p.text);
      return `<details class="hazard alert-card ${level.key}" style="--alert-color:${color}"><summary><span class="alert-severity">${level.label}</span><span class="alert-title"><strong>${esc(name)}</strong><small>${esc(area)}</small></span><span class="alert-expiry">Until<br><strong>${esc(time(p.expiresAt, { weekday:"short" }))}</strong></span></summary><div class="alert-details"><div class="alert-meta"><span>Issued ${esc(time(p.issuedAt))}</span><span>${esc(alertKind(feature))} alert</span>${p.wfo ? `<span>WFO ${esc(p.wfo)}</span>` : ""}${p.productId ? `<span>${esc(p.productId)}</span>` : ""}</div>${copy ? `<div class="alert-copy">${esc(copy)}</div>` : '<p>No additional product text is available.</p>'}</div></details>`;
    });
    const outlooks = spc.map(item => { const style = spcStyle(item.properties || {}); return `<details class="hazard outlook alert-card" style="--alert-color:${style.color}"><summary><span class="alert-severity">Outlook</span><span class="alert-title"><strong>${esc(style.label)}</strong><small>SPC Day ${esc(item.day)} categorical outlook</small></span><span class="alert-expiry">Day ${esc(item.day)}</span></summary><div class="alert-details"><p>This location is inside the color-coded SPC Day ${esc(item.day)} categorical outlook area. Open the severe weather page for the full national outlook.</p><a class="alert-link" href="/severe-weather">View severe outlooks →</a></div></details>`; });
    const total = cards.length + outlooks.length;
    const namedProducts = new Map();
    alerts.forEach((feature) => {
      const p = feature.properties || {}, name = alertName(p), current = namedProducts.get(name) || { count:0, color:safeColor(p.color, "#1769aa") };
      current.count += 1; namedProducts.set(name, current);
    });
    spc.forEach((item) => { const style = spcStyle(item.properties || {}), name = style.label; const current = namedProducts.get(name) || { count:0, color:style.color }; current.count += 1; namedProducts.set(name, current); });
    const productSummary = [...namedProducts.entries()].map(([name, item]) => `<span style="--alert-color:${item.color}"><b>${esc(name)}</b><small>${item.count} active</small></span>`).join("");
    host.innerHTML = `<div class="section-heading alert-heading"><div><p class="eyebrow">Alerts for this location</p><h2>${total ? "Active weather products" : "No active alerts"}</h2></div>${total ? `<span class="alert-counts">${total} active</span>` : ""}</div>${productSummary ? `<div class="forecast-product-summary">${productSummary}</div>` : ""}${[...cards, ...outlooks].join("") || '<div class="all-clear"><span aria-hidden="true">✓</span><div><strong>No active alerts for this location</strong><p>ZWS alerts and SPC outlooks are checked whenever this forecast refreshes.</p></div></div>'}`;
  }
  function renderCurrent(observation, station, astronomy, timeZone) {
    const host = document.querySelector("#current");
    let source = document.querySelector("#observationStation");
    if (!source) { source = document.createElement("p"); source.id = "observationStation"; source.className = "station-source"; document.querySelector(".conditions .section-heading>div")?.append(source); }
    source.textContent = station ? `Reported at ${station.name}${station.id ? ` · ${station.id}` : ""}` : "Nearest available NWS reporting station";
    if (!observation) { host.className = "current"; host.innerHTML = "The nearest reporting station does not have a current observation."; return; }
    const f = c => metricUnits ? c : c * 9 / 5 + 32, mph = k => metricUnits ? k : k * .621371, tempUnit=metricUnits?"°C":"°F",speedUnit=metricUnits?" km/h":" mph";
    const compass = degrees => Number.isFinite(Number(degrees)) ? ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(Number(degrees) / 22.5) % 16] : "";
    const solarTime = (timestamp) => { const date = new Date(timestamp); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour:"numeric", minute:"2-digit", ...(timeZone ? { timeZone } : {}) }) : "—"; };
    const pressure = observation.barometricPressure?.value != null ? observation.barometricPressure : observation.seaLevelPressure;
    const apparent = observation.heatIndex?.value != null ? observation.heatIndex : observation.windChill?.value != null ? observation.windChill : observation.temperature;
    const description=observation.textDescription||"Conditions unavailable",hour=new Date(observation.timestamp).getHours();
    host.className = "current"; host.innerHTML = `<div class="current-primary">${weatherVisual(description,hour>=6&&hour<19,"current-icon")}<div class="temperature">${value(observation.temperature, f, "°")}</div></div><div><h3>${esc(description)}</h3><p>Feels like ${value(apparent, f, tempUnit)}</p></div><dl><div><dt>Humidity</dt><dd>${value(observation.relativeHumidity, x=>x, "%")}</dd></div><div><dt>Dew point</dt><dd>${value(observation.dewpoint, f, tempUnit)}</dd></div><div><dt>Wind</dt><dd>${esc(compass(observation.windDirection?.value))} ${value(observation.windSpeed, mph, speedUnit)}</dd></div><div><dt>Wind gust</dt><dd>${value(observation.windGust, mph, speedUnit)}</dd></div><div><dt>Visibility</dt><dd>${value(observation.visibility, x=>metricUnits?x/1000:x/1609.344, metricUnits?" km":" mi")}</dd></div><div><dt>Pressure</dt><dd>${value(pressure, x=>x/100, " hPa")}</dd></div><div><dt>Sunrise</dt><dd>${solarTime(astronomy?.sunrise)}</dd></div><div><dt>Sunset</dt><dd>${solarTime(astronomy?.sunset)}</dd></div></dl>`;
    const ageMinutes=Math.max(0,Math.round((Date.now()-Date.parse(observation.timestamp))/60000)), observed=document.querySelector("#observedTime");
    observed.textContent = `Observed ${time(observation.timestamp)} · ${ageMinutes} min ago`;
    observed.classList.toggle("is-stale",ageMinutes>60);
  }
  function renderGlance(periods, astronomy, timeZone, environment={}) {
    const list = (periods || []).slice(0, 24), host = document.querySelector("#forecastGlance"), summary = document.querySelector("#glanceSummary");
    const temperatures = list.map(item => forecastTemperature(item.temperature)).filter(Number.isFinite);
    const rain = list.map(item => Number(item.probabilityOfPrecipitation?.value)).filter(Number.isFinite);
    const winds = list.flatMap(item => forecastWind(item.windSpeed).match(/\d+(?:\.\d+)?/g)?.map(Number) || []).filter(Number.isFinite);
    const clock = timestamp => { const date = new Date(timestamp); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour:"numeric", minute:"2-digit", ...(timeZone ? { timeZone } : {}) }) : "—"; };
    const high=Math.max(...temperatures),low=Math.min(...temperatures),rainPeak=Math.max(...rain),windPeak=Math.max(...winds);
    const highPeriod=list.find(item=>forecastTemperature(item.temperature)===high),lowPeriod=list.find(item=>forecastTemperature(item.temperature)===low),rainPeriod=list.find(item=>Number(item.probabilityOfPrecipitation?.value)===rainPeak),windPeriod=list.find(item=>(forecastWind(item.windSpeed).match(/\d+(?:\.\d+)?/g)?.map(Number)||[]).includes(windPeak));
    const sunriseMs=Date.parse(astronomy?.sunrise),sunsetMs=Date.parse(astronomy?.sunset),now=Date.now(),daylightNote=Number.isFinite(sunriseMs)&&Number.isFinite(sunsetMs)&&now>=sunriseMs&&now<=sunsetMs?`${Math.max(0,Math.round((sunsetMs-now)/3600000))} hr daylight remaining`:"Sunrise / sunset";
    const cards = [
      ["temperature", "High / low", temperatures.length ? `${Math.round(high)}° / ${Math.round(low)}°` : "—", temperatures.length?`${clock(highPeriod?.startTime)} high · ${clock(lowPeriod?.startTime)} low`:"Temperature range", "↕"],
      ["precipitation", "Rain chance", rain.length ? `${Math.round(rainPeak)}%` : "—", rain.length?`Highest near ${clock(rainPeriod?.startTime)}`:"Peak probability", "◆"],
      ["wind", "Peak wind", winds.length ? `${Math.round(windPeak)} ${metricUnits?"km/h":"mph"}` : "—", winds.length?`Strongest near ${clock(windPeriod?.startTime)}`:"Strongest forecast", "→"],
      ["daylight", "Sunrise / sunset", `${clock(astronomy?.sunrise)} – ${clock(astronomy?.sunset)}`, daylightNote, "☼"]
    ];
    const amount=mm=>metricUnits?`${Number(mm||0).toFixed(Number(mm||0)<10?1:0)} mm`:`${(Number(mm||0)/25.4).toFixed(Number(mm||0)<2.54?2:1)} in`;
    const secondary = [["precipitation","Rain amount",amount(environment.rainMm),"24-hour total","●"],Number(environment.snowMm)>0?["snow","Snow amount",amount(environment.snowMm),"24-hour total","✦"]:null,Number(environment.iceMm)>0?["ice","Ice amount",amount(environment.iceMm),"24-hour total","◇"]:null,["uv","UV index",environment.uvIndex==null?"—":String(Math.round(environment.uvIndex)),environment.uvIndex==null?"Unavailable":`${environment.uvIndex<3?"Low":environment.uvIndex<6?"Moderate":environment.uvIndex<8?"High":"Very high"} risk`,"☀"]].filter(Boolean);
    const cardMarkup = ([kind,label,cardAmount,note,icon],compact=false) => `<article class="glance-card ${kind}${compact?" compact":""}"><div class="glance-card-head"><span>${esc(label)}</span><i aria-hidden="true">${esc(icon)}</i></div><strong>${esc(cardAmount)}</strong><small>${esc(note)}</small></article>`;
    host.innerHTML = `<div class="glance-primary">${cards.map(card=>cardMarkup(card)).join("")}</div><div class="glance-secondary" aria-label="Additional forecast details">${secondary.map(card=>cardMarkup(card,true)).join("")}</div>`;
    const wet=list.filter(item=>Number(item.probabilityOfPrecipitation?.value)>=30), firstWet=wet[0], lastWet=wet[wet.length-1];
    const condition=list[0]?.shortForecast||"Official NWS point forecast",temperatureSummary=temperatures.length?`High ${Math.round(high)}° · Low ${Math.round(low)}°`:"";
    summary.textContent = [condition,temperatureSummary,firstWet?`${Math.round(rainPeak)}% rain near ${clock(rainPeriod?.startTime)}`:""].filter(Boolean).join(" · ");
  }
  function hourlyFeelsLike(period) {
    const temperature = Number(period.temperature), humidity = Number(period.relativeHumidity?.value), speeds = String(period.windSpeed || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [], wind = speeds.length ? Math.max(...speeds) : 0;
    if (!Number.isFinite(temperature)) return NaN;
    if (temperature <= 50 && wind > 3) return 35.74 + .6215 * temperature - 35.75 * wind ** .16 + .4275 * temperature * wind ** .16;
    if (temperature >= 80 && Number.isFinite(humidity)) return -42.379 + 2.04901523 * temperature + 10.14333127 * humidity - .22475541 * temperature * humidity - .00683783 * temperature ** 2 - .05481717 * humidity ** 2 + .00122874 * temperature ** 2 * humidity + .00085282 * temperature * humidity ** 2 - .00000199 * temperature ** 2 * humidity ** 2;
    return temperature;
  }
  function renderHourlyChart(list, timeZone, mode = "temperature") {
    const chart = document.querySelector("#hourlyChart"), hourLabel = (timestamp) => { const date = new Date(timestamp); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour:"numeric", ...(timeZone ? { timeZone } : {}) }) : "—"; };
    const config = {
      temperature:{ label:"Temperature", suffix:"°", value:p=>forecastTemperature(p.temperature) },
      feels:{ label:"Feels like", suffix:"°", value:p=>forecastTemperature(hourlyFeelsLike(p)) },
      precipitation:{ label:"Precipitation probability", suffix:"%", value:p=>Number(p.probabilityOfPrecipitation?.value) },
      humidity:{ label:"Relative humidity", suffix:"%", value:p=>Number(p.relativeHumidity?.value) },
      dewpoint:{ label:"Dew point", suffix:"°", value:p=>Number.isFinite(Number(p.dewpoint?.value))?Number(p.dewpoint.value)*9/5+32:NaN },
      wind:{ label:"Wind speed", suffix:metricUnits?" km/h":" mph", value:p=>Math.max(...(forecastWind(p.windSpeed).match(/\d+(?:\.\d+)?/g)?.map(Number) || [0])) }
    }[mode] || null;
    if (!config) return;
    const values = list.map(config.value), finite = values.filter(Number.isFinite);
    if (finite.length < 2) { chart.innerHTML = '<p class="forecast-empty">This hourly measurement is unavailable.</p>'; return; }
    const percentMode=["precipitation","humidity"].includes(mode), left = 62, right = 1160, top = 34, bottom = 198, rawMin = percentMode ? 0 : Math.min(...finite), rawMax = percentMode ? 100 : Math.max(...finite), padding = percentMode ? 0 : Math.max(3, (rawMax - rawMin) * .15), minimum = rawMin - padding, maximum = rawMax + padding, range = Math.max(1, maximum - minimum);
    const x = index => left + index * (right - left) / Math.max(1, list.length - 1), y = amount => top + (maximum - amount) / range * (bottom - top), step = (right - left) / Math.max(1, list.length - 1), ticks = list.map((period, index) => index % 3 === 0 ? `<text x="${x(index).toFixed(1)}" y="246" text-anchor="middle">${esc(hourLabel(period.startTime))}</text>` : "").join("");
    const lightBands = list.map((period, index) => { const bandLeft = Math.max(left, x(index) - step / 2), bandRight = Math.min(right, x(index) + step / 2); return `<rect class="${period.isDaytime ? "daylight" : "nighttime"}" x="${bandLeft.toFixed(1)}" y="${top}" width="${Math.max(0,bandRight-bandLeft).toFixed(1)}" height="${bottom-top}"><title>${period.isDaytime ? "Daylight" : "Nighttime"} · ${esc(hourLabel(period.startTime))}</title></rect>`; }).join("");
    const linePoints = values.map((amount,index)=>Number.isFinite(amount)?`${x(index).toFixed(1)},${y(amount).toFixed(1)}`:"").filter(Boolean), marks = mode === "precipitation" ? `<g class="rain-bars">${values.map((amount,index) => { const safe = Number.isFinite(amount) ? Math.max(0,Math.min(100,amount)) : 0, width = Math.max(5,(right-left)/list.length-5); return `<rect x="${(x(index)-width/2).toFixed(1)}" y="${y(safe).toFixed(1)}" width="${width.toFixed(1)}" height="${(bottom-y(safe)).toFixed(1)}" rx="4"><title>${Math.round(safe)}% at ${esc(hourLabel(list[index].startTime))}</title></rect>`; }).join("")}</g>` : `<polygon class="chart-area ${mode}" points="${linePoints.join(" ")} ${x(list.length-1).toFixed(1)},${bottom} ${left},${bottom}"/><polyline class="temperature-line ${mode}" points="${linePoints.join(" ")}"/><g class="temperature-points">${values.map((amount,index)=>Number.isFinite(amount)?`<circle class="${mode}" cx="${x(index).toFixed(1)}" cy="${y(amount).toFixed(1)}" r="3.5"><title>${Math.round(amount)}${config.suffix} at ${esc(hourLabel(list[index].startTime))}</title></circle>`:"").join("")}</g>`;
    const labels = values.map((amount,index) => index % 4 === 0 && Number.isFinite(amount) ? `<text class="temperature-label ${mode}" x="${x(index).toFixed(1)}" y="${Math.max(28,y(amount)-10).toFixed(1)}" text-anchor="middle">${Math.round(amount)}${config.suffix}</text>` : "").join(""), middle = (minimum + maximum) / 2, scale = [maximum,middle,minimum].map((amount,index) => `<text class="scale-label" x="51" y="${[top+4,(top+bottom)/2+4,bottom+4][index]}" text-anchor="end">${Math.round(amount)}${config.suffix}</text>`).join("");
    chart.innerHTML = `<svg viewBox="0 0 1200 260" role="img" aria-label="Hourly ${config.label.toLowerCase()} chart with daylight and nighttime shading"><defs><linearGradient id="area-${mode}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-opacity=".28"/><stop offset="100%" stop-opacity="0"/></linearGradient></defs><g class="hourly-light-bands">${lightBands}</g><g class="chart-grid"><line x1="${left}" y1="${top}" x2="${right}" y2="${top}"/><line x1="${left}" y1="${(top+bottom)/2}" x2="${right}" y2="${(top+bottom)/2}"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"/></g><line class="current-time-line" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"/>${marks}<g class="chart-labels"><text class="chart-title" x="${left}" y="20">${config.label}</text>${scale}${labels}${ticks}<text class="now-label" x="${left+5}" y="217">Now</text></g><g class="light-legend"><circle class="daylight" cx="1000" cy="15" r="5"/><text x="1010" y="19">Day</text><circle class="nighttime" cx="1065" cy="15" r="5"/><text x="1075" y="19">Night</text></g></svg>`;
  }
  function renderHourly(periods, timeZone) {
    const list = (periods || []).slice(0, 24), host = document.querySelector("#hourlyForecast"), chart = document.querySelector("#hourlyChart");
    const temperatures=list.map(p=>Number(p.temperature)).filter(Number.isFinite), peakRain=Math.max(...list.map(p=>Number(p.probabilityOfPrecipitation?.value)||0)), peakWind=Math.max(...list.map(p=>Math.max(...(String(p.windSpeed||"").match(/\d+(?:\.\d+)?/g)?.map(Number)||[0]))));
    const high=Math.max(...temperatures),low=Math.min(...temperatures);
    const hourLabel = (timestamp) => { const date = new Date(timestamp); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour:"numeric", ...(timeZone ? { timeZone } : {}) }) : "—"; };
    const savedChart=localStorage.getItem("forecast-chart-mode")||"temperature";
    renderHourlyChart(list, timeZone, savedChart);
    document.querySelectorAll("[data-chart]").forEach(item=>{const active=item.dataset.chart===savedChart;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});
    document.querySelectorAll("[data-chart]").forEach(button => { button.onclick = () => { localStorage.setItem("forecast-chart-mode",button.dataset.chart); document.querySelectorAll("[data-chart]").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); }); renderHourlyChart(list, timeZone, button.dataset.chart); }; });
    host.innerHTML = list.map((period, index) => {
      const precip = period.probabilityOfPrecipitation?.value == null ? NaN : Number(period.probabilityOfPrecipitation.value);
      const date = new Date(period.startTime), day = Number.isFinite(date.getTime()) ? date.toLocaleDateString([], { weekday:"short", ...(timeZone ? { timeZone } : {}) }) : "";
      const windValue=Math.max(...(String(period.windSpeed||"").match(/\d+(?:\.\d+)?/g)?.map(Number)||[0])), forecastText=String(period.shortForecast||""),precipType=/freezing|ice|sleet/i.test(forecastText)?"Wintry mix":/snow/i.test(forecastText)?"Snow":/rain|shower|storm/i.test(forecastText)?"Rain":"",badges=[Number(period.temperature)===high?"Warmest":"",Number(period.temperature)===low?"Coldest":"",precip===peakRain&&peakRain>=30?"Wettest":"",windValue===peakWind&&peakWind>=15?"Windiest":"",precipType].filter(Boolean);
      return `<article class="hourly-card ${period.isDaytime ? "day" : "night"}${index === 0 ? " current-hour" : ""}"><header><time datetime="${esc(period.startTime)}">${index === 0 ? "Now" : esc(hourLabel(period.startTime))}</time><span>${esc(day)}</span></header><div class="hourly-badges${badges.length ? "" : " is-empty"}"${badges.length ? "" : ' aria-hidden="true"'}>${badges.map(label=>`<b>${label}</b>`).join("")}</div><div class="hourly-primary">${weatherVisual([period.shortForecast,period.detailedForecast].filter(Boolean).join(". "),period.isDaytime,"hourly-icon",period.icon)}<strong>${Math.round(forecastTemperature(period.temperature))}<sup>°</sup></strong></div><p>${esc(period.shortForecast || "")}</p><div class="hourly-metrics"><span class="hourly-rain">${Number.isFinite(precip) ? `${Math.round(precip)}% precip` : "Precip —"}</span><span>${esc(period.windDirection || "")} ${esc(forecastWind(period.windSpeed))}</span></div></article>`;
    }).join("") || '<p class="forecast-empty">Hourly forecast data is temporarily unavailable.</p>';
    host.querySelectorAll(".hourly-card").forEach((card,index)=>{
      const period=list[index],impacts=impactBadges(period),header=card.querySelector("header");
      let badges=card.querySelector(".hourly-badges");
      if(impacts.length&&!badges){badges=document.createElement("div");badges.className="hourly-badges";header?.after(badges);}
      impacts.forEach((label)=>{if(![...badges?.querySelectorAll("b")||[]].some(item=>item.textContent===label))badges?.insertAdjacentHTML("beforeend",`<b>${esc(label)}</b>`);});
      const wind=card.querySelector(".hourly-metrics span:last-child");
      if(wind&&!wind.querySelector(".wind-direction-arrow"))wind.insertAdjacentHTML("afterbegin",windArrow(period?.windDirection));
    });
    document.querySelector("#hourlyUpdated").textContent = list[0]?.startTime ? `Beginning ${hourLabel(list[0].startTime)}` : "Temperature · rain · wind";
  }
  function renderForecast(periods) {
    const list = periods || [];
    const grouped = [];
    list.forEach((period) => {
      const date = new Date(period.startTime);
      const key = Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-CA") : period.name;
      let group = grouped[grouped.length - 1];
      if (!group || group.key !== key) { group = { key, date, periods:[] }; grouped.push(group); }
      group.periods.push(period);
    });
    const periodMarkup = (p) => {
      const precip = p.probabilityOfPrecipitation?.value == null ? NaN : Number(p.probabilityOfPrecipitation.value);
      const rain = Number.isFinite(precip) ? `<span class="daily-precip">Rain ${Math.round(precip)}%</span>` : "";
      return `<article class="daily-period ${p.isDaytime ? "day" : "night"}">${weatherVisual([p.shortForecast,p.detailedForecast].filter(Boolean).join(". "),p.isDaytime,"daily-icon",p.icon)}<div class="daily-copy"><span class="daily-label">${p.isDaytime ? "Daytime" : "Nighttime"}</span><strong>${Math.round(forecastTemperature(p.temperature))}°</strong><p>${esc(p.shortForecast)}</p><div class="daily-meta">${rain}<span>Wind ${esc(p.windDirection)} ${esc(forecastWind(p.windSpeed))}</span></div>${p.detailedForecast ? `<div class="daily-details"><p>${esc(p.detailedForecast)}</p></div>` : ""}</div></article>`;
    };
    const dayNav=document.querySelector("#forecastDayNav");
    dayNav.innerHTML=grouped.map((group,index)=>{
      const label=Number.isFinite(group.date.getTime())?group.date.toLocaleDateString([], {weekday:"short"}):group.key;
      const date=Number.isFinite(group.date.getTime())?group.date.toLocaleDateString([], {month:"numeric",day:"numeric"}):"";
      return `<a href="#forecast-day-${index}"${index===0?' class="active" aria-current="date"':""}><strong>${esc(label)}</strong><span>${esc(date)}</span></a>`;
    }).join("");
    dayNav.querySelectorAll("a").forEach((link)=>link.addEventListener("click",()=>{
      dayNav.querySelectorAll("a").forEach((item)=>{item.classList.toggle("active",item===link);item.toggleAttribute("aria-current",item===link);});
    }));
    document.querySelector("#forecast").innerHTML = grouped.map((group,index) => {
      const label = Number.isFinite(group.date.getTime()) ? group.date.toLocaleDateString([], { weekday:"long" }) : group.key;
      const date = Number.isFinite(group.date.getTime()) ? group.date.toLocaleDateString([], { month:"short", day:"numeric" }) : "";
      return `<section class="forecast-day" id="forecast-day-${index}"><header><div><h3>${esc(label)}</h3><span>${esc(date)}</span></div></header><div class="day-periods">${group.periods.map(periodMarkup).join("")}</div></section>`;
    }).join("") || '<p class="forecast-empty">Forecast periods are temporarily unavailable.</p>';
    document.querySelectorAll(".daily-period").forEach((card,index)=>{
      const period=list[index],impacts=impactBadges(period),meta=card.querySelector(".daily-meta");
      if(impacts.length)meta?.insertAdjacentHTML("beforebegin",`<div class="daily-impacts">${impacts.map(label=>`<b>${esc(label)}</b>`).join("")}</div>`);
      const wind=meta?.querySelector("span:last-child");
      if(wind&&!wind.querySelector(".wind-direction-arrow"))wind.insertAdjacentHTML("afterbegin",windArrow(period?.windDirection));
    });
    window.forecastDayObserver?.disconnect();
    window.forecastDayObserver=new IntersectionObserver((entries)=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      dayNav.querySelectorAll("a").forEach((link)=>{const active=link.hash===`#${visible.target.id}`;link.classList.toggle("active",active);link.toggleAttribute("aria-current",active);});
      dayNav.querySelector(`a[href="#${visible.target.id}"]`)?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    },{rootMargin:"-145px 0px -55% 0px",threshold:[.15,.4,.7]});
    document.querySelectorAll(".forecast-day").forEach(day=>window.forecastDayObserver.observe(day));
    const first = list[0]?.startTime;
    document.querySelector("#forecastUpdated").textContent = first ? `Beginning ${time(first, { weekday:"short" })}` : "Day and night periods";
  }
  function renderMarineForecast(marine) {
    const text = String(marine?.text || "").replace(/^\s*\d{3}\s*$/m, "").trim();
    document.querySelector("#glanceSummary").textContent = `${marine.zoneId} · ${marine.productType}`;
    document.querySelector("#forecastGlance").innerHTML = `<article class="marine-summary"><span>Official NWS ${esc(marine.productName)}</span><strong>${esc(marine.zoneName || marine.zoneId)}</strong><small>Issued ${esc(time(marine.issuedAt))}</small></article>`;
    document.querySelector("#current").className = "current";
    document.querySelector("#current").innerHTML = '<div class="data-unavailable"><strong>Marine forecast point</strong><span>Current buoy observations are not available for every water location.</span></div>';
    document.querySelector("#observedTime").textContent = "NWS marine zone forecast";
    document.querySelector("#hourlyForecast").innerHTML = '<div class="data-unavailable"><strong>Hourly marine grid unavailable</strong><span>The official zone forecast is shown below.</span></div>';
    document.querySelector("#hourlyUpdated").textContent = marine.zoneId;
    document.querySelector("#forecastDayNav").innerHTML = "";
    document.querySelector("#forecastUpdated").textContent = `Issued ${time(marine.issuedAt)}`;
    document.querySelector("#forecast").innerHTML = `<article class="marine-forecast"><header><span>${esc(marine.productType)}</span><strong>${esc(marine.zoneName || marine.zoneId)}</strong></header><pre>${esc(text)}</pre></article>`;
  }
  async function load() {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Choose a point from a local WFO map to view its forecast.");
    const thisRequest = ++requestNumber;
    document.querySelector("#locationTitle").textContent = "Loading local weather…";
    document.querySelector("#locationMeta").textContent = "Updating alerts, observation, and forecast";
    document.querySelector("#hazards").hidden = false;
    setMapPoint(true);
    const response = await fetch(`/api/public/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { cache:"no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Forecast unavailable");
    if (thisRequest !== requestNumber) return;
    const place = [data.location.city, data.location.state].filter(Boolean).join(", ") || "Selected location";
    document.querySelector("#locationTitle").textContent = place;
    const refreshed = new Date(data.updatedAt || Date.now()).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" });
    document.querySelector("#locationMeta").textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)} · Updated ${refreshed}`;
    localStorage.setItem("forecast-last-point",JSON.stringify({lat,lon}));
    const localWfo = String(data.location.wfo || "").replace(/^K/i, "").toUpperCase();
    if (/^[A-Z0-9]{3}$/.test(localWfo)) setWfoLinks(localWfo);
    lastForecastData=data;document.title = `ZASNet · ${place} Forecast`; renderHazards(data); if(data.marine) renderMarineForecast(data.marine); else { renderGlance(data.hourly, data.astronomy, data.location.timeZone,data.environment); renderCurrent(data.observation, data.observationStation, data.astronomy, data.location.timeZone); renderHourly(data.hourly, data.location.timeZone); renderForecast(data.forecast); }
    latestAlertData = { type:"FeatureCollection", features:(data.alerts || []).filter(feature => feature.geometry) };
    const alertSource = map?.getSource("point-alerts");
    if (alertSource) alertSource.setData(latestAlertData);
  }
  function showError(error) {
    const detail = error?.message || "The weather service did not return forecast data.";
    document.querySelector("#locationTitle").textContent = "Forecast temporarily unavailable";
    document.querySelector("#locationMeta").textContent = detail;
    document.querySelector("#hazards").hidden = true;
    document.querySelector("#current").innerHTML = '<div class="data-unavailable"><strong>Observation unavailable</strong><span>Try refreshing in a few minutes.</span></div>';
    document.querySelector("#forecastGlance").innerHTML = '<div class="data-unavailable"><strong>Forecast summary unavailable</strong><span>The map and official links may still be used.</span></div>';
    document.querySelector("#hourlyForecast").innerHTML = '<div class="data-unavailable"><strong>Hourly forecast unavailable</strong><span>Try refreshing in a few minutes.</span></div>';
    document.querySelector("#forecast").innerHTML = '<div class="data-unavailable"><strong>Seven-day forecast unavailable</strong><span>Official NWS data could not be loaded.</span></div>';
  }
  async function searchForecastLocations(event) {
    event.preventDefault();
    const query = String(locationSearchInput.value || "").trim();
    if (query.length < 2) return;
    locationSearchResults.hidden = false;
    locationSearchResults.innerHTML = '<button type="button" disabled>Searching…</button>';
    try {
      const response = await fetch(`/api/public/location-search?q=${encodeURIComponent(query)}`, { cache:"no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const results = payload.results || [];
      locationSearchResults.innerHTML = results.map((result, index) => `<button type="button" data-forecast-location="${index}">${esc(result.label || "Location")}</button>`).join("") || '<button type="button" disabled>No matching U.S. location found</button>';
      locationSearchResults.querySelectorAll("[data-forecast-location]").forEach(button => button.addEventListener("click", () => {
        const result = results[Number(button.dataset.forecastLocation)];
        const nextLat = Number(result?.latitude), nextLon = Number(result?.longitude);
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return;
        lat = nextLat; lon = nextLon;
        const next = new URL(location.href); next.searchParams.set("lat", lat.toFixed(4)); next.searchParams.set("lon", lon.toFixed(4)); next.searchParams.delete("wfo"); history.pushState({}, "", next);
        locationSearchResults.hidden = true; locationSearchResults.innerHTML = "";
        load().catch(showError);
      }));
    } catch (error) {
      locationSearchResults.innerHTML = `<button type="button" disabled>Search unavailable: ${esc(error.message || error)}</button>`;
    }
  }
  locationSearchForm?.addEventListener("submit", searchForecastLocations);
  document.querySelector("#useMyLocation")?.addEventListener("click", () => {
    const button=document.querySelector("#useMyLocation");
    if(!navigator.geolocation){ locationSearchResults.hidden=false; locationSearchResults.innerHTML='<button type="button" disabled>Location access is unavailable in this browser</button>'; return; }
    button.disabled=true;button.textContent="Locating…";
    navigator.geolocation.getCurrentPosition((position)=>{
      lat=position.coords.latitude;lon=position.coords.longitude;
      const next=new URL(location.href);next.searchParams.set("lat",lat.toFixed(4));next.searchParams.set("lon",lon.toFixed(4));next.searchParams.delete("wfo");history.pushState({},"",next);
      button.disabled=false;button.textContent="Use my location";setMapPoint(true);load().catch(showError);
    },(error)=>{button.disabled=false;button.textContent="Use my location";locationSearchResults.hidden=false;locationSearchResults.innerHTML=`<button type="button" disabled>Location unavailable: ${esc(error.message)}</button>`;},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });
  document.querySelector("#forecastRadarToggle")?.addEventListener("click",()=>{radarEnabled=!radarEnabled;syncForecastRadar(false);});
  const mapCollapse=document.querySelector("#forecastMapCollapse"),mapCard=document.querySelector(".forecast-map-card");
  const mapActionGroup=document.querySelector(".map-copy-actions>div"),centerMapButton=document.createElement("button");
  centerMapButton.id="centerForecastMap";centerMapButton.type="button";centerMapButton.textContent="Center point";mapActionGroup?.append(centerMapButton);
  centerMapButton.addEventListener("click",()=>{if(Number.isFinite(lat)&&Number.isFinite(lon))map?.easeTo({center:[lon,lat],zoom:8,duration:650});});
  const mapStage=document.querySelector(".map-stage");
  if(mapStage&&!mapStage.querySelector(".forecast-map-key")){const key=document.createElement("div");key.className="forecast-map-key";key.innerHTML='<span><i class="point"></i>Forecast point</span><span><i class="radar"></i>Radar</span><span><i class="alert"></i>Active alert</span>';mapStage.append(key);}
  const setMapCollapsed=(collapsed)=>{mapCard?.classList.toggle("is-collapsed",collapsed);if(mapCollapse){mapCollapse.setAttribute("aria-expanded",String(!collapsed));mapCollapse.textContent=collapsed?"Show map":"Hide map";}if(!collapsed)window.setTimeout(()=>map?.resize(),80);};
  mapCollapse?.addEventListener("click",()=>setMapCollapsed(!mapCard?.classList.contains("is-collapsed")));
  if(window.matchMedia("(max-width: 760px)").matches)setMapCollapsed(true);
  const unitSwitch=document.querySelector("#unitSwitch");
  const syncUnitButton=()=>{if(unitSwitch)unitSwitch.textContent=metricUnits?"Use °F / mph":"Use °C / km/h";};syncUnitButton();
  unitSwitch?.addEventListener("click",()=>{metricUnits=!metricUnits;localStorage.setItem("forecast-units",metricUnits?"metric":"us");syncUnitButton();if(lastForecastData){const data=lastForecastData,tz=data.location.timeZone;if(data.marine)renderMarineForecast(data.marine);else{renderGlance(data.hourly,data.astronomy,tz,data.environment);renderCurrent(data.observation,data.observationStation,data.astronomy,tz);renderHourly(data.hourly,tz);renderForecast(data.forecast);}}});
  document.querySelector("#shareForecast")?.addEventListener("click",async()=>{const data={title:document.title,text:document.querySelector("#locationTitle")?.textContent||"Local forecast",url:location.href};if(navigator.share){try{await navigator.share(data);}catch{}}else{await navigator.clipboard?.writeText(location.href);}});
  document.querySelector("#copyForecastLink")?.addEventListener("click",async(event)=>{await navigator.clipboard?.writeText(location.href);const button=event.currentTarget,original=button.textContent;button.textContent="Copied";window.setTimeout(()=>button.textContent=original,1400);});
  window.addEventListener("popstate", () => { const next = new URLSearchParams(location.search); lat = Number(next.get("lat")); lon = Number(next.get("lon")); setMapPoint(true); load().catch(showError); });
  window.setInterval(()=>{if(document.visibilityState==="visible")syncForecastRadar(true);},3*60_000);
  window.setInterval(()=>{if(document.visibilityState==="visible")load().catch(showError);},10*60_000);
  load().catch(showError);
})();
