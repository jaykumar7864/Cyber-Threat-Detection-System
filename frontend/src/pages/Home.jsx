import React from "react";
import { Link } from "react-router-dom";
import { getUserRole } from "../lib/auth";

export default function Home() {
  const role = getUserRole();
  const isAdmin = role === "admin";

  return (
    <main className="container">
      <section className="hero2 homeHero" style={{ marginTop: 18 }}>
        <div className="hero2__grid">
          <div className="homeHero__content">
            <h1>{isAdmin ? "Admin Complaint Control Center" : "Cyber Threat Detection &amp; Prevention System"}</h1>
            <p>
              {isAdmin ? (
                <>
                  CyberShield admin workspace helps you review incoming user complaints, inspect submitted
                  links, files, and messages, and send clear status updates back to users from one place.
                </>
              ) : (
                <>
                  CyberShield helps you validate suspicious <b>URLs</b>, <b>files</b> and <b>messages </b>
                  using a hybrid approach: <b>Machine Learning</b> (Phishing, Malware, Spam) +{" "}
                  <b>Rule-Based</b> detection (SQL Injection, XSS, Password Strength).
                  You get clear SAFE/NOT SAFE outcomes with confidence and history tracking.
                </>
              )}
            </p>

            <div className="kpiRow">
              <div className="kpi">
                <b>{isAdmin ? "Complaint Review" : "ML + Rules"}</b>
                <span>{isAdmin ? "See every complaint in one dashboard" : "Fusion logic for better accuracy"}</span>
              </div>
              <div className="kpi">
                <b>{isAdmin ? "User Evidence" : "Instant Result"}</b>
                <span>{isAdmin ? "Inspect file, link, and message details" : "Confidence + signals"}</span>
              </div>
              <div className="kpi">
                <b>{isAdmin ? "Response Workflow" : "Dashboard"}</b>
                <span>{isAdmin ? "Update complaint status and notify users" : "Charts + detection history"}</span>
              </div>
            </div>

            <div className="hero__actions" style={{ marginTop: 18 }}>
              <Link className="btn btn--primary" to={isAdmin ? "/admin/dashboard" : "/dashboard"}>
                {isAdmin ? "Open Admin Dashboard" : "Open Dashboard"}
              </Link>
              <Link className="btn btn--ghost" to="/services">
                {isAdmin ? "View Admin Services" : "Explore Services"}
              </Link>
            </div>
          </div>

          <div className="hero2__panel homeHero__panel">
            <h3>{isAdmin ? "Admin Tools Included" : "Threat Detection Modules Included"}</h3>
            <div className="badgeRow">
              {isAdmin ? (
                <>
                  <span className="badge">Complaint Monitoring</span>
                  <span className="badge">Admin Responses</span>
                  <span className="badge">Evidence Review</span>
                  <span className="badge">Status Updates</span>
                  <span className="badge">User Notifications</span>
                </>
              ) : (
                <>
                  <span className="badge">Phishing (URL)</span>
                  <span className="badge">Malware (File)</span>
                  <span className="badge">Spam (Text)</span>
                  <span className="badge">SQL Injection</span>
                  <span className="badge">XSS</span>
                  <span className="badge">Password Strength</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>{isAdmin ? "What Admin Does" : "What we do"}</h2>
          <p>
            {isAdmin
              ? "Admin reviews user complaints, verifies attached evidence, updates complaint status, and sends responses that users can track from their complaint panel."
              : "A simple, professional workflow: read threat detection guidance, run detection, and review results with charts and history. Designed for demo and academic use, but structured like a real security product."}
          </p>
        </div>

        <div className="grid3">
          <div className="card">
            <div className="card__title">{isAdmin ? "Complaint Queue" : "Guided Modules"}</div>
            <div className="muted">
              {isAdmin
                ? "All new complaints come into the admin dashboard with submitted category, subject, evidence, and user details."
                : "Each threat detection module includes a short explanation, what is checked, and prevention tips before you run detection."}
            </div>
          </div>
          <div className="card">
            <div className="card__title">{isAdmin ? "Detailed Review" : "Accurate Visuals"}</div>
            <div className="muted">
              {isAdmin
                ? "Admin can inspect complaint messages, links, and uploaded files before sending a final response."
                : "Threat distribution charts use consistent label-based colors so results stay clear and easy to read."}
            </div>
          </div>
          <div className="card">
            <div className="card__title">{isAdmin ? "Action & Updates" : "Privacy-aware"}</div>
            <div className="muted">
              {isAdmin
                ? "After review, admin updates status to Pending, In Progress, Resolved, or Rejected and sends a response notification to the user."
                : "Password checks never store the raw password. Only masked values and signals are saved in history."}
            </div>
          </div>
        </div>

        <div className="cta">
          <div>
            <h3>{isAdmin ? "Open complaint management tools" : "Explore services in detail"}</h3>
            <p>{isAdmin ? "Review active complaints and respond to users from the admin dashboard." : "See how each threat detection module works and when to use it."}</p>
          </div>
          <Link className="btn btn--primary" to={isAdmin ? "/admin/dashboard" : "/services"}>
            {isAdmin ? "Go to Admin Dashboard" : "Go to Services"}
          </Link>
        </div>
      </section>
    </main>
  );
}
