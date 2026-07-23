// Movement dataset — illustrative reconstructions of well-established biomechanics literature
// (see #sources on the page). Not digitized patient data. All angles in degrees, GRF in multiples
// of body weight (BW). t = 0-100 represents one full movement cycle; curves wrap (loop) smoothly.
//
// Angle conventions:
//   hip:   + = flexion,        0 = neutral standing,      - = extension
//   knee:  + = flexion,        0 = fully extended
//   ankle: + = dorsiflexion,   0 = neutral,                - = plantarflexion
//   trunkLean: + = forward lean from vertical (degrees)
//   hipDrop: 0 = standing baseline height, + = center of mass lower, - = higher than standing (flight)

const MOVEMENTS = {

  walk: {
    label: "Walking",
    cycleLabel: "gait cycle — heel strike to heel strike",
    contralateralShift: 50,
    phases: [
      [0, 10, "Loading response"],
      [10, 30, "Mid stance"],
      [30, 50, "Terminal stance"],
      [50, 60, "Pre-swing"],
      [60, 73, "Initial swing"],
      [73, 87, "Mid swing"],
      [87, 100, "Terminal swing"],
    ],
    grf: [[0,0.15],[3,0.55],[6,0.95],[12,1.15],[18,1.05],[25,0.85],[32,0.72],[40,0.82],[45,1.0],[50,1.15],[54,0.95],[57,0.55],[60,0.1],[65,0],[80,0],[95,0]],
    hip: [[0,30],[10,22],[20,10],[30,0],[40,-8],[50,-10],[60,-5],[65,5],[73,20],[85,32],[95,31]],
    knee: [[0,5],[8,15],[15,20],[20,15],[30,6],[40,5],[50,10],[55,20],[60,38],[68,58],[73,63],[80,55],[87,35],[95,10]],
    ankle: [[0,2],[4,-5],[10,-3],[20,3],[30,8],[40,13],[45,14],[50,10],[55,-2],[60,-18],[65,-12],[70,-2],[75,3],[85,4],[95,3]],
    trunkLean: [[0,4],[50,5],[95,4]],
    hipDrop: [[0,0.06],[12,0.02],[25,0],[38,0.02],[50,0.06],[62,0.02],[75,0],[88,0.02],[95,0.05]],
    muscles: [
      { name: "Gluteus Maximus", keyframes: [[0,0.55],[5,0.65],[10,0.45],[18,0.15],[25,0.02],[70,0],[80,0.2],[88,0.45],[95,0.58]] },
      { name: "Quadriceps", keyframes: [[0,0.58],[3,0.6],[8,0.55],[15,0.35],[25,0.15],[35,0.03],[75,0],[85,0.1],[92,0.35],[97,0.5]] },
      { name: "Hamstrings", keyframes: [[0,0.5],[5,0.55],[12,0.3],[20,0.08],[30,0],[65,0],[75,0.15],[85,0.35],[95,0.55]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.05],[10,0.1],[20,0.25],[30,0.4],[40,0.65],[48,0.85],[54,0.9],[58,0.6],[62,0.1],[65,0],[95,0]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.5],[5,0.45],[12,0.25],[18,0.05],[45,0],[55,0.05],[60,0.35],[68,0.55],[78,0.5],[88,0.45],[95,0.42]] },
    ],
    param: {
      id: "speed", label: "Walking speed", unit: "", min: 0, max: 1, step: 0.01, default: 0.4,
      display: v => (0.8 + v * 1.0).toFixed(1) + " m/s",
      cycleDuration: v => 1300 - 500 * v,
      grfScale: v => 1.0 + 0.15 * v,
      angleScale: v => 1.0 + 0.25 * v,
      hipDropScale: v => 1.0 + 0.2 * v,
      muscleScale: v => 1.0 + 0.2 * v,
    },
    blurb: "Walking produces a signature double-hump vertical ground reaction force: one peak at weight acceptance (loading response), a dip in mid-stance as the body vaults over a relatively straight leg, and a second peak at push-off. The knee shows a subtle \"double bump\" of its own — a small flexion wave at loading response for shock absorption, then a much larger flexion in swing to clear the foot. Slide the speed control and watch both peaks grow, and swing get quicker, as walking speed increases."
  },

  run: {
    label: "Running",
    cycleLabel: "stride cycle — foot strike to next foot strike (single limb)",
    contralateralShift: 50,
    phases: [
      [0, 5, "Initial contact"],
      [5, 30, "Stance / propulsion"],
      [30, 55, "Early swing (recovery)"],
      [55, 75, "Peak knee flexion"],
      [75, 95, "Leg swings forward"],
      [95, 100, "Preparing to land"],
    ],
    grf: [[0,0.05],[4,0.7],[10,1.5],[16,2.1],[21,2.3],[26,1.8],[30,0.6],[33,0.05],[36,0],[97,0]],
    hip: [[0,42],[10,25],[20,5],[28,-12],[32,-15],[45,-5],[55,10],[65,30],[75,50],[85,58],[95,50]],
    knee: [[0,28],[8,40],[15,48],[22,35],[28,22],[35,30],[45,60],[55,95],[62,118],[70,110],[80,70],[90,30],[97,20]],
    ankle: [[0,3],[5,8],[12,15],[20,20],[26,12],[30,-15],[33,-32],[38,-20],[45,-2],[55,5],[70,6],[85,4],[97,3]],
    trunkLean: [[0,8],[50,9],[95,8]],
    hipDrop: [[0,0.08],[10,0.12],[20,0.08],[30,0.02],[45,-0.02],[60,-0.03],[75,-0.01],[90,0.03],[97,0.07]],
    muscles: [
      { name: "Gluteus Maximus", keyframes: [[0,0.75],[8,0.6],[15,0.3],[22,0.1],[30,0.02],[75,0],[85,0.35],[92,0.65],[97,0.8]] },
      { name: "Quadriceps", keyframes: [[0,0.7],[6,0.65],[12,0.55],[20,0.3],[28,0.1],[35,0.02],[80,0],[88,0.25],[95,0.55]] },
      { name: "Hamstrings", keyframes: [[0,0.55],[6,0.4],[15,0.15],[25,0.03],[55,0],[65,0.2],[75,0.5],[85,0.75],[95,0.7]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.15],[8,0.35],[16,0.6],[22,0.8],[27,0.95],[31,0.7],[34,0.1],[40,0],[97,0]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.45],[6,0.3],[14,0.1],[30,0],[45,0.05],[55,0.25],[65,0.45],[80,0.5],[92,0.48],[97,0.46]] },
    ],
    param: {
      id: "speed", label: "Running speed", unit: "", min: 0, max: 1, step: 0.01, default: 0.4,
      display: v => (2.5 + v * 6.5).toFixed(1) + " m/s",
      cycleDuration: v => 750 - 300 * v,
      grfScale: v => 0.85 + 0.55 * v,
      angleScale: v => 0.85 + 0.4 * v,
      hipDropScale: v => 1.0 + 0.4 * v,
      muscleScale: v => 0.85 + 0.5 * v,
    },
    blurb: "Running trades walking's double-hump force for a single, much larger peak — typically 2-3x body weight, versus ~1.15x for walking — because there's no double-support phase to share the load. Notice the knee folds up far more (past 100° of flexion) than in walking: a shorter, lighter swinging leg is a more efficient pendulum at speed. Push the speed slider toward sprinting and watch peak force, joint ranges, and muscle bursts all climb together."
  },

  jump: {
    label: "Jumping (countermovement)",
    cycleLabel: "countermovement jump — quiet stance to landing",
    contralateralShift: 0,
    phases: [
      [0, 15, "Quiet stance"],
      [15, 45, "Countermovement (braking)"],
      [45, 70, "Propulsion (drive up)"],
      [70, 88, "Flight"],
      [88, 100, "Landing & absorption"],
    ],
    grf: [[0,1.0],[8,0.85],[15,0.5],[22,0.3],[30,0.5],[38,0.9],[45,1.5],[52,1.75],[60,2.05],[66,1.5],[70,0.5],[72,0.05],[80,0],[87,0],[90,0.3],[92,3.2],[94,2.1],[96,1.3],[98,1.05]],
    hip: [[0,5],[15,15],[25,35],[35,55],[45,75],[55,50],[62,20],[68,0],[70,-5],[75,-3],[85,5],[90,20],[93,45],[96,35],[98,15]],
    knee: [[0,5],[15,20],[25,45],[35,70],[45,100],[55,70],[62,30],[68,8],[70,5],[80,10],[85,15],[90,25],[93,75],[96,85],[98,40]],
    ankle: [[0,0],[15,8],[25,15],[35,22],[45,28],[55,10],[62,-15],[68,-38],[70,-42],[78,-25],[85,-8],[90,5],[93,20],[96,24],[98,8]],
    trunkLean: [[0,5],[20,12],[35,20],[45,25],[55,18],[65,8],[70,5],[85,6],[90,10],[93,18],[96,15],[98,8]],
    hipDrop: [[0,0],[15,0.05],[25,0.15],[35,0.28],[45,0.36],[55,0.25],[62,0.1],[68,0.02],[70,0],[75,-0.1],[80,-0.16],[85,-0.1],[90,0.02],[93,0.22],[96,0.3],[98,0.12]],
    muscles: [
      { name: "Gluteus Maximus", keyframes: [[0,0.05],[15,0.15],[25,0.35],[35,0.6],[45,0.75],[55,0.9],[62,0.95],[68,0.6],[72,0.1],[80,0],[87,0.05],[90,0.3],[93,0.8],[96,0.7],[98,0.3]] },
      { name: "Quadriceps", keyframes: [[0,0.1],[15,0.25],[25,0.5],[35,0.75],[45,0.85],[55,0.95],[62,1.0],[68,0.65],[72,0.15],[80,0.02],[87,0.1],[90,0.4],[93,0.9],[96,0.85],[98,0.35]] },
      { name: "Hamstrings", keyframes: [[0,0.08],[15,0.2],[25,0.35],[35,0.5],[45,0.55],[55,0.6],[62,0.5],[68,0.3],[75,0.05],[87,0.05],[90,0.25],[93,0.55],[96,0.45],[98,0.2]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.1],[20,0.15],[35,0.25],[45,0.35],[55,0.55],[62,0.85],[68,0.95],[72,0.3],[80,0],[87,0.05],[90,0.2],[93,0.5],[96,0.55],[98,0.25]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.1],[25,0.15],[45,0.25],[62,0.1],[75,0.15],[85,0.3],[90,0.35],[93,0.25],[98,0.15]] },
    ],
    param: {
      id: "effort", label: "Jump effort", unit: "", min: 0, max: 1, step: 0.01, default: 0.6,
      display: v => (v < 0.34 ? "Small hop" : v < 0.67 ? "Moderate jump" : "Maximal effort"),
      cycleDuration: v => 1400 + 300 * v,
      grfScale: v => 0.7 + 0.6 * v,
      angleScale: v => 0.6 + 0.7 * v,
      hipDropScale: v => 0.5 + 0.9 * v,
      muscleScale: v => 0.6 + 0.6 * v,
    },
    blurb: "The countermovement (dipping down before jumping) lets the leg extensors pre-stretch and build force before the concentric drive — braking force can actually exceed the propulsive peak. Watch the hip, knee, and ankle extend almost simultaneously (\"triple extension\") right at takeoff, then the landing spike at the end, often the single highest force of the whole cycle. Increase jump effort and see the dip get deeper and every peak get bigger."
  },

  land: {
    label: "Landing",
    cycleLabel: "drop landing — descent to stabilization (loops for demonstration)",
    contralateralShift: 0,
    phases: [
      [0, 25, "Falling / descent"],
      [25, 45, "Impact absorption"],
      [45, 75, "Stabilization"],
      [75, 100, "Return to standing"],
    ],
    grf: [[0,0],[22,0],[25,0.3],[28,4.5],[32,2.8],[37,1.6],[42,1.15],[48,1.0],[60,1.02],[72,1.0],[85,1.0],[90,0.7],[95,0.2]],
    hip: [[0,10],[15,12],[25,15],[32,35],[38,55],[45,68],[55,55],[65,50],[75,48],[85,30],[93,15],[97,10]],
    knee: [[0,15],[15,18],[25,20],[30,35],[35,60],[40,80],[45,92],[55,72],[65,65],[75,62],[85,40],[93,20],[97,15]],
    ankle: [[0,5],[15,6],[25,8],[30,15],[35,22],[42,28],[50,20],[60,17],[75,15],[85,10],[93,6],[97,5]],
    trunkLean: [[0,8],[20,9],[30,15],[38,24],[45,29],[55,22],[65,20],[75,18],[85,12],[95,8]],
    hipDrop: [[0,0.05],[15,0.06],[25,0.08],[32,0.2],[38,0.32],[45,0.42],[55,0.3],[65,0.27],[75,0.25],[85,0.15],[93,0.07],[97,0.05]],
    muscles: [
      { name: "Quadriceps", keyframes: [[0,0.15],[15,0.25],[22,0.4],[28,0.75],[35,0.95],[42,1.0],[50,0.8],[60,0.55],[75,0.4],[85,0.2],[97,0.15]] },
      { name: "Gluteus Maximus", keyframes: [[0,0.1],[15,0.2],[22,0.3],[30,0.55],[38,0.75],[45,0.8],[55,0.6],[65,0.45],[80,0.3],[92,0.15],[97,0.1]] },
      { name: "Hamstrings", keyframes: [[0,0.12],[15,0.2],[25,0.3],[32,0.5],[40,0.65],[48,0.55],[58,0.4],[70,0.3],[85,0.18],[97,0.12]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.15],[15,0.3],[22,0.5],[28,0.7],[35,0.85],[42,0.75],[52,0.5],[65,0.35],[80,0.2],[97,0.15]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.35],[15,0.4],[22,0.3],[28,0.1],[40,0.05],[55,0.15],[70,0.2],[85,0.15],[97,0.3]] },
    ],
    param: {
      id: "stiffness", label: "Landing technique — soft ↔ stiff", unit: "", min: 0, max: 1, step: 0.01, default: 0.5,
      display: v => (v < 0.34 ? "Soft, absorbing" : v < 0.67 ? "Moderate" : "Stiff, straight-legged"),
      cycleDuration: v => 1300 - 300 * v,
      grfScale: v => 0.55 + 0.9 * v,
      angleScale: v => 1.3 - 0.8 * v,
      hipDropScale: v => 1.3 - 0.8 * v,
      muscleScale: v => 1.1 - 0.2 * v,
    },
    blurb: "Landing generates the sharpest force spike of any movement here — a soft, knee-bent landing can keep the impact peak to around 2-3x body weight, spread over more time. Push the technique slider toward \"stiff\" and see why straight-legged landings are a well-known risk factor in ACL-injury research: the same drop now delivers a much higher, faster spike through much less joint flexion to absorb it."
  },

  squat: {
    label: "Squatting",
    cycleLabel: "bodyweight squat — standing to bottom and back",
    contralateralShift: 0,
    phases: [
      [0, 50, "Descent (eccentric)"],
      [50, 52, "Bottom position"],
      [52, 100, "Ascent (concentric)"],
    ],
    grf: [[0,1.0],[15,0.97],[30,0.95],[42,1.05],[50,1.1],[58,1.15],[70,1.22],[85,1.05],[95,1.0]],
    hip: [[0,5],[10,20],[20,40],[30,62],[40,82],[50,100],[60,82],[70,62],[80,40],[90,20],[97,7]],
    knee: [[0,5],[10,25],[20,50],[30,75],[40,100],[50,122],[60,100],[70,75],[80,50],[90,25],[97,7]],
    ankle: [[0,0],[10,5],[20,12],[30,20],[40,27],[50,32],[60,27],[70,20],[80,12],[90,5],[97,1]],
    trunkLean: [[0,5],[15,10],[30,18],[40,25],[50,32],[60,25],[70,18],[85,10],[97,6]],
    hipDrop: [[0,0],[10,0.05],[20,0.15],[30,0.28],[40,0.38],[50,0.45],[60,0.38],[70,0.28],[80,0.15],[90,0.05],[97,0.01]],
    muscles: [
      { name: "Quadriceps", keyframes: [[0,0.08],[15,0.2],[30,0.4],[40,0.6],[50,0.8],[58,0.95],[65,0.85],[75,0.55],[85,0.3],[95,0.1]] },
      { name: "Gluteus Maximus", keyframes: [[0,0.06],[15,0.15],[30,0.32],[40,0.5],[50,0.65],[60,0.85],[68,0.9],[78,0.6],[88,0.3],[95,0.1]] },
      { name: "Hamstrings", keyframes: [[0,0.1],[20,0.15],[35,0.25],[50,0.35],[65,0.4],[80,0.25],[95,0.12]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.1],[20,0.18],[35,0.3],[50,0.4],[65,0.35],[80,0.22],[95,0.11]] },
      { name: "Erector Spinae", keyframes: [[0,0.1],[20,0.2],[35,0.35],[50,0.55],[65,0.4],[80,0.22],[95,0.11]] },
    ],
    param: {
      id: "depth", label: "Squat depth", unit: "", min: 0, max: 1, step: 0.01, default: 0.6,
      display: v => (v < 0.34 ? "Quarter" : v < 0.67 ? "Parallel" : "Deep"),
      cycleDuration: v => 1600 + 800 * v,
      grfScale: v => 0.9 + 0.25 * v,
      angleScale: v => 0.45 + 0.65 * v,
      hipDropScale: v => 0.3 + 0.8 * v,
      muscleScale: v => 0.65 + 0.45 * v,
    },
    blurb: "The squat is the most \"quasi-static\" movement here — ground reaction force barely leaves the neighborhood of body weight, because the whole body's center of mass moves slowly and under control. What changes dramatically with depth is joint range and muscle demand: quadriceps and gluteal activation both climb steadily as the knee and hip flex further, peaking near the transition from descent to drive out of the bottom."
  },
};

const MOVEMENT_ORDER = ["walk", "run", "jump", "land", "squat"];
