import React, { useEffect, useState } from "react";
import api from "../lib/api";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" }
];

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    const { data } = await api.get("/complaints/all");
    const complaints = data.items || [];
    setItems(complaints);
    setEditing((prev) => {
      const next = { ...prev };
      complaints.forEach((item) => {
        if (!next[item._id]) {
          next[item._id] = {
            status: item.status,
            adminResponse: item.adminResponse || ""
          };
        }
      });
      return next;
    });
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((error) => setErr(error?.response?.data?.message || "Failed to load complaints"))
      .finally(() => setLoading(false));
  }, []);

  function handleDraftChange(id, field, value) {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  }

  async function saveUpdate(id) {
    const draft = editing[id];
    if (!draft?.status || !draft?.adminResponse?.trim()) {
      setErr("Status and admin response are required");
      return;
    }

    setErr("");
    setOk("");
    setSavingId(id);
    try {
      await api.patch(`/complaints/${id}/admin`, {
        status: draft.status,
        adminResponse: draft.adminResponse.trim()
      });
      setOk("Complaint updated and notification sent");
      await load();
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to update complaint");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="container">
      <div className="pageTitle">
        <h2>Admin Dashboard</h2>
        <p>Manage all user complaints, update their status, and add response messages.</p>
      </div>

      <div className="card">
        <div className="card__title">All User Complaints</div>

        {err && <div className="alert alert--error" style={{ marginBottom: 12 }}>{err}</div>}
        {ok && <div className="alert alert--success" style={{ marginBottom: 12 }}>{ok}</div>}

        {loading ? (
          <div className="muted">Loading complaints...</div>
        ) : (
          <div className="listBox">
            {items.map((item) => {
              const open = expandedId === item._id;
              const draft = editing[item._id] || { status: item.status, adminResponse: item.adminResponse || "" };

              return (
                <div className="listItem" key={item._id}>
                  <div className="listItem__top">
                    <div>
                      <div className="listItem__title">{item.subject}</div>
                      <div className="muted">
                        {item.userId?.name || "User"} • {item.userId?.email || "-"} • {item.userId?.phone || "-"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`tag ${item.status === "RESOLVED" ? "tag--safe" : "tag--danger"}`}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setExpandedId(open ? null : item._id)}
                      >
                        {open ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      <div className="muted"><b>Category:</b> {item.category}</div>
                      <div className="muted"><b>User Message:</b> {item.message}</div>
                      <div className="muted"><b>Created:</b> {formatDate(item.createdAt)}</div>
                      <div className="muted"><b>Last Updated:</b> {formatDate(item.lastStatusUpdatedAt || item.updatedAt)}</div>

                      <label>Update Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) => handleDraftChange(item._id, "status", e.target.value)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <label>Admin Response</label>
                      <textarea
                        rows={4}
                        value={draft.adminResponse}
                        onChange={(e) => handleDraftChange(item._id, "adminResponse", e.target.value)}
                        placeholder="Add a clear response message for the user"
                      />

                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={savingId === item._id}
                        onClick={() => saveUpdate(item._id)}
                      >
                        {savingId === item._id ? "Saving..." : "Update Complaint"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!items.length && <div className="muted">No complaints found.</div>}
          </div>
        )}
      </div>
    </main>
  );
}
