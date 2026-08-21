"use strict";

function floodWatchTiming(alert, nowMs = Date.now()) {
  const onsetMs = Date.parse(alert?.onset || alert?.sent || "");
  const endMs = Date.parse(alert?.ends || alert?.expires || "");
  const leadHours = Number.isFinite(onsetMs) ? (onsetMs - nowMs) / 3_600_000 : null;
  const withinLeadWindow = Number.isFinite(leadHours) && leadHours <= 48;
  const validTiming = Number.isFinite(endMs) && endMs > nowMs && Number.isFinite(onsetMs) && withinLeadWindow;
  return { leadHours, validTiming };
}

module.exports = { floodWatchTiming };
