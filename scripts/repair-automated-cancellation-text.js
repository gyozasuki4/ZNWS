#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const eventId = String(process.argv[2] || "").trim();
if (!eventId) throw new Error("Usage: repair-automated-cancellation-text.js EVENT_ID");

const gfePath = path.join(dataDir, "gfe-products.json");
const gfe = JSON.parse(fs.readFileSync(gfePath, "utf8"));
const event = (gfe.events || []).find((item) => item.id === eventId);
if (!event || event.automated !== true || event.action !== "CAN" || event.status !== "cancelled") {
  throw new Error(`${eventId} is not an automated CAN event`);
}

function cancellationText(item) {
  const reason = String(item.details || "The alert is no longer in effect").trim().replace(/[.]+$/, "");
  const lines = String(item.productText || "").replace(/\r\n?/g, "\n").split("\n");
  const vtecIndex = lines.findIndex((line) => /^\/O\.[A-Z]{3}\./.test(line.trim()));
  if (vtecIndex < 0) throw new Error(`${eventId} has no VTEC line`);
  lines[vtecIndex] = lines[vtecIndex].replace(/^\/O\.[A-Z]{3}\./, "/O.CAN.");
  let prefixEnd = vtecIndex + 1;
  while (prefixEnd < lines.length && !lines[prefixEnd].trim()) prefixEnd += 1;
  if (prefixEnd < lines.length) prefixEnd += 1;
  const prefix = lines.slice(0, prefixEnd).join("\n").trimEnd();
  return `${prefix}\n\n...${String(item.hazardName || "HAZARD").toUpperCase()} IS CANCELLED...\n\n${reason}.\n\n&&\n\n$$\n\nAUTOMATED`;
}

const corrected = cancellationText(event);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(dataDir, "cleanup-backups", `can-text-${eventId}-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

const filenames = ["gfe-products.json", "public-alerts.json", "ops-products.json"];
for (const filename of filenames) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) continue;
  fs.copyFileSync(filePath, path.join(backupDir, filename));
  const store = filename === "gfe-products.json" ? gfe : JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (filename === "gfe-products.json") {
    event.productText = corrected;
    const canHistory = [...(event.history || [])].reverse().find((entry) => entry.action === "CAN");
    if (canHistory) canHistory.productText = corrected;
  } else {
    const warning = (store.warnings || []).find((item) => item.id === `gfe:${eventId}`);
    if (warning) {
      warning.text = corrected;
      const canHistory = [...(warning.bulletinHistory || [])].reverse().find((entry) => entry.action === "CAN");
      if (canHistory) canHistory.text = corrected;
    }
  }
  const temporary = `${filePath}.can-text.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(store, null, 2));
  fs.renameSync(temporary, filePath);
}

console.log(JSON.stringify({ eventId, repaired: true, backupDir, text: corrected }, null, 2));
