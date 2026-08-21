(() => {
  const id = new URLSearchParams(location.search).get("id");
  const select = document.querySelector("#tcStormProduct");
  const image = document.querySelector("#tcForecastImage");
  const status = document.querySelector("#coneStatus");
  const caption = document.querySelector("#coneCaption");
  if (!id || !select || !image) return;
  async function render() {
    const product = select.value || "forecast_cone";
    status.hidden = false; status.textContent = "Loading official graphic…"; image.hidden = true;
    try {
      const response = await fetch(`/api/public/tropics/storm-graphics/frames?id=${encodeURIComponent(id)}&product=${encodeURIComponent(product)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const frame = (data.frames || []).find((entry) => entry.imageUrl);
      if (!frame) throw new Error("No published graphic for this product");
      image.onload = () => { image.hidden = false; status.hidden = true; };
      image.onerror = () => { status.hidden = false; status.textContent = "The graphic image could not be rendered."; };
      image.src = frame.imageUrl + (frame.imageUrl.includes("?") ? "&" : "?") + "view=" + Date.now();
      caption.textContent = `${frame.stormName || id.toUpperCase()} · ${product.replaceAll("_", " ")} · ${frame.observationTime || "Latest"}`;
    } catch (error) { status.hidden = false; status.textContent = error.message; image.hidden = true; }
  }
  select.addEventListener("change", render); render();
})();
