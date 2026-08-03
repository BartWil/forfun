// Generate README.md from stations.js.
//
// The old README described four pages and a cache version of v=11 while the site
// had fifteen stations. Hand-maintained inventories rot. This one is built from
// the catalogue, so the day a station is added the README knows about it.
//
//   node scripts/gen_readme.mjs           write README.md
//   node scripts/gen_readme.mjs --check   fail if README.md is out of date
//
// tests/science.test.mjs runs the --check form, so a stale README breaks the build.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(ROOT, f), "utf8");

const STATIONS = new Function(
  "var self={},module={};" + read("stations.js") + "; return self.STATIONS || module.exports;")();

const STATUS = {
  verified: "traceable to a published measurement",
  reconstructed: "reconstructed from the literature",
  synthetic: "synthetic teaching model",
  reference: "reference material",
};
const TRACK_ORDER = ["movement", "forces", "measurement", "clinical"];

function stationTable() {
  let out = "";
  for (const t of TRACK_ORDER) {
    const items = STATIONS.inTrack(t);
    if (!items.length) continue;
    out += `\n### ${STATIONS.TRACKS[t].en}\n\n`;
    out += `${STATIONS.TRACKS[t].d.en}\n\n`;
    out += "| Station | Level | Scientific status | Page |\n";
    out += "|---|---|---|---|\n";
    for (const s of items) {
      out += `| ${s.icon} **${s.title.en}**<br><sub>${s.blurb.en}</sub> | ${s.level} | ${STATUS[s.status]} | [\`${s.page}\`](${s.page}) |\n`;
    }
  }
  return out;
}

const counts = TRACK_ORDER.map(t => `${STATIONS.inTrack(t).length} ${STATIONS.TRACKS[t].en.toLowerCase()}`).join(", ");
const total = STATIONS.list.filter(s => !s.hidden).length;

