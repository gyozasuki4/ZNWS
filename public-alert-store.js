const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function recordFileName(id) {
  return `${crypto.createHash("sha256").update(String(id)).digest("hex")}.json`;
}

function atomicWrite(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, filePath);
}

function writeAlertStore(root, store) {
  const recordsDir = path.join(root, "records");
  const manifestFile = path.join(root, "manifest.json");
  fs.mkdirSync(recordsDir, { recursive: true });
  const records = [];
  for (const warning of store.warnings || []) {
    if (!warning || !warning.id) continue;
    const json = JSON.stringify(warning);
    const file = recordFileName(warning.id);
    const target = path.join(recordsDir, file);
    let unchanged = false;
    try {
      unchanged = fs.readFileSync(target, "utf8") === json;
    } catch {
      unchanged = false;
    }
    if (!unchanged) atomicWrite(target, json);
    records.push({
      id: String(warning.id),
      file,
      bytes: Buffer.byteLength(json),
      sha256: crypto.createHash("sha256").update(json).digest("hex")
    });
  }
  const manifest = {
    version: 1,
    updatedAt: store.updatedAt || new Date().toISOString(),
    count: records.length,
    records
  };
  atomicWrite(manifestFile, JSON.stringify(manifest));
  return manifest;
}

function readAlertStore(root) {
  const manifestFile = path.join(root, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.version !== 1 || !Array.isArray(manifest.records)) {
    throw new Error("Unsupported public alert manifest");
  }
  const recordsDir = path.join(root, "records");
  const warnings = manifest.records.map((entry) => {
    const json = fs.readFileSync(path.join(recordsDir, entry.file), "utf8");
    const digest = crypto.createHash("sha256").update(json).digest("hex");
    if (digest !== entry.sha256) throw new Error(`Alert checksum mismatch: ${entry.id}`);
    const warning = JSON.parse(json);
    if (String(warning.id) !== String(entry.id)) throw new Error(`Alert id mismatch: ${entry.id}`);
    return warning;
  });
  if (warnings.length !== manifest.count) throw new Error("Public alert manifest count mismatch");
  return { updatedAt: manifest.updatedAt || null, warnings };
}

module.exports = { readAlertStore, writeAlertStore };
