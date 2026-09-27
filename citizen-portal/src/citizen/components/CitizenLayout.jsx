import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import "../styles/CitizenPortal.css";

function ArthaVyuhLogo() {
  return (
    <img
      src="/assets/arthavyuh-logo.png"
      alt="ArthaVyuh"
      className="arthavyuh-logo"
    />
  );
}

export default function CitizenLayout() {
  return (
    <div className="citizen-app">
      {/* Indian tricolour strip */}
      <div className="tricolour-strip" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      {/* Government-style utility bar */}
      <div className="utility-bar">
        <div className="citizen-container utility-inner">
          <span>भारत | India</span>

          <div className="utility-links">
            <button type="button">A−</button>
            <button type="button">A</button>
            <button type="button">A+</button>
            <button type="button">हिन्दी</button>
            <button type="button">High Contrast</button>
          </div>
        </div>
      </div>

      {/* Main identity header */}
      <header className="citizen-header">
        <div className="citizen-container header-inner">
          <Link to="/" className="brand">
            <ArthaVyuhLogo />

            <div className="brand-text">
              <div className="brand-name">ARTHAVYUH</div>
              <div className="brand-subtitle">
                National Cybercrime Reporting Portal
              </div>
              <div className="prototype-label">SIH PROTOTYPE</div>
            </div>
          </Link>

          <div className="header-right">
            <div className="helpline">
              <span>Cyber Fraud Helpline</span>
              <strong>1930</strong>
            </div>

            <Link to="/login" className="login-button">
              Citizen Login
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="citizen-nav">
        <div className="citizen-container nav-inner">
          <NavLink to="/" end>
            Home
          </NavLink>

          <NavLink to="/report">
            Report Fraud
          </NavLink>

          <NavLink to="/track">
            Track Complaint
          </NavLink>

          <NavLink to="/faq">
            Help & FAQ
          </NavLink>

          <NavLink to="/complaints">
            My Complaints
          </NavLink>
        </div>
      </nav>

      {/* Page content */}
      <main className="citizen-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="citizen-footer">
        <div className="citizen-container footer-grid">
          <div>
            <h3>ArthaVyuh</h3>
            <p>
              A citizen-focused cybercrime reporting and complaint tracking
              prototype developed for Smart India Hackathon.
            </p>
          </div>

          <div>
            <h4>Citizen Services</h4>
            <Link to="/report">Report Fraud</Link>
            <Link to="/track">Track Complaint</Link>
            <Link to="/complaints">My Complaints</Link>
          </div>

          <div>
            <h4>Information</h4>
            <Link to="/faq">Frequently Asked Questions</Link>
            <span>Privacy & Security</span>
            <span>Accessibility</span>
          </div>

          <div>
            <h4>Emergency Assistance</h4>
            <strong className="footer-number">1930</strong>
            <span>Cyber Fraud Helpline</span>
            <span>Available 24×7</span>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="citizen-container">
            <span>© 2026 ArthaVyuh · SIH Prototype</span>
            <span>Designed for secure citizen reporting</span>
          </div>
        </div>
      </footer>
    </div>
  );
}