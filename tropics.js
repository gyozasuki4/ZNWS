(() => {
  "use strict";

  const views = {
    overview: { label: "Current tropical systems", alt: "Current tropical systems across the NHC area of responsibility" },
    atlantic: { label: "Atlantic tropical weather outlook", alt: "Atlantic basin tropical weather outlook" },
    "east-pacific": { label: "East Pacific tropical weather outlook", alt: "Eastern Pacific basin tropical weather outlook" },
    "west-pacific": { label: "West Pacific tropical weather outlook", alt: "Western Pacific basin tropical weather outlook" }
  };
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const formatTime = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" }) : "Latest available";
  };
  const stormClass = (storm) => {
    const knots = Number(storm.intensity) || 0;
    return knots >= 64 ? "hurricane" : knots >= 34 ? "tropical-storm" : "depression";
  };

  async function loadGraphic(view, focus = false) {
    const meta = views[view] || views.overview;
    const status = $("#graphicStatus"), image = $("#tropicalGraphic");
    document.querySelectorAll(".tc-tabs button").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.view === view)));
    status.hidden = false;
    status.innerHTML = "<span></span>Loading operational graphic";
    image.classList.remove("is-ready");
    try {
      const response = await fetch(`/api/public/tropics/graphics?view=${encodeURIComponent(view)}`, { cache:"no-store" });
      const data = await response.json();
      if (!response.ok || !data.frames?.length) throw new Error(data.error || "No graphic is available");
      const frame = data.frames.find((item) => item.ready) || data.frames[0];
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Graphic could not be displayed"));
        image.src = frame.imageUrl;
      });
      image.alt = meta.alt;
      image.classList.add("is-ready");
      status.hidden = true;
      $("#graphicCaption").textContent = `${meta.label} · ${frame.satellite || "NHC + CPHC"}`;
      $("#graphicTime").textContent = formatTime(frame.observationTime);
      $("#openGraphic").href = frame.imageUrl;
      if (focus) $("#overviewTitle").scrollIntoView({ behavior:"smooth", block:"start" });
    } catch (error) {
      status.innerHTML = `<strong>Product unavailable</strong>${escapeHtml(error.message)}`;
    }
  }

  async function loadStorms() {
    const host = $("#storms");
    try {
      const response = await fetch("/api/public/tropics", { cache:"no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "NHC data unavailable");
      const storms = data.activeStorms || [];
      $("#systemCount").textContent = storms.length ? `${storms.length} active ${storms.length === 1 ? "system" : "systems"}` : "No active cyclones";
      $("#dataTime").textContent = `NHC checked ${new Date().toLocaleTimeString([], { hour:"numeric", minute:"2-digit", timeZoneName:"short" })}`;
      host.innerHTML = storms.length ? storms.map((storm, index) => {
        const intensity = Number(storm.intensity) || 0;
        const mph = Math.round(intensity * 1.15078);
        return `<article class="tc-storm-card ${stormClass(storm)}">
          <div class="tc-storm-index">${String(index + 1).padStart(2, "0")}</div>
          <div class="tc-storm-title"><span>${escapeHtml(storm.classification || "Tropical cyclone")}</span><h3>${escapeHtml(storm.name)}</h3><p>${escapeHtml(storm.binNumber || storm.id)}</p></div>
          <dl><div><dt>Maximum wind</dt><dd>${intensity}<small>kt</small></dd><span>${mph} mph</span></div><div><dt>Pressure</dt><dd>${escapeHtml(storm.pressure || "—")}<small>mb</small></dd><span>Central pressure</span></div><div><dt>Position</dt><dd class="tc-position">${escapeHtml(storm.latitude || "—")}<br>${escapeHtml(storm.longitude || "—")}</dd><span>Latest center</span></div></dl>
          <a href="/tropics/storm?id=${encodeURIComponent(storm.id)}"><span>Open storm center</span><b>→</b></a>
        </article>`;
      }).join("") : `<article class="tc-empty"><span class="tc-all-clear">✓</span><div><h3>No active tropical cyclones</h3><p>The National Hurricane Center has no active systems at this time. Formation areas may still appear in the outlook products above.</p></div></article>`;
    } catch (error) {
      $("#systemCount").textContent = "Data connection interrupted";
      $("#dataTime").textContent = "Retrying on next visit";
      host.innerHTML = `<article class="tc-empty tc-error"><div><h3>Active systems unavailable</h3><p>${escapeHtml(error.message)}</p></div></article>`;
    }
  }

  document.querySelectorAll(".tc-tabs button").forEach((button) => button.addEventListener("click", () => loadGraphic(button.dataset.view)));
  document.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => loadGraphic(button.dataset.jump, true)));
  loadGraphic("overview");
  loadStorms();
})();
