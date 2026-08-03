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

  // the free-body-diagram section the review asked for
  for (const k of ["ph.s4b.q1h", "ph.s4b.q2h", "ph.s4b.q3h", "ph.s4b.q4h"])
    ok(html.includes(k), `free-body diagram step ${k.slice(-3)} is present`);
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
