"use strict";

const fs = require("fs");
const path = require("path");

const VTEC_ACTIONS = new Set(["NEW", "CON", "EXT", "EXA", "EXB", "CAN", "EXP"]);
const PHENOMENA = {
  TO: "TOR", SV: "SVR", FF: "FFW", FA: "FAW", MA: "SMW", SQ: "SQW", DS: "DSW",
  FW: "RFW", WS: "WSW", WW: "WSW", FL: "FLW", FA: "FAW", CF: "CFW", LS: "CFW",
  NP: "NPW", WC: "NPW", ZF: "NPW", HF: "NPW", RP: "CFW", BH: "CFW", SU: "CFW"
};
const SUPPORTED_PRODUCTS = new Set([
  "TOR", "SVR", "FFW", "FAW", "SPS", "SMW", "SQW", "DSW", "RFW", "WSW", "FLW", "FLS", "CFW", "NPW", "MWW", "MWS", "PNS", "NPW", "AQA"
]);

function parseVtecTime(value, receivedAt) {
  const match = String(value || "").match(/^(\d{2})(\d{2})(\d{2})T(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const base = new Date(receivedAt || Date.now());
  const year = 2000 + Number(match[1]);
  const candidate = new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])));
  // VTEC years are two digit; retain the product year, but reject impossible dates.
  return Number.isFinite(candidate.getTime()) ? candidate.toISOString() : null;
}

function parseWmoTime(value, receivedAt) {
  const m = String(value || "").match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const base = new Date(receivedAt || Date.now());
  const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Number(m[1]), Number(m[2]), Number(m[3])));
  if (candidate.getTime() - base.getTime() > 36 * 3600_000) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
  if (base.getTime() - candidate.getTime() > 335 * 24 * 3600_000) candidate.setUTCFullYear(candidate.getUTCFullYear() - 1);
  return candidate.toISOString();
}

function parseGeometry(text) {
  const marker = String(text).match(/LAT\.\.\.LON\s+([\s\S]*)/i);
  if (!marker) return null;
  const values = [];
  for (const pair of marker[1].matchAll(/(-?\d{3,5})\s+(-?\d{3,5})/g)) {
    const lat = Number(pair[1]) / 100;
    let lon = Number(pair[2]) / 100;
    if (lon > 0 && !String(pair[2]).startsWith("-")) lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) values.push([lon, lat]);
  }
  if (values.length < 3) return null;
  if (values[0][0] !== values.at(-1)[0] || values[0][1] !== values.at(-1)[1]) values.push(values[0]);
  return { type: "Polygon", coordinates: [values] };
}

function expandAreas(ugcCodes, dataDir) {
  const files = ["counties", "public-zones", "fire-zones", "marine-zones"];
  const wanted = new Set(ugcCodes);
  const areas = [];
  for (const file of files) {
    try {
      const collection = JSON.parse(fs.readFileSync(path.join(dataDir, "generated", "awips", `${file}.geojson`), "utf8"));
      for (const feature of collection.features || []) {
        const p = feature.properties || {};
        const code = String(p.STATE_ZONE || p.ID || p.UGC || p.ZONE || "").toUpperCase() ||
          (file === "counties" && p.STATE && p.FIPS ? `${String(p.STATE).toUpperCase()}C${String(p.FIPS).slice(-3)}` : "");
        if (!wanted.has(code)) continue;
        areas.push({
          ugc: code,
          id: code,
          name: String(p.COUNTYNAME || p.NAME || p.SHORTNAME || code),
          cwa: String(p.CWA || p.WFO || "").toUpperCase(),
          geometry: feature.geometry || null
        });
      }
    } catch { /* optional geographic data */ }
  }
  return areas;
}

