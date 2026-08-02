// Gait Lab: introduce a deficit into normal walking and watch the compensation emerge.
// Reuses the shared engine: MOVEMENTS/computeScales/liveState (data.js + runtime.js) for the
// baseline walking kinematics, and computeSkeleton/SEG (figure.js) for geometry. Each condition
// is a transform on the per-frame joint-angle state, applied to the near (affected) leg only;
// the contralateral leg stays typical so the asymmetry reads clearly. The faint "ghost" is
// unmodified typical gait drawn behind, so the compensation is visible by contrast.
//
// Deficits + compensations follow the classic patterns described in Perry & Burnfield,
// Gait Analysis: Normal and Pathological Function (2nd ed.).

const movement = MOVEMENTS.walk;
let scales = computeScales(movement, movement.param.default);
const shift = movement.contralateralShift || 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const phaseOf = (st) => (st.grf > 0.06 ? "stance" : "swing");

// ---- conditions: transform(state, phase, severity) mutates & returns a cloned state ----
const CONDITIONS = {
  typical: {
    name: "Typical gait",
    primary: "Healthy walking, shown for reference: heel strike, a controlled knee-flexion wave at loading, a smooth ankle rocker through stance, and an active toe-off push.",
    comp: "None needed. Every muscle group fires on time.",
    note: "",
    transform: (s) => s,
  },
  footdrop: {
    name: "Foot drop (weak dorsiflexors)",
    primary: "The ankle dorsiflexors (tibialis anterior & co.) are weak or denervated, so the foot can't lift: the toes hang down through swing and the forefoot slaps the floor at contact instead of a heel strike.",
    comp: "Steppage gait. The hip and knee flex much more than normal in swing to hoist the dropped foot up and clear the toes over the ground.",
    note: "",
    transform: (s, phase, sev) => {
      if (phase === "swing") { s.ankleAngle -= 26 * sev; s.hipAngle += 12 * sev; s.kneeAngle += 24 * sev; }
      else { s.ankleAngle -= 10 * sev; }
      return s;
    },
  },
  weakquads: {
    name: "Weak quadriceps",
    primary: "The quadriceps can't resist the knee-flexion moment during weight acceptance, so the normal shock-absorbing knee bend would buckle the limb.",
    comp: "The knee is thrown into full extension, sometimes into hyperextension ('back-kneeing'), while the trunk leans forward, so body weight falls ahead of the knee and locks it passively with no quad force required.",
    note: "Over years this repeated hyperextension can stretch the posterior knee structures (genu recurvatum).",
    transform: (s, phase, sev) => {
      if (phase === "stance") { s.kneeAngle = clamp(s.kneeAngle * (1 - sev) - 6 * sev, -9, 90); s.trunkLean += 11 * sev; }
      return s;
    },
  },
  stiffankle: {
    name: "Stiff / fused ankle",
    primary: "A stiff or fused ankle can't roll the tibia forward over the planted foot (stance dorsiflexion) or push off at the end of stance (plantarflexion).",
    comp: "Early heel-off with a shorter, flatter step, plus 'vaulting', which means rising onto the toes of the other leg to carry the body past the locked ankle. The knee often hyperextends to help.",
    note: "",
    transform: (s, phase, sev) => {
      s.ankleAngle = s.ankleAngle * (1 - 0.85 * sev);
      if (phase === "stance") s.kneeAngle -= 5 * sev;
      return s;
    },
  },
  antalgic: {
    name: "Antalgic (painful limb)",
    primary: "The cause here is pain, not weakness. Loading the limb hurts, so the nervous system does the one thing that reliably reduces load: it gets off that leg as fast as possible. This is the single most common gait deviation you will ever see.",
    comp: "A markedly shortened stance time on the painful side, taken with a flat, cautious landing instead of a heel strike, a reduced push-off, and a shorter step on the opposite side because the sound limb hurries to take over. The trunk also leans toward the painful side, which shifts the body's weight line closer to the hip and cuts the force the hip abductors need to produce.",
    note: "Because the deviation is driven by pain and not by a fixed mechanical fault, it can change hour to hour, and it disappears when the pain does. Always ask before you attribute an antalgic pattern to weakness.",
    transform: (s, phase, sev) => {
      if (phase === "stance") {
        s.kneeAngle += 6 * sev;            // held softly flexed, guarded
        s.ankleAngle -= 6 * sev;           // flatter landing, less heel contact
        s.trunkLean += 8 * sev;            // guarded, weight shifted over the limb
        s.grf *= (1 - 0.28 * sev);         // deliberately unloaded
      }
      return s;
    },
  },
  stiffknee: {
    name: "Stiff knee (won't flex in swing)",
    primary: "The knee stays extended in swing, either from quadriceps over-activity or from a fused joint, leaving the leg functionally too long to clear the floor.",
    comp: "The pelvis hikes and the body vaults, or the leg circumducts (swings out to the side), so the long, stiff limb passes through without catching the toe.",
    note: "Circumduction and pelvic drop are side-to-side motions and hard to show from this side-on view, so watch mainly the reduced knee bend and the hip hiking up in swing.",
    transform: (s, phase, sev) => {
      if (phase === "swing") { s.kneeAngle *= (1 - 0.8 * sev); s.hipDrop -= 3 * sev; }
      return s;
    },
  },
};
const ORDER = ["typical", "antalgic", "footdrop", "weakquads", "stiffankle", "stiffknee"];

