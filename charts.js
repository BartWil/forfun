// Chart.js line charts (GRF, joint angles) with a synced scrub-line, plus hand-rolled
// muscle-activation sparklines. All read the shared Playback.fraction (0-1) each frame.

const Playback = { fraction: 0 };

const scrubLinePlugin = {
  id: "scrubLine",
  afterDatasetsDraw(chart) {
    if (chart.options.plugins?.scrubLine === false) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    const x = scales.x.getPixelForValue(Playback.fraction * 100);
    ctx.save();
    ctx.strokeStyle = "rgba(232,237,247,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  }
};
Chart.register(scrubLinePlugin);

function baseChartOptions(yTitle, yMin, yMax) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: "index" },
    scales: {
      x: {
        type: "linear", min: 0, max: 100,
        title: { display: true, text: "% of cycle", color: "#647092", font: { size: 10 } },
        ticks: { color: "#647092", font: { size: 10 }, maxTicksLimit: 6 },
        grid: { color: "#1a2233" },
      },
      y: {
        min: yMin, max: yMax,
        title: { display: true, text: yTitle, color: "#647092", font: { size: 10 } },
        ticks: { color: "#647092", font: { size: 10 } },
        grid: { color: "#1a2233" },
      },
    },
    plugins: {
      legend: { display: true, position: "top", labels: { color: "#93a1bd", boxWidth: 14, font: { size: 11 } } },
      tooltip: { enabled: false },
    },
  };
}

function makeSeriesLabels(n) {
  const labels = [];
  for (let i = 0; i <= n; i++) labels.push((i / n) * 100);
  return labels;
}

function createGrfChart(canvas) {
  const labels = makeSeriesLabels(100);
  return new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Vertical GRF (× body weight)",
        data: [],
        borderColor: "#5eead4",
        backgroundColor: "rgba(94,234,212,0.12)",
        borderWidth: 2.5,
        pointRadius: 0,
        fill: true,
        tension: 0.35,
      }],
    },
    options: baseChartOptions("× body weight", 0, null),
  });
}

function createAngleChart(canvas) {
  const labels = makeSeriesLabels(100);
  const mk = (label, color) => ({
    label, data: [], borderColor: color, backgroundColor: "transparent",
    borderWidth: 2.2, pointRadius: 0, tension: 0.35,
  });
  return new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        mk("Hip", "#7c9bff"),
        mk("Knee", "#ff6f5e"),
        mk("Ankle", "#5eead4"),
      ],
    },
    options: baseChartOptions("degrees", null, null),
  });
}

function updateGrfChart(chart, values) {
  chart.data.datasets[0].data = values.map((v, i) => ({ x: (i / (values.length - 1)) * 100, y: v }));
  chart.update("none");
}

function updateAngleChart(chart, hip, knee, ankle) {
  const n = hip.length - 1;
  chart.data.datasets[0].data = hip.map((v, i) => ({ x: (i / n) * 100, y: v }));
  chart.data.datasets[1].data = knee.map((v, i) => ({ x: (i / n) * 100, y: v }));
  chart.data.datasets[2].data = ankle.map((v, i) => ({ x: (i / n) * 100, y: v }));
  chart.update("none");
}

// ---- Muscle sparkline rows (hand-rolled canvas, no Chart.js) ----

function buildMuscleRows(container, muscleCurves) {
  container.innerHTML = "";
  const rows = [];
  muscleCurves.forEach(({ name, values }) => {
    const row = document.createElement("div");
    row.className = "muscle-row";
    const label = document.createElement("div");
    label.className = "m-label";
    label.textContent = name;
    const canvas = document.createElement("canvas");
    canvas.height = 28;
    row.appendChild(label);
    row.appendChild(canvas);
    container.appendChild(row);
    rows.push({ canvas, values });
  });
  return rows;
}

function drawMuscleSparkline(canvas, values, fraction) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 200;
  const cssH = canvas.clientHeight || 28;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const n = values.length - 1;
  const pad = 2;
  const usableH = cssH - pad * 2;

  ctx.beginPath();
  ctx.moveTo(0, cssH - pad);
  values.forEach((v, i) => {
    const x = (i / n) * cssW;
    const y = cssH - pad - Math.min(1, v) * usableH;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(cssW, cssH - pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,111,94,0.28)";
  ctx.fill();

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / n) * cssW;
    const y = cssH - pad - Math.min(1, v) * usableH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#ff6f5e";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const sx = fraction * cssW;
  ctx.strokeStyle = "rgba(232,237,247,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, cssH);
  ctx.stroke();
}
