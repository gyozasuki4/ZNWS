/* ZNWS custom weather icons
 * NWS-aligned condition codes · generated ZNWS bitmap icons (/assets/weather-icons)
 * https://www.weather.gov/forecast-icons/
 */
(() => {
  "use strict";

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /** Sky-only codes (NWS icon URL may be more specific for precip). */
  const SKY_ONLY = new Set([
    "skc", "few", "sct", "bkn", "ovc",
    "wind_skc", "wind_few", "wind_sct", "wind_bkn", "wind_ovc"
  ]);

  const weatherKind = (description, isDaytime = true) => {
    const text = String(description || "").toLowerCase();

    if (/hurricane\s*warning|hur\s*warn/.test(text)) return "hur_warn";
    if (/hurricane\s*watch|hur\s*watch/.test(text)) return "hur_watch";
    if (/tropical\s*storm\s*warning|ts\s*warn/.test(text)) return "ts_warn";
    if (/tropical\s*storm\s*watch|ts\s*watch/.test(text)) return "ts_watch";
    if (/tropical\s*storm|hurricane|typhoon/.test(text)) return "ts_nowarn";
    if (/\btornado\b/.test(text)) return "tor";
    if (/funnel|water\s*spout/.test(text)) return "fc";
    if (/blizzard/.test(text)) return "blizzard";

    if (/freezing\s*(rain|drizzle).*snow|snow.*freezing\s*(rain|drizzle)/.test(text)) return "fzra_sn";
    if (/(rain|drizzle).{0,24}freezing\s*(rain|drizzle)|freezing\s*(rain|drizzle).{0,24}\brain\b/.test(text) && !/snow/.test(text))
      return "ra_fzra";
    if (/freezing\s*(rain|drizzle)|wintry\s*mix/.test(text)) return "fzra";
    if (/(rain|drizzle).*(ice\s*pellet|sleet)|(ice\s*pellet|sleet).*(rain|drizzle)/.test(text)) return "raip";
    if (/snow.*(ice\s*pellet|sleet|hail)|(ice\s*pellet|sleet).*snow/.test(text)) return "snip";
    if (/ice\s*pellet|sleet|hail|ice\s*crystal|snow\s*pellet/.test(text)) return "ip";
    if (/(rain|drizzle).*(snow)|(snow).*(rain|drizzle)/.test(text)) return "ra_sn";
    if (/snow|flurr|blowing\s*snow|drifting\s*snow|snow\s*grain/.test(text)) return "sn";

    if (/thunder|t-?storm|lightning/.test(text)) {
      if (/vicinity|isolated|scattered|slight\s*chance/.test(text) && !/likely|numerous|widespread/.test(text)) {
        if (/sunny|mostly\s*sunny|clear|few|partly|isolated|slight\s*chance/.test(text)) return "hi_tsra";
        return "scttsra";
      }
      return "tsra";
    }

    if (/shower/.test(text)) {
      if (/vicinity|isolated|slight\s*chance/.test(text) && !/likely|numerous|heavy/.test(text)) return "hi_shwrs";
      return "shra";
    }
    if (/drizzle|sprinkle|light\s*rain/.test(text)) return "minus_ra";
    if (/\brain\b/.test(text)) return "ra";

    // Visibility / particulates beat sky cover — e.g. "Smoke · Mostly Clear", "Mostly Clear with Smoke"
    if (/smoke|smoky/.test(text)) return "fu";
    if (/haze|hazy/.test(text)) return "hz";
    if (/blowing\s*dust|blowing\s*sand|dust\s*storm|sand\s*storm|\bdust\b|\bsand\b/.test(text)) return "du";
    if (/fog|mist/.test(text)) return "fg";
    if (/\bhot\b|extreme\s*heat/.test(text)) return "hot";
    if (/\bcold\b|frigid|bitter\s*cold/.test(text)) return "cold";

    const windy = /wind|breezy|blustery|gusty/.test(text);
    let sky = "skc";
    if (/overcast/.test(text)) sky = "ovc";
    else if (/mostly\s*cloudy|broken/.test(text)) sky = "bkn";
    else if (/partly|scattered\s*cloud|mostly\s*sunny|mostly\s*clear|clearing/.test(text)) sky = "sct";
    else if (/few\s*cloud|a\s*few\s*cloud/.test(text)) sky = "few";
    else if (/cloud/.test(text)) sky = "bkn";
    else if (/fair|clear|sunny/.test(text)) sky = "skc";
    if (windy) return `wind_${sky}`;
    return sky;
  };

  const kindFromIconUrl = (url) => {
    if (!url) return null;
    // e.g. /icons/land/night/skc,0?size=medium  or  /icons/land/day/tsra,40/sct,20
    const m = String(url).match(/\/icons\/land\/(day|night)\/([a-z0-9_]+)/i);
    if (!m) return null;
    return { code: m[2].toLowerCase(), isDaytime: m[1].toLowerCase() === "day" };
  };

  /** Normalize NWS night-prefixed static filenames if they ever appear as codes. */
  const NIGHT_PREFIXED = {
    nskc: "skc", nfew: "few", nsct: "sct", nbkn: "bkn", novc: "ovc",
    nsn: "sn", nra_sn: "ra_sn", nraip: "raip", nfzra: "fzra", nra_fzra: "ra_fzra",
    nfzra_sn: "fzra_sn", nip: "ip", nsnip: "snip", nra: "ra", nshra: "shra",
    hi_nshwrs: "hi_shwrs", ntsra: "tsra", nscttsra: "scttsra", hi_ntsra: "hi_tsra",
    nfc: "fc", ntor: "tor", nwind_skc: "wind_skc", nwind_few: "wind_few",
    nwind_sct: "wind_sct", nwind_bkn: "wind_bkn", nwind_ovc: "wind_ovc",
    ndu: "du", nfu: "fu", nfg: "fg", nblizzard: "blizzard", ncold: "cold"
  };

  /** Every condition has a matching `-night` PNG under /assets/weather-icons/. */
  const iconAssetUrl = (kind, isDaytime) => {
    const stem = isDaytime ? kind : `${kind}-night`;
    return `/assets/weather-icons/${stem}.png?v=20260805-night-all`;
  };

  /**
   * Resolve final icon code from forecast text + optional NWS icon URL.
   * Text wins for visibility (smoke/haze/fog) and non-sky conditions.
   * Period isDaytime always controls day vs night art — not the URL path.
   */
  const resolveKind = (description, isDaytime, iconUrl) => {
    const textKind = weatherKind(description, isDaytime);
    const fromUrl = kindFromIconUrl(iconUrl);
    let urlKind = fromUrl?.code || null;
    if (urlKind && NIGHT_PREFIXED[urlKind]) urlKind = NIGHT_PREFIXED[urlKind];

    // Prefer text when it carries smoke/haze/dust/fog or other non-sky hazards
    if (!SKY_ONLY.has(textKind)) return textKind;
    // Text is sky-only: allow NWS URL to supply precip detail when present
    if (urlKind && !SKY_ONLY.has(urlKind)) return urlKind;
    // Prefer text sky cover (includes mostly clear → sct) over URL skc
    if (textKind) return textKind;
    return urlKind || (isDaytime ? "skc" : "skc");
  };

  const weatherVisual = (description, isDaytime = true, className = "", iconUrl = null) => {
    // Keep caller day/night (period.isDaytime / local hour). Do not override from icon URL —
    // that was showing day-clear art on night periods when the URL path said "day".
    let kind = resolveKind(description, isDaytime, iconUrl);
    if (NIGHT_PREFIXED[kind]) kind = NIGHT_PREFIXED[kind];

    const src = iconAssetUrl(kind, isDaytime);
    const fallback = iconAssetUrl(isDaytime ? "skc" : "skc", isDaytime);
    const cssKind = kind.replace(/_/g, "-");
    const nightClass = isDaytime ? "" : " is-night";
    const label = esc(description || "Weather conditions");
    return (
      `<span class="znws-weather-icon is-bitmap ${cssKind}${nightClass} ${className}" data-nws="${esc(kind)}" role="img" aria-label="${label}">` +
      `<img src="${esc(src)}" alt="" width="80" height="80" loading="lazy" decoding="async" ` +
      `onerror="this.onerror=null;this.src='${esc(fallback)}'"/>` +
      `</span>`
    );
  };

  /** Full day + night pairs so /weather-icons “Show night variants” lists every asset. */
  const weatherIconCatalog = [
    { group: "Sky cover", nws: "skc", label: "Fair / clear", phrase: "Sunny", day: true },
    { group: "Sky cover", nws: "skc", label: "Clear night", phrase: "Clear", day: false },
    { group: "Sky cover", nws: "few", label: "A few clouds", phrase: "A Few Clouds", day: true },
    { group: "Sky cover", nws: "few", label: "A few clouds night", phrase: "A Few Clouds", day: false },
    { group: "Sky cover", nws: "sct", label: "Partly cloudy", phrase: "Partly Cloudy", day: true },
    { group: "Sky cover", nws: "sct", label: "Partly cloudy night", phrase: "Partly Cloudy", day: false },
    { group: "Sky cover", nws: "bkn", label: "Mostly cloudy", phrase: "Mostly Cloudy", day: true },
    { group: "Sky cover", nws: "bkn", label: "Mostly cloudy night", phrase: "Mostly Cloudy", day: false },
    { group: "Sky cover", nws: "ovc", label: "Overcast", phrase: "Overcast", day: true },
    { group: "Sky cover", nws: "ovc", label: "Overcast night", phrase: "Overcast", day: false },
    { group: "Winter weather", nws: "sn", label: "Snow", phrase: "Snow", day: true },
    { group: "Winter weather", nws: "sn", label: "Snow night", phrase: "Snow", day: false },
    { group: "Winter weather", nws: "ra_sn", label: "Rain / snow", phrase: "Rain Snow", day: true },
    { group: "Winter weather", nws: "ra_sn", label: "Rain / snow night", phrase: "Rain Snow", day: false },
    { group: "Winter weather", nws: "raip", label: "Rain / ice pellets", phrase: "Rain Ice Pellets", day: true },
    { group: "Winter weather", nws: "raip", label: "Rain / ice pellets night", phrase: "Rain Ice Pellets", day: false },
    { group: "Winter weather", nws: "fzra", label: "Freezing rain", phrase: "Freezing Rain", day: true },
    { group: "Winter weather", nws: "fzra", label: "Freezing rain night", phrase: "Freezing Rain", day: false },
    { group: "Winter weather", nws: "ra_fzra", label: "Rain / freezing rain", phrase: "Rain Freezing Rain", day: true },
    { group: "Winter weather", nws: "ra_fzra", label: "Rain / freezing rain night", phrase: "Rain Freezing Rain", day: false },
    { group: "Winter weather", nws: "fzra_sn", label: "Freezing rain / snow", phrase: "Freezing Rain Snow", day: true },
    { group: "Winter weather", nws: "fzra_sn", label: "Freezing rain / snow night", phrase: "Freezing Rain Snow", day: false },
    { group: "Winter weather", nws: "ip", label: "Ice pellets / hail", phrase: "Ice Pellets", day: true },
    { group: "Winter weather", nws: "ip", label: "Ice pellets night", phrase: "Ice Pellets", day: false },
    { group: "Winter weather", nws: "snip", label: "Snow / ice pellets", phrase: "Snow Ice Pellets", day: true },
    { group: "Winter weather", nws: "snip", label: "Snow / ice pellets night", phrase: "Snow Ice Pellets", day: false },
    { group: "Winter weather", nws: "blizzard", label: "Blizzard", phrase: "Blizzard", day: true },
    { group: "Winter weather", nws: "blizzard", label: "Blizzard night", phrase: "Blizzard", day: false },
    { group: "Rain", nws: "minus_ra", label: "Light rain / drizzle", phrase: "Light Rain", day: true },
    { group: "Rain", nws: "minus_ra", label: "Light rain night", phrase: "Light Rain", day: false },
    { group: "Rain", nws: "ra", label: "Rain", phrase: "Rain", day: true },
    { group: "Rain", nws: "ra", label: "Rain night", phrase: "Rain", day: false },
    { group: "Rain", nws: "shra", label: "Rain showers", phrase: "Rain Showers", day: true },
    { group: "Rain", nws: "shra", label: "Rain showers night", phrase: "Rain Showers", day: false },
    { group: "Rain", nws: "hi_shwrs", label: "Showers in vicinity", phrase: "Isolated Showers", day: true },
    { group: "Rain", nws: "hi_shwrs", label: "Showers in vicinity night", phrase: "Isolated Showers", day: false },
    { group: "Thunderstorms", nws: "tsra", label: "Thunderstorm", phrase: "Thunderstorms", day: true },
    { group: "Thunderstorms", nws: "tsra", label: "Thunderstorm night", phrase: "Thunderstorms", day: false },
    { group: "Thunderstorms", nws: "scttsra", label: "Scattered thunderstorms", phrase: "Scattered Thunderstorms", day: true },
    { group: "Thunderstorms", nws: "scttsra", label: "Scattered thunderstorms night", phrase: "Scattered Thunderstorms", day: false },
    { group: "Thunderstorms", nws: "hi_tsra", label: "Isolated thunderstorms", phrase: "Isolated Thunderstorms", day: true },
    { group: "Thunderstorms", nws: "hi_tsra", label: "Isolated thunderstorms night", phrase: "Isolated Thunderstorms", day: false },
    { group: "Severe & tropical", nws: "fc", label: "Funnel cloud", phrase: "Funnel Cloud", day: true },
    { group: "Severe & tropical", nws: "fc", label: "Funnel cloud night", phrase: "Funnel Cloud", day: false },
    { group: "Severe & tropical", nws: "tor", label: "Tornado", phrase: "Tornado", day: true },
    { group: "Severe & tropical", nws: "tor", label: "Tornado night", phrase: "Tornado", day: false },
    { group: "Severe & tropical", nws: "hur_warn", label: "Hurricane warning", phrase: "Hurricane Warning", day: true },
    { group: "Severe & tropical", nws: "hur_warn", label: "Hurricane warning night", phrase: "Hurricane Warning", day: false },
    { group: "Severe & tropical", nws: "hur_watch", label: "Hurricane watch", phrase: "Hurricane Watch", day: true },
    { group: "Severe & tropical", nws: "hur_watch", label: "Hurricane watch night", phrase: "Hurricane Watch", day: false },
    { group: "Severe & tropical", nws: "ts_warn", label: "Tropical storm warning", phrase: "Tropical Storm Warning", day: true },
    { group: "Severe & tropical", nws: "ts_warn", label: "Tropical storm warning night", phrase: "Tropical Storm Warning", day: false },
    { group: "Severe & tropical", nws: "ts_watch", label: "Tropical storm watch", phrase: "Tropical Storm Watch", day: true },
    { group: "Severe & tropical", nws: "ts_watch", label: "Tropical storm watch night", phrase: "Tropical Storm Watch", day: false },
    { group: "Severe & tropical", nws: "ts_nowarn", label: "Tropical storm", phrase: "Tropical Storm", day: true },
    { group: "Severe & tropical", nws: "ts_nowarn", label: "Tropical storm night", phrase: "Tropical Storm", day: false },
    { group: "Wind", nws: "wind_skc", label: "Fair and windy", phrase: "Fair and Windy", day: true },
    { group: "Wind", nws: "wind_skc", label: "Fair and windy night", phrase: "Fair and Windy", day: false },
    { group: "Wind", nws: "wind_few", label: "Few clouds and windy", phrase: "A Few Clouds and Windy", day: true },
    { group: "Wind", nws: "wind_few", label: "Few clouds and windy night", phrase: "A Few Clouds and Windy", day: false },
    { group: "Wind", nws: "wind_sct", label: "Partly cloudy and windy", phrase: "Partly Cloudy and Windy", day: true },
    { group: "Wind", nws: "wind_sct", label: "Partly cloudy and windy night", phrase: "Partly Cloudy and Windy", day: false },
    { group: "Wind", nws: "wind_bkn", label: "Mostly cloudy and windy", phrase: "Mostly Cloudy and Windy", day: true },
    { group: "Wind", nws: "wind_bkn", label: "Mostly cloudy and windy night", phrase: "Mostly Cloudy and Windy", day: false },
    { group: "Wind", nws: "wind_ovc", label: "Overcast and windy", phrase: "Overcast and Windy", day: true },
    { group: "Wind", nws: "wind_ovc", label: "Overcast and windy night", phrase: "Overcast and Windy", day: false },
    { group: "Visibility & extremes", nws: "du", label: "Dust / sand", phrase: "Blowing Dust", day: true },
    { group: "Visibility & extremes", nws: "du", label: "Dust / sand night", phrase: "Blowing Dust", day: false },
    { group: "Visibility & extremes", nws: "fu", label: "Smoke", phrase: "Smoke", day: true },
    { group: "Visibility & extremes", nws: "fu", label: "Smoke night", phrase: "Smoke", day: false },
    { group: "Visibility & extremes", nws: "hz", label: "Haze", phrase: "Haze", day: true },
    { group: "Visibility & extremes", nws: "hz", label: "Haze night", phrase: "Haze", day: false },
    { group: "Visibility & extremes", nws: "fg", label: "Fog / mist", phrase: "Fog", day: true },
    { group: "Visibility & extremes", nws: "fg", label: "Fog night", phrase: "Fog", day: false },
    { group: "Visibility & extremes", nws: "hot", label: "Hot", phrase: "Hot", day: true },
    { group: "Visibility & extremes", nws: "hot", label: "Hot night", phrase: "Hot", day: false },
    { group: "Visibility & extremes", nws: "cold", label: "Cold", phrase: "Cold", day: true },
    { group: "Visibility & extremes", nws: "cold", label: "Cold night", phrase: "Cold", day: false }
  ];

  window.znwsWeatherVisual = weatherVisual;
  window.znwsWeatherKind = weatherKind;
  window.znwsWeatherIconCatalog = weatherIconCatalog;
  window.znwsKindFromIconUrl = kindFromIconUrl;
})();