// ---- Polish strings for the dynamic diagnosis panel + tabs ----
const CONDITIONS_PL = {
  typical: {
    name: "Chód prawidłowy",
    primary: "Zdrowy chód, pokazany dla odniesienia: kontakt pięty, kontrolowana fala zgięcia kolana przy przyjęciu obciążenia, płynne przetoczenie stawu skokowego przez fazę podporu i aktywne odbicie palcami.",
    comp: "Żadna nie jest potrzebna. Każda grupa mięśniowa włącza się na czas.",
    note: "",
  },
  antalgic: {
    name: "Chód antalgiczny (bolesna kończyna)",
    primary: "Przyczyną jest ból, a nie osłabienie. Obciążanie kończyny boli, więc układ nerwowy robi jedyną rzecz, która niezawodnie zmniejsza obciążenie: schodzi z tej nogi tak szybko, jak to możliwe. To najczęstsze odchylenie chodu, jakie w ogóle zobaczysz.",
    comp: "Wyraźnie skrócony czas podporu po stronie bolesnej, z płaskim, ostrożnym lądowaniem zamiast kontaktu pięty, osłabionym odbiciem i krótszym krokiem po stronie przeciwnej, bo kończyna zdrowa spieszy się, by przejąć obciążenie. Tułów pochyla się także w stronę bolesną, co przesuwa linię ciężkości bliżej stawu biodrowego i zmniejsza siłę, jaką muszą wytworzyć odwodziciele biodra.",
    note: "Ponieważ odchylenie wynika z bólu, a nie ze stałego uszkodzenia mechanicznego, może zmieniać się z godziny na godzinę i znika, gdy ból ustąpi. Zawsze zapytaj, zanim przypiszesz wzorzec antalgiczny osłabieniu.",
  },
  footdrop: {
    name: "Opadanie stopy (słabe zginacze grzbietowe)",
    primary: "Zginacze grzbietowe stawu skokowego (mięsień piszczelowy przedni i inne) są osłabione lub odnerwione, więc stopa nie może się unieść: palce zwisają w fazie wymachu, a przodostopie klaśnie o podłoże przy kontakcie zamiast kontaktu pięty.",
    comp: "Chód brodzący. Biodro i kolano zginają się znacznie bardziej niż normalnie w fazie wymachu, by unieść opadającą stopę i przenieść palce nad podłożem.",
    note: "",
  },
  weakquads: {
    name: "Słaby mięsień czworogłowy",
    primary: "Mięsień czworogłowy nie może przeciwstawić się momentowi zginającemu kolano podczas przyjmowania obciążenia, więc normalne, amortyzujące zgięcie kolana spowodowałoby ugięcie kończyny.",
    comp: "Kolano zostaje wprowadzone w pełny wyprost, czasem wręcz w przeprost ('cofanie kolana'), podczas gdy tułów pochyla się do przodu, tak że masa ciała pada przed kolano i blokuje je biernie, bez potrzeby siły czworogłowego.",
    note: "Przez lata ten powtarzany przeprost może rozciągnąć struktury tylnej części kolana (genu recurvatum).",
  },
  stiffankle: {
    name: "Sztywny / usztywniony staw skokowy",
    primary: "Sztywny lub usztywniony staw skokowy nie może przetoczyć piszczeli do przodu nad ustawioną stopą (zgięcie grzbietowe w podporze) ani odbić się na końcu fazy podporu (zgięcie podeszwowe).",
    comp: "Wczesne oderwanie pięty z krótszym, płaskim krokiem oraz 'wspinanie', czyli unoszenie się na palcach drugiej nogi, by przenieść ciało poza zablokowany staw. Kolano często przeprostowuje się, by pomóc.",
    note: "",
  },
  stiffknee: {
    name: "Sztywne kolano (nie zgina się w wymachu)",
    primary: "Kolano pozostaje wyprostowane w fazie wymachu, z powodu nadaktywności czworogłowego albo usztywnienia stawu, przez co noga jest funkcjonalnie zbyt długa, by ominąć podłoże.",
    comp: "Miednica unosi się, a ciało się wspina, albo noga zatacza łuk (odwodzi na bok), tak by długa, sztywna kończyna przeszła bez zahaczenia palcami.",
    note: "Zataczanie łuku i opadanie miednicy to ruchy w płaszczyźnie bocznej, trudne do pokazania z tego bocznego ujęcia, więc obserwuj głównie zmniejszone zgięcie kolana i unoszenie biodra w wymachu.",
  },
};
const _pl = () => window.i18n && window.i18n.lang === "pl";
const condField = (id, f) => (_pl() && CONDITIONS_PL[id] ? CONDITIONS_PL[id][f] : CONDITIONS[id][f]);

