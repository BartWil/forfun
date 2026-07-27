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
    // vGRF + sagittal hip/knee/ankle: 42-subject grand average, overground comfortable-speed
    // walking, from Fukuchi, Fukuchi & Duarte 2018 (PeerJ 6:e4640; figshare 5722711). Right-limb
    // sagittal (Z) angles in degrees (hip/knee + = flexion, ankle + = dorsiflexion); vGRF is the
    // vertical component normalised to body weight (RGRFY / g). Time-normalised to the gait cycle,
    // reduced to keyframes (Ramer–Douglas–Peucker). See sources{} below.
    grf: [[0,0.05],[14,1.05],[30,0.76],[48,1.1],[63,0.01],[99,0.0]],
    hip: [[0,31.1],[11,28.5],[36,2.3],[54,-8.6],[61,-4.2],[81,28.8],[88,32.3]],
    knee: [[0,1.3],[12,16.3],[37,4.3],[44,4.1],[49,6.9],[57,19.8],[68,56.5],[74,63.0],[82,50.3],[95,3.8],[97,0.4]],
    ankle: [[0,1.5],[7,-4.3],[21,6.3],[42,13.1],[48,13.4],[54,9.2],[65,-11.6],[82,6.4],[86,6.7],[95,1.7]],
    // Real per-speed grand averages (Fukuchi 2018, mean overground speeds) the slider blends.
    speeds: [
      { v: 0.86,
        grf: [[0,0.05],[17,0.97],[31,0.89],[48,1.03],[54,0.86],[64,0.03],[99,0]],
        hip: [[0,29.0],[10,25.3],[38,2.3],[56,-6.3],[81,27.2],[88,30.4]],
        knee: [[0,1.2],[11,9.8],[39,4.4],[51,7.9],[58,18.2],[69,53.5],[74,58.8],[81,49.0],[95,3.8]],
        ankle: [[0,0.6],[6,-5.4],[22,4.8],[48,14.3],[56,10.3],[66,-8.0],[82,6.7]] },
      { v: 1.27,
        grf: [[0,0.05],[14,1.05],[30,0.76],[48,1.1],[63,0.01],[99,0]],
        hip: [[0,31.1],[11,28.5],[36,2.3],[54,-8.6],[61,-4.2],[81,28.8],[88,32.3]],
        knee: [[0,1.3],[12,16.3],[37,4.3],[44,4.1],[49,6.9],[57,19.8],[68,56.5],[74,63.0],[82,50.3],[95,3.8],[97,0.4]],
        ankle: [[0,1.5],[7,-4.3],[21,6.3],[42,13.1],[48,13.4],[54,9.2],[65,-11.6],[82,6.4],[86,6.7],[95,1.7]] },
      { v: 1.60,
        grf: [[0,0.06],[14,1.19],[30,0.62],[45,1.13],[49,1.14],[62,0.01],[99,0]],
        hip: [[0,34.0],[12,31.5],[37,0.5],[54,-10.8],[61,-5.2],[81,30.2],[88,34.2]],
        knee: [[0,2.3],[13,20.6],[36,3.9],[43,3.1],[48,5.9],[56,18.8],[67,56.8],[73,64.3],[82,50.7],[95,4.2],[97,1.1]],
        ankle: [[0,2.6],[7,-3.8],[20,7.3],[46,12.4],[53,6.9],[63,-13.6],[81,6.6],[86,7.1],[94,2.6]] },
    ],
    sources: {
      grf:     { ref: "Fukuchi et al. 2018", paper: "10.7717/peerj.4640", data: "10.6084/m9.figshare.5722711", n: 42, kind: "measured" },
      angles:  { ref: "Fukuchi et al. 2018", paper: "10.7717/peerj.4640", data: "10.6084/m9.figshare.5722711", n: 42, kind: "measured" },
      muscles: { ref: "Santuz et al. 2021", data: "10.5281/zenodo.5171823", n: 140, cycles: 13693, kind: "measured" },
    },
    trunkLean: [[0,4],[50,5],[95,4]],
    hipDrop: [[0,0.06],[12,0.02],[25,0],[38,0.02],[50,0.06],[62,0.02],[75,0],[88,0.02],[95,0.05]],
    // Muscle activation: REAL grand-average linear EMG envelopes from 13,693 walking gait
    // cycles (140 adults), computed from the raw signals in Santuz et al. 2021 (Zenodo
    // 5171823) with the authors' own pipeline: 4th-order Butterworth 50 Hz high-pass →
    // full-wave rectify → 20 Hz low-pass envelope → per-muscle amplitude normalisation →
    // each cycle time-normalised to 100 stance + 100 swing points, averaged over all cycles,
    // then mapped onto our 0-100% stride with the data's own mean stance fraction (64%).
    // Channels pooled: MA=glute max; RF+VM+VL=quadriceps; ST+BF=hamstrings;
    // GM+GL+SO=gastroc/soleus; TA=tibialis anterior. Each muscle peak = 1.0.
    muscles: [
      { name: "Gluteus Maximus", keyframes: [[0,0.84],[4,1.0],[11,0.56],[18,0.42],[45,0.27],[66,0.3],[84,0.26],[92,0.34]] },
      { name: "Quadriceps", keyframes: [[0,0.73],[9,0.99],[22,0.26],[46,0.15],[55,0.17],[61,0.26],[71,0.13],[78,0.11],[88,0.18]] },
      { name: "Hamstrings", keyframes: [[0,0.57],[4,0.4],[13,0.29],[22,0.28],[37,0.12],[61,0.08],[77,0.12],[81,0.18],[92,1.0]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.2],[27,0.57],[41,1.0],[58,0.1],[89,0.09]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.99],[11,0.21],[53,0.09],[64,0.43],[68,0.41],[75,0.47],[81,0.37],[88,0.34],[94,0.49]] },
    ],
    param: {
      // Slider spans the measured overground range (0.86–1.60 m/s); curves are the real
      // per-speed averages blended by speedMps, so no illustrative magnitude scaling.
      id: "speed", label: "Walking speed", unit: "", min: 0, max: 1, step: 0.01, default: 0.55,
      speedMps: v => 0.86 + v * 0.74,
      display: v => (0.86 + v * 0.74).toFixed(2) + " m/s",
      cycleDuration: v => 1350 - 450 * v,
      grfScale: () => 1, angleScale: () => 1, hipDropScale: () => 1, muscleScale: () => 1,
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
    // vGRF + sagittal hip/knee/ankle: 39-subject grand average, treadmill running at
    // 3.5 m/s, from Fukuchi, Fukuchi & Duarte 2017 (PeerJ 5:e3298; figshare 4543435).
    // Right-limb sagittal (Z) angles in degrees (hip/knee + = flexion, ankle + =
    // dorsiflexion); vGRF = RgrfY / g in body weights, zero through the flight phase.
    // Time-normalised over the stride, reduced to keyframes (RDP). See sources{} below.
    grf: [[0,0.07],[15,2.49],[35,0.09],[40,0],[97,0]],
    hip: [[0,38.3],[14,33.6],[31,0.1],[39,-6.3],[56,4.9],[78,51.2],[86,52.0]],
    knee: [[0,11.8],[15,43.9],[21,39.3],[33,15.5],[39,16.2],[60,93.6],[68,108.2],[78,88.8],[94,17.9]],
    ankle: [[0,4.2],[6,2.9],[16,20.9],[22,23.5],[41,-21.5],[55,-16.4],[74,-0.5],[91,4.9]],
    trunkLean: [[0,8],[50,9],[95,8]],
    hipDrop: [[0,0.08],[10,0.12],[20,0.08],[30,0.02],[45,-0.02],[60,-0.03],[75,-0.01],[90,0.03],[97,0.07]],
    // Running muscle activation = REAL grand-average linear EMG envelopes computed from the
    // raw signals in the Santuz et al. 2018 open data set (Front. Physiol.; doi:10.5281/
    // zenodo.1254380). Pipeline replicating the paper: 50 Hz high-pass -> full-wave rectify ->
    // 20 Hz low-pass envelope -> per-muscle amplitude normalisation -> each gait cycle time-
    // normalised to 100 stance + 100 swing points, then averaged over 11,388 cycles from 135
    // adults. Mapped onto our 0-100% stride with the data's own mean stance fraction (39%), then
    // reduced to keyframes (Ramer-Douglas-Peucker). Channels: MA=glute max; RF+VM+VL=quadriceps;
    // ST+BF=hamstrings; GM+GL+SO=gastroc/soleus; TA=tibialis anterior. Peaks reach 1.0 per muscle.
    muscles: [
      { name: "Gluteus Maximus", keyframes: [[0,0.75],[2,0.82],[11,0.92],[23,0.28],[29,0.21],[44,0.17],[60,0.27],[66,1.0],[74,0.29],[82,0.26],[92,0.33],[100,0.75]] },
      { name: "Quadriceps", keyframes: [[0,0.35],[10,1.0],[17,0.72],[23,0.2],[28,0.11],[46,0.1],[61,0.13],[83,0.08],[95,0.19],[100,0.35]] },
      { name: "Hamstrings", keyframes: [[0,0.34],[4,0.28],[11,0.44],[20,0.45],[24,0.54],[32,0.26],[41,0.13],[51,0.12],[65,0.18],[74,0.18],[79,0.34],[89,1.0],[100,0.34]] },
      { name: "Gastroc / Soleus", keyframes: [[0,0.23],[16,1.0],[23,0.91],[37,0.08],[82,0.07],[100,0.23]] },
      { name: "Tibialis Anterior", keyframes: [[0,0.89],[6,0.24],[16,0.33],[23,0.27],[35,0.07],[42,0.33],[50,0.33],[59,0.56],[66,0.48],[78,0.42],[81,0.43],[89,0.58],[97,1.0],[100,0.89]] },
    ],
    // Real per-speed grand averages (Fukuchi 2017) the slider interpolates between.
    speeds: [
      { v: 2.5,
        grf: [[0,0.06],[16,2.28],[38,0.1],[45,0],[97,0]],
        hip: [[0,33.0],[15,29.4],[34,1.5],[42,-2.8],[58,8.2],[79,42.8],[85,43.3]],
        knee: [[0,11.1],[16,42.7],[22,38.8],[35,16.6],[41,16.2],[62,82.7],[70,93.3],[79,76.7],[94,16.1]],
        ankle: [[0,2.7],[5,2.5],[16,20.0],[23,22.6],[39,-12.8],[46,-19.0],[57,-13.9],[75,1.1],[90,3.5]] },
      { v: 3.5,
        grf: [[0,0.07],[15,2.49],[35,0.09],[40,0],[97,0]],
        hip: [[0,38.3],[14,33.6],[31,0.1],[39,-6.3],[56,4.9],[78,51.2],[86,52.0]],
        knee: [[0,11.8],[15,43.9],[21,39.3],[33,15.5],[39,16.2],[60,93.6],[68,108.2],[78,88.8],[94,17.9]],
        ankle: [[0,4.2],[6,2.9],[16,20.9],[22,23.5],[41,-21.5],[55,-16.4],[74,-0.5],[91,4.9]] },
      { v: 4.5,
        grf: [[0,0.08],[8,2.01],[15,2.57],[33,0.1],[39,0],[97,0]],
        hip: [[0,42.6],[14,35.1],[30,-3.0],[37,-10.0],[55,2.3],[78,57.9],[87,59.3]],
        knee: [[0,13.7],[15,44.4],[32,13.6],[37,14.7],[60,103.9],[67,117.1],[75,104.6],[93,25.2]],
        ankle: [[0,2.1],[6,0.4],[16,20.3],[21,22.7],[38,-24.6],[53,-20.5],[74,-2.9],[90,3.6]] },
    ],
    sources: {
      grf:     { ref: "Fukuchi et al. 2017", paper: "10.7717/peerj.3298", data: "10.6084/m9.figshare.4543435", n: 39, kind: "measured" },
      angles:  { ref: "Fukuchi et al. 2017", paper: "10.7717/peerj.3298", data: "10.6084/m9.figshare.4543435", n: 39, kind: "measured" },
      muscles: { ref: "Santuz et al. 2018", data: "10.5281/zenodo.1254380", n: 135, cycles: 11388, kind: "measured" },
    },
    param: {
      // Slider spans the dataset's measured range (2.5–4.5 m/s); curves are the real
      // per-speed averages blended by speedMps, so no illustrative magnitude scaling.
      id: "speed", label: "Running speed", unit: "", min: 0, max: 1, step: 0.01, default: 0.5,
      speedMps: v => 2.5 + v * 2.0,
      display: v => (2.5 + v * 2.0).toFixed(1) + " m/s",
      cycleDuration: v => 820 - 220 * v,
      grfScale: () => 1, angleScale: () => 1, hipDropScale: () => 1, muscleScale: () => 1,
    },
    blurb: "Running trades walking's double-hump force for a single, much larger peak — typically 2-3x body weight, versus ~1.15x for walking — because there's no double-support phase to share the load. Notice the knee folds up far more (past 100° of flexion) than in walking: a shorter, lighter swinging leg is a more efficient pendulum at speed. Slide from 2.5 to 4.5 m/s and watch the impact peak grow and the knee fold up further — blended from real motion capture at three measured speeds."
  },

  jump: {
    label: "Countermovement jump",
    cycleLabel: "countermovement jump — stance · dip · drive · flight · landing",
    contralateralShift: 0,
    phases: [
      [0, 10, "Quiet stance"],
      [10, 25, "Unweighting"],
      [25, 45, "Braking (eccentric)"],
      [45, 68, "Propulsion (concentric)"],
      [68, 87, "Flight"],
      [87, 96, "Landing impact"],
      [96, 100, "Stabilization"],
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
    sources: {
      grf:     { ref: "Literature reconstruction", kind: "modelled" },
      angles:  { ref: "Literature reconstruction", kind: "modelled" },
      muscles: { ref: "Literature reconstruction", kind: "modelled" },
    },
    param: {
      id: "effort", label: "Jump effort", unit: "", min: 0, max: 1, step: 0.01, default: 0.6,
      display: v => (v < 0.34 ? "Small hop" : v < 0.67 ? "Moderate jump" : "Maximal effort"),
      cycleDuration: v => 1400 + 300 * v,
      grfScale: v => 0.7 + 0.6 * v,
      angleScale: v => 0.6 + 0.7 * v,
      hipDropScale: v => 0.5 + 0.9 * v,
      muscleScale: v => 0.6 + 0.6 * v,
    },
    blurb: "One complete countermovement jump — quiet stance, a dip to pre-stretch the leg extensors (the countermovement), the braking and concentric drive, take-off and flight, then the landing. The dip lets the extensors build force before the push-off, so braking force can rival the propulsive peak; the hip, knee and ankle extend almost together (\"triple extension\") right at take-off, and the landing spike at the end is often the single highest force of the whole movement. Increase jump effort and watch the dip deepen and every peak grow."
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
    sources: {
      grf:     { ref: "Literature reconstruction", kind: "modelled" },
      angles:  { ref: "Literature reconstruction", kind: "modelled" },
      muscles: { ref: "Literature reconstruction", kind: "modelled" },
    },
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

const MOVEMENT_ORDER = ["walk", "run", "jump", "squat"];
