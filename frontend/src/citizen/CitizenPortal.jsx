import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
      enteredId === storedId &&
      enteredMobile === storedMobile
    ) {
      setComplaint(data);
    } else {
      setError(
        "Complaint ID or mobile number does not match our records."
      );
    }
  };

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
                  {complaint.status || "Received"}
                </span>
              </div>

              <div className="track-timeline">

                <div className="timeline-item active">
                  <span className="timeline-dot" />

                  <div>
                    <strong>Received</strong>
                    <p>
                      Your complaint has been received.
                    </p>
                  </div>
                </div>

                <div
                  className={`timeline-item ${
                    complaint.status ===
                      "Under Investigation" ||
                    complaint.status ===
                      "Action Required" ||
                    complaint.status ===
                      "Resolved"
                      ? "active"
                      : ""
                  }`}
                >
                  <span className="timeline-dot" />

                  <div>
                    <strong>
                      Under Investigation
                    </strong>

                    <p>
                      Complaint is being reviewed by
                      the concerned team.
                    </p>
                  </div>
                </div>

                <div
                  className={`timeline-item ${
                    complaint.status ===
                      "Action Required" ||
                    complaint.status === "Resolved"
                      ? "active"
                      : ""
                  }`}
                >
                  <span className="timeline-dot" />

                  <div>
                    <strong>
                      Action Required
                    </strong>

                    <p>
                      Additional information may be
                      requested if required.
                    </p>
                  </div>
                </div>

                <div
                  className={`timeline-item ${
                    complaint.status === "Resolved"
                      ? "active"
                      : ""
                  }`}
                >
                  <span className="timeline-dot" />

                  <div>
                    <strong>Resolved</strong>

                    <p>
                      The complaint has been resolved.
                    </p>
                  </div>
                </div>

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

                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
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
  return <h1 style={{ padding: "40px" }}>Login</h1>;
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