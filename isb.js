// The ISB standard — an interactive walk through the two papers that gave biomechanics
// a shared language for 3-D joint angles.
//
//   Wu G, Cavanagh PR (1995) J Biomech 28:1257–1261  — reporting standard
//   Wu G et al. (2002)  J Biomech 35:543–548  — Part I: ankle, hip, spine
//   Wu G et al. (2005)  J Biomech 38:981–992  — Part II: shoulder, elbow, wrist, hand
//   Grood ES, Suntay WJ (1983) J Biomech Eng 105:136–144 — the JCS itself
//
// Every diagram here is drawn from the papers' TEXTUAL definitions of the axes. The figures
// in the papers are Elsevier copyright and are not reproduced; short quotations appear in
// the tooltips, each attributed to paper and page.

(function () {
  "use strict";

  const isPL = () => window.i18n && window.i18n.lang === "pl";
  const L = () => (isPL() ? "pl" : "en");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  //  quotations — short, attributed, shown on hover
  // ============================================================
  const Q = {
    nostandard: {
      en: "There is currently a lack of standard for reporting joint motion in the field of biomechanics for human movement",
      pl: "Obecnie w dziedzinie biomechaniki ruchu człowieka brakuje standardu raportowania ruchu w stawach",
      c: "Wu et al. 2002, J Biomech 35:543" },
    impossible: {
      en: "This makes the comparisons among various studies difficult, if not impossible.",
      pl: "To sprawia, że porównania między różnymi badaniami są trudne, jeśli nie niemożliwe.",
      c: "Wu et al. 2002, J Biomech 35:543" },
    clinical: {
      en: "the JCS as proposed by Grood and Suntay has the advantage of reporting joint motions in clinically relevant terms",
      pl: "JCS zaproponowany przez Grooda i Suntaya ma tę zaletę, że pozwala raportować ruchy w stawach w kategoriach istotnych klinicznie",
      c: "Wu et al. 2002, J Biomech 35:543" },
    landmarks: {
      en: "The axes in these CCSs are defined based on bony landmarks that are either palpable or identifiable from X-rays",
      pl: "Osie w tych układach CCS są definiowane na podstawie punktów kostnych, które są albo wyczuwalne palpacyjnie, albo możliwe do zidentyfikowania na zdjęciach rentgenowskich",
      c: "Wu et al. 2002, J Biomech 35:544" },
    floating: {
      // inner marks stepped down a level so they do not collide with the outer pair
      en: "Two of the JCS axes are body fixed, and one is ‘floating’.",
      pl: "Dwie z osi JCS są związane z ciałem, a jedna jest »pływająca«.",
      c: "Wu et al. 2002, J Biomech 35:544" },
    order: {
      en: "flexion followed by abduction gives a different result than abduction followed by flexion",
      pl: "zgięcie, po którym następuje odwodzenie, daje inny wynik niż odwodzenie, po którym następuje zgięcie",
      c: "Wu et al. 2005, J Biomech 38:985" },
    karduna: {
      en: "significant alterations in the description of motion, with differences up to 50° noted for some angles",
      pl: "istotne zmiany w opisie ruchu, z różnicami sięgającymi 50° odnotowanymi dla niektórych kątów",
      c: "Karduna et al. 2000 → Wu et al. 2005, J Biomech 38:985" },
    seqindep: {
      en: "the JCS is sequence independent, whereas Euler or Cardan angle representations are not",
      pl: "JCS jest niezależny od sekwencji, podczas gdy reprezentacje kątów Eulera lub Cardana nie są",
      c: "Wu et al. 2005, J Biomech 38:982" },
    communication: {
      en: "Adopting these standards will lead to better communication among researchers and clinicians.",
      pl: "Przyjęcie tych standardów doprowadzi do lepszej komunikacji między badaczami a klinicystami.",
      c: "Wu et al. 2005, J Biomech 38:981" },
    leftshoulder: {
      en: "Whenever left shoulders are measured, it is recommended to mirror the raw position data with respect to the sagittal plane (z = −z).",
      pl: "Zawsze gdy mierzy się lewy bark, zaleca się odbicie lustrzane surowych danych położenia względem płaszczyzny strzałkowej (z = −z).",
      c: "Wu et al. 2005, J Biomech 38:982" },
    hipcentre: {
      en: "The recommendation is to use the functional approach.",
      pl: "Zaleca się stosowanie podejścia czynnościowego.",
      c: "Wu et al. 2002, J Biomech 35:545" },
    gheuler: {
      en: "This is the one joint that is based on an Euler rotation sequence.",
      pl: "To jedyny staw, który opiera się na sekwencji rotacji Eulera.",
      c: "Wu et al. 2005, J Biomech 38:986" },
    othercon: {
      en: "It should be noted that other axis conventions have been described.",
      pl: "Należy zauważyć, że opisano również inne konwencje osi.",
      c: "Wu et al. 2002, J Biomech 35:547" },
    palpable: {
      en: "The present proposal defines landmarks easily accessible in humans from external palpation or from estimation methods",
      pl: "Niniejsza propozycja definiuje punkty kostne łatwo dostępne u człowieka poprzez palpację zewnętrzną lub metody estymacji",
      c: "Wu et al. 2002, J Biomech 35:545" },
  };

  // ---------- tooltip ----------
  let tip = null;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "isb-tip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(key, x, y) {
    const q = Q[key];
    if (!q) return;
    const t = ensureTip();
    const pl = isPL();
    // In Polish the translation leads, but the English original is always kept underneath:
    // a translated quotation is a translation, and saying so is the honest thing to do.
    t.innerHTML =
      '<span class="isb-tip-q">' + (pl ? "„" + q.pl + "”" : "“" + q.en + "”") + "</span>" +
      (pl ? '<span class="isb-tip-orig">oryginał: “' + q.en + '”</span>' : "") +
      '<span class="isb-tip-c">' + q.c + "</span>";
    t.classList.add("on");
    moveTip(x, y);
  }
  function moveTip(x, y) {
    if (!tip) return;
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let nx = x + pad, ny = y + pad;
    if (nx + w > window.innerWidth - 10) nx = x - w - pad;
    if (ny + h > window.innerHeight - 10) ny = y - h - pad;
    tip.style.left = Math.max(8, nx) + "px";
    tip.style.top = Math.max(8, ny) + "px";
  }
  function hideTip() { if (tip) tip.classList.remove("on"); }

  function wireQuotes(root) {
    (root || document).querySelectorAll("[data-q]").forEach(el => {
      if (el.__wired) return;
      el.__wired = true;
      el.tabIndex = 0;
      el.addEventListener("mouseenter", e => showTip(el.dataset.q, e.clientX, e.clientY));
      el.addEventListener("mousemove", e => moveTip(e.clientX, e.clientY));
      el.addEventListener("mouseleave", hideTip);
      el.addEventListener("focus", () => {
        const r = el.getBoundingClientRect();
        showTip(el.dataset.q, r.left, r.bottom);
      });
      el.addEventListener("blur", hideTip);
      el.addEventListener("click", e => {          // touch
        const r = el.getBoundingClientRect();
        showTip(el.dataset.q, r.left, r.bottom); e.preventDefault();
      });
    });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  // ============================================================
  //  minimal 3-D: rotation matrices + an orthographic camera
  // ============================================================
  const M = {
    I: () => [1,0,0, 0,1,0, 0,0,1],
    mul: (a, b) => {
      const o = new Array(9);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        o[r*3+c] = a[r*3]*b[c] + a[r*3+1]*b[3+c] + a[r*3+2]*b[6+c];
      return o;
    },
    rotX: t => [1,0,0, 0,Math.cos(t),-Math.sin(t), 0,Math.sin(t),Math.cos(t)],
    rotY: t => [Math.cos(t),0,Math.sin(t), 0,1,0, -Math.sin(t),0,Math.cos(t)],
    rotZ: t => [Math.cos(t),-Math.sin(t),0, Math.sin(t),Math.cos(t),0, 0,0,1],
    ap: (m, v) => ({
      x: m[0]*v.x + m[1]*v.y + m[2]*v.z,
      y: m[3]*v.x + m[4]*v.y + m[5]*v.z,
      z: m[6]*v.x + m[7]*v.y + m[8]*v.z }),
    T: m => [m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8]],
    // angle of the rotation taking A onto B — the honest "how different are these?" number
    angleBetween: (a, b) => {
      const d = M.mul(a, M.T(b));
      const tr = d[0] + d[4] + d[8];
      return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) * 180 / Math.PI;
    },
  };
  const VIEW = M.mul(M.rotX(-0.30), M.rotY(0.62));

  function mkProj(W, H, s) {
    return v => {
      const p = M.ap(VIEW, v);
      return [W / 2 + p.x * s, H / 2 - p.y * s];
    };
  }
  function line(ctx, P, a, b, col, w, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []);
    const A = P(a), B = P(b);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    ctx.setLineDash([]);
  }
  function arrow(ctx, P, from, to, col, w, label) {
    line(ctx, P, from, to, col, w);
    const A = P(from), B = P(to);
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), h = 8;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(B[0], B[1]);
    ctx.lineTo(B[0] - h * Math.cos(ang - .4), B[1] - h * Math.sin(ang - .4));
    ctx.lineTo(B[0] - h * Math.cos(ang + .4), B[1] - h * Math.sin(ang + .4));
    ctx.closePath(); ctx.fill();
    if (label) {
      ctx.font = "600 11px 'Space Grotesk',sans-serif";
      ctx.fillText(label, B[0] + 6, B[1] - 4);
    }
  }
  const V = (x, y, z) => ({ x, y, z });

  // a segment you can actually see twisting: shaft + crossbar + a flag
  function drawSegment(ctx, P, R, col) {
    const p = v => M.ap(R, v);
    const shaft = [V(0,0,0), V(0,1.15,0)];
    line(ctx, P, p(shaft[0]), p(shaft[1]), col, 7);
    line(ctx, P, p(V(-0.34,0.72,0)), p(V(0.34,0.72,0)), col, 4);
    // the flag makes axial rotation visible — without it a bar looks identical when twisted
    ctx.fillStyle = "rgba(255,180,60,.85)";
    const f = [p(V(0,1.15,0)), p(V(0.42,1.02,0)), p(V(0.42,0.80,0)), p(V(0,0.93,0))].map(P);
    ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1]);
    for (let i = 1; i < f.length; i++) ctx.lineTo(f[i][0], f[i][1]);
    ctx.closePath(); ctx.fill();
    const tip = P(p(V(0,1.15,0)));
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(tip[0], tip[1], 4.5, 0, 7); ctx.fill();
  }

  function drawTriad(ctx, P, R, len, labels, alpha) {
    const p = v => M.ap(R, v);
    const cols = ["#ff6f5e", "#5eead4", "#7c9bff"];
    const axes = [V(len,0,0), V(0,len,0), V(0,0,len)];
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    axes.forEach((a, i) => arrow(ctx, P, p(V(0,0,0)), p(a), cols[i], 2, labels ? labels[i] : null));
    ctx.globalAlpha = 1;
  }

  // ============================================================
  //  DEMO 1 — order matters
  // ============================================================
  function demoOrder() {
    const host = document.getElementById("isbOrder");
    if (!host) return;
    host.innerHTML =
      '<div class="isb-two">' +
        '<figure><canvas></canvas><figcaption><span class="isb-seq">Z → X</span><span></span></figcaption></figure>' +
        '<figure><canvas></canvas><figcaption><span class="isb-seq">X → Z</span><span></span></figcaption></figure>' +
      "</div>" +
      '<div class="isb-ctrl">' +
        '<label><span></span><b class="isb-val"></b></label>' +
        '<input type="range" min="0" max="90" step="1" value="45">' +
      "</div>" +
      '<p class="isb-verdict" id="isbVerdict"></p>';

    const figs = [...host.querySelectorAll("figure")];
    const slider = host.querySelector("input");
    const valEl = host.querySelector(".isb-val");
    const lbl = host.querySelector(".isb-ctrl label span");

    function paint() {
      const a = parseFloat(slider.value) * Math.PI / 180;
      const RA = M.mul(M.rotZ(a), M.rotX(a));      // Z first, then X (about the moved axis)
      const RB = M.mul(M.rotX(a), M.rotZ(a));      // X first, then Z
      [RA, RB].forEach((R, i) => {
        const cv = figs[i].querySelector("canvas");
        const r = cv.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = r.width * d; cv.height = r.height * d;
        const ctx = cv.getContext("2d");
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.clearRect(0, 0, r.width, r.height);
        const P = mkProj(r.width, r.height, Math.min(r.width, r.height) * 0.30);
        drawTriad(ctx, P, M.I(), 1.35, ["X", "Y", "Z"], .22);
        drawSegment(ctx, P, R, "#e8edf7");
        drawTriad(ctx, P, R, 0.85, null, .75);
      });
      const diff = M.angleBetween(RA, RB);
      valEl.textContent = Math.round(parseFloat(slider.value)) + "°";
      const v = document.getElementById("isbVerdict");
      if (v) {
        v.innerHTML = isPL()
          ? "Ta sama para obrotów, dwie kolejności. Orientacje końcowe różnią się o <b>" +
            diff.toFixed(1) + "°</b>."
          : "The same pair of rotations, two orders. The final orientations differ by <b>" +
            diff.toFixed(1) + "°</b>.";
        v.classList.toggle("isb-zero", diff < 0.5);
      }
      lbl.textContent = isPL() ? "Wielkość każdego obrotu" : "Size of each rotation";
      figs.forEach((f, i) => {
        f.querySelector("figcaption span:last-child").textContent = isPL()
          ? (i ? "najpierw wokół X, potem wokół Z" : "najpierw wokół Z, potem wokół X")
          : (i ? "about X first, then Z" : "about Z first, then X");
      });
    }
    slider.addEventListener("input", paint);
    window.addEventListener("resize", paint);
    document.addEventListener("i18n:changed", paint);
    paint();
    return paint;
  }

  // ============================================================
  //  DEMO 2 — three conventions, one vertebra
  // ============================================================
  const CONVENTIONS = [
    { id: "isb", name: { en: "ISB (Wu et al.)", pl: "ISB (Wu i wsp.)" },
      axes: { X: { en: "anterior", pl: "do przodu" }, Y: { en: "cephalad", pl: "do góry (dogłowowo)" }, Z: { en: "to the right", pl: "w prawo" } },
      dirs: { X: V(1,0,0), Y: V(0,1,0), Z: V(0,0,1) } },
    { id: "wp", name: { en: "White & Panjabi 1978", pl: "White i Panjabi 1978" },
      axes: { X: { en: "to the left", pl: "w lewo" }, Y: { en: "cephalad", pl: "do góry (dogłowowo)" }, Z: { en: "anterior", pl: "do przodu" } },
      dirs: { X: V(0,0,-1), Y: V(0,1,0), Z: V(1,0,0) } },
    { id: "srs", name: { en: "ISO 2631 / SAE J-211 / Scoliosis Research Society", pl: "ISO 2631 / SAE J-211 / Scoliosis Research Society" },
      axes: { X: { en: "anterior", pl: "do przodu" }, Y: { en: "to the left", pl: "w lewo" }, Z: { en: "cephalad", pl: "do góry (dogłowowo)" } },
      dirs: { X: V(1,0,0), Y: V(0,0,-1), Z: V(0,1,0) } },
  ];
  let convIdx = 0;

  function demoConventions() {
    const host = document.getElementById("isbConv");
    if (!host) return;
    host.innerHTML =
      '<div class="isb-conv-tabs"></div>' +
      '<div class="isb-conv-body"><canvas></canvas><ul class="isb-conv-list"></ul></div>';
    const tabs = host.querySelector(".isb-conv-tabs");
    const cv = host.querySelector("canvas");
    const list = host.querySelector(".isb-conv-list");

    function paint() {
      const lang = L();
      tabs.innerHTML = "";
      CONVENTIONS.forEach((c, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "isb-conv-tab" + (i === convIdx ? " on" : "");
        b.textContent = c.name[lang];
        b.addEventListener("click", () => { convIdx = i; paint(); });
        tabs.appendChild(b);
      });
      const c = CONVENTIONS[convIdx];
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = r.width * d; cv.height = r.height * d;
      const ctx = cv.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      const s = Math.min(r.width, r.height) * 0.28;
      const P = mkProj(r.width, r.height, s);

      // a schematic vertebra: body + pedicles + spinous process, so "anterior" reads
      ctx.strokeStyle = "rgba(232,237,247,.5)"; ctx.lineWidth = 2;
      const body = [];
      for (let k = 0; k < 12; k++) {
        const t = k / 12 * Math.PI * 2;
        body.push(V(Math.cos(t) * .42 + .16, 0, Math.sin(t) * .34));
      }
      ctx.beginPath();
      body.forEach((v, k) => { const p = P(v); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.closePath(); ctx.stroke();
      line(ctx, P, V(-.28,0,.22), V(-.62,0,.40), "rgba(232,237,247,.5)", 2);
      line(ctx, P, V(-.28,0,-.22), V(-.62,0,-.40), "rgba(232,237,247,.5)", 2);
      line(ctx, P, V(-.62,0,.40), V(-.95,0,0), "rgba(232,237,247,.5)", 2);
      line(ctx, P, V(-.62,0,-.40), V(-.95,0,0), "rgba(232,237,247,.5)", 2);

      const cols = { X: "#ff6f5e", Y: "#5eead4", Z: "#7c9bff" };
      ["X", "Y", "Z"].forEach(k => {
        const dir = c.dirs[k];
        arrow(ctx, P, V(0,0,0), V(dir.x * 1.15, dir.y * 1.15, dir.z * 1.15), cols[k], 2.6, k);
      });

      list.innerHTML = ["X", "Y", "Z"].map(k =>
        '<li><i style="background:' + cols[k] + '"></i><b>' + k + "</b> → " + c.axes[k][lang] + "</li>").join("");
    }
    window.addEventListener("resize", paint);
    document.addEventListener("i18n:changed", paint);
    paint();
    return paint;
  }

  // ============================================================
  //  DEMO 3 — the JCS explorer
  // ============================================================
  const JOINTS = [
    { id: "hip", part: "I",
      n: { en: "Hip", pl: "Staw biodrowy" },
      prox: { en: "Pelvis (XYZ)", pl: "Miednica (XYZ)" },
      dist: { en: "Femur (xyz)", pl: "Kość udowa (xyz)" },
      marks: "ASIS · PSIS · FE",
      origin: { en: "the right (or left) hip centre of rotation", pl: "prawy (lub lewy) środek obrotu stawu biodrowego" },
      e1: { ax: { en: "pelvis Z", pl: "Z miednicy" }, r: { en: "flexion / extension", pl: "zgięcie / wyprost" } },
      e2: { ax: { en: "floating", pl: "pływająca" }, r: { en: "adduction / abduction", pl: "przywodzenie / odwodzenie" } },
      e3: { ax: { en: "femur y", pl: "y kości udowej" }, r: { en: "internal / external rotation", pl: "rotacja wewnętrzna / zewnętrzna" } },
      note: { en: "The hip centre is not palpable, so it has to be estimated. The paper recommends the functional approach over prediction equations.",
              pl: "Środka stawu biodrowego nie da się wybadać palpacyjnie, więc trzeba go oszacować. Praca zaleca podejście czynnościowe zamiast równań predykcyjnych." },
      q: "hipcentre" },

    { id: "ankle", part: "I",
      n: { en: "Ankle complex", pl: "Kompleks stawu skokowego" },
      prox: { en: "Tibia / fibula (XYZ)", pl: "Piszczel / strzałka (XYZ)" },
      dist: { en: "Calcaneus (xyz)", pl: "Kość piętowa (xyz)" },
      marks: "MM · LM · MC · LC · TT · IM · IC",
      origin: { en: "IM, the inter-malleolar point midway between MM and LM", pl: "IM, punkt międzykostkowy w połowie odległości między MM a LM" },
      e1: { ax: { en: "tibia/fibula Z", pl: "Z piszczeli / strzałki" }, r: { en: "dorsiflexion (+) / plantarflexion (−)", pl: "zgięcie grzbietowe (+) / podeszwowe (−)" } },
      e2: { ax: { en: "floating", pl: "pływająca" }, r: { en: "inversion (+) / eversion (−)", pl: "inwersja (+) / ewersja (−)" } },
      e3: { ax: { en: "calcaneus y", pl: "y kości piętowej" }, r: { en: "internal (+) / external (−) rotation", pl: "rotacja wewnętrzna (+) / zewnętrzna (−)" } },
      note: { en: "This is deliberately the whole ankle complex — talocrural plus subtalar — because external landmarks cannot separate the two.",
              pl: "To celowo cały kompleks skokowy — staw skokowo-goleniowy wraz ze skokowo-piętowym — ponieważ zewnętrzne punkty kostne nie pozwalają ich rozdzielić." } },

    { id: "spine", part: "I",
      n: { en: "Intervertebral", pl: "Międzykręgowy" },
      prox: { en: "Proximal vertebra (XYZ)", pl: "Kręg bliższy (XYZ)" },
      dist: { en: "Distal vertebra (xyz)", pl: "Kręg dalszy (xyz)" },
      marks: { en: "endplate centres · pedicle bases", pl: "środki blaszek granicznych · podstawy nasad łuków" },
      origin: { en: "the intersection of the axes Y and y in the neutral position", pl: "przecięcie osi Y i y w pozycji neutralnej" },
      e1: { ax: { en: "proximal vertebra Z", pl: "Z kręgu bliższego" }, r: { en: "flexion / extension", pl: "zgięcie / wyprost" } },
      e2: { ax: { en: "floating", pl: "pływająca" }, r: { en: "lateral bending", pl: "zgięcie boczne" } },
      e3: { ax: { en: "distal vertebra y", pl: "y kręgu dalszego" }, r: { en: "axial rotation", pl: "rotacja osiowa" } },
      note: { en: "The spine is where competing conventions were worst — the paper explicitly lists three different ones still in use.",
              pl: "Kręgosłup to obszar, w którym konkurencyjne konwencje były najbardziej rozbieżne — praca wprost wymienia trzy różne, wciąż stosowane." },
      q: "othercon" },

    { id: "gh", part: "II",
      n: { en: "Glenohumeral", pl: "Ramienno-łopatkowy" },
      prox: { en: "Scapula (XₛYₛZₛ)", pl: "Łopatka (XₛYₛZₛ)" },
      dist: { en: "Humerus (XₕYₕZₕ)", pl: "Kość ramienna (XₕYₕZₕ)" },
      marks: "TS · AI · AA · PC · GH · EL · EM",
      origin: { en: "GH, the glenohumeral rotation centre, estimated by regression or motion recordings", pl: "GH, środek obrotu stawu ramienno-łopatkowego, szacowany regresją lub z zapisu ruchu" },
      e1: { ax: { en: "scapula Yₛ", pl: "Yₛ łopatki" }, r: { en: "plane of elevation", pl: "płaszczyzna elewacji" } },
      e2: { ax: { en: "humerus Xₕ", pl: "Xₕ kości ramiennej" }, r: { en: "elevation (negative)", pl: "elewacja (ujemna)" } },
      e3: { ax: { en: "humerus Yₕ", pl: "Yₕ kości ramiennej" }, r: { en: "axial rotation: internal (+) / external (−)", pl: "rotacja osiowa: wewnętrzna (+) / zewnętrzna (−)" } },
      order: "Y–X–Y",
      note: { en: "The only joint in the standard built on a true Euler sequence (Y–X–Y), so the Grood and Suntay floating-axis equations do not apply here.",
              pl: "Jedyny staw w standardzie oparty na prawdziwej sekwencji Eulera (Y–X–Y), więc równania osi pływającej Grooda i Suntaya tutaj nie obowiązują." },
      q: "gheuler" },

    { id: "elbow", part: "II",
      n: { en: "Elbow (forearm on humerus)", pl: "Łokieć (przedramię względem ramienia)" },
      prox: { en: "Humerus (XₕYₕZₕ)", pl: "Kość ramienna (XₕYₕZₕ)" },
      dist: { en: "Forearm (XꜱYꜱZꜱ)", pl: "Przedramię (XꜱYꜱZꜱ)" },
      marks: "EL · EM · RS · US",
      origin: { en: "US, the most caudal–medial point on the ulnar styloid", pl: "US, najbardziej doogonowo-przyśrodkowy punkt wyrostka rylcowatego kości łokciowej" },
      e1: { ax: { en: "humerus Zₕ", pl: "Zₕ kości ramiennej" }, r: { en: "flexion (+) / hyperextension (−)", pl: "zgięcie (+) / przeprost (−)" } },
      e2: { ax: { en: "floating", pl: "pływająca" }, r: { en: "carrying angle", pl: "kąt odwiedzenia przedramienia (carrying angle)" } },
      e3: { ax: { en: "forearm Yꜱ", pl: "Yꜱ przedramienia" }, r: { en: "pronation (+) / supination (−)", pl: "pronacja (+) / supinacja (−)" } },
      order: "Z–X–Y",
      note: { en: "The carrying angle here is a passive consequence of elbow flexion rather than something you can drive, so it is rarely reported.",
              pl: "Kąt odwiedzenia przedramienia jest tu biernym następstwem zgięcia łokcia, a nie ruchem, który da się wykonać dowolnie, dlatego rzadko się go raportuje." } },

    { id: "thorax", part: "II",
      n: { en: "Thorax on global", pl: "Klatka piersiowa względem układu globalnego" },
      prox: { en: "Global (X_gY_gZ_g)", pl: "Układ globalny (X_gY_gZ_g)" },
      dist: { en: "Thorax (XₜYₜZₜ)", pl: "Klatka piersiowa (XₜYₜZₜ)" },
      marks: "IJ · PX · C7 · T8",
      origin: { en: "IJ, the deepest point of Incisura Jugularis (suprasternal notch)", pl: "IJ, najgłębszy punkt wcięcia szyjnego mostka" },
      e1: { ax: { en: "global Z_g", pl: "Z_g układu globalnego" }, r: { en: "flexion (−) / extension (+)", pl: "zgięcie (−) / wyprost (+)" } },
      e2: { ax: { en: "rotated Xₜ", pl: "obrócona Xₜ" }, r: { en: "lateral flexion: right (+) / left (−)", pl: "zgięcie boczne: w prawo (+) / w lewo (−)" } },
      e3: { ax: { en: "thorax Yₜ", pl: "Yₜ klatki piersiowej" }, r: { en: "axial rotation: left (+) / right (−)", pl: "rotacja osiowa: w lewo (+) / w prawo (−)" } },
      order: "Z–X–Y" },
  ];
  let jointIdx = 0, jointPhase = 0;

  function demoJoints() {
    const host = document.getElementById("isbJoints");
    if (!host) return;
    host.innerHTML =
      '<div class="isb-jtabs"></div>' +
      '<div class="isb-jbody">' +
        '<div class="isb-jstage"><canvas></canvas><span class="isb-jnow"></span></div>' +
        '<div class="isb-jinfo"></div>' +
      "</div>";
    const tabs = host.querySelector(".isb-jtabs");
    const cv = host.querySelector("canvas");
    const info = host.querySelector(".isb-jinfo");
    const now = host.querySelector(".isb-jnow");

    function buildTabs() {
      const lang = L();
      tabs.innerHTML = "";
      JOINTS.forEach((j, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "isb-jtab" + (i === jointIdx ? " on" : "");
        b.innerHTML = j.n[lang] + '<span class="isb-part">' + j.part + "</span>";
        b.addEventListener("click", () => { jointIdx = i; jointPhase = 0; buildTabs(); buildInfo(); });
        tabs.appendChild(b);
      });
    }
    function buildInfo() {
      const j = JOINTS[jointIdx], lang = L();
      const row = (k, e, col) =>
        '<tr><td><span class="isb-ax" style="color:' + col + '">' + k + "</span></td>" +
        "<td>" + e.ax[lang] + "</td><td>" + e.r[lang] + "</td></tr>";
      const marks = typeof j.marks === "string" ? j.marks : j.marks[lang];
      info.innerHTML =
        '<div class="isb-jseg"><b>' + (isPL() ? "Bliższy" : "Proximal") + ":</b> " + j.prox[lang] +
        "<br><b>" + (isPL() ? "Dalszy" : "Distal") + ":</b> " + j.dist[lang] + "</div>" +
        '<div class="isb-jorigin"><b>' + (isPL() ? "Początek układu" : "Origin") + ":</b> " + j.origin[lang] + "</div>" +
        '<div class="isb-jmarks"><b>' + (isPL() ? "Punkty kostne" : "Landmarks") +
          ':</b> <code data-abbr="on">' + marks + "</code></div>" +
        "<table class=\"isb-jtable\"><thead><tr><th></th><th>" + (isPL() ? "oś" : "axis") + "</th><th>" +
          (isPL() ? "ruch" : "motion") + "</th></tr></thead><tbody>" +
        row("e1", j.e1, "#ff6f5e") + row("e2", j.e2, "#5eead4") + row("e3", j.e3, "#7c9bff") +
        "</tbody></table>" +
        (j.order ? '<div class="isb-jorder">' + (isPL() ? "kolejność obrotów" : "rotation order") +
                   ": <code>" + j.order + "</code></div>" : "") +
        (j.note ? '<p class="isb-jnote"' + (j.q ? ' data-q="' + j.q + '"' : "") + ">" + j.note[lang] + "</p>" : "");
      wireQuotes(info);
    }
    function paint(dt) {
      const j = JOINTS[jointIdx];
      if (!reduce && dt) jointPhase = (jointPhase + dt * 0.16) % 3;
      const seg = Math.floor(jointPhase);            // which axis is moving
      const local = jointPhase - seg;
      const amp = Math.sin(local * Math.PI) * 0.55;

      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = r.width * d; cv.height = r.height * d;
      const ctx = cv.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      const P = mkProj(r.width, r.height, Math.min(r.width, r.height) * 0.26);

      // proximal segment sits still, pointing down; distal rotates on the chosen axis
      const prox = M.mul(M.rotZ(Math.PI), M.I());
      ctx.globalAlpha = .55;
      drawSegment(ctx, P, prox, "#93a1bd");
      ctx.globalAlpha = 1;
      drawTriad(ctx, P, M.I(), 1.3, ["X", "Y", "Z"], .30);

      const R = seg === 0 ? M.rotZ(amp) : seg === 1 ? M.rotX(amp) : M.rotY(amp);
      drawSegment(ctx, P, R, "#e8edf7");

      const cols = ["#ff6f5e", "#5eead4", "#7c9bff"];
      const dirs = [V(0,0,1.25), V(1.25,0,0), V(0,1.25,0)];
      dirs.forEach((v, i) => {
        ctx.globalAlpha = i === seg ? 1 : .28;
        arrow(ctx, P, V(0,0,0), v, cols[i], i === seg ? 3 : 1.8, "e" + (i + 1));
      });
      ctx.globalAlpha = 1;

      const e = [j.e1, j.e2, j.e3][seg];
      now.innerHTML = '<i style="background:' + cols[seg] + '"></i>e' + (seg + 1) + " · " + e.r[L()];
    }
    buildTabs(); buildInfo();
    document.addEventListener("i18n:changed", () => { buildTabs(); buildInfo(); paint(0); });
    window.addEventListener("resize", () => paint(0));
    return paint;
  }

  // ============================================================
  //  boot
  // ============================================================
  function boot() {
    wireQuotes(document);
    // Switching language re-writes the translated blocks with innerHTML, which throws away
    // the listeners on every quote span inside them. Re-wire after each switch or the
    // tooltips silently keep showing whatever language was loaded first.
    document.addEventListener("i18n:changed", () => { hideTip(); wireQuotes(document); });

    const repaintOrder = demoOrder();
    const repaintConv = demoConventions();
    const paintJoints = demoJoints();

    let last = null;
    function frame(ts) {
      if (last == null) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
      if (paintJoints) paintJoints(dt);
      requestAnimationFrame(frame);
    }
    if (paintJoints) { paintJoints(0); if (!reduce) requestAnimationFrame(frame); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
