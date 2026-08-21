#!/usr/bin/env node
"use strict";

// Run on the trusted operations host. This deliberately provisions the same
// native-workstation record consumed by /api/desktop/session; it is not a
// second authentication database.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const file = process.env.NATIVE_WORKSTATIONS_FILE || path.join(root, "data", "native-workstations.json");
const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || "").trim() : "";
}
if (args.includes("--help") || !option("--name") || !option("--wfo")) {
  console.error("Usage: npm run desktop:provision -- --name \"Operator Desktop\" --wfo KRIW [--created-by admin]");
  process.exit(2);
}
const name = option("--name").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 80);
const wfos = option("--wfo").split(",").map((value) => value.trim().toUpperCase()).filter((value) => /^[A-Z0-9]{3,8}$/.test(value));
if (name.length < 2 || !wfos.length) throw new Error("A workstation name and at least one valid WFO are required");
const createdBy = (option("--created-by") || process.env.USER || "local-admin").slice(0, 120);
let store = { version: 1, updatedAt: null, pending: [], devices: [] };
try { store = { ...store, ...JSON.parse(fs.readFileSync(file, "utf8")) }; } catch { /* initialize */ }
const token = `hive_native_${crypto.randomBytes(32).toString("base64url")}`;
const device = {
  id: `native-${crypto.randomBytes(9).toString("base64url")}`,
  name,
  wfo: wfos[0],
  wfos,
  tokenHash: crypto.createHash("sha256").update(token, "utf8").digest("hex"),
  createdAt: new Date().toISOString(),
  createdBy,
  lastSeenAt: null,
  revokedAt: null,
  enabled: true
};
store.version = 1;
store.devices = Array.isArray(store.devices) ? store.devices : [];
store.pending = Array.isArray(store.pending) ? store.pending : [];
store.devices.push(device);
store.updatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(file), { recursive: true });
const temp = `${file}.tmp-${process.pid}`;
fs.writeFileSync(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
fs.renameSync(temp, file);
try { fs.chmodSync(file, 0o600); } catch { /* Windows ACLs still protect the file */ }
console.log(JSON.stringify({ device: { id: device.id, name: device.name, wfos: device.wfos, createdAt: device.createdAt }, token }, null, 2));
console.error("The token is displayed once. Store it through the Electron secure-credential setup; do not put it in source, JSON, or logs.");
