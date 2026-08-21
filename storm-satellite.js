(() => {
  "use strict";
  const stormId = new URLSearchParams(location.search).get("id") || "";
  const image = document.querySelector("#tcSatImage"), loading = document.querySelector("#tcSatLoading");
  if (!stormId || !image) return;
  const time = document.querySelector("#tcSatTime"), position = document.querySelector("#tcSatPosition"), count = document.querySelector("#tcSatCount"), track = document.querySelector("#tcSatTrack"), previous = document.querySelector("#tcSatPrevious"), next = document.querySelector("#tcSatNext"), exportGif = document.querySelector("#tcSatExportGif"), gifDelay = document.querySelector("#tcSatGifDelay"), durationSelect = document.querySelector("#tcSatDuration"), productSelect = document.querySelector("#tcSatProduct"), openImage = document.querySelector("#tcSatOpenImage");
  let frames = [], frameIndex = -1, storm = null, loadToken = 0;
  const preload = (index) => { if (frames[index]?.imageUrl) { const adjacent = new Image(); adjacent.decoding = "async"; adjacent.src = frames[index].imageUrl; } };
  const showFrame = (index) => {
    if (!frames.length) return;
    frameIndex = Math.max(0, Math.min(frames.length - 1, index));
    const frame = frames[frameIndex], token = ++loadToken;
    loading.hidden = false; loading.textContent = `Rendering frame ${frameIndex + 1} of ${frames.length}…`;
    image.classList.remove("is-loaded");
    image.onload = () => { if (token !== loadToken) return; image.classList.add("is-loaded"); loading.hidden = true; preload(frameIndex - 1); preload(frameIndex + 1); };
    image.onerror = () => { if (token !== loadToken) return; image.classList.remove("is-loaded"); loading.hidden = false; loading.textContent = "FINISHED WEBP: LOAD FAILED"; };
    image.src = frame.imageUrl;
    if (openImage) openImage.href = frame.imageUrl;
    const observed = new Date(frame.observationTime);
    if (time) time.textContent = Number.isFinite(observed.getTime()) ? observed.toUTCString().replace(" GMT", " UTC") : "Latest frame";
    track.value = String(frameIndex); count.textContent = `${frameIndex + 1} of ${frames.length} · ${frameIndex === frames.length - 1 ? "Latest" : "Archive"}`;
    previous.disabled = frameIndex === 0; next.disabled = frameIndex === frames.length - 1;
  };
  const initialize = async () => {
    try {
      const duration = [30,60,90,180].includes(Number(durationSelect?.value)) ? Number(durationSelect.value) : 30;
      const product = ["infrared","water_vapor","visible"].includes(productSelect?.value) ? productSelect.value : "infrared";
      loading.hidden = false; loading.textContent = `Loading ${duration}-minute ${product.replace("_", " ")} loop…`;
      const response = await fetch(`/api/public/tropics/storm-satellite/frames?id=${encodeURIComponent(stormId.toLowerCase())}&product=${encodeURIComponent(product)}&source=best_available&duration=${duration}`, { cache:"no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
      storm = payload.storm || { id:payload.stormId, name:payload.stormName }; frames = [...(payload.frames || [])].reverse();
      if (!frames.length) throw new Error("No completed satellite WebPs available");
      const center = frames.at(-1)?.center;
      position.textContent = Array.isArray(center) ? `Centered ${Math.abs(Number(center[1])).toFixed(1)}°${center[1] >= 0 ? "N" : "S"} · ${Math.abs(Number(center[0])).toFixed(1)}°${center[0] >= 0 ? "E" : "W"}` : `${payload.selectedSource || "Best available"} · ${payload.product || "infrared"}`;
      track.max = String(frames.length - 1); showFrame(frames.length - 1);
    } catch (error) { loading.hidden = false; loading.textContent = `SATELLITE GRAPHIC: ${error.message}`; }
  };
  previous.addEventListener("click", () => showFrame(frameIndex - 1)); next.addEventListener("click", () => showFrame(frameIndex + 1)); track.addEventListener("input", () => showFrame(Number(track.value)));
  durationSelect?.addEventListener("change", () => { frames = []; frameIndex = -1; track.max = "0"; track.value = "0"; initialize(); });
  productSelect?.addEventListener("change", () => { frames = []; frameIndex = -1; track.max = "0"; track.value = "0"; initialize(); });
  document.addEventListener("keydown", (event) => { if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowLeft","ArrowRight"].includes(event.key) || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target?.tagName || "")) return; event.preventDefault(); showFrame(frameIndex + (event.key === "ArrowLeft" ? -1 : 1)); });
  exportGif?.addEventListener("click", async () => {
    const original = exportGif.textContent, selected = Number(gifDelay?.value), delay = [100,150,250,400,650].includes(selected) ? selected : 150;
    if (!frames.length || typeof GIF !== "function") { loading.hidden = false; loading.textContent = "GIF EXPORT: UNAVAILABLE"; return; }
    exportGif.disabled = true;
    try {
      const width = 1200, height = 950, canvas = document.createElement("canvas"), context = canvas.getContext("2d", { alpha:false }); canvas.width = width; canvas.height = height;
      const gif = new GIF({ workers:2, quality:10, width, height, globalPalette:true, workerScript:"/public-gif.worker.js" });
      for (let index = 0; index < frames.length; index += 1) {
        exportGif.textContent = `Preparing ${index + 1}/${frames.length}`;
        const response = await fetch(frames[index].imageUrl); if (!response.ok) throw new Error(`Frame returned HTTP ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        try { const rendered = new Image(); await new Promise((resolve,reject) => { rendered.onload = resolve; rendered.onerror = () => reject(new Error("A finished WebP could not be rendered")); rendered.src = objectUrl; }); context.drawImage(rendered, 0, 0, width, height); gif.addFrame(context, { copy:true, delay }); } finally { URL.revokeObjectURL(objectUrl); }
      }
      exportGif.textContent = "Encoding 0%"; gif.on("progress", (progress) => { exportGif.textContent = `Encoding ${Math.round(progress * 100)}%`; });
      const result = await new Promise((resolve,reject) => { gif.on("finished", resolve); gif.on("abort", () => reject(new Error("GIF export was interrupted"))); gif.render(); });
      const link = document.createElement("a"); link.href = URL.createObjectURL(result); link.download = `ZASNet-${stormId.toUpperCase()}-${productSelect?.value || "infrared"}-${frames.at(-1)?.id || "latest"}.gif`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 10000);
      count.textContent = `Exported ${frames.length}-frame GIF · ${delay} ms/frame`;
    } catch (error) { loading.hidden = false; loading.textContent = `GIF EXPORT: ${error.message}`; } finally { exportGif.disabled = false; exportGif.textContent = original; }
  });
  initialize();
})();
