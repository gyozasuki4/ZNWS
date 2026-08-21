(() => {
  "use strict";
  const themeStorageKey = "zasnet-public-theme";
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(themeStorageKey); } catch { /* storage may be disabled */ }
  const preferredTheme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = preferredTheme;
  if (!document.querySelector('link[data-public-theme]')) {
    const themeStyles = document.createElement("link");
    themeStyles.rel = "stylesheet";
    themeStyles.href = "/public-theme.css?v=20260815-black-theme-8";
    themeStyles.dataset.publicTheme = "true";
    document.head.append(themeStyles);
  }
  if (!document.querySelector('script[data-public-tracking]')) {
    const tracking = document.createElement("script");
    tracking.src = "/public-tracking.js?v=20260806-sitewide";
    tracking.dataset.publicTracking = "true";
    document.head.append(tracking);
  }
  const header = document.querySelector(".topbar, .site-nav, header.site-header, body.public-tropics > header");
  let colorScheme = document.querySelector('meta[name="color-scheme"]');
  if (!colorScheme) {
    colorScheme = document.createElement("meta");
    colorScheme.name = "color-scheme";
    document.head.append(colorScheme);
  }
  const setColorScheme = (theme) => { colorScheme.content = theme; };
  setColorScheme(preferredTheme);
  if (!document.querySelector('link[data-public-ui]')) {
    const ui = document.createElement("link");
    ui.rel = "stylesheet";
    ui.href = "/public-v3.css?v=20260803-auto-hide-map-toolbar";
    ui.dataset.publicUi = "true";
    document.head.append(ui);
  }
  const nav = header?.querySelector(":scope > nav");
  if (!header || !nav) return;
  nav.querySelectorAll('a[href*="ops.zasnetwx.com"]').forEach(link => link.remove());
  const themeToggle = document.createElement("button");
  themeToggle.className = "public-theme-toggle";
  themeToggle.type = "button";
  const syncThemeToggle = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} mode`);
    themeToggle.setAttribute("title", `Switch to ${dark ? "light" : "dark"} mode`);
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.innerHTML = `<span aria-hidden="true">${dark ? "☀" : "☾"}</span>`;
    setColorScheme(dark ? "dark" : "light");
  };
  themeToggle.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(themeStorageKey, theme); } catch { /* persistence is optional */ }
    syncThemeToggle();
  });
  nav.append(themeToggle);
  syncThemeToggle();
  if (!nav.querySelector('a[href*="radio.zasnetwx.com"]')) {
    const radio = document.createElement("a");
    radio.href = "https://radio.zasnetwx.com";
    radio.textContent = "Radio";
    nav.append(radio);
  }
  // Radio is added dynamically, so place Appearance after it.
  nav.append(themeToggle);
  if (header.querySelector(".public-menu-toggle")) return;
  const button = document.createElement("button");
  button.className = "public-menu-toggle";
  button.type = "button";
  if (!nav.id) nav.id = "public-navigation";
  button.setAttribute("aria-controls", nav.id);
  button.setAttribute("aria-label", "Open navigation menu");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("title", "Navigation menu");
  button.innerHTML = '<span></span><span></span><span></span>';
  header.insertBefore(button, nav);
  const close = (restoreFocus = false) => { const wasOpen = header.classList.contains("public-menu-open"); header.classList.remove("public-menu-open"); document.body.classList.remove("public-nav-open"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-label", "Open navigation menu"); if (restoreFocus && wasOpen) button.focus(); };
  button.addEventListener("click", () => { const open = !header.classList.contains("public-menu-open"); header.classList.toggle("public-menu-open", open); document.body.classList.toggle("public-nav-open", open); button.setAttribute("aria-expanded", String(open)); button.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu"); if (open) nav.querySelector("a")?.focus(); });
  nav.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
  document.addEventListener("click", (event) => { if (!header.contains(event.target)) close(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close(true);
    if (event.key !== "Tab" || !header.classList.contains("public-menu-open")) return;
    const items = [button, ...nav.querySelectorAll("a[href],button:not([disabled])")], first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 760) close(); });
  const installControlToggle = (panel, content, storageKey, label) => {
    if (!panel || !content || panel.querySelector(":scope > .map-controls-toggle")) return;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "map-controls-toggle";
    toggle.setAttribute("aria-controls", content.id || "");
    let stored = null;
    try { stored = localStorage.getItem(storageKey); } catch { /* storage may be disabled */ }
    let collapsed = stored === "collapsed" || (stored === null && matchMedia("(max-width: 600px)").matches);
    const sync = () => {
      panel.classList.toggle("controls-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.innerHTML = `<span aria-hidden="true">${collapsed ? "+" : "−"}</span>${collapsed ? "Show" : "Hide"} ${label}`;
    };
    toggle.addEventListener("click", () => {
      collapsed = !collapsed;
      try { localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded"); } catch { /* persistence is optional */ }
      sync();
      if (!collapsed) window.setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    });
    panel.prepend(toggle);
    sync();
    {
      const desktopControls = window.matchMedia(document.body.classList.contains("models-page") && panel.matches(".outlook-viewer > header") ? "(min-width: 701px)" : "(min-width: 761px)");
      const syncDesktopToggle = () => {
        if (desktopControls.matches) {
          collapsed = false;
          sync();
        }
        toggle.hidden = desktopControls.matches;
        toggle.style.display = desktopControls.matches ? "none" : "";
      };
      desktopControls.addEventListener?.("change", syncDesktopToggle);
      syncDesktopToggle();
    }
  };
  const workstationHeader = document.querySelector(".outlook-viewer > header");
  const workstationControls = workstationHeader?.querySelector(".viewer-controls");
  if (workstationControls) {
    if (!workstationControls.id) workstationControls.id = "mapViewerControls";
    const pageKey = document.body.classList.contains("models-page") ? "models" : document.body.classList.contains("severe-outlooks-page") ? "severe-outlooks" : "weather-maps";
    installControlToggle(workstationHeader, workstationControls, `zasnet-controls-${pageKey}`, "map controls");
  }
  const localMapTools = document.querySelector("body.public-wfo .local-workspace .map-tools");
  if (localMapTools) {
    if (!localMapTools.id) localMapTools.id = "localMapControls";
    installControlToggle(localMapTools, localMapTools, "zasnet-controls-wfo", "map controls");
  }

  const installMapFeedback = (frame) => {
    const image = frame?.querySelector("img:not([hidden])"), feedback = frame?.querySelector(".image-status");
    if (!image || !feedback || feedback.dataset.enhanced) return;
    feedback.dataset.enhanced = "true";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const sync = () => {
      const failed = /unavailable|could not|failed|not available|try again/i.test(feedback.textContent);
      feedback.classList.toggle("is-error", failed);
      if (!failed || feedback.querySelector(".map-retry-button")) return;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "map-retry-button";
      retry.textContent = "Retry map";
      retry.addEventListener("click", () => {
        const source = image.currentSrc || image.src;
        if (!source) return;
        const url = new URL(source, location.href);
        url.searchParams.set("retry", Date.now());
        feedback.classList.remove("is-error");
        feedback.textContent = "Loading map again…";
        feedback.hidden = false;
        image.classList.remove("is-loaded");
        image.src = url;
      });
      feedback.append(retry);
    };
    new MutationObserver(sync).observe(feedback, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    sync();
  };
  document.querySelectorAll(".outlook-viewer .image-frame").forEach(installMapFeedback);

  const viewer = document.querySelector(".outlook-viewer");
  if (viewer && (document.body.classList.contains("models-page") || document.body.classList.contains("weather-maps-page") || document.body.classList.contains("severe-outlooks-page"))) {
    const openQuickProductPicker = (select, mode = "product") => {
      if (!select) return;
      let dialog = document.querySelector("#quickMapProductDialog");
      if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.id = "quickMapProductDialog";
        dialog.className = "quick-product-dialog";
        dialog.innerHTML = `<header><div><span>Weather maps</span><h2>Choose a map product</h2></div><button type="button" aria-label="Close picker">×</button></header><div class="quick-product-list"></div>`;
        document.body.append(dialog);
        dialog.querySelector("header button").addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
      }
      dialog.querySelector("header span").textContent = mode === "region" ? "Map view" : "Weather maps";
      dialog.querySelector("header h2").textContent = mode === "region" ? "Choose a region" : "Choose a map product";
      const list = dialog.querySelector(".quick-product-list");
      list.replaceChildren();
      const groups = [...select.querySelectorAll("optgroup")];
      const directOptions = [...select.children].filter(node => node.tagName === "OPTION");
      if (directOptions.length) groups.unshift({ label: "National", querySelectorAll: () => directOptions });
      groups.forEach(group => {
        const options = [...group.querySelectorAll("option")].filter(option => !option.hidden && !option.disabled);
        if (!options.length) return;
        const section = document.createElement("section"), heading = document.createElement("h3");
        heading.textContent = group.label; section.append(heading);
        options.forEach(option => {
          const button = document.createElement("button");
          button.type = "button"; button.className = option.value === select.value ? "is-selected" : "";
          button.innerHTML = `<span>${option.textContent}</span><small>${option.value === select.value ? "Selected" : "View"}</small>`;
          button.addEventListener("click", () => { select.value = option.value; select.dispatchEvent(new Event("change", { bubbles: true })); dialog.close(); });
          section.append(button);
        });
        list.append(section);
      });
      dialog.showModal();
    };
    const dock = document.createElement("nav");
    dock.className = "mobile-map-toolbar";
    dock.setAttribute("aria-label", "Quick map controls");
    dock.innerHTML = `<button type="button" data-map-action="controls"><span aria-hidden="true">☰</span><small>Controls</small></button><button type="button" data-map-action="previous"><span aria-hidden="true">‹</span><small>Previous</small></button><button type="button" class="mobile-map-primary" data-map-action="play"><span aria-hidden="true">▶</span><small>Play</small></button><button type="button" data-map-action="next"><span aria-hidden="true">›</span><small>Next</small></button><button type="button" data-map-action="product"><span aria-hidden="true">▤</span><small>Product</small></button>`;
    if (document.body.classList.contains("weather-maps-page")) {
      const regionAction = dock.querySelector('[data-map-action="controls"]');
      regionAction.dataset.mapAction = "region";
      regionAction.innerHTML = `<span aria-hidden="true">⌖</span><small>Region</small>`;
    }
    viewer.append(dock);
    const action = (name) => dock.querySelector(`[data-map-action="${name}"]`);
    const pageProduct = () => document.querySelector("#modelProduct, #productChoices");
    const targets = () => {
      if (document.body.classList.contains("models-page")) return { previous: "#previousFrame", play: "#modelPlayButton", next: "#nextFrame" };
      if (document.body.classList.contains("weather-maps-page")) {
        const selected = document.querySelector("#productChoices")?.value;
        if (selected === "satellite" && document.querySelector("#satelliteChoices")?.value === "geocolor") return { previous: "#satelliteLoopPrevious", play: "#satelliteLoopPlay", next: "#satelliteLoopNext" };
        if (selected === "forecast") return { previous: "#forecastTimePrevious", next: "#forecastTimeNext" };
        if (["smokeobs", "smokevert", "hrrr-refc", "hrrr-cape", "hrrr-mucape", "hrrr-mlcape", "hrrr-mlcin", "hrrr-srh01", "hrrr-srh03", "hrrr-rh", "hrrr-gust"].includes(selected)) return { previous: "#smokeTimePrevious", next: "#smokeTimeNext" };
      }
      return {};
    };
    const syncDock = () => {
      const controlsOpen = Boolean(workstationHeader && !workstationHeader.classList.contains("controls-collapsed"));
      dock.classList.toggle("is-controls-open", controlsOpen);
      const current = targets();
      ["previous", "play", "next"].forEach(name => {
        const original = current[name] && document.querySelector(current[name]);
        const quickAction = action(name), shouldHide = !original, shouldDisable = Boolean(original?.disabled);
        if (quickAction.hidden !== shouldHide) quickAction.hidden = shouldHide;
        if (quickAction.disabled !== shouldDisable) quickAction.disabled = shouldDisable;
        if (name === "play" && original) {
          const playing = original.getAttribute("aria-pressed") === "true";
          const symbol = quickAction.querySelector("span"), label = quickAction.querySelector("small");
          const nextSymbol = playing ? "Ⅱ" : "▶", nextLabel = playing ? "Pause" : "Play";
          if (symbol.textContent !== nextSymbol) symbol.textContent = nextSymbol;
          if (label.textContent !== nextLabel) label.textContent = nextLabel;
        }
      });
      const visibleActions = [...dock.querySelectorAll(":scope > button[data-map-action]")].filter(button => !button.hidden).length;
      dock.style.setProperty("--mobile-map-actions", String(Math.max(2, visibleActions)));
      const selected = pageProduct()?.selectedOptions?.[0]?.textContent?.trim();
      action("product").title = selected ? `Current product: ${selected}` : "Choose product";
    };
    dock.addEventListener("click", event => {
      const button = event.target.closest("button[data-map-action]");
      if (!button) return;
      const name = button.dataset.mapAction;
      if (name === "product" && document.querySelector("#productPickerButton")) {
        document.querySelector("#productPickerButton").click();
        return;
      }
      if (name === "product" && document.body.classList.contains("weather-maps-page")) {
        openQuickProductPicker(pageProduct());
        return;
      }
      if (name === "region" && document.body.classList.contains("weather-maps-page")) {
        openQuickProductPicker(document.querySelector("#regionSelect"), "region");
        return;
      }
      if (name === "controls" || name === "product") {
        if (workstationHeader?.classList.contains("controls-collapsed")) workstationHeader.querySelector(":scope > .map-controls-toggle")?.click();
        if (name === "product") window.setTimeout(() => pageProduct()?.focus(), 100);
        else workstationHeader?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const selector = targets()[name];
      if (selector) document.querySelector(selector)?.click();
      window.setTimeout(syncDock, 0);
    });
    document.addEventListener("change", event => { if (event.target.closest(".viewer-controls")) window.setTimeout(syncDock, 0); });
    new MutationObserver(syncDock).observe(viewer, { subtree: true, attributes: true, attributeFilter: ["disabled", "aria-pressed", "hidden"] });
    if (workstationHeader) new MutationObserver(syncDock).observe(workstationHeader, { attributes: true, attributeFilter: ["class"] });
    window.setTimeout(syncDock, 0);
  }
})();