const README = `# BioLab Play

**An interactive biomechanics laboratory for students and curious clinicians.**

<https://bartwil.github.io/forfun/>

Interactive experiments that teach you how biomechanical numbers are created,
manipulated and misinterpreted.

Most teaching material shows you a finished curve. This one hands you the
instrument. You drag the ground reaction force and watch the joint moments solve
themselves; you filter a real muscle recording yourself and watch how much of the
answer was your own choice. The point is not to memorise what a gait cycle looks
like. It is to know, when you next read a figure in a paper, how many decisions
are sitting behind it.

No accounts, no tracking, no build step, no backend. Open a file and it runs.

---

## What is in it

${total} stations across four tracks (${counts}). You can wander in anywhere, or
follow a track in order.
${stationTable()}

---

## The scientific contract

Every station carries one, and it is rendered on the page rather than buried in
the source. It states, before a reader has to ask:

| Field | Meaning |
|---|---|
| \`learningGoal\` | what you should be able to do afterwards |
| \`measured\` | numbers that came off an instrument |
| \`calculated\` | numbers derived from those, by arithmetic the page shows |
| \`modelled\` | numbers that came from an assumption, not an instrument |
| \`assumptions\` | what has to be true for the page to mean anything |
| \`cannotConclude\` | the questions this station **cannot** answer, however tempting |
| \`primarySources\` | what to read to check us |

\`cannotConclude\` is the load-bearing one. Every scientific error found in review
of this project so far would have been caught by writing that field honestly
first, so the test suite refuses to build if any station leaves it empty.

Contracts live in [\`stations.js\`](stations.js) and are rendered by
[\`contract-panel.js\`](contract-panel.js). Nothing is hand-written per page, so a
contract cannot drift away from the station it describes.

---

## Tests

\`\`\`bash
npm test        # or: node tests/science.test.mjs
\`\`\`

These are **not** UI tests. Nothing checks that a button is blue. Every assertion
states something that has to be true for the site to be honest, so that a commit
which changes an animation cannot quietly change the physiology:

- ground reaction force is zero through swing, never negative, and averages to a
  physically possible value over a cycle
- measured EMG peaks at exactly 1.0, because it is normalised to its own peak,
  and the pages are grep-checked for wording that would imply amplitude is effort
- curves are evaluated through the site's own spline, and the render path is
  checked for the clamps that keep interpolation overshoot off the screen
- joint angles stay in anatomical range; running knee flexion exceeds walking
- measured signals cite a paper and a sample size; a reconstruction may never
  carry the "measured" badge
- sweeping a speed slider never requests a speed outside the measured range
- inverse dynamics agrees with an independent free-body solution to 1e-9, and
  satisfies invariants: force through a joint centre leaves only segment weight,
  massless and unloaded gives exactly zero
- the EMG filter is checked sample by sample against \`scipy.signal.butter(4)\` +
  \`filtfilt\`, **and** against the closed-form Butterworth magnitude response
- every station's contract is complete, bilingual, and points at pages that exist
- this README matches the catalogue

Zero dependencies, on purpose: it has to still run in five years without an
\`npm install\`.

---

## Data

Datasets are **cited and linked, not redistributed**, with one exception.

| What | Source | Licence | In this repo? |
|---|---|---|---|
| Walking and running kinematics and forces | Fukuchi et al. 2018 / 2017 | see source | no, derived curves only |
| Running EMG | Santuz et al. 2018 | CC BY-SA 4.0 | no, derived curves only |
| Walking EMG | Santuz et al. 2021 | CC BY 4.0 | no, derived curves only |
| **Raw EMG excerpt, 8 s, 3 channels** | **Santuz et al. 2021** | **CC BY 4.0** | **yes**, see [\`data/emg/LICENSE_DATA.md\`](data/emg/LICENSE_DATA.md) |

The raw excerpt is redistributed because the EMG Lab is meaningless without a
real unprocessed signal, and because CC BY 4.0 permits it with attribution. The
2018 running record was **not** used for this, despite being the more obvious
match, because its CC BY-SA 4.0 share-alike term would reach further into the
project than we want.

**Before adding a dataset, check its licence separately. Open access is not the
same as redistributable.**

Both committed data files are reproducible from their sources:

\`\`\`bash
python scripts/extract_emg_demo.py      # fetch and cut the raw excerpt
python scripts/make_emg_reference.py    # regenerate the DSP test oracle
\`\`\`

---

## Running it

There is no build step.

\`\`\`bash
python -m http.server 8000
# then open http://localhost:8000
\`\`\`

A plain \`file://\` open works for most pages, but the EMG Lab fetches a CSV, so
it needs a server.

## Layout

\`\`\`
*.html              one file per station
stations.js         the catalogue and every scientific contract
contract-panel.js   renders the contract onto every page
nav.js              builds the menu from the catalogue
i18n.js             English and Polish, for all of it
data.js             movement dataset shared by several stations
runtime.js          the one path from data to numbers on screen
spline.js           cyclic interpolation
data/emg/           the raw EMG excerpt and its test oracle
scripts/            data extraction and this README generator
tests/              the scientific test suite
\`\`\`

## Languages

Everything is English and Polish, including the contracts and the hover
citations. Language is remembered per browser.

## Licence

Code is MIT. Educational content is CC BY 4.0. Third-party data keeps its own
licence, listed above and in \`data/emg/LICENSE_DATA.md\`.

See [\`LICENSE\`](LICENSE) and [\`CONTRIBUTING.md\`](CONTRIBUTING.md).

## Citing

See [\`CITATION.cff\`](CITATION.cff).

---

<sub>This file is generated from \`stations.js\` by \`scripts/gen_readme.mjs\`.
Edit the catalogue or the generator, not this file. The test suite checks that it
is current.</sub>
`;

const target = join(ROOT, "README.md");
if (process.argv.includes("--check")) {
  const cur = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (cur.replace(/\r\n/g, "\n") !== README.replace(/\r\n/g, "\n")) {
    console.error("README.md is out of date. Run: node scripts/gen_readme.mjs");
    process.exit(1);
  }
  console.log("README.md is current");
} else {
  writeFileSync(target, README);
  console.log("wrote README.md (%d stations)", total);
}
