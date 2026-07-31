// Motion Lab — landing page.
//
// Every station panel renders a LIVE miniature of the page it opens, driven by the
// same MOVEMENTS data (data.js) and the same runtime (runtime.js) as the real thing.
// One requestAnimationFrame loop drives all of them; an IntersectionObserver means
// offscreen panels cost nothing, and prefers-reduced-motion renders a single frame.
//
// The hero starfield and its orbiting satellites come from orbit-wasm.js — a
// hand-assembled WebAssembly module (with a JS fallback).

const PL = () => window.i18n && window.i18n.lang === "pl";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// walking state we can sample cheaply for the mini figures
const WALK = MOVEMENTS.walk;
const WALK_S = computeScales(WALK, WALK.param.default);

// ============================================================
//  mini stick figure
// ============================================================
const SEGM = { thigh: .30, shank: .29, foot: .11, trunk: .34, neck: .05, head: .062, arm: .27 };

function poseFigure(st, cx, groundY, S) {
  const D = Math.PI / 180;
  const hipY = groundY - (SEGM.thigh + SEGM.shank) * S + (st.hipDrop || 0) * S * 0.5;
  const hip = { x: cx, y: hipY };
  const ha = st.hipAngle * D;
  const knee = { x: hip.x + Math.sin(ha) * SEGM.thigh * S, y: hip.y + Math.cos(ha) * SEGM.thigh * S };
  const sa = (st.hipAngle - st.kneeAngle) * D;
  const ankle = { x: knee.x + Math.sin(sa) * SEGM.shank * S, y: knee.y + Math.cos(sa) * SEGM.shank * S };
  const fa = (st.ankleAngle || 0) * D;
  const toe = { x: ankle.x + Math.cos(fa) * SEGM.foot * S, y: ankle.y + Math.sin(-fa) * SEGM.foot * S * 0.5 + 2 };
  const tl = (st.trunkLean || 0) * D;
  const sh = { x: hip.x - Math.sin(tl) * SEGM.trunk * S, y: hip.y - Math.cos(tl) * SEGM.trunk * S };
  const head = { x: sh.x - Math.sin(tl) * SEGM.neck * S, y: sh.y - Math.cos(tl) * SEGM.neck * S };
  const hand = { x: sh.x + Math.sin(-ha * 0.6) * SEGM.arm * S, y: sh.y + Math.cos(ha * 0.6) * SEGM.arm * S };
  return { hip, knee, ankle, toe, sh, head, hand };
}

function drawFigure(ctx, P, color, width, headR) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(P.toe.x, P.toe.y); ctx.lineTo(P.ankle.x, P.ankle.y);
  ctx.lineTo(P.knee.x, P.knee.y); ctx.lineTo(P.hip.x, P.hip.y);
  ctx.lineTo(P.sh.x, P.sh.y);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(P.sh.x, P.sh.y); ctx.lineTo(P.hand.x, P.hand.y); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(P.head.x, P.head.y, headR, 0, 7); ctx.fill();
}

function ground(ctx, W, H, y, color) {
  ctx.strokeStyle = color || "rgba(94,234,212,.20)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .08, y); ctx.lineTo(W * .92, y); ctx.stroke();
}

