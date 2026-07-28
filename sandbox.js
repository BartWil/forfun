// Gait Lab — introduce a deficit into normal walking and watch the compensation emerge.
// Reuses the shared engine: MOVEMENTS/computeScales/liveState (data.js + runtime.js) for the
// baseline walking kinematics, and computeSkeleton/SEG (figure.js) for geometry. Each condition
// is a transform on the per-frame joint-angle state, applied to the near (affected) leg only;
// the contralateral leg stays typical so the asymmetry reads clearly. The faint "ghost" is
// unmodified typical gait drawn behind, so the compensation is visible by contrast.
//
// Deficits + compensations follow the classic patterns described in Perry & Burnfield,
// Gait Analysis: Normal and Pathological Function (2nd ed.).

const movement = MOVEMENTS.walk;
let scales = computeScales(movement, movement.param.default);
const shift = movement.contralateralShift || 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const phaseOf = (st) => (st.grf > 0.06 ? "stance" : "swing");

// ---- conditions: transform(state, phase, severity) mutates & returns a cloned state ----
const CONDITIONS = {
  typical: {
    name: "Typical gait",
    primary: "Healthy walking, shown for reference — heel strike, a controlled knee-flexion wave at loading, a smooth ankle rocker through stance, and an active toe-off push.",
    comp: "None needed — every muscle group fires on time.",
    note: "",
    transform: (s) => s,
  },
  footdrop: {
    name: "Foot drop (weak dorsiflexors)",
    primary: "The ankle dorsiflexors (tibialis anterior & co.) are weak or denervated, so the foot can't lift: the toes hang down through swing and the forefoot slaps the floor at contact instead of a heel strike.",
    comp: "Steppage gait — the hip and knee flex much more than normal in swing to hoist the dropped foot up and clear the toes over the ground.",
    note: "",
    transform: (s, phase, sev) => {
      if (phase === "swing") { s.ankleAngle -= 26 * sev; s.hipAngle += 12 * sev; s.kneeAngle += 24 * sev; }
      else { s.ankleAngle -= 10 * sev; }
      return s;
    },
  },
  weakquads: {
    name: "Weak quadriceps",
    primary: "The quadriceps can't resist the knee-flexion moment during weight acceptance, so the normal shock-absorbing knee bend would buckle the limb.",
    comp: "The knee is thrown into full extension — even hyperextension ('back-kneeing') — while the trunk leans forward, so body weight falls ahead of the knee and locks it passively, no quad force required.",
    note: "Over years this repeated hyperextension can stretch the posterior knee structures (genu recurvatum).",
    transform: (s, phase, sev) => {
      if (phase === "stance") { s.kneeAngle = clamp(s.kneeAngle * (1 - sev) - 6 * sev, -9, 90); s.trunkLean += 11 * sev; }
      return s;
    },
  },
  stiffankle: {
    name: "Stiff / fused ankle",
    primary: "A stiff or fused ankle can't roll the tibia forward over the planted foot (stance dorsiflexion) or push off at the end of stance (plantarflexion).",
    comp: "Early heel-off with a shorter, flatter step, and 'vaulting' — rising onto the toes of the other leg — to carry the body past the locked ankle. The knee often hyperextends to help.",
    note: "",
    transform: (s, phase, sev) => {
      s.ankleAngle = s.ankleAngle * (1 - 0.85 * sev);
      if (phase === "stance") s.kneeAngle -= 5 * sev;
      return s;
    },
  },
  stiffknee: {
    name: "Stiff knee (won't flex in swing)",
    primary: "The knee stays extended in swing — from quadriceps over-activity or a fused joint — leaving the leg functionally too long to clear the floor.",
    comp: "The pelvis hikes and the body vaults, or the leg circumducts (swings out to the side), so the long, stiff limb passes through without catching the toe.",
    note: "Circumduction and pelvic drop are side-to-side motions — hard to show from this side-on view — so watch mainly the reduced knee bend and the hip hiking up in swing.",
    transform: (s, phase, sev) => {
      if (phase === "swing") { s.kneeAngle *= (1 - 0.8 * sev); s.hipDrop -= 3 * sev; }
      return s;
    },
  },
};
const ORDER = ["typical", "footdrop", "weakquads", "stiffankle", "stiffknee"];

// ---- custom drawer: ghost (typical) behind, deficit in front ----
function drawScene(canvas, def, def2, norm, norm2, showGhost) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  const groundY = H - 34;
  ctx.strokeStyle = "#22304a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, groundY); ctx.lineTo(W - 24, groundY); ctx.stroke();

  if (showGhost) {
    drawSkel(ctx, computeSkeleton(W, H, norm, norm2),
      { color: "rgba(148,163,184,0.30)", far: "rgba(148,163,184,0.20)", width: 5, joints: false, grf: 0 });
  }
  drawSkel(ctx, computeSkeleton(W, H, def, def2),
    { color: "#f4f7fc", far: "rgba(232,237,247,0.34)", width: 6, joints: true, grf: def.grf, groundY });
}

