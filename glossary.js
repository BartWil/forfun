// Glossary — every term that the rest of this site assumes you already know.
//
// Definitions in prose are close to useless for spatial ideas: "vertical ground reaction
// force" means nothing until you watch the trace rise under a foot. So each entry that
// benefits from a picture carries a LIVE illustration, drawn from the same MOVEMENTS data
// and the same runtime as the stations themselves.
//
// Every term has a stable id, so any page can deep-link straight to it: glossary.html#vgrf

(function () {
  "use strict";

  const PLg = () => window.i18n && window.i18n.lang === "pl";
  const L = () => (PLg() ? "pl" : "en");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const WALK = (typeof MOVEMENTS !== "undefined") ? MOVEMENTS.walk : null;
  const WS = WALK ? computeScales(WALK, WALK.param.default) : null;

  // ---------- shared mini figure ----------
  const D = Math.PI / 180;
  function pose(st, cx, gy, S) {
    const hip = { x: cx, y: gy - 0.60 * S + (st.hipDrop || 0) * S * 0.4 };
    const ha = st.hipAngle * D;
    const knee = { x: hip.x + Math.sin(ha) * 0.30 * S, y: hip.y + Math.cos(ha) * 0.30 * S };
    const sa = (st.hipAngle - st.kneeAngle) * D;
    const ank = { x: knee.x + Math.sin(sa) * 0.29 * S, y: knee.y + Math.cos(sa) * 0.29 * S };
    const fa = (st.ankleAngle || 0) * D;
    const toe = { x: ank.x + Math.cos(fa) * 0.11 * S, y: ank.y + Math.sin(-fa) * 0.05 * S + 2 };
    const sh = { x: hip.x - Math.sin(4 * D) * 0.34 * S, y: hip.y - Math.cos(4 * D) * 0.34 * S };
    const head = { x: sh.x, y: sh.y - 0.062 * S };
    return { hip, knee, ank, toe, sh, head };
  }
  function figure(ctx, P, S, col, lw) {
    ctx.strokeStyle = col || "#e8edf7"; ctx.lineWidth = lw || 2.2;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(P.toe.x, P.toe.y); ctx.lineTo(P.ank.x, P.ank.y); ctx.lineTo(P.knee.x, P.knee.y);
    ctx.lineTo(P.hip.x, P.hip.y); ctx.lineTo(P.sh.x, P.sh.y);
    ctx.stroke();
    ctx.fillStyle = col || "#e8edf7";
    ctx.beginPath(); ctx.arc(P.head.x, P.head.y, 0.052 * S, 0, 7); ctx.fill();
  }
  const ground = (ctx, W, y, col) => {
    ctx.strokeStyle = col || "rgba(94,234,212,.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W * .06, y); ctx.lineTo(W * .94, y); ctx.stroke();
  };
  const label = (ctx, txt, x, y, col, size) => {
    ctx.fillStyle = col; ctx.font = "600 " + (size || 10) + "px 'Space Grotesk',sans-serif";
    ctx.fillText(txt, x, y);
  };

  // ---------- illustrations: (ctx, W, H, t) with t looping 0..1 ----------
  const ART = {
    vgrf(ctx, W, H, t) {
      if (!WALK) return;
      const gy = H * .64, S = H * .52, cx = W * .26;
      ground(ctx, W, gy);
      const st = liveState(WALK, WS, t * 100);
      figure(ctx, pose(st, cx, gy, S), S, "#e8edf7", 2);
      // force vector under the foot
      if (st.grf > .04) {
        const P = pose(st, cx, gy, S);
        const len = st.grf * S * 0.44;
        ctx.strokeStyle = "#5eead4"; ctx.fillStyle = "#5eead4"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(P.ank.x, gy); ctx.lineTo(P.ank.x, gy - len); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P.ank.x, gy - len - 7);
        ctx.lineTo(P.ank.x - 4.5, gy - len + 2); ctx.lineTo(P.ank.x + 4.5, gy - len + 2);
        ctx.closePath(); ctx.fill();
      }
      // the trace it draws over a cycle
      const x0 = W * .48, x1 = W * .95, yb = H * .90, hh = H * .56;
      const X = i => x0 + i / 100 * (x1 - x0), Y = g => yb - Math.min(g, 1.3) / 1.3 * hh;
      ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x1, Y(1)); ctx.stroke();
      label(ctx, "1 BW", x1 - 26, Y(1) - 4, "rgba(255,255,255,.35)", 9);
      ctx.strokeStyle = "rgba(94,234,212,.30)"; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const g = liveState(WALK, WS, i).grf; i ? ctx.lineTo(X(i), Y(g)) : ctx.moveTo(X(i), Y(g)); }
      ctx.stroke();
      ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 2; ctx.beginPath();
      const n = Math.max(1, Math.round(t * 100));
      for (let i = 0; i <= n; i++) { const g = liveState(WALK, WS, i).grf; i ? ctx.lineTo(X(i), Y(g)) : ctx.moveTo(X(i), Y(g)); }
      ctx.stroke();
      ctx.fillStyle = "#5eead4";
      ctx.beginPath(); ctx.arc(X(t * 100), Y(st.grf), 3, 0, 7); ctx.fill();
      label(ctx, st.grf.toFixed(2) + " BW", x0, H * .16, "#5eead4", 11);
    },

    cycle(ctx, W, H, t) {
      if (!WALK) return;
      const gy = H * .60, S = H * .44;
      const st = liveState(WALK, WS, t * 100);
      figure(ctx, pose(st, W * (.12 + t * .76), gy, S), S, "#e8edf7", 2);
      ground(ctx, W, gy);
      // the 0-100% bar, split at toe-off
      const x0 = W * .06, x1 = W * .94, by = H * .84, bh = 13;
      const sp = x0 + (x1 - x0) * 0.62;
      ctx.fillStyle = "rgba(94,234,212,.30)"; ctx.fillRect(x0, by, sp - x0, bh);
      ctx.fillStyle = "rgba(124,155,255,.30)"; ctx.fillRect(sp, by, x1 - sp, bh);
      ctx.fillStyle = "#5eead4"; label(ctx, "STANCE ~62%", x0 + 5, by + 9.5, "#5eead4", 9);
      label(ctx, "SWING ~38%", sp + 5, by + 9.5, "#7c9bff", 9);
      const px = x0 + (x1 - x0) * t;
      ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, by - 5); ctx.lineTo(px, by + bh + 5); ctx.stroke();
      label(ctx, Math.round(t * 100) + "%", px - 10, by - 10, "#e8edf7", 10);
    },

    torque(ctx, W, H) {
      const ex = W * .17, ey = H * .55, len = W * .62, d = W * .10;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#39435c"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex - 4, ey - H * .34); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + len, ey); ctx.stroke();
      ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ex - 2, ey - H * .30); ctx.lineTo(ex + d, ey); ctx.stroke();
      // moment arms as brackets
      const br = (x1, x2, y, col, txt) => {
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y - 4); ctx.stroke();
        label(ctx, txt, (x1 + x2) / 2 - 14, y + 12, col, 9);
      };
      br(ex, ex + d, ey + 20, "#ff6f5e", "small d");
      br(ex, ex + len, ey + 42, "#7c9bff", "large L");
      ctx.fillStyle = "#c7d0e0"; ctx.beginPath(); ctx.arc(ex + len, ey, 6, 0, 7); ctx.fill();
      ctx.fillStyle = "#0a0e17"; ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, 7); ctx.fill(); ctx.stroke();
      label(ctx, "torque = force × moment arm", W * .06, H * .14, "#93a1bd", 10);
    },

    contraction(ctx, W, H, t) {
      const kinds = [
        { n: "concentric", pl: "koncentryczny", c: "#5eead4", f: p => 1 - 0.34 * p },
        { n: "isometric", pl: "izometryczny", c: "#7c9bff", f: () => 1 },
        { n: "eccentric", pl: "ekscentryczny", c: "#ff6f5e", f: p => 1 + 0.34 * p },
      ];
      const p = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      kinds.forEach((k, i) => {
        const cy = H * (0.26 + i * 0.26), x0 = W * .30, base = W * .44;
        const len = base * k.f(p);
        ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, cy - 12); ctx.lineTo(x0, cy + 12); ctx.stroke();
        ctx.strokeStyle = k.c; ctx.lineWidth = 9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x0 + 4, cy); ctx.lineTo(x0 + len, cy); ctx.stroke();
        ctx.fillStyle = "#c7d0e0";
        ctx.beginPath(); ctx.arc(x0 + len + 8, cy, 5, 0, 7); ctx.fill();
        label(ctx, PLg() ? k.pl : k.n, W * .04, cy + 4, k.c, 10);
      });
    },

    lengthTension(ctx, W, H) {
      const x0 = W * .12, x1 = W * .94, yb = H * .84, yt = H * .16;
      const X = l => x0 + (l - .5) / 1.2 * (x1 - x0), Y = f => yb - Math.min(f, 1.7) / 1.7 * (yb - yt);
      const afl = l => Math.exp(-((l - 1) ** 2) / (2 * .04));
      const pfl = l => l <= 1 ? 0 : Math.min(1.6, (Math.exp(5 * (l - 1)) - 1) / (Math.exp(3) - 1));
      const plot = (fn, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const l = .5 + i / 60 * 1.2; i ? ctx.lineTo(X(l), Y(fn(l))) : ctx.moveTo(X(l), Y(fn(l))); } ctx.stroke(); };
      ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(1), yt); ctx.lineTo(X(1), yb); ctx.stroke();
      plot(afl, "rgba(124,155,255,.9)", 1.8);
      plot(pfl, "rgba(94,234,212,.9)", 1.8);
      plot(l => afl(l) + pfl(l), "#ff6f5e", 2.4);
      label(ctx, "L₀", X(1) - 6, yb + 12, "#93a1bd", 9);
      label(ctx, "active", W * .16, H * .22, "#7c9bff", 9);
      label(ctx, "passive", W * .60, H * .30, "#5eead4", 9);
      label(ctx, "total", W * .60, H * .17, "#ff6f5e", 9);
    },

    forceVelocity(ctx, W, H) {
      const x0 = W * .12, x1 = W * .94, yb = H * .84, yt = H * .16;
      const X = v => x0 + (v + 1) / 2 * (x1 - x0), Y = f => yb - Math.min(Math.max(f, 0), 1.8) / 1.8 * (yb - yt);
      const fv = v => v >= 0 ? Math.min(1, Math.max(0, (1 - v) / (1 + v / .25))) : 1 + .6 * (-v) / ((-v) + .3);
      ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(0), yt); ctx.lineTo(X(0), yb); ctx.stroke();
      ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 80; i++) { const v = -1 + i / 80 * 2; i ? ctx.lineTo(X(v), Y(fv(v))) : ctx.moveTo(X(v), Y(fv(v))); }
      ctx.stroke();
      label(ctx, "← lengthening", x0 + 2, yb + 12, "#93a1bd", 9);
      label(ctx, "shortening →", x1 - 62, yb + 12, "#93a1bd", 9);
      label(ctx, "isometric", X(0) + 4, yt + 10, "#7c9bff", 9);
    },

    planes(ctx, W, H) {
      const cx = W * .5, cy = H * .5, s = Math.min(W, H) * .30;
      const box = (dx, dy, col, txt, tx, ty) => {
        ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy - dy);
        ctx.lineTo(cx + dx, cy + dy); ctx.lineTo(cx - dx, cy + dy); ctx.closePath(); ctx.stroke();
        label(ctx, txt, tx, ty, col, 9);
      };
      box(s * .16, s * 1.15, "#5eead4", PLg() ? "strzałkowa" : "sagittal", cx - s * .16, cy - s * 1.25);
      box(s * 1.0, s * 1.15, "#7c9bff", PLg() ? "czołowa" : "frontal", cx + s * .42, cy + s * 1.36);
      box(s * 1.0, s * .13, "#ff6f5e", PLg() ? "poprzeczna" : "transverse", cx - s * 1.0, cy - s * .24);
      ctx.fillStyle = "rgba(232,237,247,.85)";
      ctx.beginPath(); ctx.arc(cx, cy - s * .78, s * .13, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(232,237,247,.85)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx, cy - s * .62); ctx.lineTo(cx, cy + s * .35);
      ctx.moveTo(cx - s * .40, cy - s * .30); ctx.lineTo(cx + s * .40, cy - s * .30);
      ctx.moveTo(cx, cy + s * .35); ctx.lineTo(cx - s * .22, cy + s * 1.0);
      ctx.moveTo(cx, cy + s * .35); ctx.lineTo(cx + s * .22, cy + s * 1.0);
      ctx.stroke();
    },

    valgus(ctx, W, H, t) {
      const p = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      const gy = H * .84, hipY = H * .22;
      [[W * .30, 0, "#5eead4", PLg() ? "neutralne" : "neutral"],
       [W * .70, p, "#ff6f5e", PLg() ? "koślawość" : "valgus"]].forEach(([cx, amt, col, txt]) => {
        const foot = { x: cx, y: gy }, hip = { x: cx, y: hipY };
        const knee = { x: cx + amt * W * .085, y: (hipY + gy) / 2 };
        ctx.strokeStyle = "rgba(100,112,146,.7)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(foot.x, foot.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(knee.x, knee.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(knee.x, knee.y, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#e8edf7";
        ctx.beginPath(); ctx.arc(hip.x, hip.y, 3.4, 0, 7); ctx.fill();
        ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(foot.x - 10, gy); ctx.lineTo(foot.x + 10, gy); ctx.stroke();
        label(ctx, txt, cx - 22, H * .96, col, 9);
      });
    },

    ankle(ctx, W, H, t) {
      const a = Math.sin(t * Math.PI * 2) * 22;
      const kx = W * .5, ky = H * .22, ax = W * .5, ay = H * .66;
      ctx.strokeStyle = "#e8edf7"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ax, ay); ctx.stroke();
      const fl = W * .20, r = -a * D;
      ctx.strokeStyle = a > 2 ? "#5eead4" : a < -2 ? "#ff6f5e" : "#7c9bff"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(r) * fl, ay + Math.sin(r) * fl); ctx.stroke();
      ctx.fillStyle = "#e8edf7"; ctx.beginPath(); ctx.arc(ax, ay, 4.5, 0, 7); ctx.fill();
      const txt = a > 2 ? (PLg() ? "zgięcie grzbietowe" : "dorsiflexion")
                : a < -2 ? (PLg() ? "zgięcie podeszwowe" : "plantarflexion")
                : (PLg() ? "pozycja neutralna" : "neutral");
      label(ctx, txt + "  " + Math.abs(Math.round(a)) + "°", W * .06, H * .93,
            a > 2 ? "#5eead4" : a < -2 ? "#ff6f5e" : "#7c9bff", 10);
    },

    rockers(ctx, W, H, t) {
      if (!WALK) return;
      const gy = H * .74, S = H * .52;
      ground(ctx, W, gy);
      const phases = [8, 28, 46];
      const names = PLg() ? ["piętowe", "skokowe", "przodostopia"] : ["heel", "ankle", "forefoot"];
      const active = Math.floor((t * 3) % 3);
      phases.forEach((ph, i) => {
        const cx = W * (0.20 + i * 0.30);
        const st = liveState(WALK, WS, ph);
        const on = i === active;
        figure(ctx, pose(st, cx, gy, S), S, on ? "#e8edf7" : "rgba(232,237,247,.28)", on ? 2.4 : 1.8);
        const P = pose(st, cx, gy, S);
        const pivot = i === 0 ? { x: P.ank.x - S * .04, y: gy } : i === 1 ? { x: P.ank.x, y: gy } : { x: P.toe.x, y: gy };
        ctx.strokeStyle = on ? "#5eead4" : "rgba(94,234,212,.25)"; ctx.lineWidth = on ? 2.4 : 1.4;
        ctx.beginPath(); ctx.arc(pivot.x, pivot.y, on ? 9 : 6, 0, 7); ctx.stroke();
        label(ctx, names[i], cx - 20, H * .93, on ? "#5eead4" : "rgba(94,234,212,.35)", 9);
      });
    },

    com(ctx, W, H, t) {
      if (!WALK) return;
      const gy = H * .78, S = H * .56, cx = W * .5;
      ground(ctx, W, gy);
      const st = liveState(WALK, WS, t * 100);
      const P = pose(st, cx, gy, S);
      figure(ctx, P, S, "#e8edf7", 2.2);
      const com = { x: cx, y: P.hip.y - S * .06 };
      // trace the CoM path across the cycle
      ctx.strokeStyle = "rgba(255,180,60,.35)"; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const s2 = liveState(WALK, WS, i), p2 = pose(s2, cx, gy, S);
        const x = W * .18 + (i / 100) * W * .64, y = p2.hip.y - S * .06;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#ffb43c";
      ctx.beginPath(); ctx.arc(com.x, com.y, 5.5, 0, 7); ctx.fill();
      ctx.strokeStyle = "#0a0e17"; ctx.lineWidth = 1.4; ctx.stroke();
      label(ctx, PLg() ? "środek masy" : "centre of mass", W * .06, H * .14, "#ffb43c", 10);
    },

    doubleSupport(ctx, W, H, t) {
      if (!WALK) return;
      const gy = H * .74, S = H * .52, cx = W * .5;
      ground(ctx, W, gy);
      const a = liveState(WALK, WS, t * 100);
      const b = liveState(WALK, WS, t * 100 + 50);
      figure(ctx, pose(b, cx, gy, S), S, "rgba(232,237,247,.34)", 2);
      figure(ctx, pose(a, cx, gy, S), S, "#e8edf7", 2.3);
      const both = a.grf > .04 && b.grf > .04;
      ctx.fillStyle = both ? "rgba(94,234,212,.16)" : "transparent";
      if (both) ctx.fillRect(0, 0, W, H);
      label(ctx, both ? (PLg() ? "PODWÓJNY PODPÓR — obie stopy na podłożu" : "DOUBLE SUPPORT — both feet down")
                      : (PLg() ? "pojedynczy podpór" : "single support"),
            W * .06, H * .12, both ? "#5eead4" : "#647092", 10);
    },
  };

  // ---------- the terms ----------
  const CATS = [
    { id: "all",     en: "Everything",  pl: "Wszystko" },
    { id: "kinetic", en: "Forces",      pl: "Siły" },
    { id: "kinemat", en: "Motion",      pl: "Ruch" },
    { id: "muscle",  en: "Muscle",      pl: "Mięśnie" },
    { id: "gait",    en: "Gait",        pl: "Chód" },
    { id: "measure", en: "Measurement", pl: "Pomiar" },
  ];

  const T = [
    { id: "kinematics-kinetics", cat: "kinemat",
      en: { t: "Kinematics vs kinetics", d: "Kinematics describes <b>motion</b> — positions, angles, speeds — without asking what caused it. Kinetics describes the <b>forces and torques</b> that cause motion.",
            w: "The single most common mix-up. A video gives you kinematics. A force plate gives you kinetics. You need both to explain <em>why</em> a movement looks the way it does." },
      pl: { t: "Kinematyka a kinetyka", d: "Kinematyka opisuje <b>ruch</b> — pozycje, kąty, prędkości — nie pytając o jego przyczynę. Kinetyka opisuje <b>siły i momenty</b>, które ten ruch wywołują.",
            w: "Najczęstsza pomyłka. Nagranie wideo daje kinematykę. Platforma dynamometryczna daje kinetykę. Potrzebujesz obu, by wyjaśnić, <em>dlaczego</em> ruch wygląda tak, jak wygląda." } },

    { id: "vgrf", cat: "kinetic", art: "vgrf",
      en: { t: "Ground reaction force (GRF, vGRF)", d: "The force the ground pushes back with. Newton's third law: push down, get pushed up. The <b>vertical</b> component (vGRF) is the big one and the one usually plotted.",
            w: "In walking it makes a double hump — one peak catching your falling weight, a dip as you vault over a straight leg, a second peak at push-off. It is <b>zero</b> whenever the foot is in the air." },
      pl: { t: "Siła reakcji podłoża (GRF, vGRF)", d: "Siła, którą podłoże oddziałuje z powrotem. Trzecia zasada Newtona: naciskasz w dół, zostajesz popchnięty w górę. Składowa <b>pionowa</b> (vGRF) jest największa i to ją najczęściej się wykreśla.",
            w: "W chodzie tworzy dwa garby — pierwszy szczyt wyhamowuje opadającą masę, zagłębienie powstaje przy przetaczaniu nad wyprostowaną nogą, drugi szczyt to odbicie. Wynosi <b>zero</b>, gdy stopa jest w powietrzu." },
      link: { href: "explorer.html#explorer", en: "Scrub it in the Explorer", pl: "Przewiń w Eksploratorze" } },

    { id: "body-weight", cat: "measure",
      en: { t: "Body weight (BW) normalisation", d: "Forces are usually divided by the person's body weight, so a value of 1.0 BW means \"a force equal to your own weight\".",
            w: "It lets you compare a 55 kg and a 95 kg person on the same axis. Without it, the heavier person's curve is simply taller and you learn nothing." },
      pl: { t: "Normalizacja do masy ciała (BW)", d: "Siły zwykle dzieli się przez masę ciała badanego, więc wartość 1,0 BW oznacza „siłę równą własnemu ciężarowi”.",
            w: "Pozwala porównać osobę 55 kg i 95 kg na tej samej osi. Bez tego krzywa cięższej osoby jest po prostu wyższa i niczego się nie dowiadujesz." } },

    { id: "torque", cat: "kinetic", art: "torque",
      en: { t: "Torque / moment", d: "The turning effect of a force about a joint: <b>force × moment arm</b>. Measured in newton-metres (N·m).",
            w: "Muscles do not produce \"strength\" in the abstract — they produce torque about a joint, and it changes with joint angle because the moment arm changes." },
      pl: { t: "Moment siły", d: "Efekt obrotowy siły względem stawu: <b>siła × ramię momentu</b>. Mierzony w niutonometrach (N·m).",
            w: "Mięśnie nie wytwarzają abstrakcyjnej „siły” — wytwarzają moment względem stawu, a ten zmienia się z kątem stawu, bo zmienia się ramię momentu." },
      link: { href: "muscle.html", en: "Play with it on Levers", pl: "Pobaw się na stronie Dźwignie" } },

    { id: "moment-arm", cat: "kinetic",
      en: { t: "Moment arm (lever arm)", d: "The <b>perpendicular</b> distance from the joint axis to the line along which a force acts. Not the length of the bone, and not the distance to the attachment.",
            w: "Muscle moment arms are tiny — the biceps peaks near 4.7 cm — which is exactly why muscles must pull with forces many times the load they are holding." },
      pl: { t: "Ramię momentu (ramię dźwigni)", d: "Odległość <b>prostopadła</b> od osi stawu do linii działania siły. To nie długość kości ani odległość do przyczepu.",
            w: "Ramiona momentu mięśni są maleńkie — u bicepsa szczytowo około 4,7 cm — i właśnie dlatego mięśnie muszą ciągnąć z siłą wielokrotnie większą od utrzymywanego ciężaru." } },

    { id: "com", cat: "kinemat", art: "com",
      en: { t: "Centre of mass (CoM)", d: "The single point at which the body's whole mass can be treated as concentrated. In standing it sits roughly just in front of S2, around 55% of your height.",
            w: "It is not fixed to the body — raise your arms and it moves. Balance problems are almost always CoM problems: keeping it over the base of support." },
      pl: { t: "Środek masy (CoM)", d: "Punkt, w którym można traktować całą masę ciała jako skupioną. W staniu leży mniej więcej tuż przed S2, na wysokości około 55% wzrostu.",
            w: "Nie jest przytwierdzony do ciała — unieś ramiona, a się przesunie. Problemy z równowagą to prawie zawsze problemy ze środkiem masy: utrzymaniem go nad polem podparcia." } },

    { id: "planes", cat: "kinemat", art: "planes",
      en: { t: "Planes of motion", d: "<b>Sagittal</b> splits left from right (flexion/extension). <b>Frontal</b> splits front from back (abduction/adduction). <b>Transverse</b> splits top from bottom (rotation).",
            w: "Most of this site draws the sagittal plane, because walking mostly happens there. But knee valgus and Trendelenburg are frontal-plane events — invisible from the side, which is why you must watch a patient from more than one angle." },
      pl: { t: "Płaszczyzny ruchu", d: "<b>Strzałkowa</b> dzieli lewo od prawa (zgięcie/wyprost). <b>Czołowa</b> dzieli przód od tyłu (odwodzenie/przywodzenie). <b>Poprzeczna</b> dzieli górę od dołu (rotacja).",
            w: "Większość tej strony rysuje płaszczyznę strzałkową, bo w niej głównie odbywa się chód. Ale koślawość kolana i objaw Trendelenburga to zjawiska w płaszczyźnie czołowej — niewidoczne z boku, dlatego pacjenta trzeba oglądać z więcej niż jednej strony." } },

    { id: "ankle-motion", cat: "kinemat", art: "ankle",
      en: { t: "Dorsiflexion / plantarflexion", d: "<b>Dorsiflexion</b> lifts the foot toward the shin. <b>Plantarflexion</b> points it away, as in standing on tiptoe.",
            w: "Loss of dorsiflexion is one of the commonest mechanical restrictions in the body: it blocks the ankle rocker, shortens the step, and pushes compensation up the chain into the knee and hip." },
      pl: { t: "Zgięcie grzbietowe / podeszwowe", d: "<b>Zgięcie grzbietowe</b> unosi stopę w stronę goleni. <b>Zgięcie podeszwowe</b> kieruje ją w przeciwną stronę, jak przy staniu na palcach.",
            w: "Utrata zgięcia grzbietowego to jedno z najczęstszych ograniczeń mechanicznych w ciele: blokuje przetoczenie skokowe, skraca krok i przenosi kompensację w górę łańcucha, do kolana i biodra." } },

    { id: "valgus", cat: "kinemat", art: "valgus",
      en: { t: "Valgus / varus", d: "<b>Valgus</b> is the distal segment angling away from the midline — at the knee, the joint falls inward, \"knock-kneed\". <b>Varus</b> is the opposite, \"bow-legged\".",
            w: "Dynamic knee valgus during landing or a single-leg squat is one of the most-studied movement patterns in sports medicine, linked with ACL and patellofemoral problems." },
      pl: { t: "Koślawość / szpotawość", d: "<b>Koślawość</b> to odchylenie odcinka dalszego od linii pośrodkowej — w kolanie staw ucieka do wewnątrz („kolana koślawe”, X). <b>Szpotawość</b> jest odwrotnością („kolana szpotawe”, O).",
            w: "Dynamiczna koślawość kolana przy lądowaniu lub przysiadzie na jednej nodze to jeden z najlepiej przebadanych wzorców ruchu w medycynie sportowej, wiązany z problemami ACL i rzepkowo-udowymi." },
      link: { href: "sls.html", en: "See it collapse in Knee Control", pl: "Zobacz zapadanie w Kontroli kolana" } },

    { id: "gait-cycle", cat: "gait", art: "cycle",
      en: { t: "Gait cycle", d: "One foot's contact with the ground to that <b>same</b> foot's next contact, rescaled to 0–100%. Splits into <b>stance</b> (~62%, foot down) and <b>swing</b> (~38%, foot in the air).",
            w: "Normalising to 0–100% is what lets you average across people of different heights and speeds. A \"stride\" is one full cycle; a \"step\" is only half of one." },
      pl: { t: "Cykl chodu", d: "Od kontaktu jednej stopy z podłożem do kolejnego kontaktu <b>tej samej</b> stopy, przeskalowane do 0–100%. Dzieli się na <b>fazę podporu</b> (~62%, stopa na podłożu) i <b>fazę wymachu</b> (~38%, stopa w powietrzu).",
            w: "Normalizacja do 0–100% pozwala uśredniać dane osób o różnym wzroście i prędkości. „Cykl” to pełny obrót; „krok” to tylko jego połowa." },
      link: { href: "lesson.html", en: "Walk through it step by step", pl: "Przejdź przez niego krok po kroku" } },

    { id: "double-support", cat: "gait", art: "doubleSupport",
      en: { t: "Double support", d: "The part of walking when <b>both</b> feet are on the ground at once — about 20% of the cycle, in two spells.",
            w: "It is the formal difference between walking and running: running has no double support, it has flight instead. Double support grows as people slow down and is a sensitive marker of unsteadiness." },
      pl: { t: "Podwójny podpór", d: "Część chodu, gdy <b>obie</b> stopy są jednocześnie na podłożu — około 20% cyklu, w dwóch okresach.",
            w: "To formalna różnica między chodem a biegiem: bieg nie ma podwójnego podporu, ma fazę lotu. Podwójny podpór wydłuża się, gdy człowiek zwalnia, i jest czułym wskaźnikiem niepewności chodu." } },

    { id: "rockers", cat: "gait", art: "rockers",
      en: { t: "The three rockers", d: "Perry's description of stance as three successive pivots: the <b>heel</b> rocker at contact, the <b>ankle</b> rocker as the shin rotates over a flat foot, and the <b>forefoot</b> rocker as the heel lifts.",
            w: "It gives you a vocabulary for exactly where gait breaks. Foot drop kills the heel rocker; a stiff ankle kills the ankle rocker. Naming the rocker names the problem." },
      pl: { t: "Trzy przetoczenia (rockers)", d: "Opis fazy podporu wg Perry jako trzech kolejnych osi obrotu: przetoczenie <b>piętowe</b> przy kontakcie, <b>skokowe</b>, gdy goleń obraca się nad płaską stopą, i <b>przodostopia</b>, gdy pięta się unosi.",
            w: "Daje słownictwo do precyzyjnego wskazania, gdzie chód się psuje. Opadanie stopy niszczy przetoczenie piętowe; sztywny staw skokowy — skokowe. Nazwanie przetoczenia nazywa problem." },
      link: { href: "lesson.html", en: "See all three in the lesson", pl: "Zobacz wszystkie trzy w lekcji" } },

    { id: "cadence", cat: "gait",
      en: { t: "Cadence, step length, stride length", d: "<b>Cadence</b> is steps per minute. <b>Step length</b> is one foot's contact to the other foot's. <b>Stride length</b> is a full cycle — two steps.",
            w: "Walking speed = cadence × step length. People can slow down by shortening steps, by taking them less often, or both — and which one they choose is clinically informative." },
      pl: { t: "Kadencja, długość kroku, długość cyklu", d: "<b>Kadencja</b> to liczba kroków na minutę. <b>Długość kroku</b> to odległość od kontaktu jednej stopy do kontaktu drugiej. <b>Długość cyklu</b> to pełny cykl — dwa kroki.",
            w: "Prędkość chodu = kadencja × długość kroku. Można zwolnić, skracając kroki, wykonując je rzadziej albo obydwoma sposobami — a wybór jest klinicznie informacyjny." } },

    { id: "trendelenburg", cat: "gait",
      en: { t: "Trendelenburg sign", d: "When the hip abductors of the <b>stance</b> leg are too weak to hold the pelvis level, the pelvis drops on the <b>swing</b> side. If the trunk lurches over the stance hip instead, that is compensated Trendelenburg.",
            w: "It is a frontal-plane sign, so you have to watch from the front or behind. Note which side drops: the weakness is on the side you are standing on, not the side that sinks." },
      pl: { t: "Objaw Trendelenburga", d: "Gdy mięśnie odwodzące biodra nogi <b>podporowej</b> są zbyt słabe, by utrzymać miednicę poziomo, miednica opada po stronie <b>wymachowej</b>. Jeśli zamiast tego tułów przechyla się nad biodrem podporowym, to objaw skompensowany.",
            w: "To objaw w płaszczyźnie czołowej, więc trzeba patrzeć z przodu lub z tyłu. Zwróć uwagę, która strona opada: osłabienie jest po stronie, na której stoisz, a nie po tej, która się obniża." } },

    { id: "contraction", cat: "muscle", art: "contraction",
      en: { t: "Concentric, eccentric, isometric", d: "<b>Concentric</b>: the muscle shortens while producing force. <b>Eccentric</b>: it lengthens while producing force — braking. <b>Isometric</b>: it produces force without changing length.",
            w: "Most of walking is eccentric control, not concentric drive. \"Eccentric\" does not mean \"relaxing\" — the muscle is working hard while being stretched, which is why it is where most delayed soreness comes from." },
      pl: { t: "Skurcz koncentryczny, ekscentryczny, izometryczny", d: "<b>Koncentryczny</b>: mięsień skraca się, wytwarzając siłę. <b>Ekscentryczny</b>: wydłuża się, wytwarzając siłę — hamuje. <b>Izometryczny</b>: wytwarza siłę bez zmiany długości.",
            w: "Większość chodu to kontrola ekscentryczna, a nie napęd koncentryczny. „Ekscentryczny” nie znaczy „rozluźniony” — mięsień pracuje ciężko, będąc rozciąganym, i stąd bierze się większość opóźnionej bolesności." } },

    { id: "length-tension", cat: "muscle", art: "lengthTension",
      en: { t: "Length–tension relationship", d: "How much force a muscle can make depends on how long it is. Peak <b>active</b> force sits at optimal length (L₀), where actin and myosin overlap best; stretched further, <b>passive</b> tension from connective tissue takes over.",
            w: "This is why a muscle tested in its shortened range tests weak even when perfectly healthy — and why joint position must be standardised in manual muscle testing." },
      pl: { t: "Zależność długość–napięcie", d: "Siła, jaką mięsień może wytworzyć, zależy od jego długości. Szczyt siły <b>czynnej</b> przypada na długość optymalną (L₀), gdzie aktyna i miozyna najlepiej się zachodzą; przy dalszym rozciąganiu przejmuje napięcie <b>bierne</b> z tkanki łącznej.",
            w: "Dlatego mięsień testowany w zakresie skróconym wypada słabo, nawet będąc całkowicie zdrowym — i dlatego pozycja stawu musi być ustandaryzowana w manualnym testowaniu mięśni." },
      link: { href: "dyno.html", en: "Drag the curve on Muscle Dyno", pl: "Przeciągnij krzywą w Muscle Dyno" } },

    { id: "force-velocity", cat: "muscle", art: "forceVelocity",
      en: { t: "Force–velocity relationship", d: "The faster a muscle shortens, the less force it makes (Hill's hyperbola). Lengthening under load produces <em>more</em> force than holding still.",
            w: "It is why you cannot lift a heavy load quickly, and why peak <b>power</b> — force × velocity — occurs at an intermediate speed rather than at maximum force or maximum speed." },
      pl: { t: "Zależność siła–prędkość", d: "Im szybciej mięsień się skraca, tym mniejszą siłę wytwarza (hiperbola Hilla). Wydłużanie pod obciążeniem daje <em>więcej</em> siły niż utrzymanie bez ruchu.",
            w: "Dlatego nie da się szybko podnieść dużego ciężaru i dlatego szczyt <b>mocy</b> — siła × prędkość — przypada na prędkość pośrednią, a nie na maksymalną siłę czy maksymalną prędkość." } },

    { id: "agonist", cat: "muscle",
      en: { t: "Agonist / antagonist / synergist", d: "The <b>agonist</b> drives the movement, the <b>antagonist</b> opposes it on the other side of the joint, and <b>synergists</b> assist or cancel unwanted actions.",
            w: "Muscles can only pull, never push — so every joint needs opposing groups. Co-contraction of both is a real strategy: it stiffens a joint for stability, at an energy cost." },
      pl: { t: "Agonista / antagonista / synergista", d: "<b>Agonista</b> napędza ruch, <b>antagonista</b> przeciwdziała mu po drugiej stronie stawu, a <b>synergiści</b> wspomagają lub znoszą niepożądane działania.",
            w: "Mięśnie potrafią tylko ciągnąć, nigdy pchać — dlatego każdy staw potrzebuje grup przeciwstawnych. Jednoczesny skurcz obu to realna strategia: usztywnia staw dla stabilności, kosztem energii." } },

    { id: "pcsa", cat: "muscle",
      en: { t: "PCSA and fascicle length", d: "<b>Physiological cross-sectional area</b> is the total area of the fibres, cut perpendicular to them — it sets how much force a muscle can make. <b>Fascicle length</b> sets how far and how fast it can shorten.",
            w: "Two muscles of the same volume can be built for completely different jobs. It also explains why brachioradialis, with the smallest area but the largest moment arm, still contributes usefully at the elbow." },
      pl: { t: "PCSA i długość pęczków", d: "<b>Fizjologiczny przekrój poprzeczny</b> to łączne pole włókien, cięte prostopadle do nich — decyduje o tym, ile siły mięsień może wytworzyć. <b>Długość pęczków</b> decyduje o tym, jak daleko i jak szybko może się skrócić.",
            w: "Dwa mięśnie o tej samej objętości mogą być zbudowane do zupełnie różnych zadań. To też wyjaśnia, dlaczego mięsień ramienno-promieniowy, o najmniejszym przekroju, ale największym ramieniu momentu, wciąż użytecznie działa w łokciu." } },

    { id: "emg", cat: "measure",
      en: { t: "EMG (electromyography)", d: "Recording the electrical activity of muscle. Raw EMG is a noisy two-sided signal; it is normally rectified and smoothed into an <b>envelope</b>, then normalised to a reference contraction.",
            w: "EMG tells you <em>when</em> a muscle is active and roughly how hard, relative to itself. It does <b>not</b> give you force in newtons, and amplitudes cannot be compared between people or even between electrode placements." },
      pl: { t: "EMG (elektromiografia)", d: "Zapis czynności elektrycznej mięśnia. Surowe EMG to zaszumiony sygnał dwustronny; zwykle się go prostuje i wygładza do <b>obwiedni</b>, a następnie normalizuje do skurczu referencyjnego.",
            w: "EMG mówi, <em>kiedy</em> mięsień jest aktywny i z grubsza jak mocno, w odniesieniu do siebie samego. <b>Nie</b> podaje siły w niutonach, a amplitud nie można porównywać między osobami ani nawet między ustawieniami elektrod." } },

    { id: "force-plate", cat: "measure",
      en: { t: "Force plate", d: "A rigid plate with load cells that measures the ground reaction force in three directions, plus the centre of pressure — the point through which that force acts.",
            w: "It is the ground truth for kinetics. Combined with motion capture and inverse dynamics, it is how joint moments are estimated without ever measuring a muscle directly." },
      pl: { t: "Platforma dynamometryczna", d: "Sztywna płyta z czujnikami siły, mierząca siłę reakcji podłoża w trzech kierunkach oraz środek nacisku — punkt, przez który ta siła działa.",
            w: "To wzorzec odniesienia dla kinetyki. W połączeniu z rejestracją ruchu i dynamiką odwrotną pozwala oszacować momenty w stawach bez bezpośredniego pomiaru jakiegokolwiek mięśnia." } },

    { id: "mocap", cat: "measure",
      en: { t: "Motion capture, marker-based and markerless", d: "Marker-based systems track reflective markers on the skin with infrared cameras. <b>Markerless</b> systems (such as OpenCap) estimate body keypoints from ordinary video and triangulate them.",
            w: "Markerless has made 3-D analysis possible outside a lab, but accuracy varies by joint and is worst where a limb is hidden from the cameras — which you can see directly on the Knee Control page." },
      pl: { t: "Rejestracja ruchu: markerowa i bezmarkerowa", d: "Systemy markerowe śledzą markery odblaskowe na skórze kamerami podczerwonymi. Systemy <b>bezmarkerowe</b> (jak OpenCap) estymują punkty kluczowe ciała ze zwykłego wideo i triangulują je.",
            w: "Technologia bezmarkerowa umożliwiła analizę 3-D poza laboratorium, ale dokładność zależy od stawu i jest najgorsza tam, gdzie kończyna jest zasłonięta przed kamerami — co widać wprost na stronie Kontrola kolana." } },

    { id: "inverse-dynamics", cat: "measure",
      en: { t: "Inverse dynamics", d: "Working <em>backwards</em> from measured motion and measured external forces to calculate the net moment that must have acted at each joint.",
            w: "Almost every published \"knee moment\" comes from this, not from a sensor in the knee. It gives the <b>net</b> moment of all structures at once — it cannot separate one muscle's contribution from another's." },
      pl: { t: "Dynamika odwrotna", d: "Obliczanie <em>wstecz</em> — od zmierzonego ruchu i zmierzonych sił zewnętrznych — wypadkowego momentu, jaki musiał działać w każdym stawie.",
            w: "Niemal każdy publikowany „moment w kolanie” pochodzi stąd, a nie z czujnika w kolanie. Daje moment <b>wypadkowy</b> wszystkich struktur naraz — nie rozdziela udziału poszczególnych mięśni." } },

    { id: "impulse", cat: "kinetic",
      en: { t: "Impulse", d: "Force multiplied by the time it acts (N·s). It equals the change in momentum it produces.",
            w: "It explains soft landings: the same drop must be stopped by the same impulse, so taking longer to stop lowers the peak force. Bend your knees and you trade force for time." },
      pl: { t: "Impuls siły", d: "Siła pomnożona przez czas jej działania (N·s). Równa się wywołanej przez nią zmianie pędu.",
            w: "Wyjaśnia miękkie lądowania: ten sam upadek trzeba zatrzymać tym samym impulsem, więc dłuższe hamowanie obniża siłę szczytową. Uginając kolana, wymieniasz siłę na czas." } },

    { id: "joint-reaction", cat: "kinetic",
      en: { t: "Joint reaction force", d: "The force pressing the two bones of a joint together. It is dominated not by the external load but by the muscle forces crossing that joint.",
            w: "Holding 5 kg can compress the elbow with several hundred newtons. It is the hidden cost of the short muscle moment arms that give us speed." },
      pl: { t: "Siła reakcji stawowej", d: "Siła dociskająca do siebie dwie kości stawu. Dominują w niej nie obciążenia zewnętrzne, lecz siły mięśni przechodzących przez ten staw.",
            w: "Utrzymanie 5 kg może ściskać łokieć siłą kilkuset niutonów. To ukryty koszt krótkich ramion momentu mięśni, które dają nam prędkość." } },

    { id: "rom", cat: "kinemat",
      en: { t: "Range of motion (ROM)", d: "How far a joint travels. <b>Active</b> ROM is what the person can produce themselves; <b>passive</b> ROM is what you can move them through.",
            w: "A gap between passive and active ROM points at the muscle or its control rather than the joint surfaces or capsule — a genuinely useful first split in an assessment." },
      pl: { t: "Zakres ruchu (ROM)", d: "Jak daleko porusza się staw. Zakres <b>czynny</b> to ten, który pacjent wykona sam; zakres <b>bierny</b> to ten, przez który możesz go przeprowadzić.",
            w: "Różnica między zakresem biernym a czynnym wskazuje raczej na mięsień lub jego sterowanie niż na powierzchnie stawowe czy torebkę — to naprawdę użyteczny pierwszy podział w badaniu." } },

    { id: "grand-average", cat: "measure",
      en: { t: "Grand average", d: "A curve made by averaging many trials from many people after time-normalising each to 0–100%.",
            w: "It shows the shared pattern but flattens individual variation — and it can produce a curve no single person actually walked. Useful for teaching the shape, unsafe for judging one patient." },
      pl: { t: "Średnia zbiorcza (grand average)", d: "Krzywa powstała przez uśrednienie wielu prób wielu osób, po znormalizowaniu każdej w czasie do 0–100%.",
            w: "Pokazuje wspólny wzorzec, ale spłaszcza zmienność indywidualną — i może dać krzywą, którą w rzeczywistości nie szedł nikt. Przydatna do nauki kształtu, nieodpowiednia do oceny pojedynczego pacjenta." } },
  ];

  // ---------- books ----------
  const BOOKS = [
    { g: { en: "Start here", pl: "Zacznij tutaj" }, items: [
      { a: "Neumann DA", t: "Kinesiology of the Musculoskeletal System", y: "3rd ed., Elsevier 2017",
        en: "If you buy one book, buy this one. Joint-by-joint functional anatomy with the mechanics woven in, and outstanding illustrations. Written for rehabilitation, not engineering.",
        pl: "Jeśli masz kupić jedną książkę — kup tę. Anatomia czynnościowa staw po stawie z wplecioną mechaniką i znakomitymi ilustracjami. Napisana dla rehabilitacji, nie dla inżynierii." },
      { a: "Nordin M, Frankel VH", t: "Basic Biomechanics of the Musculoskeletal System", y: "4th ed., Wolters Kluwer 2012",
        en: "The gentlest real introduction. Short chapters, tissue mechanics before joint mechanics, minimal maths.",
        pl: "Najłagodniejsze poważne wprowadzenie. Krótkie rozdziały, mechanika tkanek przed mechaniką stawów, minimum matematyki." },
      { a: "Hall SJ", t: "Basic Biomechanics", y: "8th ed., McGraw-Hill 2018",
        en: "An undergraduate workhorse aimed at kinesiology and PE. Strong on the physics fundamentals if forces and torques never quite clicked.",
        pl: "Uczelniany klasyk dla kinezjologii i wychowania fizycznego. Mocny w podstawach fizyki, jeśli siły i momenty nigdy do końca nie zaskoczyły." },
    ]},
    { g: { en: "Core references", pl: "Podstawowe źródła" }, items: [
      { a: "Perry J, Burnfield JM", t: "Gait Analysis: Normal and Pathological Function", y: "2nd ed., SLACK 2010",
        en: "The gait book. Phase-by-phase, muscle-by-muscle, with the pathological patterns that every clinical gait vocabulary comes from. Dense, and worth it.",
        pl: "Biblia chodu. Faza po fazie, mięsień po mięśniu, z wzorcami patologicznymi, z których wywodzi się całe kliniczne słownictwo chodu. Gęsta i warta wysiłku." },
      { a: "Winter DA", t: "Biomechanics and Motor Control of Human Movement", y: "4th ed., Wiley 2009",
        en: "The quantitative reference: filtering, inverse dynamics, energetics, and the anthropometric tables everyone silently uses. Assumes comfort with maths.",
        pl: "Referencja ilościowa: filtracja, dynamika odwrotna, energetyka i tabele antropometryczne, z których po cichu korzystają wszyscy. Wymaga swobody w matematyce." },
      { a: "Levangie PK, Norkin CC", t: "Joint Structure and Function", y: "6th ed., F.A. Davis 2019",
        en: "A comprehensive joint-by-joint companion to Neumann, strong on arthrokinematics and the mechanics of specific structures.",
        pl: "Wyczerpujące uzupełnienie Neumanna, staw po stawie; mocne w artrokinematyce i mechanice konkretnych struktur." },
      { a: "Enoka RM", t: "Neuromechanics of Human Movement", y: "5th ed., Human Kinetics 2015",
        en: "Where muscle physiology meets mechanics: motor units, fatigue, force–velocity, and how the nervous system actually issues the commands.",
        pl: "Tam, gdzie fizjologia mięśnia spotyka mechanikę: jednostki motoryczne, zmęczenie, siła–prędkość i to, jak układ nerwowy naprawdę wydaje polecenia." },
    ]},
    { g: { en: "Go deeper", pl: "Dla zaawansowanych" }, items: [
      { a: "Lieber RL", t: "Skeletal Muscle Structure, Function and Plasticity", y: "3rd ed., Wolters Kluwer 2009",
        en: "Muscle architecture done properly — PCSA, fascicle length, sarcomere operating ranges. The book behind most modern strength reasoning.",
        pl: "Architektura mięśnia zrobiona porządnie — PCSA, długość pęczków, zakresy pracy sarkomeru. Książka stojąca za większością współczesnego myślenia o sile." },
      { a: "Zatsiorsky VM", t: "Kinetics of Human Motion", y: "Human Kinetics 2002",
        en: "Rigorous and mathematical. Reach for it when you need the derivation rather than the result.",
        pl: "Rygorystyczna i matematyczna. Sięgnij po nią, gdy potrzebujesz wyprowadzenia, a nie samego wyniku." },
      { a: "Whittle MW", t: "Gait Analysis: An Introduction", y: "5th ed., Elsevier 2012",
        en: "A far gentler entry to gait than Perry. A good bridge if Perry feels overwhelming at first.",
        pl: "Znacznie łagodniejsze wejście w chód niż Perry. Dobry pomost, jeśli Perry na starcie przytłacza." },
    ]},
    { g: { en: "Free and open", pl: "Bezpłatne i otwarte" }, items: [
      { a: "Fukuchi CA, Fukuchi RK, Duarte M", t: "Public datasets of walking and running biomechanics", y: "PeerJ 2018 / 2017", href: "https://doi.org/10.7717/peerj.4640",
        en: "The open GRF and joint-angle data that drives walking and running on this site. Downloadable, and excellent for teaching with real numbers.",
        pl: "Otwarte dane GRF i kątów stawowych, które napędzają chód i bieg na tej stronie. Do pobrania, świetne do nauczania na prawdziwych liczbach." },
      { a: "Santuz A et al.", t: "Open EMG datasets of locomotion", y: "Zenodo", href: "https://doi.org/10.5281/zenodo.1254380",
        en: "Raw EMG from thousands of gait cycles. The muscle-activation curves here were computed from these signals.",
        pl: "Surowe EMG z tysięcy cykli chodu. Krzywe aktywacji mięśni na tej stronie policzono z tych sygnałów." },
      { a: "OpenSim / SimTK", t: "Musculoskeletal modelling and simulation", y: "Stanford", href: "https://simtk.org/projects/opensim",
        en: "Free software for building and simulating musculoskeletal models. The standard research tool, with a steep but rewarding learning curve.",
        pl: "Bezpłatne oprogramowanie do budowy i symulacji modeli mięśniowo-szkieletowych. Standardowe narzędzie badawcze o stromej, ale opłacalnej krzywej uczenia." },
      { a: "OpenCap", t: "Markerless motion capture from two phones", y: "Uhlrich, Falisse et al. 2023", href: "https://www.opencap.ai/",
        en: "Turns two ordinary phone videos into 3-D kinematics and a musculoskeletal model. Free for research and teaching.",
        pl: "Zamienia dwa zwykłe nagrania z telefonu w kinematykę 3-D i model mięśniowo-szkieletowy. Bezpłatne do badań i nauczania." },
    ]},
  ];

  // ---------- render ----------
  let filter = "all", query = "";
  const canvases = [];

  function matches(term) {
    if (filter !== "all" && term.cat !== filter) return false;
    if (!query) return true;
    const c = term[L()];
    return (c.t + " " + c.d + " " + c.w).toLowerCase().replace(/<[^>]+>/g, "").includes(query);
  }

  function buildChips() {
    const host = document.getElementById("gsCats");
    host.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gs-chip" + (c.id === filter ? " on" : "");
      b.textContent = c[L()];
      b.addEventListener("click", () => { filter = c.id; buildChips(); buildList(); });
      host.appendChild(b);
    });
  }

  function buildList() {
    const host = document.getElementById("gsList");
    canvases.length = 0;
    host.innerHTML = "";
    const lang = L();
    const shown = T.filter(matches);
    document.getElementById("gsCount").textContent =
      shown.length + " / " + T.length + (PLg() ? " haseł" : " terms");
    shown.forEach(term => {
      const c = term[lang];
      const card = document.createElement("article");
      card.className = "gs-card";
      card.id = term.id;
      const cat = CATS.find(x => x.id === term.cat);
      card.innerHTML =
        '<div class="gs-head">' +
          '<h3>' + c.t + "</h3>" +
          '<span class="gs-cat">' + (cat ? cat[lang] : "") + "</span>" +
        "</div>" +
        (term.art ? '<div class="gs-art"><canvas></canvas></div>' : "") +
        '<p class="gs-def">' + c.d + "</p>" +
        '<p class="gs-why"><span>' + (PLg() ? "Dlaczego to ważne" : "Why it matters") + "</span>" + c.w + "</p>" +
        (term.link ? '<a class="gs-link" href="' + term.link.href + '">' + term.link[lang] +
                     ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' : "") +
        '<a class="gs-anchor" href="#' + term.id + '" aria-label="link">#</a>';
      host.appendChild(card);
      if (term.art && ART[term.art]) {
        canvases.push({ cv: card.querySelector("canvas"), draw: ART[term.art], phase: Math.random() });
      }
    });
    sizeAll();
    if (reduce) drawStatic();
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ block: "center" });
    }
  }

  function sizeAll() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvases.forEach(o => {
      const r = o.cv.getBoundingClientRect();
      if (!r.width) return;
      o.cv.width = Math.round(r.width * d); o.cv.height = Math.round(r.height * d);
      o.w = r.width; o.h = r.height;
    });
  }
  function paint(o, t) {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = o.cv.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, o.w, o.h);
    o.draw(ctx, o.w, o.h, t);
  }
  function drawStatic() { canvases.forEach(o => { if (o.w) paint(o, 0.32); }); }

  let last = null;
  function frame(ts) {
    if (last == null) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    canvases.forEach(o => {
      if (!o.w) return;
      const r = o.cv.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;   // skip far offscreen
      o.phase = (o.phase + dt * 0.28) % 1;
      paint(o, o.phase);
    });
    requestAnimationFrame(frame);
  }

  function buildBooks() {
    const host = document.getElementById("gsBooks");
    const lang = L();
    host.innerHTML = "";
    BOOKS.forEach(group => {
      const sec = document.createElement("div");
      sec.className = "gs-bgroup";
      sec.innerHTML = '<h3>' + group.g[lang] + "</h3>";
      const ul = document.createElement("ul");
      group.items.forEach(b => {
        const li = document.createElement("li");
        const title = b.href
          ? '<a href="' + b.href + '" target="_blank" rel="noopener"><em>' + b.t + "</em></a>"
          : "<em>" + b.t + "</em>";
        li.innerHTML = "<b>" + b.a + "</b> — " + title + '<span class="gs-ed">' + b.y + "</span>" +
                       "<span class=\"gs-note\">" + b[lang] + "</span>";
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      host.appendChild(sec);
    });
  }

  function boot() {
    const search = document.getElementById("gsSearch");
    search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); buildList(); });
    buildChips(); buildList(); buildBooks();
    window.addEventListener("resize", () => { sizeAll(); if (reduce) drawStatic(); });
    document.addEventListener("i18n:changed", () => {
      search.placeholder = PLg() ? "Szukaj terminu…" : "Search a term…";
      buildChips(); buildList(); buildBooks();
    });
    if (!reduce) requestAnimationFrame(frame);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
