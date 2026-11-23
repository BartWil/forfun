// Wyzwania „przewiduj, zanim zobaczysz”: same treści, zero mechaniki.
//
// Ten plik jest DANYMI. Nie liczy niczego, nie dotyka DOM i nie wie, jak
// działa stacja. Opisuje tylko: o co pytamy, jaki stan ustawić przed, jaki po,
// i który wskaźnik odczytać z ekranu. Całą resztę robi predict.js, a samą
// liczbę wylicza stacja własnym kodem.
//
// DLACZEGO ODPOWIEDŹ JEST WPISANA RĘCZNIE, SKORO WYNIK CZYTAMY Z EKRANU
//
// Bo to dwie różne rzeczy. Wynik jest zawsze prawdziwy, bo pochodzi z tego
// samego wskaźnika, który widzi student. Pole `answer` mówi wyłącznie, czy
// student trafił, więc musi być zgodne z tym, co stacja faktycznie policzy.
// Zgodność nie jest tu obietnicą: każdy kierunek poniżej jest przeliczony na
// prawdziwym sygnale prawdziwym filtrem i przypięty testem w
// tests/science.test.mjs. Gdyby kiedyś ktoś zmienił filtr albo dane tak, że
// kierunek się odwróci, testy padną, zamiast pozwolić stronie mówić studentowi,
// że pomylił się wtedy, gdy miał rację.
//
// DLACZEGO PRAWIE KAŻDE WYZWANIE MA `cannotConclude`
//
// Bo samo przewidzenie kierunku jest tu najmniej ciekawą częścią. Wskaźnik
// drgnie i student może odejść przekonany, że rozumie, co się stało z
// mięśniem, podczas gdy stało się coś wyłącznie z jego własnym przetwarzaniem.
// Granica wniosku jest tu treścią lekcji, a nie zastrzeżeniem drobnym drukiem.

