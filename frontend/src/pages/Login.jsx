import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { setAuth } from "../lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 10.7a2 2 0 102.8 2.8M9.9 5.1A10.9 10.9 0 0112 5c5.5 0 9.5 5.5 9.5 7s-1.1 3-3 4.3M6.1 6.1C3.9 7.5 2.5 10.1 2.5 12c0 1.5 4 7 9.5 7 1.5 0 2.9-.3 4.1-.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M2.5 12S6.5 5 12 5s9.5 7 9.5 7-4 7-9.5 7S2.5 12 2.5 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function validateLoginForm({ role, identifier, password }) {
  const trimmedIdentifier = identifier.trim();

  if (!role || !trimmedIdentifier || !password) {
    return "Role, email or phone, and password are required";
  }

  const isEmail = trimmedIdentifier.includes("@");
  const isValidIdentifier = isEmail ? EMAIL_REGEX.test(trimmedIdentifier) : PHONE_REGEX.test(trimmedIdentifier);

  if (!isValidIdentifier) {
    return "Enter a valid email or 10-digit phone number";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return "";
}

export default function Login() {
  const nav = useNavigate();
  const [role, setRole] = useState("user");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function syncValidation(nextValues) {
    const message = validateLoginForm(nextValues);
    if (err || message) setErr(message);
  }

  async function submit(e) {
    e.preventDefault();
    const validationMessage = validateLoginForm({ role, identifier, password });
    setErr(validationMessage);

    if (validationMessage) return;

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        role,
        identifier: identifier.trim(),
        password
      });
      setAuth(data.token, data.user);
      nav(data.user?.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container narrow">
      <div className="card">
        <div className="card__title">Login</div>
        <div className="muted">Select your role and log in to continue.</div>

        <form className="form" onSubmit={submit}>
          <label>Role</label>
          <div className="roleSwitch">
            <button
              type="button"
              className={`roleSwitch__item ${role === "user" ? "roleSwitch__item--active" : ""}`}
              onClick={() => {
                setRole("user");
                syncValidation({ role: "user", identifier, password });
              }}
            >
              User
            </button>
            <button
              type="button"
              className={`roleSwitch__item ${role === "admin" ? "roleSwitch__item--active" : ""}`}
              onClick={() => {
                setRole("admin");
                syncValidation({ role: "admin", identifier, password });
              }}
            >
              Admin
            </button>
          </div>

          <label>Email or Phone Number</label>
          <input
            value={identifier}
            onChange={(e) => {
              const nextIdentifier = e.target.value.replace(/^\s+/, "");
              setIdentifier(nextIdentifier);
              syncValidation({ role, identifier: nextIdentifier, password });
            }}
            type="text"
            placeholder="Email or 10-digit phone number"
            inputMode="text"
            required
          />

          <label>Password</label>
          <div className="pwField">
            <input
              value={password}
              onChange={(e) => {
                const nextPassword = e.target.value;
                setPassword(nextPassword);
                syncValidation({ role, identifier, password: nextPassword });
              }}
              type={showPass ? "text" : "password"}
              placeholder="Enter password"
              required
              minLength={6}
              className="pwField__input"
            />

            <button
              type="button"
              className="pwField__toggle"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Hide password" : "Show password"}
              title={showPass ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPass} />
            </button>
          </div>

          {err && <div className="alert alert--error">{err}</div>}

          <button className="btn btn--primary" disabled={loading}>
            {loading ? "Logging in..." : role === "admin" ? "Login as Admin" : "Login as User"}
          </button>

          <div className="muted" style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
            <Link className="link" to="/forgot-password">Forgot Password?</Link>
            <span />
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Don't have an account?{" "}
            <Link className="link" to="/register">
              Register
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
