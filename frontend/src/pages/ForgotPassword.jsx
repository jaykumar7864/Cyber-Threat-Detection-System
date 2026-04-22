import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

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

function validatePassword(newPassword, confirmPassword) {
  if (!newPassword || !confirmPassword) {
    return "All fields are mandatory";
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return "Passwords do not match";
  }
  if (newPassword.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (!/[A-Z]/.test(newPassword)) {
    return "Password must include one capital letter";
  }
  if (!/[0-9]/.test(newPassword)) {
    return "Password must include one number";
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return "Password must include one special symbol";
  }

  return "";
}

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  function syncValidation(nextPassword, nextConfirm) {
    const message = validatePassword(nextPassword, nextConfirm);
    if (err || message) setErr(message);
  }

  async function requestOtp(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!EMAIL_REGEX.test(email.trim())) {
      setErr("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password/request-otp", {
        email: email.trim()
      });
      setStep("reset");
      setOtp("");
      setOk(data?.message || "Password reset OTP sent to your email");
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!EMAIL_REGEX.test(email.trim())) {
      setErr("Enter a valid email address");
      return;
    }
    if (!OTP_REGEX.test(otp.trim())) {
      setErr("Enter a valid 6-digit OTP");
      return;
    }

    const validationMessage = validatePassword(newPassword, confirm);
    if (validationMessage) {
      setErr(validationMessage);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password/reset", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword
      });
      setOk(data?.message || "Password updated successfully");
      setTimeout(() => nav("/login"), 900);
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password/request-otp", {
        email: email.trim()
      });
      setOk(data?.message || "Password reset OTP sent to your email");
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container narrow">
      <div className="card authCard">
        <div className="card__title">Forgot Password</div>
        <div className="muted">
          {step === "request"
            ? "Enter your registered email to receive a password reset OTP."
            : `Enter the OTP sent to ${email.trim()} and choose a new password.`}
        </div>

        {step === "request" ? (
          <form className="form" onSubmit={requestOtp}>
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (err) setErr("");
              }}
              type="text"
              placeholder="you@example.com"
              required
            />

            {err && <div className="formMessage">{err}</div>}
            {ok && <div className="alert alert--success">{ok}</div>}

            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <div className="muted" style={{ marginTop: 10 }}>
              Back to <Link className="link" to="/login">Login</Link>
            </div>
          </form>
        ) : (
          <form className="form" onSubmit={resetPassword}>
            <label>Email</label>
            <input value={email} type="text" disabled />

            <label>OTP</label>
            <input
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (err) setErr("");
              }}
              type="text"
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              required
            />

            <label>New Password</label>
            <div className="pwField">
              <input
                value={newPassword}
                onChange={(e) => {
                  const nextPassword = e.target.value;
                  setNewPassword(nextPassword);
                  syncValidation(nextPassword, confirm);
                }}
                type={showPass ? "text" : "password"}
                placeholder="Min 6: aA1@#$"
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

            <label>Confirm New Password</label>
            <div className="pwField">
              <input
                value={confirm}
                onChange={(e) => {
                  const nextConfirm = e.target.value;
                  setConfirm(nextConfirm);
                  syncValidation(newPassword, nextConfirm);
                }}
                type={showConfirmPass ? "text" : "password"}
                placeholder="Re-enter password"
                required
                minLength={6}
                className="pwField__input"
              />
              <button
                type="button"
                className="pwField__toggle"
                onClick={() => setShowConfirmPass((s) => !s)}
                aria-label={showConfirmPass ? "Hide password" : "Show password"}
                title={showConfirmPass ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showConfirmPass} />
              </button>
            </div>

            {err && <div className="formMessage">{err}</div>}
            {ok && <div className="alert alert--success">{ok}</div>}

            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>

            <button type="button" className="btn btn--ghost" onClick={resendOtp} disabled={loading}>
              Resend OTP
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setStep("request");
                setErr("");
                setOk("");
                setOtp("");
              }}
              disabled={loading}
            >
              Change Email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
