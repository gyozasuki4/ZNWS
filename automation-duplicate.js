"use strict";

function normalizeAutomationZone(value) {
  const code = String(value || "").toUpperCase();
  return /^(?:AM|AN|GM|LE|LH|LM|LO|LS|PH|PK|PM|PZ)Z\d{3}$/.test(code)
    ? code
    : code.replace(/^([A-Z]{2})Z/, "$1");
}

function findActiveAutomationDuplicate(event, activeAlerts, hazardFamily) {
  const eventZones = [...new Set([
    ...(event?.zoneIds || []),
    ...(event?.zones || []).map((zone) => zone?.id || zone?.code || zone)
  ].map(normalizeAutomationZone).filter(Boolean))];
  const wfo = String(event?.wfo || "").replace(/^K/i, "").toUpperCase();
  const family = hazardFamily(event?.hazardName);
  return (activeAlerts || []).find((alert) =>
    alert.wfo === wfo && alert.family === family &&
    (family === "air quality" || !alert.zones.length || eventZones.some((zone) => alert.zones.includes(zone)))
  ) || null;
}

module.exports = { findActiveAutomationDuplicate, normalizeAutomationZone };
