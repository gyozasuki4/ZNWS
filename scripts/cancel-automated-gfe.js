#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const eventId = String(process.argv[2] || "").trim();
const reason = String(process.argv.slice(3).join(" ") || "Independent automation criteria were not met.").trim();
if (!/^[A-Z0-9]{3}-[A-Z]{2}\.[A-Z]-\d{4}-\d{4}$/.test(eventId)) throw new Error("A specific GFE event id is required");

const root = path.resolve(__dirname, "..");
const data = path.join(root, "data");
const names = ["gfe-products.json", "public-alerts.json", "wfo-auto-drafts.json", "warning-audit-log.json"];
const stores = Object.fromEntries(names.map((name) => [name, JSON.parse(fs.readFileSync(path.join(data, name), "utf8"))]));
const event = (stores["gfe-products.json"].events || []).find((item) => item.id === eventId);
if (!event) throw new Error(`GFE event ${eventId} was not found`);
if (event.status !== "active") throw new Error(`GFE event ${eventId} is already ${event.status}`);
if (event.automated !== true) throw new Error("Refusing to system-cancel a non-automated GFE event");

const now = new Date().toISOString();
const cancelledText = String(event.productText || "")
  .replace(/\.\.\.[A-Z ]+ (?:IN EFFECT[^\n]*|NOW IN EFFECT[^\n]*)\.\.\./, `...${event.hazardName.toUpperCase()} IS CANCELLED...`)
  .replace(`/O.NEW.K${event.wfo}.`, `/O.CAN.K${event.wfo}.`)
  .replace(/\nAUTOMATED\s*$/i, "")
  .trimEnd() + `\n\nThe advisory is cancelled because ${reason.replace(/[.]+$/, "").toLowerCase()}.\n\nAUTOMATED`;

event.action = "CAN";
event.status = "cancelled";
event.updatedAt = now;
event.productText = cancelledText;
event.details = reason;
event.history = [...(event.history || []), { action: "CAN", issuedAt: now, endTime: event.endTime, zoneIds: [...new Set(event.zoneIds || [])], productText: cancelledText }];
stores["gfe-products.json"].updatedAt = now;

const publicId = `gfe:${eventId}`;
const warning = (stores["public-alerts.json"].warnings || []).find((item) => item.id === publicId);
if (!warning) throw new Error(`Public product ${publicId} was not found`);
warning.action = "CAN";
warning.status = "cancelled";
warning.updatedAt = now;
warning.text = cancelledText;
warning.bulletinHistory = [...(warning.bulletinHistory || []), { action: "CAN", validFrom: now, validTo: event.endTime, expiresAt: event.endTime, updatedAt: now, polygon: event.geometry, text: cancelledText }];
stores["public-alerts.json"].updatedAt = now;

for (const draft of stores["wfo-auto-drafts.json"].drafts || []) {
  if (draft.issuedEventId !== eventId) continue;
  draft.status = "cancelled";
  draft.cancelledAt = now;
  draft.cancellationReason = reason;
}
stores["wfo-auto-drafts.json"].updatedAt = now;

stores["warning-audit-log.json"].entries = [...(stores["warning-audit-log.json"].entries || []), { ...warning, id: `gfe-audit:${eventId}:CAN:${now}`, operator: "WFO Automation", operatorUsername: "wfo-automation", at: now }].slice(-5000);
stores["warning-audit-log.json"].updatedAt = now;

const backup = path.join(data, "cleanup-backups", `cancel-${eventId}-${now.replace(/[:.]/g, "-")}`);
fs.mkdirSync(backup, { recursive: true });
for (const name of names) fs.copyFileSync(path.join(data, name), path.join(backup, name));
for (const name of names) {
  const target = path.join(data, name), temporary = `${target}.cancel.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(stores[name], null, 2));
  fs.renameSync(temporary, target);
}

console.log(JSON.stringify({ eventId, action: "CAN", status: "cancelled", cancelledAt: now, zones: [...new Set(event.zoneIds || [])], backup }, null, 2));
