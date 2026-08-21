#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const data = path.join(root, "data");
const gfePath = path.join(data, "gfe-products.json");
const opsPath = path.join(data, "ops-products.json");
const publicPath = path.join(data, "public-alerts.json");
const now = Date.now();
const gfe = JSON.parse(fs.readFileSync(gfePath, "utf8"));
const ops = JSON.parse(fs.readFileSync(opsPath, "utf8"));
const current = JSON.parse(fs.readFileSync(publicPath, "utf8"));
const live = (item, endField = "expiresAt") => item && !item.practice && item.status === "active" && Date.parse(item[endField] || 0) > now;

const gfeProducts = (gfe.events || []).filter((event) => live(event, "endTime")).map((event) => ({
  id:`gfe:${event.id}`, kind:"gfe-hazard", practice:false,
  product:event.hazardCode, productName:event.hazardName,
  productId:`${event.wfo}${String(event.hazardCode || "").replace(/[^A-Z]/gi, "")}${String(event.etn || 0).padStart(4, "0")}`,
  polygon:event.geometry, geometry:event.geometry,
  zones:(event.zones || []).length ? event.zones : (event.zoneIds || []).map((id) => ({ id, name:id, areaPhrase:id })),
  text:event.productText, wfo:event.wfo, etn:event.etn, action:event.action,
  status:event.status, issuedAt:event.issuedAt, expiresAt:event.endTime,
  updatedAt:event.updatedAt || event.issuedAt, color:event.color, priority:event.priority,
  automated:event.automated === true,
  bulletinHistory:(event.history || []).map((entry) => ({
    action:entry.action, validFrom:entry.issuedAt, validTo:entry.endTime,
    expiresAt:entry.endTime, updatedAt:entry.issuedAt,
    polygon:event.geometry, text:entry.productText
  }))
}));

const nonGfe = (ops.warnings || []).filter((warning) =>
  live(warning) && warning.kind !== "gfe-hazard" && !String(warning.id || "").startsWith("gfe:")
);
const byId = new Map([...gfeProducts, ...nonGfe].map((product) => [product.id, product]));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(data, "cleanup-backups", `public-inventory-rebuild-${stamp}`);
fs.mkdirSync(backupDir, { recursive:true });
fs.copyFileSync(publicPath, path.join(backupDir, "public-alerts.json"));
const body = { updatedAt:new Date().toISOString(), warnings:[...byId.values()] };
const temporary = `${publicPath}.inventory-rebuild.tmp`;
fs.writeFileSync(temporary, JSON.stringify(body, null, 2));
fs.renameSync(temporary, publicPath);
console.log(JSON.stringify({ backupDir, previous:current.warnings?.length || 0, gfe:gfeProducts.length, nonGfe:nonGfe.length, total:body.warnings.length }, null, 2));
