import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

const categories = ["PHISHING", "MALWARE", "SPAM", "SQL_INJECTION", "XSS", "BRUTE_FORCE", "OTHER"];

export default function Complaint() {
  const [category, setCategory] = useState("PHISHING");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data } = await api.get("/complaints/me");
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  const allSelected = useMemo(() => items.length > 0 && selected.size === items.length, [items.length, selected.size]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (items.length === 0) return prev;
      if (prev.size === items.length) return new Set();
      return new Set(items.map((x) => x._id));
    });
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
    try {
      await api.post("/complaints", { category, subject, message });
      setOk("Complaint submitted successfully ✅");
      setSubject("");
      setMessage("");
      setExpandedId(null);
      setSelected(new Set());
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Submit failed");
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
      setExpandedId((v) => (v === id ? null : v));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
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
      <div className="pageTitle">
        <h2>Complaint</h2>
        <p>Users can submit complaints, track status, and read admin responses here.</p>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card__title">Submit Complaint</div>
          <form className="form" onSubmit={submit}>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short subject" required />

            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Describe your issue..."
              required
            />

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
              const isResolved = c.status === "RESOLVED";
              const statusStyles = isResolved
                ? {
                    background: "#166534",
                    border: "1px solid #22c55e",
                    color: "#f0fdf4"
                  }
                : c.status === "IN_PROGRESS"
                  ? {
                      background: "#c2410c",
                      border: "1px solid #fb923c",
                      color: "#fff7ed"
                    }
                  : c.status === "REJECTED"
                    ? {
                        background: "#7f1d1d",
                        border: "1px solid #f87171",
                        color: "#fff1f2"
                      }
                    : {
                        background: "#fde68a",
                        border: "1px solid #facc15",
                        color: "#1f2937"
                      };

              return (
                <div
                  className="listItem"
                  key={c._id}
                  style={{
                    background: "linear-gradient(180deg, #f8fcff 0%, #eaf4ff 100%)",
                    border: "1px solid #bfdbfe",
                    color: "#0f172a"
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
                          fontWeight: 800
                        }}
                        onClick={() => setExpandedId(open ? null : c._id)}
                      >
                        {c.subject}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingLeft: 30 }}>
                      <span
                        className={`tag ${isResolved ? "tag--safe" : "tag--danger"}`}
                        style={{
                          fontSize: "12px",
                          fontWeight: 900,
                          letterSpacing: "0.3px",
                          padding: "7px 12px",
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
                      <div style={{ color: "#334155" }}><b style={{ color: "#0f172a" }}>Message:</b> {c.message}</div>
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