// ============================================================
//  station previews  — (ctx, W, H, t)  t = 0..1 loop phase
// ============================================================
const PREVIEW = {
  // walking figure with its force trace drawing itself underneath
  explorer(ctx, W, H, t) {
    const gy = H * .70, S = H * .80;
    ground(ctx, W, H, gy);
    const st = liveState(WALK, WALK_S, t * 100);
    drawFigure(ctx, poseFigure(st, W * .40, gy, S), "#e8edf7", 2.1, H * .050);
    // GRF trace: the whole cycle drawn faint, the part already walked drawn bright,
    // so a paused panel still reads as a complete curve
    const x0 = W * .10, x1 = W * .90, yb = H * .93, hh = H * .20;
    const px = i => x0 + (i / 100) * (x1 - x0);
    const py = g => yb - Math.min(g, 1.3) / 1.3 * hh;
    ctx.strokeStyle = "rgba(94,234,212,.22)"; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const g = liveState(WALK, WALK_S, i).grf;
      i ? ctx.lineTo(px(i), py(g)) : ctx.moveTo(px(i), py(g));
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(94,234,212,.95)"; ctx.lineWidth = 1.9; ctx.beginPath();
    const n = Math.max(1, Math.round(t * 100));
    for (let i = 0; i <= n; i++) {
      const g = liveState(WALK, WALK_S, i).grf;
      i ? ctx.lineTo(px(i), py(g)) : ctx.moveTo(px(i), py(g));
    }
    ctx.stroke();
    const g = st.grf;
    ctx.fillStyle = "#5eead4";
    ctx.beginPath(); ctx.arc(x0 + t * (x1 - x0), yb - Math.min(g, 1.3) / 1.3 * hh, 2.6, 0, 7); ctx.fill();
  },

  // guided lesson: figure plus a phase ring sweeping the cycle
  lesson(ctx, W, H, t) {
    const gy = H * .78, S = H * .74;
    const cx = W * .5, cy = H * .52, R = Math.min(W, H) * .40;
    ctx.strokeStyle = "rgba(124,155,255,.18)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#7c9bff"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2); ctx.stroke();
    // stance/swing marker at 62%
    const a62 = -Math.PI / 2 + .62 * Math.PI * 2;
    ctx.strokeStyle = "rgba(94,234,212,.9)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a62) * (R - 9), cy + Math.sin(a62) * (R - 9));
    ctx.lineTo(cx + Math.cos(a62) * (R + 9), cy + Math.sin(a62) * (R + 9));
    ctx.stroke();
    const st = liveState(WALK, WALK_S, t * 100);
    drawFigure(ctx, poseFigure(st, cx, gy, S), "#e8edf7", 2, H * .046);
  },

  // gait lab: typical on the left, the same person with foot drop on the right —
  // side by side rather than overlaid, which is unreadable at thumbnail size
  sandbox(ctx, W, H, t) {
    const gy = H * .76, S = H * .70;
    ground(ctx, W, H, gy, "rgba(255,180,60,.20)");
    const st = liveState(WALK, WALK_S, t * 100);
    drawFigure(ctx, poseFigure(st, W * .32, gy, S), "rgba(148,163,184,.55)", 2.4, H * .046);
    const d = { ...st };
    if (st.grf <= 0.06) { d.ankleAngle -= 24; d.hipAngle += 11; d.kneeAngle += 22; }
    else d.ankleAngle -= 9;
    drawFigure(ctx, poseFigure(d, W * .68, gy, S), "#ffb43c", 2.8, H * .046);
    ctx.fillStyle = "rgba(148,163,184,.6)"; ctx.font = "600 8px 'Space Grotesk',sans-serif";
    ctx.fillText("typical", W * .32 - 15, H * .93);
    ctx.fillStyle = "#ffb43c";
    ctx.fillText("foot drop", W * .68 - 20, H * .93);
  },

  // real mocap: perspective floor + figure
  gait3d(ctx, W, H, t) {
    const gy = H * .76;
    ctx.strokeStyle = "rgba(124,155,255,.30)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const f = i / 6, y = gy + f * f * H * .22;
      ctx.beginPath(); ctx.moveTo(W * .5 - (W * .46) * (0.3 + f), y);
      ctx.lineTo(W * .5 + (W * .46) * (0.3 + f), y); ctx.stroke();
    }
    const off = ((t * 1.4) % 1) - .2;
    for (let i = -1; i <= 5; i++) {
      const f = (i + off) / 5;
      if (f < 0 || f > 1) continue;
      const x = W * .5 + (f - .5) * W * 1.5;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(W * .5 + (x - W * .5) * 2.1, gy + H * .22); ctx.stroke();
    }
    const st = liveState(WALK, WALK_S, t * 100);
    const st2 = liveState(WALK, WALK_S, t * 100 + 50);
    drawFigure(ctx, poseFigure(st2, W * .5, gy, H * .80), "rgba(232,237,247,.28)", 2.6, H * .048);
    drawFigure(ctx, poseFigure(st, W * .5, gy, H * .80), "#e8edf7", 2.6, H * .052);
  },

  // anatomy: torso with muscle groups lighting by real activation
  body3d(ctx, W, H, t) {
    const cx = W * .5, gy = H * .82, S = H * .80;
    const st = liveState(WALK, WALK_S, t * 100);
    const P = poseFigure(st, cx, gy, S);
    const glow = (p, q, name, col) => {
      const a = muscleActivationAt(WALK, WALK_S, name, t * 100);
      ctx.strokeStyle = col.replace("A", (0.18 + a * 0.8).toFixed(2));
      ctx.lineWidth = 4 + a * 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    };
    glow(P.hip, P.knee, "Quadriceps", "rgba(255,111,94,A)");
    glow(P.knee, P.ankle, "Gastroc / Soleus", "rgba(94,234,212,A)");
    glow(P.hip, P.sh, "Gluteus Maximus", "rgba(255,180,60,A)");
    drawFigure(ctx, P, "rgba(232,237,247,.85)", 1.6, H * .046);
  },

  // the forge: GRF particles spraying from the contact foot
  lab(ctx, W, H, t) {
    const gy = H * .74, S = H * .78, cx = W * .46;
    ground(ctx, W, H, gy, "rgba(94,234,212,.25)");
    const st = liveState(WALK, WALK_S, t * 100);
    const P = poseFigure(st, cx, gy, S);
    if (st.grf > .04) {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const seed = (i * 41) % 97;
        const age = ((seed / 97) + t * 2.4) % 1;
        const spread = ((seed % 19) - 9) / 9;
        const px = P.ankle.x + spread * 26 * age;
        const py = gy - age * (0.35 + st.grf * 0.65) * H * .60;
        const a = (1 - age) * (0.35 + st.grf * 0.65);
        ctx.fillStyle = `rgba(94,234,212,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(px, py, 2.6 * (1 - age * .45), 0, 7); ctx.fill();
      }
      // the resultant force vector itself
      ctx.strokeStyle = `rgba(94,234,212,${(0.35 + st.grf * 0.5).toFixed(2)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(P.ankle.x, gy); ctx.lineTo(P.ankle.x, gy - st.grf * H * .42); ctx.stroke();
    }
    drawFigure(ctx, P, "#e8edf7", 2.2, H * .048);
  },

  // levers: the elbow as a third-class lever, load cycling
  muscle(ctx, W, H, t) {
    const ex = W * .20, ey = H * .56;
    const load = 3 + 9 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));   // 3–12 kg
    const L = W * .60, d = W * .095;
    const F = load * (L / d);                                       // biceps force, kg-equivalent
    // upper arm + forearm
    ctx.lineCap = "round";
    ctx.strokeStyle = "#39435c"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(ex - 5, ey - H * .40); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + L, ey); ctx.stroke();
    // biceps — thickness tracks the force it has to make
    ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = Math.min(11, 3 + F * .085);
    ctx.beginPath(); ctx.moveTo(ex - 2, ey - H * .35); ctx.lineTo(ex + d, ey); ctx.stroke();
    const arrow = (x, y, dy, col, w) => {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dy); ctx.stroke();
      const s = Math.sign(dy);
      ctx.beginPath(); ctx.moveTo(x, y + dy);
      ctx.lineTo(x - 4, y + dy - s * 6); ctx.lineTo(x + 4, y + dy - s * 6);
      ctx.closePath(); ctx.fill();
    };
    // muscle pull (up, huge) vs the weight (down, small) — the whole point of the page
    arrow(ex + d, ey - 8, -Math.min(H * .44, F * H * .0062), "#ff6f5e", 2.4);
    arrow(ex + L, ey + 8, Math.min(H * .30, load * H * .021), "#7c9bff", 2.4);
    // dumbbell
    ctx.fillStyle = "#c7d0e0";
    ctx.beginPath(); ctx.arc(ex + L, ey, 5.5, 0, 7); ctx.fill();
    // pivot
    ctx.fillStyle = "#0a0e17"; ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, 7); ctx.fill(); ctx.stroke();
    // live ratio readout
    ctx.fillStyle = "#ff6f5e"; ctx.font = "700 11px 'Space Grotesk',sans-serif";
    ctx.fillText(Math.round(F) + " kg", ex + d + 8, ey - Math.min(H * .44, F * H * .0062) - 4);
    ctx.fillStyle = "#7c9bff";
    ctx.fillText(load.toFixed(0) + " kg", ex + L - 12, ey + Math.min(H * .30, load * H * .021) + 16);
  },

  // dyno: the length–tension curve with the operating point sweeping
  dyno(ctx, W, H, t) {
    const x0 = W * .12, x1 = W * .90, yb = H * .84, yt = H * .16;
    const X = l => x0 + (l - .5) / 1.2 * (x1 - x0);
    const Y = f => yb - Math.min(f, 1.6) / 1.6 * (yb - yt);
    const afl = l => Math.exp(-((l - 1) ** 2) / (2 * .04));
    const pfl = l => l <= 1 ? 0 : Math.min(1.6, (Math.exp(5 * (l - 1)) - 1) / (Math.exp(3) - 1));
    ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) { const y = yt + (yb - yt) * i / 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    const plot = (fn, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const l = .5 + i / 60 * 1.2; i ? ctx.lineTo(X(l), Y(fn(l))) : ctx.moveTo(X(l), Y(fn(l))); }
      ctx.stroke();
    };
    plot(afl, "rgba(124,155,255,.85)", 1.7);
    plot(pfl, "rgba(94,234,212,.85)", 1.7);
    plot(l => afl(l) + pfl(l), "#ff6f5e", 2.3);
    const l = .62 + .96 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
    const tot = afl(l) + pfl(l);
    ctx.strokeStyle = "rgba(232,237,247,.35)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(l), yb); ctx.lineTo(X(l), Y(tot)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ff6f5e"; ctx.beginPath(); ctx.arc(X(l), Y(tot), 3.4, 0, 7); ctx.fill();
  },

  // spine: a vertebral column flexing forward, the loaded disc glowing with pressure
  spine(ctx, W, H, t) {
    const f = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);          // 0 upright → 1 stooped
    const hip = { x: W * .38, y: H * .68 };
    const lean = f * 58 * Math.PI / 180;
    const trunkL = H * .44;
    ground(ctx, W, H, H * .92, "rgba(255,180,60,.20)");
    ctx.lineCap = "round";
    // legs
    ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(hip.x - W * .01, H * .92); ctx.stroke();
    // vertebral column: 7 blocks stepping up the (curving) trunk line
    const N = 7;
    const pt = u => {
      const bend = lean * (0.45 + 0.55 * u);                  // more flexion higher up
      return { x: hip.x + Math.sin(bend) * trunkL * u, y: hip.y - Math.cos(bend) * trunkL * u, a: bend };
    };
    for (let i = 1; i <= N; i++) {
      const p = pt(i / N);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = i === 1 ? "#c7d0e0" : "#e8edf7";
      const w = 9 - i * 0.35, h = 5.4;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 1.6); ctx.fill();
      ctx.restore();
    }
    const top = pt(1);
    // head
    ctx.fillStyle = "#e8edf7";
    ctx.beginPath();
    ctx.arc(top.x + Math.sin(lean) * H * .085, top.y - Math.cos(lean) * H * .085, H * .055, 0, 7);
    ctx.fill();
    // arms reaching to the load
    const hand = { x: top.x + Math.sin(lean) * H * .06 + f * W * .10, y: top.y + H * .16 };
    ctx.strokeStyle = "rgba(232,237,247,.75)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
    // the box, appearing as the lift begins
    if (f > .28) {
      const a = Math.min(1, (f - .28) * 2.4);
      ctx.fillStyle = `rgba(255,111,94,${(a * .28).toFixed(2)})`;
      ctx.strokeStyle = `rgba(255,111,94,${a.toFixed(2)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(hand.x - 8, hand.y, 16, 16, 2); ctx.fill(); ctx.stroke();
    }
    // the L4/5 disc, coloured by pressure
    const mpa = 0.5 + f * 1.8;
    const q = Math.min(1, (mpa - 0.5) / 1.8);
    const col = q < .5 ? `rgb(${Math.round(94 + q * 322)},${Math.round(234 - q * 108)},${Math.round(212 - q * 304)})`
                       : `rgb(255,${Math.round(180 - (q - .5) * 138)},${Math.round(60 - (q - .5) * 12)})`;
    const disc = pt(0.14);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 6 + q * 18; ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(disc.x, disc.y, 7, 3.2, disc.a, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = col; ctx.font = "700 11px 'Space Grotesk',sans-serif";
    ctx.fillText(mpa.toFixed(1) + " MPa", W * .60, H * .30);
  },

  // knee control: front view, knee drifting medially into valgus
  sls(ctx, W, H, t) {
    const dip = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
    const ctrl = 0.15 + 0.75 * dip;
    const cx = W * .5, gy = H * .86, hipY = H * .30 + dip * H * .17;
    const footX = cx - W * .045;
    const kneeX = cx - W * .045 + ctrl * dip * W * .105;      // medial drift
    const kneeY = (hipY + gy) / 2 + dip * H * .045;
    const drop = dip * ctrl * H * .045;
    const hipL = { x: cx - W * .075, y: hipY }, hipR = { x: cx + W * .075, y: hipY + drop };
    ground(ctx, W, H, gy, "rgba(94,234,212,.20)");
    // alignment reference hip → foot
    ctx.strokeStyle = "rgba(100,112,146,.75)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hipL.x, hipL.y); ctx.lineTo(footX, gy); ctx.stroke(); ctx.setLineDash([]);
    // pelvis + trunk
    ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hipL.x, hipL.y); ctx.lineTo(hipR.x, hipR.y); ctx.stroke();
    const mid = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 };
    const lean = ctrl * dip * W * .035;
    ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(mid.x - lean, mid.y - H * .20); ctx.stroke();
    ctx.fillStyle = "#e8edf7";
    ctx.beginPath(); ctx.arc(mid.x - lean, mid.y - H * .26, H * .050, 0, 7); ctx.fill();
    // lifted leg, folded up out of the way
    ctx.strokeStyle = "rgba(232,237,247,.30)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hipR.x, hipR.y);
    ctx.lineTo(hipR.x + W * .055, hipR.y + H * .13);
    ctx.lineTo(hipR.x + W * .02, hipR.y + H * .24); ctx.stroke();
    // stance leg, coloured by how far the knee has drifted medially
    const q = ctrl * dip;
    const col = q < .30 ? "#5eead4" : q < .58 ? "#ffb43c" : "#ff6f5e";
    ctx.strokeStyle = col; ctx.lineWidth = 4.2; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(hipL.x, hipL.y); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, gy); ctx.stroke();
    // joints
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(kneeX, kneeY, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#e8edf7";
    ctx.beginPath(); ctx.arc(hipL.x, hipL.y, 3.4, 0, 7); ctx.fill();
    // foot
    ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(footX - W * .022, gy); ctx.lineTo(footX + W * .022, gy); ctx.stroke();
    // how far off the hip→foot line the knee actually is
    ctx.fillStyle = col; ctx.font = "700 10px 'Space Grotesk',sans-serif";
    ctx.fillText(Math.round(q * 20) + "°", W * .70, H * .30);
  },
};

// ============================================================
//  station definitions
// ============================================================
const STATIONS = [
  { id: "explorer", href: "explorer.html#explorer", emoji: "🧭", c: "#5eead4",
    tag: { en: "Core", pl: "Rdzeń" },
    title: { en: "The Explorer", pl: "Eksplorator" },
    desc: { en: "Four movements, three signals. Scrub a gait cycle and watch force, joint angles and muscle activity move together.",
            pl: "Cztery ruchy, trzy sygnały. Przewijaj cykl chodu i patrz, jak siła, kąty stawowe i aktywność mięśni poruszają się razem." } },

  { id: "lesson", href: "lesson.html", emoji: "📖", c: "#7c9bff",
    tag: { en: "Start here", pl: "Zacznij tu" },
    title: { en: "Anatomy of a Step", pl: "Anatomia kroku" },
    desc: { en: "A guided scroll through one walking step — heel strike to heel strike, one phase at a time.",
            pl: "Prowadzona wędrówka przez jeden krok — od kontaktu pięty do kontaktu pięty, faza po fazie." } },

  { id: "sandbox", href: "sandbox.html", emoji: "🦿", c: "#ffb43c",
    tag: { en: "Clinical", pl: "Klinika" },
    title: { en: "Gait Lab", pl: "Gait Lab" },
    desc: { en: "Switch on a deficit — foot drop, weak quadriceps, a painful limb — and watch the compensation appear.",
            pl: "Włącz deficyt — opadanie stopy, słaby czworogłowy, bolesną kończynę — i patrz, jak pojawia się kompensacja." } },

  { id: "gait3d", href: "gait3d.html", emoji: "🚶", c: "#7c9bff",
    tag: { en: "Motion capture", pl: "Mocap" },
    title: { en: "Real Gait", pl: "Prawdziwy chód" },
    desc: { en: "A rigged 3-D body walking on measured joint angles from 42 adults. No canned animation.",
            pl: "Oszkieletowane ciało 3-D chodzące na zmierzonych kątach stawowych 42 osób. Żadnej gotowej animacji." } },

  { id: "body3d", href: "body3d.html", emoji: "🦴", c: "#ff6f5e",
    tag: { en: "3-D anatomy", pl: "Anatomia 3-D" },
    title: { en: "The Anatomy", pl: "Anatomia" },
    desc: { en: "An orbitable body with muscle volumes lighting up to real EMG as it moves.",
            pl: "Obracalne ciało z objętościami mięśni rozświetlanymi rzeczywistym EMG podczas ruchu." } },

  { id: "lab", href: "lab.html", emoji: "⚡", c: "#5eead4",
    tag: { en: "Physics", pl: "Fizyka" },
    title: { en: "The Forge", pl: "Kuźnia" },
    desc: { en: "The same forces, rendered as physics particles — ground reaction sprayed from the foot at every contact.",
            pl: "Te same siły, pokazane jako cząstki fizyczne — reakcja podłoża tryskająca spod stopy przy każdym kontakcie." } },

  { id: "muscle", href: "muscle.html", emoji: "💪", c: "#ff6f5e",
    tag: { en: "Mechanics", pl: "Mechanika" },
    title: { en: "Muscle Levers", pl: "Dźwignie mięśniowe" },
    desc: { en: "Hold 5 kg and your biceps pulls with 50. Drag the moment arm and watch the price a joint pays for speed.",
            pl: "Trzymasz 5 kg, a biceps ciągnie z siłą 50. Przesuń ramię momentu i zobacz, czym staw płaci za prędkość." } },

  { id: "dyno", href: "dyno.html", emoji: "🔬", c: "#5eead4",
    tag: { en: "Physiology", pl: "Fizjologia" },
    title: { en: "Muscle Dyno", pl: "Muscle Dyno" },
    desc: { en: "Length–tension and force–velocity, with the Hill model running as real Ruby compiled to WebAssembly.",
            pl: "Długość–napięcie i siła–prędkość, z modelem Hilla działającym jako prawdziwy Ruby skompilowany do WebAssembly." } },

  { id: "spine", href: "spine.html", emoji: "🩻", c: "#ffb43c",
    tag: { en: "Evidence", pl: "Dowody" },
    title: { en: "Spine Under Load", pl: "Kręgosłup pod obciążeniem" },
    desc: { en: "Disc pressure across postures — and the famous textbook claim that a modern re-measurement overturned.",
            pl: "Ciśnienie w krążku w różnych pozycjach — i słynne podręcznikowe twierdzenie obalone przez nowoczesny pomiar." } },

  { id: "sls", href: "sls.html", emoji: "🦵", c: "#ff6f5e",
    tag: { en: "Screening", pl: "Przesiew" },
    title: { en: "Knee Control", pl: "Kontrola kolana" },
    desc: { en: "The single-leg squat, in 3-D — watch the knee cave into dynamic valgus as control fails.",
            pl: "Przysiad na jednej nodze w 3-D — patrz, jak kolano zapada się w dynamiczną koślawość, gdy zawodzi kontrola." } },
];

const PATH = [
  { href: "lesson.html", k: { en: "Anatomy of a Step", pl: "Anatomia kroku" },
    t: { en: "build the vocabulary — phases, rockers, what a gait cycle even is",
         pl: "zbuduj słownictwo — fazy, przetoczenia, czym w ogóle jest cykl chodu" } },
  { href: "explorer.html#explorer", k: { en: "The Explorer", pl: "Eksplorator" },
    t: { en: "put numbers on it, and compare walking against running and jumping",
         pl: "przypisz temu liczby i porównaj chód z biegiem oraz skokiem" } },
  { href: "muscle.html", k: { en: "Levers", pl: "Dźwignie" },
    t: { en: "why the forces inside a joint dwarf the load you are actually holding",
         pl: "dlaczego siły wewnątrz stawu są wielokrotnie większe od trzymanego ciężaru" } },
  { href: "dyno.html", k: { en: "Muscle Dyno", pl: "Muscle Dyno" },
    t: { en: "the other half of the answer — why joint angle changes muscle strength",
         pl: "druga połowa odpowiedzi — dlaczego kąt stawu zmienia siłę mięśnia" } },
  { href: "sandbox.html", k: { en: "Gait Lab", pl: "Gait Lab" },
    t: { en: "now break something, and predict the compensation before you look",
         pl: "teraz coś zepsuj i przewidź kompensację, zanim spojrzysz" } },
  { href: "spine.html", k: { en: "Spine Under Load", pl: "Kręgosłup pod obciążeniem" },
    t: { en: "finish on evidence quality — how much a famous number is really worth",
         pl: "zakończ na jakości dowodów — ile naprawdę warta jest słynna liczba" } },
];

// ============================================================
//  build the DOM
// ============================================================
const grid = document.getElementById("lpGrid");
const cards = [];

function buildGrid() {
  grid.innerHTML = ""; cards.length = 0;
  const L = PL() ? "pl" : "en";
  STATIONS.forEach(s => {
    const a = document.createElement("a");
    a.className = "lp-card"; a.href = s.href; a.style.setProperty("--c", s.c);
    a.innerHTML =
      `<div class="lp-canvas-wrap"><span class="lp-tag">${s.tag[L]}</span><canvas></canvas></div>` +
      `<div class="lp-card-body">` +
        `<h3 class="lp-card-title"><span class="lp-emoji">${s.emoji}</span>${s.title[L]}</h3>` +
        `<p class="lp-card-desc">${s.desc[L]}</p>` +
        `<span class="lp-card-go">${PL() ? "Otwórz" : "Open"}` +
          `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">` +
          `<path d="M5 12h14M13 6l6 6-6 6"/></svg></span>` +
      `</div>`;
    grid.appendChild(a);
    // visible defaults to TRUE: the IntersectionObserver is an optimisation that switches
    // offscreen panels off, never the thing that switches them on. If IO is missing or
    // misbehaves the grid still animates correctly — it just costs a little more CPU.
    cards.push({ el: a, canvas: a.querySelector("canvas"), draw: PREVIEW[s.id], visible: true, phase: Math.random() });
  });
  observeCards();
  sizeCanvases();
}

