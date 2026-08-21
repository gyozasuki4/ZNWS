#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "data", "marine-history.json");
const zones = JSON.parse(fs.readFileSync(path.join(root, "data/generated/native/marine-zones.geojson"), "utf8"));
const years = (process.argv.find((value) => value.startsWith("--years="))?.slice(8).split(",").map(Number).filter(Number.isFinite)) || [2024, 2025, 2026];
const selected = process.argv.find((value) => value.startsWith("--wfos="));
const available = [...new Set(zones.features.map((feature) => String(feature.properties?.CWA || feature.properties?.WFO || "").toUpperCase()).filter(Boolean))].sort();
const wanted = selected ? new Set(selected.slice(7).toUpperCase().split(",")) : null;
const wfos = wanted ? available.filter((wfo) => wanted.has(wfo)) : available;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "ZASNetWX marine criteria historical research" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function uniqueNumbers(text, pattern) {
  return [...new Set([...String(text).matchAll(pattern)].map((match) => Number(match[1])).filter(Number.isFinite))];
}

function parseProducts(raw, wfo, year) {
  const starts = [...raw.matchAll(/(?:^|\x01|\n)(\d{3,4})\s*\nWHUS\d{2}\s+K[A-Z]{3}\s+\d{6}\s*\nMWW[A-Z]{3}/gm)].map((match) => match.index + ((raw[match.index] === "\x01" || raw[match.index] === "\n") ? 1 : 0));
  if (!starts.length) return [];
  starts.push(raw.length);
  const rows = [];
  for (let index = 0; index < starts.length - 1; index += 1) {
    const body = raw.slice(starts[index], starts[index + 1]).replace(/\x01/g, "").trim();
    for (const segment of body.split(/\n\$\$\s*\n/)) {
      const vtec = segment.match(/\/O\.(NEW|CON|EXT|EXA|EXB|UPG|COR)\.K[A-Z]{3}\.(SC|GL)\.([AYW])\.(\d{4})\.([0-9TZ]+)-([0-9TZ]+)\//);
      if (!vtec || !["NEW", "UPG"].includes(vtec[1])) continue;
      const hazard = vtec[2] === "SC" ? "Small Craft Advisory" : vtec[3] === "A" ? "Gale Watch" : "Gale Warning";
      const what = segment.match(/^\s*\* WHAT\.\.\.([\s\S]*?)(?=^\s*\* (?:WHERE|WHEN|IMPACTS|ADDITIONAL DETAILS)\.\.\.|^\s*PRECAUTIONARY|^\s*&&|$)/mi)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const ugcs = [...new Set([...segment.matchAll(/\b([A-Z]{2}Z\d{3})(?=[->\s,]|$)/g)].map((match) => match[1]))];
      const winds = uniqueNumbers(what, /(?:wind(?:s)?|gusts?(?: up)? to|around|near)\s+(?:[a-z]+\s+)?(\d{1,3})(?:\s+to\s+\d{1,3})?\s*kt/gi);
      const gusts = uniqueNumbers(what, /gusts?(?: up)? to\s+(\d{1,3})\s*kt/gi);
      const seas = [...what.matchAll(/(?:seas|waves)[^.;]*?(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*ft/gi)].flatMap((match) => [Number(match[1]), Number(match[2])]).filter(Number.isFinite);
      rows.push({ wfo, year, hazard, action: vtec[1], eventId: Number(vtec[4]), begins: vtec[5], ends: vtec[6], ugcs, what, windKnots: winds, gustKnots: gusts, seaFeet: [...new Set(seas)] });
    }
  }
  return rows;
}

async function main() {
  const products = [], failures = [];
  const tasks = years.flatMap((year) => wfos.map((wfo) => ({ year, wfo })));
  let cursor = 0, completed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const { year, wfo } = tasks[cursor++];
      const url = `https://mesonet.agron.iastate.edu/cgi-bin/afos/retrieve.py?pil=MWW${wfo}&fmt=text&sdate=${year}-01-01T00:00Z&edate=${year + 1}-01-01T00:00Z&limit=9999&order=asc`;
      try {
        const raw = await fetchText(url);
        if (!/^ERROR:/i.test(raw.trim())) products.push(...parseProducts(raw, wfo, year));
      } catch (error) { failures.push({ wfo, year, error: error.message }); }
      completed += 1;
      if (completed % 20 === 0 || completed === tasks.length) console.error(`[marine-history] ${completed}/${tasks.length} archive requests complete`);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  const byWfo = Object.fromEntries(wfos.map((wfo) => {
    const rows = products.filter((product) => product.wfo === wfo);
    return [wfo, { smallCraft: rows.filter((row) => row.hazard === "Small Craft Advisory").length, galeWatch: rows.filter((row) => row.hazard === "Gale Watch").length, galeWarning: rows.filter((row) => row.hazard === "Gale Warning").length }];
  }));
  const result = { generatedAt: new Date().toISOString(), researchOnly: true, source: "Iowa Environmental Mesonet NWS MWW text archive", years, offices: wfos.length, productSegments: products.length, failures, byWfo, products };
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ output, years, offices: wfos.length, segments: products.length, smallCraft: products.filter((row) => row.hazard === "Small Craft Advisory").length, galeWatch: products.filter((row) => row.hazard === "Gale Watch").length, galeWarning: products.filter((row) => row.hazard === "Gale Warning").length, failures: failures.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
