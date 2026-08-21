#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const zonesPath = path.join(root, "data/generated/native/public-zones.geojson");
const criteriaPath = path.join(root, "data/dense-fog-criteria.json");
const outputPath = path.join(root, "data/dense-fog-history.json");
const args = new Set(process.argv.slice(2));
const yearArg = process.argv.find((value) => /^--year=\d{4}$/.test(value));
const years = yearArg ? [Number(yearArg.split("=")[1])] : [2024, 2025];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "ZASNetWX dense-fog research backtest" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function main() {
  const zones = JSON.parse(fs.readFileSync(zonesPath, "utf8"));
  const criteria = JSON.parse(fs.readFileSync(criteriaPath, "utf8"));
  const wfos = [...new Set(zones.features.map((feature) => feature.properties.CWA).filter(Boolean))].sort();
  const selected = process.argv.find((value) => value.startsWith("--wfos="));
  const wanted = selected ? new Set(selected.slice(7).toUpperCase().split(",")) : null;
  const offices = wanted ? wfos.filter((wfo) => wanted.has(wfo)) : wfos;
  const events = [];
  const failures = [];

  for (const year of years) {
    for (const wfo of offices) {
      const url = `https://mesonet.agron.iastate.edu/json/vtec_events.py?wfo=${wfo}&year=${year}&phenomena=FG&significance=Y`;
      try {
        const payload = await fetchJson(url);
        for (const event of payload.events || []) events.push({ ...event, archiveYear: year });
      } catch (error) {
        failures.push({ wfo, year, error: error.message });
      }
      await sleep(1050);
    }
  }

  const byWfo = {};
  for (const wfo of offices) {
    const officeEvents = events.filter((event) => event.wfo === wfo);
    const durations = officeEvents.map((event) => (Date.parse(event.init_expire || event.expire) - Date.parse(event.issue)) / 36e5).filter(Number.isFinite);
    byWfo[wfo] = {
      events: officeEvents.length,
      medianInitialDurationHours: durations.length ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)] : null,
      criteria: criteria.officeOverrides[wfo] || criteria.baseline
    };
  }

  const result = {
    generatedAt: new Date().toISOString(),
    researchOnly: true,
    source: "Iowa Environmental Mesonet VTEC archive",
    years,
    offices: offices.length,
    eventCount: events.length,
    failures,
    byWfo,
    events
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, offices: offices.length, events: events.length, failures: failures.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
