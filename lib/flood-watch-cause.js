"use strict";

function classifyFloodWatchCause(alert) {
  const text = `${alert?.headline || ""} ${alert?.description || ""} ${alert?.instruction || ""}`.toLowerCase();
  const hardExcluded = ["dam failure", "dam may fail", "levee failure", "levee may fail", "ice jam", "snowmelt", "snow melt"];
  const burnScar = ["debris flow", "burn scar", "burn area"];
  const rainfall = ["heavy rain", "excessive rainfall", "excessive rain", "repeated rainfall", "rainfall", "training storm", "training thunderstorm", "thunderstorms"];
  const hardExcludedTerms = hardExcluded.filter((term) => text.includes(term));
  const rainfallTerms = rainfall.filter((term) => text.includes(term));
  const burnScarTerms = burnScar.filter((term) => text.includes(term));

  if (hardExcludedTerms.length) return { cause: "excluded", terms: hardExcludedTerms, burnScarTerms };
  if (rainfallTerms.length) {
    return {
      cause: burnScarTerms.length ? "rainfall-burn-scar" : "rainfall",
      terms: rainfallTerms,
      burnScarTerms
    };
  }
  if (burnScarTerms.length) return { cause: "excluded", terms: burnScarTerms, burnScarTerms };
  return { cause: "unknown", terms: [], burnScarTerms: [] };
}

module.exports = { classifyFloodWatchCause };
