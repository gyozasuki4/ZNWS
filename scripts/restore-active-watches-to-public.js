#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const opsPath = path.join(root, "data", "ops-products.json");
const publicPath = path.join(root, "data", "public-alerts.json");
const backupDir = path.join(root, "data", "cleanup-backups", `watch-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const ops = JSON.parse(fs.readFileSync(opsPath, "utf8"));
const publicStore = JSON.parse(fs.readFileSync(publicPath, "utf8"));
const automation = JSON.parse(fs.readFileSync(path.join(root, "data", "wfo-automation.json"), "utf8"));
const now = Date.now();
const protectedOffices = new Set((automation.ignoredOffices || []).map((wfo) => String(wfo).toUpperCase()));
const activeProducts = (ops.warnings || []).filter((warning) =>
  warning && !warning.practice && warning.status === "active" &&
  Date.parse(warning.expiresAt || 0) > now &&
  (warning.kind === "spc-watch" || protectedOffices.has(String(warning.wfo || "").toUpperCase()))
);

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(publicPath, path.join(backupDir, "public-alerts.json"));
const byId = new Map((publicStore.warnings || []).filter((warning) => warning?.id).map((warning) => [warning.id, warning]));
activeProducts.forEach((warning) => byId.set(warning.id, warning));
const body = { updatedAt:new Date().toISOString(), warnings:[...byId.values()] };
const temporaryPath = `${publicPath}.watch-restore.tmp`;
fs.writeFileSync(temporaryPath, JSON.stringify(body, null, 2));
fs.renameSync(temporaryPath, publicPath);
console.log(JSON.stringify({ backupDir, restored:activeProducts.map((warning) => warning.productId || warning.id), total:body.warnings.length }, null, 2));
