// The Forge — same MOVEMENTS data as the dashboard (data.js/runtime.js/figure.js, all loaded
// as classic scripts before this module), rendered as physics instead of charts:
//   - Ground reaction force -> a real particle spray, simulated by Rapier2D (a Rust physics
//     engine, compiled to WebAssembly, loaded here straight from a CDN with no build step).
//     Bigger force = particles launched faster = they really do fly further under real
//     gravity, drag, and a real ground collision.
//   - Muscle activation -> hand-animated glowing embers drifting off each muscle belly,
//     density/brightness tied to the real activation curve. These don't need rigid-body
//     collision so they stay a lightweight manual particle system.

const PPM = 60;           // pixels per physics "meter"
const GRAVITY = 16;       // m/s^2 (slightly exaggerated vs 9.81 for a snappier feel in ~1.5s)
const MUSCLE_COLORS = {
  "Gluteus Maximus": "#ff6f5e",
  "Quadriceps": "#ffb84f",
  "Hamstrings": "#c792ea",
  "Gastroc / Soleus": "#5eead4",
  "Tibialis Anterior": "#7c9bff",
  "Erector Spinae": "#f472b6",
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a), [br, bg, bb] = hexToRgb(b);
  return `rgb(${ar + (br - ar) * t}, ${ag + (bg - ag) * t}, ${ab + (bb - ab) * t})`;
}
function grfColor(grf) {
  const t = Math.max(0, Math.min(1, grf / 5));
  if (t < 0.5) return lerpColor("#5eead4", "#ffd15e", t / 0.5);
  return lerpColor("#ffd15e", "#ffffff", (t - 0.5) / 0.5);
}

// ---- Physics: try Rapier2D (Rust/WASM) for the GRF spray, degrade gracefully if the CDN fails ----
let RAPIER = null;
let world = null;
let groundCollider = null;
let useRapier = false;

async function initPhysics() {
  try {
    const mod = await import("https://esm.sh/@dimforge/rapier2d-compat@0.14.0");
    RAPIER = mod.default ?? mod;
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: GRAVITY });
    useRapier = true;
  } catch (err) {
    console.warn("Rapier2D failed to load from CDN, falling back to manual projectile motion.", err);
    useRapier = false;
  }
}

function setGroundCollider(canvasWpx, groundYpx) {
  if (!useRapier) return;
  if (groundCollider) world.removeCollider(groundCollider, true);
  const desc = RAPIER.ColliderDesc.cuboid(canvasWpx / PPM, 0.05)
    .setTranslation(canvasWpx / 2 / PPM, groundYpx / PPM)
    .setRestitution(0.35)
    .setFriction(0.7)
    .setCollisionGroups((0x0002 << 16) | 0x0001);
  groundCollider = world.createCollider(desc);
}

// ---- GRF particles ----
const forceParticles = [];
const MAX_FORCE_PARTICLES = 220;

function spawnForceParticles(xPx, groundYpx, grf) {
  // Fewer, clearer arrows: spawn at most ~3/frame so each dart reads individually
  // instead of merging into a glow cloud.
  const count = Math.min(3, Math.round(grf * 0.9));
  if (count <= 0) return;
  const color = grfColor(grf);
  for (let i = 0; i < count; i++) {
    const speed = 1.4 + grf * 1.4;
    const angle = (Math.random() - 0.5) * 0.5; // spray cone around straight-up
    const jitterSpeed = speed * (0.8 + Math.random() * 0.4);
    const vx = Math.sin(angle) * jitterSpeed;
    const vy = -Math.cos(angle) * jitterSpeed;
    // Shorter life so arrows fade near the apex rather than raining down and piling up.
    const life = 750 + Math.random() * 400;

    if (useRapier) {
      const rb = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(xPx / PPM, groundYpx / PPM)
          .setLinvel(vx, vy)
          .setLinearDamping(0.35)
      );
      world.createCollider(
        RAPIER.ColliderDesc.ball(0.045)
          .setRestitution(0.3)
          .setFriction(0.4)
          .setDensity(1)
          .setCollisionGroups((0x0001 << 16) | 0x0002),
        rb
      );
      forceParticles.push({ mode: "rapier", body: rb, born: performance.now(), life, color });
    } else {
      forceParticles.push({
        mode: "manual", x: xPx, y: groundYpx, vx: vx * PPM, vy: vy * PPM,
        born: performance.now(), life, color,
      });
    }
    if (forceParticles.length > MAX_FORCE_PARTICLES) {
      const old = forceParticles.shift();
      if (old.mode === "rapier") world.removeRigidBody(old.body);
    }
  }
}

