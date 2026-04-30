import React, { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext();

const ATTACK_STORAGE_KEY = "cybershield-active-attack";

const attackLabelBySlug = {
  phishing: "Phishing",
  malware: "Malware",
  spam: "Spam",
  "sql-injection": "SQL Injection",
  xss: "XSS",
  password: "Password Strength",
};

function getAttackFromPath(pathname) {
  const match = String(pathname || "").match(/^\/attacks\/([^/]+)/i);
  if (!match) return null;
  return attackLabelBySlug[match[1].toLowerCase()] || null;
}

function getInitialAttack() {
  if (typeof window === "undefined") return "Phishing";

  const attackFromPath = getAttackFromPath(window.location.pathname);
  if (attackFromPath) return attackFromPath;

  const storedAttack = window.localStorage.getItem(ATTACK_STORAGE_KEY);
  return storedAttack || "Phishing";
}

export function AppProvider({ children }) {
  const [activeAttack, setActiveAttack] = useState(getInitialAttack);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ATTACK_STORAGE_KEY, activeAttack);
  }, [activeAttack]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAttackFromRoute = () => {
      const attackFromPath = getAttackFromPath(window.location.pathname);
      if (attackFromPath) {
        setActiveAttack(attackFromPath);
      }
    };

    syncAttackFromRoute();
    window.addEventListener("popstate", syncAttackFromRoute);

    return () => {
      window.removeEventListener("popstate", syncAttackFromRoute);
    };
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <AppContext.Provider value={{ activeAttack, setActiveAttack, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