function buildPath() {
  const ol = document.getElementById("lpPath");
  const L = PL() ? "pl" : "en";
  ol.innerHTML = PATH.map((p, i) =>
    `<li><span class="lp-path-num">${i + 1}</span>` +
    `<span class="lp-path-txt"><a href="${p.href}">${p.k[L]}</a> — ${p.t[L]}</span></li>`).join("");
}

// ============================================================
//  canvas sizing + visibility
// ============================================================
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

function sizeCanvases() {
  const d = DPR();
  cards.forEach(c => {
    const r = c.canvas.getBoundingClientRect();
    if (!r.width) return;
    c.canvas.width = Math.round(r.width * d);
    c.canvas.height = Math.round(r.height * d);
    c.w = r.width; c.h = r.height;
  });
}

let io = null;
function observeCards() {
  if (typeof IntersectionObserver !== "function") return;   // no IO → everything stays on
  if (io) io.disconnect();
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const c = cards.find(x => x.el === e.target);
      if (c) c.visible = e.isIntersecting;
    });
  }, { rootMargin: "120px" });
  cards.forEach(c => io.observe(c.el));
}

// ============================================================
//  starfield + orbital satellites (wasm)
// ============================================================
const sky = document.getElementById("starfield");
const skyCtx = sky.getContext("2d");
let core = null, skyW = 0, skyH = 0;

