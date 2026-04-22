import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <main className="container">
      <section className="sectionTitle" style={{ marginTop: 18 }}>
        <h2>About Us</h2>
      </section>

      <div className="card aboutIntroCard">
        <div className="card__title">About CyberShield</div>
        <div className="aboutIntroText">
          <p>CyberShield is an advanced next-generation Cyber Threat Detection &amp; Prevention platform engineered to identify, analyze, and mitigate modern cyber risks in real time.</p>
          <p>Built on a layered security architecture, the system integrates machine-learning intelligence with precise rule-based validation to deliver fast, accurate, and explainable outcomes.</p>
          <p>It can detect phishing links, analyze suspicious files for malware indicators, filter spam content, identify SQL injection and cross-site scripting (XSS) attempts, and evaluate password strength to reduce weak credential usage.</p>
          <p>By combining adaptive classification models with structured pattern recognition and signal-based risk scoring, CyberShield balances detection accuracy while minimizing false positives.</p>
          <p>Each analysis is logged and visualized through an interactive dashboard, providing clear risk indicators, threat distribution insights, and actionable prevention guidance.</p>
          <p>Designed to simulate enterprise-grade cybersecurity workflows, CyberShield offers a unified framework suitable for academic research, training environments, and professional demonstrations.</p>
        </div>
      </div>

      <div className="grid3" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card__title">Our Mission</div>
          <div className="muted" style={{ lineHeight: 1.7 }}>
            We make cyber safety checks simple and accessible. Users can quickly validate links, files, and messages while understanding why a result is marked safe or risky through clear signals and prevention guidance.
          </div>
        </div>
        <div className="card">
          <div className="card__title">Hybrid Detection</div>
          <div className="muted" style={{ lineHeight: 1.7 }}>
            ML modules handle probabilistic classification for Phishing, Malware, and Spam, while rule modules catch known patterns for SQLi, XSS, and Password checks.
          </div>
        </div>
        <div className="card">
          <div className="card__title">Dashboard &amp; Analytics</div>
          <div className="muted" style={{ lineHeight: 1.7 }}>
            Every detection result is stored in history for future reference. Interactive charts summarize threat distribution for quick analysis.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card__title">Technology Stack</div>
        <ul className="list">
          <li><b>Modern Frontend Architecture:</b> Component-based UI with fast rendering, responsive layouts, and an intuitive dark security dashboard design.</li>
          <li><b>Secure Backend Infrastructure:</b> RESTful APIs with role-based access control, token-based authentication, and structured activity logging.</li>
          <li><b>Intelligent Detection Layer:</b> Hybrid detection combining machine learning classification and behavioral analysis for accurate threat identification.</li>
          <li><b>Threat Validation Engine:</b> Pattern recognition, anomaly checks, and signal-based risk scoring to ensure reliable detection outcomes.</li>
          <li><b>Data Management &amp; History:</b> Structured storage of detection results with analytics-ready formatting for visualization and reporting.</li>
        </ul>
      </div>

      <div className="cta">
        <div>
          <h3>Access Threat Detection Modules &amp; Start Analysis</h3>
          <p>Browse all detection modules in Services, or go directly to the Dashboard to start analyzing threats instantly.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn--primary" to="/services">Explore Services</Link>
          <Link className="btn btn--ghost" to="/dashboard">Open Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
