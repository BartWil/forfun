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

  ];
})();
