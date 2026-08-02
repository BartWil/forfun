// Biotensegrity hero: a human body as a tensegrity structure.
//
// The model follows Levin's biotensegrity account: bones are discontinuous COMPRESSION
// struts that never touch each other, suspended inside a continuous TENSION network of
// muscle, tendon and fascia. Load applied anywhere is carried everywhere: which is why
// dragging one hand makes the opposite hip move.
//
// Solver: Verlet integration + iterative constraint relaxation.
//   struts : hold their length in BOTH directions (rigid bone)
//   cables : resist stretch only, never push (tissue cannot push a rope)
//
// The cross-body cables are real anatomy, not decoration: shoulder to opposite pelvis is
// the posterior oblique sling (lat → thoracolumbar fascia → opposite gluteus maximus).

(function () {
  "use strict";

  // unit coordinates: y grows downward, body spans y ≈ -0.06 (head) to 0.95 (feet)
  const N = {
    head:      [ 0.00, -0.10],
    neck:      [ 0.00,  0.03],
    shoulderL: [-0.15,  0.11],
    shoulderR: [ 0.15,  0.11],
    thoraxL:   [-0.10,  0.26],
    thoraxR:   [ 0.10,  0.26],
    lumbarL:   [-0.075, 0.40],
    lumbarR:   [ 0.075, 0.40],
    pelvisL:   [-0.12,  0.52],
    pelvisR:   [ 0.12,  0.52],
    kneeL:     [-0.115, 0.73],
    kneeR:     [ 0.115, 0.73],
    footL:     [-0.115, 0.95],
    footR:     [ 0.115, 0.95],
    elbowL:    [-0.26,  0.30],
    elbowR:    [ 0.26,  0.30],
    handL:     [-0.30,  0.49],
    handR:     [ 0.30,  0.49],
  };
  // Nothing is pinned and gravity is almost nil. That is deliberate: a leg chain pinned at
  // the foot is rotationally symmetric about that pin, so "standing" and "hanging upside
  // down" are equally valid solutions and the rig will happily invert itself. Suspended,
  // the prestressed net alone defines the shape: it cannot collapse, and it springs back
  // exactly. It is also how tensegrity models are normally photographed.
  const PINNED = [];
  const GRAVITY = 0.012;

  // bones: compression members
  const STRUTS = [
    ["neck", "shoulderL"], ["neck", "shoulderR"],          // clavicles
    ["shoulderL", "elbowL"], ["shoulderR", "elbowR"],      // humerus
    ["elbowL", "handL"], ["elbowR", "handR"],              // forearm
    ["shoulderL", "thoraxR"], ["shoulderR", "thoraxL"],    // crossing spinal struts:
    ["thoraxL", "lumbarR"], ["thoraxR", "lumbarL"],        //  the tensegrity mast that
    ["lumbarL", "pelvisR"], ["lumbarR", "pelvisL"],        //  keeps the column floating
    ["pelvisL", "kneeL"], ["pelvisR", "kneeR"],            // femur
    ["kneeL", "footL"], ["kneeR", "footR"],                // tibia
    ["head", "neck"],
  ];

  // fascia / muscle: tension members, pull only
  const CABLES = [
    ["shoulderL", "shoulderR"], ["thoraxL", "thoraxR"],
    ["lumbarL", "lumbarR"], ["pelvisL", "pelvisR"],        // transverse bands
    ["shoulderL", "thoraxL"], ["shoulderR", "thoraxR"],
    ["thoraxL", "lumbarL"], ["thoraxR", "lumbarR"],
    ["lumbarL", "pelvisL"], ["lumbarR", "pelvisR"],        // longitudinal lines
    ["neck", "thoraxL"], ["neck", "thoraxR"],
    ["shoulderL", "pelvisR"], ["shoulderR", "pelvisL"],    // posterior oblique slings
    ["shoulderL", "handL"], ["shoulderR", "handR"],        // arm lines
    ["pelvisL", "footL"], ["pelvisR", "footR"],            // superficial back line
    ["pelvisL", "kneeR"], ["pelvisR", "kneeL"],            // adductor cross-support
    ["kneeL", "kneeR"],
  ];

  function create(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    let pts = {}, links = [], W = 0, H = 0, S = 1, ox = 0, oy = 0;
    let grabbed = null, px = -999, py = -999, pointerIn = false;
    let severed = 0, home = null;
    let heldFor = 0, holdFired = false;      // how long the current grab has lasted

    function centroid() {
      let x = 0, y = 0, n = 0;
      for (const k in pts) { x += pts[k].x; y += pts[k].y; n++; }
      return n ? { x: x / n, y: y / n } : { x: 0, y: 0 };
    }

    // Shape matching (Müller et al., "Meshless Deformations Based on Shape Matching").
    //
    // Struts and cables alone cannot restore this rig: cables only resist stretch, so once
    // deformed it can sit happily in a slack configuration, and with nothing pinned a pull
    // simply tows and spins the whole body instead of deforming it. So each frame we find
    // the best-fit rigid motion (rotation + translation) taking the rest pose onto the
    // current one, and draw every node a little way toward where that motion says it should
    // be. It restores shape and orientation without forbidding deformation.
    //
    // Physically this stands in for the elastic recoil of genuinely prestressed fascia -
    // which a real tensegrity gets from a solved self-stress state, and this anatomically
    // hand-assigned rig cannot.
    function shapeMatch(alpha) {
      if (!home) return;
      const c = centroid();
      let sxx = 0, sxy = 0;
      for (const k in pts) {
        const hx = home.pos[k][0] - home.c.x, hy = home.pos[k][1] - home.c.y;
        const qx = pts[k].x - c.x, qy = pts[k].y - c.y;
        sxx += qx * hx + qy * hy;
        sxy += qy * hx - qx * hy;
      }
      // Best-fit rotation of the rest pose onto the current one. While you are holding the
      // body it is free to turn; once released we decay that angle back toward zero so it
      // rights itself instead of slowly tumbling out of frame.
      let th = Math.atan2(sxy, sxx);
      if (!grabbed) th *= 0.965;
      const cs = Math.cos(th), sn = Math.sin(th);
      for (const k in pts) {
        const p = pts[k];
        if (p.pin) continue;
        const hx = home.pos[k][0] - home.c.x, hy = home.pos[k][1] - home.c.y;
        const tx = c.x + (cs * hx - sn * hy), ty = c.y + (sn * hx + cs * hy);
        p.x += (tx - p.x) * alpha;
        p.y += (ty - p.y) * alpha;
      }
    }

    function build() {
      const r = canvas.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);

      // Body height. Capped against width too: the arms span ±0.30·S, so on a short wide
      // canvas an unbounded height would push the hands off the sides.
      S = Math.min(H * (opts.fill ? 0.74 : 0.80), W * 1.35);
      ox = W / 2;
      oy = H / 2 - 0.42 * S;              // centred on the canvas, not sat on a floor

      pts = {};
      for (const k in N) {
        const x = ox + N[k][0] * S, y = oy + N[k][1] * S;
        pts[k] = { x, y, px: x, py: y, pin: PINNED.indexOf(k) >= 0, k };
      }
      home = { c: centroid(), pos: {} };
      for (const k in pts) home.pos[k] = [pts[k].x, pts[k].y];
      links = [];
      // PRESTRESS is the whole trick. Cables are built ~10% shorter than the geometry
      // needs, so they are permanently taut and the struts push out against them. A slack
      // net transmits nothing and stores nothing; a pre-tensioned one carries load
      // everywhere at once and springs back to shape. This is what makes a tensegrity a
      // tensegrity rather than a bag of sticks.
      // Cables sit at exactly their built length. Earlier drafts pre-shortened them to mimic
      // real prestress, but this rig's members were assigned by anatomy rather than solved
      // for equilibrium, so there is no self-stress state to find: it simply contracted
      // into a ball. At 1.0 the built pose IS the equilibrium: nothing pulls until you do.
      const PRESTRESS = 1.0;
      const add = (a, b, type) => {
        const dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y;
        const L = Math.hypot(dx, dy);
        links.push({ a, b, type, len: type === "cable" ? L * PRESTRESS : L, alive: true, t: 0 });
      };
      STRUTS.forEach(l => add(l[0], l[1], "strut"));
      CABLES.forEach(l => add(l[0], l[1], "cable"));
      severed = 0;
    }

    function step(dt) {
      const g = GRAVITY * dt * 60;
      for (const k in pts) {
        const p = pts[k];
        if (p.pin) continue;
        const vx = (p.x - p.px) * 0.988, vy = (p.y - p.py) * 0.988;
        p.px = p.x; p.py = p.y;
        p.x += Math.max(-40, Math.min(40, vx));
        p.y += Math.max(-40, Math.min(40, vy)) + g;
      }

      if (grabbed) {
        const p = pts[grabbed];
        p.x = px; p.y = py; p.px = px; p.py = py;
        // keep hold of it long enough and something is waiting
        heldFor += dt;
        if (!holdFired && heldFor >= (opts.holdSeconds || 2) && opts.onHold) {
          holdFired = true; opts.onHold();
        }
      } else if (pointerIn && opts.ambient !== false) {
        // ambient life: the body leans very slightly away from the cursor, so it feels
        // alive before you ever click it
        for (const k in pts) {
          const p = pts[k];
          if (p.pin) continue;
          const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 26000 && d2 > 1) {
            const f = (1 - d2 / 26000) * 0.55, d = Math.sqrt(d2);
            p.x += dx / d * f; p.y += dy / d * f;
          }
        }
      }

      for (let it = 0; it < 16; it++) {
        for (const s of links) {
          if (!s.alive) continue;
          const a = pts[s.a], b = pts[s.b];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          if (s.type === "cable" && d <= s.len) { if (it === 0) s.t = 0; continue; }
          if (it === 0) s.t = Math.abs(d - s.len) / s.len;
          const diff = (d - s.len) / d;
          const stiff = s.type === "strut" ? 1.0 : 0.42;
          const ma = a.pin ? 0 : (b.pin ? 1 : 0.5);
          const mb = b.pin ? 0 : (a.pin ? 1 : 0.5);
          a.x += dx * diff * ma * stiff; a.y += dy * diff * ma * stiff;
          b.x -= dx * diff * mb * stiff; b.y -= dy * diff * mb * stiff;
        }
      }

      // gentler while you are holding it, so the body yields to a pull instead of fighting it
      shapeMatch(grabbed ? 0.035 : 0.26);

      if (home) {                                  // hold station without altering shape
        const c = centroid();
        const dx = (home.c.x - c.x) * 0.08, dy = (home.c.y - c.y) * 0.08;
        for (const k in pts) { const p = pts[k]; p.x += dx; p.y += dy; p.px += dx; p.py += dy; }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // ground line
      ctx.strokeStyle = "rgba(94,234,212,0.16)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W * 0.5 - S * 0.30, oy + 0.955 * S);
      ctx.lineTo(W * 0.5 + S * 0.30, oy + 0.955 * S); ctx.stroke();

      // tension network
      for (const s of links) {
        if (!s.alive || s.type !== "cable") continue;
        const a = pts[s.a], b = pts[s.b];
        const t = Math.min(1, s.t * 11);
        ctx.strokeStyle = "rgba(94,234,212," + (0.14 + t * 0.72).toFixed(3) + ")";
        ctx.lineWidth = 0.9 + t * 2.1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // bones
      ctx.lineCap = "round";
      for (const s of links) {
        if (!s.alive || s.type !== "strut") continue;
        const a = pts[s.a], b = pts[s.b];
        ctx.strokeStyle = "rgba(232,237,247,0.92)"; ctx.lineWidth = 7.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = "#aeb9cf"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // head
      const h = pts.head;
      ctx.fillStyle = "#e8edf7";
      ctx.beginPath(); ctx.arc(h.x, h.y, S * 0.062, 0, 7); ctx.fill();

      // joints
      for (const k in pts) {
        const p = pts[k];
        if (k === "head") continue;
        const near = grabbed === k || (pointerIn && Math.hypot(p.x - px, p.y - py) < 26);
        ctx.fillStyle = p.pin ? "#647092" : (near ? "#bff7ec" : "#5eead4");
        ctx.beginPath(); ctx.arc(p.x, p.y, near ? 5.4 : 3.6, 0, 7); ctx.fill();
      }
    }

    // ---- pointer ----
    const local = e => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches && e.touches[0] ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const onDown = e => {
      const p = local(e); px = p.x; py = p.y; pointerIn = true;
      let best = null, bd = 34;
      for (const k in pts) {
        if (pts[k].pin) continue;
        const d = Math.hypot(pts[k].x - p.x, pts[k].y - p.y);
        if (d < bd) { bd = d; best = k; }
      }
      grabbed = best;
      if (grabbed) {
        canvas.style.cursor = "grabbing";
        if (e.cancelable) e.preventDefault();
        if (opts.onGrab) opts.onGrab();
      }
    };
    const onMove = e => {
      const p = local(e); px = p.x; py = p.y; pointerIn = true;
      if (grabbed && e.cancelable) e.preventDefault();
    };
    const onUp = () => { grabbed = null; heldFor = 0; canvas.style.cursor = "grab"; };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    canvas.addEventListener("mouseleave", () => { pointerIn = false; });

    build();

    return {
      step, draw, build,
      settle(n) { for (let i = 0; i < (n || 90); i++) step(1 / 60); },
      cutCable() {
        const live = links.filter(l => l.type === "cable" && l.alive);
        if (!live.length) return 0;
        live[Math.floor(Math.random() * live.length)].alive = false;
        return ++severed;
      },
      restore() { links.forEach(l => l.alive = true); severed = 0; },
      nodes() { return pts; },
      grabbedKey() { return grabbed; },
      dragTo(key, x, y) { grabbed = key; px = x; py = y; },
      release() { grabbed = null; },
      get severed() { return severed; },
      tension() { return links.reduce((s, l) => s + (l.alive && l.type === "cable" ? l.t : 0), 0); },
    };
  }

  window.TensegrityHero = { create: create };
})();
