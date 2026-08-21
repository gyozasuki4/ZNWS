"use strict";

const crypto = require("node:crypto");

const publishableAwipsProducts = new Set(["TOR", "SVR", "FFW", "SPS"]);
const awipsProductMetadata = {
  TOR: { hazardCode: "TO.W", hazardName: "Tornado Warning", color: "#ff0000", priority: 1 },
  SVR: { hazardCode: "SV.W", hazardName: "Severe Thunderstorm Warning", color: "#ffa500", priority: 2 },
  FFW: { hazardCode: "FF.W", hazardName: "Flash Flood Warning", color: "#8b0000", priority: 3 },
  SPS: { hazardCode: "SPS", hazardName: "Special Weather Statement", color: "#5f8dc7", priority: 100 }
};

function normalizeText(value) {
  return String(value || "").trim();
}

function formatEtnPublic(etn) {
  const n = Number(etn);
  if (!Number.isFinite(n) || n <= 0) {
    return "0000";
  }
  return String(Math.max(1, Math.min(9999, Math.round(n)))).padStart(4, "0");
}

function normalizeAction(value) {
  const candidate = String(value || "NEW").toUpperCase();
  return ["NEW", "CON", "EXT", "EXA", "EXB", "CAN", "EXP"].includes(candidate) ? candidate : "NEW";
}

function actionToStatus(action) {
  if (action === "CAN") {
    return "cancelled";
  }
  if (action === "EXP") {
    return "expired";
  }
  return "active";
}

function dedupeZones(zones) {
  const seen = new Set();
  const records = [];
  const ids = [];
  for (const zone of zones) {
    const id = String(zone?.id || zone?.ugc || zone?.name || "").trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const name = String(zone?.name || zone?.NAME || zone?.COUNTYNAME || zone?.SHORTNAME || id).trim() || id;
    records.push({ id, name, areaPhrase: String(zone?.areaPhrase || name).trim() || name });
    ids.push(id);
  }
  return { records, ids };
}

function parseSixDigitDate(value, referenceDate = new Date()) {
  const match = String(value || "").match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }
  const base = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (!Number.isFinite(base.getTime())) {
    return null;
  }
  const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Number(match[1]), Number(match[2]), Number(match[3])));
  if (candidate.getTime() - base.getTime() > 36 * 3600_000) {
    candidate.setUTCMonth(candidate.getUTCMonth() - 1);
  }
  if (base.getTime() - candidate.getTime() > 335 * 24 * 3600_000) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() - 1);
  }
  return Number.isFinite(candidate.getTime()) ? candidate : null;
}

function parseSpsHeaderExpires(rawText, referenceDate = new Date()) {
  const lines = String(rawText || "").split("\n");
  const seen = new Set();
  let best = null;
  for (const line of lines) {
    const match = normalizeText(line).match(
      /([A-Z]{2,3}[CZ]\d{3}(?:-\d{3})*)-(\d{6})(?:-(\d{6})-)?/i
    );
    if (!match) {
      continue;
    }
    const header = String(match[0]).toUpperCase();
    if (seen.has(header)) {
      continue;
    }
    seen.add(header);
    const times = [match[2], match[3]].filter(Boolean);
    if (!times.length) {
      continue;
    }
    const preferred = times[times.length - 1];
    const parsed = parseSixDigitDate(preferred, referenceDate);
    if (!parsed || !Number.isFinite(parsed.getTime())) {
      continue;
    }
    const parsedMs = parsed.getTime();
    if (best === null || parsedMs > best) {
      best = parsedMs;
    }
  }
  return Number.isFinite(best) ? new Date(best).toISOString() : null;
}

function computeSpsEventId(preview, issuedAt, zoneIds) {
  const wfo = String(preview?.wfo || "").replace(/^K/i, "").toUpperCase() || "SPS";
  const issueStamp = normalizeText(issuedAt).replace(/[-:.TZ]/g, "").slice(0, 12) || "000000000000";
  const zoneSignature = Array.isArray(zoneIds) ? zoneIds.filter(Boolean).map((value) => String(value).toUpperCase()).sort().join("|") : "";
  const geometrySignature = preview?.geometry ? JSON.stringify(preview.geometry) : "";
  const identitySeed = `${wfo}|${normalizeText(preview?.pil || "SPS")}|${zoneSignature || geometrySignature || "NO-AREA"}`;
  const identitySuffix = crypto.createHash("sha1").update(identitySeed).digest("hex").slice(0, 6).toUpperCase();
  return `${wfo}SPS${issueStamp}-${identitySuffix}`;
}

