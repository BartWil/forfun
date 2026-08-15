# BioLab Play

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

16 stations across four tracks (5 movement, 4 forces & mechanics, 4 measurement, 3 clinical interpretation). You can wander in anywhere, or
follow a track in order.

### Movement

What bodies actually do: walking, running, jumping, squatting.

| Station | Level | Scientific status | Page |
|---|---|---|---|
| 🔬 **Explorer**<br><sub>Four movements, three signals, one cycle. The place to start.</sub> | beginner | traceable to a published measurement | [`explorer.html`](explorer.html) |
| 📖 **Anatomy of a Step**<br><sub>One walking step, narrated phase by phase as you scroll.</sub> | beginner | traceable to a published measurement | [`lesson.html`](lesson.html) |
| 🚶 **Real Gait**<br><sub>A rigged body walking on measured motion-capture angles.</sub> | intermediate | traceable to a published measurement | [`gait3d.html`](gait3d.html) |
| 🦴 **The Anatomy**<br><sub>A 3D figure whose muscles light up with real activation.</sub> | intermediate | traceable to a published measurement | [`body3d.html`](body3d.html) |
| ⚡ **The Forge**<br><sub>The same forces, thrown as real physics particles.</sub> | beginner | traceable to a published measurement | [`lab.html`](lab.html) |

### Forces & Mechanics

Why they do it: levers, moments, muscle mechanics, inverse dynamics.

| Station | Level | Scientific status | Page |
|---|---|---|---|
| 🍎 **Physics, from scratch**<br><sub>Newton's laws rebuilt for anyone who barely survived school physics.</sub> | beginner | reference material | [`physics.html`](physics.html) |
| 💪 **Muscle Levers**<br><sub>Why holding 5 kg costs the biceps ten times that.</sub> | beginner | reconstructed from the literature | [`muscle.html`](muscle.html) |
| 🔬 **Muscle Dyno**<br><sub>Length-tension and force-velocity, running as live Ruby.</sub> | intermediate | reconstructed from the literature | [`dyno.html`](dyno.html) |
| 🧮 **Inverse Dynamics**<br><sub>Solve the joint moments yourself, from the floor up.</sub> | intermediate | traceable to a published measurement | [`dynamics.html`](dynamics.html) |

### Measurement

Where the numbers come from, and how far you can trust them.

| Station | Level | Scientific status | Page |
|---|---|---|---|
| ⬛ **Force Plate Lab**<br><sub>One jump, six channels, and eight decisions that change the answer.</sub> | intermediate | synthetic teaching model | [`forceplate.html`](forceplate.html) |
| 📐 **The ISB Standard**<br><sub>Why the same knee gives different numbers in different labs.</sub> | intermediate | reference material | [`isb.html`](isb.html) |
| 📗 **Glossary**<br><sub>Every term the rest of the site assumes you know.</sub> | beginner | reference material | [`glossary.html`](glossary.html) |
| ⚡ **EMG Lab**<br><sub>Real unprocessed muscle electricity. Process it yourself and watch the answer move.</sub> | beginner | traceable to a published measurement | [`emg.html`](emg.html) |

### Clinical interpretation

Reading movement in a person, and the limits of doing so.

| Station | Level | Scientific status | Page |
|---|---|---|---|
| 🦿 **Gait Lab**<br><sub>Switch on a deficit and watch the compensation appear.</sub> | intermediate | synthetic teaching model | [`sandbox.html`](sandbox.html) |
| 🦵 **Knee Control**<br><sub>Frontal-plane control, and the limits of seeing it.</sub> | intermediate | synthetic teaching model | [`sls.html`](sls.html) |
| 🩻 **Spine Under Load**<br><sub>Two classic studies, and the textbook claim they disagree on.</sub> | beginner | traceable to a published measurement | [`spine.html`](spine.html) |


---

## The scientific contract

Every station carries one, and it is rendered on the page rather than buried in
the source. It states, before a reader has to ask:

| Field | Meaning |
|---|---|
| `learningGoal` | what you should be able to do afterwards |
| `measured` | numbers that came off an instrument |
| `calculated` | numbers derived from those, by arithmetic the page shows |
| `modelled` | numbers that came from an assumption, not an instrument |
| `assumptions` | what has to be true for the page to mean anything |
| `cannotConclude` | the questions this station **cannot** answer, however tempting |
| `primarySources` | what to read to check us |

`cannotConclude` is the load-bearing one. Every scientific error found in review
of this project so far would have been caught by writing that field honestly
first, so the test suite refuses to build if any station leaves it empty.

Contracts live in [`stations.js`](stations.js) and are rendered by
[`contract-panel.js`](contract-panel.js). Nothing is hand-written per page, so a
contract cannot drift away from the station it describes.

---

## Tests

```bash
npm test        # or: node tests/science.test.mjs
```

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
- the EMG filter is checked sample by sample against `scipy.signal.butter(4)` +
  `filtfilt`, **and** against the closed-form Butterworth magnitude response
- every station's contract is complete, bilingual, and points at pages that exist
- this README matches the catalogue

Zero dependencies, on purpose: it has to still run in five years without an
`npm install`.

---

## Data

Datasets are **cited and linked, not redistributed**, with one exception.

| What | Source | Licence | In this repo? |
|---|---|---|---|
| Walking and running kinematics and forces | Fukuchi et al. 2018 / 2017 | see source | no, derived curves only |
| Running EMG | Santuz et al. 2018 | CC BY-SA 4.0 | no, derived curves only |
| Walking EMG | Santuz et al. 2021 | CC BY 4.0 | no, derived curves only |
| **Raw EMG excerpt, 8 s, 3 channels** | **Santuz et al. 2021** | **CC BY 4.0** | **yes**, see [`data/emg/LICENSE_DATA.md`](data/emg/LICENSE_DATA.md) |

The raw excerpt is redistributed because the EMG Lab is meaningless without a
real unprocessed signal, and because CC BY 4.0 permits it with attribution. The
2018 running record was **not** used for this, despite being the more obvious
match, because its CC BY-SA 4.0 share-alike term would reach further into the
project than we want.

**Before adding a dataset, check its licence separately. Open access is not the
same as redistributable.**

Both committed data files are reproducible from their sources:

```bash
python scripts/extract_emg_demo.py      # fetch and cut the raw excerpt
python scripts/make_emg_reference.py    # regenerate the DSP test oracle
```

---

## Running it

There is no build step.

```bash
python -m http.server 8000
# then open http://localhost:8000
```

A plain `file://` open works for most pages, but the EMG Lab fetches a CSV, so
it needs a server.

## Layout

```
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
```

## Languages

Everything is English and Polish, including the contracts and the hover
citations. Language is remembered per browser.

## Licence

Code is MIT. Educational content is CC BY 4.0. Third-party data keeps its own
licence, listed above and in `data/emg/LICENSE_DATA.md`.

See [`LICENSE`](LICENSE) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Citing

See [`CITATION.cff`](CITATION.cff).

---

<sub>This file is generated from `stations.js` by `scripts/gen_readme.mjs`.
Edit the catalogue or the generator, not this file. The test suite checks that it
is current.</sub>
