// Spine Under Load — relative lumbar-disc pressure across postures (classic Nachemson values,
// standing = 100%, as reproduced in Nordin & Frankel and Neumann; Wilke 1999 refined some).
// Illustrative teaching model — not a measurement. A clickable bar chart doubles as the posture
// selector; a side-profile figure poses to match with the disc coloured by pressure.

const POSTURES = [
  { id: "supine", name: "Lying down (supine)", pct: 25, lying: true,
    J: { head: [.16, .50], shoulder: [.30, .51], hip: [.55, .53], knee: [.74, .53], ankle: [.90, .53], hand: [.42, .56], disc: [.55, .53] } },
  { id: "side", name: "Side-lying", pct: 75, lying: true,
    J: { head: [.18, .47], shoulder: [.32, .52], hip: [.56, .57], knee: [.74, .49], ankle: [.88, .55], hand: [.46, .60], disc: [.56, .57] } },
  { id: "stand", name: "Standing upright", pct: 100,
    J: { head: [.50, .16], shoulder: [.50, .30], hip: [.50, .56], knee: [.50, .76], ankle: [.50, .90], hand: [.53, .52], disc: [.50, .52] } },
  { id: "walk", name: "Walking", pct: 105, backLeg: [[.42, .75], [.37, .90]],
    J: { head: [.50, .16], shoulder: [.50, .30], hip: [.50, .56], knee: [.58, .75], ankle: [.63, .90], hand: [.55, .50], disc: [.50, .52] } },
  { id: "sit", name: "Sitting, relaxed", pct: 140, chair: true,
    J: { head: [.45, .20], shoulder: [.44, .34], hip: [.42, .60], knee: [.68, .60], ankle: [.68, .86], hand: [.56, .55], disc: [.44, .56] } },
  { id: "bend", name: "Standing, bent forward", pct: 150,
    J: { head: [.69, .31], shoulder: [.62, .40], hip: [.44, .56], knee: [.44, .76], ankle: [.44, .90], hand: [.70, .62], disc: [.47, .52] } },
  { id: "liftGood", name: "Lift 20 kg — hip hinge, neutral back", pct: 185, load: 20,
    J: { head: [.62, .33], shoulder: [.56, .42], hip: [.40, .60], knee: [.55, .73], ankle: [.50, .90], hand: [.58, .70], disc: [.43, .55] } },
  { id: "liftBad", name: "Lift 20 kg — stooped, rounded back", pct: 220, load: 20, curved: true,
    J: { head: [.76, .42], shoulder: [.68, .48], hip: [.46, .56], knee: [.46, .76], ankle: [.46, .90], hand: [.73, .74], disc: [.49, .53] } },
];
const MAXPCT = 250;
const PL_NAMES = {
  supine: "Leżenie na plecach", side: "Leżenie na boku", stand: "Stanie wyprostowane", walk: "Chód",
  sit: "Siedzenie rozluźnione", bend: "Stanie, pochylenie do przodu",
  liftGood: "Podnoszenie 20 kg — zawias biodrowy, neutralne plecy", liftBad: "Podnoszenie 20 kg — zgięcie, zaokrąglone plecy",
};
const pname = p => (window.i18n && window.i18n.lang === "pl") ? PL_NAMES[p.id] : p.name;

function pctColor(pct) {
  const t = Math.max(0, Math.min(1, (pct - 25) / 195));
  const lerp = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
  const c = t < 0.5 ? lerp([94, 234, 212], [255, 180, 60], t / 0.5) : lerp([255, 180, 60], [255, 111, 94], (t - 0.5) / 0.5);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

let sel = 2; // standing
const canvas = document.getElementById("spineCanvas");
const barsEl = document.getElementById("bars");

function buildBars() {
  barsEl.innerHTML = "";
  POSTURES.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "spine-bar-row" + (i === sel ? " active" : "");
    row.innerHTML =
      `<div class="spine-bar-label">${pname(p)}</div>` +
      `<div class="spine-bar-track"><div class="spine-bar-fill" style="width:${p.pct / MAXPCT * 100}%;background:${pctColor(p.pct)}"></div></div>` +
      `<div class="spine-bar-val">${p.pct}%</div>`;
    row.addEventListener("click", () => { sel = i; render(); });
    barsEl.appendChild(row);
  });
}

function render() {
  const p = POSTURES[sel];
  document.querySelectorAll(".spine-bar-row").forEach((r, i) => r.classList.toggle("active", i === sel));
  document.getElementById("pctVal").textContent = p.pct;
  document.getElementById("pctVal").style.color = pctColor(p.pct);
  document.getElementById("mpaVal").textContent = "≈ " + (p.pct / 100 * 0.5).toFixed(2) + " MPa";
  document.getElementById("postName").textContent = pname(p);
  drawFigure(p);
}

function drawFigure(p) {
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
  // trunk (curved for round-back)
  if (p.curved) {
    ctx.beginPath(); ctx.moveTo(J.hip[0], J.hip[1]);
    ctx.quadraticCurveTo(J.hip[0] + 34, (J.hip[1] + J.shoulder[1]) / 2, J.shoulder[0], J.shoulder[1]); ctx.stroke();
  } else seg(J.hip, J.shoulder);
  // neck + arm
  seg(J.shoulder, J.head); seg(J.shoulder, J.hand);
  // head
  ctx.fillStyle = "#e8edf7"; ctx.beginPath(); ctx.arc(J.head[0], J.head[1], 0.045 * H, 0, 7); ctx.fill();
  // joints
  [J.hip, J.knee, J.ankle, J.shoulder].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); });

  // the lumbar disc — glowing by pressure
  const col = pctColor(p.pct);
  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = 6 + p.pct / 12;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(J.disc[0], J.disc[1], 9, 5, p.lying ? Math.PI / 2 : 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = col; ctx.font = "600 10px 'Space Grotesk',sans-serif";
  ctx.fillText("L3", J.disc[0] + 12, J.disc[1] + 3);
}

window.addEventListener("resize", () => drawFigure(POSTURES[sel]));
document.addEventListener("i18n:changed", () => { buildBars(); render(); });
buildBars();
render();
