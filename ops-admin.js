/** Full zone-hazard catalog (matches Hazard Services GFE_HAZARDS). */
const hazardCatalog = [
  { group: "Winter", code: "WS.W", name: "Winter Storm Warning", product: "WSW", style: "standard", impacts: "Travel could be very difficult. The hazardous conditions could impact the morning or evening commute." },
  { group: "Winter", code: "WW.Y", name: "Winter Weather Advisory", product: "WSW", style: "standard", impacts: "Plan on slippery road conditions. The hazardous conditions could impact the morning or evening commute." },
  { group: "Winter", code: "BZ.W", name: "Blizzard Warning", product: "WSW", style: "standard", impacts: "Travel could be very difficult to impossible. Widespread blowing snow could significantly reduce visibility." },
  { group: "Winter", code: "IS.W", name: "Ice Storm Warning", product: "WSW", style: "standard", impacts: "Significant icing could cause dangerous travel, extensive tree damage, and power outages." },
  { group: "Winter", code: "LE.W", name: "Lake Effect Snow Warning", product: "WSW", style: "standard", impacts: "Travel could be very difficult to impossible within intense lake effect snow bands." },
  { group: "Winter", code: "WS.A", name: "Winter Storm Watch", product: "WSW", style: "standard", impacts: "Heavy snow and/or ice could result in difficult travel conditions." },
  { group: "Wind", code: "HW.W", name: "High Wind Warning", product: "NPW", style: "standard", impacts: "Damaging winds could blow down trees and power lines. Travel could be difficult, especially for high profile vehicles." },
  { group: "Wind", code: "WI.Y", name: "Wind Advisory", product: "NPW", style: "standard", impacts: "Gusty winds could blow around unsecured objects and make driving difficult, especially for high profile vehicles." },
  { group: "Wind", code: "HW.A", name: "High Wind Watch", product: "NPW", style: "standard", impacts: "Damaging winds could blow down trees and power lines and make travel difficult." },
  { group: "Wind", code: "LW.Y", name: "Lake Wind Advisory", product: "NPW", style: "standard", impacts: "Strong winds will create hazardous conditions for small craft on area lakes and may make travel difficult for high-profile vehicles." },
  { group: "Heat / cold", code: "XH.W", name: "Extreme Heat Warning", product: "NPW", style: "standard", impacts: "Extreme heat will significantly increase the potential for heat-related illnesses." },
  { group: "Heat / cold", code: "XH.A", name: "Extreme Heat Watch", product: "NPW", style: "standard", impacts: "Dangerously hot conditions could significantly increase the potential for heat-related illnesses." },
  { group: "Heat / cold", code: "HT.Y", name: "Heat Advisory", product: "NPW", style: "standard", impacts: "Hot temperatures and high humidity may cause heat illnesses." },
  { group: "Heat / cold", code: "EC.W", name: "Extreme Cold Warning", product: "NPW", style: "standard", impacts: "Dangerously cold wind chills could cause frostbite on exposed skin in as little as 10 minutes." },
  { group: "Heat / cold", code: "CW.Y", name: "Cold Weather Advisory", product: "NPW", style: "standard", impacts: "Very cold temperatures and wind chills could result in hypothermia or frostbite if precautions are not taken." },
  { group: "Heat / cold", code: "EC.A", name: "Extreme Cold Watch", product: "NPW", style: "standard", impacts: "Dangerously cold temperatures and wind chills are possible." },
  { group: "Visibility", code: "FG.Y", name: "Dense Fog Advisory", product: "NPW", style: "standard", impacts: "Low visibility could make driving conditions hazardous." },
  { group: "Visibility", code: "ZF.Y", name: "Freezing Fog Advisory", product: "NPW", style: "standard", impacts: "Freezing fog will reduce visibility and may create slick spots on roads, bridges, and elevated surfaces." },
  { group: "Visibility", code: "SM.Y", name: "Dense Smoke Advisory", product: "NPW", style: "standard", impacts: "Dense smoke will reduce visibility and may create hazardous travel conditions." },
  { group: "Visibility", code: "DU.W", name: "Blowing Dust Warning", product: "NPW", style: "standard", impacts: "Dangerous travel is expected in widespread blowing dust with sharply reduced visibility." },
  { group: "Visibility", code: "DU.Y", name: "Blowing Dust Advisory", product: "NPW", style: "standard", impacts: "Blowing dust will reduce visibility and create hazardous travel conditions, especially for high-profile vehicles." },
  { group: "Visibility", code: "AF.W", name: "Ashfall Warning", product: "NPW", style: "standard", impacts: "Significant ash accumulation can make travel dangerous, damage machinery, affect breathing, and disrupt critical infrastructure." },
  { group: "Visibility", code: "AF.Y", name: "Ashfall Advisory", product: "NPW", style: "standard", impacts: "Minor ash accumulation may reduce visibility, affect breathing, and create slippery or abrasive travel conditions." },
  { group: "Visibility", code: "AS.Y", name: "Air Stagnation Advisory", product: "NPW", style: "standard", impacts: "Poor atmospheric mixing may lead to deteriorating air quality." },
  { group: "Freeze / frost", code: "FZ.W", name: "Freeze Warning", product: "NPW", style: "standard", impacts: "Frost and freeze conditions could kill crops and other sensitive vegetation and possibly damage unprotected outdoor plumbing." },
  { group: "Freeze / frost", code: "FZ.A", name: "Freeze Watch", product: "NPW", style: "standard", impacts: "Frost and freeze conditions could kill crops and other sensitive vegetation and possibly damage unprotected outdoor plumbing." },
  { group: "Freeze / frost", code: "FR.Y", name: "Frost Advisory", product: "NPW", style: "standard", impacts: "Frost could harm sensitive outdoor vegetation. Sensitive plants may be killed if left uncovered." },
  { group: "Flood", code: "FA.A", name: "Flood Watch", product: "FFA", style: "standard", impacts: "Excessive runoff may result in flooding of rivers, creeks, streams, and other low-lying and flood-prone locations." },
  { group: "Flood", code: "FF.A", name: "Flash Flood Watch", product: "FFA", style: "standard", impacts: "Flash flooding is possible in low-lying and poor drainage areas. Be prepared to move to higher ground if flooding develops." },
  { group: "Coastal / lakeshore", code: "CF.W", name: "Coastal Flood Warning", product: "CFW", style: "standard", impacts: "Dangerous coastal flooding is expected. Some roads and properties near the water may become impassable or inundated. Never drive through flood waters." },
  { group: "Coastal / lakeshore", code: "CF.Y", name: "Coastal Flood Advisory", product: "CFW", style: "standard", impacts: "Minor coastal flooding is expected. Vehicle traffic along gulf- or ocean-facing beaches may be halted at times, and water may cover low-lying coastal roads and parking areas." },
  { group: "Coastal / lakeshore", code: "CF.A", name: "Coastal Flood Watch", product: "CFW", style: "standard", impacts: "Coastal flooding is possible. If a warning is issued, some roads and properties near the shore could become flooded." },
  { group: "Coastal / lakeshore", code: "LS.W", name: "Lakeshore Flood Warning", product: "CFW", style: "standard", impacts: "Dangerous lakeshore flooding is expected. Waves and elevated lake levels will inundate beaches, shoreline parks, and some lakeshore roads. Stay away from the water." },
  { group: "Coastal / lakeshore", code: "LS.Y", name: "Lakeshore Flood Advisory", product: "CFW", style: "standard", impacts: "Minor lakeshore flooding and beach erosion are expected. Waves may cover docks, walkways, and some low-lying lakeshore roads." },
  { group: "Coastal / lakeshore", code: "LS.A", name: "Lakeshore Flood Watch", product: "CFW", style: "standard", impacts: "Lakeshore flooding is possible. If a warning is issued, waves and higher lake levels could flood beaches and some shoreline roads." },
  { group: "Coastal / lakeshore", code: "BH.S", name: "Beach Hazards Statement", product: "CFW", style: "standard", impacts: "Life-threatening rip currents and rough surf are expected. Waves can wash people off beaches and rocks. There is an increased risk of drowning." },
  { group: "Coastal / lakeshore", code: "RP.S", name: "Rip Current Statement", product: "CFW", style: "standard", impacts: "Dangerous rip currents are expected. Rip currents can pull swimmers away from shore and lead to drowning." },
  { group: "Coastal / lakeshore", code: "SU.Y", name: "High Surf Advisory", product: "CFW", style: "standard", impacts: "Large breaking waves will create dangerous swimming and surfing conditions and may cause beach erosion and overwash on low-lying coastal roads." },
  { group: "Coastal / lakeshore", code: "SU.W", name: "High Surf Warning", product: "CFW", style: "standard", impacts: "Dangerously large breaking waves pose an especially heightened threat to life and property and may cause significant beach erosion and overwash." },
  { group: "Coastal / lakeshore", code: "CF.S", name: "Coastal Hazard Statement", product: "CFW", style: "standard", impacts: "Hazardous conditions may affect shoreline interests. Follow instructions from local officials and the coordinating agency." },
  { group: "Coastal / lakeshore", code: "LS.S", name: "Lakeshore Hazard Statement", product: "CFW", style: "standard", impacts: "Hazardous conditions may affect lakeshore interests. Follow instructions from local officials and the coordinating agency." },
  { group: "Marine", code: "GL.A", name: "Gale Watch", product: "MWW", zoneType: "marine", impacts: "Strong winds can cause hazardous seas which could capsize or damage vessels." },
  { group: "Marine", code: "SR.A", name: "Storm Watch", product: "MWW", zoneType: "marine", impacts: "Very strong winds can cause dangerous seas which could capsize or damage vessels." },
  { group: "Marine", code: "HF.A", name: "Hurricane Force Wind Watch", product: "MWW", zoneType: "marine", impacts: "Hurricane-force winds can cause exceptionally dangerous seas." },
  { group: "Marine", code: "UP.A", name: "Heavy Freezing Spray Watch", product: "MWW", zoneType: "marine", impacts: "Rapidly accumulating ice could make vessels unstable." },
  { group: "Marine", code: "SE.A", name: "Hazardous Seas Watch", product: "MWW", zoneType: "marine", impacts: "Very steep and hazardous seas could capsize or damage vessels." },
  { group: "Marine", code: "GL.W", name: "Gale Warning", product: "MWW", zoneType: "marine", impacts: "Strong winds will cause hazardous seas which could capsize or damage vessels." },
  { group: "Marine", code: "SR.W", name: "Storm Warning", product: "MWW", zoneType: "marine", impacts: "Very strong winds will cause dangerous seas which could capsize or damage vessels." },
  { group: "Marine", code: "HF.W", name: "Hurricane Force Wind Warning", product: "MWW", zoneType: "marine", impacts: "Hurricane-force winds will cause exceptionally dangerous seas." },
  { group: "Marine", code: "UP.W", name: "Heavy Freezing Spray Warning", product: "MWW", zoneType: "marine", impacts: "Rapidly accumulating ice will make vessels unstable." },
  { group: "Marine", code: "SE.W", name: "Hazardous Seas Warning", product: "MWW", zoneType: "marine", impacts: "Very steep and hazardous seas could capsize or damage vessels." },
  { group: "Marine", code: "SC.Y", name: "Small Craft Advisory", product: "MWW", zoneType: "marine", impacts: "Conditions will be hazardous to small craft." },
  { group: "Marine", code: "BW.Y", name: "Brisk Wind Advisory", product: "MWW", zoneType: "marine", impacts: "Brisk winds over ice-covered waters will create hazardous conditions." },
  { group: "Marine", code: "MF.Y", name: "Dense Fog Advisory (Marine)", product: "MWW", zoneType: "marine", impacts: "Low visibility will make navigation difficult." },
  { group: "Marine", code: "MS.Y", name: "Dense Smoke Advisory (Marine)", product: "MWW", zoneType: "marine", impacts: "Dense smoke will make navigation difficult." },
  { group: "Marine", code: "UP.Y", name: "Freezing Spray Advisory", product: "MWW", zoneType: "marine", impacts: "Ice accumulation on vessels will create hazardous operating conditions." },
  { group: "Marine", code: "LO.Y", name: "Low Water Advisory", product: "MWW", zoneType: "marine", impacts: "Low water levels may create hazardous navigation conditions." },
  { group: "Fire weather", code: "FW.W", name: "Red Flag Warning", product: "RFW", style: "rfw", impacts: "Low humidities, hot temperatures, and strong gusty winds could cause erratic fire behavior." },
  { group: "Fire weather", code: "FW.A", name: "Fire Weather Watch", product: "RFW", style: "rfw", impacts: "Any fires that develop could spread rapidly. Outdoor burning is not recommended." }
];

/** Map colors aligned with Hazard Services / GFE_HAZARDS. */
const HAZARD_COLORS = {
  "WS.W": "#FF69B4", "WW.Y": "#7B68EE", "BZ.W": "#FF4500",
  "IS.W": "#8B008B", "LE.W": "#008B8B", "WS.A": "#4682B4",
  "HW.W": "#DAA520", "WI.Y": "#D2B48C", "HW.A": "#B8860B", "LW.Y": "#D2B48C",
  "XH.W": "#C71585", "XH.A": "#800000", "HT.Y": "#FF7F50", "EC.W": "#0000FF",
  "CW.Y": "#AFEEEE", "EC.A": "#5F9EA0", "FG.Y": "#708090", "ZF.Y": "#008080",
  "SM.Y": "#F0E68C", "DU.W": "#FFE4C4", "DU.Y": "#BDB76B", "AF.W": "#A9A9A9", "AF.Y": "#696969", "AS.Y": "#808080",
  "FZ.W": "#483D8B", "FZ.A": "#00FFFF", "FR.Y": "#6495ED", "FA.A": "#2E8B57",
  "FF.A": "#2E8B57", "CF.W": "#228B22", "CF.Y": "#7CFC00", "CF.A": "#66CDAA",
  "LS.W": "#228B22", "LS.Y": "#7CFC00", "LS.A": "#66CDAA", "BH.S": "#40E0D0",
  "RP.S": "#40E0D0", "SU.Y": "#BA55D3", "SU.W": "#A0522D", "CF.S": "#40E0D0", "LS.S": "#40E0D0", "FW.W": "#FF1493", "FW.A": "#FFDEAD"
};
const HAZARD_PRIORITIES = {
  "FW.W": 52, "FW.A": 96, "FA.A": 89, "FF.A": 83,
  "BH.S": 100, "RP.S": 101, "AS.Y": 104
};
hazardCatalog.forEach((h) => {
  if (!h.color) h.color = HAZARD_COLORS[h.code] || "#8FA8BA";
  if (!h.priority) h.priority = HAZARD_PRIORITIES[h.code] || 200;
});

/** Built-in catalog only — custom products are merged from the saved store. */
const builtInHazardCatalog = hazardCatalog.map((h) => ({ ...h }));
const builtInCodes = new Set(builtInHazardCatalog.map((h) => h.code));
const hazards = () => hazardCatalog.map((h) => [h.code, h.name]);
const builtInImpacts = Object.fromEntries(builtInHazardCatalog.map((h) => [h.code, h.impacts]));
const winterHazards = new Set(builtInHazardCatalog.filter((h) => h.group === "Winter").map((h) => h.code));

function syncCatalogFromTemplates(store = templates) {
  // Drop previous session customs, then re-add from store
  hazardCatalog.length = 0;
  builtInHazardCatalog.forEach((h) => hazardCatalog.push({ ...h }));
  Object.entries(store || {}).forEach(([code, entry]) => {
    if (!entry?.isCustom || !entry.name) return;
    if (builtInCodes.has(code)) return;
    if (hazardCatalog.some((h) => h.code === code)) return;
    hazardCatalog.push({
      group: entry.group || "Custom",
      code,
      name: entry.name,
      product: entry.product || "NPW",
      style: entry.style === "rfw" ? "rfw" : "standard",
      zoneType: ["fire", "marine"].includes(entry.zoneType) ? entry.zoneType : "public",
      color: entry.color || "#FFA500",
      priority: entry.priority || 200,
      impacts: entry.impacts || "",
      isCustom: true
    });
  });
  hazardCatalog.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.name.localeCompare(b.name);
  });
}

/** Standard WHAT/WHERE/WHEN body for most zone products. */
const builtInStandardBody = `{{WHAT_BLOCK}}

{{WHERE_BLOCK}}

{{WHEN_BLOCK}}

{{IMPACTS_BLOCK}}

{{ADDITIONAL_DETAILS_BLOCK}}

PRECAUTIONARY/PREPAREDNESS ACTIONS...

{{CTA}}

&&`;

/** Red Flag / Fire Weather Watch body. */
const builtInRfwBody = `{{AFFECTED_AREA_BLOCK}}

{{COUNTIES_BLOCK}}

{{IMPACTS_BLOCK}}

{{WIND_BLOCK}}

{{HUMIDITY_BLOCK}}

{{TEMPERATURES_BLOCK}}

{{FUELS_BLOCK}}

{{ADDITIONAL_DETAILS_BLOCK}}

PRECAUTIONARY/PREPAREDNESS ACTIONS...

{{CTA}}

&&`;

