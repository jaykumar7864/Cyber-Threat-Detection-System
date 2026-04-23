import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, getUser, getToken, getUserRole } from "../lib/auth";
import { useApp } from "../context/AppContext";
import api from "../lib/api";
import brandLogo from "../assets/ctdps-logo.jpeg";

function ThemeIcon({ theme }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M20 15.5A8.5 8.5 0 018.5 4a8.5 8.5 0 1011.5 11.5z"
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
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M10 17l5-5-5-5M15 12H4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4v16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignupIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 20a8 8 0 0 1 16 0M19 8v6M16 11h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M14 17l5-5-5-5M19 12H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();
  const token = getToken();
  const user = getUser();
  const role = getUserRole();
  const { theme, toggleTheme } = useApp();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [hasComplaintAlert, setHasComplaintAlert] = React.useState(false);

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 980) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function loadComplaintAlert() {
      if (!token || role === "admin") {
        if (!ignore) setHasComplaintAlert(false);
        return;
      }

      try {
        const { data } = await api.get("/complaints/me");
        const items = data?.items || [];
        if (!ignore) setHasComplaintAlert(items.some((item) => item.hasUnreadAdminUpdate));
      } catch {
        if (!ignore) setHasComplaintAlert(false);
      }
    }

    loadComplaintAlert();
    return () => {
      ignore = true;
    };
  }, [token, role, location.pathname]);

  function logout() {
    clearAuth();
    setIsMenuOpen(false);
    nav("/");
  }

  return (
    <header className="nav">
      <div className="nav__topRow">
        <div className="nav__left">
          <Link className="brand" to="/">
            <img className="brand__logo" src={brandLogo} alt="CTD&PS logo" />
            <span>CyberShield</span>
          </Link>
        </div>

        <div className="nav__topActions">
          <button
            type="button"
            className={`nav__toggle ${isMenuOpen ? "nav__toggle--open" : ""}`}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div
        id="primary-navigation"
        className={`nav__panel ${isMenuOpen ? "nav__panel--open" : ""}`}
      >
        <nav className="nav__links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Home</NavLink>
          <NavLink to="/services" className={({ isActive }) => (isActive ? "active" : "")}>Services</NavLink>
          {token && role !== "admin" ? (
            <NavLink to="/complaint" className={({ isActive }) => (isActive ? "active navLinkWithDot" : "navLinkWithDot")}>
              Complaint
              {hasComplaintAlert ? <span className="navLinkDot" /> : null}
            </NavLink>
          ) : null}
          {token ? (
            <NavLink
              to={role === "admin" ? "/admin/dashboard" : "/dashboard"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {role === "admin" ? "Admin Dashboard" : "Dashboard"}
            </NavLink>
          ) : null}
        </nav>

        <div className="nav__right">
          <button
            type="button"
            className="themeToggle nav__themeDesktop"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <ThemeIcon theme={theme} />
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            type="button"
            className="themeToggle nav__themeMobile"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <ThemeIcon theme={theme} />
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {token ? (
            <>
              <div className="chip" title={user?.email || ""}>
                <div className="chip__avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
                <div className="chip__meta">
                  <div className="chip__name">{user?.name || "User"}</div>
                  <div className="chip__sub">{role === "admin" ? "Admin" : "Logged in"}</div>
                </div>
              </div>
              <button className="btn btn--ghost" onClick={logout}>
                <LogoutIcon />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink className={({ isActive }) => `btn ${isActive ? "btn--primary" : "btn--ghost"}`} to="/login">
                <LoginIcon />
                <span>Login</span>
              </NavLink>
              <NavLink className={({ isActive }) => `btn ${isActive ? "btn--primary" : "btn--ghost"}`} to="/register">
                <SignupIcon />
                <span>Sign Up</span>
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
