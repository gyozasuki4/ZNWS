(() => {
  async function syncPrimaryWfo() {
    try {
      const response = await fetch("/api/preferences", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const preferences = await response.json();
      const target = String(preferences.primaryWfo || "").replace(/^K/i, "").toUpperCase();
      if (!target) return;
      const select = document.querySelector("#officeSelect");
      const apply = () => {
        if (![...select.options].some((option) => option.value === target)) return false;
        if (select.value !== target) { select.value = target; select.dispatchEvent(new Event("change")); }
        return true;
      };
      if (apply()) return;
      const timer = window.setInterval(() => { if (apply()) window.clearInterval(timer); }, 100);
      window.setTimeout(() => window.clearInterval(timer), 10_000);
    } catch { /* GFE can use its local office list if preferences fail. */ }
  }
  syncPrimaryWfo();
})();
