// Muscle Dyno: a normalised Hill-type muscle model you can drag. The model is written in Ruby and
// executed live in the browser via ruby.wasm (CRuby compiled to WebAssembly); an identical JS model
// is the fallback so the page always works. Grounded in the length–tension and force–velocity
// relationships (Neumann; Nordin & Frankel; Enoka; Hill 1938). Normalised units: force in F0, v in Vmax.

const RUBY_SRC = `# Normalised Hill-type muscle model  (force in F0, velocity in Vmax)

SIGMA = 0.20   # width of the length-tension bell

def active_fl(l)                 # active force from actin-myosin overlap
  Math.exp(-((l - 1.0) ** 2) / (2 * SIGMA ** 2))
end

def passive_fl(l)                # passive tension from stretched connective tissue
  return 0.0 if l <= 1.0
  k = 5.0
  v = (Math.exp(k * (l - 1.0)) - 1.0) / (Math.exp(k * 0.6) - 1.0)
  v.clamp(0.0, 1.6)
end

def force_velocity(v)            # Hill: shortening weakens force, lengthening strengthens it
  if v >= 0                      # concentric (shortening)
    ((1.0 - v) / (1.0 + v / 0.25)).clamp(0.0, 1.0)
  else                           # eccentric (lengthening)
    s = -v
    1.0 + 0.6 * s / (s + 0.3)
  end
end

def operating_point(l, v, act)   # -> "active|passive|fv|total|power|afl"
  active  = act * active_fl(l) * force_velocity(v)
  passive = passive_fl(l)
  total   = active + passive
  [active, passive, force_velocity(v), total, total * v, active_fl(l)]
    .map { |x| x.round(4) }.join("|")
end`;

// ---- JS mirror (fallback + curve drawing) ----
const SIGMA = 0.20;
const jAFL = l => Math.exp(-((l - 1) ** 2) / (2 * SIGMA ** 2));
const jPFL = l => { if (l <= 1) return 0; const k = 5; return Math.min(1.6, Math.max(0, (Math.exp(k * (l - 1)) - 1) / (Math.exp(k * 0.6) - 1))); };
const jFV = v => { if (v >= 0) return Math.min(1, Math.max(0, (1 - v) / (1 + v / 0.25))); const s = -v; return 1 + 0.6 * s / (s + 0.3); };
function jsPoint(l, v, act) { const active = act * jAFL(l) * jFV(v); const passive = jPFL(l); const total = active + passive; return { active, passive, fv: jFV(v), total, power: total * v, afl: jAFL(l) }; }

let rvm = null, rubyReady = false;
function point(l, v, act) {
  if (rubyReady) {
    try {
      const s = rvm.eval(`operating_point(${l}, ${v}, ${act})`).toString().split("|").map(Number);
      return { active: s[0], passive: s[1], fv: s[2], total: s[3], power: s[4], afl: s[5] };
    } catch (e) { /* fall through */ }
  }
  return jsPoint(l, v, act);
}

// ---- lang helper ----
const L = (en, pl) => (window.i18n && window.i18n.lang === "pl") ? pl : en;

// ---- DOM ----
const el = id => document.getElementById(id);
const lenEl = el("len"), velEl = el("vel"), actEl = el("act");
const lenVal = el("lenVal"), velVal = el("velVal"), actVal = el("actVal");
const engineBadge = el("engineBadge");
const ltC = el("ltChart"), fvC = el("fvChart"), saC = el("sarco");
const readoutsEl = el("readouts"), sarcoNote = el("sarcoNote");

// ---- canvas helper ----
function ctxOf(c, aspectH) {
  const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth || 520, H = Math.round(W * aspectH);
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H); return { ctx, W, H };
}
const COL = { active: "#7c9bff", passive: "#5eead4", total: "#ff6f5e", power: "#ffb43c", grid: "rgba(255,255,255,0.06)", ax: "#647092" };

function axes(ctx, W, H, xlab, ylab) {
  ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = 24 + (H - 48) * i / 4; ctx.beginPath(); ctx.moveTo(44, y); ctx.lineTo(W - 12, y); ctx.stroke(); }
  ctx.fillStyle = COL.ax; ctx.font = "10px Inter, sans-serif";
  ctx.fillText(xlab, W - 12 - ctx.measureText(xlab).width, H - 4);
  ctx.save(); ctx.translate(11, 26); ctx.rotate(-Math.PI / 2); ctx.fillText(ylab, -ctx.measureText(ylab).width, 0); ctx.restore();
}

