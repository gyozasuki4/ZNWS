#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const file = process.env.NATIVE_WORKSTATIONS_FILE || path.join(path.resolve(__dirname, ".."), "data", "native-workstations.json");
const id = String(process.argv[2] || "").trim();
if (!id || id === "--help") {
  console.error("Usage: npm run desktop:revoke -- native-DEVICE-ID");
  process.exit(2);
}
const store = JSON.parse(fs.readFileSync(file, "utf8"));
const device = (store.devices || []).find((entry) => entry.id === id);
if (!device) throw new Error(`Workstation not found: ${id}`);
device.revokedAt = new Date().toISOString();
device.revokedBy = process.env.USER || "local-admin";
store.updatedAt = new Date().toISOString();
const temp = `${file}.tmp-${process.pid}`;
fs.writeFileSync(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
fs.renameSync(temp, file);
try { fs.chmodSync(file, 0o600); } catch {}
console.log(`Revoked ${device.name} (${device.id})`);
