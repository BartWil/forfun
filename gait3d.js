// Real Gait — a realistically-proportioned rigged human (three.js "Xbot" mannequin) walking on
// REAL motion-capture joint angles. No baked clip: the hip / knee / ankle bones are driven directly
// from grand-average sagittal joint angles measured in the Fukuchi et al. 2018 open walking data set
// (42 adults, overground comfortable-speed walking; PeerJ 6:e4640, figshare 5722711). The angles are
// retargeted onto the mixamorig skeleton in real time.
//
// Rig frame (verified from the bind pose): +X = the body's left, +Y = up, +Z = anterior (forward).
// Every bone's rest rotation is identity, so sagittal flexion is a pure rotation about local X:
//   hip flexion  -> UpLeg.rotation.x = -angle     (leg forward = -X)
//   knee flexion -> Leg.rotation.x   = +angle     (shank back/up = +X)
//   ankle dorsi  -> Foot.rotation.x  = -angle     (toes up = -X)

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Xbot.glb";
const DEG = Math.PI / 180;

// ---- REAL walking joint angles (deg), 0..100 % of the gait cycle, 1% resolution ----
// Grand average over 42 subjects x both legs, Fukuchi et al. 2018 (overground, comfortable speed).
// Sagittal plane: hip/knee flexion positive; ankle dorsiflexion positive.
const GAIT = {
  hip: [30.7,30.7,30.6,30.4,30.1,29.9,29.7,29.5,29.4,29.1,28.7,28.0,27.2,26.2,25.1,24.0,22.9,21.8,20.8,19.7,18.7,17.7,16.6,15.6,14.5,13.4,12.3,11.1,10.0,8.9,7.9,6.8,5.9,4.9,4.0,3.1,2.3,1.4,0.6,-0.2,-1.0,-1.8,-2.5,-3.3,-4.1,-4.8,-5.4,-6.0,-6.6,-7.1,-7.6,-7.9,-8.3,-8.5,-8.6,-8.6,-8.4,-8.0,-7.4,-6.6,-5.5,-4.2,-2.7,-1.1,0.7,2.6,4.6,6.6,8.7,10.8,12.8,14.7,16.6,18.4,20.0,21.6,23.0,24.2,25.4,26.5,27.5,28.4,29.2,29.9,30.5,31.0,31.4,31.7,31.9,31.9,31.9,31.8,31.6,31.3,31.1,30.8,30.6,30.4,30.4,30.4,30.7],
  knee: [0.9,2.2,3.5,4.6,5.7,6.8,8.3,9.9,11.7,13.2,14.4,15.2,15.6,15.7,15.6,15.3,14.9,14.5,14.0,13.5,13.0,12.5,11.9,11.3,10.7,10.0,9.4,8.7,8.1,7.5,6.9,6.4,5.9,5.4,5.0,4.6,4.3,4.1,3.9,3.7,3.6,3.5,3.5,3.6,3.8,4.1,4.5,5.0,5.7,6.5,7.4,8.5,9.7,11.1,12.7,14.5,16.6,19.1,21.9,25.0,28.3,31.9,35.6,39.4,43.1,46.7,50.0,53.0,55.6,57.8,59.6,60.9,61.7,62.2,62.2,61.9,61.1,60.0,58.6,56.8,54.7,52.3,49.7,46.7,43.6,40.1,36.5,32.7,28.7,24.7,20.6,16.6,12.7,9.1,5.9,3.3,1.2,-0.1,-0.6,-0.4,0.9],
  ankle: [1.8,1.5,0.6,-0.9,-2.5,-3.9,-4.4,-4.3,-3.6,-2.6,-1.6,-0.5,0.5,1.3,2.2,2.9,3.6,4.2,4.7,5.3,5.7,6.2,6.6,6.9,7.2,7.6,7.8,8.1,8.4,8.7,9.0,9.4,9.7,10.0,10.3,10.7,11.0,11.4,11.7,12.1,12.4,12.7,13.0,13.2,13.3,13.4,13.5,13.4,13.3,13.0,12.6,12.0,11.3,10.3,9.1,7.6,5.7,3.4,0.9,-1.9,-4.7,-7.3,-9.4,-10.9,-11.7,-11.8,-11.3,-10.3,-9.0,-7.6,-6.1,-4.6,-3.1,-1.7,-0.3,0.9,2.1,3.1,4.0,4.9,5.5,6.1,6.5,6.8,7.0,7.0,6.8,6.6,6.1,5.6,4.9,4.2,3.5,2.9,2.3,1.9,1.7,1.6,1.6,1.8,1.8],
};
const PHASES = [
  [0, 10, "Loading response"], [10, 30, "Mid-stance"], [30, 50, "Terminal stance"],
  [50, 62, "Pre-swing (toe-off)"], [62, 75, "Initial swing"], [75, 87, "Mid-swing"],
  [87, 100, "Terminal swing"],
];
const CYCLE_MS = 1100;   // ~1.1 s per stride at comfortable speed

function sample(arr, t) {
  t = ((t % 100) + 100) % 100;
  const i = Math.floor(t), f = t - i;
  return arr[i] + (arr[i + 1] - arr[i]) * f;
}

// ================= scene =================
const stageWrap = document.getElementById("stageWrap");
const webglStatus = document.getElementById("webglStatus");
const phaseLabel = document.getElementById("phaseLabel");
const phasePercent = document.getElementById("phasePercent");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const playbackSpeed = document.getElementById("playbackSpeed");

