// The Anatomy — a 3D articulated figure driven by the SAME data as every other page
// (MOVEMENTS/computeScales/liveState/muscleActivationAt from data.js + runtime.js, loaded as
// classic scripts before this module). Bones and muscles are stylised procedural volumes for now;
// the scene graph is arranged so a real anatomical mesh can be swapped in later without touching
// the data wiring.
//
// Coordinate frame: Y up, +X = anterior (the way the figure faces / walks), +Z = toward the
// figure's left. Sagittal flexion/extension = rotation about Z. The two legs are separated along Z.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DEG = Math.PI / 180;

// Segment lengths in scene units (~metres), matching the 2D figure's proportions.
const L = { foot: 0.17, shank: 0.42, thigh: 0.45, trunk: 0.56, headR: 0.12, arm: 0.30, forearm: 0.26, pelvisHalf: 0.11, shoulderHalf: 0.19 };
const STAND_HIP_Y = L.thigh + L.shank;

const MUSCLE_LIST = ["Gluteus Maximus", "Quadriceps", "Hamstrings", "Gastroc / Soleus", "Tibialis Anterior", "Erector Spinae"];

// ---- activation → colour ramp (cool/quiet → gold → hot/working) ----
const COOL = new THREE.Color(0x33465f);
const GOLD = new THREE.Color(0xffb43c);
const HOT = new THREE.Color(0xff3c28);
const _c = new THREE.Color();
function activationColor(a) {
  a = Math.max(0, Math.min(1, a));
  if (a < 0.5) _c.copy(COOL).lerp(GOLD, a / 0.5);
  else _c.copy(GOLD).lerp(HOT, (a - 0.5) / 0.5);
  return _c;
}

// ================= scene =================
const stageWrap = document.getElementById("stageWrap");
const webglStatus = document.getElementById("webglStatus");

let renderer, scene, camera, controls;
let root;                 // whole body, repositioned vertically by hipDrop
const legRigs = {};       // { left: rig, right: rig }
const armRigs = [];       // [{ group, side }]
let trunkGroup, erectorMuscle, grfArrow;

function makeBoneMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xe9edf4, roughness: 0.6, metalness: 0.05 });
}
function makeMuscleMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x33465f, roughness: 0.45, metalness: 0.0, emissive: 0x33465f, emissiveIntensity: 0.25 });
}

// A tapered bone along -Y of given length.
function makeBone(len, rTop, rBot) {
  const geo = new THREE.CylinderGeometry(rBot, rTop, len, 16);
  geo.translate(0, -len / 2, 0); // origin at proximal (top) end, extends down
  const m = new THREE.Mesh(geo, makeBoneMaterial());
  m.castShadow = true;
  return m;
}

// A muscle belly (capsule) placed along a segment. axisLen along -Y, offset front/back via X.
function makeMuscle(len, radius) {
  const geo = new THREE.CapsuleGeometry(radius, len, 6, 12);
  const m = new THREE.Mesh(geo, makeMuscleMaterial());
  return m;
}

function buildLeg(side) {
  // side: +1 = figure's left (+Z), -1 = right (-Z)
  const rig = {};
  const hipGroup = new THREE.Group();
  hipGroup.position.set(0, 0, side * L.pelvisHalf);

  // femur
  hipGroup.add(makeBone(L.thigh, 0.045, 0.035));

  // thigh muscles
  const quad = makeMuscle(L.thigh * 0.5, 0.055);
  quad.position.set(0.055, -L.thigh * 0.5, 0);
  hipGroup.add(quad);
  const ham = makeMuscle(L.thigh * 0.5, 0.05);
  ham.position.set(-0.055, -L.thigh * 0.48, 0);
  hipGroup.add(ham);
  const glute = makeMuscle(L.thigh * 0.22, 0.07);
  glute.position.set(-0.05, -L.thigh * 0.12, 0);
  hipGroup.add(glute);

  // knee
  const kneeGroup = new THREE.Group();
  kneeGroup.position.set(0, -L.thigh, 0);
  kneeGroup.add(makeBone(L.shank, 0.035, 0.022));

  const gastroc = makeMuscle(L.shank * 0.4, 0.048);
  gastroc.position.set(-0.045, -L.shank * 0.38, 0);
  kneeGroup.add(gastroc);
  const tibant = makeMuscle(L.shank * 0.4, 0.032);
  tibant.position.set(0.04, -L.shank * 0.36, 0);
  kneeGroup.add(tibant);

  // ankle + foot (foot points +X, anterior)
  const ankleGroup = new THREE.Group();
  ankleGroup.position.set(0, -L.shank, 0);
  const footGeo = new THREE.BoxGeometry(L.foot, 0.05, 0.09);
  footGeo.translate(L.foot * 0.35, -0.025, 0);
  const foot = new THREE.Mesh(footGeo, makeBoneMaterial());
  ankleGroup.add(foot);

  kneeGroup.add(ankleGroup);
  hipGroup.add(kneeGroup);

  rig.hipGroup = hipGroup;
  rig.kneeGroup = kneeGroup;
  rig.ankleGroup = ankleGroup;
  rig.muscles = {
    "Quadriceps": quad, "Hamstrings": ham, "Gluteus Maximus": glute,
    "Gastroc / Soleus": gastroc, "Tibialis Anterior": tibant,
  };
  return rig;
}

