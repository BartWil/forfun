// stations.js: the single source of truth for what BioLab Play contains and what
// each station is allowed to claim.
//
// Every station carries a SCIENTIFIC CONTRACT. The contract is not decoration. It
// states, in the author's own words and before a reader asks:
//
//   measured        numbers that came off an instrument, and whose
//   calculated      numbers derived from those by arithmetic we show
//   modelled        numbers that came from an assumption, not an instrument
//   assumptions     what has to be true for the page to mean anything
//   cannotConclude  the questions this station CANNOT answer, however tempting
//   primarySources  what to read to check us
//
// `cannotConclude` is the important one. Every scientific error found in review so
// far would have been caught by writing that field honestly first, so it is a
// required field and the test suite fails the build if it is empty.
//
// Track and level live HERE and nowhere else, so the catalogue and the contract can
// never drift apart.
//
// Consumed by contract-panel.js (renders the panel) and by tests/science.test.mjs
// (checks the contract is complete and that the data obeys it).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.STATIONS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TRACKS = {
    movement: {
      en: "Movement", pl: "Ruch",
      d: { en: "What bodies actually do: walking, running, jumping, squatting.",
           pl: "Co ciała rzeczywiście robią: chód, bieg, skok, przysiad." },
      colour: "#5eead4",
    },
    forces: {
      en: "Forces & Mechanics", pl: "Siły i mechanika",
      d: { en: "Why they do it: levers, moments, muscle mechanics, inverse dynamics.",
           pl: "Dlaczego to robią: dźwignie, momenty, mechanika mięśnia, dynamika odwrotna." },
      colour: "#ff6f5e",
    },
    measurement: {
      en: "Measurement", pl: "Pomiar",
      d: { en: "Where the numbers come from, and how far you can trust them.",
           pl: "Skąd biorą się liczby i na ile można im ufać." },
      colour: "#7c9bff",
    },
    clinical: {
      en: "Clinical interpretation", pl: "Interpretacja kliniczna",
      d: { en: "Reading movement in a person, and the limits of doing so.",
           pl: "Odczytywanie ruchu u człowieka i granice tego odczytu." },
      colour: "#ffd166",
    },
  };

  // status: "verified"   numbers traceable to an open dataset or a cited measurement
  //         "reconstructed" shapes taken from the literature, values illustrative
  //         "synthetic"  generated to teach a pattern, not measured at all
  //         "reference"  no data claims; definitions or standards
  const S = [

    // ---------------------------------------------------------------- movement
    {
      id: "explorer", page: "explorer.html", icon: "🔬", track: "movement",
      route: { order: 3, why: { en: "put numbers on it, and compare walking against running and jumping", pl: "przypisz temu liczby i porównaj chód z biegiem oraz skokiem" } },
      level: "beginner", status: "verified", prerequisites: [],
      title: { en: "Explorer", pl: "Eksplorator" },
      blurb: { en: "Four movements, three signals, one cycle. The place to start.",
               pl: "Cztery ruchy, trzy sygnały, jeden cykl. Miejsce na start." },
      contract: {
        learningGoal: {
          en: "Read a gait cycle: recognise the double-hump force trace, the joint angles that go with it, and when each muscle group fires.",
          pl: "Odczytać cykl chodu: rozpoznać dwugarbny przebieg siły, towarzyszące mu kąty stawowe i moment włączania się każdej grupy mięśniowej." },
        measured: [
          { en: "Vertical ground reaction force and sagittal hip, knee and ankle angles for walking and running (Fukuchi open datasets, 42 and 39 adults)",
            pl: "Pionowa siła reakcji podłoża oraz strzałkowe kąty biodra, kolana i stawu skokowego dla chodu i biegu (otwarte zbiory Fukuchiego, 42 i 39 osób dorosłych)" },
          { en: "Muscle activation envelopes for walking and running, computed here from raw EMG (Santuz open datasets, over 25,000 cycles)",
            pl: "Obwiednie aktywacji mięśni dla chodu i biegu, obliczone tutaj z surowego EMG (otwarte zbiory Santuza, ponad 25 000 cykli)" },
        ],
        calculated: [
          { en: "EMG envelopes: high-pass, full-wave rectification, low-pass envelope, per-muscle normalisation, time normalisation, averaging across cycles",
            pl: "Obwiednie EMG: filtr górnoprzepustowy, prostowanie pełnookresowe, obwiednia dolnoprzepustowa, normalizacja per mięsień, normalizacja czasu, uśrednianie po cyklach" },
          { en: "Speed interpolation between the three measured speeds",
            pl: "Interpolacja prędkości pomiędzy trzema zmierzonymi prędkościami" },
        ],
        modelled: [
          { en: "The countermovement jump and the squat, reconstructed from the classic literature rather than measured",
            pl: "Skok z zamachem i przysiad, odtworzone z klasycznej literatury, a nie zmierzone" },
          { en: "The stick figure: a single-limb sagittal abstraction with a fixed hip, not a whole-body simulation",
            pl: "Postać patykowa: uproszczenie jednej kończyny w płaszczyźnie strzałkowej z nieruchomym biodrem, a nie symulacja całego ciała" },
        ],
        assumptions: [
          { en: "Every curve is a group average, so it shows the shape of a pattern rather than any individual",
            pl: "Każda krzywa jest średnią grupową, więc pokazuje kształt wzorca, a nie konkretną osobę" },
          { en: "The walking average pools 24 younger and 18 older adults",
            pl: "Średnia dla chodu łączy 24 młodszych i 18 starszych dorosłych" },
        ],
        cannotConclude: [
          { en: "How hard a muscle is working. Every muscle is normalised to its own peak, so the height is timing, not effort.",
            pl: "Jak mocno pracuje mięsień. Każdy mięsień jest znormalizowany do własnego szczytu, więc wysokość to czas, a nie wysiłek." },
          { en: "Which of two muscles works harder. Surface EMG amplitude is not comparable between muscles.",
            pl: "Który z dwóch mięśni pracuje ciężej. Amplitudy powierzchniowego EMG nie da się porównywać między mięśniami." },
          { en: "How much load a joint carries. Ground reaction force is an external force, not joint load.",
            pl: "Jak duże obciążenie przenosi staw. Siła reakcji podłoża jest siłą zewnętrzną, a nie obciążeniem stawu." },
          { en: "Whether any individual is normal or abnormal.",
            pl: "Czy konkretna osoba jest w normie, czy poza nią." },
        ],
        primarySources: [
          { cite: "Fukuchi CA et al. PeerJ 6:e4640, 2018", url: "https://doi.org/10.7717/peerj.4640" },
          { cite: "Fukuchi RK et al. PeerJ 5:e3298, 2017", url: "https://doi.org/10.7717/peerj.3298" },
          { cite: "Santuz A et al. Zenodo 1254380 / 5171823", url: "https://doi.org/10.5281/zenodo.1254380" },
        ],
      },
    },
    {
      id: "lesson", page: "lesson.html", icon: "📖", track: "movement",
      route: { order: 1, why: { en: "build the vocabulary: phases, rockers, what a gait cycle even is", pl: "zbuduj słownictwo: fazy, przetoczenia, czym w ogóle jest cykl chodu" } },
      level: "beginner", status: "verified", prerequisites: [],
      title: { en: "Anatomy of a Step", pl: "Anatomia kroku" },
      blurb: { en: "One walking step, narrated phase by phase as you scroll.",
               pl: "Jeden krok, opowiedziany faza po fazie w miarę przewijania." },
      contract: {
        learningGoal: {
          en: "Name the phases of one gait cycle and say what the force trace and the knee are doing in each.",
          pl: "Nazwać fazy jednego cyklu chodu i powiedzieć, co w każdej z nich robi przebieg siły i kolano." },
        measured: [{ en: "Walking force and knee angle, from the same Fukuchi dataset as the Explorer",
                     pl: "Siła i kąt kolana w chodzie, z tego samego zbioru Fukuchiego co w Eksploratorze" }],
        calculated: [{ en: "Phase boundaries placed at the measured events in that dataset",
                       pl: "Granice faz umieszczone na zmierzonych zdarzeniach w tym zbiorze" }],
        modelled: [{ en: "The three-rocker description, which is Perry's teaching framework laid over the data",
                     pl: "Opis trzech przetoczeń, czyli dydaktyczny schemat Perry nałożony na dane" }],
        assumptions: [{ en: "Comfortable-speed level walking in healthy adults",
                        pl: "Chód po płaskim w komfortowym tempie u zdrowych dorosłych" }],
        cannotConclude: [
          { en: "That any individual's phases fall at these percentages. Phase timing varies with speed, age and pathology.",
            pl: "Że fazy u konkretnej osoby wypadają na tych procentach. Ich rozkład zmienia się z prędkością, wiekiem i patologią." },
          { en: "Anything about the frontal plane. This is a side-on view only.",
            pl: "Czegokolwiek o płaszczyźnie czołowej. To wyłącznie widok z boku." },
        ],
        primarySources: [
          { cite: "Perry J, Burnfield JM. Gait Analysis, 2nd ed., 2010", url: "" },
          { cite: "Fukuchi CA et al. PeerJ 6:e4640, 2018", url: "https://doi.org/10.7717/peerj.4640" },
        ],
      },
    },
    {
      id: "gait3d", page: "gait3d.html", icon: "🚶", track: "movement",
      level: "intermediate", status: "verified", prerequisites: ["explorer"],
      title: { en: "Real Gait", pl: "Prawdziwy chód" },
      blurb: { en: "A rigged body walking on measured motion-capture angles.",
               pl: "Oszkieletowana postać chodząca na zmierzonych kątach z motion capture." },
      contract: {
        learningGoal: {
          en: "See measured joint angles drive a real body, and understand why sagittal angles alone cannot reproduce how far it travels.",
          pl: "Zobaczyć, jak zmierzone kąty stawowe napędzają realne ciało, i zrozumieć, dlaczego same kąty strzałkowe nie odtworzą pokonanego dystansu." },
        measured: [{ en: "Grand-average sagittal hip, knee and ankle angles, 42 adults, 84 gait curves",
                     pl: "Uśrednione strzałkowe kąty biodra, kolana i stawu skokowego, 42 osoby dorosłe, 84 krzywe chodu" }],
        calculated: [{ en: "Retargeting of those angles onto the skeleton, and foot-locking to carry the body forward",
                       pl: "Przeniesienie tych kątów na szkielet oraz blokowanie stopy przenoszące ciało do przodu" }],
        modelled: [
          { en: "Forward progression. Foot-locking gives about 0.8 m per cycle against roughly 1.4 m in reality.",
            pl: "Postęp do przodu. Blokowanie stopy daje około 0,8 m na cykl wobec realnych około 1,4 m." },
          { en: "The mesh itself, a generic mannequin with no relation to any subject",
            pl: "Sama siatka, typowy manekin bez związku z żadnym badanym" },
        ],
        assumptions: [{ en: "Sagittal plane only; pelvic rotation, tilt and list are absent from the data",
                        pl: "Wyłącznie płaszczyzna strzałkowa; rotacji, pochylenia i opadania miednicy nie ma w danych" }],
        cannotConclude: [
          { en: "Stride length or walking speed. Those come from the missing pelvic motion, not from the joint angles shown.",
            pl: "Długości cyklu ani prędkości chodu. Wynikają one z brakującego ruchu miednicy, a nie z pokazanych kątów." },
          { en: "Anything about one walker. The average pools two age groups.",
            pl: "Czegokolwiek o jednym chodzącym. Średnia łączy dwie grupy wiekowe." },
        ],
        primarySources: [{ cite: "Fukuchi CA et al. PeerJ 6:e4640, 2018", url: "https://doi.org/10.7717/peerj.4640" }],
      },
    },
    {
      id: "body3d", page: "body3d.html", icon: "🦴", track: "movement",
      level: "intermediate", status: "verified", prerequisites: ["explorer"],
      title: { en: "The Anatomy", pl: "Anatomia" },
      blurb: { en: "A 3D figure whose muscles light up with real activation.",
               pl: "Postać 3D, której mięśnie rozświetlają się rzeczywistą aktywacją." },
      contract: {
        learningGoal: {
          en: "Connect a muscle's name and position to when in the cycle it is busiest.",
          pl: "Powiązać nazwę i położenie mięśnia z momentem cyklu, w którym pracuje najintensywniej." },
        measured: [{ en: "The same EMG envelopes and joint angles as the Explorer",
                     pl: "Te same obwiednie EMG i kąty stawowe co w Eksploratorze" }],
        calculated: [{ en: "Colour mapping from each muscle's own normalised activation",
                       pl: "Odwzorowanie koloru z własnej znormalizowanej aktywacji każdego mięśnia" }],
        modelled: [{ en: "Bone and muscle volumes are stylised procedural shapes, not anatomical meshes",
                     pl: "Bryły kości i mięśni to stylizowane kształty proceduralne, a nie siatki anatomiczne" }],
        assumptions: [{ en: "Each muscle is scaled to its own peak, so colour is within-muscle timing",
                        pl: "Każdy mięsień jest skalowany do własnego szczytu, więc kolor to czas w obrębie mięśnia" }],
        cannotConclude: [
          { en: "That a redder muscle is stronger or working harder than a less red one. The scales are independent.",
            pl: "Że bardziej czerwony mięsień jest silniejszy albo pracuje ciężej niż mniej czerwony. Skale są niezależne." },
          { en: "Muscle force. EMG is an electrical signal, not a force measurement.",
            pl: "Siły mięśnia. EMG to sygnał elektryczny, a nie pomiar siły." },
        ],
        primarySources: [{ cite: "Santuz A et al. Zenodo 1254380 / 5171823", url: "https://doi.org/10.5281/zenodo.1254380" }],
      },
    },
    {
      id: "lab", page: "lab.html", icon: "⚡", track: "movement",
      level: "beginner", status: "verified", prerequisites: [],
      title: { en: "The Forge", pl: "Kuźnia" },
      blurb: { en: "The same forces, thrown as real physics particles.",
               pl: "Te same siły, wyrzucane jako prawdziwe cząstki fizyczne." },
      contract: {
        learningGoal: {
          en: "Feel the size of the ground reaction force by watching it move matter instead of reading it off an axis.",
          pl: "Poczuć wielkość siły reakcji podłoża, patrząc, jak porusza materię, zamiast odczytywać ją z osi." },
        measured: [{ en: "The instantaneous ground reaction force driving the spray",
                     pl: "Chwilowa siła reakcji podłoża napędzająca rozprysk" }],
        calculated: [{ en: "Particle motion, integrated by the Rapier2D rigid-body engine",
                       pl: "Ruch cząstek, całkowany przez silnik ciał sztywnych Rapier2D" }],
        modelled: [{ en: "The mapping from newtons to particle count and launch speed, chosen to read well",
                     pl: "Przełożenie niutonów na liczbę cząstek i prędkość wyrzutu, dobrane pod czytelność" }],
        assumptions: [{ en: "Particle height is proportional to force, not a physical quantity in itself",
                        pl: "Wysokość cząstek jest proporcjonalna do siły, a nie samodzielną wielkością fizyczną" }],
        cannotConclude: [
          { en: "Any numerical force value. Read the Explorer for numbers; this station is for intuition.",
            pl: "Żadnej liczbowej wartości siły. Po liczby sięgnij do Eksploratora; ta stacja służy intuicji." },
        ],
        primarySources: [{ cite: "Fukuchi CA et al. PeerJ 6:e4640, 2018", url: "https://doi.org/10.7717/peerj.4640" }],
      },
    },

    // ------------------------------------------------------ forces & mechanics
    {
      id: "physics", page: "physics.html", icon: "🍎", track: "forces",
      route: { order: 2, why: { en: "the mechanics everything else leans on, rebuilt from what a force is", pl: "mechanika, na której opiera się reszta, odbudowana od tego, czym jest siła" } },
      level: "beginner", status: "reference", prerequisites: [],
      title: { en: "Physics, from scratch", pl: "Fizyka od zera" },
      blurb: { en: "Newton's laws rebuilt for anyone who barely survived school physics.",
               pl: "Zasady dynamiki odbudowane dla każdego, kto ledwo przeżył fizykę w szkole." },
      contract: {
        learningGoal: {
          en: "Read a mechanics formula out loud, say what every symbol means and in what unit, and predict what happens when one of them changes.",
          pl: "Przeczytać wzór z mechaniki na głos, powiedzieć, co oznacza każdy symbol i w jakiej jednostce, oraz przewidzieć, co się stanie, gdy jeden z nich się zmieni." },
        measured: [],
        calculated: [
          { en: "Every number in every demo, computed live from the formula being taught. Weight from mass and gravity, acceleration from force and mass, moment from force and distance.",
            pl: "Każda liczba w każdej demonstracji, liczona na żywo z omawianego wzoru. Ciężar z masy i grawitacji, przyspieszenie z siły i masy, moment z siły i odległości." },
        ],
        modelled: [
          { en: "The illustrative bodies are idealised: no friction, no air resistance, rigid objects, forces applied at a single point. Real movement has all of these and this page deliberately does not.",
            pl: "Ciała na ilustracjach są wyidealizowane: bez tarcia, bez oporu powietrza, obiekty sztywne, siły przyłożone w jednym punkcie. Prawdziwy ruch ma to wszystko, a ta strona celowo nie ma." },
          { en: "The anatomical numbers used as examples, such as a 4 cm biceps moment arm, are round textbook values chosen to make the arithmetic legible. They are not measurements of any person.",
            pl: "Liczby anatomiczne użyte jako przykłady, takie jak 4 cm ramienia siły bicepsa, to zaokrąglone wartości podręcznikowe dobrane tak, by rachunek był czytelny. Nie są pomiarami żadnej osoby." },
        ],
        assumptions: [
          { en: "Newtonian mechanics, which is exact at the sizes and speeds a human body works at. Relativity and quantum mechanics are irrelevant here and are not mentioned.",
            pl: "Mechanika Newtona, dokładna przy rozmiarach i prędkościach, przy jakich pracuje ludzkie ciało. Teoria względności i mechanika kwantowa są tu nieistotne i nie są wspominane." },
          { en: "A gravitational field strength of 9.81 N/kg. Two distinct things share that symbol: standard gravity is fixed by convention at exactly 9.80665, while the local value varies by a few tenths of a percent with latitude and altitude. The page uses 9.81 as a convenient local value, not as a constant of nature.",
            pl: "Natężenie pola grawitacyjnego 9,81 N/kg. Ten symbol dzielą dwie różne rzeczy: przyspieszenie standardowe jest ustalone konwencjonalnie jako dokładnie 9,80665, natomiast wartość lokalna zmienia się o kilka dziesiątych procenta wraz z szerokością geograficzną i wysokością. Strona używa 9,81 jako wygodnej wartości lokalnej, a nie jako stałej przyrody." },
          { en: "Every worked example is one-dimensional, starts from rest, and holds mass and net force constant, with no friction or air resistance unless it says otherwise.",
            pl: "Każdy przykład rachunkowy jest jednowymiarowy, zaczyna się ze spoczynku i utrzymuje stałą masę oraz stałą siłę wypadkową, bez tarcia i oporu powietrza, o ile nie napisano inaczej." },
        ],
        cannotConclude: [
          { en: "Anything about a real person. There is no data on this page. Every number is an illustration chosen to make a relationship visible, not a measurement of a body.",
            pl: "Niczego o konkretnym człowieku. Na tej stronie nie ma danych. Każda liczba jest ilustracją dobraną tak, by uwidocznić zależność, a nie pomiarem ciała." },
          { en: "That a muscle force computed from a moment arm is the force that muscle actually produced. The real joint has many muscles crossing it, and sharing the load between them cannot be solved from mechanics alone.",
            pl: "Że siła mięśnia policzona z ramienia siły jest siłą, którą ten mięsień faktycznie wytworzył. Prawdziwy staw przekracza wiele mięśni, a podziału obciążenia między nie nie da się rozstrzygnąć samą mechaniką." },
          { en: "That frictionless examples describe walking. Friction is not a detail here; without it the third law gives you nothing to push against and locomotion stops being possible.",
            pl: "Że przykłady bez tarcia opisują chód. Tarcie nie jest tu szczegółem; bez niego trzecia zasada nie daje się od czego odepchnąć i lokomocja przestaje być możliwa." },
          { en: "That walking at a steady average speed means zero acceleration. The centre of mass speeds up and slows within every step; only the average over a stride is near zero. The constant-velocity demo uses a puck on ice for exactly this reason.",
            pl: "Że chód ze stałą prędkością średnią oznacza zerowe przyspieszenie. Środek masy przyspiesza i zwalnia wewnątrz każdego kroku; dopiero średnia z całego cyklu jest bliska zeru. Demonstracja ruchu jednostajnego używa krążka na lodzie dokładnie z tego powodu." },
          { en: "That a net force computed from mass and acceleration is the load on any particular joint or tissue. It is the total external force on the chosen body, and separating it into contributions needs inverse dynamics and further assumptions.",
            pl: "Że siła wypadkowa policzona z masy i przyspieszenia jest obciążeniem konkretnego stawu lub tkanki. To całkowita siła zewnętrzna działająca na wybrane ciało, a rozdzielenie jej na składowe wymaga dynamiki odwrotnej i dalszych założeń." },
        ],
        primarySources: [
          { cite: "Newton I. Philosophiae Naturalis Principia Mathematica, 1687", url: "" },
          { cite: "BIPM. The International System of Units (SI), 9th edition, 2019", url: "https://www.bipm.org/en/publications/si-brochure" },
          { cite: "Winter DA. Biomechanics and Motor Control of Human Movement, 4th ed., Wiley 2009", url: "" },
        ],
      },
    },
    {
      id: "muscle", page: "muscle.html", icon: "💪", track: "forces",
      route: { order: 4, why: { en: "why the forces inside a joint dwarf the load you are actually holding", pl: "dlaczego siły wewnątrz stawu są wielokrotnie większe od trzymanego ciężaru" } },
      level: "beginner", status: "reconstructed", prerequisites: [],
      title: { en: "Muscle Levers", pl: "Dźwignie mięśniowe" },
      blurb: { en: "Why holding 5 kg costs the biceps ten times that.",
               pl: "Dlaczego utrzymanie 5 kg kosztuje biceps dziesięć razy tyle." },
      contract: {
        learningGoal: {
          en: "Compute a joint torque as force times moment arm, and see why a short moment arm forces a large muscle force.",
          pl: "Obliczyć moment w stawie jako siłę razy ramię momentu i zobaczyć, dlaczego krótkie ramię wymusza dużą siłę mięśnia." },
        measured: [{ en: "Elbow flexor moment arms and physiological cross-sectional areas from cadaver specimens (Murray, Buchanan & Delp 2000)",
                     pl: "Ramiona momentu zginaczy łokcia i przekroje fizjologiczne z preparatów anatomicznych (Murray, Buchanan i Delp 2000)" }],
        calculated: [{ en: "Static torque balance, solved live from the sliders",
                       pl: "Statyczna równowaga momentów, rozwiązywana na bieżąco z suwaków" }],
        modelled: [{ en: "A single flexor pulling vertically on a horizontal forearm, with segment weights ignored",
                     pl: "Pojedynczy zginacz ciągnący pionowo na poziomym przedramieniu, z pominięciem ciężarów segmentów" }],
        assumptions: [
          { en: "Two-dimensional, static, one muscle",
            pl: "Dwuwymiarowo, statycznie, jeden mięsień" },
          { en: "Moment arms are held fixed while you drag, though in a real elbow they change with angle",
            pl: "Ramiona momentu są stałe podczas przeciągania, choć w realnym łokciu zmieniają się z kątem" },
        ],
        cannotConclude: [
          { en: "The actual force in your biceps. Elbow flexion is shared between at least three muscles with different moment arms.",
            pl: "Rzeczywistej siły w Twoim bicepsie. Zgięcie łokcia dzielą co najmniej trzy mięśnie o różnych ramionach momentu." },
          { en: "Joint contact force in a real elbow, which also depends on ligament and articular geometry.",
            pl: "Siły kontaktowej w realnym łokciu, która zależy też od więzadeł i geometrii stawu." },
        ],
        primarySources: [{ cite: "Murray WM, Buchanan TS, Delp SL. J Biomech 33:943-952, 2000", url: "" }],
      },
    },
    {
      id: "dyno", page: "dyno.html", icon: "🔬", track: "forces",
      route: { order: 5, why: { en: "the other half of the answer: why joint angle changes muscle strength", pl: "druga połowa odpowiedzi: dlaczego kąt stawu zmienia siłę mięśnia" } },
      level: "intermediate", status: "reconstructed", prerequisites: ["muscle"],
      title: { en: "Muscle Dyno", pl: "Dynamometr mięśniowy" },
      blurb: { en: "Length-tension and force-velocity, running as live Ruby.",
               pl: "Długość-napięcie i siła-prędkość, działające jako żywy Ruby." },
      contract: {
        learningGoal: {
          en: "Predict how a muscle's force changes with its length and its shortening velocity.",
          pl: "Przewidzieć, jak siła mięśnia zmienia się z jego długością i prędkością skracania." },
        measured: [],
        calculated: [{ en: "A normalised Hill-type model evaluated live, in Ruby compiled to WebAssembly",
                       pl: "Znormalizowany model typu Hilla liczony na bieżąco, w Ruby skompilowanym do WebAssembly" }],
        modelled: [{ en: "Every curve. Shapes follow the classic relationships; the exact numbers are illustrative.",
                     pl: "Każda krzywa. Kształty odpowiadają klasycznym zależnościom; dokładne liczby są poglądowe." }],
        assumptions: [
          { en: "A single fibre type, fully activated, with tendon compliance ignored",
            pl: "Jeden typ włókna, w pełni pobudzony, z pominięciem podatności ścięgna" },
          { en: "The eccentric plateau near 1.6 F0 is what isolated muscle does, not what a person can produce voluntarily",
            pl: "Plateau ekscentryczne w okolicy 1,6 F0 dotyczy mięśnia izolowanego, a nie tego, co człowiek wytworzy dowolnie" },
        ],
        cannotConclude: [
          { en: "Any absolute force in newtons. Everything is normalised to maximum isometric force.",
            pl: "Żadnej bezwzględnej siły w niutonach. Wszystko jest znormalizowane do maksymalnej siły izometrycznej." },
          { en: "That a clinical eccentric programme works because eccentric force is highest. The better-supported mechanisms are tendon remodelling and fascicle lengthening.",
            pl: "Że kliniczny program ekscentryczny działa dlatego, że siła ekscentryczna jest największa. Lepiej udokumentowane mechanizmy to przebudowa ścięgna i wydłużenie pęczków." },
        ],
        primarySources: [{ cite: "Hill AV. Proc R Soc Lond B, 1938", url: "" }],
      },
    },
    {
      id: "dynamics", page: "dynamics.html", icon: "🧮", track: "forces",
      route: { order: 6, why: { en: "run the second law backwards to get the moment inside a joint", pl: "uruchom drugą zasadę wstecz, by wyznaczyć moment wewnątrz stawu" } },
      level: "intermediate", status: "verified", prerequisites: ["muscle", "explorer"],
      title: { en: "Inverse Dynamics", pl: "Dynamika odwrotna" },
      blurb: { en: "Solve the joint moments yourself, from the floor up.",
               pl: "Rozwiąż momenty w stawach samodzielnie, od podłoża w górę." },
      contract: {
        learningGoal: {
          en: "Carry out a Newton-Euler inverse dynamics solution by hand, and say what a net joint moment does and does not contain.",
          pl: "Przeprowadzić rozwiązanie dynamiki odwrotnej metodą Newtona-Eulera i powiedzieć, co wypadkowy moment w stawie zawiera, a czego nie." },
        measured: [{ en: "Body segment parameters, quoted from Dempster via Winter and from Zatsiorsky-Seluyanov via de Leva",
                     pl: "Parametry segmentów ciała, przytoczone za Dempsterem wg Wintera oraz za Zatsiorskim-Sielujanowem wg de Levy" }],
        calculated: [{ en: "Every joint force and moment on screen, solved live and exactly for the posture you set",
                       pl: "Każda siła i każdy moment w stawie na ekranie, liczone na bieżąco i dokładnie dla ustawionej pozycji" }],
        modelled: [
          { en: "The postures and the ground reaction force. You choose them; they are not a measured trial.",
            pl: "Pozycje i siła reakcji podłoża. Wybierasz je sam; nie są zmierzoną próbą." },
          { en: "Segment parameters scaled linearly to your chosen mass and height",
            pl: "Parametry segmentów skalowane liniowo do wybranej masy i wzrostu" },
        ],
        assumptions: [
          { en: "Two-dimensional sagittal plane, rigid segments, frictionless pin joints",
            pl: "Dwuwymiarowa płaszczyzna strzałkowa, sztywne segmenty, bezcierne przeguby" },
          { en: "The ground applies no free moment at the centre of pressure, which is what lets the chain start",
            pl: "Podłoże nie przykłada momentu swobodnego w środku nacisku, co pozwala rozpocząć łańcuch" },
        ],
        cannotConclude: [
          { en: "Individual muscle forces. A net moment is the sum of everything crossing the joint and is blind to co-contraction.",
            pl: "Sił poszczególnych mięśni. Moment wypadkowy to suma wszystkiego, co przekracza staw, i jest ślepy na współskurcz." },
          { en: "Joint contact force, which needs a musculoskeletal model on top of this.",
            pl: "Siły kontaktowej w stawie, która wymaga nadbudowania modelu mięśniowo-szkieletowego." },
          { en: "That the postures shown came from a real person walking.",
            pl: "Że pokazane pozycje pochodzą od realnie idącego człowieka." },
        ],
        primarySources: [
          { cite: "Delp SL et al. IEEE Trans Biomed Eng 54:1940-1950, 2007", url: "https://doi.org/10.1109/TBME.2007.901024" },
          { cite: "de Leva P. J Biomech 29:1223-1230, 1996", url: "" },
          { cite: "Winter DA. Biomechanics and Motor Control of Human Movement, 4th ed., 2009", url: "" },
        ],
      },
    },

    // ------------------------------------------------------------- measurement
    {
      id: "isb", page: "isb.html", icon: "📐", track: "measurement",
      level: "intermediate", status: "reference", prerequisites: [],
      title: { en: "The ISB Standard", pl: "Standard ISB" },
      blurb: { en: "Why the same knee gives different numbers in different labs.",
               pl: "Dlaczego to samo kolano daje różne liczby w różnych pracowniach." },
      contract: {
        learningGoal: {
          en: "Explain why a joint angle is calculated rather than measured, and why rotation order changes the answer.",
          pl: "Wyjaśnić, dlaczego kąt w stawie jest obliczany, a nie mierzony, i dlaczego kolejność obrotów zmienia wynik." },
        measured: [],
        calculated: [{ en: "The rotation matrices and joint coordinate systems in the demos, computed from the published definitions",
                       pl: "Macierze obrotu i układy współrzędnych stawu w demonstracjach, liczone z opublikowanych definicji" }],
        modelled: [{ en: "All diagrams are drawn from the papers' textual definitions. The published figures are under copyright and are not reproduced.",
                     pl: "Wszystkie rysunki powstały ze słownych definicji z prac. Opublikowane ilustracje są objęte prawem autorskim i nie są powielane." }],
        assumptions: [{ en: "Rigid bones and ideal landmark placement, neither of which holds exactly in vivo",
                        pl: "Sztywne kości i idealne rozmieszczenie punktów kostnych, z których żadne nie zachodzi dokładnie in vivo" }],
        cannotConclude: [
          { en: "That following the standard makes a measurement accurate. It makes it comparable, which is a different thing.",
            pl: "Że stosowanie standardu czyni pomiar dokładnym. Czyni go porównywalnym, a to co innego." },
        ],
        primarySources: [
          { cite: "Wu G et al. J Biomech 35:543-548, 2002", url: "" },
          { cite: "Wu G et al. J Biomech 38:981-992, 2005", url: "" },
          { cite: "Grood ES, Suntay WJ. J Biomech Eng 105:136-144, 1983", url: "" },
        ],
      },
    },
    {
      id: "glossary", page: "glossary.html", icon: "📗", track: "measurement",
      level: "beginner", status: "reference", prerequisites: [],
      title: { en: "Glossary", pl: "Słownik pojęć" },
      blurb: { en: "Every term the rest of the site assumes you know.",
               pl: "Każde pojęcie, którego znajomość zakłada reszta serwisu." },
      contract: {
        learningGoal: {
          en: "Look up any term used on this site and see it illustrated rather than only defined.",
          pl: "Sprawdzić dowolne pojęcie używane w serwisie i zobaczyć je zilustrowane, a nie tylko zdefiniowane." },
        measured: [],
        calculated: [{ en: "The live illustrations, which run on the same data as the stations they explain",
                       pl: "Żywe ilustracje, działające na tych samych danych co objaśniane stacje" }],
        modelled: [{ en: "Definitions are written for teaching and trade some precision for clarity",
                     pl: "Definicje napisano dydaktycznie i wymieniono część precyzji na zrozumiałość" }],
        assumptions: [{ en: "Terms are used as in gait analysis and rehabilitation, which is not always how other fields use them",
                        pl: "Pojęcia stosowane jak w analizie chodu i rehabilitacji, co nie zawsze pokrywa się z innymi dziedzinami" }],
        cannotConclude: [
          { en: "That a definition here is a diagnostic criterion. None of them is.",
            pl: "Że definicja stąd jest kryterium diagnostycznym. Żadna nią nie jest." },
        ],
        primarySources: [{ cite: "See the annotated reading list on the page", url: "" }],
      },
    },

    {
      id: "emg", page: "emg.html", icon: "\u26a1", track: "measurement",
      example: {
        url: "emg.html?v=1&hp=50&lp=20&muscle=ta&mvc=0.1&norm=mvc&rectify=1&stage=5#normalize",
        why: { en: "The same recording reporting 159% of maximum. Nothing about the muscle changed.",
               pl: "Ten sam zapis raportujący 159% maksimum. W mięśniu nie zmieniło się nic." } },
      route: { order: 7, why: { en: "process a real muscle recording and watch how much of the answer was your choice", pl: "przetwórz prawdziwy zapis mięśnia i zobacz, ile z wyniku było Twoim wyborem" } },
      level: "beginner", status: "verified", prerequisites: [],
      title: { en: "EMG Lab", pl: "Laboratorium EMG" },
      blurb: { en: "Real unprocessed muscle electricity. Process it yourself and watch the answer move.",
               pl: "Prawdziwa, nieprzetworzona elektryczno\u015b\u0107 mi\u0119\u015bnia. Przetw\u00f3rz j\u0105 sam i patrz, jak zmienia si\u0119 wynik." },
      contract: {
        learningGoal: {
          en: "Take a raw EMG recording through filtering, rectification, enveloping and normalisation yourself, and say what the resulting number can and cannot support.",
          pl: "Samodzielnie przeprowadzi\u0107 surowy zapis EMG przez filtracj\u0119, prostowanie, obwiedni\u0119 i normalizacj\u0119 oraz powiedzie\u0107, co wynikowa liczba potwierdza, a czego nie." },
        measured: [
          { en: "8 s of raw, unprocessed surface EMG from tibialis anterior, gastrocnemius medialis and rectus femoris, 1000 Hz, one anonymised treadmill walking trial (Santuz et al. 2021, CC BY 4.0)",
            pl: "8 s surowego, nieprzetworzonego EMG powierzchniowego z piszczelowego przedniego, brzuchatego przy\u015brodkowego i prostego uda, 1000 Hz, jedna zanonimizowana pr\u00f3ba chodu na bie\u017cni (Santuz i wsp. 2021, CC BY 4.0)" },
          { en: "Touchdown times for the 8 gait cycles inside the excerpt, from the same dataset",
            pl: "Czasy kontaktu dla 8 cykli chodu w wycinku, z tego samego zbioru danych" }
        ],
        calculated: [
          { en: "Every processing step, run live in the browser: zero-phase Butterworth high-pass, full-wave rectification, low-pass envelope, peak-of-trial normalisation",
            pl: "Ka\u017cdy krok przetwarzania, liczony na bie\u017c\u0105co w przegl\u0105darce: zerofazowy filtr Butterwortha g\u00f3rnoprzepustowy, prostowanie pe\u0142nookresowe, obwiednia dolnoprzepustowa, normalizacja do szczytu pr\u00f3by" },
          { en: "RMS, the drop in mean-square signal power after filtering, and median frequency before and after, from a fast Fourier transform. All computed on the interior, with the filter edges excluded.",
            pl: "RMS, spadek mocy \u015bredniokwadratowej po filtracji oraz cz\u0119stotliwo\u015b\u0107 mediany przed i po, z szybkiej transformaty Fouriera. Wszystko liczone we wn\u0119trzu zapisu, z pomini\u0119ciem brzeg\u00f3w filtru." }
        ],
        modelled: [
          { en: "The MVC reference value only. No maximal voluntary contraction was recorded in this dataset, so it is a slider you set, labelled hypothetical wherever it appears.",
            pl: "Wy\u0142\u0105cznie warto\u015b\u0107 odniesienia MVC. W tym zbiorze nie zarejestrowano maksymalnego skurczu dowolnego, wi\u0119c jest to suwak ustawiany przez Ciebie, oznaczony wsz\u0119dzie jako hipotetyczny." }
        ],
        assumptions: [
          { en: "One trial from one participant. Nothing here is a group average.",
            pl: "Jedna pr\u00f3ba jednego uczestnika. Nic tutaj nie jest \u015bredni\u0105 grupow\u0105." },
          { en: "A fourth-order Butterworth applied forward and backward, the same design and application as the published pipeline. Checked against scipy and against the closed-form response on every test run.",
            pl: "Filtr Butterwortha czwartego rz\u0119du zastosowany w prz\u00f3d i wstecz, ta sama konstrukcja i spos\u00f3b u\u017cycia co w opublikowanym pipeline. Sprawdzany wzgl\u0119dem scipy i wzgl\u0119dem analitycznej charakterystyki przy ka\u017cdym uruchomieniu test\u00f3w." }
        ],
        cannotConclude: [
          { en: "How much force any muscle produced. Surface EMG amplitude does not convert to force.",
            pl: "Ile si\u0142y wytworzy\u0142 kt\u00f3rykolwiek mi\u0119sie\u0144. Amplituda powierzchniowego EMG nie przelicza si\u0119 na si\u0142\u0119." },
          { en: "Which of two muscles is working harder. After peak-of-trial normalisation the two scales are unrelated, and raw millivolts are not comparable between electrode sites either.",
            pl: "Kt\u00f3ry z dw\u00f3ch mi\u0119\u015bni pracuje ci\u0119\u017cej. Po normalizacji do szczytu pr\u00f3by obie skale s\u0105 niepowi\u0105zane, a surowe miliwolty te\u017c nie s\u0105 por\u00f3wnywalne mi\u0119dzy miejscami elektrod." },
          { en: "That one filter setting is correct. There is no true activation curve waiting to be recovered; the envelope's shape is a choice.",
            pl: "\u017be jedno ustawienie filtru jest poprawne. Nie ma prawdziwej krzywej aktywacji czekaj\u0105cej na odtworzenie; kszta\u0142t obwiedni jest wyborem." },
          { en: "Fatigue, from the median-frequency readout. That shift is produced by the filter you selected, not by anything happening in the muscle.",
            pl: "Zm\u0119czenia, na podstawie odczytu cz\u0119stotliwo\u015bci mediany. To przesuni\u0119cie wywo\u0142uje wybrany filtr, a nie cokolwiek dziej\u0105cego si\u0119 w mi\u0119\u015bniu." },
          { en: "Anything from the shaded first and last half second, where zero-phase filtering is working on an invented extension of the recording.",
            pl: "Niczego z cieniowanego pierwszego i ostatniego p\u00f3\u0142 sekundy, gdzie filtracja zerofazowa pracuje na zmy\u015blonym przed\u0142u\u017ceniu zapisu." },
          { en: "Anything clinical about this participant. It is one 8-second excerpt, shown to teach method.",
            pl: "Niczego klinicznego o tym uczestniku. To jeden o\u015bmiosekundowy wycinek pokazany, by uczy\u0107 metody." }
        ],
        primarySources: [
          { cite: "Santuz A et al. Zenodo 5171823, 2021 (CC BY 4.0)", url: "https://doi.org/10.5281/zenodo.5171823" },
          { cite: "De Luca CJ et al. J Biomech 43:1573-1579, 2010", url: "" }
        ],
      },
    },

    // --------------------------------------------------- clinical interpretation
    {
      id: "sandbox", page: "sandbox.html", icon: "🦿", track: "clinical",
      route: { order: 8, why: { en: "now break something, and predict the compensation before you look", pl: "teraz coś zepsuj i przewidź kompensację, zanim spojrzysz" } },
      level: "intermediate", status: "synthetic", prerequisites: ["lesson"],
      title: { en: "Gait Lab", pl: "Laboratorium chodu" },
      blurb: { en: "Switch on a deficit and watch the compensation appear.",
               pl: "Włącz deficyt i patrz, jak pojawia się kompensacja." },
      contract: {
        learningGoal: {
          en: "Link a named deficit to the compensation it produces, and say which plane you would need to see it in.",
          pl: "Powiązać nazwany deficyt z wywoływaną przez niego kompensacją i wskazać płaszczyznę potrzebną do jej zobaczenia." },
        measured: [],
        calculated: [{ en: "Each deficit is applied as a transform on the measured healthy walking kinematics",
                       pl: "Każdy deficyt jest nakładany jako przekształcenie zmierzonej kinematyki zdrowego chodu" }],
        modelled: [{ en: "All six patterns. The severity slider is a teaching parameter, not a clinical scale.",
                     pl: "Wszystkie sześć wzorców. Suwak nasilenia to parametr dydaktyczny, a nie skala kliniczna." }],
        assumptions: [{ en: "Sagittal plane only, single deficit at a time, no adaptation over time",
                        pl: "Wyłącznie płaszczyzna strzałkowa, jeden deficyt naraz, bez adaptacji w czasie" }],
        cannotConclude: [
          { en: "That a patient with this deficit will walk like this. Real compensations are individual and often combined.",
            pl: "Że pacjent z tym deficytem będzie tak chodził. Realne kompensacje są indywidualne i często złożone." },
          { en: "Anything about Trendelenburg gait or circumduction, which are frontal-plane events this view cannot draw.",
            pl: "Czegokolwiek o chodzie Trendelenburga czy zataczaniu łuku, bo to zjawiska czołowe, których ten widok nie narysuje." },
        ],
        primarySources: [{ cite: "Perry J, Burnfield JM. Gait Analysis, 2nd ed., 2010", url: "" }],
      },
    },
    {
      id: "sls", page: "sls.html", icon: "🦵", track: "clinical",
      level: "intermediate", status: "synthetic", prerequisites: ["explorer"],
      title: { en: "Knee Control", pl: "Kontrola kolana" },
      blurb: { en: "Frontal-plane control, and the limits of seeing it.",
               pl: "Kontrola w płaszczyźnie czołowej i granice jej obserwacji." },
      contract: {
        learningGoal: {
          en: "Recognise dynamic knee valgus and its companions, and judge how much a markerless system can tell you about them.",
          pl: "Rozpoznać dynamiczną koślawość kolana i towarzyszące jej zjawiska oraz ocenić, ile o nich powie system bezmarkerowy." },
        measured: [{ en: "One anonymised OpenCap pilot capture, shown as raw motion only, with no metrics derived from it",
                     pl: "Jedno zanonimizowane nagranie pilotażowe OpenCap, pokazane wyłącznie jako surowy ruch, bez wyprowadzania metryk" }],
        calculated: [{ en: "The displayed metrics, computed from the synthetic model rather than from any capture",
                       pl: "Wyświetlane metryki, liczone z modelu syntetycznego, a nie z jakiegokolwiek nagrania" }],
        modelled: [{ en: "The entire synthetic squat: angles, pelvic drop and trunk lean are generated from idealised curves",
                     pl: "Cały syntetyczny przysiad: kąty, opadanie miednicy i pochylenie tułowia generowane z wyidealizowanych krzywych" }],
        assumptions: [
          { en: "One control parameter drives all three deviations together, which is a simplification",
            pl: "Jeden parametr kontroli steruje wszystkimi trzema odchyleniami naraz, co jest uproszczeniem" },
          { en: "Markerless accuracy is plane-dependent: better in the sagittal plane than out of it",
            pl: "Dokładność bezmarkerowa zależy od płaszczyzny: lepsza strzałkowo niż poza nią" },
        ],
        cannotConclude: [
          { en: "That anyone is at risk of injury. Valgus is a movement characteristic associated with some outcomes in some populations, not a validated screening test.",
            pl: "Że ktokolwiek jest zagrożony urazem. Koślawość to cecha ruchu wiązana z pewnymi wynikami w pewnych populacjach, a nie zweryfikowany test przesiewowy." },
          { en: "That a markerless frontal-plane angle is as trustworthy as a sagittal one. It is not.",
            pl: "Że bezmarkerowy kąt czołowy jest tak samo wiarygodny jak strzałkowy. Nie jest." },
          { en: "Any threshold for normal or abnormal. The numbers shown are illustrative.",
            pl: "Żadnego progu normy lub patologii. Pokazane liczby są poglądowe." },
        ],
        primarySources: [{ cite: "Uhlrich SD, Falisse A et al. PLoS Comput Biol 19:e1011462, 2023",
                           url: "https://doi.org/10.1371/journal.pcbi.1011462" }],
      },
    },
    {
      id: "spine", page: "spine.html", icon: "🩻", track: "clinical",
      route: { order: 9, why: { en: "finish on evidence quality: how much a famous number is really worth", pl: "zakończ na jakości dowodów: ile naprawdę warta jest słynna liczba" } },
      level: "beginner", status: "verified", prerequisites: ["muscle"],
      title: { en: "Spine Under Load", pl: "Kręgosłup pod obciążeniem" },
      blurb: { en: "Two classic studies, and the textbook claim they disagree on.",
               pl: "Dwa klasyczne badania i podręcznikowe twierdzenie, co do którego się nie zgadzają." },
      contract: {
        learningGoal: {
          en: "Compare two in-vivo datasets on disc pressure and judge how much weight either can carry.",
          pl: "Porównać dwa zbiory danych in vivo o ciśnieniu w krążku i ocenić, ile każdy z nich udźwignie." },
        measured: [
          { en: "Nachemson 1965: relative load, 8 patients with low back pain or sciatica, standing recorded in only 2",
            pl: "Nachemson 1965: obciążenie względne, 8 pacjentów z bólem krzyża lub rwą kulszową, stanie zarejestrowane tylko u 2" },
          { en: "Wilke 1999: absolute nucleus pressure in MPa at L4/5, from exactly one person over 24 hours",
            pl: "Wilke 1999: bezwzględne ciśnienie w jądrze w MPa na L4/5, u dokładnie jednej osoby przez 24 godziny" },
        ],
        calculated: [{ en: "Wilke values also shown as a percentage of that study's own standing value",
                       pl: "Wartości Wilkego pokazane też jako procent wartości stania z tego samego badania" }],
        modelled: [{ en: "Nothing. Postures a study did not measure are marked with a dot rather than estimated.",
                     pl: "Nic. Pozycje niezmierzone w danym badaniu oznaczono kropką, zamiast je szacować." }],
        assumptions: [{ en: "Both are small samples measured with different instruments at different spinal levels",
                        pl: "Oba to małe próby mierzone różnymi przyrządami na różnych poziomach kręgosłupa" }],
        cannotConclude: [
          { en: "That high pressure means damage. Discs are load-bearing tissue and adapt to load.",
            pl: "Że wysokie ciśnienie oznacza uszkodzenie. Krążki to tkanka nośna i adaptują się do obciążeń." },
          { en: "That either number applies to you. One study has n=1 and the other studied patients in pain.",
            pl: "Że którakolwiek liczba dotyczy Ciebie. Jedno badanie ma n=1, a drugie objęło pacjentów w bólu." },
          { en: "That any posture should be avoided. Use these curves to explain mechanics, never to frighten.",
            pl: "Że jakiejkolwiek pozycji należy unikać. Używaj tych krzywych do wyjaśniania mechaniki, nigdy do straszenia." },
        ],
        primarySources: [
          { cite: "Nachemson A. Acta Orthop Scand 35:314-328, 1965", url: "" },
          { cite: "Wilke HJ et al. Spine 24(8):755-762, 1999", url: "" },
        ],
      },
    },

    // ------------------------------------------------------------------- home
    {
      id: "home", page: "index.html", icon: "✦", track: "movement",
      level: "beginner", status: "synthetic", prerequisites: [], hidden: true,
      title: { en: "Home", pl: "Start" },
      blurb: { en: "The station map, and a rig to pull on.",
               pl: "Mapa stacji i konstrukcja do pociągania." },
      contract: {
        learningGoal: {
          en: "Get a feel for tension networks by pulling one apart, then choose somewhere to land.",
          pl: "Poczuć, czym są sieci napięć, rozciągając jedną z nich, a potem wybrać miejsce startu." },
        measured: [],
        calculated: [{ en: "Verlet integration with constraint relaxation, plus shape matching each frame",
                       pl: "Całkowanie Verleta z relaksacją więzów oraz dopasowanie kształtu w każdej klatce" }],
        modelled: [{ en: "The entire rig. Members are placed where anatomy has structures, but nothing here was measured.",
                     pl: "Cała konstrukcja. Elementy umieszczono tam, gdzie anatomia ma struktury, ale niczego tu nie zmierzono." }],
        assumptions: [
          { en: "Struts never touch; cables resist stretch only",
            pl: "Rozpórki nigdy się nie stykają; liny opierają się wyłącznie rozciąganiu" },
          { en: "Shape recovery is added by the solver, because struts and one-way cables alone cannot restore a shape",
            pl: "Powrót kształtu dokłada solver, bo same rozpórki i jednokierunkowe liny nie przywrócą kształtu" },
        ],
        cannotConclude: [
          { en: "Anything about real human mechanics. Biotensegrity is a conceptual proposal under discussion, not established whole-body mechanics.",
            pl: "Niczego o realnej mechanice człowieka. Biotensegracja to propozycja koncepcyjna poddawana dyskusji, a nie ustalona mechanika całego ciała." },
          { en: "That load really travels through your body the way it travels through this rig.",
            pl: "Że obciążenie naprawdę wędruje przez Twoje ciało tak, jak wędruje przez tę konstrukcję." },
        ],
        primarySources: [{ cite: "Biotensegrity remains a conceptual model requiring further verification", url: "" }],
      },
    },
  ];

  const byPage = {};
  const byId = {};
  S.forEach(st => { byPage[st.page] = st; byId[st.id] = st; });

  return {
    TRACKS, list: S, byPage, byId,
    forPage(file) { return byPage[file] || null; },
    inTrack(t) { return S.filter(s => s.track === t && !s.hidden); },
    route() {
      return S.filter(s => s.route && !s.hidden).sort((a, b) => a.route.order - b.route.order);
    },
  };
});
