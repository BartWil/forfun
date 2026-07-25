# Grounding the Explorer curves in real data

Goal: replace the illustrative curves in `data.js` with **measured** grand-average curves
from open datasets — one movement at a time, each curve traceable to its source. Starting
with **walking** as the template.

## The pipeline

```
processed dataset file  →  cycle-normalised CSV  →  tools/curve-builder.html  →  keyframes in data.js
        (you provide)         (0–100 %, one row/sample)     (RDP reduction)          (+ provenance)
```

`tools/curve-builder.html` is a self-contained browser page — open it locally (or via any
static server), drop a CSV, tune ε, eyeball the fit, copy the arrays. Nothing is uploaded.

## CSV format the tool expects

- First column named `percent` (or `pct` / `%` / `cycle`), values **0–100**, one row per sample
  (101 rows for a 0–100 % normalised cycle is ideal).
- Every other column is a curve; the **column name becomes the keyframe key**.
- Values are already in **final units** (see below). Comment lines start with `#`.

```csv
percent,vgrf,hip,knee,ankle
0,0.02,30.1,5.2,2.1
1,0.35,29.4,6.8,0.4
...
100,0.00,31.0,4.9,3.0
```

## Walking — shopping list

**Kinematics + vGRF — Fukuchi, Fukuchi & Duarte (2018)**
"A public data set of overground and treadmill walking kinematics and kinetics of healthy individuals."
PeerJ 6:e4640 · paper DOI `10.7717/peerj.4640` · data DOI `10.6084/m9.figshare.5722711`

From the processed files, grand-averaged across the 42 subjects, **overground comfortable-speed**
walking (the `...walkO...` trials):

| Curve  | What                              | Units / convention                         |
|--------|-----------------------------------|--------------------------------------------|
| `vgrf` | Vertical ground reaction force    | multiples of body weight (BW), 0 in swing  |
| `hip`  | Sagittal hip angle                | **+ = flexion**, 0 = neutral standing      |
| `knee` | Sagittal knee angle               | **+ = flexion**, 0 = full extension        |
| `ankle`| Sagittal ankle angle              | **+ = dorsiflexion**, − = plantarflexion   |

Two things to sort when exporting (flag me if unsure — I can flip/scale in seconds):
- **Sign conventions** must match the table above (they match the header of `data.js`). Fukuchi's
  sign for a joint may be inverted — check one curve against a textbook gait plot.
- **vGRF axis**: overground GRF is measured over **stance only**. Either give it to me already mapped
  onto the full 0–100 % gait cycle (0 during swing), or give me stance-only and tell me the stance
  fraction (~62 % for walking) and I'll place it on the cycle.

**Muscle activation (EMG) — separate source (decided: measured).** The Fukuchi walking set has no EMG,
so walking EMG comes from an open **walking-EMG** dataset (e.g. a Santuz et al. modular-control walking
set — point me at the specific one you can access and I'll confirm it fits). Provide grand-average,
cycle-normalised, per-muscle-peak-normalised envelopes (same processing the running EMG already uses).

Pool the raw channels into the site's five walking muscles and name the CSV columns exactly:

| Column             | Pool from (typical channels)              |
|--------------------|-------------------------------------------|
| `gluteus_maximus`  | GMax                                      |
| `quadriceps`       | rectus femoris + vastus medialis/lateralis|
| `hamstrings`       | biceps femoris + semitendinosus           |
| `gastroc_soleus`   | gastrocnemius (med/lat) + soleus          |
| `tibialis_anterior`| tibialis anterior                         |

Each envelope normalised so its own peak in the cycle = **1.0** (values 0–1), matching the existing
muscle curves. CSV shape: `percent,gluteus_maximus,quadriceps,hamstrings,gastroc_soleus,tibialis_anterior`.

## Provenance (so every line self-cites)

Proposed addition to each movement in `data.js`, and a small caption rendered under each chart:

```js
sources: {
  grf:     { ref: "Fukuchi et al. 2018", paper: "10.7717/peerj.4640", data: "10.6084/m9.figshare.5722711", n: 42, kind: "measured" },
  angles:  { ref: "Fukuchi et al. 2018", paper: "10.7717/peerj.4640", data: "10.6084/m9.figshare.5722711", n: 42, kind: "measured" },
  muscles: { ref: "—", kind: "modelled" },
}
```

`kind: "measured" | "modelled"` drives an honest badge, exactly like the “What's measured vs.
what's modelled” table already on the Anatomy page.
