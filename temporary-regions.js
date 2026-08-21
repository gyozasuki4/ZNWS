(() => {
  "use strict";
  window.installTemporaryMapRegions = (select) => {
    if (!select) return;
    const permanentValues = new Set([...select.options].map((option) => option.value));
    let pendingRequestedRegion = new URLSearchParams(location.search).get("region") || "";
    let fallbackById = new Map();

    function removeExpiredOptions() {
      const current = select.value;
      const currentOption = select.selectedOptions[0];
      const fallback = currentOption?.dataset.fallback || fallbackById.get(current) || "";
      select.querySelectorAll('optgroup[data-temporary-regions="true"] option').forEach((option) => {
        if (option.dataset.expiresAt && Date.parse(option.dataset.expiresAt) <= Date.now()) option.remove();
      });
      const group = select.querySelector('optgroup[data-temporary-regions="true"]');
      if (group && !group.querySelector("option")) group.remove();
      if (current.startsWith("meso-") && ![...select.options].some((option) => option.value === current)) {
        select.value = permanentValues.has(fallback) ? fallback : "";
        select.dispatchEvent(new Event("change"));
      }
    }

    async function refresh() {
      removeExpiredOptions();
      try {
        const response = await fetch("/api/public/map-regions.json", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const current = select.value;
        const previousFallback = fallbackById.get(current) || "";
        select.querySelector('optgroup[data-temporary-regions="true"]')?.remove();
        fallbackById = new Map((data.regions || []).map((region) => [region.id, region.fallback || ""]));
        if (data.regions?.length) {
          const group = document.createElement("optgroup");
          group.label = "Active mesoscale zones";
          group.dataset.temporaryRegions = "true";
          data.regions.forEach((region) => {
            const option = new Option(`${region.label} · temporary`, region.id);
            option.dataset.expiresAt = region.expiresAt;
            option.dataset.fallback = region.fallback || "";
            option.dataset.domain = (region.domains || [region.domain]).filter(Boolean).join(",");
            group.append(option);
          });
          select.prepend(group);
        }
        // Use a URL-selected temporary zone during initial hydration only.
        // An empty current value is the user's valid "Full United States"
        // selection and must not be replaced on later 60-second refreshes.
        const desired = current || pendingRequestedRegion;
        pendingRequestedRegion = "";
        if ([...select.options].some((option) => option.value === desired)) {
          if (select.value !== desired) {
            select.value = desired;
            select.dispatchEvent(new Event("change"));
          }
        } else if (current.startsWith("meso-")) {
          select.value = permanentValues.has(previousFallback) ? previousFallback : "";
          select.dispatchEvent(new Event("change"));
        }
      } catch { /* permanent regions remain available */ }
    }

    refresh();
    window.setInterval(removeExpiredOptions, 10_000);
    window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  };
})();
