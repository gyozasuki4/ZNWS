#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { readAlertStore, writeAlertStore } = require("../public-alert-store");

const dataDir = path.resolve(__dirname, "..", "data");
const legacyFile = path.join(dataDir, "public-alerts.json");
const storeDir = path.join(dataDir, "public-alerts-store");
const backupDir = path.join(dataDir, "migration-backups");
const source = fs.readFileSync(legacyFile);
const legacy = JSON.parse(source.toString("utf8"));
if (!Array.isArray(legacy.warnings)) throw new Error("Legacy public alert store has no warnings array");

fs.mkdirSync(backupDir, { recursive: true });
const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
const backupFile = path.join(backupDir, `public-alerts-${sourceHash.slice(0, 16)}.json`);
if (!fs.existsSync(backupFile)) fs.copyFileSync(legacyFile, backupFile, fs.constants.COPYFILE_EXCL);

const manifest = writeAlertStore(storeDir, legacy);
const migrated = readAlertStore(storeDir);
const legacyIds = legacy.warnings.map((warning) => String(warning.id)).sort();
const migratedIds = migrated.warnings.map((warning) => String(warning.id)).sort();
if (JSON.stringify(legacyIds) !== JSON.stringify(migratedIds)) throw new Error("Migrated alert ids do not match legacy ids");

const migratedById = new Map(migrated.warnings.map((warning) => [String(warning.id), warning]));
for (const warning of legacy.warnings) {
  if (JSON.stringify(warning) !== JSON.stringify(migratedById.get(String(warning.id)))) {
    throw new Error(`Lossless verification failed for ${warning.id}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  records: manifest.count,
  sourceBytes: source.length,
  sourceSha256: sourceHash,
  backupFile,
  manifestFile: path.join(storeDir, "manifest.json")
}, null, 2));