(function () {
  "use strict";

  window.BioLabChallenges = [

    // ---------------------------------------------------------------- EMG 1
    // Uczciwa liczba. Filtr usuwa moc, i to widać wprost.
    {
      station: "emg",
      question: {
        en: "The high-pass filter is set to 20 Hz. You are about to move it to 50 Hz, the cutoff used in the paper this recording comes from. What happens to how much mean-square power the filter takes out of the signal?",
        pl: "Filtr górnoprzepustowy stoi na 20 Hz. Zaraz przesuniesz go na 50 Hz, czyli tam, gdzie ustawiła go praca, z której pochodzi ten zapis. Co stanie się z tym, ile mocy średniokwadratowej filtr zabiera z sygnału?",
      },
      change: { en: "High-pass 20 Hz → 50 Hz", pl: "Górnoprzepustowy 20 Hz → 50 Hz" },
      baseline:     { muscle: "ta", hp: 20, lp: 20, rectify: true, norm: "peak", stage: 2 },
      intervention: { muscle: "ta", hp: 50, lp: 20, rectify: true, norm: "peak", stage: 2 },
      outcome: {
        name: { en: "Mean-square power, lower by", pl: "Moc średniokwadratowa, niższa o" },
        selector: ".eg-metric",
        label: /Mean-square|średniokwadratowa/i,
        decimals: 1,
      },
      answer: "up",
      why: {
        en: "A high-pass filter passes what is above the cutoff and attenuates what is below it, so raising the cutoff can only remove more, never less. Nothing about the muscle changed between the two readings. The recording is the same file, the same contraction and the same person: only your cutoff moved.",
        pl: "Filtr górnoprzepustowy przepuszcza to, co powyżej częstotliwości granicznej, i tłumi to, co poniżej, więc podniesienie granicy może usunąć tylko więcej, nigdy mniej. Między dwoma odczytami nie zmieniło się nic w mięśniu. To ten sam plik, ten sam skurcz i ta sama osoba: przesunęła się wyłącznie Twoja granica.",
      },
      cannotConclude: {
        en: "That a cutoff removing more power is therefore a worse choice. It removes movement artefact as well as signal, and the paper this recording comes from chose 50 Hz deliberately. Which loss matters depends on what you are about to measure, and this number alone cannot tell you.",
        pl: "Że granica usuwająca więcej mocy jest przez to gorszym wyborem. Usuwa razem z sygnałem także artefakty ruchowe, a praca, z której pochodzi ten zapis, wybrała 50 Hz świadomie. To, która strata jest ważna, zależy od tego, co zamierzasz mierzyć, a sama ta liczba tego nie rozstrzyga.",
      },
    },

    // ---------------------------------------------------------------- EMG 2
    // Ta sama gałka, ale wskaźnik, który w literaturze czyta się jako zmęczenie.
    // To jest właściwy powód istnienia tej sekcji.
    {
      station: "emg",
      question: {
        en: "The same knob again, from 20 Hz to 50 Hz. This time watch the median frequency of the filtered signal, the number a fatigue study would report. Which way does it go?",
        pl: "Ta sama gałka, znowu z 20 Hz na 50 Hz. Tym razem patrz na częstotliwość mediany sygnału po filtracji, czyli na liczbę, którą raportuje się w badaniach nad zmęczeniem. W którą stronę pójdzie?",
      },
      change: { en: "High-pass 20 Hz → 50 Hz", pl: "Górnoprzepustowy 20 Hz → 50 Hz" },
      baseline:     { muscle: "ta", hp: 20, lp: 20, rectify: true, norm: "peak", stage: 2 },
      intervention: { muscle: "ta", hp: 50, lp: 20, rectify: true, norm: "peak", stage: 2 },
      outcome: {
        name: { en: "Median frequency filtered", pl: "Częstotliwość mediany, po filtracji" },
        selector: ".eg-metric",
        label: /Median frequency filtered|mediany, po filtracji/i,
        decimals: 0,
      },
      answer: "up",
      why: {
        en: "The median frequency is the point that splits the spectrum into two halves of equal power. Delete the low-frequency half of the spectrum and the split point has nowhere to go but upwards. Nobody contracted anything. You moved a cutoff, and the summary statistic followed.",
        pl: "Częstotliwość mediany to punkt dzielący widmo na dwie połowy o równej mocy. Usuń niskoczęstotliwościową część widma, a punkt podziału nie ma dokąd pójść poza górą. Nikt niczego nie napiął. Przesunąłeś granicę filtru, a statystyka podsumowująca za nią poszła.",
      },
      cannotConclude: {
        en: "Anything at all about fatigue. A falling median frequency is the classic fatigue marker, and you just made it rise by several hertz without a muscle in the room. This is why a paper that does not state its filter settings cannot be compared with one that does, and it is the single most useful thing to take away from this station.",
        pl: "Absolutnie niczego o zmęczeniu. Spadająca częstotliwość mediany to klasyczny wskaźnik zmęczenia, a Ty właśnie podniosłeś ją o kilka herców bez udziału jakiegokolwiek mięśnia. Dlatego pracy, która nie podaje ustawień filtru, nie da się porównać z tą, która je podaje, i jest to najbardziej użyteczna rzecz do wyniesienia z tej stacji.",
      },
    },

    // ---------------------------------------------------------------- EMG 3
    // Obwiednia: wygładzanie zmienia szczyt, a szczyt bywa mianownikiem.
    {
      station: "emg",
      question: {
        en: "Now the envelope. Its low-pass filter is at 6 Hz, which is heavy smoothing. You are about to open it up to 20 Hz. What happens to the peak of the envelope?",
        pl: "Teraz obwiednia. Jej filtr dolnoprzepustowy stoi na 6 Hz, czyli mocno wygładza. Zaraz otworzysz go do 20 Hz. Co stanie się ze szczytem obwiedni?",
      },
      change: { en: "Envelope low-pass 6 Hz → 20 Hz", pl: "Obwiednia, dolnoprzepustowy 6 Hz → 20 Hz" },
      baseline:     { muscle: "ta", hp: 20, lp: 6,  rectify: true, norm: "peak", stage: 4 },
      intervention: { muscle: "ta", hp: 20, lp: 20, rectify: true, norm: "peak", stage: 4 },
      outcome: {
        name: { en: "Envelope peak", pl: "Szczyt obwiedni" },
        selector: ".eg-metric",
        label: /Envelope peak|Szczyt obwiedni/i,
        decimals: 4,
      },
      answer: "up",
      why: {
        en: "Smoothing is averaging, and averaging a burst with the quieter samples around it pulls the top of that burst down. A slower envelope cannot follow a fast rise, so it never reaches the height the fast one does. Open the filter and the envelope is allowed to keep up.",
        pl: "Wygładzanie to uśrednianie, a uśrednienie wyładowania z cichszymi próbkami wokół ściąga jego wierzchołek w dół. Wolniejsza obwiednia nie nadąża za szybkim narastaniem, więc nigdy nie sięga tak wysoko jak szybka. Otwórz filtr, a obwiednia dostanie pozwolenie, żeby nadążyć.",
      },
      cannotConclude: {
        en: "That the muscle produced more. It produced exactly the same thing twice. This matters more than it looks: when you normalise to the peak of the trial, this peak is your denominator, so a smoothing choice quietly rescales every percentage you report afterwards.",
        pl: "Że mięsień wytworzył więcej. Wytworzył dwa razy dokładnie to samo. To waży więcej, niż wygląda: przy normalizacji do szczytu próby ten szczyt jest Twoim mianownikiem, więc wybór wygładzania po cichu przeskalowuje każdy procent, który potem podasz.",
      },
    },


    // ------------------------------------------------------ platforma 1
    // Osiem milimetrów z wpisanej liczby. To jest teza tej stacji, więc niech
    // student najpierw obstawi, czy w ogóle cokolwiek się ruszy.
    {
      station: "forceplate",
      question: {
        en: "The contact threshold is 5 N: below that force you have declared the foot to be off the plate. You are about to move it to 50 N. It is the same jump, the same file and the same person. What happens to the jump height computed from flight time?",
        pl: "Próg kontaktu stoi na 5 N: poniżej tej siły uznajesz, że stopa jest już poza płytą. Zaraz przesuniesz go na 50 N. To ten sam skok, ten sam plik i ta sama osoba. Co stanie się z wysokością skoku policzoną z czasu lotu?",
      },
      change: { en: "Contact threshold 5 N → 50 N", pl: "Próg kontaktu 5 N → 50 N" },
      baseline:     { stage: 5, zeroed: true, threshold: 5,  normalize: false, scrub: 1.2 },
      intervention: { stage: 5, zeroed: true, threshold: 50, normalize: false, scrub: 1.2 },
      outcome: {
        name: { en: "Height from flight time", pl: "Wysokość z czasu lotu" },
        selector: ".fp-metric",
        label: /Height from flight time|Wysokość z czasu lotu/i,
        decimals: 1,
      },
      answer: "up",
      why: {
        en: "A toe does not release in one sample. The force falls quickly and then lingers, so a high threshold is crossed while there is still contact and declares take-off about six milliseconds earlier, while landing barely moves. The flight window is therefore longer, and height goes as the square of it. Eight millimetres, out of a number you typed into a box.",
        pl: "Palce nie odrywają się w jednej próbce. Siła spada szybko, a potem długo dogasa, więc wysoki próg zostaje przekroczony jeszcze przy kontakcie i ogłasza odbicie o jakieś sześć milisekund wcześniej, podczas gdy lądowanie prawie się nie rusza. Okno lotu jest przez to dłuższe, a wysokość rośnie z jego kwadratem. Osiem milimetrów z liczby, którą wpisałeś do okienka.",
      },
      cannotConclude: {
        en: "Which of the two heights is the real one. Neither is: both are what this recording gives under a stated assumption. The lesson is not to pick the better threshold but to stop quoting a jump height without saying which threshold produced it, because a height from another lab is not comparable with yours unless both are stated.",
        pl: "Która z dwóch wysokości jest prawdziwa. Żadna: obie są tym, co ten zapis daje przy jawnie przyjętym założeniu. Lekcja nie polega na wybraniu lepszego progu, tylko na tym, żeby przestać podawać wysokość skoku bez powiedzenia, jaki próg ją wyprodukował, bo wysokość z innej pracowni nie jest porównywalna z Twoją, dopóki obie nie są podane.",
      },
    },

    // ------------------------------------------------------ platforma 2
    // Najostrzejsza rzecz na tej stronie: kontrola krzyżowa NIE jest niezależna
    // od decyzji, którą właśnie podjąłeś.
    {
      station: "forceplate",
      question: {
        en: "The same threshold, 5 N to 50 N. This time watch the net impulse, which comes from the force trace, from a different part of the signal and by a completely different route than flight time. Does it hold still?",
        pl: "Ten sam próg, z 5 N na 50 N. Tym razem patrz na impuls netto, który bierze się z przebiegu siły, z innego fragmentu zapisu i zupełnie inną drogą niż czas lotu. Czy pozostanie na miejscu?",
      },
      change: { en: "Contact threshold 5 N → 50 N", pl: "Próg kontaktu 5 N → 50 N" },
      baseline:     { stage: 5, zeroed: true, threshold: 5,  normalize: false, scrub: 1.2 },
      intervention: { stage: 5, zeroed: true, threshold: 50, normalize: false, scrub: 1.2 },
      outcome: {
        name: { en: "Net impulse", pl: "Impuls netto" },
        selector: ".fp-metric",
        label: /Net impulse|Impuls netto/i,
        decimals: 1,
      },
      answer: "up",
      why: {
        en: "The integration stops at the take-off you declared, and in the last few milliseconds before a foot leaves the plate the force is already less than body weight. That tail contributes negative area. Cut it off earlier and less negative area is subtracted, so the impulse grows.",
        pl: "Całkowanie kończy się na odbiciu, które ogłosiłeś, a w ostatnich milisekundach przed oderwaniem stopy siła jest już mniejsza niż ciężar ciała. Ten ogon wnosi pole ujemne. Utnij go wcześniej, a mniej pola ujemnego zostanie odjęte, więc impuls urośnie.",
      },
      cannotConclude: {
        en: "That the two routes agreeing proves the processing was right. They both moved, and they moved the same way, because they share one decision: the take-off you declared. A cross-check only checks what it does not itself depend on, and this one depends on the threshold as much as the answer does.",
        pl: "Że zgodność dwóch dróg dowodzi poprawności przetwarzania. Obie się przesunęły i przesunęły się w tę samą stronę, bo dzielą jedną decyzję: ogłoszone przez Ciebie odbicie. Kontrola krzyżowa sprawdza tylko to, od czego sama nie zależy, a ta zależy od progu dokładnie tak samo jak wynik.",
      },
    },

    // ------------------------------------------------------ platforma 3
    // A tu kontrola krzyżowa działa, i na tym polega różnica między jedną
    // a drugą.
    {
      station: "forceplate",
      question: {
        en: "The amplifier offset is 7 newtons, one percent of this person's body weight, and right now it has not been removed. You are about to subtract it. What happens to the gap between the two independently computed jump heights?",
        pl: "Przesunięcie zera wzmacniacza wynosi 7 niutonów, czyli jeden procent ciężaru tej osoby, i na razie nie zostało usunięte. Zaraz je odejmiesz. Co stanie się z rozbieżnością między dwiema niezależnie policzonymi wysokościami skoku?",
      },
      change: { en: "Zeroing: off → on", pl: "Zerowanie: wyłączone → włączone" },
      baseline:     { stage: 5, zeroed: false, threshold: 20, normalize: false, scrub: 1.2 },
      intervention: { stage: 5, zeroed: true,  threshold: 20, normalize: false, scrub: 1.2 },
      outcome: {
        name: { en: "Difference", pl: "Różnica" },
        selector: ".fp-metric",
        label: /^\s*(Difference|Różnica)/i,
        decimals: 2,
      },
      answer: "down",
      why: {
        en: "The impulse route integrates the force over the whole push, so a constant seven newtons is added several hundred times and becomes almost two centimetres of height. The flight-time route never touches the force, so it does not care. Remove the offset and the two routes stop disagreeing.",
        pl: "Droga impulsowa całkuje siłę przez cały wypych, więc stałe siedem niutonów zostaje dodane kilkaset razy i zamienia się w prawie dwa centymetry wysokości. Droga czasu lotu w ogóle nie dotyka siły, więc jej to nie obchodzi. Usuń przesunięcie, a obie drogi przestaną się rozjeżdżać.",
      },
      cannotConclude: {
        en: "That agreement proves you are right, in general. Here it works because the two routes really do differ in what they depend on, unlike in the challenge above. That is the whole skill: knowing which of your checks is independent of the thing being checked, and which one is quietly repeating your own assumption back at you.",
        pl: "Że zgodność w ogólności dowodzi poprawności. Tutaj działa, bo obie drogi naprawdę różnią się tym, od czego zależą, inaczej niż w wyzwaniu powyżej. I na tym polega cała umiejętność: wiedzieć, która z Twoich kontroli jest niezależna od sprawdzanej rzeczy, a która po cichu powtarza Ci Twoje własne założenie.",
      },
    },


    // ------------------------------------------------------ ergonomia 1
    // Jedyna rzecz na całej stacji, którą student może zmienić natychmiast
    // i bez niczyjej zgody. Niech najpierw obstawi, ile to warte.
    {
      station: "ergonomics",
      question: {
        en: "You are holding 15 kg with your hands 45 cm in front of your lower back. Without putting it down, without getting stronger and without changing your posture, you pull it in to 25 cm. What happens to the compression at L5-S1?",
        pl: "Trzymasz 15 kg z rękami 45 cm przed dolnym odcinkiem kręgosłupa. Bez odkładania, bez stawania się silniejszym i bez zmiany postawy przyciągasz ciężar do 25 cm. Co stanie się z uciskiem na L5-S1?",
      },
      change: { en: "Horizontal distance 45 cm → 25 cm", pl: "Odległość pozioma 45 cm → 25 cm" },
      baseline:     { stage: 1, mass: 70, load: 15, horiz: 0.45, flex: 60 },
      intervention: { stage: 1, mass: 70, load: 15, horiz: 0.25, flex: 60 },
      outcome: {
        name: { en: "Compression at L5-S1", pl: "Ucisk na L5-S1" },
        selector: ".er-metric",
        label: /Compression at L5-S1|Ucisk na L5-S1/i,
        decimals: 0,
      },
      answer: "down",
      why: {
        en: "Moment is force times perpendicular distance, so halving the distance halves the load's contribution to the moment the extensors must balance. Because those extensors work on a lever of only five centimetres, every newton metre you remove from the moment removes twenty newtons from the force they need, and their force is most of what presses on the disc. Around 600 N disappear, and nothing about you or the object changed.",
        pl: "Moment to siła razy odległość prostopadła, więc zmniejszenie odległości o połowę zmniejsza o połowę wkład ciężaru do momentu, który muszą zrównoważyć prostowniki. Ponieważ te prostowniki pracują na dźwigni zaledwie pięciu centymetrów, każdy niutonometr zdjęty z momentu zabiera dwadzieścia niutonów z potrzebnej im siły, a ich siła stanowi większość tego, co dociska krążek. Znika około 600 N, a nie zmieniło się nic ani w Tobie, ani w przedmiocie.",
      },
      cannotConclude: {
        en: "That the remaining load is safe, or that the first one was not. Both numbers are mechanical loads from a model, and the strength of a lumbar segment ranges from about 2 kN to over 10 kN between people. What this does tell you is the direction and roughly the size of the effect, which is what you can act on.",
        pl: "Że pozostałe obciążenie jest bezpieczne albo że pierwsze nie było. Oba to obciążenia mechaniczne z modelu, a wytrzymałość segmentu lędźwiowego waha się między ludźmi od około 2 kN do ponad 10 kN. To, co ta zmiana naprawdę mówi, to kierunek i z grubsza rozmiar efektu, i właśnie to można wykorzystać.",
      },
    },

    // ------------------------------------------------------ ergonomia 2
    // Ta sama geometria, ale widziana przez wskaźnik regulacyjny. Dwie liczby
    // idą w przeciwne strony, i to jest tu cała lekcja.
    {
      station: "ergonomics",
      question: {
        en: "Now the same geometric fact inside the NIOSH equation. The load starts 25 cm from the midpoint between your ankles and you move it out to 50 cm, keeping the weight and everything else identical. What happens to the lifting index, the number you would actually write in a report?",
        pl: "Teraz ten sam fakt geometryczny wewnątrz równania NIOSH. Ciężar startuje 25 cm od środka między kostkami, a Ty odsuwasz go na 50 cm, zachowując masę i wszystko inne identyczne. Co stanie się ze wskaźnikiem podnoszenia, czyli z liczbą, którą naprawdę wpisałbyś do raportu?",
      },
      change: { en: "H 25 cm → 50 cm", pl: "H 25 cm → 50 cm" },
      baseline:     { stage: 2, task: "box", nLoad: 12, H: 25, V: 75, D: 50, A: 0, freq: 1, dur: 0, coup: "good" },
      intervention: { stage: 2, task: "box", nLoad: 12, H: 50, V: 75, D: 50, A: 0, freq: 1, dur: 0, coup: "good" },
      outcome: {
        name: { en: "Lifting index", pl: "Wskaźnik podnoszenia" },
        selector: ".er-metric",
        label: /Lifting index|Wskaźnik podnoszenia/i,
        decimals: 2,
      },
      answer: "up",
      why: {
        en: "The horizontal multiplier is 25 divided by H, so doubling H halves it, which halves the recommended weight limit. The lifting index is the actual weight divided by that limit, so it doubles. Watch both numbers in the panel: the limit went down while the index went up, and they are describing the same event. Confusing which direction is the bad one is a reliable way to misread an ergonomics report.",
        pl: "Mnożnik poziomy to 25 podzielone przez H, więc podwojenie H zmniejsza go o połowę, co o połowę zmniejsza zalecaną masę graniczną. Wskaźnik podnoszenia to masa rzeczywista podzielona przez tę granicę, więc się podwaja. Patrz w panelu na obie liczby: granica spadła, a wskaźnik wzrósł, i opisują to samo zdarzenie. Pomylenie, który kierunek jest zły, to niezawodny sposób na błędne odczytanie raportu ergonomicznego.",
      },
      cannotConclude: {
        en: "That an index above one means somebody will be hurt, or that doubling it doubles any risk. It is a ratio against a design limit, and the method's own authors present it for designing and evaluating tasks, not for predicting individuals. Note also that the H here is measured from the midpoint between the ankles, not from the spine as in the lever panel, so the two distances on this page are not the same quantity.",
        pl: "Że wskaźnik powyżej jedynki znaczy, że ktoś zostanie poszkodowany, albo że jego podwojenie podwaja jakiekolwiek ryzyko. To stosunek do granicy projektowej, a autorzy metody przedstawiają go do projektowania i oceny zadań, a nie do przewidywania losu jednostek. Zauważ też, że H mierzy się tu od środka między kostkami, a nie od kręgosłupa jak w panelu dźwigni, więc dwie odległości na tej stronie nie są tą samą wielkością.",
      },
    },

    // ------------------------------------------------------ ergonomia 3
    // Jedyna zmiana na tej stacji, która kosztuje pieniądze, a nie nawyk.
    {
      station: "ergonomics",
      question: {
        en: "A 6 kg lead apron, worn for four hours. You swap the one-piece version hanging off your shoulders for a two-piece one whose skirt is belted onto your pelvis. The apron weighs exactly the same. What happens to the cumulative compressive load it puts through your spine over those four hours?",
        pl: "Fartuch ołowiowy 6 kg, noszony cztery godziny. Wymieniasz wersję jednoczęściową zwisającą z barków na dwuczęściową, której spódnica jest zapięta pasem na miednicy. Fartuch waży dokładnie tyle samo. Co stanie się z kumulacyjnym obciążeniem uciskowym, które przepuszcza przez Twój kręgosłup w ciągu tych czterech godzin?",
      },
      change: { en: "One piece → two piece, belted on the pelvis", pl: "Jednoczęściowy → dwuczęściowy, na pasie biodrowym" },
      baseline:     { stage: 3, aMass: 6, aType: "one", aHours: 4, lifts: 20 },
      intervention: { stage: 3, aMass: 6, aType: "two", aHours: 4, lifts: 20 },
      outcome: {
        name: { en: "Cumulative load, the apron", pl: "Obciążenie kumulacyjne, fartuch" },
        selector: ".er-metric",
        label: /Cumulative load, the apron|kumulacyjne, fartuch/i,
        decimals: 0,
      },
      answer: "down",
      why: {
        en: "Weight has to reach the floor somehow. In the one-piece version the whole apron hangs from your shoulders, so all of it travels down the spine. Belt the skirt onto the pelvis and that part of the weight goes to the floor through your hips and legs, bypassing the lumbar discs entirely. The force is smaller and it acts for the same four hours, so the integral falls with it. The model routes 0.4 of the weight through the spine in the two-piece case, which is an assumption, and the panel says so.",
        pl: "Ciężar musi jakoś dotrzeć do podłogi. W wersji jednoczęściowej cały fartuch wisi na barkach, więc całość podróżuje w dół przez kręgosłup. Zapnij spódnicę pasem na miednicy i ta część ciężaru idzie do podłogi przez biodra i nogi, omijając krążki lędźwiowe całkowicie. Siła jest mniejsza i działa przez te same cztery godziny, więc całka spada razem z nią. Model prowadzi w wersji dwuczęściowej 0,4 ciężaru przez kręgosłup, co jest założeniem, i panel to podaje.",
      },
      cannotConclude: {
        en: "That a two-piece apron prevents back pain. The direction of the mechanical effect is solid; the step from cumulative load to a person's symptoms is not. Studies of interventional staff report back pain alongside apron hours, but they cannot separate the apron from standing still, awkward posture and case volume, and cumulative load has no validated dose or threshold.",
        pl: "Że fartuch dwuczęściowy zapobiega bólowi pleców. Kierunek efektu mechanicznego jest pewny; przejście od obciążenia kumulacyjnego do objawów konkretnej osoby nie jest. Badania personelu pracowni zabiegowych raportują ból pleców obok godzin w fartuchu, ale nie potrafią oddzielić fartucha od stania bez ruchu, wymuszonej postawy i liczby zabiegów, a obciążenie kumulacyjne nie ma zwalidowanej dawki ani progu.",
      },
    },

  ];
})();
