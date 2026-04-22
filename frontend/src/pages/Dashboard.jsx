import React, { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";
import ThreatCharts from "../components/ThreatCharts";
import { useApp } from "../context/AppContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10.6 10.6a2.5 2.5 0 003.54 3.54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 6.7C4.1 8.3 2.4 10.6 2 12c.8 2.7 4.7 7 10 7 1.7 0 3.2-.4 4.5-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.2 4.4A10.3 10.3 0 0112 4c5.3 0 9.2 4.3 10 8-.3 1-1.2 2.5-2.6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M2 12c.8-2.7 4.7-7 10-7s9.2 4.3 10 7c-.8 2.7-4.7 7-10 7S2.8 14.7 2 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const norm = (v) => String(v ?? "").trim();
const upper = (v) => norm(v).toUpperCase();

const getFinal = (x) =>
  upper(x?.finalResult ?? x?.final ?? x?.final_result ?? x?.result ?? x?.status ?? "");
const getRule = (x) => norm(x?.ruleResult ?? x?.rule ?? x?.rule_result ?? "-");
const getML = (x) => norm(x?.mlResult ?? x?.ml ?? x?.ml_result ?? "-");
const getConf = (x) => Number(x?.confidence ?? x?.conf ?? 0);

const normConfPct = (v) => {
  let c = Number(v ?? 0);
  if (!Number.isFinite(c)) return 0;
  if (c >= 0 && c <= 1) c = c * 100;
  c = Math.max(0, Math.min(100, c));
  return Math.round(c);
};

const isPasswordFinal = (finalLabel) => {
  const f = upper(finalLabel);
  return f === "WEAK" || f === "MEDIUM" || f === "STRONG";
};

const getDisplayFinal = (finalLabel) => {
  const f = upper(finalLabel);
  if (!f) return "";
  if (isPasswordFinal(f)) return f;
  return f === "SAFE" ? "SAFE" : "NOT SAFE";
};

const isSafeOutcome = (displayFinal) => {
  const f = upper(displayFinal);
  if (isPasswordFinal(f)) return f === "MEDIUM" || f === "STRONG";
  return f === "SAFE";
};

export default function Dashboard() {
  const { activeAttack } = useApp();

  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [inputType, setInputType] = useState("text");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanPhase, setScanPhase] = useState(false);
  const [toast, setToast] = useState(null);

  const attackKey = String(activeAttack || "").toLowerCase().trim();
  const passwordMode = attackKey === "password strength" || attackKey === "password";

  useEffect(() => {
    if (attackKey === "malware") setInputType("file");
    else if (attackKey === "phishing") setInputType("url");
    else setInputType("text");

    setInput("");
    setFile(null);
    setShowPw(false);
    setErr("");
  }, [attackKey]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadHistory() {
    const { data } = await api.get("/history/me");
    setHistory(data.items || []);
  }

  async function resetCounts() {
    try {
      await api.delete("/detect/reset-history");
      setResult(null);
      await loadHistory();
    } catch (e) {
      setErr(e?.response?.data?.message || "Reset failed");
    }
  }

  async function detect(e) {
    e.preventDefault();
    setErr("");
    setToast(null);
    setLoading(true);
    setScanPhase(true);

    try {
      const atk = activeAttack || "";
      let detectedResult = null;

      if (inputType === "file") {
        if (!file) throw new Error("File is required");

        const fd = new FormData();
        fd.append("inputType", "file");
        fd.append("attackType", atk);
        fd.append("file", file);

        const { data } = await api.post("/detect", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        detectedResult = data.result;
      } else if (attackKey === "phishing") {
        const payload = { inputType: "url", input, attackType: atk };
        const { data } = await api.post("/detect", payload);
        detectedResult = data.result;
      } else {
        const payload = { inputType: "text", input, attackType: atk };
        const { data } = await api.post("/detect", payload);
        detectedResult = data.result;
      }

      setResult(detectedResult);
      await loadHistory();

      const final = getDisplayFinal(getFinal(detectedResult));
      if (!passwordMode && final === "NOT SAFE") {
        setToast("Suspicious activity detected!");
      }
    } catch (e) {
      setErr(e?.message || e?.response?.data?.message || "Detection failed");
    } finally {
      window.setTimeout(() => {
        setLoading(false);
        setScanPhase(false);
      }, 1200);
    }
  }

  const cards = useMemo(() => {
    const total = history.length;
    const safe = history.filter((x) => isSafeOutcome(getDisplayFinal(getFinal(x)))).length;
    const threats = total - safe;
    return { total, threats, safe };
  }, [history]);

  const latestFinalRaw = getFinal(result);
  const latestFinal = getDisplayFinal(latestFinalRaw);
  const latestRule = getRule(result);
  const latestML = getML(result);
  const latestConfPct = normConfPct(getConf(result));

  const latestResultGlowClass = !result || passwordMode
    ? ""
    : isSafeOutcome(latestFinal)
      ? "resultPanel--safe"
      : "resultPanel--danger";

  const chartData = useMemo(
    () => ({
      labels: ["Total", "Threats", "Safe"],
      datasets: [
        {
          label: "Detection Stats",
          data: [cards.total, cards.threats, cards.safe],
          backgroundColor: ["rgba(59,130,246,0.65)", "rgba(239,68,68,0.65)", "rgba(34,197,94,0.65)"],
          borderColor: ["rgba(59,130,246,1)", "rgba(239,68,68,1)", "rgba(34,197,94,1)"],
          borderWidth: 1,
        },
      ],
    }),
    [cards.total, cards.threats, cards.safe]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      animation: { duration: 1400 },
      plugins: { legend: { display: true, labels: { color: "#cbd5e1" } } },
      scales: {
        x: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(148,163,184,0.12)" } },
        y: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(148,163,184,0.12)" } },
      },
    }),
    []
  );

  return (
    <main className="dash">
      <Sidebar />

      <section className="dash__content">
        {toast && (
          <div className="toast toast--danger" role="status" aria-live="polite">
            <span className="toast__icon">Alert</span>
            <span>{toast}</span>
          </div>
        )}

        <div className="pageTitle">
          <h2>Dashboard</h2>

          <div className="selectedAttackBar">
            <span>Currently Detecting:</span>
            <span className="selectedAttackName">{activeAttack || "-"}</span>
          </div>

          <p style={{ marginTop: 10 }}>
            Select an attack from the left menu. The input box will change based on the selected attack type.
          </p>
        </div>

        <div style={{ textAlign: "right", marginBottom: 10 }}>
          <button className="btn btn--danger" onClick={resetCounts}>
            Reset Counts
          </button>
        </div>

        <div className="grid3">
          <div className="card">
            <div className="card__title">Total Checks</div>
            <div className="big">{cards.total}</div>
            <div className="muted">Your stored history</div>
          </div>
          <div className="card">
            <div className="card__title">Threats</div>
            <div className="big">{cards.threats}</div>
            <div className="muted">Non-safe detections</div>
          </div>
          <div className="card">
            <div className="card__title">Safe</div>
            <div className="big">{cards.safe}</div>
            <div className="muted">Safe outcomes</div>
          </div>
        </div>

        <div className="grid2">
          <div className="card">
            <div className="card__title">Run Detection</div>

            <form className="form" onSubmit={detect}>
              <label>Input (Auto by Attack Type)</label>

              {inputType === "file" ? (
                <>
                  <label>Upload File (Malware)</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  <div className="muted" style={{ marginTop: 8 }}>
                    Examples: .exe, .apk, .pdf, .docx, .zip
                  </div>
                </>
              ) : attackKey === "phishing" ? (
                <>
                  <label>Enter URL (Phishing)</label>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="https://example.com/login"
                    className="input"
                    required
                  />
                  <div className="muted" style={{ marginTop: 8 }}>
                    Result will show SAFE or NOT SAFE.
                  </div>
                </>
              ) : passwordMode ? (
                <>
                  <label>Enter Password</label>
                  <div className="pwField">
                    <input
                      type={showPw ? "text" : "password"}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Min 6: aA1@#$"
                      className="input pwField__input"
                      required
                    />
                    <button
                      type="button"
                      className="pwField__toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      title={showPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {attackKey === "spam" ? <label>Enter Text (Spam)</label> : null}
                  {(attackKey === "sql injection" || attackKey === "sql-injection") ? <label>Enter Text or URL (SQL Injection)</label> : null}
                  {attackKey === "xss" ? <label>Enter Text or URL (XSS)</label> : null}
                  {!["spam", "sql injection", "sql-injection", "xss"].includes(attackKey) ? <label>Enter Text</label> : null}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      attackKey === "spam"
                        ? "Paste message text..."
                        : attackKey === "sql injection" || attackKey === "sql-injection"
                          ? "Example: ' OR 1=1 -- or UNION SELECT ..."
                          : attackKey === "xss"
                            ? "Example: <script>alert(1)</script>"
                            : "Paste text..."
                    }
                    rows={6}
                    required
                  />
                </>
              )}

              {err && <div className="alert alert--error">{err}</div>}

              <button className="btn btn--primary" disabled={loading}>
                {loading ? "Scanning..." : "Detect Now"}
              </button>
            </form>

            {scanPhase && (
              <div className="scanCard">
                <div className="scanCard__header">Live scanning in progress...</div>
                <div className="scanner">
                  <div className="scanner__beam" />
                  <div className="scanner__grid" />
                </div>
                <div className="scanSteps">
                  <span>Collecting signals</span>
                  <span>Checking patterns</span>
                  <span>Finalizing verdict</span>
                </div>
              </div>
            )}
          </div>

          <div className={`card resultPanel ${latestResultGlowClass}`}>
            <div className="card__title">Latest Result</div>
            {result ? (
              <div className="resultPanel__content">
                <div className={`pill ${isSafeOutcome(latestFinal) ? "pill--safe" : "pill--danger"}`}>
                  {latestFinal || "-"}
                </div>

                <div className="muted resultPanel__line" style={{ marginTop: 10 }}>
                  Rule: <b>{latestRule}</b> • ML: <b>{latestML}</b> • Confidence: <b>{latestConfPct}%</b>
                </div>

                <div className="muted resultPanel__line" style={{ marginTop: 10 }}>
                  Signals: {result.signals?.length ? result.signals.join(", ") : "-"}
                </div>

                <div className="muted resultPanel__line" style={{ marginTop: 10 }}>
                  Stored at: {formatDate(result.createdAt)}
                </div>
              </div>
            ) : (
              <div className="muted">No result yet. Run a detection.</div>
            )}
          </div>
        </div>

        <ThreatCharts
          items={history}
          activeAttack={activeAttack}
          latestFinal={latestFinal}
          latestConfidence={latestConfPct}
        />

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card__title">Detection Analytics (Animated)</div>
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card__title">Detection History</div>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Final</th>
                  <th>Rule</th>
                  <th>ML</th>
                  <th>Confidence</th>
                  <th>Input (Preview)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const finalRaw = getFinal(h);
                  const final = getDisplayFinal(finalRaw);
                  return (
                    <tr key={h._id}>
                      <td className="mono">{formatDate(h.createdAt)}</td>
                      <td>
                        <span className={`tag ${isSafeOutcome(final) ? "tag--safe" : "tag--danger"}`}>
                          {final || "-"}
                        </span>
                      </td>
                      <td className="mono">{getRule(h)}</td>
                      <td className="mono">{getML(h)}</td>
                      <td className="mono">{normConfPct(getConf(h))}%</td>
                      <td className="mono">
                        {String(h.input || "").slice(0, 55)}
                        {String(h.input || "").length > 55 ? "..." : ""}
                      </td>
                    </tr>
                  );
                })}

                {!history.length && (
                  <tr>
                    <td colSpan="6" className="muted">
                      No history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