function buildFigure() {
  root = new THREE.Group();

  // pelvis
  const pelvisGeo = new THREE.BoxGeometry(0.18, 0.14, L.pelvisHalf * 2 + 0.06);
  const pelvis = new THREE.Mesh(pelvisGeo, makeBoneMaterial());
  root.add(pelvis);

  // trunk (points +Y up)
  trunkGroup = new THREE.Group();
  const spineGeo = new THREE.CylinderGeometry(0.05, 0.075, L.trunk, 14);
  spineGeo.translate(0, L.trunk / 2, 0);
  trunkGroup.add(new THREE.Mesh(spineGeo, makeBoneMaterial()));

  // erector spinae (down the back of the trunk)
  erectorMuscle = makeMuscle(L.trunk * 0.5, 0.05);
  erectorMuscle.position.set(-0.05, L.trunk * 0.42, 0);
  trunkGroup.add(erectorMuscle);

  // shoulders + head
  const shoulderGeo = new THREE.BoxGeometry(0.12, 0.08, L.shoulderHalf * 2);
  shoulderGeo.translate(0, L.trunk, 0);
  trunkGroup.add(new THREE.Mesh(shoulderGeo, makeBoneMaterial()));

  const head = new THREE.Mesh(new THREE.SphereGeometry(L.headR, 20, 16), makeBoneMaterial());
  head.position.set(0.02, L.trunk + L.headR + 0.06, 0);
  trunkGroup.add(head);

  // arms — swing is applied per frame (see applyArms)
  [1, -1].forEach(side => {
    const armGroup = new THREE.Group();
    armGroup.position.set(0, L.trunk, side * L.shoulderHalf);
    armGroup.add(makeBone(L.arm, 0.03, 0.025));
    const fore = new THREE.Group();
    fore.position.set(0, -L.arm, 0);
    fore.rotation.z = 0.28;        // fixed slight elbow flexion
    fore.add(makeBone(L.forearm, 0.025, 0.02));
    armGroup.add(fore);
    trunkGroup.add(armGroup);
    armRigs.push({ group: armGroup, side });
  });

  root.add(trunkGroup);

  legRigs.left = buildLeg(+1);
  legRigs.right = buildLeg(-1);
  root.add(legRigs.left.hipGroup);
  root.add(legRigs.right.hipGroup);

  // GRF arrow at the primary (right) foot
  grfArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.4, 0x5eead4, 0.09, 0.06);
  scene.add(grfArrow);

  scene.add(root);
}

function initScene() {
  const w = stageWrap.clientWidth, h = stageWrap.clientHeight;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stageWrap.insertBefore(renderer.domElement, stageWrap.firstChild);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(2.1, 1.15, 2.6);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.85, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.4;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.92;

  // lighting
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x0a0e17, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2.5, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 15;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5eead4, 0.7);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  // ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.PolarGridHelper(3.2, 8, 6, 64, 0x1a2740, 0x1a2740);
  grid.position.y = 0.001;
  scene.add(grid);

  buildFigure();
}

// ---- per-frame update ----
function applyState(st, st2) {
  root.position.y = STAND_HIP_Y - st.hipDrop;
  trunkGroup.rotation.z = -st.trunkLean * DEG;

  const legState = { right: st, left: st2 };
  for (const side of ["right", "left"]) {
    const rig = legRigs[side];
    const s = legState[side];
    rig.hipGroup.rotation.z = s.hipAngle * DEG;
    rig.kneeGroup.rotation.z = -s.kneeAngle * DEG;
    rig.ankleGroup.rotation.z = s.ankleAngle * DEG;
  }
}

// Arms swing anti-phase to the same-side leg during gait; for the bilateral moves
// they reach forward together as a counterbalance while the body lowers.
function applyArms(movementId, st, st2) {
  if (movementId === "walk" || movementId === "run") {
    const gain = movementId === "run" ? 0.5 : 0.42;
    for (const a of armRigs) {
      const s = a.side > 0 ? st2 : st;          // arm opposes the leg on its own side
      a.group.rotation.z = -gain * s.hipAngle * DEG;
    }
  } else {
    const fwd = Math.max(-0.5, Math.min(1.2, st.hipDrop * 2.4));
    for (const a of armRigs) a.group.rotation.z = fwd;
  }
}