const builtInFireFields = {
  "FW.W": [
    ["direction", "Wind direction", "text", "northwest"],
    ["windMin", "Sustained wind minimum (mph)", "number", ""],
    ["windMax", "Sustained wind maximum (mph)", "number", ""],
    ["gust", "Peak gust (mph)", "number", ""],
    ["humidityMin", "Minimum humidity (%)", "number", ""],
    ["humidityMax", "Maximum humidity (%)", "number", ""],
    ["temperatures", "Temperatures", "text", "Lows in the upper 50s. Highs in the lower 80s."],
    ["affectedArea", "Affected-area wording", "text", "Selected fire weather zones"],
    ["counties", "Counties affected", "text", "County names separated by commas"],
    ["fuels", "Fuel dryness / status", "text", "critically dry"],
    ["eventCause", "Critical weather cause", "text", "strong winds and low relative humidity"],
    ["duration", "Critical-condition duration / remission", "text", ""],
    ["lightning", "Lightning / dry-thunderstorm coverage", "text", ""],
    ["outflowWinds", "Thunderstorm outflow winds", "text", ""],
    ["wettingRain", "Wetting-rain expectation", "text", ""],
    ["frontalPassage", "Dry frontal passage / wind shift", "text", ""],
    ["instability", "Instability / Haines context", "text", ""],
    ["ongoingFire", "Existing-fire / exceptional behavior context", "text", ""],
    ["coordination", "Partner coordination / AOP note", "text", ""]
  ],
  "FW.A": [
    ["direction", "Wind direction", "text", "west"],
    ["windMin", "Potential wind minimum (mph)", "number", ""],
    ["windMax", "Potential wind maximum (mph)", "number", ""],
    ["gust", "Potential peak gust (mph)", "number", ""],
    ["humidityMin", "Minimum humidity (%)", "number", ""],
    ["humidityMax", "Maximum humidity (%)", "number", ""],
    ["temperatures", "Temperatures", "text", "Highs in the lower 80s."],
    ["affectedArea", "Affected-area wording", "text", "Selected fire weather zones"],
    ["counties", "Counties affected", "text", "County names separated by commas"],
    ["fuels", "Fuel dryness / status", "text", "critically dry"],
    ["eventCause", "Potential critical weather cause", "text", "strong winds and low relative humidity"],
    ["duration", "Potential duration / remission", "text", ""], ["lightning", "Lightning / dry-thunderstorm coverage", "text", ""],
    ["outflowWinds", "Potential outflow winds", "text", ""], ["wettingRain", "Wetting-rain expectation", "text", ""],
    ["frontalPassage", "Dry frontal passage / wind shift", "text", ""], ["instability", "Instability / Haines context", "text", ""],
    ["ongoingFire", "Existing-fire context", "text", ""], ["confidence", "High-potential rationale", "text", ""],
    ["coordination", "Partner coordination / AOP note", "text", ""]
  ]
};
const winterSnowIceFields = [
  ["snowMin", "Snowfall minimum (in)", "number", ""], ["snowMax", "Snowfall maximum (in)", "number", ""],
  ["sleetMin", "Sleet minimum (in)", "number", ""], ["sleetMax", "Sleet maximum (in)", "number", ""],
  ["iceMin", "Ice minimum (in)", "number", ""], ["iceMax", "Ice maximum (in)", "number", ""],
  ["elevation", "Elevation qualifier", "text", "above 5000 feet"], ["wind", "Sustained wind (mph)", "number", ""],
  ["gust", "Peak wind gust (mph)", "number", ""], ["visibility", "Lowest visibility", "text", "one quarter mile or less"]
];
const builtInWinterFieldsByCode = {
  "WS.W": [...winterSnowIceFields, ["snowRate", "Peak snowfall rate", "text", "1 to 2 inches per hour"], ["blowingSnow", "Blowing snow", "text", "areas of blowing and drifting snow"]],
  "WW.Y": [...winterSnowIceFields, ["blowingSnow", "Blowing snow", "text", "patchy blowing snow"]],
  "WS.A": [...winterSnowIceFields, ["confidence", "Forecast confidence / uncertainty", "text", "at least 50 percent confidence in warning-level impacts"]],
  "BZ.W": [["snowMin", "Snowfall minimum (in)", "number", ""], ["snowMax", "Snowfall maximum (in)", "number", ""], ["wind", "Sustained wind (mph)", "number", "35"], ["gust", "Peak wind gust (mph)", "number", ""], ["visibility", "Visibility", "text", "less than one quarter mile"], ["visibilityDuration", "Visibility duration", "text", "three hours or more"], ["blowingSnow", "Snow reducing visibility", "text", "falling and blowing snow"]],
  "IS.W": [["iceMin", "Ice minimum (in)", "number", ""], ["iceMax", "Ice maximum (in)", "number", ""], ["snowMin", "Snowfall minimum (in)", "number", ""], ["snowMax", "Snowfall maximum (in)", "number", ""], ["wind", "Sustained wind (mph)", "number", ""], ["gust", "Peak wind gust (mph)", "number", ""]],
  "LE.W": [["snowMin", "Snowfall minimum (in)", "number", ""], ["snowMax", "Snowfall maximum (in)", "number", ""], ["snowRate", "Peak snowfall rate", "text", "2 to 3 inches per hour"], ["wind", "Sustained wind (mph)", "number", ""], ["gust", "Peak wind gust (mph)", "number", ""], ["visibility", "Visibility", "text", "one quarter mile or less"], ["bandLocation", "Most affected locations / band", "text", "within the most persistent lake effect snow band"]]
};
const builtInNpwFieldsByCode = {
  "HW.W": [["direction", "Wind direction", "text", "west"], ["sustained", "Sustained wind (mph)", "number", "40"], ["gust", "Peak gust (mph)", "number", "58"], ["duration", "Expected duration", "text", "one hour or longer"], ["elevation", "Elevation qualifier", "text", ""]],
  "HW.A": [["direction", "Potential wind direction", "text", "west"], ["sustained", "Potential sustained wind (mph)", "number", "40"], ["gust", "Potential peak gust (mph)", "number", "58"], ["confidence", "Forecast confidence / uncertainty", "text", "at least 50 percent chance of warning-level conditions"], ["elevation", "Elevation qualifier", "text", ""]],
  "WI.Y": [["direction", "Wind direction", "text", "west"], ["sustained", "Sustained wind (mph)", "number", "30"], ["gust", "Peak gust (mph)", "number", ""], ["duration", "Expected duration", "text", "one hour or longer"], ["elevation", "Elevation qualifier", "text", ""]],
  "LW.Y": [["direction", "Wind direction", "text", "west"], ["sustained", "Sustained wind (mph)", "number", "20"], ["gust", "Peak gust (mph)", "number", ""], ["duration", "Expected duration", "text", "one hour or longer"]],
  "XH.W": [["temperature", "Maximum temperature (°F)", "number", ""], ["heatIndex", "Maximum heat index (°F)", "number", ""], ["overnight", "Minimum overnight low (°F)", "number", "75"], ["duration", "Heat episode duration", "text", "at least two days"], ["powerOutage", "Power-outage / cooling-access concern", "text", ""]],
  "XH.A": [["temperature", "Potential maximum temperature (°F)", "number", ""], ["heatIndex", "Potential maximum heat index (°F)", "number", ""], ["overnight", "Potential minimum overnight low (°F)", "number", "75"], ["duration", "Potential heat episode duration", "text", ""], ["confidence", "Forecast confidence / uncertainty", "text", ""]],
  "HT.Y": [["temperature", "Maximum temperature (°F)", "number", ""], ["heatIndex", "Maximum heat index (°F)", "number", ""], ["overnight", "Minimum overnight low (°F)", "number", "75"], ["duration", "Heat episode duration", "text", "one to two days"], ["powerOutage", "Power-outage / cooling-access concern", "text", ""]],
  "EC.W": [["temperature", "Minimum air temperature (°F)", "number", ""], ["windChill", "Minimum wind chill (°F)", "number", ""], ["duration", "Duration at dangerous values", "text", ""], ["vulnerable", "Vulnerable populations / locations", "text", ""]],
  "EC.A": [["temperature", "Potential minimum air temperature (°F)", "number", ""], ["windChill", "Potential minimum wind chill (°F)", "number", ""], ["confidence", "Forecast confidence / uncertainty", "text", ""]],
  "CW.Y": [["temperature", "Minimum air temperature (°F)", "number", ""], ["windChill", "Minimum wind chill (°F)", "number", ""], ["duration", "Duration at advisory values", "text", ""], ["vulnerable", "Vulnerable populations / locations", "text", ""]],
  "FG.Y": [["visibility", "Visibility", "text", "one quarter mile or less"], ["locations", "Most affected roads / locations", "text", ""]],
  "ZF.Y": [["visibility", "Visibility", "text", "one quarter mile or less"], ["temperature", "Temperature (°F)", "number", ""], ["ice", "Expected light ice accumulation", "text", "a light glaze"]],
  "SM.Y": [["visibility", "Visibility", "text", "one quarter mile or less"], ["smokeSource", "Smoke source", "text", "wildfires"], ["locations", "Most affected roads / locations", "text", ""]],
  "DU.W": [["visibility", "Visibility", "text", "one quarter mile or less"], ["direction", "Wind direction", "text", "southwest"], ["sustained", "Sustained wind (mph)", "number", "25"], ["gust", "Peak gust (mph)", "number", ""], ["duration", "Expected duration", "text", "longer than 90 minutes"], ["dustSource", "Dust source / affected corridor", "text", "widespread blowing dust"]],
  "DU.Y": [["visibility", "Visibility", "text", "one mile or less but greater than one quarter mile"], ["direction", "Wind direction", "text", "southwest"], ["sustained", "Sustained wind (mph)", "number", "25"], ["gust", "Peak gust (mph)", "number", ""], ["duration", "Expected duration", "text", "longer than 90 minutes"], ["dustSource", "Dust source / affected corridor", "text", "widespread blowing dust"]],
  "AS.Y": [["stagnationCause", "Stagnation cause", "text", "light winds and poor atmospheric mixing"], ["agency", "Requesting air-quality agency", "text", ""], ["duration", "Expected duration", "text", ""], ["mixingHeight", "Mixing height", "text", ""], ["transportWind", "Transport wind", "text", ""]],
  "AF.W": [["volcano", "Volcano / source", "text", ""], ["ashMin", "Ashfall minimum (in)", "number", "0.25"], ["ashMax", "Ashfall maximum (in)", "number", ""], ["debris", "Other volcanic hazards", "text", "significant debris, lava, or lahar flows"], ["direction", "Ash plume direction", "text", ""], ["impactedInfrastructure", "Infrastructure / communities affected", "text", ""]],
  "AF.Y": [["volcano", "Volcano / source", "text", ""], ["ashMin", "Ashfall minimum (in)", "number", ""], ["ashMax", "Ashfall maximum (in)", "number", "0.25"], ["direction", "Ash plume direction", "text", ""], ["impactedInfrastructure", "Infrastructure / communities affected", "text", ""]],
  "FZ.W": [["temperature", "Minimum shelter temperature (°F)", "number", "32"], ["duration", "Freeze duration", "text", ""], ["hardFreeze", "Hard-freeze wording / threshold", "text", ""], ["growingSeason", "Growing-season status", "text", "locally defined growing season"]],
  "FZ.A": [["temperature", "Potential minimum shelter temperature (°F)", "number", "32"], ["confidence", "Forecast confidence / uncertainty", "text", ""], ["growingSeason", "Growing-season status", "text", "locally defined growing season"]],
  "FR.Y": [["temperature", "Minimum shelter temperature (°F)", "text", "33 to 36"], ["radiational", "Radiational-cooling conditions", "text", "light winds and clear skies"], ["growingSeason", "Growing-season status", "text", "locally defined growing season"]]
};
const coastalFloodFields = [
  ["waterLevel", "Inundation above ground / normal high tide", "text", "1 to 2 feet above ground level"],
  ["verticalDatum", "Secondary vertical datum (optional)", "text", "e.g. 10 feet MLLW"],
  ["tideTiming", "Tide / peak-water timing", "text", "around the times of high tide"],
  ["waveHeight", "Wave height / runup", "text", ""],
  ["erosion", "Shoreline erosion", "text", ""],
  ["locations", "Most vulnerable locations", "text", "low-lying shoreline roads and property"]
];
const builtInCoastalFieldsByCode = {
  "CF.W": coastalFloodFields, "CF.Y": coastalFloodFields,
  "CF.A": coastalFloodFields.map((field) => [field[0], `Potential ${field[1].toLowerCase()}`, field[2], field[3]]),
  "LS.W": [["waterLevel", "Lake level / wave runup", "text", ""], ["waveHeight", "Wave height", "text", ""], ["erosion", "Shoreline erosion", "text", ""], ["locations", "Most vulnerable locations", "text", ""]],
  "LS.Y": [["waterLevel", "Lake level / wave runup", "text", ""], ["waveHeight", "Wave height", "text", ""], ["erosion", "Shoreline erosion", "text", ""], ["locations", "Most vulnerable locations", "text", ""]],
  "LS.A": [["waterLevel", "Potential lake level / runup", "text", ""], ["waveHeight", "Potential wave height", "text", ""], ["erosion", "Potential shoreline erosion", "text", ""], ["locations", "Most vulnerable locations", "text", ""]],
  "SU.W": [["surfHeight", "Dangerous breaking surf height", "text", ""], ["wavePeriod", "Dominant wave period", "text", ""], ["risk", "Rip-current risk (low, moderate, or high)", "text", "high"], ["timing", "Peak surf timing", "text", ""], ["locations", "Beaches / shoreline affected", "text", ""]],
  "SU.Y": [["surfHeight", "Breaking surf height", "text", ""], ["wavePeriod", "Dominant wave period", "text", ""], ["risk", "Rip-current risk (low, moderate, or high)", "text", "high"], ["timing", "Peak surf timing", "text", ""], ["locations", "Beaches / shoreline affected", "text", ""]],
  "RP.S": [["risk", "Rip-current risk (moderate or high)", "text", "high"], ["surfHeight", "Surf height", "text", ""], ["timing", "Risk timing", "text", ""], ["locations", "Beaches affected", "text", ""]],
  "BH.S": [["hazards", "Beach / swim hazards", "text", "rough surf and dangerous currents"], ["risk", "Rip-current or swim risk (one qualifier)", "text", "high"], ["surfHeight", "Surf / wave height", "text", ""], ["waterTemperature", "Water temperature", "text", ""], ["environmentalHazard", "Environmental hazard / coordinating agency", "text", ""], ["timing", "Hazard timing", "text", ""], ["locations", "Beaches affected", "text", ""]],
  "CF.S": [["hazards", "Coastal hazard / information", "text", ""], ["agency", "Coordinating agency / source", "text", ""], ["timing", "Timing", "text", ""], ["locations", "Coastal locations affected", "text", ""]],
  "LS.S": [["hazards", "Lakeshore hazard / information", "text", ""], ["agency", "Coordinating agency / source", "text", ""], ["timing", "Timing", "text", ""], ["locations", "Lakeshore locations affected", "text", ""]]
};
const builtInFieldsByGroup = {
  Wind: [["direction", "Wind direction", "text", "west"], ["sustained", "Sustained wind (mph)", "number", ""], ["gust", "Peak wind gust (mph)", "number", ""]],
  "Heat / cold": [["temperature", "Temperature (°F)", "number", ""], ["heatIndex", "Heat index (°F)", "number", ""], ["windChill", "Wind chill (°F)", "number", ""], ["overnight", "Overnight low (°F)", "number", ""]],
  Visibility: [["visibility", "Visibility", "text", "one quarter mile or less"], ["direction", "Wind direction", "text", ""], ["gust", "Peak wind gust (mph)", "number", ""], ["source", "Smoke / dust source", "text", ""]],
  "Freeze / frost": [["temperature", "Minimum temperature (°F)", "number", ""]],
  Flood: [["floodCause", "Flooding cause", "text", "excessive rainfall"], ["rainMin", "Rainfall minimum (in)", "number", ""], ["rainMax", "Rainfall maximum (in)", "number", ""], ["localRain", "Locally higher amount (in)", "number", ""]],
  "Coastal / lakeshore": [["waterLevel", "Water level / surge", "text", ""], ["waveHeight", "Wave height", "text", ""], ["surfHeight", "Surf height", "text", ""], ["risk", "Rip-current risk", "text", "high"], ["timing", "Timing", "text", ""], ["locations", "Most vulnerable locations", "text", ""]],
  Marine: [["windMin", "Sustained wind minimum (kt)", "number", ""], ["windMax", "Sustained wind maximum (kt)", "number", ""], ["gust", "Peak gust (kt)", "number", ""], ["waveHeight", "Wave height", "text", ""], ["wavePeriod", "Wave period", "text", ""], ["waveSteepness", "Wave steepness / swell direction", "text", ""], ["visibility", "Visibility", "text", ""], ["icingRate", "Ice accumulation rate", "text", ""]]
};

function editableFields(code, template = {}) {
  const source = Array.isArray(template.fields) && template.fields.length
    ? template.fields.map((field) => [field.key, field.label, field.type, field.placeholder, field.enabled, field.placement])
    : (builtInFireFields[code] || builtInWinterFieldsByCode[code] || builtInNpwFieldsByCode[code] || builtInCoastalFieldsByCode[code] || builtInFieldsByGroup[hazardMeta(code).group] || []);
  return source.map(([key, label, type, placeholder, enabled = true, placement]) => ({
    key,
    label,
    type,
    placeholder,
    enabled,
    placement: placement || (hazardMeta(code).style === "rfw" ? "automatic" : "what")
  }));
}

function inputFieldEditor(code, template) {
  const fields = editableFields(code, template);
  return `<div class="template-section template-input-fields">
    <h4>Operator input fields</h4>
    <p class="field-hint">Choose where each value appears. Use Token only when you want to place it manually in the body template with <code>{{FIELD_KEY}}</code> or <code>{{FIELD_KEY_BLOCK}}</code>.</p>
    <div class="template-field-list">${fields.map((field, index) => `<div class="template-field-row" data-code="${escapeHtml(code)}" data-field-key="${escapeHtml(field.key)}">
      <div class="field-card-head"><label class="field-enable"><input class="field-enabled" type="checkbox" ${field.enabled ? "checked" : ""}><span>Enabled</span></label><code class="field-key-display">${escapeHtml(field.key)}</code></div>
      <label class="field-control"><span>Operator label</span><input class="field-label" value="${escapeHtml(field.label)}" maxlength="100"></label>
      <label class="field-control"><span>Input type</span><select class="field-type"><option value="text"${field.type === "text" ? " selected" : ""}>Text</option><option value="number"${field.type === "number" ? " selected" : ""}>Number</option></select></label>
      <label class="field-control"><span>Example shown to operator</span><input class="field-placeholder" value="${escapeHtml(field.placeholder || "")}" maxlength="300" placeholder="Optional example"></label>
      <label class="field-control"><span>Place value in alert</span><select class="field-placement"><option value="automatic"${field.placement === "automatic" ? " selected" : ""}>Automatic generator</option><option value="what"${field.placement === "what" ? " selected" : ""}>WHAT</option><option value="where"${field.placement === "where" ? " selected" : ""}>WHERE</option><option value="when"${field.placement === "when" ? " selected" : ""}>WHEN</option><option value="impacts"${field.placement === "impacts" ? " selected" : ""}>IMPACTS</option><option value="details"${field.placement === "details" ? " selected" : ""}>Additional details</option><option value="template"${field.placement === "template" ? " selected" : ""}>Template token only</option></select></label>
      <div class="field-card-actions"><span class="field-move"><button type="button" class="ghost-button field-up" aria-label="Move field up"${index === 0 ? " disabled" : ""}>↑ Up</button><button type="button" class="ghost-button field-down" aria-label="Move field down"${index === fields.length - 1 ? " disabled" : ""}>↓ Down</button></span><button type="button" class="ghost-button field-remove" aria-label="Disable field">Disable</button></div>
    </div>`).join("")}</div>
    <button type="button" class="ghost-button" data-add-template-field="${escapeHtml(code)}">Add input field</button>
  </div>`;
}

