// Spine Under Load: lumbar disc pressure across postures, from BOTH classic in-vivo studies.
//
// Two data sets, deliberately shown side by side because they disagree:
//
//   Nachemson (Acta Orthop Scand 35:314-328, 1965 and the widely reproduced summary figure)
//     Relative load, standing = 100%. n = 8 PATIENTS admitted for low back pain or sciatica;
//     standing was measured in only 2 of them; forward leaning was limited to 20 degrees because
//     the needle could not bend further. This is the figure in most textbooks.
//
//   Wilke et al. (Spine 24(8):755-762, 1999)
//     Absolute nucleus pressure in MPa at L4/5, telemetered over ~24 h. n = 1 (a 45-year-old,
//     70 kg male volunteer with a non-degenerated disc). Wilke's own conclusion: "the intradiscal
//     pressure during sitting may in fact be LESS than that in erect standing", the opposite of
//     the classic teaching point.
//
// Both are tiny samples. The robust lesson is the RANKING of gross mechanical effects
// (lying < upright < flexed < flexed with a load), not the precise percentages.

const STAND_MPA = 0.50;            // Wilke's relaxed standing reference
const COLOR_SPAN = 400;            // % of standing mapped across the colour ramp

// n = Nachemson, % of standing (null = he did not measure this condition)
// w = Wilke, MPa (null = not measured)
const POSTURES = [
  { id: "supine", name: "Lying supine", n: 25, w: 0.10, lying: true,
    J: { head: [.16, .50], shoulder: [.30, .51], hip: [.55, .53], knee: [.74, .53], ankle: [.90, .53], hand: [.42, .56], disc: [.55, .53] } },
  { id: "side", name: "Side-lying", n: 75, w: 0.12, lying: true,
    J: { head: [.18, .47], shoulder: [.32, .52], hip: [.56, .57], knee: [.74, .49], ankle: [.88, .55], hand: [.46, .60], disc: [.56, .57] } },
  { id: "sitSlouch", name: "Sitting slouched, relaxed", n: null, w: 0.30, chair: true,
    J: { head: [.53, .27], shoulder: [.48, .38], hip: [.42, .60], knee: [.68, .60], ankle: [.68, .86], hand: [.58, .58], disc: [.44, .56] } },
  { id: "sit", name: "Sitting upright, unsupported", n: 140, w: 0.46, chair: true,
    J: { head: [.45, .20], shoulder: [.44, .34], hip: [.42, .60], knee: [.68, .60], ankle: [.68, .86], hand: [.56, .55], disc: [.44, .56] } },
  { id: "stand", name: "Standing upright", n: 100, w: 0.50,
    J: { head: [.50, .16], shoulder: [.50, .30], hip: [.50, .56], knee: [.50, .76], ankle: [.50, .90], hand: [.53, .52], disc: [.50, .52] } },
  { id: "walk", name: "Walking", n: null, w: 0.60, backLeg: [[.42, .75], [.37, .90]],
    J: { head: [.50, .16], shoulder: [.50, .30], hip: [.50, .56], knee: [.58, .75], ankle: [.63, .90], hand: [.55, .50], disc: [.50, .52] } },
  { id: "bend", name: "Standing, bent forward", n: 150, w: 1.10,
    J: { head: [.69, .31], shoulder: [.62, .40], hip: [.44, .56], knee: [.44, .76], ankle: [.44, .90], hand: [.70, .62], disc: [.47, .52] } },
  { id: "liftGood", name: "Lifting 20 kg, knees bent, back straight", n: null, w: 1.70, load: 20,
    J: { head: [.62, .33], shoulder: [.56, .42], hip: [.40, .60], knee: [.55, .73], ankle: [.50, .90], hand: [.58, .70], disc: [.43, .55] } },
  { id: "liftBad", name: "Lifting 20 kg, round back, knees straight", n: 220, w: 2.30, load: 20, curved: true,
    J: { head: [.76, .42], shoulder: [.68, .48], hip: [.46, .56], knee: [.46, .76], ankle: [.46, .90], hand: [.73, .74], disc: [.49, .53] } },
];

