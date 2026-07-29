// Single-Leg Squat — a FRONTAL-plane (front-on) view of knee control. Everything here is synthetic:
// idealised curves generate dynamic knee valgus, contralateral pelvic drop, and trunk lean so the
// pattern can be taught. It is NOT measured data. The metric names mirror what a real OpenCap SLS
// pipeline computes (medial knee displacement / FPPA, pelvic drop, trunk lean) but nothing here is a
// measurement or a diagnostic threshold.

const canvas = document.getElementById("slsCanvas");
const controlEl = document.getElementById("control");
const controlVal = document.getElementById("controlVal");
const speedEl = document.getElementById("speed");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const metricsEl = document.getElementById("metrics");

let cycle = 20, playing = true, lastTime = null;

// current synthetic state (filled each frame)
const S = { dt: 0, valgus: 0, drop: 0, lean: 0, kneeFlex: 0 };

function compute(cyc, c) {
  const dt = Math.sin((cyc / 100) * Math.PI);        // 0 at top, 1 at the bottom of the squat
  S.dt = dt;
  S.kneeFlex = 60 * dt;                               // squat depth (independent of control)
  S.valgus = 20 * c * dt;                             // knee caves in with depth × poor control
  S.drop = 12 * c * dt;                               // contralateral pelvic drop
  S.lean = 11 * c * dt;                               // trunk lateral lean
}

// ---- quality bands (ILLUSTRATIVE only) ----
function quality(v, lo, hi) {
  if (v < lo) return { label: "controlled", cls: "q-good", col: "#5eead4" };
  if (v < hi) return { label: "moderate", cls: "q-mod", col: "#ffb43c" };
  return { label: "marked", cls: "q-poor", col: "#ff6f5e" };
}
const METRICS = [
  { name: "Knee valgus (medial knee shift)", key: "valgus", max: 20, lo: 7, hi: 14 },
  { name: "Pelvic drop (opposite hip)", key: "drop", max: 12, lo: 5, hi: 10 },
  { name: "Trunk lean", key: "lean", max: 11, lo: 5, hi: 10 },
  { name: "Squat depth (knee flexion)", key: "kneeFlex", max: 70, neutral: true },
];

function buildMetrics() {
  metricsEl.innerHTML = "";
  METRICS.forEach(m => {
    const row = document.createElement("div"); row.className = "metric-row";
    row.innerHTML =
      `<div class="metric-main"><div class="metric-name">${m.name}</div>` +
      `<div class="metric-bar"><div class="metric-fill" id="fill-${m.key}"></div></div></div>` +
      `<div class="metric-val" id="val-${m.key}">0°</div>` +
      (m.neutral ? `<div style="width:66px"></div>` : `<div class="metric-quality" id="q-${m.key}">—</div>`);
    metricsEl.appendChild(row);
  });
}
function updateMetrics() {
  METRICS.forEach(m => {
    const v = S[m.key];
    document.getElementById(`val-${m.key}`).textContent = Math.round(v) + "°";
    const fill = document.getElementById(`fill-${m.key}`);
    fill.style.width = Math.min(100, (v / m.max) * 100) + "%";
    if (m.neutral) { fill.style.background = "#5eead4"; return; }
    const q = quality(v, m.lo, m.hi);
    fill.style.background = q.col;
    const qEl = document.getElementById(`q-${m.key}`);
    qEl.textContent = q.label; qEl.className = "metric-quality " + q.cls;
  });
}

