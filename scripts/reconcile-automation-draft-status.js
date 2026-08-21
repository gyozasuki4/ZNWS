#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const draftsPath = path.join(root, "data", "wfo-auto-drafts.json");
const productsPath = path.join(root, "data", "gfe-products.json");
const drafts = JSON.parse(fs.readFileSync(draftsPath, "utf8"));
const products = JSON.parse(fs.readFileSync(productsPath, "utf8")).events || [];
let repaired = 0;

for (const draft of drafts.drafts || []) {
  if (draft.status !== "issue-failed") continue;
  const zoneCodes = Array.isArray(draft.zoneCodes) ? draft.zoneCodes : String(draft.zoneCode || "").split(",").filter(Boolean);
  const event = products.find((item) =>
    item.wfo === draft.wfo &&
    item.hazardName === draft.hazard &&
    item.status === "active" &&
    zoneCodes.length === (item.zoneIds || []).length &&
    zoneCodes.every((code) => (item.zoneIds || []).includes(code))
  );
  if (!event) continue;
  draft.status = "issued";
  draft.issuedAt = event.issuedAt || event.updatedAt || new Date().toISOString();
  draft.issuedBy = "wfo-automation";
  draft.issuedEventId = event.id;
  draft.liveIssuance = true;
  draft.lastError = null;
  repaired += 1;
}

if (repaired) {
  drafts.updatedAt = new Date().toISOString();
  fs.writeFileSync(draftsPath, `${JSON.stringify(drafts, null, 2)}\n`);
}
console.log(JSON.stringify({ repaired }));