function sizeSky() {
  const d = DPR();
  const r = sky.getBoundingClientRect();
  skyW = r.width; skyH = r.height;
  sky.width = Math.round(skyW * d); sky.height = Math.round(skyH * d);
  skyCtx.setTransform(d, 0, 0, d, 0, 0);
  if (core) core.init(0x2f6e5b, starCount(), 5, skyW, skyH);
}
const starCount = () => (skyW < 700 ? 150 : 300);

function drawSky() {
  skyCtx.clearRect(0, 0, skyW, skyH);
  if (!core) return;
  for (const s of core.stars()) {
    const tw = 0.55 + 0.45 * Math.sin(s.tw * Math.PI * 2);
    skyCtx.globalAlpha = (0.16 + s.d * 0.62) * tw;
    skyCtx.fillStyle = s.d > .82 ? "#cfe4ff" : "#8fa6c8";
    const r = s.d * 1.25;
    skyCtx.fillRect(s.x, s.y, r, r);
  }
  skyCtx.globalAlpha = 1;
  // satellites on true orbits, with a soft halo
  for (const b of core.bodies()) {
    const g = skyCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 26 * b.m);
    g.addColorStop(0, "rgba(94,234,212,.36)");
    g.addColorStop(1, "rgba(94,234,212,0)");
    skyCtx.fillStyle = g;
    skyCtx.beginPath(); skyCtx.arc(b.x, b.y, 26 * b.m, 0, 7); skyCtx.fill();
    skyCtx.fillStyle = "#bff7ec";
    skyCtx.beginPath(); skyCtx.arc(b.x, b.y, 1.1 + b.r * .5, 0, 7); skyCtx.fill();
  }
}

