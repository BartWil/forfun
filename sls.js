// Single-Leg Squat — an orbitable 3D skeleton doing a single-leg squat, driven entirely by SYNTHETIC
// idealised kinematics (NOT measured data). The stance leg is posed with 2-link IK from a planted
// foot; poor "control" adds medial knee valgus, contralateral pelvic drop, and trunk lean. Metric
// names mirror a real OpenCap SLS pipeline (medial knee displacement / FPPA, pelvic drop, trunk lean)
// but nothing here is a measurement or a diagnostic threshold.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------- synthetic model ----------------
const S = { dt: 0, valgus: 0, drop: 0, lean: 0, kneeFlex: 0 };
function compute(cyc, c) {
  const dt = Math.sin((cyc / 100) * Math.PI);   // 0 at top, 1 at the bottom of the squat
  S.dt = dt;
  S.kneeFlex = 60 * dt;
  S.valgus = 20 * c * dt;
  S.drop = 12 * c * dt;
  S.lean = 11 * c * dt;
}
function quality(v, lo, hi) {
  if (v < lo) return { label: "controlled", cls: "q-good", col: 0x5eead4 };
  if (v < hi) return { label: "moderate", cls: "q-mod", col: 0xffb43c };
  return { label: "marked", cls: "q-poor", col: 0xff6f5e };
}
const METRICS = [
  { name: "Knee valgus (medial knee shift)", key: "valgus", max: 20, lo: 7, hi: 14 },
  { name: "Pelvic drop (opposite hip)", key: "drop", max: 12, lo: 5, hi: 10 },
  { name: "Trunk lean", key: "lean", max: 11, lo: 5, hi: 10 },
  { name: "Squat depth (knee flexion)", key: "kneeFlex", max: 70, neutral: true },
];

// ---------------- DOM ----------------
const stage = document.getElementById("slsStage");
const metricsEl = document.getElementById("metrics");
const controlEl = document.getElementById("control");
const controlVal = document.getElementById("controlVal");
const speedEl = document.getElementById("speed");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");

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
function toHex(c) { return "#" + c.toString(16).padStart(6, "0"); }
function updateMetrics() {
  METRICS.forEach(m => {
    const v = S[m.key];
    document.getElementById(`val-${m.key}`).textContent = Math.round(v) + "°";
    const fill = document.getElementById(`fill-${m.key}`);
    fill.style.width = Math.min(100, (v / m.max) * 100) + "%";
    if (m.neutral) { fill.style.background = "#5eead4"; return; }
    const q = quality(v, m.lo, m.hi);
    fill.style.background = toHex(q.col);
    const qEl = document.getElementById(`q-${m.key}`);
    qEl.textContent = q.label; qEl.className = "metric-quality " + q.cls;
  });
}

// ---------------- three.js scene ----------------
const SEG = { hipHalf: 0.11, thigh: 0.42, shank: 0.42, trunk: 0.5, neck: 0.11, headR: 0.11,
  shoulderHalf: 0.18, arm: 0.5, foot: 0.17, ankleH: 0.08 };
const STAND_HIP_Y = SEG.thigh + SEG.shank + SEG.ankleH;
const FOOT_X = -0.05;              // planted stance foot (person's right leg), near midline
const DEG = Math.PI / 180;

let renderer, scene, camera, controls;
const bones = {}, joints = {};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const YAX = V(0, 1, 0);

function boneMat() { return new THREE.MeshStandardMaterial({ color: 0xdfe6f2, roughness: 0.55, metalness: 0.05 }); }

