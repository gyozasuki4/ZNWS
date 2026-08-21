/**
 * ZNCave SPC desk — Storm Prediction Center style watches.
 * National products (not tied to a single CWA). MapLibre-agnostic; app.js owns UI.
 */
(function (global) {
  "use strict";

  const OFFICE = {
    id: "SPC",
    siteId: "SPC",
    fullStaId: "KWNS",
    wmo: "KWNS",
    officeShort: "Storm Prediction Center",
    officeLoc: "Norman OK",
    tz: "CDT",
    tzOffsetHours: -5
  };

  /** Product codes used in UI / map / public site */
  const PRODUCT_META = {
    // NWS WWA_Changes_10124.pdf — TOA yellow, SVA palevioletred
    TOA: {
      name: "Tornado Watch",
      phen: "TO",
      sig: "A",
      defaultHours: 6,
      color: "#FFFF00",
      label: "TOA",
      wwTitle: "TORNADO WATCH"
    },
    SVA: {
      name: "Severe Thunderstorm Watch",
      phen: "SV",
      sig: "A",
      defaultHours: 6,
      color: "#DB7093",
      label: "SVA",
      wwTitle: "SEVERE THUNDERSTORM WATCH"
    }
  };

  const HAIL_OPTIONS = [
    { id: "none", label: "None specified", inches: 0 },
    { id: "1.00", label: '1.00" (quarter)', inches: 1.0 },
    { id: "1.50", label: '1.50"', inches: 1.5 },
    { id: "2.00", label: '2.00"', inches: 2.0 },
    { id: "2.50", label: '2.50"', inches: 2.5 },
    { id: "3.00", label: '3.00"', inches: 3.0 },
    { id: "3.50", label: '3.50"', inches: 3.5 },
    { id: "4.00", label: '4.00"+', inches: 4.0 }
  ];

  const WIND_OPTIONS = [
    { id: "none", label: "None specified", mph: 0 },
    { id: "60", label: "60 mph", mph: 60 },
    { id: "70", label: "70 mph", mph: 70 },
    { id: "80", label: "80 mph", mph: 80 },
    { id: "90", label: "90 mph", mph: 90 }
  ];

  function getProductMeta(product) {
    return PRODUCT_META[product] || PRODUCT_META.SVA;
  }

  function createState() {
    return {
      product: "TOA",
      mode: "idle", // idle | drawPoly
      vertices: [],
      polygon: null,
      counties: [],
      /** Full county set from the box before SPC WFO include/exclude filtering. */
      resolvedCounties: [],
      states: [],
      places: [],
      /**
       * SPC final include map by CWA (e.g. { OHX: true, BMX: false }).
       * WFO consent responses are advisory only — this map is authoritative.
       */
      wfoInclude: {},
      /**
       * Manual click overrides survive box recompute / Issue.
       * include: { [fips]: countyRecord }, exclude: { [fips]: true }
       */
      countyManualInclude: {},
      countyManualExclude: {},
      watchNumber: null,
      action: "NEW", // NEW | CON | CAN
      status: "draft", // draft | active | cancelled
      validHours: 6,
      issuedAt: null,
      expiresAt: null,
      // Threat outlook phrasing
      hailId: "1.00",
      windId: "70",
      tornadoes: true, // TOA always; optional mention on SVA
      intenseTornadoes: false,
      veryLargeHail: false,
      significantWind: false,
      pds: false, // particularly dangerous situation
      replacing: "", // prior WW number being replaced
      /** Freeform "portions of" lines (one region per line), e.g. Northern and Central Arkansas */
      portionsText: "",
      /** Optional override for "along and 60 miles N/S of a line from …" */
      axisOverride: "",
      discussion: "", // SUMMARY body (without SUMMARY... prefix)
      forecaster: "",
      text: "",
      watchId: null,
      timeline: [],
      segment: 0,
      /** Shared coordination draft id (server) while coordinating with WFOs. */
      coordinationId: null
    };
  }

  function formatWatchNumber(n) {
    const num = Number(n);
    if (!Number.isFinite(num) || num <= 0) {
      return "0000";
    }
    return String(Math.max(1, Math.min(9999, Math.round(num)))).padStart(4, "0");
  }

  /** Display id: WW 0312 · TOA */
  function formatWatchId(product, watchNumber) {
    const meta = getProductMeta(product);
    return `WW ${formatWatchNumber(watchNumber)} · ${meta.label}`;
  }

  /** Compact map / public id: SPCWW0312 */
  function formatProductId(product, watchNumber) {
    return `SPCWW${formatWatchNumber(watchNumber)}`;
  }

  function nextWatchNumber(activeWatches) {
    const list = Array.isArray(activeWatches) ? activeWatches : [];
    let max = 0;
    list.forEach((w) => {
      const n = Number(w.watchNumber);
      if (Number.isFinite(n) && n > max) {
        max = n;
      }
    });
    // Also scan year-agnostic; start from 1 if empty
    return max + 1;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toUtcStamp(date) {
    const d = date instanceof Date ? date : new Date(date);
    return (
      String(d.getUTCFullYear()).slice(2) +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) +
      "T" +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      "Z"
    );
  }

  /** Snap a newly generated watch expiration to the nearest whole hour. */
  function roundToNearestHour(date) {
    const hourMs = 60 * 60 * 1000;
    return new Date(Math.round(date.getTime() / hourMs) * hourMs);
  }

  function computeExpireTime(now, hours) {
    const h = Number(hours) || 6;
    const raw = new Date(now.getTime() + h * 60 * 60 * 1000);
    return roundToNearestHour(raw);
  }

  function verticesToPolygon(vertices) {
    if (!vertices || vertices.length < 3) {
      return null;
    }
    const ring = vertices.map((v) => [v[0], v[1]]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
    // Prefer WarnGen helper if present (same ring close rules)
    if (global.WarnGen && typeof global.WarnGen.verticesToPolygon === "function") {
      return global.WarnGen.verticesToPolygon(vertices);
    }
    return { type: "Polygon", coordinates: [ring] };
  }

  /** Planar ring area (absolute); good enough to rank land vs water splits. */
  function ringArea(ring) {
    if (!ring || ring.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return Math.abs(sum / 2);
  }

  /**
   * Score a county geometry for "main land mass" selection.
   * AWIPS coastal counties (Kent MD, Anne Arundel, etc.) often have a second
   * MultiPolygon of Chesapeake water fragments — total area ranking alone can
   * still leave water flecks; prefer the feature whose largest single part is biggest.
   */
  function geometryLandScore(geometry) {
    if (!geometry) return { total: 0, maxPart: 0 };
    try {
      if (geometry.type === "Polygon") {
        const a = ringArea(geometry.coordinates?.[0]);
        return { total: a, maxPart: a };
      }
      if (geometry.type === "MultiPolygon") {
        let total = 0;
        let maxPart = 0;
        (geometry.coordinates || []).forEach((poly) => {
          const a = ringArea(poly?.[0]);
          total += a;
          if (a > maxPart) maxPart = a;
        });
        return { total, maxPart };
      }
    } catch {
      /* fall through */
    }
    return { total: 0, maxPart: 0 };
  }

  function roughGeomArea(geometry) {
    if (!geometry) return 0;
    try {
      if (global.turf && typeof global.turf.area === "function") {
        return global.turf.area({ type: "Feature", properties: {}, geometry });
      }
    } catch {
      /* fall through */
    }
    return geometryLandScore(geometry).total;
  }

  /**
   * Drop tiny multipolygon shards (water flecks) — keep parts ≥ 5% of the largest ring.
   * Turns single-dominant MultiPolygons into a clean Polygon for map fill.
   */
  function preferLandMassGeometry(geometry) {
    if (!geometry) return geometry;
    if (geometry.type === "Polygon") {
      try {
        return JSON.parse(JSON.stringify(geometry));
      } catch {
        return geometry;
      }
    }
    if (geometry.type !== "MultiPolygon") return geometry;
    try {
      const parts = (geometry.coordinates || [])
        .map((poly) => ({ poly, area: ringArea(poly?.[0]) }))
        .filter((p) => p.area > 0)
        .sort((a, b) => b.area - a.area);
      if (!parts.length) return geometry;
      const maxA = parts[0].area;
      const kept = parts.filter((p) => p.area >= maxA * 0.05).map((p) => p.poly);
      if (kept.length === 1) {
        return { type: "Polygon", coordinates: kept[0] };
      }
      return { type: "MultiPolygon", coordinates: kept };
    } catch {
      return geometry;
    }
  }

  /**
   * Among all source features for a FIPS, pick the best land mass and clean water flecks.
   */
  function pickBestCountySourceFeature(fips, countyFc) {
    const key = String(fips || "").trim();
    if (!key || !countyFc?.features?.length) return null;
    let best = null;
    let bestScore = -1;
    countyFc.features.forEach((f) => {
      if (String(f.properties?.FIPS || f.properties?.GEOID || "") !== key) return;
      const score = geometryLandScore(f.geometry);
      // Primary: largest single exterior ring (land body). Tie-break: total area.
      const rank = score.maxPart * 1e6 + score.total;
      if (rank > bestScore) {
        bestScore = rank;
        best = f;
      }
    });
    return best;
  }

  /**
   * AWIPS county shapefiles sometimes emit multiple features per FIPS
   * (e.g. Baltimore City / Harford / Cecil / Kent MD land+water splits).
   */
  function dedupeCountiesByFips(counties) {
    const byFips = new Map();
    (counties || []).forEach((county) => {
      const fips = String(county.fips || county.ugc || "").trim();
      const key = fips || `${county.name}|${county.state}|${Math.random()}`;
      const score = geometryLandScore(county.geometry);
      const rank = score.maxPart * 1e6 + score.total;
      const prev = byFips.get(key);
      if (!prev || rank > (prev._rank || 0)) {
        byFips.set(key, { ...county, _rank: rank });
      }
    });
    return [...byFips.values()].map((c) => {
      const { _rank, ...rest } = c;
      return rest;
    });
  }

  /**
   * If the box only grazes a water split of a county, still paint the main land mass.
   */
  function upgradeCountyGeometryFromSource(county, countyFc) {
    const fips = String(county?.fips || county?.ugc || "").trim();
    const best = pickBestCountySourceFeature(fips, countyFc);
    if (!best?.geometry) {
      if (!county?.geometry) return county;
      return {
        ...county,
        geometry: preferLandMassGeometry(county.geometry)
      };
    }
    try {
      return {
        ...county,
        name: best.properties?.COUNTYNAME || best.properties?.NAME || county.name,
        state: best.properties?.STATE || county.state,
        cwa: String(best.properties?.CWA || county.cwa || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 4),
        fips: String(best.properties?.FIPS || fips),
        ugc: String(best.properties?.FIPS || county.ugc || fips),
        geometry: preferLandMassGeometry(JSON.parse(JSON.stringify(best.geometry)))
      };
    } catch {
      return {
        ...county,
        geometry: preferLandMassGeometry(best.geometry)
      };
    }
  }

  /** Build a clean county record from FIPS + optional hit properties (map click path). */
  function countyRecordFromFips(fips, countyFc, hitProperties = {}) {
    const key = String(fips || hitProperties.FIPS || hitProperties.GEOID || "").trim();
    const best = pickBestCountySourceFeature(key, countyFc);
    const p = best?.properties || hitProperties || {};
    const base = {
      name: p.COUNTYNAME || p.NAME || hitProperties.COUNTYNAME || hitProperties.NAME || "County",
      state: p.STATE || hitProperties.STATE || "",
      fips: key,
      ugc: key,
      cwa: String(p.CWA || p.WFO || hitProperties.CWA || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
      geometry: best?.geometry
        ? preferLandMassGeometry(JSON.parse(JSON.stringify(best.geometry)))
        : null
    };
    return upgradeCountyGeometryFromSource(base, countyFc);
  }

  /**
   * One feature per FIPS with main land mass geometry.
   * Use when loading AWIPS counties for map display + WarnGen/SPC resolve so
   * coastal land/water splits (MD, VA, NC, FL, …) do not paint bay water.
   */
  function normalizeCountyFeatureCollection(countyFc) {
    const features = Array.isArray(countyFc?.features) ? countyFc.features : [];
    if (!features.length) {
      return { type: "FeatureCollection", features: [] };
    }
    const byFips = new Map();
    const noFips = [];
    features.forEach((f) => {
      const fips = String(f?.properties?.FIPS || f?.properties?.GEOID || "").trim();
      if (!fips) {
        noFips.push(f);
        return;
      }
      if (!byFips.has(fips)) byFips.set(fips, []);
      byFips.get(fips).push(f);
    });
    const cleaned = [];
    byFips.forEach((group, fips) => {
      let best = group[0];
      let bestRank = -1;
      group.forEach((f) => {
        const score = geometryLandScore(f.geometry);
        const rank = score.maxPart * 1e6 + score.total;
        if (rank > bestRank) {
          bestRank = rank;
          best = f;
        }
      });
      let geometry = best.geometry;
      try {
        geometry = preferLandMassGeometry(JSON.parse(JSON.stringify(best.geometry)));
      } catch {
        geometry = preferLandMassGeometry(best.geometry);
      }
      cleaned.push({
        type: "Feature",
        properties: { ...(best.properties || {}), FIPS: fips },
        geometry
      });
    });
    // Preserve rare features missing FIPS (should be none in AWIPS)
    noFips.forEach((f) => cleaned.push(f));
    cleaned.sort((a, b) => {
      const sa = String(a.properties?.STATE || "");
      const sb = String(b.properties?.STATE || "");
      if (sa !== sb) return sa.localeCompare(sb);
      return String(a.properties?.COUNTYNAME || "").localeCompare(String(b.properties?.COUNTYNAME || ""));
    });
    return {
      type: "FeatureCollection",
      features: cleaned
    };
  }

  /**
   * Resolve counties / states from watch polygon.
   * Each county keeps a geometry clone so issued watches can paint county fills
   * (not the freehand box), matching real SPC watch depiction.
   */
  function resolveAreas(polygon, countyFc, placesCatalog) {
    if (!polygon) {
      return { counties: [], states: [], places: [] };
    }

    let counties = [];
    let places = [];

    if (global.WarnGen && typeof global.WarnGen.resolveAreas === "function") {
      // "SPC" skips CWA filter so multi-state watches resolve all counties
      const resolved = global.WarnGen.resolveAreas(
        polygon,
        countyFc,
        null,
        placesCatalog || [],
        "SPC"
      );
      counties = dedupeCountiesByFips(
        (resolved.counties || [])
          .map(normalizeCountyRecord)
          .map((c) => upgradeCountyGeometryFromSource(c, countyFc))
      );
      places = (resolved.places || []).slice(0, 80);
    } else if (countyFc && countyFc.features && global.turf) {
      // Dedupe source features by FIPS first so split land/water pieces do not
      // each count as a separate hit (common for MD independent cities).
      const byFips = new Map();
      const watchFeature = global.turf.feature(polygon);
      countyFc.features.forEach((f) => {
        try {
          if (!global.turf.booleanIntersects(global.turf.feature(f.geometry, f.properties || {}), watchFeature)) return;
        } catch {
          return;
        }
        const p = f.properties || {};
        const fips = String(p.FIPS || "").trim();
        const key = fips || `${p.COUNTYNAME}|${p.STATE}`;
        const area = roughGeomArea(f.geometry);
        const prev = byFips.get(key);
        if (!prev || area > prev.area) byFips.set(key, { f, area });
      });
      counties = [...byFips.values()].map(({ f }) =>
        normalizeCountyRecord({
          name: (f.properties || {}).COUNTYNAME || (f.properties || {}).NAME || "County",
          state: (f.properties || {}).STATE || "",
          fips: (f.properties || {}).FIPS,
          ugc: (f.properties || {}).FIPS ? String((f.properties || {}).FIPS) : "",
          cwa: (f.properties || {}).CWA || (f.properties || {}).WFO || "",
          feature: f
        })
      );
    }

    const stateSet = new Map();
    counties.forEach((c) => {
      const st = (c.state || "").toUpperCase();
      if (st) {
        stateSet.set(st, (stateSet.get(st) || 0) + 1);
      }
    });
    const states = Array.from(stateSet.entries())
      .map(([abbr, count]) => ({ abbr, count }))
      .sort((a, b) => b.count - a.count || a.abbr.localeCompare(b.abbr));

    return { counties, states, places };
  }

  /** Strip Turf feature wrapper; keep serializable geometry for map display. */
  function normalizeCountyRecord(c) {
    const geom =
      c.geometry ||
      (c.feature && c.feature.geometry) ||
      null;
    let geometry = null;
    if (geom) {
      try {
        geometry = JSON.parse(JSON.stringify(geom));
      } catch {
        geometry = geom;
      }
    }
    const props = (c.feature && c.feature.properties) || {};
    const cwa = String(c.cwa || c.CWA || props.CWA || props.WFO || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    return {
      name: c.name || "County",
      state: c.state || "",
      fips: c.fips || "",
      ugc: c.ugc || "",
      cwa,
      geometry
    };
  }

  /** Group counties by WFO/CWA for coordination checklist. */
  function groupCountiesByWfo(counties) {
    const byWfo = new Map();
    (counties || []).forEach((county) => {
      const cwa = String(county?.cwa || "").toUpperCase() || "????";
      if (!byWfo.has(cwa)) {
        byWfo.set(cwa, []);
      }
      byWfo.get(cwa).push(county);
    });
    return [...byWfo.entries()]
      .map(([wfo, list]) => ({
        wfo,
        count: list.length,
        counties: list,
        states: [...new Set(list.map((c) => String(c.state || "").toUpperCase()).filter(Boolean))].sort()
      }))
      .sort((a, b) => a.wfo.localeCompare(b.wfo));
  }

  /**
   * Apply SPC WFO include map to a full resolved county list.
   * Missing keys default to included (true). SPC desk is final authority.
   */
  function applyWfoInclude(counties, wfoInclude) {
    const map = wfoInclude && typeof wfoInclude === "object" ? wfoInclude : {};
    return (counties || []).filter((county) => {
      const cwa = String(county?.cwa || "").toUpperCase();
      if (!cwa) return true;
      if (Object.prototype.hasOwnProperty.call(map, cwa)) {
        return Boolean(map[cwa]);
      }
      return true;
    });
  }

  /**
   * One GeoJSON feature per county for map fill/outline (issued watches).
   * Falls back to freehand watch box if no county geoms.
   */
  function countyDisplayFeatures(watchOrState, props = {}) {
    const counties = watchOrState.counties || [];
    const withGeom = counties.filter((c) => c && c.geometry);
    if (withGeom.length) {
      return withGeom.map((c) => ({
        type: "Feature",
        properties: {
          ...props,
          countyName: c.name || "",
          countyState: c.state || "",
          fips: c.fips || c.ugc || ""
        },
        geometry: c.geometry
      }));
    }
    if (watchOrState.polygon) {
      return [
        {
          type: "Feature",
          properties: { ...props, countyName: "", countyState: "", fips: "" },
          geometry: watchOrState.polygon
        }
      ];
    }
    return [];
  }

  /** MultiPolygon of all county rings — for public map / placefile single-poly consumers. */
  function countiesToMultiPolygon(counties) {
    const polys = [];
    (counties || []).forEach((c) => {
      if (!c || !c.geometry) {
        return;
      }
      if (c.geometry.type === "Polygon") {
        polys.push(c.geometry.coordinates);
      } else if (c.geometry.type === "MultiPolygon") {
        c.geometry.coordinates.forEach((p) => polys.push(p));
      }
    });
    if (!polys.length) {
      return null;
    }
    return { type: "MultiPolygon", coordinates: polys };
  }

  function vtecLine(state, { now, expireAt, action }) {
    const meta = getProductMeta(state.product);
    const act = action || state.action || "NEW";
    const etn = formatWatchNumber(state.watchNumber);
    const start = toUtcStamp(now);
    const end = toUtcStamp(expireAt);
    // /O.NEW.KWNS.TO.A.0312.260711T1800Z-260712T0000Z/
    return `/O.${act}.KWNS.${meta.phen}.${meta.sig}.${etn}.${start}-${end}/`;
  }

  function ugcBlock(state) {
    // Group counties by state for a compact UGC-like listing (FIPS not full UGC)
    const byState = new Map();
    (state.counties || []).forEach((c) => {
      const st = (c.state || "??").toUpperCase();
      if (!byState.has(st)) {
        byState.set(st, []);
      }
      byState.get(st).push(c.name);
    });
    const lines = [];
    byState.forEach((names, st) => {
      const unique = Array.from(new Set(names)).sort();
      lines.push(`${st}: ${unique.join("; ")}`);
    });
    return lines;
  }

  function snapshot(state) {
    const meta = getProductMeta(state.product);
    // Counties with geometry only (no Turf feature refs) for localStorage + map
    const counties = (state.counties || []).map(normalizeCountyRecord);
    const displayGeometry = countiesToMultiPolygon(counties) || state.polygon;
    return {
      id: state.watchId,
      kind: "spc-watch",
      office: "SPC",
      wfo: "SPC",
      product: state.product,
      productName: meta.name,
      color: meta.color,
      watchNumber: state.watchNumber,
      productId: formatProductId(state.product, state.watchNumber),
      etn: state.watchNumber,
      etnLabel: formatWatchNumber(state.watchNumber),
      action: state.action,
      status: state.status,
      validHours: state.validHours,
      issuedAt: state.issuedAt,
      expiresAt: state.expiresAt,
      // Freehand box kept for re-edit / axis text; display uses counties
      polygon: state.polygon,
      boxCenter: state.boxCenter || null,
      boxBearing: Number.isFinite(Number(state.boxBearing)) ? Number(state.boxBearing) : null,
      boxHalfLength: Number.isFinite(Number(state.boxHalfLength)) ? Number(state.boxHalfLength) : null,
      boxHalfWidth: Number.isFinite(Number(state.boxHalfWidth)) ? Number(state.boxHalfWidth) : null,
      boxSlantMiles: Number.isFinite(Number(state.boxSlantMiles)) ? Number(state.boxSlantMiles) : null,
      displayGeometry,
      counties,
      wfoInclude: state.wfoInclude && typeof state.wfoInclude === "object" ? { ...state.wfoInclude } : {},
      states: state.states,
      places: (state.places || []).map((p) => ({
        name: p.name,
        state: p.state,
        rank: p.rank,
        coordinates: p.coordinates,
        inside: p.inside,
        dist: p.dist
      })),
      hailId: state.hailId,
      windId: state.windId,
      tornadoes: state.tornadoes,
      intenseTornadoes: state.intenseTornadoes,
      veryLargeHail: state.veryLargeHail,
      significantWind: state.significantWind,
      pds: state.pds,
      replacing: state.replacing,
      portionsText: state.portionsText,
      axisOverride: state.axisOverride,
      discussion: state.discussion,
      forecaster: state.forecaster,
      text: state.text,
      timeline: state.timeline || [],
      segment: state.segment || 0,
      updatedAt: new Date().toISOString(),
      locationPhrase: (state.states || []).map((s) => s.abbr).join("-") || "multi-state"
    };
  }

  global.SpcDesk = {
    OFFICE,
    PRODUCT_META,
    HAIL_OPTIONS,
    WIND_OPTIONS,
    getProductMeta,
    createState,
    formatWatchNumber,
    formatWatchId,
    formatProductId,
    nextWatchNumber,
    computeExpireTime,
    verticesToPolygon,
    resolveAreas,
    normalizeCountyRecord,
    groupCountiesByWfo,
    applyWfoInclude,
    pickBestCountySourceFeature,
    upgradeCountyGeometryFromSource,
    countyRecordFromFips,
    preferLandMassGeometry,
    normalizeCountyFeatureCollection,
    countyDisplayFeatures,
    countiesToMultiPolygon,
    vtecLine,
    ugcBlock,
    snapshot,
    toUtcStamp
  };
})(typeof window !== "undefined" ? window : globalThis);
