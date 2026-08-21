(() => {
  "use strict";
  const region = document.querySelector("#regionSelect"), hour = document.querySelector("#forecastHour"), product = document.querySelector("#modelProduct"), modelRun = document.querySelector("#modelRun"), modelSource = document.querySelector("#modelSource"),hafsDomain=document.querySelector("#hafsDomain"),hafsDomainControl=document.querySelector("#hafsDomainControl");
  [ ["zasTornado", "Tornado Signal · Experimental"], ["zasWind", "Damaging Wind Signal · Experimental"], ["zasWindGust", "Severe Wind-Gust Estimate · Experimental"], ["zasHail", "Hail Signal · Experimental"] ].forEach(([value, label]) => { if (!product.querySelector(`option[value="${value}"]`)) product.append(new Option(label, value)); });
  [["humidity","2-meter relative humidity"],["wind","10-meter wind speed + direction arrows"],["winddir","10-meter wind direction"],["pressure","Mean sea-level pressure"]].forEach(([value,label])=>{if(!product.querySelector(`option[value="${value}"]`))product.append(new Option(label,value));});
  [["visibility","Surface visibility"],["ceiling","Cloud ceiling"],["snowwe","Snowfall water equivalent"],["fzra","Freezing-rain water equivalent"]].forEach(([value,label])=>{if(!product.querySelector(`option[value="${value}"]`))product.append(new Option(label,value));});
  [["simir","Simulated clean IR · ABI Band 13"],["simwv","Simulated water vapor · ABI Band 8"]].forEach(([value,label])=>{if(!product.querySelector(`option[value="${value}"]`))product.append(new Option(label,value));});
  [["mucin","Most-unstable CIN"],["sbcape","Surface-based CAPE"],["sbcin","Surface-based CIN"],["srh01","0–1 km storm-relative helicity"],["srh03","0–3 km storm-relative helicity"],["bs06","0–6 km bulk wind shear"],["maxuvv","Maximum updraft velocity"],["maxdvv","Maximum downdraft velocity"]].forEach(([value,label])=>{if(!product.querySelector(`option[value="${value}"]`))product.append(new Option(label,value));});
  [["uh03","Hourly maximum 0–3 km UH"],["runuh03","Run-to-date maximum 0–3 km UH"]].forEach(([value,label])=>{if(!product.querySelector(`option[value="${value}"]`))product.append(new Option(label,value));});
  const productOptions = new Map([...product.options].map((option) => [option.value, option]));
  if (productOptions.has("preciptype")) productOptions.get("preciptype").textContent = "Simulated precipitation type";
  product.replaceChildren();
  [
    ["ZASNet · Experimental derived guidance", ["zasSevere", "zasTornado", "zasWind", "zasWindGust", "zasHail", "zasConfidence", "zasStormMode", "zasFlood", "zasFloodV2", "zasWinter"]],
    ["GFS · Synoptic", ["pcpn"]],
    ["Severe weather", ["refc", "ref1km", "refcuh75", "uh03", "runuh03", "uh03run", "mucape", "mucin", "sbcape", "sbcin", "srh01", "srh03", "bs06", "maxuvv", "maxdvv", "stp", "scp", "lightning", "hailsfc", "hailmax"]],
    ["Precipitation", ["prate", "apcp", "preciptype", "pwat"]],
    ["Winter", ["snowwe", "fzra", "snowtotal"]],
    ["Surface", ["temperature", "dewpoint", "humidity", "wind", "winddir", "gust", "pressure", "visibility", "ceiling", "apparent", "smoke", "smokevert"]],
    ["Sky", ["cloud","simir","simwv"]]
  ].forEach(([label, values]) => {
    const group = document.createElement("optgroup");
    group.label = label;
    values.forEach((value) => { if (productOptions.has(value)) group.append(productOptions.get(value)); });
    product.append(group);
  });
  const regionalGroup = [...region.querySelectorAll("optgroup")].find((group) => group.label === "Regional views");
  if (regionalGroup && !regionalGroup.querySelector('option[value="philadelphia-dma"]')) regionalGroup.prepend(new Option("Philadelphia DMA", "philadelphia-dma"));
  const previous = document.querySelector("#previousFrame"), next = document.querySelector("#nextFrame"), timeline = document.querySelector("#forecastTimeline"), modelPlayButton = document.querySelector("#modelPlayButton"), modelAnimationSpeed = document.querySelector("#modelAnimationSpeed");
  const timelineCacheLabel=document.createElement("span");timelineCacheLabel.className="timeline-cache-label";timelineCacheLabel.textContent="0 / 0 cached";timeline.closest(".animation-track")?.querySelector(":scope > div")?.append(timelineCacheLabel);
  const mobileToolbar = document.querySelector(".mobile-map-toolbar"), mobileTimeline = document.createElement("input");
  if (mobileToolbar) {
    const timelineWrap = document.createElement("label");
    timelineWrap.className = "mobile-map-timeline";
    timelineWrap.innerHTML = `<span>Forecast hour</span><small data-mobile-valid-time>Loading…</small>`;
    mobileTimeline.type = "range";
    mobileTimeline.min = "0"; mobileTimeline.max = "0"; mobileTimeline.value = "0"; mobileTimeline.step = "1";
    mobileTimeline.setAttribute("aria-label", "Forecast timeline");
    timelineWrap.append(mobileTimeline);
    mobileToolbar.prepend(timelineWrap);
    const previewMobileTime = () => {
      const option = hour.options[Number(mobileTimeline.value)], forecastHour = Number(option?.value);
      const valid = catalog?.runTime && Number.isFinite(forecastHour) ? new Date(Date.parse(catalog.runTime) + forecastHour * 3_600_000) : null;
      const label = mobileToolbar.querySelector("[data-mobile-valid-time]");
      if (label) label.textContent = valid ? `${leadLabel(forecastHour)} · ${valid.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Awaiting frames";
    };
    let mobileScrubFrame = 0;
    const scrubToMobileValue = () => {
      mobileScrubFrame = 0;
      if (timeline.value === mobileTimeline.value) return;
      timeline.value = mobileTimeline.value;
      timeline.dispatchEvent(new Event("input"));
    };
    mobileTimeline.addEventListener("input", () => {
      previewMobileTime();
      if (!mobileScrubFrame) mobileScrubFrame = requestAnimationFrame(scrubToMobileValue);
    });
    mobileTimeline.addEventListener("change", () => {
      if (mobileScrubFrame) { cancelAnimationFrame(mobileScrubFrame); mobileScrubFrame = 0; }
      scrubToMobileValue();
    });
  }
  // Keep the timeline with its playback controls on every screen size so the
  // transport reads and behaves as one unit.
  const image = document.querySelector("#modelImage"), compareImage = document.querySelector("#compareImage"), compareToggle = document.querySelector("#compareToggle"), compareProduct = document.querySelector("#compareProduct"), imageStatus = document.querySelector("#imageStatus");
  const status = document.querySelector("#modelStatus"), preloadStatus = document.querySelector("#preloadStatus"), caption = document.querySelector("#modelCaption"), openMap = document.querySelector("#openMap");
  const sourceLabel = document.querySelector(".viewer-source strong"), guidanceNote = document.querySelector("#modelGuidanceNote");
  const infoButton = document.querySelector("#experimentalInfoButton"), infoDialog = document.querySelector("#experimentalInfoDialog"), infoTitle = document.querySelector("#experimentalInfoTitle"), infoBody = document.querySelector("#experimentalInfoBody"), infoScale = document.querySelector("#experimentalScale"), infoCaveat = document.querySelector("#experimentalCaveat");
  const viewer=document.querySelector(".outlook-viewer"),sideGuide=document.querySelector("#productGuidePanel"),sideGuideTitle=document.querySelector("#sideGuideTitle"),sideGuideBody=document.querySelector("#sideGuideBody"),sideGuideScale=document.querySelector("#sideGuideScale"),sideGuideCaveat=document.querySelector("#sideGuideCaveat");
  image.decoding = "async";
  image.fetchPriority = "high";
  const numericScale = [["0","#ebebeb","None"],["1","#80c7a2","Low"],["2","#48ad72","Some"],["4","#dfd447","Elevated"],["6","#ed913d","Strong"],["8","#dc453f","Very strong"],["9","#9c327f","Extreme"],["10","#43145f","Maximum"]];
  const floodScale = [["0","#ebebeb","None"],["1","#9bd3bd","Low"],["2","#54b99b","Some"],["4","#3497ad","Elevated"],["6","#3f6fb2","Strong"],["8","#694798","Very strong"],["9","#9a327d","Extreme"],["10","#541843","Maximum"]];
  const experimentalInfo = {
    zasSevere: { title: "Severe Storm Composite", summary: "A 0–10 overlap score showing where one HRRR run supports organized or severe thunderstorms. It is a hazard signal, not a probability.", read: "Higher values mean more severe-weather ingredients overlap in the same grid cell and forecast hour.", inputs: ["Updraft helicity 20%", "Instability (MU CAPE) 18%", "Maximum hail size 16%", "0–1 km helicity 12%", "0–6 km wind shear 12%", "Simulated reflectivity 12%", "Lightning density 10%"], scale: numericScale, caveat: "This is one deterministic HRRR forecast. It does not show the chance of severe weather, distinguish tornado/wind/hail risk, or replace SPC outlooks and NWS warnings." },
    zasTornado: { title: "Tornado Signal", summary: "A focused 0–10 signal for overlap of rotating-updraft and low-level tornado ingredients.", read: "Higher values mean more modeled tornado ingredients overlap; this is not tornado probability.", inputs: ["MU CAPE", "0–1 km helicity", "0–6 km shear", "2–5 km updraft helicity", "Reflectivity and estimated hail support"], scale: [["0","#ebebeb","None"],["1","#b9c9e8","Low"],["2","#758fd0","Some"],["4","#4c61b3","Elevated"],["6","#8a4fa5","Strong"],["8","#c63782","Very strong"],["9","#e52f52","Extreme"],["10","#76152e","Maximum"]], caveat: "Storm-scale boundaries and official SPC/NWS guidance are not included." },
    zasWind: { title: "Damaging Wind Signal", summary: "A focused 0–10 signal for thunderstorm and wind ingredients that can support damaging straight-line winds.", read: "Higher values mean stronger overlap of gust, instability, shear, reflectivity, rainfall-rate and updraft signals.", inputs: ["Surface wind gust", "MU CAPE", "0–6 km shear", "Simulated reflectivity", "Precipitation rate", "Updraft helicity"], scale: [["0","#ebebeb","None"],["1","#b8d9bd","Low"],["2","#6ebc78","Some"],["4","#d8d447","Elevated"],["6","#f09b38","Strong"],["8","#dd4b3f","Very strong"],["9","#a52e64","Extreme"],["10","#54183d","Maximum"]], caveat: "Terrain, trees, structures, outflow boundaries and official NWS warnings are not included." },
    zasWindGust: { title: "Severe Wind-Gust Estimate", summary: "An experimental HRRR-derived estimate of potential convective wind gusts in mph.", read: "The layer is restricted to modeled thunderstorms. Yellow begins near severe limits, with orange, red and purple showing approximately 60, 70 and 80+ mph potential.", inputs: ["Maximum 10 m gust", "MU CAPE", "0–6 km bulk shear", "Composite reflectivity", "Precipitation rate / loading"], scale: [["40","#5f8797","Sub-severe"],["50","#e4d448","Strong"],["58","#f1a13c","Severe"],["60","#ef8737","60+ mph"],["70","#df453d","70+ mph"],["80","#9f2d80","80+ mph"],["90","#4b155f","Extreme"]], caveat: "This is a heuristic estimate from one deterministic HRRR run—not an observed gust, calibrated probability, warning, or guarantee for an individual storm. Small-scale downbursts and terrain effects may be missed or overstated." },
    zasHail: { title: "Hail Signal", summary: "A focused 0–10 signal for modeled hail size and the storm ingredients that support large hail.", read: "Higher values mean larger modeled hail potential overlapping with instability, updraft strength, reflectivity and precipitation rate.", inputs: ["Maximum estimated hail size", "MU CAPE", "2–5 km updraft helicity", "Simulated reflectivity", "Precipitation rate"], scale: [["0","#ebebeb","None"],["1","#9ed7e1","Low"],["2","#46b9c3","Some"],["4","#3f8fd0","Elevated"],["6","#7353b5","Strong"],["8","#b72e9b","Very strong"],["9","#e83c5f","Extreme"],["10","#8e182d","Maximum"]], caveat: "This is not a hail probability or size guarantee. Storm-scale evolution, melting, travel path and official SPC/NWS warnings are not included." },
    zasConfidence: { title: "Severe Confidence", summary: "An agreement-weighted 0–10 severe signal using three consecutive HRRR runs aligned to the same valid time.", read: "A high value requires both a strong Severe Storm Composite and close agreement among all three runs. Strong disagreement lowers the score.", inputs: ["Selected-run Severe Storm Composite", "Previous HRRR run at the same valid time", "Run from two hours earlier at the same valid time", "Three-run mean strength", "Penalty for the spread between the highest and lowest run"], scale: [["0","#ebebeb","None"],["1","#9ac7bd","Low"],["2","#60aca4","Some"],["4","#439594","Elevated"],["6","#367b91","Strong"],["8","#465f9e","Very strong"],["9","#69448e","High agreement"],["10","#3e215f","Maximum"]], caveat: "Agreement is not proof that the forecast is correct. Three similar HRRR runs can share the same timing or placement error; this is not a calibrated probability." },
    zasStormMode: { title: "Storm Mode", summary: "A categorical estimate of modeled thunderstorm organization where simulated reflectivity reaches at least 35 dBZ.", read: "Colors are categories, not an increasing 0–10 threat scale. Supercell-like describes the modeled environment and updraft signal, not a tracked or confirmed supercell.", inputs: ["Pulse (yellow): thunderstorms are modeled, but 0–6 km shear is below 10 m/s, favoring shorter-lived or pulse-like organization", "Multicell (orange): 0–6 km shear reaches 10 m/s, supporting multiple cells or clusters", "Linear / organized (blue): 0–6 km shear reaches 18 m/s, supporting a line or more persistent organized structure", "Supercell-like (purple): UH ≥75, CAPE ≥500, shear ≥18 m/s and 0–1 km helicity ≥75; the environment favors rotating updrafts", "Reflectivity below 35 dBZ is not assigned a storm-mode category"], scale: [["Pulse","#e4d348","Pulse"],["Multicell","#ee963d","Multicell"],["Linear / organized","#438fc4","Linear / organized"],["Supercell-like","#a83486","Supercell-like"]], caveat: "This simplified classification does not track individual storms, predict exact storm shape, or imply certainty. Actual storms may use a different mode." },
    zasFlood: { title: "Flash-Flood Signal V1", summary: "A forecast-only 0–10 signal for intense, persistent rainfall in a moisture-rich HRRR environment.", read: "Higher values mean stronger modeled rainfall forcing. V1 does not know how much rain already fell or how wet the soil is.", inputs: ["Current precipitation rate 35%", "HRRR run-total precipitation 30%", "Precipitable water 20%", "Persistence from the current and previous two hourly rain rates 15%"], scale: floodScale, caveat: "This is not flash-flood probability or official flash-flood guidance. Terrain, drainage, burn scars, urban surfaces, observed rainfall and soil wetness are not included." },
    zasFloodV2: { title: "Flash-Flood Signal V2", summary: "A 0–10 signal that places HRRR forecast rainfall into the context of recent observed rain, soil wetness and recent wildfire burn scars.", read: "HRRR forecast forcing supplies half the base score. V2 requires a V1 rainfall-forcing score of at least 0.5 before MRMS, NWM or recent NIFC wildfire perimeters can raise it, preventing antecedent conditions and trace model noise alone from creating a threat.", inputs: ["Flash-Flood Signal V1 forecast forcing: up to 50%; V2 activation threshold 0.5", "NWM top-40 cm soil saturation: up to 30%; contribution increases from 45% to 90% saturation", "MRMS radar-only 24-hour rainfall: up to 20%; full weight near 75 mm / 3 in", "Wildfire perimeters from the most recent five years: up to 20% inside a mapped burn scar", "Antecedent inputs refresh hourly"], scale: [["0","#ebebeb","None"],["1","#b3ddc8","Low"],["2","#69c2a5","Some"],["4","#2b9db1","Elevated"],["6","#386fc0","Strong"],["8","#7649a5","Very strong"],["9","#b32f78","Extreme"],["10","#4b103f","Maximum"]], caveat: "Wildfire perimeters are a coarse proxy for burn-scar susceptibility and do not describe burn severity, slope or debris-flow likelihood. MRMS can miss or misestimate rainfall, and NWM soil saturation is modeled. V2 still omits local drainage and detailed flash-flood guidance; use official NWS warnings." },
    zasWinter: { title: "Winter Impact Index", summary: "A 0–10 HRRR-derived signal for potentially disruptive winter precipitation and travel conditions.", read: "The calculation uses the stronger of a snowfall-accumulation signal and a combined precipitation-type/rate, cold-temperature and wind signal.", inputs: ["Accumulated snowfall", "Snow, freezing rain, sleet and rain categories", "Precipitation rate", "Surface temperature", "Surface wind gusts", "Extra weighting for freezing rain and sleet"], scale: [["0","#ebebeb","None"],["1","#b9e1e8","Low"],["2","#78c6dc","Some"],["4","#438fca","Elevated"],["6","#575bb1","Strong"],["8","#823d99","Very strong"],["9","#b33379","Extreme"],["10","#5b1745","Maximum"]], caveat: "This is not an official road-condition or ice-accretion forecast. Pavement temperature, treatment, traffic, terrain and local exposure can change actual impacts." }
  };
  const wrfProductInfo={
    refc:{title:"Composite Reflectivity",description:"Composite Reflectivity simulates what a weather radar would observe by displaying the highest reflectivity value anywhere in the atmospheric column. It highlights the location, intensity, and organization of precipitation and thunderstorms.",why:"Higher reflectivity generally corresponds to heavier precipitation and stronger thunderstorms. Very high values often indicate intense updrafts capable of producing large hail, torrential rainfall, and damaging winds."},
    refcuh75:{title:"Reflectivity + 2–5 km UH ≥75",description:"This product combines Composite Reflectivity with 2–5 km Updraft Helicity of at least 75 m²/s² to identify storms producing heavy precipitation alongside persistent rotating updrafts.",why:"Strong reflectivity overlapping high UH can identify long-lived supercell-like storms capable of large hail, damaging winds, or tornadoes. It is model guidance, not a tracked or confirmed storm."},
    uh03:{title:"Hourly Maximum 0–3 km Updraft Helicity",description:"UH03 shows each output interval’s maximum 0–3 km updraft helicity, highlighting modeled rotating updrafts close to the ground.",why:"Values at or above 75 m²/s² can flag stronger low-level rotating-updraft signals, but should be evaluated with reflectivity, instability, shear, and official guidance."},
    runuh03:{title:"Run-to-Date Maximum 0–3 km Updraft Helicity",description:"RUNUH03 shows the greatest 0–3 km updraft-helicity value reached from initialization through the selected valid time.",why:"It provides a cumulative track of where the model produced stronger low-level rotating updrafts. The last forecast frame represents the maximum across the complete run."},
    mucape:{title:"Most-Unstable CAPE (MUCAPE)",description:"Most-Unstable CAPE measures the maximum buoyant energy available to the most unstable air parcel in the lower atmosphere, whether or not that parcel is at the surface.",why:"Higher MUCAPE supports stronger updrafts, including elevated or nighttime storms that may not be rooted at the surface."},
    mucin:{title:"Most-Unstable CIN (MUCIN)",description:"MUCIN measures the energy preventing the most unstable parcel from rising freely and represents the atmospheric cap above unstable air.",why:"Weak inhibition allows storms to develop more easily, while stronger inhibition can delay or suppress development until sufficient lift or heating occurs."},
    sbcape:{title:"Surface-Based CAPE (SBCAPE)",description:"Surface-Based CAPE measures buoyant energy available to parcels lifted directly from the surface.",why:"Large SBCAPE supports stronger surface-based thunderstorm updrafts and greater severe-weather potential when sufficient wind shear is present."},
    sbcin:{title:"Surface-Based CIN (SBCIN)",description:"Surface-Based CIN measures the energy preventing surface parcels from rising into the atmosphere and represents the cap acting on daytime heating.",why:"A weak cap favors storm development, while a stronger cap may delay or prevent storms from forming."},
    srh01:{title:"0–1 km Storm-Relative Helicity",description:"SRH measures the horizontal rotation in the lowest kilometer that can be ingested by a thunderstorm updraft.",why:"Higher values favor persistent low-level storm rotation, an important ingredient for tornado-producing supercells."},
    srh03:{title:"0–3 km Storm-Relative Helicity",description:"This product measures storm-relative rotation available through the lowest three kilometers of the atmosphere.",why:"Higher values favor organized rotating thunderstorms and can support long-lived supercells when sufficient instability is present."},
    bs06:{title:"0–6 km Bulk Wind Shear",description:"Bulk Wind Shear measures the overall change in wind speed and direction between the surface and approximately six kilometers above ground.",why:"Increasing shear supports organized, longer-lived storms. Strong deep-layer shear is a key ingredient for supercells."},
    maxuvv:{title:"Maximum Updraft Velocity",description:"Maximum Updraft Velocity displays the strongest upward-moving air predicted within thunderstorms.",why:"Very strong updrafts can support large hail, intense rainfall, and persistent severe thunderstorms."},
    maxdvv:{title:"Maximum Downdraft Velocity",description:"Maximum Downdraft Velocity displays the strongest descending air predicted within thunderstorms.",why:"Stronger downdrafts indicate increased potential for damaging straight-line winds, microbursts, and powerful outflow."},
    lightning:{title:"Total Lightning Flashes",description:"Total Lightning estimates the concentration of in-cloud and cloud-to-ground lightning flashes within each model grid cell and output period.",why:"Greater lightning activity typically indicates stronger, more electrically active thunderstorm updrafts."},
    apcp:{title:"Accumulated Precipitation",description:"Accumulated Precipitation displays total forecast liquid-equivalent precipitation from the beginning of the simulation through the selected forecast hour, including rain and melted frozen precipitation.",why:"It helps assess storm-total rainfall, flooding potential, winter precipitation amounts, and overall precipitation coverage."},
    wind:{title:"10-Meter Wind Speed + Direction",description:"Shaded wind speed in mph with an arrow beside each sampled speed when the matching WDIR10M field is available.",why:"Each arrow points toward the direction the air is moving. The source WDIR10M values use the meteorological from-direction convention."},
    winddir:{title:"10-Meter Wind Direction",description:"Wind direction at 10 meters above ground, expressed in degrees true using the meteorological convention.",why:"The value identifies where the wind is coming from: 0°/360° is north, 90° is east, 180° is south, and 270° is west."},
    smoke:{title:"Near-Surface Smoke · Experimental",description:"Hourly near-surface smoke concentration guidance at 8 m above ground, displayed in µg/m³. Missing hours are unavailable and are never interpreted as zero smoke.",why:"This guidance helps show where model smoke may be concentrated near the surface. It is experimental and is not regulatory AQI."}
  };
  const reflectivityInterpretation=[["<20 dBZ","Little or no measurable precipitation"],["20–35 dBZ","Light precipitation or showers"],["35–45 dBZ","Moderate precipitation; convection may be developing"],["45–55 dBZ","Heavy precipitation and thunderstorms"],["55–65 dBZ","Strong thunderstorms; hail is possible"],[">65 dBZ","Very intense modeled convection; large hail is possible"]];
  const wrfInterpretations={
    refc:[["Composite reflectivity",reflectivityInterpretation]],
    refcuh75:[
      ["Composite reflectivity",reflectivityInterpretation],
      ["2–5 km updraft helicity",[["<25 m²/s²","Little organized rotating-updraft signal"],["25–75 m²/s²","Weak to moderate rotating-updraft signal"],["75–150 m²/s²","Strong rotating-updraft signal; displayed by this overlay"],["150–300 m²/s²","Very strong supercell-like signal"],[">300 m²/s²","Extreme modeled rotating updraft; verify with other guidance"]]]
    ],
    uh03:[["Hourly maximum 0–3 km UH",[["<25 m²/s²","Little organized low-level rotating-updraft signal"],["25–75 m²/s²","Weak to moderate signal"],["75–150 m²/s²","Strong signal; suggested display threshold begins at 75"],["150–300 m²/s²","Very strong supercell-like signal"],[">300 m²/s²","Extreme modeled low-level rotating updraft"]]]],
    runuh03:[["Run-to-date maximum 0–3 km UH",[["<25 m²/s²","Little accumulated rotating-updraft signal"],["25–75 m²/s²","Weak to moderate accumulated signal"],["75–150 m²/s²","Strong accumulated signal"],["150–300 m²/s²","Very strong accumulated signal"],[">300 m²/s²","Extreme run-maximum signal"]]]],
    mucape:[["MUCAPE",[["0–500 J/kg","Very weak instability"],["500–1,000 J/kg","Weak instability"],["1,000–2,000 J/kg","Moderate instability"],["2,000–3,000 J/kg","Strong instability"],["3,000–4,000 J/kg","Very strong instability"],[">4,000 J/kg","Extreme instability"]]]],
    sbcape:[["SBCAPE",[["0–500 J/kg","Very weak instability"],["500–1,000 J/kg","Weak instability"],["1,000–2,000 J/kg","Moderate instability"],["2,000–3,000 J/kg","Strong instability"],["3,000–4,000 J/kg","Very strong instability"],[">4,000 J/kg","Extreme instability"]]]],
    mucin:[["MUCIN",[["0 to −25 J/kg","Little inhibition"],["−25 to −50 J/kg","Weak cap"],["−50 to −100 J/kg","Moderate cap"],["−100 to −200 J/kg","Strong cap"],["<−200 J/kg","Very strong cap"]]]],
    sbcin:[["SBCIN",[["0 to −25 J/kg","Little inhibition"],["−25 to −50 J/kg","Weak cap"],["−50 to −100 J/kg","Moderate cap"],["−100 to −200 J/kg","Strong cap"],["<−200 J/kg","Very strong cap"]]]],
    srh01:[["0–1 km SRH",[["<100 m²/s²","Weak low-level rotation potential"],["100–200 m²/s²","Moderate potential"],["200–300 m²/s²","Strong potential"],["300–450 m²/s²","Very strong potential"],[">450 m²/s²","Exceptional modeled low-level rotation"]]]],
    srh03:[["0–3 km SRH",[["<150 m²/s²","Weak storm-relative rotation"],["150–300 m²/s²","Moderate"],["300–450 m²/s²","Strong"],["450–600 m²/s²","Very strong"],[">600 m²/s²","Extreme modeled rotation"]]]],
    bs06:[["0–6 km bulk shear",[["<20 kt","Pulse or weakly organized storms favored"],["20–30 kt","Multicell organization possible"],["30–40 kt","Organized multicells favored"],["40–50 kt","Supercell organization increasingly favored"],["50–70 kt","Strongly organized severe storms possible"],[">70 kt","Extreme deep-layer shear environment"]]]],
    maxuvv:[["Maximum updraft velocity",[["<5 m/s","Weak modeled ascent"],["5–10 m/s","Developing convective updraft"],["10–20 m/s","Strong thunderstorm updraft"],["20–30 m/s","Very strong severe-storm updraft"],[">30 m/s","Extreme modeled updraft; large-hail support possible"]]]],
    maxdvv:[["Maximum downdraft speed",[["<5 m/s","Weak modeled descent"],["5–10 m/s","Developing downdraft"],["10–20 m/s","Strong outflow potential"],["20–30 m/s","Damaging-wind potential"],[">30 m/s","Extreme modeled downdraft or downburst signal"]]]],
    lightning:[["Total flashes per grid cell · 15 minutes",[["0","No modeled lightning"],["0–0.01","Very low flash activity"],["0.01–0.05","Low activity"],["0.05–0.25","Active convection"],["0.25–0.50","High flash activity"],["0.50–1.00","Very high flash activity"],[">1.00","Extremely active modeled convection"]]]],
    apcp:[["Run-total liquid-equivalent precipitation",[["0–0.25 in","Light precipitation"],["0.25–1.00 in","Moderate precipitation"],["1–2 in","Heavy precipitation"],["2–4 in","Flooding may become possible"],[">4 in","Significant flooding concern; assess duration and local conditions"]]]],
    smoke:[["Near-surface concentration · µg/m³",[["1–10","Very light modeled smoke"],["10–50","Light to moderate modeled smoke"],["50–100","Elevated modeled smoke"],["100–200","High modeled smoke concentration"],[">200","Very high modeled smoke concentration"]]]]
  };
  let wrfProductLegends={};
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", preloaded = new Map();
  const MODEL_FRAME_PRELOAD_CONCURRENCY = 4;
  let preloadQueue = [], activePreloads = 0, preloadGeneration = 0, preloadTotal = 0, preloadCompleted = 0, preloadRunTotal = 0, preloadWindowed = false;
  let catalog = null, catalogResponse = null, frameRequestId = 0, frameLoadTimer = 0, followLatestRun = true, lastHrrrProduct = "refc", lastHrrrRegion = localStorage.getItem("zasnet-hrrr-region") || region.value, rebuiltProductMenuForRun = "", modelAnimationTimer = 0;
  const frameRetryCounts = new Map();
  let heldForecastArrow = "", heldArrowFrame = 0, heldArrowStartedAt = 0, heldArrowLastStepAt = 0;
  modelAnimationSpeed.value = localStorage.getItem("zasnet-model-animation-speed") || "900";
  if (modelAnimationSpeed.selectedIndex < 0) modelAnimationSpeed.value = "900";
  const query = new URLSearchParams(location.search);
  hafsDomain.value=query.get("domain")==="parent"?"parent":"storm";
  const selectedSourceName=()=>modelSource.value==="ncep"?"ZASNetwork WRF Experimental":modelSource.value==="gfs"?"NOAA GFS":["hfsa","hfsb"].includes(modelSource.value)?`NOAA ${modelSource.value.toUpperCase()}`:"HRRR";
  document.body.classList.add("models-fast-viewer");
  const selectionSummary = document.createElement("section");
  selectionSummary.className = "model-selection-summary";
  selectionSummary.setAttribute("aria-label", "Current model selection");
  selectionSummary.innerHTML = `<button type="button" id="modelFullscreenButton" aria-pressed="false"><span aria-hidden="true">⛶</span> Full screen</button>`;
  viewer.querySelector(".model-display").before(selectionSummary);
  const fullscreenButton = selectionSummary.querySelector("#modelFullscreenButton");
  const productPickerButton = document.createElement("button");
  productPickerButton.type = "button";
  productPickerButton.id = "productPickerButton";
  productPickerButton.setAttribute("aria-haspopup", "dialog");
  productPickerButton.innerHTML = `<span>Choose product</span><small>Search categories</small>`;
  product.parentElement.prepend(productPickerButton);
  product.classList.add("native-product-select");
  const productDialog = document.createElement("dialog");
  productDialog.id = "modelProductDialog";
  productDialog.setAttribute("aria-labelledby", "modelProductDialogTitle");
  productDialog.innerHTML = `<header><div><span>Model products</span><h2 id="modelProductDialogTitle">Choose a map product</h2></div><button type="button" data-close-product aria-label="Close product picker">×</button></header><label class="model-product-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search reflectivity, wind, smoke…" aria-label="Search model products" autocomplete="off"></label><div class="model-product-results"></div>`;
  document.body.append(productDialog);
  const productSearch = productDialog.querySelector("input"), productResults = productDialog.querySelector(".model-product-results");
  const recentKey = "zasnet-recent-model-products";
  const recentProducts = () => { try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; } };
  const rememberProduct = value => { try { localStorage.setItem(recentKey, JSON.stringify([value, ...recentProducts().filter(item => item !== value)].slice(0, 5))); } catch { /* optional */ } };
  function syncSelectionSummary() {
    const sourceName = modelSource.value === "ncep" ? `WRF ${catalog?.domain || ""}`.trim() : modelSource.value === "gfs" ? "GFS" : ["hfsa","hfsb"].includes(modelSource.value)?modelSource.value.toUpperCase():"HRRR";
    const initialized = catalog?.runTime ? new Date(catalog.runTime) : null;
    const valid = initialized && hour.value ? new Date(initialized.getTime() + Number(hour.value) * 3_600_000) : null;
    const values = {
      model: sourceName,
      run: initialized ? `${String(initialized.getUTCHours()).padStart(2, "0")}Z · ${initialized.toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" })}` : "Loading…",
      product: product.selectedOptions[0]?.textContent?.trim() || "Loading…",
      region: region.selectedOptions[0]?.textContent?.trim() || "Full United States",
      valid: valid ? valid.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Loading…"
    };
    productPickerButton.querySelector("span").textContent = values.product;
  }
  function renderProductPicker() {
    const term = productSearch.value.trim().toLowerCase(), recent = recentProducts();
    const groups = [...product.querySelectorAll("optgroup")].map(group => ({ label: group.label, options: [...group.querySelectorAll("option")].filter(option => !option.hidden && !option.disabled && option.value && option.textContent.toLowerCase().includes(term)) })).filter(group => group.options.length);
    productResults.replaceChildren();
    const addGroup = (label, options) => {
      if (!options.length) return;
      const section = document.createElement("section"), heading = document.createElement("h3");
      heading.textContent = label; section.append(heading);
      options.forEach(option => { const button = document.createElement("button"); button.type = "button"; button.dataset.product = option.value; button.className = option.value === product.value ? "is-selected" : ""; button.innerHTML = `<span>${option.textContent}</span><small>${option.value === product.value ? "Selected" : "Available"}</small>`; section.append(button); });
      productResults.append(section);
    };
    if (!term) addGroup("Recently used", recent.map(value => [...product.options].find(option => option.value === value && !option.hidden && !option.disabled)).filter(Boolean));
    groups.forEach(group => addGroup(group.label, group.options));
    if (!productResults.children.length) { const empty = document.createElement("p"); empty.className = "model-product-empty"; empty.textContent = "No available products match that search."; productResults.append(empty); }
  }
  productPickerButton.addEventListener("click", () => { productSearch.value = ""; renderProductPicker(); productDialog.showModal(); window.setTimeout(() => productSearch.focus(), 40); });
  productDialog.querySelector("[data-close-product]").addEventListener("click", () => productDialog.close());
  productDialog.addEventListener("click", event => { if (event.target === productDialog) productDialog.close(); const choice = event.target.closest("[data-product]"); if (!choice) return; product.value = choice.dataset.product; rememberProduct(product.value); product.dispatchEvent(new Event("change")); productDialog.close(); });
  productSearch.addEventListener("input", renderProductPicker);
  fullscreenButton.addEventListener("click", () => {
    const active = !document.body.classList.contains("model-map-fullscreen");
    document.body.classList.toggle("model-map-fullscreen", active);
    fullscreenButton.setAttribute("aria-pressed", String(active));
    fullscreenButton.innerHTML = `<span aria-hidden="true">${active ? "×" : "⛶"}</span> ${active ? "Exit" : "Full screen"}`;
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
  });
  modelSource.value = ["hrrr","ncep","gfs","hfsa","hfsb"].includes(query.get("source")) ? query.get("source") : "ncep";
  region.value = [...region.options].some((option) => option.value === query.get("region")) ? query.get("region") : "";
  product.value = [...product.options].some((option) => option.value === query.get("product")) ? query.get("product") : "refc";

  function syncProductGroupVisibility(){
    product.querySelectorAll("optgroup").forEach((group)=>{
      group.hidden=![...group.querySelectorAll("option")].some((option)=>!option.hidden);
    });
  }
  function setProductAvailability(option,available){
    option.hidden=!available;
    option.disabled=!available;
    option.toggleAttribute("hidden",!available);
    option.toggleAttribute("disabled",!available);
    option.style.display=available?"":"none";
  }
  function syncWrfSourceAndWarning(){
    if(modelSource.value!=="ncep")return;
    if(product.value==="smoke"){
      sourceLabel.textContent=catalog?.products?.smoke?.sourceModel||"NOAA HRRR-Smoke / RAP-Smoke";
      guidanceNote.textContent="Experimental near-surface smoke guidance—not regulatory AQI.";
    }else{
      sourceLabel.textContent="ZNWS-WRF";
      guidanceNote.textContent=wrfProductInfo[product.value]?.description||"Experimental locally produced WRF model guidance.";
    }
  }
  async function syncRegionForWrfRun(run){
    if(modelSource.value!=="ncep"||!run?.domain)return false;
    try{
      const response=await fetch("/api/public/map-regions.json",{cache:"no-store"});
      if(!response.ok)return false;
      const data=await response.json();
      const sameBounds=(candidate)=>{
        const requested=run.bounds,values=candidate?.bbox;
        return requested&&Array.isArray(values)&&[
          [requested.west,values[0]],[requested.south,values[1]],[requested.east,values[2]],[requested.north,values[3]]
        ].every(([a,b])=>Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<0.02);
      };
      const linked=(data.regions||[]).find((candidate)=>(candidate.domains||[candidate.domain]).includes(run.domain)&&sameBounds(candidate));
      if(!linked)return false;
      let option=[...region.options].find((entry)=>entry.value===linked.id);
      if(!option){
        let group=region.querySelector('optgroup[data-temporary-regions="true"]');
        if(!group){
          group=document.createElement("optgroup");
          group.label="Active mesoscale zones";
          group.dataset.temporaryRegions="true";
          region.prepend(group);
        }
        option=new Option(`${linked.label} · temporary`,linked.id);
        option.dataset.expiresAt=linked.expiresAt;
        option.dataset.fallback=linked.fallback||"";
        option.dataset.domain=linked.domain||"";
        group.append(option);
      }
      syncRegionMenuForSource();
      if(region.value===linked.id)return false;
      region.value=linked.id;
      return true;
    }catch{return false;}
  }

  function syncRegionMenuForSource(){
    const wrf=modelSource.value==="ncep",gfs=modelSource.value==="gfs",hafs=["hfsa","hfsb"].includes(modelSource.value),gfsUsOnly=gfs&&product.value==="temperature";
    const hrrrRegions=new Set(["","gfs-northeast","gfs-southeast","gfs-northwest","gfs-southwest","arizona","wyoming","wisconsin","tennessee","philadelphia-dma"]);
    const usRegionGroup=region.querySelector('optgroup[data-gfs-us="true"]');
    if(usRegionGroup)usRegionGroup.label=gfs?"GFS US regions":"US regional views";
    [...region.options].forEach((option)=>{
      const temporary=option.closest('optgroup[data-temporary-regions="true"]')!==null;
      const gfsOnly=option.closest('optgroup[data-gfs-only="true"]')!==null;
      const gfsUs=option.closest('optgroup[data-gfs-us="true"]')!==null;
      const hafsStorm=option.closest('optgroup[data-hafs-storms="true"]')!==null;
      // HRRR is a fixed CONUS grid, so active temporary zones can be cropped
      // immediately from the current run just like permanent regional views.
      option.hidden=hafs?!hafsStorm:gfs?option.value!==""&&(gfsUsOnly?!gfsUs:!gfsOnly):wrf?!temporary:(!temporary&&!hrrrRegions.has(option.value))||hafsStorm;
      option.disabled=option.hidden;
    });
    region.querySelectorAll("optgroup").forEach((group)=>{
      group.hidden=[...group.querySelectorAll("option")].every((option)=>option.hidden);
    });
    if(hafs){if(region.selectedOptions[0]?.hidden)region.value=[...region.options].find((option)=>!option.hidden)?.value||"";
    }else if(gfs){if(region.selectedOptions[0]?.hidden)region.value="";
    }else if(!wrf){
      const restored=[...region.options].find((option)=>option.value===lastHrrrRegion&&!option.hidden&&!option.disabled);
      region.value=restored?restored.value:"";
    }else if(region.selectedOptions[0]?.hidden){
      region.value="";
    }
  }

  function syncExperimentalInfo() {
    const isWrf=modelSource.value==="ncep",info = isWrf?wrfProductInfo[product.value]:experimentalInfo[product.value];
    infoButton.hidden = !info;
    infoButton.textContent=isWrf?"WRF product guide":"Info";
    if (!info) {
      sideGuide.hidden=true;
      viewer.classList.remove("guide-open");
      return;
    }
    infoTitle.textContent = info.title;
    if(isWrf){
      const interpretation=(wrfInterpretations[product.value]||[]).map(([title,rows])=>`<section class="product-interpretation"><h3>${title}</h3><div class="interpretation-table">${rows.map(([value,meaning])=>`<div><strong>${value}</strong><span>${meaning}</span></div>`).join("")}</div></section>`).join("");
      infoBody.innerHTML=`<h3>Description</h3><p>${info.description}</p><h3>Why it matters</h3><p>${info.why}</p>${interpretation}`;
      const legend=wrfProductLegends[product.value],stops=legend?.stops||[];
      infoScale.hidden=!stops.length;
      infoScale.style.setProperty("--scale-columns",String(stops.length||1));
      infoScale.innerHTML=stops.map(([value,color])=>`<span style="background:${color}">${value}</span>`).join("");
      infoCaveat.innerHTML=legend?`<strong>Map color table:</strong> ${legend.legend}${legend.legendNote?` · ${legend.legendNote}`:""}`:"Color-table legend is loading…";
    }else{
      infoBody.innerHTML = `<p>${info.summary}</p><h3>How to read it</h3><p>${info.read}</p><h3>What goes into it</h3><ul>${info.inputs.map((input) => `<li>${input}</li>`).join("")}</ul>`;
      infoScale.hidden = product.value === "zasStormMode";
      infoScale.style.setProperty("--scale-columns", String(info.scale.length));
      infoScale.innerHTML = info.scale.map(([value,color,label]) => `<span style="background:${color}">${value}<br><small>${label}</small></span>`).join("");
      infoCaveat.innerHTML = `<strong>Limitations:</strong> ${info.caveat} All ZASNet experimental guidance is unofficial and should be used with official NOAA, SPC and NWS information.`;
      sourceLabel.textContent = product.value === "zasFloodV2" ? "NOAA HRRR / MRMS / NWM · NIFC" : "NOAA HRRR + ZASNet derived";
      guidanceNote.textContent = info.summary;
    }
    if(isWrf){
      sideGuideTitle.textContent=infoTitle.textContent;
      const compactTables=(wrfInterpretations[product.value]||[]).map(([title,rows])=>`<section class="product-interpretation"><h3>${title}</h3><div class="interpretation-table">${rows.map(([value,meaning])=>`<div><strong>${value}</strong><span>${meaning}</span></div>`).join("")}</div></section>`).join("");
      sideGuideBody.innerHTML=`<p class="guide-summary">${info.description}</p>${compactTables}`;
      sideGuideScale.hidden=infoScale.hidden;
      sideGuideScale.style.setProperty("--scale-columns",infoScale.style.getPropertyValue("--scale-columns")||"1");
      sideGuideScale.innerHTML=infoScale.innerHTML;
      sideGuideCaveat.innerHTML=infoCaveat.innerHTML;
    }else{
      sideGuide.hidden=true;
      viewer.classList.remove("guide-open");
    }
  }
  syncExperimentalInfo();

  function syncModelSource() {
    const ncep=modelSource.value==="ncep",gfs=modelSource.value==="gfs",hafs=["hfsa","hfsb"].includes(modelSource.value);
    viewer.classList.toggle("has-hafs-domain",hafs);
    if(hafs){
      hafsDomainControl.hidden=false;
      const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");
      if(regionLabel)regionLabel.textContent="Storm";
      let combinedOption=product.querySelector('option[value="refcmslp"]');
      if(!combinedOption){
        combinedOption=new Option("Composite reflectivity + MSLP","refcmslp");
        const refcOption=product.querySelector('option[value="refc"]');
        refcOption?.after(combinedOption);
      }
      const hafsProducts=["refc","refcmslp","wind","pressure","temperature","simir","simwv"];
      [...product.options].forEach((option)=>setProductAvailability(option,hafsProducts.includes(option.value)));
      if(!hafsProducts.includes(product.value))product.value="refc";
      product.disabled=false;syncProductGroupVisibility();syncExperimentalInfo();sourceLabel.textContent=`NOAA ${modelSource.value.toUpperCase()}`;guidanceNote.textContent="Storm-centered HAFS tropical guidance. The map follows the selected active system; use official NHC/JTWC forecasts for decisions.";compareToggle.checked=false;compareToggle.disabled=true;compareProduct.disabled=true;
    }else if(gfs){
      const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");
      if(regionLabel)regionLabel.textContent="Region";
      hafsDomainControl.hidden=true;
      const gfsProducts=["refc","apcp","pcpn","temperature","cloud","pwat"];
      let gfsSynopticGroup=product.querySelector('optgroup[data-gfs-synoptic="true"]')||[...product.querySelectorAll("optgroup")].find((group)=>group.label==="GFS · Synoptic");
      if(!gfsSynopticGroup){gfsSynopticGroup=document.createElement("optgroup");gfsSynopticGroup.label="GFS · Synoptic";gfsSynopticGroup.dataset.gfsSynoptic="true";product.prepend(gfsSynopticGroup);}
      gfsSynopticGroup.dataset.gfsSynoptic="true";
      const synopticOption=product.querySelector('option[value="pcpn"]');if(synopticOption&&synopticOption.parentElement!==gfsSynopticGroup)gfsSynopticGroup.append(synopticOption);
      [...product.options].forEach((option)=>setProductAvailability(option,gfsProducts.includes(option.value)));
      const ref1kmOption=product.querySelector('option[value="ref1km"]');if(ref1kmOption){ref1kmOption.hidden=true;ref1kmOption.disabled=true;ref1kmOption.style.display="none";}
      if(!gfsProducts.includes(product.value))product.value="refc";
      product.disabled=false;syncProductGroupVisibility();syncExperimentalInfo();sourceLabel.textContent="NOAA GFS 0.25°";guidanceNote.textContent=product.value==="temperature"?"Full-US GFS 2-meter temperature in °F with sampled map values through F384.":product.value==="pcpn"?"Six-hour average precipitation rate with MSLP and 1000–500 mb thickness through F384.":product.value==="apcp"?"Run-total GFS quantitative precipitation forecast in inches through F384.":product.value==="cloud"?"GFS total atmospheric cloud cover in percent through F384.":product.value==="pwat"?"GFS total-column precipitable water in inches through F384.":"Global model composite reflectivity through F384.";compareToggle.checked=false;compareToggle.disabled=true;compareProduct.disabled=true;
    }else if(ncep){
      const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");
      if(regionLabel)regionLabel.textContent="Region";
      hafsDomainControl.hidden=true;
      if(product.value!=="refc") lastHrrrProduct=product.value;
      const wrfProducts=["zasSevere","zasTornado","zasWind","zasConfidence","zasStormMode","zasFlood","zasFloodV2","refc","ref1km","refcuh75","uh03","runuh03","mucape","mucin","sbcape","sbcin","srh01","srh03","bs06","lightning","maxuvv","maxdvv","temperature","dewpoint","humidity","wind","winddir","gust","pressure","visibility","cloud","ceiling","prate","apcp","preciptype","pwat","snowwe","fzra","smoke"];
      [...product.options].forEach((option)=>setProductAvailability(option,wrfProducts.includes(option.value)));
      if(!wrfProducts.includes(product.value))product.value="refc";
      syncProductGroupVisibility();
      product.disabled=false;syncExperimentalInfo();
      syncWrfSourceAndWarning();
      if(!region.value&&!query.has("region")) region.value="southern-plains";
    }else{
      const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");
      if(regionLabel)regionLabel.textContent="Region";
      hafsDomainControl.hidden=true;
      [...product.options].forEach((option)=>setProductAvailability(option,!["pressure","uh03","runuh03","pcpn"].includes(option.value)));
      syncProductGroupVisibility();
      product.disabled=false;
      if([...product.options].some((option)=>option.value===lastHrrrProduct&&!option.hidden)) product.value=lastHrrrProduct;
      else if(product.selectedOptions[0]?.hidden)product.value="refc";
      syncExperimentalInfo();
      compareToggle.disabled=false;compareProduct.disabled=false;
    }
  }
  syncModelSource();

  function leadLabel(forecastHour) {
    const minutes=Math.round(Number(forecastHour)*60),hours=Math.floor(minutes/60);
    return minutes%60 ? `F${String(hours).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}` : `F${String(hours).padStart(2,"0")}`;
  }
  function syncWrfProductAvailability(){
    if(!catalog?.domain&&modelSource.value!=="ncep")return;
    const wrfProducts=["zasSevere","zasTornado","zasWind","zasConfidence","zasStormMode","zasFlood","zasFloodV2","refc","ref1km","refcuh75","uh03","runuh03","mucape","mucin","sbcape","sbcin","srh01","srh03","bs06","lightning","maxuvv","maxdvv","temperature","dewpoint","humidity","wind","winddir","gust","pressure","visibility","cloud","ceiling","prate","apcp","preciptype","pwat","snowwe","fzra","smoke"];
    wrfProducts.forEach((value)=>{
      const option=product.querySelector(`option[value="${value}"]`);
      const publishedHours=catalog.productForecastHours?.[value];
      const available=Array.isArray(publishedHours)?publishedHours.length>0:Boolean(catalog.products?.[value]);
      if(option)setProductAvailability(option,available);
    });
    syncProductGroupVisibility();
    if(catalog.run&&rebuiltProductMenuForRun!==catalog.run){
      rebuiltProductMenuForRun=catalog.run;
      const parent=product.parentNode,next=product.nextSibling;
      parent.removeChild(product);
      parent.insertBefore(product,next);
    }
    if(product.selectedOptions[0]?.hidden)product.value=wrfProducts.find((value)=>catalog.products?.[value])||"refc";
    syncExperimentalInfo();
  }

  function labelFor(forecastHour) {
    const valid = new Date(Date.parse(catalog.runTime) + forecastHour * 3_600_000);
    return `${leadLabel(forecastHour)} · ${valid.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;
  }
  function frameUrl(forecastHour) {
    // Beta frames use one canonical timezone so a pre-generated artifact can
    // serve every visitor. The interactive caption remains in browser-local time.
    const params = new URLSearchParams({ run: catalog.run, fh: String(forecastHour), product: product.value, region: region.value, tz: "UTC" });
    if(["hfsa","hfsb"].includes(modelSource.value)){params.set("domain",hafsDomain.value);params.set("rev","hafs-parent-widecrop-6");}
    return `/api/public/models/${modelSource.value}/map.webp?${params}`;
  }
  function comparisonUrl(forecastHour) { const params = new URLSearchParams({ run: catalog.run, fh: String(forecastHour), product: compareProduct.value, region: region.value, tz: "UTC" }); return `/api/public/models/hrrr/map.webp?${params}`; }
  function syncButtons() {
    previous.disabled = hour.selectedIndex <= 0;
    next.disabled = hour.selectedIndex < 0 || hour.selectedIndex >= hour.options.length - 1;
    timeline.max=String(Math.max(0,hour.options.length-1));
    timeline.value=String(Math.max(0,hour.selectedIndex));
    timeline.disabled=hour.options.length<2||!hour.value;
    modelPlayButton.disabled = timeline.disabled;
    if (mobileToolbar) {
      mobileTimeline.max = timeline.max; mobileTimeline.value = timeline.value; mobileTimeline.disabled = timeline.disabled;
      const label = mobileToolbar.querySelector("[data-mobile-valid-time]");
      if (label) label.textContent = hour.selectedOptions[0]?.textContent?.split(" · ")[0] || "Awaiting frames";
    }
  }
  function setModelPlaying(playing) {
    window.clearInterval(modelAnimationTimer);
    modelAnimationTimer = 0;
    if (playing && hour.options.length > 1 && hour.value) {
      modelPlayButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
      modelPlayButton.setAttribute("aria-label", "Pause forecast animation");
      modelPlayButton.setAttribute("aria-pressed", "true");
      modelAnimationTimer = window.setInterval(() => {
        hour.selectedIndex = hour.selectedIndex >= hour.options.length - 1 ? 0 : hour.selectedIndex + 1;
        showFrame();
      }, Number(modelAnimationSpeed.value));
    } else {
      modelPlayButton.innerHTML = '<span aria-hidden="true">▶</span> Play';
      modelPlayButton.setAttribute("aria-label", "Play forecast animation");
      modelPlayButton.setAttribute("aria-pressed", "false");
    }
  }
  function runPreloadQueue() {
    while (activePreloads < MODEL_FRAME_PRELOAD_CONCURRENCY && preloadQueue.length) {
      const entry = preloadQueue.shift();
      if (entry.generation !== preloadGeneration || preloaded.has(entry.url)) continue;
      const preload = new Image();
      preload.decoding = "async";
      preload.fetchPriority = activePreloads < 2 ? "auto" : "low";
      preloaded.set(entry.url, preload); activePreloads += 1; updateTimelineCacheRail();
      const complete = (success) => {
        activePreloads -= 1;
        if (success && entry.generation === preloadGeneration) {
          preloadCompleted += 1;
          updatePreloadStatus();
        } else updateTimelineCacheRail();
        runPreloadQueue();
      };
      preload.onload = () => complete(true);
      preload.onerror = () => { preloaded.delete(entry.url); complete(false); };
      preload.src = entry.url;
    }
  }
  function updatePreloadStatus() {
    updateTimelineCacheRail();
    const runSuffix = preloadRunTotal && preloadRunTotal !== preloadTotal ? ` · ${preloadRunTotal} run hours available` : "";
    if (preloadWindowed) {
      preloadStatus.textContent = preloadCompleted >= preloadTotal
        ? `Nearby cache ready · ${preloadTotal} frames · ${preloadRunTotal} hours available`
        : `Caching nearby frames ${preloadCompleted}/${preloadTotal} · ${preloadRunTotal} hours available`;
      return;
    }
    preloadStatus.textContent = preloadCompleted >= preloadTotal
      ? `Preloaded ${preloadTotal}/${preloadTotal}${runSuffix}`
      : `Preloading ${preloadCompleted}/${preloadTotal}${runSuffix}`;
  }
  function updateTimelineCacheRail(){
    const options=[...hour.options].filter((option)=>option.value!=="");
    if(!options.length||!catalog){timeline.style.removeProperty("--timeline-cache-gradient");timelineCacheLabel.textContent="0 / 0 cached";return;}
    let readyCount=0,pendingCount=0;
    const segments=options.map((option,index)=>{
      const cached=preloaded.get(frameUrl(Number(option.value))),ready=Boolean(cached?.complete&&cached.naturalWidth>0),pending=Boolean(cached&&!ready);
      if(ready)readyCount+=1;else if(pending)pendingCount+=1;
      const color=ready?"#82976f":pending?"#b7c5ce":"#d8e5ed",start=(index/options.length*100).toFixed(3),end=((index+1)/options.length*100).toFixed(3);
      return `${color} ${start}%,${color} ${end}%`;
    });
    timeline.style.setProperty("--timeline-cache-gradient",`linear-gradient(90deg,${segments.join(",")})`);
    timelineCacheLabel.textContent=`${readyCount} / ${options.length} cached${pendingCount?` · ${pendingCount} loading`:""}`;
  }
  function resetPreloads() {
    preloadGeneration += 1; preloadQueue = []; preloaded.clear(); preloadTotal = 0; preloadCompleted = 0; preloadRunTotal = 0; preloadWindowed = false;
    updateTimelineCacheRail();
    preloadStatus.textContent = "Preload waiting";
  }
  function preloadAllForecastHours() {
    const generation = preloadGeneration;
    const options = [...hour.options].filter((option) => option.value);
    const selectedIndex = Math.max(0, options.indexOf(hour.selectedOptions[0]));
    // Load the selected frame first, then progressively cache the complete
    // selected-product timeline so animation never outruns its frame window.
    const preloadLimit = options.length;
    preloadRunTotal = new Set((catalog?.forecastHours || []).map(Number).filter(Number.isFinite)).size || options.length;
    preloadWindowed = preloadLimit < options.length;
    const nearbyIndexes = [selectedIndex];
    for (let distance = 1; nearbyIndexes.length < Math.min(preloadLimit, options.length); distance += 1) {
      if (selectedIndex + distance < options.length) nearbyIndexes.push(selectedIndex + distance);
      if (nearbyIndexes.length >= preloadLimit) break;
      if (selectedIndex - distance >= 0) nearbyIndexes.push(selectedIndex - distance);
    }
    const nearbyOptions = nearbyIndexes.map((index) => options[index]).filter(Boolean);
    const retainedUrls = new Set(nearbyOptions.map((option) => frameUrl(Number(option.value))));
    for (const [url, cached] of preloaded) {
      if (retainedUrls.has(url) || !cached.complete) continue;
      preloaded.delete(url);
    }
    const preloadReady = (url) => {
      const cached=preloaded.get(url);
      return Boolean(cached?.complete&&cached.naturalWidth>0);
    };
    preloadTotal = nearbyOptions.length;
    preloadCompleted = Math.min(preloadTotal, 1 + nearbyOptions.filter((option) => option !== hour.selectedOptions[0] && preloadReady(frameUrl(Number(option.value)))).length);
    updatePreloadStatus();
    preloadQueue = nearbyOptions
      .filter((option) => option.value && option !== hour.selectedOptions[0])
      .filter((option) => !preloaded.has(frameUrl(Number(option.value))))
      .map((option) => ({ url: frameUrl(Number(option.value)), generation }));
    runPreloadQueue();
  }
  function showFrame() {
    if (!catalog || !hour.value) return;
    const forecastHour = Number(hour.value), url = frameUrl(forecastHour), requestId = ++frameRequestId;
    const sourceName=modelSource.value==="ncep"?"ZASNetwork WRF Experimental":modelSource.value==="gfs"?"NOAA GFS":["hfsa","hfsb"].includes(modelSource.value)?`NOAA ${modelSource.value.toUpperCase()}`:"HRRR";
    const hasImage = Boolean(image.getAttribute("src"));
    syncSelectionSummary();
    // Always surface a loading state on product/run/hour changes. Leaving the
    // previous SVG visible with only a status pill made the viewer feel "stuck"
    // on an old frame (especially after smoke cache rebuilds).
    window.clearTimeout(frameLoadTimer);
    imageStatus.hidden = false;
    imageStatus.textContent = hasImage
      ? `Updating ${sourceName} frame…`
      : `Building ${sourceName} model frame…`;
    image.classList.remove("is-loaded");
    status.classList.remove("is-error");
    status.textContent = hasImage ? "Loading next frame" : "Loading";
    openMap.href = url; syncButtons();
    caption.textContent = `${sourceName} ${new Date(catalog.runTime).getUTCHours().toString().padStart(2,"0")}Z run · ${labelFor(forecastHour)} · ${product.selectedOptions[0].textContent}`;
    const state = new URL(location.href);
    state.searchParams.set("fh", String(forecastHour));
    state.searchParams.set("product", product.value);
    state.searchParams.set("run", catalog.run);
    state.searchParams.set("source",modelSource.value);
    // Preserve an explicit Full United States selection as `region=`. An
    // absent parameter means this visitor has not chosen a view yet.
    state.searchParams.set("region", region.value);
    if(["hfsa","hfsb"].includes(modelSource.value))state.searchParams.set("domain",hafsDomain.value);else state.searchParams.delete("domain");
    history.replaceState({}, "", state);
    const cached=preloaded.get(url),cachedReady=Boolean(cached?.complete&&cached.naturalWidth>0);
    const pending = cachedReady ? cached : new Image();
    if(!cachedReady){
      pending.decoding = "async";
      pending.fetchPriority = "high";
      // Retain the visible frame in the same cache used by animation so
      // returning to it is instant and the preload queue cannot duplicate it.
      preloaded.set(url, pending);updateTimelineCacheRail();
      pending.src = url;
    }
    const comparePending = compareToggle.checked ? new Image() : null;
    if (comparePending) { comparePending.src = comparisonUrl(forecastHour); compareImage.hidden = false; compareImage.style.display = "block"; image.closest(".image-frame").classList.add("compare-active"); }
    else { compareImage.hidden = true; compareImage.style.display = "none"; image.closest(".image-frame").classList.remove("compare-active"); }
    const fail = (message) => {
      if (preloaded.get(url) === pending && !pending.naturalWidth) preloaded.delete(url);
      if (requestId !== frameRequestId) return;
      window.clearTimeout(frameLoadTimer);
      imageStatus.hidden = false;
      imageStatus.textContent = message;
      status.textContent = "Unavailable";
      status.classList.add("is-error");
    };
    const commit = () => {
      if (requestId !== frameRequestId) return;
      window.clearTimeout(frameLoadTimer);
      frameRetryCounts.delete(url);
      image.src = url;
      if (comparePending) compareImage.src = comparePending.src;
      image.classList.add("is-loaded");
      imageStatus.hidden = true;
      const validTime = new Date(Date.parse(catalog.runTime) + forecastHour * 3_600_000);
      status.textContent = `Valid ${validTime.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
      status.title = `${followLatestRun ? "Latest" : "Previous"} run initialized ${new Date(catalog.runTime).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;
      preloadAllForecastHours();
    };
    const retryOrFail = () => {
      const retries = frameRetryCounts.get(url) || 0;
      if (retries < 1 && requestId === frameRequestId) {
        frameRetryCounts.set(url, retries + 1);
        if (preloaded.get(url) === pending) preloaded.delete(url);
        imageStatus.hidden = false;
        imageStatus.textContent = `Retrying ${sourceName} frame…`;
        status.textContent = "Retrying";
        window.setTimeout(() => {
          if (requestId === frameRequestId) showFrame();
        }, 1200);
        return;
      }
      fail(`This ${sourceName} frame is temporarily unavailable.`);
    };
    // Smoke rebuilds can exceed a minute on a cold cache; give other products less time.
    const loadTimeoutMs = product.value === "smoke" ? 120_000 : 45_000;
    frameLoadTimer = window.setTimeout(() => {
      fail(`This ${sourceName} frame is taking longer than expected. Switch products or try again in a moment.`);
    }, loadTimeoutMs);
    if(cachedReady)commit();
    else if (pending.decode) pending.decode().then(commit).catch(retryOrFail);
    else {
      pending.onload = commit;
      pending.onerror = retryOrFail;
    }
  }
  function step(delta, { wrap = false } = {}) {
    let target = hour.selectedIndex + delta;
    if (wrap && hour.options.length) {
      if (target < 0) target = hour.options.length - 1;
      if (target >= hour.options.length) target = 0;
    }
    if (target < 0 || target >= hour.options.length) return;
    hour.selectedIndex = target; showFrame();
  }
  function availableHours() {
    const minimum = Number(catalog.products?.[product.value]?.minimumHour || 0);
    const productHours = product.value==="smoke"
      ? (catalog.productForecastHours?.smoke||[])
      : (catalog.productForecastHours?.[product.value] || catalog.forecastHours);
    return productHours.filter((value) => value >= minimum);
  }
  function refreshHourChoices(preferred) {
    const hours = availableHours();
    if (!hours.length) {
      hour.innerHTML = `<option value="">Awaiting this product…</option>`;
      imageStatus.hidden = false;
      imageStatus.textContent = product.value==="smoke"
        ? "Near-surface smoke is not available for this run. Missing hours are not treated as zero smoke."
        : `This product is still publishing for the latest ${selectedSourceName()} run.`;
      syncButtons();
      return;
    }
    hour.innerHTML = hours.map((value) => `<option value="${value}">${labelFor(value)}</option>`).join("");
    hour.value = String(hours.includes(preferred) ? preferred : hours[0]);
    syncButtons();
  }
  async function loadCatalog(initial = false) {
    try {
      const source=modelSource.value;
      const response = await fetch(`/api/public/models/${source}/latest.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if(!String(response.headers.get("content-type")||"").toLowerCase().includes("application/json"))throw new Error("The model catalog returned a non-JSON response");
      const latest = await response.json(), runs = latest.runs?.length ? latest.runs : [latest], previousRun = catalog?.run, preferred = initial ? Number(query.get("fh")) : Number(hour.value);
      catalogResponse = latest;
      const requestedRun = initial ? query.get("run") : previousRun;
      const requestedRegion=initial?query.get("region"):region.value;
      if(["hfsa","hfsb"].includes(source)){
        region.querySelector('optgroup[data-hafs-storms="true"]')?.remove();
        const stormGroup=document.createElement("optgroup");stormGroup.label="Active storms";stormGroup.dataset.hafsStorms="true";
        (latest.storms||[]).filter((storm)=>storm&&typeof storm.name==="string"&&storm.name.length<=80&&!/[<>\r\n]/.test(storm.name)&&new RegExp(`^hafs-${source}-[0-9]{2}[a-z]$`,"i").test(String(storm.region||""))).forEach((storm)=>stormGroup.append(new Option(storm.name,storm.region)));
        if(!stormGroup.querySelector("option"))throw new Error("The HAFS catalog contained no valid storms");
        region.prepend(stormGroup);syncRegionMenuForSource();
        const stormOptions=[...stormGroup.querySelectorAll("option")];
        if(stormOptions.some((option)=>option.value===requestedRegion))region.value=requestedRegion;else region.value=latest.region||stormOptions[0]?.value||"";
        const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");if(regionLabel)regionLabel.textContent="Storm";
      }else{const regionLabel=region.closest("label")?.querySelector(":scope > span:first-child");if(regionLabel)regionLabel.textContent="Region";}
      const requestedEntry=runs.find((entry)=>entry.run===requestedRun&&(!["hfsa","hfsb"].includes(source)||entry.region===region.value));
      const preferredDomain=requestedEntry?.domain||catalog?.domain||(source==="ncep"?"MESO1":"");
      const latestPreferred=["hfsa","hfsb"].includes(source)
        ? runs.find((entry)=>entry.region===region.value)||runs[0]
        : source==="ncep"
        ? runs.find((entry)=>entry.domain===preferredDomain)||runs[0]
        : runs.find((entry)=>entry.run===latest.preferredRun)||runs[0];
      if (initial && requestedEntry) followLatestRun = requestedEntry.run === latestPreferred.run;
      const selected = followLatestRun ? latestPreferred : requestedEntry || latestPreferred;
      if (!runs.some((entry) => entry.run === requestedRun)) followLatestRun = true;
      const changed = !catalog || selected.run !== catalog.run || selected.forecastHours.join(",") !== catalog.forecastHours.join(",");
      const shouldSyncRegion=initial||selected.run!==previousRun;
    catalog = { ...selected, products: selected.products||latest.products };
    syncWrfProductAvailability();
      syncWrfSourceAndWarning();
      if(shouldSyncRegion)await syncRegionForWrfRun(catalog);
      const runOption=(entry,isLatest)=>{
        const initialization = new Date(entry.runTime);
        const cycle=String(initialization.getUTCHours()).padStart(2,"0"),month=initialization.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"}).toUpperCase(),day=String(initialization.getUTCDate()).padStart(2,"0");
        const label = `${cycle}Z ${month} ${day}${isLatest ? " · Latest" : ""}`;
        return `<option value="run:${source}:${entry.run}${entry.region?`:${entry.region}`:""}">${label}</option>`;
      };
      const runGroups=["hfsa","hfsb"].includes(source)
        ? `<optgroup label="NOAA ${source.toUpperCase()} · ${catalog.stormName}">${runs.filter((entry)=>entry.region===catalog.region).map((entry,index)=>runOption(entry,index===0)).join("")}</optgroup>`
        : source==="ncep"
        ? [...new Set(runs.map((entry)=>entry.domain||"WRF"))].map((domain)=>{
            const domainRuns=runs.filter((entry)=>(entry.domain||"WRF")===domain);
            return `<optgroup label="ZNWS-WRF · ${domain}">${domainRuns.map((entry,index)=>runOption(entry,index===0)).join("")}</optgroup>`;
          }).join("")
        : `<optgroup label="${source==="gfs"?"NOAA GFS 0.25°":"NOAA HRRR"}">${runs.map((entry,index)=>runOption(entry,index===0)).join("")}</optgroup>`;
      modelRun.innerHTML=runGroups;
      modelRun.value=`run:${source}:${catalog.run}${catalog.region?`:${catalog.region}`:""}`;
      modelRun.disabled = false;
      syncSelectionSummary();
      if (changed) {
        refreshHourChoices(previousRun && previousRun !== catalog.run ? availableHours()[0] : preferred);
        resetPreloads(); showFrame();
      }
    } catch {
      imageStatus.textContent = `The latest ${selectedSourceName()} run is temporarily unavailable.`;
      status.textContent = "Unavailable"; status.classList.add("is-error");
    }
  }
  image.addEventListener("load", () => { image.classList.add("is-loaded"); imageStatus.hidden = true; });
  image.addEventListener("error", () => { imageStatus.hidden = false; imageStatus.textContent = `This ${selectedSourceName()} frame is temporarily unavailable.`; status.textContent = "Unavailable"; status.classList.add("is-error"); });
  let swipeStart = null;
  image.closest(".image-frame").addEventListener("touchstart", event => {
    const touch = event.touches[0];
    swipeStart = touch ? { x: touch.clientX, y: touch.clientY, at: performance.now() } : null;
  }, { passive: true });
  image.closest(".image-frame").addEventListener("touchend", event => {
    if (!swipeStart) return;
    const touch = event.changedTouches[0], dx = touch.clientX - swipeStart.x, dy = touch.clientY - swipeStart.y, elapsed = performance.now() - swipeStart.at;
    swipeStart = null;
    if (elapsed > 900 || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    setModelPlaying(false);
    step(dx < 0 ? 1 : -1);
  }, { passive: true });
  hour.addEventListener("change", () => { setModelPlaying(false); showFrame(); });
  timeline.addEventListener("input",()=>{
    setModelPlaying(false);
    hour.selectedIndex=Number(timeline.value);
    showFrame();
  });
  region.addEventListener("change", () => {
    if(modelSource.value==="hrrr"){lastHrrrRegion=region.value;localStorage.setItem("zasnet-hrrr-region",lastHrrrRegion);}
    if(["hfsa","hfsb"].includes(modelSource.value)){
      const runs=catalogResponse?.runs||[],selected=runs.find((entry)=>entry.region===region.value);
      if(selected){catalog={...selected,products:selected.products||catalogResponse.products};const stormRuns=runs.filter((entry)=>entry.region===region.value);modelRun.innerHTML=`<optgroup label="NOAA ${modelSource.value.toUpperCase()} · ${selected.stormName}">${stormRuns.map((entry,index)=>{const initialization=new Date(entry.runTime),cycle=String(initialization.getUTCHours()).padStart(2,"0"),month=initialization.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"}).toUpperCase(),day=String(initialization.getUTCDate()).padStart(2,"0");return `<option value="run:${modelSource.value}:${entry.run}:${entry.region}">${cycle}Z ${month} ${day}${index===0?" · Latest":""}</option>`;}).join("")}</optgroup>`;modelRun.value=`run:${modelSource.value}:${selected.run}:${selected.region}`;refreshHourChoices(Number(hour.value));}
    }
    setModelPlaying(false);resetPreloads();region.blur();showFrame();
  });
  hafsDomain.addEventListener("change",()=>{setModelPlaying(false);resetPreloads();hafsDomain.blur();showFrame();});
  compareToggle.addEventListener("change", showFrame); compareProduct.addEventListener("change", showFrame);
  window.installTemporaryMapRegions?.(region);
  new MutationObserver(()=>syncRegionMenuForSource()).observe(region,{childList:true,subtree:true});
  syncRegionMenuForSource();
  product.addEventListener("change", () => {
    setModelPlaying(false);
    if(modelSource.value==="hrrr") lastHrrrProduct=product.value;
    syncExperimentalInfo();
    syncRegionMenuForSource();
    if(modelSource.value==="ncep"){
      syncWrfSourceAndWarning();
    }else if(modelSource.value==="gfs"){
      sourceLabel.textContent="NOAA GFS 0.25°";
      guidanceNote.textContent=product.value==="temperature"?"Full-US GFS 2-meter temperature in °F with sampled map values through F384.":product.value==="pcpn"?"Six-hour average precipitation rate with MSLP and 1000–500 mb thickness through F384.":product.value==="apcp"?"Run-total GFS quantitative precipitation forecast in inches through F384.":product.value==="cloud"?"GFS total atmospheric cloud cover in percent through F384.":product.value==="pwat"?"GFS total-column precipitable water in inches through F384.":"Global model composite reflectivity through F384.";
    }else if(["hfsa","hfsb"].includes(modelSource.value)){
      sourceLabel.textContent=`NOAA ${modelSource.value.toUpperCase()}`;
      guidanceNote.textContent="Storm-centered HAFS tropical guidance. The map follows the selected active system; use official NHC/JTWC forecasts for decisions.";
    }else if (!experimentalInfo[product.value]) {
      sourceLabel.textContent = "NOAA / HRRR";
      guidanceNote.textContent = product.value === "refc" ? "Simulated composite reflectivity is a forecast, not observed radar. Timing, placement, and intensity may differ from actual storms." : "HRRR guidance is a model forecast, not an observation. Timing, placement, and intensity may differ from actual weather.";
    }
    rememberProduct(product.value); refreshHourChoices(Number(hour.value)); resetPreloads(); product.blur(); syncSelectionSummary(); showFrame();
  });
  modelSource.addEventListener("change",()=>{
    modelSource.blur();
    if(modelSource.value==="ncep"&&region.value&&!region.selectedOptions[0]?.closest('optgroup[data-temporary-regions="true"]')){lastHrrrRegion=region.value;localStorage.setItem("zasnet-hrrr-region",lastHrrrRegion);}
    setModelPlaying(false);catalog=null;catalogResponse=null;followLatestRun=true;resetPreloads();syncRegionMenuForSource();syncModelSource();
    const state=new URL(location.href);state.searchParams.set("source",modelSource.value);state.searchParams.delete("run");state.searchParams.delete("fh");history.replaceState({},"",state);
    loadCatalog(true);
  });
  infoButton.addEventListener("click", () => {
    if(modelSource.value==="ncep"&&window.matchMedia("(min-width: 901px)").matches){
      sideGuide.hidden=!sideGuide.hidden;
      viewer.classList.toggle("guide-open",!sideGuide.hidden);
    }else infoDialog.showModal();
  });
  document.querySelector("#closeSideGuide").addEventListener("click",()=>{sideGuide.hidden=true;viewer.classList.remove("guide-open");});
  document.querySelector("#closeExperimentalInfo").addEventListener("click", () => infoDialog.close());
  infoDialog.addEventListener("click", (event) => { if (event.target === infoDialog) infoDialog.close(); });
  modelRun.addEventListener("change", async () => {
    if(modelRun.value.startsWith("source:")){
      modelSource.value=modelRun.value.slice(7);
      modelSource.dispatchEvent(new Event("change"));
      return;
    }
    const runs = catalogResponse?.runs?.length ? catalogResponse.runs : [catalogResponse];
    const runParts=modelRun.value.split(":"),selectedRun=runParts[2],selectedRegion=runParts.slice(3).join(":");
    const selected = runs.find((entry) => entry?.run === selectedRun&&(!selectedRegion||entry.region===selectedRegion));
    if (!selected) return;
    const domainRuns=modelSource.value==="ncep"?runs.filter((entry)=>entry?.domain===selected.domain):runs;
    followLatestRun = selected.run === domainRuns[0]?.run;
    catalog = { ...selected, products: selected.products||catalogResponse.products };
    if(selected.region)region.value=selected.region;
    syncWrfProductAvailability();
    syncWrfSourceAndWarning();
    await syncRegionForWrfRun(catalog);
    refreshHourChoices(Number(hour.value));
    setModelPlaying(false); resetPreloads();
    modelRun.blur();
    showFrame();
  });
  previous.addEventListener("click", () => { setModelPlaying(false); step(-1); }); next.addEventListener("click", () => { setModelPlaying(false); step(1); });
  modelPlayButton.addEventListener("click", () => setModelPlaying(!modelAnimationTimer));
  modelAnimationSpeed.addEventListener("change", () => { localStorage.setItem("zasnet-model-animation-speed", modelAnimationSpeed.value); if (modelAnimationTimer) setModelPlaying(true); });
  function stepProduct(direction){
    const enabled=[...product.options].filter((option)=>!option.hidden&&!option.disabled&&option.value);
    const current=Math.max(0,enabled.findIndex((option)=>option.value===product.value));
    const target=enabled[Math.max(0,Math.min(enabled.length-1,current+direction))];
    if(!target||target.value===product.value)return;
    product.value=target.value;
    product.dispatchEvent(new Event("change"));
  }
  const stopHeldForecastArrow = () => {
    heldForecastArrow = "";
    heldArrowStartedAt = 0;
    heldArrowLastStepAt = 0;
    if (heldArrowFrame) cancelAnimationFrame(heldArrowFrame);
    heldArrowFrame = 0;
  };
  const runHeldForecastArrow = (now) => {
    if (!heldForecastArrow) return stopHeldForecastArrow();
    // Let a quick tap remain a single step, then advance at a stable cadence
    // independent of the operating system's keyboard-repeat settings.
    if (now - heldArrowStartedAt >= 230 && now - heldArrowLastStepAt >= 115) {
      heldArrowLastStepAt = now;
      step(heldForecastArrow === "ArrowLeft" ? -1 : 1, { wrap: true });
    }
    heldArrowFrame = requestAnimationFrame(runHeldForecastArrow);
  };
  document.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
    event.preventDefault();
    if(["ArrowUp","ArrowDown"].includes(event.key))stepProduct(event.key==="ArrowUp"?-1:1);
    else if (!heldForecastArrow) {
      setModelPlaying(false);
      heldForecastArrow = event.key;
      heldArrowStartedAt = performance.now();
      heldArrowLastStepAt = heldArrowStartedAt;
      step(event.key==="ArrowLeft"?-1:1, { wrap: true });
      heldArrowFrame = requestAnimationFrame(runHeldForecastArrow);
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === heldForecastArrow) stopHeldForecastArrow();
  });
  window.addEventListener("blur", stopHeldForecastArrow);
  document.querySelector("#exportMap").addEventListener("click", async () => {
    try {
      const rendered = new Image();
      rendered.onload = () => { const canvas = document.createElement("canvas"); canvas.width = rendered.naturalWidth || 1400; canvas.height = rendered.naturalHeight || 900; canvas.getContext("2d").drawImage(rendered, 0, 0, canvas.width, canvas.height); canvas.toBlob((png) => { const link = document.createElement("a"); link.href = URL.createObjectURL(png); link.download = `${modelSource.value}-${product.value}-${catalog.run}-f${String(hour.value).padStart(2, "0")}.png`; link.click(); URL.revokeObjectURL(link.href); }, "image/png"); };
      rendered.src = image.currentSrc || image.src;
    } catch { /* Open image remains available as a fallback. */ }
  });
  document.querySelector("#exportGif").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const originalLabel = button.textContent;
    const options = [...hour.options].filter((option) => Number.isFinite(Number(option.value)));
    const selectedDelay = Number(document.querySelector("#gifFrameDelay")?.value);
    const frameDelay = [100,150,250,400,650].includes(selectedDelay) ? selectedDelay : 150;
    if (!catalog?.run || !options.length || typeof GIF !== "function") {
      status.textContent = "GIF export unavailable";
      status.classList.add("is-error");
      return;
    }
    button.disabled = true;
    status.classList.remove("is-error");
    try {
      // Export the optimized native 1400 × 900 model frames at full resolution.
      const width = 1400, height = 900;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      // A single palette keeps static map furniture (especially the legend)
      // pixel-stable instead of letting per-frame quantization make it shimmer.
      const gif = new GIF({ workers: 2, quality: 10, width, height, globalPalette: true, workerScript: "/public-gif.worker.js" });
      const loadGifFrame = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Frame returned HTTP ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        try {
          const rendered = new Image();
          await new Promise((resolve, reject) => {
            rendered.onload = resolve;
            rendered.onerror = () => reject(new Error("A forecast frame could not be rendered"));
            rendered.src = objectUrl;
          });
          context.fillStyle = "#10150f";
          context.fillRect(0, 0, width, height);
          context.drawImage(rendered, 0, 0, width, height);
          gif.addFrame(context, { copy: true, delay: frameDelay });
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      for (let index = 0; index < options.length; index += 1) {
        button.textContent = `Preparing ${index + 1}/${options.length}`;
        await loadGifFrame(frameUrl(Number(options[index].value)));
      }
      button.textContent = "Encoding 0%";
      gif.on("progress", (progress) => { button.textContent = `Encoding ${Math.round(progress * 100)}%`; });
      const result = await new Promise((resolve, reject) => {
        gif.on("finished", resolve);
        gif.on("abort", () => reject(new Error("GIF export was interrupted")));
        gif.render();
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(result);
      const exportSource=modelSource.value==="ncep"?"ZASNet-WRF":modelSource.value;
      link.download = `${exportSource}-${product.value}-${catalog.run}-${region.value || "full-us"}.gif`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      status.textContent = `Exported ${options.length}-frame GIF · ${width}×${height} · ${frameDelay} ms/frame`;
    } catch (error) {
      status.textContent = `GIF export failed: ${error.message}`;
      status.classList.add("is-error");
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
  fetch("/api/public/models/ncep/product-legends.json",{cache:"no-store"})
    .then((response)=>response.ok?response.json():Promise.reject(new Error(`HTTP ${response.status}`)))
    .then((data)=>{wrfProductLegends=data.products||{};if(modelSource.value==="ncep")syncExperimentalInfo();})
    .catch(()=>{});
  loadCatalog(true);
  window.setInterval(() => loadCatalog(false), 60_000);
})();
