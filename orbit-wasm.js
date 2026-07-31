// Orbital core for the Motion Lab landing page.
//
// The physics below is NOT JavaScript. It is a WebAssembly module that was
// hand-assembled byte by byte — LEB128 section headers, opcode by opcode —
// with no compiler and no toolchain in the loop. It is 780 bytes, embedded
// here as base64, so the landing page has zero network dependencies: nothing
// to fetch, nothing to fail, nothing to wait for.
//
// It computes two things every frame:
//   * starfield parallax drift for a few hundred stars
//   * true Newtonian orbits for the satellites circling the hero
//
// If WebAssembly is unavailable for any reason, an identical JavaScript
// implementation takes over silently (see JsCore below) — the page never
// depends on the clever version working.

const ORBIT_WASM_B64 =
  "AGFzbQEAAAABEwNgAAF9YAV/f399fQBgA319fQADBAMAAQIFAwEAAgcYAwZtZW1vcnkCAARpbml0AAEEc3RlcAACCscFAzQBAX9BAEEAKAIAIgBBDXQgAHMiAEERdiAAcyIAQQV0IABzIgA2AgAgAEEIdrNDAACAM5QLvQICAn8EfUEAIABBAXI2AgBBBCABNgIAQQggAjYCAEEAIQUCQANAIAUgAU4NAUHAACAFQRBsaiEGIAYQACADlDgCACAGEAAgBJQ4AgQgBhAAQwAAQD+UQwAAgD6SOAIIIAYQADgCDCAFQQFqIQUMAAsLQQAhBQJAA0AgBSACTg0BQcDAACAFQRhsaiEGEABDAAAAP5MgA5RDUrgeP5QhBxAAQwAAAD+TIASUQ1K4Hj+UIQggByAHlCAIIAiUkpFDAACAP5IhCSAGIANDAAAAP5QgB5I4AgAgBiAEQwAAAD+UIAiSOAIEQwCxHkogCZWRIQogBiAIjCAJlSAKlDgCCCAGIAcgCZUgCpQ4AgwgBhAAQzMzsz+UQ5qZGT+SOAIQIAYQAENmZuY/lEMAAIA/kjgCFCAFQQFqIQUMAAsLC9ACAgN/Bn1BBCgCACEFQQAhAwJAA0AgAyAFTg0BQcAAIANBEGxqIQQgBCAEKgIAIAQqAgggAJRDAADQQZSTIgY4AgAgBkMAAAAAXQRAIAQgBiABkjgCAAsgBCAEKgIMIAAgBCoCCEMzM7M+kpSSIgc4AgwgB0MAAIA/XgRAIAQgB0MAAIA/kzgCDAsgA0EBaiEDDAALC0EIKAIAIQVBACEDAkADQCADIAVODQFBwMAAIANBGGxqIQQgAUMAAAA/lCAEKgIAkyEGIAJDAAAAP5QgBCoCBJMhByAGIAaUIAcgB5SSQwAAlkSSIgiRIQlDALEeSiAIlSAAlCEKIAQgBCoCCCAGIAmVIAqUkiILOAIIIAQgBCoCDCAHIAmVIAqUkjgCDCAEIAQqAgAgCyAAlJI4AgAgBCAEKgIEIAQqAgwgAJSSOAIEIANBAWohAwwACwsL";

const ORBIT_WAT = `(module
  ;; Motion Lab — orbital core. Hand-assembled to raw WebAssembly bytes:
  ;; no compiler, no toolchain, no CDN. 780 bytes, embedded in the page.

  (memory (export "memory") 2)                  ;; 128 KiB of linear memory

  ;; ---- xorshift32: the whole random number generator, in 9 instructions ----
  (func $rnd (result f32)
    (local $s i32)
    i32.const 0
    i32.const 0  i32.load  local.tee $s
    i32.const 13 i32.shl   local.get $s  i32.xor  local.tee $s
    i32.const 17 i32.shr_u local.get $s  i32.xor  local.tee $s
    i32.const 5  i32.shl   local.get $s  i32.xor  local.tee $s
    i32.store
    local.get $s i32.const 8 i32.shr_u
    f32.convert_i32_u
    f32.const 5.9604645e-8)                     ;; * 1/2^24  ->  [0,1)

  ;; ---- init: scatter the stars, then place each body on a circular orbit ----
  (func (export "init")
        (param $seed i32) (param $nStars i32) (param $nBodies i32)
        (param $w f32) (param $h f32)
    ;; stars: x, y, depth in [0.25,1], twinkle phase
    ;;
    ;; bodies: drop at a random offset from centre, then solve for the speed
    ;; that makes the orbit circular —  v = sqrt(GM / r)  — and point the
    ;; velocity perpendicular to the radius.  No trigonometry anywhere:
    ;; the perpendicular is just (-dy/r, dx/r).
    ...)

  ;; ---- step: one integration tick ----
  (func (export "step") (param $dt f32) (param $w f32) (param $h f32)
    ;; stars   — parallax drift proportional to depth, wrapping at the edge
    ;; bodies  — Newtonian gravity toward the centre of mass:
    ;;
    ;;     r2 = dx*dx + dy*dy + softening
    ;;     a  = GM / r2
    ;;     v += (d/r) * a * dt
    ;;     p += v * dt
    ;;
    ;; Softening keeps the singularity at r=0 from blowing the orbit apart.
    ...))
`;