// Keep the figure on the ground: shift the whole body vertically so the lowest foot
// rests on y=0. Grounded gaits are clamped every frame; ballistic moves (jump/land)
// plant only while in contact (GRF > 0) so the flight phase can still lift off.
const SOLE_CORNERS = [
  new THREE.Vector3(L.foot * 0.35 - L.foot / 2, -0.05,  0.045),
  new THREE.Vector3(L.foot * 0.35 + L.foot / 2, -0.05,  0.045),
  new THREE.Vector3(L.foot * 0.35 - L.foot / 2, -0.05, -0.045),
  new THREE.Vector3(L.foot * 0.35 + L.foot / 2, -0.05, -0.045),
];
const GROUNDED = { walk: true, run: true, squat: true, jump: false, land: false };
const _sv = new THREE.Vector3();
function footMinY(ankleGroup) {
  let m = Infinity;
  for (const c of SOLE_CORNERS) {
    _sv.copy(c).applyMatrix4(ankleGroup.matrixWorld);
    if (_sv.y < m) m = _sv.y;
  }
  return m;
}
function groundContact(movementId, st) {
  root.updateMatrixWorld(true);
  const minSole = Math.min(footMinY(legRigs.left.ankleGroup), footMinY(legRigs.right.ankleGroup));
  const correction = -minSole;                  // >0 lift out of ground, <0 drop to ground
  if (GROUNDED[movementId] || correction > 0 || st.grf > 0.1) {
    root.position.y += correction;
  }
}

function applyMuscles(movement, scales, tPercent, tPercent2) {
  const setColor = (mesh, a) => {
    mesh.material.color.copy(activationColor(a));
    mesh.material.emissive.copy(activationColor(a));
    mesh.material.emissiveIntensity = 0.2 + a * 1.1;
  };
  const legT = { right: tPercent, left: tPercent2 };
  for (const side of ["right", "left"]) {
    const rig = legRigs[side];
    for (const name of ["Quadriceps", "Hamstrings", "Gluteus Maximus", "Gastroc / Soleus", "Tibialis Anterior"]) {
      setColor(rig.muscles[name], muscleActivationAt(movement, scales, name, legT[side]));
    }
  }
  setColor(erectorMuscle, muscleActivationAt(movement, scales, "Erector Spinae", tPercent));
}

function updateGrfArrow(st, movement, scales, tPercent) {
  // anchor at the primary (right) foot, in world space
  const rig = legRigs.right;
  const footWorld = new THREE.Vector3();
  rig.ankleGroup.getWorldPosition(footWorld);
  footWorld.y = 0.02;
  grfArrow.position.copy(footWorld);
  const len = Math.max(0.001, st.grf * 0.34);
  grfArrow.setLength(len, Math.min(0.1, len * 0.28), Math.min(0.07, len * 0.18));
  grfArrow.visible = st.grf > 0.05;
}

// ================= 2D EMG heatmap (body-muscles UMD, window.BodyMuscles) =================
// Maps our six modelled muscles onto the library's anatomical region IDs and paints them from the
// SAME activation curves: right-side regions get the primary limb, left-side regions the
// contralateral (phase-shifted) limb — matching the 3D figure. Front view carries quads + tibialis;
// back view carries glutes, hamstrings, calves, and the erectors.
let mmFront = null, mmBack = null, mmLastF = "", mmLastB = "";
const MM_FRONT = { "Quadriceps": ["quads"], "Tibialis Anterior": ["tibialis-anterior"] };
const MM_BACK = {
  "Gluteus Maximus": ["gluteus-maximus"],
  "Hamstrings": ["hamstrings-medial", "hamstrings-lateral"],
  "Gastroc / Soleus": ["calves-gastroc-medial", "calves-gastroc-lateral", "calves-soleus"],
  "Erector Spinae": ["lower-back-erectors"],
};

function initMuscleMap() {
  const status = document.getElementById("mmStatus");
  const BM = window.BodyMuscles;
  if (!BM || !BM.BodyChart) { if (status) status.textContent = "unavailable"; return; }
  try {
    mmFront = new BM.BodyChart(document.getElementById("mmFront"), { view: BM.ViewSide.FRONT, bodyState: {} });
    mmBack = new BM.BodyChart(document.getElementById("mmBack"), { view: BM.ViewSide.BACK, bodyState: {} });
    if (status) status.textContent = "live";
  } catch (e) {
    console.error("muscle map init:", e);
    if (status) status.textContent = "error";
  }
}

