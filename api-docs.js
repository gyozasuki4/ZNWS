(() => {
  const origin = window.location.origin;
  document.querySelectorAll("[data-origin]").forEach((node) => { node.textContent = origin; });
  document.querySelectorAll("[data-base-url]").forEach((node) => { node.textContent = `${origin}/api/public`; });
  document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copy);
    if (!target) return;
    await navigator.clipboard.writeText(target.textContent.trim());
    const old = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = old; }, 1400);
  }));
  document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-example]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === button.dataset.example));
  }));
})();
