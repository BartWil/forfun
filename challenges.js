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

  ];
})();
