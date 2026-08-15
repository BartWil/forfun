// Rama stacji: obietnica na górze, droga dalej na dole.
//
// Audyt wykazał, że student wchodzi na stację i nie wie dwóch rzeczy: po co tu
// jest i dokąd stąd iść. Jedno i drugie od dawna leży w katalogu — learningGoal
// w kontrakcie naukowym, prerequisites i route w samej stacji — ale było
// widoczne dopiero w panelu na samym dole albo wcale.
//
// To jeden komponent, nie cztery osobne dodatki. Wszystko pochodzi z
// stations.js, więc nowa stacja dostaje ramę bez dopisywania czegokolwiek tutaj,
// a rama nigdy nie może opisać stacji inaczej, niż opisuje ją katalog.
//
// Czas czytania i liczba kontrolek liczone są z rzeczywistej strony, a nie
// wpisane ręcznie. Ręcznie wpisana liczba rozjechałaby się z treścią w tydzień,
// dokładnie tak jak rozjechał się kiedyś katalog na stronie startowej.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  const CAT = window.STATIONS;
  if (!CAT) return;

  const page = location.pathname.split("/").pop() || "index.html";
  const ME = CAT.forPage(page);
  // Strona startowa nie jest stacją i ma własną nawigację.
  if (!ME || page === "index.html") return;

  const esc = window.BioLabState ? window.BioLabState.esc
            : v => String(v == null ? "" : v).replace(/[&<>"']/g,
                c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ------------------------------------------------------------------ pomiary
  // Liczone ze strony, nie deklarowane. 180 słów na minutę to ostrożne tempo dla
  // tekstu fachowego; lepiej obiecać więcej czasu, niż zaskoczyć czytelnika.
  function measure() {
    const main = document.querySelector("main") || document.body;
    const clone = main.cloneNode(true);
    // .pr-sec odpada razem z panelem kontraktu i samą ramą: to ćwiczenie
    // dołożone pod treścią, a nie treść stacji. Bez tego czas czytania rósł o
    // tekst, którego student nie czyta, żeby dojść do końca lekcji.
    clone.querySelectorAll("#scientific-contract, .sf-top, .sf-next, .pr-sec, script, style, canvas, svg")
      .forEach(n => n.remove());
    const words = (clone.textContent || "").trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 180));

    // Kontrolki: to, czym student faktycznie może poruszyć. Bez nawigacji,
    // stopki, panelu kontraktu i samej ramy.
    const controls = [...main.querySelectorAll("input, button, select")]
      // Przyciski sekcji przewidywania nie są kontrolkami stacji, a ich liczba
      // zmienia się w trakcie ćwiczenia. Policzone, sprawiałyby, że ten sam
      // student widzi na tej samej stronie raz 30, raz 33 kontrolki.
      .filter(el => !el.closest("#navbar, #footer, #scientific-contract, .sf-top, .sf-next, .bs-share, .pr-sec"))
      .length;
    return { minutes, controls, words };
  }

  function plMinut(n) {
    const t = n % 10, h = n % 100;
    if (n === 1) return "minuta";
    return (t >= 2 && t <= 4 && !(h >= 12 && h <= 14)) ? "minuty" : "minut";
  }
  function plKontrolek(n) {
    const t = n % 10, h = n % 100;
    if (n === 1) return "kontrolka";
    return (t >= 2 && t <= 4 && !(h >= 12 && h <= 14)) ? "kontrolki" : "kontrolek";
  }

  const STATUS = {
    verified: { en: "Measured", pl: "Zmierzone" },
    reconstructed: { en: "Reconstructed", pl: "Zrekonstruowane" },
    synthetic: { en: "Teaching model", pl: "Model dydaktyczny" },
    reference: { en: "Reference", pl: "Materiał źródłowy" },
  };

  // ---------------------------------------------------------------- góra
  function top() {
    const m = measure();
    const track = CAT.TRACKS[ME.track];
    const goal = ME.contract && ME.contract.learningGoal;
    if (!goal) return null;

    const box = document.createElement("section");
    box.className = "sf-top";
    box.style.setProperty("--sf-c", (track || {}).colour || "#7c9bff");

    const chips = [
      "~" + m.minutes + " " + (PL() ? plMinut(m.minutes) : (m.minutes === 1 ? "minute" : "minutes")) +
        " " + T("of reading", "czytania"),
      m.controls + " " + (PL() ? plKontrolek(m.controls) : (m.controls === 1 ? "control" : "controls")),
      L(track),
      L(STATUS[ME.status] || STATUS.reference),
    ];

    box.innerHTML =
      '<div class="sf-top-lab">' + esc(T("What this station is for", "Po co ta stacja")) + "</div>" +
      '<p class="sf-goal">' + esc(T("When you leave, you should be able to:", "Wychodząc, powinieneś umieć:")) +
        " <b>" + esc(L(goal)) + "</b></p>" +
      '<div class="sf-chips">' +
        chips.map(c => '<span class="sf-chip">' + esc(c) + "</span>").join("") +
      "</div>" +
      (ME.example
        ? '<a class="sf-example" href="' + esc(ME.example.url) + '">' +
            '<span class="sf-example-ico">▶</span>' +
            "<span><b>" + esc(T("Show me an example", "Pokaż mi przykład")) + "</b>" +
            "<em>" + esc(L(ME.example.why)) + "</em></span></a>"
        : "");
    return box;
  }

  // ---------------------------------------------------------------- dół
  function nextSteps() {
    const before = (ME.prerequisites || []).map(id => CAT.byId[id]).filter(Boolean);

    // Dokąd dalej: najpierw następny krok trasy, w której ta stacja występuje,
    // a gdy jej tam nie ma, kolejna stacja w tym samym torze.
    const route = CAT.route();
    const at = route.findIndex(s => s.id === ME.id);
    let after = [];
    if (at >= 0 && route[at + 1]) after.push(route[at + 1]);
    const sameTrack = CAT.inTrack(ME.track).filter(s => s.id !== ME.id && !after.some(a => a.id === s.id));
    after = after.concat(sameTrack.slice(0, 2));
    // Stacje, które wymagają tej: naturalne "co teraz mogę zrobić".
    const unlocks = CAT.list.filter(s => !s.hidden && (s.prerequisites || []).includes(ME.id) &&
                                         !after.some(a => a.id === s.id));
    after = after.concat(unlocks).slice(0, 3);

    if (!before.length && !after.length) return null;

    const card = st =>
      '<a class="sf-card" href="' + esc(st.page) + '" style="--sf-c:' +
        esc((CAT.TRACKS[st.track] || {}).colour || "#7c9bff") + '">' +
        '<span class="sf-card-ico">' + esc(st.icon) + "</span>" +
        '<span class="sf-card-txt"><b>' + esc(L(st.title)) + "</b>" +
        "<em>" + esc(L(st.blurb)) + "</em></span></a>";

    const box = document.createElement("section");
    box.className = "sf-next";
    box.innerHTML =
      (before.length
        ? '<div class="sf-next-lab">' + esc(T("Helps to have seen first", "Warto było zobaczyć wcześniej")) + "</div>" +
          '<div class="sf-cards">' + before.map(card).join("") + "</div>"
        : "") +
      (after.length
        ? '<div class="sf-next-lab">' + esc(T("Where to go next", "Dokąd dalej")) + "</div>" +
          '<div class="sf-cards">' + after.map(card).join("") + "</div>"
        : "");
    return box;
  }

  // ---------------------------------------------------------------- montaż
  //
  // Strony nie mają jednej struktury: większość używa <main>, ale explorer.html
  // trzyma treść w sekcjach bezpośrednio w <body>. Rama sama znajduje sobie
  // miejsce, zamiast zakładać układ, którego część stron nie ma.
  function hostAndAnchor() {
    const main = document.querySelector("main");
    if (main) return { host: main, first: main.firstElementChild };
    // Bez <main>: wstaw za nagłówkiem strony, przed pierwszą sekcją treści.
    const hero = document.querySelector("header, #hero, .lab-header");
    const after = hero ? hero.nextElementSibling : document.body.firstElementChild;
    return { host: (after && after.parentElement) || document.body, first: after };
  }

  function mount() {
    document.querySelectorAll(".sf-top, .sf-next").forEach(n => n.remove());
    const { host, first } = hostAndAnchor();
    if (!host) return;

    const t = top();
    if (t) {
      if (first) host.insertBefore(t, first); else host.appendChild(t);
      // Poza <main> sekcja potrzebuje własnej szerokości strony.
      if (host === document.body) t.classList.add("sf-loose");
    }

    const n = nextSteps();
    if (n) {
      if (host === document.body) n.classList.add("sf-loose");
      // Przed kontraktem naukowym i przed stopką, żeby kontrakt zostawał
      // ostatnim słowem na stronie.
      const contract = document.getElementById("scientific-contract");
      const footer = document.getElementById("footer");
      const before = (contract && contract.parentElement === host) ? contract
                   : (footer && footer.parentElement === host) ? footer : null;
      if (before) host.insertBefore(n, before); else host.appendChild(n);
    }
  }

  // Stacje budują się asynchronicznie: EMG najpierw pobiera zapis z pliku, inne
  // czekają na trzy.js albo na WebAssembly. Rama montuje się wcześniej, więc
  // pierwszy pomiar łapał stronę bez kontrolek i pokazywał "0 kontrolek".
  // Chipy przeliczają się ponownie, gdy treść pod nimi przestanie się zmieniać.
  let settle = null, observer = null;
  function refreshChips() {
    const box = document.querySelector(".sf-top .sf-chips");
    if (!box) return;
    const m = measure();
    const track = CAT.TRACKS[ME.track];
    const chips = [
      "~" + m.minutes + " " + (PL() ? plMinut(m.minutes) : (m.minutes === 1 ? "minute" : "minutes")) +
        " " + T("of reading", "czytania"),
      m.controls + " " + (PL() ? plKontrolek(m.controls) : (m.controls === 1 ? "control" : "controls")),
      L(track),
      L(STATUS[ME.status] || STATUS.reference),
    ];
    // Kontrolka o wartości zero jest myląca, więc znika zamiast kłamać.
    const shown = chips.filter((c, i) => !(i === 1 && m.controls === 0));
    if (observer) observer.disconnect();
    box.innerHTML = shown.map(c => '<span class="sf-chip">' + esc(c) + "</span>").join("");
    if (observer) watch();
  }

  function watch() {
    const main = document.querySelector("main");
    if (!main || !("MutationObserver" in window)) return;
    observer = observer || new MutationObserver(() => {
      clearTimeout(settle);
      settle = setTimeout(refreshChips, 400);
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  function boot() {
    mount();
    watch();
    // Zapasowo, gdyby stacja zbudowała się bez zmian w DOM pod obserwacją.
    setTimeout(refreshChips, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("i18n:changed", () => { mount(); watch(); refreshChips(); });

  window.__stationFrame = { measure, mount, refreshChips };
})();
