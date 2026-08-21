(function () {
  const MANIFEST_URL = "/api/public/satellite/m2-ir-frames";
  const image = document.querySelector("#satImage");
  const loading = document.querySelector("#loadingState");
  const valid = document.querySelector("#validTime");
  const sourceLine = document.querySelector("#sourceLine");
  const frameTrack = document.querySelector("#frameTrack");
  const framePosition = document.querySelector("#framePosition");
  const windowStart = document.querySelector("#windowStart");
  const previousButton = document.querySelector("#previousFrame");
  const nextButton = document.querySelector("#nextFrame");
  let frames = [];
  let frameIndex = -1;
  let loadToken = 0;

  function formatTime(iso) {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric"
    }).format(date).toUpperCase();
    const z = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}Z`;
    const et = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true
    }).format(date);
    return `${z} / ${et} ET — ${day}`;
  }

  function preload(index) {
    const frame = frames[index];
    if (!frame?.imageUrl) return;
    const adjacent = new Image();
    adjacent.decoding = "async";
    adjacent.src = frame.imageUrl;
  }

  function showFrame(index) {
    if (!frames.length) return;
    frameIndex = Math.max(0, Math.min(frames.length - 1, index));
    const frame = frames[frameIndex];
    const token = ++loadToken;
    loading.hidden = false;
    loading.querySelector("b").textContent = "LOADING SATELLITE FRAME";
    loading.querySelector("span").textContent = `${frameIndex + 1} of ${frames.length}`;
    image.onload = () => {
      if (token !== loadToken) return;
      loading.hidden = true;
      preload(frameIndex - 1);
      preload(frameIndex + 1);
    };
    image.onerror = () => {
      if (token !== loadToken) return;
      loading.hidden = false;
      loading.querySelector("b").textContent = "FRAME UNAVAILABLE";
      loading.querySelector("span").textContent = "The WebP image could not be loaded";
    };
    image.src = frame.imageUrl;
    valid.textContent = formatTime(frame.observationTime);
    frameTrack.value = String(frameIndex);
    framePosition.textContent = `${frameIndex + 1} OF ${frames.length} · ${frameIndex === frames.length - 1 ? "LATEST" : new Date(frame.observationTime).toISOString().slice(11, 16) + "Z"}`;
    previousButton.disabled = frameIndex === 0;
    nextButton.disabled = frameIndex === frames.length - 1;
  }

  async function loadFrames() {
    loading.hidden = false;
    loading.querySelector("b").textContent = "LOADING GOES-19 M2";
    loading.querySelector("span").textContent = "Reading the latest 30-minute frame list…";
    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      const manifest = await response.json();
      const complete = (manifest.frames || []).filter((frame) =>
        frame.ready && frame.imageUrl && frame.availableTileCount === frame.expectedTileCount
      );
      if (!complete.length) throw new Error("No completed WebP frames are available");
      const newest = Date.parse(complete[0].observationTime);
      frames = complete
        .filter((frame) => newest - Date.parse(frame.observationTime) <= 30 * 60 * 1000)
        .reverse();
      frameTrack.max = String(frames.length - 1);
      windowStart.textContent = `${Math.round((newest - Date.parse(frames[0].observationTime)) / 60000)} MIN AGO`;
      sourceLine.textContent = `Source: NOAA/NESDIS · GOES-19 M2 · ${frames.length} WebP frames · Use ← and → to step`;
      showFrame(frames.length - 1);
    } catch (error) {
      loading.hidden = false;
      loading.querySelector("b").textContent = "SATELLITE UNAVAILABLE";
      loading.querySelector("span").textContent = error.message;
    }
  }

  const step = (amount) => showFrame(frameIndex + amount);
  previousButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));
  frameTrack.addEventListener("input", () => showFrame(Number(frameTrack.value)));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  });
  document.querySelector("#refreshButton").addEventListener("click", loadFrames);
  window.setInterval(loadFrames, 120000);
  loadFrames();
}());
