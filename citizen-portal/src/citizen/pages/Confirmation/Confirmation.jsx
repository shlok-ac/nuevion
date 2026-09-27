import React from "react";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "./Confirmation.css";

export default function Confirmation() {
  const { id } = useParams();

  const storedComplaint = localStorage.getItem(
    "nirikshanLatestComplaint"
  );

  const complaint = storedComplaint
    ? JSON.parse(storedComplaint)
    : null;

    const downloadPDF = async () => {
    if (!complaint) return;

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 20;

   // =========================
// ARTHAVYUH LOGO
// =========================
const loadLogo = () =>
  new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = "/assets/arthavyuh-logo.png";
  });

    

	// =========================
// COMPACT HEADER
// =========================

// White header — no full-width tricolor stripe
doc.setFillColor(255, 255, 255);
doc.rect(0, 0, pageWidth, 40, "F");

// =========================
// ARTHAVYUH LOGO
// =========================

const logo = await loadLogo();

doc.addImage(
  logo,
  "PNG",
  margin,
  8,
  18,
  18
);

// =========================
// ARTHAVYUH BRAND
// =========================

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(15);

doc.text(
  "ArthaVyuh",
  margin + 23,
  15
);

doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);

doc.setTextColor(70, 70, 70);

doc.text(
  "National Cybercrime Reporting Portal",
  margin + 23,
  22
);

doc.setFont("helvetica", "bold");
doc.setFontSize(6.5);

doc.text(
  "SIH PROTOTYPE",
  margin + 23,
  29
);

// =========================
// A SAFER DIGITAL INDIA LOGO
// =========================

const loadSaferIndiaLogo = () =>
  new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = "/assets/safer-digital-india.png";
  });

const saferIndiaLogo = await loadSaferIndiaLogo();

doc.addImage(
  saferIndiaLogo,
  "PNG",
  pageWidth - margin - 32,
  6,
  28,
  32
);

// =========================
// HEADER DIVIDER
// =========================

doc.setDrawColor(210, 215, 220);
doc.setLineWidth(0.5);

doc.line(
  margin,
  38,
  pageWidth - margin,
  38
);

// =========================
// DOCUMENT TITLE
// =========================

y = 50;

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(17);

doc.text(
  "Cybercrime Complaint Acknowledgement",
  margin,
  y
);


// =========================
// PAGE 1 — COMPLAINT RECEIPT
// =========================

// =========================
// COMPLAINT ID CARD
// =========================

y = 68;

doc.setFillColor(243, 248, 253);
doc.setDrawColor(205, 220, 235);
doc.setLineWidth(0.6);

doc.roundedRect(
  margin,
  y,
  pageWidth - margin * 2,
  29,
  3,
  3,
  "FD"
);

// Complaint number
doc.setTextColor(91, 100, 114);
doc.setFont("helvetica", "bold");
doc.setFontSize(7.5);

doc.text(
  "COMPLAINT NUMBER",
  margin + 8,
  y + 10
);

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(13);

doc.text(
  complaint.complaintNumber || id,
  margin + 8,
  y + 21
);

// Clean RECEIVED status
doc.setDrawColor(30, 132, 73);
doc.setLineWidth(0.7);

doc.roundedRect(
  pageWidth - margin - 42,
  y + 7,
  34,
  12,
  2,
  2,
  "S"
);

doc.setTextColor(30, 100, 55);
doc.setFont("helvetica", "bold");
doc.setFontSize(7.5);

doc.text(
  "RECEIVED",
  pageWidth - margin - 25,
  y + 14.5,
  { align: "center" }
);

y += 38;


// =========================
// COMPACT SECTION FUNCTION
// =========================

let sectionNumber = 0;

const addSectionTitle = (title) => {

  sectionNumber += 1;

  doc.setFillColor(225, 239, 255);
  doc.setDrawColor(190, 215, 240);
  doc.setLineWidth(0.45);

  // Compact light-blue heading
  doc.roundedRect(
    margin,
    y,
    pageWidth - margin * 2,
    11,
    2,
    2,
    "FD"
  );

// Section number + title
doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(8.5);

doc.text(
  `${sectionNumber}. ${title.toUpperCase()}`,
  margin + 6,
  y + 7.8
);
  y += 16;
};