// ---- custom drawer: ghost (typical) behind, deficit in front ----
function drawScene(canvas, def, def2, norm, norm2, showGhost) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  const groundY = H - 34;
  ctx.strokeStyle = "#22304a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, groundY); ctx.lineTo(W - 24, groundY); ctx.stroke();

  if (showGhost) {
    drawSkel(ctx, computeSkeleton(W, H, norm, norm2),
      { color: "rgba(148,163,184,0.30)", far: "rgba(148,163,184,0.20)", width: 5, joints: false, grf: 0 });
  }
  drawSkel(ctx, computeSkeleton(W, H, def, def2),
    { color: "#f4f7fc", far: "rgba(232,237,247,0.34)", width: 6, joints: true, grf: def.grf, groundY });
}

function drawSkel(ctx, skel, o) {
  const { hip, knee, ankle, footTip, shoulder, headCenter, hand, far, scale } = skel;

  if (far) {
    ctx.strokeStyle = o.far; ctx.lineWidth = o.width - 1;
    ctx.beginPath(); ctx.moveTo(far.hip.x, far.hip.y); ctx.lineTo(far.knee.x, far.knee.y);
    ctx.lineTo(far.ankle.x, far.ankle.y); ctx.lineTo(far.footTip.x, far.footTip.y); ctx.stroke();
  }

  if (o.grf > 0.03) {
    const len = o.grf * (SEG.shank + SEG.thigh) * 0.55 * scale;
    ctx.strokeStyle = "#5eead4"; ctx.fillStyle = "#5eead4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ankle.x, o.groundY); ctx.lineTo(ankle.x, o.groundY - len); ctx.stroke();
    const ah = 7;
    ctx.beginPath(); ctx.moveTo(ankle.x, o.groundY - len - ah);
    ctx.lineTo(ankle.x - ah * 0.6, o.groundY - len + 2); ctx.lineTo(ankle.x + ah * 0.6, o.groundY - len + 2);
    ctx.closePath(); ctx.fill();
  }

  ctx.strokeStyle = o.color; ctx.lineWidth = o.width;
  ctx.beginPath();
  ctx.moveTo(footTip.x, footTip.y); ctx.lineTo(ankle.x, ankle.y); ctx.lineTo(knee.x, knee.y);
  ctx.lineTo(hip.x, hip.y); ctx.lineTo(shoulder.x, shoulder.y); ctx.lineTo(hand.x, hand.y);
  ctx.stroke();

  ctx.fillStyle = o.color;
  ctx.beginPath(); ctx.arc(headCenter.x, headCenter.y, SEG.headR * scale, 0, Math.PI * 2); ctx.fill();

  if (o.joints) {
    ctx.fillStyle = o.color;
    [hip, knee, ankle, shoulder].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
  }
}

