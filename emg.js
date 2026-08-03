// EMG Lab: the same 8 seconds of real muscle, processed seven different ways.
//
// Every number on this page is computed in the browser from
// data/emg/santuz2021_demo.csv, which is unprocessed surface EMG from the Santuz
// et al. 2021 open dataset (CC BY 4.0). Nothing is precomputed and nothing is
// synthesised. Change a filter and the arithmetic runs again.
//
// The one exception is the MVC reference, which is a slider, because no maximal
// voluntary contraction was recorded in that dataset. It is labelled hypothetical
// everywhere it appears. Inventing an MVC trace would have taught the opposite of
// the lesson.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  // ------------------------------------------------------------------ quotes
  // Santuz lines are verbatim from the analysis script published with the data.
  const Q = {
    hp50: {
      en: "HPf    <- 50            # High-pass filter frequency [Hz]",
      pl: "HPf    <- 50            # Częstotliwość filtru górnoprzepustowego [Hz]",
      c: "Santuz et al. 2021, muscle_synergies.R, line 108",
      verbatim: true,
    },
    lp20: {
      en: "LPf    <- 20            # Low-pass filter frequency [Hz]",
      pl: "LPf    <- 20            # Częstotliwość filtru dolnoprzepustowego [Hz]",
      c: "Santuz et al. 2021, muscle_synergies.R, line 110",
      verbatim: true,
    },
    order: {
      en: "HPo    <- 4             # High-pass filter order",
      pl: "HPo    <- 4             # Rząd filtru górnoprzepustowego",
      c: "Santuz et al. 2021, muscle_synergies.R, line 107",
      verbatim: true,
    },
    deluca: {
      en: "De Luca and colleagues examined how much movement artefact a high-pass filter removes against how much genuine EMG it destroys, and identified about 20 Hz as a reasonable general-purpose compromise for surface recordings. A higher cutoff removes more artefact and more signal with it.",
      pl: "De Luca ze współpracownikami zbadali, ile artefaktu ruchowego usuwa filtr górnoprzepustowy w stosunku do tego, ile prawdziwego EMG przy tym niszczy, i wskazali około 20 Hz jako rozsądny kompromis ogólnego przeznaczenia dla zapisów powierzchniowych. Wyższa częstotliwość odcięcia usuwa więcej artefaktu i wraz z nim więcej sygnału.",
      c: "De Luca CJ et al., J Biomech 43:1573-1579, 2010",
    },
    nomvc: {
      en: "No maximal voluntary contraction was recorded in this dataset. The MVC value on this page is a number you choose, not a measurement, and it exists to show what choosing it does.",
      pl: "W tym zbiorze danych nie zarejestrowano maksymalnego skurczu dowolnego. Wartość MVC na tej stronie to liczba, którą wybierasz, a nie pomiar, i służy pokazaniu, co ten wybór zmienia.",
      c: "Santuz et al. 2021, dataset contents",
    },
    over100: {
      en: "Dynamic EMG can legitimately exceed the reference contraction. Task specificity, electrode shift, fatigue, and a reference trial that was not truly maximal all push normalised values above 100%.",
      pl: "Dynamiczne EMG może zgodnie z prawdą przekroczyć skurcz referencyjny. Specyfika zadania, przesunięcie elektrod, zmęczenie oraz próba referencyjna, która nie była w pełni maksymalna, podnoszą wartości znormalizowane powyżej 100%.",
      c: "a normalisation artefact, not an impossibility",
    },
  };

  let tip = null;
  function showTip(key, x, y) {
    const q = Q[key];
    if (!q) return;
    if (!tip) { tip = document.createElement("div"); tip.className = "eg-tip"; document.body.appendChild(tip); }
    const pl = PL();
    tip.innerHTML =
      '<span class="eg-tip-q' + (q.verbatim ? " eg-tip-code" : "") + '">' +
        (q.verbatim ? L(q) : (pl ? "„" + q.pl + "”" : "“" + q.en + "”")) + "</span>" +
      (!q.verbatim && pl ? '<span class="eg-tip-orig">oryginał: “' + q.en + '”</span>' : "") +
      '<span class="eg-tip-c">' + q.c + "</span>";
    tip.classList.add("in");
    moveTip(x, y);
  }
  function moveTip(x, y) {
    if (!tip) return;
    const pad = 16, r = tip.getBoundingClientRect();
    let nx = x + pad, ny = y + pad;
    if (nx + r.width > window.innerWidth - 10) nx = x - r.width - pad;
    if (ny + r.height > window.innerHeight - 10) ny = y - r.height - pad;
    tip.style.left = Math.max(8, nx) + "px";
    tip.style.top = Math.max(8, ny) + "px";
  }
  const hideTip = () => tip && tip.classList.remove("in");

  function wireQuotes(root) {
    root.querySelectorAll(".q").forEach(el => {
      if (el.dataset.wired) return;
      el.dataset.wired = "1";
      el.tabIndex = 0;
      el.addEventListener("mouseenter", e => showTip(el.dataset.q, e.clientX, e.clientY));
      el.addEventListener("mousemove", e => moveTip(e.clientX, e.clientY));
      el.addEventListener("mouseleave", hideTip);
      el.addEventListener("focus", () => {
        const r = el.getBoundingClientRect(); showTip(el.dataset.q, r.left, r.bottom);
      });
      el.addEventListener("blur", hideTip);
      el.addEventListener("click", e => { e.preventDefault(); showTip(el.dataset.q, e.clientX, e.clientY); });
    });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  // ------------------------------------------------------- signal processing
  // Second-order Butterworth sections, applied forward and then backward so the
  // envelope is not shifted in time. Zero-phase, effectively fourth order, which
  // is what the published pipeline uses.
  function biquad(fc, fs, high) {
    const w = Math.tan(Math.PI * fc / fs), w2 = w * w, r = Math.SQRT2;
    const n = 1 / (1 + r * w + w2);
    return high
      ? { b0: n, b1: -2 * n, b2: n, a1: 2 * (w2 - 1) * n, a2: (1 - r * w + w2) * n }
      : { b0: w2 * n, b1: 2 * w2 * n, b2: w2 * n, a1: 2 * (w2 - 1) * n, a2: (1 - r * w + w2) * n };
  }
  function pass(x, c) {
    const y = new Float64Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  const reverse = a => { const o = new Float64Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[a.length - 1 - i]; return o; };
  function filtfilt(x, fc, fs, high) {
    const c = biquad(fc, fs, high);
    return reverse(pass(reverse(pass(x, c)), c));
  }

  const rms = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); };
  const peak = a => { let m = 0; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; };

  // Iterative radix-2 FFT, real input, for the power spectrum and median frequency.
  function fftPower(x, fs) {
    let n = 1; while (n < x.length) n <<= 1;
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < x.length; i++) re[i] = x[i];
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    const half = n >> 1, p = new Float64Array(half), f = new Float64Array(half);
    for (let i = 0; i < half; i++) { p[i] = re[i] * re[i] + im[i] * im[i]; f[i] = i * fs / n; }
    return { p, f };
  }
  function medianFreq(x, fs) {
    const { p, f } = fftPower(x, fs);
    let tot = 0; for (let i = 1; i < p.length; i++) tot += p[i];
    let acc = 0;
    for (let i = 1; i < p.length; i++) { acc += p[i]; if (acc >= tot / 2) return f[i]; }
    return 0;
  }

  // --------------------------------------------------------------- the state
  const S = {
    csv: null, fs: 1000, touchdowns: [], trial: "",
    muscle: "ta",
    hp: 50, hpMode: "santuz",
    rectify: true,
    lp: 20,
    norm: "peak",          // "raw" | "peak" | "mvc"
    mvc: 0.40,           // mV of ENVELOPE, not of raw signal
    stage: 1,
    answered: {},
  };
  const CH = { ta: "Tibialis anterior", gm: "Gastrocnemius medialis", rf: "Rectus femoris" };
  const CH_PL = { ta: "Piszczelowy przedni", gm: "Brzuchaty łydki, głowa przyśrodkowa", rf: "Prosty uda" };

  const subs = [];
  const emit = () => subs.forEach(f => f());

  // ------------------------------------------------------------------ derive
  let cache = null, cacheKey = "";
  function compute() {
    const key = [S.muscle, S.hp, S.rectify, S.lp, S.norm, S.mvc].join("|");
    if (cache && cacheKey === key) return cache;
    const raw = S.csv[S.muscle];
    const filt = S.hp > 0 ? filtfilt(raw, S.hp, S.fs, true) : Float64Array.from(raw);
    const removed = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i++) removed[i] = raw[i] - filt[i];
    const rect = new Float64Array(filt.length);
    for (let i = 0; i < filt.length; i++) rect[i] = Math.abs(filt[i]);
    const env = filtfilt(S.rectify ? rect : filt, S.lp, S.fs, false);
    for (let i = 0; i < env.length; i++) if (env[i] < 0) env[i] = 0;

    const pk = peak(env) || 1;
    let norm = env, unit = "mV";
    if (S.norm === "peak") {
      norm = new Float64Array(env.length);
      for (let i = 0; i < env.length; i++) norm[i] = env[i] / pk;
      unit = "× peak";
    } else if (S.norm === "mvc") {
      norm = new Float64Array(env.length);
      for (let i = 0; i < env.length; i++) norm[i] = env[i] / S.mvc;
      unit = "% MVC";
    }

    const rawP = rms(raw), filtP = rms(filt);
    cache = {
      raw, filt, removed, rect, env, norm, unit, peak: pk,
      rmsRaw: rawP, rmsFilt: filtP,
      powerRemoved: rawP > 0 ? Math.max(0, 1 - (filtP * filtP) / (rawP * rawP)) : 0,
      mfRaw: medianFreq(raw, S.fs), mfFilt: medianFreq(filt, S.fs),
      envPeak: pk,
    };
    cacheKey = key;
    return cache;
  }

  // ------------------------------------------------------------------ drawing
  const C = { raw: "#7c9bff", filt: "#5eead4", removed: "#ff6f5e", env: "#ffd166",
              grid: "#222a3c", ink: "#c7d0e0", muted: "#5b6884" };

  function fit(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx, w: r.width, h: r.height };
  }

  function drawTrace(ctx, data, x0, y0, w, h, lo, hi, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.beginPath();
    const n = data.length, step = Math.max(1, Math.floor(n / (w * 2)));
    for (let i = 0; i < n; i += step) {
      const x = x0 + (i / (n - 1)) * w;
      const y = y0 + h - ((data[i] - lo) / (hi - lo)) * h;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function panel(ctx, x0, y0, w, h, label, sub) {
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, w, h);
    ctx.font = "600 10px 'Space Grotesk',sans-serif"; ctx.fillStyle = C.ink;
    ctx.fillText(label, x0 + 7, y0 + 13);
    if (sub) { ctx.fillStyle = C.muted; ctx.font = "400 9.5px 'JetBrains Mono',monospace";
               ctx.fillText(sub, x0 + 7, y0 + 25); }
  }

  function drawTouchdowns(ctx, x0, y0, w, h) {
    ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = "rgba(232,237,247,.16)"; ctx.lineWidth = 1;
    const dur = S.csv.time[S.csv.time.length - 1];
    S.touchdowns.forEach(t => {
      const x = x0 + (t / dur) * w;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke();
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------- stages
  const STAGES = [
    { n: 1, k: "raw", en: "Raw", pl: "Surowy" },
    { n: 2, k: "filter", en: "Filter", pl: "Filtr" },
    { n: 3, k: "rectify", en: "Rectify", pl: "Prostowanie" },
    { n: 4, k: "envelope", en: "Envelope", pl: "Obwiednia" },
    { n: 5, k: "normalize", en: "Normalize", pl: "Normalizacja" },
    { n: 6, k: "interpret", en: "Interpret", pl: "Interpretacja" },
    { n: 7, k: "break", en: "Break it", pl: "Zepsuj to" },
  ];

  function buildStages(host) {
    const bar = document.createElement("div");
    bar.className = "eg-stages";
    host.appendChild(bar);
    function paint() {
      bar.innerHTML = STAGES.map(s =>
        '<button class="eg-stage' + (s.n === S.stage ? " on" : "") +
        (s.k === "break" ? " eg-stage-break" : "") + '" data-s="' + s.n + '">' +
        '<span class="eg-stage-n">' + s.n + "</span>" + L(s) + "</button>").join("");
      bar.querySelectorAll("[data-s]").forEach(b =>
        b.addEventListener("click", () => { S.stage = +b.dataset.s; emit(); }));
    }
    subs.push(paint);
    document.addEventListener("i18n:changed", paint);
    paint();
  }

  function buildScope(host) {
    const wrap = document.createElement("div");
    wrap.className = "eg-scope";
    wrap.innerHTML = '<canvas></canvas>';
    host.appendChild(wrap);
    const cv = wrap.querySelector("canvas");

    function paint() {
      if (!S.csv) return;
      const { ctx, w, h } = fit(cv);
      const d = compute();
      const pad = 10, gap = 8;
      const stage = S.stage;

      // which traces this stage shows
      let rows = [];
      if (stage === 1) {
        rows = [{ data: d.raw, col: C.raw, label: T("RAW  what the electrodes recorded", "SUROWY  co zarejestrowały elektrody"),
                  sub: "mV · 1000 Hz · " + S.csv.time.length + " samples", sym: true }];
      } else if (stage === 2) {
        rows = [
          { data: d.raw, col: C.raw, label: T("RAW", "SUROWY"), sub: "mV", sym: true },
          { data: d.filt, col: C.filt, label: T("FILTERED  high-pass " + S.hp + " Hz", "PO FILTRACJI  górnoprzepustowy " + S.hp + " Hz"), sub: "mV", sym: true },
          { data: d.removed, col: C.removed, label: T("REMOVED  raw minus filtered", "USUNIĘTE  surowy minus przefiltrowany"),
            sub: T("this is recorded information the filter discarded", "to zarejestrowana informacja, którą filtr odrzucił"), sym: true },
        ];
      } else if (stage === 3) {
        rows = [
          { data: d.filt, col: C.filt, label: T("FILTERED", "PO FILTRACJI"), sub: "mV", sym: true },
          { data: d.rect, col: C.env, label: T("RECTIFIED  absolute value", "WYPROSTOWANY  wartość bezwzględna"),
            sub: T("negative voltage is not negative activation", "napięcie ujemne to nie ujemna aktywacja"), sym: false },
        ];
      } else if (stage === 4) {
        rows = [
          { data: d.rect, col: "rgba(255,209,102,.30)", label: T("RECTIFIED", "WYPROSTOWANY"), sub: "mV", sym: false,
            overlay: { data: d.env, col: C.env, lw: 2 } },
        ];
      } else {
        rows = [{ data: d.norm, col: C.env, label: T("ENVELOPE", "OBWIEDNIA"), sub: d.unit, sym: false, lw: 2 }];
      }

      // Stage 2 compares raw, filtered and removed, so all three must share one
      // vertical scale. Auto-scaling each panel would draw the removed signal as
      // tall as the raw one and quietly overstate what the filter took.
      let shared = null;
      if (stage === 2) {
        let m = 0;
        rows.forEach(r => { for (let k = 0; k < r.data.length; k++) m = Math.max(m, Math.abs(r.data[k])); });
        shared = m || 1;
      }

      const rowH = (h - pad * 2 - gap * (rows.length - 1)) / rows.length;
      rows.forEach((r, i) => {
        const y0 = pad + i * (rowH + gap);
        let lo, hi;
        if (shared) {
          lo = -shared; hi = shared;
        } else if (r.sym) {
          let m = 0; for (let k = 0; k < r.data.length; k++) m = Math.max(m, Math.abs(r.data[k]));
          m = m || 1; lo = -m; hi = m;
        } else {
          let m = 0; for (let k = 0; k < r.data.length; k++) m = Math.max(m, r.data[k]);
          if (r.overlay) for (let k = 0; k < r.overlay.data.length; k++) m = Math.max(m, r.overlay.data[k]);
          m = m || 1; lo = 0; hi = m * 1.06;
        }
        panel(ctx, pad, y0, w - pad * 2, rowH, r.label, r.sub);
        drawTouchdowns(ctx, pad, y0, w - pad * 2, rowH);
        if (r.sym) {
          ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.beginPath();
          ctx.moveTo(pad, y0 + rowH / 2); ctx.lineTo(w - pad, y0 + rowH / 2); ctx.stroke();
        }
        drawTrace(ctx, r.data, pad, y0, w - pad * 2, rowH, lo, hi, r.col, r.lw || 1);
        if (r.overlay) drawTrace(ctx, r.overlay.data, pad, y0, w - pad * 2, rowH, lo, hi, r.overlay.col, r.overlay.lw);
        // scale
        ctx.font = "400 9px 'JetBrains Mono',monospace"; ctx.fillStyle = C.muted;
        ctx.fillText(hi.toFixed(2), w - pad - 30, y0 + 11);
        ctx.fillText(lo.toFixed(2), w - pad - 30, y0 + rowH - 5);
      });
      ctx.font = "400 9px 'JetBrains Mono',monospace"; ctx.fillStyle = C.muted;
      ctx.fillText("0 s", pad + 2, h - 1);
      ctx.fillText("8 s", w - pad - 20, h - 1);
    }
    subs.push(paint);
    window.addEventListener("resize", paint);
    document.addEventListener("i18n:changed", paint);
  }

  // ---------------------------------------------------------------- controls
  const HP_PRESETS = [
    { id: "min", hz: 10, en: "Minimal filtering", pl: "Minimalna filtracja",
      d: { en: "Keeps almost everything, including movement artefact.",
           pl: "Zachowuje niemal wszystko, łącznie z artefaktem ruchowym." } },
    { id: "compromise", hz: 20, en: "General-purpose compromise", pl: "Kompromis ogólnego zastosowania",
      d: { en: "The trade-off De Luca and colleagues identified for surface EMG.",
           pl: "Kompromis wskazany przez De Lucę i współpracowników dla EMG powierzchniowego." } },
    { id: "santuz", hz: 50, en: "Santuz pipeline", pl: "Pipeline Santuza",
      d: { en: "What these particular data were analysed with. Not a universal standard.",
           pl: "To, czym analizowano akurat te dane. Nie jest to standard uniwersalny." } },
  ];
  const LP_PRESETS = [3, 6, 10, 20];

  function buildControls(host) {
    const box = document.createElement("div");
    box.className = "eg-controls";
    host.appendChild(box);

    function paint() {
      const pl = PL();
      const d = S.csv ? compute() : null;
      const stage = S.stage;
      let html = '<div class="eg-ctrl-row eg-muscles">' +
        Object.keys(CH).map(k =>
          '<button class="eg-mus' + (k === S.muscle ? " on" : "") + '" data-m="' + k + '">' +
          "<b>" + k.toUpperCase() + "</b>" + (pl ? CH_PL[k] : CH[k]) + "</button>").join("") +
        "</div>";

      if (stage >= 2) {
        html += '<div class="eg-block"><div class="eg-block-h">' +
          T("High-pass cutoff", "Odcięcie górnoprzepustowe") + "</div>" +
          '<div class="eg-presets">' +
          HP_PRESETS.map(p =>
            '<button class="eg-preset' + (S.hpMode === p.id ? " on" : "") + '" data-hp="' + p.id + '">' +
            '<span class="eg-preset-hz">' + p.hz + " Hz</span>" + L(p) +
            '<em>' + L(p.d) + "</em></button>").join("") +
          '<button class="eg-preset' + (S.hpMode === "custom" ? " on" : "") + '" data-hp="custom">' +
          '<span class="eg-preset-hz">' + (S.hpMode === "custom" ? S.hp + " Hz" : "?") + "</span>" +
          T("Custom", "Własne") + "<em>" + T("drag it yourself", "ustaw samodzielnie") + "</em></button>" +
          "</div>" +
          (S.hpMode === "custom"
            ? '<input type="range" id="egHp" min="1" max="200" step="1" value="' + S.hp + '">'
            : "") +
          "</div>";
      }
      if (stage >= 4) {
        html += '<div class="eg-block"><div class="eg-block-h">' +
          T("Envelope low-pass", "Dolnoprzepustowy obwiedni") + "</div>" +
          '<div class="eg-chips">' + LP_PRESETS.map(f =>
            '<button class="eg-chip' + (S.lp === f ? " on" : "") + '" data-lp="' + f + '">' + f + " Hz</button>").join("") +
          "</div></div>";
      }
      if (stage >= 5) {
        html += '<div class="eg-block"><div class="eg-block-h">' +
          T("Normalisation", "Normalizacja") + "</div>" +
          '<div class="eg-chips">' +
          '<button class="eg-chip' + (S.norm === "raw" ? " on" : "") + '" data-n="raw">' + T("raw mV", "surowe mV") + "</button>" +
          '<button class="eg-chip' + (S.norm === "peak" ? " on" : "") + '" data-n="peak">' + T("peak of trial", "szczyt próby") + "</button>" +
          '<button class="eg-chip eg-chip-model' + (S.norm === "mvc" ? " on" : "") + '" data-n="mvc">' + T("MVC", "MVC") + "</button>" +
          "</div>" +
          (S.norm === "mvc"
            ? '<div class="eg-mvc"><label>' +
              T("Hypothetical MVC reference (envelope, mV)", "Hipotetyczne odniesienie MVC (obwiednia, mV)") +
              ' <span class="pv">' + S.mvc.toFixed(2) + " mV</span></label>" +
              '<input type="range" id="egMvc" min="0.05" max="0.60" step="0.01" value="' + S.mvc + '">' +
              '<p class="eg-model-warn"><span class="q" data-q="nomvc">' +
              T("This contraction was never measured. You are choosing the denominator.",
                "Tego skurczu nigdy nie zmierzono. To Ty wybierasz mianownik.") + "</span></p></div>"
            : "") +
          "</div>";
      }

      if (d && stage >= 2) {
        const pctRemoved = (d.powerRemoved * 100);
        html += '<div class="eg-metrics">' +
          metric(T("RMS raw", "RMS surowy"), d.rmsRaw.toFixed(4) + " mV") +
          metric(T("RMS filtered", "RMS po filtracji"), d.rmsFilt.toFixed(4) + " mV") +
          metric(T("Signal power removed", "Usunięta moc sygnału"), pctRemoved.toFixed(1) + " %",
                 pctRemoved > 60 ? "bad" : pctRemoved > 30 ? "warn" : "ok") +
          metric(T("Median frequency raw", "Częstotliwość mediany, surowy"), d.mfRaw.toFixed(0) + " Hz") +
          metric(T("Median frequency filtered", "Częstotliwość mediany, po filtracji"), d.mfFilt.toFixed(0) + " Hz") +
          metric(T("Envelope peak", "Szczyt obwiedni"), d.envPeak.toFixed(4) + " mV") +
          "</div>";
      }
      box.innerHTML = html;

      box.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { S.muscle = b.dataset.m; emit(); }));
      box.querySelectorAll("[data-hp]").forEach(b => b.addEventListener("click", () => {
        const id = b.dataset.hp;
        S.hpMode = id;
        const p = HP_PRESETS.find(x => x.id === id);
        if (p) S.hp = p.hz;
        emit();
      }));
      const hpS = box.querySelector("#egHp");
      if (hpS) hpS.addEventListener("input", () => { S.hp = +hpS.value; emit(); });
      box.querySelectorAll("[data-lp]").forEach(b => b.addEventListener("click", () => { S.lp = +b.dataset.lp; emit(); }));
      box.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => { S.norm = b.dataset.n; emit(); }));
      const mv = box.querySelector("#egMvc");
      if (mv) mv.addEventListener("input", () => { S.mvc = +mv.value; emit(); });
      wireQuotes(box);
    }
    function metric(k, v, cls) {
      return '<div class="eg-metric' + (cls ? " eg-" + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>";
    }
    subs.push(paint);
    document.addEventListener("i18n:changed", paint);
  }

  // -------------------------------------------------------------- questions
  const QUIZ = [
    {
      id: "cleaner", stage: 2,
      q: { en: "A higher high-pass cutoff makes the trace look cleaner. Does that make it more accurate?",
           pl: "Wyższe odcięcie górnoprzepustowe sprawia, że przebieg wygląda czyściej. Czy to znaczy, że jest dokładniejszy?" },
      opts: [
        { en: "Yes, less noise means a better estimate", pl: "Tak, mniej szumu to lepsze oszacowanie" },
        { en: "No, it removes real signal along with the artefact", pl: "Nie, usuwa prawdziwy sygnał razem z artefaktem", ok: true },
        { en: "Only above 100 Hz", pl: "Tylko powyżej 100 Hz" },
      ],
      why: { en: "Look at the REMOVED trace. It is not empty. A filter cannot tell artefact from muscle: it only knows frequency. At 50 Hz the removed band still contains genuine EMG power, and the metric above tells you how much. Cleaner is a statement about appearance, not about truth.",
             pl: "Spójrz na przebieg USUNIĘTE. Nie jest pusty. Filtr nie odróżnia artefaktu od mięśnia: zna wyłącznie częstotliwość. Przy 50 Hz usunięte pasmo nadal zawiera prawdziwą moc EMG, a wskaźnik powyżej mówi ile. Czystszy to stwierdzenie o wyglądzie, a nie o prawdzie." },
    },
    {
      id: "force", stage: 6,
      q: { en: "Two muscles from this same trial, same processing, normalised to peak of trial: TA = 0.46, RF = 0.81. Which muscle is producing more force?",
           pl: "Dwa mięśnie z tej samej próby, to samo przetwarzanie, normalizacja do szczytu próby: TA = 0,46, RF = 0,81. Który mięsień wytwarza większą siłę?" },
      opts: [
        { en: "TA", pl: "TA" },
        { en: "RF", pl: "RF" },
        { en: "Approximately the same", pl: "Mniej więcej tyle samo" },
        { en: "Cannot be determined from these data", pl: "Nie da się tego ustalić z tych danych", ok: true },
      ],
      why: { en: "Each muscle was divided by its own peak, so the two numbers sit on two unrelated scales. Even without that, surface EMG amplitude does not convert to force: it depends on electrode placement, subcutaneous fat, muscle length, contraction velocity, fibre type and cross-talk from neighbours. EMG tells you when, and how a muscle's own activity changes over time. It does not tell you how much force, and it never compares two muscles.",
             pl: "Każdy mięsień podzielono przez jego własny szczyt, więc obie liczby leżą na dwóch niepowiązanych skalach. Nawet bez tego amplituda powierzchniowego EMG nie przelicza się na siłę: zależy od ułożenia elektrod, tkanki tłuszczowej, długości mięśnia, prędkości skurczu, typu włókien i przesłuchu z sąsiadów. EMG mówi, kiedy i jak zmienia się aktywność danego mięśnia w czasie. Nie mówi, ile siły, i nigdy nie porównuje dwóch mięśni." },
    },
  ];

  function buildQuiz(host, stage) {
    const q = QUIZ.find(x => x.stage === stage);
    if (!q) return;
    const el = document.createElement("div");
    el.className = "eg-quiz";
    host.appendChild(el);
    function paint() {
      const chosen = S.answered[q.id];
      el.innerHTML =
        '<div class="eg-quiz-q"><span class="eg-quiz-tag">' + T("Predict", "Przewiduj") + "</span>" +
        L(q.q) + "</div>" +
        '<div class="eg-quiz-opts">' + q.opts.map((o, i) =>
          '<button class="eg-opt' + (chosen === undefined ? "" :
            (o.ok ? " right" : (chosen === i ? " wrong" : " dim"))) + '" data-o="' + i + '"' +
          (chosen !== undefined ? " disabled" : "") + ">" + L(o) + "</button>").join("") +
        "</div>" +
        (chosen !== undefined
          ? '<div class="eg-quiz-why"><b>' +
            (q.opts[chosen].ok ? T("Correct.", "Poprawnie.") : T("Not quite.", "Niezupełnie.")) +
            "</b> " + L(q.why) + "</div>"
          : "");
      el.querySelectorAll("[data-o]").forEach(b =>
        b.addEventListener("click", () => { S.answered[q.id] = +b.dataset.o; emit(); }));
    }
    subs.push(paint);
    document.addEventListener("i18n:changed", paint);
  }

  // -------------------------------------------------------------- break it
  const BREAKS = [
    { en: "High-pass 100 Hz", pl: "Górnoprzepustowy 100 Hz", act: () => { S.hpMode = "custom"; S.hp = 100; } },
    { en: "High-pass 1 Hz", pl: "Górnoprzepustowy 1 Hz", act: () => { S.hpMode = "custom"; S.hp = 1; } },
    { en: "Envelope 3 Hz", pl: "Obwiednia 3 Hz", act: () => { S.lp = 3; } },
    { en: "MVC reference set too low", pl: "Odniesienie MVC ustawione za nisko", act: () => { S.norm = "mvc"; S.mvc = 0.10; } },
    { en: "Back to the published pipeline", pl: "Powrót do opublikowanego pipeline'u",
      act: () => { S.hpMode = "santuz"; S.hp = 50; S.lp = 20; S.norm = "peak"; } },
  ];

  function buildBreak(host) {
    const el = document.createElement("div");
    el.className = "eg-break";
    host.appendChild(el);
    function paint() {
      const d = S.csv ? compute() : null;
      const overOne = d && S.norm === "mvc" ? peak(d.norm) : 0;
      el.innerHTML =
        '<div class="eg-break-btns">' + BREAKS.map((b, i) =>
          '<button data-b="' + i + '">' + L(b) + "</button>").join("") + "</div>" +
        (overOne > 1
          ? '<div class="eg-alarm"><b>' + (overOne * 100).toFixed(0) + "% MVC.</b> " +
            '<span class="q" data-q="over100">' +
            T("Above 100%. Impossible? Not necessarily.", "Powyżej 100%. Niemożliwe? Niekoniecznie.") +
            "</span> " +
            T("Hover that. Then ask which number you would put in a report.",
              "Najedź na to. Potem zastanów się, którą liczbę wpisałbyś do raportu.") + "</div>"
          : "") +
        '<p class="eg-break-note">' +
        T("Each of these produces a trace that still looks like a result. That is the point: a plausible-looking curve is not evidence that the processing was appropriate.",
          "Każde z tych ustawień daje przebieg, który nadal wygląda jak wynik. O to właśnie chodzi: wiarygodnie wyglądająca krzywa nie jest dowodem, że przetwarzanie było właściwe.") +
        "</p>";
      el.querySelectorAll("[data-b]").forEach(b =>
        b.addEventListener("click", () => { BREAKS[+b.dataset.b].act(); S.stage = Math.max(S.stage, 5); emit(); }));
      wireQuotes(el);
    }
    subs.push(paint);
    document.addEventListener("i18n:changed", paint);
  }

  // ------------------------------------------------------------------- boot
  function parseCSV(text) {
    const meta = {}, cols = {};
    const lines = text.split(/\r?\n/);
    let header = null, rows = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      if (line.startsWith('"#') || line.startsWith("#")) {
        const m = line.replace(/^"?#\s*/, "").split(",");
        if (m.length >= 2) meta[m[0].trim().replace(/"$/, "")] = m.slice(1).join(",").trim();
        continue;
      }
      if (!header) { header = line.split(","); continue; }
      rows.push(line.split(","));
    }
    header.forEach((h, i) => {
      const key = h.trim().replace(/_mv$/, "").replace(/_s$/, "");
      cols[key] = Float64Array.from(rows, r => parseFloat(r[i]));
    });
    return { meta, cols };
  }

  async function boot() {
    const host = document.getElementById("egLab");
    if (!host) return;
    let text;
    try {
      const res = await fetch("data/emg/santuz2021_demo.csv");
      if (!res.ok) throw new Error(res.status);
      text = await res.text();
    } catch (e) {
      host.innerHTML = '<p class="eg-fail">' +
        T("Could not load the EMG recording. This station needs data/emg/santuz2021_demo.csv.",
          "Nie udało się wczytać zapisu EMG. Ta stacja wymaga pliku data/emg/santuz2021_demo.csv.") + "</p>";
      return;
    }
    const { meta, cols } = parseCSV(text);
    S.csv = cols;
    S.fs = parseInt(meta.sampling_rate_hz, 10) || 1000;
    S.trial = meta.trial || "";
    S.touchdowns = (meta.touchdown_s || "").split(";").filter(Boolean).map(parseFloat);

    const prov = document.getElementById("egProv");
    if (prov) {
      prov.textContent = S.trial + " · " + S.fs + " Hz · " +
        S.csv.time.length + " " + T("samples", "próbek") + " · " +
        S.touchdowns.length + " " + T("gait cycles", "cykli chodu");
    }

    buildStages(host);
    buildScope(host);
    buildControls(host);
    buildQuiz(host, 2);
    buildQuiz(host, 6);
    buildBreak(host);
    wireQuotes(document);
    document.addEventListener("i18n:changed", () => { hideTip(); wireQuotes(document); });
    emit();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
