/**
 * ZASNet Weather Service product text builders (AWIPS WarnGen–inspired).
 * SVR / TOR use impact-based warning structure; FFW wording mirrors NWS .vm templates.
 * Branding is ZASNetwork.
 */
(function (global) {
  "use strict";

  const WG = global.WarnGen;
  if (!WG) {
    console.error("warngen.js must load before warngen-templates.js");
    return;
  }

  function hailOption(id) {
    return WG.HAIL_OPTIONS.find((h) => h.id === id) || WG.HAIL_OPTIONS[0];
  }

  function windOption(id) {
    return WG.WIND_OPTIONS.find((w) => w.id === id) || WG.WIND_OPTIONS[0];
  }

  function vtecAction(state) {
    const a = String(state.action || "NEW").toUpperCase();
    if (["NEW", "CON", "EXT", "CAN", "EXP", "UPG", "EXA", "EXB"].includes(a)) {
      return a;
    }
    return "NEW";
  }

  function vtecEtn(state) {
    // Prefer explicit ETN; never emit 0000 when a real event number exists.
    // Draft previews may pass provisional nextEtn via state.etn before Issue.
    const n = Number(state && state.etn);
    return WG.formatEtn(Number.isFinite(n) && n > 0 ? n : 0);
  }

  /** Rewrite VTEC event number in an already-built bulletin (review textOverride path). */
  function patchBulletinEtn(text, etn) {
    const etnStr = WG.formatEtn(etn);
    if (!text || !etnStr || etnStr === "0000") {
      return String(text || "");
    }
    return String(text).replace(
      /(\/O\.(?:NEW|CON|EXT|CAN|EXP|UPG|EXA|EXB)\.K[A-Z0-9]{3}\.[A-Z]{2}\.[A-Z]\.)\d{4}\./g,
      `$1${etnStr}.`
    );
  }

  function vtecLine(office, phen, sig, state, start, expire) {
    const action = vtecAction(state);
    const etn = vtecEtn(state);
    const t0 = action === "EXT" ? "000000T0000Z" : formatVtecTime(start);
    const t1 = formatVtecTime(expire);
    return `/O.${action}.K${office.siteId}.${phen}.${sig}.${etn}.${t0}-${t1}/`;
  }

  function followupVtecLine(office, phen, sig, state, expire) {
    const action = vtecAction(state);
    const etn = vtecEtn(state);
    return `/O.${action}.K${office.siteId}.${phen}.${sig}.${etn}.000000T0000Z-${formatVtecTime(expire)}/`;
  }

  function formatClock(date, office) {
    // Prefer IANA-based local parts (PHI → EDT/EST, not hardcoded CDT)
    if (WG.resolveOfficeLocalParts) {
      const p = WG.resolveOfficeLocalParts(date, office || {});
      const minNum = Number(p.minutes) || 0;
      const minPart = minNum === 0 ? "" : `:${String(minNum).padStart(2, "0")}`;
      return `${p.hours}${minPart} ${p.ampm} ${p.tz}`;
    }
    const local = new Date(date.getTime() + (office.tzOffsetHours || -5) * 3600000);
    let hours = local.getUTCHours();
    const minutes = local.getUTCMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }
    return `${hours}${minutes ? ":" + String(minutes).padStart(2, "0") : ""} ${ampm} ${office.tz || "LT"}`;
  }

  /** WMO header ddhhmm UTC (e.g. 112151) — never use 000000 for real products. */
  function formatWmoStamp(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) {
      return "010000";
    }
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${dd}${hh}${mm}`;
  }

  function formatVtecTime(date) {
    const y = String(date.getUTCFullYear()).slice(2);
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    return `${y}${m}${d}T${hh}${mm}Z`;
  }

  function basisReport(state) {
    const isLine = state.stormType === "line";
    const reportType1 = isLine
      ? state.product === "TOR"
        ? "line of thunderstorms"
        : "line of severe thunderstorms"
      : state.product === "TOR"
        ? "thunderstorm"
        : "severe thunderstorm";

    switch (state.basis) {
      case "meteorologists":
        return {
          report: `ZASNet Weather Service meteorologists detected a ${reportType1}`,
          auth: "capable of producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "trainedSpotters":
        return {
          report: `trained weather spotters reported a ${reportType1}`,
          auth: "producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "lawEnforcement":
        return {
          report: `local law enforcement reported a ${reportType1}`,
          auth: "producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "emergencyMgmt":
        return {
          report: `emergency management reported a ${reportType1}`,
          auth: "producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "public":
        return {
          report: `the public reported a ${reportType1}`,
          auth: "producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "broadcastMedia":
        return {
          report: `broadcast media reported ${reportType1}`,
          auth: "producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
      case "doppler":
      default:
        return {
          report: `Doppler radar indicated a ${reportType1}`,
          auth: "capable of producing",
          reportType2: isLine ? "These storms were" : "This storm was"
        };
    }
  }

  function hailWindSentence(state, auth) {
    const hail = hailOption(state.hailId);
    const wind = windOption(state.windId);
    const hailSize = hail.size;
    const windSpeed = wind.speed;

    if (hailSize < 1 && windSpeed < 58) {
      return {
        body: "!** YOU DID NOT SELECT ANY SEVERE WIND OR HAIL THREATS. PLEASE RE-GENERATE WITH THREATS SELECTED! **!",
        tag: "WIND...HAIL <50MPH <.75IN",
        easUpgrade: false,
        smallHail: ""
      };
    }

    let body = "";
    let smallHail = "";
    let tag = "WIND...HAIL <50MPH <.75IN";
    const easUpgrade = hailSize >= 2 || windSpeed >= 80;

    if (hailSize > 0 && windSpeed > 0) {
      if (hailSize < 1) {
        body = ` ${auth} ${wind.threat}`;
        smallHail = `${hail.threat} hail may also accompany the damaging winds.`;
      } else {
        const hailLead =
          hailSize >= 1.5 ? (hailSize >= 2.5 ? "large destructive hail up to " : "large damaging hail up to ") : "";
        const hailTrail = hailSize >= 1.5 && !hail.threat.includes("diameter") ? "" : hailSize < 1.5 ? " hail" : "";
        body = ` ${auth} ${hailLead}${hail.threat}${hailTrail} and ${wind.threat}`;
      }
      tag = `WIND...HAIL ${wind.tag} ${hail.tag}`;
    } else if (hailSize > 0) {
      const hailLead =
        hailSize >= 1.5 ? (hailSize >= 2.5 ? "large destructive hail up to " : "large damaging hail up to ") : "";
      const hailTrail = hail.threat.includes("diameter") || hailSize >= 1.5 ? "" : " hail";
      body = ` ${auth} ${hailLead}${hail.threat}${hailTrail}`;
      tag = `WIND...HAIL <50MPH ${hail.tag}`;
    } else if (windSpeed > 0) {
      body = ` ${auth} ${wind.threat}`;
      tag = `WIND...HAIL ${wind.tag} <.75IN`;
    }

    return { body, tag, easUpgrade, smallHail };
  }

  function areaNames(state, precise = true) {
    if (state.ugcBasis === "zone" || state.ugcBasis === "marine" || state.product === "SMW") {
      return (state.zones || []).map((z) => z.name || z.ugc || "Marine zone");
    }
    return state.counties.map((c) => precise && c.areaPhrase ? c.areaPhrase : `${String(c.name || "Unknown").replace(/\s+County$/i, "")} County`);
  }

  function areaProductLine(state) {
    const areas =
      state.ugcBasis === "zone" || state.ugcBasis === "marine" || state.product === "SMW"
        ? (state.zones || []).map((z) => z.name || z.ugc)
        : (state.counties || []).map((c) => `${c.name} ${c.state}`);
    return areas.filter(Boolean).join("-");
  }

  function ugcCodes(state) {
    if (state.ugcBasis === "zone" || state.ugcBasis === "marine" || state.product === "SMW") {
      return (state.zones || []).map((z) => z.ugc).filter(Boolean);
    }
    return (state.counties || []).map((c) => c.ugc).filter(Boolean);
  }

  /** Prefer real city names from the poly (already ordered: inside → edge). */
  function cityListPhrase(places, limit = 18) {
    // Prefer strictly in-poly when we have several; keep edge towns if few inside.
    const list = places || [];
    const inside = list.filter((p) => p && p.inside !== false && p.name);
    const pool = inside.length >= 2 ? inside : list;
    const names = pool
      .map((p) => (p && p.name ? String(p.name).trim() : ""))
      .filter(Boolean)
      // de-dupe preserve order
      .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
      .slice(0, limit);

    if (!names.length) {
      return null;
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  function locationsImpactedBlock(state, leadIn) {
    const cities = cityListPhrase(state.places, 18);
    if (cities) {
      return `* ${leadIn}\n${cities}.`;
    }
    // Last-ditch: county names so operators never see empty "warned area" only
    const areas = areaNames(state, false);
    if (areas.length) {
      return `* ${leadIn}\n${areas.slice(0, 8).join(", ")}${areas.length > 8 ? ", and nearby communities" : ""}.`;
    }
    // A rural warning can legitimately contain no cataloged city. Do not turn
    // that into an unresolved template token when the polygon/UGC is valid.
    return `* ${leadIn}\nThe warned area and nearby rural locations.`;
  }

  function pathcastBlock(state, now, office) {
    const origin = state.location;
    const motion = motionSpeedDir(state);
    const direction = Number(state.motion?.directionDeg ?? state.motion?.direction);
    if (!origin || !Array.isArray(origin) || !Number.isFinite(motion.speed) || motion.speed <= 0) {
      return locationsImpactedBlock(state, "Locations impacted include...");
    }
    const rad = (degrees) => degrees * Math.PI / 180;
    const distance = (a, b) => {
      const dLat = rad(b[1] - a[1]);
      const dLon = rad(b[0] - a[0]);
      const lat1 = rad(a[1]);
      const lat2 = rad(b[1]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 3958.7613 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    };
    const bearing = (a, b) => {
      const lat1 = rad(a[1]);
      const lat2 = rad(b[1]);
      const dLon = rad(b[0] - a[0]);
      return (Math.atan2(Math.sin(dLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)) * 180 / Math.PI + 360) % 360;
    };
    const durationHours = Math.max(0.25, Number(state.validMinutes || 60) / 60);
    const arrivals = (state.places || []).filter((place) => place?.name && Array.isArray(place.coordinates)).map((place) => {
      const miles = distance(origin, place.coordinates);
      const delta = Number.isFinite(direction) ? rad(((bearing(origin, place.coordinates) - direction + 540) % 360) - 180) : 0;
      const along = miles * Math.cos(delta);
      const cross = Math.abs(miles * Math.sin(delta));
      return { place, along, cross };
    }).filter((item) => item.along >= -1 && item.along <= motion.speed * durationHours + 8 && item.cross <= Math.max(8, motion.speed * 0.22)).sort((a, b) => a.along - b.along).slice(0, 12);
    const usable = arrivals.length ? arrivals : (state.places || []).filter((place) => place?.name && Array.isArray(place.coordinates)).slice(0, 8).map((place) => ({ place, along: distance(origin, place.coordinates) }));
    if (!usable.length) return locationsImpactedBlock(state, "Locations impacted include...");
    const lines = usable.map(({ place, along }) => {
      const minutes = Math.max(0, Math.round((along / motion.speed) * 12) * 5);
      const eta = new Date(now.getTime() + minutes * 60000);
      return `${place.name}${place.state ? `, ${place.state}` : ""} around ${formatClock(eta, office)}`;
    });
    return `* This storm will be near...\n${lines.join("\n")}.`;
  }

  function locationOutputBlock(state, now, office, leadIn) {
    return state.locationMode === "pathcast" ? pathcastBlock(state, now, office) : locationsImpactedBlock(state, leadIn);
  }

  function locationPhrase(state) {
    if (state.locationOverride && state.locationOverride.trim()) {
      return state.locationOverride.trim();
    }
    if (state.stormType === "line" && state.lineStartPhrase && state.lineEndPhrase) {
      return `along a line extending from ${state.lineStartPhrase} to ${state.lineEndPhrase}`;
    }
    return state.locationPhrase || "near an unknown location";
  }

  function motionSpeedDir(state) {
    const override = state.motionOverride || {};
    if (override.stationary) {
      return { stationary: true, dir: "", speed: 0 };
    }
    if (override.dirText && override.speedMph) {
      return { stationary: false, dir: override.dirText, speed: WG.roundTo5(Number(override.speedMph) || 0) };
    }
    if (state.motion && !state.motion.stationary) {
      return {
        stationary: false,
        dir: state.motion.directionText,
        speed: WG.roundTo5(state.motion.speedMph)
      };
    }
    return { stationary: true, dir: "", speed: 0 };
  }

  function motionForTml(motion) {
    if (!motion || motion.stationary) {
      return motion;
    }
    const speedKts = Number.isFinite(Number(motion.speedKts))
      ? Number(motion.speedKts)
      : Number(motion.speedMph) / 1.15078;
    return { ...motion, speedKts };
  }

  function ctaBlock(lines) {
    if (!lines.length) {
      return "";
    }
    let text = "PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\n";
    lines.forEach((c) => {
      text += `${c}\n\n`;
    });
    text += "&&\n\n";
    return text;
  }

  function headlineAreaPhrase(state) {
    const areas = areaNames(state);
    if (!areas.length) {
      return "THE WARNED AREA";
    }
    if (areas.length === 1) {
      return areas[0].toUpperCase();
    }
    return areas
      .slice(0, 4)
      .map((a) => a.toUpperCase())
      .join("...");
  }

  function followupHeadlineAreaPhrase(state) {
    const areas = areaNames(state);
    if (!areas.length) {
      return "THE WARNED AREA";
    }
    if (areas.length === 1) {
      return areas[0].toUpperCase();
    }
    const suffix = state.ugcBasis === "zone" ? "ZONES" : "COUNTIES";
    const names = areas
      .slice(0, 4)
      .map((a) => a.replace(/\s+(County|[A-Z]{2}\s+Zone)$/i, "").toUpperCase());
    return `${names.join("...")} ${suffix}`;
  }

  function hailWindHazard(state) {
    const hail = hailOption(state.hailId);
    const wind = windOption(state.windId);
    const parts = [];
    if (hail.size >= 1) {
      const hailText = hail.threat.includes("diameter") ? hail.threat : `${hail.threat} hail`;
      parts.push(hailText);
    }
    if (wind.speed >= 58) {
      parts.push(`${wind.speed} mph wind gusts`);
    }
    if (!parts.length) {
      return "severe thunderstorm";
    }
    return `${parts.join(" and ")}.`;
  }

  function spacedTag(value, suffix) {
    return String(value || "")
      .replace(suffix, ` ${suffix}`)
      .replace("<50 MPH", "<50 MPH");
  }

  function svrSourceText(state) {
    switch (state.basis) {
      case "meteorologists":
        return "ZASNet Weather Service meteorologists.";
      case "trainedSpotters":
        return "Trained weather spotters.";
      case "lawEnforcement":
        return "Law enforcement.";
      case "emergencyMgmt":
        return "Emergency management.";
      case "public":
        return "Public.";
      case "broadcastMedia":
        return "Broadcast media.";
      case "doppler":
      default:
        return "Radar indicated.";
    }
  }

  function svrDamageThreat(state) {
    const hail = hailOption(state.hailId);
    const wind = windOption(state.windId);
    if (wind.speed >= 80 || hail.size >= 2.75) {
      return "DESTRUCTIVE";
    }
    if (wind.speed >= 70 || hail.size >= 1.75) {
      return "CONSIDERABLE";
    }
    return "BASE";
  }

  function svrImpactText(state) {
    const hail = hailOption(state.hailId);
    const wind = windOption(state.windId);
    const impacts = [];
    if (wind.speed >= 100) impacts.push("You are in a life-threatening situation. Flying debris may be deadly to those caught without shelter. Mobile homes will be destroyed. Expect considerable damage to homes and businesses. Expect extensive tree damage and power outages.");
    else if (wind.speed >= 90) impacts.push("You are in a life-threatening situation. Flying debris may be deadly to those caught without shelter. Mobile homes will be heavily damaged or destroyed. Homes and businesses will have substantial roof and window damage. Expect extensive tree damage and power outages.");
    else if (wind.speed >= 80) impacts.push("Flying debris will be dangerous to those caught without shelter. Mobile homes will be heavily damaged. Expect considerable damage to roofs, windows, and vehicles. Extensive tree damage and power outages are likely.");
    else if (wind.speed >= 70) impacts.push("Expect considerable tree damage. Damage is likely to mobile homes, roofs, and outbuildings.");
    else if (wind.speed >= 58) impacts.push("Expect damage to roofs, siding, and trees.");
    if (hail.size >= 2.75) impacts.push("People and animals outdoors will be severely injured. Expect shattered windows, extensive damage to roofs, siding, and vehicles.");
    else if (hail.size >= 1.75) impacts.push("People and animals outdoors will be injured. Expect damage to roofs, siding, windows, and vehicles.");
    else if (hail.size >= 1) impacts.push("Damage to vehicles is expected.");
    return impacts.join(" ") || "Severe thunderstorm damage is possible.";
  }

  function svrIbw(state) {
    const hail = hailOption(state.hailId);
    const wind = windOption(state.windId);
    const damageThreat = svrDamageThreat(state);
    let tags = "";
    if (state.ctas?.tornadoPossible) {
      tags += "TORNADO...POSSIBLE\n";
    }
    if (damageThreat !== "BASE") {
      tags += `THUNDERSTORM DAMAGE THREAT...${damageThreat}\n`;
    }
    tags += `HAIL THREAT...${state.ctas?.observedHail ? "OBSERVED" : "RADAR INDICATED"}\n`;
    tags += `MAX HAIL SIZE...${spacedTag(hail.tag, "IN")}\n`;
    tags += `WIND THREAT...${state.ctas?.observedWind ? "OBSERVED" : "RADAR INDICATED"}\n`;
    tags += `MAX WIND GUST...${spacedTag(wind.tag, "MPH")}\n`;
    return {
      hazard: hailWindHazard(state),
      source: svrSourceText(state),
      impact: svrImpactText(state),
      damageThreat,
      tags
    };
  }

  function torSourceText(state) {
    const src = (state.tor && state.tor.source) || "doppler";
    const map = {
      confirmedDoppler: "Radar confirmed tornado.",
      confirmedLarge: "Radar and storm spotters confirmed tornado.",
      spotter: "Weather spotters confirmed tornado.",
      lawEnforcement: "Law enforcement confirmed tornado.",
      emergencyManagement: "Emergency management confirmed tornado.",
      public: "Public confirmed tornado.",
      broadcastMedia: "Broadcast media confirmed tornado.",
      waterspout: "Weather spotters confirmed a waterspout moving onshore.",
      spotterFunnelCloud: "Weather spotters reported a funnel cloud.",
      meteorologistsTOR: "ZASNet Weather Service meteorologists indicated rotation.",
      meteorologistsSquall: "ZASNet Weather Service meteorologists indicated rotation.",
      meteorologistsLarge: "ZASNet Weather Service meteorologists indicated rotation.",
      dopplerSquall: "Radar indicated rotation.",
      doppler: "Radar indicated rotation."
    };
    return map[src] || map.doppler;
  }

  function torIsObserved(source) {
    return !["doppler", "dopplerSquall", "meteorologistsTOR", "meteorologistsSquall", "meteorologistsLarge", "spotterFunnelCloud"].includes(source || "doppler");
  }

  function torDamageThreat(state) {
    const tor = state.tor || {};
    const source = tor.source || "doppler";
    if (tor.emergency || tor.damageThreat === "catastrophic") {
      return "CATASTROPHIC";
    }
    if (tor.damageThreat === "considerable" || source === "confirmedLarge" || source === "meteorologistsLarge" || tor.ctas?.largeTor) {
      return "CONSIDERABLE";
    }
    return "BASE";
  }

  function torImpactText(state) {
    const tor = state.tor || {};
    if (tor.landspout) {
      return "Expect damage to mobile homes, roofs, and vehicles.";
    }
    const damageThreat = torDamageThreat(state);
    if (damageThreat === "CATASTROPHIC" || damageThreat === "CONSIDERABLE") {
      return "You are in a life-threatening situation. Flying debris may be deadly to those caught without shelter. Mobile homes will be destroyed. Considerable damage to homes, businesses, and vehicles is likely and complete destruction is possible.";
    }
    return "Flying debris will be dangerous to those caught without shelter. Mobile homes will be damaged or destroyed. Damage to roofs, windows, and vehicles will occur. Tree damage is likely.";
  }

  function torIbw(state) {
    const tor = state.tor || {};
    const hail = hailOption(tor.hailId || "none");
    const damageThreat = torDamageThreat(state);
    const extras = [];
    if (damageThreat === "CATASTROPHIC") extras.push("Deadly tornado");
    else if (damageThreat === "CONSIDERABLE") extras.push("Damaging tornado");
    else extras.push("Tornado");
    if (damageThreat === "BASE" && hail.size >= 1) extras.push(hail.threat.includes("diameter") ? hail.threat : `${hail.threat} hail`);
    const hazard = `${extras.join(" and ")}.`;
    let tags = "";
    tags += `TORNADO...${damageThreat === "CATASTROPHIC" || torIsObserved(tor.source) ? "OBSERVED" : "RADAR INDICATED"}\n`;
    if (damageThreat !== "BASE") {
      tags += `TORNADO DAMAGE THREAT...${damageThreat}\n`;
    }
    tags += `MAX HAIL SIZE...${spacedTag(hail.tag, "IN")}\n`;
    return {
      hazard,
      source: torSourceText(state),
      impact: torImpactText(state),
      damageThreat,
      tags
    };
  }

  function buildSevereWeatherStatement(state, now, expire, office) {
    const isTor = state.product === "TOR";
    const torSource = (state.tor && state.tor.source) || "doppler";
    const observedTornado = isTor && torIsObserved(torSource);
    const eventType = isTor ? "TORNADO" : "SEVERE THUNDERSTORM";
    const phen = isTor ? "TO" : "SV";
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const vtec = followupVtecLine(office, phen, "W", state, expire);
    const loc = locationPhrase(state);
    const mov = motionSpeedDir(state);
    const areas = areaNames(state);
    const firstBullet = areas.length
      ? areas.map((a) => `${a}...`).join("\n")
      : "!** NO COUNTIES/ZONES SELECTED **!...";

    let movement = "";
    if (mov.stationary) {
      movement = isTor
        ? observedTornado
          ? "This tornadic storm was nearly stationary."
          : state.stormType === "line" ? "These dangerous storms were nearly stationary." : "This dangerous storm was nearly stationary."
        : state.stormType === "line"
          ? "These storms were nearly stationary."
          : "This storm was nearly stationary.";
    } else if (isTor) {
      movement = observedTornado
        ? `This tornadic storm was moving ${mov.dir} at ${mov.speed} mph.`
        : state.stormType === "line"
          ? `These dangerous storms were moving ${mov.dir} at ${mov.speed} mph.`
          : `This dangerous storm was moving ${mov.dir} at ${mov.speed} mph.`;
    } else {
      movement =
        state.stormType === "line"
          ? `These storms were moving ${mov.dir} at ${mov.speed} mph.`
          : `This storm was moving ${mov.dir} at ${mov.speed} mph.`;
    }

    let hazard = "";
    let source = "";
    let impact = "";
    let tags = "";
    if (isTor) {
      const tor = state.tor || {};
      const ibw = torIbw(state);
      hazard = ibw.hazard;
      source = ibw.source;
      impact = ibw.impact;
      tags = ibw.tags;
    } else {
      const ibw = svrIbw(state);
      hazard = ibw.hazard;
      source = ibw.source;
      impact = ibw.impact;
      tags = ibw.tags;
    }

    let text = "";
    text += `WWUS53 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `SVS${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n\n`;
    text += `Severe Weather Statement\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `...A ${eventType} WARNING REMAINS IN EFFECT UNTIL ${WG.formatUntilTime(expire, office).toUpperCase()} FOR ${headlineAreaPhrase(state)}...\n\n`;
    const reportType = isTor
      ? observedTornado
        ? state.stormType === "line" ? "tornado-producing storms were" : "a confirmed tornado was"
        : state.stormType === "line" ? "severe thunderstorms capable of producing tornadoes were" : "a severe thunderstorm capable of producing a tornado was"
      : state.stormType === "line" ? "severe thunderstorms were" : "a severe thunderstorm was";
    text += `* At ${formatClock(now, office)}, ${reportType} located ${loc}. ${movement}\n\n`;
    text += `  HAZARD...${hazard.charAt(0).toUpperCase()}${hazard.slice(1)}\n\n`;
    text += `  SOURCE...${source}\n\n`;
    text += `  IMPACT...${impact}\n\n`;
    text += `${locationOutputBlock(state, now, office, "Locations impacted include...")}\n\n`;
    text += `PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\n`;
    text += isTor
      ? observedTornado
        ? "To repeat, a tornado is on the ground. TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows.\n\n"
        : "TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows.\n\n"
      : "For your protection move to an interior room on the lowest floor of a building.\n\n";
    text += `&&\n\n`;
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    if (tags) {
      text += `${tags}\n`;
    }
    text += `$$\n`;
    return text;
  }

  function buildWarningCancelExpireStatement(state, now, expire, office) {
    const isTor = state.product === "TOR";
    const eventType = isTor ? "TORNADO" : "SEVERE THUNDERSTORM";
    const phen = isTor ? "TO" : "SV";
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const vtec = followupVtecLine(office, phen, "W", state, expire);
    const areaLine = areaProductLine(state);
    const areaHeadline = followupHeadlineAreaPhrase(state);
    const action = vtecAction(state);
    const until = WG.formatUntilTime(expire, office).toUpperCase();
    const isCancel = action === "CAN";

    let text = "";
    text += `WWUS53 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `SVS${office.siteId}\n\n`;
    text += `Severe Weather Statement\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n`;
    if (areaLine) {
      text += `${areaLine}-\n`;
    }
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += isCancel
      ? `...THE ${eventType} WARNING FOR ${areaHeadline} IS CANCELLED...\n\n`
      : `...THE ${eventType} WARNING FOR ${areaHeadline} WILL EXPIRE AT ${until}...\n\n`;
    if (isCancel) {
      if (isTor) {
        text +=
          state.cancelReason === "movedOut"
            ? "The tornadic threat which prompted the warning has moved out of the warned area. Therefore, the warning has been cancelled.\n\n"
            : "The tornadic storm which prompted the warning has weakened. Therefore, the warning has been cancelled.\n\n";
      } else if (state.cancelReason === "replacedByTornado") {
        text +=
          "The Severe Thunderstorm Warning has been cancelled and replaced by a Tornado Warning for the same area.\n\n";
      } else if (state.cancelReason === "movedOut") {
        text +=
          "The storm which prompted the warning has moved out of the warned area. Therefore, the warning has been cancelled. However, gusty winds and heavy rain are still possible with this thunderstorm.\n\n";
      } else {
        // weakened (default)
        text +=
          "The storm which prompted the warning has weakened below severe limits, and no longer poses an immediate threat to life or property. Therefore, the warning has been cancelled. However, gusty winds and heavy rain are still possible with this thunderstorm.\n\n";
      }
    } else {
      text += isTor
        ? "The tornadic storm which prompted the warning has weakened. Therefore, the warning will be allowed to expire.\n\n"
        : "The storm which prompted the warning has weakened below severe limits, and no longer poses an immediate threat to life or property. Therefore, the warning will be allowed to expire. However, gusty winds and heavy rain are still possible with this thunderstorm.\n\n";
    }
    text += `&&\n\n`;
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    text += `$$\n`;
    return text;
  }

  // ─── SVR ────────────────────────────────────────────────────────────────

  function buildSvr(state, now, expire, office) {
    const basis = basisReport(state);
    const threats = hailWindSentence(state, basis.auth);
    const ibw = svrIbw(state);
    const eas = threats.easUpgrade ? "EAS ACTIVATION REQUESTED" : "IMMEDIATE BROADCAST REQUESTED";
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = vtecLine(office, "SV", "W", state, start, expire);
    const loc = locationPhrase(state);
    const mov = motionSpeedDir(state);
    const reportType2 = basis.reportType2;

    let third = `At ${formatClock(now, office)}, ${basis.report}. ${reportType2} located ${loc}`;
    if (mov.stationary) {
      third += `. ${reportType2} nearly stationary.`;
    } else {
      third += `, and moving ${mov.dir} at ${mov.speed} mph.`;
    }
    if (threats.smallHail) {
      third += ` ${threats.smallHail}`;
    }

    const firstBullet = areas.length
      ? areas.map((a) => `${a}...`).join("\n")
      : "!** NO COUNTIES/ZONES SELECTED — DRAW A POLYGON THAT INTERSECTS THE CWA **!...";

    const ctas = [];
    if (state.ctas.generic) {
      ctas.push(
        "Severe thunderstorms produce damaging winds, destructive hail, deadly lightning and very heavy rain. For your protection, move to an interior room on the lowest floor of your home or business. Heavy rains flood roads quickly so do not drive into areas where water covers the road."
      );
    }
    if (state.ctas.largeHail) {
      ctas.push(
        "If you are in the path of this storm, prepare immediately for large hail and deadly cloud to ground lightning. People outside should move to a shelter, preferably inside a strong building and away from windows."
      );
    }
    if (state.ctas.largeHailWind) ctas.push("Prepare immediately for large hail and damaging winds. People outside should move immediately to shelter inside a strong building. Stay away from windows.");
    if (state.ctas.veryLargeHail) ctas.push(state.stormType === "line" ? "These are dangerous storms. Prepare immediately for large destructive hail capable of producing significant damage. People outside should move to shelter inside a strong building, and stay away from windows." : "This is a dangerous storm. Prepare immediately for large destructive hail capable of producing significant damage. People outside should move to shelter inside a strong building, and stay away from windows.");
    if (state.ctas.extremeWinds) ctas.push(state.stormType === "line" ? "This is an EXTREMELY DANGEROUS SITUATION with tornado-like wind speeds expected. Mobile homes and high profile vehicles may be overturned. Move to an interior room on the lowest floor of a building." : "This is an EXTREMELY DANGEROUS SITUATION with tornado-like wind speeds expected. Mobile homes and high profile vehicles may be overturned. Move to an interior room on the lowest floor of a building.");
    if (state.ctas.gustFront) ctas.push(state.stormType === "line" ? "Wind damage with these storms will occur before any rain or lightning. Do not wait for thunder before taking cover. SEEK SHELTER IMMEDIATELY inside a sturdy structure and stay away from windows." : "Wind damage with this storm will occur before any rain or lightning. Do not wait for thunder before taking cover. SEEK SHELTER IMMEDIATELY inside a sturdy structure and stay away from windows.");
    if (state.ctas.squallLine) ctas.push(state.stormType === "line" ? "Intense thunderstorm lines can produce brief tornadoes and widespread significant wind damage. Move to an interior room on the lowest floor of a building." : "This storm may produce brief tornadoes and significant wind damage. Move to an interior room on the lowest floor of a building.");
    if (state.ctas.supercell) ctas.push(state.stormType === "line" ? "These thunderstorms are capable of producing extremely large hail, destructive straight-line winds, and tornadoes. Move quickly to a safe shelter." : "This thunderstorm is capable of producing extremely large hail, destructive straight-line winds, and tornadoes. Move quickly to a safe shelter.");
    if (state.ctas.windHailIndicated) ctas.push(state.stormType === "line" ? "These are dangerous storms capable of producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows." : "This is a dangerous storm capable of producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows.");
    if (state.ctas.windHailObserved) ctas.push(state.stormType === "line" ? "These are dangerous storms producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows." : "This is a dangerous storm producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows.");
    if (state.ctas.torrentialRain) ctas.push(state.stormType === "line" ? "Torrential rainfall is occurring with these storms and may lead to flash flooding. Do not drive through flooded roadways." : "Torrential rainfall is occurring with this storm and may lead to flash flooding. Do not drive through flooded roadways.");
    if (state.ctas.boaters) ctas.push("If on or near a lake, get away from the water and move indoors or inside a vehicle. Do not be caught on the water in a thunderstorm.");
    if (state.ctas.lightning) {
      ctas.push(
        "In addition to severe weather, continuous cloud to ground lightning is occurring with this storm. Move indoors immediately. Lightning is one of nature's leading killers. Remember, if you can hear thunder, you are close enough to be struck by lightning."
      );
    }
    if (state.ctas.lawEnforcement) {
      ctas.push(
        `To report severe weather, contact the ZASNet Weather Service, or your nearest law enforcement agency who will relay your report to the ZASNet Weather Service office in ${office.officeLoc}.`
      );
    }

    let text = "";
    text += `WUUS53 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `SVR${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n\n`;
    text += `BULLETIN - ${eas}\n`;
    text += `Severe Thunderstorm Warning\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `The ZASNet Weather Service in ${office.officeLoc} has issued a\n\n`;
    text += `* Severe Thunderstorm Warning for...\n`;
    text += `${firstBullet}\n\n`;
    text += `* Until ${WG.formatUntilTime(expire, office)}.\n\n`;
    text += `* ${third}\n\n`;
    if (ibw.damageThreat === "DESTRUCTIVE") {
      const destructiveLocations = cityListPhrase(state.places, 3) || headlineAreaPhrase(state);
      text += `${state.stormType === "line" ? "THESE ARE DESTRUCTIVE STORMS" : "THIS IS A DESTRUCTIVE STORM"} FOR ${destructiveLocations.toUpperCase()}.\n\n`;
    }
    text += `  HAZARD...${capitalizeFirst(ibw.hazard)}\n\n`;
    text += `  SOURCE...${ibw.source}\n\n`;
    text += `  IMPACT...${ibw.impact}\n\n`;
    text += `${locationOutputBlock(state, now, office, "Locations impacted include...")}\n\n`;
    text += ctaBlock(ctas.slice(0, 2));
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    text += `${ibw.tags}\n`;
    text += `$$\n`;
    return text;
  }

  // ─── TOR (NWS TOR.vm style) ─────────────────────────────────────────────

  function torSourcePhrases(state) {
    const isLine = state.stormType === "line";
    const src = (state.tor && state.tor.source) || "doppler";
    const map = {
      meteorologistsTOR: isLine
        ? {
            report:
              "ZASNet Weather Service meteorologists detected severe thunderstorms capable of producing a tornado. These dangerous storms were located",
            moveLead: ", and moving",
            pathcastLead: "These dangerous storms",
            preAmble: "TAKE COVER NOW! "
          }
        : {
            report:
              "ZASNet Weather Service meteorologists detected a severe thunderstorm capable of producing a tornado. This dangerous storm was located",
            moveLead: ", and moving",
            pathcastLead: "The tornado",
            preAmble: "TAKE COVER NOW! "
          },
      meteorologistsSquall: {
        report:
          "ZASNet Weather Service meteorologists detected a severe squall line capable of producing a tornado as well as damaging straight line winds. These dangerous storms were located",
        moveLead: ", and moving",
        pathcastLead: "These dangerous storms",
        preAmble: "TAKE COVER NOW! "
      },
      meteorologistsLarge: isLine
        ? {
            report:
              "ZASNet Weather Service meteorologists detected severe thunderstorms capable of producing a large and extremely dangerous tornado. These extremely dangerous storms were located",
            moveLead: ", and moving",
            pathcastLead: "These dangerous storms",
            preAmble: "TAKE COVER NOW! "
          }
        : {
            report:
              "ZASNet Weather Service meteorologists detected a severe thunderstorm capable of producing a large and extremely dangerous tornado. This extremely dangerous storm was located",
            moveLead: ", and moving",
            pathcastLead: "This dangerous storm",
            preAmble: "TAKE COVER NOW! "
          },
      doppler: isLine
        ? {
            report:
              "Doppler radar indicated a line of severe thunderstorms capable of producing a tornado. These dangerous storms were located",
            moveLead: ", and moving",
            pathcastLead: "These dangerous storms",
            preAmble: "TAKE COVER NOW! "
          }
        : {
            report:
              "Doppler radar indicated a severe thunderstorm capable of producing a tornado. This dangerous storm was located",
            moveLead: ", and moving",
            pathcastLead: "This dangerous storm",
            preAmble: "TAKE COVER NOW! "
          },
      dopplerSquall: {
        report:
          "Doppler radar indicated a severe squall line capable of producing a tornado as well as damaging straight line winds. These dangerous storms were located",
        moveLead: ", and moving",
        pathcastLead: "These dangerous storms",
        preAmble: "TAKE COVER NOW! "
      },
      confirmedDoppler: {
        report: "Doppler radar was tracking a confirmed tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "This tornadic storm",
        preAmble: "TAKE COVER NOW! "
      },
      confirmedLarge: {
        report: "Doppler radar and storm spotters were tracking a large and extremely dangerous tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a large and extremely dangerous tornado has been sighted. TAKE COVER NOW! "
      },
      spotter: {
        report: "trained weather spotters reported a tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a tornado has been confirmed by storm spotters. TAKE COVER NOW! "
      },
      lawEnforcement: {
        report: "local law enforcement reported a tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a tornado has been confirmed by local law enforcement. TAKE COVER NOW! "
      },
      emergencyManagement: {
        report: "emergency management reported a tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a tornado has been confirmed by emergency management. TAKE COVER NOW! "
      },
      public: {
        report: "the public reported a tornado",
        moveLead: isLine
          ? ". Doppler radar showed these tornadic storms moving"
          : ". Doppler radar showed this tornado moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a tornado has been sighted. TAKE COVER NOW! "
      },
      broadcastMedia: {
        report: "broadcast media reported a tornado",
        moveLead: isLine ? ". These tornadic storms were moving" : ". This tornado was moving",
        pathcastLead: isLine ? "These tornadic storms" : "The tornado",
        preAmble: "To repeat, a tornado has been confirmed by broadcast media. TAKE COVER NOW! "
      },
      waterspout: {
        report: isLine ? "confirmed waterspouts were located just offshore" : "a confirmed waterspout was located just offshore",
        moveLead: isLine ? ". These tornadoes were moving" : ". This tornado was moving",
        pathcastLead: isLine ? "These tornadoes" : "This tornado",
        preAmble: "TAKE COVER NOW! "
      },
      spotterFunnelCloud: {
        report: "trained weather spotters reported a funnel cloud",
        moveLead: isLine
          ? ". A tornado may develop at any time. Doppler radar showed these dangerous storms moving"
          : ". A tornado may develop at any time. Doppler radar showed this dangerous storm moving",
        pathcastLead: isLine ? "These dangerous storms" : "This dangerous storm",
        preAmble: "TAKE COVER NOW! "
      }
    };
    return map[src] || map.doppler;
  }

  function buildTor(state, now, expire, office) {
    const tor = state.tor || {};
    const phrases = torSourcePhrases(state);
    const isLine = state.stormType === "line";
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = vtecLine(office, "TO", "W", state, start, expire);
    const loc = locationPhrase(state);
    const mov = motionSpeedDir(state);
    const hail = hailOption(tor.hailId || "none");
    const ibw = torIbw(state);
    const emerLoc = (tor.emergencyLoc || "").trim() || "!** EDIT LOCATION(S) **!";

    let third = `At ${formatClock(now, office)}, ${phrases.report} ${loc}`;
    if (mov.stationary) {
      third += isLine
        ? ". The line of tornadic storms was nearly stationary."
        : ". The tornadic storm was nearly stationary.";
    } else {
      third += `${phrases.moveLead} ${mov.dir} at ${mov.speed} mph.`;
    }

    if (hail.size >= 1.5) {
      third += isLine
        ? ` In addition to a tornado, ${hail.threat} is expected with these storms.`
        : ` In addition to a tornado, ${hail.threat} is expected with this storm.`;
    }

    const firstBullet = areas.length
      ? areas.map((a) => `${a}...`).join("\n")
      : "!** NO COUNTIES/ZONES SELECTED **!...";

    const ctas = [];
    const c = tor.ctas || {};
    if (tor.emergency || c.emergencyCta) {
      if (tor.emergency) {
        ctas.push(
          "To repeat, a large, extremely dangerous, and potentially deadly tornado is on the ground. To protect your life, TAKE COVER NOW! Move to an interior room on the lowest floor of a sturdy building. Avoid windows. If in a mobile home, a vehicle or outdoors, move to the closest substantial shelter and protect yourself from flying debris."
        );
      } else if (c.emergencyCta) {
        ctas.push(
          "!** YOU SELECTED THE TORNADO EMERGENCY CTA WITHOUT SELECTING THE TORNADO EMERGENCY HEADER. PLEASE RE-GENERATE THIS WARNING **!"
        );
      }
    } else {
      if (c.defaultMobile) {
        ctas.push(
          `${phrases.preAmble}Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If you are in a mobile home or outdoors, move to the closest substantial shelter and protect yourself from flying debris.`
        );
      }
      if (c.defaultUrban) {
        ctas.push(
          `${phrases.preAmble}Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If you are in a vehicle or outdoors, move to the closest substantial shelter and protect yourself from flying debris.`
        );
      }
    }
    if (c.motorists) {
      ctas.push(
        "Motorists should not take shelter under highway overpasses. If you cannot safely drive away from the tornado, as a last resort, either park your vehicle and stay put, or abandon your vehicle and lie down in a low lying area and protect yourself from flying debris."
      );
    }
    if (c.rainWrapped) {
      ctas.push("Heavy rainfall may obscure this tornado. Do not wait to see or hear the tornado. TAKE COVER NOW!");
    }
    if (c.nighttime) {
      ctas.push(
        "Tornadoes are extremely difficult to see and confirm at night. Do not wait to see or hear the tornado. TAKE COVER NOW!"
      );
    }
    if (c.largeTor || tor.source === "meteorologistsLarge" || tor.source === "confirmedLarge") {
      if (c.largeTor) {
        ctas.push(
          "A large and extremely dangerous tornado is on the ground. Take immediate tornado precautions. This is a life-threatening situation."
        );
      }
    }
    if (c.replacesSvr) {
      ctas.push("This Tornado Warning replaces the Severe Thunderstorm Warning issued for the same area.");
    }
    if (c.lawEnforcement) {
      ctas.push(
        `If a tornado or other severe weather is spotted, contact the ZASNet Weather Service, or your nearest law enforcement agency who will relay your report to the ZASNet Weather Service office in ${office.officeLoc}. This act may save lives of others in the path of dangerous weather.`
      );
    }
    if (c.squall) {
      ctas.push(
        isLine
          ? "This line of thunderstorms is capable of producing tornadoes and widespread significant wind damage. Do not wait to see or hear the tornado. For your protection move to an interior room on the lowest floor of your home or business."
          : "This cluster of thunderstorms is capable of producing tornadoes and widespread significant wind damage. Do not wait to see or hear the tornado. For your protection move to an interior room on the lowest floor of your home or business."
      );
    }
    if (c.water) {
      ctas.push(
        "If on or near !**NAME OF WATER BODY **!, get out of the water and move to safe shelter immediately. If you can hear thunder, you are close enough to be struck by lightning. In addition, severe thunderstorms can produce large capsizing waves, even on small bodies of water. Move into dock and seek safe shelter now! Do not be caught on the water in a thunderstorm."
      );
    }
    if (c.torrentialRain) ctas.push(isLine ? "Torrential rainfall is occurring with these storms and may lead to flash flooding. Do not drive through flooded roadways." : "Torrential rainfall is occurring with this storm and may lead to flash flooding. Do not drive through flooded roadways.");
    if (c.windHailIndicated) ctas.push(isLine ? "These are dangerous storms capable of producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows." : "This is a dangerous storm capable of producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows.");
    if (c.windHailObserved) ctas.push(isLine ? "These are dangerous storms producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows." : "This is a dangerous storm producing large hail driven by severe winds. SEEK SHELTER NOW inside a sturdy structure and stay away from windows.");

    let text = "";
    text += `WFUS53 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `TOR${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n\n`;
    text += `BULLETIN - EAS ACTIVATION REQUESTED\n`;
    text += `Tornado Warning\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    if (tor.emergency) {
      text += `...TORNADO EMERGENCY FOR ${emerLoc.toUpperCase()}...\n\n`;
    }
    text += `The ZASNet Weather Service in ${office.officeLoc} has issued a\n\n`;
    text += `* Tornado Warning for...\n`;
    text += `${firstBullet}\n\n`;
    text += `* Until ${WG.formatUntilTime(expire, office)}.\n\n`;
    text += `* ${third}\n\n`;
    if (ibw.damageThreat === "CATASTROPHIC") {
      text += `TORNADO EMERGENCY for ${emerLoc.toUpperCase()}. This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!\n\n`;
    } else if (ibw.damageThreat === "CONSIDERABLE") {
      text += `This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!\n\n`;
    }
    text += `  HAZARD...${ibw.hazard}\n\n`;
    text += `  SOURCE...${ibw.source}\n\n`;
    text += `  IMPACT...${ibw.impact}\n\n`;
    if (tor.listCities !== false || state.locationMode === "pathcast") {
      text += `${locationOutputBlock(state, now, office, "Locations impacted include...")}\n\n`;
    }
    text += ctaBlock(ctas.slice(0, 2));
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    text += `${ibw.tags}\n`;
    text += `$$\n`;
    return text;
  }

  // ─── FFW (NWS FFW.vm style) ─────────────────────────────────────────────

  function ffwSourceBits(ffw) {
    const src = (ffw && ffw.source) || "doppler";
    const thunder = Boolean(ffw && ffw.withThunder);
    const plainRain = Boolean(ffw && ffw.plainRain);
    let s1 = "Doppler radar ";
    let s2 = "indicated ";
    let s3 = "heavy rain";
    let nearPhrase = "near";
    let overPhrase = "over";

    const apply = (a, b, c, near, over) => {
      s1 = a;
      s2 = b;
      s3 = c;
      nearPhrase = near;
      overPhrase = over;
    };

    switch (src) {
      case "dopplerGauge":
        apply(
          "Doppler radar and automated rain gauges ",
          "indicated ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain falling",
          "near",
          "over"
        );
        break;
      case "trainedSpotters":
        apply(
          "trained weather spotters ",
          "reported ",
          thunder ? "thunderstorms producing heavy rain" : plainRain ? "heavy rain" : "flash flooding",
          thunder || plainRain ? "in" : "in",
          thunder || plainRain ? "in" : "in"
        );
        break;
      case "public":
        apply(
          "the public ",
          "reported ",
          thunder ? "thunderstorms producing heavy rain" : plainRain ? "heavy rain" : "flash flooding",
          "in",
          "in"
        );
        break;
      case "lawEnforcement":
        apply(
          "local law enforcement ",
          "reported ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain",
          "in",
          "in"
        );
        break;
      case "emergencyManagement":
        apply(
          "emergency management ",
          "reported ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain",
          "in",
          "in"
        );
        break;
      case "satellite":
        apply(
          "satellite estimates ",
          "indicated ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain",
          "near",
          "over"
        );
        break;
      case "satelliteGauge":
        apply(
          "satellite estimates and rain gauges ",
          "indicated ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain falling",
          "near",
          "over"
        );
        break;
      case "onlyGauge":
        apply(
          "gauge reports ",
          "indicated ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain falling",
          "near",
          "over"
        );
        break;
      case "doppler":
      default:
        apply(
          "Doppler radar ",
          "indicated ",
          thunder ? "thunderstorms producing heavy rain" : "heavy rain",
          "near",
          "over"
        );
        break;
    }

    return { s1, s2, s3, nearPhrase, overPhrase };
  }

  function damFfwProfile(ffw) {
    const dam = ffw.dam || {};
    const name = String(dam.damName || "").trim() || "!** DAM OR FEATURE NAME **!";
    const river = String(dam.riverName || "").trim() || "!** RIVER OR DRAINAGE **!";
    const locations = String(dam.locations || "").trim() || "!** DOWNSTREAM LOCATIONS **!";
    const profiles = {
      dam: { ic: "DM", sev: "3", type: "A Dam Failure", report: `the ${name} failed causing flash flooding downstream on the ${river}`, failure: "DAM FAILURE...OCCURRING", impact: `areas downstream from ${name} along ${river}` },
      siteimminent: { ic: "DM", sev: "3", type: "A Dam Break", report: `the imminent failure of ${name}`, failure: "DAM FAILURE...IMMINENT", impact: `areas downstream from ${name} along ${river}` },
      sitefailed: { ic: "DM", sev: "3", type: "A Dam Break", report: `the failure of ${name}`, failure: "DAM FAILURE...OCCURRING", impact: `areas downstream from ${name} along ${river}` },
      levee: { ic: "DM", sev: "2", type: "A Levee Failure", report: `a levee on the ${river} failed, causing flash flooding of immediately surrounding areas`, failure: "LEVEE FAILURE...OCCURRING", impact: "areas near the levee break" },
      floodgate: { ic: "DR", sev: "2", type: "A Dam Floodgate Release", report: `the floodgates on ${name} were opened, causing flash flooding downstream on the ${river}`, impact: `areas along ${river} immediately downstream of ${name}` },
      glacier: { ic: "GO", sev: "2", type: "A Glacier-Dammed Lake Outburst", report: `a glacier-dammed lake near ${name} was rapidly releasing water, resulting in flash flooding`, impact: `waterways and low-lying areas near ${locations}` },
      icejam: { ic: "IJ", sev: "2", type: "An Ice Jam", report: `an ice jam on the ${river} broke, causing flash flooding downstream`, impact: "areas near and downstream from the ice jam" },
      rain: { ic: "RS", sev: "1", type: "Rain and Snowmelt", report: "rain falling on existing snowpack was generating flash flooding from excessive runoff", impact: "creeks, streams, roads, and low-lying areas" },
      onlyMelt: { ic: "SM", sev: "1", type: "Extremely Rapid Snowmelt", report: "extremely rapid snowmelt was occurring and generating flash flooding", impact: "waterways and normally dry channels" },
      volcano: { ic: "SM", sev: "3", type: "Extremely Rapid Snowmelt Caused by Volcanic Eruption", report: `volcanic activity near ${name} was causing rapid snowmelt and flash flooding`, impact: `drainages near ${locations}` },
      volcanoLahar: { ic: "SM", sev: "3", type: "Volcanic Induced Debris Flow", report: `volcanic activity near ${name} was producing a debris flow and flash flooding`, impact: `drainages near ${locations}` }
    };
    return { ...(profiles[dam.cause] || profiles.dam), name, river, locations, dam };
  }

  function damSourceText(source) {
    return ({ county: "County dispatch.", lawEnforcement: "Law enforcement.", corps: "Corps of Engineers.", damop: "Dam operators.", bureau: "Bureau of Reclamation.", public: "Public.", onlyGauge: "Gauges indicated.", CAP: "Civil Air Patrol.", alaskaVoc: "Alaska Volcano Observatory.", cascadeVoc: "Cascades Volcano Observatory." })[source] || "County dispatch.";
  }

  function buildDamFfw(state, now, expire, office) {
    const ffw = state.ffw || {};
    const p = damFfwProfile(ffw);
    const damage = p.dam.damageThreat || "base";
    const emergency = damage === "catastrophic";
    const considerable = damage === "considerable";
    const severity = emergency ? "3" : p.sev;
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = vtecLine(office, "FF", "W", state, start, expire);
    const action = vtecAction(state);
    const areaText = areas.length ? areas.map((a) => `${a}...`).join("\n") : "!** NO AREAS **!...";
    const source = damSourceText(p.dam.source);
    const threatLead = emergency ? "This is a PARTICULARLY DANGEROUS SITUATION. SEEK HIGHER GROUND NOW! IMMEDIATE EVACUATION for" : considerable ? "Life-threatening flash flooding in" : "Flooding in";
    const damageTag = emergency ? "FLASH FLOOD DAMAGE THREAT...CATASTROPHIC\n" : considerable ? "FLASH FLOOD DAMAGE THREAT...CONSIDERABLE\n" : "";
    const failureTag = p.failure ? `${p.failure}\n` : "";

    if (["CON", "CAN", "EXP"].includes(action)) {
      const headlineAction = action === "CAN" ? "IS CANCELLED" : action === "EXP" ? "WILL EXPIRE" : `REMAINS IN EFFECT UNTIL ${WG.formatUntilTime(expire, office).toUpperCase()}`;
      let follow = `WGUS53 K${office.siteId} ${formatWmoStamp(now)}\nFFS${office.siteId}\n${ugcLine}\n${vtec}\n/00000.${severity}.${p.ic}.000000T0000Z.000000T0000Z.000000T0000Z.OO/\n\nFlash Flood Statement\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n...THE FLASH FLOOD WARNING FOR ${p.type.toUpperCase()} ${headlineAction}...\n\n`;
      if (action === "CAN" || action === "EXP") follow += `Flooding is no longer expected to pose a significant threat. Continue to heed all road closures.\n\n`;
      else follow += `At ${formatClock(now, office)}, ${p.report}.\n\n  HAZARD...Life-threatening flash flooding from ${p.type}.\n\n  SOURCE...${source}\n\n  IMPACT...${threatLead} ${p.impact}.\n\n${damageTag}${failureTag}`;
      follow += `${WG.formatLatLonLine(state.polygon)}\n\n$$\n`;
      return follow;
    }

    let text = `WGUS53 K${office.siteId} ${formatWmoStamp(now)}\nFFW${office.siteId}\n${ugcLine}\n${vtec}\n/00000.${severity}.${p.ic}.000000T0000Z.000000T0000Z.000000T0000Z.OO/\n\nBULLETIN - EAS ACTIVATION REQUESTED\nFlash Flood Warning\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n`;
    if (emergency) text += `...FLASH FLOOD EMERGENCY FOR ${p.locations.toUpperCase()}...\n\n`;
    text += `* Flash Flood Warning for...\n  ${p.type} in...\n${areaText}\n\n* Until ${WG.formatUntilTime(expire, office)}.\n\n* At ${formatClock(now, office)}, ${p.report}.\n\n`;
    if (emergency) text += `THIS IS A FLASH FLOOD EMERGENCY FOR ${p.locations}. SEEK HIGHER GROUND NOW!\n\n`;
    text += `  HAZARD...${emergency || considerable ? "Life-threatening flash flooding from" : "Flash flooding from"} ${p.type}.\n\n  SOURCE...${source}\n\n  IMPACT...${threatLead} ${p.impact}.\n\n`;
    if (p.dam.details) text += `${p.dam.details}\n\n`;
    text += `${locationOutputBlock(state, now, office, "Locations impacted include...")}\n\n${ctaBlock(["Move to higher ground now. Do not attempt to travel unless fleeing an area subject to flooding or under an evacuation order.", "Turn around, don't drown when encountering flooded roads."])}${WG.formatLatLonLine(state.polygon)}\n\n${damageTag}${failureTag}FLASH FLOOD...OBSERVED\n$$\n`;
    return text;
  }

  function buildFfw(state, now, expire, office) {
    const ffw = state.ffw || {};
    if (ffw.family === "dam") return buildDamFfw(state, now, expire, office);
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = vtecLine(office, "FF", "W", state, start, expire);
    const loc = locationPhrase(state);
    const mov = motionSpeedDir(state);
    const bits = ffwSourceBits(ffw);
    const action = vtecAction(state);
    const already = Boolean(ffw.alreadyOccurring) || action === "EXT";
    const isExpected = already
      ? "Flash flooding is already occurring. "
      : "Flash flooding is expected to begin shortly. ";

    let rainAmount = "";
    if (ffw.rainAmount === "rain1") {
      rainAmount = "Up to one inch of rain has already fallen. ";
    } else if (ffw.rainAmount === "rain2") {
      rainAmount = "Up to two inches of rain have already fallen. ";
    } else if (ffw.rainAmount === "rain3") {
      rainAmount = "Up to three inches of rain have already fallen. ";
    } else if (ffw.rainAmount === "rainEdit") {
      const amt = (ffw.rainEditText || "").trim() || "!** RAINFALL AMOUNTS **!";
      rainAmount = `${amt} inches of rain have fallen. `;
    }

    const snowMelt = ffw.snowMelt
      ? "Rapid snowmelt is also occurring and will add to the flooding. "
      : "";
    const hycType = ffw.snowMelt ? "Rain and Snowmelt in..." : "";
    const ic = ffw.snowMelt ? "RS" : "ER";
    const ffTag = ({ doppler: "RADAR INDICATED", dopplerGauge: "RADAR AND GAUGE INDICATED", trainedSpotters: "OBSERVED", public: "OBSERVED", lawEnforcement: "OBSERVED", emergencyManagement: "OBSERVED", satellite: "SATELLITE INDICATED", satelliteGauge: "SATELLITE AND GAUGE INDICATED", onlyGauge: "GAUGE INDICATED" })[ffw.source] || "RADAR INDICATED";
    const damageThreat = ffw.emergency || ffw.damageThreat === "catastrophic" ? "CATASTROPHIC" : ffw.damageThreat === "considerable" ? "CONSIDERABLE" : "";
    const rainTag = ({ rain1: "1-2 INCHES IN 1 HOUR", rain2: "2-3 INCHES IN 1 HOUR", rain3: "1-3 INCHES IN 1 HOUR", custom: String(ffw.expectedRainCustom || "").trim().toUpperCase() })[ffw.expectedRain] || "";

    if (["CON", "CAN", "EXP"].includes(action)) {
      const headline = action === "CAN" ? "IS CANCELLED" : action === "EXP" ? `WILL EXPIRE AT ${WG.formatUntilTime(expire, office).toUpperCase()}` : `REMAINS IN EFFECT UNTIL ${WG.formatUntilTime(expire, office).toUpperCase()}`;
      let follow = `WGUS53 K${office.siteId} ${formatWmoStamp(now)}\nFFS${office.siteId}\n${ugcLine}\n${vtec}\n/00000.0.${ic}.000000T0000Z.000000T0000Z.000000T0000Z.OO/\n\nFlash Flood Statement\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n...THE FLASH FLOOD WARNING ${headline}...\n\n`;
      if (action === "CAN" || action === "EXP") {
        follow += "Flooding is no longer expected to pose a threat. Continue to heed any remaining road closures.\n\n";
      } else {
        follow += `At ${formatClock(now, office)}, ${bits.s1}${bits.s2}${bits.s3} across the warned area. ${isExpected}\n\n  HAZARD...${damageThreat ? "Life-threatening flash flooding. Heavy rain producing flash flooding." : `Flash flooding caused by ${ffw.withThunder ? "thunderstorms" : "heavy rain"}.`}\n\n  SOURCE...${bits.s1.trim()}.\n\n  IMPACT...${damageThreat === "CATASTROPHIC" ? "This is a PARTICULARLY DANGEROUS SITUATION. SEEK HIGHER GROUND NOW! " : damageThreat === "CONSIDERABLE" ? "Life-threatening " : ""}Flooding of small creeks and streams, urban areas, highways, streets and underpasses.\n\n`;
        follow += `FLASH FLOOD...${ffTag}\n${damageThreat ? `FLASH FLOOD DAMAGE THREAT...${damageThreat}\n` : ""}${rainTag ? `EXPECTED RAINFALL...${rainTag}\n` : ""}`;
      }
      follow += `${WG.formatLatLonLine(state.polygon)}\n\n$$\n`;
      return follow;
    }

    let burnScar = "";
    if (ffw.burnScar) {
      burnScar =
        "Excessive rainfall over the burn scar will result in debris flow moving through the !** DRAINAGE **!. The debris flow can consist of rock, mud, vegetation and other loose materials.";
    } else if (ffw.mudSlide) {
      burnScar =
        "Excessive rainfall over the warned area will cause mud slides near steep terrain. The mud slide can consist of rock, mud, vegetation and other loose materials.";
    }

    const emerLoc = (ffw.emergencyLoc || "").trim() || "!** EDIT LOCATION(S) **!";

    // Third bullet: time, source, location, motion, rain, expected
    const trackMotion = Boolean(ffw.trackMotion);
    let third = trackMotion
      ? `At ${formatClock(now, office)}, ${bits.s1}${bits.s2}${bits.s3} ${bits.nearPhrase} ${loc}`
      : `At ${formatClock(now, office)}, ${bits.s1}${bits.s2}${bits.s3} over the warned area`;
    if (state.location) {
      // already have loc phrase
    }
    if (!trackMotion) {
      third += ". ";
    } else if (mov.stationary) {
      if (ffw.withThunder) {
        third += ". The storm is nearly stationary. ";
      } else {
        third += ". The rain will continue. ";
      }
    } else {
      const who =
        state.stormType === "line"
          ? ffw.withThunder
            ? "The storms are moving"
            : "The storm is moving"
          : ffw.withThunder
            ? "The storm is moving"
            : "The rain is moving";
      third += `. ${who} ${mov.dir} at ${mov.speed} mph. `;
    }
    third += `${rainAmount}${isExpected}${snowMelt}`;
    if (ffw.emergency) {
      third += `THIS IS A FLASH FLOOD EMERGENCY FOR ${emerLoc}. This is a PARTICULARLY DANGEROUS SITUATION. SEEK HIGHER GROUND NOW!`;
    }

    const firstBullet = areas.length
      ? areas.map((a) => `${a}...`).join("\n")
      : "!** NO AREAS **!...";

    const c = ffw.ctas || {};
    const ctas = [];
    if (ffw.emergency || c.emergencyCta) {
      if (ffw.emergency) {
        ctas.push(
          "Move to higher ground now. This is an extremely dangerous and life-threatening situation. Do not attempt to travel unless you are fleeing an area subject to flooding or under an evacuation order."
        );
      } else if (c.emergencyCta) {
        ctas.push(
          "!** YOU SELECTED THE FLASH FLOOD EMERGENCY CTA WITHOUT SELECTING THE FLASH FLOOD EMERGENCY HEADER. PLEASE RE-GENERATE THIS WARNING **!"
        );
      }
    }
    if (c.tadd) {
      ctas.push(
        "Turn around, don't drown when encountering flooded roads. Most flood deaths occur in vehicles."
      );
    }
    if (c.actQuickly) {
      ctas.push("Move to higher ground now. Act quickly to protect your life.");
    }
    if (c.childSafety) {
      ctas.push(
        "Keep children away from storm drains, culverts, creeks and streams. Water levels can rise rapidly and sweep children away."
      );
    }
    if (c.nighttime) {
      ctas.push("Be especially cautious at night when it is harder to recognize the dangers of flooding.");
    }
    if (c.urban) {
      ctas.push(
        "Excessive runoff from heavy rainfall will cause flooding of small creeks and streams, urban areas, highways, streets and underpasses as well as other drainage areas and low lying spots."
      );
    }
    if (c.rural) {
      ctas.push(
        "Excessive runoff from heavy rainfall will cause flooding of small creeks and streams, country roads, farmland, and other low lying spots."
      );
    }
    if (c.stayAway) {
      ctas.push("Stay away or be swept away. River banks and culverts can become unstable and unsafe.");
    }
    if (c.lowSpots) {
      ctas.push(
        "In hilly terrain there are hundreds of low water crossings which are potentially dangerous in heavy rain. Do not attempt to cross flooded roads. Find an alternate route."
      );
    }
    if (c.arroyos) {
      ctas.push(
        "Remain alert for flooding even in locations not receiving rain. Arroyos, streams, and rivers can become raging killer currents in a matter of minutes, even from distant rainfall."
      );
    }
    if (c.burnAreas) {
      ctas.push(
        "Move away from recently burned areas. Life-threatening flooding of creeks, roads and normally dry arroyos is likely. The heavy rains will likely trigger rockslides, mudslides and debris flows in steep terrain, especially in and around these areas."
      );
    }
    if (c.camperSafety) {
      ctas.push(
        "Flooding is occurring or is imminent. It is important to know where you are relative to streams, rivers, or creeks which can become killers in heavy rains. Campers and hikers should avoid streams or creeks."
      );
    }
    if (c.reportFlooding) {
      ctas.push("Please report flooding to your local law enforcement agency when you can do so safely.");
    }
    if (c.ffwMeans) {
      ctas.push(
        "A Flash Flood Warning means that flooding is imminent or occurring. If you are in the warned area move to higher ground immediately. Residents living along streams and creeks should take immediate precautions to protect life and property."
      );
    }

    let text = "";
    text += `WGUS53 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `FFW${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n`;
    text += `/00000.0.${ic}.000000T0000Z.000000T0000Z.000000T0000Z.OO/\n\n`;
    text += `BULLETIN - EAS ACTIVATION REQUESTED\n`;
    text += `Flash Flood Warning\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    if (ffw.emergency) {
      text += `...FLASH FLOOD EMERGENCY FOR ${emerLoc.toUpperCase()}...\n\n`;
    }
    text += `* Flash Flood Warning for...\n`;
    if (hycType) {
      text += `  ${hycType}\n`;
    }
    text += `${firstBullet}\n\n`;
    text += `* Until ${WG.formatUntilTime(expire, office)}.\n\n`;
    text += `* ${third.trim()}\n\n`;
    const ffSource = ({ doppler: "Radar indicated.", dopplerGauge: "Radar and automated gauges.", trainedSpotters: "Trained weather spotters.", public: "Public.", lawEnforcement: "Law enforcement.", emergencyManagement: "Emergency management.", satellite: "Satellite indicated.", satelliteGauge: "Satellite and automated gauges.", onlyGauge: "Automated gauges." })[ffw.source] || "Radar indicated.";
    text += `  HAZARD...${damageThreat ? "Life-threatening flash flooding. Heavy rain producing flash flooding." : `Flash flooding caused by ${ffw.withThunder ? "thunderstorms" : "heavy rain"}.`}\n\n`;
    text += `  SOURCE...${ffSource}\n\n`;
    text += `  IMPACT...${damageThreat === "CATASTROPHIC" ? "This is a PARTICULARLY DANGEROUS SITUATION. SEEK HIGHER GROUND NOW! Life-threatening " : damageThreat === "CONSIDERABLE" ? "Life-threatening " : ""}Flooding of small creeks and streams, urban areas, highways, streets and underpasses as well as other drainage and low-lying areas.\n\n`;
    if (ffw.listCities !== false || state.locationMode === "pathcast") {
      text += `${locationOutputBlock(state, now, office, "Some locations that will experience flooding include...")}\n\n`;
    }
    if (burnScar) {
      text += `${burnScar}\n\n`;
    }
    if (ffw.addRainfall) {
      const amt = (ffw.addRainfallText || "").trim() || "!** EDIT AMOUNT **!";
      text += `Additional rainfall amounts of ${amt} are possible in the warned area.\n\n`;
    }
    text += ctaBlock(ctas);
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    if (trackMotion) text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    text += `FLASH FLOOD...${ffTag}\n`;
    if (damageThreat) text += `FLASH FLOOD DAMAGE THREAT...${damageThreat}\n`;
    if (rainTag) text += `EXPECTED RAINFALL...${rainTag}\n`;
    text += `\n$$\n`;
    return text;
  }

  function buildAfw(state, now, expire, office) {
    const afw = state.afw || {};
    const action = vtecAction(state);
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = action === "NEW"
      ? vtecLine(office, "FA", "W", state, start, expire)
      : followupVtecLine(office, "FA", "W", state, expire);
    const loc = String(afw.locationText || "").trim() || locationPhrase(state);
    const causes = { ER: "excessive rainfall", SM: "snowmelt", RS: "rain and snowmelt", DM: "a levee failure", DR: "a dam floodgate release", IJ: "an ice jam", IC: "rain and/or snowmelt and/or an ice jam", GO: "a glacier-dammed lake outburst", MC: "multiple causes", UU: "an unknown cause" };
    const cause = causes[afw.cause || "ER"] || "excessive rainfall";
    const type = afw.floodType || "general";
    const whatType = type === "smallstreams" ? "Flooding of small streams" : type === "urbansmallstreams" ? "Flooding of urban areas and small streams" : "Flooding";
    const leads = { doppler: "Doppler radar indicated", dopplerGauge: "Doppler radar and automated rain gauges indicated", trainedSpotters: "Trained weather spotters reported", lawEnforcement: "Local law enforcement reported", emergencyManagement: "Emergency management reported", public: "The public reported", satellite: "Satellite estimates indicate", satelliteGauge: "Satellite estimates and rain gauge data indicate", onlyGauge: "Reporting gauges indicate", genericFlood: "Forecaster analysis indicates" };
    const lead = leads[afw.source || "doppler"] || leads.doppler;
    const basis = afw.floodingOccurring ? "flooding in " + loc : (afw.withThunder ? "thunderstorms producing " : "") + cause + " in " + loc + " that will cause flooding";
    const first = areas.length ? areas.map((a) => a + "...").join("\n") : "!** NO AREAS **!...";
    const regionDigit = office.siteId === "RIW" ? "5" : (office.siteId === "OHX" || office.siteId === "HUN") ? "4" : "3";
    const productId = action === "NEW" || action === "EXT" ? "FLW" : "FLS";
    let text = "WGUS4" + regionDigit + " K" + office.siteId + " " + formatWmoStamp(now) + "\n";
    text += productId + office.siteId + "\n" + ugcLine + "\n" + vtec + "\n";
    text += "/00000.0." + (afw.cause || "ER") + ".000000T0000Z.000000T0000Z.000000T0000Z.OO/\n\n";
    text += (productId === "FLW" ? "BULLETIN - IMMEDIATE BROADCAST REQUESTED\nFlood Warning\n" : "Flood Statement\n") + "ZASNet Weather Service " + office.officeShort + "\n" + WG.formatHeaderTime(now, office) + "\n\n";
    const until = WG.formatUntilTime(expire, office);
    if (action === "CAN" || action === "EXP") {
      const ending = action === "CAN" ? "IS CANCELLED" : `WILL EXPIRE AT ${until.toUpperCase()}`;
      text += `...THE FLOOD WARNING ${ending}...\n\n`;
      text += action === "CAN"
        ? "The flooding threat has ended. The Flood Warning has been cancelled.\n\n"
        : `The Flood Warning will expire at ${until}. Flooding is no longer expected to pose a threat.\n\n`;
      text += "Continue to heed any remaining road closures.\n\n" + WG.formatLatLonLine(state.polygon) + "\n\n$$\n";
      return text;
    }
    if (action === "CON") {
      text += `...THE FLOOD WARNING REMAINS IN EFFECT UNTIL ${until.toUpperCase()}...\n\n`;
    } else if (action === "EXT") {
      text += `...THE FLOOD WARNING IS NOW IN EFFECT UNTIL ${until.toUpperCase()}...\n\n`;
    }
    let rain = "";
    if (afw.rainAmount === "rain1") rain = " Up to one inch of rain has already fallen.";
    if (afw.rainAmount === "rain2") rain = " Up to two inches of rain have already fallen.";
    if (afw.rainAmount === "rain3") rain = " Up to three inches of rain have already fallen.";
    if (afw.rainAmount === "rainEdit") rain = " " + (String(afw.rainEditText || "").trim() || "!** RAINFALL AMOUNTS **!") + " inches of rain have fallen.";
    const status = afw.floodingOccurring ? "is occurring" : "is imminent";
    text += `* WHAT...${whatType} due to ${cause} ${action === "CON" ? "continues" : status}.\n\n`;
    text += `* WHERE...${loc}.\n\n`;
    text += `* WHEN...Until ${until}.\n\n`;
    const impacts = String(afw.impacts || "").trim() || (type === "urbansmallstreams"
      ? "Flooding of urban areas, roads, small streams, and other low-lying locations."
      : type === "smallstreams" ? "Flooding of small streams, roads, and other low-lying locations." : "Flooding of low-lying and flood-prone locations.");
    text += `* IMPACTS...${impacts}\n\n`;
    text += "* ADDITIONAL DETAILS...\n";
    text += `  - At ${formatClock(now, office)}, ${lead} ${basis}.${rain}\n`;
    if (afw.addRainfall) text += "  - Additional rainfall amounts of " + (String(afw.addRainfallText || "").trim() || "!** EDIT AMOUNT **!") + " are possible in the warned area.\n";
    if (String(afw.drainages || "").trim()) text += "  - Flooding is expected along " + afw.drainages.trim() + ".\n";
    if (String(afw.specificStream || "").trim()) text += "  - " + afw.specificStream.trim() + "\n";
    if (afw.listCities !== false) {
      const cities = cityListPhrase(state.places, 18);
      if (cities) text += "  - Some locations that will experience flooding include...\n    " + cities + ".\n";
    }
    text += "\n";
    const c = afw.ctas || {};
    const ctas = [];
    if (c.tadd) ctas.push("Turn around, don't drown when encountering flooded roads. Most flood deaths occur in vehicles.");
    if (c.actQuickly) ctas.push("Move to higher ground now. Act quickly to protect your life.");
    if (c.childSafety) ctas.push("Keep children away from storm drains, culverts, creeks and streams. Water levels can rise rapidly and sweep children away.");
    if (c.nighttime) ctas.push("Be especially cautious at night when it is harder to recognize the dangers of flooding.");
    if (c.urban) ctas.push("Excessive runoff will flood small creeks and streams, urban areas, highways, streets, underpasses and other low-lying spots.");
    if (c.rural) ctas.push("Excessive runoff will flood small creeks and streams, country roads, farmland and other low-lying spots.");
    if (c.stayAway) ctas.push("Stay away or be swept away. River banks and culverts can become unstable and unsafe.");
    if (c.lowSpots) ctas.push("Do not attempt to cross flooded low-water crossings. Find an alternate route.");
    if (c.arroyos) ctas.push("Remain alert for flooding even in locations not receiving rain. Arroyos, streams and rivers can become raging currents in minutes.");
    if (c.burnAreas) ctas.push("Move away from recently burned areas. Flooding, rockslides, mudslides and debris flows are possible.");
    if (c.camperSafety) ctas.push("Campers and hikers should avoid streams, rivers and creeks which can become dangerous in heavy rain.");
    if (c.reportFlooding) ctas.push("Please report flooding to your local law enforcement agency when you can do so safely.");
    if (c.warningMeans) ctas.push("A Flood Warning means that flooding is imminent or occurring. Take necessary precautions immediately.");
    text += ctaBlock(ctas);
    text += WG.formatLatLonLine(state.polygon) + "\n\n$$\n";
    return text;
  }

  function buildFay(state, now, expire, office) {
    const fad = state.fad || {};
    const action = vtecAction(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const start = state.issuedAt ? new Date(state.issuedAt) : now;
    const vtec = action === "NEW"
      ? vtecLine(office, "FA", "Y", state, start, expire)
      : followupVtecLine(office, "FA", "Y", state, expire);
    const regionDigit = office.siteId === "RIW" ? "5" : (office.siteId === "OHX" || office.siteId === "HUN") ? "4" : "3";
    const areaLine = areaProductLine(state) || "!** NO AREAS **!";
    const resolvedLocation = locationPhrase(state);
    const areaFallback = areaNames(state).join(" and ");
    const location = String(fad.locationText || "").trim() ||
      (!/unknown location/i.test(resolvedLocation) ? resolvedLocation : areaFallback || "the advisory area");
    const type = fad.floodType || "general";
    const cause = ({
      ER: "excessive rainfall", SM: "snowmelt", RS: "rain and snowmelt",
      IJ: "an ice jam", IC: "an ice jam and rain", DR: "a dam floodgate release",
      GO: "a glacier-dammed lake outburst", OT: "groundwater flooding"
    })[fad.cause || "ER"] || "excessive rainfall";
    const whatType = ({
      general: "Flooding", smallstreams: "Small stream flooding",
      urbansmallstreams: "Urban and small stream flooding",
      arroyo: "Small stream and dry wash flooding", hydrologic: "Hydrologic flooding"
    })[type] || "Flooding";
    const impacts = ({
      general: "Minor flooding in low-lying and poor drainage areas.",
      smallstreams: "Minor flooding in low-lying and poor drainage areas. Rises in small streams.",
      urbansmallstreams: "Minor flooding in low-lying and poor drainage areas. Water over roadways and rises in small streams are possible.",
      arroyo: "Minor flooding in low-lying and poor drainage areas. Rises in small streams and normally dry washes. Some low-water crossings may become impassable.",
      hydrologic: "Minor flooding along area waterways and in low-lying locations."
    })[type] || "Minor flooding in low-lying and poor drainage areas.";
    const leads = {
      doppler: "Doppler radar indicated",
      dopplerGauge: "Doppler radar and automated rain gauges indicated",
      trainedSpotters: "Trained weather spotters reported",
      lawEnforcement: "Local law enforcement reported",
      emergencyManagement: "Emergency management reported",
      public: "The public reported",
      satellite: "Satellite estimates indicated",
      onlyGauge: "Reporting gauges indicated"
    };
    const lead = leads[fad.source || "doppler"] || leads.doppler;
    let rain = "";
    if (fad.rainAmount === "rain1") rain = " Up to 1 inch of rain has fallen.";
    if (fad.rainAmount === "rain2") rain = " Up to 2 inches of rain have fallen.";
    if (fad.rainAmount === "rain3") rain = " Up to 3 inches of rain have fallen.";
    if (fad.rainAmount === "rainEdit") rain = " " + (String(fad.rainEditText || "").trim() || "!** RAINFALL AMOUNTS **!") + " inches of rain have fallen.";
    // Impact-based FLS products conventionally render 930 PM rather than
    // 9:30 PM and use a relative daypart when the end time is later today.
    let until = WG.formatUntilTime(expire, office).replace(/^(\d{1,2}):(\d{2})/, "$1$2");
    if (WG.resolveOfficeLocalParts) {
      const issuedParts = WG.resolveOfficeLocalParts(now, office);
      const expireParts = WG.resolveOfficeLocalParts(expire, office);
      const sameLocalDay = issuedParts.year === expireParts.year && issuedParts.month === expireParts.month && issuedParts.day === expireParts.day;
      if (sameLocalDay) {
        const hour24 = (Number(expireParts.hours) % 12) + (expireParts.ampm === "PM" ? 12 : 0);
        const daypart = hour24 < 12 ? "this morning" : hour24 < 17 ? "this afternoon" : "this evening";
        until = until.replace(/\s+(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i, " " + daypart);
      }
    }
    let text = "WGUS8" + regionDigit + " K" + office.siteId + " " + formatWmoStamp(now) + "\n";
    text += "FLS" + office.siteId + "\n\n";
    text += "Flood Advisory\nZASNet Weather Service " + office.officeShort + "\n" + WG.formatHeaderTime(now, office) + "\n\n";
    text += ugcLine + "\n" + vtec + "\n";
    text += "/00000.N." + (fad.cause || "ER") + ".000000T0000Z.000000T0000Z.000000T0000Z.OO/\n";
    text += areaLine + "-\n" + WG.formatHeaderTime(now, office) + "\n\n";

    if (action === "CAN" || action === "EXP") {
      const ending = action === "CAN" ? "IS CANCELLED" : "WILL EXPIRE AT " + until.toUpperCase();
      text += "...FLOOD ADVISORY " + ending + "...\n\n";
      text += "The Flood Advisory " + (action === "CAN" ? "has been cancelled" : "will expire at " + until);
      text += " for " + (areaNames(state, false).join(", ") || "the advisory area") + ".\n\n";
      const reason = String(state.cancelReason || "").toLowerCase();
      if (reason === "movedout") text += "The heavy rain has moved out of the area. ";
      else if (reason === "weakened") text += "The heavy rain has ended. ";
      text += "Flooding is no longer expected to pose a threat. Please continue to heed remaining road closures.\n\n";
      text += "&&\n\n" + WG.formatLatLonLine(state.polygon) + "\n\n$$\n";
      return text;
    }

    const headline = action === "EXT"
      ? "NOW IN EFFECT UNTIL " + until.toUpperCase()
      : action === "CON"
        ? "REMAINS IN EFFECT UNTIL " + until.toUpperCase()
        : "IN EFFECT UNTIL " + until.toUpperCase();
    text += "...FLOOD ADVISORY " + headline + "...\n\n";
    text += "* WHAT..." + whatType + " caused by " + cause + (action === "NEW" ? " is expected." : " continues.") + "\n\n";
    text += "* WHERE..." + location + ".\n\n";
    text += "* WHEN...Until " + until + ".\n\n";
    text += "* IMPACTS..." + impacts + "\n\n";
    text += "* ADDITIONAL DETAILS...\n";
    text += "  - At " + formatClock(now, office).replace(/^(\d{1,2}):(\d{2})/, "$1$2") + ", " + lead + " " + (fad.withThunder === false ? cause : "heavy rain due to thunderstorms") + "." + rain;
    text += fad.floodingOccurring ? " Minor flooding is ongoing in the advisory area.\n" : " Minor flooding is expected to begin shortly in the advisory area.\n";
    if (String(fad.drainages || "").trim()) text += "  - This includes the following streams and drainages...\n    " + fad.drainages.trim() + ".\n";
    if (fad.addRainfall) text += "  - Additional rainfall amounts of " + (String(fad.addRainfallText || "").trim() || "!** EDIT AMOUNT **!") + " are expected over the area. This additional rain will result in minor flooding.\n";
    if (String(fad.specificStream || "").trim()) text += "  - " + fad.specificStream.trim() + "\n";
    const impactedCities = cityListPhrase(state.places, 18);
    if (fad.listCities !== false && impactedCities) {
      text += "  - Some locations that may experience flooding include...\n    " + impactedCities + ".\n";
    }
    text += "\n";
    const c = fad.ctas || {};
    const ctas = [];
    if (c.tadd !== false) ctas.push("Turn around, don't drown when encountering flooded roads. Most flood deaths occur in vehicles.");
    if (c.nighttime) ctas.push("Be especially cautious at night when it is harder to recognize the dangers of flooding.");
    if (c.urban) ctas.push("Excessive runoff will cause minor flooding of urban areas, highways, streets, underpasses, and other low-lying spots.");
    if (c.rural) ctas.push("Excessive runoff will cause minor flooding of small creeks and streams, country roads, farmland, and other low-lying spots.");
    if (c.reportFlooding) ctas.push("Please report observed flooding to local emergency services or law enforcement and request they pass this information to the National Weather Service when you can do so safely.");
    if (c.warningMeans) ctas.push("A Flood Advisory means river or stream flows are elevated, or ponding of water in urban or other areas is occurring or imminent.");
    text += ctaBlock(ctas) || "&&\n\n";
    text += WG.formatLatLonLine(state.polygon) + "\n\n$$\n";
    return text;
  }

  function buildFrw(state, now, expire, office) {
    const frw = state.frw || {};
    const agency = String(frw.requestedBy || "").trim() || "!** ENTER REQUESTING AGENCY NAME HERE **!";
    const details = String(frw.details || "").trim() || "!** TYPE FIRE DETAILS HERE **!";
    const locations = String(frw.locations || "").trim() || "!** AREAS **!";
    const arrival = String(frw.arrivalTime || "").trim() || "!** TIME **!";
    const broadcast = frw.broadcastInstruction === "urgent" ? "URGENT - IMMEDIATE BROADCAST REQUESTED"
      : frw.broadcastInstruction === "immediate" ? "BULLETIN - IMMEDIATE BROADCAST REQUESTED"
      : "BULLETIN - EAS ACTIVATION REQUESTED";
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    let body = details + ".";
    if (frw.scenario === "actual") body = "A fire was located " + details + " and could affect " + locations + ".";
    if (frw.scenario === "racing") body = "A fire was racing toward " + locations + " and could reach there by " + arrival + ". " + details;
    let text = "WOUS4" + (office.siteId === "RIW" ? "5" : (office.siteId === "OHX" || office.siteId === "HUN") ? "4" : "3") + " K" + office.siteId + " " + formatWmoStamp(now) + "\n";
    text += "FRW" + office.siteId + "\n" + ugcLine + "\n\n" + broadcast + "\nFire Warning\n" + agency + "\nRelayed by ZASNet Weather Service " + office.officeShort + "\n" + WG.formatHeaderTime(now, office) + "\n\n";
    text += "The following message is being transmitted at the request of " + agency + ".\n\n";
    if (frw.fireEmergency) text += "...FIRE EMERGENCY FOR " + locations.toUpperCase() + "...\n\n";
    text += body + "\n\n";
    if (frw.contact) text += "For additional information, " + String(frw.contact).trim() + ".\n\n";
    const c = frw.ctas || {};
    const ctas = [];
    if (c.stayIndoors) ctas.push("Stay indoors to keep safe from the smoke. Keep windows and doors shut and turn off all ventilation systems.");
    if (c.followInstructions) ctas.push("Follow safety instructions from local law enforcement officials.");
    if (c.heedEvacuations) ctas.push("Heed any evacuation orders and follow all safety precautions.");
    text += ctaBlock(ctas);
    text += WG.formatLatLonLine(state.polygon) + "\n\n$$\n";
    return text;
  }

  function buildSqw(state, now, expire, office) {
    const sqw = state.sqw || {};
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const action = vtecAction(state);
    const vtec = action === "NEW"
      ? vtecLine(office, "SQ", "W", state, now, expire)
      : followupVtecLine(office, "SQ", "W", state, expire);
    const sourceObserved = sqw.source === "observed";
    const source = sourceObserved ? "OBSERVED" : "RADAR INDICATED";
    const significant = sqw.impact === "significant";
    const movement = motionSpeedDir(state);
    const location = locationPhrase(state);
    const wind = String(sqw.wind || "").trim();
    const visibility = String(sqw.visibility || "one quarter mile or less").trim();
    const road = String(sqw.roadCondition || "").trim();
    const basis = String(sqw.basis || "").trim() || (sourceObserved ? "a dangerous snow squall was reported" : "radar indicated an intense snow squall");
    const hazards = ["heavy snow", wind ? `wind gusts to ${wind}` : "gusty winds", `visibility ${visibility}`, sqw.flashFreeze ? "a flash freeze" : "", road].filter(Boolean).join(", ");
    const impact = significant
      ? "Dangerous and life-threatening travel conditions are expected to develop rapidly in the warning area."
      : "Travel will become difficult and potentially dangerous within minutes.";
    const locations = locationOutputBlock(state, now, office, "Locations impacted include...");
    const highways = String(sqw.highways || "").trim();
    const regionDigit = office.siteId === "RIW" ? "5" : (["OHX", "HUN"].includes(office.siteId) ? "4" : "3");
    let text = `WUUS5${regionDigit} K${office.siteId} ${formatWmoStamp(now)}\nSQW${office.siteId}\n\n`;
    text += `${ugcLine}\n${vtec}\n`;
    if (areas.length) text += `${areas.map((area) => area.toUpperCase().replace(/\s+COUNTY$/i, "")).join("-")}-\n`;
    text += `\nBULLETIN - IMMEDIATE BROADCAST REQUESTED\nSnow Squall Warning\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n`;
    if (["CAN", "EXP"].includes(action)) {
      text += `The Snow Squall Warning for ${areas.join(", ") || "the warned area"} ${action === "CAN" ? "has been cancelled" : "has expired"}.\n\n`;
    } else {
      text += `The ZASNet Weather Service in ${office.officeLoc} has issued a\n\n* Snow Squall Warning for...\n${areas.map((area) => `${area}.`).join("\n") || "The warned area."}\n\n`;
      text += `* Until ${WG.formatUntilTime(expire, office)}.\n\n`;
      text += `* At ${formatClock(now, office)}, ${basis} ${location}${movement.stationary ? "." : `, moving ${movement.dir} at ${movement.speed} mph.`}\n\n`;
      text += `HAZARD...${capitalizeFirst(hazards)}.\n\nSOURCE...${source}.\n\nIMPACT...${impact}\n\n`;
      if (sqw.listLocations !== false) text += `${locations}\n${highways ? `${highways}.\n` : ""}\n`;
      text += `PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\nSlow down and turn on your headlights. During snow squalls, the visibility may suddenly drop to near zero in whiteout conditions and roads may rapidly become icy.\n\nThere is no safe place on a highway when a snow squall hits. If you are already driving, reduce speed and increase following distance. Consider avoiding or delaying travel until the squall passes.\n\n&&\n\n`;
    }
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    text += `SNOW SQUALL...${source}\n`;
    if (significant) text += "SNOW SQUALL IMPACT...SIGNIFICANT\n";
    text += "\n$$\n";
    return text;
  }

  function buildDsw(state, now, expire, office) {
    const dsw = state.dsw || {};
    const advisory = state.product === "DSY";
    const name = advisory ? "Dust Advisory" : "Dust Storm Warning";
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const action = vtecAction(state);
    const vtec = action === "NEW" ? vtecLine(office, "DS", advisory ? "Y" : "W", state, now, expire) : followupVtecLine(office, "DS", advisory ? "Y" : "W", state, expire);
    const sourceMap = { meteorologist: "ZASNet meteorologist detected", satellite: "Satellite imagery", radar: "Doppler radar", spotter: "Trained spotters", law: "Law enforcement", emergency: "Emergency management", dot: "Department of Transportation officials", public: "The public" };
    const source = sourceMap[dsw.source] || sourceMap.meteorologist;
    const movement = motionSpeedDir(state);
    const location = locationPhrase(state);
    const visibility = String(dsw.visibility || (advisory ? "one mile or less but greater than one quarter mile" : "one quarter mile or less")).trim();
    const wind = String(dsw.wind || "25 mph or greater").trim();
    const basis = String(dsw.basis || "").trim() || `${source} indicated a wall of dust`;
    const impact = advisory ? "Hazardous travel with sharply reduced visibility." : "Dangerous, life-threatening travel with near-zero visibility.";
    const locations = locationOutputBlock(state, now, office, "Locations impacted include...");
    const highways = String(dsw.highways || "").trim();
    const regionDigit = office.siteId === "RIW" ? "5" : (["OHX", "HUN"].includes(office.siteId) ? "4" : "3");
    let text = `WWUS5${regionDigit} K${office.siteId} ${formatWmoStamp(now)}\nDSW${office.siteId}\n\n`;
    text += `${ugcLine}\n${vtec}\n`;
    if (areas.length) text += `${areas.map((area) => area.toUpperCase().replace(/\s+COUNTY$/i, "")).join("-")}-\n`;
    text += `\n${advisory ? "" : "BULLETIN - EAS ACTIVATION REQUESTED\n"}${name}\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n`;
    if (["CAN", "EXP"].includes(action)) {
      text += `The ${name} for ${areas.join(", ") || "the warned area"} ${action === "CAN" ? "has been cancelled" : "has expired"}.\n\n`;
    } else {
      text += `The ZASNet Weather Service in ${office.officeLoc} has issued a\n\n* ${name} for...\n${areas.map((area) => `${area}.`).join("\n") || "The warned area."}\n\n`;
      text += `* Until ${WG.formatUntilTime(expire, office)}.\n\n`;
      text += `* At ${formatClock(now, office)}, ${basis} ${location}${movement.stationary ? "." : `, moving ${movement.dir} at ${movement.speed} mph.`}\n\n`;
      text += `HAZARD...Dust reducing visibility to ${visibility} with winds ${wind}.\n\nSOURCE...${source}.\n\nIMPACT...${impact}\n\n`;
      if (dsw.listLocations !== false) text += `${locations}\n${highways ? `${highways}.\n` : ""}\n`;
      text += advisory
        ? "PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\nMotorists should use extra caution. Reduce speed, use headlights, and leave plenty of distance ahead.\n\n&&\n\n"
        : "PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\nDust storms lead to dangerous driving conditions with visibility reduced to near zero. If caught in one, pull off the road as far as possible, stop, turn off lights, set the emergency brake, and take your foot off the brake pedal.\n\n&&\n\n";
    }
    text += `${WG.formatLatLonLine(state.polygon)}\n\n${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n$$\n`;
    return text;
  }

  // ─── SPS (NWS SPS.vm style) ─────────────────────────────────────────────

  function capitalizeFirst(str) {
    if (!str) {
      return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function capitalizeAll(str) {
    return String(str || "")
      .split(/\s+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  function spsEventPhrases(state) {
    const sps = state.sps || {};
    const isLine = state.stormType === "line";
    const kind = sps.eventKind || "thunderstorm";
    const mode = sps.precipMode || "rain";

    // Defaults — strong thunderstorm / line
    let describeEvent = isLine ? "a line of strong thunderstorms" : "a strong thunderstorm";
    let describeEventShort = isLine ? "line of strong thunderstorms" : "thunderstorm";
    let describeMovement = isLine
      ? "radar indicated strong thunderstorms were located"
      : "a strong thunderstorm was located";
    let thisEvent = isLine ? "these storms" : "this storm";
    let eventIs = isLine ? "the storms are" : "the storm is";
    let isSnow = mode === "snow";
    let isRain = mode === "rain";

    if (kind === "noThunder") {
      describeEvent = isLine ? "a line of showers" : "a shower";
      describeEventShort = isLine ? "line of showers" : "shower";
      describeMovement = isLine ? "radar indicated showers were located" : "a shower was located";
      thisEvent = isLine ? "these showers" : "this shower";
      eventIs = isLine ? "The showers are" : "The shower is";
      isRain = true;
      isSnow = false;
    } else if (kind === "areaOfThunderstorms") {
      describeEvent = "an area of strong thunderstorms";
      describeEventShort = "thunderstorms";
      describeMovement = "strong thunderstorms were clustered";
      thisEvent = "these storms";
      eventIs = "the storms are";
      isRain = true;
      isSnow = false;
    } else if (kind === "snowSquall" || kind === "snowSquallDangerous" || kind === "snowSquallSevere") {
      const level = kind === "snowSquallDangerous" ? "dangerous " : kind === "snowSquallSevere" ? "severe " : "";
      describeEvent = `a ${level}snow squall`;
      describeEventShort = `${level}snow squall`;
      describeMovement = `a ${level}snow squall was located`;
      thisEvent = `this ${level}squall`;
      eventIs = `The ${level}squall is`;
      isSnow = true;
      isRain = false;
    } else if (kind === "snowArea") {
      describeEvent = "an area of heavy snow";
      describeEventShort = "heavy snow";
      describeMovement = "an area of heavy snow was located";
      thisEvent = "this area of heavy snow";
      eventIs = "The heavy snow is";
      isSnow = true;
      isRain = false;
    } else if (kind === "freezingRain") {
      describeEvent = "freezing rain";
      describeEventShort = "freezing rain";
      describeMovement = "an area of freezing rain was located";
      thisEvent = "this area of freezing rain";
      eventIs = "The freezing rain is";
      isSnow = false;
      isRain = false;
    } else if (kind === "freezingDrizzle") {
      describeEvent = "freezing drizzle";
      describeEventShort = "freezing drizzle";
      describeMovement = "an area of freezing drizzle was located";
      thisEvent = "this area of freezing drizzle";
      eventIs = "The freezing drizzle is";
      isSnow = false;
      isRain = false;
    } else if (kind === "sleet") {
      describeEvent = "sleet";
      describeEventShort = "sleet";
      describeMovement = "an area of sleet was located";
      thisEvent = "this area of sleet";
      eventIs = "The sleet is";
      isSnow = false;
      isRain = false;
    } else if (kind === "wintryMix") {
      describeEvent = "a wintry mix";
      describeEventShort = "wintry mix";
      describeMovement = "an area of mixed precipitation was located";
      thisEvent = "this wintry mix";
      eventIs = "The wintry mix is";
      isSnow = false;
      isRain = false;
    } else if (kind === "flashFreeze") {
      describeEvent = "black ice";
      describeEventShort = "a cold front";
      describeMovement = "a cold front was located";
      thisEvent = "this cold front";
      eventIs = "The cold front is";
      isSnow = false;
      isRain = false;
    }

    return { describeEvent, describeEventShort, describeMovement, thisEvent, eventIs, isSnow, isRain };
  }

  function spsWindThreat(windId) {
    switch (windId) {
      case "wind30":
        return { speed: 30, threat: "winds in excess of 30 mph", tag: "30MPH" };
      case "wind40":
        return { speed: 40, threat: "winds in excess of 40 mph", tag: "40MPH" };
      case "wind50":
        return { speed: 50, threat: "wind gusts up to 50 mph", tag: "50MPH" };
      case "wind55":
        return { speed: 50, threat: "wind gusts of 50 to 55 mph", tag: "55MPH" };
      default:
        return { speed: 0, threat: "", tag: "" };
    }
  }

  function spsHailThreat(hailId) {
    switch (hailId) {
      case "pea":
        return { size: 0.25, threat: "pea size", trail: " hail" };
      case "half":
        return { size: 0.5, threat: "half inch", trail: " hail" };
      case "penny":
        return { size: 0.75, threat: "penny size", trail: " hail" };
      case "nickel":
        return { size: 0.88, threat: "nickel size", trail: " hail" };
      default:
        return { size: 0, threat: "", trail: "" };
    }
  }

  function buildSps(state, now, expire, office) {
    const sps = state.sps || {};
    const phrases = spsEventPhrases(state);
    const isLine = state.stormType === "line";
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const loc = locationPhrase(state);
    const mov = motionSpeedDir(state);
    const wind = spsWindThreat(sps.windId || "none");
    const hail = spsHailThreat(sps.hailId || "none");
    const sources = { radar: "Radar indicated", spotters: "Trained weather spotters", law: "Law enforcement", emergency: "Emergency management", media: "Broadcast media", public: "Public" };
    const sourceText = sources[sps.source] || sources.radar;
    const c = sps.ctas || {};

    // Headline: ...STRONG THUNDERSTORM WILL AFFECT DAVIDSON...WILLIAMSON...COUNTIES...
    let headline;
    if (sps.blankStatement) {
      const custom = (sps.blankHeadline || "").trim() || "!** EDIT HEADLINE **!";
      headline = `...${custom.toUpperCase()}...`;
    } else {
      const areaBits = areas.length
        ? areas.map((a) => a.replace(/\s+County$/i, "").toUpperCase()).join("...") +
          (areas.length === 1 ? " COUNTY" : " COUNTIES")
        : "THE WARNED AREA";
      headline = `...${capitalizeAll(phrases.describeEvent).toUpperCase()} WILL AFFECT ${areaBits}...`;
    }

    // Body location / motion
    let body = "";
    if (!sps.blankStatement) {
      body += `At ${formatClock(now, office)}, ${phrases.describeMovement} ${loc}`;
      if (mov.stationary) {
        body += `. ${capitalizeFirst(phrases.eventIs)} nearly stationary.`;
      } else if (isLine) {
        body += `. Movement was ${mov.dir} at ${mov.speed} mph.`;
      } else {
        body += `, moving ${mov.dir} at ${mov.speed} mph.`;
      }
      body += "\n\n";

      if (phrases.isRain) {
        const hazards = [wind.speed > 0 ? wind.threat : "", hail.size > 0 ? `${hail.threat}${hail.trail}` : "",
          /^landspout/.test(sps.spout || "") ? "a landspout" : /^waterspout/.test(sps.spout || "") ? "an inland waterspout" : ""].filter(Boolean);
        body += `HAZARD...${hazards.length ? hazards.join(" and ") : "Frequent lightning and heavy rain"}.\n\n`;
        body += `SOURCE...${sourceText}.\n\n`;
        const impacts = [];
        if (wind.speed > 0) impacts.push("Gusty winds could knock down tree limbs and blow around unsecured objects.");
        if (hail.size > 0) impacts.push("Minor damage to outdoor objects is possible.");
        if (/^landspout/.test(sps.spout || "")) impacts.push("Minor damage to outdoor objects is possible.");
        if (/^waterspout/.test(sps.spout || "")) impacts.push("Waterspouts can easily overturn boats and create locally hazardous waters.");
        body += `IMPACT...${impacts.join(" ") || "Lightning can be dangerous to people outdoors."}\n\n`;
      } else {
        if (wind.speed > 0) body += `${capitalizeFirst(wind.threat)} are possible with ${phrases.thisEvent}.\n\n`;
        if (hail.size > 0) body += `${capitalizeFirst(hail.threat)}${hail.trail} is possible with ${phrases.thisEvent}.\n\n`;
      }

      if (sps.listCities !== false) {
        const cities = cityListPhrase(state.places, 18);
        if (cities) {
          body += `Locations impacted include...\n${cities}.\n\n`;
        } else if (areas.length) {
          body += `Locations impacted include...\n${areas.slice(0, 10).join(", ")}.\n\n`;
        }
      }

      if (sps.specialEvent) {
        const venue = (sps.specialEventText || "").trim() || "!**event/venue name or location**!";
        body += `Those attending the ${venue} are in the path of ${phrases.thisEvent} and should prepare for the expected weather conditions.\n\n`;
      }
    }

    // CTAs (no PRECAUTIONARY header in classic SPS — plain paragraphs)
    const ctaLines = [];
    if (c.quarterMile && phrases.isSnow) {
      ctaLines.push(`Visibilities will drop quickly to less than a quarter of a mile in ${phrases.thisEvent}.`);
    }
    if (c.zeroMile && phrases.isSnow) {
      ctaLines.push(`Visibilities will drop quickly to near zero in ${phrases.thisEvent}.`);
    }
    if (c.coldAirFunnel) {
      ctaLines.push(
        "Conditions in the atmosphere are such that weak, brief funnels may form this afternoon. They usually develop beneath showers or weak thunderstorms when the air aloft is especially cold.\n\nThese funnels are usually harmless, but on rare occasions can briefly touch down and cause wind gusts over 50 mph. If a funnel approaches your location, move indoors.\n\nPlease contact the ZASNet Weather Service if you see a funnel."
      );
    }
    if (c.generic) {
      ctaLines.push("If outdoors, consider seeking shelter inside a building.");
    }
    if (c.torrentialRain && phrases.isRain) {
      ctaLines.push(
        `Torrential rainfall is also occurring with ${phrases.thisEvent}, and may cause localized flooding. Do not drive your vehicle through flooded roadways.`
      );
    }
    if (c.lightning && phrases.isRain) {
      ctaLines.push(
        "Frequent cloud to ground lightning is occurring with this storm. Lightning can strike 10 miles away from a thunderstorm. Seek a safe shelter inside a building or vehicle."
      );
    }
    if (c.stormIntensify && phrases.isRain) {
      ctaLines.push(
        `${capitalizeFirst(phrases.thisEvent)} may intensify, so be certain to monitor local radio stations and available television stations for additional information and possible warnings from the ZASNet Weather Service.`
      );
    }
    if (c.lawEnforcement) {
      ctaLines.push(
        `To report severe weather, contact your nearest law enforcement agency. They can relay your report to the ZASNet Weather Service office in ${office.officeLoc}.`
      );
    }
    if (c.boaters && phrases.isRain) {
      ctaLines.push(
        "If you are on or near !**NAME OF LAKE**!, get out of the water and move indoors or inside a vehicle. Remember, lightning can strike out to 10 miles from the parent thunderstorm. If you can hear thunder, you are close enough to be struck by lightning. Move to safe shelter now! Do not be caught on the water in a thunderstorm."
      );
    }
    if (c.advisory) {
      ctaLines.push(
        "Although this event is expected to be short lived, if conditions worsen, a winter weather advisory may become necessary. Please monitor local media outlets and the ZASNet Weather Service for further statements."
      );
    }
    if (c.advisoryEffect) {
      ctaLines.push(
        "A winter weather advisory is in effect for the area. Please monitor local media outlets and the ZASNet Weather Service for further statements."
      );
    }
    if (c.snowSquall) {
      ctaLines.push(
        "Use extra caution if you must travel into or through this dangerous snow squall. Rapid changes in visibility and potentially slick roads are likely to lead to accidents. Consider delaying travel until the squall passes your location."
      );
    }
    if (
      c.freezingDrizzle &&
      (phrases.describeEventShort === "freezing rain" || phrases.describeEventShort === "freezing drizzle")
    ) {
      ctaLines.push(
        `The ${phrases.describeEventShort} may quickly coat roadways with a thin layer of ice that may be undetectable. Please use extreme caution, especially on bridges, overpasses and around curves. Allow plenty of stopping distance and avoid braking suddenly.`
      );
    }
    if (c.flashFreeze) {
      ctaLines.push(
        "A rapid drop in temperatures will lead to the rapid formation of black ice on area roadways. Black ice is nearly impossible to see and roadways may appear wet. Please use extreme caution, especially on bridges, overpasses and around curves. Allow plenty of stopping distance and avoid braking suddenly."
      );
    }
    if (c.icyRoads && phrases.isSnow) {
      ctaLines.push("Icy roads are possible as the snow melts on the roads then quickly refreezes.");
    }
    if (c.changingConditions) {
      ctaLines.push(
        "Conditions can deteriorate rapidly in winter weather situations. Be prepared for snow or ice covered roads. Slow down and allow extra time when traveling."
      );
    }
    if (c.camper) {
      ctaLines.push(
        isLine
          ? "Persons in campgrounds should consider seeking sturdy shelter until these storms pass."
          : "Persons in campgrounds should consider seeking sturdy shelter until this storm passes."
      );
    }

    let text = "";
    text += `WWUS83 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `SPS${office.siteId}\n\n`;
    text += `Special Weather Statement\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `${ugcLine}\n`;
    // Area name line (COUNTY- COUNTY- style)
    if (areas.length) {
      text += areas.map((a) => a.toUpperCase().replace(/\s+COUNTY$/i, "")).join("-") + "-\n";
    }
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `${headline}\n\n`;
    text += body;
    ctaLines.forEach((line) => {
      text += `${line}\n\n`;
    });
    text += `&&\n\n`;
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `${WG.formatTml(motionForTml(state.motion), state.location, now.getTime())}\n\n`;
    if (phrases.isRain && !sps.blankStatement) {
      if (/^landspout/.test(sps.spout || "")) text += `LANDSPOUT...${sps.spout === "landspoutObserved" ? "OBSERVED" : "POSSIBLE"}\n`;
      if (/^waterspout/.test(sps.spout || "")) text += `WATERSPOUT...${sps.spout === "waterspoutObserved" ? "OBSERVED" : "POSSIBLE"}\n`;
      text += `MAX HAIL SIZE...${hail.size ? hail.size.toFixed(2) : "0.00"} IN\n`;
      text += `MAX WIND GUST...${wind.speed >= 50 ? "50" : wind.speed >= 40 ? "40" : "<40"} MPH\n\n`;
    }
    text += `$$\n`;
    return text;
  }

  function buildSpsCancelExpire(state, now, expire, office) {
    const isCancel = state.action === "CAN";
    const areas = areaNames(state);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const areaPhrase = areas.length
      ? areas.map((area) => area.replace(/\s+County$/i, "").toUpperCase()).join("...") +
        (areas.length === 1 ? " COUNTY" : " COUNTIES")
      : "THE AFFECTED AREA";
    const ending = isCancel ? "HAS BEEN CANCELLED" : "HAS EXPIRED";
    const explanation = isCancel
      ? "The weather threat which prompted the Special Weather Statement has ended. Therefore, the statement has been cancelled."
      : "The weather threat which prompted the Special Weather Statement has ended. Therefore, the statement has been allowed to expire.";

    let text = "";
    text += `WWUS83 K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `SPS${office.siteId}\n\n`;
    text += `Special Weather Statement\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `${ugcLine}\n`;
    if (areas.length) text += `${areas.map((area) => area.toUpperCase().replace(/\s+COUNTY$/i, "")).join("-")}-\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `...THE SPECIAL WEATHER STATEMENT FOR ${areaPhrase} ${ending}...\n\n`;
    text += `${explanation}\n\n`;
    text += `&&\n\n`;
    text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    text += `$$\n`;
    return text;
  }

  // ─── SMW (NWS SMW.vm / MA.W Special Marine Warning) ─────────────────────

  function smwThreatPhrases(smw) {
    const windMap = {
      none: { tag: "<34", type: "", cta: "gusty winds" },
      kt34: { tag: ">34", type: "winds 34 knots or greater", cta: "wind gusts 34 knots or greater" },
      kt40: { tag: "40", type: "winds to 40 knots", cta: "wind gusts to 40 knots" },
      kt40plus: { tag: "40", type: "winds to nearly 50 knots", cta: "wind gusts to nearly 50 knots" },
      kt50: { tag: "50", type: "dangerous winds in excess of 50 knots", cta: "wind gusts in excess of 50 knots" },
      kt65: { tag: "65", type: "dangerous capsizing winds in excess of 65 knots", cta: "wind gusts in excess of 65 knots" }
    };
    const hailMap = {
      none: { tag: "0.00", type: "", cta: "" },
      small: { tag: "<.75", type: "small hail", cta: ", small hail" },
      large: { tag: ">.75", type: "large hail", cta: ", large hail" },
      destructive: { tag: ">2.0", type: "large destructive hail", cta: ", large destructive hail" }
    };
    const wind = windMap[smw.windId] || windMap.none;
    const hail = hailMap[smw.hailId] || hailMap.none;
    let severeType = "strong";
    if (["kt50", "kt65"].includes(smw.windId) || ["large", "destructive"].includes(smw.hailId) || smw.spout !== "none") {
      severeType = "severe";
    }
    let spoutType = "";
    if (smw.spout === "sighted" || smw.spout === "possible") spoutType = "waterspouts";

    const parts = [];
    if (spoutType) parts.push(spoutType);
    if (wind.type) parts.push(wind.type);
    if (hail.type) parts.push(hail.type);
    let threat = "";
    if (parts.length === 3) threat = `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
    else if (parts.length === 2) threat = `${parts[0]} and ${parts[1]}`;
    else if (parts.length === 1) threat = parts[0];
    else threat = "!** YOU DID NOT SELECT ANY THREATS. PLEASE RE-GENERATE THIS WARNING **!";

    if (smw.ashfall && smw.debrisFlow) threat = "ashfall and debris flow";
    else if (smw.ashfall) threat = "ashfall";
    else if (smw.debrisFlow) threat = "debris flow";

    return {
      wind,
      hail,
      severeType,
      spoutType,
      threat,
      windHailTag: `WIND...HAIL ${wind.tag}KTS ${hail.tag}IN`,
      capable: smw.spout === "possible" || smw.basis === "doppler" || smw.basis === "satellite" ? "capable of " : ""
    };
  }

  function smwEventPhrases(state, smw) {
    const isLine = state.stormType === "line";
    let eventType = smw.eventType || "thunderstorm";
    let eventType2 = eventType === "thunderstorm" ? "storm" : eventType;
    const t = smwThreatPhrases(smw);
    if (eventType === "thunderstorm") {
      eventType = `${t.severeType} thunderstorm`;
      eventType2 = "storm";
    }
    let stormline = `a ${eventType}`;
    let secondStorm = `This ${eventType2} was`;
    let pathheader = `The ${eventType}`;
    let specialEvent = `this ${eventType}`;
    if (isLine && eventType !== "front" && eventType !== "volcano") {
      stormline = `${eventType}s`;
      secondStorm = `These ${eventType2}s were`;
      pathheader = `${eventType}S`;
      specialEvent = `these ${eventType}s`;
    }
    if (eventType === "front") {
      stormline = "a front";
      secondStorm = "This front was";
      pathheader = "The front";
      specialEvent = "this front";
    }
    if (eventType === "volcano" || smw.ashfall || smw.debrisFlow) {
      stormline = "an eruption of !** NAME OF VOLCANO **! volcano";
      secondStorm = "This volcano was";
      pathheader = t.threat.includes("and") ? "the volcanic ash and debris flow" : `the ${t.threat}`;
      specialEvent = pathheader;
    }
    return { eventType, eventType2, stormline, secondStorm, pathheader, specialEvent, t };
  }

  function smwBasisReport(state, smw, phrases) {
    const { stormline, secondStorm, t } = phrases;
    const capable = t.capable;
    const producing = smw.spout === "sighted" && (smw.basis === "doppler" || smw.basis === "satellite")
      ? "producing"
      : `${capable}producing`;
    const basisMap = {
      doppler: `Doppler radar indicated ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      satellite: `satellite imagery indicated ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      marineSpotter: `marine weather spotters reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      mariner: `a mariner reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      public: `the public reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      pilot: `a pilot reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      coastGuard: `the Coast Guard reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      lawEnforcement: `law enforcement reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      emergencyManagement: `emergency management reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      ship: `a ship reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `,
      buoy: `a buoy reported ${stormline}, ${producing} ${t.threat}. ${secondStorm} `
    };
    return basisMap[smw.basis] || basisMap.doppler;
  }

  function buildSmw(state, now, expire, office) {
    const smw = state.smw || {};
    const phrases = smwEventPhrases(state, smw);
    const report = smwBasisReport(state, smw, phrases);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const vtec = vtecLine(office, "MA", "W", state, now, expire);
    const locPhrase = (state.locationOverride || state.locationPhrase || "over open waters").trim();
    const motion = motionSpeedDir(state);
    const until = formatClock(expire, office);
    const areas = areaNames(state, false);
    const zoneLines = areas.length
      ? areas.map((a) => `${a}...`).join("\n")
      : "!** NO MARINE ZONES SELECTED **!...";

    // WMO WHUS5x — region digit similar to coastal products
    const regionDigit =
      office.siteId === "RIW" ? "5" : office.siteId === "OHX" || office.siteId === "HUN" || office.siteId === "DLH" || office.siteId === "BIS" ? "3" : "4";

    const followup = String(state.action || "NEW").toUpperCase() !== "NEW";
    let text = `WHUS5${regionDigit} K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `${followup ? "MWS" : "SMW"}${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n\n`;
    if (!followup) text += `BULLETIN - IMMEDIATE BROADCAST REQUESTED\n`;
    text += `${followup ? "Marine Weather Statement" : "Special Marine Warning"}\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;

    if (smw.ashfall) {
      text += `...Ashfall Warning for Volcanic Ash and Other Hazards for...\n\n`;
    } else {
      text += `...Special Marine Warning for...\n\n`;
    }
    text += `${zoneLines}\n\n`;
    text += `* Until ${until}.\n\n`;

    // Third bullet — location + basis + motion
    let third = `* At ${formatClock(now, office)}, ${report}located ${locPhrase}`;
    if (motion.speed > 0 && !motion.stationary) {
      third += `, moving ${motion.dir || "east"} at ${Math.round(motion.speed)} mph`;
    } else {
      third += `, nearly stationary`;
    }
    third += ".\n\n";
    text += third;

    // Hazard / impact — SOURCE is basis only (no trailing "This storm was")
    const sourceOnly = String(report || "")
      .replace(/\s*This\s+(?:storm|shower|cloud|front|volcano)\s+was\s*$/i, "")
      .replace(/\s*These\s+\S+\s+were\s*$/i, "")
      .trim()
      .replace(/\.\s*$/, "");
    text += `* HAZARD...${phrases.t.threat.charAt(0).toUpperCase()}${phrases.t.threat.slice(1)}.\n\n`;
    text += `* SOURCE...${sourceOnly || "Doppler radar"}.\n\n`;
    text += `* IMPACT...${phrases.specialEvent.charAt(0).toUpperCase()}${phrases.specialEvent.slice(1)} will create hazardous conditions for boaters and mariners. Seek safe harbor immediately.\n\n`;

    if (smw.listLocations !== false && areas.length) {
      text += `* Marine areas impacted include...\n${areas.join(", ")}.\n\n`;
    }

    // CTAs
    const c = smw.ctas || {};
    const ctas = [];
    if (c.seekSafeHarbor !== false) {
      ctas.push("Mariners can expect gusty winds, rough seas, and reduced visibility. Seek safe harbor immediately.");
    }
    if (c.boaters !== false) {
      ctas.push("If you are on the water, return to shore as soon as possible. Do not attempt to ride out this storm.");
    }
    if (c.moveIndoors) {
      ctas.push("If on land near the water, move indoors and stay away from windows.");
    }
    if (c.lightning) {
      ctas.push("Frequent cloud to ground lightning is occurring with this storm. Lightning can strike 10 miles away from a thunderstorm. Seek a safe shelter.");
    }
    if (c.delayBoating) {
      ctas.push("Boaters should delay departure until this warning expires and conditions improve.");
    }
    if (smw.ashfall) {
      ctas.push("Ash is an eye and respiratory irritant and is abrasive. Those with respiratory sensitivities should take extra precautions to minimize exposure. Protect electronics and cover air intakes if ashfall is expected or confirmed.");
    }
    if (ctas.length) {
      text += `PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\n`;
      ctas.forEach((line) => {
        text += `${line}\n\n`;
      });
      text += `&&\n\n`;
    }

    text += `${phrases.t.windHailTag}\n\n`;
    if (state.polygon) {
      const latLon = WG.formatLatLonLine(state.polygon);
      if (latLon && !/\bNaN\b/i.test(latLon)) {
        text += `${latLon}\n\n`;
      } else {
        console.warn("[smw] LAT...LON skipped — no valid coordinates on product polygon");
      }
    }
    const tml = WG.formatTml(state.motion, state.location, now.getTime());
    if (tml && !/\bNaN\b/i.test(tml)) text += `${tml}\n\n`;
    text += `$$\n`;
    return text;
  }

  function buildSmwCancelExpire(state, now, expire, office) {
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const vtec = vtecLine(office, "MA", "W", state, now, expire);
    const action = String(state.action || "CAN").toUpperCase();
    const regionDigit =
      office.siteId === "RIW" ? "5" : office.siteId === "OHX" || office.siteId === "HUN" || office.siteId === "DLH" || office.siteId === "BIS" ? "3" : "4";
    const areas = areaNames(state, false);
    let text = `WHUS5${regionDigit} K${office.siteId} ${formatWmoStamp(now)}\n`;
    text += `MWS${office.siteId}\n`;
    text += `${ugcLine}\n`;
    text += `${vtec}\n\n`;
    text += `Marine Weather Statement\n`;
    text += `ZASNet Weather Service ${office.officeShort}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n`;
    text += `...THE SPECIAL MARINE WARNING FOR ${areas.slice(0, 6).join("...").toUpperCase() || "THE WARNED WATERS"} ${action === "CAN" ? "IS CANCELLED" : "HAS EXPIRED"}...\n\n`;
    if (action === "CAN") {
      text += `The threat has diminished and the Special Marine Warning is no longer in effect.\n\n`;
    } else {
      text += `The Special Marine Warning has expired. Mariners should continue to monitor conditions.\n\n`;
    }
    text += `$$\n`;
    return text;
  }

  function buildMws(state, now, expire, office) {
    const smw = state.smw || {};
    const mws = state.mws || {};
    const areas = areaNames(state, false);
    const ugcLine = WG.formatUgcLine(ugcCodes(state), expire);
    const location = (state.locationOverride || state.locationPhrase || "over the affected waters").trim();
    const motion = motionSpeedDir(state);
    const kind = String(smw.eventType || "thunderstorm");
    const labels = { thunderstorm: "A STRONG THUNDERSTORM APPROACHING THE WATERS", shower: "GUSTY SHOWERS OVER THE WATERS", cloud: "HAZARDOUS CLOUD DEVELOPMENT", front: "A FRONT CROSSING THE WATERS", fog: "DENSE FOG AFFECTING THE WATERS", debris: "MARINE DEBRIS OR HAZARDOUS MATERIAL", ice: "SIGNIFICANT ICE CONDITIONS", freezingSpray: "FREEZING SPRAY CONDITIONS", volcano: "VOLCANIC IMPACTS OVER THE WATERS" };
    const descriptions = { fog: "Areas of dense fog may cause abrupt visibility changes to one nautical mile or less.", debris: "Marine debris or hazardous material may create a hazard to navigation.", ice: "Changing sea or lake ice conditions may affect marine operations.", freezingSpray: "Freezing spray may result in ice accumulation on vessels.", volcano: "Volcanic ash or debris may affect visibility, machinery, and vessel operations." };
    const wind = { kt30: "winds to around 30 knots", kt34: "winds to 33 knots", none: "locally hazardous conditions" }[smw.windId] || "winds to around 30 knots";
    const regionDigit = office.siteId === "RIW" ? "5" : (["OHX", "HUN", "DLH", "BIS"].includes(office.siteId) ? "3" : "4");
    let text = `FZUS7${regionDigit} K${office.siteId} ${formatWmoStamp(now)}\nMWS${office.siteId}\n\n`;
    text += `Marine Weather Statement\nZASNet Weather Service ${office.officeShort}\n${WG.formatHeaderTime(now, office)}\n\n${ugcLine}\n`;
    if (areas.length) text += `${areas.join("-")}\n`;
    text += `${WG.formatHeaderTime(now, office)}\n\n...${String(mws.headline || labels[kind] || labels.thunderstorm).toUpperCase()}...\n\n`;
    text += `The areas affected include...\n${areas.map((area) => `${area}...`).join("\n") || "The affected marine waters..."}\n\n`;
    text += `${mws.details || descriptions[kind] || `At ${formatClock(now, office)}, ${kind === "thunderstorm" ? "Doppler radar indicated a strong thunderstorm" : `hazardous marine weather was occurring`} ${location}${motion.speed > 0 && !motion.stationary ? `, moving ${motion.dir} at ${Math.round(motion.speed)} knots` : ""}. Mariners can expect ${wind}${mws.visibility ? ` with visibility ${mws.visibility}` : ""}.`}\n\n`;
    text += `PRECAUTIONARY/PREPAREDNESS ACTIONS...\n\nMariners should use caution, reduce speed when visibility is restricted, and be prepared to seek safe harbor if conditions worsen.\n\n&&\n\n`;
    if (state.polygon) text += `${WG.formatLatLonLine(state.polygon)}\n\n`;
    const tml = WG.formatTml(state.motion, state.location, now.getTime());
    if (tml && !/NaN/i.test(tml)) text += `${tml}\n\n`;
    text += `$$\n`;
    return text;
  }

  function generateProductText(state, options = {}) {
    const office = WG.getOffice(state.wfo);
    const now = options.now ? new Date(options.now) : new Date();
    const minutes = Number(state.validMinutes) || WG.getProductMeta(state.product).defaultMinutes;
    let expire;
    if (state.action === "CAN") {
      expire = now;
    } else if (options.expireAt) {
      // Issue/update already ceiled; still snap so drafts stay on the quarter.
      expire = WG.roundUpToNextQuarterHour(new Date(options.expireAt));
    } else if (state.action === "EXP") {
      expire = state.expiresAt ? new Date(state.expiresAt) : now;
    } else if (state.expiresAt && (state.action === "CON" || options.keepExpire)) {
      expire = new Date(state.expiresAt);
    } else {
      expire = WG.computeExpireTime(now, minutes);
    }

    switch (state.product) {
      case "TOR":
        if (state.action === "CAN" || state.action === "EXP") {
          return buildWarningCancelExpireStatement(state, now, expire, office);
        }
        if (state.action === "CON") {
          return buildSevereWeatherStatement(state, now, expire, office);
        }
        return buildTor(state, now, expire, office);
      case "FFW":
        return buildFfw(state, now, expire, office);
      case "FAW":
        return buildAfw(state, now, expire, office);
      case "FAY":
        return buildFay(state, now, expire, office);
      case "FRW":
        return buildFrw(state, now, expire, office);
      case "SQW":
        return buildSqw(state, now, expire, office);
      case "DSW":
      case "DSY":
        return buildDsw(state, now, expire, office);
      case "SPS":
        if (state.action === "CAN" || state.action === "EXP") {
          return buildSpsCancelExpire(state, now, expire, office);
        }
        return buildSps(state, now, expire, office);
      case "SMW":
        if (state.action === "CAN" || state.action === "EXP") {
          return buildSmwCancelExpire(state, now, expire, office);
        }
        return buildSmw(state, now, expire, office);
      case "MWS":
        return buildMws(state, now, expire, office);
      case "SVR":
      default:
        if (state.action === "CAN" || state.action === "EXP") {
          return buildWarningCancelExpireStatement(state, now, expire, office);
        }
        if (state.action === "CON") {
          return buildSevereWeatherStatement(state, now, expire, office);
        }
        return buildSvr(state, now, expire, office);
    }
  }

  global.WarnGenTemplates = {
    generateProductText,
    hailOption,
    windOption,
    vtecLine,
    formatVtecTime,
    cityListPhrase,
    patchBulletinEtn
  };
})(typeof window !== "undefined" ? window : globalThis);
