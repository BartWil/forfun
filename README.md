# Motion Lab — Interactive Biomechanics Explorer

A small, dependency-free (no build step) website that visualizes ground reaction force,
joint angles, and muscle activation across five everyday movements: walking, running,
jumping (countermovement), landing, and squatting.

- Scrub or auto-play through each movement cycle and watch a stick figure, animated with
  simple forward kinematics, move in sync with three charts.
- Change one parameter per movement (speed, jump effort, landing stiffness, squat depth)
  and see force/angle/muscle curves rescale in real time.
- Compare any two movement/parameter combinations side by side.

## Running locally

No build tooling required — it's plain HTML/CSS/JS plus Chart.js from a CDN. Serve the
folder with any static file server, e.g.:

```bash
python -m http.server 8934
```

then open `http://localhost:8934`.

## Data

Curve shapes and magnitudes in `data.js` are illustrative reconstructions grounded in
well-established biomechanics literature (see the Sources section on the page), not
digitized patient data. They're built to teach the pattern of each movement, not to
diagnose or model any individual.

## Files

- `index.html` — page structure/content
- `style.css` — design system
- `data.js` — per-movement keyframe curves, phase labels, parameter definitions, citations
- `spline.js` — Catmull-Rom interpolation over cyclic keyframes
- `figure.js` — canvas stick-figure forward-kinematics renderer
- `charts.js` — Chart.js line charts (GRF, joint angles) + hand-rolled muscle sparklines
- `app.js` — movement switching, playback loop, sliders, compare mode
