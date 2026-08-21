#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { parseAwipsProduct } = require("../lib/awips-product-parser");
const { attemptAwipsPublication, buildAwipsGfeEvent } = require("../lib/awips-gfe-publish");

function nowIso(offsetMinutes = 0) {
  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() + offsetMinutes);
  return now.toISOString();
}

const tor = [
  "WFUS53 KRIW 171600",
  "TORRIW",
  "",
  "WYC013-171645-",
  "/O.NEW.KRIW.TO.W.0042.260817T1600Z-260817T1645Z/",
  "",
  "...TORNADO EMERGENCY...",
  "* WHAT...Tornado.",
  "* IMPACTS...PDS. Hail to 2 inches. Wind gusts to 70 MPH.",
  "",
  "LAT...LON 4210 10720 4210 10680 4240 10680 4240 10720",
  "$$",
  ""
].join("\n");

function spsFixture(referenceDate = new Date()) {
  const issueTime = new Date(referenceDate);
  const expiresAt = new Date(issueTime.getTime() + 3 * 60 * 60 * 1000);
  const wmo = `${String(issueTime.getUTCDate()).padStart(2, "0")}${String(issueTime.getUTCHours()).padStart(2, "0")}${String(issueTime.getUTCMinutes()).padStart(2, "0")}`;
  const stamp = `${String(expiresAt.getUTCDate()).padStart(2, "0")}${String(expiresAt.getUTCHours()).padStart(2, "0")}${String(expiresAt.getUTCMinutes()).padStart(2, "0")}`;
  return [
    `WWUS83 KGRR ${wmo}`,
    "SPSGRR",
    "",
    `MIZ050-056-064-${stamp}-`,
    "SPECIAL WEATHER STATEMENT",
    "...gusty winds...",
    "$$",
    ""
  ].join("\n");
}

(async () => {
  const now = new Date();
  const commonOptions = {
    dataDir: path.join(__dirname, "..", "data"),
    source: "edex",
    site: "KRIW",
    formatProductId: (wfo, product, etn) => `${wfo}${product}${String(etn).padStart(4, "0")}`
  };

  const torPreview = parseAwipsProduct({
    rawText: tor,
    receivedAt: now.toISOString(),
    ...commonOptions
  });
  const torPublish = await attemptAwipsPublication(torPreview, {
    publishEnabled: true,
    publishEvent: async (event) => ({
      updatedAt: "TEST",
      distribution: { ok: true }
    })
  });

  assert.equal(torPublish.published, true);
  assert.equal(torPublish.event.hazardCode, "TO.W");
  assert.equal(torPublish.event.action, "NEW");
  assert.equal(torPublish.event.status, "active");
  assert.equal(torPublish.event.id, "RIWTOR0042");

  const disabled = await attemptAwipsPublication(torPreview, {
    publishEnabled: false,
    publishEvent: async () => {
      throw new Error("should-not-run");
    }
  });
  assert.equal(disabled.published, false);
  assert.equal(disabled.reason, "disabled");

  const spsPreview = parseAwipsProduct({
    rawText: spsFixture(now),
    receivedAt: now.toISOString(),
    source: "edex",
    site: "KGRR",
    dataDir: path.join(__dirname, "..", "data"),
    formatProductId: commonOptions.formatProductId
  });

  assert.equal(spsPreview.product, "SPS");
  const spsEvent = buildAwipsGfeEvent(spsPreview);
  assert.equal(spsEvent.hazardCode, "SPS");
  assert.equal(spsEvent.hazardName, "Special Weather Statement");
  assert.equal(spsEvent.product, "SPS");
  assert.equal(spsEvent.action, "NEW");
  assert.equal(spsEvent.status, "active");
  assert.equal(spsEvent.id.includes("SPS"), true);
  assert.equal(spsEvent.id.startsWith("GRRSPS"), true);
  assert.equal(spsEvent.id.includes("GRR"), true);

  const unsupported = await attemptAwipsPublication({ product: "NPW", rawText: "" }, {
    publishEnabled: true,
    publishEvent: async () => ({ ok: true })
  });
  assert.equal(unsupported.published, false);
  assert.equal(unsupported.reason, "unsupported-product");

  const failed = await attemptAwipsPublication({ product: "TOR", id: "RIWTOR0001", issueTime: nowIso(0), wfo: "RIW", etn: 1, rawText: "" }, {
    publishEnabled: true,
    publishEvent: async () => {
      throw new Error("pipeline down");
    }
  });
  assert.equal(failed.published, false);
  assert.equal(failed.reason, "publish-failed");

  console.log("AWIPS GFE publication checks passed");
})();
