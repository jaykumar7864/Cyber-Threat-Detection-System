import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function toFileUrl(attachment) {
  if (!attachment?.data || !attachment?.mimeType) return "";
  return `data:${attachment.mimeType};base64,${attachment.data}`;
}

const CATEGORY_CONFIG = {
  PHISHING: {
    label: "Phishing",
    evidenceType: "LINK",
    evidenceLabel: "Suspicious Link",
    evidencePlaceholder: "https://example.com/suspicious-link"
  },
  MALWARE: {
    label: "Malware",
    evidenceType: "FILE",
    evidenceLabel: "Upload File"
  },
  SPAM: {
    label: "Spam",
    evidenceType: "TEXT",
    evidenceLabel: "Suspicious Message",
    evidencePlaceholder: "Paste the spam message here"
  },
  SQL_INJECTION: {
    label: "SQL Injection",
    evidenceType: "TEXT",
    evidenceLabel: "Query / Payload",
    evidencePlaceholder: "Paste the suspicious query or payload"
  },
  XSS: {
    label: "XSS",
    evidenceType: "TEXT",
    evidenceLabel: "Script / Input",
    evidencePlaceholder: "Paste the suspicious script or input"
  },
  BRUTE_FORCE: {
    label: "Brute Force",
    evidenceType: "TEXT",
    evidenceLabel: "Attack Details",
    evidencePlaceholder: "Describe repeated login attempts or attack details"
  },
  OTHER: {
    label: "Other",
    evidenceType: "TEXT",
    evidenceLabel: "Details",
    evidencePlaceholder: "Describe the issue"
  }
};

const categories = Object.keys(CATEGORY_CONFIG);

function getStatusStyles(status) {
  if (status === "RESOLVED") {
    return { background: "#166534", border: "1px solid #22c55e", color: "#f0fdf4" };
  }
  if (status === "IN_PROGRESS") {
    return { background: "#c2410c", border: "1px solid #fb923c", color: "#fff7ed" };
  }
  if (status === "REJECTED") {
    return { background: "#991b1b", border: "1px solid #ef4444", color: "#fef2f2" };
  }
  return { background: "#fde68a", border: "1px solid #facc15", color: "#1f2937" };
}

function NotificationBell({ hasUnread }) {
  return (
    <div
      style={{
        position: "relative",
        width: 42,
        height: 42,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(255,255,255,0.08)"
      }}
      title={hasUnread ? "New admin response available" : "No new admin response"}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M15 18H5.5a1.5 1.5 0 0 1-1.2-2.4l1.2-1.6V10a6.5 6.5 0 1 1 13 0v4l1.2 1.6A1.5 1.5 0 0 1 18.5 18H15m0 0a3 3 0 0 1-6 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {hasUnread ? (
        <span
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#ef4444",
            boxShadow: "0 0 0 3px rgba(239,68,68,0.18)"
          }}
        />
      ) : null}
    </div>
  );
}

