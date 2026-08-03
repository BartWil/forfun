// ==========================================================================
// i18n.js: lightweight English/Polish switcher for BioLab Play.
//
// No dependencies, no build step. Loaded before every other page script so
// window.i18n.t() is available synchronously for JS-injected strings.
//
// Two dictionaries:
//   DYN   : dynamic strings inserted by JS (data.js labels, phase names,
//            muscle names, blurbs, param categories, legends, statuses),
//            keyed by their English source text. Page scripts call
//            window.i18n.t("English string") at each insertion point.
//   STATIC: prose baked into the HTML, keyed by the data-i18n /
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

    // Muscle names (data.js `muscles[].name`: display only; keys unchanged)
    "Gluteus Maximus": "Mięsień pośladkowy wielki",
    "Quadriceps": "Mięsień czworogłowy uda",
    "Hamstrings": "Mięśnie kulszowo-goleniowe",
    "Gastroc / Soleus": "Brzuchaty / płaszczkowaty",
    "Tibialis Anterior": "Piszczelowy przedni",
    "Erector Spinae": "Prostownik grzbietu",

    // Phase labels: walking
    "Initial contact": "Kontakt początkowy",
    "Loading response": "Odpowiedź na obciążenie",
    "Absorption": "Faza amortyzacji",
    "Propulsion": "Faza napędu",
    "Mid stance": "Środkowa faza podporu",
    "Terminal stance": "Końcowa faza podporu",
    "Pre-swing": "Faza przedwymachu",
    "Initial swing": "Wczesny wymach",
    "Mid swing": "Środkowy wymach",
    "Terminal swing": "Końcowy wymach",
    // Phase labels: gait3d variants (hyphenated / toe-off)
    "Mid-stance": "Środkowa faza podporu",
    "Pre-swing (toe-off)": "Faza przedwymachu (oderwanie palców)",
    "Mid-swing": "Środkowy wymach",
    // Phase labels: running
    "Initial contact": "Kontakt początkowy",
    "Stance / propulsion": "Podpór / odbicie",
    "Early swing (recovery)": "Wczesny wymach (powrót)",
    "Peak knee flexion": "Szczytowe zgięcie kolana",
    "Leg swings forward": "Wymach nogi w przód",
    "Preparing to land": "Przygotowanie do lądowania",
    // Phase labels: jump
    "Quiet stance": "Spokojna postawa",
    "Unweighting": "Odciążenie",
    "Braking (eccentric)": "Hamowanie (ekscentryczne)",
    "Propulsion (concentric)": "Napęd (koncentryczny)",
    "Flight": "Faza lotu",
    "Landing impact": "Uderzenie lądowania",
    "Countermovement (braking)": "Zamach (hamowanie)",
    "Propulsion (drive up)": "Napęd (wybicie)",
    "Landing & absorption": "Lądowanie i amortyzacja",
    // Phase labels: landing
    "Falling / descent": "Opadanie / zniżanie",
    "Impact absorption": "Amortyzacja uderzenia",
    "Stabilization": "Stabilizacja",
    "Return to standing": "Powrót do pozycji stojącej",
    // Phase labels: squat
    "Descent (eccentric)": "Zejście (faza ekscentryczna)",
    "Bottom position": "Pozycja dolna",
    "Ascent (concentric)": "Wznoszenie (faza koncentryczna)",

    // Parameter slider labels (data.js `param.label`)
    "Walking speed": "Prędkość chodu",
    "Running speed": "Prędkość biegu",
    "Jump effort": "Intensywność skoku",
    "Landing technique: soft ↔ stiff": "Technika lądowania: miękka ↔ sztywna",
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
    "Walking produces a signature double-hump vertical ground reaction force: one peak at weight acceptance (loading response), a dip in mid-stance as the body vaults over a relatively straight leg, and a second peak at push-off. The knee shows a subtle \"double bump\" of its own: a small flexion wave at loading response for shock absorption, then a much larger flexion in swing to clear the foot. Slide the speed control and watch both peaks grow, and swing get quicker, as walking speed increases.":
      "Chód wytwarza charakterystyczną, dwugarbną pionową siłę reakcji podłoża: pierwszy szczyt podczas przyjmowania obciążenia (odpowiedź na obciążenie), zagłębienie w środkowej fazie podporu, gdy ciało przetacza się nad względnie wyprostowaną nogą, oraz drugi szczyt przy odbiciu. Kolano wykazuje własny subtelny „podwójny garb”: niewielką falę zgięcia przy odpowiedzi na obciążenie, amortyzującą wstrząs, a następnie znacznie większe zgięcie w fazie wymachu, by przenieść stopę nad podłożem. Przesuń suwak prędkości i obserwuj, jak oba szczyty rosną, a wymach przyspiesza wraz ze wzrostem prędkości chodu.",
    "Running trades walking's double-hump force for a single, much larger peak, around 2.5× body weight here against ~1.1× for walking. Timing explains it, and effort has little to do with it: across a whole stride the ground has to supply one body weight of support on average, but in running the foot is only down for about a third of the stride instead of nearly two thirds. A shorter contact has to push proportionally harder. Add the flight phase, where the body falls further and arrives moving faster, and the peak climbs further still. Notice too that the knee folds up past 100° of flexion, far more than in walking: tucking the leg pulls its mass closer to the hip, making it a quicker pendulum to swing through at speed. Slide from 2.5 to 4.5 m/s and watch both effects grow. The curves are blended from real motion capture at three measured speeds.":
      "Bieg zamienia dwugarbną siłę chodu na pojedynczy, znacznie większy szczyt, tutaj około 2,5-krotności masy ciała wobec ~1,1 przy chodzie. Decyduje o tym czas kontaktu, a nie wysiłek: w ciągu całego cyklu podłoże musi dostarczyć średnio jedną masę ciała podparcia, ale w biegu stopa jest na podłożu tylko przez mniej więcej jedną trzecią cyklu, zamiast prawie dwie trzecie. Krótszy kontakt musi więc naciskać proporcjonalnie mocniej. Dodaj fazę lotu, w której ciało spada z większej wysokości i ląduje z większą prędkością, a szczyt rośnie jeszcze bardziej. Zwróć też uwagę, że kolano zgina się powyżej 100°, znacznie mocniej niż w chodzie: podkurczenie nogi przybliża jej masę do biodra, czyniąc z niej szybsze wahadło do przeniesienia przy dużej prędkości. Przesuń suwak od 2,5 do 4,5 m/s i obserwuj, jak nasilają się oba efekty. Krzywe powstają z interpolacji rzeczywistych danych z trzech zmierzonych prędkości.",
    "One complete countermovement jump: quiet stance, a dip to pre-stretch the leg extensors (the countermovement), the braking and concentric drive, take-off and flight, then the landing. Watch where the force peaks. It happens at the <em>bottom</em> of the dip, as the downward motion is arrested, well before the push. From there force decays all the way to zero at take-off, because a body accelerating upward needs less and less force as the legs run out of extension. The joints then extend in a proximal-to-distal sequence: hip, then knee, then ankle last (Bobbert &amp; van Ingen Schenau). That is what \"triple extension\" actually looks like in time. The landing spike is usually the single largest force of the whole movement. Increase jump effort and watch the dip deepen and every peak grow.":
      "Jeden kompletny skok z zamachem: spokojna postawa, zejście wstępnie rozciągające prostowniki nogi (zamach), faza hamowania i napędu koncentrycznego, wybicie i lot, a następnie lądowanie. Zwróć uwagę, gdzie siła osiąga szczyt: na <em>dnie</em> zejścia, w chwili zatrzymania ruchu w dół, a nie podczas wypychania. Od tego momentu siła maleje aż do zera przy wybiciu, ponieważ ciało przyspieszające w górę potrzebuje coraz mniejszej siły, w miarę jak nogom kończy się zakres wyprostu. Stawy prostują się następnie w sekwencji od bliższych do dalszych: najpierw biodro, potem kolano, a staw skokowy na końcu (Bobbert i van Ingen Schenau). Tak właśnie „potrójne wyprostowanie” wygląda w czasie. Skok siły przy lądowaniu jest zwykle największą siłą w całym ruchu. Zwiększ intensywność skoku i obserwuj, jak zagłębienie się pogłębia, a każdy szczyt rośnie.",
    "Landing generates the sharpest force spike of any movement here. A soft, knee-bent landing can keep the impact peak to around 2-3x body weight, spread over more time. Push the technique slider toward \"stiff\" and see why straight-legged landings are a well-known risk factor in ACL-injury research: the same drop now delivers a much higher, faster spike through much less joint flexion to absorb it.":
      "Lądowanie generuje najostrzejszy skok siły spośród wszystkich ruchów tutaj. Miękkie lądowanie ze zgiętym kolanem może utrzymać szczyt uderzenia w okolicy 2–3-krotności masy ciała, rozłożony w czasie. Przesuń suwak techniki w stronę „sztywnej” i zobacz, dlaczego lądowania na prostych nogach są dobrze znanym czynnikiem ryzyka w badaniach nad urazami ACL: ten sam upadek dostarcza teraz znacznie wyższy, szybszy skok siły przy znacznie mniejszym zgięciu stawów zdolnym go zamortyzować.",
    "The squat is the most \"quasi-static\" movement here. Ground reaction force barely leaves the neighbourhood of body weight, because the centre of mass moves slowly and under control. Look closely and the small wobbles still obey the same rule as the jump: force dips below body weight to <em>start</em> the descent, rises above it to stop the descent and drive back up, and dips below again as you decelerate near the top. What changes dramatically with depth is joint range and muscle demand: quadriceps and gluteal activation climb steadily as the knee and hip flex further, peaking around the transition out of the bottom, where the moment arms of body weight about the knee and hip are longest.":
      "Przysiad to najbardziej „quasi-statyczny” ruch tutaj. Siła reakcji podłoża ledwie oddala się od masy ciała, ponieważ środek masy porusza się powoli i pod kontrolą. Przyjrzyj się uważnie, a zobaczysz, że drobne wahania podlegają tej samej regule co przy skoku: siła spada poniżej masy ciała, aby <em>rozpocząć</em> zejście, rośnie powyżej niej, by zatrzymać zejście i wypchnąć ciało z powrotem w górę, po czym znów spada poniżej, gdy hamujesz przy górze. To, co zmienia się dramatycznie wraz z głębokością, to zakres ruchu w stawach i wymagania mięśniowe: aktywacja mięśnia czworogłowego i pośladkowego stale rośnie w miarę pogłębiania zgięcia kolana i biodra, osiągając szczyt w okolicy przejścia z dołu w górę, gdzie ramiona momentu masy ciała względem kolana i biodra są najdłuższe.",

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
    "Physics CDN unavailable, showing manual projectile motion instead":
      "CDN fizyki niedostępny, pokazuję ręczny ruch pocisku",
    "three.js (WebGL): live": "three.js (WebGL): aktywne",
    "three.js (WebGL): live · real mocap data": "three.js (WebGL): aktywne · prawdziwe dane mocap",
    "model load failed": "nie udało się wczytać modelu",
    "live": "aktywne",
    "error": "błąd",
    "unavailable": "niedostępne",
  };

  // ---- Static prose: data-i18n key -> Polish ---------------------------
  const STATIC = {
    // === Spine Under Load ===
    "sp.label": "Obciążenie krążka lędźwiowego",
    "sp.title": "Kręgosłup pod obciążeniem",
    "sp.sub": "W latach 60. Alf Nachemson wprowadzał igłę ciśnieniową do krążków lędźwiowych i prosił badanych, by siadali, stali, pochylali się i podnosili ciężary. Jego wykres stał się jednym z najczęściej cytowanych w całej opiece nad kręgosłupem. Trzydzieści lat później Wilke ze współpracownikami powtórzył pomiar przy użyciu nowoczesnej telemetrii i <b>nie zgodził się z jednym z jego najsłynniejszych twierdzeń</b>. Przełączaj się między badaniami i obserwuj, co dzieje się z <em>siedzeniem</em>.",
    "sp.c1h": "Twierdzenie o siedzeniu, które nie przetrwało",
    "sp.c1p": "Powtarza to każdy podręcznik: rozluźnione siedzenie obciąża krążek <b>bardziej</b> niż stanie (Nachemson: 140% wobec 100%). Kiedy jednak Wilke zmierzył to bezpośrednio, siedzenie bez podparcia dało <b>0,46&nbsp;MPa wobec 0,50&nbsp;MPa przy staniu</b>, czyli nieco <em>mniej</em>, a siedzenie zgarbione jeszcze mniej, bo 0,30. Jego praca konkluduje wprost, że ciśnienie w krążku podczas siedzenia „może w istocie być mniejsze niż podczas stania wyprostowanego”. Przełącz oba zbiory danych powyżej i patrz, jak słupek siedzenia przecina słupek stania. Siedzenie nadal ma realne koszty: jest statyczne, obciąża jedną tkankę w sposób ciągły, a komfort spada. Ale twierdzenie, że siedzenie miażdży krążki, nie znajduje potwierdzenia w najlepszym dostępnym pomiarze.",
    "sp.c2h": "Co oba badania <em>rzeczywiście</em> potwierdzają: ramię dźwigni",
    "sp.c2p": "Pochylenie do przodu i trzymanie ciężaru z dala od ciała ogromnie podnosi ciśnienie w krążku, w każdym zbiorze danych i z dużym marginesem. Mechanizm jest ten sam co na stronie <a href=\"muscle.html\">Dźwignie</a>. Obciążenie działa na długim ramieniu dźwigni od krążka. Prostowniki grzbietu ciągną na ramieniu dźwigni rzędu zaledwie kilku centymetrów, muszą więc wytworzyć bardzo duże siły, a niemal cała ta siła mięśniowa kończy jako ściskanie krążka. W danych Wilkego podnoszenie 20&nbsp;kg z zaokrąglonymi plecami sięgnęło <b>2,3&nbsp;MPa</b>, około <b>4,6× wartości przy staniu</b>. Podnoszenie tych samych 20&nbsp;kg ze zgiętymi kolanami i prostymi plecami dało 1,7&nbsp;MPa. Trzymanie ciężaru blisko i zawias biodrowy są warte mniej więcej jednej czwartej ciśnienia.",
    "sp.c3h": "Na ile można ufać którejkolwiek z tych liczb?",
    "sp.c3p": "Przeczytaj liczebność prób. Badani Nachemsona to <b>8 pacjentów przyjętych z powodu bólu krzyża lub rwy kulszowej</b>, a nie zdrowi ochotnicy, a stanie zarejestrowano tylko u <b>2</b> z nich. Jego „pochylenie do przodu” to <b>skłon o 20°</b>, ponieważ igła nie mogła zgiąć się bardziej. Badanie Wilkego to piękny 24-godzinny zapis <b>dokładnie jednej osoby</b>. Żadne z nich nie udźwignie ciężaru, jaki zwykle nakłada się na ten podręcznikowy wykres. Dwie rzeczy się bronią: ranking (leżenie &lt; postawa wyprostowana &lt; zgięcie &lt; zgięcie z obciążeniem) oraz rząd wielkości. Pamiętaj też, że wysokie ciśnienie ≠ uszkodzenie. Krążki to tkanka nośna i adaptują się do obciążeń. Używaj tych krzywych do wyjaśniania <em>mechaniki</em>, nigdy do straszenia kogokolwiek zginaniem.",
    "sp.note": "Wartości Nachemsona to obciążenie względne przy stanie = 100% (L3), z pracy Nachemson 1965 oraz wykresu zbiorczego odtworzonego w Nordin i Frankel oraz Neumann. Wartości Wilkego to bezwzględne ciśnienie w jądrze miażdżystym w MPa na poziomie L4/5 z pracy Wilke i wsp. 1999, pokazane tutaj również jako procent wartości stania z tego samego badania (0,50&nbsp;MPa). Pozycje, których dane badanie nie mierzyło, oznaczono kropką, zamiast je szacować. To porównanie dydaktyczne. Nie jest poradą kliniczną.",
    "sp.ofstanding": "% stania",

    // === Muscle Levers ===
    "lv.label": "Siła × odległość",
    "lv.title": "Dźwignie mięśniowe",
    "lv.sub": "Trzymasz hantlę 5 kg, a Twój biceps ciągnie z siłą bliższą <b>50&nbsp;kg</b>. Mięśnie przyczepiają się tuż obok stawów, które poruszają, więc działają na maleńkim ramieniu dźwigni i płacą za to siłą. Przesuwaj suwaki i obserwuj kompromis: <b>staw to dźwignia, a moment siły = siła × odległość</b>.",
    "lv.u.ratio": "niekorzyść mechaniczna (ciąg ÷ obciążenie)",
    "lv.u.joint": "siła ściskająca staw łokciowy",
    "lv.s.load": "Ciężar w dłoni",
    "lv.s.insert": "Ramię momentu bicepsa w łokciu",
    "lv.s.forearm": "Długość przedramienia (łokieć → dłoń)",
    "lv.c1h": "Skąd ta ogromna siła?",
    "lv.c1p": "Aby ramię pozostało nieruchome, moment obrotowy (<b>moment siły</b>) mięśnia musi dokładnie zrównoważyć moment od ciężaru. Moment = siła × <b>ramię momentu</b>, czyli odległość prostopadła od osi stawu do linii działania siły. Ciężar znajduje się ~<b>34&nbsp;cm</b> od stawu, a biceps ciągnie na ramieniu momentu zaledwie ~<b>4&nbsp;cm</b>, więc aby zrównoważyć moment, jego siła musi być około <b>34 ÷ 4 ≈ 8–10×</b> większa od ciężaru. Krótkie ramię dźwigni, duża siła. Taki układ ma niemal każdy mięsień w Twoim ciele. <em>Zmierzone ramiona momentu bicepsa osiągają maksimum około 4,7&nbsp;cm (Murray, Buchanan i Delp 2000).</em>",
    "lv.c2h": "Więc po co budować ciało w ten sposób?",
    "lv.c2p": "Utrata siły kupuje <b>prędkość i zakres ruchu</b>: mięsień skracający się o kilka centymetrów przy stawie prowadzi dłoń przez duży, szybki łuk. To samo krótkie ramię dźwigni, które kosztuje siłę, pozwala rzucać, kopać i sprintować. Utrzymuje też kończyny smukłe i lekkie blisko ciała. Ceną jest obciążenie stawu. Zauważ, jak rośnie trzecia liczba: większość tej siły mięśniowej kończy jako <b>ściskanie stawu</b>.",
    "lv.c3h": "Agonista i antagonista",
    "lv.c3p": "Podczas zginania <b style='color:#ff6f5e'>biceps</b> jest <b>agonistą</b> (mięśniem sprawczym), a triceps z tyłu ramienia jest <b>antagonistą</b>, który rozluźnia się i ustępuje, by umożliwić ruch. Prostuj ramię pod obciążeniem, a role się zamieniają. Mięśnie tylko ciągną, więc występują w przeciwstawnych parach, po jednej na każdy kierunek.",
    "lv.c4h": "To nigdy nie jest jeden mięsień",
    "lv.c4p": "Ten model mówi „biceps”, bo tak łatwiej narysować, ale zgięcie łokcia realizują co najmniej trzy mięśnie i wcale nie są one wymienne. Zmierzone na preparatach anatomicznych (Murray, Buchanan i Delp 2000): <b>mięsień ramienno-promieniowy</b> ma <em>największe</em> ramię momentu zginania ze wszystkich, bo <b>7,7&nbsp;cm</b>, znacznie powyżej 4,7&nbsp;cm bicepsa, a jednocześnie najmniejszy przekrój fizjologiczny. Jest więc długą dźwignią z małym silnikiem. <b>Mięsień ramienny</b> jest odwrotnością: ramię momentu tylko 2,6&nbsp;cm, ale największy przekrój spośród zginaczy, czyli krótka dźwignia z dużym silnikiem. Biceps leży pomiędzy nimi i dlatego to on ma największą łączną zdolność wytwarzania momentu. Prawdziwe stawy to zawsze praca zespołowa.",
    "lv.c5h": "A ramię momentu ciągle się zmienia",
    "lv.c5p": "Przesuwając suwak ramienia momentu robisz ręcznie to, co Twój łokieć robi automatycznie: ramiona momentu zmieniają się wraz z kątem stawu, a u bicepsa wahają się o ponad 30% w całym zakresie ruchu. Zatem moment w stawie = siła mięśnia × ramię momentu, a <em>oba</em> człony zmieniają się podczas obrotu stawu. Człon siły mięśnia rządzi się własnym prawem, krzywą długość–napięcie, którą możesz badać w <a href=\"dyno.html\">Muscle Dyno</a>. Połącz oba, a otrzymasz powód, dla którego mięsień testuje się mocno przy jednym kącie stawu, a słabo przy innym. Dla każdego, kto wykonuje manualne testowanie mięśni, to najbardziej praktyczny fakt na tej stronie.",
    "lv.note": "Uproszczony model statyczny 2-D: przedramię trzymane poziomo, pojedynczy zginacz ciągnie pionowo, ciężary stawu i segmentów pominięto, by arytmetyka dźwigni pozostała widoczna. Prawdziwe ramiona momentu zmieniają się z kątem łokcia, mięsień owija się wokół stawu, a obciążenie jest dzielone między kilka zginaczy. Sam kompromis wygląda jednak właśnie tak. Klasyczna dźwignia trzeciego rodzaju (siła między osią a obciążeniem). Dane o ramionach momentu i architekturze mięśni za: Murray WM, Buchanan TS, Delp SL, <em>J Biomech</em> 33:943–952, 2000.",
    // === Anatomy of a Step (Lesson) ===
    "ls.label": "Przewodnik krok po kroku",
    "ls.title": "Anatomia kroku",
    "ls.sub": "Jeden zwykły krok kryje w sobie pięknie zgraną w czasie sekwencję. Przewijaj w dół, a przejdziemy przez nią razem, fazę po fazie, podczas gdy postać się porusza, a wykres siły nadąża za nią. Baw się sterowaniem, kiedy chcesz. Chodzi o to, żeby <b>eksperymentować</b>.",
    "ls.leg.grf": "<i class=\"dot dot-grf\"></i>siła reakcji podłoża",
    "ls.leg.knee": "<i class=\"dot dot-knee\"></i>zgięcie kolana",
    "ls.s0h": "Jeden cykl, od kontaktu do kontaktu",
    "ls.s0p": "Biomechanicy mierzą chód w <b>jednym cyklu chodu</b>: od zetknięcia jednej stopy z podłożem do ponownego zetknięcia się <em>tej samej</em> stopy. Rozciągamy go do 0–100%, aby wszyscy się pokrywali, niezależnie od wzrostu czy prędkości. Chwyć to i przewiń przez całość:",
    "ls.s0hint": "Z grubsza pierwsze ~60% to <b>faza podporu</b> (stopa na podłożu); reszta to <b>faza wymachu</b> (stopa w powietrzu).",
    "ls.s1h": "1 · Kontakt pięty i przyjęcie obciążenia",
    "ls.s1p": "Pięta ląduje, a ciało opada na nią. Obserwuj, jak wykres siły skacze do <b>pierwszego szczytu</b>, powyżej masy ciała, gdy wyhamowujesz opadającą masę. Kolano od razu lekko się ugina, by zamortyzować uderzenie, jak zawieszenie samochodu. Ściśle rzecz biorąc, są tu dwie fazy: sama chwila zetknięcia to <b>kontakt początkowy</b> (pierwsze ~2% cyklu), a następujący po nim fragment amortyzujący to <b>odpowiedź na obciążenie</b>.",
    "ls.rockh": "Trzy przetoczenia, jeden płynny ruch",
    "ls.rockp": "Fizjoterapia ma nazwę na to, co przed chwilą obserwowałeś. Perry opisuje fazę podporu jako trzy <b>przetoczenia (rockers)</b>, czyli trzy osie obrotu, które przekazują ciało do przodu, zamiast pozwolić mu utknąć nad nieruchomą stopą. <b>Przetoczenie piętowe</b> (odpowiedź na obciążenie): lądujesz na pięcie, a stopa obraca się wokół niej, podczas gdy mięsień piszczelowy przedni kontrolowanie opuszcza przodostopie. To właśnie ono zawodzi przy opadaniu stopy. <b>Przetoczenie skokowe</b> (środkowa faza podporu): stopa spoczywa płasko, a podudzie obraca się do przodu nad stawem skokowym. To przetoczenie niszczy sztywny staw skokowy. <b>Przetoczenie przodostopia</b> (końcowa faza podporu): pięta się unosi, a ciało przetacza się nad głowami kości śródstopia, podczas gdy łydka najpierw kontroluje, a potem napędza ruch. Utrata któregokolwiek z nich zmusza ciało do obejścia. Każde z nich możesz wyłączyć w <a href=\"sandbox.html\">Gait Lab</a>.",
    "ls.s2h": "2 · Środkowa faza podporu: przetoczenie",
    "ls.s2p": "Teraz przetaczasz się w górę i ponad niemal wyprostowaną nogą, jak odwrócone wahadło. Noga jest najdłuższa, a biodra najwyżej, więc siła reakcji podłoża na moment spada <em>poniżej</em> masy ciała. Kolano wróciło do wyprostu.",
    "ls.s3h": "3 · Odbicie",
    "ls.s3p": "Łydka odpala, a staw skokowy napędza Cię do przodu i w górę na palce. To <b>drugi szczyt</b> wykresu siły. To odbicie jest silnikiem chodu. Większość napędu powstaje właśnie tutaj, pod koniec fazy podporu.",
    "ls.s4h": "4 · Oderwanie palców",
    "ls.s4p": "Palce opuszczają podłoże, a siła reakcji spada do <b>zera</b>. Ta noga teraz leci. Przez następną jedną trzecią cyklu nie przenosi żadnego obciążenia. Musi tylko przemachnąć się do przodu i przygotować do lądowania.",
    "ls.s5h": "5 · Wymach: omiń podłogę",
    "ls.s5p": "Oto <b>duże</b> zgięcie kolana, do ~60°. Bez podłoża, na którym można się odepchnąć, jedynym zadaniem jest złożenie nogi tak, by stopa nie zahaczyła. Krótsza, złożona noga to także szybsze wahadło, więc sprawnie wymachuje do przodu.",
    "ls.s6h": "6 · Sięganie po następny krok",
    "ls.s6p": "Kolano się prostuje, a noga sięga do przodu, hamując tak, by pięta mogła miękko wylądować. W chwili zetknięcia z podłożem pętla zaczyna się od nowa. <em>Druga</em> noga robi to wszystko dokładnie pół cyklu z tyłu.",
    "ls.s7h": "Teraz Ty prowadzisz",
    "ls.s7p": "To jeden krok. Przejdź od razu do dowolnego momentu: <button class=\"goto\" data-goto=\"6\">przyjęcie obciążenia</button> <button class=\"goto\" data-goto=\"30\">środek podporu</button> <button class=\"goto\" data-goto=\"50\">odbicie</button> <button class=\"goto\" data-goto=\"73\">wymach</button> albo sam przewiń cały cykl i patrz, jak siła i kolano poruszają się razem:",
    "ls.s7hint": "Chcesz tych samych danych jako wykresy, cząstki fizyki lub prawdziwe ciało 3-D? Wypróbuj <a href=\"explorer.html#explorer\">Eksplorator</a>, <a href=\"lab.html\">Kuźnię</a> lub <a href=\"gait3d.html\">Prawdziwy chód</a>.",

    // === Gait Lab (sandbox) ===
    "sb.label": "Przyczyna i kompensacja",
    "sb.title": "Gait Lab",
    "sb.sub": "Zdrowy chód to łańcuch precyzyjnie zgranych w czasie zdarzeń, a gdy jedno ogniwo słabnie, ciało improwizuje. Włącz <b>deficyt</b> i patrz, jak zmienia się chód. Cień to typowy chód, a pełna postać to <b>ta sama osoba radząca sobie z problemem</b>. Klasyczne kompensacje pokazane tutaj to dokładnie to, czego klinicyści szukają w badaniu chodu.",
    "sb.ghost": "pokaż typowy chód (cień)",
    "sb.primary": "Deficyt pierwotny",
    "sb.comp": "Kompensacja, którą widzisz",
    "sb.severity": "Nasilenie",
    "sb.note": "Uproszczenie dydaktyczne w płaszczyźnie strzałkowej (z boku): deficyt pierwotny i jego główne kompensacje są modelowane na kinematyce chodu. <b>Jeden ważny wzorzec jest tu z założenia nieobecny.</b> Chód <b>Trendelenburga</b> przy osłabionych odwodzicielach biodra, w którym miednica opada po stronie <em>wymachowej</em> albo tułów przechyla się nad biodrem podporowym, by je odciążyć, zachodzi w płaszczyźnie czołowej i po prostu nie da się go narysować z ujęcia bocznego. To prawdopodobnie odchylenie, o które studentów fizjoterapii pyta się najczęściej, więc zobacz je w 3-D na stronie <a href=\"sls.html\">Kontrola kolana</a>, gdzie opadanie miednicy jest modelowane bezpośrednio. To samo dotyczy zataczania łuku. Oparte na Perry i Burnfield, <em>Gait Analysis: Normal and Pathological Function</em> (wyd. 2). Nie jest narzędziem diagnostycznym.",
    // === Knee Control (single-leg squat) ===
    "sl.label": "Kontrola w płaszczyźnie czołowej",
    "sl.title": "Przysiad na jednej nodze",
    "sl.sub": "Stań na jednej nodze i powoli wykonaj przysiad. Brzmi banalnie, ale sprawia, że kontrola w płaszczyźnie czołowej staje się wyjątkowo dobrze widoczna: czy biodro, kolano i tułów pozostają <b>ustawione w jednej osi</b>, czy też kolano zapada się do środka w <b>dynamiczną koślawość</b>. Przeciągnij suwak kontroli i patrz, jak pojawia się zapadanie.",
    "sl.disclaimer": "⚠️ Poglądowe demo syntetyczne. Ruch tutaj jest wygenerowany z wyidealizowanych krzywych, aby <b>nauczyć wzorca</b>. To <b>nie</b> są prawdziwe dane badawcze i <b>nie</b> jest to ocena kliniczna.",
    "sl.mode.syn": "Model syntetyczny",
    "sl.mode.real": "Prawdziwe nagranie OpenCap 🎥",
    "sl.hint": "przeciągnij, by obracać · przewiń, by przybliżyć",
    "sl.p.good": "Dobra kontrola",
    "sl.p.mod": "Umiarkowana",
    "sl.p.collapse": "Zapadnięcie w koślawość",
    "sl.real.h": "Prawdziwe nagranie bezmarkerowe",
    "sl.real.p": "To są <b>prawdziwe pozycje stawów 3D</b> z nagrania OpenCap, czyli dwa filmy z telefonu zamienione w ruchomy szkielet, pokazane jako <b>zanonimizowana próbka pilotażowa</b> (przysiad na jednej nodze, podpór na lewej). Jest tu po to, by pokazać, <em>jak wygląda surowy ruch</em>, więc nie pokazujemy żadnych metryk ani interpretacji. Zauważ, jak czysto śledzona jest noga podporowa i jak zaszumiona pozostaje noga uniesiona. To rzeczywiste ograniczenie nagrywania bezmarkerowego na kończynie, której kamery nie widzą w całości.",
    "sl.ctrl": "Kontrola ruchu",
    "sl.speed": "Prędkość przysiadu",
    "sl.c1h": "Czym jest „dynamiczna koślawość kolana”",
    "sl.c1p": "Obserwuj kolano względem przerywanej linii biegnącej od biodra do stopy. Przy dobrej kontroli podąża ono nad stopą. Przy słabej kontroli dryfuje <b>przyśrodkowo</b>, do wewnątrz w stronę drugiej nogi, gdy biodro rotuje i przywodzi. To ustawienie kolana do wewnątrz, w połączeniu z opadniętą miednicą i pochylonym tułowiem, bywa <b>wiązane z urazami kolana, takimi jak zerwanie więzadła krzyżowego przedniego czy ból rzepkowo-udowy</b>, w części badań i w części populacji. Traktuj to jako cechę ruchu wartą opisania, a nie jako test przesiewowy: związek widoczny w grupie nie pozwala przewidzieć urazu u konkretnej osoby, a wyniki nie są spójne między płciami, dyscyplinami i grupami wiekowymi.",
    "sl.c2h": "Trzy rzeczy, które to zdradzają",
    "sl.c2p": "Klinicyści i biomechanicy wyrażają to w liczbach: <b>przyśrodkowe przesunięcie kolana i kąt projekcji w płaszczyźnie czołowej</b>, <b>przeciwstronne opadanie miednicy</b> (obniżenie drugiego biodra) oraz <b>pochylenie tułowia</b>. Wszystkie trzy zwykle narastają razem, gdy kontrola zawodzi, i wszystkie trzy są widoczne od przodu. Przesuń kontrolę i patrz, jak trzy liczby rosną razem.",
    "sl.c3h": "Jak mierzy to OpenCap",
    "sl.c3p": "Tradycyjnie wymaga to laboratorium z markerami. <a href=\"https://www.opencap.ai/\" target=\"_blank\" rel=\"noopener\">OpenCap</a> robi to z <b>dwóch zwykłych filmów z telefonu</b>. Estymuje punkty kluczowe ciała, trianguluje je do 3D i dopasowuje pełny model mięśniowo-szkieletowy (Uhlrich, Falisse i in., 2023). To stawia analizę trójwymiarową w zasięgu gabinetu albo szkolnej sali, co jest realną nowością. <b>Nie czyni jej to jednak równoważną z laboratorium markerowym.</b> Zgodność jest najlepsza dla kątów w <b>płaszczyźnie strzałkowej</b>, czyli zgięcia i wyprostu widocznych z boku. Dokładność jest gorsza i mniej stabilna <b>poza tą płaszczyzną</b>, w rotacjach czołowych i poprzecznych. To zastrzeżenie trafia dokładnie w tę stronę, bo kontrola w płaszczyźnie czołowej jest właśnie tym, czego szuka się w przysiadzie na jednej nodze. Ufaj bardziej kształtowi ruchu niż ostatniemu stopniowi którejkolwiek liczby czołowej.",
    "sl.note": "Kąty, opadanie miednicy i pochylenie tułowia są tutaj <b>syntetyczne i wyidealizowane</b> dla celów dydaktycznych. Nie są pomiarami żadnej osoby. Nazwy metryk (przyśrodkowe przesunięcie kolana, kąt projekcji w płaszczyźnie czołowej, opadanie miednicy, pochylenie tułowia) odwzorowują to, co oblicza prawdziwy pipeline OpenCap dla przysiadu na jednej nodze, ale wszelkie pokazane progi są poglądowe i nie mają wartości diagnostycznej. Dokładność metod bezmarkerowych zależy od płaszczyzny, więc wartości czołowe z dowolnego systemu bezmarkerowego wymagają większej ostrożności niż strzałkowe. To nie porada medyczna.",
    // === Muscle Dyno ===
    "dy.label": "Jak mięsień wytwarza siłę",
    "dy.title": "Muscle Dyno",
    "dy.sub": "Siła mięśnia nie jest stałą liczbą. Zależy od tego, <b>jak długi jest mięsień</b> i <b>jak szybko zmienia długość</b>. Przeciągaj suwaki i obserwuj dwie zasady, które wbija Ci do głowy każdy podręcznik kinezjologii: krzywą <b>długość–napięcie</b> i krzywą <b>siła–prędkość</b>. Haczyk polega na tym, że <b>sam model mięśnia działa jako prawdziwy Ruby w Twojej przeglądarce</b>, skompilowany do WebAssembly.",
    "dy.lt": "Długość–napięcie",
    "dy.fv": "Siła–prędkość i moc",
    "dy.sarco": "Zachodzenie sarkomeru",
    "dy.s.len": "Długość mięśnia",
    "dy.s.vel": "Prędkość skurczu",
    "dy.s.act": "Aktywacja",
    "dy.code.h": "Fizjologia, jako Ruby",
    "dy.code.badge": "dokładnie ten kod oblicza Twój punkt pracy",
    "dy.c1h": "Długość–napięcie sprowadza się do zachodzenia",
    "dy.c1p": "Siła czynna pochodzi z główek miozyny ciągnących aktynę. Zbyt <b>krótki</b> mięsień i filamenty wciskają się w siebie. Zbyt <b>długi</b> i ledwo się zachodzą. W obu przypadkach pracuje mniej mostków poprzecznych, więc siła spada. Szczyt siły przypada na <b>długość optymalną (L₀)</b>. Poza nią rozciągnięta tkanka łączna dodaje napięcie <b>bierne</b> (rosnący ogon). <em>Neumann; Nordin i Frankel.</em>",
    "dy.c2h": "Siła–prędkość: wolno znaczy mocno, ekscentrycznie jeszcze mocniej",
    "dy.c2p": "Skracaj szybko, a siła się załamuje wzdłuż hiperboli Hilla, i dlatego nie da się szybko podnieść dużego ciężaru. Ale <b>wydłużanie</b> pod obciążeniem (ekscentryczne) wytwarza <em>więcej</em> siły niż utrzymywanie w bezruchu, przy mniejszym wysiłku. Zauważ, że <b>moc</b> (siła × prędkość) osiąga szczyt przy pośredniej prędkości. To podstawa treningu z obciążeniem optymalnym. <em>Enoka; Hill 1938.</em>",
    "dy.c3h": "Dlaczego obchodzi to klinicystę",
    "dy.c3p": "Manualne testowanie mięśni i wzmacnianie zależą od <b>kąta stawu</b>, ponieważ kąt ustala długość mięśnia, a jak pokazuje strona <a href=\"muscle.html\">Dźwignie</a>, kąt ustala też ramię momentu. Mięsień testowany w skróconym zakresie może wypaść słabo, nawet będąc całkowicie zdrowym. Programy obciążeń ekscentrycznych (protokół Alfredsona w tendinopatii ścięgna Achillesa, Nordic curl dla mięśni kulszowo-goleniowych) są rzeczywiście skuteczne, ale uważaj na to, <em>dlaczego</em>. Powód wykracza poza stwierdzenie, że „siła ekscentryczna jest największa”. Lepiej udokumentowane wyjaśnienia to przebudowa ścięgna pod wpływem długotrwałego obciążenia mechanicznego oraz, w przypadku mięśni kulszowo-goleniowych, wydłużenie <b>pęczków mięśniowych</b>. Przesuwa ono całą krzywą długość–napięcie tak, że szczyt siły powstaje przy <em>większej</em> długości mięśnia, czyli dokładnie tam, gdzie dochodzi do urazu. Pozycja to cała krzywa.",
    "dy.note": "Znormalizowany model typu Hilla do celów dydaktycznych (siła w wielokrotnościach maksymalnej siły izometrycznej F₀, prędkość w wielokrotnościach V_max). Kształty krzywych odpowiadają klasycznym zależnościom długość–napięcie i siła–prędkość, a dokładne liczby są poglądowe. <b>Jedno zastrzeżenie co do strony ekscentrycznej.</b> Ta krzywa osiąga plateau w okolicy 1,6&nbsp;F₀, co odpowiada zachowaniu izolowanego mięśnia. Osoba napinająca mięsień <em>dowolnie</em> zwykle nie jest w stanie tego wyrazić i osiąga tylko nieco powyżej swojego maksimum izometrycznego, ponieważ ogranicza to układ nerwowy. Sama różnica między tym, co mięsień potrafi, a tym, o co potrafisz go świadomie poprosić, jest realnym zjawiskiem. Silnik Ruby pobiera jednorazowo ~16&nbsp;MB. Jeśli nie może się załadować, identyczny model JavaScript przejmuje rolę, więc strona nadal działa.",
    // === ISB standard ===
    "isb.label": "Wspólny język",
    "isb.title": "Standard ISB",
    "isb.sub": "Zanim powstały te dwie prace, każda pracownia mogła zmierzyć to samo kolano, ten sam bark, ten sam chód, a potem opublikować inne liczby, bo każda wybrała własne osie i własną kolejność obrotów. Zalecenia ISB ustaliły definicje. Niemal każdy wynik z rejestracji ruchu, jaki przeczytasz, opiera się na nich. <b>Najedź kursorem na podkreślony fragment, żeby zobaczyć, co dokładnie mówią te prace.</b>",
    "isb.s1.label": "Problem",
    "isb.s1.h": "Ten sam ruch, inne liczby",
    "isb.s1.p": "Kąt w stawie nie jest wielkością mierzoną wprost. To liczba, którą się <em>oblicza</em>, a obliczenie wymaga trzech rozstrzygnięć: które punkty kostne wyznaczają każdy segment, w którą stronę skierowane są osie i w jakiej kolejności wykonuje się obroty. Zmień którekolwiek z nich, a liczba się zmieni, choć badany robi dokładnie to samo. W 1993 roku Międzynarodowe Towarzystwo Biomechaniki powołało komitet, ponieważ <span class=\"q\" data-q=\"nostandard\">nie było żadnego standardu</span>, a skutek był dotkliwy: <span class=\"q\" data-q=\"impossible\">badań niemal nie dało się ze sobą zestawiać</span>.",
    "isb.s1.p2": "Odpowiedzią było przyjęcie <b>układu współrzędnych stawu</b> (JCS) Grooda i Suntaya, opracowanego dla kolana w 1983 roku, i rozszerzenie go na całe ciało, między innymi dlatego, że <span class=\"q\" data-q=\"clinical\">opisuje ruch w kategoriach, którymi klinicyści i tak się posługują</span>.",
    "isb.s2.label": "Zobacz sam",
    "isb.s2.h": "Obroty nie są przemienne",
    "isb.s2.p": "To sedno sprawy. Poniżej ten sam segment dostaje <b>te same dwa obroty</b>, jeden wokół Z i jeden wokół X, wykonane w dwóch możliwych kolejnościach. Przesuń suwak i patrz, jak oba końce ruchu się rozjeżdżają. Prace mówią to wprost: <span class=\"q\" data-q=\"order\">zgięcie, a po nim odwodzenie to nie to samo, co odwodzenie, a po nim zgięcie</span>. Kiedy Karduna ze współpracownikami sprawdzili wszystkie możliwe sekwencje dla ruchu łopatki, opisali <span class=\"q\" data-q=\"karduna\">różnice sięgające 50° dla niektórych kątów</span>, biorące się wyłącznie z kolejności.",
    "isb.s2.foot": "Dlatego właśnie standard zaznacza, że <span class=\"q\" data-q=\"seqindep\">sam JCS nie zależy od sekwencji, a kąty Eulera i Cardana już tak</span>. Wybór konwencji decyduje o tym, czy dwie pracownie się zgadzają, czy po cichu się rozmijają.",
    "isb.s3.label": "Przed standardem",
    "isb.s3.h": "Trzy konwencje, jeden krąg",
    "isb.s3.p": "Na kręgosłupie było najgorzej i część I mówi o tym wprost: <span class=\"q\" data-q=\"othercon\">opisano również inne konwencje osi</span>. Oto trzy wymienione w pracy, na tej samej kości. Zmieniają się wyłącznie etykiety, nigdy sam krąg. Liczba podana jako „obrót wokół Z” oznacza trzy różne ruchy, zależnie od tego, czyją pracę trzymasz w ręku.",
    "isb.s4.label": "Przepis",
    "isb.s4.h": "Jak buduje się układ współrzędnych stawu",
    "isb.s4.a.h": "Nadaj każdej kości własne osie",
    "isb.s4.a.p": "Każdy segment dostaje układ kartezjański wyznaczony przez <span class=\"q\" data-q=\"landmarks\">punkty kostne, które da się wybadać palpacyjnie albo odnaleźć na zdjęciu rentgenowskim</span>. To ograniczenie jest zamierzone, bo definicja, której nie umiesz odnaleźć na żywym człowieku, jest w pracowni chodu bezużyteczna. Tam, gdzie punkt nie jest wyczuwalny, jak środek stawu biodrowego, praca podaje sposób jego oszacowania i <span class=\"q\" data-q=\"palpable\">trzyma się punktów dostępnych in vivo</span>.",
    "isb.s4.b.h": "Zbuduj układ stawu z dwóch kości",
    "isb.s4.b.p": "JCS korzysta z jednej osi zakotwiczonej w kości bliższej (<b>e1</b>), jednej w kości dalszej (<b>e3</b>) i trzeciej, która nie należy do żadnej z nich: <span class=\"q\" data-q=\"floating\">dwie osie są związane z ciałem, a jedna „pływa”</span>. Oś pływająca <b>e2</b> to po prostu wspólna prostopadła do dwóch pozostałych, więc przemieszcza się wraz z ruchem stawu.",
    "isb.s4.c.h": "Odczytaj z tych osi trzy obroty",
    "isb.s4.c.p": "Obrót wokół e1 to zgięcie i wyprost, wokół pływającej e2 odwodzenie i przywodzenie albo zgięcie boczne, a wokół e3 rotacja osiowa. Do tego dochodzą trzy przesunięcia. Cały sens tego zabiegu polega na tym, że <span class=\"q\" data-q=\"communication\">wszyscy mówią wtedy o tym samym</span>.",
    "isb.s5.label": "Staw po stawie",
    "isb.s5.h": "Co dokładnie mówi standard",
    "isb.s5.p": "Wybierz staw. Animacja przechodzi kolejno przez e1, e2 i e3, żeby pokazać, która oś odpowiada za który ruch, a tabela podaje definicję w opublikowanej postaci. <span class=\"isb-badge\">I</span> oznacza pracę z 2002 roku (staw skokowy, biodrowy, kręgosłup), a <span class=\"isb-badge\">II</span> pracę z 2005 roku (bark, łokieć, nadgarstek, ręka).",
    "isb.s6.label": "W praktyce",
    "isb.s6.h": "Trzy rzeczy warte zapamiętania",
    "isb.s6.a.h": "Lewe kończyny trzeba odbić",
    "isb.s6.a.p": "Standard dla barku napisano wyłącznie dla strony prawej. <span class=\"q\" data-q=\"leftshoulder\">Lewy bark należy odbić lustrzanie względem płaszczyzny strzałkowej, zanim zastosuje się definicje</span>. Jeśli o tym zapomnisz, każdy znak rotacji się odwróci.",
    "isb.s6.b.h": "Bark wyłamuje się z reguły",
    "isb.s6.b.p": "<span class=\"q\" data-q=\"gheuler\">Staw ramienno-łopatkowy jest jedynym opartym na prawdziwej sekwencji Eulera</span> (Y–X–Y), ponieważ e1 i e3 są początkowo równoległe. Zwykłe równania osi pływającej tam nie obowiązują, więc stosuje się rozkład Eulera.",
    "isb.s6.c.h": "Zawsze podawaj swoją konwencję",
    "isb.s6.c.p": "Nawet dziś kąt w stawie bez podanego układu współrzędnych i kolejności obrotów nie jest odtwarzalny. Nazwanie standardu, z którego się skorzystało, wraz z jego wersją, kosztuje jedno zdanie w metodyce i oszczędza czytelnikowi zgadywania.",
    "isb.note": "<b>Źródła.</b> Wu G, Cavanagh PR. ISB recommendations for standardization in the reporting of kinematic data. <em>J Biomech</em> 28:1257–1261, 1995. · Wu G i wsp. ISB recommendation on definitions of joint coordinate system of various joints… <b>Part I: ankle, hip, and spine</b>. <em>J Biomech</em> 35:543–548, 2002. · Wu G i wsp. …<b>Part II: shoulder, elbow, wrist and hand</b>. <em>J Biomech</em> 38:981–992, 2005. · Grood ES, Suntay WJ. A joint coordinate system for the clinical description of three-dimensional motions: application to the knee. <em>J Biomech Eng</em> 105:136–144, 1983.<br><br>Wszystkie rysunki na tej stronie powstały na podstawie słownych definicji osi zawartych w tych pracach. Same ilustracje z artykułów są objęte prawami autorskimi wydawnictwa Elsevier i nie są tutaj powielane. Cytaty są krótkie, ujęte w cudzysłów i opatrzone wskazaniem pracy oraz strony. W wersji polskiej najpierw podano tłumaczenie, a pod nim angielski oryginał, bo przetłumaczony cytat pozostaje tłumaczeniem i wypada to zaznaczyć.",
    // === Inverse Dynamics ===
    "id.label": "Zmierz na zewnątrz, policz w środku",
    "id.title": "Dynamika odwrotna",
    "id.sub": "Nie da się umieścić czujnika siły w żywym kolanie. A jednak niemal każda praca, którą przeczytasz, podaje momenty w kolanie w niutonometrach. Tych liczb nikt nigdy nie zmierzył. Zostały <b>obliczone wstecz</b>, od podłoża w górę, przy użyciu wyłącznie siły pod stopą, ruchu kończyny i masy jej części. To obliczenie nazywa się <b>dynamiką odwrotną</b> i zanim dojdziesz do końca tej strony, wykonasz je samodzielnie. <b>Najedź kursorem na podkreślony fragment, żeby zobaczyć, co dokładnie mówi źródło.</b>",
    "id.s1.label": "Problem",
    "id.s1.h": "Najciekawsze siły to te, do których nie da się dosięgnąć",
    "id.s1.p": "Platforma dynamometryczna mówi, co podłoże robi ciału. System kamer mówi, gdzie znajduje się każdy segment. Żadne z nich nie mówi, z jaką siłą ciągnie mięsień czworogłowy ani jak mocno piszczel jest dociskana do kości udowej. Jak ujmuje to praca o OpenSim, <span class=\"q\" data-q=\"notmeasurable\">siły wytwarzane przez mięśnie na ogół nie są mierzalne w eksperymencie</span>. Elektromiografia też nie przychodzi z ratunkiem: <span class=\"q\" data-q=\"emglimit\">EMG pokazuje, kiedy mięsień jest aktywny, a nie jaki ruch wywołał</span>.",
    "id.s1.p2": "Biomechanika robi więc rzecz najbliższą temu, co możliwe. Bierze pomiary, które da się wykonać na zewnątrz, i posuwa się do wewnątrz, segment po segmencie, nie używając niczego bardziej egzotycznego niż zasady dynamiki Newtona. Wynikiem nie jest siła mięśnia. Jest nim <b>wypadkowy moment w stawie</b>: pojedynczy efekt obrotowy, do którego sumują się wszystkie mięśnie, więzadła i siły kontaktowe w tym stawie. Dokładne zrozumienie, co ta liczba zawiera, a czego nie, jest głównym celem tej strony.",
    "id.s2.label": "Krok pierwszy",
    "id.s2.h": "Wytnij jeden segment i narysuj wszystko, co go dotyka",
    "id.s2.p": "Weź stopę. Wyobraź sobie cięcie przez staw skokowy i oddzielenie stopy od reszty ciała. Działają na nią cztery rzeczy i tylko cztery: <b>podłoże</b> naciska w górę przez środek nacisku, <b>grawitacja</b> ciągnie w dół w środku masy, a przez przecięcie podudzie przykłada zarówno <b>siłę</b>, jak i <b>moment</b>. Zapisz drugą zasadę dynamiki dwa razy, raz dla ruchu postępowego i raz dla obrotowego, a obie niewiadome w stawie skokowym wypadną same. Najedź na człon poniżej, żeby podświetlić go na rysunku.",
    "id.s3.label": "Przeczytaj drobny druk",
    "id.s3.h": "Wersja ze slajdu i miejsce, w którym przestaje działać",
    "id.s3.p": "Dynamikę odwrotną często spotkasz zapisaną zwięźle, jako moment bezwładności razy przyspieszenie kątowe minus moment siły zewnętrznej. Przy uważnym czytaniu ta postać jest lepsza, niż się z początku wydaje. Jeśli liczysz momenty <em>względem samego stawu</em>, nieznana siła reakcji w stawie znika sama, bo siła nie daje momentu względem własnego punktu przyłożenia. Wersja skrócona nadal pomija jednak <b>ciężar i bezwładność każdego segmentu między tym stawem a podłożem</b>. W stawie skokowym poniżej znajduje się tylko stopa, więc błąd wynosi kilka procent. Każdy krok w górę łańcucha dokłada kolejny pominięty segment. Naciśnij <b>Wymach</b> w panelu niżej, gdy stopa odrywa się od podłoża: bez siły zewnętrznej wersja skrócona nie ma z czym pracować i myli się o mniej więcej 100%, ponieważ w wymachu to właśnie te pominięte ciężary i bezwładności są całą odpowiedzią.",
    "id.s4.label": "Cały łańcuch",
    "id.s4.h": "Rozwiąż stopę, a potem oprzyj się na wyniku",
    "id.s4.p": "Oto część, dzięki której to działa. Gdy stopa jest rozwiązana, znasz siłę i moment w stawie skokowym. Zgodnie z trzecią zasadą dynamiki działają one z powrotem na podudzie z odwróconym znakiem, więc podudzie ma teraz również tylko dwie niewiadome, tym razem w kolanie. Rozwiąż je, odwróć znaki ponownie, a udo da Ci biodro. Każdy wynik staje się wielkością znaną dla następnego segmentu.",
    "id.s4.p2": "<b>Przeciągaj stawy, żeby zmienić pozycję. Przeciągnij grot strzałki, żeby zmienić siłę reakcji podłoża, a kropkę na podłodze, żeby przesunąć środek nacisku.</b> Każda liczba aktualizuje się dokładnie, według arytmetyki powyżej. Nic tu nie jest policzone z góry i każdą linijkę możesz sprawdzić ręcznie.",
    "id.s4.foot": "Zwróć uwagę, co się dzieje, gdy przeciągniesz wektor siły tak, by jego linia przechodziła dokładnie przez środek stawu: moment w tym stawie spada niemal do zera. Reszta to ciężar i bezwładność samego segmentu. To cała dynamika odwrotna w jednej obserwacji i dlatego właśnie <b>odległość prostopadła od stawu do linii działania siły</b> znaczy więcej niż wielkość samej siły.",
    "id.s5.label": "Co trzeba wiedzieć wcześniej",
    "id.s5.h": "Trzy składniki, a jeden z nich jest pożyczony",
    "id.s5.a.h": "Siła pod stopą",
    "id.s5.a.p": "<b>Platforma dynamometryczna</b> podaje trzy składowe siły reakcji podłoża oraz <b>środek nacisku</b>, czyli punkt na płycie, przez który ta siła działa. Środek nacisku ma własność, którą warto wypowiedzieć na głos: jest <em>zdefiniowany</em> jako punkt, w którym podłoże nie przykłada żadnego momentu. Dlatego człon momentu dalszego stopy wynosi zero i tylko dlatego łańcuch da się w ogóle zacząć.",
    "id.s5.b.h": "Ruch segmentów",
    "id.s5.b.p": "Rejestracja ruchu daje położenia. Dynamika odwrotna potrzebuje <b>przyspieszeń</b>, co oznacza dwukrotne różniczkowanie tych położeń. Różniczkowanie brutalnie wzmacnia szum: ledwo widoczne drgnięcie w torze markera zamienia się w duży pik przyspieszenia. Dlatego surowe współrzędne zawsze najpierw się filtruje i dlatego wybór częstotliwości odcięcia filtru jest realną decyzją metodologiczną, a nie szczegółem.",
    "id.s5.c.h": "Masa każdego segmentu",
    "id.s5.c.p": "Nikt nie waży Twojego podudzia. Jego masa, położenie środka masy i moment bezwładności są odczytywane z <b>tabeli</b> zbudowanej na ciałach innych ludzi i przeskalowanej do Twojego wzrostu i masy. To właśnie ten pożyczony składnik studenci najczęściej przyjmują bez pytania, skąd pochodzi. Zapytajmy więc.",
    "id.s5.t": "Wybierz tabelę i patrz, jak wynik się przesuwa",
    "id.s5.tp": "W literaturze dominują dwa zestawy parametrów segmentów ciała i nie zgadzają się ze sobą. Jeden zmierzono na <b>ośmiu zabalsamowanych zwłokach</b> starszych mężczyzn. Drugi zmierzono na <b>stu żywych młodych mężczyznach</b> skanerem gamma w Moskwie. Przełączaj się między nimi i patrz, jak zmieniają się momenty stawowe wynikające z ustawionej przez Ciebie pozycji.",
    "id.s6.label": "Obchodź się ostrożnie",
    "id.s6.h": "Cztery rzeczy, którymi ten wynik nie jest",
    "id.s6.a.h": "To nie jest siła mięśnia",
    "id.s6.a.p": "Moment stawowy 90&nbsp;N·m nie oznacza, że zginacze podeszwowe wytworzyły 90&nbsp;N·m. Oznacza, że wszystko, co przekracza staw skokowy, <em>zsumowało się</em> do tej wartości. Jeśli mięsień piszczelowy przedni współskurcza się, łydka wytwarza więcej niż 90, a antagonista część tego znosi. Dynamika odwrotna jest ślepa na współskurcz i nigdy nie rozdzieli jednej wypadkowej liczby na poszczególne mięśnie bez dodatkowych założeń.",
    "id.s6.b.h": "Błędy rosną, gdy pniesz się w górę",
    "id.s6.b.p": "Łańcuch przekazuje wynik każdego segmentu do następnego, a razem z nim przekazuje jego błędy. Błąd masy stopy wpływa nieco na staw skokowy, bardziej na kolano i najbardziej na biodro, bo każdy kolejny krok dziedziczy wszystko, co było wcześniej. Dlatego momenty w stawie skokowym są najbardziej wiarygodnym wynikiem pracowni chodu, a momenty w biodrze najmniej. Sprawdź to suwakami powyżej: błędna masa segmentu ledwie porusza stawem skokowym i wyraźnie porusza biodrem.",
    "id.s6.c.h": "Pomiary są ze sobą sprzeczne",
    "id.s6.c.p": "Platforma i kamery to osobne przyrządy, więc rejestrowana przez nie siła i rejestrowany ruch nigdy nie opisują dokładnie tego samego ciała. Praca o OpenSim mówi o tym wprost: <span class=\"q\" data-q=\"inconsistent\">zmierzone siły są często dynamicznie niezgodne z kinematyką modelu</span>. Ta niezgodność zostaje wchłonięta przez fikcyjną siłę i moment <b>resztkowy</b> przyłożone do tułowia, a <span class=\"q\" data-q=\"residual\">przy braku błędu resztka powinna wynosić zero, ale w praktyce nigdy tak nie jest</span>. Duża resztka to uczciwa lampka ostrzegawcza analizy chodu.",
    "id.s6.d.h": "Skóra się przesuwa, a kość nie",
    "id.s6.d.p": "Markery przykleja się do skóry, a skóra ślizga się po kości nawet o kilka centymetrów podczas szybkiego ruchu. Ten <b>artefakt tkanek miękkich</b> zaburza położenia środków stawów, co zaburza ramiona momentu, co zaburza każdy obliczony moment. Jest to największe pojedyncze źródło błędu w większości pracowni chodu i żadne filtrowanie go nie usuwa, bo nie jest to szum. Jest to prawdziwy ruch niewłaściwej rzeczy.",
    "id.s7.label": "Jak do tego doszło",
    "id.s7.h": "Krótka historia liczb, których właśnie użyłeś",
    "id.s7.p": "Tabela, którą wybrałeś powyżej, ma swoją historię, i jest to lepsza opowieść, niż tabela na to zasługuje. Kliknij znacznik.",
    "id.s8.label": "Zrób to naprawdę",
    "id.s8.h": "Oprogramowanie, które student rzeczywiście dostanie",
    "id.s8.p": "Wszystko na tej stronie to dwuwymiarowa wersja dydaktyczna. Prawdziwa analiza odbywa się w trzech wymiarach na pełnym modelu mięśniowo-szkieletowym, a standardowe narzędzie do tego jest bezpłatne.",
    "id.s8.foot": "Słowo o tym, dlaczego OpenSim w ogóle istnieje. Wcześniej większość pracowni pisała własny kod symulacyjny i zatrzymywała go dla siebie, co oznaczało, że nikt inny nie mógł sprawdzić wyników. Delp ze współpracownikami nazwał to wprost: <span class=\"q\" data-q=\"reproduce\">niemożność odtworzenia wyników jest poważnym ograniczeniem rozwoju tej nauki</span>. Ich odpowiedzią było rozdanie oprogramowania za darmo. Jeśli masz wynieść z tej strony jeden zawodowy nawyk, wynieś ten, i dołóż drugi: <span class=\"q\" data-q=\"testlimits\">każda symulacja zawiera założenia, więc sprawą krytycznie ważną jest przetestowanie jej i ustalenie jej ograniczeń</span>.",
    "id.note": "<b>Źródła.</b> Delp SL, Anderson FC, Arnold AS, Loan P, Habib A, John CT, Guendelman E, Thelen DG. OpenSim: open-source software to create and analyze dynamic simulations of movement. <em>IEEE Trans Biomed Eng</em> 54(11):1940–1950, 2007. · Zatsiorsky VM, Seluyanov VN. The mass and inertia characteristics of the main segments of the human body. W: <em>Biomechanics VIII-B</em>, Human Kinetics, 1983, s. 1152–1159. · de Leva P. Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters. <em>J Biomech</em> 29(9):1223–1230, 1996. · Dempster WT. <em>Space requirements of the seated operator</em>, WADC-TR-55-159, 1955. · Winter DA. <em>Biomechanics and Motor Control of Human Movement</em>, wyd. 4, Wiley, 2009, rozdz. 4 i 7. · Challis J. Biomechanics through time, <em>ISB Now</em>, czerwiec 2025.<br><br>Mechanika na tej stronie jest dokładna dla ustawionej przez Ciebie pozycji i sił: każdy moment jest liczony na bieżąco z pokazanych równań, a arytmetyka jest tą samą dwuwymiarową rekurencją Newtona-Eulera, którą pracownia chodu wykonuje w trzech wymiarach. Wartości parametrów segmentów pochodzą z cytowanych wyżej tabel i są skalowane liniowo do wybranej masy i wzrostu, do czego te tabele służą. To model dydaktyczny wyłącznie w płaszczyźnie strzałkowej i nie jest narzędziem klinicznym.",

    // === audit corrections: EMG amplitude, GRF vs joint load, model status ===
    "chart.muscle.caution": "<b>Czytaj to jako czas, nie siłę.</b> Każdy mięsień jest znormalizowany do własnego szczytu, więc 1,0 oznacza „najbardziej zapracowany moment tego mięśnia”, a nie „pełne pobudzenie”. Czworogłowy na poziomie 0,8 nie pracuje ciężej niż kulszowo-goleniowe na 0,5: te skale nie mają ze sobą związku. Amplitudy powierzchniowego EMG nie da się porównywać między mięśniami i nie jest ona miarą siły.",
    "compare.caution": "<b>Jedna rzecz, której te przebiegi nie pokazują: obciążenia stawu.</b> Siła reakcji podłoża to siła, jaką podłoże działa na całe ciało. Nie jest tym, co przenosi pojedynczy staw, a większy szczyt pod stopą sam z siebie nie oznacza większej siły w kolanie. Droga od jednego do drugiego ma cztery etapy, a ta strona przechodzi dwa pierwsze: <span class=\"chain-steps\"><b>siła zewnętrzna</b> <i>&rarr;</i> <a href=\"dynamics.html\">wypadkowy moment w stawie</a> <i>&rarr;</i> <span class=\"chain-todo\">siła mięśnia</span> <i>&rarr;</i> <span class=\"chain-todo\">siła kontaktowa w stawie</span></span> Każda strzałka wymaga założeń, których poprzednia nie potrzebowała. Dwie ostatnie wymagają pełnego modelu mięśniowo-szkieletowego, i po to właśnie jest <a href=\"dynamics.html#tools\">OpenSim</a>.",
    "lp.eng.flag": "<b>Koncepcyjna zabawka mechaniczna, a nie zweryfikowany model mechaniki człowieka.</b> Biotensegracja to sposób myślenia o tym, jak ciało mogłoby rozkładać obciążenia, i pozostaje propozycją teoretyczną poddawaną dyskusji, a nie ustaloną mechaniką całego organizmu. Wszystko poniżej opisuje <em>tę konstrukcję</em>. Tam, gdzie zachowuje się jak człowiek, potraktuj to jako miły zbieg okoliczności i sprawdź w prawdziwym pomiarze, zanim uwierzysz.",

    // === EMG Lab ===
    "eg.label": "Co zarejestrowała elektroda i co z tym zrobiłeś",
    "eg.title": "Laboratorium EMG",
    "eg.sub": "Poniżej masz osiem sekund zapisu prawdziwej idącej osoby, zarejestrowanego z trzech mięśni z częstotliwością tysiąca próbek na sekundę. Nie został przefiltrowany, wyprostowany, wygładzony ani przeskalowany. To surowy elektryczny bałagan, który naprawdę zobaczyły elektrody. Wszystko, co zamienia ten bałagan w czystą krzywą aktywacji z publikacji, jest <b>czyimś wyborem</b>, a na tej stronie te wybory należą do Ciebie. Dokonaj ich, a potem sprawdź, ile warta jest Twoja liczba. <b>Najedź kursorem na podkreślony fragment, żeby zobaczyć źródło.</b>",
    "eg.intro": "Przejdź przez siedem kroków po kolei. Każdy pokazuje sygnał w danym stanie oraz sterowanie, które go dotyczy. Kroki drugi i szósty proszą o zadeklarowanie odpowiedzi przed zobaczeniem wyniku, bo tylko tak sprawdzisz, czy naprawdę w nią wierzyłeś.",
    "eg.s1.h": "Dlaczego filtr nigdy nie jest darmowy",
    "eg.s1.p": "Opublikowana analiza tych danych użyła <span class=\"q\" data-q=\"hp50\">filtru górnoprzepustowego 50 Hz</span>, <span class=\"q\" data-q=\"order\">czwartego rzędu</span>, a następnie prostowania i <span class=\"q\" data-q=\"lp20\">obwiedni dolnoprzepustowej 20 Hz</span>. Te liczby to wybór autorów pod ich pytanie badawcze, a nie uniwersalny standard elektromiografii. Inna grupa analizująca ten sam zapis mogłaby zasadnie wybrać inaczej: <span class=\"q\" data-q=\"deluca\">około 20 Hz to szeroko stosowany kompromis ogólnego zastosowania</span>, a wymiana jest zawsze ta sama. Wyższe odcięcie usuwa więcej artefaktu ruchowego i razem z nim więcej prawdziwego sygnału mięśniowego.",
    "eg.s1.p2": "Dlatego krok drugi rysuje trzeci przebieg: <b>to, co filtr wyrzucił</b>. To po prostu sygnał surowy minus przefiltrowany. Obserwuj go, przesuwając odcięcie. Przy 10 Hz jest niemal płaski. Przy 50 Hz niesie widoczne wyładowania zgrane z krokami, ponieważ filtr nie odróżnia mięśnia od artefaktu. Zna wyłącznie częstotliwość.",
    "eg.s2.h": "Nie istnieje prawdziwa krzywa aktywacji",
    "eg.s2.p": "Krok czwarty wygładza wyprostowany sygnał w obwiednię. Wypróbuj po kolei 3, 6, 10 i 20 Hz. Przy 3 Hz dostajesz spokojny, pewnie wyglądający garb na krok. Przy 20 Hz dostajesz poszarpany kształt, który ciągle zmienia zdanie. <b>Oba pochodzą dokładnie z tego samego mięśnia.</b> Żaden nie jest prawdziwą aktywacją, bo aktywacja nie jest wielkością, którą elektroda zmierzyła. Obwiednia to oszacowanie, którego kształt sam wybrałeś, a prace pokazujące piękną gładką krzywą też go wybrały. Zwykle piszą jak, w metodyce, w jednym zdaniu, które większość czytelników pomija.",
    "eg.s3.h": "Mianownik decyduje o liczbie",
    "eg.s3.p": "Krok piąty nadaje amplitudzie jednostki i właśnie tu rodzi się większość błędnych odczytań. <b>Surowych miliwoltów</b> nie da się porównywać między osobami, między sesjami ani nawet między dwiema elektrodami na tej samej osobie, bo napięcie docierające do skóry zależy od tkanki tłuszczowej, impedancji skóry i dokładnego miejsca przyklejenia czujnika. <b>Szczyt próby</b> to naprawia, dzieląc każdy mięsień przez jego własne maksimum, co czyni czas porównywalnym, a amplitudę między mięśniami bezsensowną. <b>Procent MVC</b> dzieli zamiast tego przez maksymalny skurcz dowolny.",
    "eg.s3.p2": "Z tym trzecim jest tutaj problem i zamiast go ukryć, zrobiliśmy z niego ćwiczenie. <span class=\"q\" data-q=\"nomvc\">W tym zbiorze danych nie zarejestrowano żadnego skurczu maksymalnego</span>, więc MVC na tej stronie to suwak, a nie pomiar. Jest wyrażony w tych samych jednostkach co obwiednia, którą dzieli. Przeciągnij go od 0,60 w dół do 0,10 mV i patrz, jak ten sam zapis raportuje <b>27%, potem 40%, potem 80%, potem 159%</b> maksimum. W mięśniu nie zmieniło się nic. Zmienił się tylko Twój mianownik. A kiedy wartość przekroczy 100, powstrzymaj odruch nazwania tego niemożliwym: skurcz referencyjny, który nie był naprawdę maksymalny, robi dokładnie to.",
    "eg.s4.h": "Czego ta stacja naprawdę uczy",
    "eg.s4.p": "Nie elektromiografii. Nawyku, który pod nią leży: rozdzielania trzech rzeczy, które łatwo się zlewają. <b>Co zarejestrował przyrząd.</b> <b>Co zrobił z tym analizujący.</b> <b>Co wolno uczciwie wywnioskować z wyniku.</b> Na tej stronie zrobiłeś wszystkie trzy rzeczy samodzielnie, co znaczy, że przy następnym rysunku podpisanym „aktywacja mięśnia” będziesz wiedział, ile decyzji stoi za tą krzywą, i będziesz umiał poszukać ich w metodyce.",

    // === Glossary ===
    "gs.label": "Prostym językiem",
    "gs.title": "Słownik pojęć",
    "gs.sub": "Każdy termin, którego znajomość reszta tej strony po cichu zakłada. Same słowa rzadko oddają pojęcie przestrzenne, więc wszędzie tam, gdzie obraz pomaga, hasło zawiera <b>żywą ilustrację</b> działającą na tych samych danych co same stacje.",
    "gs.books.label": "Gdzie czytać dalej",
    "gs.books.title": "Polecane książki",
    "gs.books.lead": "Pogrupowane według tego, ile wiedzy zakładają, z notatką o tym, do <em>czego</em> każda właściwie służy. Lista „polecanej literatury” złożona z samych cytowań nikomu nie pomaga zdecydować, co otworzyć najpierw.",
    "gs.note": "Definicje napisano dla celów dydaktycznych, a nie jako kryteria diagnostyczne, i świadomie wymieniono część precyzji na zrozumiałość. Tam, gdzie termin bywa sporny albo używany różnie w różnych dziedzinach, hasło o tym mówi. Do każdego terminu można odesłać bezpośrednio, na przykład <span class=\"lp-mono\">glossary.html#vgrf</span>.",
    // === Landing page ===
    "lp.badge": "bionauka dla zabawy i rzemiosła",
    "lp.title1": "BIOLAB",
    "lp.title2": "PLAY",
    "lp.sub": "Kości pływają. Szkielet wisi wewnątrz ciągłej sieci napięcia, w której nic nie jest ułożone jedno na drugim i nic na niczym nie spoczywa. <b>Pociągnij i zobacz sam.</b>",
    "lp.grab": "chwyć bark albo kolano i pociągnij",
    "lp.ded.main": "dla moich wspaniałych studentów",
    "lp.ded.sub": "to Wy jesteście napięciem, które to wszystko spina",
    "lp.cta.map": "Otwórz mapę",
    "lp.cta.new": "Jesteś tu nowy? Zacznij od kroku →",
    "lp.scroll": "Przewiń",
    "lp.map.label": "Mapa stacji",
    "lp.map.title": "Wybierz, gdzie wylądować",
    "lp.map.lead": "Każdy panel poniżej działa na żywo. Wszystkie używają tych samych danych i tego samego silnika co stacja, którą otwierają.",
    "lp.path.label": "Sugerowana trasa",
    "lp.path.title": "Jeśli uczysz z tego materiału",
    "lp.eng.title": "Co przed chwilą pociągnąłeś",
    "lp.eng.body": "To ciało to model <b>biotensegracyjny</b>. Białe elementy to kości: rozpórki ściskane, które <b>nigdy się nie stykają</b>. Każda turkusowa linia to element napięciowy zastępujący mięsień, ścięgno i powięź, i potrafi <b>wyłącznie ciągnąć, nigdy pchać</b>, bo tkanka nie popchnie liny. Ponieważ ta sieć jest ciągła, obciążenie przyłożone gdziekolwiek w <em>modelu</em> wędruje w nim wszędzie. Pociągnij bark w bok, a <b>przeciwne kolano podąży za nim równie daleko</b>. Pociągnij kolano, a głowa odchyli się dalej niż Twoja własna dłoń. Długie przekątne biegnące od każdego barku do przeciwnej strony miednicy poprowadzono tam, gdzie anatomia ma realną strukturę: to <b>taśma skośna tylna</b>, od najszerszego grzbietu przez powięź piersiowo-lędźwiową do przeciwstronnego mięśnia pośladkowego wielkiego. Anatomiczne rozmieszczenie elementów nie sprawia jednak, że zachowanie tej konstrukcji jest pomiarem Twojego ciała. Spróbuj teraz <em>dłoni</em>. Prawie nic innego się nie poruszy, bo w tej konstrukcji ramię obraca się swobodnie w barku i <em>zwisa</em> z sieci, pozostając poza nią.",
    "lp.eng.body2": "Wszystko rozwiązywane w każdej klatce całkowaniem Verleta i relaksacją więzów. Warto to przyznać: same rozpórki i jednokierunkowe liny nie potrafią <em>przywrócić</em> kształtu. Raz odkształcona konstrukcja spokojnie pozostanie w dowolnym luźnym układzie, w jakim się znajdzie. Dlatego solver wyznacza dodatkowo w każdej klatce najlepiej dopasowany ruch sztywny pozy spoczynkowej i delikatnie ściąga do niej ciało, zastępując sprężysty odrzut, który w prawdziwym ciele daje wstępnie napięta powięź. Powrót kształtu po puszczeniu jest dokładny. Dryfujące w tle drobiny to prawdziwe orbity newtonowskie z <b id=\"engineBytes\">780</b> bajtów <b>ręcznie złożonego WebAssembly</b>, osadzonych w stronie, więc nie ma czego pobierać ani co mogłoby zawieść.",
    "lp.eng.show": "Pokaż mi kod źródłowy",

    // Shared: nav + footer + common controls
    "nav.explore": "Odkrywaj",
    "nav.explorer": "Eksplorator",
    "nav.how": "Jak to działa",
    "nav.compare": "Porównaj",
    "nav.sources": "Źródła",
    "nav.forge": "Kuźnia ⚡",
    "nav.anatomy": "Anatomia 🦴",
    "nav.gait": "Prawdziwy chód 🚶",
    "footer.tagline": "BioLab Play · bionauka dla zabawy i rzemiosła. Strona dydaktyczna o tym, jak porusza się ciało. Nie udziela porad medycznych.",
    "ctrl.playbackSpeed": "Prędkość odtwarzania",
    "hint.orbit": "przeciągnij, by obracać · przewiń, by przybliżyć",

    // index.html
    "hero.badge": "Interaktywna biomechanika",
    "hero.title": "Zobacz siły<br>\n      <span class=\"hero-title-accent\">stojące za każdym ruchem</span>",
    "hero.desc": "Chód, bieg, skok, lądowanie, przysiad. Każdy krok obciąża stawy i uruchamia mięśnie w precyzyjnej, przewidywalnej sekwencji. Przewijaj cykl, zmieniaj parametry i obserwuj, jak reagują siła reakcji podłoża, kąty stawowe i aktywność mięśni.",
    "hero.cta.start": "Zacznij odkrywać",
    "hero.cta.how": "Jak to działa\n        <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M6 9l6 6 6-6\"/></svg>",
    "hero.scroll": "Przewiń",
    "how.label": "Idea",
    "how.title": "Jeden cykl, trzy sygnały",
    "how.card1.h": "Siła reakcji podłoża",
    "how.card1.p": "Siła, jaką podłoże oddziałuje na ciało, wyrażona w wielokrotnościach masy ciała (BW). Z jaką siłą naciskasz, z taką podłoże odpowiada.",
    "how.card2.h": "Kąty stawowe",
    "how.card2.p": "Jak bardzo biodro, kolano i staw skokowy zginają się i prostują w cyklu ruchu. Każde zadanie ma własny kinematyczny podpis.",
    "how.card3.h": "Aktywacja mięśni",
    "how.card3.p": "Które grupy mięśni włączają się i wyłączają oraz kiedy. Każdy mięsień jest skalowany do własnego szczytu w cyklu, więc te krzywe niosą informację o czasie, a nie o wysiłku.",
    "how.note": "<b>Chód i bieg to dane pomiarowe</b>: rzeczywiste siły, kąty i EMG z otwartych zbiorów danych zdrowych osób dorosłych. <b>Skok i przysiad to rekonstrukcje</b> na podstawie klasycznej literatury. Każda krzywa jest <b>średnią grupową</b> (zobacz <a href=\"#sources\">Źródła</a>), więc pokazuje kształt wzorca. Nikt nie porusza się dokładnie tak.",
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
    "compare.lead": "Nałóż na siebie dowolne dwie kombinacje ruchu i parametru, aby zestawić obok siebie ich przebiegi siły i kąty kolana, na przykład bieg z chodem albo głęboki przysiad z płytkim.",
    "compare.traceA": "Wykres A",
    "compare.traceB": "Wykres B",
    "compare.angle.h": "Kąt kolana",
    "sources.label": "Oparte na badaniach",
    "sources.title": "Źródła",
    "sources.lead": "<b>Chód i bieg opierają się na rzeczywistych danych pomiarowych.</b> Siły reakcji podłoża i kąty stawowe to średnie z otwartych zbiorów Fukuchiego. Aktywację mięśni obliczono tutaj z surowego EMG z otwartych zbiorów Santuza, z ponad 25 000 cykli chodu. <b>Skok z zamachem i przysiad to poglądowe rekonstrukcje</b> oparte na klasycznej literaturze wymienionej poniżej. Plakietka źródła przy każdym wykresie mówi, na który z dwóch przypadków właśnie patrzysz.",
    "sources.g.measured": "Dane pomiarowe napędzające tę stronę",
    "sources.g.texts": "Podręczniki i prace stojące za rekonstrukcjami i objaśnieniami",

    // lab.html (The Forge)
    "lab.label": "Te same dane, inna fizyka",
    "lab.title": "Kuźnia",
    "lab.sub": "Tu nie ma osi wykresów. Siła reakcji podłoża zostaje wyrzucona jako prawdziwy rozprysk cząstek, symulowany przez <b>Rapier2D</b>, silnik fizyki ciał sztywnych napisany w Rust i uruchamiany w przeglądarce jako WebAssembly. Większa siła <em>dosłownie</em> odrzuca materię dalej pod działaniem prawdziwej grawitacji i oporu. Aktywacja mięśni unosi się znad każdego brzuśca mięśnia jak żarzące się iskry, jaśniejsze i gęstsze im ciężej pracuje dany mięsień. To te same oparte na literaturze krzywe co na stronie <a href=\"explorer.html#explorer\">Eksplorator</a>, przedstawione jako siły działające na obiekty zamiast linii na wykresie.",
    "lab.status": "ładowanie silnika fizyki…",
    "lab.note": "Wysokość i gęstość rozprysku cząstek to bezpośrednie, dosłowne odwzorowanie chwilowej krzywej siły reakcji podłoża. Nic tu nie jest animowane ręcznie. Zobacz <a href=\"explorer.html#sources\">Źródła</a>, na czym oparte są krzywe.",
    // body3d.html (The Anatomy)
    "anat.label": "Te same dane, w trzech wymiarach",
    "anat.title": "Anatomia",
    "anat.sub": "Trójwymiarowa, ruchoma postać, której biodra, kolana i stawy skokowe poruszają się po <b>tych samych, opartych na literaturze krzywych kątów stawowych</b> co na każdej innej stronie, a mięśnie żarzą się od chłodnych do gorących barw wraz z ich <b>rzeczywistym poziomem aktywacji</b>. Obracaj widok, przewijaj cykl i obserwuj, które mięśnie wykonują pracę w trakcie ruchu. Zbudowane w <b>three.js</b> (WebGL), działa bezpośrednio w przeglądarce.",
    "anat.note": "Ta wersja używa stylizowanych, proceduralnych brył kości i mięśni jako zastępnika. Potok renderowania i danych zaprojektowano tak, aby prawdziwą siatkę anatomiczną (np. otwarty model\n      <a href=\"https://simtk.org/projects/z-anatomy\" target=\"_blank\" rel=\"noopener\">Z-Anatomy</a> /\n      <a href=\"https://github.com/Kevin-Mattheus-Moerman/BodyParts3D\" target=\"_blank\" rel=\"noopener\">BodyParts3D</a>\n      ) można było później podłączyć bez zmiany przepływu danych.",
    "anat.webgl": "uruchamianie WebGL…",
    "mm.title": "Mapa ciepła EMG",
    "mm.status": "ładowanie…",
    "mm.front": "Przód",
    "mm.back": "Tył",
    "mm.note": "Te same sześć krzywych aktywacji, naniesione na dwuwymiarową mapę anatomiczną (przód i tył) jako mapa ciepła w stylu EMG, która biegnie od neutralnego przez żółty i pomarańczowy do czerwonego wraz ze wzrostem aktywacji. Mapa stoi w miejscu, podczas gdy figura 3D się porusza. To ciało, które się <em>rozświetla</em>.",
    "dx.h2": "Co widzisz",
    "dx.c1.h": "<span class=\"dx-pct\">%</span> to jeden krok, nie sekundy",
    "dx.c1.p": "Każda krzywa biegnie od lewej do prawej przez <b>jeden pełny cykl chodu</b>, od kontaktu jednej stopy z podłożem do kolejnego kontaktu <em>tej samej</em> stopy, przeskalowany do 0–100&nbsp;%, aby różne osoby i prędkości się pokrywały. Wartość % u góry pokazuje, w którym miejscu cyklu właśnie jesteś.",
    "dx.stance": "Podpór ~0–39% <span>stopa na podłożu</span>",
    "dx.swing": "Wymach ~39–100% <span>stopa w powietrzu</span>",
    "dx.c1.small": "W biegu stopa dotyka podłoża tylko ~39% kroku, a reszta to wymach z krótką fazą lotu. Ten podział zmierzono z tego właśnie zbioru danych i względem niego zsynchronizowano wyładowania mięśni.",
    "dx.c2.h": "Kolor = jak ciężko pracuje mięsień <em>jak na siebie</em>",
    "dx.c2.p": "Sygnał każdego mięśnia jest znormalizowany do <b>jego własnego szczytu w cyklu</b>: <b>0</b> = spoczynek, <b>1,0</b> = najcięższy moment tego mięśnia. Kolor mówi więc, <em>kiedy</em> mięsień się uaktywnia. Nie mówi nic o tym, czy łydka jest „silniejsza” niż czworogłowy, ponieważ amplitud z powierzchniowego EMG nie da się porównywać między mięśniami.",
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
    "dx.foot": "Oba widoki odczytują w każdej chwili <em>te same</em> liczby. Mapa 2D to otwarta biblioteka\n      <a href=\"https://github.com/vulovix/body-muscles\" target=\"_blank\" rel=\"noopener\">body-muscles</a>\n      (Apache&nbsp;2.0), a figura 3D to <a href=\"https://threejs.org\" target=\"_blank\" rel=\"noopener\">three.js</a>.\n      Wizualizacja edukacyjna. Nie jest oceną kliniczną ani indywidualną.",
    // gait3d.html (Real Gait)
    "gait.label": "Prawdziwe ciało na prawdziwych danych",
    "gait.title": "Prawdziwy chód",
    "gait.sub": "Poprawnie oszkieletowana, realistycznie zbudowana postać ludzka, chodząca na <b>rzeczywistych kątach stawowych z motion-capture</b>, uśrednionych z otwartego zbioru danych o chodzie. Nic tu nie jest gotową animacją. Każdy obrót biodra, kolana i stawu skokowego to zmierzone dane, przeniesione na szkielet na bieżąco za pomocą <b>three.js</b>.",
    "gait.status": "ładowanie modelu…",
    "gx.h2": "Co widzisz",
    "gx.c1.h": "Ruch jest <em>zmierzony</em>, a nie animowany ręcznie",
    "gx.c1.p": "Obroty biodra, kolana i stawu skokowego pochodzą z otwartego zbioru danych o chodzie <b>Fukuchi et&nbsp;al. 2018</b>, czyli rejestracji ruchu 3D <b>42 zdrowych osób dorosłych</b> chodzących po podłożu w komfortowym tempie. Wzięliśmy uśrednione kąty stawowe w płaszczyźnie strzałkowej (uśrednione po wszystkich osobach i obu nogach, <b>84 krzywe chodu</b>) i przenieśliśmy je wprost na szkielet. Nic tu nie jest gotową animacją z gry.",
    "gx.stance": "Podpór ~0–62% <span>stopa na podłożu</span>",
    "gx.swing": "Wymach ~62–100% <span>stopa w powietrzu</span>",
    "gx.c1.small": "Oś czasu to jeden <b>cykl chodu</b>, biegnący od kontaktu jednej stopy z podłożem do kolejnego kontaktu tej samej stopy, przeskalowany do 0–100%. W chodzie stopa jest na podłożu ~62% cyklu, bo chód nie ma fazy lotu, którą ma bieg. Druga noga porusza się dokładnie pół cyklu za nią.",
    "gx.c2.h": "Jak ciało chodzi z samych kątów",
    "gx.c2.p": "Kąty stawowe mówią, jak zginają się kończyny, ale nie mówią nic o tym, gdzie ciało <em>znajduje się</em> w przestrzeni, a tego ruchu miednicy nie ma w danych kątowych. Dlatego chód odtworzono z użyciem <b>blokowania stopy</b>: stopa w kontakcie zostaje przypięta do podłoża, a ciało jest nad nią przenoszone. Kamera podąża za postacią, więc wydaje się ona w miejscu, podczas gdy podłoże przesuwa się obok, a stopy pozostają realnie oparte.",
    "gx.c2.small": "<b>Gdzie ta rekonstrukcja zawodzi i dlaczego warto to wiedzieć.</b> Blokowanie stopy daje około <b>0,8&nbsp;m przemieszczenia na cykl chodu</b>, podczas gdy dorosły idący z tą prędkością pokonuje realnie około <b>1,4&nbsp;m</b> na cykl. Brakująca połowa bierze się ze wszystkiego, co leży poza strzałkowymi kątami biodra, kolana i stawu skokowego: z rotacji miednicy w płaszczyźnie poprzecznej, z pochylenia i opadania miednicy oraz ze sposobu, w jaki stopa przetacza się od pięty do palców, zamiast obracać się wokół punktu. Same kąty strzałkowe nigdy nie odtworzą długości cyklu i właśnie dlatego pracownie chodu mierzą także miednicę. Traktuj prędkość postępu jako poglądową. Częścią zmierzoną są <b>kąty stawowe</b>.",
    "gx.c2.small2": "Samo ciało to typowy oszkieletowany manekin (three.js „Xbot”). <b>Dane</b>, które nim sterują, są prawdziwe, a siatka to tylko płótno. Tylko płaszczyzna strzałkowa. Zwróć też uwagę, że średnia z 42 osób łączy 24 młodych i 18 starszych dorosłych, jest więc złożeniem dwóch grup wiekowych, a nie obrazem pojedynczego chodu.",
    "gx.foot": "Dane: Fukuchi CA, Fukuchi RK, Duarte M (2018), <em>A public data set of overground and treadmill\n      walking kinematics and kinetics of healthy individuals</em>,\n      <a href=\"https://peerj.com/articles/4640/\" target=\"_blank\" rel=\"noopener\">PeerJ 6:e4640</a> /\n      <a href=\"https://doi.org/10.6084/m9.figshare.5722711\" target=\"_blank\" rel=\"noopener\">figshare 5722711</a>.\n      Renderowanie: <a href=\"https://threejs.org\" target=\"_blank\" rel=\"noopener\">three.js</a>. Wizualizacja\n      edukacyjna. Nie jest oceną kliniczną ani indywidualną.",
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
