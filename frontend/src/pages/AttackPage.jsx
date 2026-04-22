import React, { useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const contentMap = {
  phishing: {
    title: "Phishing Detection",
    short: "Check suspicious URLs and login pages before you click.",
    desc:
      "Phishing is a social-engineering attack where fake websites or messages trick users into sharing credentials like OTP, passwords, or bank details. CyberShield analyzes a URL using ML + security signals (domain patterns, URL length, suspicious keywords) and returns a clear SAFE/PHISHING outcome with confidence.",
    whatWeCheck: [
      "Domain & subdomain tricks (look‑alike spelling, punycode, excessive subdomains)",
      "URL redirections / shorteners and unusual path depth",
      "Phishing keywords such as login/verify/update/secure/bank/otp",
      "ML classifier score (TF‑IDF + linear model) fused with rule confidence",
    ],
    prevent: ["Never share OTP/CVV", "Check domain spelling", "Enable 2FA", "Avoid unknown links"],
    attackLabel: "Phishing",
  },
  malware: {
    title: "Malware Detection",
    short: "Upload a file to estimate risk before opening it.",
    desc:
      "Malware is malicious software delivered via downloads or attachments. CyberShield performs a lightweight analysis and sends features to the ML engine for classification. The result indicates SAFE/MALWARE (or NOT SAFE) with confidence, helping users decide whether to trust a file.",
    whatWeCheck: [
      "File type/extension & suspicious naming patterns",
      "Basic heuristics (macro/office docs, executable indicators, archive anomalies)",
      "ML classifier output from trained dataset (file feature vector)",
      "Fusion logic combining ML confidence with heuristic signals",
    ],
    prevent: ["Avoid unknown .exe/.apk", "Keep OS updated", "Use antivirus", "Disable macros in Office files"],
    attackLabel: "Malware",
  },
  spam: {
    title: "Spam Detection",
    short: "Classify messages as SAFE/SPAM using ML + patterns.",
    desc:
      "Spam includes unsolicited promotional messages and may carry phishing links. CyberShield classifies text using a trained ML model (TF‑IDF + linear classifier) and rule signals such as urgency keywords, suspicious links, and common scam phrasing.",
    whatWeCheck: [
      "Spam keywords and urgency/pressure language",
      "Presence of suspicious URLs, phone numbers, or shortened links",
      "ML classifier score (text vectorization + linear model)",
      "Final decision using confidence fusion",
    ],
    prevent: ["Block/report sender", "Use spam filters", "Avoid clicking offers", "Do not reply to unknown"],
    attackLabel: "Spam",
  },
  "sql-injection": {
    title: "SQL Injection Detection",
    short: "Detect common SQLi payload patterns in inputs.",
    desc:
      "SQL Injection (SQLi) happens when attackers inject SQL through input fields to read or modify database content. CyberShield uses pattern and signature checks to detect typical payloads such as tautologies, UNION SELECT, stacked queries, and comment‑based bypasses.",
    whatWeCheck: [
      "Tautology patterns like ' OR 1=1 --",
      "UNION SELECT / information_schema probing",
      "Comment & encoding tricks used to bypass filters",
      "Suspicious keywords (DROP, INSERT, UPDATE) in unsafe contexts",
    ],
    prevent: ["Use parameterized queries", "Validate input", "Least‑privilege DB user", "Use ORM safely"],
    attackLabel: "SQL Injection",
  },
  xss: {
    title: "XSS Detection",
    short: "Spot script injection attempts in user inputs.",
    desc:
      "Cross‑Site Scripting (XSS) injects scripts into web pages to steal cookies, sessions, or deface content. CyberShield applies pattern‑based detection for script tags, event handlers (onerror/onload), javascript: URLs, and common XSS vectors.",
    whatWeCheck: [
      "<script> tags, inline JS, and encoded script payloads",
      "Event handler injections (onerror, onclick, onload, etc.)",
      "javascript: URLs and DOM‑based payload patterns",
      "HTML injection markers that commonly lead to XSS",
    ],
    prevent: ["Escape output", "Use Content Security Policy", "Sanitize HTML", "Use HttpOnly cookies"],
    attackLabel: "XSS",
  },
  password: {
    title: "Password Strength Checker",
    short: "Rate password strength: WEAK / MEDIUM / STRONG.",
    desc:
      "A strong password reduces account takeover risk. CyberShield evaluates length, complexity, and weak/common patterns. It returns a clear label and confidence score, and stores masked input (never the raw password).",
    whatWeCheck: [
      "Length (8+ recommended, 12+ preferred)",
      "Upper/lowercase + numbers + symbols",
      "Common passwords and predictable patterns",
      "Repetition sequences that reduce entropy",
    ],
    prevent: ["Use 12+ characters", "Mix upper/lowercase", "Add numbers + symbols", "Avoid common words", "Use a password manager"],
    attackLabel: "Password Strength",
  }
};

export default function AttackPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { setActiveAttack } = useApp();

  const data = useMemo(() => contentMap[slug] || null, [slug]);

  useEffect(() => {
    if (data?.attackLabel) setActiveAttack(data.attackLabel);
  }, [data?.attackLabel, setActiveAttack]);

  if (!data) {
    return (
      <main className="container">
        <div className="card">
          <div className="card__title">Module Not Found</div>
          <div className="muted">Invalid module slug.</div>
          <Link className="btn btn--ghost" to="/services">Go to Services</Link>
        </div>
      </main>
    );
  }

  const goDetect = () => {
    if (data?.attackLabel) setActiveAttack(data.attackLabel);
    navigate("/dashboard");
  };

  return (
    <main className="container">
      <div className="sectionTitle" style={{ marginTop: 18 }}>
        <h2>{data.title}</h2>
        <p>{data.desc}</p>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">What CyberShield checks</div>
          <ul className="list">
            {data.whatWeCheck.map((p, i) => <li key={i}>{p}</li>)}
          </ul>

          <div className="cta">
            <div>
              <h3>Ready to test an input?</h3>
              <p>Open the detection form for <b>{data.attackLabel}</b> and run a check.</p>
            </div>
            <button className="btn btn--primary" onClick={goDetect}>Try Detection</button>
          </div>
        </div>

        <div className="card">
          <div className="card__title">Prevention Tips</div>
          <ul className="list">
            {data.prevent.map((p, i) => <li key={i}>{p}</li>)}
          </ul>

          <div style={{ marginTop: 14 }}>
            <Link className="btn btn--ghost" to="/complaint">Submit Complaint</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
