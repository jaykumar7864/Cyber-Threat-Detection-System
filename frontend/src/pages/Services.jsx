import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import servicesImg from "../assets/services.webp";
import { getUserRole } from "../lib/auth";

const groups = [
  {
    title: "Threat Detection Modules",
    items: [
      {
        slug: "phishing",
        name: "Phishing (URL)",
        body:
          "Detect suspicious login URLs and look-alike domains. Uses ML scoring and URL security signals to return SAFE or NOT SAFE with confidence."
      },
      {
        slug: "malware",
        name: "Malware (File)",
        body:
          "Upload a file to estimate risk before opening it. The ML engine evaluates file features and heuristics for a clear verdict."
      },
      {
        slug: "spam",
        name: "Spam (Text)",
        body:
          "Paste message content to classify SAFE or NOT SAFE. Uses text vectorization, trained models, and suspicious language patterns."
      },
      {
        slug: "sql-injection",
        name: "SQL Injection",
        body:
          "Detect classic SQLi payloads such as tautologies, UNION SELECT, stacked queries, and comment bypass patterns."
      },
      {
        slug: "xss",
        name: "Cross-Site Scripting (XSS)",
        body:
          "Detect common XSS vectors like script tags, event handlers, javascript URLs, and encoded payloads."
      },
      {
        slug: "password",
        name: "Password Strength",
        body:
          "Check password strength with simple validation signals. Raw passwords are never stored."
      }
    ],
  },
];

export default function Services() {
  const role = getUserRole();
  const isAdmin = role === "admin";
  const [openKey, setOpenKey] = useState("Phishing (URL)");
  const all = useMemo(() => groups.flatMap((g) => g.items), []);
  const active = all.find((x) => x.name === openKey) || all[0];

  return (
    <main className="container">
      <section className="sectionTitle" style={{ marginTop: 18 }}>
        <h2>{isAdmin ? "Admin Services" : "Our Services"}</h2>
      </section>

      <div className="card servicesIntroCard">
        <div className="servicesIntroText">
          {isAdmin ? (
            <>
              <p>
                CyberShield admin services are focused on complaint supervision, evidence review, and user response handling.
              </p>
              <p>
                Admin can monitor fresh complaints, inspect submitted links, files, and messages, then update complaint status with a clear response.
              </p>
              <p>
                This workflow keeps complaint handling organized and ensures users receive updates directly in their complaint module.
              </p>
            </>
          ) : (
            <>
              <p>
                CyberShield delivers a structured and professional security validation framework designed for clarity and ease of use.
              </p>
              <p>
                Users can first review detailed information about each threat detection module to understand its purpose, functionality, and use cases.
              </p>
              <p>
                Once familiar with the module, they can proceed by selecting <b>Try Detection</b> to access the dedicated input interface tailored specifically for that threat type.
              </p>
              <p>
                This guided workflow ensures accurate analysis, improved user understanding, and a seamless security testing experience.
              </p>
            </>
          )}
        </div>
      </div>

      <section className="split">
        <div className="accordion">
          {isAdmin ? (
            <div className="card" style={{ padding: 16 }}>
              <div className="card__title" style={{ marginBottom: 12 }}>Complaint Administration Modules</div>

              {[
                {
                  name: "Complaint Monitoring",
                  body: "Track all user complaints in one place and identify which issues are still new or pending review."
                },
                {
                  name: "Evidence Review",
                  body: "Open complaint details to inspect user-submitted links, uploaded files, and written messages before taking action."
                },
                {
                  name: "Status Management",
                  body: "Update each complaint as Pending, In Progress, Resolved, or Rejected so users always see the current state."
                },
                {
                  name: "Admin Response System",
                  body: "Send a written response to users from the admin dashboard, which automatically appears in the complaint module."
                }
              ].map((it) => {
                const isOpen = openKey === it.name;
                return (
                  <div key={it.name} className="accItem">
                    <button
                      className="accHead"
                      onClick={() => setOpenKey(isOpen ? "" : it.name)}
                      aria-expanded={isOpen}
                    >
                      <span>{it.name}</span>
                      <span style={{ opacity: 0.8 }}>{isOpen ? "-" : "+"}</span>
                    </button>
                    {isOpen ? (
                      <div className="accBody">
                        {it.body}
                        <div style={{ marginTop: 12 }}>
                          <Link className="btn btn--primary" to="/admin/dashboard">
                            Open Admin Dashboard
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="card" style={{ padding: 16 }}>
                <div className="card__title" style={{ marginBottom: 12 }}>{group.title}</div>

                {group.items.map((it) => {
                  const isOpen = openKey === it.name;
                  return (
                    <div key={it.name} className="accItem">
                      <button
                        className="accHead"
                        onClick={() => setOpenKey(isOpen ? "" : it.name)}
                        aria-expanded={isOpen}
                      >
                        <span>{it.name}</span>
                        <span style={{ opacity: 0.8 }}>{isOpen ? "-" : "+"}</span>
                      </button>
                      {isOpen ? (
                        <div className="accBody">
                          {it.body}
                          <div style={{ marginTop: 12 }}>
                            <Link className="btn btn--primary" to={`/attacks/${it.slug}`}>
                              Open Module
                            </Link>
                            <Link className="btn btn--ghost" to="/dashboard" style={{ marginLeft: 10 }}>
                              Dashboard
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="mediaCard">
          <img className="mediaCard__img" src={servicesImg} alt="Services" />
          <div className="mediaCard__inner">
            <div style={{ fontSize: 18, fontWeight: 700 }}>{isAdmin ? "Admin Workflow" : "Workflow"}</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
              {isAdmin
                ? "Open admin dashboard -> inspect new complaints -> review evidence -> update complaint status -> send response to user."
                : "Choose a module -> read guidance -> click Try Detection -> review output in dashboard charts and history. This matches how modern security products guide users to reduce mistakes."}
            </div>
            <div className="tagRow">
              {isAdmin ? (
                <>
                  <span className="tag">Complaint Review</span>
                  <span className="tag">Status Update</span>
                  <span className="tag">User Notification</span>
                </>
              ) : (
                <>
                  <span className="tag">Module Guidance</span>
                  <span className="tag">Accurate Charts</span>
                  <span className="tag">History Tracking</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="cta" style={{ marginTop: 28 }}>
        <div>
          <h3>{isAdmin ? "Ready to manage user complaints?" : "Want to run a detection now?"}</h3>
          <p>{isAdmin ? "Open the admin dashboard to review complaints and respond to users." : "Open any threat detection module from the left sidebar or from the Dashboard."}</p>
        </div>
        <Link className="btn btn--primary" to={isAdmin ? "/admin/dashboard" : "/dashboard"}>
          {isAdmin ? "Open Admin Dashboard" : "Open Dashboard"}
        </Link>
      </div>
    </main>
  );
}