// ============================================================
//  main loop
// ============================================================
let last = null;
function frame(ts) {
  if (last == null) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.05); last = ts;

  if (core) { core.step(dt, skyW, skyH); drawSky(); }

  cards.forEach(c => {
    if (!c.visible || !c.draw || !c.w) return;
    c.phase = (c.phase + dt * 0.34) % 1;
    const ctx = c.canvas.getContext("2d");
    ctx.setTransform(DPR(), 0, 0, DPR(), 0, 0);
    ctx.clearRect(0, 0, c.w, c.h);
    c.draw(ctx, c.w, c.h, c.phase);
  });

  requestAnimationFrame(frame);
}

function drawOnce() {
  if (core) drawSky();
  cards.forEach(c => {
    if (!c.draw || !c.w) return;
    const ctx = c.canvas.getContext("2d");
    ctx.setTransform(DPR(), 0, 0, DPR(), 0, 0);
    ctx.clearRect(0, 0, c.w, c.h);
    c.draw(ctx, c.w, c.h, 0.28);
  });
}

// ============================================================
//  engine card
// ============================================================
function initEngineCard() {
  const chip = document.getElementById("engineChip");
  const bytes = document.getElementById("engineBytes");
  const toggle = document.getElementById("engineToggle");
  const pre = document.getElementById("engineSrc");
  bytes.textContent = window.OrbitCore.byteLength;
  pre.querySelector("code").textContent = window.OrbitCore.wat;
  const setChip = () => {
    const wasm = core && core.engine === "wasm";
    chip.className = "lp-engine-chip" + (wasm ? " wasm" : "");
    chip.textContent = wasm
      ? (PL() ? "aktywne · WebAssembly" : "live · WebAssembly")
      : (PL() ? "rezerwowy silnik JS" : "JavaScript fallback");
  };
  setChip();
  document.addEventListener("i18n:changed", setChip);
  toggle.addEventListener("click", () => {
    const open = !pre.hidden;
    pre.hidden = open;
    toggle.textContent = open
      ? (PL() ? "Pokaż mi kod źródłowy" : "Show me the source")
      : (PL() ? "Ukryj kod źródłowy" : "Hide the source");
  });
  document.addEventListener("i18n:changed", () => {
    toggle.textContent = pre.hidden
      ? (PL() ? "Pokaż mi kod źródłowy" : "Show me the source")
      : (PL() ? "Ukryj kod źródłowy" : "Hide the source");
  });
}

// ============================================================
//  boot
// ============================================================
let resizeT = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { sizeSky(); sizeCanvases(); if (reduceMotion) drawOnce(); }, 140);
});
document.addEventListener("i18n:changed", () => { buildGrid(); buildPath(); if (reduceMotion) drawOnce(); });

(async function boot() {
  buildGrid();
  buildPath();
  core = await window.OrbitCore.load();
  sizeSky();
  initEngineCard();
  if (reduceMotion) { core.step(0.016, skyW, skyH); drawOnce(); }
  else requestAnimationFrame(frame);
})();
