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
    "Running trades walking's double-hump force for a single, much larger peak — around 2.5× body weight here, versus ~1.1× for walking. The reason is timing, not effort: across a whole stride the ground has to supply one body weight of support on average, but in running the foot is only down for about a third of the stride instead of nearly two thirds. A shorter contact has to push proportionally harder. Add the flight phase — the body falls further and arrives moving faster — and the peak climbs further still. Notice too that the knee folds up past 100° of flexion, far more than in walking: tucking the leg pulls its mass closer to the hip, making it a quicker pendulum to swing through at speed. Slide from 2.5 to 4.5 m/s and watch both effects grow — blended from real motion capture at three measured speeds.":
      "Bieg zamienia dwugarbną siłę chodu na pojedynczy, znacznie większy szczyt — tutaj około 2,5-krotności masy ciała, wobec ~1,1 przy chodzie. Powodem jest czas, a nie wysiłek: w ciągu całego cyklu podłoże musi dostarczyć średnio jedną masę ciała podparcia, ale w biegu stopa jest na podłożu tylko przez mniej więcej jedną trzecią cyklu, zamiast prawie dwie trzecie. Krótszy kontakt musi więc naciskać proporcjonalnie mocniej. Dodaj fazę lotu — ciało spada z większej wysokości i ląduje z większą prędkością — a szczyt rośnie jeszcze bardziej. Zwróć też uwagę, że kolano zgina się powyżej 100°, znacznie mocniej niż w chodzie: podkurczenie nogi przybliża jej masę do biodra, czyniąc z niej szybsze wahadło do przeniesienia przy dużej prędkości. Przesuń suwak od 2,5 do 4,5 m/s i obserwuj, jak nasilają się oba efekty — z interpolacji rzeczywistych danych z trzech zmierzonych prędkości.",
    "One complete countermovement jump — quiet stance, a dip to pre-stretch the leg extensors (the countermovement), the braking and concentric drive, take-off and flight, then the landing. Watch where the force peaks: at the <em>bottom</em> of the dip, as the downward motion is arrested, not during the push. From there force decays all the way to zero at take-off, because a body accelerating upward needs less and less force as the legs run out of extension. The joints then extend in a proximal-to-distal sequence — hip, then knee, then ankle last (Bobbert &amp; van Ingen Schenau) — which is what \"triple extension\" actually looks like in time. The landing spike is usually the single largest force of the whole movement. Increase jump effort and watch the dip deepen and every peak grow.":
      "Jeden kompletny skok z zamachem — spokojna postawa, zejście wstępnie rozciągające prostowniki nogi (zamach), faza hamowania i napędu koncentrycznego, wybicie i lot, a następnie lądowanie. Zwróć uwagę, gdzie siła osiąga szczyt: na <em>dnie</em> zejścia, w chwili zatrzymania ruchu w dół, a nie podczas wypychania. Od tego momentu siła maleje aż do zera przy wybiciu, ponieważ ciało przyspieszające w górę potrzebuje coraz mniejszej siły, w miarę jak nogom kończy się zakres wyprostu. Stawy prostują się następnie w sekwencji od bliższych do dalszych — najpierw biodro, potem kolano, a staw skokowy na końcu (Bobbert i van Ingen Schenau) — i tak właśnie „potrójne wyprostowanie” wygląda w czasie. Skok siły przy lądowaniu jest zwykle największą siłą w całym ruchu. Zwiększ intensywność skoku i obserwuj, jak zagłębienie się pogłębia, a każdy szczyt rośnie.",
    "Landing generates the sharpest force spike of any movement here — a soft, knee-bent landing can keep the impact peak to around 2-3x body weight, spread over more time. Push the technique slider toward \"stiff\" and see why straight-legged landings are a well-known risk factor in ACL-injury research: the same drop now delivers a much higher, faster spike through much less joint flexion to absorb it.":
      "Lądowanie generuje najostrzejszy skok siły spośród wszystkich ruchów tutaj — miękkie lądowanie ze zgiętym kolanem może utrzymać szczyt uderzenia w okolicy 2–3-krotności masy ciała, rozłożony w czasie. Przesuń suwak techniki w stronę „sztywnej” i zobacz, dlaczego lądowania na prostych nogach są dobrze znanym czynnikiem ryzyka w badaniach nad urazami ACL: ten sam upadek dostarcza teraz znacznie wyższy, szybszy skok siły przy znacznie mniejszym zgięciu stawów zdolnym go zamortyzować.",
    "The squat is the most \"quasi-static\" movement here — ground reaction force barely leaves the neighbourhood of body weight, because the centre of mass moves slowly and under control. Look closely and the small wobbles still obey the same rule as the jump: force dips below body weight to <em>start</em> the descent, rises above it to stop the descent and drive back up, and dips below again as you decelerate near the top. What changes dramatically with depth is joint range and muscle demand: quadriceps and gluteal activation climb steadily as the knee and hip flex further, peaking around the transition out of the bottom, where the moment arms of body weight about the knee and hip are longest.":
      "Przysiad to najbardziej „quasi-statyczny” ruch tutaj — siła reakcji podłoża ledwie oddala się od masy ciała, ponieważ środek masy porusza się powoli i pod kontrolą. Przyjrzyj się uważnie, a zobaczysz, że drobne wahania podlegają tej samej regule co przy skoku: siła spada poniżej masy ciała, aby <em>rozpocząć</em> zejście, rośnie powyżej niej, by zatrzymać zejście i wypchnąć ciało z powrotem w górę, po czym znów spada poniżej, gdy hamujesz przy górze. To, co zmienia się dramatycznie wraz z głębokością, to zakres ruchu w stawach i wymagania mięśniowe: aktywacja mięśnia czworogłowego i pośladkowego stale rośnie w miarę pogłębiania zgięcia kolana i biodra, osiągając szczyt w okolicy przejścia z dołu w górę, gdzie ramiona momentu masy ciała względem kolana i biodra są najdłuższe.",

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
    // === Spine Under Load ===
    "sp.label": "Obciążenie krążka lędźwiowego",
    "sp.title": "Kręgosłup pod obciążeniem",
    "sp.sub": "W latach 60. Alf Nachemson wprowadzał igłę ciśnieniową do krążków lędźwiowych i prosił badanych, by siadali, stali, pochylali się i podnosili ciężary. Jego wykres stał się jednym z najczęściej cytowanych w całej opiece nad kręgosłupem. Trzydzieści lat później Wilke ze współpracownikami powtórzył pomiar przy użyciu nowoczesnej telemetrii — i <b>nie zgodził się z jednym z jego najsłynniejszych twierdzeń</b>. Przełączaj się między badaniami i obserwuj, co dzieje się z <em>siedzeniem</em>.",
    "sp.c1h": "Twierdzenie o siedzeniu, które nie przetrwało",
    "sp.c1p": "Powtarza to każdy podręcznik: rozluźnione siedzenie obciąża krążek <b>bardziej</b> niż stanie (Nachemson: 140% wobec 100%). Kiedy jednak Wilke zmierzył to bezpośrednio, siedzenie bez podparcia dało <b>0,46&nbsp;MPa wobec 0,50&nbsp;MPa przy staniu</b> — a więc nieco <em>mniej</em> — a siedzenie zgarbione jeszcze mniej (0,30). Jego praca konkluduje wprost, że ciśnienie w krążku podczas siedzenia „może w istocie być mniejsze niż podczas stania wyprostowanego”. Przełącz oba zbiory danych powyżej i patrz, jak słupek siedzenia przecina słupek stania. Siedzenie nadal ma realne koszty — jest statyczne, obciąża jedną tkankę w sposób ciągły, a komfort spada — ale „siedzenie miażdży krążki” to nie jest to, co pokazuje najlepszy pomiar.",
    "sp.c2h": "Co oba badania <em>rzeczywiście</em> potwierdzają: ramię dźwigni",
    "sp.c2p": "Pochylenie do przodu i trzymanie ciężaru z dala od ciała ogromnie podnosi ciśnienie w krążku — w każdym zbiorze danych i z dużym marginesem. Mechanizm jest ten sam co na stronie <a href=\"muscle.html\">Dźwignie</a>: obciążenie działa na długim ramieniu dźwigni od krążka, więc prostowniki grzbietu — ciągnące na ramieniu dźwigni rzędu zaledwie kilku centymetrów — muszą wytworzyć bardzo duże siły, a niemal cała ta siła mięśniowa kończy jako ściskanie krążka. W danych Wilkego podnoszenie 20&nbsp;kg z zaokrąglonymi plecami sięgnęło <b>2,3&nbsp;MPa</b> — około <b>4,6× wartości przy staniu</b> — podczas gdy podnoszenie tych samych 20&nbsp;kg ze zgiętymi kolanami i prostymi plecami dało 1,7&nbsp;MPa. Trzymanie ciężaru blisko i zawias biodrowy są warte mniej więcej jednej czwartej ciśnienia.",
    "sp.c3h": "Na ile można ufać którejkolwiek z tych liczb?",
    "sp.c3p": "Przeczytaj liczebność prób. Badani Nachemsona to <b>8 pacjentów przyjętych z powodu bólu krzyża lub rwy kulszowej</b> — nie zdrowi ochotnicy — a stanie zarejestrowano tylko u <b>2</b> z nich; jego „pochylenie do przodu” to <b>skłon o 20°</b>, ponieważ igła nie mogła zgiąć się bardziej. Badanie Wilkego to piękny 24-godzinny zapis <b>dokładnie jednej osoby</b>. Żadne z nich nie udźwignie ciężaru, jaki zwykle nakłada się na ten podręcznikowy wykres. <em>Solidny</em> jest natomiast ranking — leżenie &lt; postawa wyprostowana &lt; zgięcie &lt; zgięcie z obciążeniem — oraz rząd wielkości. Pamiętaj też, że wysokie ciśnienie ≠ uszkodzenie: krążki to tkanka nośna i adaptują się do obciążeń. Używaj tych krzywych do wyjaśniania <em>mechaniki</em>, nigdy do straszenia kogokolwiek zginaniem.",
    "sp.note": "Wartości Nachemsona to obciążenie względne przy stanie = 100% (L3), z pracy Nachemson 1965 oraz wykresu zbiorczego odtworzonego w Nordin i Frankel oraz Neumann. Wartości Wilkego to bezwzględne ciśnienie w jądrze miażdżystym w MPa na poziomie L4/5 z pracy Wilke i wsp. 1999, pokazane tutaj również jako procent wartości stania z tego samego badania (0,50&nbsp;MPa). Pozycje, których dane badanie nie mierzyło, oznaczono „—” zamiast szacować. Porównanie dydaktyczne, nie porada kliniczna.",
    "sp.ofstanding": "% stania",

    // === Muscle Levers ===
    "lv.label": "Siła × odległość",
    "lv.title": "Dźwignie mięśniowe",
    "lv.sub": "Trzymasz hantlę 5 kg, a Twój biceps nie ciągnie z siłą 5 kg — ciągnie raczej z siłą <b>50</b>. Mięśnie przyczepiają się tuż obok stawów, które poruszają, więc działają na maleńkim ramieniu dźwigni i płacą za to siłą. Przesuwaj suwaki i obserwuj kompromis: <b>staw to dźwignia, a moment siły = siła × odległość</b>.",
    "lv.u.ratio": "niekorzyść mechaniczna (ciąg ÷ obciążenie)",
    "lv.u.joint": "siła ściskająca staw łokciowy",
    "lv.s.load": "Ciężar w dłoni",
    "lv.s.insert": "Ramię momentu bicepsa w łokciu",
    "lv.s.forearm": "Długość przedramienia (łokieć → dłoń)",
    "lv.c1h": "Skąd ta ogromna siła?",
    "lv.c1p": "Aby ramię pozostało nieruchome, moment obrotowy (<b>moment siły</b>) mięśnia musi dokładnie zrównoważyć moment od ciężaru. Moment = siła × <b>ramię momentu</b>, czyli odległość prostopadła od osi stawu do linii działania siły. Ciężar znajduje się ~<b>34&nbsp;cm</b> od stawu; biceps ciągnie na ramieniu momentu zaledwie ~<b>4&nbsp;cm</b> — więc aby zrównoważyć moment, jego siła musi być około <b>34 ÷ 4 ≈ 8–10×</b> większa od ciężaru. Krótkie ramię dźwigni, duża siła. Taki układ ma niemal każdy mięsień w Twoim ciele. <em>Zmierzone ramiona momentu bicepsa osiągają maksimum około 4,7&nbsp;cm (Murray, Buchanan i Delp 2000).</em>",
    "lv.c2h": "Więc po co budować ciało w ten sposób?",
    "lv.c2p": "Utrata siły kupuje <b>prędkość i zakres ruchu</b>: mięsień skracający się o kilka centymetrów przy stawie prowadzi dłoń przez duży, szybki łuk. To samo krótkie ramię dźwigni, które kosztuje siłę, pozwala rzucać, kopać i sprintować. Utrzymuje też kończyny smukłe i lekkie blisko ciała. Ceną jest obciążenie stawu — zauważ, jak rośnie trzecia liczba: większość tej siły mięśniowej kończy jako <b>ściskanie stawu</b>.",
    "lv.c3h": "Agonista i antagonista",
    "lv.c3p": "Podczas zginania <b style='color:#ff6f5e'>biceps</b> jest <b>agonistą</b> (mięśniem sprawczym), a triceps z tyłu ramienia jest <b>antagonistą</b> — rozluźnia się i ustępuje, by umożliwić ruch. Prostuj ramię pod obciążeniem, a role się zamieniają. Mięśnie tylko ciągną, więc występują w przeciwstawnych parach — po jednej na każdy kierunek.",
    "lv.c4h": "To nigdy nie jest jeden mięsień",
    "lv.c4p": "Ten model mówi „biceps”, bo tak łatwiej narysować, ale zgięcie łokcia realizują co najmniej trzy mięśnie i wcale nie są one wymienne. Zmierzone na preparatach anatomicznych (Murray, Buchanan i Delp 2000): <b>mięsień ramienno-promieniowy</b> ma <em>największe</em> ramię momentu zginania ze wszystkich — <b>7,7&nbsp;cm</b>, znacznie powyżej 4,7&nbsp;cm bicepsa — a jednocześnie najmniejszy przekrój fizjologiczny, jest więc długą dźwignią z małym silnikiem. <b>Mięsień ramienny</b> jest odwrotnością: ramię momentu tylko 2,6&nbsp;cm, ale największy przekrój spośród zginaczy — krótka dźwignia z dużym silnikiem. Biceps leży pomiędzy nimi i dlatego to on ma największą łączną zdolność wytwarzania momentu. Prawdziwe stawy to zawsze praca zespołowa.",
    "lv.c5h": "A ramię momentu ciągle się zmienia",
    "lv.c5p": "Przesuwając suwak ramienia momentu robisz ręcznie to, co Twój łokieć robi automatycznie: ramiona momentu zmieniają się wraz z kątem stawu — u bicepsa wahają się o ponad 30% w całym zakresie ruchu. Zatem moment w stawie = siła mięśnia × ramię momentu, a <em>oba</em> człony zmieniają się podczas obrotu stawu. Człon siły mięśnia rządzi się własnym prawem, krzywą długość–napięcie, którą możesz badać w <a href=\"dyno.html\">Muscle Dyno</a>. Połącz oba, a otrzymasz powód, dla którego mięsień testuje się mocno przy jednym kącie stawu, a słabo przy innym — najbardziej praktyczny fakt na tej stronie dla każdego, kto wykonuje manualne testowanie mięśni.",
    "lv.note": "Uproszczony model statyczny 2-D: przedramię trzymane poziomo, pojedynczy zginacz ciągnie pionowo, ciężary stawu i segmentów pominięto, by arytmetyka dźwigni pozostała widoczna. Prawdziwe ramiona momentu zmieniają się z kątem łokcia, mięsień owija się wokół stawu, a obciążenie jest dzielone między kilka zginaczy — ale kompromis jest właśnie taki. Klasyczna dźwignia trzeciego rodzaju (siła między osią a obciążeniem). Dane o ramionach momentu i architekturze mięśni za: Murray WM, Buchanan TS, Delp SL, <em>J Biomech</em> 33:943–952, 2000.",

    // === Anatomy of a Step (Lesson) ===
    "ls.label": "Przewodnik krok po kroku",
    "ls.title": "Anatomia kroku",
    "ls.sub": "Jeden zwykły krok kryje w sobie pięknie zgraną w czasie sekwencję. Przewijaj w dół, a przejdziemy przez nią razem — fazę po fazie — podczas gdy postać się porusza, a wykres siły nadąża za nią. Baw się sterowaniem, kiedy chcesz; chodzi o to, żeby <b>eksperymentować</b>.",
    "ls.leg.grf": "<i class=\"dot dot-grf\"></i>siła reakcji podłoża",
    "ls.leg.knee": "<i class=\"dot dot-knee\"></i>zgięcie kolana",
    "ls.s0h": "To pętla, nie linia",
    "ls.s0p": "Biomechanicy mierzą chód w <b>jednym cyklu chodu</b>: od zetknięcia jednej stopy z podłożem do ponownego zetknięcia się <em>tej samej</em> stopy. Rozciągamy go do 0–100%, aby wszyscy się pokrywali, niezależnie od wzrostu czy prędkości. Chwyć to i przewiń przez całość:",
    "ls.s0hint": "Z grubsza pierwsze ~60% to <b>faza podporu</b> (stopa na podłożu); reszta to <b>faza wymachu</b> (stopa w powietrzu).",
    "ls.s1h": "1 · Kontakt pięty i przyjęcie obciążenia",
    "ls.s1p": "Pięta ląduje, a ciało opada na nią. Obserwuj, jak wykres siły skacze do <b>pierwszego szczytu</b> — powyżej masy ciała — gdy wyhamowujesz opadającą masę. Kolano od razu lekko się ugina, by zamortyzować uderzenie, jak zawieszenie samochodu. Ściśle rzecz biorąc, są tu dwie fazy: sama chwila zetknięcia to <b>kontakt początkowy</b> (pierwsze ~2% cyklu), a następujący po nim fragment amortyzujący to <b>odpowiedź na obciążenie</b>.",
    "ls.rockh": "Trzy przetoczenia, jeden płynny ruch",
    "ls.rockp": "Fizjoterapia ma nazwę na to, co przed chwilą obserwowałeś. Perry opisuje fazę podporu jako trzy <b>przetoczenia (rockers)</b> — trzy osie obrotu, które przekazują ciało do przodu, zamiast pozwolić mu utknąć nad nieruchomą stopą. <b>Przetoczenie piętowe</b> (odpowiedź na obciążenie): lądujesz na pięcie, a stopa obraca się wokół niej, podczas gdy mięsień piszczelowy przedni kontrolowanie opuszcza przodostopie — to właśnie to przetoczenie zawodzi przy opadaniu stopy. <b>Przetoczenie skokowe</b> (środkowa faza podporu): stopa spoczywa płasko, a podudzie obraca się do przodu nad stawem skokowym — przetoczenie niszczone przez sztywny staw skokowy. <b>Przetoczenie przodostopia</b> (końcowa faza podporu): pięta się unosi, a ciało przetacza się nad głowami kości śródstopia, podczas gdy łydka najpierw kontroluje, a potem napędza ruch. Utrata któregokolwiek z nich zmusza ciało do obejścia — a dokładnie to możesz włączyć w <a href=\"sandbox.html\">Gait Lab</a>.",
    "ls.s2h": "2 · Środkowa faza podporu — przetoczenie",
    "ls.s2p": "Teraz przetaczasz się w górę i ponad niemal wyprostowaną nogą, jak odwrócone wahadło. Noga jest najdłuższa, biodra najwyżej — więc siła reakcji podłoża na moment spada <em>poniżej</em> masy ciała. Kolano wróciło do wyprostu.",
    "ls.s3h": "3 · Odbicie",
    "ls.s3p": "Łydka odpala, a staw skokowy napędza Cię do przodu i w górę na palce. To <b>drugi szczyt</b> wykresu siły. To odbicie jest silnikiem chodu — większość napędu powstaje właśnie tutaj, pod koniec fazy podporu.",
    "ls.s4h": "4 · Oderwanie palców",
    "ls.s4p": "Palce opuszczają podłoże, a siła reakcji spada do <b>zera</b> — ta noga teraz leci. Przez następną jedną trzecią cyklu nie przenosi żadnego obciążenia; musi tylko przemachnąć się do przodu i przygotować do lądowania.",
    "ls.s5h": "5 · Wymach — omiń podłogę",
    "ls.s5p": "Oto <b>duże</b> zgięcie kolana — do ~60°. Bez podłoża, na którym można się odepchnąć, jedynym zadaniem jest złożenie nogi tak, by stopa nie zahaczyła. Krótsza, złożona noga to także szybsze wahadło, więc sprawnie wymachuje do przodu.",
    "ls.s6h": "6 · Sięganie po następny krok",
    "ls.s6p": "Kolano się prostuje, a noga sięga do przodu, hamując tak, by pięta mogła miękko wylądować. W chwili zetknięcia z podłożem pętla zaczyna się od nowa — a <em>druga</em> noga robi to wszystko dokładnie pół cyklu z tyłu.",
    "ls.s7h": "Teraz Ty prowadzisz",
    "ls.s7p": "To jeden krok. Przejdź od razu do dowolnego momentu — <button class=\"goto\" data-goto=\"6\">przyjęcie obciążenia</button> <button class=\"goto\" data-goto=\"30\">środek podporu</button> <button class=\"goto\" data-goto=\"50\">odbicie</button> <button class=\"goto\" data-goto=\"73\">wymach</button> — albo sam przewiń cały cykl i patrz, jak siła i kolano poruszają się razem:",
    "ls.s7hint": "Chcesz tych samych danych jako wykresy, cząstki fizyki lub prawdziwe ciało 3-D? Wypróbuj <a href=\"explorer.html#explorer\">Eksplorator</a>, <a href=\"lab.html\">Kuźnię</a> lub <a href=\"gait3d.html\">Prawdziwy chód</a>.",

    // === Gait Lab (sandbox) ===
    "sb.label": "Przyczyna i kompensacja",
    "sb.title": "Gait Lab",
    "sb.sub": "Zdrowy chód to łańcuch precyzyjnie zgranych w czasie zdarzeń — a gdy jedno ogniwo słabnie, ciało improwizuje. Włącz <b>deficyt</b> i patrz, jak zmienia się chód: cień to typowy chód, a pełna postać to <b>ta sama osoba radząca sobie z problemem</b>. Klasyczne kompensacje pokazane tutaj to dokładnie to, czego klinicyści szukają w badaniu chodu.",
    "sb.ghost": "pokaż typowy chód (cień)",
    "sb.primary": "Deficyt pierwotny",
    "sb.comp": "Kompensacja, którą widzisz",
    "sb.severity": "Nasilenie",
    "sb.note": "Uproszczenie dydaktyczne w płaszczyźnie strzałkowej (z boku): deficyt pierwotny i jego główne kompensacje są modelowane na kinematyce chodu. <b>Jeden ważny wzorzec jest tu z założenia nieobecny:</b> chód <b>Trendelenburga</b> przy osłabionych odwodzicielach biodra — gdy miednica opada po stronie <em>wymachowej</em>, albo tułów przechyla się nad biodrem podporowym, by je odciążyć — zachodzi w płaszczyźnie czołowej i po prostu nie da się go narysować z ujęcia bocznego. To prawdopodobnie odchylenie, o które studentów fizjoterapii pyta się najczęściej, więc zobacz je w 3-D na stronie <a href=\"sls.html\">Kontrola kolana</a>, gdzie opadanie miednicy jest modelowane bezpośrednio. To samo dotyczy zataczania łuku. Oparte na Perry i Burnfield, <em>Gait Analysis: Normal and Pathological Function</em> (wyd. 2). Nie jest narzędziem diagnostycznym.",

    // === Knee Control (single-leg squat) ===
    "sl.label": "Kontrola w płaszczyźnie czołowej",
    "sl.title": "Przysiad na jednej nodze",
    "sl.sub": "Stań na jednej nodze i powoli wykonaj przysiad. Brzmi banalnie, ale to jeden z najbardziej ujawniających testów w medycynie sportowej: pokazuje, czy biodro, kolano i tułów pozostają <b>ustawione w osi i kontrolowane</b> — czy też kolano zapada się do środka w <b>dynamiczną koślawość</b>. Przeciągnij suwak kontroli i patrz, jak pojawia się zapadanie.",
    "sl.disclaimer": "⚠️ Poglądowe demo syntetyczne — ruch tutaj jest wygenerowany z wyidealizowanych krzywych, aby <b>nauczyć wzorca</b>. To <b>nie</b> są prawdziwe dane badawcze i <b>nie</b> jest to ocena kliniczna.",
    "sl.mode.syn": "Model syntetyczny",
    "sl.mode.real": "Prawdziwe nagranie OpenCap 🎥",
    "sl.hint": "przeciągnij, by obracać · przewiń, by przybliżyć",
    "sl.p.good": "Dobra kontrola",
    "sl.p.mod": "Umiarkowana",
    "sl.p.collapse": "Zapadnięcie w koślawość",
    "sl.real.h": "Prawdziwe nagranie bezmarkerowe",
    "sl.real.p": "To są <b>prawdziwe pozycje stawów 3D</b> z nagrania OpenCap — dwa filmy z telefonu zamienione w ruchomy szkielet — pokazane jako <b>zanonimizowana próbka pilotażowa</b> (przysiad na jednej nodze, podpór na lewej). Jest tu po to, by pokazać, <em>jak wygląda surowy ruch</em>, więc nie pokazujemy żadnych metryk ani interpretacji. Zauważ, że noga podporowa (ustawiona) śledzona jest czysto, a noga uniesiona jest bardziej zaszumiona — to rzeczywiste ograniczenie nagrywania bezmarkerowego na przysłoniętej kończynie.",
    "sl.ctrl": "Kontrola ruchu",
    "sl.speed": "Prędkość przysiadu",
    "sl.c1h": "Czym jest „dynamiczna koślawość kolana”",
    "sl.c1p": "Obserwuj kolano względem przerywanej linii biegnącej od biodra do stopy. Przy dobrej kontroli podąża ono nad stopą. Przy słabej kontroli dryfuje <b>przyśrodkowo</b> — do wewnątrz, w stronę drugiej nogi — gdy biodro rotuje i przywodzi. To ustawienie kolana do wewnątrz, w połączeniu z opadniętą miednicą i pochylonym tułowiem, to wzorzec wiązany w literaturze z wyższym ryzykiem urazu kolana (ACL, ból rzepkowo-udowy).",
    "sl.c2h": "Trzy rzeczy, które to zdradzają",
    "sl.c2p": "Klinicyści i biomechanicy nie oceniają tego tylko na oko — kwantyfikują to: <b>przyśrodkowe przesunięcie kolana / kąt projekcji w płaszczyźnie czołowej</b>, <b>przeciwstronne opadanie miednicy</b> (obniżenie drugiego biodra) oraz <b>pochylenie tułowia</b>. Wszystkie trzy zwykle narastają razem, gdy kontrola zawodzi, i wszystkie trzy są widoczne od przodu. Przesuń kontrolę i patrz, jak trzy liczby rosną razem.",
    "sl.c3h": "Jak mierzy to OpenCap",
    "sl.c3p": "Tradycyjnie wymaga to laboratorium z markerami. <a href=\"https://www.opencap.ai/\" target=\"_blank\" rel=\"noopener\">OpenCap</a> robi to z <b>dwóch zwykłych filmów z telefonu</b>: estymuje punkty kluczowe ciała, trianguluje je do 3D i dopasowuje pełny model mięśniowo-szkieletowy (Uhlrich, Falisse i in., 2023) — dając te same kąty biodra/kolana/tułowia co laboratorium, z telefonu. To właśnie sprawia, że taki przesiew jest skalowalny poza laboratorium.",
    "sl.note": "Kąty, opadanie miednicy i pochylenie tułowia są tutaj <b>syntetyczne i wyidealizowane</b> dla celów dydaktycznych, nie są pomiarami żadnej osoby. Nazwy metryk (przyśrodkowe przesunięcie kolana, kąt projekcji w płaszczyźnie czołowej, opadanie miednicy, pochylenie tułowia) odwzorowują to, co oblicza prawdziwy pipeline OpenCap dla przysiadu na jednej nodze, ale wszelkie pokazane progi są poglądowe i nie stanowią granicy diagnostycznej. To nie porada medyczna.",

    // === Muscle Dyno ===
    "dy.label": "Jak mięsień wytwarza siłę",
    "dy.title": "Muscle Dyno",
    "dy.sub": "Siła mięśnia nie jest stałą liczbą — zależy od tego, <b>jak długi jest</b> i <b>jak szybko zmienia długość</b>. Przeciągaj suwaki i obserwuj dwie zasady, które wbija Ci do głowy każdy podręcznik kinezjologii: krzywą <b>długość–napięcie</b> i krzywą <b>siła–prędkość</b>. Haczyk: <b>sam model mięśnia działa jako prawdziwy Ruby w Twojej przeglądarce</b>, skompilowany do WebAssembly.",
    "dy.lt": "Długość–napięcie",
    "dy.fv": "Siła–prędkość i moc",
    "dy.sarco": "Zachodzenie sarkomeru",
    "dy.s.len": "Długość mięśnia",
    "dy.s.vel": "Prędkość skurczu",
    "dy.s.act": "Aktywacja",
    "dy.code.h": "Fizjologia, jako Ruby",
    "dy.code.badge": "dokładnie ten kod oblicza Twój punkt pracy",
    "dy.c1h": "Długość–napięcie: chodzi o zachodzenie",
    "dy.c1p": "Siła czynna pochodzi z główek miozyny ciągnących aktynę. Zbyt <b>krótki</b> — i filamenty wciskają się w siebie; zbyt <b>długi</b> — i ledwo się zachodzą — w obu przypadkach mniej pracujących mostków poprzecznych, mniej siły. Szczyt siły przypada na <b>długość optymalną (L₀)</b>. Poza nią rozciągnięta tkanka łączna dodaje napięcie <b>bierne</b> (rosnący ogon). <em>Neumann; Nordin i Frankel.</em>",
    "dy.c2h": "Siła–prędkość: wolno znaczy mocno, ekscentrycznie jeszcze mocniej",
    "dy.c2p": "Skracaj szybko, a siła się załamuje (hiperbola Hilla) — dlatego nie da się szybko podnieść dużego ciężaru. Ale <b>wydłużanie</b> pod obciążeniem (ekscentryczne) wytwarza <em>więcej</em> siły niż utrzymywanie w bezruchu, przy mniejszym wysiłku. Zauważ, że <b>moc</b> (siła × prędkość) osiąga szczyt przy pośredniej prędkości — to podstawa treningu z obciążeniem optymalnym. <em>Enoka; Hill 1938.</em>",
    "dy.c3h": "Dlaczego obchodzi to klinicystę",
    "dy.c3p": "Manualne testowanie mięśni i wzmacnianie zależą od <b>kąta stawu</b>, ponieważ kąt ustala długość mięśnia — a jak pokazuje strona <a href=\"muscle.html\">Dźwignie</a>, kąt ustala też ramię momentu. Mięsień testowany w skróconym zakresie może wypaść słabo, nawet będąc całkowicie zdrowym. Programy obciążeń ekscentrycznych (protokół Alfredsona w tendinopatii ścięgna Achillesa, Nordic curl dla mięśni kulszowo-goleniowych) są rzeczywiście skuteczne, ale uważaj <em>dlaczego</em>: nie chodzi po prostu o to, że „siła ekscentryczna jest największa”. Lepiej udokumentowane wyjaśnienia to przebudowa ścięgna pod wpływem długotrwałego obciążenia mechanicznego oraz — w przypadku mięśni kulszowo-goleniowych — wydłużenie <b>pęczków mięśniowych</b>, które przesuwa całą krzywą długość–napięcie tak, że szczyt siły powstaje przy <em>większej</em> długości mięśnia, czyli dokładnie tam, gdzie dochodzi do urazu. Pozycja to nie szczegół — to cała krzywa.",
    "dy.note": "Znormalizowany model typu Hilla do celów dydaktycznych (siła w wielokrotnościach maksymalnej siły izometrycznej F₀, prędkość w wielokrotnościach V_max). Kształty krzywych odpowiadają klasycznym zależnościom długość–napięcie i siła–prędkość; dokładne liczby są poglądowe. <b>Jedno uczciwe zastrzeżenie co do strony ekscentrycznej:</b> ta krzywa osiąga plateau w okolicy 1,6&nbsp;F₀, co odpowiada zachowaniu izolowanego mięśnia — ale osoba napinająca mięsień <em>dowolnie</em> zwykle nie jest w stanie tego wyrazić i osiąga tylko nieco powyżej swojego maksimum izometrycznego, ponieważ ogranicza to układ nerwowy. Sama różnica między tym, co mięsień potrafi, a tym, o co potrafisz go świadomie poprosić, jest realnym zjawiskiem. Silnik Ruby pobiera jednorazowo ~16&nbsp;MB; jeśli nie może się załadować, identyczny model JavaScript przejmuje rolę, więc strona nadal działa.",

    // === Landing page ===
    "lp.badge": "Interaktywna biomechanika",
    "lp.title1": "MOTION",
    "lp.title2": "LAB",
    "lp.sub": "Dziesięć stacji mapujących mechanikę ludzkiego ciała — od pojedynczego kroku po ciśnienie wewnątrz krążka lędźwiowego. Rzeczywiste dane pomiarowe, stworzone do <b>eksperymentowania</b>.",
    "lp.cta.map": "Otwórz mapę",
    "lp.cta.new": "Jesteś tu nowy? Zacznij od kroku →",
    "lp.scroll": "Przewiń",
    "lp.map.label": "Mapa stacji",
    "lp.map.title": "Wybierz, gdzie wylądować",
    "lp.map.lead": "Każdy panel poniżej działa na żywo — wszystkie używają tych samych danych i tego samego silnika co stacja, którą otwierają.",
    "lp.path.label": "Sugerowana trasa",
    "lp.path.title": "Jeśli uczysz z tego materiału",
    "lp.eng.title": "A propos tego gwiezdnego tła",
    "lp.eng.body": "Gwiazdy dryfujące za tytułem i satelity krążące pomiędzy nimi to nie animacja CSS. To <b>prawdziwe orbity newtonowskie</b>, całkowane w każdej klatce przez moduł WebAssembly, który został <b>złożony ręcznie, bajt po bajcie</b> — nagłówki sekcji LEB128, instrukcja po instrukcji — bez kompilatora i bez żadnych narzędzi w całym procesie. Ma <b id=\"engineBytes\">780</b> bajtów, osadzonych bezpośrednio w stronie, więc drzwi wejściowe nie mają czego pobierać ani co mogłoby zawieść. Prędkości wyliczane są z <span class=\"lp-mono\">v = √(GM/r)</span>; nie ma tam ani jednej funkcji trygonometrycznej.",
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
    "how.note": "<b>Chód i bieg to dane pomiarowe</b> — rzeczywiste siły, kąty i EMG z otwartych zbiorów danych zdrowych osób dorosłych. <b>Skok i przysiad to rekonstrukcje</b> na podstawie klasycznej literatury. Każda krzywa jest <b>średnią grupową</b> (zobacz <a href=\"#sources\">Źródła</a>): ma uczyć wzorca, a nie opisywać konkretną osobę.",
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
    "sources.lead": "<b>Chód i bieg opierają się na rzeczywistych danych pomiarowych.</b> Siły reakcji podłoża i kąty stawowe to średnie z otwartych zbiorów Fukuchiego; aktywacja mięśni została obliczona z surowego EMG z otwartych zbiorów Santuza (ponad 25 000 cykli chodu). <b>Skok z zamachem i przysiad to poglądowe rekonstrukcje</b> oparte na klasycznej literaturze wymienionej poniżej — plakietka źródła przy każdym wykresie mówi, na co właśnie patrzysz.",
    "sources.g.measured": "Dane pomiarowe napędzające tę stronę",
    "sources.g.texts": "Podręczniki i prace stojące za rekonstrukcjami i objaśnieniami",

    // lab.html (The Forge)
    "lab.label": "Te same dane, inna fizyka",
    "lab.title": "Kuźnia",
    "lab.sub": "Tu nie ma osi wykresów. Siła reakcji podłoża zostaje wyrzucona jako prawdziwy rozprysk cząstek — symulowany przez <b>Rapier2D</b>, silnik fizyki ciał sztywnych napisany w Rust i uruchamiany w przeglądarce jako WebAssembly — więc większa siła <em>dosłownie</em> odrzuca materię dalej pod działaniem prawdziwej grawitacji i oporu. Aktywacja mięśni unosi się znad każdego brzuśca mięśnia jak żarzące się iskry, jaśniejsze i gęstsze im ciężej pracuje dany mięsień. Te same oparte na literaturze krzywe co na stronie <a href=\"explorer.html#explorer\">Eksplorator</a>, przedstawione jako siły działające na obiekty, a nie linie na wykresie.",
    "lab.status": "ładowanie silnika fizyki…",
    "lab.note": "Wysokość i gęstość rozprysku cząstek to bezpośrednie, dosłowne odwzorowanie chwilowej krzywej siły reakcji podłoża — nic tu nie jest animowane ręcznie. Zobacz <a href=\"explorer.html#sources\">Źródła</a>, na czym oparte są krzywe.",

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
    "gx.c2.p": "Kąty stawowe mówią, jak zginają się kończyny, ale nie gdzie ciało <em>znajduje się</em> w przestrzeni — tego ruchu miednicy nie ma w danych kątowych. Dlatego chód odtworzono z użyciem <b>blokowania stopy</b>: stopa w kontakcie zostaje przypięta do podłoża, a ciało jest nad nią przenoszone. Kamera podąża za postacią, więc wydaje się ona w miejscu, podczas gdy podłoże przesuwa się obok, a stopy pozostają realnie oparte.",
    "gx.c2.small": "<b>Gdzie ta rekonstrukcja zawodzi — i dlaczego warto to wiedzieć.</b> Blokowanie stopy daje około <b>0,8&nbsp;m przemieszczenia na cykl chodu</b>, podczas gdy dorosły idący z tą prędkością pokonuje realnie około <b>1,4&nbsp;m</b> na cykl. Brakująca połowa bierze się ze wszystkiego, co <em>nie jest</em> strzałkowym kątem biodra, kolana czy stawu skokowego: z rotacji miednicy w płaszczyźnie poprzecznej, z pochylenia i opadania miednicy oraz ze sposobu, w jaki stopa przetacza się od pięty do palców, zamiast obracać się wokół punktu. Same kąty strzałkowe nigdy nie odtworzą długości cyklu — i właśnie dlatego pracownie chodu mierzą także miednicę. Traktuj prędkość postępu jako poglądową; częścią zmierzoną są <b>kąty stawowe</b>.",
    "gx.c2.small2": "Samo ciało to typowy oszkieletowany manekin (three.js „Xbot”). <b>Dane</b>, które nim sterują, są prawdziwe; siatka to tylko płótno. Tylko płaszczyzna strzałkowa. Zwróć też uwagę, że średnia z 42 osób łączy 24 młodych i 18 starszych dorosłych, jest więc złożeniem dwóch grup wiekowych, a nie obrazem pojedynczego chodu.",
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