const PL_NAMES = {
  supine: "Leżenie na plecach",
  side: "Leżenie na boku",
  sitSlouch: "Siedzenie zgarbione, rozluźnione",
  sit: "Siedzenie wyprostowane, bez podparcia",
  stand: "Stanie wyprostowane",
  walk: "Chód",
  bend: "Stanie, pochylenie do przodu",
  liftGood: "Podnoszenie 20 kg, zgięte kolana, proste plecy",
  liftBad: "Podnoszenie 20 kg, zaokrąglone plecy, wyprostowane kolana",
};

const isPL = () => window.i18n && window.i18n.lang === "pl";
const pname = p => (isPL() ? PL_NAMES[p.id] : p.name);
const T = (en, pl) => (isPL() ? pl : en);

// ---- dataset selection -------------------------------------------------
let dataset = "wilke";   // "wilke" | "nachemson"
let sel = 4;             // standing

const DS = {
  nachemson: { max: 240, disc: "L3", cite: () => T("Nachemson 1965 · n = 8 patients", "Nachemson 1965 · n = 8 pacjentów") },
  wilke:     { max: 480, disc: "L4/5", cite: () => T("Wilke et al. 1999 · n = 1 volunteer", "Wilke i wsp. 1999 · n = 1 ochotnik") },
};

// % of standing in the active data set, or null when that study didn't measure the posture
function pctOf(p) {
  if (dataset === "nachemson") return p.n;
  return p.w == null ? null : Math.round(p.w / STAND_MPA * 100);
}