function initScene() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.insertBefore(renderer.domElement, stage.firstChild);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(0.15, 1.05, 2.9);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.75, 0); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 1.4; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.9;

  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x0a0e17, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5eead4, 0.6); rim.position.set(-3, 2, -2); scene.add(rim);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.PolarGridHelper(2.4, 8, 5, 64, 0x1a2740, 0x1a2740);
  grid.position.y = 0.001; scene.add(grid);

  // ideal vertical alignment reference over the stance foot
  const refMat = new THREE.LineDashedMaterial({ color: 0x647092, dashSize: 0.05, gapSize: 0.04 });
  const refGeo = new THREE.BufferGeometry().setFromPoints([V(FOOT_X, SEG.ankleH, 0), V(FOOT_X, STAND_HIP_Y, 0)]);
  const refLine = new THREE.Line(refGeo, refMat); refLine.computeLineDistances(); scene.add(refLine);

  // bones (unit cylinders, re-laid each frame) + joint spheres
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  const BONES = ["pelvis", "spineLo", "spineHi", "neck", "stFemur", "stTibia", "stFoot",
    "swFemur", "swShank", "shR", "shL", "armR", "armL"];
  BONES.forEach(id => {
    const r = (id === "pelvis" || id.startsWith("spine")) ? 0.03 : 0.022;
    const m = new THREE.Mesh(cyl, boneMat());
    m.scale.set(r, 1, r); m.castShadow = true; scene.add(m); bones[id] = m;
  });
  const sph = new THREE.SphereGeometry(1, 16, 12);
  ["stHip", "swHip", "stKnee", "stAnkle", "swKnee", "chest", "head", "shoR", "shoL"].forEach(id => {
    const rad = id === "stKnee" ? 0.05 : (id === "head" ? SEG.headR : 0.035);
    const m = new THREE.Mesh(sph, boneMat()); m.scale.setScalar(rad); m.castShadow = true;
    scene.add(m); joints[id] = m;
  });
}

// place a bone (unit cylinder) spanning a→b
const _mid = new THREE.Vector3(), _dir = new THREE.Vector3(), _q = new THREE.Quaternion();
function layBone(mesh, a, b) {
  _dir.subVectors(b, a); const len = _dir.length() || 1e-4;
  _mid.addVectors(a, b).multiplyScalar(0.5); mesh.position.copy(_mid);
  _q.setFromUnitVectors(YAX, _dir.normalize()); mesh.quaternion.copy(_q);
  mesh.scale.y = len;
}

