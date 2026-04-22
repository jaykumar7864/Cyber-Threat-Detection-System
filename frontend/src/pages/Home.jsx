import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="container">
      <section className="hero2 homeHero" style={{ marginTop: 18 }}>
        <div className="hero2__grid">
          <div className="homeHero__content">
            <h1>Cyber Threat Detection &amp; Prevention System</h1>
            <p>
              CyberShield helps you validate suspicious <b>URLs</b>, <b>files</b> and <b>messages </b>
              using a hybrid approach: <b>Machine Learning</b> (Phishing, Malware, Spam) +{" "}
              <b>Rule-Based</b> detection (SQL Injection, XSS, Password Strength).
              You get clear SAFE/NOT SAFE outcomes with confidence and history tracking.
            </p>

            <div className="kpiRow">
              <div className="kpi">
                <b>ML + Rules</b>
                <span>Fusion logic for better accuracy</span>
              </div>
              <div className="kpi">
                <b>Instant Result</b>
                <span>Confidence + signals</span>
              </div>
              <div className="kpi">
                <b>Dashboard</b>
                <span>Charts + detection history</span>
              </div>
            </div>

            <div className="hero__actions" style={{ marginTop: 18 }}>
              <Link className="btn btn--primary" to="/dashboard">Open Dashboard</Link>
              <Link className="btn btn--ghost" to="/services">Explore Services</Link>
            </div>
          </div>

          <div className="hero2__panel homeHero__panel">
            <h3>Threat Detection Modules Included</h3>
            <div className="badgeRow">
              <span className="badge">Phishing (URL)</span>
              <span className="badge">Malware (File)</span>
              <span className="badge">Spam (Text)</span>
              <span className="badge">SQL Injection</span>
              <span className="badge">XSS</span>
              <span className="badge">Password Strength</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>What we do</h2>
          <p>
            A simple, professional workflow: read threat detection guidance, run detection, and review results with charts and history.
            Designed for demo and academic use, but structured like a real security product.
          </p>
        </div>

        <div className="grid3">
          <div className="card">
            <div className="card__title">Guided Modules</div>
            <div className="muted">
              Each threat detection module includes a short explanation, what is checked, and prevention tips before you run detection.
            </div>
          </div>
          <div className="card">
            <div className="card__title">Accurate Visuals</div>
            <div className="muted">
              Threat distribution charts use consistent label-based colors so results stay clear and easy to read.
            </div>
          </div>
          <div className="card">
            <div className="card__title">Privacy-aware</div>
            <div className="muted">
              Password checks never store the raw password. Only masked values and signals are saved in history.
            </div>
          </div>
        </div>

        <div className="cta">
          <div>
            <h3>Explore services in detail</h3>
            <p>See how each threat detection module works and when to use it.</p>
          </div>
          <Link className="btn btn--primary" to="/services">Go to Services</Link>
        </div>
      </section>
    </main>
  );
}
