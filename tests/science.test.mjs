// Scientific tests for BioLab Play.
//
// These are NOT UI tests. Nothing here checks that a button is blue. Every test
// asserts something that has to be true for the site to be honest, so that a commit
// which changes an animation cannot quietly change the physiology.
//
//   node tests/science.test.mjs
//
// Zero dependencies on purpose: this has to keep working in five years without an
// npm install. Exit code 1 on any failure, so CI can gate on it.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(ROOT, f), "utf8");

// ------------------------------------------------------------- tiny test runner
let pass = 0, fail = 0, current = "";
const failures = [];
function group(name, fn) { current = name; console.log("\n" + name); fn(); }
function ok(cond, msg, detail) {
  if (cond) { pass++; console.log("  PASS  " + msg); }
  else {
    fail++; failures.push(current + " :: " + msg + (detail ? "  [" + detail + "]" : ""));
    console.log("  FAIL  " + msg + (detail ? "\n          " + detail : ""));
  }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------------- load data
const MOVEMENTS = new Function(read("data.js") + "; return MOVEMENTS;")();
// The site renders every curve through spline.js evalCyclic(): wrapping at 100%
// and interpolating with Catmull-Rom. Test what is actually drawn, not the raw
// keyframes, because the interpolation can overshoot between them.
const evalCyclic = new Function(read("spline.js") + "; return evalCyclic;")();
// The render path: data -> computeScales -> liveState / sampledCurves. Every page
// draws through these, so this is what "what the reader sees" means.
const RT = new Function(
  read("spline.js") + read("runtime.js") +
  "; return { computeScales, liveState, sampledCurves };")();
const STATIONS = new Function(
  "var self={},module={};" + read("stations.js") + "; return self.STATIONS || module.exports;")();

// Which movements claim to be measured, and which are reconstructions.
const MEASURED = ["walk", "run"];
const RECONSTRUCTED = ["jump", "squat"];
const JOINTS = ["hip", "knee", "ankle"];

// Sample a keyframe series [[pct, value], ...] by linear interpolation.
function sample(kf, pct) {
  if (pct <= kf[0][0]) return kf[0][1];
  if (pct >= kf[kf.length - 1][0]) return kf[kf.length - 1][1];
  for (let i = 1; i < kf.length; i++) {
    if (pct <= kf[i][0]) {
      const [p0, v0] = kf[i - 1], [p1, v1] = kf[i];
      return p1 === p0 ? v1 : v0 + (v1 - v0) * (pct - p0) / (p1 - p0);
    }
  }
  return kf[kf.length - 1][1];
}

// =============================================================== 1. GRF physics
group("Ground reaction force", () => {
  for (const k of Object.keys(MOVEMENTS)) {
    const m = MOVEMENTS[k];
    const vals = m.grf.map(p => p[1]);
    ok(Math.min(...vals) >= 0, `${k}: no negative vertical GRF`,
       `min = ${Math.min(...vals)}`);
    ok(m.grf[0][0] === 0 && m.grf[m.grf.length - 1][0] >= 95,
       `${k}: GRF spans the cycle`);
  }

  // The foot is off the ground in swing, so the force must be zero there.
  // Walking has no flight phase; stance ends near 62%. Running's ends near 39%.
  const swingWindows = { walk: [70, 95], run: [55, 95] };
  for (const [k, [a, b]] of Object.entries(swingWindows)) {
    const m = MOVEMENTS[k];
    let worst = 0, at = 0;
    for (let p = a; p <= b; p += 0.5) {
      const v = Math.abs(sample(m.grf, p));
      if (v > worst) { worst = v; at = p; }
    }
    ok(worst < 0.02, `${k}: GRF is zero through swing (${a}-${b}%)`,
       `max |GRF| = ${worst.toFixed(3)} BW at ${at}%`);
  }

  // Over a whole cycle the ground must supply about one body weight on average,
  // otherwise the walker is accelerating into the floor or off the planet.
  for (const k of MEASURED) {
    const m = MOVEMENTS[k];
    let sum = 0, n = 0;
    for (let p = 0; p < 100; p += 0.25) { sum += sample(m.grf, p); n++; }
    const mean = sum / n;
    // One limb carries the cycle, so the single-limb mean sits below 1 BW;
    // it must still land in a physically sensible band.
    ok(mean > 0.3 && mean < 1.2, `${k}: mean vertical GRF is physically plausible`,
       `mean = ${mean.toFixed(3)} BW`);
  }
});

// ======================================================= 2. EMG normalisation
group("EMG amplitude", () => {
  for (const k of Object.keys(MOVEMENTS)) {
    const m = MOVEMENTS[k];
    for (const mu of m.muscles) {
      const vals = mu.keyframes.map(p => p[1]);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      ok(lo >= 0 && hi <= 1.0001, `${k} / ${mu.name}: activation stays within 0..1`,
         `range ${lo.toFixed(2)}..${hi.toFixed(2)}`);
    }
  }

  // Measured muscles are normalised to their own peak, so each must actually
  // reach 1.0. If this ever fails, the normalisation step has been broken and
  // the "read these as timing" caution on the Explorer is no longer true.
  for (const k of MEASURED) {
    for (const mu of MOVEMENTS[k].muscles) {
      const hi = Math.max(...mu.keyframes.map(p => p[1]));
      ok(near(hi, 1.0, 0.015), `${k} / ${mu.name}: peaks at 1.0 (own-peak normalised)`,
         `peak = ${hi.toFixed(3)}`);
    }
  }

  // Because every measured muscle peaks at 1.0, amplitude carries no cross-muscle
  // meaning. Any page that says otherwise is wrong. Guard the wording directly.
  const banned = [
    { re: /how hard,?\s+to control/i, why: "implies amplitude equals effort" },
    { re: /stronger than the (quad|calf)/i, why: "compares muscles by amplitude" },
  ];
  const pages = ["explorer.html", "body3d.html"];
  for (const p of pages) {
    const html = read(p);
    for (const b of banned) {
      ok(!b.re.test(html), `${p}: no amplitude-as-effort wording (${b.why})`);
    }
  }
  ok(/normalised to its own peak|scaled to its own peak/i.test(read("explorer.html")),
     "explorer.html: states the own-peak normalisation where the chart is");
});

// =================================================== 3. rendered curve integrity
group("Rendered curves", () => {
  for (const k of Object.keys(MOVEMENTS)) {
    const m = MOVEMENTS[k];
    const series = { grf: m.grf };
    for (const j of JOINTS) if (m[j]) series["angle:" + j] = m[j];
    m.muscles.forEach(mu => (series["emg:" + mu.name] = mu.keyframes));

    for (const [name, kf] of Object.entries(series)) {
      const pcts = kf.map(p => p[0]);
      ok(pcts.every((v, i) => i === 0 || v >= pcts[i - 1]),
         `${k} / ${name}: keyframes are in ascending time order`);
      ok(pcts[0] === 0, `${k} / ${name}: starts at 0%`, `starts at ${pcts[0]}`);

      // Dense sweep through the site's own evaluator, including across the wrap.
      let bad = null, minV = Infinity, maxV = -Infinity;
      for (let t = 0; t < 100; t += 0.25) {
        const v = evalCyclic(kf, t);
        if (!Number.isFinite(v)) { bad = `not finite at ${t}%`; break; }
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      ok(!bad, `${k} / ${name}: evaluates cleanly across the whole cycle`, bad || "");

      if (name.startsWith("emg:")) {
        // muscleActivationAt clamps too, but the raw envelope should already be
        // close, so a large overshoot here means the keyframes need attention.
        ok(minV >= -0.06 && maxV <= 1.12,
           `${k} / ${name}: raw envelope stays near 0..1`,
           `rendered ${minV.toFixed(3)}..${maxV.toFixed(3)}`);
      }
    }
  }

  // The wrap has to be smooth: the curve leaving 100% must meet the curve at 0%.
  // evalCyclic guarantees continuity, so what is worth checking is that the wrap
  // is not hiding a large jump the reader would see as a kink.
  for (const k of MEASURED) {
    const m = MOVEMENTS[k];
    const series = { grf: m.grf };
    for (const j of JOINTS) if (m[j]) series[j] = m[j];
    for (const [name, kf] of Object.entries(series)) {
      const vals = [];
      for (let t = 0; t < 100; t += 0.5) vals.push(evalCyclic(kf, t));
      const range = Math.max(...vals) - Math.min(...vals) || 1;
      const step = Math.abs(evalCyclic(kf, 0) - evalCyclic(kf, 99.5));
      ok(step < range * 0.15, `${k} / ${name}: no kink at the cycle wrap`,
         `jump ${step.toFixed(2)} vs range ${range.toFixed(2)}`);
    }
  }
});

// ============================================ 3b. the render path is physical
//
// Catmull-Rom interpolation overshoots between keyframes. For the ground reaction
// force that overshoot dips BELOW ZERO near foot-off: at the time of writing, to
// -0.076 BW for walking, -0.130 for running and -0.067 for the jump. The floor
// cannot pull a foot down, so nothing may ever draw that.
//
// It never reaches the screen because runtime.js clamps at both points where a
// curve becomes a number. These tests assert the guarantee and then guard the
// clamps, so a future consumer that reads evalCyclic() directly gets caught here
// rather than by a reader noticing a negative force on a chart.
group("Render path is physical", () => {
  for (const k of Object.keys(MOVEMENTS)) {
    const m = MOVEMENTS[k];
    for (const pv of [0, 0.25, m.param.default, 0.75, 1]) {
      const scales = RT.computeScales(m, pv);

      let minLive = Infinity;
      for (let t = 0; t < 100; t += 0.25) minLive = Math.min(minLive, RT.liveState(m, scales, t).grf);
      ok(minLive >= 0, `${k} @ param ${pv}: liveState never yields negative GRF`,
         `min ${minLive.toFixed(4)} BW`);

      const c = RT.sampledCurves(m, scales);
      ok(Math.min(...c.grf) >= 0, `${k} @ param ${pv}: charted GRF never negative`,
         `min ${Math.min(...c.grf).toFixed(4)} BW`);
      c.muscles.forEach(mu => {
        const lo = Math.min(...mu.values), hi = Math.max(...mu.values);
        ok(lo >= 0 && hi <= 1, `${k} @ param ${pv} / ${mu.name}: charted EMG within 0..1`,
           `${lo.toFixed(3)}..${hi.toFixed(3)}`);
      });
    }
  }

  // Guard the clamps themselves. If someone deletes one, the tests above would
  // still pass only until a keyframe changes; this catches the removal directly.
  const rt = read("runtime.js");
  ok(/grf:\s*Math\.max\(0,/.test(rt), "runtime.js clamps GRF in liveState()");
  ok(/const grf = sampleCurve\([^)]*\)\.map\(v => Math\.max\(0,/.test(rt),
     "runtime.js clamps GRF in sampledCurves()");
  ok(/Math\.max\(0, Math\.min\(1,/.test(rt), "runtime.js clamps EMG into 0..1");

  // No page may evaluate a GRF curve outside the runtime, because that path is
  // the only one that clamps.
  const consumers = ["app.js", "lab.js", "body3d.js", "glossary.js", "landing.js",
                     "quest.js", "sandbox.js", "figure.js"];
  for (const f of consumers) {
    const src = read(f);
    ok(!/evalCyclic\(\s*\w*\.?grf/.test(src),
       `${f}: reads GRF through the runtime, not raw evalCyclic`);
  }
});

// ====================================================== 4. joint angle sanity
group("Joint angles", () => {
  // Sagittal ranges a healthy adult can actually reach. These are deliberately
  // generous: the test is meant to catch a sign flip or a unit error, not to
  // police normal variation.
  // Generous bounds: the test catches a sign flip or a unit error, not normal
  // variation. Ankle plantarflexion reaches roughly 50 deg at a jump take-off,
  // so the lower bound has to allow it.
  const LIMITS = { hip: [-30, 140], knee: [-10, 160], ankle: [-55, 40] };
  for (const k of Object.keys(MOVEMENTS)) {
    const m = MOVEMENTS[k];
    for (const j of JOINTS) {
      const kf = m[j], lim = LIMITS[j];
      if (!kf || !lim) continue;
      const vals = kf.map(p => p[1]);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      ok(lo >= lim[0] && hi <= lim[1], `${k} / ${j}: within anatomical range`,
         `${lo.toFixed(1)}..${hi.toFixed(1)} deg, allowed ${lim[0]}..${lim[1]}`);
    }
  }

  // Knee flexion in swing is the largest bend in the gait cycle, and it must be
  // bigger in running than in walking. A sign flip breaks this immediately.
  const peakKnee = k => Math.max(...MOVEMENTS[k].knee.map(p => p[1]));
  ok(peakKnee("run") > peakKnee("walk"),
     "peak knee flexion is greater in running than walking",
     `run ${peakKnee("run").toFixed(0)} vs walk ${peakKnee("walk").toFixed(0)} deg`);
  ok(peakKnee("walk") > 45, "walking reaches a real swing-phase knee bend",
     `${peakKnee("walk").toFixed(0)} deg`);
});

// ================================================= 5. provenance and sliders
group("Provenance", () => {
  const SIGNALS = ["grf", "angles", "muscles"];
  for (const k of MEASURED) {
    const src = MOVEMENTS[k].sources || {};
    for (const sig of SIGNALS) {
      ok(src[sig] && src[sig].kind === "measured",
         `${k} / ${sig}: declared measured`, src[sig] ? src[sig].kind : "missing");
      ok(src[sig] && (src[sig].paper || src[sig].data),
         `${k} / ${sig}: cites a paper or a dataset`);
      ok(src[sig] && typeof src[sig].n === "number" && src[sig].n > 0,
         `${k} / ${sig}: reports a sample size`, src[sig] ? String(src[sig].n) : "");
    }
  }
  // A reconstruction must never be labelled measured. This is the badge the
  // reader trusts, so it is the one most worth guarding.
  for (const k of RECONSTRUCTED) {
    const src = MOVEMENTS[k].sources || {};
    for (const sig of SIGNALS) {
      ok(src[sig] && src[sig].kind !== "measured",
         `${k} / ${sig}: NOT labelled measured`, src[sig] ? src[sig].kind : "missing");
    }
  }

  // The slider is normalised 0..1 and maps onto the measured speeds. Sweeping it
  // end to end must never request a speed outside the range that was actually
  // recorded, otherwise the page silently extrapolates past its own data.
  for (const k of MEASURED) {
    const m = MOVEMENTS[k];
    const sp = m.speeds;
    ok(Array.isArray(sp) && sp.length >= 2, `${k}: carries a measured speed table`);
    if (!sp || sp.length < 2) continue;
    const lo = sp[0].v, hi = sp[sp.length - 1].v;
    let below = 0, above = 0, worst = null;
    for (let v = 0; v <= 1.0001; v += 0.01) {
      const speed = m.param.speedMps(Math.min(1, v));
      if (speed < lo - 1e-9) { below++; worst = speed; }
      if (speed > hi + 1e-9) { above++; worst = speed; }
    }
    ok(below === 0 && above === 0,
       `${k}: sweeping the slider stays inside the measured speeds (${lo}-${hi} m/s)`,
       worst === null ? "" : `requested ${worst.toFixed(2)} m/s`);

    // Every speed curve in the table must itself be a full cycle.
    sp.forEach((entry, i) => {
      ok(entry.grf && entry.grf[entry.grf.length - 1][0] >= 95,
         `${k}: speed curve ${i} (${entry.v} m/s) covers the cycle`);
    });
  }
});

// ============================================ 6. inverse dynamics invariants
group("Inverse dynamics", () => {
  const G = 9.81;
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const len = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cross = (r, F) => r.x * F.y - r.y * F.x;
  const P = { foot: { mass: 0.0137, com: 0.4415, rg: 0.257 },
              shank: { mass: 0.0433, com: 0.4395, rg: 0.251 },
              thigh: { mass: 0.1416, com: 0.4095, rg: 0.329 } };

  const build = S => {
    const mk = (key, a, b, joint, p) => {
      const Ln = len(a, b), m = p.mass * S.mass;
      return { key, m, I: m * (p.rg * Ln) ** 2, com: lerp(a, b, p.com), prox: joint,
               a: S.acc[key], alpha: S.alpha[key] };
    };
    return [mk("foot", S.heel, S.toe, S.ankle, P.foot),
            mk("shank", S.knee, S.ankle, S.knee, P.shank),
            mk("thigh", S.hip, S.knee, S.hip, P.thigh)];
  };
  // A: the segment-by-segment recursion the page runs.
  const recursion = S => {
    const segs = build(S);
    let Fd = { ...S.grf }, Md = 0, dP = S.cop;
    return segs.map(s => {
      const a = S.useInertia ? s.a : { x: 0, y: 0 }, al = S.useInertia ? s.alpha : 0;
      const Fp = { x: s.m * a.x - Fd.x, y: s.m * a.y - Fd.y + s.m * G };
      const Mp = s.I * al - Md - cross(sub(s.prox, s.com), Fp) - cross(sub(dP, s.com), Fd);
      Fd = { x: -Fp.x, y: -Fp.y }; Md = -Mp; dP = s.prox;
      return Mp;
    });
  };
  // B: a whole-subsystem free body about each joint. Shares no code path with A.
  const freeBody = S => {
    const segs = build(S), joints = [S.ankle, S.knee, S.hip];
    return joints.map((J, ji) => {
      let rhs = 0, ext = 0;
      segs.slice(0, ji + 1).forEach(s => {
        const a = S.useInertia ? s.a : { x: 0, y: 0 }, al = S.useInertia ? s.alpha : 0;
        const r = sub(s.com, J);
        rhs += s.I * al + s.m * cross(r, a);
        ext += cross(r, { x: 0, y: -s.m * G });
      });
      ext += cross(sub(S.cop, J), S.grf);
      return rhs - ext;
    });
  };

  const base = { mass: 75,
    acc: { foot: { x: 2, y: 1.5 }, shank: { x: 1.2, y: .8 }, thigh: { x: .8, y: .4 } },
    alpha: { foot: 12, shank: 4, thigh: -2 } };
  const POSTURES = {
    mid:  { hip: { x: .020, y: .934 }, knee: { x: .010, y: .505 }, ankle: { x: 0, y: .075 },
            heel: { x: -.060, y: .025 }, toe: { x: .206, y: .025 },
            cop: { x: .045, y: 0 }, grf: { x: -30, y: 740 } },
    heel: { hip: { x: -.035, y: .912 }, knee: { x: .075, y: .500 }, ankle: { x: .062, y: .072 },
            heel: { x: .100, y: .012 }, toe: { x: .360, y: .060 },
            cop: { x: .100, y: 0 }, grf: { x: -80, y: 810 } },
    push: { hip: { x: .200, y: .928 }, knee: { x: .185, y: .500 }, ankle: { x: -.003, y: .115 },
            heel: { x: -.055, y: .165 }, toe: { x: .175, y: .028 },
            cop: { x: .120, y: 0 }, grf: { x: 130, y: 800 } },
  };

  let worst = 0;
  for (const inertia of [false, true]) {
    for (const [name, p] of Object.entries(POSTURES)) {
      const S = { ...base, ...p, useInertia: inertia };
      const A = recursion(S), B = freeBody(S);
      A.forEach((v, i) => (worst = Math.max(worst, Math.abs(v - B[i]))));
    }
  }
  ok(worst < 1e-9, "recursion agrees with an independent free-body solution",
     `worst disagreement ${worst.toExponential(2)} N.m`);

  // Put the force line through the knee and the knee moment must reduce to the
  // weight of the segments below it. Nothing else can be left over.
  {
    const p = JSON.parse(JSON.stringify(POSTURES.mid));
    p.cop = { x: p.knee.x, y: 0 }; p.grf = { x: 0, y: 800 };
    const S = { ...base, ...p, useInertia: false };
    const M = recursion(S)[1];
    let expect = 0;
    build(S).slice(0, 2).forEach(s => {
      expect -= cross(sub(s.com, S.knee), { x: 0, y: -s.m * G });
    });
    ok(near(M, expect, 1e-9), "force line through the knee leaves only segment weight",
       `${M.toFixed(6)} vs ${expect.toFixed(6)} N.m`);
  }

  // No gravity, no ground force, no acceleration: every moment must be exactly zero.
  {
    const S = { ...base, ...JSON.parse(JSON.stringify(POSTURES.mid)),
                useInertia: false, grf: { x: 0, y: 0 }, mass: 0 };
    const M = recursion(S);
    ok(M.every(v => Math.abs(v) < 1e-12), "massless and unloaded gives exactly zero moments",
       M.map(v => v.toExponential(1)).join(", "));
  }

  // Scaling the ground force scales the moments linearly, since the solver is
  // linear in the applied force for a fixed posture.
  {
    const S1 = { ...base, ...POSTURES.push, useInertia: false };
    const S2 = { ...S1, grf: { x: S1.grf.x * 2, y: S1.grf.y * 2 } };
    const A = recursion(S1), B = recursion(S2);
    // segment weights do not scale, so compare the force-dependent part
    const S0 = { ...S1, grf: { x: 0, y: 0 } };
    const W = recursion(S0);
    const ok2 = A.every((v, i) => near((B[i] - W[i]) / (v - W[i]), 2, 1e-6));
    ok(ok2, "joint moments scale linearly with the ground reaction force");
  }
});

// ========================================== 7. the contract system itself
group("Scientific contracts", () => {
  const required = ["learningGoal", "measured", "calculated", "modelled",
                    "assumptions", "cannotConclude", "primarySources"];
  // The nav is generated from the catalogue now, so the check that matters is
  // the other direction: every station must point at a page that exists, and
  // every page must be in the catalogue.
  const onDisk = readdirSync(ROOT).filter(f => f.endsWith(".html"));
  const known = new Set(STATIONS.list.map(s => s.page));
  for (const st of STATIONS.list) {
    ok(existsSync(join(ROOT, st.page)), `${st.id}: page ${st.page} exists on disk`);
  }
  for (const f of onDisk) {
    ok(known.has(f), `page ${f} is listed in the station catalogue`);
  }
  // Every page must load the catalogue BEFORE nav.js, which now depends on it.
  for (const f of onDisk) {
    const html = read(f);
    const si = html.indexOf("stations.js"), ni = html.indexOf("nav.js");
    ok(si !== -1 && ni !== -1 && si < ni,
       `${f}: loads stations.js before nav.js`, `stations at ${si}, nav at ${ni}`);
  }

  for (const st of STATIONS.list) {
    const c = st.contract;
    ok(!!c, `${st.id}: has a contract`);
    if (!c) continue;
    for (const f of required) {
      ok(c[f] !== undefined, `${st.id}: declares ${f}`);
    }
    // cannotConclude is the field that catches overclaiming, so it may never be
    // empty. measured/calculated/modelled may legitimately be empty arrays.
    ok(Array.isArray(c.cannotConclude) && c.cannotConclude.length > 0,
       `${st.id}: states at least one thing it cannot conclude`);
    ok(Array.isArray(c.primarySources) && c.primarySources.length > 0,
       `${st.id}: cites at least one primary source`);
    ok(c.learningGoal && c.learningGoal.en && c.learningGoal.pl,
       `${st.id}: learning goal is bilingual`);

    // Every bilingual entry must actually carry both languages.
    for (const f of ["measured", "calculated", "modelled", "assumptions", "cannotConclude"]) {
      const bad = (c[f] || []).filter(i => !i || !i.en || !i.pl);
      ok(bad.length === 0, `${st.id}: every ${f} item is bilingual`,
         bad.length ? bad.length + " missing a translation" : "");
    }
    ok(["beginner", "intermediate"].includes(st.level), `${st.id}: has a valid level`);
    ok(!!STATIONS.TRACKS[st.track], `${st.id}: belongs to a real track`);
    ok(["verified", "reconstructed", "synthetic", "reference"].includes(st.status),
       `${st.id}: has a valid scientific status`);
    // Prerequisites must point at stations that exist.
    for (const pre of st.prerequisites || []) {
      ok(!!STATIONS.byId[pre], `${st.id}: prerequisite "${pre}" exists`);
    }
  }

  // A station whose data is synthetic must not be labelled as traceable.
  const syntheticPages = ["sls.html", "sandbox.html"];
  for (const p of syntheticPages) {
    const st = STATIONS.byPage[p];
    ok(st && st.status === "synthetic", `${p}: declared synthetic, not verified`,
       st ? st.status : "missing");
  }
});

// ------------------------------------------------------------------- summary
console.log("\n" + "=".repeat(64));
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) {
  console.log("\nFailures:");
  failures.forEach(f => console.log("  - " + f));
}
console.log("=".repeat(64));
process.exit(fail ? 1 : 0);
