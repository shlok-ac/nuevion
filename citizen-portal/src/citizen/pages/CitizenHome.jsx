import React from "react";
import { Link } from "react-router-dom";
import "../styles/CitizenHome.css";

function IntelligenceGraphic() {
  return (
    <div className="intelligence-visual">

      <div className="visual-grid" />

      <div className="radar-ring radar-one" />
      <div className="radar-ring radar-two" />
      <div className="radar-ring radar-three" />

      <svg
        className="network-svg"
        viewBox="0 0 600 500"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="networkLine"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#ff9933" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#138808" />
          </linearGradient>

          <filter id="softGlow">
            <feGaussianBlur
              stdDeviation="3"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Network connections */}
        <g
          className="network-lines"
          fill="none"
          stroke="url(#networkLine)"
          strokeWidth="1.4"
          opacity="0.7"
        >
          <path d="M300 250 L120 105" />
          <path d="M300 250 L480 105" />
          <path d="M300 250 L100 300" />
          <path d="M300 250 L500 300" />
          <path d="M300 250 L170 420" />
          <path d="M300 250 L430 420" />

          <path d="M120 105 L100 300" />
          <path d="M480 105 L500 300" />
          <path d="M100 300 L170 420" />
          <path d="M500 300 L430 420" />
        </g>

        {/* Animated data paths */}
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="5 12"
          opacity="0.75"
        >
          <path
            className="data-path path-one"
            d="M120 105 L300 250 L500 300"
          />

          <path
            className="data-path path-two"
            d="M170 420 L300 250 L480 105"
          />

          <path
            className="data-path path-three"
            d="M100 300 L300 250 L430 420"
          />
        </g>

        {/* Outer nodes */}
        <g filter="url(#softGlow)">
          <circle
            className="network-node node-one"
            cx="120"
            cy="105"
            r="7"
          />

          <circle
            className="network-node node-two"
            cx="480"
            cy="105"
            r="7"
          />

          <circle
            className="network-node node-three"
            cx="100"
            cy="300"
            r="7"
          />

          <circle
            className="network-node node-four"
            cx="500"
            cy="300"
            r="7"
          />

          <circle
            className="network-node node-five"
            cx="170"
            cy="420"
            r="7"
          />

          <circle
            className="network-node node-six"
            cx="430"
            cy="420"
            r="7"
          />
        </g>
      </svg>

      {/* Central AI Core */}
      <div className="ai-core">

        <div className="core-orbit orbit-one" />
        <div className="core-orbit orbit-two" />

        <div className="core-circle">

          <div className="core-eye">
            <span />
          </div>

          <strong>NI</strong>
          <small>AI CORE</small>

        </div>
      </div>

      {/* Floating intelligence labels */}

      <div className="visual-chip chip-complaint">
        <span className="chip-dot orange" />
        Complaint
      </div>

      <div className="visual-chip chip-network">
        <span className="chip-dot white" />
        Transaction Network
      </div>

      <div className="visual-chip chip-location">
        <span className="chip-dot green" />
        Location
      </div>

      <div className="visual-chip chip-atm">
        <span className="chip-dot red" />
        ATM Risk
      </div>

      <div className="visual-bottom-label">
        <span />
        PREDICT • ANALYSE • INTERVENE
        <span />
      </div>

    </div>
  );
}

function MiniIcon({ type }) {
  if (type === "report") {
    return <span className="mini-icon">↗</span>;
  }

  if (type === "track") {
    return <span className="mini-icon">◉</span>;
  }

  if (type === "login") {
    return <span className="mini-icon">◎</span>;
  }

  return <span className="mini-icon">?</span>;
}