// length–tension chart
function drawLT(l) {
  const { ctx, W, H } = ctxOf(ltC, 240 / 520);
  const x0 = 44, x1 = W - 12, y0 = H - 24, y1 = 24, YMAX = 1.7;
  const X = v => x0 + (v - 0.5) / (1.7 - 0.5) * (x1 - x0);
  const Y = f => y0 - Math.min(f, YMAX) / YMAX * (y0 - y1);
  axes(ctx, W, H, "length (L/L₀)", "force (×F₀)");
  const plot = (fn, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const lv = 0.5 + i / 120 * 1.2; const p = X(lv), q = Y(fn(lv)); i ? ctx.lineTo(p, q) : ctx.moveTo(p, q); } ctx.stroke(); };
  plot(jAFL, COL.active, 2);
  plot(jPFL, COL.passive, 2);
  plot(lv => jAFL(lv) + jPFL(lv), COL.total, 2.6);
  // marker on total at current length (uses full activation for the curve, marker shows total)
  const tot = jAFL(l) + jPFL(l);
  ctx.strokeStyle = "rgba(232,237,247,0.4)"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(l), y0); ctx.lineTo(X(l), Y(tot)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = COL.total; ctx.beginPath(); ctx.arc(X(l), Y(tot), 4, 0, 7); ctx.fill();
  // legend
  ctx.font = "10px Inter, sans-serif";
  [["active", COL.active], ["passive", COL.passive], ["total", COL.total]].forEach(([t, c], i) => {
    ctx.fillStyle = c; ctx.fillRect(52 + i * 66, 12, 10, 3); ctx.fillStyle = COL.ax; ctx.fillText(t, 65 + i * 66, 16); });
}

// force–velocity + power chart
function drawFV(v) {
  const { ctx, W, H } = ctxOf(fvC, 240 / 520);
  const x0 = 44, x1 = W - 12, y0 = H - 24, y1 = 24, YMAX = 1.7;
  const X = vv => x0 + (vv + 1) / 2 * (x1 - x0);
  const Y = f => y0 - Math.min(Math.max(f, 0), YMAX) / YMAX * (y0 - y1);
  axes(ctx, W, H, "← lengthen   v   shorten →", "force / power");
  // isometric line
  ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(0), y1); ctx.lineTo(X(0), y0); ctx.stroke();
  // force
  ctx.strokeStyle = COL.total; ctx.lineWidth = 2.6; ctx.beginPath();
  for (let i = 0; i <= 120; i++) { const vv = -1 + i / 120 * 2; const p = X(vv), q = Y(jFV(vv)); i ? ctx.lineTo(p, q) : ctx.moveTo(p, q); } ctx.stroke();
  // power (force*v, shortening only)
  ctx.strokeStyle = COL.power; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 120; i++) { const vv = -1 + i / 120 * 2; const pw = Math.max(0, jFV(vv) * vv); const p = X(vv), q = Y(pw); i ? ctx.lineTo(p, q) : ctx.moveTo(p, q); } ctx.stroke();
  // marker
  ctx.strokeStyle = "rgba(232,237,247,0.4)"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(v), y0); ctx.lineTo(X(v), Y(jFV(v))); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = COL.total; ctx.beginPath(); ctx.arc(X(v), Y(jFV(v)), 4, 0, 7); ctx.fill();
  ctx.font = "10px Inter, sans-serif";
  [["force", COL.total], ["power", COL.power]].forEach(([t, c], i) => {
    ctx.fillStyle = c; ctx.fillRect(52 + i * 66, 12, 10, 3); ctx.fillStyle = COL.ax; ctx.fillText(t, 65 + i * 66, 16); });
}

