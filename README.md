# Motion Lab — an interactive biomechanics explorer

A small, dependency-light educational site about the forces, joint angles, and
muscle activity behind human movement. Static HTML/CSS/JS — no build step. Every
library is loaded from a CDN as a plain script/import-map. Deployed via GitHub
Pages: **https://bartwil.github.io/forfun/**

This README doubles as the project handoff doc — read it first when picking the
work back up on another machine.

## Pages

| Page | File | What it is |
|------|------|-----------|
| **Explorer** | `index.html` | Stick-figure forward-kinematics + synced Chart.js charts (GRF, joint angles, muscle activation) for walk / run / jump / land / squat. Movement tabs, play/scrub, parameter sliders, compare mode. |
| **The Forge** ⚡ | `lab.html` | The same data rendered as **Rapier2D** physics particles (GRF spray as directional arrows, muscle-activation embers). |
| **The Anatomy** 🦴 | `body3d.html` | A **three.js** procedural articulated 3D figure driven by the joint angles, muscles glowing cool→hot with activation, GRF arrow, plus a synced 2D EMG heatmap (front+back) via the `body-muscles` library. |
| **Real Gait** 🚶 | `gait3d.html` | A realistically-proportioned rigged human (three.js "Xbot") **walking on real motion-capture joint angles**, with foot-locked overground progression. |

## Architecture / shared files

- `data.js` — `MOVEMENTS` object: per-movement GRF, hip/knee/ankle angles,
  trunk lean, hip drop, muscle activation, phases, parameter definitions.
- `spline.js` — Catmull-Rom keyframe interpolation over cyclic keyframes.
- `runtime.js` — `computeScales`, `liveState`, `muscleActivationAt` (shared eval).
- `figure.js` — 2D stick-figure forward kinematics (Explorer + Forge).
- `charts.js` / `app.js` — Explorer charts + UI wiring.
- `lab.js` — Forge (Rapier2D) particle world.
- `body3d.js` — Anatomy 3D figure + 2D muscle-map wiring.
- `gait3d.js` — Real Gait: GLB load, retargeting, foot-lock, transport. The
  `GAIT` constant holds the real walking angles.
- `style.css` / `lab.css` / `body3d.css` / `gait3d.css`.

**Cache-busting:** local `<script>`/`<link>` refs carry `?v=N` (currently `v=3`).
**Bump the number whenever you change a JS/CSS file**, or GitHub Pages' cached
copies won't reach returning visitors. (This bit us once — see commit f09cd99.)

## What's real data vs. illustrative

- **Running muscle activation** — REAL. Grand-average EMG envelopes from Santuz
  et al. 2018 (135 adults, ~11,388 running cycles; Zenodo 6655800). Baked into
  `data.js` → `MOVEMENTS.run.muscles`.
- **Walking joint angles** (Real Gait page) — REAL. Grand-average sagittal
  hip/knee/ankle from Fukuchi et al. 2018 (42 adults, overground comfortable
  speed; PeerJ 6:e4640 / figshare 5722711). Baked into `gait3d.js` → `GAIT`.
- **Everything else** (walk/jump/land/squat joint angles + GRF; all non-running
  muscle activation) — illustrative reconstructions grounded in the biomechanics
  literature (Perry, Winter, Novacheck, Bobbert, Escamilla, Decker…). See the
  Sources section on `index.html`.

The offline scripts that produced the real data live in `data-processing/`
(see its README). You don't need to run them to use the site.

## Running locally

Any static server, e.g.:

```bash
python -m http.server 8000
```

then open `http://localhost:8000/index.html`. (Plain `file://` mostly works too,
but the three.js pages fetch models/libraries over the network.)

## Known caveats / possible next steps

- **Real Gait visual not yet eyeballed.** The kinematics are verified
  numerically (correct joint ranges, feet planted with zero skate, ~0.8 m/stride
  progression, no console errors), but the actual on-screen look was never
  screenshotted during development. Worth a human check: arm-swing direction,
  cadence/speed, camera framing. These are quick tuning knobs in `gait3d.js`
  (`CYCLE_MS`, the arm-swing gain in `applyPose`, camera setup in `initScene`).
- **The Anatomy** uses a stylised procedural body; the scene graph was built so a
  real anatomical / ecorché mesh could be dropped in later without changing the
  data wiring.
- Real-data coverage could extend to other movements (e.g., real squat/jump
  kinematics or EMG) if a suitable open dataset is found.
