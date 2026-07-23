// Shared runtime helpers for turning MOVEMENTS data (data.js) + param values into
// concrete numbers. Used by both the dashboard explorer (app.js) and the physics
// lab (lab.js) so both pages read the exact same curves the exact same way.

function computeScales(movement, paramValue) {
  const p = movement.param;
  return {
    grfScale: p.grfScale(paramValue),
    angleScale: p.angleScale(paramValue),
    hipDropScale: p.hipDropScale(paramValue),
    muscleScale: p.muscleScale(paramValue),
    cycleDuration: p.cycleDuration(paramValue),
  };
}

function liveState(movement, scales, tPercent) {
  return {
    grf: Math.max(0, evalCyclic(movement.grf, tPercent) * scales.grfScale),
    hipAngle: evalCyclic(movement.hip, tPercent) * scales.angleScale,
    kneeAngle: evalCyclic(movement.knee, tPercent) * scales.angleScale,
    ankleAngle: evalCyclic(movement.ankle, tPercent) * scales.angleScale,
    trunkLean: evalCyclic(movement.trunkLean, tPercent) * (1 + (scales.angleScale - 1) * 0.5),
    hipDrop: evalCyclic(movement.hipDrop, tPercent) * scales.hipDropScale,
  };
}

function muscleActivationAt(movement, scales, muscleName, tPercent) {
  const mu = movement.muscles.find(m => m.name === muscleName);
  if (!mu) return 0;
  return Math.max(0, Math.min(1, evalCyclic(mu.keyframes, tPercent) * scales.muscleScale));
}

function sampledCurves(movement, scales) {
  const grf = sampleCurve(movement.grf, 100).map(v => Math.max(0, v * scales.grfScale));
  const hip = sampleCurve(movement.hip, 100).map(v => v * scales.angleScale);
  const knee = sampleCurve(movement.knee, 100).map(v => v * scales.angleScale);
  const ankle = sampleCurve(movement.ankle, 100).map(v => v * scales.angleScale);
  const muscles = movement.muscles.map(mu => ({
    name: mu.name,
    values: sampleCurve(mu.keyframes, 100).map(v => Math.max(0, Math.min(1, v * scales.muscleScale))),
  }));
  return { grf, hip, knee, ankle, muscles };
}

function niceMax(arr, headroom = 1.15) { return Math.max(...arr) * headroom; }
