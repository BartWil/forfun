// Shared runtime helpers for turning MOVEMENTS data (data.js) + param values into
// concrete numbers. Used by the dashboard explorer (app.js), the physics lab (lab.js)
// and the 3D anatomy (body3d.js) so every page reads the exact same curves.

// For movements that carry a `speeds` table (measured per-speed grand averages),
// blend the two bracketing speed curves at the slider's current speed. Returns
// dense { grf, hip, knee, ankle } keyframe arrays, or null for movements without
// measured speed data (which fall back to their single base curve + scaling).
function speedResolve(movement, paramValue) {
  const sp = movement.speeds;
  if (!sp || !sp.length) return null;
  const speed = movement.param.speedMps(paramValue);
  let lo = sp[0], hi = sp[0];
  if (speed <= sp[0].v) { lo = hi = sp[0]; }
  else if (speed >= sp[sp.length - 1].v) { lo = hi = sp[sp.length - 1]; }
  else {
    for (let i = 0; i < sp.length - 1; i++) {
      if (speed >= sp[i].v && speed <= sp[i + 1].v) { lo = sp[i]; hi = sp[i + 1]; break; }
    }
  }
  const t = hi.v === lo.v ? 0 : (speed - lo.v) / (hi.v - lo.v);
  const blend = sig => {
    const out = [];
    for (let i = 0; i < 100; i++) out.push([i, evalCyclic(lo[sig], i) * (1 - t) + evalCyclic(hi[sig], i) * t]);
    return out;
  };
  return { grf: blend("grf"), hip: blend("hip"), knee: blend("knee"), ankle: blend("ankle") };
}

function computeScales(movement, paramValue) {
  const p = movement.param;
  const s = {
    grfScale: p.grfScale(paramValue),
    angleScale: p.angleScale(paramValue),
    hipDropScale: p.hipDropScale(paramValue),
    muscleScale: p.muscleScale(paramValue),
    cycleDuration: p.cycleDuration(paramValue),
  };
  // Measured speed curves already carry the speed effect, so don't re-scale them.
  const curves = speedResolve(movement, paramValue);
  if (curves) { s.curves = curves; s.grfScale = 1; s.angleScale = 1; }
  return s;
}

function liveState(movement, scales, tPercent) {
  const C = scales.curves || movement;
  return {
    grf: Math.max(0, evalCyclic(C.grf, tPercent) * scales.grfScale),
    hipAngle: evalCyclic(C.hip, tPercent) * scales.angleScale,
    kneeAngle: evalCyclic(C.knee, tPercent) * scales.angleScale,
    ankleAngle: evalCyclic(C.ankle, tPercent) * scales.angleScale,
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
  const C = scales.curves || movement;
  const grf = sampleCurve(C.grf, 100).map(v => Math.max(0, v * scales.grfScale));
  const hip = sampleCurve(C.hip, 100).map(v => v * scales.angleScale);
  const knee = sampleCurve(C.knee, 100).map(v => v * scales.angleScale);
  const ankle = sampleCurve(C.ankle, 100).map(v => v * scales.angleScale);
  const muscles = movement.muscles.map(mu => ({
    name: mu.name,
    values: sampleCurve(mu.keyframes, 100).map(v => Math.max(0, Math.min(1, v * scales.muscleScale))),
  }));
  return { grf, hip, knee, ankle, muscles };
}

function niceMax(arr, headroom = 1.15) { return Math.max(...arr) * headroom; }