// 2-link IK: knee between hip H and ankle A, bending toward +Z (anterior)
function ikKnee(H, A, l1, l2) {
  const v = new THREE.Vector3().subVectors(A, H); let d = v.length();
  d = Math.min(d, l1 + l2 - 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const vhat = v.clone().normalize();
  const M = H.clone().add(vhat.clone().multiplyScalar(a));
  // perpendicular pointing anterior (+Z), removed component along v
  let n = new THREE.Vector3(0, 0, 1).sub(vhat.clone().multiplyScalar(vhat.z));
  if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
  n.normalize();
  return M.add(n.multiplyScalar(hh));
}

function poseSkeleton() {
  const pelvisY = STAND_HIP_Y - 0.34 * S.dt;
  const pelvisC = V(0, pelvisY, 0);
  const dl = S.drop * DEG, cd = Math.cos(dl), sd = Math.sin(dl);
  // stance (right) hip rises, swing (left) hip drops
  const stHip = V(pelvisC.x - SEG.hipHalf * cd, pelvisC.y + SEG.hipHalf * sd, 0);
  const swHip = V(pelvisC.x + SEG.hipHalf * cd, pelvisC.y - SEG.hipHalf * sd, 0);
  const stAnkle = V(FOOT_X, SEG.ankleH, 0);
  let stKnee = ikKnee(stHip, stAnkle, SEG.thigh, SEG.shank);
  stKnee.x += S.valgus * 0.005;   // medial (toward centre, +X) knee drift = valgus
  const stFoot = V(FOOT_X + 0.02, 0, SEG.foot);

  // swing leg lifted (decorative, lifts a little more at the bottom)
  const swKnee = V(swHip.x + 0.04, swHip.y - 0.20 - 0.05 * S.dt, 0.16 + 0.05 * S.dt);
  const swFoot = V(swHip.x + 0.02, swHip.y - 0.12, -0.02);

  // trunk: lateral lean toward stance (-X) + slight forward lean
  const ll = S.lean * DEG, fwd = 0.12 * S.dt;
  const chest = V(pelvisC.x - SEG.trunk * Math.sin(ll), pelvisC.y + SEG.trunk * Math.cos(ll) * Math.cos(fwd),
    SEG.trunk * Math.sin(fwd));
  const up = chest.clone().sub(pelvisC).normalize();
  const neck = chest.clone().add(up.clone().multiplyScalar(SEG.neck));
  const head = neck.clone().add(up.clone().multiplyScalar(SEG.headR * 1.15));
  const shoR = chest.clone().add(V(-SEG.shoulderHalf, 0.02, 0));
  const shoL = chest.clone().add(V(SEG.shoulderHalf, 0.02, 0));
  const handR = shoR.clone().add(V(-SEG.arm * 0.45, -0.08, SEG.arm * 0.35));
  const handL = shoL.clone().add(V(SEG.arm * 0.45, -0.08, SEG.arm * 0.35));

  layBone(bones.pelvis, stHip, swHip);
  layBone(bones.spineLo, pelvisC, chest);
  layBone(bones.spineHi, chest, neck);
  layBone(bones.neck, neck, head);
  layBone(bones.stFemur, stHip, stKnee);
  layBone(bones.stTibia, stKnee, stAnkle);
  layBone(bones.stFoot, stAnkle, stFoot);
  layBone(bones.swFemur, swHip, swKnee);
  layBone(bones.swShank, swKnee, swFoot);
  layBone(bones.shR, chest, shoR);
  layBone(bones.shL, chest, shoL);
  layBone(bones.armR, shoR, handR);
  layBone(bones.armL, shoL, handL);

  joints.stHip.position.copy(stHip); joints.swHip.position.copy(swHip);
  joints.stKnee.position.copy(stKnee); joints.stAnkle.position.copy(stAnkle);
  joints.swKnee.position.copy(swKnee); joints.chest.position.copy(chest);
  joints.head.position.copy(head); joints.shoR.position.copy(shoR); joints.shoL.position.copy(shoL);

  // colour the stance knee by valgus severity
  const q = quality(S.valgus, 7, 14);
  joints.stKnee.material.color.setHex(q.col);
  bones.stFemur.material.color.setHex(q.col);
}

// ---------------- controls + loop ----------------
let cycle = 20, playing = true, lastTime = null;
function controlLabel(c) { return c < 0.25 ? "excellent" : c < 0.5 ? "good" : c < 0.75 ? "moderate" : "poor"; }
controlEl.addEventListener("input", () => { controlVal.textContent = controlLabel(parseFloat(controlEl.value)); });
document.querySelectorAll(".sls-preset").forEach(b =>
  b.addEventListener("click", () => { controlEl.value = b.dataset.control; controlVal.textContent = controlLabel(parseFloat(b.dataset.control)); }));
playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "⏸" : "▶"; lastTime = null; });
scrubber.addEventListener("input", () => { playing = false; playBtn.textContent = "▶"; cycle = scrubber.value / 1000 * 100; });
window.addEventListener("resize", () => {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
});

function animate(ts) {
  if (lastTime == null) lastTime = ts;
  const d = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
  if (playing) {
    cycle += d * 1000 * parseFloat(speedEl.value) / 22;
    cycle = ((cycle % 100) + 100) % 100;
    scrubber.value = Math.round(cycle / 100 * 1000);
  }
  compute(cycle, parseFloat(controlEl.value));
  poseSkeleton();
  updateMetrics();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

buildMetrics();
controlVal.textContent = controlLabel(parseFloat(controlEl.value));
initScene();
requestAnimationFrame(animate);
