/**
 * SPC-style watch product text (practice desk).
 *
 * Layout follows operational SEL / WOU products as published at:
 *   https://www.spc.noaa.gov/products/watch/wwNNNN.html
 * (e.g. ww0444.html — SEL public text + WOU county outline update)
 *
 * Branded ZASNetwork Storm Prediction Center (not NWS).
 */
(function (global) {
  "use strict";

  const STATE_NAMES = {
    AL: "Alabama",
    AR: "Arkansas",
    AZ: "Arizona",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DC: "District of Columbia",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    IA: "Iowa",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    MA: "Massachusetts",
    MD: "Maryland",
    ME: "Maine",
    MI: "Michigan",
    MN: "Minnesota",
    MO: "Missouri",
    MS: "Mississippi",
    MT: "Montana",
    NC: "North Carolina",
    ND: "North Dakota",
    NE: "Nebraska",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NV: "Nevada",
    NY: "New York",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VA: "Virginia",
    VT: "Vermont",
    WA: "Washington",
    WI: "Wisconsin",
    WV: "West Virginia",
    WY: "Wyoming"
  };

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_UP = MONTHS.map((m) => m.toUpperCase());

  const IND = "   "; // SPC public text body indent

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  function pad4(n) {
    return String(n).padStart(4, "0");
  }

  function localParts(date, tzOffsetHours) {
    const d = new Date(date.getTime() + tzOffsetHours * 3600_000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate(),
      dow: d.getUTCDay(),
      hours: d.getUTCHours(),
      minutes: d.getUTCMinutes()
    };
  }

  /** Classic SPC clock: 1140 PM, 600 AM, Midnight (no colon). */
  function formatSpcClock(date, tzOffsetHours) {
    const p = localParts(date, tzOffsetHours);
    if (p.hours === 0 && p.minutes === 0) {
      return "Midnight";
    }
    if (p.hours === 12 && p.minutes === 0) {
      return "Noon";
    }
    let h = p.hours;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) {
      h = 12;
    }
    return `${h}${pad2(p.minutes)} ${ampm}`;
  }

  /** 1140 PM CDT Thu Jul 2 2026 */
  function formatHeaderTime(date, office) {
    const p = localParts(date, office.tzOffsetHours);
    const clock = formatSpcClock(date, office.tzOffsetHours);
    const dow = DAYS[p.dow].slice(0, 3);
    return `${clock} ${office.tz} ${dow} ${MONTHS[p.month]} ${p.day} ${p.year}`;
  }

  /** WOU header: 1140 PM CDT THU JUL 2 2026 */
  function formatHeaderTimeUpper(date, office) {
    const p = localParts(date, office.tzOffsetHours);
    const clock = formatSpcClock(date, office.tzOffsetHours);
    const dow = DAYS[p.dow].slice(0, 3).toUpperCase();
    return `${clock} ${office.tz} ${dow} ${MONTHS_UP[p.month]} ${p.day} ${p.year}`;
  }

  function dayName(date, tzOffsetHours) {
    return DAYS[localParts(date, tzOffsetHours).dow];
  }

  function dayPartLabel(hour) {
    if (hour < 12) {
      return "morning";
    }
    if (hour < 17) {
      return "afternoon";
    }
    if (hour < 21) {
      return "evening";
    }
    return "night";
  }

  /**
   * "this Thursday night and Friday morning"
   * "this Friday afternoon"
   */
  function effectivePeriodPhrase(now, expireAt, office) {
    const a = localParts(now, office.tzOffsetHours);
    const b = localParts(expireAt, office.tzOffsetHours);
    const sameDay = a.year === b.year && a.month === b.month && a.day === b.day;
    const startPart = dayPartLabel(a.hours);
    const endPart = dayPartLabel(b.hours);
    const day = dayName(now, office.tzOffsetHours);

    if (sameDay) {
      if (startPart === endPart) {
        return `this ${day} ${startPart}`;
      }
      if (a.hours < 17 && b.hours >= 17 && b.hours < 21) {
        return `this ${day} afternoon and evening`;
      }
      if (a.hours >= 12 && a.hours < 17 && b.hours >= 21) {
        return `this ${day} afternoon and night`;
      }
      return `this ${day} ${startPart} and ${endPart}`;
    }
    const endDay = dayName(expireAt, office.tzOffsetHours);
    // overnight into next morning is very common
    if ((startPart === "evening" || startPart === "night") && endPart === "morning") {
      return `this ${day} ${startPart} and ${endDay} morning`;
    }
    return `this ${day} ${startPart} through ${endDay} ${endPart}`;
  }

  function wrapText(text, width = 68, indent = IND) {
    const words = String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ");
    if (!words[0]) {
      return [];
    }
    const lines = [];
    let cur = indent;
    words.forEach((w) => {
      const next = cur === indent ? indent + w : `${cur} ${w}`;
      if (next.length > width && cur !== indent) {
        lines.push(cur);
        cur = indent + w;
      } else {
        cur = next;
      }
    });
    if (cur.trim()) {
      lines.push(cur);
    }
    return lines;
  }

  function hailOpt(hailId) {
    return (global.SpcDesk.HAIL_OPTIONS || []).find((h) => h.id === hailId) || null;
  }

  function windOpt(windId) {
    return (global.SpcDesk.WIND_OPTIONS || []).find((w) => w.id === windId) || null;
  }

  /**
   * Primary threats — operational SEL wording.
   * TOA example (WW 406): "A few tornadoes and a couple intense tornadoes possible"
   * SVA example (WW 444): "Scattered damaging wind gusts to 70 mph possible"
   */
  function primaryThreatLines(state) {
    const lines = [];
    const wind = windOpt(state.windId);
    const hail = hailOpt(state.hailId);
    const isTor = state.product === "TOA";

    // ── Tornado line (TOA first; optional on SVA) ──
    if (isTor) {
      if (state.pds) {
        // Classic PDS-style (stronger wording)
        lines.push("Several tornadoes and a few intense tornadoes likely");
      } else if (state.intenseTornadoes) {
        lines.push("A few tornadoes and a couple intense tornadoes possible");
      } else {
        lines.push("A few tornadoes possible");
      }
    } else if (state.tornadoes) {
      // SVA often lists this last (ww0444)
      // added after wind/hail below
    }

    // ── Wind ──
    if (wind && wind.mph) {
      if (state.significantWind) {
        // TOR WW 406 / high-end SVA:
        // "Scattered damaging winds likely with isolated significant gusts to 90 mph possible"
        lines.push(
          `Scattered damaging winds likely with isolated significant gusts to ${wind.mph} mph possible`
        );
      } else if (wind.mph >= 70) {
        lines.push(`Scattered damaging wind gusts to ${wind.mph} mph possible`);
      } else {
        lines.push(`Scattered damaging wind gusts to ${wind.mph} mph possible`);
      }
    }

    // ── Hail ──
    if (hail && hail.inches) {
      const inches = hail.inches % 1 === 0 ? String(hail.inches) : hail.inches.toFixed(1);
      if (state.veryLargeHail && isTor) {
        // TOR WW 406: "Scattered large hail likely with isolated very large hail events to 3.5 inches..."
        lines.push(
          `Scattered large hail likely with isolated very large hail events to ${inches} inches in diameter possible`
        );
      } else if (state.veryLargeHail) {
        lines.push(
          `Isolated very large hail events to ${inches} inches in diameter possible`
        );
      } else if (hail.inches >= 1.5) {
        lines.push(`Scattered large hail events to ${inches} inches in diameter possible`);
      } else {
        lines.push(`Isolated large hail events to ${inches} inches in diameter possible`);
      }
    }

    // SVA optional tornado tag (usually last)
    if (!isTor && state.tornadoes) {
      lines.push("A tornado or two possible");
    }

    if (!lines.length) {
      lines.push(
        isTor
          ? "A few tornadoes possible"
          : "Scattered severe thunderstorms possible"
      );
    }
    return lines;
  }

  function portionLines(state) {
    const free = String(state.portionsText || "")
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (free.length) {
      return free;
    }
    const states = state.states || [];
    if (!states.length) {
      return ["the outlined watch area"];
    }
    // Operator should fill geographic descriptors; fallback is full state names
    return states.map((s) => {
      const abbr = (s.abbr || "").toUpperCase();
      return STATE_NAMES[abbr] || abbr;
    });
  }

  function haversineMiles(a, b) {
    if (global.WarnGen && typeof global.WarnGen.haversineMiles === "function") {
      return global.WarnGen.haversineMiles(a, b);
    }
    const R = 3958.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function bearingDeg(a, b) {
    if (global.WarnGen && typeof global.WarnGen.initialBearingDeg === "function") {
      return global.WarnGen.initialBearingDeg(a, b);
    }
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const dLon = toRad(b[0] - a[0]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function compass16(deg) {
    if (global.WarnGen && typeof global.WarnGen.compass16 === "function") {
      return global.WarnGen.compass16(deg);
    }
    const dirs = [
      "north",
      "north northeast",
      "northeast",
      "east northeast",
      "east",
      "east southeast",
      "southeast",
      "south southeast",
      "south",
      "south southwest",
      "southwest",
      "west southwest",
      "west",
      "west northwest",
      "northwest",
      "north northwest"
    ];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function ringFromPolygon(polygon) {
    if (!polygon || !polygon.coordinates) {
      return null;
    }
    if (polygon.type === "Polygon") {
      return polygon.coordinates[0];
    }
    if (polygon.type === "MultiPolygon") {
      return polygon.coordinates[0] && polygon.coordinates[0][0];
    }
    return null;
  }

  function nearestPlace(lngLat, places) {
    const list = Array.isArray(places) ? places : [];
    let best = null;
    let bestD = Infinity;
    list.forEach((p) => {
      const c = p.coordinates || (p.geometry && p.geometry.coordinates);
      if (!c || c.length < 2) {
        return;
      }
      const d = haversineMiles(lngLat, c);
      const rankBoost = Number(p.rank) >= 1 && Number(p.rank) <= 3 ? -2 : 0;
      const score = d + rankBoost;
      if (score < bestD) {
        bestD = score;
        best = { name: p.name, state: p.state || "", miles: d, coordinates: c };
      }
    });
    return best;
  }

  function describeEndpoint(lngLat, places) {
    const near = nearestPlace(lngLat, places);
    if (!near || !near.name) {
      return `${lngLat[1].toFixed(1)}N ${Math.abs(lngLat[0]).toFixed(1)}W`;
    }
    const miles = Math.max(5, Math.round(near.miles / 5) * 5);
    const brg = compass16(bearingDeg(near.coordinates, lngLat));
    const st = (near.state || "").toUpperCase().slice(0, 2);
    if (miles <= 10) {
      return `near ${near.name}${st ? ` ${st}` : ""}`;
    }
    // "50 miles east southeast of Storm Lake IA"
    return `${miles} miles ${brg} of ${near.name}${st ? ` ${st}` : ""}`;
  }

  function estimateHalfWidthMiles(ring, a, b) {
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const abx = bx - ax;
    const aby = by - ay;
    const abLen2 = abx * abx + aby * aby || 1e-9;
    let sum = 0;
    let n = 0;
    const step = Math.max(1, Math.floor(ring.length / 24));
    for (let i = 0; i < ring.length - 1; i += step) {
      const p = ring[i];
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * abx + (p[1] - ay) * aby) / abLen2));
      const proj = [ax + t * abx, ay + t * aby];
      sum += haversineMiles(p, proj);
      n += 1;
    }
    return n ? sum / n : 60;
  }

  /**
   * "approximately along and 45 statute miles north and south of a line from
   *  10 miles south southwest of Ainsworth NE to 50 miles east southeast of Storm Lake IA"
   */
  function watchAxisDescription(state) {
    if (state.axisOverride && String(state.axisOverride).trim()) {
      return String(state.axisOverride).trim().replace(/^the\s+/i, "");
    }
    const ring = ringFromPolygon(state.polygon);
    if (!ring || ring.length < 3) {
      return "the outlined watch area";
    }

    let a = ring[0];
    let b = ring[Math.floor(ring.length / 2)];
    let maxD = 0;
    const step = Math.max(1, Math.floor(ring.length / 48));
    for (let i = 0; i < ring.length - 1; i += step) {
      for (let j = i + step; j < ring.length - 1; j += step) {
        const d = haversineMiles(ring[i], ring[j]);
        if (d > maxD) {
          maxD = d;
          a = ring[i];
          b = ring[j];
        }
      }
    }

    const halfWidth = estimateHalfWidthMiles(ring, a, b);
    const widthMi = Math.max(25, Math.min(120, Math.round(halfWidth / 5) * 5 || 45));
    const places = (state.places || []).map((p) => ({
      name: p.name,
      state: p.state,
      rank: p.rank,
      coordinates: p.coordinates
    }));
    const endA = describeEndpoint(a, places);
    const endB = describeEndpoint(b, places);
    const axisBrg = bearingDeg(a, b);
    const cross =
      (axisBrg >= 45 && axisBrg < 135) || (axisBrg >= 225 && axisBrg < 315)
        ? "east and west"
        : "north and south";

    return (
      `approximately along and ${widthMi} statute miles ${cross} of a line from ${endA} to ${endB}`
    );
  }

  function defaultSummary(state, wind, hail) {
    const portions = portionLines(state);
    const area =
      portions.length <= 3 ? portions.join(", ").replace(/, ([^,]+)$/, " and $1") : "the Watch";
    if (state.product === "TOA") {
      // Tone of WW 406 Tornado Watch SUMMARY
      return (
        `Significant severe storms including supercells are expected to develop regionally across ${area}, ` +
        `with large hail and some tornadoes possible.` +
        (wind && wind.mph
          ? ` A prominent damaging wind threat may also unfold during the valid period of the Watch.`
          : "")
      );
    }
    const windBit =
      wind && wind.mph
        ? ` Bouts of damaging winds will be possible, with gusts near ${Math.max(60, wind.mph - 10)} to ${wind.mph} mph.`
        : " Damaging winds will be possible.";
    const hailBit =
      hail && hail.inches >= 1.5
        ? ` Isolated large hail is also possible.`
        : hail && hail.inches
          ? ` A few instances of large hail are possible as well.`
          : "";
    return (
      `Occasionally strong to severe thunderstorms are expected across ${area} during the valid period of the Watch.` +
      windBit +
      hailBit
    );
  }

  function otherWatchLine(otherWatches, thisNumber) {
    const list = (otherWatches || [])
      .filter((w) => w && w.status === "active" && Number(w.watchNumber) !== Number(thisNumber))
      .map((w) => Number(w.watchNumber))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    if (!list.length) {
      return null;
    }
    // OTHER WATCH INFORMATION...CONTINUE...WW 441...WW 442...WW 443...
    return `OTHER WATCH INFORMATION...CONTINUE...${list.map((n) => `WW ${n}`).join("...")}...`;
  }

  function aviationParagraph(state, wind, hail) {
    const hailIn =
      hail && hail.inches
        ? hail.inches % 1 === 0
          ? String(hail.inches)
          : hail.inches.toFixed(1)
        : "1";
    const knots =
      wind && wind.mph ? Math.round(wind.mph * 0.868976) : 60; // mph → kt approx
    const tops = state.maxTops || 500;
    const motion = state.stormMotion || "27025";
    return (
      `AVIATION...A few severe thunderstorms with hail surface and aloft to ` +
      `${hailIn} inches. Extreme turbulence and surface wind gusts to ${knots} knots. A ` +
      `few cumulonimbi with maximum tops to ${tops}. Mean storm motion vector ` +
      `${motion}.`
    );
  }

  function countyUgcCode(c) {
    const st = (c.state || "").toUpperCase().slice(0, 2);
    let fips = String(c.fips || c.ugc || "").replace(/\D/g, "");
    // Full FIPS is often 5 digits (SSCCC); UGC uses C + last 3
    if (fips.length >= 3) {
      fips = fips.slice(-3);
    } else {
      fips = pad3(fips || 0);
    }
    return `${st}C${fips}`;
  }

  function vtecForWatch(state, now, expireAt, action) {
    const Spc = global.SpcDesk;
    const meta = Spc.getProductMeta(state.product);
    const act = action || state.action || "NEW";
    const etn = pad4(state.watchNumber);
    const start = Spc.toUtcStamp(now);
    const end = Spc.toUtcStamp(expireAt);
    // /O.NEW.KWNS.SV.A.0444.260703T0440Z-260703T1100Z/
    return `/O.${act}.KWNS.${meta.phen}.${meta.sig}.${etn}.${start}-${end}/`;
  }

  /**
   * WOU-style county outline update (from real ww0444 WOU section).
   * Counties listed in columns under each state.
   */
  function generateWouText(state, times) {
    const Spc = global.SpcDesk;
    const meta = Spc.getProductMeta(state.product);
    const office = Spc.OFFICE;
    const now = times.now instanceof Date ? times.now : new Date(times.now);
    const expireAt = times.expireAt instanceof Date ? times.expireAt : new Date(times.expireAt);
    const wwNum = Number(state.watchNumber) || 0;
    const dig = String(wwNum).slice(-1);
    const expireClock = formatSpcClock(expireAt, office.tzOffsetHours);
    const action = state.action || "NEW";
    const vtec = vtecForWatch(state, now, expireAt, action);
    // UGC expire stamp ddhhmm
    const expUtc = new Date(expireAt.getTime());
    const ugcExp = `${pad2(expUtc.getUTCDate())}${pad2(expUtc.getUTCHours())}${pad2(expUtc.getUTCMinutes())}`;

    const lines = [];
    const wmoTime = `${pad2(now.getUTCDate())}${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`;
    lines.push(`WOUS64 ${office.wmo} ${wmoTime}`);
    lines.push(`WOU${dig}`);
    lines.push("");
    lines.push("BULLETIN - IMMEDIATE BROADCAST REQUESTED");
    lines.push(
      `${meta.wwTitle} OUTLINE UPDATE FOR WS ${wwNum}`.toUpperCase()
    );
    lines.push(`ZASNETWORK STORM PREDICTION CENTER NORMAN OK`);
    lines.push(formatHeaderTimeUpper(now, office));
    lines.push("");
    lines.push(
      `${meta.wwTitle.toUpperCase()} ${wwNum} IS IN EFFECT UNTIL ${expireClock.toUpperCase()} ${office.tz}`
    );
    lines.push("FOR THE FOLLOWING LOCATIONS");
    lines.push("");

    // Group counties by state
    const byState = new Map();
    (state.counties || []).forEach((c) => {
      const st = (c.state || "??").toUpperCase();
      if (!byState.has(st)) {
        byState.set(st, []);
      }
      byState.get(st).push(c);
    });

    const sortedStates = Array.from(byState.keys()).sort();
    sortedStates.forEach((st) => {
      const list = byState.get(st).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      // UGC string: IAC009-021-025-...-031100-
      const ugcs = list.map(countyUgcCode);
      const ugcLine = ugcs.join("-") + `-${ugcExp}-`;
      // wrap UGC at ~65
      let chunk = "";
      ugcLine.split("-").forEach((part, i, arr) => {
        const piece = i === 0 ? part : `-${part}`;
        if ((chunk + piece).length > 65 && chunk) {
          lines.push(chunk + (chunk.endsWith("-") ? "" : ""));
          // continuation without leading dash duplicate
          chunk = part;
        } else {
          chunk += piece;
        }
        if (i === arr.length - 1 && chunk) {
          lines.push(chunk);
        }
      });
      lines.push(vtec);
      lines.push("");
      lines.push(`${st} `);
      const fullName = (STATE_NAMES[st] || st).toUpperCase();
      lines.push(`.    ${fullName} COUNTIES INCLUDED ARE`);
      lines.push("");
      // 3-column county names, 20-char fields
      const names = list.map((c) => String(c.name || "").toUpperCase());
      for (let i = 0; i < names.length; i += 3) {
        const a = (names[i] || "").padEnd(20);
        const b = names[i + 1] != null ? (names[i + 1] || "").padEnd(20) : "";
        const c = names[i + 2] != null ? names[i + 2] : "";
        lines.push(`${a}${b}${c}`.trimEnd());
      }
      lines.push("");
      lines.push("");
    });

    lines.push("ATTN...WFO...ZAS...");
    lines.push("");
    return lines.join("\n");
  }

  /**
   * Public SEL product (matches ww0444.html SEL body).
   * @param {object} state
   * @param {{ now: Date, expireAt: Date, otherWatches?: array }} times
   */
  function generateSelText(state, times) {
    const Spc = global.SpcDesk;
    const meta = Spc.getProductMeta(state.product);
    const office = Spc.OFFICE;
    const now = times.now instanceof Date ? times.now : new Date(times.now);
    const expireAt = times.expireAt instanceof Date ? times.expireAt : new Date(times.expireAt);
    const wwNum = Number(state.watchNumber) || 0;
    const dig = String(wwNum).slice(-1);
    const action = state.action || "NEW";
    const wind = windOpt(state.windId);
    const hail = hailOpt(state.hailId);
    const lines = [];

    // Full WMO heading followed by the AWIPS identifier. SEL0–SEL9 uses the
    // final digit of the watch number, matching operational SPC products.
    const wmoTime = `${pad2(now.getUTCDate())}${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`;
    lines.push(`WWUS20 ${office.wmo} ${wmoTime}`);
    lines.push(`SEL${dig}`);
    lines.push("");

    if (action === "CAN") {
      lines.push("URGENT - IMMEDIATE BROADCAST REQUESTED");
      lines.push(`${IND}${meta.name} Number ${wwNum} Cancellation`);
      lines.push(`${IND}ZASNetwork Storm Prediction Center Norman OK`);
      lines.push(`${IND}${formatHeaderTime(now, office)}`);
      lines.push("");
      lines.push(`${IND}The ZASNetwork Storm Prediction Center has cancelled`);
      lines.push(`${IND}${meta.name} Number ${wwNum}.`);
      lines.push("");
      if (state.discussion && state.discussion.trim()) {
        wrapText(`SUMMARY...${state.discussion.trim()}`).forEach((l) => lines.push(l));
        lines.push("");
      }
      lines.push("&&");
      lines.push("");
      const fc = (state.forecaster || "ZASNETWORK").replace(/^\.+|\.+$/g, "");
      lines.push(`${IND}...${fc}`);
      return lines.join("\n");
    }

    lines.push("URGENT - IMMEDIATE BROADCAST REQUESTED");
    if (state.pds && state.product === "TOA") {
      lines.push(`${IND}...THIS IS A PARTICULARLY DANGEROUS SITUATION...`);
    }
    lines.push(`${IND}${meta.name} Number ${wwNum}`);
    lines.push(`${IND}ZASNetwork Storm Prediction Center Norman OK`);
    lines.push(`${IND}${formatHeaderTime(now, office)}`);
    lines.push("");

    if (state.replacing && action === "NEW") {
      const prev = String(state.replacing).replace(/\D/g, "") || state.replacing;
      lines.push(`${IND}Replaces Watch Number ${prev}`);
      lines.push("");
    }

    if (action === "CON") {
      lines.push(`${IND}The ZASNetwork Storm Prediction Center has updated`);
      lines.push(`${IND}${meta.name} Number ${wwNum}.`);
      lines.push("");
    } else {
      lines.push(`${IND}The ZASNetwork Storm Prediction Center has issued a`);
      lines.push("");
    }

    // * Severe Thunderstorm Watch for portions of
    lines.push(`${IND}* ${meta.name} for portions of `);
    portionLines(state).forEach((p) => {
      lines.push(`${IND}  ${p}`);
    });
    lines.push("");

    // * Effective this Thursday night and Friday morning from 1140 PM until 600 AM CDT.
    const period = effectivePeriodPhrase(now, expireAt, office);
    const startClock = formatSpcClock(now, office.tzOffsetHours);
    const endClock = formatSpcClock(expireAt, office.tzOffsetHours);
    wrapText(
      `* Effective ${period} from ${startClock} until ${endClock} ${office.tz}.`
    ).forEach((l) => lines.push(l));
    lines.push("");

    // * Primary threats include...
    lines.push(`${IND}* Primary threats include...`);
    primaryThreatLines(state).forEach((t) => {
      // long threat lines can wrap with continuation indent
      if (`${IND}  ${t}`.length <= 68) {
        lines.push(`${IND}  ${t}`);
      } else {
        wrapText(t, 66, `${IND}  `).forEach((l) => lines.push(l));
      }
    });
    lines.push("");

    // SUMMARY...
    const summaryBody =
      state.discussion && state.discussion.trim()
        ? state.discussion.trim()
        : defaultSummary(state, wind, hail);
    const summary = /^SUMMARY\.\.\./i.test(summaryBody)
      ? summaryBody
      : `SUMMARY...${summaryBody}`;
    wrapText(summary).forEach((l) => lines.push(l));
    lines.push("");

    // Axis paragraph
    const typeLower = meta.name.toLowerCase();
    const axis = watchAxisDescription(state);
    const axisPara =
      `The ${typeLower} area is ${axis.startsWith("approximately") || axis.startsWith("the ") ? axis : "approximately " + axis}. ` +
      `For a complete depiction of the watch see the associated watch outline update (WOUS64 KWNS WOU${dig}).`;
    wrapText(axisPara).forEach((l) => lines.push(l));
    lines.push("");

    // CTA — exact operational phrasing (WW 406 TOR / WW 444 SVA)
    lines.push("PRECAUTIONARY/PREPAREDNESS ACTIONS...");
    lines.push("");
    if (state.product === "TOA") {
      wrapText(
        "REMEMBER...A Tornado Watch means conditions are favorable for tornadoes and severe thunderstorms in and close to the watch area. Persons in these areas should be on the lookout for threatening weather conditions and listen for later statements and possible warnings."
      ).forEach((l) => lines.push(l));
    } else {
      wrapText(
        "REMEMBER...A Severe Thunderstorm Watch means conditions are favorable for severe thunderstorms in and close to the watch area. Persons in these areas should be on the lookout for threatening weather conditions and listen for later statements and possible warnings. Severe thunderstorms can and occasionally do produce tornadoes."
      ).forEach((l) => lines.push(l));
    }
    lines.push("");
    lines.push("&&");
    lines.push("");

    const other = otherWatchLine(times.otherWatches, wwNum);
    if (other) {
      wrapText(other).forEach((l) => lines.push(l));
      lines.push("");
    }

    wrapText(aviationParagraph(state, wind, hail)).forEach((l) => lines.push(l));
    lines.push("");

    // ...Guyer  (forecaster)
    const fc = (state.forecaster || "ZASNETWORK").replace(/^\.+|\.+$/g, "");
    lines.push(`${IND}...${fc}`);

    return lines.join("\n");
  }

  /**
   * Combined product: SEL (public) + blank line + WOU (county outline).
   * Matches the multi-product layout on spc.noaa.gov watch pages.
   */
  function generateWatchText(state, times) {
    const sel = generateSelText(state, times);
    const wou = generateWouText(state, times);
    return `${sel}\n\n${"─".repeat(48)}\nWOU / county outline\n${"─".repeat(48)}\n\n${wou}`;
  }

  global.SpcTemplates = {
    generateWatchText,
    generateSelText,
    generateWouText,
    portionLines,
    primaryThreatLines,
    watchAxisDescription,
    formatHeaderTime,
    formatSpcClock,
    STATE_NAMES
  };
})(typeof window !== "undefined" ? window : globalThis);
