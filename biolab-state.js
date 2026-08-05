// BioLab learning state: one layer, not four features.
//
// Continue-where-you-left-off, shareable experiment links and (later) predictions
// and provenance all need the same thing: a station able to say what its current
// experiment IS, in a form that survives a URL and a page reload. Built as four
// separate features they would have grown four different notions of "state" and
// drifted apart, exactly as the landing catalogue did. So there is one adapter
// interface and everything hangs off it.
//
// A station registers an adapter:
//
//   BioLabState.register("emg", {
//     read()            -> a flat object of plain values
//     apply(state)      -> put those values back into the page
//     validate(state)   -> clamp and drop anything unrecognised
//     describe(state)   -> [{label, value}] for humans
//     checkpoint()      -> {k, label} for where in the station the reader is
//   });
//
// TWO DELIBERATE CHOICES
//
// 1. URLs are readable. emg.html?v=1&muscle=ta&hp=50#filter, never ?s=eyJoc...
//    A teacher sending a link to a class should be able to see what they are
//    sending, debug it by eye, and have it not look like tracking.
//
// 2. Resume is a deep link. Continue does not have its own storage format; it
//    stores the same serialised state the share button produces, so there is one
//    serialiser and one thing that can be wrong.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);

  const KEY = "biolab.progress.v1";
  const MAX_ENTRIES = 3;
  const SCHEMA = 1;

  const adapters = {};

  // -------------------------------------------------------------- storage
  // Every read is defensive. localStorage can be unavailable (private mode,
  // embedded webview), full, or hold something another version of this site
  // wrote. None of those may break the page, so the worst case is silently
  // having no history.
  function safeRead() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Shape only. The landing page reads this history without registering any
      // adapter, so requiring one here would make Continue permanently empty.
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
  // Values are written as plain strings. Numbers keep a sensible number of
  // digits rather than 0.30000000000000004.
  function encode(state) {
    const p = new URLSearchParams();
    p.set("v", String(SCHEMA));
    Object.keys(state).sort().forEach(k => {
      const val = state[k];
      if (val === null || val === undefined) return;
      if (typeof val === "number") {
        p.set(k, String(Math.round(val * 1e4) / 1e4));
      } else if (typeof val === "boolean") {
        p.set(k, val ? "1" : "0");
      } else {
        p.set(k, String(val));
      }
    });
    return p.toString();
  }

  function decode(search) {
    const p = new URLSearchParams(search || "");
    const out = {};
    p.forEach((v, k) => {
      if (k === "v") return;
      if (v === "") return;
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
    encode, decode,

    register(stationId, adapter) {
      adapters[stationId] = adapter;
      current = stationId;
      // A link that arrived with state applies it before anything else runs.
      applyIncoming(stationId, adapter);
      return API;
    },

    // Build the full shareable URL for a station's present state.
    link(stationId, state, checkpointKey) {
      const st = window.STATIONS && window.STATIONS.byId[stationId];
      const page = st ? st.page : location.pathname.split("/").pop();
      const q = encode(state);
      return location.origin + location.pathname.replace(/[^/]*$/, "") + page +
        "?" + q + (checkpointKey ? "#" + checkpointKey : "");
    },

    // ---------------------------------------------------------- history
    history() {
      return safeRead()
        .filter(e => e.schema === SCHEMA)
        .sort((a, b) => (b.updated || 0) - (a.updated || 0));
    },

    // Only a meaningful interaction should write history: opening a page and
    // leaving immediately is not a place worth returning to.
    record(stationId, state, checkpoint) {
      const adapter = adapters[stationId];
      if (!adapter) return false;
      const list = safeRead().filter(e => e.station !== stationId);
      list.unshift({
        schema: SCHEMA,
        station: stationId,
        checkpoint: checkpoint || null,
        query: encode(state || {}),
        updated: Date.now(),
      });
      return safeWrite(list);
    },

    forget(stationId) {
      return safeWrite(safeRead().filter(e => e.station !== stationId));
    },

    clear() { return safeWrite([]); },

    // ------------------------------------------------------- describing
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

  function applyIncoming(stationId, adapter) {
    const search = location.search;
    if (!search || search.length < 2) return;
    const v = schemaOf(search);
    // An unknown or future schema is ignored rather than guessed at.
    if (v !== null && v !== SCHEMA) return;
    const raw = decode(search);
    if (!Object.keys(raw).length) return;
    const clean = adapter.validate ? adapter.validate(raw) : raw;
    if (!clean || !Object.keys(clean).length) return;
    try {
      adapter.apply(clean);
      arrived = true;
      banner(stationId, adapter);
    } catch (e) { /* a bad link must never break the station */ }
  }

  function banner(stationId, adapter) {
    const b = document.createElement("div");
    b.className = "bs-banner";
    b.setAttribute("role", "status");
    b.innerHTML =
      '<span class="bs-banner-dot"></span>' +
      "<span>" + T("Shared experiment state loaded", "Wczytano udostępniony stan eksperymentu") + "</span>" +
      '<button type="button" class="bs-banner-reset">' +
        T("Reset to default", "Przywróć domyślne") + "</button>";
    b.querySelector(".bs-banner-reset").onclick = () => {
      location.href = location.pathname;
    };
    const put = () => document.body.insertBefore(b, document.body.firstChild);
    if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
  }

  API.arrivedFromLink = () => arrived;

  // --------------------------------------------------------- share control
  // Shows what is about to be copied before copying it. A teacher should never
  // have to paste a link somewhere to find out what is in it.
  API.shareButton = function (stationId, opts) {
    const adapter = adapters[stationId];
    if (!adapter) return null;
    const wrap = document.createElement("div");
    wrap.className = "bs-share";
    wrap.innerHTML =
      '<button type="button" class="bs-share-btn">' +
        '<span class="bs-share-ico">🔗</span>' +
        T("Share this experiment", "Udostępnij ten eksperyment") + "</button>" +
      '<div class="bs-share-pop" hidden></div>';

    const btn = wrap.querySelector(".bs-share-btn");
    const pop = wrap.querySelector(".bs-share-pop");

    function close() { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }

    btn.setAttribute("aria-expanded", "false");
    btn.onclick = () => {
      if (!pop.hidden) return close();
      const state = adapter.read();
      const cp = adapter.checkpoint ? adapter.checkpoint() : null;
      const url = API.link(stationId, state, cp && cp.k);
      const rows = (adapter.describe ? adapter.describe(state) : [])
        .map(r => '<div class="bs-row"><span>' + r.label + "</span><b>" + r.value + "</b></div>").join("");
      pop.innerHTML =
        '<div class="bs-pop-h">' + T("This link will open", "Ten link otworzy") + "</div>" +
        rows +
        (cp ? '<div class="bs-row bs-row-cp"><span>' + T("Step", "Krok") + "</span><b>" + cp.label + "</b></div>" : "") +
        '<div class="bs-url">' + url.replace(/^https?:\/\//, "") + "</div>" +
        '<div class="bs-pop-actions">' +
          '<button type="button" class="bs-copy">' + T("Copy link", "Kopiuj link") + "</button>" +
          '<a class="bs-open" href="' + url + '" target="_blank" rel="noopener">' +
            T("Open in a new tab", "Otwórz w nowej karcie") + "</a>" +
        "</div>";
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");

      pop.querySelector(".bs-copy").onclick = async e => {
        const el = e.currentTarget;
        try {
          await navigator.clipboard.writeText(url);
          el.textContent = T("Copied", "Skopiowano");
        } catch (err) {
          // Clipboard needs a secure context and permission. Falling back to a
          // selectable field is better than a button that silently does nothing.
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

    if (opts && opts.mount) opts.mount.appendChild(wrap);
    return wrap;
  };

  // ------------------------------------------------- meaningful interaction
  // History is written after the reader has actually done something: touched a
  // control, moved through the station, or stayed long enough to be reading.
  // Wandering in and straight out is not a place worth being sent back to.
  API.trackEngagement = function (stationId, getState, getCheckpoint, opts) {
    const o = opts || {};
    const dwellMs = o.dwellMs || 25000;
    let done = false, interactions = 0;

    function commit(reason) {
      if (done) return;
      done = true;
      API.record(stationId, getState(), getCheckpoint ? getCheckpoint() : null);
      API.lastCommit = reason;
    }
    // Re-record later changes too, so Continue points at where they finished
    // rather than the first thing they touched.
    function refresh() {
      if (!done) return;
      API.record(stationId, getState(), getCheckpoint ? getCheckpoint() : null);
    }

    const onInteract = () => {
      interactions++;
      if (interactions >= (o.minInteractions || 2)) commit("interaction");
      else return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, 1200);
    };
    let refreshTimer = null;

    ["input", "change"].forEach(ev =>
      document.addEventListener(ev, onInteract, { passive: true, capture: true }));
    document.addEventListener("click", e => {
      if (e.target.closest("button, .eg-stage, .eg-chip, .eg-preset, .ph-chip")) onInteract();
    }, { passive: true, capture: true });

    const dwell = setTimeout(() => commit("dwell"), dwellMs);
    window.addEventListener("pagehide", () => { clearTimeout(dwell); refresh(); });
    return { commit, isCommitted: () => done };
  };

  window.BioLabState = API;
})();
