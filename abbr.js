// Site-wide abbreviation help.
//
// Every page on this site leans on shorthand — vGRF, JCS, PCSA, ASIS — that a student meets
// for the first time here. Rather than tag them by hand across thirteen pages (and miss
// half, and miss everything built dynamically), this walks the rendered text, finds known
// abbreviations, and wraps them so hovering gives the expansion and a one-line explanation.
//
// Design notes:
//   * matching is CASE-SENSITIVE — "IM" is a landmark, "im" is not
//   * a match must not be flanked by letters or digits, so IM never fires inside "IMPORTANT"
//   * <code>, <pre>, form fields, canvases and existing tooltips are left alone
//   * the pass is idempotent: already-wrapped text is skipped, so re-running is harmless
//   * ambiguous two-letter landmark codes are limited to the page that actually uses them

(function () {
  "use strict";

  const PLg = () => window.i18n && window.i18n.lang === "pl";
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  // full = what the letters stand for · d = what it actually means, in one line
  const A = {
    // ---- societies, standards, methods ----
    ISB: { en: { full: "International Society of Biomechanics", d: "The professional body that sets the agreed definitions biomechanics uses for reporting joint motion." },
           pl: { full: "International Society of Biomechanics (Międzynarodowe Towarzystwo Biomechaniki)", d: "Towarzystwo naukowe, które ustala uzgodnione definicje stosowane w biomechanice do raportowania ruchu w stawach." } },
    STC: { en: { full: "Standardization and Terminology Committee", d: "The ISB committee that wrote the joint coordinate system recommendations." },
           pl: { full: "Standardization and Terminology Committee (Komitet ds. Standaryzacji i Terminologii)", d: "Komitet ISB, który opracował zalecenia dotyczące układów współrzędnych stawu." } },
    JCS: { en: { full: "Joint Coordinate System", d: "The scheme that turns the positions of two bones into three clinically named rotations. One axis sits in each bone, the third floats between them." },
           pl: { full: "Joint Coordinate System (układ współrzędnych stawu)", d: "Sposób przeliczenia położenia dwóch kości na trzy obroty o nazwach klinicznych. Jedna oś tkwi w każdej z kości, trzecia pływa między nimi." } },
    CCS: { en: { full: "Cartesian Coordinate System", d: "The three perpendicular axes attached to a single bone, built from its own bony landmarks." },
           pl: { full: "Cartesian Coordinate System (kartezjański układ współrzędnych)", d: "Trzy wzajemnie prostopadłe osie przypisane do jednej kości, wyznaczone z jej własnych punktów kostnych." } },
    ISO: { en: { full: "International Organization for Standardization", d: "Publishes cross-industry standards; ISO 2631 uses a different axis convention from the ISB one." },
           pl: { full: "International Organization for Standardization (Międzynarodowa Organizacja Normalizacyjna)", d: "Wydaje normy międzybranżowe; ISO 2631 stosuje inną konwencję osi niż ISB." } },
    SAE: { en: { full: "Society of Automotive Engineers", d: "Its SAE J-211 impact standard uses yet another axis convention — one of the reasons a shared definition was needed." },
           pl: { full: "Society of Automotive Engineers (Stowarzyszenie Inżynierów Motoryzacji)", d: "Jego norma zderzeniowa SAE J-211 stosuje jeszcze inną konwencję osi — jeden z powodów, dla których potrzebna była wspólna definicja." } },
    IHA: { en: { full: "instantaneous helical axis", d: "The single screw axis a body is rotating about and translating along at one instant. Used to locate joint centres that cannot be palpated." },
           pl: { full: "instantaneous helical axis (chwilowa oś śrubowa)", d: "Pojedyncza oś śrubowa, wokół której ciało w danej chwili się obraca i wzdłuż której się przemieszcza. Służy do lokalizowania środków stawów niedostępnych palpacyjnie." } },

    // ---- forces and mechanics ----
    GRF:  { en: { full: "ground reaction force", d: "The force the ground pushes back with. Equal and opposite to the force you apply to it." },
            pl: { full: "ground reaction force (siła reakcji podłoża)", d: "Siła, którą podłoże oddziałuje z powrotem. Równa co do wartości i przeciwnie skierowana do siły, którą na nie działasz." } },
    vGRF: { en: { full: "vertical ground reaction force", d: "The upward component of the ground reaction force — the one usually plotted, and the largest of the three." },
            pl: { full: "vertical ground reaction force (pionowa siła reakcji podłoża)", d: "Składowa pionowa siły reakcji podłoża — ta zwykle wykreślana i największa z trzech." } },
    BW:   { en: { full: "body weight", d: "Used as a unit: 1.0 BW means a force equal to the person's own weight, so people of different sizes can be compared." },
            pl: { full: "body weight (masa/ciężar ciała)", d: "Używane jako jednostka: 1,0 BW oznacza siłę równą ciężarowi danej osoby, dzięki czemu można porównywać osoby o różnej masie." } },
    CoM:  { en: { full: "centre of mass", d: "The point where the body's whole mass can be treated as concentrated. It moves when you move your limbs." },
            pl: { full: "centre of mass (środek masy)", d: "Punkt, w którym można traktować całą masę ciała jako skupioną. Przesuwa się, gdy poruszasz kończynami." } },
    CoP:  { en: { full: "centre of pressure", d: "The point on the ground through which the resultant ground reaction force acts." },
            pl: { full: "centre of pressure (środek nacisku)", d: "Punkt na podłożu, przez który przechodzi wypadkowa siła reakcji podłoża." } },
    MPa:  { en: { full: "megapascal", d: "A unit of pressure — one million newtons per square metre. Lumbar disc pressures sit around 0.5 MPa in standing." },
            pl: { full: "megapaskal", d: "Jednostka ciśnienia — milion niutonów na metr kwadratowy. Ciśnienie w krążku lędźwiowym w staniu wynosi około 0,5 MPa." } },

    // ---- muscle ----
    EMG:  { en: { full: "electromyography", d: "Recording of a muscle's electrical activity. Tells you when a muscle is on and roughly how hard — never force in newtons." },
            pl: { full: "electromyography (elektromiografia)", d: "Zapis czynności elektrycznej mięśnia. Mówi, kiedy mięsień pracuje i z grubsza jak mocno — nigdy o sile w niutonach." } },
    PCSA: { en: { full: "physiological cross-sectional area", d: "The total area of a muscle's fibres cut perpendicular to them. It sets how much force the muscle can produce." },
            pl: { full: "physiological cross-sectional area (fizjologiczny przekrój poprzeczny)", d: "Łączne pole przekroju włókien mięśnia, cięte prostopadle do nich. Decyduje o tym, ile siły mięsień może wytworzyć." } },
    MMT:  { en: { full: "manual muscle testing", d: "Grading muscle strength by hand against resistance. Its results depend heavily on joint angle." },
            pl: { full: "manual muscle testing (manualne testowanie mięśni)", d: "Ocena siły mięśnia ręką terapeuty przeciw oporowi. Wynik silnie zależy od kąta w stawie." } },

    // ---- clinical ----
    ACL:  { en: { full: "anterior cruciate ligament", d: "The knee ligament most often injured in landing and cutting, and the reason knee valgus is studied so heavily." },
            pl: { full: "anterior cruciate ligament (więzadło krzyżowe przednie)", d: "Więzadło kolana najczęściej uszkadzane przy lądowaniu i zmianach kierunku; stąd tak intensywne badania koślawości kolana." } },
    ROM:  { en: { full: "range of motion", d: "How far a joint travels. Active range is what the person produces; passive range is what you can move them through." },
            pl: { full: "range of motion (zakres ruchu)", d: "Jak daleko porusza się staw. Zakres czynny pacjent wykonuje sam; bierny to ten, przez który go prowadzisz." } },
    FPPA: { en: { full: "frontal-plane projection angle", d: "The hip–knee–ankle angle seen from the front. A common way to quantify dynamic knee valgus from video." },
            pl: { full: "frontal-plane projection angle (kąt projekcji w płaszczyźnie czołowej)", d: "Kąt biodro–kolano–staw skokowy widziany od przodu. Częsty sposób ilościowego ujęcia dynamicznej koślawości kolana z nagrania." } },
    SLS:  { en: { full: "single-leg squat", d: "A screening task: squat on one leg while the hip, knee and trunk are watched for control." },
            pl: { full: "single-leg squat (przysiad na jednej nodze)", d: "Test przesiewowy: przysiad na jednej nodze przy obserwacji kontroli biodra, kolana i tułowia." } },
    CMJ:  { en: { full: "countermovement jump", d: "A vertical jump that begins with a downward dip, pre-stretching the leg extensors before the push." },
            pl: { full: "countermovement jump (wyskok z zamachem)", d: "Wyskok pionowy rozpoczynany zejściem w dół, które wstępnie rozciąga prostowniki nogi przed wypchnięciem." } },
    TMJ:  { en: { full: "temporomandibular joint", d: "The jaw joint. One of the joints the ISB standard series covers." },
            pl: { full: "temporomandibular joint (staw skroniowo-żuchwowy)", d: "Staw żuchwy. Jeden ze stawów objętych serią standardów ISB." } },

    // ---- measurement ----
    MRI: { en: { full: "magnetic resonance imaging", d: "Imaging that shows soft tissue well; sometimes used to locate landmarks that cannot be palpated." },
           pl: { full: "magnetic resonance imaging (rezonans magnetyczny)", d: "Obrazowanie dobrze pokazujące tkanki miękkie; bywa używane do lokalizowania punktów niedostępnych palpacyjnie." } },
    CT:  { en: { full: "computed tomography", d: "X-ray imaging that shows bone well, used for locating bony landmarks precisely." },
           pl: { full: "computed tomography (tomografia komputerowa)", d: "Obrazowanie rentgenowskie dobrze pokazujące kość, używane do dokładnej lokalizacji punktów kostnych." } },
    DOI: { en: { full: "digital object identifier", d: "A permanent address for a paper or dataset — it keeps working when the web link rots." },
           pl: { full: "digital object identifier (cyfrowy identyfikator dokumentu)", d: "Trwały adres pracy lub zbioru danych — działa nawet wtedy, gdy zwykły odnośnik przestanie działać." } },

    // ---- ISB landmark codes: only on the page that defines them ----
    ASIS: { pages: ["isb.html"], en: { full: "anterior superior iliac spine", d: "The bony point at the front of the pelvic rim you can feel through the skin. Two of them define the pelvis axes." },
            pl: { full: "kolec biodrowy przedni górny", d: "Punkt kostny z przodu talerza biodrowego, wyczuwalny przez skórę. Dwa takie punkty wyznaczają osie miednicy." } },
    PSIS: { pages: ["isb.html"], en: { full: "posterior superior iliac spine", d: "The matching bony point at the back of the pelvis, felt as a dimple." },
            pl: { full: "kolec biodrowy tylny górny", d: "Odpowiadający punkt kostny z tyłu miednicy, wyczuwalny jako zagłębienie." } },
    MM:   { pages: ["isb.html"], en: { full: "medial malleolus", d: "The bump on the inner side of the ankle — the tip of the tibia." },
            pl: { full: "kostka przyśrodkowa", d: "Wyniosłość po wewnętrznej stronie stawu skokowego — koniec kości piszczelowej." } },
    LM:   { pages: ["isb.html"], en: { full: "lateral malleolus", d: "The bump on the outer side of the ankle — the tip of the fibula." },
            pl: { full: "kostka boczna", d: "Wyniosłość po zewnętrznej stronie stawu skokowego — koniec kości strzałkowej." } },
    IM:   { pages: ["isb.html"], en: { full: "inter-malleolar point", d: "The point midway between the two malleoli. It is the origin of the tibia/fibula coordinate system." },
            pl: { full: "punkt międzykostkowy", d: "Punkt w połowie odległości między obiema kostkami. Stanowi początek układu współrzędnych piszczeli i strzałki." } },
    IC:   { pages: ["isb.html"], en: { full: "inter-condylar point", d: "The point midway between the medial and lateral tibial condyles." },
            pl: { full: "punkt międzykłykciowy", d: "Punkt w połowie odległości między kłykciem przyśrodkowym a bocznym piszczeli." } },
    GH:   { pages: ["isb.html"], en: { full: "glenohumeral rotation centre", d: "Not a palpable landmark — it has to be estimated by regression or from the motion itself." },
            pl: { full: "środek obrotu stawu ramienno-łopatkowego", d: "Nie jest punktem wyczuwalnym palpacyjnie — trzeba go oszacować regresją lub z samego ruchu." } },
    IJ:   { pages: ["isb.html"], en: { full: "incisura jugularis", d: "The suprasternal notch — the dip you can feel at the top of the breastbone. Origin of the thorax axes." },
            pl: { full: "wcięcie szyjne mostka", d: "Zagłębienie wyczuwalne u góry mostka. Początek układu osi klatki piersiowej." } },
    PX:   { pages: ["isb.html"], en: { full: "processus xiphoideus", d: "The xiphoid process, the lowest point of the sternum." },
            pl: { full: "wyrostek mieczykowaty", d: "Najniżej położony punkt mostka." } },
  };

  // longest keys first so vGRF wins over GRF
  const KEYS = Object.keys(A)
    .filter(k => !A[k].pages || A[k].pages.indexOf(page) >= 0)
    .sort((a, b) => b.length - a.length);

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const RE = KEYS.length ? new RegExp("(" + KEYS.map(esc).join("|") + ")", "g") : null;
  const isWord = ch => ch != null && /[A-Za-z0-9]/.test(ch);

  // Never wrap inside these, whatever else is asked for. .ml-abbr and abbr are here because
  // overriding them would let a wrapped term be wrapped again, nesting endlessly.
  const HARD_SKIP = "script,style,textarea,input,select,option,canvas,svg,abbr," +
                    ".ml-abbr,.q,.isb-tip,.ml-tip,.lang-toggle,[data-noabbr]";
  // Skipped by default, but [data-abbr="on"] can opt a subtree back in
  const SOFT_SKIP = "code,pre,#navbar";

  // ---------- tooltip ----------
  let tip = null;
  function ensure() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "ml-tip";
    document.body.appendChild(tip);
    return tip;
  }
  function show(key, x, y) {
    const rec = A[key]; if (!rec) return;
    const c = rec[PLg() ? "pl" : "en"];
    const t = ensure();
    t.innerHTML = '<span class="ml-tip-k">' + key + "</span>" +
                  '<span class="ml-tip-f">' + c.full + "</span>" +
                  '<span class="ml-tip-d">' + c.d + "</span>";
    t.classList.add("on");
    move(x, y);
  }
  function move(x, y) {
    if (!tip) return;
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let nx = x + pad, ny = y + pad;
    if (nx + w > window.innerWidth - 10) nx = x - w - pad;
    if (ny + h > window.innerHeight - 10) ny = y - h - pad;
    tip.style.left = Math.max(8, nx) + "px";
    tip.style.top = Math.max(8, ny) + "px";
  }
  function hide() { if (tip) tip.classList.remove("on"); }

  // ---------- wrapping ----------
  function wrap(node) {
    const text = node.nodeValue;
    if (!text || text.length < 2) return false;
    RE.lastIndex = 0;
    let m, pieces = null, last = 0;
    while ((m = RE.exec(text)) !== null) {
      const s = m.index, e = s + m[0].length;
      // reject when the match is only part of a longer word or number
      if (isWord(text[s - 1]) || isWord(text[e])) continue;
      pieces = pieces || [];
      if (s > last) pieces.push(document.createTextNode(text.slice(last, s)));
      const el = document.createElement("abbr");
      el.className = "ml-abbr";
      el.dataset.k = m[0];
      el.textContent = m[0];
      el.tabIndex = 0;
      pieces.push(el);
      last = e;
    }
    if (!pieces) return false;
    if (last < text.length) pieces.push(document.createTextNode(text.slice(last)));
    const frag = document.createDocumentFragment();
    pieces.forEach(p => frag.appendChild(p));
    node.parentNode.replaceChild(frag, node);
    return true;
  }

  function scan(root) {
    if (!RE || !root) return 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest(HARD_SKIP)) return NodeFilter.FILTER_REJECT;
        const soft = p.closest(SOFT_SKIP);
        if (soft) {
          // opt back in: a <code> list of landmark codes is exactly where the reader most
          // wants the expansion, so [data-abbr="on"] overrides the soft skip for its subtree
          const allowed = p.closest('[data-abbr="on"]');
          if (!allowed || !allowed.contains(soft)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const todo = [];
    let n; while ((n = walker.nextNode())) todo.push(n);
    let count = 0;
    todo.forEach(t => { if (wrap(t)) count++; });
    return count;
  }

  // one delegated listener set, so newly wrapped elements need no wiring
  document.addEventListener("mouseover", e => {
    const el = e.target.closest && e.target.closest(".ml-abbr");
    if (el) show(el.dataset.k, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", e => {
    if (tip && tip.classList.contains("on")) {
      const el = e.target.closest && e.target.closest(".ml-abbr");
      if (el) move(e.clientX, e.clientY); else hide();
    }
  });
  document.addEventListener("focusin", e => {
    const el = e.target.closest && e.target.closest(".ml-abbr");
    if (el) { const r = el.getBoundingClientRect(); show(el.dataset.k, r.left, r.bottom); }
  });
  document.addEventListener("focusout", e => {
    if (e.target.closest && e.target.closest(".ml-abbr")) hide();
  });
  document.addEventListener("click", e => {                 // touch
    const el = e.target.closest && e.target.closest(".ml-abbr");
    if (el) { const r = el.getBoundingClientRect(); show(el.dataset.k, r.left, r.bottom); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, { passive: true });

  // ---------- run, and keep running as the page builds itself ----------
  let quiet = false, timer = null;
  function pass() {
    quiet = true;
    scan(document.body);
    setTimeout(() => { quiet = false; }, 60);   // ignore the mutations we just caused
  }
  function boot() {
    pass();
    setTimeout(pass, 900);                      // catch anything built asynchronously
    document.addEventListener("i18n:changed", () => { hide(); setTimeout(pass, 60); });
    if (typeof MutationObserver === "function") {
      new MutationObserver(() => {
        if (quiet) return;
        clearTimeout(timer);
        timer = setTimeout(pass, 300);          // the pass is idempotent, so a stray run is harmless
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MLAbbr = { rescan: pass, terms: A };
})();
