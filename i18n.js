// ==========================================================================
// i18n.js — lightweight English/Polish switcher for Motion Lab.
//
// No dependencies, no build step. Loaded before every other page script so
// window.i18n.t() is available synchronously for JS-injected strings.
//
// Two dictionaries:
//   DYN    — dynamic strings inserted by JS (data.js labels, phase names,
//            muscle names, blurbs, param categories, legends, statuses),
//            keyed by their English source text. Page scripts call
//            window.i18n.t("English string") at each insertion point.
//   STATIC — prose baked into the HTML, keyed by the data-i18n /
//            data-i18n-html attribute on each element. English is read from
//            the DOM at load (so no-JS still shows English); only Polish is
//            authored here.
//
// Language is remembered in localStorage and applied across all pages.
// On change, an "i18n:changed" event is dispatched so page scripts can
// re-render their dynamic text.
// ==========================================================================

(function () {
  "use strict";

  const STORE_KEY = "motionlab.lang";
  let lang = localStorage.getItem(STORE_KEY) === "pl" ? "pl" : "en";

  // Flag + native label shown on the toggle. Regional-indicator flags fall back
  // to letters (GB / PL) on platforms without emoji flags; the label keeps it clear.
  const LANG_META = {
    en: { flag: "🇬🇧", label: "English" },
    pl: { flag: "🇵🇱", label: "Polski" },
  };
  // Accessible label for the button, written in the language it switches TO.
  const SWITCH_LABEL = { en: "Switch to English", pl: "Przełącz na polski" };

  // ---- Dynamic strings: English source -> Polish -----------------------
  const DYN = {
    // Movement labels (data.js `label`)
    "Walking": "Chód",
    "Running": "Bieg",
    "Countermovement jump": "Skok z zamachem",
    "Landing": "Lądowanie",
    "Squatting": "Przysiad",

    // Muscle names (data.js `muscles[].name` — display only; keys unchanged)
    "Gluteus Maximus": "Mięsień pośladkowy wielki",
    "Quadriceps": "Mięsień czworogłowy uda",
    "Hamstrings": "Mięśnie kulszowo-goleniowe",
    "Gastroc / Soleus": "Brzuchaty / płaszczkowaty",
    "Tibialis Anterior": "Piszczelowy przedni",
    "Erector Spinae": "Prostownik grzbietu",

    // Phase labels — walking
    "Loading response": "Odpowiedź na obciążenie",
    "Mid stance": "Środkowa faza podporu",
    "Terminal stance": "Końcowa faza podporu",
    "Pre-swing": "Faza przedwymachu",
    "Initial swing": "Wczesny wymach",
    "Mid swing": "Środkowy wymach",
    "Terminal swing": "Końcowy wymach",
    // Phase labels — gait3d variants (hyphenated / toe-off)
    "Mid-stance": "Środkowa faza podporu",
    "Pre-swing (toe-off)": "Faza przedwymachu (oderwanie palców)",
    "Mid-swing": "Środkowy wymach",
    // Phase labels — running
    "Initial contact": "Kontakt początkowy",
    "Stance / propulsion": "Podpór / odbicie",
    "Early swing (recovery)": "Wczesny wymach (powrót)",
    "Peak knee flexion": "Szczytowe zgięcie kolana",
    "Leg swings forward": "Wymach nogi w przód",
    "Preparing to land": "Przygotowanie do lądowania",
    // Phase labels — jump
    "Quiet stance": "Spokojna postawa",
    "Unweighting": "Odciążenie",
    "Braking (eccentric)": "Hamowanie (ekscentryczne)",
    "Propulsion (concentric)": "Napęd (koncentryczny)",
    "Flight": "Faza lotu",
    "Landing impact": "Uderzenie lądowania",
    "Countermovement (braking)": "Zamach (hamowanie)",
    "Propulsion (drive up)": "Napęd (wybicie)",
    "Landing & absorption": "Lądowanie i amortyzacja",
    // Phase labels — landing
    "Falling / descent": "Opadanie / zniżanie",
    "Impact absorption": "Amortyzacja uderzenia",
    "Stabilization": "Stabilizacja",
    "Return to standing": "Powrót do pozycji stojącej",
    // Phase labels — squat
    "Descent (eccentric)": "Zejście (faza ekscentryczna)",
    "Bottom position": "Pozycja dolna",
    "Ascent (concentric)": "Wznoszenie (faza koncentryczna)",

    // Parameter slider labels (data.js `param.label`)
    "Walking speed": "Prędkość chodu",
    "Running speed": "Prędkość biegu",
    "Jump effort": "Intensywność skoku",
    "Landing technique — soft ↔ stiff": "Technika lądowania — miękka ↔ sztywna",
    "Squat depth": "Głębokość przysiadu",

    // Parameter display categories (data.js `param.display`)
    "Small hop": "Mały podskok",
    "Moderate jump": "Umiarkowany skok",
    "Maximal effort": "Maksymalny wysiłek",
    "Soft, absorbing": "Miękkie, amortyzujące",
    "Moderate": "Umiarkowane",
    "Stiff, straight-legged": "Sztywne, na prostych nogach",
    "Quarter": "Ćwierćprzysiad",
    "Parallel": "Równoległy",
    "Deep": "Głęboki",

    // Movement blurbs (data.js `blurb`)
    "Walking produces a signature double-hump vertical ground reaction force: one peak at weight acceptance (loading response), a dip in mid-stance as the body vaults over a relatively straight leg, and a second peak at push-off. The knee shows a subtle \"double bump\" of its own — a small flexion wave at loading response for shock absorption, then a much larger flexion in swing to clear the foot. Slide the speed control and watch both peaks grow, and swing get quicker, as walking speed increases.":
      "Chód wytwarza charakterystyczną, dwugarbną pionową siłę reakcji podłoża: pierwszy szczyt podczas przyjmowania obciążenia (odpowiedź na obciążenie), zagłębienie w środkowej fazie podporu, gdy ciało przetacza się nad względnie wyprostowaną nogą, oraz drugi szczyt przy odbiciu. Kolano wykazuje własny subtelny „podwójny garb” — niewielką falę zgięcia przy odpowiedzi na obciążenie, amortyzującą wstrząs, a następnie znacznie większe zgięcie w fazie wymachu, by przenieść stopę nad podłożem. Przesuń suwak prędkości i obserwuj, jak oba szczyty rosną, a wymach przyspiesza wraz ze wzrostem prędkości chodu.",
    "Running trades walking's double-hump force for a single, much larger peak — typically 2-3x body weight, versus ~1.15x for walking — because there's no double-support phase to share the load. Notice the knee folds up far more (past 100° of flexion) than in walking: a shorter, lighter swinging leg is a more efficient pendulum at speed. Slide from 2.5 to 4.5 m/s and watch the impact peak grow and the knee fold up further — blended from real motion capture at three measured speeds.":
      "Bieg zamienia dwugarbną siłę chodu na pojedynczy, znacznie większy szczyt — zwykle 2–3-krotność masy ciała, w porównaniu z ~1,15 przy chodzie — ponieważ nie ma fazy podwójnego podporu, która rozłożyłaby obciążenie. Zwróć uwagę, że kolano zgina się znacznie mocniej (powyżej 100° zgięcia) niż w chodzie: krótsza, lżejsza noga wymachowa to sprawniejsze wahadło przy dużej prędkości. Przesuń suwak od 2,5 do 4,5 m/s i obserwuj, jak rośnie szczyt uderzenia, a kolano zgina się coraz mocniej — z interpolacji rzeczywistych danych z trzech zmierzonych prędkości.",
    "One complete countermovement jump — quiet stance, a dip to pre-stretch the leg extensors (the countermovement), the braking and concentric drive, take-off and flight, then the landing. The dip lets the extensors build force before the push-off, so braking force can rival the propulsive peak; the hip, knee and ankle extend almost together (\"triple extension\") right at take-off, and the landing spike at the end is often the single highest force of the whole movement. Increase jump effort and watch the dip deepen and every peak grow.":
      "Jeden kompletny skok z zamachem — spokojna postawa, zejście wstępnie rozciągające prostowniki nogi (zamach), faza hamowania i napędu koncentrycznego, wybicie i lot, a następnie lądowanie. Zejście pozwala prostownikom zbudować siłę przed wypchnięciem, więc siła hamowania może dorównać szczytowi napędowemu; biodro, kolano i staw skokowy prostują się niemal jednocześnie („potrójne wyprostowanie”) tuż przy wybiciu, a skok siły przy lądowaniu na końcu to często najwyższa siła w całym ruchu. Zwiększ intensywność skoku i obserwuj, jak zagłębienie się pogłębia, a każdy szczyt rośnie.",
    "Landing generates the sharpest force spike of any movement here — a soft, knee-bent landing can keep the impact peak to around 2-3x body weight, spread over more time. Push the technique slider toward \"stiff\" and see why straight-legged landings are a well-known risk factor in ACL-injury research: the same drop now delivers a much higher, faster spike through much less joint flexion to absorb it.":
      "Lądowanie generuje najostrzejszy skok siły spośród wszystkich ruchów tutaj — miękkie lądowanie ze zgiętym kolanem może utrzymać szczyt uderzenia w okolicy 2–3-krotności masy ciała, rozłożony w czasie. Przesuń suwak techniki w stronę „sztywnej” i zobacz, dlaczego lądowania na prostych nogach są dobrze znanym czynnikiem ryzyka w badaniach nad urazami ACL: ten sam upadek dostarcza teraz znacznie wyższy, szybszy skok siły przy znacznie mniejszym zgięciu stawów zdolnym go zamortyzować.",
    "The squat is the most \"quasi-static\" movement here — ground reaction force barely leaves the neighborhood of body weight, because the whole body's center of mass moves slowly and under control. What changes dramatically with depth is joint range and muscle demand: quadriceps and gluteal activation both climb steadily as the knee and hip flex further, peaking near the transition from descent to drive out of the bottom.":
      "Przysiad to najbardziej „quasi-statyczny” ruch tutaj — siła reakcji podłoża ledwie oddala się od masy ciała, ponieważ środek masy całego ciała porusza się powoli i pod kontrolą. To, co zmienia się dramatycznie wraz z głębokością, to zakres ruchu w stawach i wymagania mięśniowe: aktywacja mięśnia czworogłowego i pośladkowego stale rośnie w miarę pogłębiania zgięcia kolana i biodra, osiągając szczyt w okolicy przejścia od zejścia do wypchnięcia z dołu.",

    // Legends (lab.js / body3d.js)
    "Particle spray = ground reaction force (teal → gold → white as it climbs)":
      "Rozprysk cząstek = siła reakcji podłoża (turkus → złoto → biel wraz ze wzrostem)",
    "Muscle glow = activation (quiet → working hard)":
      "Poświata mięśnia = aktywacja (spoczynek → ciężka praca)",
    "Arrow = ground reaction force": "Strzałka = siła reakcji podłoża",

    // Provenance badges (app.js)
    "Measured": "Zmierzone",
    "Modelled": "Modelowane",
    "Literature reconstruction": "Rekonstrukcja z literatury",

    // Compare-chart series suffix (app.js)
    " knee": " kolano",

    // Status / engine messages
    "Rapier2D (Rust → WASM) physics: live": "Fizyka Rapier2D (Rust → WASM): aktywna",
    "Physics CDN unavailable — showing manual projectile motion instead":
      "CDN fizyki niedostępny — pokazuję ręczny ruch pocisku",
    "three.js (WebGL): live": "three.js (WebGL): aktywne",
    "three.js (WebGL): live · real mocap data": "three.js (WebGL): aktywne · prawdziwe dane mocap",
    "model load failed": "nie udało się wczytać modelu",
    "live": "aktywne",
    "error": "błąd",
    "unavailable": "niedostępne",
  };

  // ---- Static prose: data-i18n key -> Polish ---------------------------
  const STATIC = {
    // Shared: nav + footer + common controls
    "nav.explore": "Odkrywaj",
    "nav.explorer": "Eksplorator",
    "nav.how": "Jak to działa",
    "nav.compare": "Porównaj",
    "nav.sources": "Źródła",
    "nav.forge": "Kuźnia ⚡",
    "nav.anatomy": "Anatomia 🦴",
    "nav.gait": "Prawdziwy chód 🚶",
    "footer.tagline": "Motion Lab — edukacyjny eksplorator biomechaniki. Stworzony dla popularyzacji nauki o ruchu, nie do diagnostyki klinicznej.",
    "ctrl.playbackSpeed": "Prędkość odtwarzania",
    "hint.orbit": "przeciągnij, by obracać · przewiń, by przybliżyć",

    // index.html
    "hero.badge": "Interaktywna biomechanika",
    "hero.title": "Zobacz siły<br>\n      <span class=\"hero-title-accent\">stojące za każdym ruchem</span>",
    "hero.desc": "Chód, bieg, skok, lądowanie, przysiad — każdy krok obciąża stawy i uruchamia mięśnie w precyzyjnej, przewidywalnej sekwencji. Przewijaj cykl, zmieniaj parametry i obserwuj, jak siła reakcji podłoża, kąty stawowe i aktywność mięśni reagują w czasie rzeczywistym.",
    "hero.cta.start": "Zacznij odkrywać",
    "hero.cta.how": "Jak to działa\n        <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M6 9l6 6 6-6\"/></svg>",
    "hero.scroll": "Przewiń",
    "how.label": "Idea",
    "how.title": "Jeden cykl, trzy sygnały",
    "how.card1.h": "Siła reakcji podłoża",
    "how.card1.p": "Siła, jaką podłoże oddziałuje na ciało, wyrażona w wielokrotnościach masy ciała (BW). Z jaką siłą naciskasz, z taką podłoże odpowiada.",
    "how.card2.h": "Kąty stawowe",
    "how.card2.p": "Jak bardzo biodro, kolano i staw skokowy zginają się i prostują w cyklu ruchu — kinematyczny podpis każdego zadania.",
    "how.card3.h": "Aktywacja mięśni",
    "how.card3.p": "Które grupy mięśni włączają się i wyłączają oraz jak mocno, aby kontrolować i napędzać ruch — na podstawie klasycznych badań EMG.",
    "how.note": "Krzywe to poglądowe rekonstrukcje oparte na ugruntowanej literaturze biomechanicznej (zobacz <a href=\"#sources\">Źródła</a>), a nie surowe dane pacjentów — mają uczyć wzorca, nie diagnozować konkretnej osoby.",
    "explorer.label": "Eksplorator",
    "explorer.title": "Wybierz ruch",
    "tab.walk": "Chód",
    "tab.run": "Bieg",
    "tab.jump": "Skok z zamachem",
    "tab.land": "Lądowanie",
    "tab.squat": "Przysiad",
    "chart.grf.h": "Pionowa siła reakcji podłoża",
    "chart.angle.h": "Kąty stawowe",
    "chart.muscle.h": "Aktywacja mięśni",
    "compare.label": "Porównaj",
    "compare.title": "Zestaw dwa ruchy obok siebie",
    "compare.lead": "Nałóż na siebie dowolne dwie kombinacje ruch/parametr, aby zobaczyć np. jak bieg obciąża stawy inaczej niż chód, albo jak głęboki przysiad wypada na tle płytkiego.",
    "compare.traceA": "Wykres A",
    "compare.traceB": "Wykres B",
    "compare.angle.h": "Kąt kolana",
    "sources.label": "Oparte na badaniach",
    "sources.title": "Źródła",
    "sources.lead": "Większość kształtów krzywych, wartości i przebiegów czasowych to poglądowe rekonstrukcje oparte na tych szeroko cytowanych źródłach biomechanicznych — nie zastępują indywidualnej oceny. Jedynym wyjątkiem jest <em>aktywacja mięśni podczas biegu</em>, obliczona bezpośrednio z rzeczywistego EMG (zobacz Santuz&nbsp;i&nbsp;wsp. poniżej).",

    // lab.html (The Forge)
    "lab.label": "Te same dane, inna fizyka",
    "lab.title": "Kuźnia",
    "lab.sub": "Tu nie ma osi wykresów. Siła reakcji podłoża zostaje wyrzucona jako prawdziwy rozprysk cząstek — symulowany przez <b>Rapier2D</b>, silnik fizyki ciał sztywnych napisany w Rust i uruchamiany w przeglądarce jako WebAssembly — więc większa siła <em>dosłownie</em> odrzuca materię dalej pod działaniem prawdziwej grawitacji i oporu. Aktywacja mięśni unosi się znad każdego brzuśca mięśnia jak żarzące się iskry, jaśniejsze i gęstsze im ciężej pracuje dany mięsień. Te same oparte na literaturze krzywe co na stronie <a href=\"index.html#explorer\">Eksplorator</a>, przedstawione jako siły działające na obiekty, a nie linie na wykresie.",
    "lab.status": "ładowanie silnika fizyki…",
    "lab.note": "Wysokość i gęstość rozprysku cząstek to bezpośrednie, dosłowne odwzorowanie chwilowej krzywej siły reakcji podłoża — nic tu nie jest animowane ręcznie. Zobacz <a href=\"index.html#sources\">Źródła</a>, na czym oparte są krzywe.",

    // body3d.html (The Anatomy)
    "anat.label": "Te same dane, w trzech wymiarach",
    "anat.title": "Anatomia",
    "anat.sub": "Trójwymiarowa, ruchoma postać, której biodra, kolana i stawy skokowe poruszają się po <b>tych samych, opartych na literaturze krzywych kątów stawowych</b> co na każdej innej stronie — a mięśnie żarzą się od chłodnych do gorących barw wraz z ich <b>rzeczywistym poziomem aktywacji</b>. Obracaj widok, przewijaj cykl i obserwuj, które mięśnie wykonują pracę w trakcie ruchu. Zbudowane w <b>three.js</b> (WebGL), działa bezpośrednio w przeglądarce.",
    "anat.note": "Ta wersja używa stylizowanych, proceduralnych brył kości i mięśni jako zastępnika. Potok renderowania i danych zaprojektowano tak, aby prawdziwą siatkę anatomiczną (np. otwarty model\n      <a href=\"https://simtk.org/projects/z-anatomy\" target=\"_blank\" rel=\"noopener\">Z-Anatomy</a> /\n      <a href=\"https://github.com/Kevin-Mattheus-Moerman/BodyParts3D\" target=\"_blank\" rel=\"noopener\">BodyParts3D</a>\n      ) można było później podłączyć bez zmiany przepływu danych.",
    "anat.webgl": "uruchamianie WebGL…",
    "mm.title": "Mapa ciepła EMG",
    "mm.status": "ładowanie…",
    "mm.front": "Przód",
    "mm.back": "Tył",
    "mm.note": "Te same sześć krzywych aktywacji, naniesione na dwuwymiarową mapę anatomiczną (przód + tył) jako mapa ciepła w stylu EMG — od neutralnego → żółty → pomarańczowy → czerwony wraz ze wzrostem aktywacji. W przeciwieństwie do figury 3D nie porusza się wraz ze stawami; to ciało, które się <em>rozświetla</em>.",
    "dx.h2": "Co widzisz",
    "dx.c1.h": "<span class=\"dx-pct\">%</span> to jeden krok, nie sekundy",
    "dx.c1.p": "Każda krzywa biegnie od lewej do prawej przez <b>jeden pełny cykl chodu</b> — od kontaktu jednej stopy z podłożem do kolejnego kontaktu <em>tej samej</em> stopy — przeskalowany do 0–100&nbsp;%, aby różne osoby i prędkości się pokrywały. Wartość % u góry pokazuje, w którym miejscu cyklu właśnie jesteś.",
    "dx.stance": "Podpór ~0–39% <span>stopa na podłożu</span>",
    "dx.swing": "Wymach ~39–100% <span>stopa w powietrzu</span>",
    "dx.c1.small": "W biegu stopa dotyka podłoża tylko ~39% kroku (reszta to wymach, w tym krótka faza lotu) — ten podział zmierzono z tego właśnie zbioru danych i względem niego zsynchronizowano wyładowania mięśni.",
    "dx.c2.h": "Kolor = jak ciężko pracuje mięsień <em>jak na siebie</em>",
    "dx.c2.p": "Sygnał każdego mięśnia jest znormalizowany do <b>jego własnego szczytu w cyklu</b>: <b>0</b> = spoczynek, <b>1,0</b> = najcięższy moment tego mięśnia. Kolor mówi więc, <em>kiedy</em> mięsień się uaktywnia, a nie czy łydka jest „silniejsza” niż czworogłowy — amplitudy z powierzchniowego EMG nie są porównywalne między mięśniami, więc tego nie sugerujemy.",
    "dx.ramp.quiet": "spoczynek",
    "dx.ramp.peak": "szczyt",
    "dx.ramp.3d": "bryły 3D (chłodne→gorące)",
    "dx.ramp.2d": "mapa 2D (neutralny→czerwony)",
    "dx.c3.h": "Co zmierzone, a co modelowane",
    "dx.th.signal": "Sygnał",
    "dx.th.movement": "Ruch",
    "dx.th.source": "Skąd pochodzi",
    "dx.r1.a": "Aktywacja mięśni",
    "dx.r1.b": "Chód",
    "dx.r1.c": "<b>Rzeczywiste EMG.</b> Średnia z <b>13 693 cykli chodu</b> od <b>140 osób dorosłych</b>\n                (<a href=\"https://doi.org/10.5281/zenodo.5171823\" target=\"_blank\" rel=\"noopener\">Santuz i&nbsp;wsp. 2021</a>, dane otwarte)",
    "dx.r2.a": "Aktywacja mięśni",
    "dx.r2.b": "Bieg",
    "dx.r2.c": "<b>Rzeczywiste EMG.</b> Średnia z <b>11 388 cykli chodu</b> od <b>135 osób dorosłych</b>\n                (<a href=\"https://doi.org/10.5281/zenodo.1254380\" target=\"_blank\" rel=\"noopener\">Santuz i&nbsp;wsp. 2018</a>, dane otwarte)",
    "dx.r3.a": "Aktywacja mięśni",
    "dx.r3.b": "Skok z zamachem, przysiad",
    "dx.r3.c": "Poglądowe rekonstrukcje z literatury biomechanicznej",
    "dx.r4.a": "Kąty stawowe i siła podłoża",
    "dx.r4.b": "Chód",
    "dx.r4.c": "<b>Zmierzone.</b> Średnia z <b>42 osób dorosłych</b>\n                (<a href=\"https://doi.org/10.7717/peerj.4640\" target=\"_blank\" rel=\"noopener\">Fukuchi i&nbsp;wsp. 2018</a>, dane otwarte)",
    "dx.r5.a": "Kąty stawowe i siła podłoża",
    "dx.r5.b": "Bieg",
    "dx.r5.c": "<b>Zmierzone.</b> Średnia z <b>39 osób dorosłych</b>\n                (<a href=\"https://doi.org/10.7717/peerj.3298\" target=\"_blank\" rel=\"noopener\">Fukuchi i&nbsp;wsp. 2017</a>, dane otwarte)",
    "dx.r6.a": "Kąty stawowe i siła podłoża",
    "dx.r6.b": "Skok z zamachem, przysiad",
    "dx.r6.c": "Rekonstrukcje oparte na literaturze (Perry, Winter, Novacheck, …)",
    "dx.pipeline": "<b>Jak przełożono biegowe i chodowe EMG na te krzywe:</b> surowe sygnały → filtr górnoprzepustowy 50&nbsp;Hz →\n          prostowanie pełnookresowe → obwiednia dolnoprzepustowa 20&nbsp;Hz → normalizacja każdego mięśnia do jego własnego szczytu →\n          normalizacja czasowa każdego cyklu do 100 punktów podporu + 100 punktów wymachu → uśrednienie po wszystkich cyklach\n          (13 693 chód; 11 388 bieg). To standardowy potok z publikacji. 13 zarejestrowanych kanałów połączono w pięć pokazanych tutaj\n          (np. prosty uda + oba obszerne → „Mięsień czworogłowy uda”).",
    "dx.foot": "Oba widoki odczytują w każdej chwili <em>te same</em> liczby. Mapa 2D to otwarta biblioteka\n      <a href=\"https://github.com/vulovix/body-muscles\" target=\"_blank\" rel=\"noopener\">body-muscles</a>\n      (Apache&nbsp;2.0); figura 3D to <a href=\"https://threejs.org\" target=\"_blank\" rel=\"noopener\">three.js</a>.\n      Wizualizacja edukacyjna — nie ocena kliniczna ani indywidualna.",

    // gait3d.html (Real Gait)
    "gait.label": "Prawdziwe ciało na prawdziwych danych",
    "gait.title": "Prawdziwy chód",
    "gait.sub": "Poprawnie oszkieletowana, realistycznie zbudowana postać ludzka — chodząca na <b>rzeczywistych kątach stawowych z motion-capture</b>, uśrednionych z otwartego zbioru danych o chodzie. Żadnej gotowej animacji: każdy obrót biodra, kolana i stawu skokowego to zmierzone dane, przeniesione na szkielet w czasie rzeczywistym za pomocą <b>three.js</b>.",
    "gait.status": "ładowanie modelu…",
    "gx.h2": "Co widzisz",
    "gx.c1.h": "Ruch jest <em>zmierzony</em>, nie animowany ręcznie",
    "gx.c1.p": "Obroty biodra, kolana i stawu skokowego pochodzą z otwartego zbioru danych o chodzie <b>Fukuchi et&nbsp;al. 2018</b> — rejestracji ruchu 3D <b>42 zdrowych osób dorosłych</b> chodzących po podłożu w komfortowym tempie. Wzięliśmy uśrednione kąty stawowe w płaszczyźnie strzałkowej (uśrednione po wszystkich osobach i obu nogach, <b>84 krzywe chodu</b>) i przenieśliśmy je wprost na szkielet. Nic tu nie jest gotową animacją z gry.",
    "gx.stance": "Podpór ~0–62% <span>stopa na podłożu</span>",
    "gx.swing": "Wymach ~62–100% <span>stopa w powietrzu</span>",
    "gx.c1.small": "Oś czasu to jeden <b>cykl chodu</b> — od kontaktu jednej stopy z podłożem do kolejnego kontaktu tej samej stopy — przeskalowany do 0–100%. W chodzie stopa jest na podłożu ~62% cyklu (nie ma fazy lotu, w przeciwieństwie do biegu). Druga noga porusza się dokładnie pół cyklu za nią.",
    "gx.c2.h": "Jak ciało chodzi z samych kątów",
    "gx.c2.p": "Kąty stawowe mówią, jak zginają się kończyny, ale nie gdzie ciało <em>znajduje się</em> w przestrzeni — tego ruchu miednicy nie ma w danych kątowych. Dlatego chód odtworzono z użyciem <b>blokowania stopy</b>: stopa w kontakcie zostaje przypięta do podłoża, a ciało jest nad nią przenoszone, co odtwarza rzeczywiste przemieszczanie po podłożu (≈0,8&nbsp;m na krok). Kamera podąża za postacią, więc wydaje się ona w miejscu, podczas gdy podłoże przesuwa się obok, a stopy pozostają realnie oparte.",
    "gx.c2.small": "Samo ciało to typowy oszkieletowany manekin (three.js „Xbot”). <b>Dane</b>, które nim sterują, są prawdziwe; siatka to tylko płótno. Tylko płaszczyzna strzałkowa — zmierzone obroty poza płaszczyzną są niewielkie i pominięte dla przejrzystości.",
    "gx.foot": "Dane: Fukuchi CA, Fukuchi RK, Duarte M (2018), <em>A public data set of overground and treadmill\n      walking kinematics and kinetics of healthy individuals</em>,\n      <a href=\"https://peerj.com/articles/4640/\" target=\"_blank\" rel=\"noopener\">PeerJ 6:e4640</a> /\n      <a href=\"https://doi.org/10.6084/m9.figshare.5722711\" target=\"_blank\" rel=\"noopener\">figshare 5722711</a>.\n      Renderowanie: <a href=\"https://threejs.org\" target=\"_blank\" rel=\"noopener\">three.js</a>. Wizualizacja\n      edukacyjna — nie ocena kliniczna ani indywidualna.",
  };

  // English defaults captured from the DOM on first apply, keyed the same way.
  const enCache = Object.create(null);

  function translate(str) {
    if (lang === "en") return str;
    return Object.prototype.hasOwnProperty.call(DYN, str) ? DYN[str] : str;
  }

  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (!(key in enCache)) enCache[key] = el.textContent;
      el.textContent = lang === "pl" && STATIC[key] != null ? STATIC[key] : enCache[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-html");
      if (!(key in enCache)) enCache[key] = el.innerHTML;
      el.innerHTML = lang === "pl" && STATIC[key] != null ? STATIC[key] : enCache[key];
    });
    document.documentElement.lang = lang;
  }

  function updateToggleUI() {
    const btn = document.querySelector(".lang-toggle");
    if (!btn) return;
    const target = lang === "pl" ? "en" : "pl"; // the language the click switches to
    const meta = LANG_META[target];
    btn.innerHTML =
      '<span class="lang-flag">' + meta.flag + '</span>' +
      '<span class="lang-code">' + meta.label + '</span>';
    btn.setAttribute("aria-label", SWITCH_LABEL[target]);
    btn.setAttribute("title", SWITCH_LABEL[target]);
  }

  function setLang(next) {
    next = next === "pl" ? "pl" : "en";
    if (next === lang) return;
    lang = next;
    localStorage.setItem(STORE_KEY, lang);
    applyStatic();
    updateToggleUI();
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: lang } }));
  }

  function injectStyle() {
    if (document.getElementById("i18n-style")) return;
    const css =
      ".lang-toggle{display:inline-flex;align-items:center;gap:7px;margin-left:16px;" +
      "padding:6px 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;" +
      "background:rgba(255,255,255,.04);color:inherit;cursor:pointer;font:inherit;" +
      "font-size:.72rem;font-weight:600;letter-spacing:.04em;line-height:1;" +
      "transition:background .15s,border-color .15s;}" +
      ".lang-toggle:hover{background:rgba(94,234,212,.12);border-color:rgba(94,234,212,.4);}" +
      ".lang-flag{font-size:1rem;line-height:1;}" +
      ".lang-code{opacity:.9;}";
    const style = document.createElement("style");
    style.id = "i18n-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildToggle() {
    const navInner = document.querySelector(".nav-inner");
    if (!navInner || navInner.querySelector(".lang-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle";
    btn.addEventListener("click", function () {
      setLang(lang === "pl" ? "en" : "pl");
    });
    navInner.appendChild(btn);
    updateToggleUI();
  }

  // Expose t() synchronously so page scripts running at end-of-body can use it.
  window.i18n = {
    t: translate,
    setLang: setLang,
    get lang() {
      return lang;
    },
  };

  function boot() {
    injectStyle();
    buildToggle();
    applyStatic();
    updateToggleUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
