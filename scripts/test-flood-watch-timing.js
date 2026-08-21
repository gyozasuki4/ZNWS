#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { floodWatchTiming } = require("../lib/flood-watch-timing");

const nowMs = Date.parse("2026-08-12T05:00:00Z");
const alert = (onsetHours, endHours) => ({
  onset: new Date(nowMs + onsetHours * 3_600_000).toISOString(),
  ends: new Date(nowMs + endHours * 3_600_000).toISOString()
});

assert.equal(floodWatchTiming(alert(7, 19), nowMs).validTiming, true, "watch beginning in 7 hours");
assert.equal(floodWatchTiming(alert(12, 24), nowMs).validTiming, true, "watch beginning in 12 hours");
assert.equal(floodWatchTiming(alert(48, 60), nowMs).validTiming, true, "watch beginning in 48 hours");
assert.equal(floodWatchTiming(alert(-2, 10), nowMs).validTiming, true, "active watch");
assert.equal(floodWatchTiming(alert(49, 60), nowMs).validTiming, false, "watch beyond 48 hours");
assert.equal(floodWatchTiming(alert(-10, -1), nowMs).validTiming, false, "expired watch");

console.log("Flood Watch timing regression checks passed");
