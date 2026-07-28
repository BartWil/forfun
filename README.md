# Motion Lab — an interactive biomechanics explorer

A small, dependency-light educational site about the forces, joint angles, and
muscle activity behind human movement. Static HTML/CSS/JS — no build step. Every
library is loaded from a CDN as a plain script/import-map. Bilingual (EN/PL).
Deployed via GitHub Pages: **https://bartwil.github.io/forfun/**

This README doubles as the project handoff doc — read it first when picking the
work back up on another machine.

## Pages

| Page | File | What it is |
|------|------|-----------|
| **Explorer** | `index.html` | Stick-figure forward-kinematics + synced Chart.js charts (GRF, joint angles, muscle activation) for walk / run / countermovement-jump / squat. Movement tabs, play/scrub, parameter sliders, compare mode, and a **measured/modelled provenance badge** on every chart. |
| **The Forge** ⚡ | `lab.html` | The same data rendered as **Rapier2D** physics particles (GRF spray as directional arrows, muscle-activation embers). |
| **The Anatomy** 🦴 | `body3d.html` | A **three.js** procedural articulated 3D figure driven by the joint angles, muscles glowing cool→hot with activation, GRF arrow, plus a synced 2D EMG heatmap (front+back) via the `body-muscles` library, and a "measured vs modelled" table. |
| **Real Gait** 🚶 | `gait3d.html` | A realistically-proportioned rigged human (three.js "Xbot") **walking on real motion-capture joint angles** (Fukuchi 2018), with foot-locked overground progression. |

## Architecture / shared files

- `data.js` — `MOVEMENTS` object: per-movement GRF, hip/knee/ankle angles, trunk
  lean, hip drop, muscle activation, phases, parameter definitions, and a
  `sources` block (measured/modelled provenance) per signal.
- `i18n.js` — EN/PL string table + `i18n.t(...)` and the language toggle; sweeps
  `[data-i18n]` / `[data-i18n-html]` attributes and remembers the choice.
- `spline.js` — Catmull-Rom keyframe interpolation over cyclic keyframes.
- `runtime.js` — `computeScales`, `liveState`, `muscleActivationAt`; blends
  measured per-speed curves for the walk/run speed slider.
- `figure.js` — 2D stick-figure forward kinematics (Explorer + Forge).
- `charts.js` / `app.js` — Explorer charts, provenance badges, UI wiring.
- `lab.js` — Forge (Rapier2D) particle world.
- `body3d.js` — Anatomy 3D figure + 2D muscle-map wiring.
- `gait3d.js` — Real Gait: GLB load, retargeting, foot-lock, transport. The
  `GAIT` constant holds the real walking angles.
- `style.css` / `lab.css` / `body3d.css` / `gait3d.css`.

**Cache-busting:** local `<script>`/`<link>` refs carry `?v=N` (currently `v=11`).
**Bump the number whenever you change a JS/CSS file**, or GitHub Pages' cached
copies won't reach returning visitors.

## What's real data vs. illustrative

Each Explorer chart carries a badge stating this; the Anatomy page has a table.

| Movement | Joint angles + GRF | Muscle activation |
|----------|--------------------|-------------------|
| **Walking** | Measured — Fukuchi et al. 2018 (42 adults) | Measured — Santuz et al. 2021 walking EMG |
| **Running** | Measured — Fukuchi et al. 2017 (28 adults) | Measured — Santuz et al. 2018 running EMG |
| **Jump / Squat** | Modelled — literature reconstruction | Modelled — literature reconstruction |

Real Gait (the `gait3d.html` 3D walker) is driven by the same Fukuchi 2018
walking kinematics.

## Data tooling (two complementary halves)

The pipeline is: **raw open dataset → cycle-normalised CSV → keyframes in code**.

- `data-processing/` (Python) does the **first arrow** — downloads/streams the raw
  datasets and produces averaged, cycle-normalised curves. Scripts:
  `santuz_running_emg.py`, `fukuchi_walking_average.py`, `fukuchi_walking_keyframes.py`.
  See its README.
- `tools/curve-builder.html` + `tools/DATA_SOURCES.md` do the **second arrow** — a
  self-contained browser page: drop a cycle-normalised CSV, RDP-reduce, eyeball
  the fit, copy the keyframe arrays into `data.js`. `DATA_SOURCES.md` is the
  per-dataset shopping list, column conventions, and provenance format.

You don't need either to run the site — the outputs are already baked into
`data.js` and `gait3d.js`.

## Running locally

Any static server, e.g.:

```bash
python -m http.server 8000
```

then open `http://localhost:8000/index.html`. (Plain `file://` mostly works too,
but the three.js pages fetch models/libraries over the network.)

## Known caveats / possible next steps

- **Real Gait visual not yet eyeballed.** The kinematics are verified numerically
  (correct joint ranges, feet planted with zero skate, ~0.8 m/stride progression,
  no console errors), but the on-screen look was never screenshotted. Worth a
  human check: arm-swing direction, cadence/speed, camera framing. Quick knobs in
  `gait3d.js` (`CYCLE_MS`, arm-swing gain in `applyPose`, camera in `initScene`).
- **Extend measured data to jump & squat** if suitable open datasets are found
  (they're the only remaining "modelled" movements). `tools/DATA_SOURCES.md` is
  the template for adding a movement.
- **The Anatomy** uses a stylised procedural body; the scene graph was built so a
  real anatomical / ecorché mesh could be dropped in later without changing the
  data wiring.
