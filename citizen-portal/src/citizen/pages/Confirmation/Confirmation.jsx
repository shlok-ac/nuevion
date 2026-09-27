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

  const navy = [10, 49, 97];
  const saffron = [255, 153, 51];
  const green = [19, 136, 8];
  const text = [28, 34, 48];
  const muted = [91, 100, 114];
  const border = [215, 220, 228];
  const light = [245, 247, 250];

  const margin = 16;

  const safe = (value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
      ? String(value)
      : "Not provided";

  const complaintNumber =
    complaint.complaintNumber || id || "Not provided";

  const amount = complaint.fraudAmount
    ? `INR ${Number(complaint.fraudAmount).toLocaleString("en-IN")}`
    : "Not provided";

  const submittedOn = complaint.submittedAt
    ? new Date(complaint.submittedAt).toLocaleString("en-IN")
    : new Date().toLocaleString("en-IN");

  const addLogo = () =>
  new Promise((resolve) => {
    const logo = new Image();

    logo.onload = () => {
      doc.addImage(
        logo,
        "PNG",
        margin,
        9,
        19,
        19
      );
      continueHeader();
      resolve();
    };

    logo.onerror = () => {
      continueHeader();
      resolve();
    };

    logo.src = "/assets/arthavyuh-logo.png";
  });

  const continueHeader = () => {
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ArthaVyuh", margin + 24, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      "National Cybercrime Reporting Portal",
      margin + 24,
      23
    );

    doc.setFillColor(...light);
    doc.setDrawColor(...border);
    doc.roundedRect(
      pageWidth - 56,
      9,
      40,
      13,
      2,
      2,
      "FD"
    );

    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(
      "SIH PROTOTYPE",
      pageWidth - 36,
      17,
      { align: "center" }
    );

    doc.setDrawColor(...saffron);
    doc.setLineWidth(1);
    doc.line(
      margin,
      31,
      pageWidth / 2,
      31
    );

    doc.setDrawColor(...green);
    doc.line(
      pageWidth / 2,
      31,
      pageWidth - margin,
      31
    );

    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(
      margin,
      34,
      pageWidth - margin,
      34
    );

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Complaint Number: ${complaintNumber}`,
      pageWidth - margin,
      40,
      { align: "right" }
    );

    drawPageContent();
  };

  const sectionTitle = (number, title, y) => {
    doc.setFillColor(...light);
    doc.setDrawColor(...border);
    doc.roundedRect(
      margin,
      y,
      pageWidth - margin * 2,
      9,
      2,
      2,
      "FD"
    );

    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(
      `${number}. ${title.toUpperCase()}`,
      margin + 5,
      y + 6
    );

    return y + 15;
  };

  const field = (label, value, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...text);
    doc.text(label, margin + 4, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);

    const lines = doc.splitTextToSize(
      safe(value),
      pageWidth - margin * 2 - 62
    );

    doc.text(
      lines,
      margin + 52,
      y
    );

    return y + Math.max(7, lines.length * 4.2);
  };

  const footer = () => {
    doc.setDrawColor(...border);
    doc.line(
      margin,
      pageHeight - 18,
      pageWidth - margin,
      pageHeight - 18
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);

    doc.text(
      "ArthaVyuh | National Cybercrime Reporting Portal | SIH Prototype",
      margin,
      pageHeight - 10
    );

    doc.setFont("helvetica", "bold");
    doc.text(
      "Cyber Fraud Helpline: 1930",
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" }
    );
  };

  const drawPageContent = () => {
    const page = doc.getNumberOfPages();

    /* ---------------- PAGE 1 ---------------- */

    if (page === 1) {
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(
        "Cybercrime Complaint Acknowledgement",
        margin,
        53
      );

      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "Complaint Number",
        margin,
        62
      );

      doc.setTextColor(...text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(
        complaintNumber,
        margin,
        69
      );

      doc.setDrawColor(...green);
      doc.setLineWidth(0.8);
      doc.roundedRect(
        pageWidth - 57,
        52,
        41,
        19,
        3,
        3,
        "S"
      );

      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(
        "RECEIVED",
        pageWidth - 36.5,
        63,
        { align: "center" }
      );

      let y = 82;

      y = sectionTitle(
        "1",
        "Personal Details",
        y
      );

      y = field(
        "Full Name :",
        complaint.fullName,
        y
      );

      y = field(
        "Mobile Number :",
        complaint.mobile,
        y
      );

      y = field(
        "Email :",
        complaint.email,
        y
      );

      y += 5;

      y = sectionTitle(
        "2",
        "Incident Details",
        y
      );

      y = field(
        "Description :",
        complaint.description,
        y
      );

      y = field(
        "Incident Date :",
        complaint.incidentDate,
        y
      );

      y = field(
        "Incident Time :",
        complaint.incidentTime,
        y
      );

      y = field(
        "Location :",
        complaint.location,
        y
      );

      y += 5;

      y = sectionTitle(
        "3",
        "Fraud Details",
        y
      );

      y = field(
        "Fraud Amount :",
        amount,
        y
      );

      y = field(
        "Transaction Type :",
        complaint.transactionType,
        y
      );

      y = field(
        "Bank Name :",
        complaint.bankName,
        y
      );

      footer();
      return;
    }

    /* ---------------- PAGE 2 ---------------- */

    if (page === 2) {
      let y = 52;

      y = sectionTitle(
        "4",
        "Transaction Details",
        y
      );

      y = field(
        "Bank Name :",
        complaint.bankName,
        y
      );

      y = field(
        "Account Number :",
        complaint.accountNumber,
        y
      );

      y = field(
        "Transaction ID / UTR :",
        complaint.transactionId,
        y
      );

      y = field(
        "Transaction Type :",
        complaint.transactionType,
        y
      );

      y = field(
        "Fraud Amount :",
        amount,
        y
      );

      y += 6;

      y = sectionTitle(
        "5",
        "Evidence & Location",
        y
      );

      y = field(
        "Location :",
        complaint.location,
        y
      );

      const evidence =
        Array.isArray(complaint.evidence)
          ? complaint.evidence
          : [];

      if (evidence.length === 0) {
        y = field(
          "Evidence :",
          "No evidence uploaded",
          y
        );
      } else {
        y = field(
          "Evidence :",
          `${evidence.length} file(s) uploaded`,
          y
        );

        evidence.forEach((file, index) => {
          y = field(
            `File ${index + 1} :`,
            file.name,
            y
          );
        });
      }

      y += 6;

      y = sectionTitle(
        "6",
        "Complaint Status",
        y
      );

      y = field(
        "Current Status :",
        complaint.status || "Received",
        y
      );

      y = field(
        "Complaint Number :",
        complaintNumber,
        y
      );

      y = field(
        "Submitted On :",
        submittedOn,
        y
      );

      y = field(
        "Assigned Officer :",
        complaint.assignedOfficer,
        y
      );

      y += 6;

      y = sectionTitle(
        "7",
        "Next Steps",
        y
      );

      y = field(
        "Tracking :",
        "Use your complaint number and registered mobile number to track the complaint.",
        y
      );

      y = field(
        "Financial Fraud :",
        "For urgent financial cyber fraud, contact 1930 immediately.",
        y
      );

      footer();
      return;
    }

    /* ---------------- PAGE 3 ---------------- */

    if (page === 3) {
      let y = 52;

      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(
        "Important Information",
        margin,
        y
      );

      y += 12;

      doc.setFillColor(250, 248, 240);
      doc.setDrawColor(230, 218, 190);
      doc.roundedRect(
        margin,
        y,
        pageWidth - margin * 2,
        32,
        3,
        3,
        "FD"
      );

      doc.setTextColor(...saffron);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        "IMPORTANT",
        margin + 7,
        y + 10
      );

      doc.setTextColor(...text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      const importantText =
        "For urgent financial cyber fraud, contact the Cyber Fraud Helpline 1930 immediately. Keep this acknowledgement and your complaint number for future tracking.";

      doc.text(
        doc.splitTextToSize(
          importantText,
          pageWidth - margin * 2 - 14
        ),
        margin + 7,
        y + 18
      );

      y += 44;

      y = sectionTitle(
        "8",
        "Tracking Information",
        y
      );

      y = field(
        "Complaint Number :",
        complaintNumber,
        y
      );

      y = field(
        "Current Status :",
        complaint.status || "Received",
        y
      );

      y = field(
        "Registered Mobile :",
        complaint.mobile,
        y
      );

      y = field(
        "Tracking :",
        "Use the complaint number and registered mobile number to track your complaint.",
        y
      );

      y += 12;

      doc.setFillColor(239, 248, 242);
      doc.setDrawColor(180, 215, 190);
      doc.roundedRect(
        margin,
        y,
        pageWidth - margin * 2,
        38,
        3,
        3,
        "FD"
      );

      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        "Cyber Fraud Helpline: 1930",
        margin + 8,
        y + 12
      );

      doc.setFontSize(18);
      doc.text(
        "1930",
        margin + 8,
        y + 29
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(
        "Available 24×7 for urgent financial cyber fraud assistance.",
        margin + 42,
        y + 25
      );

      y += 50;

      doc.setFillColor(...light);
      doc.setDrawColor(...border);
      doc.roundedRect(
        margin,
        y,
        pageWidth - margin * 2,
        28,
        3,
        3,
        "FD"
      );

      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      doc.text(
        doc.splitTextToSize(
          "This is a computer-generated acknowledgement issued by the ArthaVyuh SIH Prototype. Please retain this document for your records.",
          pageWidth - margin * 2 - 14
        ),
        margin + 7,
        y + 11
      );

      footer();
    }
  };

  /*
   * Build the three pages.
   * The logo is loaded only for the PDF header.
   */
await addLogo();

doc.addPage();
await addLogo();

doc.addPage();
await addLogo();

doc.save(`${complaintNumber}.pdf`);
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