// =========================
// FIELD FUNCTION
// =========================

const addField = (label, value) => {

  const safeValue =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
      ? String(value)
      : "Not provided";

  const lines = doc.splitTextToSize(
    safeValue,
    pageWidth - margin * 2 - 82
  );

  doc.setTextColor(28, 34, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text(
    label,
    margin + 10,
    y
  );

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  doc.text(
    ":",
    margin + 74,
    y
  );

  doc.setFontSize(8);

  doc.text(
    lines,
    margin + 82,
    y
  );

  y += Math.max(
    6,
    lines.length * 4.5 + 2
  );
};


// =========================
// PERSONAL DETAILS
// =========================

addSectionTitle("Personal Details");

addField(
  "Full Name",
  complaint.fullName
);

addField(
  "Mobile Number",
  complaint.mobile
);

addField(
  "Email",
  complaint.email
);

y += 3;


// =========================
// INCIDENT DETAILS
// =========================

addSectionTitle("Incident Details");

addField(
  "Description",
  complaint.description
);

addField(
  "Incident Date",
  complaint.incidentDate
);

addField(
  "Incident Time",
  complaint.incidentTime
);

addField(
  "Location",
  complaint.location
);

y += 3;


// =========================
// FRAUD DETAILS
// =========================

addSectionTitle("Fraud Details");

addField(
  "Fraud Amount",
  complaint.fraudAmount
    ? `INR ${complaint.fraudAmount}`
    : "Not provided"
);

addField(
  "Transaction Type",
  complaint.transactionType
);

addField(
  "Bank Name",
  complaint.bankName
);
 
// =========================
// PAGE 2 — TRANSACTION & EVIDENCE
// =========================

doc.addPage();

// =========================
// PAGE 2 HEADER
// =========================

doc.setFillColor(255, 255, 255);
doc.rect(0, 0, pageWidth, 40, "F");

// ArthaVyuh logo
doc.addImage(
  logo,
  "PNG",
  margin,
  8,
  18,
  18
);

// ArthaVyuh name
doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(15);

doc.text(
  "ArthaVyuh",
  margin + 23,
  15
);

// Portal name
doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);

doc.setTextColor(70, 70, 70);

doc.text(
  "National Cybercrime Reporting Portal",
  margin + 23,
  22
);

// SIH Prototype
doc.setFont("helvetica", "bold");
doc.setFontSize(6.5);

doc.text(
  "SIH PROTOTYPE",
  margin + 23,
  29
);

// A Safer Digital India logo
doc.addImage(
  saferIndiaLogo,
  "PNG",
  pageWidth - margin - 32,
  6,
  28,
  32
);

// Header divider
doc.setDrawColor(210, 215, 220);
doc.setLineWidth(0.5);

doc.line(
  margin,
  38,
  pageWidth - margin,
  38
);

y = 48;


// =========================
// TRANSACTION DETAILS
// =========================

addSectionTitle("Transaction Details");

addField(
  "Bank Name",
  complaint.bankName
);

addField(
  "Account Number",
  complaint.accountNumber
);

addField(
  "Transaction ID / UTR",
  complaint.transactionId
);

addField(
  "Transaction Type",
  complaint.transactionType
);

addField(
  "Fraud Amount",
  complaint.fraudAmount
    ? `INR ${complaint.fraudAmount}`
    : "Not provided"
);

y += 4;


// =========================
// EVIDENCE & LOCATION
// =========================

addSectionTitle("Evidence & Location");

addField(
  "Location",
  complaint.location
);

const evidenceFiles = Array.isArray(
  complaint.evidence
)
  ? complaint.evidence
  : [];

