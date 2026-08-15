// Physics, from scratch.
//
// Written for a reader who scraped a pass in school physics. Two design rules
// follow from that, and everything here is downstream of them:
//
//   1. No symbol appears without an explanation attached to it. Every letter in
//      every formula on the page is hoverable and gives its name, its meaning in
//      ordinary words, its unit, an everyday analogy, a worked example with real
//      numbers, and the mistake people usually make with it. A reader who has
//      forgotten what "a" stands for should never have to scroll.
//
//   2. Nothing is asserted that the reader cannot then go and test. Every claim
//      about how the second law behaves has a control underneath it that lets you
//      make the quantity bigger and watch what happens.
//
// The physics here is ordinary Newtonian mechanics, so the numbers are exact by
// construction rather than measured. That is stated in the contract: this station
// is "reference", it claims no data, and it must not be read as a source of
// biomechanical values.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  const G = 9.81;              // m/s^2, standard gravity

  // Anything that keeps running after paint goes in here. boot() runs again on
  // every language switch, and without this each switch left the previous timers
  // alive, so the page got heavier the longer someone used it.
  const running = [];
  function stopAll() {
    while (running.length) clearInterval(running.pop());
    if (secondAnim) { cancelAnimationFrame(secondAnim); secondAnim = null; }
  }
  let secondAnim = null;
  const fix = (v, n) => (Math.round(v * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n);

  // =================================================================== symbols
  // The heart of the page. Each entry answers, in order: what is it called, what
  // does it mean in words, what unit, what is it like, what does it look like
  // with real numbers, and what do people get wrong.
  const SYM = {
    F: {
      s: "F", name: { en: "Force", pl: "Siła" },
      what: {
        en: "A push or a pull. How hard something is being shoved, and in which direction.",
        pl: "Pchnięcie albo pociągnięcie. Jak mocno coś jest popychane i w którą stronę." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: {
        en: "Your hand pressing on a door. The harder you press, the bigger the force. It also matters which way you press, which is why a force is always drawn as an arrow rather than written as a bare number.",
        pl: "Twoja dłoń naciskająca na drzwi. Im mocniej naciskasz, tym większa siła. Znaczenie ma też kierunek nacisku i dlatego siłę rysuje się jako strzałkę, a nie zapisuje jako samą liczbę." },
      example: {
        en: "Holding a 1 kg bag of sugar against gravity takes about 10 N. A firm hand on a shoulder is roughly 30 N. A sprinter's foot at push-off can exceed 2000 N.",
        pl: "Utrzymanie kilogramowej torebki cukru wbrew grawitacji to około 10 N. Stanowcza dłoń na barku to mniej więcej 30 N. Stopa sprintera przy odbiciu może przekroczyć 2000 N." },
      mistake: {
        en: "Treating a force as a property an object has. Nothing 'has' force. A force is something one object does to another, and it exists only while that interaction lasts.",
        pl: "Traktowanie siły jako cechy, którą obiekt posiada. Nic nie „ma” siły. Siła to coś, co jeden obiekt robi drugiemu, i istnieje tylko tak długo, jak trwa to oddziaływanie." },
    },
    Fnet: {
      s: "F net", name: { en: "Net force", pl: "Siła wypadkowa" },
      what: {
        en: "Every force acting on the object, added together as arrows. What is left over after opposing pushes cancel.",
        pl: "Wszystkie siły działające na obiekt, dodane jako strzałki. To, co zostaje po wzajemnym zniesieniu się przeciwnych pchnięć." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: {
        en: "Tug of war. Eight people pull left with 400 N, eight pull right with 380 N. The rope does not care about the 780 N being wasted. It moves as though something pulled it left with 20 N, because that is what is left over.",
        pl: "Przeciąganie liny. Ośmioro ciągnie w lewo siłą 400 N, ośmioro w prawo siłą 380 N. Linę nie obchodzi zmarnowane 780 N. Porusza się tak, jakby ciągnęło ją w lewo 20 N, bo tyle zostaje." },
      example: {
        en: "Standing still: gravity pulls you down with about 700 N and the floor pushes up with about 700 N. Net force nearly zero, so you do not accelerate, despite two very large forces being present.",
        pl: "Stanie w miejscu: grawitacja ciągnie Cię w dół siłą około 700 N, a podłoga pcha w górę siłą około 700 N. Siła wypadkowa jest prawie zerowa, więc nie przyspieszasz, mimo że działają dwie bardzo duże siły." },
      mistake: {
        en: "This is the single most common error in the whole subject: seeing one big force and concluding there must be a big acceleration. Only the leftover matters.",
        pl: "To najczęstszy błąd w całym temacie: zobaczyć jedną dużą siłę i wywnioskować, że musi być duże przyspieszenie. Liczy się tylko to, co zostaje." },
    },
    m: {
      s: "m", name: { en: "Mass", pl: "Masa" },
      what: {
        en: "How stubborn an object is about changing its motion. That stubbornness is called inertia, and mass is its measure. Loosely it is also how much stuff there is, which is the easier picture but the less useful definition.",
        pl: "Jak bardzo obiekt jest oporny na zmianę swojego ruchu. Ta oporność nazywa się bezwładnością, a masa jest jej miarą. Z grubsza to także ilość materii, co jest łatwiejszym obrazem, ale mniej użyteczną definicją." },
      unit: { en: "kilograms (kg)", pl: "kilogramy (kg)" },
      analogy: {
        en: "An empty shopping trolley against one loaded with bricks. The same shove barely moves the heavy one. Nothing about the shove changed; the stubbornness did.",
        pl: "Pusty wózek sklepowy kontra wózek pełen cegieł. To samo pchnięcie ledwo rusza ten ciężki. Pchnięcie się nie zmieniło; zmieniła się oporność." },
      example: {
        en: "An adult is 60 to 90 kg. A forearm and hand together are about 2.3% of that, so roughly 1.6 kg for a 70 kg person. A litre of water is very close to 1 kg, which is a handy thing to calibrate your intuition against.",
        pl: "Dorosły ma 60 do 90 kg. Przedramię wraz z dłonią to około 2,3% tej wartości, czyli mniej więcej 1,6 kg przy masie 70 kg. Litr wody to bardzo blisko 1 kg, co jest wygodnym punktem odniesienia dla intuicji." },
      mistake: {
        en: "Saying mass when you mean weight. Mass is in kilograms and never changes. Weight is a force in newtons and depends on where you are standing.",
        pl: "Mówienie „masa”, gdy chodzi o ciężar. Masa jest w kilogramach i nigdy się nie zmienia. Ciężar to siła w niutonach i zależy od tego, gdzie stoisz." },
    },
    a: {
      s: "a", name: { en: "Acceleration", pl: "Przyspieszenie" },
      what: {
        en: "How quickly velocity is changing: its size, its direction, or both. Not how fast you are going. How fast your going is changing.",
        pl: "Jak szybko zmienia się prędkość: jej wartość, jej kierunek albo oba naraz. Nie jak szybko się poruszasz, ale jak szybko to się zmienia." },
      unit: { en: "metres per second per second (m/s²)", pl: "metry na sekundę na sekundę (m/s²)" },
      analogy: {
        en: "The push into the seat when a car pulls away. You feel acceleration, not speed. On a smooth motorway at 120 km/h you feel nothing at all, because nothing is changing.",
        pl: "Wciśnięcie w fotel, gdy samochód rusza. Czujesz przyspieszenie, a nie prędkość. Na gładkiej autostradzie przy 120 km/h nie czujesz nic, bo nic się nie zmienia." },
      example: {
        en: "At 2 m/s² you gain 2 m/s of speed every second: after one second 2 m/s, after two 4 m/s, after three 6 m/s. A dropped object accelerates at 9.81 m/s². A hard landing can brake the body at 40 m/s² or more.",
        pl: "Przy 2 m/s² zyskujesz 2 m/s prędkości co sekundę: po sekundzie 2 m/s, po dwóch 4 m/s, po trzech 6 m/s. Upuszczony przedmiot przyspiesza z 9,81 m/s². Twarde lądowanie potrafi wyhamować ciało z 40 m/s² lub więcej." },
      mistake: {
        en: "Two. Assuming it must mean speeding up, when slowing down is acceleration pointing the other way. And forgetting direction: a car going round a bend at a constant 50 km/h is accelerating the whole way round, because its velocity is turning even though its speed is not.",
        pl: "Dwa. Założenie, że musi oznaczać rozpędzanie się, podczas gdy hamowanie to przyspieszenie skierowane przeciwnie. Oraz zapominanie o kierunku: samochód pokonujący zakręt ze stałą szybkością 50 km/h przyspiesza przez cały łuk, bo jego prędkość skręca, choć szybkość nie." },
    },
    v: {
      s: "v", name: { en: "Velocity", pl: "Prędkość" },
      what: {
        en: "How fast position is changing, and in which direction.",
        pl: "Jak szybko zmienia się położenie i w którym kierunku." },
      unit: { en: "metres per second (m/s)", pl: "metry na sekundę (m/s)" },
      analogy: {
        en: "The number on a speedometer, plus the direction the car is pointing. Speed alone is the number; velocity is the number and the heading together.",
        pl: "Liczba na prędkościomierzu plus kierunek, w którym jedzie samochód. Sama szybkość to liczba; prędkość to liczba razem z kierunkiem." },
      example: {
        en: "Comfortable walking is about 1.4 m/s, which is 5 km/h. Recreational running is around 3 m/s. A world-class sprinter peaks near 12 m/s.",
        pl: "Wygodny chód to około 1,4 m/s, czyli 5 km/h. Bieganie rekreacyjne to około 3 m/s. Sprinter światowej klasy osiąga szczytowo blisko 12 m/s." },
      mistake: {
        en: "Confusing it with acceleration. You can be moving very fast with zero acceleration, and be momentarily stationary with enormous acceleration.",
        pl: "Mylenie jej z przyspieszeniem. Można poruszać się bardzo szybko przy zerowym przyspieszeniu i być chwilowo nieruchomym przy ogromnym przyspieszeniu." },
    },
    x: {
      s: "x", name: { en: "Position", pl: "Położenie" },
      what: { en: "Where something is, measured from some agreed starting point.",
              pl: "Gdzie coś się znajduje, mierzone od jakiegoś umówionego punktu początkowego." },
      unit: { en: "metres (m)", pl: "metry (m)" },
      analogy: {
        en: "A mark on a tape measure laid along the floor. It only means anything once you have said where zero is.",
        pl: "Znak na taśmie mierniczej rozłożonej na podłodze. Ma sens dopiero wtedy, gdy powiesz, gdzie jest zero." },
      example: {
        en: "In gait analysis, position is usually where a reflective marker sits in the room, in three dimensions, several hundred times a second.",
        pl: "W analizie chodu położenie to zwykle miejsce, w którym znajduje się marker odblaskowy w pomieszczeniu, w trzech wymiarach, kilkaset razy na sekundę." },
      mistake: {
        en: "Forgetting that it is relative. There is no absolute position, only position with respect to a chosen origin, which is why labs are careful about defining one.",
        pl: "Zapominanie, że jest względne. Nie ma położenia absolutnego, jest tylko położenie względem wybranego początku układu, i dlatego pracownie starannie go definiują." },
    },
    g: {
      s: "g", name: { en: "Gravitational field strength", pl: "Natężenie pola grawitacyjnego" },
      what: {
        en: "How hard a planet pulls on each kilogram of stuff. On Earth, about 9.81 newtons for every kilogram.",
        pl: "Jak mocno planeta ciągnie każdy kilogram materii. Na Ziemi około 9,81 niutona na każdy kilogram." },
      unit: { en: "newtons per kilogram (N/kg), identical to m/s²", pl: "niutony na kilogram (N/kg), tożsame z m/s²" },
      analogy: {
        en: "A rate of exchange. It converts kilograms into newtons the way a currency rate converts one money into another, and like a currency rate it is different in different places.",
        pl: "Kurs wymiany. Przelicza kilogramy na niutony tak, jak kurs walutowy przelicza jedne pieniądze na drugie, i tak jak kurs walutowy jest różny w różnych miejscach." },
      example: {
        en: "Earth about 9.81, the Moon 1.62, Mars 3.72, Jupiter about 24.8. Two different things share the symbol: STANDARD gravity is fixed by convention at exactly 9.80665, while the LOCAL value varies with latitude and altitude, being fractionally weaker at the equator and on a mountain.",
        pl: "Ziemia około 9,81, Księżyc 1,62, Mars 3,72, Jowisz około 24,8. Symbol dzielą dwie różne rzeczy: przyspieszenie STANDARDOWE jest ustalone konwencjonalnie jako dokładnie 9,80665, natomiast wartość LOKALNA zmienia się z szerokością geograficzną i wysokością, będąc odrobinę mniejsza na równiku i w górach." },
      mistake: {
        en: "Calling it 'gravity' as though it were a force. It is not a force; it is the rate that turns mass into a force. The force it produces is weight.",
        pl: "Nazywanie go „grawitacją”, jakby było siłą. Nie jest siłą; jest współczynnikiem zamieniającym masę na siłę. Siła, którą wytwarza, to ciężar." },
    },
    W: {
      s: "W", name: { en: "Weight, the gravitational force", pl: "Ciężar, czyli siła grawitacji" },
      what: {
        en: "The force with which gravity pulls an object. A force, therefore in newtons, therefore not the same thing as mass. Careful: this is not always what a scale shows you, which is apparent weight.",
        pl: "Siła, z jaką grawitacja przyciąga obiekt. To siła, więc w niutonach, więc nie to samo co masa. Uwaga: to nie zawsze jest to, co pokazuje waga, czyli ciężar pozorny." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: {
        en: "How heavy a rucksack feels on your shoulders. Take the identical rucksack to the Moon and it pulls about six times less, though not one grain of its contents has left.",
        pl: "Jak ciężki wydaje się plecak na ramionach. Zabierz ten sam plecak na Księżyc, a będzie ciągnął około sześć razy słabiej, choć nie ubyło z niego ani ziarno." },
      example: {
        en: "A 70 kg person: 687 N on Earth, 260 N on Mars, 113 N on the Moon. In low Earth orbit gravity is still about 89% of its surface value, so the gravitational force on them is roughly 610 N. It is their APPARENT weight that is zero, because they and the spacecraft are falling together.",
        pl: "Osoba o masie 70 kg: 687 N na Ziemi, 260 N na Marsie, 113 N na Księżycu. Na niskiej orbicie okołoziemskiej grawitacja to nadal około 89% wartości przy powierzchni, więc siła grawitacji działająca na nią wynosi mniej więcej 610 N. Zerowy jest jej ciężar POZORNY, bo ona i statek spadają razem." },
      mistake: {
        en: "Two of them. Reporting weight in kilograms, which a bathroom scale encourages. And saying there is no gravity in orbit. Orbit is not the absence of gravity; it is falling around the planet fast enough to keep missing it.",
        pl: "Dwa. Podawanie ciężaru w kilogramach, do czego zachęca waga łazienkowa. Oraz mówienie, że na orbicie nie ma grawitacji. Orbita to nie brak grawitacji; to spadanie wokół planety na tyle szybko, by wciąż w nią nie trafiać." },
    },
    Wapp: {
      s: "N", name: { en: "Apparent weight", pl: "Ciężar pozorny" },
      what: {
        en: "The force a support pushes back with, and therefore the number a scale or a force plate reports. It equals the gravitational force ONLY when nothing is accelerating vertically.",
        pl: "Siła, którą podpora oddziałuje z powrotem, czyli liczba pokazywana przez wagę lub platformę dynamometryczną. Równa się sile grawitacji TYLKO wtedy, gdy nic nie przyspiesza w pionie." },
      unit: { en: "newtons (N)", pl: "niutony (N)" },
      analogy: {
        en: "A lift. Standing still you feel normal. As it starts upwards you feel briefly heavier, and as it starts downwards briefly lighter. Your mass never changed and gravity never changed. Only the floor's push did.",
        pl: "Winda. W bezruchu czujesz się normalnie. Gdy rusza w górę, przez chwilę czujesz się cięższy, a gdy w dół, przez chwilę lżejszy. Twoja masa się nie zmieniła i grawitacja się nie zmieniła. Zmieniło się tylko pchnięcie podłogi." },
      example: {
        en: "Standing still, a 70 kg person's apparent weight is 687 N, the same as the gravitational force. Rising quickly onto the toes it briefly exceeds 800 N. In free fall it is exactly zero, which is what weightlessness actually means.",
        pl: "W bezruchu ciężar pozorny osoby 70 kg wynosi 687 N, tyle samo co siła grawitacji. Przy szybkim wspięciu na palce przekracza chwilowo 800 N. W swobodnym spadku wynosi dokładnie zero i właśnie to znaczy nieważkość." },
      mistake: {
        en: "Assuming a force plate measures weight. It measures the force between body and plate, which is the gravitational force plus whatever the body is doing about it.",
        pl: "Założenie, że platforma dynamometryczna mierzy ciężar. Mierzy siłę między ciałem a platformą, czyli siłę grawitacji plus to, co ciało z nią właśnie robi." },
    },
    N: {
      s: "N", name: { en: "The newton", pl: "Niuton" },
      what: {
        en: "The unit of force. One newton is the force needed to make one kilogram accelerate at one metre per second per second.",
        pl: "Jednostka siły. Jeden niuton to siła potrzebna, by jeden kilogram przyspieszał o jeden metr na sekundę na sekundę." },
      unit: { en: "1 N = 1 kg·m/s²", pl: "1 N = 1 kg·m/s²" },
      analogy: {
        en: "Roughly the weight of a small apple resting in your palm. The story about Newton and the apple is probably embroidered, but the unit really is about an apple's worth of pull.",
        pl: "Mniej więcej ciężar małego jabłka leżącego na dłoni. Opowieść o Newtonie i jabłku jest zapewne podkoloryzowana, ale jednostka faktycznie odpowiada mniej więcej sile ciągnącej jabłko." },
      example: {
        en: "To convert a mass in kilograms into a weight in newtons, multiply by about 10. A 70 kg person, roughly 700 N. This approximation is within 2% and is good enough for sanity-checking almost anything.",
        pl: "Aby zamienić masę w kilogramach na ciężar w niutonach, pomnóż przez około 10. Osoba 70 kg to mniej więcej 700 N. To przybliżenie mieści się w 2% i wystarcza do sprawdzenia sensowności niemal każdego wyniku." },
      mistake: {
        en: "Writing it with a lower-case n, or as 'Newton'. The person is Newton, the unit is the newton, and the symbol is a capital N.",
        pl: "Zapisywanie małym „n” albo jako „Newton”. Człowiek to Newton, jednostka to niuton, a symbol to wielkie N." },
    },
    M: {
      s: "M", name: { en: "Moment of a force", pl: "Moment siły" },
      what: {
        en: "The turning effect of a force about a pivot: the force multiplied by its PERPENDICULAR distance from that pivot. How much it twists something, rather than how much it shoves it along.",
        pl: "Efekt obrotowy siły względem osi obrotu: siła pomnożona przez jej PROSTOPADŁĄ odległość od tej osi. Na ile coś skręca, a nie na ile popycha wzdłuż." },
      unit: { en: "newton metres (N·m)", pl: "niutonometry (N·m)" },
      analogy: {
        en: "Undoing a tight bolt. A short spanner defeats you; a long one does not. Your arm is no stronger, but the force now acts further from the pivot. Push along the spanner rather than across it and nothing happens at all, however hard you push, because the perpendicular distance has gone to zero.",
        pl: "Odkręcanie mocno dokręconej śruby. Krótkim kluczem nie dasz rady, długim tak. Twoje ramię nie stało się silniejsze, ale siła działa teraz dalej od osi. Naciśnij wzdłuż klucza zamiast w poprzek, a nie stanie się nic, choćbyś naciskał najmocniej, bo odległość prostopadła spadła do zera." },
      example: {
        en: "Holding a 5 kg dumbbell, so about 50 N, at 0.3 m from the elbow gives 50 × 0.3 = 15 N·m that the elbow flexors have to match just to stop the arm dropping.",
        pl: "Trzymanie hantla 5 kg, czyli około 50 N, w odległości 0,3 m od łokcia daje 50 × 0,3 = 15 N·m, które zginacze łokcia muszą zrównoważyć tylko po to, by ramię nie opadło." },
      mistake: {
        en: "Measuring the distance along the bone instead of perpendicular to the line of the force. Only the perpendicular distance counts, which is why the same muscle's turning effect changes through the range of motion.",
        pl: "Mierzenie odległości wzdłuż kości zamiast prostopadle do linii działania siły. Liczy się wyłącznie odległość prostopadła i dlatego efekt obrotowy tego samego mięśnia zmienia się w zakresie ruchu." },
    },
    d: {
      s: "d⊥", name: { en: "Moment arm", pl: "Ramię siły" },
      what: {
        en: "The PERPENDICULAR distance from the pivot to the line along which the force acts. Not the distance to where the force is applied, unless the two happen to coincide.",
        pl: "PROSTOPADŁA odległość od osi obrotu do prostej, wzdłuż której działa siła. Nie odległość do punktu przyłożenia siły, chyba że akurat się pokrywają." },
      unit: { en: "metres (m)", pl: "metry (m)" },
      analogy: {
        en: "The distance from a door's hinge to your hand. Push near the handle and the door swings easily. Push near the hinge and almost nothing happens, with the same force.",
        pl: "Odległość od zawiasu drzwi do Twojej dłoni. Naciśnij blisko klamki, a drzwi otworzą się łatwo. Naciśnij blisko zawiasu, a przy tej samej sile prawie nic się nie stanie." },
      example: {
        en: "The biceps moment arm at the elbow is a few centimetres, commonly taken as about 4 cm in a textbook example. A load held in the hand acts about 0.3 m from the elbow. With the forearm horizontal and the load hanging vertically, that 0.3 m IS its perpendicular distance, so the arithmetic is easy. Tilt the forearm and it stops being easy.",
        pl: "Ramię siły bicepsa w łokciu to kilka centymetrów, w przykładach podręcznikowych przyjmuje się zwykle około 4 cm. Obciążenie trzymane w dłoni działa około 0,3 m od łokcia. Przy poziomym przedramieniu i pionowo zwisającym obciążeniu te 0,3 m JEST jego odległością prostopadłą, więc rachunek jest łatwy. Przechyl przedramię, a przestaje być łatwy." },
      mistake: {
        en: "Two. Treating the distance to the attachment point as the moment arm, when only the perpendicular distance to the line of action counts. And treating it as a fixed number for a given muscle: it changes continuously through the range of motion, which is a large part of why strength does too.",
        pl: "Dwa. Traktowanie odległości do punktu przyczepu jako ramienia siły, podczas gdy liczy się wyłącznie odległość prostopadła do linii działania. Oraz traktowanie go jako stałej liczby dla danego mięśnia: zmienia się nieustannie w zakresie ruchu i w dużej mierze dlatego siła też." },
    },
    vector: {
      s: "→", name: { en: "Vector", pl: "Wektor" },
      what: {
        en: "A quantity that carries both a size and a direction, so it is drawn as an arrow rather than written as a single number.",
        pl: "Wielkość niosąca zarówno wartość, jak i kierunek, dlatego rysuje się ją jako strzałkę, a nie zapisuje jako pojedynczą liczbę." },
      unit: { en: "whatever the quantity's unit is", pl: "taka, jaka jest jednostka danej wielkości" },
      analogy: {
        en: "Directions to a station. 'Walk 300 metres' is useless on its own. 'Walk 300 metres north' is a vector, and it will actually get you there.",
        pl: "Wskazówki dojścia na dworzec. „Idź 300 metrów” samo w sobie jest bezużyteczne. „Idź 300 metrów na północ” to wektor i faktycznie Cię doprowadzi." },
      example: {
        en: "Force, velocity, acceleration and position are all vectors. Mass, time and temperature are not: there is no such thing as five kilograms pointing north.",
        pl: "Siła, prędkość, przyspieszenie i położenie to wektory. Masa, czas i temperatura nie: nie istnieje coś takiego jak pięć kilogramów skierowane na północ." },
      mistake: {
        en: "Adding vectors like ordinary numbers. 3 N left plus 4 N right is 1 N right, not 7 N. Direction has to be respected or the arithmetic is meaningless.",
        pl: "Dodawanie wektorów jak zwykłych liczb. 3 N w lewo plus 4 N w prawo to 1 N w prawo, a nie 7 N. Kierunek trzeba uszanować, inaczej rachunek nie ma sensu." },
    },
  };

  // -------------------------------------------------------------- symbol cards
  let card = null;
  function ensureCard() {
    if (card) return card;
    card = document.createElement("div");
    card.className = "sym-card";
    document.body.appendChild(card);
    return card;
  }
  function showSym(key, x, y) {
    const d = SYM[key];
    if (!d) return;
    const c = ensureCard();
    const row = (label, val, cls) =>
      '<div class="sym-row ' + (cls || "") + '"><span class="sym-lab">' + label +
      '</span><span class="sym-val">' + val + "</span></div>";
    c.innerHTML =
      '<div class="sym-head"><span class="sym-glyph">' + d.s + "</span>" +
      '<span class="sym-name">' + L(d.name) + "</span></div>" +
      '<div class="sym-what">' + L(d.what) + "</div>" +
      row(T("Unit", "Jednostka"), L(d.unit), "sym-unit") +
      row(T("Like", "To jak"), L(d.analogy)) +
      row(T("For instance", "Na przykład"), L(d.example)) +
      row(T("Watch out", "Uwaga"), L(d.mistake), "sym-warn");
    c.classList.add("in");
    moveCard(x, y);
  }
  function moveCard(x, y) {
    if (!card) return;
    const pad = 18, r = card.getBoundingClientRect();
    let nx = x + pad, ny = y + pad;
    if (nx + r.width > window.innerWidth - 12) nx = x - r.width - pad;
    if (ny + r.height > window.innerHeight - 12) ny = y - r.height - pad;
    card.style.left = Math.max(8, nx) + "px";
    card.style.top = Math.max(8, ny) + "px";
  }
  const hideSym = () => card && card.classList.remove("in");

  function wireSyms(root) {
    (root || document).querySelectorAll(".sym").forEach(el => {
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
  // Bez myszy nie ma zdarzenia mouseleave, więc na telefonie karta zamykała się
  // tylko przewinięciem. Tapnięcie poza symbolem musi ją zamykać tak samo.
  document.addEventListener("pointerdown", e => {
    if (!e.target.closest(".sym") && !e.target.closest(".sym-card")) hideSym();
  }, { passive: true });

  // ============================================================ weight demo
  const BODIES = [
    { id: "earth", g: 9.81, n: { en: "Earth", pl: "Ziemia" }, e: "🌍" },
    { id: "moon", g: 1.62, n: { en: "Moon", pl: "Księżyc" }, e: "🌘" },
    { id: "mars", g: 3.72, n: { en: "Mars", pl: "Mars" }, e: "🔴" },
    { id: "jupiter", g: 24.79, n: { en: "Jupiter", pl: "Jowisz" }, e: "🪐" },
  ];

  function weightDemo(host) {
    let mass = 70, where = "earth";
    function paint() {
      const b = BODIES.find(x => x.id === where);
      const w = mass * b.g;
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Same body, four places", "To samo ciało, cztery miejsca") + "</div>" +
        '<p class="ph-demo-p">' +
          T("Move the mass slider and change planet. Watch which number moves and which one refuses to.",
            "Przesuń suwak masy i zmień planetę. Zobacz, która liczba się zmienia, a która uparcie nie.") +
        "</p>" +
        '<div class="ph-planets">' +
          BODIES.map(x => '<button class="ph-planet' + (x.id === where ? " on" : "") + '" data-w="' + x.id + '">' +
            '<span class="ph-planet-e">' + x.e + "</span>" + L(x.n) +
            '<em>g = ' + fix(x.g, 2) + "</em></button>").join("") +
        "</div>" +
        '<label class="ph-slider"><span>' + T("Mass", "Masa") + "</span>" +
          '<input type="range" id="phMassR" min="5" max="150" step="1" value="' + mass + '">' +
          "<b>" + mass + " kg</b></label>" +
        '<div class="ph-readout">' +
          '<div class="ph-read ph-read-still"><span>' + T("Mass", "Masa") + "</span><b>" + mass +
            ' kg</b><em>' + T("unchanged, everywhere", "niezmieniona, wszędzie") + "</em></div>" +
          '<div class="ph-read ph-read-move"><span>' + T("Weight, the gravitational force", "Ciężar, czyli siła grawitacji") + "</span><b>" + fix(w, 0) +
            ' N</b><em>' + fix(mass, 0) + " × " + fix(b.g, 2) + "</em></div>" +
        "</div>" +
        '<div class="ph-demo-sub">' +
          T("Standing still on any of these, a scale would read that same force back at you. It stops matching the moment anything accelerates vertically, and in free fall it reads zero while gravity carries on exactly as before. That reading has its own name: apparent weight.",
            "Stojąc nieruchomo na którymkolwiek z nich, waga pokazałaby Ci tę samą siłę. Przestaje się zgadzać w chwili, gdy cokolwiek przyspiesza w pionie, a w swobodnym spadku pokazuje zero, podczas gdy grawitacja działa dokładnie tak jak wcześniej. Ten odczyt ma własną nazwę: ciężar pozorny.") +
        "</div>" +
        '<div class="ph-demo-note">' +
          T("Gravity on the Moon is 9.81 / 1.62, about six times weaker. So a 6 kg mass there pulls down roughly as hard as 1 kg does here, and holding it still would feel about the same. Starting or stopping it would not: it still has six times the mass, so it takes six times the force to accelerate it. Weight scales with the planet. Inertia does not.",
            "Grawitacja na Księżycu to 9,81 / 1,62, czyli około sześć razy słabsza. Masa 6 kg ciągnie tam w dół mniej więcej tak mocno jak 1 kg tutaj, a utrzymanie jej w bezruchu odczułbyś podobnie. Rozpędzenie jej albo zatrzymanie już nie: nadal ma sześć razy większą masę, więc potrzeba sześć razy większej siły, by ją rozpędzić. Ciężar skaluje się z planetą. Bezwładność nie.") +
        "</div>";
      host.querySelectorAll(".ph-planet").forEach(b2 =>
        b2.onclick = () => { where = b2.dataset.w; paint(); });
      host.querySelector("#phMassR").oninput = e => { mass = +e.target.value; paint(); };
    }
    paint();
  }

  // ============================================================ motion demo
  // Position, velocity and acceleration of one moving dot, shown together, so the
  // reader can see that the three are different views of the same journey.
  function motionDemo(host) {
    let mode = "cruise", t = 0;
    const MODES = {
      // Deliberately a puck on ice rather than a walker. A real walk at a steady
      // average speed is full of within-step accelerations, so using it as the
      // zero-acceleration example would teach the opposite of the truth.
      still: { n: { en: "At rest", pl: "W spoczynku" }, a: () => 0, v0: 0 },
      cruise: { n: { en: "Gliding, no friction", pl: "Ślizg bez tarcia" }, a: () => 0, v0: 1.4 },
      start: { n: { en: "Being pushed", pl: "Popychany" }, a: tt => (tt < 2 ? 1.2 : 0), v0: 0 },
      brake: { n: { en: "Being slowed", pl: "Hamowany" }, a: tt => (tt > 1.5 && tt < 3 ? -1.6 : 0), v0: 2.4 },
    };
    function state(tt) {
      const M = MODES[mode];
      let v = M.v0, x = 0;
      const dt = 0.01;
      for (let s = 0; s < tt; s += dt) { v = Math.max(0, v + M.a(s) * dt); x += v * dt; }
      return { x, v, a: M.a(tt) };
    }
    // The shell is built once. Rebuilding it on every frame, as an earlier version
    // did, made the buttons flicker out from under the cursor sixteen times a
    // second and rewired every tooltip along with it.
    function shell() {
      const row = (sym, label, cls, unit) =>
        '<div class="ph-mrow"><span class="sym" data-sym="' + sym + '">' + label + "</span>" +
        '<div class="ph-bar ' + cls + '"><div class="ph-bar-mid"></div>' +
        '<div class="ph-bar-fill"></div></div><b data-u="' + unit + '">0</b></div>';
      host.innerHTML =
        '<div class="ph-demo-h">' + T("One journey, three numbers", "Jedna podróż, trzy liczby") + "</div>" +
        '<p class="ph-demo-p">' +
          T("A puck sliding on frictionless ice, in a straight line. Pick a situation and watch the three readouts disagree with each other, which is normal and is the whole point. It is a puck rather than a person on purpose: a real walk at a steady average speed is full of accelerations within every step, so it is the wrong example for showing zero acceleration.",
            "Krążek ślizgający się po lodzie bez tarcia, po linii prostej. Wybierz sytuację i obserwuj, jak trzy odczyty nie zgadzają się ze sobą, co jest normalne i o to właśnie chodzi. To celowo krążek, a nie człowiek: prawdziwy chód ze stałą prędkością średnią jest pełen przyspieszeń wewnątrz każdego kroku, więc jest złym przykładem na zerowe przyspieszenie.") +
        "</p>" +
        '<div class="ph-chips">' + Object.keys(MODES).map(k =>
          '<button class="ph-chip' + (k === mode ? " on" : "") + '" data-m="' + k + '">' + L(MODES[k].n) + "</button>").join("") + "</div>" +
        '<div class="ph-track"><div class="ph-runner">🚶</div></div>' +
        '<div class="ph-mrows">' +
          row("x", T("Position", "Położenie"), "b-x", "m") +
          row("v", T("Velocity", "Prędkość"), "b-v", "m/s") +
          row("a", T("Acceleration", "Przyspieszenie"), "b-a", "m/s²") +
        "</div>" +
        '<div class="ph-demo-note ph-live"></div>';
      host.querySelectorAll(".ph-chip").forEach(b =>
        b.onclick = () => {
          mode = b.dataset.m; t = 0;
          host.querySelectorAll(".ph-chip").forEach(o => o.classList.toggle("on", o === b));
          tick();
        });
      wireSyms(host);
    }

    // Only the numbers move.
    function tick() {
      const s = state(t);
      const fills = host.querySelectorAll(".ph-bar-fill");
      const vals = host.querySelectorAll(".ph-mrow > b");
      const runner = host.querySelector(".ph-runner");
      if (!fills.length || !runner) return;
      const set = (i, val, max, dp) => {
        const p = Math.max(-100, Math.min(100, (val / max) * 100));
        fills[i].style.left = (p < 0 ? 50 + p : 50) + "%";
        fills[i].style.width = Math.abs(p) / 2 + "%";
        vals[i].textContent = fix(val, dp) + " " + vals[i].dataset.u;
      };
      runner.style.left = Math.min(94, s.x * 9) + "%";
      set(0, s.x, 12, 1); set(1, s.v, 3, 2); set(2, s.a, 2, 2);
      host.querySelector(".ph-live").textContent = liveNote(s);
    }
    function liveNote(s) {
      if (Math.abs(s.a) < 0.01 && s.v > 0.1)
        return T("Moving steadily. Velocity is large, acceleration is exactly zero. The NET force is zero, which is not the same as no forces: gravity still pulls the puck down and the ice still pushes it up, in balance.",
                 "Ruch jednostajny. Prędkość jest duża, przyspieszenie dokładnie zerowe. Siła WYPADKOWA jest zerowa, co nie znaczy, że nie ma sił: grawitacja nadal ciągnie krążek w dół, a lód nadal pcha go w górę, i te dwie się równoważą.");
      if (s.a > 0.01)
        return T("Speeding up. Acceleration is positive, so by the second law something is pushing forwards right now.",
                 "Rozpędzanie. Przyspieszenie jest dodatnie, więc zgodnie z drugą zasadą coś w tej chwili pcha do przodu.");
      if (s.a < -0.01)
        return T("Slowing down. Acceleration is negative. This is still acceleration, and it still needs a real force, pointing backwards.",
                 "Hamowanie. Przyspieszenie jest ujemne. To wciąż przyspieszenie i wciąż wymaga prawdziwej siły, skierowanej do tyłu.");
      return T("Not moving and not changing. Velocity zero, acceleration zero, net force zero. Note that gravity and the ice are both still acting; they simply cancel.",
               "Bez ruchu i bez zmian. Prędkość zero, przyspieszenie zero, siła wypadkowa zero. Zwróć uwagę, że grawitacja i lód nadal działają; po prostu się znoszą.");
    }
    shell(); tick();
    // Registered centrally so a language switch cannot leave a second copy running.
    running.push(setInterval(() => { t += 0.06; if (t > 4.2) t = 0; tick(); }, 60));
  }

  // ============================================================ second law demo
  function secondDemo(host) {
    let F = 200, mass = 70, locked = "a";
    function paint() {
      const a = F / mass;
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Push something, see what happens", "Popchnij coś i zobacz, co się stanie") + "</div>" +
        '<p class="ph-demo-p">' +
          T("Set the net force and the mass. The acceleration is not a setting, it is the consequence, and it updates as you drag.",
            "Ustaw siłę wypadkową i masę. Przyspieszenie nie jest ustawieniem, tylko konsekwencją, i zmienia się w trakcie przeciągania.") +
        "</p>" +
        '<div class="ph-assume"><b>' + T("What this demo assumes", "Co ta demonstracja zakłada") + "</b><ul>" +
          [T("Motion along one straight line, and the force points along it",
             "Ruch po jednej prostej, a siła działa wzdłuż niej"),
           T("The slider is the NET force, everything already added up. If friction or gravity also acted, you would have to subtract them yourself before setting it",
             "Suwak to siła WYPADKOWA, wszystko już zsumowane. Gdyby działało też tarcie albo grawitacja, trzeba by je najpierw odjąć samodzielnie"),
           T("Starting from rest, with the mass and the net force both held constant",
             "Start ze spoczynku, przy stałej masie i stałej sile wypadkowej"),
           T("No friction and no air resistance", "Bez tarcia i bez oporu powietrza")]
            .map(x => "<li>" + x + "</li>").join("") + "</ul></div>" +
        '<div class="ph-eq-live">' +
          '<div class="ph-eq-part"><span class="sym" data-sym="Fnet">F</span><b>' + fix(F, 0) + "</b><em>N</em></div>" +
          '<div class="ph-eq-op">=</div>' +
          '<div class="ph-eq-part"><span class="sym" data-sym="m">m</span><b>' + fix(mass, 0) + "</b><em>kg</em></div>" +
          '<div class="ph-eq-op">×</div>' +
          '<div class="ph-eq-part ph-eq-out"><span class="sym" data-sym="a">a</span><b>' + fix(a, 2) + "</b><em>m/s²</em></div>" +
        "</div>" +
        '<label class="ph-slider"><span>' + T("Net force along the line of motion", "Siła wypadkowa wzdłuż kierunku ruchu") + "</span>" +
          '<input type="range" id="phF" min="10" max="1200" step="10" value="' + F + '"><b>' + F + " N</b></label>" +
        '<label class="ph-slider"><span>' + T("Mass being accelerated", "Masa, którą rozpędzasz") + "</span>" +
          '<input type="range" id="phM" min="2" max="300" step="1" value="' + mass + '"><b>' + mass + " kg</b></label>" +
        '<div class="ph-lane"><div class="ph-box" id="phBox" style="width:' + Math.min(90, 26 + mass * 0.22) + "px;height:" +
          Math.min(70, 22 + mass * 0.16) + 'px"></div></div>' +
        '<div class="ph-readout">' +
          '<div class="ph-read"><span>' + T("After 1 second", "Po 1 sekundzie") + "</span><b>" + fix(a, 2) + " m/s</b></div>" +
          '<div class="ph-read"><span>' + T("After 3 seconds", "Po 3 sekundach") + "</span><b>" + fix(a * 3, 2) + " m/s</b></div>" +
          '<div class="ph-read"><span>' + T("Distance in 3 s", "Droga w 3 s") + "</span><b>" + fix(0.5 * a * 9, 1) + " m</b></div>" +
        "</div>" +
        '<div class="ph-demo-note">' + secondNote(F, mass, a) + "</div>";
      host.querySelector("#phF").oninput = e => { F = +e.target.value; paint(); };
      host.querySelector("#phM").oninput = e => { mass = +e.target.value; paint(); };
      wireSyms(host);
      animate(a);
    }
    function animate(a) {
      const box = host.querySelector("#phBox");
      if (!box) return;
      if (secondAnim) cancelAnimationFrame(secondAnim);
      let t0 = null;
      const lane = box.parentElement.clientWidth - box.clientWidth - 8;
      const step = ts => {
        if (!t0) t0 = ts;
        const t = (ts - t0) / 1000;
        const d = 0.5 * a * t * t * 14;
        if (d > lane) { t0 = ts; box.style.transform = "translateX(0px)"; }
        else box.style.transform = "translateX(" + d + "px)";
        secondAnim = requestAnimationFrame(step);
      };
      secondAnim = requestAnimationFrame(step);
    }
    function secondNote(F, m, a) {
      if (a > 8) return T("That is a violent acceleration. For comparison, gravity accelerates a falling body at 9.81 m/s², so this object is gaining speed about as fast as if it were dropped.",
                          "To gwałtowne przyspieszenie. Dla porównania grawitacja rozpędza spadające ciało z 9,81 m/s², więc ten obiekt nabiera prędkości mniej więcej tak szybko, jakby spadał.");
      if (a < 0.5) return T("Barely moving. A large mass with a modest force gives a small acceleration, which is exactly why shifting a heavy patient slowly is easier than shifting them quickly.",
                            "Ledwo się rusza. Duża masa przy umiarkowanej sile daje małe przyspieszenie i właśnie dlatego przemieszczanie ciężkiego pacjenta powoli jest łatwiejsze niż szybko.");
      return T("Notice you can reach this same acceleration many different ways. Double the force and double the mass, and nothing changes: only the ratio matters.",
               "Zauważ, że do tego samego przyspieszenia można dojść na wiele sposobów. Podwój siłę i podwój masę, a nic się nie zmieni: liczy się tylko stosunek.");
    }
    paint();
  }

  // ============================================================ third law demo
  function thirdDemo(host) {
    let push = 300;
    function paint() {
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Two forces, two different objects", "Dwie siły, dwa różne obiekty") + "</div>" +
        '<p class="ph-demo-p">' +
          T("The pair is always equal and opposite. The reason it does not cancel is drawn below: the arrows are on different bodies.",
            "Para zawsze jest równa i przeciwna. Powód, dla którego się nie znosi, jest narysowany poniżej: strzałki są na różnych ciałach.") +
        "</p>" +
        '<label class="ph-slider"><span>' + T("How hard the foot pushes", "Jak mocno stopa naciska") + "</span>" +
          '<input type="range" id="phP" min="50" max="1500" step="10" value="' + push + '"><b>' + push + " N</b></label>" +
        '<div class="ph-third">' +
          '<div class="ph-third-side">' +
            '<div class="ph-third-t">' + T("On the person", "Na człowieka") + "</div>" +
            '<div class="ph-third-fig">🦵</div>' +
            '<div class="ph-arrow up" style="height:' + Math.min(120, push / 12) + 'px"></div>' +
            '<div class="ph-third-v">' + push + " N " + T("upwards", "w górę") + "</div>" +
            '<p>' + T("Pushes them up and forwards. This is the force a force plate measures, and on dry land it is your main source of external horizontal force.",
                      "Pcha go w górę i do przodu. To ta siła, którą mierzy platforma dynamometryczna, a na suchym lądzie główne źródło zewnętrznej siły poziomej.") + "</p>" +
          "</div>" +
          '<div class="ph-third-side">' +
            '<div class="ph-third-t">' + T("On the planet", "Na planetę") + "</div>" +
            '<div class="ph-third-fig">🌍</div>' +
            '<div class="ph-arrow down" style="height:' + Math.min(120, push / 12) + 'px"></div>' +
            '<div class="ph-third-v">' + push + " N " + T("downwards", "w dół") + "</div>" +
            '<p>' + T("Pushes the Earth down and backwards. Exactly as big. The Earth's acceleration from it is about 10⁻²² m/s², which no instrument will ever detect.",
                      "Pcha Ziemię w dół i do tyłu. Dokładnie tak samo mocno. Przyspieszenie Ziemi od tego to około 10⁻²² m/s², czego żaden przyrząd nigdy nie wykryje.") + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="ph-demo-note">' +
          T("Both arrows grow together and neither can exist without the other. A bigger forward push requires a bigger backward push on the ground, with no way round it. Sprinting is more than this alone, since the direction of the force, how long the foot stays down and how the force is timed all matter too, but this pair is where it starts.",
            "Obie strzałki rosną razem i żadna nie może istnieć bez drugiej. Mocniejsze pchnięcie do przodu wymaga mocniejszego odepchnięcia podłoża do tyłu i nie da się tego obejść. Sprint to więcej niż samo to, bo liczą się także kierunek siły, czas kontaktu stopy z podłożem i przebieg siły w czasie, ale ta para jest punktem wyjścia.") +
        "</div>";
      host.querySelector("#phP").oninput = e => { push = +e.target.value; paint(); };
    }
    paint();
  }



  // ================================================== table of contents
  // Built from the headings that are actually in the document, so it cannot end
  // up describing a page that no longer exists. Rebuilt on a language switch
  // along with everything else.
  function toc(host) {
    if (!host) return;
    const heads = [...document.querySelectorAll("main .ph-sec > .ph-h2")];
    heads.forEach((h, i) => {
      if (!h.id) h.id = "sec-" + (i + 1);
    });
    host.innerHTML =
      '<div class="ph-toc-h">' + T("On this page", "Na tej stronie") + "</div>" +
      '<ol class="ph-toc-list">' + heads.map((h, i) =>
        '<li><a href="#' + h.id + '"><span class="ph-toc-n">' + (i + 1) + "</span>" +
        h.textContent.trim() + "</a></li>").join("") + "</ol>";

    // Smooth scrolling, and a heading that briefly marks itself so the reader can
    // see where they landed on a page this long.
    host.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", e => {
        const t = document.getElementById(a.getAttribute("href").slice(1));
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        t.classList.remove("ph-landed");
        void t.offsetWidth;
        t.classList.add("ph-landed");
        history.replaceState(null, "", a.getAttribute("href"));
      });
    });
  }

  // ============================================== free-body diagram builder
  //
  // The four questions are a procedure, and a procedure is learned by running it.
  // The interesting failure is not forgetting a force, it is including one that
  // belongs to a different body, so the wrong options here are the specific
  // wrong answers students actually give: the foot's push on the ground, an
  // internal muscle force, and a "force of motion" that does not exist at all.
  const FBD = [
    {
      id: "stand", m: 70,
      n: { en: "Standing still", pl: "Stanie nieruchomo" },
      body: { en: "The whole person, 70 kg", pl: "Cały człowiek, 70 kg" },
      fig: "🧍",
      forces: [
        { id: "grav", in: true, dir: "down", mag: 1, sym: "W", N: 686.7,
          n: { en: "Gravity on the person, 687 N", pl: "Grawitacja działająca na człowieka, 687 N" },
          why: { en: "Correct. Gravity reaches in without touching, so it is always on the diagram.",
                 pl: "Poprawnie. Grawitacja sięga bez dotykania, więc zawsze jest na rysunku." } },
        { id: "grf", in: true, dir: "up", mag: 1, sym: "N", N: 686.7,
          n: { en: "Ground pushing up on the feet, 687 N", pl: "Podłoże pchające stopy w górę, 687 N" },
          why: { en: "Correct. The floor touches the body, so its push belongs here. It must equal 687 N, because the person is not accelerating.",
                 pl: "Poprawnie. Podłoga dotyka ciała, więc jej pchnięcie należy do rysunku. Musi wynosić 687 N, bo człowiek nie przyspiesza." } },
        { id: "foot", in: false, dir: "down", mag: 1,
          n: { en: "Feet pushing down on the ground, 687 N", pl: "Stopy naciskające na podłoże, 687 N" },
          why: { en: "This one is real, but it acts ON THE GROUND, not on the person. It is the third-law partner of the force above, and putting both on one diagram is the classic way to make everything wrongly cancel.",
                 pl: "Ta siła istnieje, ale działa NA PODŁOŻE, a nie na człowieka. To partner z trzeciej zasady dla siły powyżej, a umieszczenie obu na jednym rysunku to klasyczny sposób na błędne wyzerowanie wszystkiego." } },
        { id: "musc", in: false, dir: "up", mag: 0.6,
          n: { en: "Leg muscles holding the body up", pl: "Mięśnie nóg utrzymujące ciało" },
          why: { en: "Real, and doing genuine work, but internal. Your chosen body is the whole person, so the muscles are inside it and their forces cancel in pairs. Choose a single segment instead and they would appear.",
                 pl: "Prawdziwe i wykonujące realną pracę, ale wewnętrzne. Wybranym ciałem jest cały człowiek, więc mięśnie są w jego wnętrzu, a ich siły znoszą się parami. Wybierz pojedynczy segment, a się pojawią." } },
      ],
      done: { en: "Two forces, equal and opposite, net force zero, no acceleration. Everything else was either acting on another body or hiding inside this one.",
              pl: "Dwie siły, równe i przeciwne, siła wypadkowa zero, brak przyspieszenia. Wszystko inne albo działało na inne ciało, albo kryło się wewnątrz tego." },
    },
    {
      id: "fall", m: 70,
      n: { en: "Mid-fall, before landing", pl: "W trakcie upadku, przed lądowaniem" },
      body: { en: "The whole person, 70 kg, in the air", pl: "Cały człowiek, 70 kg, w powietrzu" },
      fig: "🤸",
      forces: [
        { id: "grav", in: true, dir: "down", mag: 1, sym: "W", N: 686.7,
          n: { en: "Gravity on the person, 687 N", pl: "Grawitacja działająca na człowieka, 687 N" },
          why: { en: "Correct, and at low speed it is very nearly the only one. That is why the acceleration comes out at about 9.81 m/s² whatever the person weighs.",
                 pl: "Poprawnie, a przy małej prędkości jest niemal jedyna. Dlatego przyspieszenie wychodzi około 9,81 m/s² niezależnie od masy człowieka." } },
        { id: "grf", in: false, dir: "up", mag: 1,
          n: { en: "Ground pushing up, 687 N", pl: "Podłoże pchające w górę, 687 N" },
          why: { en: "Nothing is touching them. A contact force cannot exist without contact, and this is the moment to notice that the ground reaction was never automatic.",
                 pl: "Nic go nie dotyka. Siła kontaktowa nie może istnieć bez kontaktu i to jest moment, by zauważyć, że reakcja podłoża nigdy nie była oczywista." } },
        { id: "motion", in: false, dir: "down", mag: 0.5,
          n: { en: "The downward force of the fall", pl: "Siła spadania, skierowana w dół" },
          why: { en: "There is no such force. Falling is what happens when gravity is unopposed; it does not add a second push of its own. Motion is not a force, and inventing one is the most common thing to draw that simply is not there.",
                 pl: "Taka siła nie istnieje. Spadanie to skutek niezrównoważonej grawitacji; nie dokłada drugiego, własnego pchnięcia. Ruch nie jest siłą, a wymyślanie jej to najczęstsza rzecz rysowana zupełnie bez powodu." } },
      ],
      done: { en: "One force. Net force 687 N down, acceleration 9.81 m/s² down. This is the simplest free-body diagram there is, and it is simple because nothing is touching.",
              pl: "Jedna siła. Siła wypadkowa 687 N w dół, przyspieszenie 9,81 m/s² w dół. To najprostszy diagram sił, jaki istnieje, i jest prosty dlatego, że nic nie dotyka ciała." },
    },
    {
      id: "lift", m: 70,
      n: { en: "In a lift starting upwards", pl: "W windzie ruszającej w górę" },
      body: { en: "The whole person, 70 kg, accelerating up at 2 m/s²", pl: "Cały człowiek, 70 kg, przyspieszający w górę z 2 m/s²" },
      fig: "🛗",
      forces: [
        { id: "grav", in: true, dir: "down", mag: 1, sym: "W", N: 686.7,
          n: { en: "Gravity on the person, 687 N", pl: "Grawitacja działająca na człowieka, 687 N" },
          why: { en: "Correct, and unchanged. Gravity does not care that the lift is moving.",
                 pl: "Poprawnie i bez zmian. Grawitacji nie obchodzi, że winda jedzie." } },
        { id: "floor", in: true, dir: "up", mag: 1.2, sym: "N", N: 826.7,
          n: { en: "Lift floor pushing up, 827 N", pl: "Podłoga windy pchająca w górę, 827 N" },
          why: { en: "Correct, and this is the one that changed. For the person to accelerate up at 2 m/s², the net force must be 70 × 2 = 140 N upwards, so the floor must push 687 + 140 = 827 N. That extra 140 N is the whole sensation of a lift starting, and it is why a scale would read heavier.",
                 pl: "Poprawnie i to właśnie ta się zmieniła. Aby człowiek przyspieszał w górę z 2 m/s², siła wypadkowa musi wynosić 70 × 2 = 140 N w górę, więc podłoga musi pchać 687 + 140 = 827 N. Te dodatkowe 140 N to całe odczucie ruszającej windy i dlatego waga pokazałaby więcej." } },
        { id: "up", in: false, dir: "up", mag: 0.5,
          n: { en: "The upward force of the lift's motion", pl: "Siła ruchu windy, skierowana w górę" },
          why: { en: "Not a separate force. The lift acts on the person through its floor and nothing else, and that push is already on the diagram. Adding motion as its own arrow double-counts it.",
                 pl: "To nie jest osobna siła. Winda działa na człowieka wyłącznie przez swoją podłogę, a to pchnięcie już jest na rysunku. Dodanie ruchu jako osobnej strzałki liczy je dwa razy." } },
      ],
      done: { en: "Same two forces as standing still, but no longer equal. The floor wins by 140 N, and that leftover is exactly the mass times the acceleration.",
              pl: "Te same dwie siły co przy staniu, ale już nie równe. Podłoga wygrywa o 140 N, a ta nadwyżka to dokładnie masa razy przyspieszenie." },
    },
  ];

  // Sign bookkeeping, kept apart from the drawing so the test suite can drive it.
  // axis = +1 means "up is positive", axis = -1 means "down is positive". Nothing
  // in here privileges either, which is the entire point.
  const FBDMATH = {
    component: (f, axis) => f.N * (f.dir === "up" ? 1 : -1) * axis,
    solve(scenarioId, axis) {
      const s = FBD.find(x => x.id === scenarioId);
      if (!s || !axis) return null;
      const terms = s.forces.filter(f => f.in).map(f => ({
        sym: f.sym, magnitude: f.N, signed: FBDMATH.component(f, axis),
      }));
      const sumF = terms.reduce((t, x) => t + x.signed, 0);
      const aSigned = sumF / s.m;
      return { terms, sumF, aSigned, aMagnitude: Math.abs(aSigned), m: s.m };
    },
  };
  window.__physicsFBD = { FBD, FBDMATH };

  function fbdDemo(host) {
    if (!host) return;
    let si = 0, picked = {}, checked = false, axis = 0;   // axis 0 = not chosen yet
    const sc = () => FBD[si];

    function reset() { picked = {}; checked = false; axis = 0; }

    function figure() {
      const s = sc(), W = 250, H = 260, cx = 125, cy = 130;
      let arrows = "";
      s.forces.forEach(f => {
        if (!picked[f.id]) return;
        const len = 42 + f.mag * 34;
        const up = f.dir === "up";
        const y2 = up ? cy - len : cy + len;
        const good = checked ? (f.in ? "ok" : "bad") : "pend";
        arrows +=
          '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + y2 +
            '" class="fbd-arw fbd-' + good + '" marker-end="url(#fbd-' + (up ? "u" : "d") + "-" + good + ')"/>';
        // Once an axis exists, every arrow carries its sign under that convention.
        if (axis && f.in && f.sym) {
          const sgn = FBDMATH.component(f, axis) >= 0 ? "+" : "−";
          arrows += '<text x="' + (cx + 13) + '" y="' + ((cy + y2) / 2 + 4) +
            '" class="fbd-sign ' + (sgn === "+" ? "fbd-pos" : "fbd-neg") + '">' + sgn + f.sym + "</text>";
        }
      });
      // the axis marker, drawn only after the reader has committed to one
      if (axis) {
        const ax = 34, ay = axis > 0 ? 74 : 40, ay2 = axis > 0 ? 40 : 74;
        arrows += '<line x1="' + ax + '" y1="' + ay + '" x2="' + ax + '" y2="' + ay2 +
          '" class="fbd-axis" marker-end="url(#fbd-' + (axis > 0 ? "u" : "d") + '-axis)"/>' +
          '<text x="' + (ax + 9) + '" y="' + (axis > 0 ? 44 : 78) + '" class="fbd-axis-l">+y</text>';
      }
      const head = (id, col) =>
        '<marker id="' + id + '" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">' +
        '<polygon points="0 0, 10 4, 0 8" fill="' + col + '"/></marker>';
      return '<svg viewBox="0 0 ' + W + " " + H + '" class="fbd-svg"><defs>' +
        ["u", "d"].map(d => head("fbd-" + d + "-pend", "#7c9bff") + head("fbd-" + d + "-ok", "#5eead4") +
                            head("fbd-" + d + "-bad", "#ff6f5e") + head("fbd-" + d + "-axis", "#ffd166")).join("") + "</defs>" +
        '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" rx="12" class="fbd-box"/>' +
        arrows +
        '<text x="' + cx + '" y="' + (cy + 16) + '" class="fbd-fig">' + s.fig + "</text>" +
        '<circle cx="' + cx + '" cy="' + cy + '" r="4" class="fbd-com"/>' +
        "</svg>";
    }


    // ------------------------------------------------ step five: the positive axis
    // Nothing is chosen by default and nothing proceeds without a choice. Letting
    // the page quietly assume "up" would teach the rule this step exists to
    // dismantle: that up and right are somehow intrinsically positive.
    function axisStep() {
      const s = sc();
      if (!axis) {
        return '<div class="fbd-axis-step"><div class="fbd-step5">' +
            '<span class="fbd-step5-n">5</span>' +
            "<b>" + T("Which direction will you call positive?",
                      "Który kierunek nazwiesz dodatnim?") + "</b>" +
          "</div>" +
          '<p class="fbd-axis-p">' +
            T("You have a correct diagram and you still cannot write an equation, because a plus sign has no meaning until you say which way it points. Pick one. There is no wrong answer here, and that is the lesson.",
              "Masz poprawny rysunek i nadal nie możesz zapisać równania, bo znak plus nic nie znaczy, dopóki nie powiesz, w którą stronę wskazuje. Wybierz jeden. Nie ma tu złej odpowiedzi i to jest właśnie ta lekcja.") +
          "</p>" +
          '<div class="fbd-axis-btns">' +
            '<button class="fbd-axis-btn" data-ax="1">↑ ' + T("upwards is positive", "w górę jest dodatnie") + "</button>" +
            '<button class="fbd-axis-btn" data-ax="-1">↓ ' + T("downwards is positive", "w dół jest dodatnie") + "</button>" +
          "</div></div>";
      }

      const r = FBDMATH.solve(s.id, axis);
      const round = v => (Math.abs(v) < 0.05 ? 0 : v);
      // Positive terms first, purely so the equation reads the way one would say it.
      const ordered = r.terms.slice().sort((a, b) => b.signed - a.signed);
      const lhs = ordered.map((t, i) => {
        const neg = t.signed < 0;
        return (i === 0 ? (neg ? "−" : "") : (neg ? " − " : " + ")) + t.sym;
      }).join("");
      const nums = ordered.map((t, i) => {
        const neg = t.signed < 0;
        return (i === 0 ? (neg ? "−" : "") : (neg ? " − " : " + ")) + Math.round(t.magnitude);
      }).join("");
      const moving = Math.abs(r.aSigned) > 0.01;
      const rhs = moving ? "m · a" : "0";

      return '<div class="fbd-axis-step done">' +
        '<div class="fbd-axis-head">' +
          "<b>" + (axis > 0 ? T("Upwards is positive", "W górę jest dodatnie")
                            : T("Downwards is positive", "W dół jest dodatnie")) + "</b>" +
          '<button class="fbd-flip" id="fbdFlip">' +
            T("Flip the axis and watch", "Odwróć oś i patrz") + "</button>" +
        "</div>" +
        '<div class="fbd-eq">' +
          '<div class="fbd-eq-row"><span>' + T("Signs from your axis", "Znaki z Twojej osi") + "</span>" +
            "<code>" + lhs + " = " + rhs + "</code></div>" +
          '<div class="fbd-eq-row"><span>' + T("Numbers in", "Podstawione liczby") + "</span>" +
            "<code>" + nums + " = " + (moving ? s.m + " · a" : "0") + "</code></div>" +
          '<div class="fbd-eq-row"><span>' + T("Net force", "Siła wypadkowa") + "</span>" +
            "<code>" + fix(round(r.sumF), 0) + " N</code></div>" +
          '<div class="fbd-eq-row fbd-eq-out"><span>' + T("Acceleration", "Przyspieszenie") + "</span>" +
            "<code>a = " + fix(round(r.aSigned), 2) + " m/s²</code></div>" +
        "</div>" +
        '<p class="fbd-axis-note">' + axisNote(r) + "</p>" +
        "</div>";
    }

    function axisNote(r) {
      const s = sc();
      if (s.id === "stand")
        return T("Nothing accelerates, so the two forces cancel and the equation says zero either way. Flip the axis: both signs swap, and zero stays zero. The bookkeeping changed and the physics did not.",
                 "Nic nie przyspiesza, więc obie siły znoszą się i równanie daje zero w obu wariantach. Odwróć oś: oba znaki się zamieniają, a zero pozostaje zerem. Zmieniła się buchalteria, a nie fizyka.");
      if (s.id === "fall")
        return axis > 0
          ? T("The acceleration came out negative. That does NOT mean slowing down. It means the acceleration points the opposite way to the axis you chose, which is downwards, which is exactly where a falling person accelerates. Its size is 9.81 m/s² whichever way you set the axis.",
              "Przyspieszenie wyszło ujemne. To NIE znaczy zwalniania. Znaczy, że przyspieszenie jest skierowane przeciwnie do wybranej przez Ciebie osi, czyli w dół, czyli dokładnie tam, gdzie przyspiesza spadający człowiek. Jego wartość to 9,81 m/s² niezależnie od ustawienia osi.")
          : T("Now the same fall gives a positive acceleration, because you pointed the axis the same way the motion goes. Nothing about the fall changed. A sign is a statement about your axis, not about the world.",
              "Teraz ten sam upadek daje dodatnie przyspieszenie, bo skierowałeś oś tak samo jak ruch. W upadku nic się nie zmieniło. Znak jest wypowiedzią o Twojej osi, a nie o świecie.");
      return T("The floor pushes with 827 N under either convention. Only the signs moved. That invariance is the point of the whole step: if flipping your axis changed a physical force, you would have made an arithmetic mistake.",
               "Podłoga naciska siłą 827 N przy obu konwencjach. Zmieniły się tylko znaki. Ta niezmienniczość jest sednem całego kroku: gdyby odwrócenie osi zmieniło siłę fizyczną, oznaczałoby to błąd rachunkowy.");
    }

    function paint() {
      const s = sc();
      const wrong = s.forces.filter(f => picked[f.id] && !f.in).length;
      const missing = s.forces.filter(f => !picked[f.id] && f.in).length;
      const right = checked && !wrong && !missing;
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Build the diagram yourself", "Zbuduj rysunek samodzielnie") + "</div>" +
        '<p class="ph-demo-p">' +
          T("Pick a situation, then decide which forces belong on the body. Some of the options are real forces that still do not go on this diagram, which is the part worth getting wrong at least once.",
            "Wybierz sytuację, a potem zdecyduj, które siły należą do ciała. Część opcji to prawdziwe siły, które mimo to nie trafiają na ten rysunek, i właśnie na tym warto się choć raz pomylić.") +
        "</p>" +
        '<div class="ph-chips">' + FBD.map((x, i) =>
          '<button class="ph-chip' + (i === si ? " on" : "") + '" data-s="' + i + '">' + L(x.n) + "</button>").join("") + "</div>" +
        '<div class="fbd-wrap">' +
          '<div class="fbd-stage">' +
            '<div class="fbd-body"><b>' + T("The body", "Ciało") + "</b>" + L(s.body) + "</div>" +
            figure() +
          "</div>" +
          '<div class="fbd-opts">' +
            '<div class="fbd-opts-h">' + T("Does this go on the diagram?", "Czy to trafia na rysunek?") + "</div>" +
            s.forces.map(f => {
              const on = !!picked[f.id];
              const cls = checked ? (on ? (f.in ? " right" : " wrong") : (f.in ? " missed" : " fine")) : (on ? " on" : "");
              return '<button class="fbd-opt' + cls + '" data-f="' + f.id + '">' +
                '<span class="fbd-tick">' + (checked ? (on === !!f.in ? "✓" : "✕") : (on ? "▣" : "▢")) + "</span>" +
                '<span class="fbd-nm">' + L(f.n) + "</span>" +
                '<span class="fbd-dir">' + (f.dir === "up" ? "↑" : "↓") + "</span></button>" +
                (checked ? '<p class="fbd-why' + (f.in ? " in" : " out") + '">' + L(f.why) + "</p>" : "");
            }).join("") +
            '<div class="fbd-actions">' +
              '<button class="fbd-btn" id="fbdGo">' +
                (checked ? T("Try another", "Spróbuj innej") : T("Check my diagram", "Sprawdź mój rysunek")) + "</button>" +
              (checked ? "" : '<span class="fbd-hint">' + T("Choose as many or as few as you think belong.",
                                                             "Wybierz tyle, ile Twoim zdaniem należy.") + "</span>") +
            "</div>" +
          "</div>" +
        "</div>" +
        (checked
          ? '<div class="ph-demo-note ' + (right ? "fbd-good" : "fbd-bad") + '"><b>' +
            (right ? T("That is the diagram.", "To jest ten rysunek.")
                   : T("Not quite yet.", "Jeszcze nie do końca.")) + "</b> " +
            (right ? L(s.done)
                   : T("Read the explanations above. The forces you should not draw are not imaginary; they are real forces that act somewhere else, or inside the body you chose.",
                       "Przeczytaj wyjaśnienia powyżej. Siły, których nie należy rysować, nie są wyimaginowane; to prawdziwe siły działające gdzie indziej albo wewnątrz wybranego przez Ciebie ciała.")) +
            "</div>"
          : "") +
        (checked && right ? axisStep() : "");

      host.querySelectorAll(".ph-chip").forEach(b =>
        b.onclick = () => { si = +b.dataset.s; reset(); paint(); });
      host.querySelectorAll(".fbd-opt").forEach(b =>
        b.onclick = () => { if (checked) return; picked[b.dataset.f] = !picked[b.dataset.f]; paint(); });
      host.querySelector("#fbdGo").onclick = () => {
        if (checked) { reset(); } else { checked = true; }
        paint();
      };
      host.querySelectorAll(".fbd-axis-btn").forEach(b =>
        b.onclick = () => { axis = +b.dataset.ax; paint(); });
      const flip = host.querySelector("#fbdFlip");
      if (flip) flip.onclick = () => { axis = -axis; paint(); };
    }
    paint();
  }

  // ==================================================== moment arm, interactive
  //
  //     M = r F sin(theta) = F d_perp
  //
  // The one sentence this demo exists to deliver: the moment does not depend on
  // how far from the pivot you grabbed the thing. It depends on the perpendicular
  // distance from the pivot to the LINE the force acts along. Those two are equal
  // only when you pull at a right angle, which is the case textbooks draw and the
  // reason the distinction gets missed.
  //
  // Pure geometry, so the maths is exposed for the test suite rather than
  // duplicated there.
  const TORQUE = {
    dPerp: (r, thetaDeg) => Math.abs(r * Math.sin(thetaDeg * Math.PI / 180)),
    moment: (r, F, thetaDeg) => r * F * Math.sin(thetaDeg * Math.PI / 180),
  };
  window.__physicsTorque = TORQUE;

  function torqueDemo(host) {
    let r = 0.30, F = 100, th = 90;
    const PRESETS = [
      { th: 90, n: { en: "90°, square on", pl: "90°, prostopadle" },
        d: { en: "the biggest moment this force can give", pl: "największy moment, jaki ta siła może dać" } },
      { th: 45, n: { en: "45°, angled", pl: "45°, pod kątem" },
        d: { en: "same force, same grip, about 71% of the moment", pl: "ta sama siła, ten sam chwyt, około 71% momentu" } },
      { th: 0, n: { en: "0°, along the lever", pl: "0°, wzdłuż dźwigni" },
        d: { en: "same force, same grip, no moment at all", pl: "ta sama siła, ten sam chwyt, zero momentu" } },
    ];

    function svg() {
      const W = 620, H = 300, ox = 110, oy = 200;   // pivot on screen
      const SC = 420;                                // metres to pixels
      const px = ox + r * SC, py = oy;               // point of application
      const rad = th * Math.PI / 180;
      const ux = Math.cos(rad), uy = -Math.sin(rad); // force direction, screen y is down

      // foot of the perpendicular dropped from the pivot onto the line of action
      const wx = ox - px, wy = oy - py;
      const t = wx * ux + wy * uy;
      const qx = px + t * ux, qy = py + t * uy;

      const dp = TORQUE.dPerp(r, th);
      const M = TORQUE.moment(r, F, th);
      const L = 460;                                  // half-length of the drawn line of action
      const aLen = 30 + F * 0.42;                     // arrow length scales with the force

      const line = (x1, y1, x2, y2, cls) =>
        '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) +
        '" y2="' + y2.toFixed(1) + '" class="' + cls + '"/>';

      return '<svg viewBox="0 0 ' + W + " " + H + '" class="ph-tq-svg" preserveAspectRatio="xMidYMid meet">' +
        '<defs><marker id="tqhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">' +
          '<polygon points="0 0, 9 3.5, 0 7" fill="#ffd166"/></marker></defs>' +
        // the line the force acts along, extended both ways
        line(px - ux * L, py - uy * L, px + ux * L, py + uy * L, "tq-line") +
        // the lever itself
        line(ox, oy, ox + 0.46 * SC, oy, "tq-lever") +
        // the perpendicular from the pivot to that line
        line(ox, oy, qx, qy, "tq-perp") +
        // r, from pivot to the point of application
        line(ox, oy, px, py, "tq-r") +
        // the force arrow
        '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' + (px + ux * aLen).toFixed(1) +
          '" y2="' + (py + uy * aLen).toFixed(1) + '" class="tq-force" marker-end="url(#tqhead)"/>' +
        '<circle cx="' + ox + '" cy="' + oy + '" r="7" class="tq-pivot"/>' +
        '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4.5" class="tq-point"/>' +
        (dp > 0.004 ? '<circle cx="' + qx.toFixed(1) + '" cy="' + qy.toFixed(1) + '" r="3.5" class="tq-foot"/>' : "") +
        '<text x="' + (ox + r * SC / 2) + '" y="' + (oy + 19) + '" class="tq-lab tq-lab-r">r = ' + fix(r, 2) + " m</text>" +
        (dp > 0.02
          ? '<text x="' + ((ox + qx) / 2 + 8).toFixed(1) + '" y="' + ((oy + qy) / 2 - 7).toFixed(1) +
            '" class="tq-lab tq-lab-d">d⊥ = ' + fix(dp, 3) + " m</text>"
          : '<text x="' + (ox + 14) + '" y="' + (oy - 14) + '" class="tq-lab tq-lab-d">d⊥ = 0</text>') +
        '<text x="' + (px + ux * aLen + (ux > 0 ? 8 : -54)).toFixed(1) + '" y="' +
          (py + uy * aLen - 8).toFixed(1) + '" class="tq-lab tq-lab-f">F = ' + fix(F, 0) + " N</text>" +
        "</svg>";
    }

    function paint() {
      const dp = TORQUE.dPerp(r, th), M = TORQUE.moment(r, F, th);
      const maxM = r * F;
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Where the perpendicular actually is", "Gdzie naprawdę jest ta prostopadła") + "</div>" +
        '<p class="ph-demo-p">' +
          T("A spanner on a bolt, before any anatomy. Drag the angle first and watch the two distances come apart: r is where your hand is, d⊥ is what the bolt feels. They agree only at 90°.",
            "Klucz na śrubie, zanim pojawi się jakakolwiek anatomia. Najpierw pociągnij za kąt i patrz, jak te dwie odległości się rozjeżdżają: r to miejsce, gdzie masz dłoń, a d⊥ to, co czuje śruba. Zgadzają się tylko przy 90°.") +
        "</p>" +
        '<div class="ph-tq-presets">' + PRESETS.map((pr, i) =>
          '<button class="ph-tq-preset' + (Math.abs(th - pr.th) < 0.5 ? " on" : "") + '" data-p="' + i + '">' +
            "<b>" + L(pr.n) + "</b><em>" + L(pr.d) + "</em></button>").join("") + "</div>" +
        '<div class="ph-tq-stage">' + svg() + "</div>" +
        '<div class="ph-tq-legend">' +
          '<span class="tq-k tq-k-r"></span>' + T("r, to your hand", "r, do Twojej dłoni") +
          '<span class="tq-k tq-k-line"></span>' + T("line of action", "linia działania siły") +
          '<span class="tq-k tq-k-perp"></span>' + T("d⊥, what counts", "d⊥, to, co się liczy") +
        "</div>" +
        '<label class="ph-slider"><span>' + T("Angle of the force, θ", "Kąt działania siły, θ") + "</span>" +
          '<input type="range" id="phTh" min="-180" max="180" step="1" value="' + th + '"><b>' + fix(th, 0) + "°</b></label>" +
        '<label class="ph-slider"><span>' + T("Where you grip, r", "Gdzie chwytasz, r") + "</span>" +
          '<input type="range" id="phR" min="0.05" max="0.45" step="0.01" value="' + r + '"><b>' + fix(r, 2) + " m</b></label>" +
        '<label class="ph-slider"><span>' + T("Force, F", "Siła, F") + "</span>" +
          '<input type="range" id="phFF" min="10" max="300" step="5" value="' + F + '"><b>' + fix(F, 0) + " N</b></label>" +
        '<div class="ph-formula ph-formula-sm ph-tq-eq">' +
          '<span class="sym" data-sym="M">M</span><span class="op">=</span>' +
          "<i>r</i><span class=\"op\">·</span><span class=\"sym\" data-sym=\"F\">F</span><span class=\"op\">·</span>sin θ" +
          '<span class="op">=</span><span class="sym" data-sym="F">F</span><span class="op">·</span>' +
          '<span class="sym" data-sym="d">d⊥</span><span class="op">=</span><b>' + fix(M, 2) + " N·m</b></div>" +
        '<div class="ph-readout">' +
          '<div class="ph-read"><span>' + T("Grip distance r", "Odległość chwytu r") + "</span><b>" + fix(r, 2) + " m</b></div>" +
          '<div class="ph-read ph-read-move"><span>' + T("Moment arm d⊥ = r · sin θ", "Ramię siły d⊥ = r · sin θ") +
            "</span><b>" + fix(dp, 3) + " m</b><em>" + fix(r, 2) + " × sin " + fix(th, 0) + "°</em></div>" +
          '<div class="ph-read"><span>' + T("Moment", "Moment") + "</span><b>" + fix(M, 2) + " N·m</b></div>" +
          '<div class="ph-read"><span>' + T("Fraction of the best you could get", "Ułamek tego, co najlepsze możliwe") +
            "</span><b>" + (maxM > 0 ? fix(Math.abs(M) / maxM * 100, 0) : "0") + " %</b></div>" +
        "</div>" +
        '<div class="ph-demo-note">' + note(dp, M) + "</div>";

      host.querySelector("#phTh").oninput = e => { th = +e.target.value; paint(); };
      host.querySelector("#phR").oninput = e => { r = +e.target.value; paint(); };
      host.querySelector("#phFF").oninput = e => { F = +e.target.value; paint(); };
      host.querySelectorAll(".ph-tq-preset").forEach(b =>
        b.onclick = () => { th = PRESETS[+b.dataset.p].th; paint(); });
      wireSyms(host);
    }

    function note(dp, M) {
      if (Math.abs(M) < 0.06)
        return T("The force is pointing straight along the lever, so its line of action passes through the pivot itself. The perpendicular distance is zero, and so is the moment, no matter how hard you pull. Push a door exactly towards its hinge and it will not swing.",
                 "Siła jest skierowana dokładnie wzdłuż dźwigni, więc jej linia działania przechodzi przez samą oś obrotu. Odległość prostopadła wynosi zero i moment też, niezależnie od tego, jak mocno ciągniesz. Naciśnij drzwi dokładnie w stronę zawiasu, a się nie obrócą.");
      if (M < 0)
        return T("The moment has changed sign. The force now turns the spanner the other way. Nothing about how hard you pull has changed, only the direction, and direction is half of what a force is.",
                 "Moment zmienił znak. Siła obraca teraz klucz w drugą stronę. Nic się nie zmieniło w tym, jak mocno ciągniesz, tylko kierunek, a kierunek to połowa tego, czym jest siła.");
      if (Math.abs(Math.abs(th) - 90) < 3)
        return T("Square on, and only here do r and d⊥ agree. This is the case textbooks draw, which is exactly why the difference between the two is so easy to miss.",
                 "Prostopadle, i tylko tutaj r i d⊥ są sobie równe. To ten przypadek, który rysują podręczniki, i właśnie dlatego różnicę między nimi tak łatwo przeoczyć.");
      return T("Notice r has not moved. Your hand is in the same place and you are pulling just as hard, yet the moment has dropped, because the perpendicular distance from the pivot to the line of action has shrunk. That distance, not your grip, is what the bolt responds to.",
               "Zwróć uwagę, że r się nie zmieniło. Twoja dłoń jest w tym samym miejscu i ciągniesz tak samo mocno, a mimo to moment spadł, bo skurczyła się prostopadła odległość od osi do linii działania siły. To ta odległość, a nie Twój chwyt, jest tym, na co reaguje śruba.");
    }
    paint();
  }

  // ============================================================ moment demo
  function momentDemo(host) {
    let load = 50, dist = 0.30;
    const MUSCLE_ARM = 0.04;
    function paint() {
      const M = load * dist;
      const need = M / MUSCLE_ARM;
      host.innerHTML =
        '<div class="ph-demo-h">' + T("Why muscles pull so hard", "Dlaczego mięśnie ciągną tak mocno") + "</div>" +
        '<p class="ph-demo-p">' +
          T("A weight in the hand, the elbow as the pivot, and the biceps moment arm set to 4 cm. Move the load out and watch what the muscle has to do about it.",
            "Ciężar w dłoni, łokieć jako oś obrotu i ramię siły bicepsa ustawione na 4 cm. Odsuń obciążenie i zobacz, co mięsień musi z tym zrobić.") +
        "</p>" +
        '<div class="ph-assume"><b>' + T("What this demo assumes", "Co ta demonstracja zakłada") + "</b><ul>" +
          [T("The forearm is horizontal and the load hangs vertically, so the distance along the forearm IS the perpendicular moment arm. Tilt the forearm and that stops being true.",
             "Przedramię jest poziome, a obciążenie zwisa pionowo, więc odległość wzdłuż przedramienia JEST prostopadłym ramieniem siły. Przechyl przedramię, a przestaje to być prawdą."),
           T("The biceps moment arm is held at 4 cm. In a real elbow it changes throughout the range of motion.",
             "Ramię siły bicepsa jest utrzymywane na 4 cm. W prawdziwym łokciu zmienia się w całym zakresie ruchu."),
           T("Held still, so the moments balance. The forearm's own weight is ignored, and one muscle is doing all the work, which is never the case.",
             "Trzymane nieruchomo, więc momenty się równoważą. Ciężar samego przedramienia jest pominięty, a całą pracę wykonuje jeden mięsień, co nigdy nie zachodzi.")]
            .map(x => "<li>" + x + "</li>").join("") + "</ul></div>" +
        '<label class="ph-slider"><span>' + T("Weight in the hand", "Ciężar w dłoni") + "</span>" +
          '<input type="range" id="phL" min="10" max="300" step="5" value="' + load + '"><b>' + load + " N</b></label>" +
        '<label class="ph-slider"><span>' + T("Perpendicular distance from elbow", "Odległość prostopadła od łokcia") + "</span>" +
          '<input type="range" id="phD" min="0.10" max="0.45" step="0.01" value="' + dist + '"><b>' + fix(dist, 2) + " m</b></label>" +
        '<div class="ph-lever"><div class="ph-pivot"></div>' +
          '<div class="ph-arm"></div>' +
          '<div class="ph-load" style="left:' + (8 + dist * 190) + "%;transform:scale(" + (0.6 + load / 300) + ')">⬇</div>' +
        "</div>" +
        '<div class="ph-formula ph-formula-sm"><span class="sym" data-sym="M">M</span><span class="op">=</span>' +
          '<span class="sym" data-sym="F">' + load + "</span><span class=\"op\">·</span>" +
          '<span class="sym" data-sym="d">' + fix(dist, 2) + "</span><span class=\"op\">=</span><b>" + fix(M, 1) + " N·m</b></div>" +
        '<div class="ph-demo-sub">' +
          T("The muscle force below is what the biceps alone would need if it were the only thing holding the forearm up. It is not a measurement, and a real elbow shares the job between several muscles in a way mechanics alone cannot resolve.",
            "Siła mięśnia poniżej to tyle, ile potrzebowałby sam biceps, gdyby jako jedyny utrzymywał przedramię. To nie jest pomiar, a prawdziwy łokieć dzieli tę pracę między kilka mięśni w sposób, którego sama mechanika nie rozstrzyga.") +
        "</div>" +
        '<div class="ph-readout">' +
          '<div class="ph-read"><span>' + T("Turning effect of the load", "Moment od obciążenia") + "</span><b>" + fix(M, 1) + " N·m</b></div>" +
          '<div class="ph-read ph-read-move"><span>' + T("Force the biceps must make", "Siła, którą musi wytworzyć biceps") + "</span><b>" + fix(need, 0) + " N</b>" +
            "<em>" + fix(M, 1) + " ÷ " + fix(MUSCLE_ARM, 2) + "</em></div>" +
          '<div class="ph-read"><span>' + T("Times heavier than the load", "Ile razy więcej niż obciążenie") + "</span><b>" + fix(need / load, 1) + " ×</b></div>" +
        "</div>" +
        '<div class="ph-demo-note">' +
          T("The muscle is always at a disadvantage, because its moment arm is tiny and the load's is not. This buys speed and range instead: a small shortening of the muscle swings the hand a long way. Bodies trade force for movement, everywhere, on purpose.",
            "Mięsień zawsze jest na gorszej pozycji, bo jego ramię siły jest maleńkie, a ramię obciążenia nie. W zamian kupuje prędkość i zakres: niewielkie skrócenie mięśnia przenosi dłoń na dużą odległość. Ciała wszędzie i celowo wymieniają siłę na ruch.") +
        "</div>";
      host.querySelector("#phL").oninput = e => { load = +e.target.value; paint(); };
      host.querySelector("#phD").oninput = e => { dist = +e.target.value; paint(); };
      wireSyms(host);
    }
    paint();
  }

  // ============================================================ quiz
  const QUIZ = [
    {
      q: { en: "A car is driving down a straight motorway at a steady 120 km/h. What is its acceleration?",
           pl: "Samochód jedzie prostą autostradą ze stałą prędkością 120 km/h. Jakie jest jego przyspieszenie?" },
      o: [{ en: "Very large, it is going fast", pl: "Bardzo duże, przecież jedzie szybko" },
          { en: "Zero", pl: "Zerowe" },
          { en: "Equal to its velocity", pl: "Równe jego prędkości" },
          { en: "Impossible to say", pl: "Nie da się powiedzieć" }],
      a: 1,
      why: { en: "Zero. Acceleration is how fast velocity is CHANGING, and this velocity is not changing at all. Going fast and accelerating are completely separate things, and this is the confusion that costs people the most.",
             pl: "Zerowe. Przyspieszenie to tempo ZMIANY prędkości, a ta prędkość wcale się nie zmienia. Szybka jazda i przyspieszanie to zupełnie różne rzeczy i właśnie to pomylenie kosztuje najwięcej." },
    },
    {
      q: { en: "You take a 10 kg dumbbell to the Moon. What happens to its mass and its weight?",
           pl: "Zabierasz hantel 10 kg na Księżyc. Co dzieje się z jego masą i ciężarem?" },
      o: [{ en: "Both drop to about a sixth", pl: "Oba spadają do około jednej szóstej" },
          { en: "Both stay the same", pl: "Oba pozostają bez zmian" },
          { en: "Mass stays 10 kg, weight drops to about a sixth", pl: "Masa zostaje 10 kg, ciężar spada do około jednej szóstej" },
          { en: "Mass drops, weight stays the same", pl: "Masa spada, ciężar zostaje bez zmian" }],
      a: 2,
      why: { en: "Mass is how much stuff, and no stuff was left behind, so it is still 10 kg. Weight is the force of gravity on that stuff, and the Moon pulls about six times more weakly, so it drops to about 16 N from about 98 N.",
             pl: "Masa to ilość materii, a nic z niej nie ubyło, więc nadal jest 10 kg. Ciężar to siła grawitacji działająca na tę materię, a Księżyc przyciąga około sześć razy słabiej, więc spada z około 98 N do około 16 N." },
    },
    {
      q: { en: "You are standing still. Gravity pulls you down with about 700 N. Why are you not accelerating downwards?",
           pl: "Stoisz nieruchomo. Grawitacja ciągnie Cię w dół siłą około 700 N. Dlaczego nie przyspieszasz w dół?" },
      o: [{ en: "Gravity switches off when you stand", pl: "Grawitacja wyłącza się, gdy stoisz" },
          { en: "The floor pushes up with an equal force, so the net force is zero", pl: "Podłoga pcha w górę równą siłą, więc siła wypadkowa jest zerowa" },
          { en: "700 N is too small to move a person", pl: "700 N to za mało, by poruszyć człowieka" },
          { en: "Your muscles cancel gravity out", pl: "Twoje mięśnie znoszą grawitację" }],
      a: 1,
      why: { en: "The floor pushes back. Two very large forces, pointing opposite ways, leaving almost nothing. The second law uses the NET force, not the biggest one, and forgetting that is the most common error in the whole subject.",
             pl: "Podłoga oddziałuje z powrotem. Dwie bardzo duże siły, skierowane przeciwnie, po których prawie nic nie zostaje. Druga zasada używa siły WYPADKOWEJ, a nie największej, a zapominanie o tym to najczęstszy błąd w całym temacie." },
    },
    {
      q: { en: "The same 100 N push is applied to a 10 kg box and a 50 kg box. How do their accelerations compare?",
           pl: "To samo pchnięcie 100 N przyłożono do skrzyni 10 kg i skrzyni 50 kg. Jak mają się ich przyspieszenia?" },
      o: [{ en: "The same, the force is the same", pl: "Takie same, siła jest ta sama" },
          { en: "The light one accelerates five times faster", pl: "Lżejsza przyspiesza pięć razy szybciej" },
          { en: "The heavy one accelerates five times faster", pl: "Cięższa przyspiesza pięć razy szybciej" },
          { en: "The light one accelerates twice as fast", pl: "Lżejsza przyspiesza dwa razy szybciej" }],
      a: 1,
      why: { en: "Rearrange to a = F/m. The light box gets 100/10 = 10 m/s², the heavy one 100/50 = 2 m/s². Five times the mass, a fifth of the acceleration, from the identical push.",
             pl: "Przekształć do a = F/m. Lżejsza skrzynia dostaje 100/10 = 10 m/s², cięższa 100/50 = 2 m/s². Pięć razy większa masa, jedna piąta przyspieszenia, przy identycznym pchnięciu." },
    },
    {
      q: { en: "Your foot pushes back on the ground with 800 N, and the ground pushes forward on your foot with 800 N. Why do you move at all?",
           pl: "Twoja stopa odpycha podłoże siłą 800 N, a podłoże pcha stopę do przodu siłą 800 N. Dlaczego w ogóle się poruszasz?" },
      o: [{ en: "Your push is slightly bigger really", pl: "Tak naprawdę Twoje pchnięcie jest trochę większe" },
          { en: "The two forces act on different objects, so they cannot cancel", pl: "Te siły działają na różne obiekty, więc nie mogą się znieść" },
          { en: "The ground's push arrives slightly later", pl: "Pchnięcie podłoża pojawia się nieco później" },
          { en: "Your muscles supply an extra force on top of the pair", pl: "Twoje mięśnie dokładają dodatkową siłę ponad tę parę" }],
      a: 1,
      why: { en: "Different objects. Your force is on the ground; the ground's force is on you. Forces only cancel when they act on the SAME body. Your muscles are not an extra external force either: they act inside you, and it is still the ground that provides the external push. This is why the third law permits movement instead of forbidding it, and it is the most misunderstood sentence in mechanics.",
             pl: "Różne obiekty. Twoja siła działa na podłoże; siła podłoża działa na Ciebie. Siły znoszą się tylko wtedy, gdy działają na TO SAMO ciało. Twoje mięśnie też nie są dodatkową siłą zewnętrzną: działają wewnątrz Ciebie, a zewnętrzne pchnięcie nadal daje podłoże. Dlatego trzecia zasada pozwala na ruch, zamiast go zakazywać, i dlatego jest najczęściej źle rozumianym zdaniem w mechanice." },
    },
    {
      q: { en: "An astronaut floats inside a space station in low Earth orbit. What is the gravitational force on them?",
           pl: "Astronauta unosi się wewnątrz stacji kosmicznej na niskiej orbicie okołoziemskiej. Jaka siła grawitacji na niego działa?" },
      o: [{ en: "Zero, that is why they float", pl: "Zerowa, dlatego się unosi" },
          { en: "About 10% of its value on the ground", pl: "Około 10% wartości przy powierzchni" },
          { en: "About 90% of its value on the ground", pl: "Około 90% wartości przy powierzchni" },
          { en: "Exactly the same as on the ground", pl: "Dokładnie taka sama jak przy powierzchni" }],
      a: 2,
      why: { en: "About 90%. A space station is only a few hundred kilometres up, which is a small distance compared with the radius of the Earth, so gravity is barely weaker there. What is zero is their APPARENT weight, because they and the station are falling together and nothing is pushing back on them. Orbit is not the absence of gravity; it is falling sideways fast enough to keep missing the planet.",
             pl: "Około 90%. Stacja kosmiczna jest zaledwie kilkaset kilometrów wyżej, co jest niewielką odległością w porównaniu z promieniem Ziemi, więc grawitacja jest tam ledwo słabsza. Zerowy jest jego ciężar POZORNY, bo on i stacja spadają razem i nic go nie podpiera. Orbita to nie brak grawitacji; to spadanie w bok na tyle szybko, by wciąż nie trafiać w planetę." },
    },
    {
      q: { en: "A car goes round a roundabout at a perfectly constant 30 km/h. Is it accelerating?",
           pl: "Samochód pokonuje rondo ze stale utrzymywaną prędkością 30 km/h. Czy przyspiesza?" },
      o: [{ en: "No, its speed is not changing", pl: "Nie, jego szybkość się nie zmienia" },
          { en: "Yes, because its direction is changing", pl: "Tak, bo zmienia się jego kierunek" },
          { en: "Only if the driver touches the pedals", pl: "Tylko jeśli kierowca użyje pedałów" },
          { en: "Only while entering and leaving the roundabout", pl: "Tylko przy wjeździe i zjeździe z ronda" }],
      a: 1,
      why: { en: "Yes, the whole way round. Velocity carries a direction as well as a size, and acceleration is the rate at which velocity changes, so turning is accelerating even at a constant speed. Something has to supply the force for it, and here that is friction between the tyres and the road, pointing towards the centre. It is also why you feel pushed sideways in a corner.",
             pl: "Tak, przez cały łuk. Prędkość niesie kierunek, a nie tylko wartość, a przyspieszenie to tempo zmiany prędkości, więc skręcanie jest przyspieszaniem nawet przy stałej szybkości. Coś musi dostarczyć na to siłę, a tutaj jest to tarcie między oponami a jezdnią, skierowane do środka. Dlatego właśnie na zakręcie czujesz, że wypycha Cię w bok." },
    },
    {
      q: { en: "You hold a 40 N weight 0.35 m from your elbow. The biceps attaches 0.04 m from it. Roughly what force must the biceps make?",
           pl: "Trzymasz ciężar 40 N w odległości 0,35 m od łokcia. Biceps przyczepia się 0,04 m od niego. Jaką w przybliżeniu siłę musi wytworzyć biceps?" },
      o: [{ en: "About 40 N, the same as the weight", pl: "Około 40 N, tyle samo co ciężar" },
          { en: "About 5 N, the lever helps", pl: "Około 5 N, dźwignia pomaga" },
          { en: "About 350 N", pl: "Około 350 N" },
          { en: "About 1400 N", pl: "Około 1400 N" }],
      a: 2,
      why: { en: "The load's turning effect is 40 × 0.35 = 14 N·m. The biceps has to match it from only 0.04 m, so it needs 14 ÷ 0.04 = 350 N, roughly nine times the weight it is holding. Muscles almost always work at this kind of disadvantage, and they buy speed and range with it.",
             pl: "Moment od obciążenia to 40 × 0,35 = 14 N·m. Biceps musi go zrównoważyć z zaledwie 0,04 m, więc potrzebuje 14 ÷ 0,04 = 350 N, mniej więcej dziewięć razy więcej niż trzymany ciężar. Mięśnie niemal zawsze pracują przy takiej niekorzystnej geometrii i kupują za to prędkość oraz zakres ruchu." },
    },
  ];

  function quiz(host) {
    host.innerHTML = QUIZ.map((q, i) =>
      '<div class="ph-quiz" data-i="' + i + '">' +
        '<div class="ph-quiz-n">' + (i + 1) + " / " + QUIZ.length + "</div>" +
        '<div class="ph-quiz-q">' + L(q.q) + "</div>" +
        '<div class="ph-quiz-opts">' + q.o.map((o, j) =>
          '<button class="ph-opt" data-j="' + j + '">' + L(o) + "</button>").join("") + "</div>" +
        '<div class="ph-quiz-why"></div>' +
      "</div>").join("");
    host.querySelectorAll(".ph-quiz").forEach(box => {
      const q = QUIZ[+box.dataset.i];
      box.querySelectorAll(".ph-opt").forEach(b => {
        b.onclick = () => {
          if (box.dataset.done) return;
          box.dataset.done = "1";
          const j = +b.dataset.j, right = j === q.a;
          b.classList.add(right ? "right" : "wrong");
          if (!right) box.querySelectorAll(".ph-opt")[q.a].classList.add("right");
          const why = box.querySelector(".ph-quiz-why");
          why.innerHTML = "<b>" + (right ? T("Yes.", "Tak.") : T("Not quite.", "Niezupełnie.")) + "</b> " + L(q.why);
          why.classList.add("in");
        };
      });
    });
  }

  // ============================================================ cheat sheet
  function cheat(host) {
    const rows = [
      { f: '<span class="sym" data-sym="Fnet">F</span> = <span class="sym" data-sym="m">m</span> · <span class="sym" data-sym="a">a</span>',
        n: { en: "Newton's second law. Net force, mass, acceleration.", pl: "Druga zasada Newtona. Siła wypadkowa, masa, przyspieszenie." },
        u: "N = kg · m/s²" },
      { f: '<span class="sym" data-sym="a">a</span> = <span class="sym" data-sym="Fnet">F</span> / <span class="sym" data-sym="m">m</span>',
        n: { en: "The same law, when you want the acceleration.", pl: "Ta sama zasada, gdy szukasz przyspieszenia." },
        u: "m/s² = N / kg" },
      { f: '<span class="sym" data-sym="W">W</span> = <span class="sym" data-sym="m">m</span> · <span class="sym" data-sym="g">g</span>',
        n: { en: "Weight from mass. On Earth, multiply by about 10.", pl: "Ciężar z masy. Na Ziemi mnóż przez około 10." },
        u: "N = kg · 9.81" },
      { f: '<span class="sym" data-sym="M">M</span> = <span class="sym" data-sym="F">F</span> · <span class="sym" data-sym="d">d</span>',
        n: { en: "Turning effect. Force times its distance from the pivot.", pl: "Moment siły. Siła razy jej odległość od osi obrotu." },
        u: "N·m = N · m" },
    ];
    const laws = [
      { t: { en: "First law", pl: "Pierwsza zasada" },
        d: { en: "With no net force, motion never changes. Still things stay still, moving things keep moving in a straight line at the same speed.",
             pl: "Bez siły wypadkowej ruch nigdy się nie zmienia. Rzeczy nieruchome pozostają nieruchome, poruszające się poruszają się dalej po prostej ze stałą prędkością." } },
      { t: { en: "Second law", pl: "Druga zasada" },
        d: { en: "Net force equals mass times acceleration. The whole of the rest of this site leans on this one sentence.",
             pl: "Siła wypadkowa równa się masa razy przyspieszenie. Cała reszta tej strony opiera się na tym jednym zdaniu." } },
      { t: { en: "Third law", pl: "Trzecia zasada" },
        d: { en: "Every push comes with an equal push back, on the other object. They never cancel, because they are never on the same body.",
             pl: "Każde pchnięcie ma równe pchnięcie zwrotne, działające na drugi obiekt. Nigdy się nie znoszą, bo nigdy nie działają na to samo ciało." } },
    ];
    host.innerHTML =
      '<div class="ph-cheat">' +
        '<div class="ph-cheat-h">' + T("The four formulas", "Cztery wzory") + "</div>" +
        rows.map(r => '<div class="ph-cheat-row"><div class="ph-formula ph-formula-sm">' + r.f + "</div>" +
          "<div><p>" + L(r.n) + "</p><code>" + r.u + "</code></div></div>").join("") +
        '<div class="ph-cheat-h">' + T("The three laws", "Trzy zasady") + "</div>" +
        laws.map(l => '<div class="ph-cheat-law"><b>' + L(l.t) + "</b><p>" + L(l.d) + "</p></div>").join("") +
        '<div class="ph-cheat-h">' + T("Units, so you never mix them again", "Jednostki, żeby już nigdy ich nie pomylić") + "</div>" +
        '<div class="ph-units">' +
          [["kg", T("mass, how much stuff", "masa, ile materii")],
           ["N", T("force, a push or pull", "siła, pchnięcie lub pociągnięcie")],
           ["m/s", T("velocity, how fast", "prędkość, jak szybko")],
           ["m/s²", T("acceleration, how fast that changes", "przyspieszenie, jak szybko to się zmienia")],
           ["N·m", T("moment, turning effect", "moment, efekt obrotowy")],
           ["N/kg", T("gravity's strength, 9.81 here", "natężenie grawitacji, tu 9,81")]]
            .map(u => '<div class="ph-unit"><b>' + u[0] + "</b><span>" + u[1] + "</span></div>").join("") +
        "</div>" +
      "</div>";
    wireSyms(host);
  }


  // ------------------------------------------------- orientacja na długiej stronie
  // Ponad pięćdziesiąt ekranów przewijania na telefonie. Pasek mówi, gdzie
  // jesteś, i daje drogę powrotną do spisu bez przewijania na samą górę.
  function jumpBar() {
    if (!document.getElementById("phToc")) return;
    const heads = [...document.querySelectorAll("main .ph-sec > .ph-h2")];
    if (!heads.length) return;

    const bar = document.createElement("div");
    bar.className = "ph-jump-bar";
    document.body.appendChild(bar);

    const box = document.createElement("div");
    box.className = "ph-jump";
    box.innerHTML = '<b></b><a href="#phToc"></a>';
    const label = box.querySelector("b"), back = box.querySelector("a");
    back.textContent = T("Contents", "Spis treści");
    const main = document.querySelector("main");
    main.insertBefore(box, main.firstChild);

    // Aktualizacja liczona wprost w obsłudze przewijania, z prostym dławieniem
    // czasowym. Wersja oparta na requestAnimationFrame zawieszała pasek
    // wszędzie tam, gdzie przeglądarka wstrzymuje klatki: w karcie w tle,
    // w trybie oszczędzania energii i przy zredukowanym ruchu.
    let lastRun = 0;
    const update = () => {
      lastRun = Date.now();
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      bar.style.width = (max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0) + "%";
      let cur = heads[0];
      for (const h of heads) {
        if (h.getBoundingClientRect().top <= 120) cur = h; else break;
      }
      const n = heads.indexOf(cur) + 1;
      label.textContent = n + "/" + heads.length + " · " + cur.textContent.trim();
    };
    addEventListener("scroll", () => {
      if (Date.now() - lastRun > 80) update();
    }, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();
  }

  // ============================================================ boot
  function boot() {
    const w = document.getElementById("phWeight");
    if (!w) return;
    stopAll();
    weightDemo(w);
    motionDemo(document.getElementById("phMotion"));
    secondDemo(document.getElementById("phSecond"));
    thirdDemo(document.getElementById("phThird"));
    fbdDemo(document.getElementById("phFbd"));
    torqueDemo(document.getElementById("phTorque"));
    momentDemo(document.getElementById("phMoment"));
    quiz(document.getElementById("phQuiz"));
    cheat(document.getElementById("phCheat"));
    wireSyms(document);
    toc(document.getElementById("phToc"));
    if (!document.querySelector(".ph-jump")) jumpBar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  // i18n dispatches on document, not window. Listening on the wrong one fails
  // silently: the prose still translates through data-i18n, so the page looks
  // fine while every demo, the quiz and the cheat sheet stay in the old language.
  document.addEventListener("i18n:changed", () => { hideSym(); boot(); });
})();
