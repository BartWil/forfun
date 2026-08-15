// Force Plate Lab: jeden skok, sześć kanałów, osiem decyzji analityka.
//
// SYGNAŁ JEST SYNTETYCZNY I MÓWI O TYM WPROST NA KAŻDYM EKRANIE.
//
// Nie znalazłem otwartego zapisu z platformy zawierającego wszystkie sześć
// kanałów wraz z jawnym układem współrzędnych, a bez momentów Mx i My nie da się
// policzyć środka nacisku. Zapis udający pomiar byłby tu gorszy niż jawny model:
// cała stacja uczy, skąd bierze się liczba, więc kłamstwo o pochodzeniu danych
// podważałoby jej własną tezę.
//
// Model jest za to fizycznie spójny, i to jest tu warunek konieczny. Sygnał
// powstaje przez CAŁKOWANIE zadanego przyspieszenia środka masy, a nie przez
// narysowanie ładnego kształtu:
//
//     a(t)  ->  v(t) = ∫a dt  ->  z(t) = ∫v dt
//     Fz    =  m(g + a)  w kontakcie,  0 w locie
//
// Dzięki temu impuls policzony przez studenta daje tę samą wysokość, co czas
// lotu, z dokładnością poniżej centymetra. Gdyby sygnał był rysowany ręcznie,
// J = mΔv rozjechałoby się z czasem lotu i stacja uczyłaby zależności, która
// w jej własnych danych nie zachodzi.
//
// Reszta rozbieżności nie jest błędem modelu, tylko treścią lekcji: obie drogi
// zależą od tego, gdzie student postawi próg kontaktu. Przy 5 N wychodzi
// 26,6 cm, przy 50 N 27,4 cm. Osiem milimetrów bierze się wyłącznie z decyzji
// analityka, a nie z tego, jak wysoko ktoś skoczył.
// Sprawdzają to testy w tests/science.test.mjs.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");
  const fix = (v, n) => Number(v).toFixed(n);

  // ------------------------------------------------------------- parametry
  const M = 70;              // kg, masa ciała
  const G = 9.81;            // m/s^2
  const FS = 1000;           // Hz
  const DUR = 5.0;           // s
  const BIAS = 7.0;          // N, celowe przesunięcie zera wzmacniacza
  const BW = M * G;          // N, ciężar

  // Zapis zaczyna się od PUSTEJ PŁYTY, i to jest celowe. Zerowanie platformy
  // polega na odjęciu wskazania bez obciążenia, a nie średniej z dowolnego
  // spokojnego fragmentu. Pierwsza wersja tego modelu nie miała pustego okna
  // i sprawdzenie natychmiast pokazało, dlaczego: student odjąłby 693,70 N
  // zamiast 7 N, czyli wyzerowałby razem z przesunięciem cały swój ciężar.
  const T_ON = 0.60, T_STAND = 0.75;

  // Ile ciężaru spoczywa na płycie: 0 przed wejściem, 1 po wejściu.
  function onPlate(t) {
    if (t < T_ON) return 0;
    if (t < T_STAND) return (t - T_ON) / (T_STAND - T_ON);
    return 1;
  }

  // Fazy skoku z przeciwruchem, liczone od chwili spokojnego stania.
  function accel(t) {
    if (t < 1.60) return 0;                                             // stanie
    if (t < 1.92) return -3.3 * Math.sin(Math.PI * (t - 1.60) / 0.32);  // odciążenie
    if (t < 2.46) return 9.0 * Math.sin(Math.PI * (t - 1.92) / 0.54);   // hamowanie i napęd
    return 0;
  }

  // Zadana trajektoria środka nacisku pod stopami, w metrach od środka płyty.
  function copTrue(t) {
    const sway = 0.004 * Math.sin(2 * Math.PI * 0.6 * t) + 0.002 * Math.sin(2 * Math.PI * 1.7 * t);
    const shift = t > 1.0 && t < 1.9 ? 0.045 * Math.sin(Math.PI * (t - 1.0) / 0.9) : 0;
    return { x: sway + shift, y: 0.010 + 0.003 * Math.cos(2 * Math.PI * 0.45 * t) };
  }

  // Powtarzalny szum, żeby każde wejście na stronę dawało ten sam zapis.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  }

  // -------------------------------------------------------------- generator
  function build() {
    const n = Math.round(DUR * FS), dt = 1 / FS;
    const t = new Float64Array(n), Fz = new Float64Array(n);
    const Fx = new Float64Array(n), Fy = new Float64Array(n);
    const Mx = new Float64Array(n), My = new Float64Array(n), Mz = new Float64Array(n);
    const v = new Float64Array(n), z = new Float64Array(n);
    const noise = rng(20260811);

    // Odbicie następuje na końcu fazy napędu, a nie wtedy, gdy środek masy
    // znajdzie się nad poziomem wyjściowym. Przy przeciwruchu środek masy
    // NAJPIERW OPADA, więc warunek "pos > 0" wyzwalał odbicie w środku
    // odciążenia, dając impuls ujemny i szczyt 1,01 ciężaru ciała.
    // Wysokość pozostaje ujemna w dole przeciwruchu i to jest poprawne.
    const T_TAKEOFF = 2.46;
    let vel = 0, pos = 0, takeoff = -1, landing = -1, posTO = 0;

    for (let i = 0; i < n; i++) {
      const ti = i * dt;
      t[i] = ti;
      const inFlight = takeoff >= 0 && landing < 0;

      let a;
      if (inFlight) {
        a = -G;                                   // lot: tylko grawitacja
      } else if (landing >= 0) {
        // Lądowanie: krótki impuls hamujący, aż prędkość wróci do zera.
        a = vel < -0.02 ? 34 : 0;
      } else {
        a = ti < T_STAND ? 0 : accel(ti);
      }

      vel += a * dt;
      pos += vel * dt;
      v[i] = vel; z[i] = pos;

      if (takeoff < 0 && ti >= T_TAKEOFF) { takeoff = ti; posTO = pos; }
      if (takeoff >= 0 && landing < 0 && ti > takeoff + 0.05 && pos <= posTO) landing = ti;

      // Stopa nie odrywa się w jednej próbce. Odciążenie palców trwa kilkanaście
      // milisekund, a lądowanie narasta szybciej niż odbicie opada. Bez tego
      // przejścia próg kontaktu nie zmieniałby niczego i najważniejsza lekcja
      // tej stacji, że wykrycie zdarzenia jest decyzją analityka, nie miałaby
      // w danych żadnego pokrycia: 5 N i 50 N dawały identyczny czas lotu.
      // Odciążenie nie jest liniowe. Przy odrywaniu stopy siła najpierw spada
      // szybko, a potem długo dogasa na palcach, więc niski próg wykrywa
      // oderwanie wyraźnie później niż wysoki. Rampa liniowa dawała między
      // 5 N a 50 N różnicę jednej milisekundy, czyli lekcję niewidoczną.
      const UNLOAD = 0.030, LOAD = 0.008;
      let contact = 1;
      if (takeoff >= 0 && ti >= takeoff) {
        const x = Math.min(1, (ti - takeoff) / UNLOAD);
        contact = (1 - x) * (1 - x);
      }
      if (landing >= 0 && ti >= landing) {
        const x = Math.min(1, (ti - landing) / LOAD);
        contact = x * x;
      }
      const flight = contact < 1e-9;

      // Ruch środka masy i odczyt płyty to dwie różne rzeczy w chwili odrywania
      // stopy. Środek masy leci już balistycznie, ale palce nadal przekazują
      // malejącą siłę. Użycie tu przyspieszenia balistycznego dawało zero jeszcze
      // przed rampą, więc rampa nic nie zmieniała i wszystkie progi zwracały ten
      // sam czas lotu.
      const unloading = takeoff >= 0 && landing < 0;
      const aForce = unloading ? (ti < T_STAND ? 0 : accel(ti)) : a;
      // Siła pionowa wynika z drugiej zasady, nie z osobnego rysunku.
      // W locie i przed wejściem płyta jest pusta, więc zostaje samo
      // przesunięcie zera i szum: dokładnie to, co student ma odjąć.
      const clean = M * (G + aForce) * onPlate(ti) * contact;
      Fz[i] = Math.max(0, clean) + BIAS + noise() * 1.6;

      // Składowe poziome: niewielkie, jak przy pionowym skoku.
      Fx[i] = (flight ? 0 : 0.05 * M * a) + noise() * 1.1 + 1.4;
      Fy[i] = (flight ? 0 : 0.02 * M * a) + noise() * 1.1 - 0.9;

      // Momenty liczone Z ZADANEGO środka nacisku, więc odwrócenie wzoru
      // musi go odtworzyć. Konwencja: CoPx = -My/Fz, CoPy = Mx/Fz.
      const c = copTrue(ti);
      const fzTrue = Math.max(0, clean);
      My[i] = -c.x * fzTrue + noise() * 0.35;
      Mx[i] = c.y * fzTrue + noise() * 0.35;
      Mz[i] = noise() * 0.6;
    }
    return { t, Fx, Fy, Fz, Mx, My, Mz, v, z, n, dt, takeoff, landing };
  }

  const SIG = build();

  // ------------------------------------------------------------- analiza
  // Wszystko poniżej to rachunek, który wykonuje student. Wystawione osobno,
  // żeby testy liczyły dokładnie to samo, co widzi na ekranie.
  const FP = {
    M, G, FS, BIAS, BW, DUR,

    // Zerowanie: średnia z okna spokojnego stania.
    offset(sig, fromS, toS) {
      let s = 0, k = 0;
      for (let i = Math.round(fromS * FS); i < Math.round(toS * FS); i++) { s += sig[i]; k++; }
      return k ? s / k : 0;
    },
    zeroed(sig, off) {
      const out = new Float64Array(sig.length);
      for (let i = 0; i < sig.length; i++) out[i] = sig[i] - off;
      return out;
    },

    // Wykrycie kontaktu: to jest DECYZJA analityka, nie własność danych.
    events(fz, threshold) {
      let off = -1, on = -1;
      for (let i = 1; i < fz.length; i++) {
        if (off < 0 && fz[i] < threshold && SIG.t[i] > 1.9) off = SIG.t[i];
        if (off >= 0 && on < 0 && fz[i] >= threshold && SIG.t[i] > off + 0.05) on = SIG.t[i];
      }
      return { takeoff: off, landing: on, flight: (off >= 0 && on >= 0) ? on - off : null };
    },

    // Impuls netto od początku ruchu do odbicia: J = ∫(Fz - mg)dt
    impulse(fz, fromS, toS) {
      let j = 0;
      const a = Math.round(fromS * FS), b = Math.round(toS * FS);
      for (let i = a; i < b; i++) j += (fz[i] - BW) / FS;
      return j;
    },

    velocityFromImpulse: j => j / M,
    heightFromVelocity: v => (v * v) / (2 * G),
    heightFromFlight: tf => (G * tf * tf) / 8,

    // Środek nacisku. Dzielenie przez siłę pionową, więc przy małym Fz wynik
    // przestaje cokolwiek znaczyć. Stacja pokazuje to, zamiast ukrywać.
    cop(i, fz) {
      const f = fz[i];
      return { x: -SIG.My[i] / f, y: SIG.Mx[i] / f, fz: f };
    },
    copValid: (f, min) => f > min,
  };

  window.__forcePlate = { SIG, FP, accel, copTrue, onPlate };

  // ------------------------------------------------------------------ stan
  const S = {
    stage: 1,
    zeroed: false,
    zeroFrom: 0.05, zeroTo: 0.55,   // pusta płyta
    threshold: 20,
    normalize: false,
    copMin: 100,
    scrub: 1.2,
  };
  const subs = [];
  const emit = () => subs.forEach(f => f());

  const fzNow = () => S.zeroed ? FP.zeroed(SIG.Fz, FP.offset(SIG.Fz, S.zeroFrom, S.zeroTo)) : SIG.Fz;

  const STAGES = [
    { n: 1, k: "raw", en: "Raw", pl: "Surowy" },
    { n: 2, k: "zero", en: "Zero", pl: "Zerowanie" },
    { n: 3, k: "contact", en: "Contact", pl: "Kontakt" },
    { n: 4, k: "normalize", en: "Normalise", pl: "Normalizacja" },
    { n: 5, k: "impulse", en: "Impulse", pl: "Impuls" },
    { n: 6, k: "cop", en: "Centre of pressure", pl: "Środek nacisku" },
    { n: 7, k: "interpret", en: "Interpret", pl: "Interpretacja" },
    { n: 8, k: "break", en: "Break it", pl: "Zepsuj to" },
  ];

  // ------------------------------------------------------------------ rysunek
  const C = { grid: "rgba(255,255,255,.07)", txt: "#8593b0", fz: "#5eead4",
              bw: "#ffd166", bad: "#ff6f5e", cop: "#7c9bff" };

  function scope(host) {
    const wrap = document.createElement("div");
    wrap.className = "fp-scope";
    const cv = document.createElement("canvas");
    wrap.appendChild(cv);
    host.appendChild(wrap);
    const ctx = cv.getContext("2d");

    function paint() {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(320, Math.round(r.width)), h = Math.max(240, Math.round(r.height));
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const fz = fzNow();
      const pad = 44, gw = w - pad - 16, gh = h - 58;
      const maxF = 2600;
      const X = i => pad + (i / SIG.n) * gw;
      const Y = f => 18 + gh - (Math.min(maxF, Math.max(0, f)) / maxF) * gh;

      // siatka
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.font = "400 9px 'JetBrains Mono',monospace"; ctx.fillStyle = C.txt;
      for (let f = 0; f <= maxF; f += 500) {
        ctx.beginPath(); ctx.moveTo(pad, Y(f)); ctx.lineTo(w - 16, Y(f)); ctx.stroke();
        ctx.fillText(f + " N", 4, Y(f) + 3);
      }

      // linia ciężaru
      ctx.strokeStyle = C.bw; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(pad, Y(BW)); ctx.lineTo(w - 16, Y(BW)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.bw; ctx.fillText("mg = " + fix(BW, 0) + " N", pad + 4, Y(BW) - 5);

      // zdarzenia i próg
      const ev = FP.events(fz, S.threshold);
      if (S.stage >= 3 && ev.takeoff > 0) {
        ctx.fillStyle = "rgba(124,155,255,.10)";
        const a = X(Math.round(ev.takeoff * FS)), b = X(Math.round(ev.landing * FS));
        ctx.fillRect(a, 18, b - a, gh);
        ctx.strokeStyle = C.bad; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(pad, Y(S.threshold)); ctx.lineTo(w - 16, Y(S.threshold)); ctx.stroke();
        ctx.setLineDash([]);
      }

      // pole impulsu
      if (S.stage >= 5) {
        const a = Math.round(1.60 * FS), b = Math.round((ev.takeoff > 0 ? ev.takeoff : 2.46) * FS);
        ctx.fillStyle = "rgba(94,234,212,.20)";
        ctx.beginPath(); ctx.moveTo(X(a), Y(BW));
        for (let i = a; i < b; i++) ctx.lineTo(X(i), Y(fz[i]));
        ctx.lineTo(X(b), Y(BW)); ctx.closePath(); ctx.fill();
      }

      // przebieg Fz
      ctx.strokeStyle = C.fz; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < SIG.n; i += 2) {
        const x = X(i), y = Y(fz[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // znacznik przewijania
      const si = Math.round(S.scrub * FS);
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.beginPath(); ctx.moveTo(X(si), 18); ctx.lineTo(X(si), 18 + gh); ctx.stroke();

      ctx.fillStyle = C.txt;
      ctx.fillText("0 s", pad, h - 6);
      ctx.fillText(DUR + " s", w - 46, h - 6);
      ctx.fillStyle = C.fz;
      ctx.fillText(T("vertical force Fz", "siła pionowa Fz"), pad + 60, h - 6);
    }
    subs.push(paint);
    new ResizeObserver(paint).observe(wrap);
    window.addEventListener("resize", paint, { passive: true });
    paint();
  }

  // ------------------------------------------------------------------ panel
  function controls(host) {
    const box = document.createElement("div");
    box.className = "fp-controls";
    host.appendChild(box);

    function paint() {
      const fz = fzNow();
      const off = FP.offset(SIG.Fz, S.zeroFrom, S.zeroTo);
      const ev = FP.events(fz, S.threshold);
      const to = ev.takeoff > 0 ? ev.takeoff : 2.46;
      const J = FP.impulse(fz, 1.60, to);
      const vTo = FP.velocityFromImpulse(J);
      const hImp = FP.heightFromVelocity(vTo);
      const hFly = ev.flight ? FP.heightFromFlight(ev.flight) : null;
      const si = Math.round(S.scrub * FS);
      const cp = FP.cop(si, fz);
      const ok = FP.copValid(fz[si], S.copMin);

      const metric = (lab, val, cls) =>
        '<div class="fp-metric ' + (cls || "") + '"><span>' + lab + "</span><b>" + val + "</b></div>";

      let html = '<div class="fp-block"><div class="fp-block-h">' +
        T("The recording", "Zapis") + "</div>" +
        '<p class="fp-note">' + T(
          "Six channels at 1000 Hz: three forces and three moments. A synthetic model, not a measurement, and physically self-consistent: the force comes from integrating an acceleration, so the impulse you compute has to match the flight time you measure.",
          "Sześć kanałów po 1000 Hz: trzy siły i trzy momenty. Model syntetyczny, nie pomiar, ale spójny fizycznie: siła powstaje z całkowania przyspieszenia, więc policzony impuls musi zgadzać się ze zmierzonym czasem lotu.") +
        "</p></div>";

      if (S.stage >= 2) {
        html += '<div class="fp-block"><div class="fp-block-h">' + T("Zeroing", "Zerowanie") + "</div>" +
          '<p class="fp-note">' + T(
            "The amplifier has an offset. Select a window of quiet standing and subtract its mean, or every force from here on is wrong by a constant.",
            "Wzmacniacz ma przesunięcie zera. Wybierz okno spokojnego stania i odejmij jego średnią, inaczej każda kolejna siła będzie błędna o stałą.") + "</p>" +
          '<button class="fp-btn' + (S.zeroed ? " on" : "") + '" data-act="zero">' +
            (S.zeroed ? T("Zeroed", "Wyzerowane") : T("Subtract the offset", "Odejmij przesunięcie")) + "</button>" +
          '<div class="fp-metrics">' +
            metric(T("Offset found, plate empty 0.05-0.55 s", "Przesunięcie, pusta płyta 0,05-0,55 s"),
                   fix(off, 2) + " N", S.zeroed ? "ok" : "warn") +
            metric(T("Mean in that window, after zeroing", "Średnia w tym oknie, po wyzerowaniu"),
                   fix(FP.offset(fz, S.zeroFrom, S.zeroTo), 1) + " N") +
            metric(T("Body weight", "Ciężar ciała"), fix(BW, 1) + " N") +
          "</div></div>";
      }

      if (S.stage >= 3) {
        html += '<div class="fp-block"><div class="fp-block-h">' + T("Contact threshold", "Próg kontaktu") + "</div>" +
          '<p class="fp-note">' + T(
            "Where the foot leaves the plate is not in the data. You choose it. Move the threshold and watch the events move with it.",
            "Moment oderwania stopy nie jest zapisany w danych. Wybierasz go sam. Przesuń próg i patrz, jak przesuwają się zdarzenia.") + "</p>" +
          '<div class="fp-chips">' + [5, 10, 20, 50].map(v =>
            '<button class="fp-chip' + (S.threshold === v ? " on" : "") + '" data-th="' + v + '">' + v + " N</button>").join("") + "</div>" +
          '<div class="fp-metrics">' +
            metric(T("Take-off", "Odbicie"), ev.takeoff > 0 ? fix(ev.takeoff, 3) + " s" : "—") +
            metric(T("Landing", "Lądowanie"), ev.landing > 0 ? fix(ev.landing, 3) + " s" : "—") +
            metric(T("Flight time", "Czas lotu"), ev.flight ? fix(ev.flight, 3) + " s" : "—", "ok") +
          "</div></div>";
      }

      if (S.stage >= 4) {
        const peak = Math.max(...fz);
        html += '<div class="fp-block"><div class="fp-block-h">' + T("Normalisation", "Normalizacja") + "</div>" +
          '<button class="fp-btn' + (S.normalize ? " on" : "") + '" data-act="norm">' +
            (S.normalize ? T("Showing body weights", "Pokazuję krotności ciężaru") : T("Divide by body weight", "Podziel przez ciężar ciała")) + "</button>" +
          '<div class="fp-metrics">' +
            metric(T("Peak force", "Siła szczytowa"),
                   S.normalize ? fix(peak / BW, 2) + " BW" : fix(peak, 0) + " N", "ok") +
            metric(T("Same peak, other unit", "Ten sam szczyt, inna jednostka"),
                   S.normalize ? fix(peak, 0) + " N" : fix(peak / BW, 2) + " BW") +
          "</div>" +
          '<p class="fp-note">' + T(
            "1760 N means nothing until you know the person. 2.4 BW can be compared between a 50 kg and a 90 kg athlete.",
            "1760 N nic nie znaczy, dopóki nie wiesz, kto stoi na płycie. 2,4 BW można porównać między osobą 50 i 90 kg.") + "</p></div>";
      }

      if (S.stage >= 5) {
        html += '<div class="fp-block"><div class="fp-block-h">' + T("Impulse", "Impuls") + "</div>" +
          '<p class="fp-note">' + T(
            "The shaded area is the net impulse: the force above body weight, added up over time. Momentum says it equals mass times the velocity gained.",
            "Zacieniowane pole to impuls netto: siła ponad ciężar ciała, zsumowana w czasie. Zasada pędu mówi, że równa się masie razy uzyskana prędkość.") + "</p>" +
          '<div class="fp-formula">J = ∫(F<sub>z</sub> − mg) dt = m · Δv</div>' +
          '<div class="fp-metrics">' +
            metric(T("Net impulse", "Impuls netto"), fix(J, 1) + " N·s") +
            metric(T("Take-off velocity", "Prędkość odbicia"), fix(vTo, 3) + " m/s", "ok") +
            metric(T("Height from impulse", "Wysokość z impulsu"), fix(hImp * 100, 1) + " cm") +
            metric(T("Height from flight time", "Wysokość z czasu lotu"),
                   hFly !== null ? fix(hFly * 100, 1) + " cm" : "—", "ok") +
            metric(T("Difference", "Różnica"),
                   hFly !== null ? fix(Math.abs(hImp - hFly) * 100, 2) + " cm" : "—",
                   hFly !== null && Math.abs(hImp - hFly) < 0.02 ? "ok" : "warn") +
          "</div>" +
          '<p class="fp-note">' + T(
            "Two independent routes to the same height, agreeing to under a centimetre. They agree because the signal was built by integration, not drawn. Now move the contact threshold: both answers shift, and the gap between them is your decision, not the jump.",
            "Dwie niezależne drogi do tej samej wysokości, zgodne z dokładnością poniżej centymetra. Zgadzają się, bo sygnał powstał przez całkowanie, a nie został narysowany. Teraz przesuń próg kontaktu: obie odpowiedzi się przesuną, a różnica między nimi jest Twoją decyzją, a nie cechą skoku.") + "</p></div>";
      }

      if (S.stage >= 6) {
        html += '<div class="fp-block"><div class="fp-block-h">' + T("Centre of pressure", "Środek nacisku") + "</div>" +
          '<div class="fp-formula">CoP<sub>x</sub> = −M<sub>y</sub> / F<sub>z</sub>&nbsp;&nbsp;&nbsp;CoP<sub>y</sub> = M<sub>x</sub> / F<sub>z</sub></div>' +
          '<p class="fp-note">' + T(
            "Three forces are not enough. The centre of pressure needs the moments as well, and a stated coordinate system: here the origin is the centre of the plate surface.",
            "Trzy siły to za mało. Środek nacisku wymaga także momentów i podanego układu współrzędnych: tutaj początek leży w środku powierzchni płyty.") + "</p>" +
          '<label class="fp-slider"><span>' + T("Time", "Czas") + "</span>" +
            '<input type="range" id="fpScrub" min="0" max="' + (DUR - 0.01) + '" step="0.01" value="' + S.scrub + '">' +
            "<b>" + fix(S.scrub, 2) + " s</b></label>" +
          '<div class="fp-metrics">' +
            metric("F<sub>z</sub>", fix(fz[si], 1) + " N", ok ? "ok" : "bad") +
            metric("CoP x", ok ? fix(cp.x * 1000, 1) + " mm" : fix(cp.x, 1) + " m", ok ? "ok" : "bad") +
            metric("CoP y", ok ? fix(cp.y * 1000, 1) + " mm" : fix(cp.y, 1) + " m", ok ? "ok" : "bad") +
          "</div>" +
          (ok ? "" : '<div class="fp-alarm"><b>' +
            T("This is not a position.", "To nie jest położenie.") + "</b> " + T(
            "Vertical force is near zero, so the division blows up. The body did not move metres sideways; there is simply no centre of pressure without meaningful contact.",
            "Siła pionowa jest bliska zeru, więc dzielenie eksploduje. Ciało nie przesunęło się o metry w bok; po prostu nie ma środka nacisku bez sensownego kontaktu.") + "</div>") +
          "</div>";
      }

      box.innerHTML = html;
      box.querySelectorAll("[data-th]").forEach(b =>
        b.onclick = () => { S.threshold = +b.dataset.th; emit(); });
      box.querySelectorAll("[data-act]").forEach(b =>
        b.onclick = () => {
          if (b.dataset.act === "zero") S.zeroed = !S.zeroed;
          if (b.dataset.act === "norm") S.normalize = !S.normalize;
          emit();
        });
      const sc = box.querySelector("#fpScrub");
      if (sc) sc.oninput = e => { S.scrub = +e.target.value; emit(); };
    }
    subs.push(paint);
    paint();
  }

  function stages(host) {
    const bar = document.createElement("div");
    bar.className = "fp-stages";
    host.appendChild(bar);
    function paint() {
      bar.innerHTML = STAGES.map(s =>
        '<button class="fp-stage' + (S.stage === s.n ? " on" : "") + (s.k === "break" ? " fp-stage-break" : "") +
        '" data-s="' + s.n + '"><span class="fp-stage-n">' + s.n + "</span>" + L(s) + "</button>").join("");
      bar.querySelectorAll("[data-s]").forEach(b =>
        b.onclick = () => { S.stage = +b.dataset.s; emit(); });
    }
    subs.push(paint);
    paint();
  }

  // ------------------------------------------------- stan eksperymentu
  // Tylko polowa runtime: jak odczytac strone i jak wstawic w nia stan.
  // Co ten stan ZNACZY, opisuje kodek w state-codecs.js, ktory laduje sie
  // takze na stronie startowej, zeby umiala strescic zapisany eksperyment
  // bez uruchamiania tej stacji.
  function registerState() {
    const B = window.BioLabState;
    if (!B || !B.codec("forceplate")) return;

    B.bind("forceplate", {
      read: () => ({
        stage: S.stage, zeroed: S.zeroed, threshold: S.threshold,
        normalize: S.normalize, scrub: S.scrub,
      }),
      apply: st => {
        Object.keys(st).forEach(k => { S[k] = st[k]; });
        emit();
      },
      checkpoint: () => {
        const x = STAGES.find(s => s.n === S.stage) || STAGES[0];
        return { k: x.k, label: L(x) };
      },
    });

    // Celowo BEZ trackEngagement i bez przycisku udostepniania. Pasek
    // "kontynuuj" na stronie startowej dziala i nie ma powodu zmieniac tego,
    // co robi, przy okazji dokladania cwiczenia na dole tej stacji. Runtime
    // jest tu po to, zeby stacja umiala przyjac zadany stan i przeliczyc sie
    // wlasnym kodem. To wszystko, czego potrzebuje sekcja przewidywania.
  }

  function boot() {
    const host = document.getElementById("fpLab");
    if (!host) return;
    stages(host);
    scope(host);
    controls(host);
    registerState();
    emit();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("i18n:changed", emit);
})();
