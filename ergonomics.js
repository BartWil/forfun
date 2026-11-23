// Ergonomia i prewencja urazów: cztery rachunki, które decydują o Twoim kręgosłupie.
//
// Stacja powstała dla studentów elektroradiologii, więc wszystkie zadania są
// ich zadaniami: podniesienie kasety z podłogi, przełożenie detektora, kilka
// godzin w fartuchu ołowiowym, przepchnięcie aparatu przyłóżkowego przez
// korytarz. Liczby nie są jednak dobrane pod opowieść, tylko policzone z
// modeli, które da się wskazać w literaturze.
//
// CO TU JEST POLICZONE, A CO ZACYTOWANE
//
// Dwa moduły liczą z pierwszych zasad, dwa z opublikowanych tabel:
//
//   dźwignia     model statyczny, jeden zastępczy mięsień prostownik,
//                równowaga momentów wokół L5-S1 (Chaffin i wsp.)
//   NIOSH        równanie z 1991 roku, mnożniki w postaci zamkniętej,
//                FM i CM z tabeli, bez interpolacji
//   fartuch      ten sam model dźwigni plus całka obciążenia po czasie
//   aparat        opór toczenia, czyli zwykłe F = mu * m * g
//
// MNOŻNIKI NIOSH SĄ SPRAWDZONE, A NIE ODTWORZONE Z PAMIĘCI
//
// Podręcznik NIOSH 94-110 podaje mnożniki tabelami. Wzory zamknięte, których
// tu używamy, zostały porównane z tabelą CCOHS w dwunastu punktach i zgadzają
// się na każdej cyfrze po zaokrągleniu do dwóch miejsc:
//
//   HM = 25/H     H = 25 -> 1,00   30 -> 0,83   40 -> 0,63   50 -> 0,50   60 -> 0,42
//   VM = 1 - 0,003|V-75|   V = 0 -> 0,78   30 -> 0,87   50 -> 0,93   70 -> 0,99
//                          100 -> 0,93   150 -> 0,78   175 -> 0,70
//   DM = 0,82 + 4,5/D      D = 25 -> 1,00   40 -> 0,93   55 -> 0,90   100 -> 0,87   145 -> 0,85
//   AM = 1 - 0,0032A       A = 0 -> 1,00   30 -> 0,90   45 -> 0,86   60 -> 0,81   90 -> 0,71
//
// Sprawdza to test w tests/science.test.mjs. Nie jest to ozdoba: gdyby ktoś
// kiedyś wpisał tu 0,003 jako 0,03, strona dalej zwracałaby ładne liczby.
//
// CZEGO TU CELOWO NIE MA
//
// Tabela FM w podręczniku NIOSH ma trzy kolumny czasu pracy. Wersja, którą
// udało się sprawdzić u źródła wtórnego, ma dwie, więc stacja implementuje
// dwie i mówi o tym wprost, zamiast dopisywać trzecią z pamięci. Nie ma też
// żadnej interpolacji między wierszami: student wybiera wiersz, który istnieje.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");
  const fix = (v, n) => Number(v).toFixed(n);
  // Tabela zrodlowa zaokragla polowe w gore, a toFixed idzie za binarna
  // reprezentacja i dla 0,865 oraz 0,985 schodzi o jedna cyfre w dol. Bez tego
  // stacja drukowalaby 0,86 tam, gdzie zrodlo podaje 0,87, czyli wygladalaby
  // na niezgodna z tabela, ktorej w rzeczywistosci dokladnie odpowiada.
  const fix2 = v => (Math.round(v * 100 + 1e-9) / 100).toFixed(2);
  const esc = window.BioLabState ? window.BioLabState.esc
            : v => String(v == null ? "" : v).replace(/[&<>"']/g,
                c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ===================================================================== model
  const G = 9.81;

  // Założenia modelu dźwigni. Każda z tych liczb jest wyborem, nie pomiarem,
  // i każda jest wypisana w kontrakcie naukowym stacji.
  const UPPER_FRAC = 0.50;   // część masy ciała powyżej L5-S1
  const R_TRUNK    = 0.32;   // m, L5-S1 do środka masy górnej części ciała
  const D_EXT      = 0.05;   // m, ramię dźwigni prostowników grzbietu

  // Dwa progi z literatury NIOSH. To kryteria projektowe dla populacji,
  // a nie granice bezpieczeństwa dla konkretnego człowieka.
  const AL  = 3400;          // N, action limit
  const MPL = 6400;          // N, maximum permissible limit

  // Kręgosłup jako dźwignia bardzo niekorzystna. Prostowniki działają na
  // ramieniu około 5 cm, a trzymany ciężar na ramieniu kilkudziesięciu, więc
  // mięsień musi ciągnąć wielokrotnie mocniej niż waży przedmiot.
  function spine(st) {
    const rad = st.flex * Math.PI / 180;
    const wUpper = UPPER_FRAC * st.mass * G;
    const wLoad = st.load * G;

    const armUpper = R_TRUNK * Math.sin(rad);
    const mUpper = wUpper * armUpper;
    const mLoad = wLoad * st.horiz;
    const mTotal = mUpper + mLoad;

    const fExt = mTotal / D_EXT;
    // Składowa ciężaru wzdłuż osi kręgosłupa. Przy tułowiu odchylonym o kąt
    // flex od pionu zostaje z niej cos(flex).
    const fAxial = (wUpper + wLoad) * Math.cos(rad);
    const comp = fExt + fAxial;

    return {
      wUpper, wLoad, armUpper, mUpper, mLoad, mTotal, fExt, fAxial, comp,
      ratio: wLoad > 0 ? comp / wLoad : 0,
      zone: comp > MPL ? "bad" : comp > AL ? "warn" : "ok",
    };
  }

  // ------------------------------------------------------------------- NIOSH
  // Mnożniki geometryczne w postaci zamkniętej. Poza zakresem stosowalności
  // mnożnik wynosi zero, czyli równanie mówi, że nie ma dopuszczalnej masy.
  const NIOSH = {
    LC: 23,
    HM(H) { if (H <= 25) return 1; if (H > 63) return 0; return 25 / H; },
    VM(V) { if (V < 0 || V > 175) return 0; return 1 - 0.003 * Math.abs(V - 75); },
    DM(D) { if (D <= 25) return 1; if (D > 175) return 0; return 0.82 + 4.5 / D; },
    AM(A) { if (A < 0 || A > 135) return 0; return 1 - 0.0032 * A; },
  };

  // Tabela FM w postaci, którą udało się sprawdzić u źródła: wiersze to czas
  // między podniesieniami, kolumny to czas pracy. Wartość null znaczy, że
  // tabela nie podaje dopuszczalnej masy, a nie że mnożnik wynosi zero.
  const FM_ROWS = [
    { s: 300, perMin: 0.2, lab: { en: "once every 5 min", pl: "raz na 5 min" },  v: [1.00, 0.85] },
    { s:  60, perMin: 1,   lab: { en: "once a minute",    pl: "raz na minutę" }, v: [0.94, 0.75] },
    { s:  30, perMin: 2,   lab: { en: "every 30 s",       pl: "co 30 s" },       v: [0.91, 0.65] },
    { s:  15, perMin: 4,   lab: { en: "every 15 s",       pl: "co 15 s" },       v: [0.84, 0.45] },
    { s:  10, perMin: 6,   lab: { en: "every 10 s",       pl: "co 10 s" },       v: [0.75, 0.27] },
    { s:   6, perMin: 10,  lab: { en: "every 6 s",        pl: "co 6 s" },        v: [0.45, 0.13] },
    { s:   5, perMin: 12,  lab: { en: "every 5 s",        pl: "co 5 s" },        v: [0.37, null] },
  ];
  const DUR_LABS = [
    { en: "an hour or less", pl: "godzina albo mniej" },
    { en: "over an hour",    pl: "ponad godzinę" },
  ];

  // CM dzieli się na stanie i schylenie. NIOSH stawia tę granicę na wysokości
  // 75 cm, więc wysokość startowa decyduje, której kolumny użyć.
  const CM_TABLE = {
    good: { stand: 1.00, stoop: 1.00 },
    fair: { stand: 1.00, stoop: 0.95 },
    poor: { stand: 0.90, stoop: 0.90 },
  };

  // Zadania, dla których równanie NIOSH jest w ogóle zdefiniowane. Lista
  // warunków pochodzi z opisu stosowalności równania: dwie ręce, stabilny
  // ładunek o znanej masie, swobodna postawa, umiarkowana prędkość, pewny
  // chwyt i pewne podparcie stóp. Pacjent nie spełnia kilku z nich naraz
  // i wtedy równanie nie ma wyniku, a nie zły wynik.
  const TASKS = {
    box: {
      lab: { en: "A box of contrast media", pl: "Pudełko środka kontrastowego" },
      why: { en: "Known weight, rigid, two proper handles, you choose your own posture. This is the task the equation was written for.",
             pl: "Znana masa, sztywne, dwa prawdziwe uchwyty, postawę wybierasz sam. To zadanie, dla którego napisano równanie." },
      preset: { nLoad: 12, H: 30, V: 75, D: 50, A: 0, coup: "good" },
      violations: [],
    },
    detector: {
      lab: { en: "A portable detector under a bed", pl: "Detektor wsuwany pod łóżko" },
      why: { en: "Weight is known and the plate is rigid, but you are reaching into a restricted space and the grip is whatever edge you can find.",
             pl: "Masa jest znana i płyta jest sztywna, ale sięgasz w ciasną przestrzeń, a chwyt to ta krawędź, którą udało się złapać." },
      preset: { nLoad: 6, H: 55, V: 60, D: 35, A: 30, coup: "poor" },
      violations: ["space", "coupling"],
    },
    patient: {
      lab: { en: "Moving a patient up the table", pl: "Przesunięcie pacjenta na stole" },
      why: { en: "The equation has no answer here, and that is the single most useful thing this panel can tell you.",
             pl: "Równanie nie ma tu odpowiedzi, i to jest najbardziej użyteczna rzecz, jaką ten panel może Ci powiedzieć." },
      preset: { nLoad: 30, H: 45, V: 70, D: 20, A: 45, coup: "poor" },
      violations: ["weight", "stable", "space", "coupling"],
    },
  };

  const VIOLATIONS = {
    weight: { en: "the weight is not known in advance, and only part of it passes through your hands",
              pl: "masa nie jest znana z góry, a przez Twoje ręce przechodzi tylko jej część" },
    stable: { en: "the load is not stable: it can tense, resist, slide or go limp while you lift",
              pl: "ładunek nie jest stabilny: może się napiąć, stawiać opór, zsunąć się albo zwiotczeć w trakcie" },
    space:  { en: "the posture is restricted by the table, the gantry or the bed rail",
              pl: "postawę ogranicza stół, gantra albo barierka łóżka" },
    coupling: { en: "there is nothing designed to be gripped",
                pl: "nie ma niczego, co byłoby zaprojektowane do chwytania" },
  };

  function niosh(st) {
    const task = TASKS[st.task] || TASKS.box;
    const stoop = st.V < 75;
    const row = FM_ROWS[st.freq] || FM_ROWS[0];
    const fm = row.v[st.dur];
    const cm = (CM_TABLE[st.coup] || CM_TABLE.good)[stoop ? "stoop" : "stand"];

    const m = {
      HM: NIOSH.HM(st.H), VM: NIOSH.VM(st.V), DM: NIOSH.DM(st.D),
      AM: NIOSH.AM(st.A), FM: fm, CM: cm,
    };
    const applies = task.violations.length === 0;
    const noTable = fm === null;
    const rwl = (applies && !noTable)
      ? NIOSH.LC * m.HM * m.VM * m.DM * m.AM * m.FM * m.CM
      : null;
    const li = rwl !== null && rwl > 0 ? st.nLoad / rwl : null;

    return {
      m, rwl, li, applies, noTable, stoop, row,
      violations: task.violations.map(k => VIOLATIONS[k]),
      zone: li === null ? "bad" : li > 3 ? "bad" : li > 1 ? "warn" : "ok",
    };
  }

  // ------------------------------------------------------------------ fartuch
  // Fartuch to nie tylko masa. Jego środek masy leży przed kręgosłupem, więc
  // prostowniki muszą go równoważyć na tym samym nieszczęsnym ramieniu 5 cm.
  const APRON_FRONT = 0.06;   // m, środek masy fartucha przed osią kręgosłupa
  const TWO_PIECE_SPINE = 0.4; // część masy niesiona przez kręgosłup w wersji dwuczęściowej

  function apron(st) {
    const wTotal = st.aMass * G;
    const frac = st.aType === "two" ? TWO_PIECE_SPINE : 1.0;
    const wSpine = wTotal * frac;
    const extra = wSpine * (1 + APRON_FRONT / D_EXT);

    // Obciążenie kumulacyjne: całka siły po czasie. Nie jest to „dawka urazu”,
    // tylko miara ekspozycji, i tak trzeba ją czytać.
    const aprSec = st.aHours * 3600;
    const cumApron = extra * aprSec;

    // Dla porównania: te same liczby dla podnoszenia. Jedno podniesienie trwa
    // kilka sekund, fartuch wisi godzinami, i w tym tkwi cała puenta.
    const liftExtra = st.liftComp;
    const cumLift = liftExtra * 3 * st.lifts;

    return {
      wTotal, wSpine, extra, cumApron, cumLift,
      total: cumApron + cumLift,
      share: cumApron + cumLift > 0 ? cumApron / (cumApron + cumLift) : 0,
      ratio: cumLift > 0 ? cumApron / cumLift : 0,
    };
  }

  // ------------------------------------------------------------------- aparat
  // Opór toczenia, czyli najprostsza możliwa fizyka. Siła potrzebna do
  // ruszenia zawiera jeszcze człon na rozpędzenie masy.
  const FLOORS = [
    { mu: 0.015, lab: { en: "smooth floor, good casters", pl: "gładka podłoga, dobre koła" } },
    { mu: 0.030, lab: { en: "vinyl, worn casters",        pl: "wykładzina, zużyte koła" } },
    { mu: 0.080, lab: { en: "thresholds, cables, carpet", pl: "progi, kable, dywan" } },
  ];

  function push(st) {
    const floor = FLOORS[st.floor] || FLOORS[0];
    const roll = floor.mu * st.pMass * G;
    const accel = st.pSpeed / 1.5;              // rozpędzenie w 1,5 s
    const start = roll + st.pMass * accel;
    return { mu: floor.mu, roll, start, accel, floor };
  }

  // =================================================================== symbole
  // Serce dydaktyczne strony. Każdy wpis odpowiada po kolei: jak się nazywa,
  // co znaczy słowami, w czym się mierzy, do czego to podobne, ile wychodzi
  // na prawdziwych liczbach i co ludzie z tym mylą.
  const SYM = {
    Fc: {
      s: "Fc", name: { en: "Compression at L5-S1", pl: "Ucisk na L5-S1" },
      what: { en: "How hard the last lumbar disc is being squeezed along the axis of the spine.",
              pl: "Jak mocno ostatni krążek lędźwiowy jest ściskany wzdłuż osi kręgosłupa." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: { en: "Imagine the disc as a firm rubber washer with a wall of bone above and below. This is the force pressing those two walls together, not the weight in your hands.",
                 pl: "Wyobraź sobie krążek jako twardą gumową podkładkę między dwiema ścianami z kości. To siła dociskająca te ściany do siebie, a nie ciężar w Twoich rękach." },
      example: { en: "Upright with empty hands this model gives about 340 N. Holding 15 kg at arm's length while bent forward it passes 3400 N, and the load in your hands never changed. Note that 340 N is already below in-vivo estimates near 500 N, because the model ignores resting muscle tone.",
                 pl: "W postawie wyprostowanej z pustymi rękami ten model daje około 340 N. Przy 15 kg na wyprostowanych rękach i pochyleniu przekracza 3400 N, a ciężar w rękach wcale się nie zmienił. Zauważ, że 340 N leży już poniżej szacunków z pomiarów wewnątrzkrążkowych, bliskich 500 N, bo model pomija spoczynkowe napięcie mięśni." },
      mistake: { en: "Reading it as a damage score. It is a computed mechanical load. Whether a given spine tolerates it depends on bone density, age and sex, and cadaveric specimens vary from about 2 to over 10 kN.",
                 pl: "Czytanie tego jako miary uszkodzenia. To policzone obciążenie mechaniczne. Czy dany kręgosłup je zniesie, zależy od gęstości kości, wieku i płci, a preparaty anatomiczne różnią się od około 2 do ponad 10 kN." },
    },
    Fext: {
      s: "Fext", name: { en: "Back extensor force", pl: "Siła prostowników grzbietu" },
      what: { en: "How hard the muscles running along your spine have to pull to stop your trunk folding forwards.",
              pl: "Jak mocno mięśnie biegnące wzdłuż kręgosłupa muszą ciągnąć, żeby tułów nie złożył się do przodu." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: { en: "A crane counterbalanced by a cable fixed a few centimetres from its pivot. The cable has to be enormously tight, because its lever is tiny compared with the load's.",
                 pl: "Żuraw równoważony liną zaczepioną kilka centymetrów od osi obrotu. Lina musi być naciągnięta ogromnie, bo jej dźwignia jest znikoma wobec dźwigni ładunku." },
      example: { en: "To hold 147 N of load at 45 cm, the extensors on a 5 cm lever need about 1300 N just for that part of the job.",
                 pl: "Żeby utrzymać 147 N ciężaru na 45 cm, prostowniki na dźwigni 5 cm potrzebują około 1300 N tylko na tę część zadania." },
      mistake: { en: "Forgetting that this force also presses down on the disc. The muscle does not lift the load off your spine, it adds its own pull to what the disc carries.",
                 pl: "Zapominanie, że ta siła też dociska krążek. Mięsień nie zdejmuje ciężaru z kręgosłupa, lecz dodaje własny ciąg do tego, co krążek niesie." },
    },
    dext: {
      s: "d", name: { en: "Extensor moment arm", pl: "Ramię dźwigni prostowników" },
      what: { en: "The perpendicular distance from the centre of the disc to the line along which the back muscles pull.",
              pl: "Odległość prostopadła od środka krążka do linii, wzdłuż której ciągną mięśnie grzbietu." },
      unit: { en: "metres (m)", pl: "metry (m)" },
      analogy: { en: "The length of the spanner. A short spanner needs a huge force for the same turning effect, and anatomy gave your back a very short one.",
                 pl: "Długość klucza. Krótki klucz wymaga ogromnej siły dla tego samego efektu obrotowego, a anatomia dała Twoim plecom bardzo krótki." },
      example: { en: "About 5 cm, against a load held 45 cm away. That nine-to-one disadvantage is why the numbers on this page are so large.",
                 pl: "Około 5 cm, przeciw ciężarowi trzymanemu 45 cm dalej. Ta niekorzyść dziewięć do jednego sprawia, że liczby na tej stronie są tak duże." },
      mistake: { en: "Treating it as fixed. It changes with spine curvature and differs between people, and this station uses one average value for all of them.",
                 pl: "Traktowanie go jako stałej. Zmienia się z krzywizną kręgosłupa i różni się między ludźmi, a ta stacja używa jednej średniej wartości dla wszystkich." },
    },
    horiz: {
      s: "h", name: { en: "Horizontal distance", pl: "Odległość pozioma" },
      what: { en: "How far in front of your lower back your hands are holding the load.",
              pl: "Jak daleko przed Twoim dolnym odcinkiem kręgosłupa trzymasz ciężar." },
      unit: { en: "metres (m)", pl: "metry (m)" },
      analogy: { en: "Carrying a bucket against your chest versus at the end of a straight arm. Same bucket, completely different job.",
                 pl: "Niesienie wiadra przy klatce piersiowej albo na końcu wyprostowanej ręki. To samo wiadro, zupełnie inna praca." },
      example: { en: "Going from 45 cm to 25 cm with 15 kg in your hands removes roughly 600 N of disc compression, which is more than most posture advice achieves.",
                 pl: "Zmniejszenie z 45 cm do 25 cm przy 15 kg w rękach zdejmuje około 600 N ucisku na krążek, czyli więcej niż większość rad o postawie." },
      mistake: { en: "Confusing it with the NIOSH H, which is measured from the midpoint between the ankles, not from the lumbar spine, and is therefore a different and usually larger number.",
                 pl: "Mylenie jej z H w równaniu NIOSH, które mierzy się od środka między kostkami, a nie od kręgosłupa lędźwiowego, więc jest to inna i zwykle większa liczba." },
    },
    flex: {
      s: "θ", name: { en: "Trunk flexion", pl: "Zgięcie tułowia" },
      what: { en: "How far your trunk is tipped forward from vertical. Zero is standing upright, ninety is horizontal.",
              pl: "O ile tułów jest pochylony od pionu. Zero to postawa wyprostowana, dziewięćdziesiąt to poziom." },
      unit: { en: "degrees", pl: "stopnie" },
      analogy: { en: "A drawbridge. Flat against its tower it needs no chain; swung out over the moat the chain carries everything.",
                 pl: "Most zwodzony. Przylegający do wieży nie potrzebuje łańcucha; wychylony nad fosę obciąża łańcuch całym sobą." },
      example: { en: "Your own upper body weighs about 340 N. Upright it sits almost over the disc; at 75 degrees it hangs 31 cm in front of it.",
                 pl: "Twoja górna połowa ciała waży około 340 N. W pionie stoi niemal nad krążkiem; przy 75 stopniach wisi 31 cm przed nim." },
      mistake: { en: "Thinking the load you carry is the problem. At 15 kg your own trunk usually contributes more moment than the thing in your hands.",
                 pl: "Przekonanie, że problemem jest niesiony ciężar. Przy 15 kg Twój własny tułów zwykle wnosi większy moment niż to, co trzymasz w rękach." },
    },
    RWL: {
      s: "RWL", name: { en: "Recommended weight limit", pl: "Zalecana masa graniczna" },
      what: { en: "The weight the NIOSH equation says this particular lift could have, given its geometry, frequency and grip.",
              pl: "Masa, jaką według równania NIOSH mogłoby mieć to konkretne podniesienie, przy jego geometrii, częstości i chwycie." },
      unit: { en: "kilograms (kg)", pl: "kilogramy (kg)" },
      analogy: { en: "A speed limit for a particular corner rather than for the whole road. Change the corner and the number changes.",
                 pl: "Ograniczenie prędkości dla konkretnego zakrętu, a nie dla całej drogi. Zmień zakręt i liczba się zmienia." },
      example: { en: "Starts at 23 kg in ideal conditions and is cut by every multiplier. A twisted, low, poorly gripped, repeated lift can drive it under 5 kg.",
                 pl: "Startuje od 23 kg w warunkach idealnych i jest cięta przez każdy mnożnik. Podniesienie ze skrętem, nisko, bez chwytu i powtarzane może zepchnąć ją pod 5 kg." },
      mistake: { en: "Reading it as a safe weight for you. It was derived to protect most of a working population, stated as 75 percent of women and 90 percent of men, not to certify one person's lift.",
                 pl: "Czytanie jej jako masy bezpiecznej dla Ciebie. Wyprowadzono ją, by chronić większość populacji pracującej, podaną jako 75 procent kobiet i 90 procent mężczyzn, a nie by zatwierdzić podniesienie jednej osoby." },
    },
    LI: {
      s: "LI", name: { en: "Lifting index", pl: "Wskaźnik podnoszenia" },
      what: { en: "The actual weight divided by the recommended limit. One means the task sits exactly at the limit.",
              pl: "Rzeczywista masa podzielona przez masę graniczną. Jedynka znaczy, że zadanie leży dokładnie na granicy." },
      unit: { en: "none, it is a ratio", pl: "brak, to stosunek" },
      analogy: { en: "Driving at 1.4 times the limit. It does not say you will crash, it says how far outside the design envelope you are.",
                 pl: "Jazda z prędkością 1,4 razy większą od dozwolonej. Nie mówi, że się rozbijesz, tylko jak daleko jesteś poza założeniami projektowymi." },
      example: { en: "12 kg where the limit came out at 8 kg gives LI = 1.5. Published guidance treats above 1 as raised risk and above 3 as substantially raised.",
                 pl: "12 kg tam, gdzie granica wyszła 8 kg, daje LI = 1,5. Publikowane wytyczne traktują powyżej 1 jako podwyższone ryzyko, a powyżej 3 jako istotnie podwyższone." },
      mistake: { en: "Turning it into a probability. LI = 2 does not mean twice the injuries, and it says nothing about which worker will be hurt.",
                 pl: "Przerabianie go na prawdopodobieństwo. LI = 2 nie znaczy dwa razy więcej urazów i nie mówi nic o tym, który pracownik zostanie poszkodowany." },
    },
    HM: {
      s: "HM", name: { en: "Horizontal multiplier", pl: "Mnożnik poziomy" },
      what: { en: "How much of the allowable weight survives the fact that the load is out in front of you.",
              pl: "Ile z dopuszczalnej masy zostaje po tym, że ładunek jest wysunięty przed Ciebie." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "A discount applied to the whole limit. At arm's length the discount is brutal.",
                 pl: "Rabat nałożony na całą granicę. Na długość ramienia rabat jest brutalny." },
      example: { en: "25/H. At 25 cm it is 1.00, at 50 cm it is 0.50, and beyond 63 cm the equation returns zero.",
                 pl: "25/H. Przy 25 cm to 1,00, przy 50 cm 0,50, a powyżej 63 cm równanie zwraca zero." },
      mistake: { en: "Measuring H from your body. NIOSH measures it from the midpoint between your ankles to your hands.",
                 pl: "Mierzenie H od swojego ciała. NIOSH mierzy je od środka między kostkami do rąk." },
    },
    VM: {
      s: "VM", name: { en: "Vertical multiplier", pl: "Mnożnik pionowy" },
      what: { en: "How much is lost because the lift does not start at knuckle height.",
              pl: "Ile się traci, bo podniesienie nie zaczyna się na wysokości dłoni swobodnie zwisającej ręki." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "A shelf at exactly the right height costs nothing. Floor level and above the shoulders both cost.",
                 pl: "Półka na dokładnie właściwej wysokości nic nie kosztuje. Poziom podłogi i powyżej barków kosztują oba." },
      example: { en: "1 - 0.003|V - 75|, so 75 cm is free and the floor costs about 22 percent.",
                 pl: "1 - 0,003|V - 75|, więc 75 cm jest darmowe, a podłoga kosztuje około 22 procent." },
      mistake: { en: "Assuming low is the only bad case. The penalty is symmetrical, so reaching a cassette down from a high shelf is penalised too.",
                 pl: "Założenie, że złe jest tylko nisko. Kara jest symetryczna, więc zdejmowanie kasety z wysokiej półki też jest karane." },
    },
    DM: {
      s: "DM", name: { en: "Distance multiplier", pl: "Mnożnik drogi" },
      what: { en: "How much is lost because the load has to travel a long vertical distance.",
              pl: "Ile się traci, bo ładunek musi przebyć długą drogę w pionie." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "Carrying shopping up one step versus up three flights.",
                 pl: "Wniesienie zakupów o jeden stopień albo o trzy kondygnacje." },
      example: { en: "0.82 + 4.5/D. Up to 25 cm it is free; even a 175 cm lift only costs about 15 percent.",
                 pl: "0,82 + 4,5/D. Do 25 cm jest darmowe; nawet 175 cm kosztuje tylko około 15 procent." },
      mistake: { en: "Expecting it to dominate. Of all six multipliers this is usually the gentlest, which surprises people.",
                 pl: "Oczekiwanie, że będzie dominował. Z sześciu mnożników ten jest zwykle najłagodniejszy, co ludzi dziwi." },
    },
    AM: {
      s: "AM", name: { en: "Asymmetry multiplier", pl: "Mnożnik skrętu" },
      what: { en: "How much is lost because you twisted instead of turning your feet.",
              pl: "Ile się traci, bo skręciłeś tułów zamiast przestawić stopy." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "Unscrewing a jar while looking over your shoulder. Everything about it is worse.",
                 pl: "Odkręcanie słoika z głową obróconą przez ramię. Wszystko jest w tym gorsze." },
      example: { en: "1 - 0.0032A. Ninety degrees of twist costs 29 percent of the whole limit.",
                 pl: "1 - 0,0032A. Dziewięćdziesiąt stopni skrętu kosztuje 29 procent całej granicy." },
      mistake: { en: "Treating it as unavoidable. It is the cheapest multiplier to fix in the whole equation: you move your feet.",
                 pl: "Traktowanie go jako nieuniknionego. To najtańszy do naprawienia mnożnik w całym równaniu: przestawiasz stopy." },
    },
    FM: {
      s: "FM", name: { en: "Frequency multiplier", pl: "Mnożnik częstości" },
      what: { en: "How much is lost because the lift repeats, and for how long the shift lasts.",
              pl: "Ile się traci, bo podniesienie się powtarza, i jak długo trwa zmiana." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "One sprint is fine. The same sprint every ten seconds for six hours is a different activity entirely.",
                 pl: "Jeden sprint jest w porządku. Ten sam sprint co dziesięć sekund przez sześć godzin to zupełnie inna aktywność." },
      example: { en: "Once every five minutes for under an hour costs nothing. Every six seconds for over an hour leaves 0.13 of the limit.",
                 pl: "Raz na pięć minut przez mniej niż godzinę nic nie kosztuje. Co sześć sekund przez ponad godzinę zostawia 0,13 granicy." },
      mistake: { en: "Interpolating between rows. This multiplier comes from a table, not a formula, and this station deliberately offers only rows the table actually has.",
                 pl: "Interpolowanie między wierszami. Ten mnożnik pochodzi z tabeli, nie ze wzoru, i ta stacja celowo oferuje tylko wiersze, które tabela naprawdę ma." },
    },
    CM: {
      s: "CM", name: { en: "Coupling multiplier", pl: "Mnożnik chwytu" },
      what: { en: "How much is lost because there is nothing good to hold on to.",
              pl: "Ile się traci, bo nie ma czego dobrze złapać." },
      unit: { en: "none, between 0 and 1", pl: "brak, od 0 do 1" },
      analogy: { en: "A suitcase with a handle against the same suitcase without one.",
                 pl: "Walizka z uchwytem i ta sama walizka bez uchwytu." },
      example: { en: "Good handles cost nothing. A poor grip costs 10 percent, and if you are also stooping a fair grip costs 5 percent.",
                 pl: "Dobre uchwyty nic nie kosztują. Słaby chwyt kosztuje 10 procent, a przy schyleniu przeciętny chwyt kosztuje 5 procent." },
      mistake: { en: "Expecting it to be the big one. People fix grips and leave the twist and the reach alone, which are worth far more.",
                 pl: "Oczekiwanie, że to ten najważniejszy. Ludzie poprawiają uchwyty i zostawiają skręt oraz wysięg, które są warte znacznie więcej." },
    },
    LC: {
      s: "LC", name: { en: "Load constant", pl: "Stała obciążenia" },
      what: { en: "The weight the equation starts from before any of the six penalties are applied.",
              pl: "Masa, od której równanie startuje, przed nałożeniem którejkolwiek z sześciu kar." },
      unit: { en: "kilograms (kg)", pl: "kilogramy (kg)" },
      analogy: { en: "The full marks on a test. Every multiplier takes some away and none can give any back.",
                 pl: "Maksymalna liczba punktów na sprawdzianie. Każdy mnożnik coś odejmuje i żaden nie może nic dodać." },
      example: { en: "23 kg, chosen as a load that under ideal conditions is acceptable for about 75 percent of women and 90 percent of men.",
                 pl: "23 kg, wybrane jako obciążenie, które w warunkach idealnych jest dopuszczalne dla około 75 procent kobiet i 90 procent mężczyzn." },
      mistake: { en: "Thinking of it as a maximum anyone may lift. It is the ceiling of a design method, under conditions that almost never occur in a radiology department.",
                 pl: "Myślenie o niej jak o maksimum, które ktokolwiek może podnieść. To pułap metody projektowej, w warunkach, które w pracowni radiologicznej prawie nie występują." },
    },
    cum: {
      s: "∫F dt", name: { en: "Cumulative compressive load", pl: "Kumulacyjne obciążenie uciskowe" },
      what: { en: "Compression added up over the whole time it acts, rather than only at its worst instant.",
              pl: "Ucisk zsumowany po całym czasie działania, a nie tylko w najgorszej chwili." },
      unit: { en: "newton seconds (N·s)", pl: "niutonosekundy (N·s)" },
      analogy: { en: "Sun exposure. Ten minutes at noon and four hours in the afternoon are not comparable by brightness alone.",
                 pl: "Ekspozycja na słońce. Dziesięciu minut w południe i czterech godzin po południu nie da się porównać samą jasnością." },
      example: { en: "A 6 kg one-piece apron worn four hours accumulates about nine times what twenty lifts at 3400 N accumulate, because each lift lasts three seconds and the apron lasts four hours.",
                 pl: "Fartuch jednoczęściowy 6 kg noszony cztery godziny kumuluje około dziewięć razy więcej niż dwadzieścia podniesień po 3400 N, bo każde podniesienie trwa trzy sekundy, a fartuch cztery godziny." },
      mistake: { en: "Treating it as a dose of injury. It is an exposure measure. Cohort studies link high cumulative load to reported back pain, but there is no validated dose and no threshold.",
                 pl: "Traktowanie tego jak dawki urazu. To miara ekspozycji. Badania kohortowe wiążą wysokie obciążenie kumulacyjne ze zgłaszanym bólem pleców, ale nie ma zwalidowanej dawki ani progu." },
    },
    mu: {
      s: "μ", name: { en: "Rolling resistance coefficient", pl: "Współczynnik oporu toczenia" },
      what: { en: "What fraction of the equipment's weight you have to push to keep it rolling.",
              pl: "Jaką część ciężaru sprzętu musisz pchać, żeby utrzymać go w ruchu." },
      unit: { en: "none, it is a ratio", pl: "brak, to stosunek" },
      analogy: { en: "A supermarket trolley on a polished floor versus the same trolley on gravel.",
                 pl: "Wózek sklepowy na wypolerowanej podłodze i ten sam wózek na żwirze." },
      example: { en: "About 0.015 for good casters on smooth vinyl, around 0.08 once you add thresholds, cables and carpet. That is more than a fivefold difference in push force.",
                 pl: "Około 0,015 dla dobrych kół na gładkiej wykładzinie, około 0,08 gdy dojdą progi, kable i dywan. To ponad pięciokrotna różnica w sile pchania." },
      mistake: { en: "Assuming the heavy machine is the problem. A 450 kg unit on good casters needs less sustained force than a 150 kg one stuck on a cable.",
                 pl: "Założenie, że problemem jest ciężka maszyna. Aparat 450 kg na dobrych kołach wymaga mniejszej siły podtrzymującej niż 150 kg zablokowane na kablu." },
    },
    AL: {
      s: "AL", name: { en: "Action limit and permissible limit", pl: "Granica działania i granica dopuszczalna" },
      what: { en: "Two compression values used as design criteria in the NIOSH lifting literature: 3400 N and 6400 N.",
              pl: "Dwie wartości ucisku używane jako kryteria projektowe w literaturze NIOSH o podnoszeniu: 3400 N i 6400 N." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: { en: "A bridge's design load and its absolute ceiling. Neither is the load at which a particular bridge falls down.",
                 pl: "Obciążenie projektowe mostu i jego absolutny pułap. Żadne z nich nie jest obciążeniem, przy którym konkretny most się zawala." },
      example: { en: "3400 N is roughly what one 15 kg lift at arm's length produces, which is why that lift keeps appearing in training material.",
                 pl: "3400 N to z grubsza tyle, ile daje jedno podniesienie 15 kg na wyprostowanych rękach, i dlatego to podniesienie wciąż pojawia się w materiałach szkoleniowych." },
      mistake: { en: "Reading the lines on this page as safe and unsafe. They are population criteria. Individual lumbar specimens fail anywhere from about 2 kN to over 10 kN.",
                 pl: "Czytanie linii na tej stronie jako bezpiecznie i niebezpiecznie. To kryteria populacyjne. Pojedyncze preparaty lędźwiowe pękają od około 2 kN do ponad 10 kN." },
    },
  };

  // ------------------------------------------------------------ karty symboli
  let cardEl = null;
  function card() {
    if (cardEl) return cardEl;
    cardEl = document.createElement("div");
    cardEl.className = "er-card";
    document.body.appendChild(cardEl);
    return cardEl;
  }
  function showSym(key, x, y) {
    const d = SYM[key];
    if (!d) return;
    const c = card();
    const row = (lab, val, cls) =>
      '<div class="er-card-row ' + (cls || "") + '"><span>' + esc(lab) + "</span><span>" + esc(val) + "</span></div>";
    c.innerHTML =
      '<div class="er-card-head"><b>' + esc(d.s) + "</b><span>" + esc(L(d.name)) + "</span></div>" +
      '<div class="er-card-what">' + esc(L(d.what)) + "</div>" +
      row(T("Unit", "Jednostka"), L(d.unit), "er-card-unit") +
      row(T("Like", "To jak"), L(d.analogy)) +
      row(T("For instance", "Na przykład"), L(d.example)) +
      row(T("Watch out", "Uwaga"), L(d.mistake), "er-card-warn");
    c.classList.add("in");
    moveCard(x, y);
  }
  function moveCard(x, y) {
    if (!cardEl) return;
    const pad = 18, r = cardEl.getBoundingClientRect();
    let nx = x + pad, ny = y + pad;
    if (nx + r.width > window.innerWidth - 12) nx = x - r.width - pad;
    if (ny + r.height > window.innerHeight - 12) ny = y - r.height - pad;
    cardEl.style.left = Math.max(8, nx) + "px";
    cardEl.style.top = Math.max(8, ny) + "px";
  }
  const hideSym = () => cardEl && cardEl.classList.remove("in");

  function wireSyms(root) {
    (root || document).querySelectorAll(".er-sym").forEach(el => {
      if (el.dataset.wired) return;
      el.dataset.wired = "1";
      el.tabIndex = 0;
      const k = el.dataset.sym;
      el.addEventListener("mouseenter", e => showSym(k, e.clientX, e.clientY));
      el.addEventListener("mousemove", e => moveCard(e.clientX, e.clientY));
      el.addEventListener("mouseleave", hideSym);
      el.addEventListener("focus", () => {
        const r = el.getBoundingClientRect(); showSym(k, r.left, r.bottom);
      });
      el.addEventListener("blur", hideSym);
      el.addEventListener("click", e => { e.preventDefault(); showSym(k, e.clientX, e.clientY); });
    });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideSym(); });
  window.addEventListener("scroll", hideSym, { passive: true });
  // Bez myszy nie ma mouseleave, więc tapnięcie poza symbolem musi zamykać kartę.
  document.addEventListener("pointerdown", e => {
    if (!e.target.closest(".er-sym") && !e.target.closest(".er-card")) hideSym();
  }, { passive: true });

  const sym = (k, txt) => '<span class="er-sym" data-sym="' + k + '">' + esc(txt == null ? SYM[k].s : txt) + "</span>";

  // ===================================================================== stan
  const S = {
    stage: 1,
    // dźwignia
    mass: 70, load: 15, horiz: 0.45, flex: 60,
    // NIOSH
    task: "box", nLoad: 12, H: 30, V: 75, D: 50, A: 0, freq: 1, dur: 0, coup: "good",
    // fartuch
    aMass: 6, aType: "one", aHours: 4, lifts: 20, liftComp: 2500,
    // aparat
    pMass: 450, floor: 0, pSpeed: 0.6,
  };

  const STAGES = [
    { n: 1, k: "lever",  en: "The lever",      pl: "Dźwignia" },
    { n: 2, k: "niosh",  en: "The equation",   pl: "Równanie" },
    { n: 3, k: "apron",  en: "The apron",      pl: "Fartuch" },
    { n: 4, k: "push",   en: "The machine",    pl: "Aparat" },
  ];

  const subs = [];
  const emit = () => subs.forEach(f => f());

  const PRESETS = {
    cassette: {
      lab: { en: "Cassette off the floor, bent over", pl: "Kaseta z podłogi, na zgiętych plecach" },
      v: { load: 6, horiz: 0.50, flex: 85 },
    },
    squat: {
      lab: { en: "Same cassette, squatted, held close", pl: "Ta sama kaseta, w przysiadzie, blisko ciała" },
      v: { load: 6, horiz: 0.20, flex: 25 },
    },
    patient: {
      lab: { en: "Taking a patient's weight at the bed rail", pl: "Przyjęcie ciężaru pacjenta przy barierce" },
      v: { load: 25, horiz: 0.55, flex: 55 },
    },
  };

  // =================================================================== rysunek
  const C = { line: "#8593b0", grid: "rgba(255,255,255,.07)", spine: "#ffd166",
              load: "#ff6f5e", muscle: "#5eead4", ok: "#5eead4", warn: "#ffd166", bad: "#ff6f5e" };

  function figure(host) {
    const wrap = document.createElement("div");
    wrap.className = "er-fig";
    const cv = document.createElement("canvas");
    wrap.appendChild(cv);
    host.appendChild(wrap);
    const ctx = cv.getContext("2d");
    // Obserwator rozmiaru potrafi trafić w szerokość z połowy przejścia, a
    // potem nic już nie przerysowuje, więc rysunek zostaje przycięty do
    // nieaktualnej szerokości aż do następnego kliknięcia. Dolna granica jest
    // tu niższa od najwęższego telefonu, żeby płótno nigdy nie było szersze od
    // swojego kontenera, a zmiana szerokości wymusza jedno dodatkowe
    // przerysowanie w następnej klatce. Zbiega, bo warunkiem jest różnica.
    let lastW = 0;

    function paint() {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(240, r.width || 320), h = 320;
      const dpr = window.devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const d = spine(S);
      // Metry na piksele. Skala dobrana tak, by sylwetka wypełniała rysunek:
      // tułów ma 0,52 m, nogi 0,42 m, więc przy 0,62 wysokości na metr całość
      // mieści się pod paskiem ucisku i nad dolną krawędzią.
      const px = h * 0.62;
      const ox = Math.max(0.30 * px, w * 0.30), oy = h * 0.72;   // L5-S1 na rysunku
      const rad = S.flex * Math.PI / 180;
      ctx.textBaseline = "alphabetic";

      // podłoga
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, oy + 0.42 * px); ctx.lineTo(w - 10, oy + 0.42 * px); ctx.stroke();

      // nogi, uproszczone: od L5-S1 w dół
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox - 0.04 * px, oy + 0.42 * px); ctx.stroke();

      // tułów pod kątem flex od pionu
      const tx = ox + Math.sin(rad) * 0.52 * px;
      const ty = oy - Math.cos(rad) * 0.52 * px;
      ctx.strokeStyle = C.spine; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();

      // głowa
      ctx.fillStyle = C.spine;
      ctx.beginPath();
      ctx.arc(ox + Math.sin(rad) * 0.62 * px, oy - Math.cos(rad) * 0.62 * px, 0.055 * px, 0, 7); ctx.fill();

      // ramię do ciężaru: od barku poziomo na odległość horiz od L5-S1
      const hx = ox + S.horiz * px, hy = ty + 0.06 * px;
      ctx.strokeStyle = C.line; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty + 0.04 * px); ctx.lineTo(hx, hy); ctx.stroke();

      // ciężar
      const box = Math.max(10, Math.min(30, 8 + S.load * 0.9));
      ctx.fillStyle = C.load;
      ctx.fillRect(hx - box / 2, hy, box, box);
      ctx.font = "11px 'JetBrains Mono', monospace";
      // Na prawo od ciężaru, nie nad nim: nad nim wpadał pod głowę przy
      // średnich kątach zgięcia i znikał.
      ctx.fillText(fix(S.load, 0) + " kg", hx + box / 2 + 6, hy + box / 2 + 4);

      // ramię poziome ciężaru
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.load; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox, oy + 0.1 * px); ctx.lineTo(hx, oy + 0.1 * px); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx, hy + box); ctx.lineTo(hx, oy + 0.1 * px); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.load; ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText(fix(S.horiz, 2) + " m", (ox + hx) / 2 - 16, oy + 0.1 * px - 5);

      // ramię prostowników, 5 cm za osią
      ctx.strokeStyle = C.muscle; ctx.lineWidth = 4;
      const mx = ox - Math.cos(rad) * 0.05 * px, my = oy - Math.sin(rad) * 0.05 * px;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.sin(rad) * 0.34 * px, my - Math.cos(rad) * 0.34 * px);
      ctx.stroke();

      // znacznik L5-S1
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();

      // Podpisy po lewej, w kolumnie poza sylwetką. Rysowane wcześniej wprost
      // przy liniach nachodziły na tułów przy małych kątach zgięcia.
      ctx.font = "11px 'JetBrains Mono', monospace";
      const lx = Math.max(8, ox - 0.46 * px);
      ctx.fillStyle = C.muscle;
      ctx.fillText("d = 5 cm", lx, oy - 0.16 * px);
      ctx.fillStyle = C.line;
      ctx.fillText("L5-S1", lx, oy + 4);
      ctx.fillStyle = C.spine;
      ctx.fillText(fix(S.flex, 0) + "°", lx, oy - 0.30 * px);

      // pasek ucisku
      const bx = 14, by = 18, bw = w - 28, bh = 16;
      const scale = 8000;
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = C[d.zone];
      ctx.fillRect(bx, by, Math.min(bw, bw * d.comp / scale), bh);
      [[AL, "3400"], [MPL, "6400"]].forEach(([v, lab]) => {
        const x = bx + bw * v / scale;
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, by - 3); ctx.lineTo(x, by + bh + 3); ctx.stroke();
        ctx.fillStyle = C.line; ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(lab, x - 10, by - 6);
      });
      ctx.fillStyle = "#e8ecf5"; ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.fillText(fix(d.comp, 0) + " N", bx + 4, by + bh + 18);

      if (Math.abs(w - lastW) > 1) { lastW = w; requestAnimationFrame(paint); }
    }

    subs.push(paint);
    if (window.ResizeObserver) new ResizeObserver(paint).observe(wrap);
    paint();
  }

  // ================================================================= kontrolki
  function controls(host) {
    const box = document.createElement("div");
    box.className = "er-controls";
    host.appendChild(box);

    const metric = (lab, val, cls) =>
      '<div class="er-metric ' + (cls || "") + '"><span>' + lab + "</span><b>" + val + "</b></div>";

    const slider = (id, lab, min, max, step, val, unit) =>
      '<label class="er-slider"><span>' + lab + "</span>" +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
      "<b>" + val + " " + unit + "</b></label>";

    function paint() {
      const d = spine(S);
      const n = niosh(S);
      S.liftComp = Math.round(d.comp);
      const a = apron(S);
      const p = push(S);
      let html = "";

      // ------------------------------------------------------------- dźwignia
      html += '<div class="er-block"><div class="er-block-h">' +
        T("Your spine is a very bad lever", "Twój kręgosłup to bardzo zła dźwignia") + "</div>" +
        '<p class="er-note">' + T(
          "The muscles that stop you folding forwards pull on a lever about five centimetres long. Whatever you hold pulls on a lever of thirty or fifty. Nothing you can do changes that ratio, so the only thing left to change is the distance.",
          "Mięśnie, które nie pozwalają Ci złożyć się do przodu, ciągną na dźwigni długiej około pięciu centymetrów. To, co trzymasz, ciągnie na dźwigni trzydziestu albo pięćdziesięciu. Tego stosunku nie zmienisz niczym, więc jedyne, co zostaje do zmiany, to odległość.") + "</p>" +
        '<div class="er-chips">' + Object.keys(PRESETS).map(k =>
          '<button class="er-chip" data-pre="' + k + '">' + esc(L(PRESETS[k].lab)) + "</button>").join("") + "</div>" +
        slider("erLoad", T("Load in your hands", "Ciężar w rękach"), 0, 30, 1, S.load, "kg") +
        slider("erHoriz", T("Horizontal distance to your lower back", "Odległość pozioma do dolnego odcinka"), 15, 65, 1, Math.round(S.horiz * 100), "cm") +
        slider("erFlex", T("Trunk flexion from vertical", "Zgięcie tułowia od pionu"), 0, 90, 1, S.flex, "°") +
        slider("erMass", T("Your body mass", "Twoja masa ciała"), 45, 120, 1, S.mass, "kg") +
        '<div class="er-formula">' +
          sym("Fext") + " = ( " + sym("flex", "W_tułów") + " · r sinθ + " + sym("horiz", "W_ciężar") +
          " · h ) / " + sym("dext") + "</div>" +
        '<div class="er-metrics">' +
          metric(T("Moment from your own trunk", "Moment od własnego tułowia"), fix(d.mUpper, 1) + " N·m") +
          metric(T("Moment from the load", "Moment od ciężaru"), fix(d.mLoad, 1) + " N·m") +
          metric(sym("Fext", T("Extensor force", "Siła prostowników")), fix(d.fExt, 0) + " N") +
          metric(sym("Fc", T("Compression at L5-S1", "Ucisk na L5-S1")), fix(d.comp, 0) + " N", d.zone) +
          metric(T("Times the weight you are holding", "Razy ciężar, który trzymasz"),
                 S.load > 0 ? fix(d.ratio, 0) + " ×" : "—") +
        "</div>" +
        '<p class="er-note er-note-sm">' + T(
          "The two reference lines on the bar are 3400 N and 6400 N, used as design criteria in the NIOSH lifting literature. They are population criteria and not a verdict on your back: see ",
          "Dwie linie odniesienia na pasku to 3400 N i 6400 N, używane jako kryteria projektowe w literaturze NIOSH o podnoszeniu. To kryteria populacyjne, a nie wyrok o Twoich plecach: zobacz ") +
          sym("AL", T("what those limits are", "czym są te granice")) + ".</p>" +
        "</div>";

      // ---------------------------------------------------------------- NIOSH
      if (S.stage >= 2) {
        html += '<div class="er-block"><div class="er-block-h">' +
          T("The equation everyone quotes", "Równanie, które wszyscy cytują") + "</div>" +
          '<p class="er-note">' + T(
            "The revised NIOSH lifting equation takes one ideal weight and cuts it with six penalties, one for each thing wrong with how the lift is arranged. Pick a task and watch where the weight goes.",
            "Zrewidowane równanie NIOSH bierze jedną idealną masę i ścina ją sześcioma karami, po jednej za każdą rzecz źle ustawioną w podnoszeniu. Wybierz zadanie i patrz, gdzie ta masa się podziewa.") + "</p>" +
          '<div class="er-chips">' + Object.keys(TASKS).map(k =>
            '<button class="er-chip' + (S.task === k ? " on" : "") + '" data-task="' + k + '">' +
            esc(L(TASKS[k].lab)) + "</button>").join("") + "</div>" +
          '<p class="er-why">' + esc(L((TASKS[S.task] || TASKS.box).why)) + "</p>";

        if (!n.applies) {
          // Najważniejszy ekran na tej stronie. Równanie nie daje tu złego
          // wyniku, ono nie daje żadnego, i trzeba to powiedzieć wprost.
          html += '<div class="er-undef"><b>' +
            T("The equation does not apply to this task.", "Równanie nie stosuje się do tego zadania.") + "</b><p>" +
            T("It was written for a lift with both hands, on a stable load of known weight, with a usable grip and a posture you are free to choose. Here it is not a question of the answer being high. There is no answer. For this task:",
              "Napisano je dla podniesienia dwiema rękami, stabilnego ładunku o znanej masie, z użytecznym chwytem i w postawie, którą sam wybierasz. Tutaj nie chodzi o to, że wynik jest wysoki. Wyniku nie ma. W tym zadaniu:") +
            "</p><ul>" + n.violations.map(v => "<li>" + esc(L(v)) + "</li>").join("") + "</ul>" +
            "<p>" + T(
              "Patient handling needs a method built for patients, and equipment: slide sheets, lateral transfer boards, a hoist, and a second person. Reaching for the lifting equation here is a category error, not a conservative choice.",
              "Przemieszczanie pacjenta wymaga metody zrobionej dla pacjentów, i sprzętu: mat poślizgowych, deski do transferu, podnośnika i drugiej osoby. Sięganie tu po równanie podnoszenia jest pomyłką kategorii, a nie wyborem ostrożnym.") +
            "</p></div>";
        }

        html +=
          slider("erNLoad", T("Actual weight of the object", "Rzeczywista masa przedmiotu"), 1, 40, 1, S.nLoad, "kg") +
          slider("erH", T("H, ankles to hands, horizontal", "H, od kostek do rąk, poziomo"), 25, 63, 1, S.H, "cm") +
          slider("erV", T("V, height where the lift starts", "V, wysokość początku podniesienia"), 0, 175, 5, S.V, "cm") +
          slider("erD", T("D, vertical travel", "D, droga w pionie"), 25, 175, 5, S.D, "cm") +
          slider("erA", T("A, trunk twist", "A, skręt tułowia"), 0, 135, 5, S.A, "°") +
          '<div class="er-row"><span class="er-row-lab">' + T("How often", "Jak często") + "</span>" +
            '<select id="erFreq">' + FM_ROWS.map((r, i) =>
              '<option value="' + i + '"' + (S.freq === i ? " selected" : "") + ">" + esc(L(r.lab)) + "</option>").join("") +
            "</select></div>" +
          '<div class="er-row"><span class="er-row-lab">' + T("For how long", "Jak długo") + "</span>" +
            '<select id="erDur">' + DUR_LABS.map((r, i) =>
              '<option value="' + i + '"' + (S.dur === i ? " selected" : "") + ">" + esc(L(r)) + "</option>").join("") +
            "</select></div>" +
          '<div class="er-row"><span class="er-row-lab">' + T("Grip", "Chwyt") + "</span>" +
            '<select id="erCoup">' +
              ['<option value="good"' + (S.coup === "good" ? " selected" : "") + ">" + T("good, real handles", "dobry, prawdziwe uchwyty") + "</option>",
               '<option value="fair"' + (S.coup === "fair" ? " selected" : "") + ">" + T("fair, an edge to hook", "przeciętny, krawędź do zahaczenia") + "</option>",
               '<option value="poor"' + (S.coup === "poor" ? " selected" : "") + ">" + T("poor, nothing to hold", "słaby, nie ma czego złapać") + "</option>"].join("") +
            "</select></div>" +
          '<div class="er-mults">' +
            [["HM", n.m.HM], ["VM", n.m.VM], ["DM", n.m.DM], ["AM", n.m.AM],
             ["FM", n.m.FM], ["CM", n.m.CM]].map(([k, v]) =>
              '<div class="er-mult">' + sym(k) + "<b>" + (v === null ? "—" : fix2(v)) + "</b></div>").join("") +
          "</div>" +
          '<div class="er-formula">' + sym("RWL") + " = " + sym("LC", "23") +
            " · HM · VM · DM · AM · FM · CM</div>" +
          '<div class="er-metrics">' +
            metric(sym("RWL", T("Recommended weight limit", "Zalecana masa graniczna")),
                   n.rwl === null ? T("not defined", "niezdefiniowana") : fix(n.rwl, 1) + " kg",
                   n.rwl === null ? "bad" : "") +
            metric(sym("LI", T("Lifting index", "Wskaźnik podnoszenia")),
                   n.li === null ? "—" : fix(n.li, 2), n.zone) +
          "</div>";

        if (n.noTable) {
          html += '<div class="er-alarm"><b>' +
            T("The table has no value here.", "Tabela nie podaje tu wartości.") + "</b> " +
            T("At this frequency over this duration the published table stops giving a multiplier, which is its way of saying no weight is acceptable for that pattern of work. The answer is to change the work, not to pick a number.",
              "Przy tej częstości i tym czasie pracy opublikowana tabela przestaje podawać mnożnik, co jest jej sposobem powiedzenia, że dla takiego wzorca pracy żadna masa nie jest dopuszczalna. Odpowiedzią jest zmiana pracy, a nie dobranie liczby.") +
            "</div>";
        }
        html += '<p class="er-note er-note-sm">' + T(
          "Four of the six multipliers are closed-form expressions, checked digit for digit against a published table at twelve points by the test suite. The frequency multiplier is a table lookup with no interpolation, in the two-column form we were able to verify, and the coupling multiplier splits on the 75 cm standing and stooping boundary.",
          "Cztery z sześciu mnożników są wyrażeniami w postaci zamkniętej, sprawdzonymi cyfra w cyfrę wobec opublikowanej tabeli w dwunastu punktach przez zestaw testów. Mnożnik częstości to odczyt z tabeli bez interpolacji, w tej dwukolumnowej postaci, którą udało się zweryfikować, a mnożnik chwytu dzieli się na granicy 75 cm między stanie a schylenie.") + "</p>" +
          "</div>";
      }

      // -------------------------------------------------------------- fartuch
      if (S.stage >= 3) {
        html += '<div class="er-block"><div class="er-block-h">' +
          T("The apron: a small force for a very long time", "Fartuch: mała siła przez bardzo długi czas") + "</div>" +
          '<p class="er-note">' + T(
            "A lead apron is the load you carry for hours rather than seconds, so comparing it with a lift by peak force alone gets the answer backwards. Below, the apron and the day's lifts are compared the only way that makes them comparable: force multiplied by the time it acts.",
            "Fartuch ołowiowy to obciążenie noszone godzinami, a nie sekundami, więc porównywanie go z podnoszeniem samą siłą szczytową odwraca odpowiedź. Poniżej fartuch i podniesienia całego dnia porównane są jedynym sposobem, który czyni je porównywalnymi: siłą przemnożoną przez czas jej działania.") + "</p>" +
          '<div class="er-chips">' +
            '<button class="er-chip' + (S.aType === "one" ? " on" : "") + '" data-at="one">' +
              T("One piece, off the shoulders", "Jednoczęściowy, na barkach") + "</button>" +
            '<button class="er-chip' + (S.aType === "two" ? " on" : "") + '" data-at="two">' +
              T("Two piece, belt on the hips", "Dwuczęściowy, pas na biodrach") + "</button>" +
          "</div>" +
          slider("erAMass", T("Apron mass", "Masa fartucha"), 3, 9, 0.5, S.aMass, "kg") +
          slider("erAHours", T("Hours worn today", "Godziny noszenia dziś"), 0.5, 8, 0.5, S.aHours, "h") +
          slider("erLifts", T("Lifts like the one above, today", "Podniesień jak powyżej, dziś"), 0, 60, 1, S.lifts, "") +
          '<div class="er-metrics">' +
            metric(T("Apron weight", "Ciężar fartucha"), fix(a.wTotal, 0) + " N") +
            metric(T("Carried through the spine", "Nieść przez kręgosłup"), fix(a.wSpine, 0) + " N") +
            metric(T("Extra compression while worn", "Dodatkowy ucisk w trakcie noszenia"), fix(a.extra, 0) + " N", "ok") +
            metric(T("One lift, extra compression", "Jedno podniesienie, dodatkowy ucisk"), fix(S.liftComp, 0) + " N", "warn") +
          "</div>" +
          '<div class="er-formula">' + sym("cum") + " = F · t</div>" +
          '<div class="er-metrics">' +
            metric(T("Cumulative load, the apron", "Obciążenie kumulacyjne, fartuch"), fix(a.cumApron / 1000, 0) + " kN·s") +
            metric(T("Cumulative load, all the lifts", "Obciążenie kumulacyjne, wszystkie podniesienia"), fix(a.cumLift / 1000, 0) + " kN·s") +
            metric(T("Apron share of the day", "Udział fartucha w dniu"), fix(a.share * 100, 0) + " %", a.share > 0.5 ? "warn" : "") +
          "</div>" +
          '<p class="er-note er-note-sm">' + T(
            "The apron adds a force a lift would make you laugh at, and still dominates the day, because three seconds and four hours are not the same kind of thing. This is an exposure measure and not a dose of injury: see ",
            "Fartuch dodaje siłę, z której przy podnoszeniu można by się roześmiać, i mimo to dominuje w całym dniu, bo trzy sekundy i cztery godziny nie są tym samym rodzajem rzeczy. To miara ekspozycji, a nie dawka urazu: zobacz ") +
            sym("cum", T("what cumulative load is", "czym jest obciążenie kumulacyjne")) + ".</p>" +
          "</div>";
      }

      // --------------------------------------------------------------- aparat
      if (S.stage >= 4) {
        html += '<div class="er-block"><div class="er-block-h">' +
          T("Pushing the portable unit", "Przepychanie aparatu przyłóżkowego") + "</div>" +
          '<p class="er-note">' + T(
            "A mobile X-ray unit is heavy, but its weight is not what you feel. What you feel is rolling resistance, which depends far more on the floor and the state of the casters than on the mass, plus whatever it takes to get the thing moving at all.",
            "Aparat przyłóżkowy jest ciężki, ale nie jego ciężar czujesz. Czujesz opór toczenia, który zależy znacznie bardziej od podłogi i stanu kół niż od masy, plus to, co trzeba, żeby w ogóle go ruszyć.") + "</p>" +
          '<div class="er-chips">' + FLOORS.map((f, i) =>
            '<button class="er-chip' + (S.floor === i ? " on" : "") + '" data-fl="' + i + '">' +
            esc(L(f.lab)) + "</button>").join("") + "</div>" +
          slider("erPMass", T("Mass of the unit", "Masa aparatu"), 50, 600, 10, S.pMass, "kg") +
          slider("erPSpeed", T("Walking speed you want", "Prędkość, którą chcesz osiągnąć"), 0.2, 1.4, 0.1, S.pSpeed, "m/s") +
          '<div class="er-formula">F = ' + sym("mu") + " · m · g&nbsp;&nbsp;&nbsp;&nbsp;F_start = F + m · a</div>" +
          '<div class="er-metrics">' +
            metric(sym("mu", T("Rolling resistance", "Opór toczenia")), fix(p.mu, 3)) +
            metric(T("Force to keep it rolling", "Siła na utrzymanie ruchu"), fix(p.roll, 0) + " N") +
            metric(T("Force to get it moving", "Siła na ruszenie"), fix(p.start, 0) + " N", p.start > 300 ? "warn" : "ok") +
            metric(T("Start as a share of keeping going", "Ruszenie wobec utrzymania ruchu"),
                   p.roll > 0 ? fix(p.start / p.roll, 1) + " ×" : "—") +
          "</div>" +
          '<p class="er-note er-note-sm">' + T(
            "This is physics, and it stops here. Whether a given hand force is acceptable is a different question, answered by psychophysical tables of maximum acceptable forces rather than by mechanics, and those tables depend on the height of your hands, how far you push and who is pushing. The station computes the force and refuses to grade it.",
            "To jest fizyka i na tym się kończy. Czy dana siła rąk jest dopuszczalna, to inne pytanie, na które odpowiadają psychofizyczne tabele maksymalnych sił akceptowalnych, a nie mechanika, i te tabele zależą od wysokości rąk, długości drogi i tego, kto pcha. Stacja liczy siłę i odmawia wystawienia jej oceny.") + "</p>" +
          "</div>";
      }

      box.innerHTML = html;

      // -------------------------------------------------------------- podpięcia
      const num = (id, fn) => {
        const el = box.querySelector("#" + id);
        if (el) el.oninput = e => { fn(+e.target.value); emit(); };
      };
      num("erLoad", v => S.load = v);
      num("erHoriz", v => S.horiz = v / 100);
      num("erFlex", v => S.flex = v);
      num("erMass", v => S.mass = v);
      num("erNLoad", v => S.nLoad = v);
      num("erH", v => S.H = v);
      num("erV", v => S.V = v);
      num("erD", v => S.D = v);
      num("erA", v => S.A = v);
      num("erAMass", v => S.aMass = v);
      num("erAHours", v => S.aHours = v);
      num("erLifts", v => S.lifts = v);
      num("erPMass", v => S.pMass = v);
      num("erPSpeed", v => S.pSpeed = v);

      const sel = (id, fn) => {
        const el = box.querySelector("#" + id);
        if (el) el.onchange = e => { fn(e.target.value); emit(); };
      };
      sel("erFreq", v => S.freq = +v);
      sel("erDur", v => S.dur = +v);
      sel("erCoup", v => S.coup = v);

      box.querySelectorAll("[data-pre]").forEach(b => b.onclick = () => {
        Object.assign(S, PRESETS[b.dataset.pre].v); emit();
      });
      box.querySelectorAll("[data-task]").forEach(b => b.onclick = () => {
        S.task = b.dataset.task;
        Object.assign(S, TASKS[S.task].preset);
        emit();
      });
      box.querySelectorAll("[data-at]").forEach(b => b.onclick = () => { S.aType = b.dataset.at; emit(); });
      box.querySelectorAll("[data-fl]").forEach(b => b.onclick = () => { S.floor = +b.dataset.fl; emit(); });

      wireSyms(box);
    }

    subs.push(paint);
    paint();
  }

  function stages(host) {
    const bar = document.createElement("div");
    bar.className = "er-stages";
    host.appendChild(bar);
    function paint() {
      bar.innerHTML = STAGES.map(s =>
        '<button class="er-stage' + (S.stage === s.n ? " on" : "") + '" data-s="' + s.n + '">' +
        '<span class="er-stage-n">' + s.n + "</span>" + esc(L(s)) + "</button>").join("");
      bar.querySelectorAll("[data-s]").forEach(b =>
        b.onclick = () => { S.stage = +b.dataset.s; emit(); });
    }
    subs.push(paint);
    paint();
  }

  // ======================================================= stan eksperymentu
  function registerState() {
    const B = window.BioLabState;
    if (!B || !B.codec("ergonomics")) return;
    B.bind("ergonomics", {
      read: () => ({
        stage: S.stage, mass: S.mass, load: S.load, horiz: S.horiz, flex: S.flex,
        task: S.task, nLoad: S.nLoad, H: S.H, V: S.V, D: S.D, A: S.A,
        freq: S.freq, dur: S.dur, coup: S.coup,
        aMass: S.aMass, aType: S.aType, aHours: S.aHours, lifts: S.lifts,
        pMass: S.pMass, floor: S.floor, pSpeed: S.pSpeed,
      }),
      apply: st => { Object.keys(st).forEach(k => { S[k] = st[k]; }); emit(); },
      checkpoint: () => {
        const x = STAGES.find(s => s.n === S.stage) || STAGES[0];
        return { k: x.k, label: L(x) };
      },
    });
  }

  function boot() {
    const host = document.getElementById("erLab");
    if (!host) return;
    stages(host);
    figure(host);
    controls(host);
    registerState();
    emit();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("i18n:changed", () => { emit(); wireSyms(document); });

  window.__ergo = { spine, niosh, apron, push, NIOSH, FM_ROWS, CM_TABLE, TASKS,
                    S, SYM, AL, MPL, UPPER_FRAC, R_TRUNK, D_EXT };
})();
