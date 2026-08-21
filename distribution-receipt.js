/**
 * Warning distribution receipt UI (Mattermost / warning server / placefile / public).
 * Depends on prefs-utils.js for row helpers when available.
 */
(function (global) {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function distributionRows(distribution) {
    const rows = global.ZncavePrefsUtils && global.ZncavePrefsUtils.distributionRows
      ? global.ZncavePrefsUtils.distributionRows()
      : [
          ["mattermost", "Mattermost"],
          ["warningServer", "Warning server"],
          ["placefile", "Placefile"],
          ["publicSite", "Public site"]
        ];
    return distribution && Object.prototype.hasOwnProperty.call(distribution, "snapshot")
      ? [["snapshot", "Map snapshot"], ...rows]
      : rows;
  }

  function failedKeys(distribution) {
    return distributionRows(distribution)
      .map(([key]) => key)
      .filter((key) => !distribution?.[key]?.delivered);
  }

  let lastContext = { productId: "", distribution: null };

  function show(productId, distribution) {
    const dialog = document.querySelector("#warningDistributionDialog");
    const title = document.querySelector("#warningDistributionTitle");
    const list = document.querySelector("#warningDistributionList");
    const retryButton = document.querySelector("#warningDistributionRetry");
    if (!dialog || !title || !list) return;

    // Keep focusIds from the issue path so Retry can re-notify Mattermost
    const prevFocus = Array.isArray(lastContext.distribution?.focusIds)
      ? lastContext.distribution.focusIds
      : [];
    const nextDist = distribution || null;
    if (
      nextDist &&
      prevFocus.length &&
      (!Array.isArray(nextDist.focusIds) || !nextDist.focusIds.length)
    ) {
      nextDist.focusIds = prevFocus;
    }
    lastContext = { productId: productId || "", distribution: nextDist };
    const rows = distributionRows(distribution);
    const failed = failedKeys(distribution);
    const allOk = failed.length === 0;
    title.textContent = allOk ? `${productId} distributed` : `${productId} — delivery incomplete`;
    list.innerHTML = rows
      .map(([key, label]) => {
        const result = distribution?.[key] || { delivered: false, detail: "No confirmation returned" };
        const delivered = Boolean(result.delivered);
        return `<li class="${delivered ? "is-delivered" : "is-failed"}" data-dist-key="${escapeHtml(key)}"><span aria-hidden="true">${delivered ? "✓" : "!"}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(result.detail || (delivered ? "Delivered" : "Not confirmed"))}</small></div></li>`;
      })
      .join("");
    if (retryButton) {
      retryButton.hidden = allOk;
      retryButton.disabled = false;
      retryButton.textContent = allOk ? "Retry failed" : `Retry failed (${failed.length})`;
    }
    if (!dialog.open) dialog.showModal();
  }

  function getLastContext() {
    return lastContext;
  }

  function setLastContext(ctx) {
    lastContext = ctx || { productId: "", distribution: null };
  }

  /**
   * @param {object} options
   * @param {() => Promise<object|null>} options.publish - republish function
   * @param {(msg: string) => void} [options.onBanner]
   */
  function bindRetry(options = {}) {
    const publish = options.publish;
    const onBanner = typeof options.onBanner === "function" ? options.onBanner : () => {};
    const button = document.querySelector("#warningDistributionRetry");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      button.disabled = true;
      button.textContent = "Retrying…";
      try {
        if (typeof publish !== "function") throw new Error("Publish handler missing");
        const distribution = await publish();
        const productId = lastContext.productId || "Warning";
        if (!distribution) {
          onBanner("Retry finished — no products needed publishing (or publish returned empty).");
          button.disabled = false;
          button.textContent = "Retry failed";
          return;
        }
        const merged = { ...(lastContext.distribution || {}) };
        Object.keys(distribution).forEach((key) => {
          const next = distribution[key];
          const prev = merged[key];
          if (next?.delivered || !prev?.delivered) merged[key] = next;
        });
        show(productId, merged);
        const failed = failedKeys(merged);
        onBanner(
          failed.length
            ? `Retry complete — still failing: ${failed.join(", ")}.`
            : "Retry complete — all distribution legs confirmed."
        );
      } catch (error) {
        onBanner(`Retry failed: ${error.message || error}`);
        button.disabled = false;
        button.textContent = "Retry failed";
      }
    });
  }

  global.ZncaveDistribution = {
    show,
    bindRetry,
    getLastContext,
    setLastContext,
    failedKeys,
    distributionRows
  };
})(typeof window !== "undefined" ? window : globalThis);
