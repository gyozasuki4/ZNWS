#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const data = path.join(root, "data");
const eventId = process.argv[2];
if (!eventId) throw new Error("Usage: repair-cancelled-product-projection.js EVENT_ID");
const gfe = JSON.parse(fs.readFileSync(path.join(data, "gfe-products.json"), "utf8"));
const event = (gfe.events || []).find((item) => item.id === eventId);
if (!event || event.status !== "cancelled" || event.action !== "CAN") throw new Error(`${eventId} is not a cancelled GFE event`);
const publicId = `gfe:${eventId}`;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(data, "cleanup-backups", `cancel-projection-${eventId}-${stamp}`);
fs.mkdirSync(backupDir, { recursive:true });
for (const filename of ["public-alerts.json", "ops-products.json"]) {
  const filePath = path.join(data, filename);
  fs.copyFileSync(filePath, path.join(backupDir, filename));
  const store = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const index = (store.warnings || []).findIndex((item) => item.id === publicId);
  if (index < 0) continue;
  store.warnings[index] = {
    ...store.warnings[index], action:"CAN", status:"cancelled",
    text:event.productText || store.warnings[index].text,
    expiresAt:event.endTime || event.updatedAt,
    updatedAt:event.updatedAt || new Date().toISOString()
  };
  store.updatedAt = new Date().toISOString();
  const temporary = `${filePath}.cancel-projection.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(store, null, 2));
  fs.renameSync(temporary, filePath);
}
console.log(JSON.stringify({ eventId, publicId, status:"cancelled", backupDir }, null, 2));