function hazardMeta(code) {
  return hazardCatalog.find((h) => h.code === code)
    || { code, name: code, product: "NPW", style: "standard", group: "Other", impacts: "", color: HAZARD_COLORS[code] || "#8FA8BA" };
}

function hazardColor(code, fallback) {
  const h = hazardCatalog.find((item) => item.code === code);
  const fromStore = templates[code]?.color;
  const color = h?.color || fromStore || HAZARD_COLORS[code] || fallback || "#8FA8BA";
  return /^#[0-9A-Fa-f]{6}$/i.test(String(color)) ? String(color) : "#8FA8BA";
}

function colorSwatchHtml(code, { editable = false } = {}) {
  const color = hazardColor(code);
  if (editable) {
    return `<label class="hazard-color-control" title="Map color">
      <span class="hazard-color-swatch" data-swatch-for="${escapeHtml(code)}" style="background:${escapeHtml(color)}"></span>
      <input type="color" class="hazard-color-input" data-color-for="${escapeHtml(code)}" value="${escapeHtml(color)}" aria-label="Hazard map color">
      <code class="hazard-color-hex">${escapeHtml(color.toUpperCase())}</code>
    </label>`;
  }
  return `<span class="hazard-color-swatch" title="Map color ${escapeHtml(color.toUpperCase())}" style="background:${escapeHtml(color)}" aria-hidden="true"></span><code class="hazard-color-hex is-muted">${escapeHtml(color.toUpperCase())}</code>`;
}

function builtInBody(code) {
  return hazardMeta(code).style === "rfw" ? builtInRfwBody : builtInStandardBody;
}

function builtInCta(code, name) {
  const n = name || hazardMeta(code).name || "";
  if (code === "FA.A" || code === "FF.A") {
    if (String(n).toLowerCase().includes("flash")) {
      return "You should monitor later forecasts and be prepared to take action quickly if flash flooding is observed or a Flash Flood Warning is issued. Move to higher ground if flooding develops.";
    }
    return "You should monitor later forecasts and be alert for possible Flood Warnings. Those living in areas prone to flooding should be prepared to take action should flooding develop.";
  }
  if (code === "FW.W") return "A Red Flag Warning means that critical fire weather conditions are either occurring now or will shortly. Strong winds, low relative humidity, and warm temperatures can contribute to extreme fire behavior.";
  if (code === "FW.A") return "A Fire Weather Watch means that critical fire weather conditions are possible. Continue to monitor the latest forecasts and be prepared to act.";
  if (n.includes("Heat")) return "Drink plenty of fluids, stay in an air-conditioned room, stay out of the sun, and check up on relatives and neighbors.";
  if (n.includes("Cold") || n.includes("Wind Chill")) return "Use caution while traveling outside. Wear appropriate clothing, a hat, and gloves, and ensure pets and vulnerable people have adequate shelter.";
  if (n.includes("Smoke")) return "If driving, slow down, use headlights, and leave plenty of distance ahead. People with respiratory illness should limit outdoor exposure.";
  if (n.includes("Air Stagnation")) return "People with respiratory illness should follow the advice of their physician and local air quality officials.";
  if (n.includes("Fog")) return "If driving, slow down, use your headlights, and leave plenty of distance ahead of you.";
  if (n.includes("Freeze") || n.includes("Frost")) return "Take steps now to protect tender plants from the cold.";
  if (n.includes("Rip Current")) return "Swim near a lifeguard. If caught in a rip current, relax and float. Swim parallel to shore until free of the current, then swim at an angle toward shore.";
  if (n.includes("Beach Hazards") || n.includes("High Surf")) return "Stay out of the water. Never swim alone. Stay off jetties and piers, and never turn your back on the ocean or lake.";
  if (n.includes("Coastal Flood") || n.includes("Lakeshore Flood")) return "Do not drive through flooded roads. Move vehicles and equipment out of low-lying coastal or lakeshore areas before flooding begins.";
  if (winterHazards.has(code) || n.includes("Watch") && hazardMeta(code).product === "WSW") {
    if (String(n).includes("Watch")) return "A Watch means that hazardous winter weather is possible. Continue to monitor the latest forecasts and be prepared to change plans if warnings are issued.";
    return "Slow down and use caution while traveling. The latest road conditions can be obtained by calling 5 1 1.";
  }
  return "Secure outdoor objects. Use extra caution when driving, especially if operating a high profile vehicle.";
}
const host = document.querySelector("#templates");
const status = document.querySelector("#status");
let templates = {};
const regionHost = document.querySelector("#regions");
const regionEditor = document.querySelector("#regionEditor");
const regionStatus = document.querySelector("#regionStatus");
const ncepIntegrationState = document.querySelector("#ncepIntegrationState");
const ncepIntegrationChecks = document.querySelector("#ncepIntegrationChecks");
const ncepIntegrationNote = document.querySelector("#ncepIntegrationNote");
const ncepSubmitButton = document.querySelector("#submitNcepForecast");
const ncepScheduleAmendment=document.querySelector("#ncepScheduleAmendment");
const ncepAmendmentRequest=document.querySelector("#ncepAmendmentRequest");
const ncepAmendmentBounds=document.querySelector("#ncepAmendmentBounds");
const ncepAmendmentSchedule=document.querySelector("#ncepAmendmentSchedule");
const ncepAmendmentConfirmed=document.querySelector("#ncepAmendmentConfirmed");
const amendNcepBounds=document.querySelector("#amendNcepBounds");
const ncepScheduleSelect=document.querySelector("#ncepScheduleSelect");
const loadNcepScheduleButton=document.querySelector("#loadNcepSchedule");
const adminTabs = [...document.querySelectorAll("[data-admin-tab]")];
let temporaryRegions = [];
let editableNcepSchedule=null;

async function loadNcepScheduleChoices(){
  try{
    const response=await fetch("/api/ops/admin/ncep-forecast-requests",{cache:"no-store"}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
    const active=(data.requests||[]).filter((item)=>{
      const state=String(item.state||item.status||"").toLowerCase(),decision=String(item.decision||"").toLowerCase();
      return ["hourly","scheduled"].includes(String(item.frequency||"").toLowerCase())&&decision==="approved"&&!["complete","denied","failed"].includes(state);
    });
    const saved=localStorage.getItem("zncave-ncep-request-id")||"";
    ncepScheduleSelect.innerHTML=active.length
      ?active.map((item)=>`<option value="${escapeHtml(item.requestId||item.request_id||item.id)}">${escapeHtml(item.domain||"WRF")} · ${escapeHtml(item.name||"Recurring forecast")} · ${escapeHtml(String(item.status||item.state||"active").replaceAll("_"," "))}</option>`).join("")
      :'<option value="">No editable approved schedules</option>';
    if(active.some((item)=>(item.requestId||item.request_id||item.id)===saved))ncepScheduleSelect.value=saved;
    loadNcepScheduleButton.disabled=!active.length;
  }catch(error){
    ncepScheduleSelect.innerHTML=`<option value="">Schedules unavailable</option>`;
    loadNcepScheduleButton.disabled=true;
  }
}
function removeExpiredAdminRegions() {
  const active = temporaryRegions[activeRegionIndex];
  const activeId = active?.id || "";
  const next = temporaryRegions.filter((region) => !region.expiresAt || Date.parse(region.expiresAt) > Date.now());
  if (next.length === temporaryRegions.length) return;
  temporaryRegions = next;
  activeRegionIndex = Math.max(0, temporaryRegions.findIndex((region) => region.id === activeId));
  renderRegions();
  regionStatus.textContent = "Expired mesoscale zones were removed from the admin map.";
}
let activeRegionIndex = -1;
let ncepSubmissionEnabled = false;
let ncepStatusTimer = null;
const ncepPendingExternalIdKey="zncave-ncep-pending-external-id-v2";
sessionStorage.removeItem("zncave-ncep-pending-external-id");
let pendingNcepExternalId = sessionStorage.getItem(ncepPendingExternalIdKey) || "";
let ncepCapabilities = null;
function wrfDisplayBounds(region){
  const west=Number(region.west),south=Number(region.south),east=Number(region.east),north=Number(region.north);
  const centerLongitude=(west+east)/2,centerLatitude=(south+north)/2,longitudeScale=Math.cos(centerLatitude*Math.PI/180),targetAspect=1400/654;
  const projectedWidth=(east-west)*longitudeScale,geographicHeight=north-south;
  const enclose=(bounds)=>{
    // Preserve the map ratio while adding a microscopic safety margin. This
    // prevents floating-point projection math from placing an edge a few
    // trillionths of a degree inside the requested model domain.
    const cx=(bounds.west+bounds.east)/2,cy=(bounds.south+bounds.north)/2,scale=1.000002;
    return {west:cx+(bounds.west-cx)*scale,south:cy+(bounds.south-cy)*scale,east:cx+(bounds.east-cx)*scale,north:cy+(bounds.north-cy)*scale};
  };
  if(projectedWidth/geographicHeight<targetAspect){
    const longitudeWidth=Math.min(30,geographicHeight*targetAspect/longitudeScale);
    return enclose({west:centerLongitude-longitudeWidth/2,south,east:centerLongitude+longitudeWidth/2,north});
  }
  const latitudeHeight=Math.min(24,projectedWidth/targetAspect);
  return enclose({west,south:centerLatitude-latitudeHeight/2,east,north:centerLatitude+latitudeHeight/2});
}
const fallbackRegions = [["", "Full United States"], ["northeast", "Northeast"], ["central-us", "Central US"], ["southern-plains", "Southern Plains"], ["northern-plains", "Northern Plains"], ["ohio-valley", "Ohio Valley"], ["southeast", "Southeast"], ["west", "West"], ["philadelphia-dma", "Philadelphia DMA"], ["arizona", "Arizona"], ["maine", "Maine"], ["north-dakota", "North Dakota"], ["oregon", "Oregon"], ["tennessee", "Tennessee"], ["wisconsin", "Wisconsin"], ["wyoming", "Wyoming"]];
const maxMesoLongitudeSpan=10,maxMesoLatitudeSpan=8,modelMapFrameAspect=14/9,adminMapAspect=1180/530;
const mesoLatitudePerLongitude=(26.5/59)*(adminMapAspect/modelMapFrameAspect);
function constrainMesoRegion(region){
  const west=Number(region.west),east=Number(region.east),south=Number(region.south),north=Number(region.north);
  if(![west,east,south,north].every(Number.isFinite))return region;
  const centerLongitude=(west+east)/2,centerLatitude=(south+north)/2;
  const requestedWidth=Math.min(maxMesoLongitudeSpan,Math.max(.25,east-west)),requestedHeight=Math.min(maxMesoLatitudeSpan,Math.max(.25,north-south));
  const width=Math.min(requestedWidth,requestedHeight/mesoLatitudePerLongitude,maxMesoLatitudeSpan/mesoLatitudePerLongitude),height=width*mesoLatitudePerLongitude;
  const nextWest=Math.max(-125.5,Math.min(-66.5-width,centerLongitude-width/2)),nextSouth=Math.max(24,Math.min(50.5-height,centerLatitude-height/2));
  Object.assign(region,{west:+nextWest.toFixed(2),east:+(nextWest+width).toFixed(2),south:+nextSouth.toFixed(2),north:+(nextSouth+height).toFixed(2)});
  return region;
}
const builtInStructure = `000
{{WMO_HEADER}} K{{WFO}} {{ISSUE_DDHHMM}}
{{PIL}}

{{PRODUCT_BANNER}}
ZASNet Weather Service {{OFFICE}}
{{ISSUE_TIME}}

{{UGC}}
{{VTEC}}
{{HYDRO_VTEC}}
{{ZONE_NAMES}}
{{CITY_BLOCK}}
{{ISSUE_TIME}}

{{HEADLINE}}

{{ACTION_NARRATIVE}}

{{TERMINATOR}}`;

function selectAdminView(view,{updateHash=true}={}) {
  const selected=["meso","warnings","native"].includes(view)?view:"meso";
  document.body.dataset.adminView=selected;
  adminTabs.forEach((tab)=>tab.setAttribute("aria-selected",String(tab.dataset.adminTab===selected)));
  if(updateHash) history.replaceState({}, "", `${location.pathname}${location.search}#${selected}`);
}

adminTabs.forEach((tab)=>tab.addEventListener("click",()=>selectAdminView(tab.dataset.adminTab)));
window.addEventListener("hashchange",()=>selectAdminView(location.hash.slice(1),{updateHash:false}));
selectAdminView(location.hash.slice(1),{updateHash:false});

const nativeWorkstationState = document.querySelector("#nativeWorkstationState");
const nativeDeviceList = document.querySelector("#nativeDeviceList");
const nativeEnrollmentForm = document.querySelector("#nativeEnrollmentForm");
const nativeEnrollmentCode = document.querySelector("#nativeEnrollmentCode");
const nativeEnrollmentCodeValue = document.querySelector("#nativeEnrollmentCodeValue");
const nativeEnrollmentCodeExpiry = document.querySelector("#nativeEnrollmentCodeExpiry");

function nativeTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Unknown";
}

function renderNativeWorkstations(data = {}) {
  const active = (data.devices || []).filter((device) => !device.revokedAt);
  const revoked = (data.devices || []).filter((device) => device.revokedAt);
  const pending = data.pending || [];
  nativeWorkstationState.textContent = `${active.length} active · ${pending.length} pending`;
  nativeWorkstationState.className = `integration-state ${active.length ? "is-ready" : "is-locked"}`;
  const rows = [
    ...pending.map((entry) => `<article class="native-device-row"><div><strong>${escapeHtml(entry.name)}</strong><small>Created by ${escapeHtml(entry.createdBy)} · expires ${escapeHtml(nativeTime(entry.expiresAt))}</small></div><span class="device-state">Pending</span><button type="button" data-revoke-native="${escapeHtml(entry.id)}">Cancel</button></article>`),
    ...active.map((device) => `<article class="native-device-row"><div><strong>${escapeHtml(device.name)}</strong><small>Enrolled by ${escapeHtml(device.createdBy)} · ${escapeHtml(nativeTime(device.createdAt))}</small></div><span class="device-state">Active</span><button type="button" data-revoke-native="${escapeHtml(device.id)}">Revoke</button></article>`),
    ...revoked.map((device) => `<article class="native-device-row is-revoked"><div><strong>${escapeHtml(device.name)}</strong><small>Revoked ${escapeHtml(nativeTime(device.revokedAt))}</small></div><span class="device-state">Revoked</span><span></span></article>`)
  ];
  nativeDeviceList.innerHTML = rows.length ? rows.join("") : "<p>No native workstations are enrolled.</p>";
}

async function loadNativeWorkstations() {
  try {
    const response = await fetch("/api/ops/admin/native-workstations", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    renderNativeWorkstations(data);
  } catch (error) {
    nativeWorkstationState.textContent = "Unavailable";
    nativeWorkstationState.className = "integration-state is-locked";
    nativeDeviceList.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
  }
}

nativeEnrollmentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = String(document.querySelector("#nativeWorkstationName")?.value || "").trim();
  const button = nativeEnrollmentForm.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const response = await fetch("/api/ops/admin/native-workstations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    nativeEnrollmentCodeValue.textContent = data.code;
    nativeEnrollmentCodeExpiry.textContent = `Expires ${nativeTime(data.pending.expiresAt)}. It is shown only here.`;
    nativeEnrollmentCode.hidden = false;
    await loadNativeWorkstations();
  } catch (error) {
    nativeEnrollmentCodeValue.textContent = error.message;
    nativeEnrollmentCodeExpiry.textContent = "Enrollment code was not created.";
    nativeEnrollmentCode.hidden = false;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#copyNativeEnrollmentCode")?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(nativeEnrollmentCodeValue.textContent || "");
  document.querySelector("#copyNativeEnrollmentCode").textContent = "Copied";
});

nativeDeviceList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-revoke-native]");
  if (!button || !confirm("Revoke this native workstation or cancel its pending enrollment?")) return;
  button.disabled = true;
  const response = await fetch(`/api/ops/admin/native-workstations?id=${encodeURIComponent(button.dataset.revokeNative)}`, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) alert(data.error || `HTTP ${response.status}`);
  await loadNativeWorkstations();
});