const STAR_BASE = 64, BODY_BASE = 8256, GM = 2.6e6, SOFT = 1200;

// ---- identical physics in plain JS, used when wasm can't load ----
function JsCore() {
  let s = 1, stars = [], bodies = [];
  const rnd = () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 8) & 0xffffff) / 16777216;
  };
  return {
    engine: "js",
    init(seed, nStars, nBodies, w, h) {
      s = seed | 1; stars = []; bodies = [];
      for (let i = 0; i < nStars; i++)
        stars.push({ x: rnd() * w, y: rnd() * h, d: 0.25 + rnd() * 0.75, tw: rnd() });
      for (let i = 0; i < nBodies; i++) {
        const dx = (rnd() - 0.5) * w * 0.62, dy = (rnd() - 0.5) * h * 0.62;
        const r = Math.hypot(dx, dy) + 1, v = Math.sqrt(GM / r);
        bodies.push({ x: w / 2 + dx, y: h / 2 + dy, vx: -dy / r * v, vy: dx / r * v,
                      m: 0.6 + rnd() * 1.4, r: 1 + rnd() * 1.8 });
      }
    },
    step(dt, w, h) {
      for (const st of stars) {
        st.x -= st.d * dt * 26;
        if (st.x < 0) st.x += w;
        st.tw += dt * (0.35 + st.d);
        if (st.tw > 1) st.tw -= 1;
      }
      for (const b of bodies) {
        const dx = w / 2 - b.x, dy = h / 2 - b.y;
        const r2 = dx * dx + dy * dy + SOFT, r = Math.sqrt(r2), a = GM / r2 * dt;
        b.vx += dx / r * a; b.vy += dy / r * a;
        b.x += b.vx * dt;   b.y += b.vy * dt;
      }
    },
    stars: () => stars,
    bodies: () => bodies,
  };
}

function WasmCore(instance) {
  const { memory, init, step } = instance.exports;
  let f32 = new Float32Array(memory.buffer);
  let nS = 0, nB = 0;
  const refresh = () => { if (f32.buffer !== memory.buffer) f32 = new Float32Array(memory.buffer); };
  return {
    engine: "wasm",
    init(seed, nStars, nBodies, w, h) {
      nS = nStars; nB = nBodies; init(seed, nStars, nBodies, w, h); refresh();
    },
    step(dt, w, h) { step(dt, w, h); refresh(); },
    stars() {
      const o = STAR_BASE / 4, out = [];
      for (let i = 0; i < nS; i++)
        out.push({ x: f32[o + i * 4], y: f32[o + i * 4 + 1], d: f32[o + i * 4 + 2], tw: f32[o + i * 4 + 3] });
      return out;
    },
    bodies() {
      const o = BODY_BASE / 4, out = [];
      for (let i = 0; i < nB; i++)
        out.push({ x: f32[o + i * 6], y: f32[o + i * 6 + 1], m: f32[o + i * 6 + 4], r: f32[o + i * 6 + 5] });
      return out;
    },
  };
}

window.OrbitCore = {
  wat: ORBIT_WAT,
  byteLength: 780,
  async load() {
    try {
      const bin = Uint8Array.from(atob(ORBIT_WASM_B64), c => c.charCodeAt(0));
      const { instance } = await WebAssembly.instantiate(bin, {});
      return WasmCore(instance);
    } catch (e) {
      console.warn("orbital core: wasm unavailable, using JS fallback —", e);
      return JsCore();
    }
  },
};
