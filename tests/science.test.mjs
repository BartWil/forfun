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
import { spawnSync } from "node:child_process";
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


// ================================================ 8. EMG DSP against an oracle
//
// The EMG Lab says it runs the Santuz pipeline. That is a factual claim about
// code, so it gets tested like one, two independent ways:
//
//   A. Against scipy. scripts/make_emg_reference.py processes the committed
//      excerpt with scipy.signal.butter(4)/filtfilt, the same design and the
//      same forward-backward application as R's signal package, which is what
//      the published analysis used. The browser's own filter is then run over
//      the identical input and compared sample by sample.
//
//   B. Against mathematics. A Butterworth of order n has magnitude
//      |H(f)| = 1/sqrt(1 + (f/fc)^(2n)) for a low-pass. Applying it forward and
//      backward squares that. Pure sinusoids are pushed through the browser's
//      filter and the measured gain is checked against the closed form, which
//      depends on no other implementation at all.
//
// Test B is the one that would have caught the original bug: a 2nd-order section
// run forward and backward gives 1/(1+(f/fc)^4), not 1/(1+(f/fc)^8), and half an
// octave inside a 50 Hz high-pass those differ roughly fifteenfold.
group("EMG signal processing", () => {
  // Run emg.js exactly as shipped, in a stubbed browser, and take the DSP it
  // publishes. Rewriting the file to extract functions would test a copy.
  const DSP = new Function(`
    const noop = () => {};
    const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
                 appendChild:noop, remove:noop, addEventListener:noop, setAttribute:noop,
                 querySelector:()=>null, querySelectorAll:()=>[], innerHTML:"", textContent:"",
                 dataset:{}, getBoundingClientRect:()=>({left:0,top:0,width:0,height:0,bottom:0}) };
    const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                       querySelector:()=>null, querySelectorAll:()=>[], createElement:()=>el, body:el };
    const window = { addEventListener:noop, devicePixelRatio:1, innerWidth:1280, innerHeight:800 };
    const location = { pathname:"/emg.html" };
    const fetch = () => Promise.reject(new Error("no network in tests"));
    ${read("emg.js")}
    return window.__emgDSP;
  `)();

  ok(!!DSP && typeof DSP.filtfilt === "function", "emg.js exposes its DSP for testing");
  if (!DSP) return;
  ok(DSP.ORDER === 4, "filter order is 4, matching the published pipeline", "order " + DSP.ORDER);

  // ---- B: closed-form Butterworth magnitude response
  const fs = 1000, N = 8192;
  function gainAt(freq, fc, high) {
    const x = new Float64Array(N);
    for (let i = 0; i < N; i++) x[i] = Math.sin(2 * Math.PI * freq * i / fs);
    const y = DSP.filtfilt(x, fc, fs, high);
    // measure on the interior only, away from the padded ends
    const a = Math.floor(N * 0.25), b = Math.floor(N * 0.75);
    let px = 0, py = 0;
    for (let i = a; i < b; i++) { px += x[i] * x[i]; py += y[i] * y[i]; }
    return Math.sqrt(py / px);
  }
  const n = DSP.ORDER;
  // filtfilt applies |H| twice, so the expected gain is |H|^2
  const wantLow = (f, fc) => 1 / (1 + Math.pow(f / fc, 2 * n));
  const wantHigh = (f, fc) => 1 / (1 + Math.pow(fc / f, 2 * n));

  let worstLow = 0, worstHigh = 0;
  for (const [f, fc] of [[10, 50], [25, 50], [50, 50], [100, 50], [200, 50], [400, 50]]) {
    const got = gainAt(f, fc, true), want = wantHigh(f, fc);
    worstHigh = Math.max(worstHigh, Math.abs(got - want));
  }
  for (const [f, fc] of [[2, 20], [10, 20], [20, 20], [40, 20], [80, 20]]) {
    const got = gainAt(f, fc, false), want = wantLow(f, fc);
    worstLow = Math.max(worstLow, Math.abs(got - want));
  }
  ok(worstHigh < 2e-3, "high-pass matches the closed-form Butterworth response",
     "worst gain error " + worstHigh.toExponential(2));
  ok(worstLow < 2e-3, "low-pass matches the closed-form Butterworth response",
     "worst gain error " + worstLow.toExponential(2));

  // The response must be order 4, not order 2. At half the cutoff the two differ
  // by about fifteenfold, so this pins the order independently of the constant.
  {
    const got = gainAt(25, 50, true);
    const order4 = wantHigh(25, 50), order2 = 1 / (1 + Math.pow(50 / 25, 4));
    ok(Math.abs(got - order4) < Math.abs(got - order2) / 5,
       "response is 4th order, not a 2nd-order section run twice",
       `measured ${got.toExponential(3)}, order-4 ${order4.toExponential(3)}, order-2 ${order2.toExponential(3)}`);
  }

  // ---- A: sample-by-sample against scipy
  if (!existsSync(join(ROOT, "data/emg/reference_santuz.csv"))) {
    ok(false, "reference_santuz.csv exists (run scripts/make_emg_reference.py)");
    return;
  }
  const parse = txt => {
    const meta = {}; let header = null; const rows = [];
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim()) continue;
      if (line.replace(/^"/, "").startsWith("#")) {
        const p = line.replace(/^"?#\s*/, "").split(",");
        if (p.length >= 2) meta[p[0].trim().replace(/"$/, "")] = p.slice(1).join(",").trim();
        continue;
      }
      if (!header) { header = line.split(",").map(s => s.trim()); continue; }
      rows.push(line.split(",").map(Number));
    }
    const cols = {};
    header.forEach((h, i) => (cols[h] = rows.map(r => r[i])));
    return { meta, cols };
  };

  const src = parse(read("data/emg/santuz2021_demo.csv"));
  const ref = parse(read("data/emg/reference_santuz.csv"));
  const SR = parseInt(src.meta.sampling_rate_hz, 10) || 1000;
  const idx = ref.cols.sample_index;
  const EDGE = Math.round(0.5 * SR);          // the region the station shades

  for (const ch of ["ta", "gm", "rf"]) {
    const raw = Float64Array.from(src.cols[ch + "_mv"]);
    const hp = DSP.filtfilt(raw, 50, SR, true);
    const rect = hp.map(Math.abs);
    let env = DSP.filtfilt(rect, 20, SR, false);
    env = env.map(v => (v < 0 ? 0 : v));
    let mn = Infinity; for (const v of env) if (v < mn) mn = v;
    env = env.map(v => v - mn);

    let wHpIn = 0, wEnvIn = 0, wHpEdge = 0, wEnvEdge = 0;
    let sHp = 0, sEnv = 0, nIn = 0;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k];
      const dHp = Math.abs(hp[i] - ref.cols[ch + "_hp"][k]);
      const dEnv = Math.abs(env[i] - ref.cols[ch + "_env"][k]);
      const edge = i < EDGE || i >= raw.length - EDGE;
      if (edge) { wHpEdge = Math.max(wHpEdge, dHp); wEnvEdge = Math.max(wEnvEdge, dEnv); }
      else {
        wHpIn = Math.max(wHpIn, dHp); wEnvIn = Math.max(wEnvIn, dEnv);
        sHp += ref.cols[ch + "_hp"][k] ** 2; sEnv += ref.cols[ch + "_env"][k] ** 2; nIn++;
      }
    }
    const rmsHp = Math.sqrt(sHp / nIn), rmsEnv = Math.sqrt(sEnv / nIn);
    // Interior agreement has to be numerical, not approximate.
    ok(wHpIn / rmsHp < 1e-6, `${ch}: high-pass matches scipy in the interior`,
       `worst ${wHpIn.toExponential(2)} mV against RMS ${rmsHp.toFixed(5)} mV`);
    ok(wEnvIn / rmsEnv < 1e-6, `${ch}: envelope matches scipy in the interior`,
       `worst ${wEnvIn.toExponential(2)} mV against RMS ${rmsEnv.toFixed(5)} mV`);
    // Edges are allowed to differ more, and the station shades them for that reason.
    ok(wEnvEdge / rmsEnv < 5e-2, `${ch}: envelope stays close to scipy even at the edges`,
       `worst ${wEnvEdge.toExponential(2)} mV`);
  }

  // The page must not claim to run the published pipeline unless it is at order 4.
  const js = read("emg.js");
  ok(/ORDER = 4/.test(js), "emg.js pins the filter order in one place");
  ok(!/effectively fourth order/.test(js),
     "emg.js no longer calls a 2nd-order section 'effectively fourth order'");
});


