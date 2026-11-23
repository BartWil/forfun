// What each station's experiment state MEANS, separated from how a page runs it.
//
// A codec is pure: given a plain object of state it can check it, name it and
// summarise it. It touches no DOM and needs no station to be open, so this file
// loads on the landing page too. That is the whole point: Continue can describe
// a saved EMG experiment without EMG Lab being loaded, and without the landing
// page knowing that EMG has a muscle and a cutoff while Physics has an angle and
// a moment arm.
//
// The split is:
//
//   define(id, codec)   validate / describe / summary   pure, loaded everywhere
//   bind(id, runtime)   read / apply / checkpoint       DOM, only on the station
//
// Without it, the landing page grows `if (station === "emg")` branches and we
// are back to a second catalogue of meaning, which is the thing this project
// keeps having to delete.

(function () {
  "use strict";

  const B = window.BioLabState;
  if (!B) return;

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);

  const num = (v, lo, hi, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };
  const fmt = (v, n) => Number(v).toFixed(n);

  // ------------------------------------------------------------------- EMG
  // The channel table lives here rather than in emg.js so there is one list of
  // muscles: the station reads it back out for its own buttons.
  const EMG_CH = {
    ta: { en: "Tibialis anterior", pl: "Piszczelowy przedni", short: "TA" },
    gm: { en: "Gastrocnemius medialis", pl: "Brzuchaty łydki, głowa przyśrodkowa", short: "GM" },
    rf: { en: "Rectus femoris", pl: "Prosty uda", short: "RF" },
  };

  const EMG_STAGES = ["raw", "filter", "rectify", "envelope", "normalize", "interpret", "break"];

  B.define("emg", {
    channels: EMG_CH,
    stages: EMG_STAGES,

    // A shared URL is untrusted input. Anything it cannot justify is dropped or
    // clamped, so a link can never reach a state the station's own controls
    // could not.
    validate(raw) {
      const out = {};
      if (EMG_CH[raw.muscle]) out.muscle = raw.muscle;
      if (raw.hp !== undefined) out.hp = num(raw.hp, 1, 100, 50);
      if (raw.lp !== undefined) out.lp = num(raw.lp, 1, 40, 20);
      if (raw.mvc !== undefined) out.mvc = num(raw.mvc, 0.05, 0.60, 0.40);
      if (["raw", "peak", "mvc"].indexOf(raw.norm) >= 0) out.norm = raw.norm;
      if (raw.rectify !== undefined) out.rectify = String(raw.rectify) !== "0";
      if (raw.stage !== undefined) out.stage = num(Math.round(raw.stage), 1, 7, 1);
      return out;
    },

    // The full table, shown before a link is copied.
    describe(st) {
      const rows = [];
      const ch = EMG_CH[st.muscle];
      if (ch) rows.push({ label: T("Muscle", "Mięsień"), value: PL() ? ch.pl : ch.en });
      if (st.hp !== undefined) rows.push({ label: T("High-pass", "Górnoprzepustowy"), value: fmt(st.hp, 0) + " Hz" });
      const stage = Number(st.stage) || 1;
      if (stage >= 3 && st.rectify !== undefined)
        rows.push({ label: T("Rectified", "Wyprostowany"), value: st.rectify ? T("yes", "tak") : T("no", "nie") });
      if (stage >= 4 && st.lp !== undefined)
        rows.push({ label: T("Envelope low-pass", "Obwiednia, dolnoprzepustowy"), value: fmt(st.lp, 0) + " Hz" });
      if (stage >= 5 && st.norm) {
        rows.push({ label: T("Normalisation", "Normalizacja"),
          value: st.norm === "raw" ? T("raw millivolts", "surowe miliwolty")
               : st.norm === "peak" ? T("peak of trial", "szczyt próby")
               : T("percent MVC", "procent MVC") });
        if (st.norm === "mvc" && st.mvc !== undefined)
          rows.push({ label: T("Hypothetical MVC", "Hipotetyczne MVC"), value: fmt(st.mvc, 2) + " mV" });
      }
      return rows;
    },

    // One compact line, for the Continue bar.
    summary(st) {
      const bits = [];
      const ch = EMG_CH[st.muscle];
      if (ch) bits.push(ch.short);
      if (st.hp !== undefined) bits.push("HP " + fmt(st.hp, 0) + " Hz");
      if (st.lp !== undefined && Number(st.stage) >= 4) bits.push("LP " + fmt(st.lp, 0) + " Hz");
      if (st.norm === "mvc" && st.mvc !== undefined) bits.push("MVC " + fmt(st.mvc, 2) + " mV");
      return bits.join(" · ");
    },
  });

  // ----------------------------------------------------------- force plate
  // Osiem decyzji analityka sprowadza sie do piatki liczb. Kazda z nich jest
  // wyborem, nie odczytem, wiec kazda musi dac sie zapisac w odnosniku: bez
  // tego zdanie "u mnie wychodzi 27,4 cm" nie znaczy nic.
  const FP_STAGES = ["raw", "zero", "contact", "normalize", "impulse", "cop", "interpret", "break"];

  B.define("forceplate", {
    stages: FP_STAGES,

    validate(raw) {
      const out = {};
      if (raw.stage !== undefined) out.stage = num(Math.round(raw.stage), 1, 8, 1);
      if (raw.zeroed !== undefined) out.zeroed = String(raw.zeroed) !== "0" && raw.zeroed !== false;
      // Prog kontaktu: przyciski oferuja 5, 10, 20 i 50 N, ale odnosnik moze
      // niesc dowolna wartosc z sensownego zakresu. Klucz w tym, ze prog jest
      // deklaracja analityka, wiec ma podrozowac razem z wynikiem.
      if (raw.threshold !== undefined) out.threshold = num(Math.round(raw.threshold), 1, 200, 20);
      if (raw.normalize !== undefined) out.normalize = String(raw.normalize) !== "0" && raw.normalize !== false;
      if (raw.scrub !== undefined) out.scrub = num(raw.scrub, 0, 4.99, 1.2);
      return out;
    },

    describe(st) {
      const rows = [];
      const stage = Number(st.stage) || 1;
      if (st.zeroed !== undefined)
        rows.push({ label: T("Zeroed", "Wyzerowane"), value: st.zeroed ? T("yes", "tak") : T("no", "nie") });
      if (stage >= 3 && st.threshold !== undefined)
        rows.push({ label: T("Contact threshold", "Prog kontaktu"), value: fmt(st.threshold, 0) + " N" });
      if (stage >= 4 && st.normalize !== undefined)
        rows.push({ label: T("Force shown as", "Sila pokazana jako"),
          value: st.normalize ? T("body weights", "krotnosci ciezaru") : T("newtons", "niutony") });
      if (stage >= 6 && st.scrub !== undefined)
        rows.push({ label: T("Time cursor", "Kursor czasu"), value: fmt(st.scrub, 2) + " s" });
      return rows;
    },

    summary(st) {
      const bits = [];
      if (st.zeroed !== undefined) bits.push(st.zeroed ? T("zeroed", "wyzerowane") : T("not zeroed", "bez zerowania"));
      if (st.threshold !== undefined) bits.push(fmt(st.threshold, 0) + " N");
      if (st.normalize) bits.push("BW");
      return bits.join(" · ");
    },
  });

  // ------------------------------------------------------------- ergonomics
  // Cztery moduły, cztery zestawy decyzji, jeden stan. Udostępniony odnośnik
  // ma odtworzyć dokładnie to zadanie, o którym ktoś mówi, bo zdanie "u mnie
  // wyszło 2800 N" bez geometrii nie znaczy niczego.
  const ERGO_TASKS = ["box", "detector", "patient"];
  const ERGO_COUP = ["good", "fair", "poor"];

  B.define("ergonomics", {
    tasks: ERGO_TASKS,

    validate(raw) {
      const out = {};
      if (raw.stage !== undefined) out.stage = num(Math.round(raw.stage), 1, 4, 1);
      // dźwignia
      if (raw.mass !== undefined) out.mass = num(Math.round(raw.mass), 45, 120, 70);
      if (raw.load !== undefined) out.load = num(Math.round(raw.load), 0, 30, 15);
      if (raw.horiz !== undefined) out.horiz = num(raw.horiz, 0.15, 0.65, 0.45);
      if (raw.flex !== undefined) out.flex = num(Math.round(raw.flex), 0, 90, 60);
      // NIOSH
      if (ERGO_TASKS.indexOf(raw.task) >= 0) out.task = raw.task;
      if (raw.nLoad !== undefined) out.nLoad = num(Math.round(raw.nLoad), 1, 40, 12);
      if (raw.H !== undefined) out.H = num(Math.round(raw.H), 25, 63, 30);
      if (raw.V !== undefined) out.V = num(Math.round(raw.V), 0, 175, 75);
      if (raw.D !== undefined) out.D = num(Math.round(raw.D), 25, 175, 50);
      if (raw.A !== undefined) out.A = num(Math.round(raw.A), 0, 135, 0);
      if (raw.freq !== undefined) out.freq = num(Math.round(raw.freq), 0, 6, 1);
      if (raw.dur !== undefined) out.dur = num(Math.round(raw.dur), 0, 1, 0);
      if (ERGO_COUP.indexOf(raw.coup) >= 0) out.coup = raw.coup;
      // fartuch
      if (raw.aMass !== undefined) out.aMass = num(raw.aMass, 3, 9, 6);
      if (raw.aType !== undefined) out.aType = raw.aType === "two" ? "two" : "one";
      if (raw.aHours !== undefined) out.aHours = num(raw.aHours, 0.5, 8, 4);
      if (raw.lifts !== undefined) out.lifts = num(Math.round(raw.lifts), 0, 60, 20);
      // aparat
      if (raw.pMass !== undefined) out.pMass = num(Math.round(raw.pMass), 50, 600, 450);
      if (raw.floor !== undefined) out.floor = num(Math.round(raw.floor), 0, 2, 0);
      if (raw.pSpeed !== undefined) out.pSpeed = num(raw.pSpeed, 0.2, 1.4, 0.6);
      return out;
    },

    // Tabela pokazywana przed skopiowaniem odnośnika. Opisuje tylko ten modul,
    // w ktorym student faktycznie jest: pelna lista dwudziestu pol nie byłaby
    // opisem eksperymentu, tylko zrzutem pamięci.
    describe(st) {
      const rows = [];
      const stage = Number(st.stage) || 1;
      if (stage === 1) {
        if (st.load !== undefined) rows.push({ label: T("Load in hands", "Ciężar w rękach"), value: fmt(st.load, 0) + " kg" });
        if (st.horiz !== undefined) rows.push({ label: T("Horizontal distance", "Odległość pozioma"), value: fmt(st.horiz * 100, 0) + " cm" });
        if (st.flex !== undefined) rows.push({ label: T("Trunk flexion", "Zgięcie tułowia"), value: fmt(st.flex, 0) + "°" });
        if (st.mass !== undefined) rows.push({ label: T("Body mass", "Masa ciała"), value: fmt(st.mass, 0) + " kg" });
      }
      if (stage === 2) {
        if (st.task) rows.push({ label: T("Task", "Zadanie"),
          value: st.task === "box" ? T("box of contrast media", "pudełko kontrastu")
               : st.task === "detector" ? T("detector under a bed", "detektor pod łóżkiem")
               : T("moving a patient", "przesuwanie pacjenta") });
        if (st.nLoad !== undefined) rows.push({ label: T("Actual weight", "Masa rzeczywista"), value: fmt(st.nLoad, 0) + " kg" });
        if (st.H !== undefined) rows.push({ label: "H", value: fmt(st.H, 0) + " cm" });
        if (st.V !== undefined) rows.push({ label: "V", value: fmt(st.V, 0) + " cm" });
        if (st.D !== undefined) rows.push({ label: "D", value: fmt(st.D, 0) + " cm" });
        if (st.A !== undefined) rows.push({ label: "A", value: fmt(st.A, 0) + "°" });
        if (st.coup) rows.push({ label: T("Grip", "Chwyt"),
          value: st.coup === "good" ? T("good", "dobry") : st.coup === "fair" ? T("fair", "przeciętny") : T("poor", "słaby") });
      }
      if (stage === 3) {
        if (st.aMass !== undefined) rows.push({ label: T("Apron mass", "Masa fartucha"), value: fmt(st.aMass, 1) + " kg" });
        if (st.aType) rows.push({ label: T("Apron design", "Krój fartucha"),
          value: st.aType === "two" ? T("two piece, belted", "dwuczęściowy, na pasie") : T("one piece", "jednoczęściowy") });
        if (st.aHours !== undefined) rows.push({ label: T("Hours worn", "Godziny noszenia"), value: fmt(st.aHours, 1) + " h" });
        if (st.lifts !== undefined) rows.push({ label: T("Lifts today", "Podniesień dziś"), value: fmt(st.lifts, 0) });
      }
      if (stage === 4) {
        if (st.pMass !== undefined) rows.push({ label: T("Machine mass", "Masa aparatu"), value: fmt(st.pMass, 0) + " kg" });
        if (st.floor !== undefined) rows.push({ label: T("Surface", "Podłoże"),
          value: st.floor === 0 ? T("smooth, good casters", "gładko, dobre koła")
               : st.floor === 1 ? T("vinyl, worn casters", "wykładzina, zużyte koła")
               : T("thresholds and cables", "progi i kable") });
        if (st.pSpeed !== undefined) rows.push({ label: T("Target speed", "Prędkość docelowa"), value: fmt(st.pSpeed, 1) + " m/s" });
      }
      return rows;
    },

    summary(st) {
      const bits = [];
      const stage = Number(st.stage) || 1;
      if (stage === 1) {
        if (st.load !== undefined) bits.push(fmt(st.load, 0) + " kg");
        if (st.horiz !== undefined) bits.push(fmt(st.horiz * 100, 0) + " cm");
        if (st.flex !== undefined) bits.push(fmt(st.flex, 0) + "°");
      } else if (stage === 2) {
        if (st.task) bits.push(st.task === "patient" ? T("patient", "pacjent")
                             : st.task === "detector" ? T("detector", "detektor") : T("box", "pudełko"));
        if (st.nLoad !== undefined) bits.push(fmt(st.nLoad, 0) + " kg");
        if (st.H !== undefined) bits.push("H " + fmt(st.H, 0) + " cm");
      } else if (stage === 3) {
        if (st.aMass !== undefined) bits.push(fmt(st.aMass, 1) + " kg");
        if (st.aType) bits.push(st.aType === "two" ? T("two piece", "dwuczęściowy") : T("one piece", "jednoczęściowy"));
        if (st.aHours !== undefined) bits.push(fmt(st.aHours, 1) + " h");
      } else {
        if (st.pMass !== undefined) bits.push(fmt(st.pMass, 0) + " kg");
        if (st.pSpeed !== undefined) bits.push(fmt(st.pSpeed, 1) + " m/s");
      }
      return bits.join(" · ");
    },
  });

  // --------------------------------------------------------------- physics
  // Registered now, with nothing bound to it yet, precisely to prove the split
  // works: Continue can already describe a physics state it has never run.
  B.define("physics", {
    validate(raw) {
      const out = {};
      if (raw.r !== undefined) out.r = num(raw.r, 0.05, 0.45, 0.30);
      if (raw.force !== undefined) out.force = num(raw.force, 10, 300, 100);
      if (raw.theta !== undefined) out.theta = num(raw.theta, -180, 180, 90);
      if (["stand", "fall", "lift"].indexOf(raw.scenario) >= 0) out.scenario = raw.scenario;
      if (raw.axis !== undefined) out.axis = num(raw.axis, -1, 1, 0) < 0 ? -1 : 1;
      return out;
    },
    describe(st) {
      const rows = [];
      if (st.force !== undefined) rows.push({ label: T("Force", "Siła"), value: fmt(st.force, 0) + " N" });
      if (st.r !== undefined) rows.push({ label: T("Grip distance", "Odległość chwytu"), value: fmt(st.r, 2) + " m" });
      if (st.theta !== undefined) rows.push({ label: T("Angle", "Kąt"), value: fmt(st.theta, 0) + "°" });
      if (st.scenario) rows.push({ label: T("Free-body case", "Przypadek diagramu sił"),
        value: st.scenario === "stand" ? T("standing still", "stanie nieruchomo")
             : st.scenario === "fall" ? T("mid-fall", "w trakcie upadku")
             : T("lift starting upwards", "winda ruszająca w górę") });
      if (st.axis) rows.push({ label: T("Positive direction", "Kierunek dodatni"),
        value: st.axis > 0 ? T("upwards", "w górę") : T("downwards", "w dół") });
      return rows;
    },
    summary(st) {
      const bits = [];
      if (st.force !== undefined) bits.push(fmt(st.force, 0) + " N");
      if (st.r !== undefined) bits.push("r " + fmt(st.r, 2) + " m");
      if (st.theta !== undefined) bits.push("θ " + fmt(st.theta, 0) + "°");
      if (st.axis) bits.push(st.axis > 0 ? "+y ↑" : "+y ↓");
      return bits.join(" · ");
    },
  });
})();