function pctColor(pct) {
  const t = Math.max(0, Math.min(1, pct / COLOR_SPAN));
  const lerp = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
  const c = t < 0.5 ? lerp([94, 234, 212], [255, 180, 60], t / 0.5) : lerp([255, 180, 60], [255, 111, 94], (t - 0.5) / 0.5);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const canvas = document.getElementById("spineCanvas");
const barsEl = document.getElementById("bars");
const tabsEl = document.getElementById("dsTabs");

function buildTabs() {
  tabsEl.innerHTML = "";
  [["wilke", T("Wilke 1999 · MPa", "Wilke 1999 · MPa")], ["nachemson", T("Nachemson 1965 · %", "Nachemson 1965 · %")]]
    .forEach(([id, label]) => {
      const b = document.createElement("button");
      b.className = "spine-ds" + (id === dataset ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => { dataset = id; buildTabs(); buildBars(); render(); });
      tabsEl.appendChild(b);
    });
}

function buildBars() {
  barsEl.innerHTML = "";
  const max = DS[dataset].max;
  POSTURES.forEach((p, i) => {
    const pct = pctOf(p);
    const row = document.createElement("div");
    row.className = "spine-bar-row" + (i === sel ? " active" : "") + (pct == null ? " unmeasured" : "");
    const val = pct == null ? "·"
      : (dataset === "wilke" ? p.w.toFixed(2) + " MPa" : pct + "%");
    // dashed marker at 100% (= this study's own standing value) so "above or below standing?"
    // stays readable even where the two bars differ by only a few per cent
    row.innerHTML =
      `<div class="spine-bar-label">${pname(p)}</div>` +
      `<div class="spine-bar-track">` +
        `<div class="spine-bar-fill" style="width:${pct == null ? 0 : pct / max * 100}%;background:${pctColor(pct || 0)}"></div>` +
        `<div class="spine-bar-ref" style="left:${100 / max * 100}%"></div>` +
      `</div>` +
      `<div class="spine-bar-val">${val}</div>`;
    row.addEventListener("click", () => { sel = i; render(); });
    barsEl.appendChild(row);
  });
}

function render() {
  const p = POSTURES[sel];
  const pct = pctOf(p);
  document.querySelectorAll(".spine-bar-row").forEach((r, i) => r.classList.toggle("active", i === sel));

  const big = document.getElementById("pctVal");
  const sub = document.getElementById("mpaVal");
  if (pct == null) {
    big.textContent = "·";
    big.style.color = "#647092";
    sub.textContent = T("not measured in this study", "nie mierzono w tym badaniu");
  } else {
    big.textContent = pct;
    big.style.color = pctColor(pct);
    sub.textContent = dataset === "wilke"
      ? "≈ " + p.w.toFixed(2) + " MPa"
      : T("relative load", "obciążenie względne");
  }
  document.getElementById("postName").textContent = pname(p);
  document.getElementById("dsCite").textContent = DS[dataset].cite();
  drawFigure(p, pct);
}

function drawFigure(p, pct) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 440, H = Math.round(W * 470 / 440);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const P = ([x, y]) => [x * W, y * H];
  const J = {}; for (const k in p.J) J[k] = P(p.J[k]);

  // ground / mat
  ctx.strokeStyle = "#22304a"; ctx.lineWidth = 2;
  const gy = p.lying ? 0.64 * H : 0.90 * H;
  ctx.beginPath(); ctx.moveTo(20, gy); ctx.lineTo(W - 20, gy); ctx.stroke();

  // chair
  if (p.chair) {
    ctx.fillStyle = "rgba(148,163,184,0.18)";
    ctx.fillRect(J.hip[0] - 10, J.hip[1] + 8, (J.knee[0] - J.hip[0]) + 24, 8);
    ctx.fillRect(J.knee[0] + 10, J.hip[1] + 8, 8, J.ankle[1] - J.hip[1]);
  }

  // load box
  if (p.load) {
    const s = 26; ctx.fillStyle = "rgba(255,111,94,0.18)"; ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 2;
    ctx.fillRect(J.hand[0] - s / 2, J.hand[1], s, s); ctx.strokeRect(J.hand[0] - s / 2, J.hand[1], s, s);
    ctx.fillStyle = "#ff8a7e"; ctx.font = "600 10px 'Space Grotesk',sans-serif";
    ctx.fillText(p.load + " kg", J.hand[0] - 12, J.hand[1] + s + 12);
  }

  ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 6;
  const seg = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  // legs
  seg(J.hip, J.knee); seg(J.knee, J.ankle);
  if (p.backLeg) { const bk = P(p.backLeg[0]), ba = P(p.backLeg[1]); ctx.strokeStyle = "rgba(232,237,247,0.4)"; seg(J.hip, bk); seg(bk, ba); ctx.strokeStyle = "#e8edf7"; }
  // trunk (curved for round-back / slouch)
  if (p.curved || p.id === "sitSlouch") {
    const bulge = p.id === "sitSlouch" ? 20 : 34;
    ctx.beginPath(); ctx.moveTo(J.hip[0], J.hip[1]);
    ctx.quadraticCurveTo(J.hip[0] + bulge, (J.hip[1] + J.shoulder[1]) / 2, J.shoulder[0], J.shoulder[1]); ctx.stroke();
  } else seg(J.hip, J.shoulder);
  // neck + arm
  seg(J.shoulder, J.head); seg(J.shoulder, J.hand);
  // head
  ctx.fillStyle = "#e8edf7"; ctx.beginPath(); ctx.arc(J.head[0], J.head[1], 0.045 * H, 0, 7); ctx.fill();
  // joints
  [J.hip, J.knee, J.ankle, J.shoulder].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); });

  // the lumbar disc, glowing by pressure
  const col = pct == null ? "#647092" : pctColor(pct);
  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = 6 + (pct || 0) / 20;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(J.disc[0], J.disc[1], 9, 5, p.lying ? Math.PI / 2 : 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = col; ctx.font = "600 10px 'Space Grotesk',sans-serif";
  ctx.fillText(DS[dataset].disc, J.disc[0] + 12, J.disc[1] + 3);
}

window.addEventListener("resize", () => render());
document.addEventListener("i18n:changed", () => { buildTabs(); buildBars(); render(); });
buildTabs();
buildBars();
render();