loadNativeWorkstations();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function localDateTimeValue(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function renderWrfUpdateSectors(sectors = []) {
  const host = document.querySelector("#wrfUpdateSectors");
  if (!host) return;
  if (!sectors.length) {
    host.innerHTML = `<span>No published WRF sectors are currently available.</span>`;
    return;
  }
  host.innerHTML = `<div class="wrf-sector-list">${sectors.map((sector) => {
    const hours = sector.forecastHours || [], maximum = hours.length ? Math.max(...hours) : 0;
    return `<span><strong>${escapeHtml(sector.domain)}</strong> · ${Number(sector.spacing) || "—"} km · through F${String(Math.floor(maximum)).padStart(2, "0")}${maximum % 1 ? `:${String(Math.round(maximum % 1 * 60)).padStart(2, "0")}` : ""} · ${sector.products.length} products</span>`;
  }).join("")}</div>`;
}

async function loadWrfOperationsUpdate() {
  const state = document.querySelector("#wrfUpdateState"), note = document.querySelector("#wrfUpdateNote");
  if (!state) return;
  try {
    const response = await fetch("/api/ops/admin/wrf-operations-update", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    document.querySelector("#wrfUpdateTitle").value = data.title || "ZNWS-WRF Operations Update";
    document.querySelector("#wrfUpdateSummary").value = data.summary || "";
    document.querySelector("#wrfUpdateExpires").value = localDateTimeValue(data.expiresAt);
    document.querySelector("#wrfUpdatePublished").checked = Boolean(data.published);
    renderWrfUpdateSectors(data.sectors);
    state.textContent = data.published && !data.expired ? "Published" : data.expired ? "Expired" : "Draft";
    state.className = `integration-state ${data.published && !data.expired ? "is-ready" : "is-locked"}`;
    note.textContent = data.updatedAt ? `Last saved ${new Date(data.updatedAt).toLocaleString()}` : "Not published yet.";
  } catch (error) {
    state.textContent = "Unavailable";
    state.className = "integration-state is-locked";
    note.textContent = `Could not load update: ${error.message}`;
  }
}

document.querySelector("#saveWrfUpdate")?.addEventListener("click", async (event) => {
  const button = event.currentTarget, note = document.querySelector("#wrfUpdateNote");
  button.disabled = true;
  note.textContent = "Saving operations update…";
  try {
    const expiresValue = document.querySelector("#wrfUpdateExpires").value;
    const response = await fetch("/api/ops/admin/wrf-operations-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.querySelector("#wrfUpdateTitle").value,
        summary: document.querySelector("#wrfUpdateSummary").value,
        expiresAt: expiresValue ? new Date(expiresValue).toISOString() : "",
        published: document.querySelector("#wrfUpdatePublished").checked
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    renderWrfUpdateSectors(data.sectors);
    document.querySelector("#wrfUpdateState").textContent = data.published && !data.expired ? "Published" : "Draft";
    document.querySelector("#wrfUpdateState").className = `integration-state ${data.published && !data.expired ? "is-ready" : "is-locked"}`;
    note.textContent = data.published && !data.expired ? "Public operations update is live." : "Operations update saved as a draft.";
  } catch (error) {
    note.textContent = `Save failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

loadWrfOperationsUpdate();

function syncNcepProductGroupToggles(){
  document.querySelectorAll("#ncepProductChoices section").forEach((section)=>{
    const toggle=section.querySelector("[data-select-product-group]"),items=[...section.querySelectorAll('input[name="products"]:not(:disabled)')];
    if(!toggle)return;
    const selected=items.filter((input)=>input.checked).length;
    toggle.checked=items.length>0&&selected===items.length;
    toggle.indeterminate=selected>0&&selected<items.length;
    toggle.disabled=items.length===0;
  });
}

function renderNcepIntegration(data) {
  const prepared=Boolean(data.prepared),keyReady=Boolean(data.apiKeyConfigured),enabled=Boolean(data.submissionsEnabled&&data.submissionRouteExposed);
  ncepSubmissionEnabled=enabled;
  ncepCapabilities=data.capabilities||null;
  ncepIntegrationState.className=`integration-state ${enabled?"is-ready":"is-locked"}`;
  ncepIntegrationState.textContent=enabled?"Ready":"Prepared · inactive";
  ncepSubmitButton.textContent=enabled?"Submit for approval":"Awaiting approval API and key";
  ncepIntegrationChecks.innerHTML=[
    [prepared,"Client prepared"],
    [keyReady,"API key configured"],
    [Boolean(data.submissionRouteExposed),"Submission route exposed"],
    [enabled,"Forecast requests enabled"]
  ].map(([ready,label])=>`<span class="${ready?"is-ready":"is-pending"}"><i></i>${escapeHtml(label)}</span>`).join("");
  ncepIntegrationNote.textContent=data.note||"No forecast requests can be sent from Ops yet.";
  const start=new Date(Math.ceil(Date.now()/900_000)*900_000),end=new Date(start.getTime()+3*3_600_000);
  document.querySelector("#ncepCoverageStart").value=localDateTimeValue(start);
  document.querySelector("#ncepCoverageEnd").value=localDateTimeValue(end);
  const cycle=new Date(start);cycle.setMinutes(0,0,0);
  const runSelect=document.querySelector("#ncepCycleTime"),previousRun=runSelect.value;
  const availableRuns=(Array.isArray(data.availableRuns)?data.availableRuns:[]).filter((run)=>run?.ready!==false&&run?.cycle);
  runSelect.innerHTML=availableRuns.length
    ?availableRuns.map((run)=>{
      const date=new Date(run.cycle),fallback=Number.isFinite(date.getTime())?`${date.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"UTC"})} UTC`:run.cycle;
      return `<option value="${escapeHtml(run.cycle)}">${escapeHtml(run.label||fallback)}</option>`;
    }).join("")
    :'<option value="">No HRRR runs reported</option>';
  if(availableRuns.some((run)=>run.cycle===previousRun))runSelect.value=previousRun;
  const initializationSelect=document.querySelector("#ncepInitialization");
  const previousInitialization=initializationSelect.value;
  const initializationLabels={
    HRRR:"HRRR — direct HRRR initialization",
    HRRR_WRFDA:"HRRR + radiosonde assimilation",
    HRRR_WRFDA_ASOS:"HRRR + upper-air + ASOS/METAR — no NEXRAD",
    HRRR_WRFDA_RADAR:"HRRR + radiosondes and NEXRAD radial velocity",
    RAP:"RAP — direct RAP initialization",
    RAP_WRFDA:"RAP + radiosonde assimilation",
    RAP_WRFDA_ASOS:"RAP + upper-air + ASOS/METAR — no NEXRAD",
    RRFS:"RRFS — RRFS direct initialization · Experimental",
    RRFS_WRFDA_ASOS:"RRFS with upper-air and ASOS WRFDA · Experimental"
  };
  const explicitInitializationCodes=new Set(["HRRR_WRFDA_ASOS","RAP_WRFDA_ASOS","RRFS","RRFS_WRFDA_ASOS"]);
  const experimentalInitializationCodes=new Set(["RRFS","RRFS_WRFDA_ASOS"]);
  const initializationItems=[...(ncepCapabilities?.initializations||[])].map((item)=>explicitInitializationCodes.has(item.code)?{...item,ready:true,experimental:item.experimental===true||experimentalInitializationCodes.has(item.code)}:item);
  explicitInitializationCodes.forEach((code)=>{if(!initializationItems.some((item)=>item.code===code))initializationItems.push({code,ready:true,experimental:experimentalInitializationCodes.has(code)});});
  const readyInitializations=initializationItems.filter((item)=>item.ready===true);
  initializationSelect.innerHTML=readyInitializations.length
    ?readyInitializations.map((item)=>`<option value="${escapeHtml(item.code)}">${escapeHtml(initializationLabels[item.code]||item.name||item.code)}</option>`).join("")
    :'<option value="">No initialization sources ready</option>';
  if(readyInitializations.some((item)=>item.code===previousInitialization))initializationSelect.value=previousInitialization;
  const physicsSelect=document.querySelector("#ncepPhysicsPreset"),previousPhysics=physicsSelect.value;
  const physicsPresets=(Array.isArray(ncepCapabilities?.physics_presets)?ncepCapabilities.physics_presets:[]).map((item)=>typeof item==="string"?{code:item,name:item}:item).filter((item)=>item?.code);
  physicsSelect.innerHTML=physicsPresets.length
    ?physicsPresets.map((item)=>`<option value="${escapeHtml(item.code)}">${escapeHtml(item.name||item.label||item.code)}</option>`).join("")
    :'<option value="OPERATIONAL">Operational Thompson</option>';
  physicsSelect.value=physicsPresets.some((item)=>item.code===previousPhysics)?previousPhysics:(physicsPresets.some((item)=>item.code==="OPERATIONAL")?"OPERATIONAL":physicsSelect.options[0]?.value||"");
  const explicitProducts=[
    {code:"REF1KM",name:"1-km AGL reflectivity",units:"dBZ",level:"1000 m above ground",grib_variable:"REFD",group:"Severe Weather",ready:true},
    {code:"WDIR10M",name:"10-meter wind direction",units:"degree true",level:"10 m above ground",grib_variable:"WDIR",group:"Surface",ready:true}
  ];
  const productList=[...(data.products||ncepCapabilities?.products||[])].map((item)=>{
    const explicit=explicitProducts.find((product)=>product.code===item.code);
    return explicit?{...item,...explicit,ready:true}:item;
  });
  explicitProducts.forEach((product)=>{if(!productList.some((item)=>item.code===product.code))productList.push(product);});
  const packageList=data.packages||[];
  const groups=new Map();productList.forEach((item)=>{if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item);});
  document.querySelector("#ncepProductChoices").innerHTML=[...groups].map(([group,items])=>{
    const packageCode={"Severe Weather":"SEVERE","Surface":"SURFACE","Precipitation":"PRECIP"}[group]||"",packageInfo=packageList.find((item)=>item.code===packageCode);
    const packageControl=packageCode?`<label class="package-choice"><input type="checkbox" name="packages" value="${packageCode}" ${packageInfo?.ready?"":"disabled"}> ${packageCode} package${packageInfo?.ready?"":" · Not ready"}</label>`:"";
    return `<section><div class="product-group-heading"><strong>${escapeHtml(group)}</strong><label><input type="checkbox" data-select-product-group> Select all available</label></div>${packageControl}${items.map((item)=>`<label><input type="checkbox" name="products" value="${escapeHtml(item.code)}" ${item.code==="REFC"?"checked":""} ${item.ready?"":"disabled"}> ${escapeHtml(item.name)}${item.ready?"":" · Not ready"}</label>`).join("")}</section>`;
  }).join("");
  syncNcepProductGroupToggles();
  ["#ncepFrequency","#ncepInitialization","#ncepPhysicsPreset","#ncepSpacing","#ncepInterval","#ncepCycleMode","#ncepCycleTime","#ncepCoverageStart","#ncepCoverageEnd","#ncepForecastHours","#ncepCadence","#ncepForecastName"].forEach((selector)=>{document.querySelector(selector).disabled=!enabled;});
  initializationSelect.disabled=!enabled||!readyInitializations.length;
  syncNcepRequestForm();
  const activeRequest=localStorage.getItem("zncave-ncep-request-id");
  if(enabled&&activeRequest)pollNcepForecastRequest(activeRequest);
  if(enabled)loadNcepScheduleChoices();
}

function syncNcepRequestForm() {
  const region=temporaryRegions[activeRegionIndex],domain=document.querySelector("#ncepDomain"),name=document.querySelector("#ncepForecastName"),frequency=document.querySelector("#ncepFrequency").value;
  const boundsConfirmed=document.querySelector("#ncepBoundsConfirmed"),boundsValues=document.querySelector("#ncepBoundsValues");
  const assignedDomains=(Array.isArray(region?.domains)&&region.domains.length?region.domains:[region?.domain]).filter(Boolean);
  const previousDomain=domain.value;
  domain.innerHTML=assignedDomains.length?assignedDomains.map((value)=>`<option value="${value}">${value}</option>`).join(""):'<option value="">Not assigned</option>';
  domain.value=assignedDomains.includes(previousDomain)?previousDomain:(assignedDomains[0]||"");
  domain.disabled=!ncepSubmissionEnabled||assignedDomains.length<2;
  domain.closest("label").classList.toggle("is-unassigned",Boolean(region&&!assignedDomains.length));
  if(region&&name.dataset.regionId!==region.id){name.value=region.label?`${region.label} Forecast`:"";name.dataset.regionId=region.id||"";}
  const selectedDomain=domain.value,domainCapability=ncepCapabilities?.domains?.[selectedDomain],domainValid=Boolean(domainCapability);
  const recurrenceFrequency=selectedDomain==="MESO1"?"hourly":selectedDomain==="MESO3"?"scheduled":"";
  const allowedFrequencies=["once",...(recurrenceFrequency?[recurrenceFrequency]:[])],frequencySelect=document.querySelector("#ncepFrequency");
  frequencySelect.innerHTML=allowedFrequencies.map((value)=>`<option value="${value}">${value==="once"?"One-time forecast":"Recurring schedule"}</option>`).join("");
  if(allowedFrequencies.includes(frequency))frequencySelect.value=frequency;
  const cycleMode=document.querySelector("#ncepCycleMode"),activeFrequency=frequencySelect.value,recurring=activeFrequency!=="once",specificCycle=!recurring&&cycleMode.value==="specific";
  const hasAvailableRuns=Boolean(document.querySelector("#ncepCycleTime").value);
  cycleMode.querySelector('option[value="specific"]').disabled=!hasAvailableRuns;
  if(specificCycle&&!hasAvailableRuns)cycleMode.value="latest";
  const cadences=Array.from({length:24},(_,index)=>index+1),cadence=document.querySelector("#ncepCadence"),previousCadence=Number(cadence.value)||6;
  cadence.innerHTML=cadences.map((value)=>`<option value="${value}">Every ${value} hour${value===1?"":"s"}</option>`).join("");
  cadence.value=String(cadences.includes(previousCadence)?previousCadence:6);
  const bounds=[region?.west,region?.south,region?.east,region?.north].map(Number),boundsValid=Boolean(region)&&bounds.every(Number.isFinite);
  const boundsSignature=boundsValid?bounds.map((value)=>value.toFixed(4)).join(","):"";
  if(boundsConfirmed.dataset.boundsSignature!==boundsSignature){boundsConfirmed.checked=false;boundsConfirmed.dataset.boundsSignature=boundsSignature;}
  boundsConfirmed.disabled=!ncepSubmissionEnabled||!region?.id||!domainValid||!boundsValid;
  boundsValues.textContent=boundsValid?`N ${bounds[3].toFixed(4)}° · S ${bounds[1].toFixed(4)}° · E ${bounds[2].toFixed(4)}° · W ${bounds[0].toFixed(4)}°`:"Select a published mesoscale rectangle.";
  document.querySelector("#ncepForecastHoursField").hidden=!recurring;
  document.querySelector("#ncepCadenceField").hidden=!recurring;
  document.querySelector("#ncepCycleModeField").hidden=recurring;
  document.querySelector("#ncepCycleTimeField").hidden=!specificCycle;
  document.querySelector("#ncepStartLabel").textContent=recurring?"Schedule begins":"Coverage begins";
  document.querySelector("#ncepEndLabel").textContent=recurring?"Schedule ends":"Coverage ends";
  document.querySelector("#ncepCoverageStart").step=recurring?"3600":"900";
  document.querySelector("#ncepCoverageEnd").step=recurring?"3600":"900";
  document.querySelector("#ncepNameLabel").textContent=recurring?"Schedule name":"Forecast name";
  ncepSubmitButton.disabled=!ncepSubmissionEnabled||!region?.id||!domainValid;
  if(!region)ncepIntegrationNote.textContent="Select a temporary region to prepare a forecast request.";
  else if(!assignedDomains.length)ncepIntegrationNote.textContent="Assign this region to MESO1, MESO2, or MESO3, then publish the mesoscale zones.";
  else if(!region.id)ncepIntegrationNote.textContent="Publish the mesoscale zones before submitting this forecast.";
  else if(!domainValid)ncepIntegrationNote.textContent="This domain is not available in the current WRF capabilities.";
  else if(!boundsConfirmed.checked)ncepIntegrationNote.textContent="Review and confirm the exact WRF domain coordinates.";
  else if(ncepSubmissionEnabled)ncepIntegrationNote.textContent=`Ready to submit ${region.label||"this zone"} through ${selectedDomain} for approval.`;
  syncNcepAmendmentBounds();
}

function syncNcepAmendmentBounds(){
  if(!editableNcepSchedule||ncepScheduleAmendment.hidden)return;
  const region=temporaryRegions[activeRegionIndex],values=[region?.west,region?.south,region?.east,region?.north].map(Number),valid=Boolean(region)&&values.every(Number.isFinite);
  const signature=valid?values.map((value)=>value.toFixed(4)).join(","):"";
  if(ncepAmendmentConfirmed.dataset.boundsSignature!==signature){
    ncepAmendmentConfirmed.checked=false;
    ncepAmendmentConfirmed.dataset.boundsSignature=signature;
  }
  ncepAmendmentBounds.textContent=valid?`${region.label||"Selected zone"} · N ${values[3].toFixed(4)}° · S ${values[1].toFixed(4)}° · E ${values[2].toFixed(4)}° · W ${values[0].toFixed(4)}°`:"Select and draw a mesoscale zone first.";
  amendNcepBounds.disabled=!valid||!ncepAmendmentConfirmed.checked;
}

document.querySelector("#ncepBoundsConfirmed").addEventListener("change",syncNcepRequestForm);
document.querySelector("#ncepProductChoices").addEventListener("change",(event)=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=="checkbox")return;
  if(input.matches("[data-select-product-group]")){
    const section=input.closest("section");
    section?.querySelectorAll('input[name="products"]:not(:disabled)').forEach((item)=>{item.checked=input.checked;});
    const packageInput=section?.querySelector('input[name="packages"]');
    if(packageInput&&input.checked)packageInput.checked=false;
  }else if(input.name==="packages"&&input.checked){
    input.closest("section")?.querySelectorAll('input[name="products"]').forEach((item)=>{item.checked=false;});
  }else if(input.name==="products"&&input.checked){
    const packageInput=input.closest("section")?.querySelector('input[name="packages"]');
    if(packageInput)packageInput.checked=false;
  }
  syncNcepProductGroupToggles();
});

document.querySelector("#ncepFrequency").addEventListener("change",()=>{
  if(document.querySelector("#ncepFrequency").value!=="once"){
    const startInput=document.querySelector("#ncepCoverageStart"),endInput=document.querySelector("#ncepCoverageEnd");
    const start=new Date(startInput.value),end=new Date(endInput.value);
    if(Number.isFinite(start.getTime())){
      start.setMinutes(0,0,0);
      if(start.getTime()<Date.now())start.setHours(start.getHours()+1);
      startInput.value=localDateTimeValue(start);
    }
    if(Number.isFinite(end.getTime())){
      end.setMinutes(0,0,0);
      if(Number.isFinite(start.getTime())&&end<=start)end.setTime(start.getTime()+3*3_600_000);
      endInput.value=localDateTimeValue(end);
    }
  }
  syncNcepRequestForm();
});
document.querySelector("#ncepDomain").addEventListener("change",syncNcepRequestForm);
document.querySelector("#ncepCycleMode").addEventListener("change",syncNcepRequestForm);

function renderRegions() {
  if (!temporaryRegions.length) {
    regionHost.innerHTML = `<p class="empty-regions">No active zones.<br>Add a zone to begin.</p>`;
    regionEditor.innerHTML = `<div class="empty-editor"><span>MESO</span><strong>Draw a temporary weather focus area</strong><p>Add a zone, then drag across the map to set its bounds.</p></div>`;
    syncNcepRequestForm();
    return;
  }
  if (activeRegionIndex < 0 || activeRegionIndex >= temporaryRegions.length) activeRegionIndex = 0;
  regionHost.innerHTML = temporaryRegions.map((region, index) => `<button type="button" class="region-list-item ${index === activeRegionIndex ? "is-active" : ""}" data-select-region="${index}"><span>${escapeHtml(region.label || `Untitled zone ${index + 1}`)}</span><small>Ends ${new Date(region.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></button>`).join("");
  renderRegionEditor();
  syncNcepRequestForm();
}

function renderRegionEditor() {
  const region = temporaryRegions[activeRegionIndex];
  if (!region) return;
  const left = (Number(region.west) + 125.5) / 59 * 100, width = (Number(region.east) - Number(region.west)) / 59 * 100;
  const top = (50.5 - Number(region.north)) / 26.5 * 100, height = (Number(region.north) - Number(region.south)) / 26.5 * 100;
  const longitudeSpan=Number(region.east)-Number(region.west),latitudeSpan=Number(region.north)-Number(region.south),overLimit=longitudeSpan>maxMesoLongitudeSpan||latitudeSpan>maxMesoLatitudeSpan;
  regionEditor.innerHTML = `<div class="editor-heading"><div><span>Editing zone</span><strong>${escapeHtml(region.label || `Untitled zone ${activeRegionIndex + 1}`)}</strong></div><button type="button" class="danger-button" data-remove-active>Remove</button></div>
    <div class="preset-row"><span>Valid 10° × 8° presets</span><button type="button" data-preset="-78,36,-68,44">Northeast</button><button type="button" data-preset="-103,35,-93,43">Central US</button><button type="button" data-preset="-105,29,-95,37">Southern Plains</button><button type="button" data-preset="-105,41,-95,49">Northern Plains</button></div>
    <div class="zone-limit ${overLimit?"is-over-limit":""}"><span>WRF domain size</span><strong>${latitudeSpan.toFixed(2)}° latitude × ${longitudeSpan.toFixed(2)}° longitude</strong><small>Maximum 8° × 10°</small>${overLimit?'<button type="button" data-fit-meso-max>Fit to maximum</button>':""}</div>
    <div class="zone-map" id="zoneMap"><img src="/api/ops/admin/map-base.svg" alt="Map of the contiguous United States"><div class="selection-box" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%"><span>${escapeHtml(region.label || "Mesoscale zone")}</span><i data-resize="nw"></i><i data-resize="ne"></i><i data-resize="sw"></i><i data-resize="se"></i></div><div class="draw-hint">Locked to model map ratio · 14:9 · drag corners to resize</div></div>
    <div class="region-fields"><label class="field-wide">Zone name<input data-region-field="label" value="${escapeHtml(region.label || "")}" maxlength="60" placeholder="Example: Northern Plains MCS"></label><label class="field-wide">Expires at<input type="datetime-local" data-region-field="expiresAt" value="${localDateTimeValue(region.expiresAt)}"></label><label>West<input type="number" step="0.01" data-region-field="west" value="${Number(region.west).toFixed(2)}"></label><label>South<input type="number" step="0.01" data-region-field="south" value="${Number(region.south).toFixed(2)}"></label><label>East<input type="number" step="0.01" data-region-field="east" value="${Number(region.east).toFixed(2)}"></label><label>North<input type="number" step="0.01" data-region-field="north" value="${Number(region.north).toFixed(2)}"></label><fieldset class="field-wide region-domain-choices"><legend>WRF forecast slots</legend>${["MESO1","MESO2","MESO3"].map((domain)=>`<label><input type="checkbox" data-region-domain="${domain}" ${(region.domains||[region.domain]).includes(domain)?"checked":""}> ${domain}</label>`).join("")}</fieldset><label class="field-wide">Fallback after expiration<select data-region-field="fallback">${fallbackRegions.map(([value, label]) => `<option value="${value}" ${region.fallback === value ? "selected":""}>${label}</option>`).join("")}</select></label></div>`;
  installZoneMapDrawing();
}

function installZoneMapDrawing() {
  const map = document.querySelector("#zoneMap");
  const box = map.querySelector(".selection-box");
  let resize = null, drag = null;
  const point = (event) => { const rect=map.getBoundingClientRect();return { x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100)) }; };
  const boxValues = () => ({ left:parseFloat(box.style.left),top:parseFloat(box.style.top),width:parseFloat(box.style.width),height:parseFloat(box.style.height) });
  const applyBounds = () => { const b=boxValues();Object.assign(temporaryRegions[activeRegionIndex],{west:+(-125.5+b.left/100*59).toFixed(2),east:+(-125.5+(b.left+b.width)/100*59).toFixed(2),north:+(50.5-b.top/100*26.5).toFixed(2),south:+(50.5-(b.top+b.height)/100*26.5).toFixed(2)});renderRegionEditor();syncNcepRequestForm(); };
  map.addEventListener("pointerdown", (event) => {
    const handle=event.target.closest("[data-resize]");
    const selectedBox=event.target.closest(".selection-box");
    if(handle){
      event.stopPropagation();
      const b=boxValues(),corner=handle.dataset.resize;
      resize={corner,fixedX:corner.includes("w")?b.left+b.width:b.left,fixedY:corner.includes("n")?b.top+b.height:b.top};
      map.setPointerCapture(event.pointerId);
    }else if(selectedBox){
      event.stopPropagation();
      drag={start:point(event),box:boxValues()};
      box.classList.add("is-dragging");
      map.setPointerCapture(event.pointerId);
    }
  });
  map.addEventListener("pointermove", (event) => {
    if(resize){
      const p=point(event),horizontal=Math.abs(p.x-resize.fixedX),vertical=Math.abs(p.y-resize.fixedY),availableWidth=resize.corner.includes("w")?resize.fixedX:100-resize.fixedX,availableHeight=resize.corner.includes("n")?resize.fixedY:100-resize.fixedY,percentHeightPerWidth=adminMapAspect/modelMapFrameAspect;
      const maxWidth=Math.min(availableWidth,availableHeight/percentHeightPerWidth,maxMesoLongitudeSpan/59*100,(maxMesoLatitudeSpan/26.5*100)/percentHeightPerWidth);
      const width=Math.max(Math.min(6,maxWidth),Math.min(maxWidth,horizontal,vertical/percentHeightPerWidth)),height=width*percentHeightPerWidth;
      const left=resize.corner.includes("w")?resize.fixedX-width:resize.fixedX,top=resize.corner.includes("n")?resize.fixedY-height:resize.fixedY;
      box.style.left=`${Math.max(0,left)}%`;box.style.top=`${Math.max(0,top)}%`;box.style.width=`${width}%`;box.style.height=`${height}%`;
    }else if(drag){
      const p=point(event);
      box.style.left=`${Math.max(0,Math.min(100-drag.box.width,drag.box.left+p.x-drag.start.x))}%`;
      box.style.top=`${Math.max(0,Math.min(100-drag.box.height,drag.box.top+p.y-drag.start.y))}%`;
    }
  });
  map.addEventListener("pointerup", (event) => {
    if(resize){resize=null;applyBounds();return;}
    if(drag){drag=null;box.classList.remove("is-dragging");applyBounds();return;}
    if(event.target.closest(".selection-box"))return;
    const p=point(event),width=maxMesoLongitudeSpan/59*100,height=width*(adminMapAspect/modelMapFrameAspect),left=Math.max(0,Math.min(100-width,p.x-width/2)),top=Math.max(0,Math.min(100-height,p.y-height/2));
    box.style.left=`${left}%`;box.style.top=`${top}%`;box.style.width=`${width}%`;box.style.height=`${height}%`;applyBounds();
  });
}

regionHost.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-region]");
  if (!button) return;
  activeRegionIndex = Number(button.dataset.selectRegion);
  renderRegions();
});
regionEditor.addEventListener("input", (event) => { const field=event.target.dataset.regionField;if(!field)return;temporaryRegions[activeRegionIndex][field]=["west","south","east","north"].includes(field)?Number(event.target.value):event.target.value;if(field==="label")regionEditor.querySelector(".selection-box span").textContent=event.target.value||"Mesoscale zone";syncNcepRequestForm(); });
regionEditor.addEventListener("change", (event) => { if(["west","south","east","north"].includes(event.target.dataset.regionField)){constrainMesoRegion(temporaryRegions[activeRegionIndex]);renderRegionEditor();}if(event.target.dataset.regionField==="label")renderRegions();if(event.target.dataset.regionField==="domain")syncNcepRequestForm(); });
regionEditor.addEventListener("change",(event)=>{
  const selectedDomain=event.target.dataset.regionDomain;
  if(!selectedDomain)return;
  const region=temporaryRegions[activeRegionIndex],domains=new Set(region.domains||[region.domain].filter(Boolean));
  event.target.checked?domains.add(selectedDomain):domains.delete(selectedDomain);
  region.domains=[...domains];
  region.domain=region.domains[0]||"";
  syncNcepRequestForm();
});
regionEditor.addEventListener("click", (event) => {
  if(event.target.closest("[data-fit-meso-max]")){constrainMesoRegion(temporaryRegions[activeRegionIndex]);renderRegionEditor();syncNcepRequestForm();return;}
  const preset=event.target.closest("[data-preset]");
  if(preset){const [west,south,east,north]=preset.dataset.preset.split(",").map(Number);Object.assign(temporaryRegions[activeRegionIndex],{west,south,east,north});constrainMesoRegion(temporaryRegions[activeRegionIndex]);renderRegionEditor();return;}
  if(!event.target.closest("[data-remove-active]"))return;temporaryRegions.splice(activeRegionIndex,1);activeRegionIndex=Math.min(activeRegionIndex,temporaryRegions.length-1);renderRegions();
});
document.querySelector("#addRegion").addEventListener("click", () => {
  const region={ label: "", west: -105, south: 35, east: -95, north: 43, expiresAt: new Date(Date.now() + 6 * 3_600_000).toISOString(), fallback: "", domain: "" };
  constrainMesoRegion(region);
  temporaryRegions.push(region);
  activeRegionIndex = temporaryRegions.length - 1;
  renderRegions();
  regionEditor.querySelector('[data-region-field="label"]')?.focus();
});
document.querySelector("#saveRegions").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  regionStatus.className = "";
  regionStatus.textContent = "Saving mesoscale zones…";
  try {
    const regions = temporaryRegions.map((region) => ({ ...region, expiresAt: new Date(region.expiresAt).toISOString() }));
    const response = await fetch("/api/ops/admin/map-regions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regions }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    temporaryRegions = data.regions || [];
    renderRegions();
    regionStatus.className = "ok";
    regionStatus.textContent = `Saved ${temporaryRegions.length} mesoscale zone(s). Active zones are now available on public maps.`;
  } catch (error) {
    regionStatus.className = "error";
    regionStatus.textContent = `Save failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

async function pollNcepForecastRequest(requestId) {
  clearTimeout(ncepStatusTimer);
  try{
    const response=await fetch(`/api/ops/admin/ncep-forecast-requests/${encodeURIComponent(requestId)}`,{cache:"no-store"}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
    const requestState=String(data.state||data.status||"").toLowerCase(),decision=String(data.decision||"").toLowerCase(),frequency=String(data.frequency||"").toLowerCase();
    const editable=["hourly","scheduled"].includes(frequency)&&decision==="approved"&&!["complete","denied","failed"].includes(requestState);
    editableNcepSchedule=editable?{requestId,data}:null;
    ncepScheduleAmendment.hidden=!editable;
    if(editable){
      ncepAmendmentRequest.textContent=`${data.name||data.domain||"Recurring forecast"} · ${requestId}`;
      const scheduleStart=data.schedule_start||data.scheduleStart,nextRunAt=data.next_run_at||data.nextRunAt,scheduleEnd=data.schedule_end||data.scheduleEnd;
      const currentBounds=data.bounds||{},formatDate=(value)=>value?new Date(value).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Not provided";
      const cadence=Number(data.cadence_hours||data.cadenceHours||1);
      ncepAmendmentSchedule.innerHTML=[
        ["Schedule",`${formatDate(scheduleStart)} – ${formatDate(scheduleEnd)}`],
        ["Cadence",`Every ${cadence} hour${cadence===1?"":"s"}`],
        ["Forecast length",`F${String(data.forecast_hours||data.forecastHours||0).padStart(2,"0")} per run`],
        ["Next run",formatDate(nextRunAt)],
        ["Current bounds",Number.isFinite(Number(currentBounds.north))?`N ${Number(currentBounds.north).toFixed(4)}° · S ${Number(currentBounds.south).toFixed(4)}° · E ${Number(currentBounds.east).toFixed(4)}° · W ${Number(currentBounds.west).toFixed(4)}°`:"Not provided"]
      ].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
      syncNcepAmendmentBounds();
    }
    const statusLabel=String(data.status||"unknown").replaceAll("_"," ");
    if(data.status==="denied"){
      ncepIntegrationNote.textContent=`Denied: ${data.denialReason||"No reason supplied"}`;ncepIntegrationNote.className="error";ncepSubmitButton.disabled=false;return;
    }
    if(data.status==="failed"){
      ncepIntegrationNote.textContent="Forecast failed on the NCEP server.";ncepIntegrationNote.className="error";ncepSubmitButton.disabled=false;return;
    }
    let productCount=Number(data.published)||0;
    if(["running","complete"].includes(data.status)){
      const productResponse=await fetch(`/api/ops/admin/ncep-forecast-requests/${encodeURIComponent(requestId)}/products`,{cache:"no-store"}),products=await productResponse.json().catch(()=>({}));
      if(productResponse.ok)productCount=Array.isArray(products.products)?products.products.length:Number(products.count||productCount);
    }
    if(data.status==="complete"){
      ncepIntegrationNote.textContent=`Complete · ${productCount} GRIB2 product${productCount===1?"":"s"} published.`;ncepIntegrationNote.className="ok";ncepSubmitButton.disabled=false;return;
    }
    const progress=Number.isFinite(Number(data.progress))?` · ${Math.round(Number(data.progress))}%`:"";
    const stage=data.stage?` · ${data.stage}`:"",published=productCount>0?` · ${productCount} published`:"",nextRun=data.nextRunAt?` · Next run ${new Date(data.nextRunAt).toLocaleString()}`:"";
    ncepIntegrationNote.textContent=`${statusLabel}${stage}${progress}${published}${nextRun}`;ncepIntegrationNote.className="";
    ncepStatusTimer=setTimeout(()=>pollNcepForecastRequest(requestId),15000);
  }catch(error){
    ncepIntegrationNote.textContent=`Status check failed: ${error.message}`;ncepIntegrationNote.className="error";
    ncepStatusTimer=setTimeout(()=>pollNcepForecastRequest(requestId),30000);
  }
}

ncepAmendmentConfirmed.addEventListener("change",syncNcepAmendmentBounds);
loadNcepScheduleButton.addEventListener("click",()=>{
  const requestId=ncepScheduleSelect.value;
  if(!requestId)return;
  localStorage.setItem("zncave-ncep-request-id",requestId);
  ncepIntegrationNote.className="";
  ncepIntegrationNote.textContent=`Loading ${requestId}…`;
  pollNcepForecastRequest(requestId);
});
amendNcepBounds.addEventListener("click",async()=>{
  const region=temporaryRegions[activeRegionIndex],requestId=editableNcepSchedule?.requestId;
  if(!requestId||!region||!ncepAmendmentConfirmed.checked)return;
  amendNcepBounds.disabled=true;
  ncepIntegrationNote.className="";
  ncepIntegrationNote.textContent="Applying amended bounds to future scheduled runs…";
  try{
    const bounds={west:Number(region.west),south:Number(region.south),east:Number(region.east),north:Number(region.north)};
    const response=await fetch(`/api/ops/admin/ncep-forecast-requests/${encodeURIComponent(requestId)}`,{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({bounds,display_bounds:wrfDisplayBounds(region)})
    }),data=await response.json().catch(()=>({}));
    if(!response.ok){
      const detail=typeof data.detail==="string"?data.detail:data.detail?.detail||data.detail?.error;
      throw new Error(detail||data.error||`HTTP ${response.status}`);
    }
    ncepAmendmentConfirmed.checked=false;
    ncepIntegrationNote.className="ok";
    ncepIntegrationNote.textContent=`Future bounds updated for ${requestId}. The current run and schedule timing were not changed.`;
    await pollNcepForecastRequest(requestId);
  }catch(error){
    ncepIntegrationNote.className="error";
    ncepIntegrationNote.textContent=`Bounds update failed: ${error.message}`;
    amendNcepBounds.disabled=false;
  }
});

ncepSubmitButton.addEventListener("click",async()=>{
  const region=temporaryRegions[activeRegionIndex];
  const selectedDomain=document.querySelector("#ncepDomain").value;
  if(!region?.id||!selectedDomain)return;
  const longitudeSpan=Number(region.east)-Number(region.west),latitudeSpan=Number(region.north)-Number(region.south);
  if(longitudeSpan>10||latitudeSpan>8){
    ncepIntegrationNote.className="error";
    ncepIntegrationNote.textContent=`Resize the zone before submitting. Current span: ${latitudeSpan.toFixed(2)}° latitude × ${longitudeSpan.toFixed(2)}° longitude; maximum: 8° × 10°.`;
    return;
  }
  const spacing=Number(document.querySelector("#ncepSpacing").value),midpointLatitude=(Number(region.north)+Number(region.south))/2;
  const estimatedGridPoints=(Math.floor(longitudeSpan*111.32*Math.cos(midpointLatitude*Math.PI/180)/spacing)+1)*(Math.floor(latitudeSpan*111.32/spacing)+1);
  if(estimatedGridPoints>600_000){
    ncepIntegrationNote.className="error";
    ncepIntegrationNote.textContent=`This domain produces approximately ${estimatedGridPoints.toLocaleString()} grid points at ${spacing} km. Select a coarser spacing—9 km is recommended for maximum-size zones.`;
    return;
  }
  if(!document.querySelector("#ncepBoundsConfirmed").checked){
    ncepIntegrationNote.className="error";ncepIntegrationNote.textContent="Confirm the displayed WRF domain coordinates before submitting.";return;
  }
  const selectedProducts=[...document.querySelectorAll('#ncepProductChoices input[name="products"]:checked')].map((input)=>input.value);
  const selectedPackages=[...document.querySelectorAll('#ncepProductChoices input[name="packages"]:checked')].map((input)=>input.value);
  if(!selectedProducts.length&&!selectedPackages.length){
    ncepIntegrationNote.className="error";ncepIntegrationNote.textContent="Select at least one ready WRF product or package.";return;
  }
  if(selectedProducts.includes("SMOKE_SFC")&&!selectedProducts.some((code)=>code!=="SMOKE_SFC")){
    ncepIntegrationNote.className="error";ncepIntegrationNote.textContent="Near-surface smoke must be requested with at least one weather product.";return;
  }
  ncepSubmitButton.disabled=true;ncepIntegrationNote.className="";ncepIntegrationNote.textContent="Submitting forecast for approval…";
  const toUtc=(selector)=>new Date(document.querySelector(selector).value).toISOString().replace(".000Z","Z");
  try{
    if(!pendingNcepExternalId){
      pendingNcepExternalId=`ops-${crypto.randomUUID()}`;
      sessionStorage.setItem(ncepPendingExternalIdKey,pendingNcepExternalId);
    }
    const frequency=document.querySelector("#ncepFrequency").value,start=toUtc("#ncepCoverageStart"),end=toUtc("#ncepCoverageEnd");
    let timing;
    if(frequency!=="once"){
      const scheduleStart=new Date(start),scheduleEnd=new Date(end),cadenceHours=Number(document.querySelector("#ncepCadence").value),forecastHours=Number(document.querySelector("#ncepForecastHours").value);
      const expectedFrequency=selectedDomain==="MESO1"?"hourly":selectedDomain==="MESO3"?"scheduled":"";
      if(!expectedFrequency)throw new Error("Recurring schedules are available only for MESO1 and MESO3.");
      if(frequency!==expectedFrequency)throw new Error(`${selectedDomain} recurring forecasts must use frequency "${expectedFrequency}".`);
      if(scheduleStart.getUTCMinutes()||scheduleStart.getUTCSeconds()||scheduleStart.getUTCMilliseconds()||scheduleEnd.getUTCMinutes()||scheduleEnd.getUTCSeconds()||scheduleEnd.getUTCMilliseconds())throw new Error("Schedule start and end must align to a whole UTC hour.");
      if(scheduleStart.getTime()<=Date.now())throw new Error("Schedule start must be in the future. Choose the next whole UTC hour or later.");
      if(scheduleEnd<=scheduleStart)throw new Error("Schedule end must be later than schedule start.");
      if(!Number.isInteger(cadenceHours)||cadenceHours<1||cadenceHours>24)throw new Error("Cadence must be a whole number from 1 through 24 hours.");
      timing={scheduleStart:start,scheduleEnd:end,forecastHours,cadenceHours};
    }else{
      const cycleMode=document.querySelector("#ncepCycleMode").value;
      const cycleValue=document.querySelector("#ncepCycleTime").value;
      const cycle=cycleMode==="latest"?"latest":cycleValue;
      if(cycle!=="latest"){
        if(!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(cycle)||!Number.isFinite(Date.parse(cycle)))throw new Error("Select an exact hourly UTC initialization cycle.");
        const cycleDate=new Date(cycle);
        if(cycleDate.getUTCMinutes()||cycleDate.getUTCSeconds())throw new Error("The initialization cycle must be aligned to an exact UTC hour.");
        if(cycleDate>new Date(start))throw new Error("The HRRR cycle cannot be later than coverage begins.");
      }
      timing={cycle,coverageStart:start,coverageEnd:end};
    }
    const response=await fetch("/api/ops/admin/ncep-forecast-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      externalId:pendingNcepExternalId,regionId:region.id,name:document.querySelector("#ncepForecastName").value.trim()||`${region.label} Forecast`,
      domain:selectedDomain,
      frequency,...timing,spacing:Number(document.querySelector("#ncepSpacing").value),interval:Number(document.querySelector("#ncepInterval").value),
      initialization:document.querySelector("#ncepInitialization").value,
      physicsPreset:document.querySelector("#ncepPhysicsPreset").value,
      products:selectedProducts,packages:selectedPackages,
      boundsConfirmed:document.querySelector("#ncepBoundsConfirmed").checked,
      bounds:{west:Number(region.west),south:Number(region.south),east:Number(region.east),north:Number(region.north)},
      displayBounds:wrfDisplayBounds(region)
    })}),data=await response.json().catch(()=>({}));
    if(!response.ok){
      const detail=typeof data.detail==="string"?data.detail:data.detail?.details||data.detail?.errors||data.detail?.validation_errors||data.detail?.message||data.detail?.reason||data.detail?.detail;
      const diagnostic=typeof detail==="string"?detail:Array.isArray(detail)?detail.map((item)=>item?.msg||item?.message||JSON.stringify(item)).join("; "):detail?JSON.stringify(detail):"";
      if(response.status===409){
        pendingNcepExternalId="";
        sessionStorage.removeItem(ncepPendingExternalIdKey);
      }
      throw new Error(diagnostic||data.error||`HTTP ${response.status}`);
    }
    pendingNcepExternalId="";sessionStorage.removeItem(ncepPendingExternalIdKey);
    ncepIntegrationNote.textContent=`Pending approval · ${data.requestId}`;localStorage.setItem("zncave-ncep-request-id",data.requestId);
    pollNcepForecastRequest(data.requestId);
  }catch(error){
    syncNcepRequestForm();
    const retryHint=String(error.message).includes("idempotency_conflict")?" The stale request ID was cleared; submit again to create a new logical request.":"";
    ncepIntegrationNote.textContent=`Submission failed: ${error.message}.${retryHint}`;ncepIntegrationNote.className="error";
  }
});

function builtInWording(code, name, field) {
  if (["what", "where", "when", "impacts", "details"].includes(field)) {
    const base = field === "what" ? `${name || hazardMeta(code).name} conditions expected.`
      : field === "where" ? "{{AUTO_WHERE}}"
      : field === "when" ? "{{AUTO_WHEN}}"
      : field === "impacts" ? (builtInImpacts[code] || hazardMeta(code).impacts || "")
      : "{{AUTO_DETAILS}}";
    const card = host?.querySelector?.(`.template[data-code="${CSS.escape(code)}"]`);
    const liveFields = [...(card?.querySelectorAll(".template-field-row") || [])].map((row) => ({
      key: row.querySelector(".field-key")?.value || row.dataset.fieldKey,
      label: row.querySelector(".field-label")?.value || row.dataset.fieldKey,
      placement: row.querySelector(".field-placement")?.value || "automatic",
      enabled: Boolean(row.querySelector(".field-enabled")?.checked)
    }));
    const configured = (liveFields.length ? liveFields : editableFields(code, templates[code] || {})).filter((item) => item.enabled && item.placement === field);
    const values = configured.map((item) => {
      const token = `FIELD_${String(item.key).replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
      return `${item.label}: {{${token}}}.`;
    });
    return [base, ...values].join(" ");
  }
  return builtInCta(code, name);
}

function builtInPreview(code, name, field) {
  const wording = builtInWording(code, name, field);
  return `<div class="built-in-wording">
    <div><strong>Built-in wording</strong><span>${escapeHtml(wording)}</span></div>
    <button type="button" data-use-built-in="${code}" data-field="${field}">${["what", "where", "when", "impacts", "details"].includes(field) ? `Load fields into ${field === "details" ? "DETAILS" : field.toUpperCase()}` : "Use this wording"}</button>
  </div>`;
}

function fillTokens(template, tokens) {
  return String(template || "")
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(tokens, name) ? String(tokens[name] ?? "") : match
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sample product text so admins can preview every editable piece. */
function buildSamplePreview(code) {
  const meta = hazardMeta(code);
  const name = meta.name;
  const product = meta.product || "NPW";
  const card = host.querySelector(`.template[data-code="${CSS.escape(code)}"]`);
  const read = (field) => {
    const el = card?.querySelector(`textarea[data-field="${field}"]`);
    return (el?.value || templates[code]?.[field] || "").trim();
  };
  let impacts = read("impacts") || builtInImpacts[code] || meta.impacts;
  const cta = read("cta") || builtInCta(code, name);
  let bodyTpl = read("bodyTemplate") || builtInBody(code);
  const fullTpl = read("fullTemplate") || builtInStructure;
  let what = read("what") || `${name} conditions expected.`;
  const autoWhere = "Example Zone A, Example Zone B.";
  const autoWhen = "From 1:00 PM MDT this afternoon until 8:00 PM MDT this evening.";
  const autoDetails = "Sample additional details for review only.";
  let where = read("where") || autoWhere;
  let when = read("when") || autoWhen;
  let details = read("details") || autoDetails;
  const block = (label, text) => (text ? `* ${label}...\n  ${text}` : "");
  const rfwBlock = (label, text) => (text ? `* ${label}:\n  ${text}` : "");
  const sectionOn = (key) => card?.querySelector(`.section-enabled[data-section="${key}"]`)?.checked !== false;
  if (!sectionOn("cta")) bodyTpl = bodyTpl.replace(/PRECAUTIONARY\/PREPAREDNESS ACTIONS\.\.\.[\s\S]*?\{\{CTA\}\}/i, "");
  const sampleFields = [...(card?.querySelectorAll(".template-field-row") || [])].map((row) => ({
    key: row.querySelector(".field-key")?.value || row.dataset.fieldKey,
    label: row.querySelector(".field-label")?.value || row.dataset.fieldKey,
    placeholder: row.querySelector(".field-placeholder")?.value || "",
    placement: row.querySelector(".field-placement")?.value || "automatic",
    enabled: Boolean(row.querySelector(".field-enabled")?.checked)
  })).filter((field) => field.enabled && field.key);
  const placedSample = (placement) => sampleFields.filter((field) => field.placement === placement).map((field) => `${field.label}: ${field.placeholder || `Example ${field.label.toLowerCase()}`}.`).join(" ");
  const customFieldTokens = Object.fromEntries(sampleFields.flatMap((field) => {
    const token = `FIELD_${String(field.key).replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
    const value = field.placeholder || `Example ${field.label.toLowerCase()}`;
    return [[token, value], [`${token}_BLOCK`, meta.style === "rfw" ? rfwBlock(field.label.toUpperCase(), value) : block(field.label.toUpperCase(), value)]];
  }));
  const resolveSection = (value, placement, automaticToken, automaticValue) => {
    const usesFieldTokens = /\{\{FIELD_[A-Z0-9_]+\}\}/i.test(value);
    const resolved = fillTokens(value, { ...customFieldTokens, [automaticToken]: automaticValue });
    return usesFieldTokens ? resolved : [resolved, placedSample(placement)].filter(Boolean).join(" ");
  };
  what = resolveSection(what, "what", "AUTO_WHAT", `${name} conditions expected.`);
  where = resolveSection(where, "where", "AUTO_WHERE", autoWhere);
  when = resolveSection(when, "when", "AUTO_WHEN", autoWhen);
  impacts = resolveSection(impacts, "impacts", "AUTO_IMPACTS", builtInImpacts[code] || meta.impacts || "");
  details = resolveSection(details, "details", "AUTO_DETAILS", autoDetails);
  if (meta.style === "rfw") details = [details, placedSample("what"), placedSample("where"), placedSample("when")].filter(Boolean).join(" ");
  const bodyTokens = meta.style === "rfw"
    ? {
        ...customFieldTokens,
        AFFECTED_AREA: "In WY Fire Zones...277...278...279.",
        AFFECTED_AREA_BLOCK: rfwBlock("AFFECTED AREA", "In WY Fire Zones...277...278...279."),
        COUNTIES: "Fremont...Natrona...Sweetwater.",
        COUNTIES_BLOCK: rfwBlock("COUNTIES AFFECTED", "Fremont...Natrona...Sweetwater."),
        IMPACTS: impacts,
        IMPACTS_BLOCK: sectionOn("impacts") ? rfwBlock("IMPACTS", impacts) : "",
        WIND: "West 15 to 25 mph with gusts up to 40 mph.",
        WIND_BLOCK: rfwBlock("WIND", "West 15 to 25 mph with gusts up to 40 mph."),
        HUMIDITY: "As low as 10 to 15 percent.",
        HUMIDITY_BLOCK: rfwBlock("HUMIDITY", "As low as 10 to 15 percent."),
        TEMPERATURES: "Highs in the lower 80s.",
        TEMPERATURES_BLOCK: rfwBlock("TEMPERATURES", "Highs in the lower 80s."),
        FUELS: "Critically dry.",
        FUELS_BLOCK: rfwBlock("FUELS", "Critically dry."),
        ADDITIONAL_DETAILS: details,
        ADDITIONAL_DETAILS_BLOCK: sectionOn("details") ? rfwBlock("ADDITIONAL DETAILS", details) : "",
        CTA: cta
      }
    : {
        ...customFieldTokens,
        WHAT: what,
        WHAT_BLOCK: sectionOn("what") ? block("WHAT", what) : "",
        WHERE: where,
        WHERE_BLOCK: sectionOn("where") ? block("WHERE", where) : "",
        WHEN: when,
        WHEN_BLOCK: sectionOn("when") ? block("WHEN", when) : "",
        IMPACTS: impacts,
        IMPACTS_BLOCK: sectionOn("impacts") ? block("IMPACTS", impacts) : "",
        ADDITIONAL_DETAILS: details,
        ADDITIONAL_DETAILS_BLOCK: sectionOn("details") ? block("ADDITIONAL DETAILS", details) : "",
        CTA: cta
      };
  const actionNarrative = fillTokens(bodyTpl, bodyTokens);
  const banner = product === "FFA"
    ? `URGENT - IMMEDIATE BROADCAST REQUESTED\n${name.includes("Flash") ? "Flash Flood Watch" : "Flood Watch"}`
    : product === "CFW"
      ? (name.includes("Lakeshore") ? "LAKESHORE HAZARD MESSAGE" : "COASTAL HAZARD MESSAGE")
      : `URGENT - ${product === "WSW" ? "WINTER WEATHER" : product === "RFW" ? "FIRE WEATHER" : "WEATHER"} MESSAGE`;
  const fullTokens = {
    WMO_HEADER: product === "WSW" ? "WWUS45" : product === "RFW" ? "WWUS85" : product === "FFA" ? "WGUS65" : "WWUS75",
    ISSUE_DDHHMM: "051800",
    PIL: `${product}OHX`,
    PRODUCT_BANNER: banner,
    OFFICE: "Nashville TN",
    ISSUE_TIME: "1:00 PM CDT Wed Aug 5 2026",
    UGC: "TNZ005>010-060200-",
    VTEC: `/O.NEW.KOHX.${code}.0001.260805T1800Z-260806T0200Z/`,
    HYDRO_VTEC: product === "FFA" ? "/00000.0.ER.000000T0000Z.000000T0000Z.000000T0000Z.OO/" : "",
    ZONE_NAMES: "Davidson-Williamson-Rutherford-",
    CITY_BLOCK: "Including the cities of Nashville, Franklin, Murfreesboro",
    HEADLINE: `...${name.toUpperCase()} IN EFFECT UNTIL 8 PM CDT THIS EVENING...`,
    ACTION_NARRATIVE: actionNarrative,
    WHAT: what,
    WHERE: where,
    WHEN: when,
    IMPACTS: impacts,
    ADDITIONAL_DETAILS: details,
    CTA: cta,
    HAZARD_NAME: name,
    WFO: "OHX",
    ACTION: "NEW",
    ETN: "0001",
    TERMINATOR: "$$"
  };
  return fillTokens(fullTpl, fullTokens) + "\n";
}

let activeTemplateGroup = "";
const openTemplateCodes = new Set();
const dirtyFieldCodes = new Set();

function hasTemplateOverride(code) {
  const t = templates[code] || {};
  const card = host?.querySelector?.(`.template[data-code="${CSS.escape(code)}"]`);
  if (card) {
    const read = (field) => (card.querySelector(`textarea[data-field="${field}"]`)?.value || "").trim();
    const sectionOverride = [...card.querySelectorAll(".section-enabled")].some((input) => !input.checked);
    return Boolean(read("what") || read("where") || read("when") || read("impacts") || read("details") || read("cta") || read("fullTemplate") || read("bodyTemplate") || t.fields?.length || sectionOverride || dirtyFieldCodes.has(code));
  }
  return Boolean(t.what || t.where || t.when || t.impacts || t.details || t.cta || t.fullTemplate || t.bodyTemplate || t.fields?.length || Object.values(t.sections || {}).some((enabled) => !enabled));
}

function refreshPreview(code) {
  const pre = host.querySelector(`pre[data-preview="${CSS.escape(code)}"]`);
  if (!pre) return;
  pre.textContent = buildSamplePreview(code);
}

function renderGroupChips(visibleGroups) {
  const chips = document.querySelector("#templateGroupChips");
  if (!chips) return;
  const allCount = hazardCatalog.length;
  const groups = [...new Set(hazardCatalog.map((h) => h.group))];
  chips.innerHTML = [
    `<button type="button" class="group-chip${activeTemplateGroup ? "" : " is-active"}" data-group="">All <small>${allCount}</small></button>`,
    ...groups.map((group) => {
      const count = hazardCatalog.filter((h) => h.group === group).length;
      const active = activeTemplateGroup === group ? " is-active" : "";
      const dim = visibleGroups.has(group) ? "" : " is-empty";
      return `<button type="button" class="group-chip${active}${dim}" data-group="${escapeHtml(group)}">${escapeHtml(group)} <small>${count}</small></button>`;
    })
  ].join("");
}

function render() {
  const filter = String(document.querySelector("#templateFilter")?.value || "").trim().toLowerCase();
  const customOnly = Boolean(document.querySelector("#templateCustomOnly")?.checked);
  // Remember which cards were open across re-filters
  host.querySelectorAll("details.template[open]").forEach((el) => openTemplateCodes.add(el.dataset.code));

  const groups = new Map();
  hazardCatalog.forEach((h) => {
    if (activeTemplateGroup && h.group !== activeTemplateGroup) return;
    if (filter) {
      const hay = `${h.code} ${h.name} ${h.group} ${h.product}`.toLowerCase();
      if (!hay.includes(filter)) return;
    }
    if (customOnly && !hasTemplateOverride(h.code) && !h.isCustom && !templates[h.code]?.isCustom) return;
    if (!groups.has(h.group)) groups.set(h.group, []);
    groups.get(h.group).push(h);
  });
  renderGroupChips(new Set(groups.keys()));

  const totalVisible = [...groups.values()].reduce((n, items) => n + items.length, 0);
  if (!groups.size) {
    host.innerHTML = `<div class="template-empty-state"><strong>No matching hazards</strong><p>Try clearing the search or “Custom only” filter.</p></div>`;
    return;
  }

  host.innerHTML = `
    <p class="template-count">${totalVisible} hazard${totalVisible === 1 ? "" : "s"} shown</p>
    ${[...groups.entries()].map(([group, items]) => `
    <section class="template-group">
      <h3 class="template-group-title"><span>${escapeHtml(group)}</span><small>${items.length}</small></h3>
      <div class="template-group-list">
      ${items.map((h) => {
        const template = templates[h.code] || {};
        const isRfw = h.style === "rfw";
        const override = hasTemplateOverride(h.code) || Boolean(template.what || template.impacts || template.cta || template.fullTemplate || template.bodyTemplate);
        const isOpen = openTemplateCodes.has(h.code);
        const isCustomProduct = Boolean(h.isCustom);
        return `<details class="template${override || isCustomProduct ? " has-override" : ""}${isCustomProduct ? " is-custom-product" : ""}" data-code="${escapeHtml(h.code)}" data-style="${escapeHtml(h.style)}" data-custom="${isCustomProduct ? "1" : "0"}"${isOpen ? " open" : ""}>
          <summary>
            <span class="template-chevron" aria-hidden="true"></span>
            <span class="template-summary-main">
              <strong>${escapeHtml(h.name)}</strong>
              <small>${escapeHtml(h.group)} · ${escapeHtml(h.product)}${isCustomProduct ? " · admin-created" : ""}</small>
            </span>
            <span class="template-meta">
              ${colorSwatchHtml(h.code)}
              <span class="template-code">${escapeHtml(h.code)}</span>
              ${isCustomProduct ? '<span class="template-override">New product</span>' : override ? '<span class="template-override">Custom</span>' : '<span class="template-default">Built-in</span>'}
            </span>
          </summary>
          <div class="fields template-editor">
            <div class="template-editor-main">
              ${isCustomProduct ? `<div class="template-section template-custom-meta">
                <h4>Product definition</h4>
                <p class="field-hint">Admin-created zone hazard. Appears in Hazard Services after you save templates.</p>
                <div class="template-color-row">
                  <span class="template-color-label">Map color</span>
                  ${colorSwatchHtml(h.code, { editable: true })}
                </div>
                <div class="template-custom-actions">
                  <button type="button" class="danger-button" data-delete-custom="${escapeHtml(h.code)}">Delete this product</button>
                </div>
              </div>` : `<div class="template-section template-color-readonly">
                <h4>Map color</h4>
                <div class="template-color-row">
                  ${colorSwatchHtml(h.code)}
                  <span class="field-hint">Assigned Hazard Services / map color for this product.</span>
                </div>
              </div>`}
              <div class="template-section template-display-order">
                <h4>Public map layer order</h4>
                <label class="field-control"><span>Display priority</span><input type="number" class="hazard-priority-input" data-priority-for="${escapeHtml(h.code)}" min="1" max="999" step="1" value="${escapeHtml(template.priority ?? h.priority ?? 200)}"></label>
                <p class="field-hint">Smaller numbers draw above larger numbers. Example: Red Flag Warning 52 appears above Air Quality Alert 200.</p>
              </div>
              <div class="template-section">
                <h4>Wording defaults</h4>
                <fieldset class="section-toggles"><legend>Include sections</legend>${[
                  ["what", "WHAT"], ["where", "WHERE"], ["when", "WHEN"], ["impacts", "IMPACTS"], ["details", "Additional details"], ["cta", "Precautionary actions"]
                ].map(([key, label]) => `<label><input type="checkbox" class="section-enabled" data-code="${escapeHtml(h.code)}" data-section="${key}" ${(template.sections?.[key] !== false) ? "checked" : ""}><span>${label}</span></label>`).join("")}</fieldset>
                ${isRfw ? "" : `<label>Default WHAT<textarea data-code="${escapeHtml(h.code)}" data-field="what" maxlength="4000" rows="3" placeholder="Built-in WHAT wording">${escapeHtml(template.what || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "what")}
                <label>Default WHERE<textarea data-code="${escapeHtml(h.code)}" data-field="where" maxlength="4000" rows="3" placeholder="Automatic selected-zone wording">${escapeHtml(template.where || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "where")}
                <label>Default WHEN<textarea data-code="${escapeHtml(h.code)}" data-field="when" maxlength="4000" rows="3" placeholder="Automatic start/end wording">${escapeHtml(template.when || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "when")}`}
                <label>Default IMPACTS<textarea data-code="${escapeHtml(h.code)}" data-field="impacts" maxlength="4000" rows="3" placeholder="Built-in IMPACTS wording">${escapeHtml(template.impacts || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "impacts")}
                <label>Default ADDITIONAL DETAILS<textarea data-code="${escapeHtml(h.code)}" data-field="details" maxlength="4000" rows="3" placeholder="Optional automatic and field details">${escapeHtml(template.details || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "details")}
                <label>Precautionary / preparedness CTA<textarea data-code="${escapeHtml(h.code)}" data-field="cta" maxlength="4000" rows="3" placeholder="Built-in CTA wording">${escapeHtml(template.cta || "")}</textarea></label>
                ${builtInPreview(h.code, h.name, "cta")}
              </div>
              ${inputFieldEditor(h.code, template)}
              <div class="template-section">
                <h4>${isRfw ? "Fire weather body" : "Hazard body"}</h4>
                <label><span class="template-label-row"><span>Body template</span><button type="button" class="ghost-button" data-load-body="${escapeHtml(h.code)}">Reset body</button></span>
                  <textarea class="body-template" data-code="${escapeHtml(h.code)}" data-field="bodyTemplate" maxlength="20000" rows="12" placeholder="Empty = built-in ${isRfw ? "RFW" : "WHAT / WHERE / WHEN"} body">${escapeHtml(template.bodyTemplate || "")}</textarea>
                  <small class="field-hint">${isRfw
                    ? "Uses RFW blocks: AFFECTED AREA, IMPACTS, WIND, HUMIDITY, FUELS, CTA."
                    : "Uses standard blocks: WHAT, WHERE, WHEN, IMPACTS, CTA."}</small>
                </label>
              </div>
              <div class="template-section is-advanced">
                <h4>Full bulletin shell <span class="optional-tag">advanced</span></h4>
                <label><span class="template-label-row"><span>Complete product template</span><button type="button" class="ghost-button" data-load-structure="${escapeHtml(h.code)}">Reset shell</button></span>
                  <textarea class="full-template" data-code="${escapeHtml(h.code)}" data-field="fullTemplate" maxlength="30000" rows="10" placeholder="Empty = built-in bulletin structure">${escapeHtml(template.fullTemplate || "")}</textarea>
                  <small class="field-hint">Include {{ACTION_NARRATIVE}} where the body should appear.</small>
                </label>
              </div>
            </div>
            <aside class="template-preview-panel">
              <div class="template-preview-head">
                <div>
                  <strong>Sample preview</strong>
                  <span>Example NEW product · OHX</span>
                </div>
                <button type="button" class="ghost-button" data-refresh-preview="${escapeHtml(h.code)}">Refresh</button>
              </div>
              <pre class="template-preview" data-preview="${escapeHtml(h.code)}"></pre>
            </aside>
          </div>
        </details>`;
      }).join("")}
      </div>
    </section>`).join("")}`;

  host.querySelectorAll("pre[data-preview]").forEach((pre) => refreshPreview(pre.dataset.preview));
}

host.addEventListener("click", (event) => {
  const addField = event.target.closest("[data-add-template-field]");
  if (addField) {
    const code = addField.dataset.addTemplateField;
    dirtyFieldCodes.add(code);
    const list = addField.parentElement?.querySelector(".template-field-list");
    if (!list) return;
    let key = "customField", suffix = 1;
    while (list.querySelector(`[data-field-key="${CSS.escape(key)}"]`)) key = `customField${++suffix}`;
    const row = document.createElement("div");
    row.className = "template-field-row";
    row.dataset.code = code;
    row.dataset.fieldKey = key;
    row.innerHTML = `<div class="field-card-head"><label class="field-enable"><input class="field-enabled" type="checkbox" checked><span>Enabled</span></label><label class="field-key-control"><span>Field key</span><input class="field-key" value="${key}" maxlength="40"></label></div><label class="field-control"><span>Operator label</span><input class="field-label" value="Custom field" maxlength="100"></label><label class="field-control"><span>Input type</span><select class="field-type"><option value="text">Text</option><option value="number">Number</option></select></label><label class="field-control"><span>Example shown to operator</span><input class="field-placeholder" maxlength="300" placeholder="Optional example"></label><label class="field-control"><span>Place value in alert</span><select class="field-placement"><option value="what">WHAT</option><option value="where">WHERE</option><option value="when">WHEN</option><option value="impacts">IMPACTS</option><option value="details">Additional details</option><option value="template">Template token only</option><option value="automatic">Automatic generator</option></select></label><div class="field-card-actions"><span class="field-move"><button type="button" class="ghost-button field-up">↑ Up</button><button type="button" class="ghost-button field-down" disabled>↓ Down</button></span><button type="button" class="ghost-button field-remove">Remove</button></div>`;
    list.querySelectorAll(".field-down").forEach((button) => { button.disabled = false; });
    list.append(row);
    row.querySelector(".field-key")?.focus();
    return;
  }
  const removeField = event.target.closest(".field-remove");
  if (removeField) {
    const row = removeField.closest(".template-field-row");
    const code = row?.dataset.code;
    if (code) dirtyFieldCodes.add(code);
    if (row?.querySelector(".field-key")) row.remove();
    else {
      const enabled = row?.querySelector(".field-enabled");
      if (enabled) enabled.checked = false;
      row?.classList.add("is-disabled");
    }
    return;
  }
  const moveField = event.target.closest(".field-up, .field-down");
  if (moveField) {
    const row = moveField.closest(".template-field-row");
    const list = row?.parentElement;
    const code = row?.dataset.code;
    if (!row || !list) return;
    if (moveField.classList.contains("field-up") && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
    if (moveField.classList.contains("field-down") && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    if (code) dirtyFieldCodes.add(code);
    [...list.children].forEach((item, index, all) => {
      const up = item.querySelector(".field-up"), down = item.querySelector(".field-down");
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === all.length - 1;
    });
    refreshPreview(code);
    return;
  }
  const deleteCustom = event.target.closest("[data-delete-custom]");
  if (deleteCustom) {
    const code = deleteCustom.dataset.deleteCustom;
    const meta = hazardMeta(code);
    if (!window.confirm(`Delete custom hazard ${meta.name || code}? This removes it from the catalog after you save.`)) return;
    const idx = hazardCatalog.findIndex((h) => h.code === code && h.isCustom);
    if (idx >= 0) hazardCatalog.splice(idx, 1);
    // Soft-delete from in-memory store so draft omits it unless recreated
    if (templates[code]) {
      const next = { ...templates };
      delete next[code];
      templates = next;
    }
    openTemplateCodes.delete(code);
    render();
    const statusEl = document.querySelector("#status");
    if (statusEl) {
      statusEl.className = "";
      statusEl.textContent = `${meta.name || code} removed locally — Save templates to publish the deletion.`;
    }
    return;
  }

  const wordingButton = event.target.closest("[data-use-built-in]");
  if (wordingButton) {
    const { useBuiltIn: code, field } = wordingButton.dataset;
    const name = hazardMeta(code).name || "";
    const input = host.querySelector(`textarea[data-code="${CSS.escape(code)}"][data-field="${CSS.escape(field)}"]`);
    if (!input || (input.value.trim() && !confirm("Replace the current custom wording with the built-in wording?"))) return;
    input.value = builtInWording(code, name, field);
    refreshPreview(code);
    input.focus();
    return;
  }

  const bodyButton = event.target.closest("[data-load-body]");
  if (bodyButton) {
    const code = bodyButton.dataset.loadBody;
    const input = host.querySelector(`textarea[data-code="${CSS.escape(code)}"][data-field="bodyTemplate"]`);
    if (!input || (input.value.trim() && !confirm("Replace the current body template with the built-in body?"))) return;
    input.value = builtInBody(code);
    refreshPreview(code);
    input.focus();
    return;
  }

  const refreshButton = event.target.closest("[data-refresh-preview]");
  if (refreshButton) {
    refreshPreview(refreshButton.dataset.refreshPreview);
    return;
  }

  const structureButton = event.target.closest("[data-load-structure]");
  if (!structureButton) return;
  const input = host.querySelector(`textarea[data-code="${CSS.escape(structureButton.dataset.loadStructure)}"][data-field="fullTemplate"]`);
  if (!input || (input.value.trim() && !confirm("Replace the current full template with the built-in structure?"))) return;
  input.value = builtInStructure;
  refreshPreview(structureButton.dataset.loadStructure);
  input.focus();
});

host.addEventListener("toggle", (event) => {
  const card = event.target.closest("details.template");
  if (!card || event.target !== card) return;
  if (card.open) {
    openTemplateCodes.add(card.dataset.code);
    refreshPreview(card.dataset.code);
    if (document.querySelector("#templateOpenOne")?.checked) {
      host.querySelectorAll("details.template[open]").forEach((other) => {
        if (other !== card) {
          other.open = false;
          openTemplateCodes.delete(other.dataset.code);
        }
      });
    }
  } else {
    openTemplateCodes.delete(card.dataset.code);
  }
}, true);

host.addEventListener("input", (event) => {
  const colorInput = event.target.closest("input[data-color-for]");
  if (colorInput) {
    const code = colorInput.dataset.colorFor;
    const color = colorInput.value;
    const item = hazardCatalog.find((h) => h.code === code);
    if (item) item.color = color;
    if (templates[code]) templates[code] = { ...templates[code], color };
    host.querySelectorAll(`[data-swatch-for="${CSS.escape(code)}"]`).forEach((el) => {
      el.style.background = color;
    });
    host.querySelectorAll(`.template[data-code="${CSS.escape(code)}"] .hazard-color-hex`).forEach((el) => {
      el.textContent = color.toUpperCase();
    });
    return;
  }

  const area = event.target.closest("textarea[data-code]");
  const fieldControl = event.target.closest(".template-field-row input, .template-field-row select");
  const sectionControl = event.target.closest(".section-enabled[data-code]");
  const source = area || fieldControl || sectionControl;
  if (!source) return;
  const card = source.closest(".template");
  if (!card) return;
  const code = area?.dataset.code || sectionControl?.dataset.code || source.closest(".template-field-row")?.dataset.code;
  if (fieldControl && code) dirtyFieldCodes.add(code);
  refreshPreview(code);
  const override = hasTemplateOverride(code);
  card.classList.toggle("has-override", override);
  const badge = card.querySelector(".template-override, .template-default");
  if (badge) {
    badge.className = override ? "template-override" : "template-default";
    badge.textContent = override ? "Custom" : "Built-in";
  }
});

document.querySelector("#templateFilter")?.addEventListener("input", () => {
  render();
});
document.querySelector("#templateCustomOnly")?.addEventListener("change", () => render());
document.querySelector("#templateOpenOne")?.addEventListener("change", () => {});
document.querySelector("#templateGroupChips")?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-group]");
  if (!chip) return;
  activeTemplateGroup = chip.dataset.group || "";
  render();
});
document.querySelector("#saveTemplatesFooter")?.addEventListener("click", () => {
  document.querySelector("#saveTemplates")?.click();
});

const FIELD_LABELS = {
  sections: "Included sections",
  what: "WHAT wording",
  where: "WHERE wording",
  when: "WHEN wording",
  fields: "Operator input fields",
  impacts: "IMPACTS wording",
  details: "Additional details wording",
  cta: "CTA",
  bodyTemplate: "Body template",
  fullTemplate: "Full bulletin shell"
};

function normalizeTemplateEntry(raw = {}) {
  const entry = {
    what: String(raw.what || "").trim(),
    where: String(raw.where || "").trim(),
    when: String(raw.when || "").trim(),
    impacts: String(raw.impacts || "").trim(),
    details: String(raw.details || "").trim(),
    cta: String(raw.cta || "").trim(),
    fullTemplate: String(raw.fullTemplate || "").trim(),
    bodyTemplate: String(raw.bodyTemplate || "").trim(),
    fields: Array.isArray(raw.fields) ? raw.fields.map((field) => ({
      key: String(field?.key || "").trim(),
      label: String(field?.label || "").trim(),
      type: field?.type === "number" ? "number" : "text",
      placeholder: String(field?.placeholder || "").trim(),
      placement: ["what", "where", "when", "impacts", "details", "template"].includes(field?.placement) ? field.placement : "automatic",
      enabled: field?.enabled !== false
    })).filter((field) => field.key) : [],
    sections: Object.fromEntries(["what", "where", "when", "impacts", "details", "cta"].map((key) => [key, raw.sections?.[key] !== false]))
  };
  if (raw.priority != null && Number.isFinite(Number(raw.priority))) {
    entry.priority = Math.max(1, Math.min(999, Number(raw.priority)));
  }
  if (raw.isCustom || raw.custom) {
    entry.isCustom = true;
    entry.name = String(raw.name || "").trim().slice(0, 80);
    entry.product = String(raw.product || "NPW").trim().toUpperCase().slice(0, 6) || "NPW";
    entry.group = String(raw.group || "Custom").trim().slice(0, 40) || "Custom";
    entry.style = raw.style === "rfw" ? "rfw" : "standard";
    entry.zoneType = raw.zoneType === "fire" ? "fire" : "public";
    entry.color = /^#[0-9A-Fa-f]{6}$/.test(String(raw.color || "")) ? String(raw.color) : "#FFA500";
    entry.priority = Math.max(1, Math.min(999, Number(raw.priority) || 200));
  }
  return entry;
}

function isTemplateEntryEmpty(entry) {
  const noWording = !entry.what && !entry.where && !entry.when && !entry.impacts && !entry.details && !entry.cta && !entry.fullTemplate && !entry.bodyTemplate && !entry.fields.length && !Object.values(entry.sections || {}).some((enabled) => !enabled) && !Number.isFinite(Number(entry.priority));
  // Custom product definitions must persist even before wording is filled in
  if (entry.isCustom && entry.name) return false;
  return noWording;
}

function customMetaFromCatalog(code) {
  const h = hazardCatalog.find((item) => item.code === code && item.isCustom);
  if (!h) return null;
  return {
    isCustom: true,
    name: h.name,
    product: h.product || "NPW",
    group: h.group || "Custom",
    style: h.style === "rfw" ? "rfw" : "standard",
    zoneType: h.zoneType === "fire" ? "fire" : "public",
    color: h.color || "#FFA500",
    priority: h.priority || 200
  };
}

/** Merge saved store + live form fields (keeps hidden/filtered cards). */
function collectTemplateDraft() {
  const draft = {};
  Object.entries(templates || {}).forEach(([code, raw]) => {
    const entry = normalizeTemplateEntry(raw);
    if (!isTemplateEntryEmpty(entry)) draft[code] = entry;
  });
  // Ensure custom catalog products remain in the draft
  hazardCatalog.forEach((h) => {
    if (!h.isCustom) return;
    const meta = customMetaFromCatalog(h.code);
    draft[h.code] = {
      ...(draft[h.code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "" }),
      ...meta,
      impacts: draft[h.code]?.impacts || h.impacts || "",
      cta: draft[h.code]?.cta || ""
    };
  });
  document.querySelectorAll("textarea[data-code]").forEach((input) => {
    const code = input.dataset.code;
    if (!code) return;
    draft[code] = draft[code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "" };
    draft[code][input.dataset.field] = String(input.value || "").trim();
    const meta = customMetaFromCatalog(code) || (templates[code]?.isCustom ? normalizeTemplateEntry(templates[code]) : null);
    if (meta?.isCustom) {
      draft[code] = { ...draft[code], ...meta, what: draft[code].what, impacts: draft[code].impacts, cta: draft[code].cta, fullTemplate: draft[code].fullTemplate, bodyTemplate: draft[code].bodyTemplate };
    }
  });
  document.querySelectorAll(".section-enabled[data-code]").forEach((input) => {
    const code = input.dataset.code, section = input.dataset.section;
    if (!code || !section) return;
    draft[code] = draft[code] || { what: "", where: "", when: "", impacts: "", details: "", cta: "", fullTemplate: "", bodyTemplate: "", fields: [], sections: {} };
    draft[code].sections = draft[code].sections || {};
    draft[code].sections[section] = input.checked;
  });
  document.querySelectorAll(".hazard-priority-input[data-priority-for]").forEach((input) => {
    const code = input.dataset.priorityFor;
    if (!code) return;
    draft[code] = draft[code] || { what: "", where: "", when: "", impacts: "", details: "", cta: "", fullTemplate: "", bodyTemplate: "", fields: [], sections: {} };
    draft[code].priority = Math.max(1, Math.min(999, Number(input.value) || 200));
  });
  const tokenFieldCodes = new Set([...document.querySelectorAll('textarea[data-field="bodyTemplate"]')]
    .filter((area) => /\{\{FIELD_[A-Z0-9_]+(?:_BLOCK)?\}\}/i.test(area.value))
    .map((area) => area.dataset.code));
  const fieldsToPersist = new Set([...dirtyFieldCodes, ...tokenFieldCodes]);
  const fieldRows = [...document.querySelectorAll(".template-field-row[data-code]")].filter((row) => fieldsToPersist.has(row.dataset.code));
  fieldsToPersist.forEach((code) => {
    if (!document.querySelector(`.template[data-code="${CSS.escape(code)}"]`)) return;
    draft[code] = draft[code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "", fields: [] };
    draft[code].fields = [];
  });
  fieldRows.forEach((row) => {
    const code = row.dataset.code;
    const key = String(row.querySelector(".field-key")?.value || row.dataset.fieldKey || "").trim();
    if (!code || !key) return;
    draft[code] = draft[code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "", fields: [] };
    draft[code].fields = draft[code].fields || [];
    draft[code].fields.push({
      key,
      label: String(row.querySelector(".field-label")?.value || key).trim(),
      type: row.querySelector(".field-type")?.value === "number" ? "number" : "text",
      placeholder: String(row.querySelector(".field-placeholder")?.value || "").trim(),
      placement: row.querySelector(".field-placement")?.value || "automatic",
      enabled: Boolean(row.querySelector(".field-enabled")?.checked),
      order: [...row.parentElement.children].indexOf(row) + 1
    });
  });
  Object.values(draft).forEach((entry) => {
    if (Array.isArray(entry.fields)) entry.fields.sort((a, b) => (a.order || 999) - (b.order || 999));
  });
  Object.keys(draft).forEach((code) => {
    draft[code] = normalizeTemplateEntry(draft[code]);
    if (isTemplateEntryEmpty(draft[code])) delete draft[code];
  });
  return draft;
}

function describeTemplateDiffs(beforeStore, afterDraft) {
  const before = {};
  Object.entries(beforeStore || {}).forEach(([code, raw]) => {
    before[code] = normalizeTemplateEntry(raw);
  });
  const after = afterDraft || {};
  const codes = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows = [];
  codes.forEach((code) => {
    const prev = before[code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "" };
    const next = after[code] || { what: "", impacts: "", cta: "", fullTemplate: "", bodyTemplate: "" };
    const fieldChanges = [];
    Object.keys(FIELD_LABELS).forEach((field) => {
      if (JSON.stringify(prev[field]) === JSON.stringify(next[field])) return;
      if (!prev[field] && next[field]) fieldChanges.push({ field, action: "set", label: FIELD_LABELS[field] });
      else if (prev[field] && !next[field]) fieldChanges.push({ field, action: "clear", label: FIELD_LABELS[field] });
      else fieldChanges.push({ field, action: "update", label: FIELD_LABELS[field] });
    });
    const wasCustom = Boolean(prev.isCustom);
    const isCustom = Boolean(next.isCustom);
    if (!wasCustom && isCustom) fieldChanges.unshift({ field: "product", action: "set", label: "New custom product" });
    if (wasCustom && !isCustom && !next.name) fieldChanges.unshift({ field: "product", action: "clear", label: "Custom product removed" });
    if (wasCustom && isCustom && (prev.name !== next.name || prev.product !== next.product || prev.group !== next.group || prev.color !== next.color)) {
      fieldChanges.push({ field: "meta", action: "update", label: prev.color !== next.color ? "Map color" : "Product definition" });
    }
    if (!fieldChanges.length) return;
    const meta = hazardMeta(code);
    const removed = (!next.isCustom && isTemplateEntryEmpty(next) && !isTemplateEntryEmpty(prev))
      || (wasCustom && !isCustom);
    rows.push({
      code,
      name: next.name || prev.name || meta.name || code,
      group: next.group || prev.group || meta.group || "",
      removed,
      fieldChanges
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function openTemplateConfirmDialog(diffs) {
  const dialog = document.querySelector("#templateConfirmDialog");
  const list = document.querySelector("#templateConfirmList");
  const lead = document.querySelector("#templateConfirmLead");
  if (!dialog || !list) return Promise.resolve(false);
  const n = diffs.length;
  if (lead) {
    lead.textContent = n === 1
      ? "1 hazard template will be updated:"
      : `${n} hazard templates will be updated:`;
  }
  list.innerHTML = diffs.map((row) => {
    const chips = row.removed
      ? `<span class="change-chip is-clear">All custom fields cleared (built-in)</span>`
      : row.fieldChanges.map((c) => {
          const kind = c.action === "clear" ? "is-clear" : c.action === "set" ? "is-set" : "is-update";
          const verb = c.action === "clear" ? "cleared" : c.action === "set" ? "added" : "updated";
          return `<span class="change-chip ${kind}">${escapeHtml(c.label)} ${verb}</span>`;
        }).join("");
    return `<li>
      <div class="template-confirm-row-main">
        <strong>${escapeHtml(row.name)}</strong>
        <code>${escapeHtml(row.code)}</code>
        ${row.group ? `<small>${escapeHtml(row.group)}</small>` : ""}
      </div>
      <div class="template-confirm-chips">${chips}</div>
    </li>`;
  }).join("");
  return new Promise((resolve) => {
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", onClose);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else resolve(window.confirm(`Save ${n} template change(s)?`));
  });
}

async function saveHazardTemplates() {
  const statusEl = document.querySelector("#status");
  const headerBtn = document.querySelector("#saveTemplates");
  const footerBtn = document.querySelector("#saveTemplatesFooter");
  const setBusy = (busy) => {
    if (headerBtn) headerBtn.disabled = busy;
    if (footerBtn) footerBtn.disabled = busy;
  };
  const draft = collectTemplateDraft();
  const diffs = describeTemplateDiffs(templates, draft);
  if (!diffs.length) {
    if (statusEl) {
      statusEl.className = "";
      statusEl.textContent = "No template changes to save.";
    }
    return;
  }
  const confirmed = await openTemplateConfirmDialog(diffs);
  if (!confirmed) {
    if (statusEl) {
      statusEl.className = "";
      statusEl.textContent = "Save cancelled.";
    }
    return;
  }
  setBusy(true);
  if (statusEl) {
    statusEl.className = "";
    statusEl.textContent = "Saving…";
  }
  try {
    const response = await fetch("/api/ops/admin/hazard-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: draft })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    templates = data.templates || {};
    dirtyFieldCodes.clear();
    syncCatalogFromTemplates(templates);
    if (statusEl) {
      statusEl.className = "ok";
      statusEl.textContent = `Saved ${diffs.length} hazard change(s) · ${Object.keys(templates).length} override(s) active. New Hazard Services drafts will use them.`;
    }
    render();
  } catch (error) {
    if (statusEl) {
      statusEl.className = "error";
      statusEl.textContent = `Save failed: ${error.message}`;
    }
  } finally {
    setBusy(false);
  }
}

async function load() {
  const [sessionResponse, response, regionResponse, ncepResponse] = await Promise.all([
    fetch("/api/session", { cache: "no-store" }),
    fetch("/api/ops/admin/hazard-templates", { cache: "no-store" }),
    fetch("/api/ops/admin/map-regions", { cache: "no-store" }),
    fetch("/api/ops/admin/ncep-forecast-integration?refresh=1", { cache: "no-store" })
  ]);
  const session = await sessionResponse.json();
  if (!session.canAdministerHazardTemplates) throw new Error("Administrator permission required");
  if (!response.ok) throw new Error(`Could not load templates (HTTP ${response.status})`);
  const data = await response.json();
  templates = data.templates || {};
  syncCatalogFromTemplates(templates);
  render();
  if (!regionResponse.ok) throw new Error(`Could not load mesoscale zones (HTTP ${regionResponse.status})`);
  const regionData = await regionResponse.json();
  temporaryRegions = (regionData.regions || []).filter((region) => !region.expiresAt || Date.parse(region.expiresAt) > Date.now());
  renderRegions();
  regionStatus.textContent = regionData.updatedAt ? `Last saved by ${regionData.updatedBy || "an administrator"} at ${new Date(regionData.updatedAt).toLocaleString()}.` : "No temporary mesoscale zones have been saved.";
  if(!ncepResponse.ok) throw new Error(`Could not load NCEP integration readiness (HTTP ${ncepResponse.status})`);
  renderNcepIntegration(await ncepResponse.json());
  status.textContent = data.updatedAt ? `Last saved by ${data.updatedBy || "an administrator"} at ${new Date(data.updatedAt).toLocaleString()}.` : "Using built-in defaults. No overrides have been saved.";
}

window.setInterval(removeExpiredAdminRegions, 10_000);
window.addEventListener("focus", removeExpiredAdminRegions);
document.addEventListener("visibilitychange", () => { if (!document.hidden) removeExpiredAdminRegions(); });

document.querySelector("#saveTemplates")?.addEventListener("click", (event) => {
  event.preventDefault();
  saveHazardTemplates();
});

function closeCreateHazardDialog() {
  const dialog = document.querySelector("#createHazardDialog");
  const err = document.querySelector("#createHazardError");
  if (err) {
    err.hidden = true;
    err.textContent = "";
    err.className = "template-confirm-note";
  }
  if (dialog?.open) dialog.close("cancel");
}

document.querySelector("#createHazardButton")?.addEventListener("click", () => {
  const dialog = document.querySelector("#createHazardDialog");
  const err = document.querySelector("#createHazardError");
  if (err) {
    err.hidden = true;
    err.textContent = "";
    err.className = "template-confirm-note";
  }
  document.querySelector("#createHazardCode").value = "";
  document.querySelector("#createHazardName").value = "";
  document.querySelector("#createHazardProduct").value = "NPW";
  document.querySelector("#createHazardGroup").value = "Custom";
  document.querySelector("#createHazardStyle").value = "standard";
  document.querySelector("#createHazardZoneType").value = "public";
  document.querySelector("#createHazardColor").value = "#FFA500";
  document.querySelector("#createHazardImpacts").value = "";
  dialog?.showModal?.();
  // Focus first field after open
  setTimeout(() => document.querySelector("#createHazardCode")?.focus(), 0);
});

// Cancel / × always dismiss — never blocked by required fields
document.querySelector("#createHazardDialog")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-create-dismiss]")) {
    event.preventDefault();
    closeCreateHazardDialog();
    return;
  }
  // Click on backdrop (the dialog element itself) closes
  const dialog = document.querySelector("#createHazardDialog");
  if (event.target === dialog) closeCreateHazardDialog();
});

document.querySelector("#createHazardDialog")?.addEventListener("cancel", (event) => {
  // Escape key
  event.preventDefault();
  closeCreateHazardDialog();
});

document.querySelector("#createHazardProduct")?.addEventListener("change", (event) => {
  const product = event.target.value;
  const style = document.querySelector("#createHazardStyle");
  const zoneType = document.querySelector("#createHazardZoneType");
  const group = document.querySelector("#createHazardGroup");
  if (product === "RFW") {
    if (style) style.value = "rfw";
    if (zoneType) zoneType.value = "fire";
    if (group) group.value = "Fire weather";
  } else if (product === "WSW" && group) group.value = "Winter";
  else if (product === "FFA" && group) group.value = "Flood";
  else if (product === "CFW" && group) group.value = "Coastal / lakeshore";
});

document.querySelector("#createHazardForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  // Only the Create button proceeds; cancel is handled separately
  if (submitter && submitter.value !== "create" && !submitter.classList.contains("primary-button")) {
    closeCreateHazardDialog();
    return;
  }
  const err = document.querySelector("#createHazardError");
  const showErr = (msg) => {
    if (!err) return;
    err.hidden = false;
    err.textContent = msg;
    err.className = "template-confirm-note error";
  };
  const code = String(document.querySelector("#createHazardCode")?.value || "").trim().toUpperCase();
  const name = String(document.querySelector("#createHazardName")?.value || "").trim();
  if (!/^[A-Z]{2}\.[A-Z]$/.test(code)) {
    showErr("Use a VTEC phen.sig like EW.Y or HZ.A (two letters, dot, one letter).");
    document.querySelector("#createHazardCode")?.focus();
    return;
  }
  if (!name) {
    showErr("Enter a product name.");
    document.querySelector("#createHazardName")?.focus();
    return;
  }
  if (builtInCodes.has(code) || hazardCatalog.some((h) => h.code === code)) {
    showErr(`${code} already exists. Open that product to edit its template.`);
    document.querySelector("#createHazardCode")?.focus();
    return;
  }
  const product = document.querySelector("#createHazardProduct")?.value || "NPW";
  const group = document.querySelector("#createHazardGroup")?.value || "Custom";
  const style = document.querySelector("#createHazardStyle")?.value === "rfw" ? "rfw" : "standard";
  const zoneType = document.querySelector("#createHazardZoneType")?.value === "fire" ? "fire" : "public";
  const color = document.querySelector("#createHazardColor")?.value || "#FFA500";
  const impacts = String(document.querySelector("#createHazardImpacts")?.value || "").trim();
  hazardCatalog.push({
    group,
    code,
    name,
    product,
    style,
    zoneType,
    color,
    priority: 200,
    impacts,
    isCustom: true
  });
  templates = {
    ...templates,
    [code]: {
      isCustom: true,
      name,
      product,
      group,
      style,
      zoneType,
      color,
      priority: 200,
      what: "",
      impacts,
      cta: "",
      fullTemplate: "",
      bodyTemplate: ""
    }
  };
  openTemplateCodes.add(code);
  activeTemplateGroup = "";
  if (document.querySelector("#templateFilter")) {
    document.querySelector("#templateFilter").value = code;
  }
  closeCreateHazardDialog();
  render();
  const card = host.querySelector(`details.template[data-code="${CSS.escape(code)}"]`);
  if (card) card.open = true;
  const statusEl = document.querySelector("#status");
  if (statusEl) {
    statusEl.className = "";
    statusEl.textContent = `Saving ${name} (${code})…`;
  }
  try {
    const draft = collectTemplateDraft();
    const response = await fetch("/api/ops/admin/hazard-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: draft })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    templates = data.templates || {};
    syncCatalogFromTemplates(templates);
    openTemplateCodes.add(code);
    render();
    const savedCard = host.querySelector(`details.template[data-code="${CSS.escape(code)}"]`);
    if (savedCard) savedCard.open = true;
    if (statusEl) {
      statusEl.className = "ok";
      statusEl.textContent = `Created and published ${name} (${code}). Reload the Ops desk to use it in Hazard Services.`;
    }
  } catch (error) {
    delete templates[code];
    const catalogIndex = hazardCatalog.findIndex((item) => item.code === code && item.isCustom);
    if (catalogIndex >= 0) hazardCatalog.splice(catalogIndex, 1);
    render();
    if (statusEl) {
      statusEl.className = "error";
      statusEl.textContent = `Could not create ${name}: ${error.message}`;
    }
  }
});

load().catch((error) => {
  status.className = "error";
  status.textContent = error.message;
});