function parseAwipsProduct({ rawText, receivedAt, source, site, dataDir, formatProductId }) {
  if (typeof rawText !== "string" || !rawText.trim()) throw new Error("rawText must be a non-empty string");
  if (Buffer.byteLength(rawText, "utf8") > 8_000_000) throw new Error("rawText exceeds the 8 MB limit");
  const text = rawText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const wmoMatch = text.match(/(?:^|\n)\s*([A-Z]{4}\d{2})\s+(K[A-Z0-9]{3})\s+(\d{6})\b/);
  const wmoHeader = wmoMatch?.[1] || null;
  const issuingOffice = wmoMatch?.[2] || (String(site || "").match(/K?[A-Z0-9]{3}/i)?.[0] || null);
  const wmoIssueTime = parseWmoTime(wmoMatch?.[3], receivedAt);
  const vtecs = [...text.matchAll(/\/O\.(NEW|CON|EXT|EXA|EXB|CAN|EXP)\.K?([A-Z0-9]{3})\.([A-Z]{2})\.([A-Z])\.(\d{4})\.(\d{6}T\d{4}Z)-(\d{6}T\d{4}Z)\//g)].map((m) => ({
    action: m[1], wfo: m[2], phenomenon: m[3], significance: m[4], etn: Number(m[5]), issuedAt: parseVtecTime(m[6], receivedAt), expiresAt: parseVtecTime(m[7], receivedAt), raw: m[0]
  }));
  const vtec = vtecs[0] || null;
  const pilIndex = wmoMatch ? lines.findIndex((line) => line.includes(wmoMatch[1])) + 1 : 0;
  const pil = lines.slice(pilIndex, pilIndex + 3).map((line) => line.trim()).find((line) => /^[A-Z0-9]{3,9}[A-Z]{3}$/.test(line) || /^[A-Z]{3,8}$/.test(line) && !/^\d/.test(line)) || null;
  const productFromPil = pil ? (pil.match(/^(TOR|SVR|FFW|SPS|SMW|SQW|DSW|RFW|WSW|FLW|FLS|CFW|NPW|MWW|MWS|PNS|AQA)/)?.[1] || null) : null;
  const product = productFromPil || (vtec && PHENOMENA[vtec.phenomenon]) || null;
  const ugcSet = new Set();
  for (const line of lines) {
    const match = line.trim().match(/^([A-Z]{2,3}[CZ])(\d{3}(?:-\d{3})*)-\d{6}-/);
    if (!match) continue;
    const prefix = match[1];
    match[2].split("-").forEach((suffix) => ugcSet.add(`${prefix}${suffix}`));
  }
  const ugcCodes = [...ugcSet];
  const geometry = parseGeometry(text);
  const motionMatch = text.match(/MOV(?:ING|EMENT)\s+([A-Z]{1,8})\s+AT\s+(\d{1,3})\s*MPH/i) || text.match(/MOVING\s+([A-Z]{1,8})\s+(\d{1,3})\s*KT/i);
  const hailMatch = text.match(/(?:HAIL|MAX HAIL SIZE)\D{0,20}(\d+(?:\.\d+)?)\s*(?:INCH|IN\.?)/i);
  const gustMatch = text.match(/(?:WIND GUSTS?|GUSTS?)\D{0,12}(\d{2,3})\s*MPH/i);
  const segmentMatch = text.match(/(?:PART|SEGMENT|SEQUENCE)\s*(\d+)\s*(?:OF|\/)\s*(\d+)/i);
  const tags = {
    emergency: /FLASH FLOOD EMERGENCY|TORNADO EMERGENCY/i.test(text),
    pds: /PARTICULARLY DANGEROUS SITUATION|\bPDS\b/i.test(text),
    damageThreat: /CATASTROPHIC|CONSIDERABLE/i.test(text) ? (/(?:CATASTROPHIC|CONSIDERABLE)/i.exec(text)?.[0].toLowerCase() || null) : null
  };
  const action = vtec?.action || (product === "SPS" ? "NEW" : null);
  if (!product && !wmoHeader && !pil) throw new Error("Unsupported product: no WMO header, PIL, or VTEC found");
  if (!product) throw new Error("Unsupported product type: product could not be identified from PIL or VTEC");
  if (!SUPPORTED_PRODUCTS.has(product)) throw new Error(`Unsupported product type: ${product}`);
  const wfo = (vtec?.wfo || issuingOffice || site || "").replace(/^K/i, "").toUpperCase().slice(0, 3);
  const etn = vtec?.etn || 0;
  const productId = typeof formatProductId === "function"
    ? formatProductId(wfo, product || "AWIPS", etn)
    : `${wfo}${product || "AWIPS"}${String(etn).padStart(4, "0")}`;
  const areas = expandAreas(ugcCodes, dataDir);
  const issueTime = vtec?.issuedAt || wmoIssueTime || (receivedAt ? new Date(receivedAt).toISOString() : null);
  const preview = {
    id: productId,
    productId,
    rawText,
    wmoHeader,
    issuingOffice,
    wfo,
    pil,
    product,
    action,
    phenomenon: vtec?.phenomenon || null,
    significance: vtec?.significance || null,
    etn,
    vtec: vtec?.raw || null,
    ugcCodes,
    counties: areas.filter((a) => /C\d{3}$/.test(a.ugc)),
    zones: areas.filter((a) => !/C\d{3}$/.test(a.ugc)),
    issueTime,
    expiresAt: vtec?.expiresAt || null,
    geometry,
    motion: motionMatch ? { direction: motionMatch[1].toUpperCase(), speed: Number(motionMatch[2]), units: /KT/i.test(motionMatch[0]) ? "kt" : "mph" } : null,
    hailSizeInches: hailMatch ? Number(hailMatch[1]) : null,
    windGustMph: gustMatch ? Number(gustMatch[1]) : null,
    tags,
    segment: segmentMatch ? { number: Number(segmentMatch[1]), total: Number(segmentMatch[2]) } : null,
    receivedAt: receivedAt || null,
    source: source || null,
    site: site || null
  };
  return preview;
}

module.exports = { parseAwipsProduct, parseGeometry, parseVtecTime };