// ---- frontal-plane figure ----
function draw() {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 440, H = Math.round(W * 470 / 440);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  const groundY = H - 30;
  const footX = W * 0.44;
  const legLen = H * 0.42, trunkLen = H * 0.24, pelvisW = W * 0.17, headR = H * 0.048;

  ctx.strokeStyle = "#22304a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(20, groundY); ctx.lineTo(W - 20, groundY); ctx.stroke();

  const stanceHip = { x: footX, y: groundY - legLen + legLen * 0.30 * S.dt };
  const ankle = { x: footX, y: groundY };
  const valgusPx = S.valgus * 2.4;                         // medial (toward centre) = +x
  const knee = { x: footX + valgusPx, y: (stanceHip.y + ankle.y) / 2 };
  const swingHip = { x: footX + pelvisW, y: stanceHip.y + S.drop * 1.9 };
  const pelvisMid = { x: (stanceHip.x + swingHip.x) / 2, y: (stanceHip.y + swingHip.y) / 2 };
  const leanPx = S.lean * 2.2;
  const shoulders = { x: pelvisMid.x - leanPx, y: pelvisMid.y - trunkLen };
  const tv = { x: shoulders.x - pelvisMid.x, y: shoulders.y - pelvisMid.y };
  const tl = Math.hypot(tv.x, tv.y) || 1;
  const head = { x: shoulders.x + tv.x / tl * headR * 1.4, y: shoulders.y + tv.y / tl * headR * 1.4 };

  // ideal vertical reference (hip → foot) — the knee should track this line
  ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(footX, groundY); ctx.lineTo(footX, stanceHip.y); ctx.stroke(); ctx.setLineDash([]);

  const qk = quality(S.valgus, 7, 14);

  // medial-shift arrow: from ideal knee position to actual knee
  if (valgusPx > 2) {
    ctx.strokeStyle = qk.col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(footX, knee.y); ctx.lineTo(knee.x - 6, knee.y); ctx.stroke();
    ctx.fillStyle = qk.col;
    ctx.beginPath(); ctx.moveTo(knee.x, knee.y); ctx.lineTo(knee.x - 7, knee.y - 4); ctx.lineTo(knee.x - 7, knee.y + 4); ctx.closePath(); ctx.fill();
  }

  // swing leg (lifted, faint)
  const swKnee = { x: swingHip.x - pelvisW * 0.30, y: swingHip.y + legLen * 0.22 };
  const swFoot = { x: swingHip.x + pelvisW * 0.08, y: swingHip.y + legLen * 0.04 };
  ctx.strokeStyle = "rgba(232,237,247,0.32)"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(swingHip.x, swingHip.y); ctx.lineTo(swKnee.x, swKnee.y); ctx.lineTo(swFoot.x, swFoot.y); ctx.stroke();

  // pelvis bar (tilts with drop)
  ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(stanceHip.x, stanceHip.y); ctx.lineTo(swingHip.x, swingHip.y); ctx.stroke();

  // stance leg (thigh + shank), knee coloured by valgus
  ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(stanceHip.x, stanceHip.y); ctx.lineTo(knee.x, knee.y); ctx.lineTo(ankle.x, ankle.y); ctx.stroke();
  // foot
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ankle.x - 12, groundY); ctx.lineTo(ankle.x + 14, groundY); ctx.stroke();

  // trunk + head
  ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(pelvisMid.x, pelvisMid.y); ctx.lineTo(shoulders.x, shoulders.y); ctx.stroke();
  ctx.fillStyle = "#e8edf7"; ctx.beginPath(); ctx.arc(head.x, head.y, headR, 0, Math.PI * 2); ctx.fill();

  // joints
  ctx.fillStyle = "#e8edf7";
  [stanceHip, swingHip, ankle, shoulders].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = qk.col; ctx.beginPath(); ctx.arc(knee.x, knee.y, 7, 0, Math.PI * 2); ctx.fill();

  // knee label
  if (S.valgus > 1) {
    ctx.fillStyle = qk.col; ctx.font = "600 12px 'Space Grotesk', sans-serif";
    ctx.fillText(Math.round(S.valgus) + "° valgus", knee.x + 12, knee.y + 4);
  }
}

// ---- controls ----
function controlLabel(c) {
  return c < 0.25 ? "excellent" : c < 0.5 ? "good" : c < 0.75 ? "moderate" : "poor";
}
controlEl.addEventListener("input", () => { controlVal.textContent = controlLabel(parseFloat(controlEl.value)); });
document.querySelectorAll(".sls-preset").forEach(b =>
  b.addEventListener("click", () => { controlEl.value = b.dataset.control; controlVal.textContent = controlLabel(parseFloat(b.dataset.control)); }));
playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "⏸" : "▶"; lastTime = null; });
scrubber.addEventListener("input", () => { playing = false; playBtn.textContent = "▶"; cycle = scrubber.value / 1000 * 100; });

function frame(ts) {
  if (lastTime == null) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
  if (playing) {
    cycle += dt * 1000 * parseFloat(speedEl.value) / 22;
    cycle = ((cycle % 100) + 100) % 100;
    scrubber.value = Math.round(cycle / 100 * 1000);
  }
  compute(cycle, parseFloat(controlEl.value));
  draw();
  updateMetrics();
  requestAnimationFrame(frame);
}

buildMetrics();
controlVal.textContent = controlLabel(parseFloat(controlEl.value));
requestAnimationFrame(frame);
