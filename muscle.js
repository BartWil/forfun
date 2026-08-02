// Muscle Levers: the elbow as a third-class lever. Static 2-D torque balance:
// the biceps (short lever arm d) must balance the weight (long lever arm L) about the elbow,
// so its force F = W·L/d. Self-contained: no shared data, just arithmetic + a canvas diagram.

const G = 9.81;
const els = {
  canvas: document.getElementById("leverCanvas"),
  load: document.getElementById("load"),
  insert: document.getElementById("insert"),
  forearm: document.getElementById("forearm"),
  loadVal: document.getElementById("loadVal"),
  insertVal: document.getElementById("insertVal"),
  forearmVal: document.getElementById("forearmVal"),
  rForce: document.getElementById("rForce"),
  rRatio: document.getElementById("rRatio"),
  rJoint: document.getElementById("rJoint"),
  heroUnit: document.querySelector(".lv-read-hero .lv-unit"),
};

function state() {
  const mass = parseFloat(els.load.value);     // kg
  const d = parseFloat(els.insert.value);       // cm, biceps insertion from elbow
  const L = parseFloat(els.forearm.value);      // cm, elbow to hand
  const W = mass * G;                            // N, weight
  const ratio = L / d;                           // mechanical disadvantage
  const F = W * ratio;                           // N, biceps force
  const R = F - W;                               // N, joint compression (net)
  return { mass, d, L, W, ratio, F, R };
}

function updateReadouts(s) {
  els.loadVal.textContent = s.mass.toFixed(1) + " kg";
  els.insertVal.textContent = s.d.toFixed(1) + " cm";
  els.forearmVal.textContent = Math.round(s.L) + " cm";
  els.rForce.textContent = Math.round(s.F) + " N";
  const _pl = window.i18n && window.i18n.lang === "pl";
  els.heroUnit.textContent = (_pl ? "siła bicepsa ≈ " : "biceps force ≈ ") + Math.round(s.F / G) + (_pl ? " kg ciągu" : " kg of pull");
  els.rRatio.textContent = s.ratio.toFixed(1) + "×";
  els.rJoint.textContent = Math.round(s.R) + " N";
}

function arrow(ctx, x, y, dy, color, width) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dy); ctx.stroke();
  const h = 8, dir = Math.sign(dy);
  ctx.beginPath();
  ctx.moveTo(x, y + dy);
  ctx.lineTo(x - h * 0.6, y + dy - dir * h);
  ctx.lineTo(x + h * 0.6, y + dy - dir * h);
  ctx.closePath(); ctx.fill();
}

function draw() {
  const s = state();
  const c = els.canvas;
  const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth || 560, H = Math.round(W * 400 / 560);
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.font = "12px Inter, sans-serif";

  const pxPerCm = (W - 150) / 44;
  const ex = 96, ey = H * 0.46;                 // elbow (pivot)
  const handX = ex + s.L * pxPerCm;
  const insX = ex + s.d * pxPerCm;
  const shoulder = { x: ex - 6, y: ey - Math.min(150, H * 0.4) };

  // upper arm (context)
  ctx.strokeStyle = "#39435c"; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(ex, ey); ctx.stroke();

  // forearm (the lever)
  ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(handX, ey); ctx.stroke();

  // biceps (agonist): thickness hints at force
  ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = Math.min(16, 4 + s.F / 60);
  ctx.beginPath(); ctx.moveTo(shoulder.x + 4, shoulder.y + 18); ctx.lineTo(insX, ey); ctx.stroke();
  ctx.fillStyle = "#ff6f5e"; ctx.font = "600 12px 'Space Grotesk', sans-serif";
  ctx.fillText("biceps", (shoulder.x + insX) / 2 - 30, (shoulder.y + ey) / 2);

  // moment-arm brackets under the forearm
  const by = ey + 34;
  ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 1.5; ctx.fillStyle = "#5eead4"; ctx.font = "11px Inter, sans-serif";
  bracket(ctx, ex, insX, by - 12, "d = " + s.d.toFixed(1) + " cm");
  ctx.strokeStyle = "#7c9bff"; ctx.fillStyle = "#7c9bff";
  bracket(ctx, ex, handX, by + 8, "L = " + Math.round(s.L) + " cm");

  // force arrows: lengths encode the ratio (muscle ≈ ratio × weight), both grow with load
  const muscleLen = Math.min(W_cap(H), s.W * 2.4);
  const weightLen = muscleLen * s.d / s.L;
  arrow(ctx, insX, ey - 14, -muscleLen, "#ff6f5e", 3);          // biceps pull (up)
  arrow(ctx, handX, ey + 14, weightLen, "#7c9bff", 3);          // weight (down)
  arrow(ctx, ex, ey + 14, Math.min(W_cap(H), s.R * 2.4) * 0.5 + 0.0001, "rgba(148,163,184,0.75)", 2.5); // joint

  // labels for arrows
  ctx.fillStyle = "#ff6f5e"; ctx.font = "600 12px 'Space Grotesk', sans-serif";
  ctx.fillText(Math.round(s.F) + " N", insX + 6, ey - 14 - muscleLen + 4);
  ctx.fillStyle = "#7c9bff";
  ctx.fillText(Math.round(s.W) + " N", handX + 6, ey + 14 + weightLen + 4);

  // dumbbell in the hand
  ctx.fillStyle = "#c7d0e0";
  ctx.beginPath(); ctx.arc(handX, ey, 9, 0, Math.PI * 2); ctx.fill();

  // pivot (elbow)
  ctx.fillStyle = "#0a0e17"; ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#93a1bd"; ctx.font = "11px Inter, sans-serif";
  ctx.fillText("elbow (pivot)", ex - 16, ey - 16);

  updateReadouts(s);
}

function W_cap(H) { return H * 0.34; }

function bracket(ctx, x1, x2, y, label) {
  ctx.beginPath();
  ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y - 5);
  ctx.stroke();
  ctx.fillText(label, (x1 + x2) / 2 - ctx.measureText(label).width / 2, y + 14);
}

[els.load, els.insert, els.forearm].forEach(el => el.addEventListener("input", draw));
window.addEventListener("resize", draw);
document.addEventListener("i18n:changed", draw);
draw();
