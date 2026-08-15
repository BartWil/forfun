// BioLab learning state: one layer, not four features.
//
// Continue-where-you-left-off, shareable experiment links and later predictions
// and provenance all need the same thing: a station able to say what its current
// experiment IS, in a form that survives a URL and a page reload. Built as four
// separate features they would have grown four notions of "state" and drifted
// apart, exactly as the landing catalogue did.
//
// TWO HALVES, DELIBERATELY SEPARATE
//
//   define(id, codec)    validate / describe / summary
//                        Pure. No DOM. Lives in state-codecs.js and loads on
//                        every page, so the landing page can describe a saved
//                        experiment for a station it has never opened.
//
//   bind(id, runtime)    read / apply / checkpoint
//                        Touches the live page. Only ever called by the station
//                        itself.
//
// Keeping these together would push `if (station === "emg")` into the landing
// page the moment a second station registered, and that is a second catalogue of
// meaning starting up again.
//
// TWO MORE DELIBERATE CHOICES
//
//   URLs are readable. emg.html?v=1&muscle=ta&hp=50#filter, never ?s=eyJoc...
//   A teacher sending a link to a class should see what they are sending.
//
//   Resume is a deep link. Continue stores the same serialised state the share
//   button produces, so there is one serialiser that can be wrong instead of two.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);

  const KEY = "biolab.progress.v1";
  const MAX_ENTRIES = 3;
  const SCHEMA = 1;
  const MIN_CHANGES = 2;

  const codecs = {};     // pure, everywhere
  const runtimes = {};   // DOM-bound, station pages only

  // Everything the framework renders passes through here. The adapters happen to
  // be trustworthy today; the framework must not depend on that staying true,
  // and a codec written in six months should not be able to inject markup by
  // returning an unlucky label.
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // -------------------------------------------------------------- storage
  // Every read is defensive. localStorage can be unavailable (private mode,
  // embedded webview), full, or hold what another version of this site wrote.
  // None of that may break a page, so the worst case is having no history.
  function safeRead() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Shape only. The landing page reads this without binding any runtime, so
      // requiring one here would make Continue permanently empty.
      return parsed.filter(e =>
        e && typeof e === "object" &&
        typeof e.station === "string" &&
        typeof e.query === "string" &&
        typeof e.updated === "number");
    } catch (e) {
      return [];
    }
  }

  function safeWrite(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
      return true;
    } catch (e) {
      return false;   // quota, private mode: history is a convenience, never required
    }
  }

  // ------------------------------------------------------------ serialising
  function encode(state) {
    const p = new URLSearchParams();
    p.set("v", String(SCHEMA));
    Object.keys(state || {}).sort().forEach(k => {
      const val = state[k];
      if (val === null || val === undefined) return;
      if (typeof val === "number") p.set(k, String(Math.round(val * 1e4) / 1e4));
      else if (typeof val === "boolean") p.set(k, val ? "1" : "0");
      else p.set(k, String(val));
    });
    return p.toString();
  }

  function decode(search) {
    const p = new URLSearchParams(search || "");
    const out = {};
    p.forEach((v, k) => {
      if (k === "v" || v === "") return;
      const n = Number(v);
      out[k] = (v.trim() !== "" && Number.isFinite(n)) ? n : v;
    });
    return out;
  }

  function schemaOf(search) {
    const v = new URLSearchParams(search || "").get("v");
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ------------------------------------------------------------------- API
  const API = {
    SCHEMA, KEY, MAX_ENTRIES,
    encode, decode, esc,

    // ---- pure half
    define(id, codec) { codecs[id] = codec; return API; },
    codec(id) { return codecs[id] || null; },
    validate(id, raw) {
      const c = codecs[id];
      return c && c.validate ? c.validate(raw) : {};
    },
    describe(id, state) {
      const c = codecs[id];
      return c && c.describe ? c.describe(state) : [];
    },
    summary(id, state) {
      const c = codecs[id];
      return c && c.summary ? c.summary(state) : "";
    },

    // ---- DOM half
    bind(id, runtime) {
      runtimes[id] = runtime;
      current = id;
      applyIncoming(id);
      // The baseline against which "the experiment changed" is measured.
      try { lastSeen = encode(runtime.read()); } catch (e) { lastSeen = null; }
      return API;
    },

    // Czy jakaś stacja podpięła runtime, który potrafi zastosować stan.
    // predict.js pyta o to, zanim cokolwiek pokaże: bez runtime przycisk
    // wyglądałby sensownie i nie robiłby nic.
    canApply(id) { return !!(runtimes[id] && runtimes[id].apply); },

    // Ustawia stan stacji przez JEJ WŁASNY runtime. Warstwa nic nie przelicza,
    // tylko prosi stację, żeby przeliczyła się sama, dokładnie tak jak po
    // wejściu z udostępnionego odnośnika.
    apply(id, state) {
      const rt = runtimes[id];
      if (!rt || !rt.apply) return false;
      const clean = API.validate(id, state);
      if (!clean || !Object.keys(clean).length) return false;
      try { rt.apply(clean); return true; } catch (e) { return false; }
    },

    link(id, state, checkpointKey) {
      const st = window.STATIONS && window.STATIONS.byId[id];
      const page = st ? st.page : location.pathname.split("/").pop();
      return location.origin + location.pathname.replace(/[^/]*$/, "") + page +
        "?" + encode(state) + (checkpointKey ? "#" + checkpointKey : "");
    },

    // ---------------------------------------------------------- history
    history() {
      return safeRead()
        .filter(e => e.schema === SCHEMA)
        .sort((a, b) => (b.updated || 0) - (a.updated || 0));
    },

    record(id, state, checkpoint) {
      const list = safeRead().filter(e => e.station !== id);
      list.unshift({
        schema: SCHEMA, station: id,
        checkpoint: checkpoint || null,
        query: encode(state || {}),
        updated: Date.now(),
      });
      return safeWrite(list);
    },

    forget(id) { return safeWrite(safeRead().filter(e => e.station !== id)); },
    clear() { return safeWrite([]); },

    ago(ts) {
      const s = Math.max(0, (Date.now() - ts) / 1000);
      if (s < 90) return T("just now", "przed chwilą");
      const m = s / 60;
      if (m < 60) return Math.round(m) + " " + T("min ago", "min temu");
      const h = m / 60;
      if (h < 24) return Math.round(h) + " " + T("h ago", "godz. temu");
      const d = Math.round(h / 24);
      if (d === 1) return T("yesterday", "wczoraj");
      return d + " " + T("days ago", "dni temu");
    },
  };

  // --------------------------------------------------- incoming deep links
  let current = null, arrived = false;

  function applyIncoming(id) {
    const rt = runtimes[id];
    const search = location.search;
    if (!rt || !search || search.length < 2) return;
    const v = schemaOf(search);
    if (v !== null && v !== SCHEMA) return;   // unknown version: ignore, never guess
    const raw = decode(search);
    if (!Object.keys(raw).length) return;
    const clean = API.validate(id, raw);
    if (!clean || !Object.keys(clean).length) return;
    try {
      rt.apply(clean);
      arrived = true;
      banner();
    } catch (e) { /* a bad link must never break the station */ }
  }

  function banner() {
    const b = document.createElement("div");
    b.className = "bs-banner";
    b.setAttribute("role", "status");
    const dot = document.createElement("span");
    dot.className = "bs-banner-dot";
    const msg = document.createElement("span");
    msg.textContent = T("Shared experiment state loaded", "Wczytano udostępniony stan eksperymentu");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "bs-banner-reset";
    reset.textContent = T("Reset to default", "Przywróć domyślne");
    reset.onclick = () => { location.href = location.pathname; };
    b.append(dot, msg, reset);
    const put = () => document.body.insertBefore(b, document.body.firstChild);
    if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
  }

  API.arrivedFromLink = () => arrived;

  // --------------------------------------------------------- share control
  API.shareButton = function (id, opts) {
    const rt = runtimes[id];
    if (!rt) return null;

    const wrap = document.createElement("div");
    wrap.className = "bs-share";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bs-share-btn";
    btn.setAttribute("aria-expanded", "false");
    const ico = document.createElement("span");
    ico.className = "bs-share-ico";
    ico.textContent = "🔗";
    const lbl = document.createElement("span");
    btn.append(ico, lbl);
    // The popup is rebuilt on every open so it is always in the current
    // language; this label is not, so it has to be told when the language moves.
    const relabel = () => { lbl.textContent = T("Share this experiment", "Udostępnij ten eksperyment"); };
    relabel();
    document.addEventListener("i18n:changed", relabel);

    const pop = document.createElement("div");
    pop.className = "bs-share-pop";
    pop.hidden = true;
    wrap.append(btn, pop);

    const close = () => { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); };

    btn.onclick = () => {
      if (!pop.hidden) return close();
      const state = rt.read();
      const cp = rt.checkpoint ? rt.checkpoint() : null;
      const url = API.link(id, state, cp && cp.k);
      const rows = API.describe(id, state);

      // Built by escaping every adapter-supplied string. The framework must be
      // safe regardless of how carefully a future codec was written.
      pop.innerHTML =
        '<div class="bs-pop-h">' + esc(T("This link will open", "Ten link otworzy")) + "</div>" +
        rows.map(r => '<div class="bs-row"><span>' + esc(r.label) + "</span><b>" +
                      esc(r.value) + "</b></div>").join("") +
        (cp ? '<div class="bs-row bs-row-cp"><span>' + esc(T("Step", "Krok")) +
              "</span><b>" + esc(cp.label) + "</b></div>" : "") +
        '<div class="bs-url">' + esc(url.replace(/^https?:\/\//, "")) + "</div>" +
        '<div class="bs-pop-actions">' +
          '<button type="button" class="bs-copy">' + esc(T("Copy link", "Kopiuj link")) + "</button>" +
          '<a class="bs-open" target="_blank" rel="noopener">' +
            esc(T("Open in a new tab", "Otwórz w nowej karcie")) + "</a>" +
        "</div>";
      // href is set as a property, so it is never parsed as markup
      pop.querySelector(".bs-open").href = url;
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");

      pop.querySelector(".bs-copy").onclick = async e => {
        const el = e.currentTarget;
        try {
          await navigator.clipboard.writeText(url);
          el.textContent = T("Copied", "Skopiowano");
        } catch (err) {
          // Clipboard needs a secure context and permission. A selectable field
          // beats a button that silently does nothing.
          const ta = document.createElement("input");
          ta.value = url; ta.className = "bs-url-input";
          pop.querySelector(".bs-url").replaceWith(ta);
          ta.select();
          el.textContent = T("Press Ctrl+C", "Naciśnij Ctrl+C");
        }
        setTimeout(() => { el.textContent = T("Copy link", "Kopiuj link"); }, 2200);
      };
    };

    document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.addEventListener("i18n:changed", close);

    if (opts && opts.mount) opts.mount.appendChild(wrap);
    return wrap;
  };

  // ------------------------------------------------- meaningful interaction
  //
  // The station says when its experiment changed. The framework does not guess
  // by listening to every click in the document: that counted the share button,
  // the language toggle and any other button as scientific work, and it would
  // have needed a new CSS selector for every station added.
  //
  // A touch only counts if the serialised state actually differs from the last
  // one seen, so switching language or opening a popup is not an experiment.
  let lastSeen = null, changes = 0, committed = false, timer = null, tracked = null;

  API.touch = function () {
    const id = current, rt = runtimes[id];
    if (!id || !rt || !tracked) return false;
    let now;
    try { now = encode(rt.read()); } catch (e) { return false; }
    if (now === lastSeen) return false;    // the UI moved, the experiment did not
    lastSeen = now;
    changes++;
    if (changes < MIN_CHANGES && !committed) return false;
    committed = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      API.record(id, rt.read(), rt.checkpoint ? rt.checkpoint() : null);
    }, 700);
    return true;
  };

  API.trackEngagement = function (id, opts) {
    const o = opts || {};
    tracked = id;
    const rt = runtimes[id];
    if (!rt) return null;
    // A reader who stays long enough is reading, even without touching anything.
    const dwell = setTimeout(() => {
      if (committed) return;
      committed = true;
      API.record(id, rt.read(), rt.checkpoint ? rt.checkpoint() : null);
    }, o.dwellMs || 25000);
    window.addEventListener("pagehide", () => {
      clearTimeout(dwell);
      if (committed) API.record(id, rt.read(), rt.checkpoint ? rt.checkpoint() : null);
    });
    return { isCommitted: () => committed, changes: () => changes };
  };

  window.BioLabState = API;
})();
