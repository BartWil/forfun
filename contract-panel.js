// contract-panel.js: renders a station's scientific contract from stations.js.
//
// No page hand-writes this panel. Drop the script in and it finds the station by
// filename, builds the panel, and injects it just before the footer. That way a
// contract can never fall out of step with the page, because there is only one copy.
//
// If a page has no contract the script does nothing and says so in the console,
// which is how you notice a new station was added without one.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html";

  const UI = {
    heading:  { en: "Scientific contract", pl: "Kontrakt naukowy" },
    lede:     { en: "What this station is claiming, and what it is not.",
                pl: "Co ta stacja twierdzi, a czego nie." },
    goal:     { en: "What you should be able to do afterwards", pl: "Co powinieneś potrafić po tej stacji" },
    measured: { en: "Measured", pl: "Zmierzone" },
    measuredD:{ en: "came off an instrument", pl: "pochodzi z przyrządu" },
    calculated:{ en: "Calculated", pl: "Obliczone" },
    calculatedD:{ en: "derived by arithmetic we show", pl: "wyprowadzone rachunkiem, który pokazujemy" },
    modelled: { en: "Modelled", pl: "Modelowane" },
    modelledD:{ en: "came from an assumption", pl: "pochodzi z założenia" },
    assume:   { en: "Main assumptions", pl: "Główne założenia" },
    cannot:   { en: "What you cannot conclude from this station", pl: "Czego nie wolno wnioskować z tej stacji" },
    sources:  { en: "Primary sources", pl: "Źródła pierwotne" },
    none:     { en: "nothing on this station", pl: "nic na tej stacji" },
    toggle:   { en: "Scientific contract", pl: "Kontrakt naukowy" },
    level:    { beginner: { en: "beginner", pl: "podstawowy" },
                intermediate: { en: "intermediate", pl: "średni" } },
    status:   {
      verified:      { en: "traceable to a published measurement", pl: "powiązane z opublikowanym pomiarem" },
      reconstructed: { en: "reconstructed from the literature", pl: "odtworzone z literatury" },
      synthetic:     { en: "synthetic teaching model", pl: "syntetyczny model dydaktyczny" },
      reference:     { en: "reference material", pl: "materiał referencyjny" },
    },
  };

  function list(items, cls) {
    if (!items || !items.length) return '<li class="sc-empty">' + L(UI.none) + "</li>";
    return items.map(i => "<li" + (cls ? ' class="' + cls + '"' : "") + ">" + L(i) + "</li>").join("");
  }

  function render(st) {
    const c = st.contract;
    const S = window.STATIONS;
    const track = S.TRACKS[st.track];
    const el = document.createElement("section");
    el.className = "sci-contract";
    el.id = "scientific-contract";
    el.innerHTML =
      '<details class="sc-wrap" open>' +
        '<summary class="sc-head">' +
          '<span class="sc-title">' + L(UI.heading) + "</span>" +
          '<span class="sc-meta">' +
            '<span class="sc-chip sc-track" style="--tc:' + track.colour + '">' + L(track) + "</span>" +
            '<span class="sc-chip">' + L(UI.level[st.level]) + "</span>" +
            '<span class="sc-chip sc-status sc-' + st.status + '">' + L(UI.status[st.status]) + "</span>" +
          "</span>" +
        "</summary>" +
        '<div class="sc-body">' +
          '<p class="sc-lede">' + L(UI.lede) + "</p>" +

          '<div class="sc-goal"><span class="sc-goal-l">' + L(UI.goal) + "</span>" +
            "<p>" + L(c.learningGoal) + "</p></div>" +

          '<div class="sc-grid">' +
            '<div class="sc-col sc-measured"><h4>' + L(UI.measured) +
              "<em>" + L(UI.measuredD) + "</em></h4><ul>" + list(c.measured) + "</ul></div>" +
            '<div class="sc-col sc-calculated"><h4>' + L(UI.calculated) +
              "<em>" + L(UI.calculatedD) + "</em></h4><ul>" + list(c.calculated) + "</ul></div>" +
            '<div class="sc-col sc-modelled"><h4>' + L(UI.modelled) +
              "<em>" + L(UI.modelledD) + "</em></h4><ul>" + list(c.modelled) + "</ul></div>" +
          "</div>" +

          '<div class="sc-two">' +
            '<div class="sc-assume"><h4>' + L(UI.assume) + "</h4><ul>" + list(c.assumptions) + "</ul></div>" +
            '<div class="sc-cannot"><h4>' + L(UI.cannot) + "</h4><ul>" + list(c.cannotConclude) + "</ul></div>" +
          "</div>" +

          '<div class="sc-src"><h4>' + L(UI.sources) + "</h4><ul>" +
            (c.primarySources || []).map(s =>
              "<li>" + (s.url ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.cite + "</a>"
                              : s.cite) + "</li>").join("") +
          "</ul></div>" +
        "</div>" +
      "</details>";
    return el;
  }

  function mount() {
    const S = window.STATIONS;
    if (!S) return;
    const st = S.forPage(file);
    if (!st) {
      console.warn("[contract] no scientific contract for " + file + ". Add one to stations.js.");
      return;
    }
    const existing = document.getElementById("scientific-contract");
    if (existing) existing.remove();
    const el = render(st);
    const footer = document.getElementById("footer");
    // A station may opt to place the panel itself by leaving a hook.
    const slot = document.getElementById("contractSlot");
    if (slot) slot.appendChild(el);
    else if (footer && footer.parentNode) footer.parentNode.insertBefore(el, footer);
    else document.body.appendChild(el);
  }

  function boot() {
    mount();
    document.addEventListener("i18n:changed", mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
