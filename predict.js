// Przewiduj, zanim zobaczysz.
//
// Ten plik NIE LICZY NICZEGO. To była twarda zasada przy projektowaniu: gdyby
// framework sam wyliczał spodziewany wynik, w projekcie istniałyby dwie fizyki,
// a prędzej czy później rozjechałyby się i strona pokazywałaby studentowi
// „obserwowane”, którego jej własna stacja nigdy nie policzyła.
//
// Zamiast tego jest wyłącznie dyrygentem:
//
//     stan wyjściowy  ->  student deklaruje przewidywanie
//                     ->  zatwierdza je i nie może już cofnąć
//                     ->  framework ustawia stan docelowy
//                     ->  STACJA przelicza własnym kodem
//                     ->  framework ODCZYTUJE liczbę, którą stacja wyświetliła
//
// Odczyt idzie przez DOM, z tego samego wskaźnika, który widzi student. To nie
// jest obejście, tylko najmocniejsza dostępna gwarancja: nie da się pokazać
// wyniku innego niż ten, który stacja właśnie narysowała na ekranie.
//
// Wyzwanie może też nieść cannotConclude. Bez tego ćwiczylibyśmy wyłącznie
// przewidywanie liczby, a granica poznawcza jest w tym projekcie ważniejsza niż
// arytmetyka: student ma wiedzieć nie tylko, co się zmieniło, lecz także czego
// z tej zmiany nadal nie wolno wywnioskować.
//
// Dodawane na dole stacji. Nic istniejącego nie jest modyfikowane.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  const B = window.BioLabState;
  const CAT = window.STATIONS;
  if (!B || !CAT) return;

  const esc = B.esc;
  const page = location.pathname.split("/").pop() || "index.html";
  const ME = CAT.forPage(page);
  if (!ME) return;

  const CH = (window.BioLabChallenges || []).filter(c => c.station === ME.id);
  if (!CH.length) return;

  // Odczyt liczby z tego, co stacja narysowała. Wskaźniki nie są tu liczone
  // ponownie, tylko czytane, dlatego wynik nie może rozminąć się z ekranem.
  function readOutcome(o) {
    const nodes = [...document.querySelectorAll(o.selector)];
    const hit = nodes.find(n => o.label.test(n.textContent));
    if (!hit) return null;
    const b = hit.querySelector("b");
    const txt = (b || hit).textContent;
    const num = parseFloat(String(txt).replace(",", ".").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(num) ? { value: num, text: txt.trim() } : null;
  }

  // Czeka, aż stacja skończy przeliczać. Stacje rysują się synchronicznie po
  // zmianie stanu, ale dwie klatki zapasu kosztują nic i chronią przed
  // odczytaniem wskaźnika sprzed przeliczenia.
  function afterRepaint(fn) {
    setTimeout(() => setTimeout(fn, 60), 60);
  }

  const DIRS = {
    up:   { en: "goes up", pl: "wzrośnie" },
    down: { en: "goes down", pl: "spadnie" },
    same: { en: "stays about the same", pl: "zostanie mniej więcej taki sam" },
  };

  function build(host) {
    host.innerHTML = "";
    CH.forEach((c, idx) => host.appendChild(card(c, idx)));
  }

  function card(c, idx) {
    const box = document.createElement("section");
    box.className = "pr-card";

    // stan wewnętrzny jednego wyzwania
    const st = { phase: "predict", picked: null, before: null, after: null, missed: false };

    function apply(state, then) {
      B.apply(ME.id, state);
      afterRepaint(then);
    }

    function paint() {
      const opts = ["up", "down", "same"];
      let html =
        '<div class="pr-head"><span class="pr-tag">' +
          esc(T("Predict first", "Najpierw przewiduj")) + "</span>" +
          '<span class="pr-n">' + (idx + 1) + " / " + CH.length + "</span></div>" +
        '<p class="pr-q">' + esc(L(c.question)) + "</p>" +
        '<div class="pr-change">' + esc(L(c.change)) + "</div>";

      if (st.phase === "predict") {
        html += '<div class="pr-opts">' + opts.map(k =>
          '<button class="pr-opt" data-k="' + k + '">' + esc(L(DIRS[k])) + "</button>").join("") + "</div>" +
          '<p class="pr-hint">' + esc(T(
            "Commit to an answer before you run it. That is the whole exercise: a guess you have not written down is not a prediction.",
            "Zdecyduj się przed uruchomieniem. Na tym polega całe ćwiczenie: domysł, którego nie zapisałeś, nie jest przewidywaniem.")) + "</p>" +
          // Bez tego nieudany odczyt wyglądałby jak martwy przycisk. Wolę
          // powiedzieć wprost, że to my nie znaleźliśmy wskaźnika, niż
          // pozwolić studentowi myśleć, że kliknął źle.
          (st.missed
            ? '<p class="pr-miss">' + esc(T(
                "The station has not shown that number yet, so there is nothing honest to compare against. Scroll up, let the panel finish drawing, and try again.",
                "Stacja nie pokazała jeszcze tej liczby, więc nie ma czego uczciwie porównać. Przewiń w górę, poczekaj, aż panel się narysuje, i spróbuj ponownie.")) + "</p>"
            : "");
      }

      if (st.phase === "ready") {
        html += '<div class="pr-locked">' + esc(T("Your prediction:", "Twoje przewidywanie:")) +
            " <b>" + esc(L(DIRS[st.picked])) + "</b></div>" +
          '<button class="pr-run">' + esc(T("Run the experiment", "Uruchom eksperyment")) + "</button>";
      }

      if (st.phase === "done") {
        const correct = st.picked === c.answer;
        const delta = st.after.value - st.before.value;
        html += '<div class="pr-locked">' + esc(T("Your prediction:", "Twoje przewidywanie:")) +
            " <b>" + esc(L(DIRS[st.picked])) + "</b></div>" +
          '<div class="pr-result ' + (correct ? "right" : "wrong") + '">' +
            '<div class="pr-res-lab">' + esc(T("Observed", "Zaobserwowane")) + "</div>" +
            '<div class="pr-res-row"><span>' + esc(L(c.outcome.name)) + "</span>" +
              "<b>" + esc(st.before.text) + " → " + esc(st.after.text) + "</b></div>" +
            '<div class="pr-res-verdict">' +
              esc(correct
                ? T("Your prediction held.", "Twoje przewidywanie się potwierdziło.")
                : T("Not what you expected.", "Nie tak, jak zakładałeś.")) +
              " " + esc(L(DIRS[c.answer])) + "." +
            "</div></div>" +
          '<div class="pr-why"><b>' + esc(T("Why", "Dlaczego")) + "</b> " + esc(L(c.why)) + "</div>" +
          (c.cannotConclude
            ? '<div class="pr-cannot"><b>' + esc(T("Still cannot conclude", "Nadal nie wolno wnioskować")) +
              "</b> " + esc(L(c.cannotConclude)) + "</div>"
            : "") +
          '<button class="pr-again">' + esc(T("Run it again from the start", "Uruchom od nowa")) + "</button>";
      }

      box.innerHTML = html;

      box.querySelectorAll(".pr-opt").forEach(b2 => b2.onclick = () => {
        st.picked = b2.dataset.k;
        // Stan wyjściowy ustawiany dopiero teraz, żeby odczyt „przed” pochodził
        // z tego samego układu warunków, w którym za chwilę nastąpi zmiana.
        apply(c.baseline, () => {
          st.before = readOutcome(c.outcome);
          st.phase = st.before ? "ready" : "predict";
          st.missed = !st.before;
          paint();
        });
      });

      const run = box.querySelector(".pr-run");
      if (run) run.onclick = () => {
        apply(c.intervention, () => {
          st.after = readOutcome(c.outcome);
          if (st.after) { st.phase = "done"; st.missed = false; }
          else { st.phase = "predict"; st.picked = null; st.before = null; st.missed = true; }
          paint();
        });
      };

      const again = box.querySelector(".pr-again");
      if (again) again.onclick = () => {
        st.phase = "predict"; st.picked = null; st.before = null; st.after = null; st.missed = false;
        apply(c.baseline, paint);
      };
    }

    paint();
    return box;
  }

  function mount() {
    if (!B.canApply || !B.canApply(ME.id)) return false;  // bez runtime nie ma czego uruchamiać
    let host = document.getElementById("predictHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "predictHost";
      host.className = "pr-host";
      const heading = document.createElement("h2");
      heading.className = "pr-h2";
      heading.textContent = T("Predict before you look", "Przewiduj, zanim spojrzysz");
      const intro = document.createElement("p");
      intro.className = "pr-intro";
      intro.textContent = T(
        "Nothing below is scored and nothing is recorded. The point is only that committing to an answer first changes what you notice afterwards.",
        "Nic poniżej nie jest oceniane ani zapisywane. Chodzi wyłącznie o to, że zadeklarowanie odpowiedzi przed eksperymentem zmienia to, co potem zauważysz.");
      const main = document.querySelector("main") || document.body;
      const contract = document.getElementById("scientific-contract");
      const anchor = document.querySelector(".sf-next");
      const wrap = document.createElement("section");
      wrap.className = "pr-sec";
      wrap.append(heading, intro, host);
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(wrap, anchor);
      else if (contract && contract.parentElement === main) main.insertBefore(wrap, contract);
      else main.appendChild(wrap);
    }
    build(host);
    return true;
  }

  // Stacje wstają asynchronicznie: EMG Lab podpina swój runtime dopiero po
  // pobraniu pliku CSV. Jeden setTimeout na sztywno zdążyłby przy szybkim
  // łączu i po cichu nie pokazałby sekcji przy wolnym, czyli dokładnie tam,
  // gdzie nikt by tego nie zauważył. Dlatego czekamy, aż runtime się pojawi,
  // i po kilkunastu sekundach po prostu odpuszczamy.
  function waitAndMount(tries) {
    if (mount()) return;
    if (tries <= 0) return;
    setTimeout(() => waitAndMount(tries - 1), 300);
  }
  const start = () => waitAndMount(40);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  document.addEventListener("i18n:changed", () => {
    const w = document.querySelector(".pr-sec");
    if (w) w.remove();
    setTimeout(start, 200);
  });

  window.__predict = { CH, readOutcome };
})();