export default function CitizenHome() {
  return (
    <div className="home-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="home-hero">

        <div className="hero-content">

          <div className="hero-badge">
            <span className="badge-pulse" />
            CITIZEN CYBERCRIME INTELLIGENCE PORTAL
          </div>

          <h1>
            Report fraud.
            <br />
            <span>Let intelligence move faster.</span>
          </h1>

          <p>
            Report cyber and financial fraud through a guided
            citizen portal, preserve evidence and track your
            complaint from registration to resolution.
          </p>

          <div className="hero-buttons">

            <Link
              to="/report"
              className="primary-button hero-primary"
            >
              Report Fraud Now
              <span>→</span>
            </Link>

            <Link
              to="/track"
              className="secondary-button hero-secondary"
            >
              Track My Complaint
            </Link>

          </div>

          <div className="hero-trust">

            <div>
              <span>01</span>
              Secure Intake
            </div>

            <div>
              <span>02</span>
              Evidence Ready
            </div>

            <div>
              <span>03</span>
              Complaint Tracking
            </div>

          </div>

        </div>

                <div className="hero-visual-column">

          <div className="hero-graphic-wrapper">
            <IntelligenceGraphic />
          </div>



        </div>
      </section>


      {/* =====================================================
          LIVE-STYLE METRICS
          ===================================================== */}

      <section className="home-metrics">

        <div className="metric-item">
          <strong>50K+</strong>
          <span>Illustrative complaints</span>
        </div>

        <div className="metric-divider" />

        <div className="metric-item">
          <strong>32K+</strong>
          <span>Illustrative resolutions</span>
        </div>

        <div className="metric-divider" />

        <div className="metric-item">
          <strong>18 min</strong>
          <span>Prototype response benchmark</span>
        </div>

        <div className="metric-divider" />

        <div className="metric-item">
          <strong>2.4K</strong>
          <span>Illustrative risk zones</span>
        </div>

      </section>


      {/* =====================================================
          SERVICE HUB
          ===================================================== */}

      <section className="home-section service-section">

        <div className="section-heading enhanced-heading">

          <span>
            CITIZEN SERVICE HUB
          </span>

          <h2>
            What do you need to do?
          </h2>

          <p>
            Start a complaint, follow an existing case or
            find guidance through the citizen help centre.
          </p>

        </div>

        <div className="service-grid">

          <Link
            to="/report"
            className="service-card service-featured"
          >

            <div className="service-card-top">
              <MiniIcon type="report" />

              <span className="service-number">
                01
              </span>
            </div>

            <h3>
              Report Fraud
            </h3>

            <p>
              Submit cybercrime and financial fraud details
              through a guided four-step reporting process.
            </p>

            <div className="service-link">
              Start report
              <span>→</span>
            </div>

          </Link>


          <Link
            to="/track"
            className="service-card"
          >

            <div className="service-card-top">
              <MiniIcon type="track" />

              <span className="service-number">
                02
              </span>
            </div>

            <h3>
              Track Complaint
            </h3>

            <p>
              Check your complaint status using your complaint
              number and registered mobile number.
            </p>

            <div className="service-link">
              Track status
              <span>→</span>
            </div>

          </Link>


          <Link
            to="/login"
            className="service-card"
          >

            <div className="service-card-top">
              <MiniIcon type="login" />

              <span className="service-number">
                03
              </span>
            </div>

            <h3>
              My Complaints
            </h3>

            <p>
              Access your complaint history through the
              registered mobile number.
            </p>

            <div className="service-link">
              View complaints
              <span>→</span>
            </div>

          </Link>


          <Link
            to="/faq"
            className="service-card"
          >

            <div className="service-card-top">
              <MiniIcon type="faq" />

              <span className="service-number">
                04
              </span>
            </div>

            <h3>
              Help & FAQ
            </h3>

            <p>
              Find practical information about reporting,
              evidence and complaint tracking.
            </p>

            <div className="service-link">
              Get help
              <span>→</span>
            </div>

          </Link>

        </div>

      </section>


      {/* =====================================================
          INTELLIGENCE WORKFLOW
          ===================================================== */}

      <section className="workflow-section">

        <div className="section-heading enhanced-heading">

          <span>
            NIRIKSHAN WORKFLOW
          </span>

          <h2>
            From complaint to actionable intelligence
          </h2>

          <p>
            The prototype connects citizen reporting with a
            structured cybercrime intelligence workflow.
          </p>

        </div>

        <div className="workflow">

          <div className="workflow-line" />

          <div className="workflow-step">

            <div className="workflow-icon">
              01
            </div>

            <div>
              <span>
                INTAKE
              </span>

              <h3>
                Complaint
              </h3>

              <p>
                Capture incident, transaction and evidence
                information.
              </p>
            </div>

          </div>


          <div className="workflow-step">

            <div className="workflow-icon">
              02
            </div>

            <div>
              <span>
                ANALYSIS
              </span>

              <h3>
                Financial Network
              </h3>

              <p>
                Organise suspicious transaction relationships
                and account intelligence.
              </p>
            </div>

          </div>


          <div className="workflow-step">

            <div className="workflow-icon">
              03
            </div>

            <div>
              <span>
                LOCATION
              </span>

              <h3>
                Reachability
              </h3>

              <p>
                Connect financial intelligence with geographic
                and movement signals.
              </p>

            </div>

          </div>


          <div className="workflow-step">

            <div className="workflow-icon">
              04
            </div>

            <div>
              <span>
                PREDICTION
              </span>

              <h3>
                ATM Risk
              </h3>

              <p>
                Rank candidate cash-out locations for
                investigative attention.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SECURITY / TRUST
          ===================================================== */}

      <section className="security-panel">

        <div className="security-graphic">

          <div className="security-orbit orbit-a" />
          <div className="security-orbit orbit-b" />

          <div className="security-core">
            <span>✓</span>
          </div>

        </div>

        <div className="security-content">

          <span>
            CITIZEN SAFETY
          </span>

          <h2>
            Preserve evidence.
            <br />
            Protect your information.
          </h2>

          <p>
            Never share OTPs, passwords, PINs or confidential
            authentication information in your complaint.
            Keep transaction records, screenshots and your
            acknowledgement safely stored.
          </p>

          <div className="security-points">

            <div>
              <span>✓</span>
              Guided complaint submission
            </div>

            <div>
              <span>✓</span>
              Evidence-aware reporting
            </div>

            <div>
              <span>✓</span>
              Complaint acknowledgement
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          EMERGENCY
          ===================================================== */}

      <section className="emergency-card">

        <div className="emergency-pulse">
          !
        </div>

        <div>

          <span>
            URGENT FINANCIAL FRAUD?
          </span>

          <h2>
            Act quickly. Call <strong>1930</strong>.
          </h2>

          <p>
            If you have just experienced financial cyber
            fraud, contact the Cyber Fraud Helpline as soon
            as possible.
          </p>

        </div>

        <a
          href="tel:1930"
          className="emergency-button"
        >
          Call 1930
          <span>→</span>
        </a>

      </section>


      {/* =====================================================
          PROTOTYPE
          ===================================================== */}

      <div className="prototype-notice">

        <div className="prototype-mark">
          NI
        </div>

        <div>
          <strong>
            NIRIKSHAN AI · SIH PROTOTYPE
          </strong>

          <span>
            Student-developed prototype for citizen
            cybercrime reporting, complaint tracking and
            predictive cybercrime intelligence.
          </span>
        </div>

      </div>

    </div>
  );
}