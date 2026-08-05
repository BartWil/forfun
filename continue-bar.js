// "Continue where you left off", on the landing page.
//
// Deliberately small. One bar, the most recent experiment, and the two before it
// folded away behind a link. No account, no percentage complete, no streak, no
// leaderboard. The only claim it makes is "you were here, and here is the exact
// state you left".
//
// It does not have a storage format of its own. Resume is a deep link built from
// the same serialised state the share button produces, so if sharing works then
// resuming works, and there is one thing that can be wrong instead of two.

(function () {
  "use strict";

  const PL = () => window.i18n && window.i18n.lang === "pl";
  const T = (en, pl) => (PL() ? pl : en);
  const L = o => (o ? (PL() ? o.pl : o.en) : "");

  function summarise(entry) {
    // The landing page does not know what a muscle or a moment arm is. It hands
    // the decoded state to the station's own codec and prints whatever comes
    // back, so a new station needs no change here at all.
    const B = window.BioLabState;
    return B.summary(entry.station, B.decode("?" + entry.query));
  }

  function checkpointLabel(entry) {
    if (!entry.checkpoint) return "";
    return typeof entry.checkpoint === "string" ? entry.checkpoint : (entry.checkpoint.label || "");
  }

  function hrefFor(entry, station) {
    return station.page + (entry.query ? "?" + entry.query : "") +
      (entry.checkpoint && entry.checkpoint.k ? "#" + entry.checkpoint.k : "");
  }

  function build() {
    const B = window.BioLabState, CAT = window.STATIONS;
    if (!B || !CAT) return;
    const host = document.getElementById("lpContinue");
    if (!host) return;

    const entries = B.history()
      .map(e => ({ e, st: CAT.byId[e.station] }))
      .filter(x => x.st);          // a station that no longer exists is dropped

    host.innerHTML = "";
    if (!entries.length) { host.hidden = true; return; }
    host.hidden = false;

    const first = entries[0];
    const rest = entries.slice(1);
    const cp = checkpointLabel(first.e);
    const sum = summarise(first.e);

    const E = B.esc;
    const wrap = document.createElement("div");
    wrap.className = "bs-continue";
    // Everything interpolated here came out of localStorage or a station codec.
    // Both are outside this file's control, so both are escaped.
    wrap.innerHTML =
      '<a class="bs-cont-main" href="' + E(hrefFor(first.e, first.st)) + '">' +
        '<span class="bs-cont-ico">' + E(first.st.icon) + "</span>" +
        '<span class="bs-cont-txt">' +
          '<span class="bs-cont-lab">' + E(T("Continue where you left off", "Wróć tam, gdzie skończyłeś")) + "</span>" +
          '<span class="bs-cont-name">' + E(L(first.st.title) + (cp ? " · " + cp : "")) + "</span>" +
          '<span class="bs-cont-meta">' + E((sum ? sum + " · " : "") + B.ago(first.e.updated)) + "</span>" +
        "</span>" +
        '<span class="bs-cont-go">' + E(T("Resume", "Wznów")) + "</span>" +
      "</a>" +
      (rest.length
        ? '<button type="button" class="bs-cont-more" aria-expanded="false">' +
            E(T("and " + rest.length + " earlier", "oraz " + rest.length + " wcześniej")) + " ▾</button>" +
          '<div class="bs-cont-rest" hidden>' +
            rest.map(x =>
              '<a href="' + E(hrefFor(x.e, x.st)) + '">' +
              E(x.st.icon + " " + L(x.st.title) +
                (checkpointLabel(x.e) ? " · " + checkpointLabel(x.e) : "")) +
              "<em>" + E(B.ago(x.e.updated)) + "</em></a>").join("") +
          "</div>"
        : "") +
      '<button type="button" class="bs-cont-clear">' +
        E(T("Forget my history", "Zapomnij moją historię")) + "</button>";

    host.appendChild(wrap);

    const more = wrap.querySelector(".bs-cont-more");
    if (more) {
      const panel = wrap.querySelector(".bs-cont-rest");
      more.onclick = () => {
        panel.hidden = !panel.hidden;
        more.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      };
    }
    wrap.querySelector(".bs-cont-clear").onclick = () => {
      window.BioLabState.clear();
      build();
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
  document.addEventListener("i18n:changed", build);

  window.__continueBar = { build, summarise };
})();