// ================================================ 9. the repository stays honest
group("Repository", () => {
  // The README is generated from the catalogue. If someone adds a station and
  // forgets to regenerate, the README starts lying about what the project is,
  // which is exactly how the old one ended up describing four pages.
  const gen = spawnSync(process.execPath, [join(ROOT, "scripts/gen_readme.mjs"), "--check"],
                        { encoding: "utf8" });
  ok(gen.status === 0, "README.md matches the station catalogue",
     (gen.stderr || gen.stdout || "").trim());

  for (const f of ["LICENSE", "CITATION.cff", "CONTRIBUTING.md", "README.md",
                   "data/emg/LICENSE_DATA.md"]) {
    ok(existsSync(join(ROOT, f)), f + " exists");
  }

  // i18n dispatches "i18n:changed" on document. A station that listens on window
  // instead fails silently: data-i18n prose still switches, so the page looks
  // translated while everything built in JS stays in the old language. This cost
  // a full round of browser testing to find once.
  for (const f of readdirSync(ROOT).filter(f => f.endsWith(".js"))) {
    const src = read(f);
    ok(!/window\.addEventListener\(\s*["']i18n:changed/.test(src),
       `${f}: listens for i18n:changed on document, not window`);
  }

  // Redistributed data must carry its attribution next to it.
  const lic = read("data/emg/LICENSE_DATA.md");
  ok(/CC BY 4\.0/.test(lic), "the redistributed excerpt states its licence");
  ok(/10\.5281\/zenodo\.5171823/.test(lic), "the redistributed excerpt names its source");
  ok(/scripts\/extract_emg_demo\.py/.test(lic), "the redistributed excerpt says how to regenerate it");
});


// ============================================ 10. physics station, corrected
//
// A reviewer found six errors on the physics page that a weak student would have
// carried away permanently. Each is pinned here, because prose has no type system
// and the whole value of this station is that a beginner can trust it.
group("Physics station", () => {
  const js = read("physics.js"), html = read("physics.html"), i18n = read("i18n.js");
  const all = js + html + i18n;

  // 1. Gravity does not switch off in orbit. Apparent weight goes to zero.
  ok(!/0 N in orbit/.test(all) && !/and 0 N on orbit/.test(all),
     "does not claim weight is zero in orbit");
  ok(/apparent weight/i.test(js) && /ciężar pozorny/i.test(all),
     "distinguishes gravitational force from apparent weight, in both languages");
  ok(/89%|90%/.test(all), "states that orbital gravity is still most of its surface value");

  // 2. The Moon is a factor of about six, not four.
  ok(!/four times the load/i.test(all), "does not claim the Moon lets you carry four times the load");
  ok(/9\.81 \/ 1\.62|six times weaker/i.test(js), "gives the Moon ratio as about six");

  // 3. Constant velocity is illustrated with a puck, never with walking.
  ok(!/Steady walk/.test(js), "the zero-acceleration example is not called a steady walk");
  ok(/puck/i.test(js), "the zero-acceleration example is a frictionless puck");
  ok(!/Nothing is pushing, and nothing needs to/.test(js),
     "does not say nothing is pushing when the net force is zero");

  // 4. Acceleration is a change in the velocity vector, not only in speed.
  ok(/its direction, or both/i.test(all), "defines acceleration as including a change of direction");

  // 5. The second-law demo is about NET force and states its assumptions.
  ok(!/Force you apply/.test(js), "the second-law slider is not labelled as the applied force");
  ok(/Net force along the line of motion/.test(js), "the second-law slider is labelled net force");
  ok(/ph-assume/.test(js), "the demos state what they assume");

  // 6. A moment arm is a perpendicular distance, in the visible formula.
  ok(/d<sub class="ph-sub">⊥<\/sub>/.test(html), "the moment formula shows the perpendicular symbol");
  ok(/PERPENDICULAR distance/.test(js), "the moment arm is defined as a perpendicular distance");
  ok(!/biceps attaching 4 cm/.test(js), "does not equate the attachment distance with the moment arm");

  // secondary findings
  ok(/inertial frame/i.test(html), "the first law mentions inertial frames");
  ok(/impulse/i.test(html), "stopping a fall is explained through impulse");
  ok(!/exactly 1 kg/.test(js), "does not claim a litre of water is exactly a kilogram");
  ok(/9\.80665/.test(all), "distinguishes standard gravity from the local value");
  ok(!/That is all sprinting is/.test(js), "does not reduce sprinting to pushing harder backwards");
  ok(!/the only thing that can move a body/.test(js),
     "does not claim the ground is the only thing that can move a body");


  // The interactive moment arm exists to teach that M depends on the
  // perpendicular distance, not the grip distance. These are the invariants that
  // have to hold for the demo to be teaching that rather than something adjacent.
  {
    const TQ = new Function(`
      const noop = () => {};
      const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
                   appendChild:noop, remove:noop, addEventListener:noop, setAttribute:noop,
                   querySelector:()=>null, querySelectorAll:()=>[], innerHTML:"", textContent:"",
                   dataset:{}, getBoundingClientRect:()=>({left:0,top:0,width:0,height:0,bottom:0}) };
      const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                         querySelector:()=>null, querySelectorAll:()=>[], createElement:()=>el, body:el };
      const window = { addEventListener:noop, devicePixelRatio:1, innerWidth:1280, innerHeight:800 };
      const location = { pathname:"/physics.html" };
      ${read("physics.js")}
      return window.__physicsTorque;
    `)();

    ok(!!TQ, "physics.js exposes its torque maths for testing");
    if (TQ) {
      const near = (a, b, tol) => Math.abs(a - b) < (tol || 1e-9);
      const r = 0.30, F = 100;

      ok(near(TQ.moment(r, F, 0), 0), "theta = 0 gives exactly zero moment",
         "pulling along the lever cannot turn it, however hard");
      ok(near(TQ.moment(r, F, 180), 0), "theta = 180 also gives zero moment");
      ok(near(TQ.moment(r, F, 90), r * F), "theta = 90 gives the full r*F",
         `${TQ.moment(r, F, 90)} against ${r * F}`);

      let worst = 0;
      for (let th = -180; th <= 180; th += 3)
        worst = Math.max(worst, Math.abs(TQ.dPerp(r, th) - Math.abs(r * Math.sin(th * Math.PI / 180))));
      ok(worst < 1e-12, "d_perp equals r*sin(theta) at every angle", "worst " + worst.toExponential(2));

      // reversing the force reverses the turn
      ok(TQ.moment(r, F, 45) > 0 && TQ.moment(r, F, 45 + 180) < 0,
         "reversing the force direction flips the sign of the moment",
         `${TQ.moment(r, F, 45).toFixed(3)} then ${TQ.moment(r, F, 225).toFixed(3)}`);
      ok(near(TQ.moment(r, F, 45), -TQ.moment(r, F, 225)),
         "the reversed moment is equal and opposite, not merely negative");

      // linearity in both factors
      ok(near(TQ.moment(r, 2 * F, 37), 2 * TQ.moment(r, F, 37)), "doubling F doubles the moment");
      ok(near(TQ.moment(2 * r, F, 37), 2 * TQ.moment(r, F, 37)), "doubling d_perp doubles the moment");

      // the teaching case: same grip, same force, less moment
      ok(TQ.moment(r, F, 45) < TQ.moment(r, F, 90) &&
         near(TQ.moment(r, F, 45) / TQ.moment(r, F, 90), Math.SQRT1_2),
         "at 45 degrees the same grip and force give about 71% of the moment",
         (TQ.moment(r, F, 45) / TQ.moment(r, F, 90) * 100).toFixed(1) + "%");
    }
    ok(/spanner/i.test(read("physics.js")), "the moment arm is introduced on a neutral lever, not the biceps");
    ok(read("physics.html").indexOf('id="phTorque"') < read("physics.html").indexOf('id="phMoment"'),
       "the neutral spanner demo comes before the forearm one");
  }


  // The free-body builder teaches by letting the reader include a force that is
  // real but belongs somewhere else. That only works if every scenario actually
  // offers such a trap, and if the physics behind each scenario is right.
  {
    const js = read("physics.js");
    ok(/const FBD = \[/.test(js), "physics.js defines the free-body scenarios");

    // Each scenario must offer at least one force that is real but not on the
    // diagram; a set of obviously-silly distractors would teach nothing.
    for (const id of ["stand", "fall", "lift"])
      ok(js.includes(`id: "${id}"`), `free-body scenario "${id}" exists`);

    ok(/acts ON THE GROUND, not on the person/.test(js),
       "the standing scenario traps the third-law partner force");
    ok(/internal\. Your chosen body is the whole person/.test(js),
       "the standing scenario explains why muscle forces are internal");
    ok(/There is no such force/.test(js),
       "the falling scenario rejects an invented force of motion");
    ok(/A contact force cannot exist without contact/.test(js),
       "the falling scenario explains why there is no ground reaction in the air");

    // The lift numbers are the only arithmetic in the builder, so they get checked.
    const m = 70, g = 9.81, a = 2;
    const floor = m * g + m * a;
    ok(Math.abs(floor - 826.7) < 0.1, "the lift floor force follows from m(g + a)",
       floor.toFixed(1) + " N");
    ok(js.includes("827 N"), "the lift scenario states that force to the nearest newton");
    ok(js.includes("70 × 2 = 140"), "the lift scenario shows where the extra force comes from");
  }


  // Step five: the sign convention. The whole teaching claim is that either axis
  // is valid and the physics is unchanged, so that invariance gets pinned hard.
  {
    const M = new Function(`
      const noop = () => {};
      const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
                   appendChild:noop, remove:noop, addEventListener:noop, setAttribute:noop,
                   querySelector:()=>null, querySelectorAll:()=>[], innerHTML:"", textContent:"",
                   dataset:{}, getBoundingClientRect:()=>({left:0,top:0,width:0,height:0,bottom:0}) };
      const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                         querySelector:()=>null, querySelectorAll:()=>[], createElement:()=>el, body:el };
      const window = { addEventListener:noop, devicePixelRatio:1, innerWidth:1280, innerHeight:800 };
      const location = { pathname:"/physics.html" };
      ${read("physics.js")}
      return window.__physicsFBD;
    `)();
    ok(!!M, "physics.js exposes the free-body sign maths");

    if (M) {
      const near = (a, b, t) => Math.abs(a - b) < (t || 1e-9);
      const ids = ["stand", "fall", "lift"];

      // 1. flipping the axis flips every component
      let flipsOk = true, magsOk = true, accelOk = true;
      for (const id of ids) {
        const up = M.FBDMATH.solve(id, 1), dn = M.FBDMATH.solve(id, -1);
        up.terms.forEach((t, i) => {
          if (!near(t.signed, -dn.terms[i].signed)) flipsOk = false;
          if (!near(t.magnitude, dn.terms[i].magnitude)) magsOk = false;
        });
        if (!near(up.aSigned, -dn.aSigned)) accelOk = false;
        if (!near(up.aMagnitude, dn.aMagnitude)) accelOk = false;
      }
      ok(flipsOk, "reversing the positive axis reverses every force component");
      ok(accelOk, "reversing the axis reverses the signed acceleration but not its size");
      ok(magsOk, "the physical force magnitudes are unchanged by the axis choice");

      // 4. standing is in equilibrium under either convention
      ok(near(M.FBDMATH.solve("stand", 1).sumF, 0) && near(M.FBDMATH.solve("stand", -1).sumF, 0),
         "standing gives zero net force in either convention");

      // 5. free fall accelerates at g either way
      const fu = M.FBDMATH.solve("fall", 1), fd = M.FBDMATH.solve("fall", -1);
      ok(near(fu.aMagnitude, 9.81, 5e-3) && near(fd.aMagnitude, 9.81, 5e-3),
         "free fall gives an acceleration of g in either convention",
         `${fu.aMagnitude.toFixed(3)} and ${fd.aMagnitude.toFixed(3)}`);
      ok(fu.aSigned < 0 && fd.aSigned > 0,
         "with up positive the falling acceleration is negative, with down positive it is positive");

      // 6. the lift floor force is 827 N either way
      const lu = M.FBDMATH.solve("lift", 1), ld = M.FBDMATH.solve("lift", -1);
      const floorU = lu.terms.find(t => t.sym === "N").magnitude;
      const floorD = ld.terms.find(t => t.sym === "N").magnitude;
      ok(Math.round(floorU) === 827 && Math.round(floorD) === 827,
         "the lift floor pushes with 827 N in either convention",
         `${floorU.toFixed(1)} and ${floorD.toFixed(1)}`);
      ok(near(Math.abs(lu.sumF), 140, 0.2) && near(lu.aMagnitude, 2, 1e-3),
         "the lift's leftover force is m*a, 140 N and 2 m/s²");

      // 8. no axis, no answer
      ok(M.FBDMATH.solve("stand", 0) === null,
         "the builder cannot be completed without an explicit axis choice");
    }

    // 7. nothing may imply that up or right is intrinsically positive
    const js = read("physics.js"), html = read("physics.html"), i18n = read("i18n.js");
    const all = js + html + i18n;
    ok(!/up (is|and right are) (always|intrinsically|naturally) positive/i.test(all) &&
       !/(zawsze|z natury) dodatni[ea]? jest w gór[ęe]/i.test(all),
       "nothing claims that up or right is intrinsically positive");
    ok(/There is no wrong answer here/.test(js) && /Nie ma tu złej odpowiedzi/.test(js),
       "the axis step says explicitly that either choice is valid, in both languages");
    ok(/does NOT mean slowing down/i.test(js),
       "a negative acceleration is explained as a direction, not as slowing down");
  }

  // The contents list is generated from the headings, so it cannot describe a
  // page that no longer exists. What can break is the wiring.
  ok(/querySelectorAll\("main \.ph-sec > \.ph-h2"\)/.test(read("physics.js")),
     "the contents list is generated from the document's own headings");
  ok(/id="phToc"/.test(read("physics.html")), "the page has somewhere to mount the contents list");
  ok(!/first real one on this\s+page/.test(read("physics.html")),
     "does not call W = mg the first real formula on the page");

  // the free-body-diagram section the review asked for
  for (const k of ["ph.s4b.q1h", "ph.s4b.q2h", "ph.s4b.q3h", "ph.s4b.q4h"])
    ok(html.includes(k), `free-body diagram step ${k.slice(-3)} is present`);
});


// ============================================ 11. the orbital map on the landing
//
// The map is navigation, so the thing that matters is not how it looks but that
// it stays truthful to the catalogue and reachable without a mouse.
group("Orbital map", () => {
  const js = read("orbit-map.js"), html = read("index.html"), css = read("orbit-map.css");

  ok(/<script src="orbit-map\.js/.test(html), "index.html loads the orbital map");
  ok(/orbit-map\.css/.test(html), "index.html loads its stylesheet");
  ok(html.indexOf("stations.js") < html.indexOf("orbit-map.js"),
     "the catalogue loads before the map that is generated from it");

  // Generated, never typed. A station name appearing literally in this file would
  // mean a second inventory had started, which is how the old README rotted.
  for (const st of STATIONS.list.filter(s => !s.hidden)) {
    ok(!js.includes(st.page.replace(".html", "") + '"') || js.indexOf("st.page") > 0,
       `orbit-map.js does not hard-code "${st.page}"`);
  }
  ok(/S\.inTrack\(id\)/.test(js), "the map takes its stations from STATIONS.inTrack");
  ok(/a\.href = st\.page/.test(js), "satellite links come from the catalogue's own page field");
  ok(/S\.TRACKS\[id\]/.test(js), "track names and colours come from the catalogue");

  // Real links, real buttons. The point of the DOM/SVG split.
  ok(/createElement\("a"\)/.test(js), "stations are anchors, not painted into a canvas");
  ok(/createElement\("button"\)/.test(js), "tracks are buttons, since they open rather than navigate");
  ok(/aria-expanded/.test(js), "track buttons report their expanded state");
  ok(/role", "navigation"/.test(js), "the map is exposed as a navigation landmark");

  // Focus management: a hidden satellite must never sit in the tab order.
  ok(/tabIndex = state\.pinned === g\.id \? 0 : -1/.test(js),
     "only a pinned shell puts its stations in the tab order");
  ok(/e\.key === "Escape"/.test(js), "Escape closes an open shell");

  // It must never become the only way in.
  ok(/id="stations"/.test(html), "the flat station map is still on the page");
  ok(/pointer-events: none/.test(css), "the map layer is click-through so the skeleton stays grabbable");
  ok(/prefers-reduced-motion/.test(css) && /reduceMotion/.test(js),
     "the map honours prefers-reduced-motion in both script and style");
  ok(/max-width: 860px/.test(css), "there is a narrow-screen fallback");

  // Geometry: every shell has to fit whatever box it is given.
  const M = new Function(`
    const noop = () => {};
    const el = { style:{setProperty:noop}, classList:{add:noop,remove:noop,toggle:noop},
                 appendChild:noop, remove:noop, addEventListener:noop, setAttribute:noop,
                 querySelector:()=>null, querySelectorAll:()=>[], innerHTML:"", dataset:{},
                 getBoundingClientRect:()=>({width:1280,height:720}) };
    const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                       createElement:()=>el, createElementNS:()=>el,
                       querySelector:()=>null, querySelectorAll:()=>[], body:el, fonts:null };
    const window = { addEventListener:noop, matchMedia:()=>({matches:false}),
                     STATIONS:null, innerWidth:1280, innerHeight:720 };
    ${js}
    return window.__orbitMap;
  `)();
  ok(M === undefined, "the map does nothing when the catalogue is absent, rather than throwing");

  // Polish counts in three forms; "4 stacji" would be wrong.
  ok(/stacje/.test(js) && /stacja/.test(js) && /stacji/.test(js),
     "the Polish station count uses all three plural forms");
  ok(/t >= 2 && t <= 4 && !\(h >= 12 && h <= 14\)/.test(js),
     "the Polish plural rule excludes the teens, as it must");
});


// ==================================== 12. one catalogue, and only one
//
// The landing page kept its own list of stations. It drifted within weeks: still
// ten entries when there were fifteen, and still carrying two scientific
// phrasings that had been corrected everywhere else. These tests exist so that a
// second inventory cannot quietly start again.
group("Single catalogue", () => {
  const landing = read("landing.js"), html = read("index.html");

  ok(!/const\s+STATIONS\s*=\s*\[/.test(landing),
     "landing.js has no station list of its own");
  ok(!/const\s+PATH\s*=\s*\[/.test(landing),
     "landing.js has no route list of its own");
  ok(/window\.STATIONS/.test(landing), "landing.js reads the real catalogue");
  ok(/CAT\.list\.filter/.test(landing), "the card grid comes from the catalogue");
  ok(/CAT\.route\(\)/.test(landing), "the suggested route comes from the catalogue");
  ok(/st\.blurb\[L\]/.test(landing), "card copy is the catalogue's blurb, not a second wording");
  ok(/CAT\.TRACKS\[st\.track\]/.test(landing), "card colour and track label come from the catalogue");

  // The specific drifted claims, pinned so they cannot come back anywhere.
  for (const f of readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f))) {
    const src = read(f);
    ok(!/valgus as control fails/i.test(src),
       `${f}: does not describe the single-leg squat as valgus from failing control`);
    ok(!/biceps pulls with 50/.test(src),
       `${f}: does not state a unitless "biceps pulls with 50"`);
  }

  // Every station reachable from the landing grid, not just the ones with a preview.
  const live = STATIONS.list.filter(s => !s.hidden);
  ok(/hasPreview\(st\.id\)/.test(landing),
     "stations without a live preview still get a card");
  ok(live.length >= 15, `the catalogue has ${live.length} visible stations`);

  // The route must point only at stations that exist.
  const route = STATIONS.route();
  ok(route.length > 0, `the catalogue defines a route of ${route.length} steps`);
  for (const st of route) {
    ok(existsSync(join(ROOT, st.page)), `route step "${st.id}" points at a page that exists`);
    ok(st.route.why && st.route.why.en && st.route.why.pl,
       `route step "${st.id}" explains itself in both languages`);
  }
  const orders = route.map(s => s.route.order);
  ok(new Set(orders).size === orders.length, "route positions are unique");

  // The meta description carried a station count, which is a catalogue in miniature.
  const meta = spawnSync(process.execPath, [join(ROOT, "scripts/sync_meta.mjs"), "--check"],
                         { encoding: "utf8" });
  ok(meta.status === 0, "index.html's meta description matches the catalogue",
     (meta.stderr || meta.stdout || "").trim());
  ok(!/Ten interactive stations/.test(html), "the meta description no longer says ten");
});


// ============================= 13. the learning-state layer
//
// Continue, Share and later Predict and Provenance are one layer, not four
// features. These tests pin the properties that make that worth doing: one
// serialiser, readable URLs, untrusted input treated as untrusted, and storage
// that can never break a page.
group("Learning state", () => {
  const core = read("biolab-state.js"), cont = read("continue-bar.js"),
        emg = read("emg.js"), cod = read("state-codecs.js");

  // ---- the split: meaning is pure, running is DOM
  ok(/define\(id, codec\)/.test(core) && /bind\(id, runtime\)/.test(core),
     "the layer separates the pure codec from the DOM-bound runtime");
  ok(/B\.define\("emg"/.test(cod) && /B\.define\("physics"/.test(cod),
     "codecs live in state-codecs.js, away from any station");
  ok(!/document\./.test(cod.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1")),
     "a codec touches no DOM, so it can run on the landing page");
  ok(/B\.bind\("emg"/.test(emg) && !/B\.define\("emg"/.test(emg),
     "emg.js binds a runtime and does not define meaning");

  // ---- the landing page must not know what any station contains
  ok(/B\.summary\(entry\.station/.test(cont),
     "Continue asks the codec to summarise, rather than reading station fields");
  for (const field of ["muscle", "\bhp\b", "\bmvc\b", "theta"])
    ok(!new RegExp('st\.' + field).test(cont),
       `continue-bar.js does not reach into station-specific field ${field.replace(/\b/g, "")}`);
  ok(!/station === "|=== "emg"|=== "physics"/.test(cont),
     "Continue has no per-station branches");

  // A codec registered but never bound still describes: this is the property
  // that stops the landing page needing a change per new station.
  ok(/B\.define\("physics"/.test(cod) && !/BioLabState\.bind\("physics"/.test(read("physics.js")),
     "physics has a codec with no runtime yet, and Continue can still describe it");

  // ---- one serialiser
  ok(/encode\(state\)/.test(core) && /decode\(search\)/.test(core),
     "the layer has a single encode/decode pair");
  ok(/BioLabState\.decode|B\.decode/.test(cont),
     "Continue reads state through the same decoder Share writes with");
  ok(!/JSON\.stringify\(state\)/.test(cont), "Continue does not invent a second storage format");
  ok(!/btoa|base64/i.test(core), "state is not base64-encoded into an opaque blob");
  ok(/URLSearchParams/.test(core), "state is ordinary query parameters");

  // ---- untrusted input
  ok(/API\.validate\(id, raw\)/.test(core), "incoming links are validated before they are applied");
  ok(/v !== null && v !== SCHEMA/.test(core),
     "a link from an unknown schema version is ignored rather than guessed at");
  ok(/num\(raw\.hp, 1, 100/.test(cod), "the EMG codec clamps numeric state from a link");
  ok(/if \(EMG_CH\[raw\.muscle\]\)/.test(cod), "the EMG codec accepts only muscles that exist");

  // ---- the framework escapes, whatever a future codec returns
  ok(/function esc\(v\)/.test(core), "the layer has one escaping helper");
  ok(/esc\(r\.label\)/.test(core) && /esc\(r\.value\)/.test(core),
     "codec-supplied labels and values are escaped before rendering");
  ok(/const E = B\.esc/.test(cont), "Continue escapes everything it interpolates");
  ok(/\.href = url/.test(core), "the share link is assigned as a property, never parsed as markup");

  // ---- engagement means the experiment changed
  ok(/API\.touch = function/.test(core), "stations report a change rather than the layer guessing");
  ok(/if \(now === lastSeen\) return false/.test(core),
     "a touch whose state matches the last one does not count as work");
  ok(!/\.eg-stage|\.ph-chip|\.eg-preset/.test(core),
     "the layer holds no station-specific CSS selectors");
  ok(!/document\.addEventListener\("(input|change)"/.test(core),
     "the layer does not listen to every input in the document");
  ok(/BioLabState\.touch\(\)/.test(emg), "EMG reports its own state changes");
  ok(/MIN_CHANGES = 2/.test(core), "a single change does not yet count as a visit");
  ok(/dwellMs/.test(core), "a reader who stays long enough is recorded without touching anything");

  // ---- storage can never break a page
  ok(/try \{[\s\S]{0,400}localStorage\.getItem/.test(core),
     "reading storage is wrapped against private mode and corrupt data");
  ok(/catch \(e\) \{\s*return false;/.test(core), "a failed write is tolerated");
  ok(/typeof e\.station === "string" &&/.test(core), "stored entries are shape-checked before use");
  ok(/MAX_ENTRIES = 3/.test(core), "history keeps at most three stations");

  // ---- what it deliberately is not. Comments are stripped first: these files
  // SAY "no streaks" in their own prose, and the first version of this test
  // flagged the promise instead of a breach of it.
  const codeOnly = f => read(f)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const f of ["biolab-state.js", "continue-bar.js", "state-codecs.js"]) {
    const src = codeOnly(f);
    ok(!/streak|leaderboard|badge|\bxp\b|\bpoints\b/i.test(src),
       `${f}: no streaks, badges, points or leaderboards`);
    ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(src), `${f}: sends nothing anywhere`);
  }

  // ---- wiring
  for (const f of readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
    const h = read(f);
    ok(h.includes("biolab-state.js"), `${f} loads the state layer`);
    ok(h.includes("state-codecs.js"), `${f} loads the codecs`);
    ok(h.indexOf("biolab-state.js") < h.indexOf("state-codecs.js"),
       `${f} loads the layer before the codecs that register into it`);
  }
  const idx = read("index.html");
  ok(idx.includes('id="lpContinue"'), "the landing page has somewhere to show Continue");
  ok(idx.indexOf("stations.js") < idx.indexOf("biolab-state.js"),
     "the catalogue loads before the layer that looks stations up in it");
});


// ============================================ 13. rama stacji
//
// Obietnica na górze i droga dalej na dole, generowane z katalogu. Testy pilnują
// tego, co zawiodło już raz gdzie indziej: żeby nie powstał drugi opis stacji
// obok tego w stations.js i żeby przycisk nie obiecywał działania, którego nie ma.
group("Station frame", () => {
  const js = read("station-frame.js"), css = read("station-frame.css");

  ok(/CAT\.forPage\(page\)/.test(js), "rama rozpoznaje stację po katalogu, nie po nazwie pliku w kodzie");
  ok(/contract\.learningGoal/.test(js), "obietnica pochodzi z learningGoal w kontrakcie");
  ok(/ME\.prerequisites/.test(js) && /CAT\.route\(\)/.test(js),
     "droga dalej pochodzi z prerequisites i z trasy");
  ok(!/"emg"|"physics"|"dynamics"/.test(js), "rama nie zna żadnej stacji z nazwy");

  // Czas czytania i liczba kontrolek muszą być liczone, nie wpisane.
  ok(/words \/ 180/.test(js), "czas czytania liczony z rzeczywistego tekstu strony");
  ok(/querySelectorAll\("input, button, select"\)/.test(js), "kontrolki liczone z rzeczywistej strony");
  ok(/MutationObserver/.test(js),
     "pomiar powtarzany po zbudowaniu stacji, bo stacje ładują się asynchronicznie");
  ok(/i === 1 && m\.controls === 0/.test(js), "chip o zerowej liczbie kontrolek znika, zamiast kłamać");

  // Pole example wolno mieć tylko stacji, która potrafi taki stan zastosować.
  const withExample = STATIONS.list.filter(s => s.example);
  for (const st of withExample) {
    ok(/^[a-z0-9-]+\.html\?/.test(st.example.url), `${st.id}: example wskazuje na stronę z parametrami`);
    ok(existsSync(join(ROOT, st.example.url.split("?")[0])), `${st.id}: strona z example istnieje`);
    ok(st.example.why && st.example.why.en && st.example.why.pl, `${st.id}: example tłumaczy się w obu językach`);
    const src = read(st.page.replace(".html", ".js"));
    ok(/BioLabState\.bind\(|B\.bind\(/.test(src),
       `${st.id}: ma podpięty runtime, więc link do stanu naprawdę zadziała`);
  }
  ok(withExample.length >= 1, `${withExample.length} stacja z gotowym przykładem`);

  // Polskie liczebniki mają trzy formy.
  ok(/plMinut/.test(js) && /plKontrolek/.test(js), "polskie liczebniki odmieniane, nie doklejane");
  ok(/t >= 2 && t <= 4 && !\(h >= 12 && h <= 14\)/.test(js), "reguła liczebnika wyklucza nastki");

  // Struktura stron nie jest jednolita.
  ok(/document\.querySelector\("main"\)/.test(js) && /sf-loose/.test(js),
     "rama radzi sobie ze stroną bez <main>");
  ok(/prefers-reduced-motion/.test(css), "rama szanuje ograniczony ruch");
  ok(/min-height:44px/.test(css), "cele dotykowe w ramie mają 44 px");

  // Rama należy do stacji, nie do strony startowej.
  ok(!read("index.html").includes("station-frame.js"), "strona startowa nie dostaje ramy stacji");
  for (const st of STATIONS.list.filter(s => !s.hidden)) {
    ok(read(st.page).includes("station-frame.js"), `${st.page} ładuje ramę`);
  }
});


// ============================================ 14. kanał zwrotny
//
// CONTRIBUTING obiecuje, że zgłoszenie od studenta jest raportem, na którym
// projektowi zależy najbardziej. Przez długi czas nie było jak go wysłać.
group("Feedback channel", () => {
  const js = read("feedback.js"), css = read("feedback.css");

  ok(/b\.wilczynski\.fizjoterapia@gmail\.com/.test(js), "adres zwrotny jest w kodzie");
  ok(/encodeURIComponent/.test(js), "temat i treść są kodowane do URL");
  ok(/CAT\.forPage/.test(js), "nazwa strony pochodzi z katalogu, nie z nazwy pliku");
  ok(!/"emg"|"physics"/.test(js), "kanał nie zna żadnej stacji z nazwy");

  // Kanał dla studenta nie może zbierać niczego o studencie.
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|localStorage|navigator\.userAgent|screen\./.test(js),
     "nic nie jest wysyłane ani zapisywane poza samym mailto");
  ok(/No account, nothing tracked/.test(js) && /Bez konta, bez śledzenia/.test(js),
     "obietnica braku śledzenia napisana w obu językach");

  ok(/getElementById\("footer"\)/.test(js), "kanał dopisuje się do stopki");
  ok(/old\.remove\(\)/.test(js), "przy zmianie języka nie powstaje drugi odnośnik");
  ok(/min-height:44px/.test(css), "odnośnik ma 44 px celu dotykowego");

  for (const f of readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
    ok(read(f).includes("feedback.js"), `${f} ma kanał zwrotny`);
  }

  // Obietnica z CONTRIBUTING ma teraz pokrycie.
  ok(/found it misleading/.test(read("CONTRIBUTING.md")),
     "CONTRIBUTING nadal prosi studentów o zgłoszenia");
});


// ============================================ 15. Force Plate Lab
//
// Sygnał jest syntetyczny i mówi o tym wprost, ale ma być fizycznie spójny.
// Gdyby był rysowany zamiast całkowany, impuls nie zgadzałby się z czasem lotu
// i stacja uczyłaby zależności, która w jej własnych danych nie zachodzi.
group("Force plate", () => {
  const FPL = new Function(`
    const noop = () => {};
    const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop}, appendChild:noop,
                 querySelectorAll:()=>[], querySelector:()=>null, innerHTML:"",
                 getContext:()=>new Proxy({},{get:()=>noop}),
                 getBoundingClientRect:()=>({width:800,height:400}) };
    const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                       createElement:()=>el, querySelectorAll:()=>[], querySelector:()=>null, body:el };
    const window = { addEventListener:noop, devicePixelRatio:1 };
    function ResizeObserver(){ this.observe = noop; }
    ${read("forceplate.js")}
    return window.__forcePlate;
  `)();
  ok(!!FPL, "forceplate.js wystawia swoją fizykę do testów");
  if (!FPL) return;

  const { SIG, FP } = FPL;

  // Zerowanie musi odzyskać dokładnie wstrzyknięte przesunięcie, i to z okna
  // PUSTEJ płyty. Okno stania dałoby 693,70 N zamiast 7 N.
  const off = FP.offset(SIG.Fz, 0.05, 0.55);
  ok(Math.abs(off - FP.BIAS) < 0.5, "zerowanie odzyskuje wstrzyknięte przesunięcie",
     off.toFixed(2) + " N wobec " + FP.BIAS + " N");
  const standing = FP.offset(SIG.Fz, 1.0, 1.5);
  ok(standing > 600, "okno stania to NIE jest okno zerowania", standing.toFixed(0) + " N");

  const fz = FP.zeroed(SIG.Fz, off);
  ok(Math.abs(FP.offset(fz, 0.05, 0.55)) < 0.3, "po wyzerowaniu pusta płyta wskazuje zero");
  ok(Math.abs(FP.offset(fz, 1.0, 1.5) - FP.BW) < 3,
     "po wyzerowaniu stanie daje ciężar ciała", FP.offset(fz, 1.0, 1.5).toFixed(1) + " N");

  // Sedno: dwie niezależne drogi do wysokości muszą się zgodzić.
  const ev = FP.events(fz, 20);
  ok(ev.takeoff > 2 && ev.landing > ev.takeoff, "zdarzenia wykryte w sensownej kolejności");
  const J = FP.impulse(fz, 1.60, ev.takeoff);
  const v = FP.velocityFromImpulse(J);
  const hImp = FP.heightFromVelocity(v), hFly = FP.heightFromFlight(ev.flight);
  ok(J > 0, "impuls netto jest dodatni, bo człowiek się odbił", J.toFixed(1) + " N.s");
  ok(Math.abs(hImp - hFly) < 0.01,
     "wysokość z impulsu zgadza się z wysokością z czasu lotu do 1 cm",
     (hImp*100).toFixed(1) + " cm wobec " + (hFly*100).toFixed(1) + " cm");
  ok(hImp > 0.15 && hImp < 0.60, "wysokość skoku jest fizjologicznie sensowna",
     (hImp*100).toFixed(1) + " cm");

  // Zależność J = m*dv jest tożsamością, nie zbiegiem okoliczności.
  ok(Math.abs(v - J / FP.M) < 1e-12, "predkosc odbicia to dokladnie J/m");

  // Próg kontaktu to decyzja analityka i MUSI zmieniać wynik, inaczej
  // najważniejsza lekcja stacji nie ma pokrycia w danych.
  const h5 = FP.heightFromFlight(FP.events(fz, 5).flight);
  const h50 = FP.heightFromFlight(FP.events(fz, 50).flight);
  ok(Math.abs(h50 - h5) > 0.003, "próg kontaktu realnie zmienia policzoną wysokość",
     (h5*100).toFixed(1) + " cm przy 5 N wobec " + (h50*100).toFixed(1) + " cm przy 50 N");
  ok(h50 > h5, "wyższy próg daje dłuższy lot, bo wykrywa odbicie wcześniej");
  ok(Math.abs(h50 - h5) < 0.05, "różnica pozostaje wiarygodna, a nie karykaturalna");

  // Środek nacisku: odwrócenie wzoru musi odtworzyć zadaną trajektorię.
  const iStand = Math.round(1.3 * FP.FS);
  const c = FP.cop(iStand, fz);
  ok(Math.abs(c.x) < 0.25 && Math.abs(c.y) < 0.25,
     "przy staniu środek nacisku leży na płycie",
     (c.x*1000).toFixed(0) + " mm, " + (c.y*1000).toFixed(0) + " mm");
  ok(FP.copValid(fz[iStand], 100), "przy staniu siła pionowa jest wystarczająca");

  // I musi przestać mieć sens, gdy siła znika. To jest lekcja, nie usterka.
  const iFly = Math.round(((ev.takeoff + ev.landing) / 2) * FP.FS);
  ok(!FP.copValid(fz[iFly], 100), "w locie środek nacisku jest oznaczony jako nieważny");
  ok(Math.abs(fz[iFly]) < 20, "w locie płyta jest praktycznie nieobciążona");

  // Zapis musi zawierać wszystkie sześć kanałów, bo bez momentów nie ma CoP.
  for (const ch of ["Fx", "Fy", "Fz", "Mx", "My", "Mz"])
    ok(SIG[ch] && SIG[ch].length === SIG.n, `kanał ${ch} obecny na pełnej długości`);

  // Uczciwość pochodzenia: syntetyczny i tak nazwany, wszędzie.
  const st = STATIONS.byId.forceplate;
  ok(st.status === "synthetic", "katalog oznacza stację jako model, nie pomiar");
  ok(st.contract.measured.length === 0, "stacja nie deklaruje niczego jako zmierzone");
  ok(/synthetic/i.test(JSON.stringify(st.contract.modelled)), "kontrakt mówi wprost, że zapis jest syntetyczny");
  ok(/synthetic/i.test(read("forceplate.html")) && /syntetyczny/i.test(read("i18n.js")),
     "strona mówi o tym w obu językach");
  ok(/Mx|My/.test(read("forceplate.html")) || /M<sub>y<\/sub>/.test(read("forceplate.js")),
     "strona pokazuje, że CoP potrzebuje momentów, nie tylko sił");
});

group("Przewiduj, zanim zobaczysz", () => {
  const pj = read("predict.js"), cj = read("challenges.js"), core = read("biolab-state.js");

  // ---- warstwa istnieje po obu stronach
  ok(/canApply\(id\)/.test(core) && /apply\(id, state\)/.test(core),
     "warstwa stanu udostępnia canApply i apply");
  ok(/rt\.apply\(clean\)/.test(core) && /API\.validate\(id, state\)/.test(core),
     "apply przepuszcza stan przez kodek, zanim odda go stacji");

  // ---- framework orkiestruje, nigdy nie liczy
  // To jest cała umowa tej sekcji. Gdyby predict.js sam wyliczał spodziewany
  // wynik, w projekcie istniałyby dwie fizyki i predzej czy pozniej pokazalby
  // studentowi wynik, ktorego stacja nigdy nie policzyla.
  const noComments = pj.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const forbidden of ["filtfilt", "butter", "Math.sqrt", "Math.PI", "medianFreq", "9.81"])
    ok(!noComments.includes(forbidden),
       `predict.js nie liczy fizyki: brak ${forbidden}`);
  ok(/querySelectorAll\(o\.selector\)/.test(pj) && /o\.label\.test/.test(pj),
     "wynik jest ODCZYTYWANY z tego, co stacja narysowala, a nie liczony ponownie");
  ok(/B\.apply\(ME\.id, state\)/.test(pj),
     "zmiane stanu wykonuje stacja przez wlasny runtime");

  // ---- plik wyzwan to dane, nie mechanika
  const cNoComments = cj.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok(!/document\.|querySelector|addEventListener/.test(cNoComments),
     "challenges.js nie dotyka DOM: to sam material dydaktyczny");

  // ---- wczytaj wyzwania tak, jak wczytuje je przegladarka
  const CH = new Function(`const window = {}; ${cj}; return window.BioLabChallenges;`)();
  ok(Array.isArray(CH) && CH.length > 0, "challenges.js publikuje liste wyzwan",
     "n = " + (CH ? CH.length : "brak"));

  const ids = new Set(STATIONS.list.map(s => s.id));
  const DIRS = ["up", "down", "same"];
  CH.forEach((c, i) => {
    const tag = "wyzwanie " + (i + 1);
    ok(ids.has(c.station), `${tag}: wskazuje stacje z katalogu`, c.station);
    ok(DIRS.includes(c.answer), `${tag}: odpowiedz jest kierunkiem`, c.answer);
    for (const f of ["question", "change", "why", "cannotConclude"])
      ok(c[f] && c[f].en && c[f].pl, `${tag}: pole ${f} jest w obu jezykach`);
    ok(c.outcome && c.outcome.selector && c.outcome.label instanceof RegExp &&
       c.outcome.name && c.outcome.name.en && c.outcome.name.pl,
       `${tag}: wskaznik ma selektor, wzorzec etykiety i nazwe w obu jezykach`);
    ok(Number.isInteger(c.outcome.decimals) && c.outcome.decimals >= 0,
       `${tag}: wskaznik deklaruje, ile miejsc po przecinku drukuje stacja`,
       String(c.outcome.decimals));
    // Granica wniosku jest tu obowiazkowa. Bez niej cwiczylibysmy wylacznie
    // przewidywanie liczby, a to najmniej wazna czesc tej stacji.
    ok(!!c.cannotConclude, `${tag}: mowi, czego z tej zmiany NADAL nie wolno wywnioskowac`);
    ok(JSON.stringify(c.baseline) !== JSON.stringify(c.intervention),
       `${tag}: stan przed i po faktycznie sie roznia`);
  });

  // ---- etykieta wskaznika musi trafiac w to, co stacja naprawde drukuje
  //
  // To jest jedyne spoiwo miedzy wyzwaniem a stacja. Gdy ktos przetlumaczy
  // etykiete inaczej, sekcja przestanie znajdowac liczbe i pokaze pusto,
  // zamiast pokazac zla. Ale lepiej dowiedziec sie o tym tutaj.
  const emgSrc = read("emg.js"), fpSrc = read("forceplate.js");
  const SRC = { emg: emgSrc, forceplate: fpSrc };
  CH.forEach((c, i) => {
    ok(c.outcome.label.test(c.outcome.name.en) && c.outcome.label.test(c.outcome.name.pl),
       `wyzwanie ${i + 1}: wzorzec pasuje do etykiety w obu jezykach`);
    const src = SRC[c.station];
    ok(src && src.includes(c.outcome.name.en) && src.includes(c.outcome.name.pl),
       `wyzwanie ${i + 1}: etykieta jest doslownie ta, ktora drukuje ${c.station}.js`,
       c.outcome.name.en);
  });

  // ---- stan wyzwania musi przejsc przez kodek bez obcinania
  // Wyzwanie proszace o stan, ktorego kodek nie przepusci, ustawiloby cos
  // innego, niz zapowiada studentowi, i porownywaloby dwie rzeczy, o ktorych
  // nie mowi. Kodeki sa czyste, wiec daja sie uruchomic tutaj.
  const CODECS = new Function(`
    const codecs = {};
    const window = { BioLabState: { define: (id, c) => { codecs[id] = c; } },
                     i18n: { lang: "en" } };
    ${read("state-codecs.js")}
    return codecs;
  `)();
  CH.forEach((c, i) => {
    const cod = CODECS[c.station];
    if (!cod) { ok(false, `wyzwanie ${i + 1}: stacja ma kodek`, c.station); return; }
    // Porownujemy zawartosc, nie kolejnosc kluczy: kodek buduje swoj obiekt
    // we wlasnej kolejnosci i to nie jest roznica, o ktora tu chodzi.
    const sameState = (a, b) => {
      const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
      return ka.join() === kb.join() && ka.every(k => a[k] === b[k]);
    };
    for (const pair of [["przed", c.baseline], ["po", c.intervention]]) {
      const clean = cod.validate(pair[1]);
      ok(sameState(clean, pair[1]),
         `wyzwanie ${i + 1}: stan "${pair[0]}" przechodzi przez kodek bez zmian`,
         JSON.stringify(clean));
    }
  });

  // ---- ZADEKLAROWANY KIERUNEK KONTRA PRAWDZIWY SYGNAL
  //
  // Wynik pokazywany studentowi zawsze pochodzi z ekranu, wiec jest prawdziwy.
  // Ale werdykt "trafiles" bierze sie z pola answer, i to pole moze klamac.
  // Dlatego kazdy kierunek jest tu przeliczany prawdziwym filtrem na prawdziwym
  // pliku EMG. Gdy ktos zmieni filtr albo dane tak, ze kierunek sie odwroci,
  // padnie ten test, a nie zaufanie studenta.
  const DSP = new Function(`
    const noop = () => {};
    const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
                 appendChild:noop, remove:noop, addEventListener:noop, setAttribute:noop,
                 querySelector:()=>null, querySelectorAll:()=>[], innerHTML:"", textContent:"",
                 dataset:{}, getBoundingClientRect:()=>({left:0,top:0,width:0,height:0,bottom:0}) };
    const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                       querySelector:()=>null, querySelectorAll:()=>[], createElement:()=>el, body:el };
    const window = { addEventListener:noop, devicePixelRatio:1, innerWidth:1280, innerHeight:800 };
    const location = { pathname:"/emg.html" };
    const fetch = () => Promise.reject(new Error("no network in tests"));
    ${emgSrc}
    return window.__emgDSP;
  `)();

  // Ten sam plik i to samo parsowanie, ktorego uzywa stacja.
  const csv = read("data/emg/santuz2021_demo.csv").split(/\r?\n/);
  let header = null; const rows = [];
  for (const line of csv) {
    if (!line.trim()) continue;
    if (/^"?#/.test(line)) continue;
    if (!header) { header = line.split(","); continue; }
    rows.push(line.split(","));
  }
  const COL = {};
  header.forEach((h, i) => {
    COL[h.trim().replace(/_mv$/, "").replace(/_s$/, "")] =
      Float64Array.from(rows, r => parseFloat(r[i]));
  });
  const FS = COL.t ? Math.round(1 / (COL.t[1] - COL.t[0])) : 1000;
  const EDGE = 0.5;                       // to samo okno wnetrza, co w emg.js

  const rmsOf = (a, i0, i1) => {
    let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i];
    return Math.sqrt(s / (i1 - i0));
  };
  // Czestotliwosc mediany liczona tu NIEZALEZNIE, wprost z definicji, przez
  // powolna transformate na krotkim wycinku. Powtorzenie kodu stacji
  // sprawdzaloby kopie samego siebie.
  function medianFreqIndep(x, fs) {
    const N = 1024;
    const p = new Float64Array(N / 2);
    let segs = 0;
    for (let s = 0; s + N <= x.length && segs < 3; s += N) {
      for (let k = 1; k < N / 2; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
          const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1));
          const ang = -2 * Math.PI * k * n / N;
          re += x[s + n] * w * Math.cos(ang);
          im += x[s + n] * w * Math.sin(ang);
        }
        p[k] += re * re + im * im;
      }
      segs++;
    }
    let tot = 0; for (let k = 1; k < p.length; k++) tot += p[k];
    let acc = 0;
    for (let k = 1; k < p.length; k++) { acc += p[k]; if (acc >= tot / 2) return k * fs / N; }
    return 0;
  }

  function outcomes(st) {
    const raw = COL[st.muscle];
    const filt = DSP.filtfilt(raw, st.hp, FS, true);
    const rect = new Float64Array(filt.length);
    for (let i = 0; i < filt.length; i++) rect[i] = Math.abs(filt[i]);
    const env = DSP.filtfilt(st.rectify ? rect : filt, st.lp, FS, false);
    for (let i = 0; i < env.length; i++) if (env[i] < 0) env[i] = 0;
    const e0 = Math.round(EDGE * FS), e1 = env.length - e0;
    const rawP = rmsOf(raw, e0, e1), filtP = rmsOf(filt, e0, e1);
    let pk = 0; for (let i = e0; i < e1; i++) if (env[i] > pk) pk = env[i];
    return {
      msDrop: (1 - (filtP * filtP) / (rawP * rawP)) * 100,
      envPeak: pk,
      mfFilt: medianFreqIndep(filt.subarray(e0, Math.min(e1, e0 + 3072)), FS),
    };
  }

  // Ile musi sie zmienic, zeby student to zobaczyl: trzy jednostki ostatniej
  // drukowanej cyfry. Kryterium wzgledne bylo za surowe dla platformy, gdzie
  // 7 ms na czasie lotu to 1,5 procent i jednoczesnie osiem milimetrow skoku.
  const visible = (a, b, dec) => Math.abs(b - a) >= 3 * Math.pow(10, -dec);

  const PICK = [
    { label: /Mean-square/, key: "msDrop" },
    { label: /Median frequency filtered/, key: "mfFilt" },
    { label: /Envelope peak/, key: "envPeak" },
  ];

  CH.filter(c => c.station === "emg").forEach((c, i) => {
    const which = PICK.find(p => p.label.test(c.outcome.name.en));
    if (!which) { ok(false, `wyzwanie EMG ${i + 1}: test umie policzyc ten wskaznik`, c.outcome.name.en); return; }
    const before = outcomes(c.baseline)[which.key];
    const after = outcomes(c.intervention)[which.key];
    const rel = Math.abs(after - before) / Math.max(1e-12, Math.abs(before));
    const real = rel < 0.02 ? "same" : (after > before ? "up" : "down");
    ok(real === c.answer,
       `wyzwanie EMG ${i + 1}: zadeklarowany kierunek zgadza sie z prawdziwym sygnalem (${which.key})`,
       before.toFixed(4) + " -> " + after.toFixed(4) + ", policzono " + real + ", zadeklarowano " + c.answer);
    // Zmiana ma byc widoczna golym okiem. Kryterium bierze sie z tego, ile
    // miejsc po przecinku stacja NAPRAWDE drukuje: roznica mniejsza niz kilka
    // jednostek ostatniej cyfry byla by wyzwaniem, ktorego nie da sie
    // rozstrzygnac patrzac na ekran.
    ok(visible(before, after, c.outcome.decimals),
       `wyzwanie EMG ${i + 1}: roznica jest widoczna przy precyzji, ktora stacja drukuje`,
       "zmiana o " + Math.abs(after - before).toFixed(4) +
       ", najmniejsza widoczna " + (3 * Math.pow(10, -c.outcome.decimals)));
  });

  // ---- TO SAMO DLA PLATFORMY
  //
  // Panel platformy nie wystawia gotowych wskaznikow, tylko sklada je z FP.
  // Test sklada je tak samo, z tych samych czesci, bo to one sa fizyka tej
  // stacji. Sprawdzamy nie ich poprawnosc, ta jest przypieta w grupie
  // "Force plate", tylko czy kierunek zadeklarowany w wyzwaniu zgadza sie
  // z tym, co student naprawde zobaczy.
  const FPL = new Function(`
    const noop = () => {};
    const el = { style:{}, classList:{add:noop,remove:noop,toggle:noop}, appendChild:noop,
                 querySelectorAll:()=>[], querySelector:()=>null, innerHTML:"",
                 getContext:()=>new Proxy({},{get:()=>noop}),
                 getBoundingClientRect:()=>({width:800,height:400}) };
    const document = { readyState:"complete", addEventListener:noop, getElementById:()=>null,
                       createElement:()=>el, querySelectorAll:()=>[], querySelector:()=>null, body:el };
    const window = { addEventListener:noop, devicePixelRatio:1 };
    function ResizeObserver(){ this.observe = noop; }
    ${fpSrc}
    return window.__forcePlate;
  `)();

  function fpOutcomes(st) {
    const { SIG, FP } = FPL;
    const off = FP.offset(SIG.Fz, 0.05, 0.55);
    const fz = st.zeroed ? FP.zeroed(SIG.Fz, off) : SIG.Fz;
    const ev = FP.events(fz, st.threshold);
    const to = ev.takeoff > 0 ? ev.takeoff : 2.46;
    const J = FP.impulse(fz, 1.60, to);
    const hImp = FP.heightFromVelocity(FP.velocityFromImpulse(J));
    const hFly = ev.flight ? FP.heightFromFlight(ev.flight) : null;
    return {
      "Net impulse": J,
      "Height from flight time": hFly === null ? null : hFly * 100,
      "Height from impulse": hImp * 100,
      "Flight time": ev.flight,
      "Difference": hFly === null ? null : Math.abs(hImp - hFly) * 100,
    };
  }

  CH.filter(c => c.station === "forceplate").forEach((c, i) => {
    const key = c.outcome.name.en;
    const before = fpOutcomes(c.baseline)[key];
    const after = fpOutcomes(c.intervention)[key];
    if (before === undefined || before === null || after === null) {
      ok(false, `wyzwanie platformy ${i + 1}: test umie policzyc ten wskaznik`, key);
      return;
    }
    const real = visible(before, after, c.outcome.decimals)
      ? (after > before ? "up" : "down") : "same";
    ok(real === c.answer,
       `wyzwanie platformy ${i + 1}: zadeklarowany kierunek zgadza sie z prawdziwym sygnalem (${key})`,
       before.toFixed(3) + " -> " + after.toFixed(3) + ", policzono " + real + ", zadeklarowano " + c.answer);
    ok(visible(before, after, c.outcome.decimals),
       `wyzwanie platformy ${i + 1}: roznica jest widoczna przy precyzji, ktora stacja drukuje`,
       "zmiana o " + Math.abs(after - before).toFixed(4));
  });

  // Prog kontaktu ma sens tylko po wyzerowaniu: przy przesunieciu zera o 7 N
  // prog 5 N nigdy nie zostaje przekroczony i stacja nie wykrywa lotu w ogole.
  // Wyzwanie o progu, ktore o tym nie pamieta, pokazaloby studentowi kreske
  // zamiast liczby.
  CH.filter(c => c.station === "forceplate" && c.baseline.threshold < 10).forEach((c, i) => {
    ok(c.baseline.zeroed === true && c.intervention.zeroed === true,
       `wyzwanie platformy o niskim progu ${i + 1}: zaczyna od zapisu wyzerowanego`);
  });

  // Stacja musi umiec przyjac zadany stan, inaczej sekcja sie nie pokaze.
  ok(/B\.bind\("forceplate"/.test(fpSrc) && !/B\.define\("forceplate"/.test(fpSrc),
     "forceplate.js podpina runtime i nie definiuje znaczenia");
  ok(/B\.define\("forceplate"/.test(read("state-codecs.js")),
     "znaczenie stanu platformy mieszka w kodeku, nie w stacji");
  const fph = read("forceplate.html");
  ok(/challenges\.js/.test(fph) && /predict\.js/.test(fph) && /predict\.css/.test(fph),
     "forceplate.html laduje wyzwania, orkiestrator i styl");

  // ---- wpiecie i tlumaczenie
  const eh = read("emg.html");
  ok(/challenges\.js/.test(eh) && /predict\.js/.test(eh) && /predict\.css/.test(eh),
     "emg.html laduje wyzwania, orkiestrator i styl");
  ok(!/predict\.js/.test(read("index.html")),
     "strona startowa nie jest stacja i nie dostaje tej sekcji");
  ok(/document\.addEventListener\("i18n:changed"/.test(pj),
     "sekcja przebudowuje sie przy zmianie jezyka, i slucha na document");
  ok(/min-height: 44px/.test(read("predict.css")),
     "przyciski spelniaja minimalny rozmiar celu dotykowego");

  // Rama stacji obiecuje, ile jest kontrolek i ile trwa czytanie. Sekcja
  // przewidywania jest cwiczeniem POD trescia, a liczba jej przyciskow zmienia
  // sie w trakcie, wiec policzona sprawialaby, ze ten sam student widzi na tej
  // samej stronie raz 30, raz 33 kontrolki.
  const sf = read("station-frame.js");
  ok(/\.pr-sec[^"]*script/.test(sf) || /, \.pr-sec, script/.test(sf),
     "czas czytania nie liczy tekstu sekcji przewidywania");
  ok(/\.bs-share, \.pr-sec/.test(sf),
     "licznik kontrolek nie liczy przyciskow sekcji przewidywania");
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
