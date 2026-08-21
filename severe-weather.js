(() => {
  "use strict";
  const imageBase = "/api/public/outlooks/spc/static";
  const image = document.querySelector("#outlookImage"), status = document.querySelector("#imageStatus"), caption = document.querySelector("#imageCaption"), openImage = document.querySelector("#openImage"), regionSelect = document.querySelector("#regionSelect");
  const exportOutlook = document.querySelector("#exportOutlook"), outlookState = document.querySelector("#outlookState"), outlookMeaning = document.querySelector("#outlookMeaning"), viewerStatus = document.querySelector("#viewerStatus"), sourceLink = document.querySelector("#sourceLink");
  const regionalGroup = [...regionSelect.querySelectorAll("optgroup")].find((group) => group.label === "Regional views");
  if (regionalGroup && !regionalGroup.querySelector('option[value="philadelphia-dma"]')) regionalGroup.prepend(new Option("Philadelphia DMA", "philadelphia-dma"));
  let day = "1", type = "cat", updateToken = 0;
  const typeName = { cat: "categorical", torn: "tornado probability", wind: "wind probability", hail: "hail probability", all: "four-panel combined" };
  const regionName = () => regionSelect.value ? regionSelect.value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "Full United States";
  function syncControls() {
    document.querySelectorAll("#dayChoices button").forEach((button) => { button.classList.toggle("is-active", button.dataset.day === day); });
    document.querySelectorAll("#typeChoices button").forEach((button) => {
      button.disabled = day === "3" && button.dataset.type !== "cat";
      button.classList.toggle("is-active", button.dataset.type === type);
    });
    document.querySelector("#dayChoices")?.closest(".control-group")?.classList.remove("guidance-control-disabled");
    document.querySelector("#typeChoices")?.closest(".control-group")?.classList.remove("guidance-control-disabled");
  }
  async function update() {
    const token = ++updateToken;
    if (day === "3" && type !== "cat") type = "cat";
    syncControls();
    const region = regionSelect.value, suffix = region ? `-${region}` : "";
    status.hidden = false; status.textContent = "Loading outlook image…";
    image.classList.remove("is-loaded");
    try {
      const url = `${imageBase}/day${day}${type}${suffix}.svg?refresh=${Date.now()}`;
        image.alt = `SPC ${typeName[type]} severe weather outlook for Day ${day}${region ? `, ${region.replaceAll("-", " ")}` : ""}`;
        caption.textContent = `SPC Day ${day} ${typeName[type]} outlook · ${regionName()}`;
        viewerStatus.textContent = "Official SPC";
        sourceLink.href = "https://www.spc.noaa.gov/products/outlook/"; sourceLink.textContent = "Official SPC";
        outlookState.textContent = `Day ${day} ${typeName[type]} outlook · ${regionName()}`;
        outlookMeaning.textContent = ({ cat: "Categorical outlooks summarize the overall severe-thunderstorm risk.", torn: "Tornado probabilities show the chance of a tornado within 25 miles of a point.", wind: "Wind probabilities show the chance of damaging thunderstorm winds within 25 miles of a point.", hail: "Hail probabilities show the chance of severe hail within 25 miles of a point.", all: "One image combines categorical, tornado, wind, and hail outlooks in a 2 × 2 layout." })[type];
      image.src = url; openImage.href = url;
    } catch (error) {
      if (token !== updateToken) return;
      status.hidden = false; status.textContent = "This outlook image is temporarily unavailable.";
    }
  }
  document.querySelectorAll("#dayChoices button").forEach((button) => button.addEventListener("click", () => { if (button.disabled) return; day = button.dataset.day; document.querySelectorAll("#dayChoices button").forEach((item) => item.classList.toggle("is-active", item === button)); update(); }));
  document.querySelectorAll("#typeChoices button").forEach((button) => button.addEventListener("click", () => { if (button.disabled) return; type = button.dataset.type; document.querySelectorAll("#typeChoices button").forEach((item) => item.classList.toggle("is-active", item === button)); update(); }));
  regionSelect.addEventListener("change", update);
  window.installTemporaryMapRegions?.(regionSelect);
  image.addEventListener("load", () => { image.classList.add("is-loaded"); status.hidden = true; });
  image.addEventListener("error", () => {
    status.hidden = false; status.textContent = "This outlook image is not available yet. Try a different day, type, or view.";
  });
  exportOutlook?.addEventListener("click", () => { const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth || 1400; canvas.height = image.naturalHeight || 900; canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `zasnet-day${day}-${type}-outlook.png`; link.click(); });
  update();
  window.setInterval(update, 6 * 60 * 60_000);
})();