function isAwipsPublishableProduct(product) {
  return publishableAwipsProducts.has(String(product || "").toUpperCase());
}

function buildAwipsGfeEvent(preview) {
  const product = String(preview?.product || "").toUpperCase();
  const metadata = awipsProductMetadata[product];
  if (!metadata) {
    return null;
  }
  const now = new Date();
  const issuedAt = normalizeText(preview?.issueTime) || now.toISOString();
  const issuedAtMs = Date.parse(issuedAt);
  const issued = Number.isFinite(issuedAtMs) ? new Date(issuedAtMs).toISOString() : now.toISOString();
  const zoneSource = [
    ...(Array.isArray(preview?.counties) ? preview.counties : []),
    ...(Array.isArray(preview?.zones) ? preview.zones : [])
  ];
  const { records: zones, ids: zoneIds } = dedupeZones(zoneSource);
  const action = normalizeAction(preview?.action);
  const status = actionToStatus(action);
  const isSps = product === "SPS";
  const nowTs = Date.parse(issued);
  const publishedUntil = isSps ? parseSpsHeaderExpires(preview?.rawText, Number.isFinite(nowTs) ? new Date(nowTs) : now) : Date.parse(preview?.expiresAt || "");
  const expiresAt = Number.isFinite(publishedUntil)
    ? new Date(publishedUntil).toISOString()
    : isSps
      ? new Date((Number.isFinite(nowTs) ? nowTs : now.getTime()) + 60 * 60 * 1000).toISOString()
      : (action === "CAN" || action === "EXP")
        ? issued
        : new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const resolvedStatus = isSps
    ? (Date.parse(expiresAt) <= now.getTime() ? "expired" : "active")
    : status;
  const wfo = String(preview?.wfo || "").replace(/^K/i, "").toUpperCase();
  const etn = Number(preview?.etn || 0) || 0;
  const id = isSps
    ? computeSpsEventId(preview, issued, zoneIds)
    : (String(preview?.id || `${wfo}${product}${formatEtnPublic(etn)}`).trim() || `${wfo}${product}${formatEtnPublic(etn)}`);
  const productText = String(preview?.rawText || "");
  return {
    id,
    wfo,
    product,
    hazardCode: metadata.hazardCode,
    hazardName: metadata.hazardName,
    etn,
    zoneType: "public",
    zoneIds,
    zones,
    geometry: preview?.geometry || null,
    color: metadata.color,
    priority: metadata.priority,
    startTime: issued,
    endTime: expiresAt,
    fields: {
      action,
      source: "edex",
      awipsVtec: preview?.vtec || null,
      awipsTags: preview?.tags || null,
      awipsSegment: preview?.segment || null,
      motion: preview?.motion || null,
      segment: preview?.segment || null
    },
    issuedAt: issued,
    updatedAt: now.toISOString(),
    action,
    status: resolvedStatus,
    productText,
    history: [{ action, issuedAt: issued, endTime: expiresAt, zoneIds, productText }]
  };
}

async function attemptAwipsPublication(preview, options) {
  const publishEnabled = Boolean(options?.publishEnabled);
  const publishEvent = options?.publishEvent;
  const product = String(preview?.product || "").toUpperCase();

  if (!publishEnabled) {
    return { published: false, reason: "disabled" };
  }
  if (!isAwipsPublishableProduct(product)) {
    return { published: false, reason: "unsupported-product" };
  }
  const event = buildAwipsGfeEvent(preview);
  if (!event) {
    return { published: false, reason: "unmappable-product" };
  }
  if (typeof publishEvent !== "function") {
    return {
      published: false,
      reason: "publish-function-missing",
      error: "Missing publishEvent callback"
    };
  }
  try {
    const publishedResult = await publishEvent(event);
    return { published: true, event, publishedResult };
  } catch (error) {
    return { published: false, reason: "publish-failed", error: error.message || String(error) };
  }
}

module.exports = {
  isAwipsPublishableProduct,
  buildAwipsGfeEvent,
  attemptAwipsPublication
};
