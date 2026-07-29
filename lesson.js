// Anatomy of a Step — a scroll-driven explorable. As each narrative step scrolls into the centre
// of the viewport, the sticky stick-figure and the mini force/knee chart ease to that moment of the
// gait cycle. Inline scrubbers and "jump to" buttons let the reader drive directly. Reuses the shared
// engine: MOVEMENTS/computeScales/liveState (data.js + runtime.js) and drawStickFigure (figure.js).

const movement = MOVEMENTS.walk;
const scales = computeScales(movement, movement.param.default);
const shift = movement.contralateralShift || 0;

// precompute the traces once (fixed default parameters)
const grfArr = [], kneeArr = [];
for (let i = 0; i <= 100; i++) {
  const st = liveState(movement, scales, i);
  grfArr.push(st.grf); kneeArr.push(st.kneeAngle);
}
const grfMax = Math.max(...grfArr) * 1.05;
const kneeMax = Math.max(...kneeArr) * 1.05;

const figCanvas = document.getElementById("lessonFigure");
const chart = document.getElementById("lessonChart");
const phaseLabel = document.getElementById("phaseLabel");
const phasePercent = document.getElementById("phasePercent");

let currentCycle = 2, targetCycle = 2;

function setTarget(v, snap) {
  targetCycle = Math.max(0, Math.min(100, v));
  if (snap) currentCycle = targetCycle;
}

// ---- scroll: active step drives the target ----
const steps = [...document.querySelectorAll(".step")];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      steps.forEach(s => s.classList.remove("active"));
      e.target.classList.add("active");
      setTarget(parseFloat(e.target.dataset.cycle));
    }
  });
}, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
steps.forEach(s => observer.observe(s));

// ---- inline handles ----
const introScrub = document.getElementById("introScrub");
const freeScrub = document.getElementById("freeScrub");
[introScrub, freeScrub].forEach(sc => sc && sc.addEventListener("input", () => setTarget(parseFloat(sc.value), true)));
document.querySelectorAll(".goto").forEach(b =>
  b.addEventListener("click", () => setTarget(parseFloat(b.dataset.goto))));

// ---- phase label ----
function phaseAt(t) {
  const p = (movement.phases || []).find(([a, b]) => t >= a && t < b);
  return p ? p[2] : (movement.phases ? movement.phases[movement.phases.length - 1][2] : "");
}

// ---- mini chart ----
function drawChart(cycle) {
  const dpr = window.devicePixelRatio || 1;
  const W = chart.clientWidth || 360, H = Math.round(W * 120 / 360);
  chart.width = W * dpr; chart.height = H * dpr;
  const ctx = chart.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const pad = 6, pw = W - 2 * pad, ph = H - 2 * pad;
  const X = i => pad + (i / 100) * pw;
  const yG = v => pad + ph - (v / grfMax) * ph;
  const yK = v => pad + ph - (Math.max(0, v) / kneeMax) * ph;

  // GRF filled area
  ctx.beginPath(); ctx.moveTo(X(0), pad + ph);
  grfArr.forEach((v, i) => ctx.lineTo(X(i), yG(v)));
  ctx.lineTo(X(100), pad + ph); ctx.closePath();
  ctx.fillStyle = "rgba(94,234,212,0.14)"; ctx.fill();
  ctx.beginPath(); grfArr.forEach((v, i) => i ? ctx.lineTo(X(i), yG(v)) : ctx.moveTo(X(i), yG(v)));
  ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 2; ctx.stroke();

  // knee line
  ctx.beginPath(); kneeArr.forEach((v, i) => i ? ctx.lineTo(X(i), yK(v)) : ctx.moveTo(X(i), yK(v)));
  ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 2; ctx.stroke();

  // playhead
  const px = X(cycle);
  ctx.strokeStyle = "rgba(232,237,247,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, pad + ph); ctx.stroke(); ctx.setLineDash([]);
  const gi = Math.round(cycle);
  ctx.fillStyle = "#5eead4"; ctx.beginPath(); ctx.arc(px, yG(grfArr[gi]), 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ff6f5e"; ctx.beginPath(); ctx.arc(px, yK(kneeArr[gi]), 3.5, 0, Math.PI * 2); ctx.fill();
}

function frame() {
  currentCycle += (targetCycle - currentCycle) * 0.12;
  if (Math.abs(targetCycle - currentCycle) < 0.05) currentCycle = targetCycle;
  const st = liveState(movement, scales, currentCycle);
  const st2 = liveState(movement, scales, currentCycle + shift);
  drawStickFigure(figCanvas, st, st2);
  drawChart(currentCycle);
  phaseLabel.textContent = phaseAt(currentCycle);
  phasePercent.textContent = Math.round(currentCycle) + "%";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