// ================= UI + loop =================
const canvas = document.getElementById("figureCanvas");
const tabsEl = document.getElementById("conditionTabs");
const ghostToggle = document.getElementById("ghostToggle");
const playBtn = document.getElementById("playBtn");
const scrubber = document.getElementById("scrubber");
const severity = document.getElementById("severity");
const sevVal = document.getElementById("sevVal");
const playbackSpeed = document.getElementById("playbackSpeed");

let condId = "footdrop", fraction = 0, playing = true, lastTime = null;

function buildTabs() {
  tabsEl.innerHTML = "";
  ORDER.forEach(id => {
    const b = document.createElement("button");
    b.className = "sbx-tab" + (id === condId ? " active" : "");
    b.textContent = condField(id, "name");
    b.addEventListener("click", () => { condId = id; buildTabs(); updateDiagnosis(); });
    tabsEl.appendChild(b);
  });
}

function updateDiagnosis() {
  document.getElementById("condName").textContent = condField(condId, "name");
  document.getElementById("condPrimary").textContent = condField(condId, "primary");
  document.getElementById("condComp").textContent = condField(condId, "comp");
  document.getElementById("condNote").textContent = condField(condId, "note") || "";
  document.getElementById("condSource").textContent =
    condId === "typical" ? ""
      : (_pl() ? "Wzorzec wg Perry & Burnfield, Gait Analysis, wyd. 2."
               : "Pattern per Perry & Burnfield, Gait Analysis, 2nd ed.");
}

document.addEventListener("i18n:changed", () => { buildTabs(); updateDiagnosis(); });

playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "⏸" : "▶"; lastTime = null; });
scrubber.addEventListener("input", () => { playing = false; playBtn.textContent = "▶"; fraction = scrubber.value / 1000; });
severity.addEventListener("input", () => { sevVal.textContent = Math.round(severity.value * 100) + "%"; });

function animate(ts) {
  if (lastTime == null) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
  if (playing) {
    fraction += (dt * 1000 * parseFloat(playbackSpeed.value)) / scales.cycleDuration;
    fraction = ((fraction % 1) + 1) % 1;
    scrubber.value = Math.round(fraction * 1000);
  }
  const t = fraction * 100;
  const st = liveState(movement, scales, t);
  const st2 = liveState(movement, scales, t + shift);
  const sev = parseFloat(severity.value);
  const cond = CONDITIONS[condId];
  const def = cond.transform({ ...st }, phaseOf(st), sev);
  drawScene(canvas, def, st2, st, st2, ghostToggle.checked);
  requestAnimationFrame(animate);
}

buildTabs();
updateDiagnosis();
requestAnimationFrame(animate);
