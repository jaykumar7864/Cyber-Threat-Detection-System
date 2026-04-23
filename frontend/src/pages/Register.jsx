import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]*[A-Za-z][A-Za-z0-9._%+-]*@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
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

function validateRegisterForm({ name, email, phone, password, confirmPassword }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedName || !trimmedEmail || !trimmedPhone || !password || !confirmPassword) {
    return "All fields are mandatory";
  }
  if (!/[A-Za-z]/.test(trimmedName)) {
    return "Name must contain at least one letter";
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return "Enter a valid email address";
  }
  if (!PHONE_REGEX.test(trimmedPhone)) {
    return "Enter a valid 10-digit phone number";
  }
  if (confirmPassword && password !== confirmPassword) {
    return "Passwords do not match";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include one capital letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include one number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include one special symbol";
  }

  return "";
}

function validateOtp(otp) {
  if (!otp.trim()) return "Enter the OTP sent to your email";
  if (!OTP_REGEX.test(otp.trim())) return "Enter a valid 6-digit OTP";
  return "";
}

export default function Register() {
  const nav = useNavigate();
  const [step, setStep] = useState("register");
  const [role, setRole] = useState("user");
  const [adminExists, setAdminExists] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadAdminStatus() {
      try {
        const { data } = await api.get("/auth/admin-status");
        if (!ignore) {
          const exists = Boolean(data?.adminExists);
          setAdminExists(exists);
          if (exists) setRole("user");
        }
      } catch {
        if (!ignore) setAdminExists(false);
      }
    }

    loadAdminStatus();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (step !== "verify" || resendCountdown <= 0) return undefined;

    const timer = setInterval(() => {
      setResendCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  function syncValidation(nextValues) {
    const message = validateRegisterForm(nextValues);
    if (err || message) setErr(message);
  }

  async function submitRegistration(e) {
    e.preventDefault();
    const validationMessage = validateRegisterForm({ name, email, phone, password, confirmPassword });
    setErr(validationMessage);
    setOk("");
    if (validationMessage) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password
      };
      const { data } = await api.post("/auth/register", payload);
      setStep("verify");
      setOtp("");
      setResendCountdown(30);
      setOk(data?.message || "Verification OTP sent to your email");
    } catch (error) {
      setErr(error?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtpVerification(e) {
    e.preventDefault();
    const validationMessage = validateOtp(otp);
    setErr(validationMessage);
    setOk("");
    if (validationMessage) return;

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-registration-otp", {
        email: email.trim(),
        otp: otp.trim()
      });
      setOk(data?.message || "Email verified successfully. Please log in.");
      setTimeout(() => nav("/login", { replace: true }), 900);
    } catch (error) {
      setErr(error?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendCountdown > 0) return;
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const { data } = await api.post("/auth/resend-registration-otp", {
        email: email.trim()
      });
      setResendCountdown(30);
      setOk(data?.message || "A new verification OTP has been sent");
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container narrow">
      <div className="card authCard">
        <div className="card__title">{step === "register" ? "Create Account" : "Verify Email"}</div>
        <div className="muted">
          {step === "register"
            ? "First verify your email with OTP. Your account will be created only after successful verification."
            : `We sent a 6-digit OTP to ${email.trim()}. Verify it below to create your account.`}
        </div>

        {step === "register" ? (
          <form className="form" onSubmit={submitRegistration}>
            <label>Role</label>
            <div className="roleSwitch">
              <button
                type="button"
                className={`roleSwitch__item ${role === "user" ? "roleSwitch__item--active" : ""}`}
                onClick={() => setRole("user")}
              >
                User
              </button>
              {!adminExists ? (
                <button
                  type="button"
                  className={`roleSwitch__item ${role === "admin" ? "roleSwitch__item--active" : ""}`}
                  onClick={() => setRole("admin")}
                >
                  Admin
                </button>
              ) : null}
            </div>
            {adminExists ? (
              <div className="muted">Admin signup is disabled because an admin account already exists. Admin can log in from the login page.</div>
            ) : null}

            <label>Name</label>
            <input
              value={name}
              onChange={(e) => {
                const nextName = e.target.value.replace(/[^A-Za-z0-9\s]/g, "");
                setName(nextName);
                syncValidation({ name: nextName, email, phone, password, confirmPassword });
              }}
              placeholder="Enter name"
              required
            />

            <label>Email</label>
            <input
              value={email}
              onChange={(e) => {
                const nextEmail = e.target.value;
                setEmail(nextEmail);
                syncValidation({ name, email: nextEmail, phone, password, confirmPassword });
              }}
              type="text"
              placeholder="name@example.com"
              required
            />

            <label>Phone Number</label>
            <input
              value={phone}
              onChange={(e) => {
                const nextPhone = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(nextPhone);
                syncValidation({ name, email, phone: nextPhone, password, confirmPassword });
              }}
              type="tel"
              placeholder="10-digit mobile number"
              inputMode="numeric"
              pattern="[6-9]{1}[0-9]{9}"
              required
            />

            <label>Password</label>
            <div className="pwField">
              <input
                value={password}
                onChange={(e) => {
                  const nextPassword = e.target.value;
                  setPassword(nextPassword);
                  syncValidation({ name, email, phone, password: nextPassword, confirmPassword });
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

            <label>Confirm Password</label>
            <div className="pwField">
              <input
                value={confirmPassword}
                onChange={(e) => {
                  const nextConfirmPassword = e.target.value;
                  setConfirmPassword(nextConfirmPassword);
                  syncValidation({ name, email, phone, password, confirmPassword: nextConfirmPassword });
                }}
                type={showConfirmPass ? "text" : "password"}
                placeholder="Re-enter password"
                required
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
              {loading ? "Sending OTP..." : role === "admin" ? "Verify Admin Email" : "Verify User Email"}
            </button>

            <div className="muted" style={{ marginTop: 10 }}>
              Already have an account? <Link className="link" to="/login">Login</Link>
            </div>
          </form>
        ) : (
          <form className="form" onSubmit={submitOtpVerification}>
            <label>Email</label>
            <input value={email} type="text" disabled />

            <label>OTP</label>
            <input
              value={otp}
              onChange={(e) => {
                const nextOtp = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(nextOtp);
                if (err) setErr("");
              }}
              type="text"
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              required
            />

            {err && <div className="formMessage">{err}</div>}
            {ok && <div className="alert alert--success">{ok}</div>}

            <button className="btn btn--primary" disabled={loading}>
              {loading ? "Creating account..." : "Verify Email & Create Account"}
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={resendOtp}
              disabled={loading || resendCountdown > 0}
            >
              {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setStep("register");
                setErr("");
                setOk("");
                setResendCountdown(0);
              }}
              disabled={loading}
            >
              Edit Details
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