function stepForceParticles(dt) {
  const now = performance.now();
  if (useRapier) {
    world.timestep = Math.min(dt, 0.033);
    world.step();
  }
  for (let i = forceParticles.length - 1; i >= 0; i--) {
    const p = forceParticles[i];
    if (p.mode === "manual") {
      p.vy += GRAVITY * PPM * dt;
      p.vx *= (1 - 0.5 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (now - p.born > p.life) {
      if (p.mode === "rapier") world.removeRigidBody(p.body);
      forceParticles.splice(i, 1);
    }
  }
}

// Each GRF particle is drawn as a tiny arrowhead pointing along its real velocity vector
// (so you literally see the force's direction), sitting on a soft additive glow.
function drawForceParticles(ctx) {
  const now = performance.now();
  for (const p of forceParticles) {
    let x, y, vx, vy;
    if (p.mode === "rapier") {
      const t = p.body.translation();
      const v = p.body.linvel();
      x = t.x * PPM; y = t.y * PPM; vx = v.x; vy = v.y;
    } else {
      x = p.x; y = p.y; vx = p.vx; vy = p.vy;
    }
    const age = (now - p.born) / p.life;
    const alpha = Math.max(0, 1 - age);
    const speed = Math.hypot(vx, vy);
    const rgba0 = p.color.replace("rgb", "rgba").replace(")", `, ${alpha})`);

    // small glow halo (kept subtle so the arrow shape reads on top)
    ctx.globalCompositeOperation = "lighter";
    const r = 1.4 + alpha * 1.2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    grad.addColorStop(0, rgba0);
    grad.addColorStop(1, p.color.replace("rgb", "rgba").replace(")", ", 0)"));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // arrowhead + short stem along the velocity vector — this is the force direction made visible.
    if (speed > 0.3) {
      const ang = Math.atan2(vy, vx);
      const len = 9 + alpha * 6;
      const wing = 4 + alpha * 2.5;
      const tipX = x + Math.cos(ang) * len, tipY = y + Math.sin(ang) * len;
      const tailX = x - Math.cos(ang) * len, tailY = y - Math.sin(ang) * len;
      // stem
      ctx.strokeStyle = rgba0;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      // head
      const backX = tipX - Math.cos(ang) * wing * 1.4, backY = tipY - Math.sin(ang) * wing * 1.4;
      const leftX = backX + Math.cos(ang + 2.5) * wing, leftY = backY + Math.sin(ang + 2.5) * wing;
      const rightX = backX + Math.cos(ang - 2.5) * wing, rightY = backY + Math.sin(ang - 2.5) * wing;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();
      ctx.fillStyle = rgba0;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// ---- Muscle embers (manual, no rigid body needed) ----
const embers = [];
const emberAccum = {};
const EMBER_RATE_MAX = 16; // embers/sec at activation = 1

function spawnEmbers(name, pos, activation, dt) {
  emberAccum[name] = (emberAccum[name] || 0) + activation * EMBER_RATE_MAX * dt;
  const color = MUSCLE_COLORS[name] || "#e8edf7";
  while (emberAccum[name] >= 1) {
    emberAccum[name] -= 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 14;
    embers.push({
      x: pos.x + (Math.random() - 0.5) * 10,
      y: pos.y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 14,
      born: performance.now(),
      life: 700 + Math.random() * 500,
      color,
    });
    if (embers.length > 260) embers.shift();
  }
}

function stepEmbers(dt) {
  const now = performance.now();
  const damp = Math.exp(-1.6 * dt);
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.vx *= damp; e.vy *= damp;
    e.vy -= 6 * dt; // gentle buoyancy
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (now - e.born > e.life) embers.splice(i, 1);
  }
}

function drawEmbers(ctx) {
  ctx.globalCompositeOperation = "lighter";
  const now = performance.now();
  for (const e of embers) {
    const alpha = Math.max(0, 1 - (now - e.born) / e.life);
    const r = 1.6 + alpha * 1.8;
    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
    const rgb = hexToRgb(e.color).join(",");
    grad.addColorStop(0, `rgba(${rgb}, ${alpha * 0.9})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ---- Dim guide skeleton (the "ground truth" the physics is layered on) ----
function drawGuideSkeleton(ctx, W, H, skel) {
  ctx.strokeStyle = "rgba(232,237,247,0.28)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  function seg(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  if (skel.far) {
    ctx.strokeStyle = "rgba(232,237,247,0.15)";
    seg(skel.far.hip, skel.far.knee);
    seg(skel.far.knee, skel.far.ankle);
    seg(skel.far.ankle, skel.far.footTip);
    ctx.strokeStyle = "rgba(232,237,247,0.28)";
  }
  seg(skel.ankle, skel.footTip);
  seg(skel.ankle, skel.knee);
  seg(skel.knee, skel.hip);
  seg(skel.hip, skel.shoulder);
  seg(skel.shoulder, skel.hand);
  ctx.fillStyle = "rgba(232,237,247,0.35)";
  ctx.beginPath();
  ctx.arc(skel.headCenter.x, skel.headCenter.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(34,48,74,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, skel.groundY);
  ctx.lineTo(W, skel.groundY);
  ctx.stroke();
}

// ==================== UI wiring ====================

const canvas = document.getElementById("labCanvas");
const phaseLabel = document.getElementById("phaseLabel");
const phasePercent = document.getElementById("phasePercent");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const playbackSpeed = document.getElementById("playbackSpeed");
const paramSlot = document.getElementById("paramSlot");
const movementTabsEl = document.getElementById("movementTabs");
const physicsStatusEl = document.getElementById("physicsStatus");
const legendEl = document.getElementById("legend");

let currentMovementId = "walk";
let paramValue = MOVEMENTS[currentMovementId].param.default;
let scales = computeScales(MOVEMENTS[currentMovementId], paramValue);
let fraction = 0;
let playing = true;
let lastTime = null;
let lastGroundY = null;

function buildTabs() {
  movementTabsEl.innerHTML = "";
  MOVEMENT_ORDER.forEach(id => {
    const btn = document.createElement("button");
    btn.className = "movement-tab" + (id === currentMovementId ? " active" : "");
    btn.textContent = MOVEMENTS[id].label;
    btn.addEventListener("click", () => switchMovement(id));
    movementTabsEl.appendChild(btn);
  });
}

function buildParamSlider() {
  const m = MOVEMENTS[currentMovementId];
  const p = m.param;
  paramSlot.innerHTML = "";
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = p.label;
  const pv = document.createElement("span");
  pv.className = "pv";
  pv.textContent = p.display(paramValue);
  label.appendChild(span); label.appendChild(pv);
  const input = document.createElement("input");
  input.type = "range";
  input.min = p.min; input.max = p.max; input.step = p.step; input.value = paramValue;
  input.addEventListener("input", () => {
    paramValue = parseFloat(input.value);
    pv.textContent = p.display(paramValue);
    scales = computeScales(m, paramValue);
  });
  paramSlot.appendChild(label);
  paramSlot.appendChild(input);
}

function buildLegend() {
  const m = MOVEMENTS[currentMovementId];
  legendEl.innerHTML = "";
  const grfItem = document.createElement("div");
  grfItem.className = "lg-item";
  grfItem.innerHTML = `<span class="lg-dot" style="background:#5eead4"></span> Particle spray = ground reaction force (teal → gold → white as it climbs)`;
  legendEl.appendChild(grfItem);
  m.muscles.forEach(mu => {
    const item = document.createElement("div");
    item.className = "lg-item";
    item.innerHTML = `<span class="lg-dot" style="background:${MUSCLE_COLORS[mu.name] || "#e8edf7"}"></span> ${mu.name}`;
    legendEl.appendChild(item);
  });
}

function switchMovement(id) {
  currentMovementId = id;
  paramValue = MOVEMENTS[id].param.default;
  scales = computeScales(MOVEMENTS[id], paramValue);
  fraction = 0;
  buildTabs();
  buildParamSlider();
  buildLegend();
}

playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "⏸" : "▶";
  lastTime = null;
});
scrubber.addEventListener("input", () => {
  playing = false;
  playBtn.textContent = "▶";
  fraction = scrubber.value / 1000;
});

function updatePhaseLabel(tPercent) {
  const phases = MOVEMENTS[currentMovementId].phases;
  const hit = phases.find(([a, b]) => tPercent >= a && tPercent < b) || phases[phases.length - 1];
  phaseLabel.textContent = hit[2];
  phasePercent.textContent = Math.round(tPercent) + "%";
}

// Cached once here and only refreshed on actual resize — calling setupCanvasDPR() (which
// resets canvas.width/height, clearing the bitmap) every frame would wipe out the
// trail-glow persistence the render loop relies on.
let cachedCtx = null, cachedW = 0, cachedH = 0;

function resizeCanvas() {
  const { ctx, w, h } = setupCanvasDPR(canvas);
  cachedCtx = ctx; cachedW = w; cachedH = h;
  if (lastGroundY === null || Math.abs(h - 34 - lastGroundY) > 1 || (useRapier && !groundCollider)) {
    lastGroundY = h - 34;
    setGroundCollider(w, lastGroundY);
  }
  return { w, h };
}
window.addEventListener("resize", resizeCanvas);

let frameErrorReported = false;
function frame(timestamp) {
  try {
    frameInner(timestamp);
  } catch (err) {
    if (!frameErrorReported) {
      frameErrorReported = true;
      console.error("Forge frame() error:", err);
      physicsStatusEl.textContent = "Render error: " + err.message;
    }
  }
  requestAnimationFrame(frame);
}

function frameInner(timestamp) {
  if (lastTime == null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  const movement = MOVEMENTS[currentMovementId];

  if (playing) {
    fraction += (dt * 1000 * parseFloat(playbackSpeed.value)) / scales.cycleDuration;
    fraction = ((fraction % 1) + 1) % 1;
    scrubber.value = Math.round(fraction * 1000);
  }

  const tPercent = fraction * 100;
  const st = liveState(movement, scales, tPercent);
  const shift = movement.contralateralShift || 0;
  const st2 = liveState(movement, scales, tPercent + shift);
  updatePhaseLabel(tPercent);

  const ctx = cachedCtx, W = cachedW, H = cachedH;
  const skel = computeSkeleton(W, H, st, st2);

  if (st.grf > 0.05) {
    spawnForceParticles(skel.ankle.x, skel.groundY, st.grf);
  }
  movement.muscles.forEach(mu => {
    const act = muscleActivationAt(movement, scales, mu.name, tPercent);
    const pos = skel.muscleBellies[mu.name];
    if (pos && act > 0.03) spawnEmbers(mu.name, pos, act, dt);
  });

  stepForceParticles(dt);
  stepEmbers(dt);

  // Trail-fade instead of a hard clear: creates the glowing motion-streak look.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(5,8,16,0.22)";
  ctx.fillRect(0, 0, W, H);

  drawGuideSkeleton(ctx, W, H, skel);
  drawForceParticles(ctx);
  drawEmbers(ctx);
}

(async function boot() {
  buildTabs();
  buildParamSlider();
  buildLegend();
  resizeCanvas();
  await initPhysics();
  resizeCanvas();
  physicsStatusEl.textContent = useRapier
    ? "Rapier2D (Rust → WASM) physics: live"
    : "Physics CDN unavailable — showing manual projectile motion instead";
  requestAnimationFrame(frame);
})();
