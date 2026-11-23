// Ilustracje do akapitów stacji ergonomii.
//
// Każdy akapit tej stacji stawia jedną tezę, którą da się narysować, i każdy
// czytał się dotąd jako ściana tekstu. To są te rysunki. Nie są ozdobą: każdy
// pokazuje dokładnie to zdanie, które stoi obok, i każdy liczy swoje liczby
// TYM SAMYM MODELEM, z którego korzysta panel na górze strony.
//
// Dlatego ten plik nie ma własnej fizyki. Czyta window.__ergo i woła spine(),
// niosh(), apron() oraz push() na konkretnych stanach. Gdyby rysował własne
// liczby, strona miałaby dwie wersje tej samej odpowiedzi i prędzej czy
// później rozjechałyby się, a rysunek kłamałby ładniej niż tekst.
//
// Jeden wyjątek jest jawny: pierwsza ilustracja porównuje dwie zwykłe
// dźwignie, a nie kręgosłup, więc liczy wprost z prawa dźwigni F = W·a/b.
// To jest to samo prawo, na którym stoi cała stacja, zapisane bez ciała.
//
// Dokładane pod akapitami. Nic istniejącego nie jest modyfikowane.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const fix = (v, n) => Number(v).toFixed(n);

  const C = {
    ink:   "#e8ecf5",
    dim:   "#8593b0",
    faint: "rgba(133,147,176,.5)",
    hair:  "rgba(255,255,255,.08)",
    body:  "rgba(232,237,247,.17)",
    edge:  "rgba(232,237,247,.46)",
    trunk: "#ffd166",
    load:  "#ff6f5e",
    good:  "#5eead4",
    cool:  "#7c9bff",
  };

  // ------------------------------------------------------------- narzędzia
  let ctx = null;

  function rr(x, y, w, h, r) {
    const k = Math.max(0, Math.min(r, h / 2, w / 2));
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }

  function arrow(x1, y1, x2, y2, col, lw, head) {
    const a = Math.atan2(y2 - y1, x2 - x1), hl = head || 9;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = lw || 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * hl * 0.7, y2 - Math.sin(a) * hl * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.38) * hl, y2 - Math.sin(a - 0.38) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.38) * hl, y2 - Math.sin(a + 0.38) * hl);
    ctx.closePath(); ctx.fill();
  }

  function txt(s, x, y, col, align, size, weight) {
    ctx.font = (weight ? weight + " " : "") + (size || 11) + "px 'JetBrains Mono', monospace";
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = col;
    ctx.fillText(s, x, y);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function tag(s, x, y, col, align) {
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    const w = ctx.measureText(s).width, pad = 5, h = 17;
    let tx = x;
    if (align === "center") tx = x - w / 2;
    if (align === "right") tx = x - w;
    ctx.fillStyle = "rgba(8,12,24,.85)";
    rr(tx - pad, y - h / 2, w + pad * 2, h, 5); ctx.fill();
    txt(s, tx, y, col, "left", 11, "600");
  }

  // Stopka rysunku. Jedna długa linia wychodziła na telefonie poza płótno,
  // więc tekst jest łamany do dostępnej szerokości i rysowany w górę od
  // zadanej podstawy, żeby ostatni wiersz zawsze stał tam, gdzie miał stać.
  function foot(s, x, yBottom, maxW, align, col) {
    ctx.font = "9.5px 'JetBrains Mono', monospace";
    const words = String(s).split(" ");
    const lines = [];
    let line = "";
    words.forEach(word => {
      const t2 = line ? line + " " + word : word;
      if (ctx.measureText(t2).width > maxW && line) { lines.push(line); line = word; }
      else line = t2;
    });
    if (line) lines.push(line);
    const lh = 12;
    lines.forEach((ln, i) => {
      txt(ln, x, yBottom - (lines.length - 1 - i) * lh, col || C.faint, align || "left", 9.5);
    });
    return lines.length;
  }

  function head(s, x, y) {
    ctx.font = "600 10px 'Space Grotesk', sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = C.dim;
    ctx.fillText(s.toUpperCase(), x, y);
    ctx.textBaseline = "alphabetic";
  }

  // Linia wymiarowa z zasyłkami, ta sama konwencja co na głównym rysunku.
  function dim(x1, x2, y, col, s) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a, y); ctx.lineTo(b, y);
    ctx.moveTo(a, y - 4); ctx.lineTo(a, y + 4);
    ctx.moveTo(b, y - 4); ctx.lineTo(b, y + 4);
    ctx.stroke();
    tag(s, (a + b) / 2, y, col, "center");
  }

  // Uproszczona sylwetka, ta sama geometria co na głównym rysunku, tylko mała.
  function miniBody(ox, floorY, px, st) {
    const th = st.flex * Math.PI / 180;
    const ux = Math.sin(th), uy = -Math.cos(th);
    const bend = Math.max(0.12, Math.min(1, (55 - st.flex) / 55));
    const a1 = bend * 1.0, a2 = bend * 0.55;
    const kDX = Math.sin(a1) * 0.40, kDY = Math.cos(a1) * 0.40;
    const aDX = kDX - Math.sin(a2) * 0.40, aDY = kDY + Math.cos(a2) * 0.40;
    const oy = floorY - aDY * px;
    const P = (d2, across) => ({
      x: ox + ux * d2 * px + Math.cos(th) * across * px,
      y: oy + uy * d2 * px + Math.sin(th) * across * px,
    });

    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = C.edge; ctx.lineWidth = Math.max(4, 0.075 * px);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + kDX * px, oy + kDY * px);
    ctx.lineTo(ox + aDX * px, oy + aDY * px);
    ctx.stroke();

    const sh = P(0.52, 0);
    ctx.strokeStyle = C.edge; ctx.lineWidth = Math.max(7, 0.15 * px);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(sh.x, sh.y); ctx.stroke();
    ctx.strokeStyle = C.trunk; ctx.lineWidth = Math.max(2, 0.022 * px);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(sh.x, sh.y); ctx.stroke();

    const hd = P(0.655, 0.01);
    ctx.fillStyle = C.body; ctx.strokeStyle = C.edge; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(hd.x, hd.y, 0.082 * px, 0, 7); ctx.fill(); ctx.stroke();

    const hx = ox + st.horiz * px, hy = sh.y + 0.08 * px;
    ctx.strokeStyle = C.edge; ctx.lineWidth = Math.max(3, 0.05 * px);
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y + 0.02 * px);
    ctx.quadraticCurveTo((sh.x + hx) / 2, Math.max(sh.y, hy) + 0.09 * px, hx, hy);
    ctx.stroke();

    const bs = Math.max(9, 0.13 * px);
    ctx.fillStyle = "rgba(255,111,94,.25)";
    rr(hx - bs / 2, hy - bs / 2, bs, bs, 2); ctx.fill();
    ctx.strokeStyle = C.load; ctx.lineWidth = 1.6; ctx.stroke();

    ctx.fillStyle = "#0b1020";
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.stroke();
    return { ox, oy, hx, hy };
  }

  // Poziomy pasek z wartością, używany przez kilka ilustracji.
  function hbar(x, y, w, h, frac, col, s, sCol) {
    ctx.fillStyle = "rgba(255,255,255,.055)";
    rr(x, y, w, h, h / 2); ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = col;
      rr(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill();
    }
    if (s) txt(s, x + w + 9, y + h / 2, sCol || C.ink, "left", 11, "600");
  }

  // ==================================================== 1. dwie dźwignie
  //
  // Jedyna ilustracja, która liczy sama, bo nie ma tu ciała: to zwykłe prawo
  // dźwigni F = W · a / b, czyli dokładnie to, na czym stoi reszta stacji.
  function lever(w, h) {
    const W = 147;                      // N, ciężar 15 kg
    const LONG = 0.45, SHORT = 0.05;
    const pad = 20, span = Math.min(w - pad * 2 - 150, 330);
    const px = span / LONG;
    const x0 = pad + 76;

    const rows = [
      { y: 92,
        t: T("A lever built the right way round", "Dźwignia zbudowana tak, jak trzeba"),
        s: T("a wheelbarrow: the load sits near the pivot", "taczka: ciężar blisko osi obrotu"),
        effortArm: LONG, loadArm: SHORT },
      { y: h - 86,
        t: T("Your spine", "Twój kręgosłup"),
        s: T("the muscle sits near the pivot instead", "to mięsień siedzi blisko osi obrotu"),
        effortArm: SHORT, loadArm: LONG },
    ];

    rows.forEach(r => {
      const F = W * r.loadArm / r.effortArm;
      const fx = x0;                                  // punkt podparcia
      const lx = fx + r.loadArm * px;                 // ciężar
      const ex = fx + r.effortArm * px;               // siła
      const beamTo = Math.max(lx, ex) + 16;

      head(r.t, pad, r.y - 82);
      txt(r.s, pad, r.y - 68, C.faint, "left", 9.5);

      // belka i podparcie
      ctx.fillStyle = "rgba(232,237,247,.16)";
      rr(fx - 16, r.y - 4, beamTo - fx + 16, 8, 4); ctx.fill();
      ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.dim;
      ctx.beginPath();
      ctx.moveTo(fx, r.y + 5); ctx.lineTo(fx - 9, r.y + 21); ctx.lineTo(fx + 9, r.y + 21);
      ctx.closePath(); ctx.fill();

      // Ciężar ciągnie w dół, pod belką. Zawsze ten sam.
      arrow(lx, r.y + 6, lx, r.y + 34, C.load, 2.5, 9);
      // Obok strzałki, nie pod nią: pod nią zajmowała wiersz, przez który
      // ramiona schodziły na nagłówek następnej dźwigni.
      tag("147 N", lx + 11, r.y + 21, C.load, "left");

      // Siła równoważąca w górę, nad belką. Długość skalowana pierwiastkiem,
      // bo 16 N i 1323 N inaczej nie dałyby się narysować w jednej skali:
      // jedna byłaby niewidoczna, druga wyszłaby poza płótno.
      const sc = Math.sqrt(F / 1323);
      const len = 14 + 38 * sc;
      arrow(ex, r.y - 6, ex, r.y - 6 - len, C.good, 2 + 3 * sc, 10);
      // Obok strzałki, nie nad nią: nad krótką strzałką przy osi obrotu
      // etykieta przecinała podpis drugiego wiersza.
      tag(fix(F, 0) + " N", ex + 11, r.y - 6 - len * 0.55, C.good, "left");

      // ramiona
      dim(fx, lx, r.y + 44, C.load, fix(r.loadArm * 100, 0) + " cm");
      dim(fx, ex, r.y + 62, C.good, fix(r.effortArm * 100, 0) + " cm");
    });

    foot(T("Same load, same lever law, eighty times the force to hold it.",
           "Ten sam ciężar, to samo prawo dźwigni, osiemdziesiąt razy większa siła na jego utrzymanie."),
         pad, h - 10, w - pad * 2);
  }

  // ============================================= 2. dwie postawy, ta sama płyta
  function postures(w, h) {
    const E = window.__ergo;
    const A = { mass: 70, load: 6, horiz: 0.50, flex: 85 };
    const B = { mass: 70, load: 6, horiz: 0.20, flex: 25 };
    // Masa płyty jest w obu nagłówkach, więc nie trzeba wklejać na środek
    // etykiety, która i tak nachodziła na nagłówek prawej kolumny.
    const cols = [
      { st: A, t: T("6 kg plate, bent over", "płyta 6 kg, pochylony") },
      { st: B, t: T("6 kg plate, squatted, held close", "płyta 6 kg, w przysiadzie, blisko") },
    ];
    const cw = w / 2, floorY = h - 96;
    const px = Math.min((floorY - 56) / 1.54, (cw - 80) / 1.0);

    cols.forEach((c, i) => {
      const cx = cw * i, d = E.spine(c.st);
      const ox = cx + cw * 0.40;

      if (i) {
        ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, 18); ctx.lineTo(cx, h - 30); ctx.stroke();
      }

      head(c.t, cx + 18, 22);
      ctx.strokeStyle = "rgba(133,147,176,.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + 18, floorY); ctx.lineTo(cx + cw - 18, floorY); ctx.stroke();

      miniBody(ox, floorY, px, c.st);

      const bw = cw - 96;
      hbar(cx + 18, floorY + 20, bw, 10, d.comp / 4000, d.comp > 2000 ? C.load : C.good);
      txt(fix(d.comp, 0) + " N", cx + 18, floorY + 50, d.comp > 2000 ? C.load : C.good, "left", 19, "600");
      txt(fix(d.comp / (c.st.load * 9.81), 0) + " × " + T("the weight of the plate", "ciężar płyty"),
          cx + 18, floorY + 72, C.faint, "left", 10);
    });
  }

  // ================================================ 3. jak znika 23 kilogramy
  function waterfall(w, h) {
    const E = window.__ergo;
    const st = { task: "box", nLoad: 12, H: 50, V: 40, D: 70, A: 45, freq: 1, dur: 0, coup: "poor" };
    const n = E.niosh(st);
    const steps = [
      ["LC", 1, T("ideal conditions", "warunki idealne")],
      ["HM", n.m.HM, T("50 cm out in front", "50 cm przed sobą")],
      ["VM", n.m.VM, T("starts at 40 cm", "start na 40 cm")],
      ["DM", n.m.DM, T("travels 70 cm", "droga 70 cm")],
      ["AM", n.m.AM, T("45 deg of twist", "skręt 45 st.")],
      ["FM", n.m.FM, T("once a minute", "raz na minutę")],
      ["CM", n.m.CM, T("poor grip", "słaby chwyt")],
    ];

    // Na wąskim ekranie opisy kroków nie mieszczą się obok pasków i wchodziły
    // pod nie. Kod mnożnika i jego wartość wystarczą, a opis stoi w tekście.
    const pad = 18, showDesc = w >= 560;
    const labW = showDesc ? Math.min(200, Math.max(145, w * 0.30)) : 86, valW = 62;
    const bw = w - pad * 2 - labW - valW;
    const top = 30, rowH = Math.min(26, (h - top - 40) / steps.length);
    let kg = E.NIOSH.LC;

    head(T("How 23 kg becomes " + fix(n.rwl, 1) + " kg",
           "Jak z 23 kg robi się " + fix(n.rwl, 1).replace(".", ",") + " kg"), pad, 14);

    steps.forEach((s, i) => {
      const y = top + i * rowH;
      const before = kg;
      kg = kg * s[1];
      const fb = before / E.NIOSH.LC, fa = kg / E.NIOSH.LC;

      const my = y + rowH / 2 - 5;
      txt(s[0], pad, my, i ? C.ink : C.good, "left", 11, "600");
      // Mnożnik tuż przy swoim kodzie, a nie przy pasku: przy pasku wchodził
      // na opis kroku i oba stawały się nieczytelne.
      if (i) txt("×" + fix(s[1], 2), pad + 30, my, C.trunk, "left", 10);
      if (showDesc) txt(s[2], pad + 78, my, C.faint, "left", 9.5);

      const bx = pad + labW;
      ctx.fillStyle = "rgba(255,255,255,.05)";
      rr(bx, y + 4, bw, rowH - 11, 4); ctx.fill();
      // to, co zostaje, i to, co ten mnożnik zabrał
      if (fa < fb) {
        ctx.fillStyle = "rgba(255,111,94,.30)";
        rr(bx + bw * fa, y + 4, bw * (fb - fa), rowH - 11, 4); ctx.fill();
      }
      ctx.fillStyle = i ? "rgba(255,209,102,.8)" : C.good;
      rr(bx, y + 4, Math.max(3, bw * fa), rowH - 11, 4); ctx.fill();

      txt(fix(kg, 1) + " kg", w - pad, my, C.ink, "right", 11, "600");
    });

    foot(T("The reach alone takes half of it. Twisting takes more than the grip does.",
           "Sam wysięg zabiera połowę. Skręt zabiera więcej niż chwyt."),
         pad, h - 10, w - pad * 2);
  }

  // ======================================= 4. szczyt kontra cały dzień
  function peakVsDay(w, h) {
    const E = window.__ergo;
    const lift = E.spine({ mass: 70, load: 15, horiz: 0.45, flex: 60 }).comp;
    const a = E.apron({ aMass: 6, aType: "one", aHours: 4, lifts: 20, liftComp: lift });

    const pad = 18, cw = w / 2;
    const panels = [
      { t: T("Compared by peak force", "Porównane siłą szczytową"),
        u: "N",
        rows: [[T("the apron", "fartuch"), a.extra, C.cool], [T("one lift", "jedno podniesienie"), lift, C.load]] },
      { t: T("Compared by force times time", "Porównane siłą razy czas"),
        u: "kN·s",
        rows: [[T("the apron, 4 h", "fartuch, 4 h"), a.cumApron / 1000, C.cool],
               [T("20 lifts, 3 s each", "20 podniesień po 3 s"), a.cumLift / 1000, C.load]] },
    ];

    panels.forEach((p, i) => {
      const x = cw * i + pad;
      const bw = cw - pad * 2 - 76;
      if (i) {
        ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cw, 18); ctx.lineTo(cw, h - 34); ctx.stroke();
      }
      head(p.t, x, 20);
      const max = Math.max.apply(null, p.rows.map(r => r[1]));
      p.rows.forEach((r, j) => {
        const y = 50 + j * 52;
        txt(r[0], x, y, C.dim, "left", 10);
        hbar(x, y + 10, bw, 14, r[1] / max, r[2],
             fix(r[1], 0) + " " + p.u, r[2]);
      });
    });

    // Strzałka między panelami: ta sama para, odwrócony wynik.
    foot(T("Same two things. The order flips, because three seconds and four hours are not the same kind of thing.",
           "Te same dwie rzeczy. Kolejność się odwraca, bo trzy sekundy i cztery godziny nie są tym samym rodzajem rzeczy."),
         w / 2, h - 10, w - 40, "center");
  }

  // ================================================ 5. podłoga kontra masa
  function floors(w, h) {
    const E = window.__ergo;
    const masses = [150, 300, 450];
    const floorsL = [
      T("smooth, good casters", "gładko, dobre koła"),
      T("vinyl, worn casters", "wykładzina, zużyte koła"),
      T("thresholds, cables", "progi, kable"),
    ];
    const vals = floorsL.map((lab, f) =>
      masses.map(m => E.push({ pMass: m, floor: f, pSpeed: 0.6 }).roll));
    const max = 400;

    const pad = 20, base = h - 62, top = 34;
    const gw = (w - pad * 2) / 3;
    const bwid = Math.min(20, (gw - 34) / 3);

    head(T("Force to keep it rolling", "Siła na utrzymanie ruchu"), pad, 14);

    // linia odniesienia: 450 kg na dobrej podłodze
    const refY = base - (vals[0][2] / max) * (base - top);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(94,234,212,.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, refY); ctx.lineTo(w - pad, refY); ctx.stroke();
    ctx.setLineDash([]);

    vals.forEach((grp, f) => {
      const gx = pad + gw * f;
      grp.forEach((v, mi) => {
        const bh = (v / max) * (base - top);
        const x = gx + 14 + mi * (bwid + 8);
        // podświetlony jest tylko ten słupek, który łamie intuicję
        const hot = (f === 2 && mi === 0);
        ctx.fillStyle = hot ? C.load : f === 0 ? "rgba(94,234,212,.75)" : "rgba(124,155,255,.6)";
        rr(x, base - bh, bwid, bh, 3); ctx.fill();
        txt(fix(v, 0), x + bwid / 2, base - bh - 9, hot ? C.load : C.dim, "center", 9.5, "600");
      });
      txt(floorsL[f], gx + gw / 2, base + 15, C.dim, "center", 9.5);
      txt("150 / 300 / 450 kg", gx + gw / 2, base + 29, C.faint, "center", 8.5);
    });

    foot(T("450 kg on good casters (dashed) is lighter than 150 kg on a cable.",
           "450 kg na dobrych kołach (linia przerywana) jest lżejsze niż 150 kg na kablu."),
         pad, h - 10, w - pad * 2);
  }

  // ====================================== 6. rozrzut wytrzymałości kręgosłupa
  function spread(w, h) {
    const pad = 22, x0 = pad + 6, x1 = w - pad - 6;
    const max = 12000, sx = v => x0 + (x1 - x0) * v / max;
    const y = h * 0.46, bh = 30;

    head(T("Compressive strength of lumbar specimens", "Wytrzymałość preparatów lędźwiowych na ucisk"), pad, 16);

    // oś
    ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y + bh + 14); ctx.lineTo(x1, y + bh + 14); ctx.stroke();
    for (let v = 0; v <= max; v += 2000) {
      ctx.strokeStyle = C.hair;
      ctx.beginPath(); ctx.moveTo(sx(v), y + bh + 10); ctx.lineTo(sx(v), y + bh + 18); ctx.stroke();
      txt(v / 1000 + (v === max ? " kN" : ""), sx(v), y + bh + 29, C.faint, "center", 9);
    }

    // pasmo rozrzutu, celowo bez ostrych krawędzi: to zakres, nie granica
    const g = ctx.createLinearGradient(sx(2000), 0, sx(10000), 0);
    g.addColorStop(0, "rgba(255,111,94,.08)");
    g.addColorStop(0.5, "rgba(124,155,255,.34)");
    g.addColorStop(1, "rgba(94,234,212,.12)");
    ctx.fillStyle = g;
    rr(sx(2000), y, sx(10000) - sx(2000), bh, 14); ctx.fill();
    ctx.strokeStyle = "rgba(124,155,255,.35)"; ctx.lineWidth = 1; ctx.stroke();
    foot(T("roughly 2 kN to over 10 kN, depending on age, sex and bone density",
           "mniej więcej od 2 kN do ponad 10 kN, zależnie od wieku, płci i gęstości kości"),
         (sx(2000) + sx(10000)) / 2, y - 14, Math.min(w - 44, 460), "center", C.dim);

    [[3400, "3400 N", C.trunk], [6400, "6400 N", C.load]].forEach(m => {
      const mx = sx(m[0]);
      ctx.strokeStyle = m[2]; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, y - 4); ctx.lineTo(mx, y + bh + 6); ctx.stroke();
      tag(m[1], mx, y + bh + 48, m[2], "center");
    });

    foot(T("The two criteria sit inside the spread, not above it. The same force is comfortable for one spine and not for another.",
           "Oba kryteria leżą wewnątrz rozrzutu, a nie ponad nim. Ta sama siła jest dla jednego kręgosłupa spokojna, a dla innego nie."),
         w / 2, h - 10, w - 44, "center");
  }

  // ===================================================================== montaż
  const ART = {
    "er.s1.h": { id: "lever", h: [340, 404], draw: lever,
      cap: { en: "The same 147 N load on two lever arrangements, computed from the lever law alone.",
             pl: "Ten sam ciężar 147 N na dwóch układach dźwigni, policzony z samego prawa dźwigni." } },
    "er.s2.h": { id: "postures", h: [300, 370], draw: postures,
      cap: { en: "Both figures are the same model with the same 6 kg plate. Only the geometry differs.",
             pl: "Obie sylwetki to ten sam model z tą samą płytą 6 kg. Różni je wyłącznie geometria." } },
    "er.s3.h": { id: "waterfall", h: [255, 290], draw: waterfall,
      cap: { en: "One lift through all six NIOSH multipliers, each one taking its slice.",
             pl: "Jedno podniesienie przez wszystkie sześć mnożników NIOSH, każdy zabiera swój kawałek." } },
    "er.s4.h": { id: "peak", h: [214, 232], draw: peakVsDay,
      cap: { en: "The apron against one lift, measured two ways. Only the second way is comparable.",
             pl: "Fartuch wobec jednego podniesienia, zmierzone dwoma sposobami. Porównywalny jest tylko drugi." } },
    "er.s5.h": { id: "floors", h: [255, 292], draw: floors,
      cap: { en: "Rolling resistance for three masses on three surfaces, from F = mu m g.",
             pl: "Opór toczenia dla trzech mas na trzech podłożach, z F = mu m g." } },
    "er.s6.h": { id: "spread", h: [196, 252], draw: spread,
      cap: { en: "Why a computed force cannot be turned into a verdict about one person.",
             pl: "Dlaczego policzonej siły nie da się zamienić w wyrok o konkretnym człowieku." } },
  };

  function build(fig, spec) {
    const cv = fig.querySelector("canvas");
    const c2 = cv.getContext("2d");
    const r = fig.getBoundingClientRect();
    const w = Math.max(260, r.width || 640);
    const narrow = w < 640;
    const hh = narrow ? spec.h[1] : spec.h[0];
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = hh * dpr;
    cv.style.width = w + "px"; cv.style.height = hh + "px";
    ctx = c2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    ctx.lineJoin = "round";
    spec.draw(w, hh);
    const cap = fig.querySelector("figcaption");
    if (cap) cap.textContent = PL() ? spec.cap.pl : spec.cap.en;
    return w;
  }

  function mount() {
    if (!window.__ergo) return false;
    document.querySelectorAll("main .er-sec").forEach(sec => {
      const hEl = sec.querySelector("[data-i18n]");
      if (!hEl) return;
      const spec = ART[hEl.getAttribute("data-i18n")];
      if (!spec) return;

      let fig = sec.querySelector(".er-art");
      if (!fig) {
        fig = document.createElement("figure");
        fig.className = "er-art";
        fig.dataset.art = spec.id;
        fig.appendChild(document.createElement("canvas"));
        fig.appendChild(document.createElement("figcaption"));
        sec.appendChild(fig);
        // Szerokość ustala się dopiero po wstawieniu, więc pierwszy rysunek
        // trafia w nią dopiero w następnej klatce.
        let last = 0;
        const redraw = () => {
          const w = build(fig, spec);
          if (Math.abs(w - last) > 1) { last = w; requestAnimationFrame(redraw); }
        };
        fig._redraw = redraw;
        if (window.ResizeObserver) new ResizeObserver(() => build(fig, spec)).observe(fig);
      }
      (fig._redraw || (() => build(fig, spec)))();
    });
    return true;
  }

  // Stacja wystawia model dopiero po swoim boot(), więc czekamy na niego,
  // zamiast zgadywać jednym opóźnieniem.
  function start(tries) {
    if (mount()) return;
    if (tries <= 0) return;
    setTimeout(() => start(tries - 1), 200);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => start(40));
  else start(40);
  document.addEventListener("i18n:changed", () => setTimeout(() => mount(), 60));

  window.__ergoArt = { ART, mount };
})();