if (evidenceFiles.length === 0) {

  addField(
    "Evidence",
    "No evidence uploaded"
  );

} else {

  addField(
    "Evidence Count",
    `${evidenceFiles.length} file(s)`
  );

  evidenceFiles.forEach((file, index) => {

    const sizeKB = file.size
      ? `${Math.round(file.size / 1024)} KB`
      : "Size unavailable";

    addField(
      `Evidence ${index + 1}`,
      `${file.name || "Unnamed file"} (${sizeKB})`
    );

  });
}

y += 4;


// =========================
// COMPLAINT STATUS
// =========================

addSectionTitle("Complaint Status");

addField(
  "Current Status",
  complaint.status || "Received"
);

addField(
  "Complaint Number",
  complaint.complaintNumber || id
);

addField(
  "Submitted On",
  complaint.submittedAt
    ? new Date(complaint.submittedAt).toLocaleString("en-IN")
    : "Not provided"
);

addField(
  "Assigned Officer",
  complaint.assignedOfficer || "Not assigned"
);

y += 4;


// =========================
// NEXT STEPS
// =========================

addSectionTitle("Next Steps");

addField(
  "Tracking",
  "Use your complaint number and registered mobile number to track the complaint."
);

addField(
  "Financial Fraud",
  "For urgent financial cyber fraud, contact 1930 immediately."
);

// =========================
// PAGE 3 — IMPORTANT INFORMATION
// =========================

doc.addPage();

// =========================
// PAGE 3 HEADER
// =========================

doc.setFillColor(255, 255, 255);
doc.rect(0, 0, pageWidth, 40, "F");

// ArthaVyuh logo
doc.addImage(
  logo,
  "PNG",
  margin,
  8,
  18,
  18
);

// ArthaVyuh name
doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(15);

doc.text(
  "ArthaVyuh",
  margin + 23,
  15
);

// Portal name
doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);

doc.setTextColor(70, 70, 70);

doc.text(
  "National Cybercrime Reporting Portal",
  margin + 23,
  22
);

// SIH Prototype
doc.setFont("helvetica", "bold");
doc.setFontSize(6.5);

doc.text(
  "SIH PROTOTYPE",
  margin + 23,
  29
);

// A Safer Digital India
doc.addImage(
  saferIndiaLogo,
  "PNG",
  pageWidth - margin - 32,
  6,
  28,
  32
);

// Divider
doc.setDrawColor(210, 215, 220);
doc.setLineWidth(0.5);

doc.line(
  margin,
  38,
  pageWidth - margin,
  38
);

y = 50;


// =========================
// PAGE 3 TITLE
// =========================

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(14);

doc.text(
  "Important Information",
  margin,
  y
);

y += 15;


// =========================
// IMPORTANT NOTICE
// =========================

doc.setFillColor(243, 248, 253);
doc.setDrawColor(205, 220, 235);
doc.setLineWidth(0.6);

doc.roundedRect(
  margin,
  y,
  pageWidth - margin * 2,
  32,
  3,
  3,
  "FD"
);

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(9);

doc.text(
  "IMPORTANT",
  margin + 7,
  y + 9
);

doc.setTextColor(91, 100, 114);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);

const notice =
  "For urgent financial cyber fraud, contact the Cyber Fraud Helpline 1930 immediately. Keep this acknowledgement and your complaint number for future tracking.";

const noticeLines = doc.splitTextToSize(
  notice,
  pageWidth - margin * 2 - 14
);

doc.text(
  noticeLines,
  margin + 7,
  y + 17
);

y += 45;




// =========================
// TRACKING INFORMATION
// =========================

addSectionTitle("Tracking Information");

addField(
  "Complaint Number",
  complaint.complaintNumber || id
);

addField(
  "Current Status",
  complaint.status || "Received"
);

addField(
  "Registered Mobile",
  complaint.mobile
);

addField(
  "Tracking",
  "Use the complaint number and registered mobile number to track your complaint."
);

y += 5;

// =========================
// HELPLINE
// =========================

doc.setFillColor(243, 248, 253);
doc.setDrawColor(205, 220, 235);

doc.roundedRect(
  margin,
  y,
  pageWidth - margin * 2,
  25,
  3,
  3,
  "FD"
);

doc.setTextColor(10, 49, 97);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);