export default function Complaint() {
  const [category, setCategory] = useState("PHISHING");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[category];
  const hasUnreadUpdate = useMemo(() => items.some((item) => item.hasUnreadAdminUpdate), [items]);
  const allSelected = useMemo(() => items.length > 0 && selected.size === items.length, [items.length, selected.size]);

  async function load() {
    const { data } = await api.get("/complaints/me");
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setEvidenceText("");
    setAttachment(null);
  }, [category]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (items.length === 0) return prev;
      if (prev.size === items.length) return new Set();
      return new Set(items.map((x) => x._id));
    });
  }

  async function markAsRead(id) {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, hasUnreadAdminUpdate: false, adminResponseSeenAt: new Date().toISOString() } : item
      )
    );

    try {
      await api.patch(`/complaints/${id}/mark-read`);
    } catch {
      // Keep UI responsive even if read-sync fails temporarily.
    }
  }

  async function toggleOpen(complaint) {
    const nextOpen = expandedId === complaint._id ? null : complaint._id;
    setExpandedId(nextOpen);
    if (nextOpen && complaint.hasUnreadAdminUpdate && complaint.adminResponse) {
      await markAsRead(complaint._id);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("subject", subject);
      formData.append("message", message);
      formData.append("evidenceType", categoryConfig.evidenceType);

      if (categoryConfig.evidenceType === "FILE") {
        if (!attachment) {
          throw new Error("Please upload a file");
        }
        formData.append("attachment", attachment);
      } else if (evidenceText.trim()) {
        formData.append("evidenceText", evidenceText.trim());
      }

      await api.post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setOk("Complaint submitted successfully");
      setSubject("");
      setMessage("");
      setEvidenceText("");
      setAttachment(null);
      setExpandedId(null);
      setSelected(new Set());
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOne(id) {
    setErr("");
    setOk("");
    setDeleting(true);
    try {
      await api.delete(`/complaints/${id}`);
      setOk("Complaint deleted");
      setExpandedId((value) => (value === id ? null : value));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (!ids.length) {
      setErr("Select at least one complaint to delete");
      return;
    }

    setErr("");
    setOk("");
    setDeleting(true);
    try {
      await api.post("/complaints/bulk-delete", { ids });
      setOk("Selected complaints deleted");
      setExpandedId(null);
      setSelected(new Set());
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAll() {
    if (!items.length) return;

    setErr("");
    setOk("");
    setDeleting(true);
    try {
      await api.delete("/complaints/me/all");
      setOk("All complaints deleted");
      setExpandedId(null);
      setSelected(new Set());
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Delete all failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="container">
      <div className="pageTitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div>
          <h2>Complaint</h2>
          <p>Submit category-based complaints, track status, and read admin responses here.</p>
        </div>
        <NotificationBell hasUnread={hasUnreadUpdate} />
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">Submit Complaint</div>
          <form className="form" onSubmit={submit}>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_CONFIG[value].label}
                </option>
              ))}
            </select>

            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short subject" required />

            <label>Description</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Describe your issue clearly..."
              required
            />

            {categoryConfig.evidenceType === "LINK" ? (
              <>
                <label>{categoryConfig.evidenceLabel}</label>
                <input
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder={categoryConfig.evidencePlaceholder}
                  type="url"
                  required
                />
              </>
            ) : null}

            {categoryConfig.evidenceType === "TEXT" ? (
              <>
                <label>{categoryConfig.evidenceLabel}</label>
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  rows={4}
                  placeholder={categoryConfig.evidencePlaceholder}
                />
              </>
            ) : null}

            {categoryConfig.evidenceType === "FILE" ? (
              <>
                <label>{categoryConfig.evidenceLabel}</label>
                <input
                  type="file"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  required
                />
                <div className="muted">Upload the suspicious file. Maximum size: 2 MB.</div>
              </>
            ) : null}

            {err && <div className="alert alert--error">{err}</div>}
            {ok && <div className="alert alert--ok">{ok}</div>}

            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Complaint"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card__title">My Complaints</div>

          {!!items.length && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                <span className="muted">Select all</span>
              </label>

              <button className="btn btn--danger" onClick={deleteSelected} disabled={deleting || selected.size === 0}>
                Delete Selected
              </button>
              <button className="btn btn--ghost" onClick={deleteAll} disabled={deleting}>
                Delete All
              </button>
            </div>
          )}

          <div className="listBox">
            {items.map((c) => {
              const open = expandedId === c._id;
              const isChecked = selected.has(c._id);
              const statusStyles = getStatusStyles(c.status);
              const fileUrl = toFileUrl(c.attachment);

              return (
                <div
                  className="listItem"
                  key={c._id}
                  style={{
                    background: "linear-gradient(180deg, #f8fcff 0%, #eaf4ff 100%)",
                    border: c.hasUnreadAdminUpdate ? "1px solid #f87171" : "1px solid #bfdbfe",
                    color: "#0f172a",
                    boxShadow: c.hasUnreadAdminUpdate ? "0 0 0 1px rgba(248,113,113,0.18)" : "none"
                  }}
                >
                  <div className="listItem__top" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-start", width: "100%" }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(c._id)} />
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{
                          padding: "8px 12px",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          background: "rgba(56,189,248,0.16)",
                          border: "1px solid rgba(56,189,248,0.34)",
                          color: "var(--text)",
                          fontWeight: 800,
                          flex: 1
                        }}
                        onClick={() => toggleOpen(c)}
                      >
                        {c.subject}
                      </button>
                      {c.hasUnreadAdminUpdate ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 26,
                            height: 26,
                            borderRadius: 999,
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 900
                          }}
                          title="New admin response"
                        >
                          !
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingLeft: 30 }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 900,
                          letterSpacing: "0.3px",
                          padding: "7px 12px",
                          borderRadius: 999,
                          ...statusStyles
                        }}
                      >
                        {String(c.status || "PENDING").replaceAll("_", " ")}
                      </span>
                      <span className="mono muted">{formatDate(c.createdAt)}</span>
                      <button
                        type="button"
                        className="btn btn--danger"
                        style={{ padding: "6px 10px" }}
                        onClick={() => deleteOne(c._id)}
                        disabled={deleting}
                        title="Delete complaint"
                        aria-label="Delete complaint"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div style={{ marginTop: 10, lineHeight: 1.7 }}>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Category:</b> {c.category}</div>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Subject:</b> {c.subject}</div>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Description:</b> {c.message}</div>
                      {c.evidenceText ? (
                        <div style={{ color: "#334155" }}>
                          <b style={{ color: "#0f172a" }}>{c.evidenceType === "LINK" ? "Link:" : "Extra Details:"}</b>{" "}
                          {c.evidenceType === "LINK" ? (
                            <a href={c.evidenceText} target="_blank" rel="noreferrer" className="link">{c.evidenceText}</a>
                          ) : (
                            c.evidenceText
                          )}
                        </div>
                      ) : null}
                      {c.attachment?.originalName ? (
                        <div style={{ color: "#334155" }}>
                          <b style={{ color: "#0f172a" }}>File:</b>{" "}
                          {fileUrl ? (
                            <a className="link" href={fileUrl} download={c.attachment.originalName}>
                              {c.attachment.originalName}
                            </a>
                          ) : (
                            c.attachment.originalName
                          )}
                          <span className="muted"> ({Math.ceil((c.attachment.size || 0) / 1024)} KB)</span>
                        </div>
                      ) : null}
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Status:</b> {String(c.status || "PENDING").replaceAll("_", " ")}</div>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Admin Response:</b> {c.adminResponse || "No response yet"}</div>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Last Updated:</b> {formatDate(c.lastStatusUpdatedAt || c.updatedAt || c.createdAt)}</div>
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Date &amp; Time:</b> {formatDate(c.createdAt)}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!items.length && <div className="muted">No complaints yet.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