// sarcomere overlap cartoon
function drawSarco(l) {
  const { ctx, W, H } = ctxOf(saC, 120 / 360);
  const cy = H / 2, half = (W - 40) / 2 * (l / 1.35);   // Z-lines spread with length
  const zL = W / 2 - half, zR = W / 2 + half;
  // Z-lines
  ctx.strokeStyle = "#c7d0e0"; ctx.lineWidth = 3;
  [zL, zR].forEach(x => { ctx.beginPath(); ctx.moveTo(x, cy - 26); ctx.lineTo(x, cy + 26); ctx.stroke(); });
  // myosin (thick, centred)
  const myo = Math.min(52, (W) * 0.16);
  ctx.strokeStyle = "#ff6f5e"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(W / 2 - myo, cy); ctx.lineTo(W / 2 + myo, cy); ctx.stroke();
  // actin (thin, from each Z toward centre)
  ctx.strokeStyle = "#7c9bff"; ctx.lineWidth = 2.5;
  const actLen = (W / 2 - zL) * 0.92;
  ctx.beginPath(); ctx.moveTo(zL, cy - 8); ctx.lineTo(zL + actLen, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(zR, cy + 8); ctx.lineTo(zR - actLen, cy + 8); ctx.stroke();
  sarcoNote.textContent = l < 0.85 ? L("too short, filaments collide, low force", "za krótki, filamenty kolidują, mała siła")
    : l > 1.4 ? L("too long, little overlap, low active force", "za długi, małe zachodzenie, mała siła czynna")
      : (l >= 0.9 && l <= 1.15) ? L("optimal filament overlap, peak force", "optymalne zachodzenie filamentów, szczytowa siła")
        : L("reduced overlap", "zmniejszone zachodzenie");
}

function fmt(x) { return (x >= 0 ? "" : "") + (x * 100).toFixed(0) + "%"; }
function updateReadouts(p) {
  readoutsEl.innerHTML =
    row(L("Active force", "Siła czynna"), p.active, "rv-active") +
    row(L("Passive force", "Siła bierna"), p.passive, "rv-passive") +
    row(L("Total force", "Siła całkowita"), p.total, "rv-total") +
    row(L("Power", "Moc"), p.power, "rv-power");
}
function row(k, v, cls) { return `<div class="dyno-read"><span class="rk">${k}</span><span class="rv ${cls}">${(v * 100).toFixed(0)}%</span></div>`; }

function update() {
  const l = parseFloat(lenEl.value), v = parseFloat(velEl.value), a = parseFloat(actEl.value);
  lenVal.textContent = l.toFixed(2) + " L₀";
  velVal.textContent = Math.abs(v) < 0.02 ? L("isometric", "izometrycznie")
    : (v > 0 ? L("shortening ", "skracanie ") : L("lengthening ", "wydłużanie ")) + Math.abs(v).toFixed(2) + " V_max";
  actVal.textContent = Math.round(a * 100) + "%";
  const p = point(l, v, a);
  updateReadouts(p);
  drawLT(l); drawFV(v); drawSarco(l);
}

// ---- syntax-highlight + show the Ruby source ----
function hl(src) {
  let s = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/(#.*)$/gm, '<span class="cm">$1</span>');
  s = s.replace(/\b(def|end|return|if|else|elsif|then)\b/g, '<span class="kw">$1</span>');
  s = s.replace(/\b(\d+\.\d+|\d+)\b/g, '<span class="num">$1</span>');
  return s;
}
el("rubySrc").innerHTML = hl(RUBY_SRC);

// ---- engine badge (re-renderable so it can re-localize on language toggle) ----
let engineState = "boot"; // boot | ruby | js
function renderBadge() {
  if (engineState === "ruby") {
    engineBadge.className = "dyno-engine ruby";
    engineBadge.textContent = L("💎 live: your operating point is computed in Ruby (ruby.wasm 3.3)",
      "💎 na żywo: Twój punkt pracy jest obliczany w Ruby (ruby.wasm 3.3)");
  } else if (engineState === "js") {
    engineBadge.className = "dyno-engine js";
    engineBadge.textContent = L("⚙ Ruby engine unavailable, running the identical JS model",
      "⚙ Silnik Ruby niedostępny, działa identyczny model JS");
  } else {
    engineBadge.textContent = L("⏳ booting Ruby engine (ruby.wasm)…",
      "⏳ uruchamianie silnika Ruby (ruby.wasm)…");
  }
}

// ---- boot Ruby (async, non-blocking) ----
async function initRuby() {
  try {
    const { DefaultRubyVM } = await import("https://cdn.jsdelivr.net/npm/@ruby/wasm-wasi/dist/browser/+esm");
    const resp = await fetch("https://cdn.jsdelivr.net/npm/@ruby/3.3-wasm-wasi/dist/ruby.wasm");
    const mod = await WebAssembly.compileStreaming(resp);
    const { vm } = await DefaultRubyVM(mod);
    vm.eval(RUBY_SRC);
    // smoke-test the round-trip
    vm.eval("operating_point(1.0, 0.0, 1.0)").toString();
    rvm = vm; rubyReady = true;
    engineState = "ruby"; renderBadge();
    update();
  } catch (e) {
    console.warn("ruby.wasm unavailable, using JS model:", e);
    engineState = "js"; renderBadge();
  }
}

[lenEl, velEl, actEl].forEach(e => e.addEventListener("input", update));
window.addEventListener("resize", update);
document.addEventListener("i18n:changed", () => { renderBadge(); update(); });
renderBadge();
update();
initRuby();
