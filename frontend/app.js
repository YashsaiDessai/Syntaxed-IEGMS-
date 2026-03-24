/**
 * app.js  –  Smart Grid Optimizer Dashboard Logic
 *
 * - Polls /data, /prediction, /optimize every 2 seconds
 * - Updates KPI cards, live Chart.js graph, optimization panel, and feed table
 */

const API = "http://localhost:8000";
const POLL_INTERVAL = 2000;
const MAX_CHART_POINTS = 40;

// ── Chart.js setup ───────────────────────────────────────────────────────────
const ctx = document.getElementById("loadChart").getContext("2d");

const chartData = {
  labels: [],
  datasets: [
    {
      label: "Actual Load (MW)",
      data: [],
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.08)",
      borderWidth: 2,
      pointRadius: 2.5,
      tension: 0.4,
      fill: true,
    },
    {
      label: "Predicted Load (MW)",
      data: [],
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.06)",
      borderWidth: 2,
      pointRadius: 0,
      borderDash: [6, 4],
      tension: 0.4,
      fill: false,
    },
    {
      label: "Threshold (120 MW)",
      data: [],
      borderColor: "rgba(239,68,68,0.55)",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      pointRadius: 0,
      borderDash: [4, 4],
      fill: false,
    },
  ],
};

const chart = new Chart(ctx, {
  type: "line",
  data: chartData,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8",
          boxWidth: 14,
          font: { family: "Inter", size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(8,13,26,0.9)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#475569", maxTicksLimit: 8, font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#475569", font: { size: 10 } },
        min: 0,
      },
    },
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadColor(load) {
  if (load > 150) return "load-critical";
  if (load > 120) return "load-warning";
  return "load-normal";
}

function pushPoint(label, actual, predicted, threshold = 120) {
  if (chartData.labels.length >= MAX_CHART_POINTS) {
    chartData.labels.shift();
    chartData.datasets.forEach((ds) => ds.data.shift());
  }
  chartData.labels.push(label);
  chartData.datasets[0].data.push(actual);
  chartData.datasets[1].data.push(predicted);
  chartData.datasets[2].data.push(threshold);
  chart.update("none");
}

function shortTime(isoStr) {
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoStr;
  }
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const elCurrentLoad   = document.getElementById("current-load");
const elPredLoad      = document.getElementById("pred-load");
const elSampleCount   = document.getElementById("sample-count");
const elOptStatus     = document.getElementById("opt-status");
const elOptAction     = document.getElementById("opt-action");
const elSavings       = document.getElementById("savings-value");
const elBarFill       = document.getElementById("threshold-bar-fill");
const elBarPct        = document.getElementById("bar-pct");
const elAlertBanner   = document.getElementById("alert-banner");
const elAlertMsg      = document.getElementById("alert-msg");
const elFeedTbody     = document.getElementById("feed-tbody");
const elLastUpdated   = document.getElementById("last-updated");
const elConnectionDot = document.getElementById("connection-dot");
const elConnectionTxt = document.getElementById("connection-txt");

// ── Fetch & update ───────────────────────────────────────────────────────────
let lastReadingNo = -1;

async function fetchAll() {
  try {
    const [dataRes, predRes, optRes] = await Promise.all([
      fetch(`${API}/data`),
      fetch(`${API}/prediction`),
      fetch(`${API}/optimize`),
    ]);

    if (!dataRes.ok || !predRes.ok || !optRes.ok) throw new Error("API error");

    const dataJson = await dataRes.json();
    const predJson = await predRes.json();
    const optJson  = await optRes.json();

    // — Connection indicator —
    elConnectionDot.style.background = "#22c55e";
    elConnectionTxt.textContent = "Live";

    const readings   = dataJson.readings || [];
    const predicted  = predJson.predicted_load ?? 0;
    const samples    = predJson.based_on_samples ?? 0;
    const currentLoad = readings.length ? readings[readings.length - 1].load : 0;

    // — KPI cards —
    elCurrentLoad.textContent = currentLoad.toFixed(1);
    elCurrentLoad.className   = "kpi-value " + loadColor(currentLoad);

    elPredLoad.textContent  = predicted.toFixed(1);
    elPredLoad.className    = "kpi-value " + loadColor(predicted);
    elSampleCount.textContent = samples;

    // — Chart: push new points —
    const latest = readings[readings.length - 1];
    if (latest && latest.reading_no !== lastReadingNo) {
      lastReadingNo = latest.reading_no ?? lastReadingNo + 1;
      pushPoint(shortTime(latest.timestamp), currentLoad, predicted, optJson.threshold ?? 120);
    }

    // — Optimization panel —
    elOptStatus.textContent = optJson.status ?? "—";
    elOptAction.textContent = optJson.action ?? "—";
    elSavings.textContent   = `$${(optJson.savings_usd ?? 0).toFixed(2)}`;

    // Threshold bar
    const pct = Math.min(100, (currentLoad / (optJson.threshold * 1.5 || 180)) * 100);
    elBarFill.style.width = `${pct}%`;
    elBarPct.textContent  = `${currentLoad.toFixed(0)} / ${optJson.threshold ?? 120} MW`;
    if (optJson.alert) {
      elBarFill.classList.add("warn");
    } else {
      elBarFill.classList.remove("warn");
    }

    // — Alert banner —
    if (optJson.alert) {
      elAlertBanner.classList.add("show");
      elAlertMsg.textContent = `⚡ ${optJson.status}: ${optJson.action}`;
    } else {
      elAlertBanner.classList.remove("show");
    }

    // — Feed table (newest first) —
    const rows = [...readings].reverse().slice(0, 10);
    elFeedTbody.innerHTML = rows
      .map((r) => {
        const cls = loadColor(r.load);
        return `<tr>
          <td>${shortTime(r.timestamp)}</td>
          <td class="${cls}">${r.load.toFixed(2)}</td>
          <td>${r.source ?? "—"}</td>
        </tr>`;
      })
      .join("");

    elLastUpdated.textContent = new Date().toLocaleTimeString();
  } catch (err) {
    console.warn("[Dashboard] Fetch error:", err.message);
    elConnectionDot.style.background = "#ef4444";
    elConnectionTxt.textContent = "Disconnected – is the backend running?";
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
fetchAll();
setInterval(fetchAll, POLL_INTERVAL);
