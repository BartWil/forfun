// nav.js: single source of truth for the site nav. Builds a grouped, bilingual (EN/PL) menu into
// #navLinks on every page, marks the active item, and wires the mobile hamburger + dropdowns.
// Loaded after i18n.js so it can read window.i18n.lang and rebuild on language change.

(function () {
  "use strict";
  // The menu is generated from stations.js, so a station added to the catalogue
  // appears here automatically and can never be listed under the wrong track.
  // Home and Explorer stay as singles: they are entry points, not track members.
  const SINGLES = [
    { href: "index.html", en: "Home ✦", pl: "Start ✦" },
    { href: "explorer.html", en: "Explorer", pl: "Eksplorator" },
  ];
  const TRACK_ORDER = ["movement", "forces", "measurement", "clinical"];

  function buildModel() {
    const S = window.STATIONS;
    if (!S) return SINGLES.slice();            // stations.js missing: degrade, do not break
    const out = SINGLES.slice();
    TRACK_ORDER.forEach(t => {
      const items = S.inTrack(t)
        .filter(st => st.page !== "explorer.html")
        .sort((a, b) => (a.level === b.level ? 0 : a.level === "beginner" ? -1 : 1))
        .map(st => ({
          href: st.page,
          en: st.title.en + " " + st.icon,
          pl: st.title.pl + " " + st.icon,
        }));
      if (items.length) out.push({ g: S.TRACKS[t], items, track: t });
    });
    return out;
  }

  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html";
  const lang = () => (window.i18n && window.i18n.lang === "pl" ? "pl" : "en");
  const isActive = href => href.split("#")[0].toLowerCase() === file;

  function build() {
    const ul = document.getElementById("navLinks");
    if (!ul) return;
    const L = lang();
    ul.innerHTML = "";
    buildModel().forEach(node => {
      if (node.items) {
        const li = document.createElement("li");
        li.className = "nav-group" + (node.items.some(it => isActive(it.href)) ? " active-group" : "");
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "nav-group-btn";
        btn.setAttribute("aria-haspopup", "true");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = node.g[L] + ' <span class="nav-caret">▾</span>';
        if (node.track) li.style.setProperty("--tc", node.g.colour);
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const open = !li.classList.contains("open");
          closeGroups();                       // only one menu open at a time
          li.classList.toggle("open", open);
          btn.setAttribute("aria-expanded", String(open));
        });
        const dd = document.createElement("ul"); dd.className = "nav-dropdown";
        node.items.forEach(it => {
          const dli = document.createElement("li");
          const a = document.createElement("a"); a.href = it.href; a.textContent = it[L];
          if (isActive(it.href)) a.className = "active";
          dli.appendChild(a); dd.appendChild(dli);
        });
        li.appendChild(btn); li.appendChild(dd); ul.appendChild(li);
      } else {
        const li = document.createElement("li");
        const a = document.createElement("a"); a.href = node.href; a.textContent = node[L];
        if (isActive(node.href)) a.className = "active";
        li.appendChild(a); ul.appendChild(li);
      }
    });
  }

  function closeGroups() {
    document.querySelectorAll(".nav-group.open").forEach(g => {
      g.classList.remove("open");
      const b = g.querySelector(".nav-group-btn");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  function wireToggle() {
    const t = document.getElementById("navToggle"), ul = document.getElementById("navLinks");
    if (t) t.addEventListener("click", () => ul.classList.toggle("open"));
    if (ul) ul.addEventListener("click", e => {
      if (e.target.closest("a")) { ul.classList.remove("open"); closeGroups(); }
    });
    // click anywhere else, or press Escape, to dismiss an open menu
    document.addEventListener("click", e => { if (!e.target.closest(".nav-group")) closeGroups(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeGroups(); });
  }

  function boot() { build(); wireToggle(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  document.addEventListener("i18n:changed", build);
})();
