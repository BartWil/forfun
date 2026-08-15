// Kanał zwrotny: jedna linijka w stopce każdej strony.
//
// CONTRIBUTING.md od dawna mówi, że zgłoszenie od studenta, który przeczytał tu
// coś mylącego, jest raportem, na którym projektowi zależy najbardziej. Tyle że
// student czytający stronę nie miał jak takiego zgłoszenia wysłać: ani adresu,
// ani odnośnika, niczego. Obietnica bez drzwi.
//
// To są te drzwi. Zwykły mailto, bez konta, bez formularza, bez logowania,
// bez zbierania czegokolwiek o czytelniku. Treść wiadomości jest wstępnie
// wypełniona nazwą stacji i adresem strony, żeby zgłaszający nie musiał
// tłumaczyć, gdzie był, a odbierający nie musiał zgadywać.
//
// Dopisywane wyłącznie do stopki. Nic istniejącego nie jest modyfikowane.

(function () {
  "use strict";

  const ADDRESS = "b.wilczynski.fizjoterapia@gmail.com";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  function station() {
    const CAT = window.STATIONS;
    if (!CAT) return null;
    const page = location.pathname.split("/").pop() || "index.html";
    return CAT.forPage(page) || null;
  }

  function mailto() {
    const st = station();
    const name = st ? L(st.title) : "BioLab Play";
    // Adres bez parametrów eksperymentu: link do zgłoszenia ma być czytelny,
    // a stan eksperymentu i tak zwykle nie jest tym, co uwiera.
    const url = location.origin + location.pathname;

    const subject = "BioLab Play: " + name;
    const body = PL()
      ? "Strona: " + name + "\n" +
        "Adres: " + url + "\n\n" +
        "Co było niejasne albo błędne:\n\n\n" +
        "Czego się spodziewałem/spodziewałam zamiast tego:\n\n\n" +
        "(Nie musisz wypełniać obu pól. Jedno zdanie też jest cenne.)\n"
      : "Page: " + name + "\n" +
        "Address: " + url + "\n\n" +
        "What was unclear or wrong:\n\n\n" +
        "What I expected instead:\n\n\n" +
        "(You do not have to fill in both. One sentence is worth sending.)\n";

    return "mailto:" + ADDRESS +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  function build() {
    const footer = document.getElementById("footer");
    if (!footer) return;
    const host = footer.querySelector(".footer-inner") || footer;

    const old = host.querySelector(".fb-line");
    if (old) old.remove();

    const p = document.createElement("p");
    p.className = "fb-line";

    const a = document.createElement("a");
    a.className = "fb-link";
    a.href = mailto();
    a.textContent = T("Something here unclear or wrong? Write to me.",
                      "Coś tu jest niejasne albo błędne? Napisz do mnie.");

    const note = document.createElement("span");
    note.className = "fb-note";
    note.textContent = T("Opens your mail app. No account, nothing tracked.",
                         "Otworzy Twój program pocztowy. Bez konta, bez śledzenia.");

    p.append(a, note);
    host.appendChild(p);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
  document.addEventListener("i18n:changed", build);

  window.__feedback = { mailto, ADDRESS };
})();
