// "Wake the body": three biomechanics puzzles that unlock the station map.
//
// Deliberately a SOFT gate. It hides only the map on this page: every station has a
// working direct URL, progress is remembered, and there is always a skip link. A puzzle
// should be a delight on the way in, never a wall between a student and the material.

(function () {
  "use strict";

  const KEY = "motionlab.seals.v1";
  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);

  let solved = {};
  try { solved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { solved = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(solved)); } catch (e) {} };

  const COPY = {
    label:   { en: "Three systems offline", pl: "Trzy układy nieaktywne" },
    title:   { en: "Wake the body", pl: "Obudź ciało" },
    lead:    { en: "The map is asleep. Three short puzzles will start it. None of them needs prior knowledge, and each one turns on a result you can check for yourself.",
               pl: "Mapa śpi. Uruchomią ją trzy krótkie zadania. Żadne nie wymaga wcześniejszej wiedzy, a każde odsłania wynik, który możesz sam sprawdzić." },
    skip:    { en: "skip the puzzles, show me the map", pl: "pomiń zadania, pokaż mapę" },
    doneT:   { en: "The body is awake", pl: "Ciało się obudziło" },
    doneP:   { en: "All three systems online. The map below is open, and it stays open next time.",
               pl: "Wszystkie trzy układy aktywne. Mapa poniżej jest otwarta i pozostanie otwarta następnym razem." },
    replay:  { en: "run the puzzles again", pl: "zagraj w zagadki ponownie" },
    solvedTag: { en: "solved", pl: "rozwiązane" },
  };
  const t = k => COPY[k][PL() ? "pl" : "en"];

  const SEALS = [
    { id: "bone", n: "01", c: "#7c9bff",
      name: { en: "Observation", pl: "Obserwacja" },
      task: { en: "One of these three is physically impossible",
              pl: "Jedna z tych trzech jest fizycznie niemożliwa" },
      hint: { en: "Each panel shows a walker frozen mid-stride, with the arrow marking the force between foot and ground. Two of them could happen. One cannot. Click it.",
              pl: "Każdy panel pokazuje chód zatrzymany w połowie kroku, a strzałka oznacza siłę między stopą a podłożem. Dwa z nich mogłyby się zdarzyć. Jeden nie. Kliknij go." },
      done: { en: "Ground reaction force only exists while something is touching the ground. A foot in mid-swing carries none, which is why the force trace sits flat at zero for a third of every walking cycle, and why a force plate can tell you exactly when contact began without watching the foot at all.",
              pl: "Siła reakcji podłoża istnieje tylko wtedy, gdy coś dotyka podłoża. Stopa w fazie wymachu nie przenosi żadnej, dlatego wykres siły leży płasko na zerze przez jedną trzecią każdego cyklu chodu i dlatego platforma dynamometryczna potrafi dokładnie wskazać początek kontaktu, w ogóle nie patrząc na stopę." } },

    { id: "muscle", n: "02", c: "#ff6f5e",
      name: { en: "Force", pl: "Siła" },
      task: { en: "Balance the forearm", pl: "Zrównoważ przedramię" },
      hint: { en: "An 8 kg load sits 34 cm from the elbow. Your muscle can pull with 400 N, no more. Slide its attachment until the two turning effects cancel and the beam sits level.",
              pl: "Ciężar 8 kg znajduje się 34 cm od łokcia. Twój mięsień może ciągnąć z siłą 400 N, nie więcej. Przesuwaj jego przyczep, aż oba momenty się zniosą, a belka się wypoziomuje." },
      done: { en: "Torque is force times moment arm, and the muscle's arm is tiny, which is why holding 8 kg costs the elbow hundreds of newtons.",
              pl: "Moment to siła razy ramię, a ramię mięśnia jest maleńkie, dlatego utrzymanie 8 kg kosztuje łokieć setki niutonów." } },

    { id: "control", n: "03", c: "#5eead4",
      name: { en: "Timing", pl: "Czas" },
      task: { en: "Make it jump", pl: "Spraw, by podskoczyło" },
      hint: { en: "Three joints extend to launch a jump, but only one order works. Pick it. Getting it wrong is worth doing at least once.",
              pl: "Trzy stawy prostują się przy wybiciu, ale działa tylko jedna kolejność. Wybierz ją. Warto choć raz pomylić się celowo." },
      done: { en: "Proximal to distal: hip, then knee, then ankle last. Each segment launches off the one already moving beneath it. That is what \"triple extension\" means in time.",
              pl: "Od bliższych do dalszych: biodro, potem kolano, a staw skokowy na końcu. Każdy segment odbija się od tego, który już się porusza pod nim. To właśnie znaczy „potrójne wyprostowanie” w czasie." } },
  ];

  const gridEl = () => document.getElementById("qGrid");

  function allDone() { return SEALS.every(s => solved[s.id]); }

  function markSolved(id) {
    if (solved[id]) return;
    solved[id] = true; save();
    const card = document.querySelector('.q-card[data-seal="' + id + '"]');
    if (card) {
      card.classList.add("done");
      const s = SEALS.find(x => x.id === id);
      const body = card.querySelector(".q-body");
      body.innerHTML = '<p class="q-done">' + s.done[PL() ? "pl" : "en"] + "</p>";
    }
    if (allDone()) reveal(true);
  }

  // ---------- 01 observation: spot the impossible walker ----------
  //
  // Static frames on purpose. Two panels show a foot in contact with a ground reaction
  // force; the third shows a foot clearly in mid-swing that still has one. Nothing here
  // depends on tuning a physics threshold; the answer is either right or it isn't.
  function buildBone(host) {
    // data.js uses a top-level `const`, which is a lexical global, NOT a window property,
    // so it has to be reached by bare name rather than through window.
    const M = (typeof MOVEMENTS !== "undefined") ? MOVEMENTS.walk : null;
    const wrap = document.createElement("div");
    wrap.className = "q-three";
    host.appendChild(wrap);
    const read = document.createElement("div");
    read.className = "q-read";
    host.appendChild(read);
    if (!M) { read.textContent = "·"; return; }

    const scales = computeScales(M, M.param.default);
    const bad = Math.floor(Math.random() * 3);
    const legit = [14, 46];                      // loading response, terminal stance
    let li = 0;

    for (let i = 0; i < 3; i++) {
      const isBad = i === bad;
      const phase = isBad ? 76 : legit[li++];    // 76% = mid swing, foot well clear
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "q-cell";
      cell.setAttribute("aria-label", String.fromCharCode(65 + i));
      const cv = document.createElement("canvas");
      cell.appendChild(cv);
      const tag = document.createElement("span");
      tag.className = "q-cell-tag";
      tag.textContent = String.fromCharCode(65 + i);
      cell.appendChild(tag);
      wrap.appendChild(cell);

      requestAnimationFrame(() => paint(cv, phase, isBad));
      setTimeout(() => paint(cv, phase, isBad), 60);   // in case rAF is throttled

      cell.addEventListener("click", () => {
        if (solved.bone) return;
        if (isBad) {
          cell.classList.add("right");
          markSolved("bone");
        } else {
          cell.classList.add("wrong");
          read.textContent = T("That one is fine, the foot is loaded and the force matches. Look for a foot that is off the ground.",
                               "Ten jest w porządku, stopa jest obciążona, a siła się zgadza. Szukaj stopy oderwanej od podłoża.");
          setTimeout(() => cell.classList.remove("wrong"), 900);
        }
      });
    }

    function paint(cv, t, isBad) {
      const r = cv.getBoundingClientRect();
      const w = r.width || 150, h = r.height || 150;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr; cv.height = h * dpr;
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const st = liveState(M, scales, t);
      const gy = h * 0.80, S = h * 0.62, cx = w * 0.46, D = Math.PI / 180;
      const hipY = gy - 0.60 * S + (st.hipDrop || 0) * S * 0.4;
      const hip = { x: cx, y: hipY };
      const ha = st.hipAngle * D;
      const knee = { x: hip.x + Math.sin(ha) * 0.30 * S, y: hip.y + Math.cos(ha) * 0.30 * S };
      const sa = (st.hipAngle - st.kneeAngle) * D;
      const ank = { x: knee.x + Math.sin(sa) * 0.29 * S, y: knee.y + Math.cos(sa) * 0.29 * S };
      const fa = (st.ankleAngle || 0) * D;
      const toe = { x: ank.x + Math.cos(fa) * 0.11 * S, y: ank.y + Math.sin(-fa) * 0.05 * S + 2 };
      const sh = { x: hip.x - Math.sin(4 * D) * 0.34 * S, y: hip.y - Math.cos(4 * D) * 0.34 * S };
      const head = { x: sh.x, y: sh.y - 0.06 * S };

      ctx.strokeStyle = "rgba(94,234,212,.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w * .08, gy); ctx.lineTo(w * .92, gy); ctx.stroke();

      ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(toe.x, toe.y); ctx.lineTo(ank.x, ank.y); ctx.lineTo(knee.x, knee.y);
      ctx.lineTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      ctx.fillStyle = "#e8edf7";
      ctx.beginPath(); ctx.arc(head.x, head.y, 0.052 * S, 0, 7); ctx.fill();

      // the force arrow: real magnitude when in contact, invented when not
      const mag = isBad ? 1.05 : st.grf;
      if (mag > 0.04) {
        const len = mag * S * 0.42;
        ctx.strokeStyle = "#5eead4"; ctx.fillStyle = "#5eead4"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(ank.x, gy); ctx.lineTo(ank.x, gy - len); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ank.x, gy - len - 7);
        ctx.lineTo(ank.x - 4.5, gy - len + 2); ctx.lineTo(ank.x + 4.5, gy - len + 2);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---------- 02 force: balance the lever ----------
  function buildMuscle(host) {
    const W = 8 * 9.81, L = 0.34, FMAX = 400;
    const need = W * L / FMAX;                     // ≈ 0.0667 m
    let d = 0.02;

    const wrap = document.createElement("div");
    wrap.className = "q-stage";
    const cv = document.createElement("canvas"); cv.className = "q-canvas";
    wrap.appendChild(cv);
    host.appendChild(wrap);

    const ctrl = document.createElement("div"); ctrl.className = "q-ctrl";
    ctrl.innerHTML =
      '<label>' + T("Muscle attachment from the elbow", "Przyczep mięśnia od łokcia") +
      ' <b class="q-val"></b></label>' +
      '<input type="range" min="10" max="120" step="1" value="20">' +
      '<div class="q-read"></div>';
    host.appendChild(ctrl);

    const slider = ctrl.querySelector("input");
    const val = ctrl.querySelector(".q-val");
    const read = ctrl.querySelector(".q-read");
    let done = false, tilt = 0;

    function draw() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);

      const need_t = W * L, have_t = FMAX * d;
      const err = (have_t - need_t) / need_t;
      tilt += (Math.max(-0.34, Math.min(0.34, err * 0.9)) - tilt) * 0.18;

      const ex = r.width * 0.20, ey = r.height * 0.56;
      const len = r.width * 0.62;
      const cs = Math.cos(-tilt), sn = Math.sin(-tilt);
      const P = u => [ex + len * u * cs, ey + len * u * sn];

      ctx.strokeStyle = "#39435c"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ex - 4, ey - r.height * 0.34); ctx.lineTo(ex, ey); ctx.stroke();

      ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 7;
      const end = P(1);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(end[0], end[1]); ctx.stroke();

      const ins = P(d / L);
      ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex - 2, ey - r.height * 0.30); ctx.lineTo(ins[0], ins[1]); ctx.stroke();

      ctx.fillStyle = "#7c9bff";
      ctx.beginPath(); ctx.arc(end[0], end[1], 8, 0, 7); ctx.fill();
      ctx.fillStyle = "#0a0e17"; ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 7); ctx.fill(); ctx.stroke();

      ctx.font = "600 11px 'Space Grotesk',sans-serif";
      ctx.fillStyle = "#ff6f5e";
      ctx.fillText(Math.round(FMAX * d * 100) / 100 + " N·m", 8, 16);
      ctx.fillStyle = "#7c9bff";
      ctx.fillText(Math.round(need_t * 100) / 100 + " N·m", 8, 32);

      val.textContent = (d * 100).toFixed(1) + " cm";
      const pct = Math.abs(err) * 100;
      read.textContent = done
        ? T("balanced", "zrównoważone")
        : (pct < 12 ? T("almost: ", "prawie: ") : "") +
          (err > 0 ? T("muscle torque too high", "moment mięśnia za duży")
                   : T("muscle torque too low", "moment mięśnia za mały"));
      if (!done && Math.abs(err) < 0.03) { done = true; markSolved("muscle"); }
      if (host.isConnected) requestAnimationFrame(draw);
    }
    slider.addEventListener("input", () => { d = parseFloat(slider.value) / 1000; });
    draw();
  }

  // ---------- 03 timing: fire in the right order ----------
  function buildControl(host) {
    const JOINTS = [
      { id: "hip", en: "hip", pl: "biodro" },
      { id: "knee", en: "knee", pl: "kolano" },
      { id: "ankle", en: "ankle", pl: "staw skokowy" },
    ];
    const CORRECT = ["hip", "knee", "ankle"];
    let picked = [], phase = 0, mode = null;

    const wrap = document.createElement("div"); wrap.className = "q-stage";
    const cv = document.createElement("canvas"); cv.className = "q-canvas";
    wrap.appendChild(cv); host.appendChild(wrap);

    const ctrl = document.createElement("div"); ctrl.className = "q-ctrl q-order";
    host.appendChild(ctrl);
    const read = document.createElement("div"); read.className = "q-read";
    host.appendChild(read);

    function renderBtns() {
      ctrl.innerHTML = "";
      JOINTS.forEach(j => {
        const b = document.createElement("button");
        const idx = picked.indexOf(j.id);
        b.className = "q-joint" + (idx >= 0 ? " picked" : "");
        b.type = "button";
        b.textContent = (idx >= 0 ? (idx + 1) + " · " : "") + j[PL() ? "pl" : "en"];
        b.disabled = idx >= 0 || mode === "play";
        b.addEventListener("click", () => {
          picked.push(j.id);
          if (picked.length === 3) {
            mode = "play"; phase = 0;
            const ok = picked.every((p, i) => p === CORRECT[i]);
            setTimeout(() => {
              if (ok) markSolved("control");
              else {
                read.textContent = T("…it folded. Try the other way round.",
                                     "…złożyło się. Spróbuj w innej kolejności.");
                setTimeout(() => { picked = []; mode = null; phase = 0; renderBtns(); read.textContent = ""; }, 1500);
              }
            }, 1400);
          }
          renderBtns();
        });
        ctrl.appendChild(b);
      });
      const reset = document.createElement("button");
      reset.type = "button"; reset.className = "q-reset";
      reset.textContent = T("reset", "od nowa");
      reset.addEventListener("click", () => { picked = []; mode = null; phase = 0; read.textContent = ""; renderBtns(); });
      ctrl.appendChild(reset);
    }

    function draw() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);

      const ok = picked.length === 3 && picked.every((p, i) => p === CORRECT[i]);
      if (mode === "play") phase = Math.min(1, phase + 0.016);

      const gy = r.height * 0.86;
      const cx = r.width * 0.5;
      let crouch = 0.42, lift = 0;
      if (mode === "play") {
        if (ok) { crouch = 0.42 * (1 - phase); lift = Math.max(0, (phase - 0.55)) * r.height * 0.8; }
        else { crouch = 0.42 + phase * 0.5; }
      }
      const legLen = r.height * 0.30 * (1 - crouch * 0.55);
      const hipY = gy - legLen * 2 - lift;
      const kneeY = gy - legLen - lift * 0.5;
      const kneeX = cx + (mode === "play" && !ok ? phase * r.width * 0.13 : 0);

      ctx.strokeStyle = "rgba(94,234,212,.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.width * 0.2, gy); ctx.lineTo(r.width * 0.8, gy); ctx.stroke();

      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = ok && phase > 0.5 ? "#5eead4" : "#e8edf7";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, gy - lift * 0.15);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(cx, hipY);
      ctx.lineTo(cx + (mode === "play" && !ok ? phase * r.width * 0.1 : 0), hipY - r.height * 0.22);
      ctx.stroke();
      ctx.fillStyle = ok && phase > 0.5 ? "#5eead4" : "#e8edf7";
      ctx.beginPath();
      ctx.arc(cx + (mode === "play" && !ok ? phase * r.width * 0.12 : 0), hipY - r.height * 0.30, r.height * 0.055, 0, 7);
      ctx.fill();
      if (host.isConnected) requestAnimationFrame(draw);
    }
    renderBtns(); draw();
  }

  const BUILDERS = { bone: buildBone, muscle: buildMuscle, control: buildControl };

  // ---------- gate ----------
  function reveal(animate) {
    const st = document.getElementById("stations");
    const gate = document.getElementById("gate");
    if (st) st.classList.remove("locked");
    if (gate) gate.classList.add("cleared");
    const done = document.getElementById("qDone");
    if (done) done.hidden = false;
    if (animate && st) setTimeout(() => st.scrollIntoView({ behavior: "smooth", block: "start" }), 700);
  }

  function build() {
    const g = gridEl();
    if (!g) return;
    g.innerHTML = "";
    const L = PL() ? "pl" : "en";
    SEALS.forEach(s => {
      const card = document.createElement("div");
      card.className = "q-card" + (solved[s.id] ? " done" : "");
      card.dataset.seal = s.id;
      card.style.setProperty("--c", s.c);
      card.innerHTML =
        '<div class="q-head"><span class="q-num">' + s.n + '</span>' +
        '<span class="q-name">' + s.name[L] + "</span>" +
        '<span class="q-tick">' + t("solvedTag") + "</span></div>" +
        '<h3 class="q-task">' + s.task[L] + "</h3>" +
        '<div class="q-body"></div>';
      g.appendChild(card);
      const body = card.querySelector(".q-body");
      if (solved[s.id]) {
        body.innerHTML = '<p class="q-done">' + s.done[L] + "</p>";
      } else {
        const hint = document.createElement("p");
        hint.className = "q-hint"; hint.textContent = s.hint[L];
        body.appendChild(hint);
        BUILDERS[s.id](body);
      }
    });

    const skip = document.getElementById("qSkip");
    if (skip) {
      skip.textContent = t("skip");
      skip.onclick = e => { e.preventDefault(); reveal(true); };
    }
    const dt = document.getElementById("qDoneTitle"), dp = document.getElementById("qDoneText"),
          rp = document.getElementById("qReplay");
    if (dt) dt.textContent = t("doneT");
    if (dp) dp.textContent = t("doneP");
    if (rp) {
      rp.textContent = t("replay");
      rp.onclick = e => {
        e.preventDefault(); solved = {}; save();
        const st = document.getElementById("stations");
        if (st) st.classList.add("locked");
        const done = document.getElementById("qDone");
        if (done) done.hidden = true;
        document.getElementById("gate").classList.remove("cleared");
        build();
        document.getElementById("gate").scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }
    document.querySelectorAll("#gate [data-qi18n]").forEach(el => {
      const k = el.getAttribute("data-qi18n");
      if (COPY[k]) el.textContent = t(k);
    });

    if (allDone()) reveal(false);
  }

  function boot() {
    build();
    document.addEventListener("i18n:changed", build);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