function drawSkel(ctx, skel, o) {
  const { hip, knee, ankle, footTip, shoulder, headCenter, hand, far, scale } = skel;

  if (far) {
    ctx.strokeStyle = o.far; ctx.lineWidth = o.width - 1;
    ctx.beginPath(); ctx.moveTo(far.hip.x, far.hip.y); ctx.lineTo(far.knee.x, far.knee.y);
    ctx.lineTo(far.ankle.x, far.ankle.y); ctx.lineTo(far.footTip.x, far.footTip.y); ctx.stroke();
  }

  if (o.grf > 0.03) {
    const len = o.grf * (SEG.shank + SEG.thigh) * 0.55 * scale;
    ctx.strokeStyle = "#5eead4"; ctx.fillStyle = "#5eead4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ankle.x, o.groundY); ctx.lineTo(ankle.x, o.groundY - len); ctx.stroke();
    const ah = 7;
    ctx.beginPath(); ctx.moveTo(ankle.x, o.groundY - len - ah);
    ctx.lineTo(ankle.x - ah * 0.6, o.groundY - len + 2); ctx.lineTo(ankle.x + ah * 0.6, o.groundY - len + 2);
    ctx.closePath(); ctx.fill();
  }

  ctx.strokeStyle = o.color; ctx.lineWidth = o.width;
  ctx.beginPath();
  ctx.moveTo(footTip.x, footTip.y); ctx.lineTo(ankle.x, ankle.y); ctx.lineTo(knee.x, knee.y);
  ctx.lineTo(hip.x, hip.y); ctx.lineTo(shoulder.x, shoulder.y); ctx.lineTo(hand.x, hand.y);
  ctx.stroke();

  ctx.fillStyle = o.color;
  ctx.beginPath(); ctx.arc(headCenter.x, headCenter.y, SEG.headR * scale, 0, Math.PI * 2); ctx.fill();

  if (o.joints) {
    ctx.fillStyle = o.color;
    [hip, knee, ankle, shoulder].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
  }
}

// ================= UI + loop =================
const canvas = document.getElementById("figureCanvas");
const tabsEl = document.getElementById("conditionTabs");
const ghostToggle = document.getElementById("ghostToggle");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const severity = document.getElementById("severity");
const sevVal = document.getElementById("sevVal");
const playbackSpeed = document.getElementById("playbackSpeed");

let condId = "footdrop", fraction = 0, playing = true, lastTime = null;

function buildTabs() {
  tabsEl.innerHTML = "";
  ORDER.forEach(id => {
    const b = document.createElement("button");
    b.className = "sbx-tab" + (id === condId ? " active" : "");
    b.textContent = CONDITIONS[id].name;
    b.addEventListener("click", () => { condId = id; buildTabs(); updateDiagnosis(); });
    tabsEl.appendChild(b);
  });
}

function updateDiagnosis() {
  const c = CONDITIONS[condId];
  document.getElementById("condName").textContent = c.name;
  document.getElementById("condPrimary").textContent = c.primary;
  document.getElementById("condComp").textContent = c.comp;
  document.getElementById("condNote").textContent = c.note || "";
  document.getElementById("condSource").textContent =
    condId === "typical" ? "" : "Pattern per Perry & Burnfield, Gait Analysis, 2nd ed.";
}

playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "⏸" : "▶"; lastTime = null; });
scrubber.addEventListener("input", () => { playing = false; playBtn.textContent = "▶"; fraction = scrubber.value / 1000; });
severity.addEventListener("input", () => { sevVal.textContent = Math.round(severity.value * 100) + "%"; });

function animate(ts) {
  if (lastTime == null) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
  if (playing) {
    fraction += (dt * 1000 * parseFloat(playbackSpeed.value)) / scales.cycleDuration;
    fraction = ((fraction % 1) + 1) % 1;
    scrubber.value = Math.round(fraction * 1000);
  }
  const t = fraction * 100;
  const st = liveState(movement, scales, t);
  const st2 = liveState(movement, scales, t + shift);
  const sev = parseFloat(severity.value);
  const cond = CONDITIONS[condId];
  const def = cond.transform({ ...st }, phaseOf(st), sev);
  drawScene(canvas, def, st2, st, st2, ghostToggle.checked);
  requestAnimationFrame(animate);
}

buildTabs();
updateDiagnosis();
requestAnimationFrame(animate);