let renderer, scene, camera, controls;
let model = null, skeleton = null;
const bones = {};
const B = n => bones["mixamorig" + n];
let ready = false, modelBaseY = 0;

let fraction = 0, playing = true, lastTime = null;

// foot-lock / overground progression state
let lockSide = null, lockX = 0, lockZ = 0;
const prevPos = new THREE.Vector3();
let followInit = false;
const WRAP = 8;   // teleport back every 8 m (multiple of the 1 m grid → seamless)

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
  camera.position.set(2.4, 1.15, 3.0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.92;

  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x0a0e17, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 4, 3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 15;
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7dd3fc, 0.7);
  rim.position.set(-3, 2, -2); scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(60, 60, 0x1a2740, 0x1a2740);
  grid.position.y = 0.001; scene.add(grid);
}

function onModelLoaded(gltf) {
  model = gltf.scene;
  model.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    if (o.isSkinnedMesh && !skeleton) skeleton = o.skeleton;
  });
  if (skeleton) for (const b of skeleton.bones) bones[b.name] = b;
  scene.add(model);
  modelBaseY = model.position.y;
  ready = true;
  webglStatus.textContent = "three.js (WebGL): live · real mocap data";
}

// ---- drive the skeleton from the real angles ----
const SIDE_FEET = {
  Right: ["RightFoot", "RightToeBase", "RightToe_End"],
  Left: ["LeftFoot", "LeftToeBase", "LeftToe_End"],
};
const _fp = new THREE.Vector3();
function sideMinY(side) {
  let m = Infinity;
  for (const n of SIDE_FEET[side]) { B(n).getWorldPosition(_fp); if (_fp.y < m) m = _fp.y; }
  return m;
}
function ankleWorld(side) { B(side + "Foot").getWorldPosition(_fp); return _fp; }

function setLeg(side, tt) {
  const hip = sample(GAIT.hip, tt), knee = sample(GAIT.knee, tt), ankle = sample(GAIT.ankle, tt);
  B(side + "UpLeg").rotation.set(-hip * DEG, 0, 0);
  B(side + "Leg").rotation.set(knee * DEG, 0, 0);
  B(side + "Foot").rotation.set(-ankle * DEG, 0, 0);
}

function applyPose(tPercent) {
  setLeg("Right", tPercent);
  setLeg("Left", tPercent + 50);   // contralateral limb is half a cycle out of phase

  // subtle arm swing, anti-phase to the same-side leg
  B("RightArm").rotation.x = sample(GAIT.hip, tPercent) * DEG * 0.35;
  B("LeftArm").rotation.x = sample(GAIT.hip, tPercent + 50) * DEG * 0.35;

  // Foot-lock: the contact foot (lowest one) stays planted while the body travels over it,
  // reconstructing real overground progression that the angle-only data doesn't carry.
  model.position.y = modelBaseY;
  model.updateMatrixWorld(true);
  const ry = sideMinY("Right"), ly = sideMinY("Left");
  const low = ry <= ly ? "Right" : "Left";
  if (low !== lockSide) {                 // contact handed to the other foot → re-lock there
    lockSide = low;
    const a = ankleWorld(low); lockX = a.x; lockZ = a.z;
  }
  const a = ankleWorld(lockSide);         // pull the locked ankle back to its world lock point
  model.position.x += lockX - a.x;
  model.position.z += lockZ - a.z;
  model.position.y = modelBaseY - Math.min(ry, ly);   // plant lowest foot on the ground
  model.updateMatrixWorld(true);
}

function updatePhase(tPercent) {
  const hit = PHASES.find(([a, b]) => tPercent >= a && tPercent < b) || PHASES[PHASES.length - 1];
  phaseLabel.textContent = hit[2];
  phasePercent.textContent = Math.round(tPercent) + "%";
}

// ================= transport =================
playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "⏸" : "▶";
  lastTime = null;
});
scrubber.addEventListener("input", () => {
  playing = false; playBtn.textContent = "▶";
  fraction = scrubber.value / 1000;
});

function onResize() {
  const w = stageWrap.clientWidth, h = stageWrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);

function animate(ts) {
  if (lastTime == null) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (ready) {
    if (playing) {
      fraction += (dt * 1000 * parseFloat(playbackSpeed.value)) / CYCLE_MS;
      fraction = ((fraction % 1) + 1) % 1;
      scrubber.value = Math.round(fraction * 1000);
    }
    const tPercent = fraction * 100;
    updatePhase(tPercent);
    applyPose(tPercent);

    // camera follows the walker (it appears in place; the ground slides by — treadmill look,
    // but the feet are genuinely planted). Seamless wrap keeps coordinates bounded.
    if (!followInit) { prevPos.copy(model.position); followInit = true; }
    if (model.position.z - prevPos.z > WRAP) {
      model.position.z -= WRAP; lockZ -= WRAP; prevPos.z -= WRAP;
      camera.position.z -= WRAP; controls.target.z -= WRAP;
    }
    const dx = model.position.x - prevPos.x, dz = model.position.z - prevPos.z;
    camera.position.x += dx; camera.position.z += dz;
    controls.target.x += dx; controls.target.z += dz;
    prevPos.copy(model.position);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

(function boot() {
  try {
    initScene();
    new GLTFLoader().load(MODEL_URL, onModelLoaded, undefined, err => {
      console.error("GLB load error:", err);
      webglStatus.textContent = "model load failed";
    });
    requestAnimationFrame(animate);
  } catch (err) {
    console.error("gait3d boot error:", err);
    webglStatus.textContent = "error: " + err.message;
  }
})();
