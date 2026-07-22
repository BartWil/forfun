// Catmull-Rom interpolation over cyclic keyframes.
// keyframes: array of [t, value] pairs, 0 <= t < 100, ascending, NOT including a duplicate t=100
// (the curve wraps from the last keyframe back to the first).

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function evalCyclic(frames, tRaw) {
  const n = frames.length;
  const t = ((tRaw % 100) + 100) % 100;

  let i = n - 1;
  for (let k = 0; k < n; k++) {
    const t0 = frames[k][0];
    let t1 = frames[(k + 1) % n][0];
    if (t1 <= t0) t1 += 100;
    let tt = t;
    if (tt < t0) tt += 100;
    if (tt >= t0 && tt < t1) { i = k; break; }
  }

  const p0 = frames[(i - 1 + n) % n];
  const p1 = frames[i];
  const p2 = frames[(i + 1) % n];
  const p3 = frames[(i + 2) % n];

  let t0 = p1[0], t1 = p2[0];
  if (t1 <= t0) t1 += 100;
  let tt = t;
  if (tt < t0) tt += 100;

  const span = t1 - t0;
  const localT = span === 0 ? 0 : (tt - t0) / span;

  return catmullRom(p0[1], p1[1], p2[1], p3[1], localT);
}

// Sample a cyclic keyframe curve at `steps` evenly spaced points across 0-100 (inclusive of 100 = wraps to 0).
function sampleCurve(frames, steps = 100) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    out.push(evalCyclic(frames, (i / steps) * 100));
  }
  return out;
}
