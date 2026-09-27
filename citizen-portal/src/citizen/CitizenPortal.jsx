import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import CitizenLayout from "./components/CitizenLayout";
import CitizenHome from "./pages/CitizenHome";
import ReportFraud from "./pages/ReportFraud/ReportFraud";
import Confirmation from "./pages/Confirmation/Confirmation";

function ReportPlaceholder() {
  return <h1 style={{ padding: "40px" }}>Report Fraud</h1>;
}


function TrackPlaceholder() {
  const [complaintId, setComplaintId] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [complaint, setComplaint] = React.useState(null);
  const [error, setError] = React.useState("");

  const DEMO_STATUSES = [
    "Received",
    "Under Investigation",
    "Action Required",
    "Resolved",
  ];

  const getDemoStatus = (complaintNumber) => {
    if (!complaintNumber) return "Received";

    const numbers = String(complaintNumber)
      .replace(/\D/g, "");

    const lastTwo = Number(numbers.slice(-2) || 0);

    return DEMO_STATUSES[lastTwo % DEMO_STATUSES.length];
  };

  const handleTrack = (e) => {
    e.preventDefault();

    setError("");
    setComplaint(null);

    const storedComplaint = localStorage.getItem(
      "nirikshanLatestComplaint"
    );

    if (!storedComplaint) {
      setError(
        "No complaint record found. Please submit a complaint first."
      );
      return;
    }

    try {
      const data = JSON.parse(storedComplaint);

      const enteredId = complaintId.trim().toUpperCase();

      const storedId = String(
        data.complaintNumber || ""
      ).toUpperCase();

      const enteredMobile = mobile.trim();

      const storedMobile = String(
        data.mobile || ""
      ).trim();

      if (
        enteredId !== storedId ||
        enteredMobile !== storedMobile
      ) {
        setError(
          "Complaint ID or mobile number does not match our records."
        );
        return;
      }

      /*
       * DEMO STATUS
       *
       * This is temporary for the SIH prototype.
       * Later this value will come from the backend API.
       */
      const demoStatus = getDemoStatus(
        data.complaintNumber
      );

      setComplaint({
        ...data,
        status: demoStatus,
      });
    } catch (err) {
      console.error("Track complaint error:", err);

      setError(
        "Unable to read the complaint record. Please submit the complaint again."
      );
    }
  };

  const statusOrder = [
    "Received",
    "Under Investigation",
    "Action Required",
    "Resolved",
  ];

  const currentStatusIndex = complaint
    ? statusOrder.indexOf(complaint.status)
    : -1;

  return (
    <div className="track-page">
      <div className="citizen-container">

        <div className="track-card">

          <span className="confirmation-kicker">
            COMPLAINT TRACKING
          </span>

          <h1>Track Your Complaint</h1>

          <p className="track-description">
            Enter your complaint number and registered
            mobile number to check the current status
            of your complaint.
          </p>

          <form onSubmit={handleTrack}>

            <div className="track-field">
              <label htmlFor="complaint-id">
                Complaint Number
              </label>

              <input
                id="complaint-id"
                type="text"
                placeholder="Example: CYB-2026-12345"
                value={complaintId}
                onChange={(e) =>
                  setComplaintId(e.target.value)
                }
                required
              />
            </div>

            <div className="track-field">
              <label htmlFor="track-mobile">
                Registered Mobile Number
              </label>

              <input
                id="track-mobile"
                type="tel"
                inputMode="numeric"
                maxLength="10"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                required
              />
            </div>

            {error && (
              <div className="track-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="track-submit-button"
            >
              Track Complaint
            </button>

          </form>

          {complaint && (
            <div className="track-result">

              <div className="track-result-header">

                <div>
                  <span>Complaint Number</span>

                  <strong>
                    {complaint.complaintNumber}
                  </strong>
                </div>

                <span className="track-status">
                  {complaint.status}
                </span>

              </div>

              <div className="track-demo-notice">
                <strong>SIH Prototype</strong>

                <span>
                  Status shown here is demo data for the
                  current prototype. It will be connected
                  to the live backend status later.
                </span>
              </div>

              <div className="track-timeline">

                {statusOrder.map(
                  (status, index) => {

                    const isActive =
                      index <= currentStatusIndex;

                    return (
                      <div
                        key={status}
                        className={`timeline-item ${
                          isActive
                            ? "active"
                            : ""
                        }`}
                      >

                        <span className="timeline-dot" />

                        <div>

                          <strong>
                            {status}
                          </strong>

                          <p>
                            {status ===
                              "Received" &&
                              "Your complaint has been successfully received."}

                            {status ===
                              "Under Investigation" &&
                              "The complaint is being reviewed by the concerned team."}

                            {status ===
                              "Action Required" &&
                              "Additional information may be requested if required."}

                            {status ===
                              "Resolved" &&
                              "The complaint has been resolved."}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

              <div className="track-summary">

                <h2>Complaint Summary</h2>

                <div className="track-summary-grid">

                  <div>
                    <span>Applicant</span>

                    <strong>
                      {complaint.fullName ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Mobile</span>

                    <strong>
                      {complaint.mobile ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Incident Date</span>

                    <strong>
                      {complaint.incidentDate ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Fraud Amount</span>

                    <strong>
                      INR{" "}
                      {complaint.fraudAmount ||
                        "0"}
                    </strong>
                  </div>

                  <div>
                    <span>Transaction Type</span>

                    <strong>
                      {complaint.transactionType ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Bank</span>

                    <strong>
                      {complaint.bankName ||
                        "Not available"}
                    </strong>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function MyComplaints() {
  const navigate = useNavigate();
  const [complaint, setComplaint] = React.useState(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("nirikshanLatestComplaint");
      if (saved) setComplaint(JSON.parse(saved));
    } catch (error) {
      console.error("Unable to load complaint:", error);
    }
  }, []);

  const getDemoStatus = (complaintNumber) => {
    const statuses = [
      "Received",
      "Under Investigation",
      "Action Required",
      "Resolved"
    ];

    const numbers = String(complaintNumber || "").replace(/\D/g, "");
    const lastTwo = Number(numbers.slice(-2) || 0);

    return statuses[lastTwo % statuses.length];
  };

  if (!complaint) {
    return (
      <section className="track-page complaints-page">
        <div className="track-card complaints-empty">
          <div className="track-icon">✓</div>
          <h1>No complaints found</h1>
          <p>
            You have not submitted a complaint from this browser yet.
          </p>

          <button
            className="primary-button"
            onClick={() => navigate("/report")}
          >
            Report Fraud
          </button>
        </div>
      </section>
    );
  }

  const status = getDemoStatus(complaint.complaintNumber);

  return (
    <section className="track-page complaints-page">
      <div className="track-header">
        <span className="eyebrow">CITIZEN SERVICES</span>

        <h1>My Complaints</h1>

        <p>
          View your submitted cyber fraud complaint, acknowledgement and
          current prototype status.
        </p>
      </div>

      <div className="track-card complaint-record">

        {/* COMPLAINT OVERVIEW */}
        <div className="complaint-section-heading">
          <span>01</span>
          <div>
            <h3>Complaint Overview</h3>
            <p>Reference number and current complaint status</p>
          </div>
        </div>

        <div className="complaint-record-top">
          <div>
            <span className="field-label">Complaint Number</span>
            <h2>{complaint.complaintNumber}</h2>
          </div>

          <div className="complaint-status-block">
            <span className="field-label">Current Status</span>
            <span className="status-badge">{status}</span>
          </div>
        </div>

        {/* COMPLAINT DETAILS */}
        <div className="complaint-section-heading">
          <span>02</span>
          <div>
            <h3>Complaint Details</h3>
            <p>Information submitted with your complaint</p>
          </div>
        </div>

        <div className="complaint-details-grid">
          <div>
            <span>Applicant</span>
            <strong>{complaint.fullName || "—"}</strong>
          </div>

          <div>
            <span>Mobile</span>
            <strong>{complaint.mobile || "—"}</strong>
          </div>

          <div>
            <span>Incident Date</span>
            <strong>{complaint.incidentDate || "—"}</strong>
          </div>

          <div>
            <span>Fraud Amount</span>
            <strong>₹{complaint.fraudAmount || "0"}</strong>
          </div>

          <div>
            <span>Bank / Institution</span>
            <strong>{complaint.bankName || "—"}</strong>
          </div>

          <div>
            <span>Transaction Type</span>
            <strong>{complaint.transactionType || "—"}</strong>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="complaint-section-heading">
          <span>03</span>
          <div>
            <h3>Available Actions</h3>
            <p>Manage and access services related to this complaint</p>
          </div>
        </div>

        <div className="complaint-action-grid">
          <button
            className="complaint-action-card"
            onClick={() => navigate("/track")}
          >
            <span className="complaint-action-icon">01</span>
            <span>
              <strong>Track Complaint</strong>
              <small>
                Check the complaint timeline and view its current status.
              </small>
            </span>
            <b>→</b>
          </button>

          <button
            className="complaint-action-card"
            onClick={() =>
              navigate(
                `/complaint/${complaint.complaintNumber}/confirmation`
              )
            }
          >
            <span className="complaint-action-icon">02</span>
            <span>
              <strong>View Acknowledgement</strong>
              <small>
                Review your submitted details and acknowledgement record.
              </small>
            </span>
            <b>→</b>
          </button>

          <button
            className="complaint-action-card"
            onClick={() => navigate("/report")}
          >
            <span className="complaint-action-icon">03</span>
            <span>
              <strong>Report Another Fraud</strong>
              <small>
                Start a new complaint for a separate cyber fraud incident.
              </small>
            </span>
            <b>→</b>
          </button>
        </div>

        {/* WHAT HAPPENS NEXT */}
        <div className="complaint-section-heading">
          <span>04</span>
          <div>
            <h3>What Happens Next</h3>
            <p>Typical stages after a cyber fraud complaint is submitted</p>
          </div>
        </div>

        <div className="complaint-next-steps">
          <div>
            <span>01</span>
            <div>
              <strong>Complaint Received</strong>
              <p>
                Your complaint is registered with a unique complaint number
                for reference.
              </p>
            </div>
          </div>

          <div>
            <span>02</span>
            <div>
              <strong>Verification &amp; Investigation</strong>
              <p>
                The information submitted with the complaint can be reviewed
                as part of the investigation process.
              </p>
            </div>
          </div>

          <div>
            <span>03</span>
            <div>
              <strong>Status Updates</strong>
              <p>
                The complaint may progress through different investigation
                stages as action is taken.
              </p>
            </div>
          </div>

          <div>
            <span>04</span>
            <div>
              <strong>Further Action</strong>
              <p>
                If additional information is required, the citizen may be
                asked to provide it.
              </p>
            </div>
          </div>
        </div>

        <p className="prototype-note">
          <strong>SIH Prototype:</strong> Complaint information and status are
          currently stored locally for demonstration. Live backend tracking
          will be connected later.
        </p>
      </div>
    </section>
  );
}

function FAQPlaceholder() {
  const [openIndex, setOpenIndex] = React.useState(null);

  const faqs = [
    {
      question: "What types of cybercrime can I report?",
      answer:
        "You can use this portal to report cyber and financial fraud incidents such as UPI fraud, online banking fraud, card fraud, ATM-related fraud, unauthorized transactions, and other cybercrime incidents.",
    },
    {
      question: "What should I do immediately after a financial cyber fraud?",
      answer:
        "If you have recently lost money through financial cyber fraud, immediately contact the Cyber Fraud Helpline 1930. You should also preserve transaction details, messages, screenshots, emails and other relevant evidence.",
    },
    {
      question: "What information is required to register a complaint?",
      answer:
        "You will generally need your name and mobile number, incident details, incident date, transaction information such as bank and transaction type, the amount involved, and any available supporting evidence.",
    },
    {
      question: "Can I upload screenshots or documents as evidence?",
      answer:
        "Yes. The prototype allows supporting evidence in JPG, PNG or PDF format. Each file can be up to 5 MB, and multiple files can be selected.",
    },
    {
      question: "How can I track my complaint?",
      answer:
        "Use the Track Complaint option and enter your complaint number along with the registered mobile number. The portal will display the current complaint status and tracking timeline.",
    },
    {
      question: "What does 'Received' mean?",
      answer:
        "Received means that your complaint has been successfully registered by the portal and is awaiting further investigation or processing.",
    },
    {
      question: "Should I share my OTP, PIN or password in the complaint?",
      answer:
        "No. Never share OTPs, passwords, PINs or other confidential authentication information in the complaint description or with anyone claiming to provide support.",
    },
    {
      question: "What should I keep after submitting a complaint?",
      answer:
        "Keep your complaint number and acknowledgement PDF safely. Your complaint number can be used to track future updates.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(
      openIndex === index ? null : index
    );
  };

  return (
    <div className="faq-page">
      <div className="citizen-container">

        <div className="faq-heading">
          <span className="confirmation-kicker">
            HELP & INFORMATION
          </span>

          <h1>Frequently Asked Questions</h1>

          <p>
            Find answers to common questions about
            reporting cybercrime, submitting evidence
            and tracking your complaint.
          </p>
        </div>

        <div className="faq-list">

          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                className={`faq-item ${
                  isOpen ? "open" : ""
                }`}
                key={faq.question}
              >

                <button
                  type="button"
                  className="faq-question"
                  onClick={() =>
                    toggleFAQ(index)
                  }
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>
                    {faq.question}
                  </span>

                  <span
                    className="faq-icon"
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="faq-answer"
                  >
                    <p>{faq.answer}</p>
                  </div>
                )}

              </div>
            );
          })}

        </div>

        <div className="faq-emergency">

          <div>
            <strong>
              Need urgent financial fraud assistance?
            </strong>

            <p>
              If money has been lost through a
              financial cyber fraud, contact the
              Cyber Fraud Helpline immediately.
            </p>
          </div>

          <strong className="faq-helpline">
            1930
          </strong>

        </div>

      </div>
    </div>
  );
}

function LoginPlaceholder() {
  const [mobile, setMobile] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [error, setError] = React.useState("");

  const sendOTP = () => {
    setError("");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setOtpSent(true);
  };

  const verifyOTP = () => {
    setError("");

    if (otp !== "1234") {
      setError("Invalid OTP. For this prototype, use 1234.");
      return;
    }

    localStorage.setItem(
      "arthavyuhCitizenLogin",
      JSON.stringify({
        mobile,
        loggedIn: true,
        loggedInAt: new Date().toISOString(),
      })
    );

    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("arthavyuhCitizenLogin");
    setMobile("");
    setOtp("");
    setOtpSent(false);
    setLoggedIn(false);
    setError("");
  };

  if (loggedIn) {
    return (
      <div
        style={{
          minHeight: "60vh",
          padding: "60px 20px",
          background: "#F3F5F8",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            background: "#fff",
            padding: "36px",
            borderRadius: "10px",
            border: "1px solid #DCE2EA",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "50%",
              background: "#EAF6EE",
              color: "#138808",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "700",
              marginBottom: "18px",
            }}
          >
            ✓
          </div>

          <h1
            style={{
              color: "#0A3161",
              marginBottom: "8px",
            }}
          >
            Citizen Login Successful
          </h1>

          <p
            style={{
              color: "#5B6472",
              marginBottom: "24px",
            }}
          >
            You are logged in to the ArthaVyuh Citizen Portal.
          </p>

          <div
            style={{
              background: "#F3F5F8",
              padding: "14px 16px",
              borderRadius: "6px",
              marginBottom: "24px",
            }}
          >
            <strong>Registered Mobile</strong>
            <br />
            <span style={{ color: "#5B6472" }}>
              {mobile}
            </span>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "5px",
              background: "#0A3161",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        padding: "60px 20px",
        background: "#F3F5F8",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          background: "#fff",
          padding: "36px",
          borderRadius: "10px",
          border: "1px solid #DCE2EA",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1
          style={{
            color: "#0A3161",
            marginBottom: "8px",
          }}
        >
          Citizen Login
        </h1>

        <p
          style={{
            color: "#5B6472",
            marginBottom: "28px",
          }}
        >
          Login using your registered mobile number.
        </p>

        <label
          style={{
            display: "block",
            fontWeight: "700",
            marginBottom: "8px",
            color: "#1C2230",
          }}
        >
          Mobile Number
        </label>

        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter 10-digit mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value.replace(/\D/g, ""))
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px",
            border: "1px solid #DCE2EA",
            borderRadius: "5px",
            fontSize: "15px",
            marginBottom: "14px",
          }}
        />

        {!otpSent ? (
          <button
            onClick={sendOTP}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "5px",
              background: "#0A3161",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Send OTP
          </button>
        ) : (
          <>
            <label
              style={{
                display: "block",
                fontWeight: "700",
                marginBottom: "8px",
                marginTop: "18px",
                color: "#1C2230",
              }}
            >
              Enter OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px",
                border: "1px solid #DCE2EA",
                borderRadius: "5px",
                fontSize: "15px",
                marginBottom: "14px",
                letterSpacing: "4px",
              }}
            />

            <button
              onClick={verifyOTP}
              style={{
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "5px",
                background: "#138808",
                color: "#fff",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Verify OTP
            </button>

            <button
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setError("");
              }}
              style={{
                width: "100%",
                padding: "11px",
                marginTop: "10px",
                border: "1px solid #DCE2EA",
                borderRadius: "5px",
                background: "#fff",
                color: "#0A3161",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Change Mobile Number
            </button>
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "11px 13px",
              borderRadius: "5px",
              background: "#FDEDEC",
              color: "#C0392B",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: "24px",
            padding: "12px",
            background: "#FFF8ED",
            borderLeft: "3px solid #FF9933",
            color: "#5B6472",
            fontSize: "13px",
          }}
        >
          <strong>SIH Prototype:</strong> OTP authentication is simulated
          for demonstration. Use <strong>1234</strong> as the OTP.
        </div>
      </div>
    </div>
  );
}

function ConfirmationPlaceholder() {
  return <h1 style={{ padding: "40px" }}>Complaint Confirmation</h1>;
}

export default function CitizenPortal() {
  return (
    <Routes>
      <Route element={<CitizenLayout />}>
        <Route path="/" element={<CitizenHome />} />
        <Route path="/report" element={<ReportFraud />} />
        <Route path="/track" element={<TrackPlaceholder />} />
          <Route path="/complaints" element={<MyComplaints />} />
        <Route path="/faq" element={<FAQPlaceholder />} />
        <Route path="/login" element={<LoginPlaceholder />} />
        <Route
 	 path="/complaint/:id/confirmation"
	 element={<Confirmation />}
	/>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}