const mmIntensity = (a) => Math.max(0, Math.min(10, Math.round(a * 10)));

function mmBuildState(map, movement, scales, tR, tL) {
  const state = {};
  for (const [name, bases] of Object.entries(map)) {
    const iR = mmIntensity(muscleActivationAt(movement, scales, name, tR));
    const iL = mmIntensity(muscleActivationAt(movement, scales, name, tL));
    for (const base of bases) {
      state[base + "-right"] = { intensity: iR, selected: iR > 0 };
      state[base + "-left"] = { intensity: iL, selected: iL > 0 };
    }
    if (name === "Erector Spinae") state["spine"] = { intensity: iR, selected: iR > 0 };
  }
  return state;
}

function updateMuscleMap(movement, scales, tR, tL) {
  if (!mmFront) return;
  const fs = mmBuildState(MM_FRONT, movement, scales, tR, tL);
  const bs = mmBuildState(MM_BACK, movement, scales, tR, tL);
  const fk = JSON.stringify(fs), bk = JSON.stringify(bs);
  if (fk !== mmLastF) { mmFront.update({ bodyState: fs }); mmLastF = fk; }
  if (bk !== mmLastB) { mmBack.update({ bodyState: bs }); mmLastB = bk; }
}

// ================= UI wiring =================
const phaseLabel = document.getElementById("phaseLabel");
const phasePercent = document.getElementById("phasePercent");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const playbackSpeed = document.getElementById("playbackSpeed");
const paramSlot = document.getElementById("paramSlot");
const movementTabsEl = document.getElementById("movementTabs");
const legendEl = document.getElementById("legend");

let currentMovementId = "walk";
let paramValue = MOVEMENTS[currentMovementId].param.default;
let scales = computeScales(MOVEMENTS[currentMovementId], paramValue);
let fraction = 0;
let playing = true;
let lastTime = null;

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
  const p = MOVEMENTS[currentMovementId].param;
  paramSlot.innerHTML = "";
  const label = document.createElement("label");
  const span = document.createElement("span"); span.textContent = p.label;
  const pv = document.createElement("span"); pv.className = "pv"; pv.textContent = p.display(paramValue);
  label.appendChild(span); label.appendChild(pv);
  const input = document.createElement("input");
  input.type = "range"; input.min = p.min; input.max = p.max; input.step = p.step; input.value = paramValue;
  input.addEventListener("input", () => {
    paramValue = parseFloat(input.value);
    pv.textContent = p.display(paramValue);
    scales = computeScales(MOVEMENTS[currentMovementId], paramValue);
  });
  paramSlot.appendChild(label); paramSlot.appendChild(input);
}

function buildLegend() {
  legendEl.innerHTML = "";
  const ramp = document.createElement("div");
  ramp.className = "lg-item";
  ramp.innerHTML = `<span class="lg-dot" style="background:linear-gradient(90deg,#33465f,#ffb43c,#ff3c28)"></span> Muscle glow = activation (quiet → working hard)`;
  legendEl.appendChild(ramp);
  const grf = document.createElement("div");
  grf.className = "lg-item";
  grf.innerHTML = `<span class="lg-dot" style="background:#5eead4"></span> Arrow = ground reaction force`;
  legendEl.appendChild(grf);
  MUSCLE_LIST.forEach(name => {
    const item = document.createElement("div");
    item.className = "lg-item";
    item.innerHTML = `<span class="lg-dot" style="background:#647092"></span> ${name}`;
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

function onResize() {
  const w = stageWrap.clientWidth, h = stageWrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);

function animate(timestamp) {
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
  const shift = movement.contralateralShift || 0;
  const tPercent2 = tPercent + shift;
  const st = liveState(movement, scales, tPercent);
  const st2 = liveState(movement, scales, tPercent2);

  updatePhaseLabel(tPercent);
  applyState(st, st2);
  applyArms(currentMovementId, st, st2);
  groundContact(currentMovementId, st);
  applyMuscles(movement, scales, tPercent, tPercent2);
  updateGrfArrow(st, movement, scales, tPercent);
  updateMuscleMap(movement, scales, tPercent, tPercent2);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

(function boot() {
  try {
    initScene();
    buildTabs();
    buildParamSlider();
    buildLegend();
    initMuscleMap();
    webglStatus.textContent = "three.js (WebGL): live";
    requestAnimationFrame(animate);
  } catch (err) {
    console.error("Anatomy boot error:", err);
    webglStatus.textContent = "WebGL error: " + err.message;
  }
})();
