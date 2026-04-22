import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="brand">
            <span className="brand__dot" />
            <span>CyberShield</span>
          </div>
          <p>
            CyberShield is a Cyber Threat Detection &amp; Prevention System that helps you
            validate suspicious URLs, files, and messages using a hybrid approach:
            Machine Learning + Security rule engines.
          </p>
          <div className="tagRow">
            <span className="tag">Modern Security Platform</span>
            <span className="tag">Hybrid Detection System</span>
            <span className="tag">Protected Data Environment</span>
          </div>
        </div>

        <div className="footer__col">
          <h4>Navigation</h4>
          <div className="footer__links">
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/about">About Us</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/complaint">Complaint</Link>
          </div>
        </div>

        <div className="footer__col">
          <h4>Detection Modules</h4>
          <div className="footer__links">
            <Link to="/attacks/phishing">Phishing (URL)</Link>
            <Link to="/attacks/malware">Malware (File)</Link>
            <Link to="/attacks/spam">Spam (Text)</Link>
            <Link to="/attacks/sql-injection">SQL Injection</Link>
            <Link to="/attacks/xss">XSS</Link>
            <Link to="/attacks/password">Password Strength</Link>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div>&copy; {new Date().getFullYear()} CyberShield. All rights reserved.</div>
        <div>Advanced Threat Detection &amp; Prevention Platform.</div>
      </div>
    </footer>
  );
}
