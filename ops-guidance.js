(function () {
  "use strict";
  const input = document.querySelector("#guidanceSearch");
  const articles = [...document.querySelectorAll("#guidanceContent article")];
  const result = document.querySelector("#guidanceResults");
  const clear = document.querySelector("#guidanceSearchClear");
  function filter() {
    const query = String(input?.value || "").trim().toLowerCase();
    let visible = 0;
    articles.forEach((article) => {
      const match = !query || `${article.dataset.guideKeywords || ""} ${article.textContent}`.toLowerCase().includes(query);
      article.hidden = false;
      if (match) visible += 1;
    });
    if (result) result.textContent = query ? `${visible} section${visible === 1 ? "" : "s"} contain “${query}.” All chapters remain visible; use your browser’s Find command to jump between matches.` : "";
  }
  input?.addEventListener("input", filter);
  function reset() {
    if (input) input.value = "";
    articles.forEach((article) => { article.hidden = false; });
    if (result) result.textContent = "";
  }
  clear?.addEventListener("click", () => { reset(); input?.focus(); });
  window.addEventListener("pageshow", reset);
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); input?.focus(); }
    if (event.key === "Escape" && document.activeElement === input) { input.value = ""; filter(); input.blur(); }
  });
  reset();
})();
