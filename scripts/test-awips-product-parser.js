#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { parseAwipsProduct } = require("../lib/awips-product-parser");

const tor = [
  "WFUS53 KRIW 171600",
  "TORRIW",
  "",
  "WYC013-171645-",
  "/O.NEW.KRIW.TO.W.0042.260817T1600Z-260817T1645Z/",
  "",
  "...TORNADO EMERGENCY...",
  "* WHAT...Tornado.",
  "* IMPACTS...PDS. Hail to 2 inches. Wind gusts to 70 MPH. Moving east at 30 MPH.",
  "",
  "LAT...LON 4210 10720 4210 10680 4240 10680 4240 10720",
  "$$",
  ""
].join("\n");

const parsed = parseAwipsProduct({
  rawText: tor,
  receivedAt: "2026-08-17T16:00:00Z",
  source: "edex",
  site: "KRIW",
  dataDir: require("node:path").join(__dirname, "..", "data")
});
assert.equal(parsed.rawText, tor);
assert.equal(parsed.product, "TOR");
assert.equal(parsed.action, "NEW");
assert.equal(parsed.wfo, "RIW");
assert.equal(parsed.etn, 42);
assert.deepEqual(parsed.ugcCodes, ["WYC013"]);
assert.equal(parsed.issueTime, "2026-08-17T16:00:00.000Z");
assert.equal(parsed.expiresAt, "2026-08-17T16:45:00.000Z");
assert.equal(parsed.hailSizeInches, 2);
assert.equal(parsed.windGustMph, 70);
assert.equal(parsed.motion.direction, "EAST");
assert.equal(parsed.motion.speed, 30);
assert.equal(parsed.tags.emergency, true);
assert.equal(parsed.tags.pds, true);
assert.equal(parsed.geometry.type, "Polygon");
assert.equal(parsed.counties[0].ugc, "WYC013");

const sps = "WWUS83 KGRR 171700\nSPSGRR\n\nMIZ050-056-064-171900-\nSPECIAL WEATHER STATEMENT\n...gusty winds...\n$$\n";
const spsParsed = parseAwipsProduct({ rawText: sps, receivedAt: "2026-08-17T17:00:00Z", source: "edex", site: "KGRR", dataDir: require("node:path").join(__dirname, "..", "data") });
assert.equal(spsParsed.product, "SPS");
assert.equal(spsParsed.action, "NEW");
assert.equal(spsParsed.etn, 0);
assert.equal(spsParsed.vtec, null);
assert.deepEqual(spsParsed.ugcCodes, ["MIZ050", "MIZ056", "MIZ064"]);

assert.throws(() => parseAwipsProduct({ rawText: "not an AWIPS product", dataDir: "data" }), /Unsupported product/);
console.log("AWIPS product parser preview checks passed");
