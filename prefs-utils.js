/**
 * ZNCave preference + bulletin helpers (shared by app.js).
 * Keep pure / side-effect free where possible.
 */
(function (global) {
  "use strict";

  function formatPrefsSaveMessage(state, options = {}) {
    const at = options.savedAt || options.at || null;
    const name = options.displayName || options.username || "user";
    const detail = options.detail || "";
    const timeLabel = at
      ? new Date(at).toISOString().slice(11, 19) + "Z"
      : "";
    if (state === "saving") {
      return "Saving preferences to server…";
    }
    if (state === "saved") {
      return timeLabel
        ? `Saved for ${name} · ${timeLabel}`
        : `Saved for ${name} (server).`;
    }
    if (state === "error") {
      return detail
        ? `Server save failed: ${detail}`
        : "Server save unavailable — preferences not persisted.";
    }
    return "Preferences save per signed-in user (server).";
  }

  /**
   * Force a real ETN into every VTEC line of a bulletin.
   * Draft/review text often still has .0000. before nextEtn is reserved.
   */
  function patchBulletinEtn(text, etn) {
    const n = Number(etn);
    if (!text || !Number.isFinite(n) || n < 1) {
      return String(text || "");
    }
    const etnStr = String(Math.max(1, Math.min(9999, Math.round(n)))).padStart(4, "0");
    return String(text).replace(
      /(\/O\.(?:NEW|CON|EXT|CAN|EXP|UPG|EXA|EXB)\.K[A-Z0-9]{3}\.[A-Z]{2}\.[A-Z]\.)\d{4}\./g,
      `$1${etnStr}.`
    );
  }

  /**
   * Fix practice/placeholder WMO ddhhmm and NEW VTEC start 000000T0000Z.
   * Returns { text, issues: string[] }.
   */
  function sanitizeBulletinForIssue(text, options = {}) {
    const issues = [];
    let cleaned = String(text || "");
    const issued = options.issued instanceof Date ? options.issued : new Date(options.issued || Date.now());
    const etn = options.etn;
    const action = String(options.action || "NEW").toUpperCase();

    if (!cleaned.trim()) {
      issues.push("Bulletin text is empty");
      return { text: cleaned, issues };
    }

    if (etn != null && Number(etn) > 0) {
      const before = cleaned;
      cleaned = patchBulletinEtn(cleaned, etn);
      if (before !== cleaned && /\.0000\./.test(before)) {
        issues.push("Replaced VTEC ETN 0000 with reserved event number");
      }
    } else if (/\/O\.[A-Z]{3}\.K[A-Z0-9]{3}\.[A-Z]{2}\.[A-Z]\.0000\./.test(cleaned)) {
      issues.push("VTEC event number is 0000 — issue requires a real ETN");
    }

    if (Number.isFinite(issued.getTime())) {
      const wmoStamp =
        String(issued.getUTCDate()).padStart(2, "0") +
        String(issued.getUTCHours()).padStart(2, "0") +
        String(issued.getUTCMinutes()).padStart(2, "0");
      // WU=SVR, WF=TOR, WG=FFW, WW=SPS, WH=SMW
      if (/^((?:WU|WF|WG|WW|WH)US\d{2}\s+K[A-Z]{3}\s+)000000\b/m.test(cleaned)) {
        cleaned = cleaned.replace(
          /^((?:WU|WF|WG|WW|WH)US\d{2}\s+K[A-Z]{3}\s+)000000\b/m,
          `$1${wmoStamp}`
        );
        issues.push("Replaced placeholder WMO time 000000 with issue time");
      }
      if (action === "NEW" || action === "EXT") {
        const y = String(issued.getUTCFullYear()).slice(2);
        const m = String(issued.getUTCMonth() + 1).padStart(2, "0");
        const d = String(issued.getUTCDate()).padStart(2, "0");
        const hh = String(issued.getUTCHours()).padStart(2, "0");
        const mm = String(issued.getUTCMinutes()).padStart(2, "0");
        const vtecStart = `${y}${m}${d}T${hh}${mm}Z`;
        if (new RegExp(`\\/O\\.${action}\\.[^/]+\\.000000T0000Z-`).test(cleaned)) {
          cleaned = cleaned.replace(
            new RegExp(`(\\/O\\.${action}\\.K[A-Z0-9]{3}\\.[A-Z]{2}\\.[A-Z]\\.\\d{4}\\.)000000T0000Z-`),
            `$1${vtecStart}-`
          );
          issues.push(`Replaced ${action} VTEC start 000000T0000Z with issue time`);
        }
      }
    }

    if (!/LAT\.\.\.LON/i.test(cleaned) && options.requireLatLon !== false) {
      issues.push("Bulletin is missing LAT...LON (required for polygons)");
    }

    // Hard failures that should block issue
    const blockers = issues.filter(
      (msg) =>
        msg.includes("empty") ||
        msg.includes("requires a real ETN") ||
        msg.includes("missing LAT")
    );

    return { text: cleaned, issues, blockers };
  }

  function distributionRows() {
    return [
      ["mattermost", "Mattermost"],
      ["warningServer", "Warning server"],
      ["placefile", "Placefile"],
      ["publicSite", "Public site"]
    ];
  }

  function failedDistributionKeys(distribution) {
    return distributionRows()
      .map(([key]) => key)
      .filter((key) => !distribution?.[key]?.delivered);
  }

  global.ZncavePrefsUtils = {
    formatPrefsSaveMessage,
    patchBulletinEtn,
    sanitizeBulletinForIssue,
    distributionRows,
    failedDistributionKeys
  };
})(typeof window !== "undefined" ? window : globalThis);
