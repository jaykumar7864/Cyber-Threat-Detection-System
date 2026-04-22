import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";

const items = [
  { to: "/attacks/phishing", label: "Phishing" },
  { to: "/attacks/malware", label: "Malware" },
  { to: "/attacks/spam", label: "Spam" },
  { to: "/attacks/sql-injection", label: "SQL Injection" },
  { to: "/attacks/xss", label: "XSS" },
  { to: "/attacks/password", label: "Password Strength" },
];

export default function Sidebar() {
  const { setActiveAttack } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar__title">Cyber Attacks</div>

      <div className="sidebar__list">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            title={it.label}
            onClick={() => setActiveAttack(it.label)}
            className={({ isActive }) =>
              "sidebar__item" + (isActive ? " sidebar__item--active" : "")
            }
          >
            <span className="dot" /> {it.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
