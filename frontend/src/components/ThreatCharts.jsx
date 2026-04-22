import React, { useMemo } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = {
  WEAK: { bg: "rgba(239,68,68,0.75)", border: "rgba(239,68,68,1)" },
  MEDIUM: { bg: "rgba(234,179,8,0.75)", border: "rgba(234,179,8,1)" },
  STRONG: { bg: "rgba(34,197,94,0.75)", border: "rgba(34,197,94,1)" },
  SAFE: { bg: "rgba(34,197,94,0.75)", border: "rgba(34,197,94,1)" },
  "NOT SAFE": { bg: "rgba(239,68,68,0.75)", border: "rgba(239,68,68,1)" },
};

function normLabel(v) {
  const s = String(v ?? "").trim();
  // keep NOT SAFE with space
  if (s.toUpperCase() === "NOT SAFE") return "NOT SAFE";
  return s.toUpperCase();
}

function isPasswordAttack(activeAttack) {
  const a = String(activeAttack || "").toLowerCase().trim();
  return a === "password strength" || a === "password" || a === "password strength checker" || a.includes("password");
}

function clampPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  // backward compatibility: if old history has 0..1
  if (x >= 0 && x <= 1) return Math.round(x * 100);
  return Math.max(0, Math.min(100, Math.round(x)));
}

/**
 * Password distribution (stable, matches your examples):
 * - STRONG 100 -> only STRONG
 * - STRONG 75 -> STRONG 75, MEDIUM 25, WEAK 0
 * - STRONG 60 -> STRONG 60, MEDIUM 25, WEAK 15
 */
function passwordDistribution(finalLabel, confidencePct) {
  const c = clampPct(confidencePct);

  let weak = 0, medium = 0, strong = 0;

  if (finalLabel === "STRONG") {
    strong = c;
    const rem = 100 - c;

    if (rem <= 0) {
      medium = 0; weak = 0;
    } else if (c >= 80) {
      // high strong => remaining goes to medium only
      medium = rem; weak = 0;
    } else if (c >= 70) {
      // small weak portion
      weak = Math.round(rem * 0.2);
      medium = rem - weak;
    } else {
      // match example strong 60 => medium 25, weak 15 (rem 40)
      weak = Math.round(rem * 0.375);
      medium = rem - weak;
    }
  } else if (finalLabel === "MEDIUM") {
    medium = c;
    weak = 100 - c;
    strong = 0; // hide strong
  } else {
    // WEAK
    weak = c;
    const rem = 100 - c;
    // split remaining between medium/strong (so charts look meaningful)
    strong = Math.round(rem * 0.25);
    medium = rem - strong;
  }

  return { weak, medium, strong };
}

export default function ThreatCharts({ items, activeAttack, latestFinal, latestConfidence }) {
  const { labels, values } = useMemo(() => {
    if (!latestFinal) return { labels: [], values: [] };

    // find confidence (prefer prop; else take latest from items)
    let conf = clampPct(latestConfidence);
    if (!conf && Array.isArray(items) && items.length) {
      // try best-effort: most recent item with confidence
      const latest = items[0];
      conf = clampPct(latest?.confidence);
    }

    const final = normLabel(latestFinal);
    const pwMode = isPasswordAttack(activeAttack);

    if (pwMode) {
      const d = passwordDistribution(final, conf);
      const raw = [
        { l: "WEAK", v: d.weak },
        { l: "MEDIUM", v: d.medium },
        { l: "STRONG", v: d.strong },
      ].filter(x => x.v > 0); // ✅ hide 0

      return {
        labels: raw.map(x => x.l),
        values: raw.map(x => x.v),
      };
    }

    // Generic SAFE/NOT SAFE
    const safeVal = final === "SAFE" ? conf : (100 - conf);
    const notSafeVal = 100 - safeVal;

    const raw = [
      { l: "NOT SAFE", v: notSafeVal },
      { l: "SAFE", v: safeVal },
    ].filter(x => x.v > 0); // ✅ hide 0

    return {
      labels: raw.map(x => x.l),
      values: raw.map(x => x.v),
    };
  }, [activeAttack, latestFinal, latestConfidence, items]);

  if (!labels.length) return null;

  const colors = labels.map((l) => (COLORS[l] ? COLORS[l].bg : "rgba(14,165,233,0.75)"));
  const borders = labels.map((l) => (COLORS[l] ? COLORS[l].border : "rgba(14,165,233,1)"));

  const barData = {
    labels,
    datasets: [
      {
        label: "Percentage",
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels,
    datasets: [
      {
        label: "Share",
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { labels: { color: "#cbd5e1" } } },
    scales: {
      x: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(148,163,184,0.12)" } },
      y: {
        beginAtZero: true,
        max: 100, // ✅ percent scale
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148,163,184,0.12)" },
      },
    },
  };

  return (
    <div className="grid2">
      <div className="card">
        <div className="card__title">Threat Analytics (Bar)</div>
        <Bar data={barData} options={options} />
      </div>
      <div className="card">
        <div className="card__title">Threat Distribution (Pie)</div>
        <Pie
          data={pieData}
          options={{ responsive: true, plugins: { legend: { labels: { color: "#cbd5e1" } } } }}
        />
      </div>
    </div>
  );
}