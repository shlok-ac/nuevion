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

    const downloadPDF = () => {
    if (!complaint) return;

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 20;

    // =========================
    // NIRIKSHAN AI SEAL
    // =========================
    const drawSeal = (x, yPos, size = 22) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 153, 51);
      doc.setLineWidth(1.5);
      doc.circle(x, yPos, size / 2, "FD");

      doc.setDrawColor(19, 136, 8);
      doc.setLineWidth(0.8);
      doc.circle(x, yPos, size / 2 - 3, "S");

      doc.setFillColor(10, 49, 97);
      doc.circle(x, yPos, 4, "F");

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.line(x - 3, yPos, x + 3, yPos);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.setTextColor(10, 49, 97);
      doc.text(
        "NIRIKSHAN",
        x,
        yPos + 8,
        { align: "center" }
      );
    };

    // =========================
    // TOP TRICOLOUR STRIP
    // =========================
    doc.setFillColor(255, 153, 51);
    doc.rect(0, 0, pageWidth / 3, 4, "F");

    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth / 3, 0, pageWidth / 3, 4, "F");

    doc.setFillColor(19, 136, 8);
    doc.rect((pageWidth / 3) * 2, 0, pageWidth / 3, 4, "F");

    // =========================
    // HEADER
    // =========================
    doc.setFillColor(10, 49, 97);
    doc.rect(0, 4, pageWidth, 38, "F");

    drawSeal(margin + 10, 23, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);

    doc.text(
      "NIRIKSHAN AI",
      margin + 28,
      20
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    doc.text(
      "National Cybercrime Reporting Portal",
      margin + 28,
      28
    );

    doc.setFontSize(7);
    doc.text(
      "SIH PROTOTYPE",
      margin + 28,
      35
    );

    // =========================
    // DOCUMENT TITLE
    // =========================
    y = 57;

    doc.setTextColor(10, 49, 97);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);

    doc.text(
      "Cybercrime Complaint",
      margin,
      y
    );

    doc.text(
      "Acknowledgement",
      margin,
      y + 8
    );

    // =========================
    // COMPLAINT ID CARD
    // =========================
    y += 20;

    doc.setFillColor(243, 245, 248);
    doc.setDrawColor(220, 226, 234);

    doc.roundedRect(
      margin,
      y,
      pageWidth - margin * 2,
      30,
      3,
      3,
      "FD"
    );

    doc.setTextColor(91, 100, 114);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    doc.text(
      "COMPLAINT NUMBER",
      margin + 8,
      y + 10
    );

    doc.setTextColor(10, 49, 97);
    doc.setFontSize(14);

    doc.text(
      complaint.complaintNumber || id,
      margin + 8,
      y + 21
    );

    // Status badge
    doc.setFillColor(30, 132, 73);

    doc.roundedRect(
      pageWidth - margin - 43,
      y + 7,
      35,
      12,
      3,
      3,
      "F"
    );

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);

    doc.text(
      "RECEIVED",
      pageWidth - margin - 25.5,
      y + 14.5,
      { align: "center" }
    );

    y += 42;

    // =========================
    // SECTION FUNCTION
    // =========================
    const addSectionTitle = (title) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(10, 49, 97);
      doc.roundedRect(
        margin,
        y,
        pageWidth - margin * 2,
        9,
        2,
        2,
        "F"
      );

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      doc.text(
        title.toUpperCase(),
        margin + 5,
        y + 6
      );

      y += 15;
    };

    // =========================
    // FIELD FUNCTION
    // =========================
    const addField = (label, value) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(28, 34, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text(
        `${label}:`,
        margin,
        y
      );

      doc.setFont("helvetica", "normal");

      const safeValue =
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
          ? String(value)
          : "Not provided";

      const lines = doc.splitTextToSize(
        safeValue,
        pageWidth - margin * 2 - 50
      );

      doc.text(
        lines,
        margin + 50,
        y
      );

      y += Math.max(
        7,
        lines.length * 5 + 2
      );
    };

    // =========================
    // PERSONAL DETAILS
    // =========================
    addSectionTitle("1. Personal Details");

    addField(
      "Full Name",
      complaint.fullName
    );

    addField(
      "Mobile",
      complaint.mobile
    );

    addField(
      "Email",
      complaint.email
    );

    // =========================
    // INCIDENT DETAILS
    // =========================
    addSectionTitle("2. Incident Details");

    addField(
      "Incident Date",
      complaint.incidentDate
    );

    addField(
      "Incident Time",
      complaint.incidentTime
    );

    addField(
      "Description",
      complaint.description
    );

    // =========================
    // TRANSACTION DETAILS
    // =========================
    addSectionTitle("3. Transaction Details");

    addField(
      "Bank",
      complaint.bankName
    );

    addField(
      "Account Number",
      complaint.accountNumber
    );

    addField(
      "Transaction Type",
      complaint.transactionType
    );

    addField(
      "Transaction ID / UTR",
      complaint.transactionId
    );

    addField(
      "Fraud Amount",
      `INR ${complaint.fraudAmount || "0"}`
    );

    // =========================
    // EVIDENCE & LOCATION
    // =========================
    addSectionTitle("4. Evidence & Location");

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

    // =========================
    // IMPORTANT NOTICE
    // =========================
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 20;
    }

    y += 8;

    doc.setFillColor(255, 248, 238);
    doc.setDrawColor(255, 153, 51);

    doc.roundedRect(
      margin,
      y,
      pageWidth - margin * 2,
      30,
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

    const noticeLines =
      doc.splitTextToSize(
        notice,
        pageWidth - margin * 2 - 14
      );

    doc.text(
      noticeLines,
      margin + 7,
      y + 16
    );

    // =========================
    // FOOTER
    // =========================
    const footerY = pageHeight - 18;

    doc.setDrawColor(220, 226, 234);
    doc.line(
      margin,
      footerY - 5,
      pageWidth - margin,
      footerY - 5
    );

    doc.setTextColor(91, 100, 114);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    doc.text(
      "Nirikshan AI • SIH Prototype",
      margin,
      footerY
    );

    doc.text(
      "Cyber Fraud Helpline: 1930 • Available 24×7",
      pageWidth - margin,
      footerY,
      { align: "right" }
    );

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