// Mobile nav + grouped menu now handled centrally in nav.js.

// Shared computeScales / liveState / sampledCurves / niceMax now live in runtime.js
// (loaded before this file), so both the dashboard and the physics lab stay in sync.

// ==================== EXPLORER ====================

const figureCanvas = document.getElementById("figureCanvas");
const phaseLabel = document.getElementById("phaseLabel");
const phasePercent = document.getElementById("phasePercent");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const playbackSpeed = document.getElementById("playbackSpeed");
const paramSlidersEl = document.getElementById("paramSliders");
const movementBlurbEl = document.getElementById("movementBlurb");
const muscleRowsEl = document.getElementById("muscleRows");

const grfChart = createGrfChart(document.getElementById("grfChart"));
const angleChart = createAngleChart(document.getElementById("angleChart"));

let currentMovementId = "walk";
let paramValue = MOVEMENTS[currentMovementId].param.default;
let scales = computeScales(MOVEMENTS[currentMovementId], paramValue);
let curves = sampledCurves(MOVEMENTS[currentMovementId], scales);
let muscleRows = [];
let fraction = 0;
let playing = true;
let lastTime = null;

function updatePhaseLabel(tPercent) {
  const phases = MOVEMENTS[currentMovementId].phases;
  const hit = phases.find(([a, b]) => tPercent >= a && tPercent < b) || phases[phases.length - 1];
  phaseLabel.textContent = i18n.t(hit[2]);
  phasePercent.textContent = Math.round(tPercent) + "%";
}

function buildParamSlider() {
  const m = MOVEMENTS[currentMovementId];
  const p = m.param;
  paramSlidersEl.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "param-slider";
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = i18n.t(p.label);
  const pv = document.createElement("span");
  pv.className = "pv";
  pv.textContent = i18n.t(p.display(paramValue));
  label.appendChild(span);
  label.appendChild(pv);
  const input = document.createElement("input");
  input.type = "range";
  input.min = p.min; input.max = p.max; input.step = p.step; input.value = paramValue;
  input.addEventListener("input", () => {
    paramValue = parseFloat(input.value);
    pv.textContent = i18n.t(p.display(paramValue));
    refreshMovementData();
  });
  wrap.appendChild(label);
  wrap.appendChild(input);
  paramSlidersEl.appendChild(wrap);
}

function refreshMovementData() {
  const m = MOVEMENTS[currentMovementId];
  scales = computeScales(m, paramValue);
  curves = sampledCurves(m, scales);

  updateGrfChart(grfChart, curves.grf);
  grfChart.options.scales.y.max = niceMax(curves.grf, 1.2);
  grfChart.update("none");

  updateAngleChart(angleChart, curves.hip, curves.knee, curves.ankle);
  const allAngles = [...curves.hip, ...curves.knee, ...curves.ankle];
  angleChart.options.scales.y.max = Math.max(...allAngles) + 10;
  angleChart.options.scales.y.min = Math.min(...allAngles) - 10;
  angleChart.update("none");

  muscleRows = buildMuscleRows(muscleRowsEl, curves.muscles);
}

function switchMovement(id) {
  currentMovementId = id;
  const m = MOVEMENTS[id];
  paramValue = m.param.default;
  fraction = 0;

  document.querySelectorAll(".movement-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.movement === id);
  });
  movementBlurbEl.innerHTML = `<b>${i18n.t(m.label)}</b> — ${i18n.t(m.blurb)}`;

  buildParamSlider();
  refreshMovementData();
  updateSourceBadges();
}

// ---- Provenance badges under each chart (measured vs modelled) ----
const sourceBadges = {
  grf: document.getElementById("grfSource"),
  angles: document.getElementById("angleSource"),
  muscles: document.getElementById("muscleSource"),
};
function setSourceBadge(el, s) {
  if (!el) return;
  if (!s) { el.textContent = ""; el.className = "source-badge"; el.removeAttribute("title"); return; }
  const kind = i18n.t(s.kind === "measured" ? "Measured" : "Modelled");
  el.textContent = s.ref ? kind + " · " + i18n.t(s.ref) : kind;
  el.className = "source-badge " + s.kind;
  const doi = s.data || s.paper;
  if (doi) el.title = "doi:" + doi; else el.removeAttribute("title");
}
function updateSourceBadges() {
  const src = MOVEMENTS[currentMovementId].sources || {};
  setSourceBadge(sourceBadges.grf, src.grf);
  setSourceBadge(sourceBadges.angles, src.angles);
  setSourceBadge(sourceBadges.muscles, src.muscles);
}

document.querySelectorAll(".movement-tab").forEach(btn => {
  btn.addEventListener("click", () => switchMovement(btn.dataset.movement));
});

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

