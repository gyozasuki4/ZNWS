(() => {
  const id = new URLSearchParams(location.search).get("id");
  const select = document.querySelector("#tcStormProduct");
  const buttons = [...document.querySelectorAll("[data-product]")];
  const image = document.querySelector("#tcForecastImage");
  const status = document.querySelector("#coneStatus");
  const caption = document.querySelector("#coneCaption");
  const open = document.querySelector("#openCone");
  const title = document.querySelector("#title");
  const details = document.querySelector("#details");
  const latest = document.querySelector("#latest");
  if (!id || !image || !status) return;
  let request = 0;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
  const classification = (value) => ({ TD:"Tropical Depression", TS:"Tropical Storm", HU:"Hurricane", ST:"Subtropical Storm", SD:"Subtropical Depression", PT:"Post-Tropical Cyclone" })[String(value || "").toUpperCase()] || value || "Tropical Cyclone";
  const direction = (degrees) => {
    const value = Number(degrees);
    return Number.isFinite(value) ? ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(value / 22.5) % 16] : "—";
  };
  async function renderStormDetails() {
    try {
      const response = await fetch(`/api/public/tropics/storm?id=${encodeURIComponent(id)}`, { cache:"no-store" });
      const data = await response.json();
      if (!response.ok || !data.storm) throw new Error(data.error || `HTTP ${response.status}`);
      const storm = data.storm;
      const type = classification(storm.classification);
      const updated = storm.lastUpdate ? new Date(storm.lastUpdate).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" }) : "Latest advisory";
      const advisoryUrl = storm.publicAdvisory?.url;
      if (title) title.textContent = `${type} ${storm.name}`;
      if (details) details.textContent = `${storm.intensity || "—"} kt maximum sustained winds · ${storm.pressure || "—"} mb · Updated ${updated}`;
      if (latest) latest.innerHTML = `<article><h3>${escapeHtml(storm.name)} · ${escapeHtml(type)}</h3><p><b>${escapeHtml(storm.intensity || "—")} kt</b> maximum sustained winds · ${escapeHtml(storm.pressure || "—")} mb minimum pressure</p><p>Center: ${escapeHtml(storm.latitude || "—")} · ${escapeHtml(storm.longitude || "—")} · Moving ${escapeHtml(direction(storm.movementDir))} at ${escapeHtml(storm.movementSpeed || "—")} mph</p>${advisoryUrl ? `<a href="${escapeHtml(advisoryUrl)}" target="_blank" rel="noopener">Read latest official advisory →</a>` : ""}</article>`;
    } catch (error) {
      if (title) title.textContent = id.toUpperCase();
      if (details) details.textContent = "The latest storm advisory is temporarily unavailable.";
      if (latest) latest.innerHTML = `<article><h3>Advisory unavailable</h3><p>${escapeHtml(error.message)}</p></article>`;
    }
  }
  async function render() {
    const token = ++request;
    const product = (select?.value || buttons.find((b) => b.classList.contains("active"))?.dataset.product || "forecast_cone");
    status.hidden = false; status.textContent = "Loading official graphic…";
    status.classList.remove("is-error");
    image.classList.remove("is-loaded");
    image.hidden = true;
    try {
      const response = await fetch(`/api/public/tropics/storm-graphics/frames?id=${encodeURIComponent(id)}&product=${encodeURIComponent(product)}`, { cache: "no-store" });
      const data = await response.json();
      if (token !== request) return;
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const frame = (data.frames || []).find((entry) => entry.imageUrl);
      if (!frame) throw new Error("No published graphic for this product");
      image.onload = () => { if (token === request) { image.hidden = false; image.classList.add("is-loaded"); status.hidden = true; } };
      image.onerror = () => { if (token === request) { status.classList.add("is-error"); status.textContent = "The graphic image could not be rendered."; } };
      image.src = frame.imageUrl + (frame.imageUrl.includes("?") ? "&" : "?") + "view=" + Date.now();
      if (open) open.href = frame.imageUrl;
      if (caption) caption.textContent = `${id.toUpperCase()} · ${product.replaceAll("_", " ")} · ${frame.observationTime || "Latest"}`;
    } catch (error) { if (token === request) { status.classList.add("is-error"); status.textContent = error.message; } }
  }
  select?.addEventListener("change", render);
  buttons.forEach((button) => button.addEventListener("click", () => { buttons.forEach((b) => b.classList.toggle("active", b === button)); render(); }));
  renderStormDetails();
  render();
})();
