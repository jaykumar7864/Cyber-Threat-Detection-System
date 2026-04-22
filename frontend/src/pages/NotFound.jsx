import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="container">
      <div className="card">
        <div className="card__title">404 - Page not found</div>
        <div className="muted">The page you are looking for does not exist.</div>
        <Link className="btn btn--primary" to="/">Go Home</Link>
      </div>
    </main>
  );
}
