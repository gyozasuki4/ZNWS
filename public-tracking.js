(function () {
  "use strict";

  if (window.__zasnetPublicTrackingStarted) return;
  window.__zasnetPublicTrackingStarted = true;

  const startedAt = Date.now();
  const pageSessionId = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function sendActivity(event, beacon = false) {
    const payload = JSON.stringify({
      event,
      page: window.location.pathname,
      pageSessionId,
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      language: navigator.language || "",
      platform: navigator.userAgentData?.platform || navigator.platform || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}`
    });

    if (beacon && navigator.sendBeacon) {
      return navigator.sendBeacon(
        "/api/access/activity",
        new Blob([payload], { type: "application/json" })
      );
    }
    fetch("/api/access/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin"
    }).catch(() => {});
    return true;
  }

  sendActivity("page-view");
  window.setInterval(() => {
    if (document.visibilityState === "visible") sendActivity("heartbeat");
  }, 60_000);
  window.addEventListener("pagehide", () => sendActivity("page-exit", true), { once: true });
})();
