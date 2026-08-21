#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..", "data", "generated", "public-outlooks");
const families = [
  { key: "gfs", match: /-gfs-model-/, cap: 3500 },
  { key: "hrrr", match: /-hrrr-model-/, cap: 2500 },
  { key: "ncep", match: /-ncep-model-/, cap: 1500 },
  { key: "hafs", match: /-haf[ab]-model-/, cap: 1000 }
];
if (!root.endsWith(`${path.sep}data${path.sep}generated${path.sep}public-outlooks`) || !fs.existsSync(root)) throw new Error("Refusing to prune an unexpected path");
const now = Date.now(), maxAgeMs = 48 * 60 * 60_000;
let removed = 0, bytes = 0;
for (const family of families) {
  const entries = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith("wpc-maps-") && entry.name.endsWith(".svg") && family.match.test(entry.name))
    .map((entry) => { const filePath=path.join(root,entry.name),stat=fs.statSync(filePath);return {filePath,mtimeMs:stat.mtimeMs,size:stat.size}; })
    .sort((a,b)=>b.mtimeMs-a.mtimeMs);
  const targets = entries.filter((entry,index)=>index>=family.cap || now-entry.mtimeMs>maxAgeMs);
  for (const entry of targets) { fs.unlinkSync(entry.filePath); removed += 1; bytes += entry.size; }
  process.stdout.write(`${family.key}: kept ${entries.length-targets.length}, removed ${targets.length}\n`);
}
process.stdout.write(`total: removed ${removed} files, reclaimed ${(bytes/1073741824).toFixed(2)} GiB\n`);
