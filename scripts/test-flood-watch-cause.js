#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { classifyFloodWatchCause } = require("../lib/flood-watch-cause");

assert.equal(classifyFloodWatchCause({ description: "Excessive rainfall may cause flooding." }).cause, "rainfall");
assert.equal(classifyFloodWatchCause({ description: "Excessive rainfall may cause debris flows near recent burn scars." }).cause, "rainfall-burn-scar");
assert.equal(classifyFloodWatchCause({ description: "Debris flow risk near a burn scar." }).cause, "excluded");
assert.equal(classifyFloodWatchCause({ description: "Flooding from a dam failure." }).cause, "excluded");
assert.equal(classifyFloodWatchCause({ description: "Flooding is possible." }).cause, "unknown");

console.log("Flood Watch cause regression checks passed");
