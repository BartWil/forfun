// The orbital map: the station catalogue as a system you can fly around.
//
// The body in the middle is the nucleus. The four tracks are shells around it.
// The stations are satellites on those shells. That is not decoration chosen to
// look like an atom; it is the actual shape of the catalogue, so the picture and
// the information agree.
//
// THREE RULES THIS FILE OBEYS
//
// 1. Nothing here is written by hand. Every node comes from STATIONS, so a
//    station added in six months appears in the right shell on its own and there
//    is never a second inventory to keep in sync. Same reasoning as the nav and
//    the README.
//
// 2. The links are real links. Orbits, glows and trails are drawn in SVG, but
//    every station is a genuine <a href> in the DOM, moved with a transform.
//    Painting clickable text into a canvas would look identical and would be
//    unreachable by keyboard, invisible to a screen reader and unopenable in a
//    new tab.
//
// 3. This is a second way in, never the only one. The menu, the station map
//    further down the page and the suggested route all still work. If this file
//    failed to load, nothing on the site would become unreachable.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  const S = window.STATIONS;
  if (!S) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TRACK_ORDER = ["movement", "forces", "measurement", "clinical"];

  // One shell per track. Tilts and radii differ so the ellipses read as a system
  // seen at an angle rather than as concentric rings, and the periods are
  // deliberately not multiples of each other so the arrangement never repeats.
  const SHELL = {
    movement:    { rx: 0.46, ry: 0.30, rot: -18, period: 96, phase: 0.00 },
    forces:      { rx: 0.38, ry: 0.25, rot: 34, period: 122, phase: 1.90 },
    measurement: { rx: 0.43, ry: 0.20, rot: 74, period: 148, phase: 3.30 },
    clinical:    { rx: 0.33, ry: 0.29, rot: -58, period: 110, phase: 4.90 },
  };

  // `pinned` is set by a click, `hover` by the pointer. `active()` is the only
  // thing the drawing code reads, so the two can never disagree about which
  // shell is open.
  // Polish counts in three forms, not two: 1 stacja, 2-4 stacje, 5+ stacji, with
  // the teens taking the last form regardless. "4 stacji" is simply wrong.
  function plStations(n) {
    if (n === 1) return "stacja";
    const t = n % 10, h = n % 100;
    return (t >= 2 && t <= 4 && !(h >= 12 && h <= 14)) ? "stacje" : "stacji";
  }
  const countLabel = n => n + " " + (PL() ? plStations(n) : (n === 1 ? "station" : "stations"));

  const state = { pinned: null, hover: null, t: 0, running: false, w: 0, h: 0 };
  const active = () => state.pinned || state.hover;
  let root, svg, nodeLayer, tracks = [], sats = [];

  // ------------------------------------------------------------------ geometry
  //
  // A tilted ellipse reaches further in y than its ry, by an amount that depends
  // on the tilt, so a shell that fits a wide window can throw a node off the top
  // of a short one. Every shell is therefore scaled to fit a safe box before it
  // is used, rather than clamped afterwards, which would make nodes stick to the
  // edges instead of orbiting.
  const PAD_X = 132, PAD_TOP = 74, PAD_BOTTOM = 92;

  function shellRadii(cfg, w, h) {
    const R = Math.min(w, h);
    let rx = cfg.rx * w * 0.9, ry = cfg.ry * R;
    const rot = cfg.rot * Math.PI / 180;
    const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
    const halfW = Math.max(40, w / 2 - PAD_X);
    const halfH = Math.max(40, h / 2 - Math.max(PAD_TOP, PAD_BOTTOM));
    const ex = Math.hypot(rx * c, ry * sn);
    const ey = Math.hypot(rx * sn, ry * c);
    const k = Math.min(1, halfW / (ex || 1), halfH / (ey || 1));
    return { rx: rx * k, ry: ry * k, rot };
  }

  function shellPoint(cfg, angle, w, h) {
    const { rx, ry, rot } = shellRadii(cfg, w, h);
    const x = rx * Math.cos(angle), y = ry * Math.sin(angle);
    return {
      x: x * Math.cos(rot) - y * Math.sin(rot),
      y: x * Math.sin(rot) + y * Math.cos(rot),
    };
  }

  function trackAngle(id) {
    const cfg = SHELL[id];
    if (reduceMotion) return cfg.phase;
    return cfg.phase + (state.t / cfg.period) * Math.PI * 2;
  }

  // ------------------------------------------------------------------- building
  function build(host) {
    root = document.createElement("div");
    root.className = "om";
    root.id = "orbitMap";
    root.setAttribute("role", "navigation");
    root.setAttribute("aria-label", T("Orbital map of the stations", "Orbitalna mapa stacji"));

    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "om-orbits");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");
    root.appendChild(svg);

    nodeLayer = document.createElement("div");
    nodeLayer.className = "om-nodes";
    root.appendChild(nodeLayer);

    tracks = [];
    sats = [];

    TRACK_ORDER.forEach(id => {
      const tr = S.TRACKS[id];
      const stations = S.inTrack(id);
      if (!tr || !stations.length) return;

      // A track opens a shell rather than going anywhere, so it is a button.
      const b = document.createElement("button");
      b.className = "om-track om-track-" + id;
      b.type = "button";
      b.dataset.track = id;
      b.setAttribute("aria-expanded", "false");
      b.style.setProperty("--om-c", tr.colour);
      b.innerHTML =
        '<span class="om-dot"></span>' +
        '<span class="om-label"><b>' + L(tr) + "</b>" +
        "<em>" + countLabel(stations.length) + "</em></span>";
      nodeLayer.appendChild(b);

      const group = { id, el: b, colour: tr.colour, sats: [] };

      // The stations are real anchors, present in the DOM from the start and
      // hidden with visibility so they leave the tab order until their shell
      // is open.
      stations.forEach(st => {
        const a = document.createElement("a");
        a.className = "om-sat";
        a.href = st.page;
        a.dataset.track = id;
        a.tabIndex = -1;
        a.style.setProperty("--om-c", tr.colour);
        a.innerHTML =
          '<span class="om-sat-dot">' + st.icon + "</span>" +
          '<span class="om-sat-label">' + L(st.title) + "</span>";
        nodeLayer.appendChild(a);
        group.sats.push({ el: a, station: st });
        sats.push({ el: a, track: id });
      });

      tracks.push(group);
    });

    host.appendChild(root);
    wire();
    resize();
  }

  // -------------------------------------------------------------------- drawing
  function drawShells(w, h) {
    const cx = w / 2, cy = h / 2;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    let out = "";
    tracks.forEach(g => {
      const cfg = SHELL[g.id];
      const fit = shellRadii(cfg, w, h);
      const on = active() === g.id;
      const dim = active() && !on;
      out += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + fit.rx.toFixed(1) +
        '" ry="' + fit.ry.toFixed(1) + '" transform="rotate(' + cfg.rot + " " + cx + " " + cy +
        ')" class="om-ring' + (on ? " on" : "") + (dim ? " dim" : "") +
        '" style="--om-c:' + g.colour + '"/>';
    });
    svg.innerHTML = out;
  }

  function place() {
    const w = state.w, h = state.h;
    if (!w || !h) return;
    const cx = w / 2, cy = h / 2;

    tracks.forEach(g => {
      const a = trackAngle(g.id);
      const p = shellPoint(SHELL[g.id], a, w, h);
      const x = cx + p.x, y = cy + p.y;
      g.el.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";

      const open = active() === g.id;
      // Satellites ring their own track node, so opening a shell reads as that
      // node blooming rather than as a menu appearing from nowhere.
      const n = g.sats.length;
      const R = Math.min(w, h);
      const sr = Math.max(96, Math.min(150, R * 0.19));
      g.sats.forEach((s, i) => {
        const sa = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const sx = open ? x + Math.cos(sa) * sr : x;
        const sy = open ? y + Math.sin(sa) * sr * 0.78 : y;
        s.el.style.transform =
          "translate(-50%,-50%) translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px)" +
          (open ? "" : " scale(.4)");
        // Staggered through a custom property that the stylesheet applies to
        // opacity and transform only. Delaying visibility as well would leave a
        // satellite unreachable if the transition never got to run.
        s.el.style.setProperty("--om-d", open ? (i * 34) + "ms" : "0ms");
      });
    });
  }

  function applyFocus() {
    tracks.forEach(g => {
      const on = active() === g.id;
      const dim = active() && !on;
      g.el.classList.toggle("on", on);
      g.el.classList.toggle("dim", !!dim);
      g.el.setAttribute("aria-expanded", on ? "true" : "false");
      g.sats.forEach(s => {
        s.el.classList.toggle("on", on);
        // Only a pinned shell puts its stations in the tab order. A shell that is
        // merely hovered must not, or the tab order would change under the mouse.
        s.el.tabIndex = state.pinned === g.id ? 0 : -1;
      });
    });
    root.classList.toggle("om-focused", !!active());
    drawShells(state.w, state.h);
    place();
  }

  function setFocus(id) {
    state.pinned = state.pinned === id ? null : id;
    state.hover = null;
    applyFocus();
  }

  // ---------------------------------------------------------------------- wiring
  function wire() {
    tracks.forEach(g => {
      g.el.addEventListener("click", e => { e.preventDefault(); setFocus(g.id); });
      // Hovering previews a shell without committing to it, but only when one is
      // not already pinned open by a click.
      g.el.addEventListener("mouseenter", () => setHover(g.id));
      g.el.addEventListener("mouseleave", () => setHover(null));
    });
    root.addEventListener("keydown", e => {
      if (e.key === "Escape" && state.pinned) {
        const id = state.pinned;
        setFocus(id);
        const g = tracks.find(t => t.id === id);
        if (g) g.el.focus();
      }
    });
    // Clicking the empty sky closes an open shell.
    root.addEventListener("click", e => {
      if (e.target === root && state.pinned) setFocus(state.pinned);
    });
  }

  function setHover(id) {
    if (state.pinned) return;          // a pinned shell wins over the pointer
    state.hover = id;
    applyFocus();
  }

  function resize() {
    const r = root.getBoundingClientRect();
    state.w = Math.round(r.width);
    state.h = Math.round(r.height);
    drawShells(state.w, state.h);
    place();
  }

  // ------------------------------------------------------------------- the loop
  let raf = null, last = 0;
  function tick(ts) {
    if (!state.running) { raf = null; return; }
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    // A shell that is open stops turning, so the thing you are reading holds still.
    if (!active()) state.t += dt;
    place();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && !reduceMotion) { state.running = true; last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { state.running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // --------------------------------------------------------------------- mounting
  function mount() {
    const host = document.getElementById("lpHero");
    if (!host || document.getElementById("orbitMap")) return;
    build(host);

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("load", resize, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    // Only animate while the hero is actually on screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => {
        es.forEach(e => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0.05 }).observe(host);
    } else start();

    if (reduceMotion) { drawShells(state.w, state.h); place(); }
  }

  function remount() {
    const old = document.getElementById("orbitMap");
    if (old) { stop(); old.remove(); }
    state.pinned = null; state.hover = null;
    mount();
    if (!reduceMotion) start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
  document.addEventListener("i18n:changed", remount);

  // exposed for the test suite
  window.__orbitMap = { SHELL, TRACK_ORDER, shellPoint, state, resize, plStations };
})();