doc.text(
  "Cyber Fraud Helpline: 1930",
  margin + 8,
  y + 10
);

doc.setTextColor(91, 100, 114);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);

doc.text(
  "Available 24×7 for urgent financial cyber fraud assistance.",
  margin + 8,
  y + 18
);

y += 38;


// =========================
// NOTICE
// =========================

doc.setTextColor(91, 100, 114);
doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);

const computerNotice =
  "This is a computer-generated acknowledgement issued by the ArthaVyuh SIH Prototype. Please retain this document for your records.";

const computerLines = doc.splitTextToSize(
  computerNotice,
  pageWidth - margin * 2
);

doc.text(
  computerLines,
  margin,
  y
);


// =========================
// FOOTER — ALL PAGES
// =========================

const totalPages = doc.internal.getNumberOfPages();

for (let page = 1; page <= totalPages; page++) {
  doc.setPage(page);

  const footerY = pageHeight - 12;

  doc.setDrawColor(210, 218, 228);
  doc.setLineWidth(0.5);

  doc.line(
    margin,
    footerY - 5,
    pageWidth - margin,
    footerY - 5
  );

  // Left footer
  doc.setTextColor(10, 49, 97);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);

  doc.text(
    "ArthaVyuh",
    margin,
    footerY
  );

  doc.setTextColor(91, 100, 114);
  doc.setFont("helvetica", "normal");

  doc.text(
    " | National Cybercrime Reporting Portal | SIH Prototype",
    margin + 25,
    footerY
  );

  // Right footer
  doc.setTextColor(10, 49, 97);
  doc.setFont("helvetica", "bold");

  doc.text(
    "Cyber Fraud Helpline: 1930",
    pageWidth - margin,
    footerY,
    { align: "right" }
  );
}

    doc.save(
      `${complaint.complaintNumber || id}.pdf`
    );
  };



  return (
    <div className="confirmation-page">
      <div className="citizen-container">

        <div className="confirmation-card">

          <div className="success-icon">
            ✓
          </div>

          <span className="confirmation-kicker">
            COMPLAINT REGISTERED
          </span>

          <h1>
            Your complaint has been received
          </h1>

          <p className="confirmation-message">
            Your cybercrime complaint has been
            successfully registered. Please keep
            your complaint number for tracking
            future updates.
          </p>

          <div className="complaint-number-box">
            <span>
              COMPLAINT NUMBER
            </span>

            <strong>
              {id}
            </strong>
          </div>

          <div className="status-box">
            <span className="status-dot" />

            <div>
              <strong>
                Received
              </strong>

              <p>
                Your complaint has been
                received and is awaiting
                investigation.
              </p>
            </div>
          </div>

          <div className="confirmation-summary">

            <h2>
              Complaint Summary
            </h2>

            <div className="summary-grid">

              <div>
                <span>Applicant</span>
                <strong>
                  {complaint?.fullName ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Mobile</span>
                <strong>
                  {complaint?.mobile ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Fraud Type</span>
                <strong>
                  {complaint?.transactionType ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Fraud Amount</span>
                <strong>
                  ₹
                  {complaint?.fraudAmount ||
                    "0"}
                </strong>
              </div>

              <div>
                <span>Incident Date</span>
                <strong>
                  {complaint?.incidentDate ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  {complaint?.location ||
                    "Not provided"}
                </strong>
              </div>

            </div>
          </div>

          <div className="confirmation-actions">

            <button
              type="button"
              className="download-pdf-button"
              onClick={downloadPDF}
            >
              ↓ Download Complaint PDF
            </button>

            <Link
              to={`/track?complaint=${id}`}
              className="track-button"
            >
              Track Complaint
            </Link>

          </div>

          <div className="confirmation-help">
            <strong>
              Need urgent financial fraud assistance?
            </strong>

            <p>
              Call the Cyber Fraud Helpline
              <strong> 1930</strong> immediately.
            </p>
          </div>

          <Link
            to="/"
            className="back-home"
          >
            ← Return to Citizen Portal
          </Link>

        </div>

      </div>
    </div>
  );
}