function renderFrame() {
  const tPercent = fraction * 100;
  const movement = MOVEMENTS[currentMovementId];
  const st = liveState(movement, scales, tPercent);
  const shift = movement.contralateralShift || 0;
  const st2 = liveState(movement, scales, tPercent + shift);
  drawStickFigure(figureCanvas, st, st2);
  updatePhaseLabel(tPercent);
  Playback.fraction = fraction;
  grfChart.update("none");
  angleChart.update("none");
  muscleRows.forEach(r => drawMuscleSparkline(r.canvas, r.values, fraction));
}

function loop(timestamp) {
  if (playing) {
    if (lastTime == null) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    const speed = parseFloat(playbackSpeed.value);
    fraction += (dt * speed) / scales.cycleDuration;
    fraction = ((fraction % 1) + 1) % 1;
    scrubber.value = Math.round(fraction * 1000);
  } else {
    lastTime = null;
  }
  renderFrame();
  requestAnimationFrame(loop);
}

switchMovement("walk");
requestAnimationFrame(loop);

// ==================== COMPARE ====================

const compareAMovement = document.getElementById("compareA-movement");
const compareBMovement = document.getElementById("compareB-movement");
const compareAParam = document.getElementById("compareA-param");
const compareBParam = document.getElementById("compareB-param");

function buildCompareOptions() {
  const selA = compareAMovement.value || "walk";
  const selB = compareBMovement.value || "run";
  compareAMovement.innerHTML = "";
  compareBMovement.innerHTML = "";
  MOVEMENT_ORDER.forEach(id => {
    const label = i18n.t(MOVEMENTS[id].label);
    const optA = document.createElement("option"); optA.value = id; optA.textContent = label;
    const optB = document.createElement("option"); optB.value = id; optB.textContent = label;
    compareAMovement.appendChild(optA);
    compareBMovement.appendChild(optB);
  });
  compareAMovement.value = selA;
  compareBMovement.value = selB;
}
buildCompareOptions();

const compareGrfChart = new Chart(document.getElementById("compareGrfChart").getContext("2d"), {
  type: "line",
  data: { labels: makeSeriesLabels(100), datasets: [] },
  options: { ...baseChartOptions("× body weight", 0, null), plugins: { ...baseChartOptions().plugins, scrubLine: false } },
});
const compareAngleChart = new Chart(document.getElementById("compareAngleChart").getContext("2d"), {
  type: "line",
  data: { labels: makeSeriesLabels(100), datasets: [] },
  options: { ...baseChartOptions("degrees", null, null), plugins: { ...baseChartOptions().plugins, scrubLine: false } },
});

function traceDataset(label, values, color) {
  return {
    label,
    data: values.map((v, i) => ({ x: (i / (values.length - 1)) * 100, y: v })),
    borderColor: color,
    backgroundColor: "transparent",
    borderWidth: 2.4,
    pointRadius: 0,
    tension: 0.35,
  };
}

function renderCompare() {
  const mA = MOVEMENTS[compareAMovement.value];
  const mB = MOVEMENTS[compareBMovement.value];
  const scalesA = computeScales(mA, compareAParam.value / 100);
  const scalesB = computeScales(mB, compareBParam.value / 100);
  const curvesA = sampledCurves(mA, scalesA);
  const curvesB = sampledCurves(mB, scalesB);

  compareGrfChart.data.datasets = [
    traceDataset(i18n.t(mA.label), curvesA.grf, "#5eead4"),
    traceDataset(i18n.t(mB.label), curvesB.grf, "#ff6f5e"),
  ];
  compareGrfChart.options.scales.y.max = niceMax([...curvesA.grf, ...curvesB.grf], 1.15);
  compareGrfChart.update();

  compareAngleChart.data.datasets = [
    traceDataset(i18n.t(mA.label) + i18n.t(" knee"), curvesA.knee, "#5eead4"),
    traceDataset(i18n.t(mB.label) + i18n.t(" knee"), curvesB.knee, "#ff6f5e"),
  ];
  const allKnee = [...curvesA.knee, ...curvesB.knee];
  compareAngleChart.options.scales.y.max = Math.max(...allKnee) + 10;
  compareAngleChart.options.scales.y.min = Math.min(...allKnee) - 10;
  compareAngleChart.update();
}

[compareAMovement, compareBMovement, compareAParam, compareBParam].forEach(el => {
  el.addEventListener("input", renderCompare);
  el.addEventListener("change", renderCompare);
});

renderCompare();

// Re-render JS-injected text when the language switches (without resetting
// the current parameter value or playback position).
document.addEventListener("i18n:changed", () => {
  const m = MOVEMENTS[currentMovementId];
  movementBlurbEl.innerHTML = `<b>${i18n.t(m.label)}</b> — ${i18n.t(m.blurb)}`;
  buildParamSlider();
  refreshMovementData(); // rebuilds muscle-row labels
  updateSourceBadges();
  buildCompareOptions();
  renderCompare();
});
