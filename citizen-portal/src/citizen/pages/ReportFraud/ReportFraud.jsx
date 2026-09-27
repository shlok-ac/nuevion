import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { submitComplaint } from "../../lib/api";
import "./ReportFraud.css";

const steps = [
  "Personal Details",
  "Incident Details",
  "Transaction Details",
  "Evidence & Location",
];

export default function ReportFraud() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    description: "",
    incidentDate: "",
    incidentTime: "",
    bankName: "",
    accountNumber: "",
    transactionId: "",
    transactionType: "UPI",
    fraudAmount: "",
    location: "",
    evidence: [],
  });

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const nextStep = () => {
    const stepErrors = {};

    if (currentStep === 1) {
      const name = formData.fullName.trim();
      const mobile = formData.mobile.trim();

      if (!name) {
        stepErrors.fullName = "Full name is required";
      } else if (name.length < 3) {
        stepErrors.fullName = "Enter a valid full name";
      } else if (!/[A-Za-z]/.test(name)) {
        stepErrors.fullName = "Name must contain letters";
      } else if (!/^[A-Za-z .'-]+$/.test(name)) {
        stepErrors.fullName =
          "Name can contain only letters, spaces, dots or hyphens";
      }

      if (!mobile) {
        stepErrors.mobile = "Mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(mobile)) {
        stepErrors.mobile =
          "Enter a valid 10-digit Indian mobile number";
      }
    }

    if (currentStep === 2) {
      if (!formData.description.trim()) {
        stepErrors.description = "Incident description is required";
      }

      if (!formData.incidentDate) {
        stepErrors.incidentDate = "Incident date is required";
      } else {
        const today = new Date().toISOString().split("T")[0];

        if (formData.incidentDate > today) {
          stepErrors.incidentDate =
            "Incident date cannot be in the future";
        }

        if (
          formData.incidentDate === today &&
          formData.incidentTime
        ) {
          const now = new Date();
          const currentTime =
            now.getHours().toString().padStart(2, "0") +
            ":" +
            now.getMinutes().toString().padStart(2, "0");

          if (formData.incidentTime > currentTime) {
            stepErrors.incidentTime =
              "Incident time cannot be in the future";
          }
        }
      }
    }

    if (currentStep === 3) {
      if (!formData.bankName.trim()) {
        stepErrors.bankName =
          "Bank / financial institution is required";
      }

      const accountNumber = formData.accountNumber.trim();

      if (!accountNumber) {
        stepErrors.accountNumber = "Account number is required";
      } else if (!/^\d{9,18}$/.test(accountNumber)) {
        stepErrors.accountNumber =
          "Account number must contain 9 to 18 digits";
      }

      if (!formData.transactionType) {
        stepErrors.transactionType =
          "Transaction type is required";
      }

      const fraudAmount = Number(formData.fraudAmount);

      if (!formData.fraudAmount.trim()) {
        stepErrors.fraudAmount = "Fraud amount is required";
      } else if (
        !Number.isFinite(fraudAmount) ||
        fraudAmount <= 0
      ) {
        stepErrors.fraudAmount =
          "Fraud amount must be greater than 0";
      }
    }

    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep((previous) => previous + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((previous) => previous - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEvidenceChange = (event) => {
    const files = Array.from(event.target.files || []);

    const validFiles = files.filter((file) => {
      const validType = [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ].includes(file.type);

      const validSize = file.size <= 5 * 1024 * 1024;

      return validType && validSize;
    });

    updateField("evidence", [
      ...formData.evidence,
      ...validFiles,
    ]);

    // Allows selecting the same file again later.
    event.target.value = "";
  };

  const removeEvidence = (indexToRemove) => {
    updateField(
      "evidence",
      formData.evidence.filter(
        (_, index) => index !== indexToRemove
      )
    );
 };

const drawNirikshanSeal = (doc, x, y) => {
  // Original Nirikshan AI circular seal.
  // This is intentionally not an official government emblem.

  doc.setFillColor(255, 153, 51);
  doc.circle(x, y, 15, "F");

  doc.setFillColor(255, 255, 255);
  doc.circle(x, y, 11, "F");

  doc.setDrawColor(10, 49, 97);
  doc.setLineWidth(1.2);
  doc.circle(x, y, 9, "S");

  // Eye
  doc.setDrawColor(10, 49, 97);
  doc.ellipse(x, y, 6, 3.5, "S");

  // Eye centre
  doc.setFillColor(10, 49, 97);
  doc.circle(x, y, 2, "F");

  // Small green accent
  doc.setFillColor(19, 136, 8);
  doc.circle(x + 9, y + 7, 3, "F");
};


const generatePDF = (complaintNumber, complaint) => {
  const doc = new jsPDF();

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 18;

  let y = 20;

  /*
   * ==============================
   * HEADER
   * ==============================
   */

  // Tricolour strip
  doc.setFillColor(255, 153, 51);
  doc.rect(0, 0, pageWidth / 3, 4, "F");

  doc.setFillColor(255, 255, 255);
  doc.rect(
    pageWidth / 3,
    0,
    pageWidth / 3,
    4,
    "F"
  );

  doc.setFillColor(19, 136, 8);
  doc.rect(
    (pageWidth / 3) * 2,
    0,
    pageWidth / 3,
    4,
    "F"
  );

  // Navy header
  doc.setFillColor(10, 49, 97);
  doc.rect(0, 4, pageWidth, 48, "F");

  drawNirikshanSeal(
    doc,
    margin + 15,
    28
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);

  doc.text(
    "NIRIKSHAN AI",
    margin + 37,
    25
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(
    "National Cybercrime Reporting Portal",
    margin + 37,
    34
  );

  doc.setFontSize(7.5);

  doc.text(
    "SIH PROTOTYPE",
    margin + 37,
    42
  );

  // Right-side document label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text(
    "COMPLAINT",
    pageWidth - margin - 42,
    25
  );

  doc.text(
    "ACKNOWLEDGEMENT",
    pageWidth - margin - 42,
    32
  );

  y = 67;

  /*
   * ==============================
   * TITLE
   * ==============================
   */

  doc.setTextColor(10, 49, 97);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  doc.text(
    "Cybercrime Complaint Acknowledgement",
    margin,
    y
  );

  y += 8;

  doc.setTextColor(91, 100, 114);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(
    "This document confirms that the complaint details below have been submitted through Nirikshan AI.",
    margin,
    y
  );

  y += 15;

  /*
   * ==============================
   * COMPLAINT ID CARD
   * ==============================
   */

  doc.setFillColor(243, 245, 248);

  doc.roundedRect(
    margin,
    y,
    pageWidth - margin * 2,
    29,
    3,
    3,
    "F"
  );

  doc.setFillColor(30, 132, 73);

  doc.roundedRect(
    pageWidth - margin - 48,
    y + 6,
    38,
    17,
    3,
    3,
    "F"
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  doc.text(
    "RECEIVED",
    pageWidth - margin - 42,
    y + 17
  );

  doc.setTextColor(91, 100, 114);
  doc.setFontSize(7.5);

  doc.text(
    "COMPLAINT NUMBER",
    margin + 8,
    y + 9
  );

  doc.setTextColor(10, 49, 97);
  doc.setFontSize(14);

  doc.text(
    complaintNumber,
    margin + 8,
    y + 20
  );

  y += 40;

  /*
   * ==============================
   * HELPER
   * ==============================
   */

  const checkPage = (requiredHeight = 15) => {
    if (
      y + requiredHeight >
      pageHeight - 25
    ) {
      doc.addPage();

      y = 20;

      // Header on additional pages
      doc.setFillColor(10, 49, 97);
      doc.rect(
        0,
        0,
        pageWidth,
        8,
        "F"
      );

      y = 20;
    }
  };

  const sectionTitle = (number, title) => {
    checkPage(18);

    doc.setFillColor(10, 49, 97);

    doc.roundedRect(
      margin,
      y - 5,
      9,
      9,
      2,
      2,
      "F"
    );

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");

    doc.text(
      String(number),
      margin + 3.1,
      y + 1
    );

    doc.setTextColor(10, 49, 97);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    doc.text(
      title,
      margin + 14,
      y + 1
    );

    y += 13;
  };

  const addField = (label, value) => {
    const safeValue =
      value === undefined ||
      value === null ||
      value === ""
        ? "Not provided"
        : String(value);

    checkPage(12);

    doc.setTextColor(91, 100, 114);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    doc.text(
      label,
      margin,
      y
    );

    doc.setTextColor(28, 34, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const lines = doc.splitTextToSize(
      safeValue,
      pageWidth - margin * 2 - 48
    );

    doc.text(
      lines,
      margin + 48,
      y
    );

    y += Math.max(
      7,
      lines.length * 5 + 2
    );
  };

  /*
   * ==============================
   * PERSONAL DETAILS
   * ==============================
   */

  sectionTitle(
    1,
    "Personal Details"
  );

  addField(
    "Full Name",
    complaint.fullName
  );

  addField(
    "Mobile Number",
    complaint.mobile
  );

  addField(
    "Email Address",
    complaint.email
  );

  y += 5;

  /*
   * ==============================
   * INCIDENT
   * ==============================
   */

  sectionTitle(
    2,
    "Incident Details"
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
    "Description",
    complaint.description
  );

  y += 5;

  /*
   * ==============================
   * TRANSACTION
   * ==============================
   */

  sectionTitle(
    3,
    "Transaction Details"
  );

  addField(
    "Bank / Institution",
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

  // IMPORTANT:
  // "INR" is used instead of the unsupported
  // Unicode ₹ character so the currency can
  // never be corrupted by jsPDF's default font.
  addField(
    "Fraud Amount",
    `INR ${complaint.fraudAmount || "0"}`
  );

  y += 5;

  /*
   * ==============================
   * EVIDENCE & LOCATION
   * ==============================
   */

  sectionTitle(
    4,
    "Evidence & Location"
  );

  addField(
    "Last Known Location",
    complaint.location
  );

  const evidence =
    Array.isArray(complaint.evidence)
      ? complaint.evidence
      : [];

  if (evidence.length > 0) {
    addField(
      "Evidence Submitted",
      `${evidence.length} file(s)`
    );

    evidence.forEach(
      (file, index) => {
        addField(
          `Evidence ${index + 1}`,
          `${file.name} (${(
            file.size /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
      }
    );
  } else {
    addField(
      "Evidence Submitted",
      "No evidence uploaded"
    );
  }

  /*
   * ==============================
   * SECURITY NOTICE
   * ==============================
   */

  checkPage(35);

  y += 8;

  doc.setFillColor(255, 247, 237);

  doc.roundedRect(
    margin,
    y,
    pageWidth - margin * 2,
    25,
    2,
    2,
    "F"
  );

  doc.setTextColor(10, 49, 97);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text(
    "Important",
    margin + 7,
    y + 9
  );

  doc.setTextColor(91, 100, 114);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const notice =
    "For immediate assistance in cases of financial cyber fraud, call the Cyber Fraud Helpline 1930.";

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

  /*
   * ==============================
   * FOOTER
   * ==============================
   */

  const footerY =
    pageHeight - 12;

  doc.setDrawColor(
    220,
    226,
    234
  );

  doc.line(
    margin,
    footerY - 6,
    pageWidth - margin,
    footerY - 6
  );

  doc.setTextColor(
    91,
    100,
    114
  );

  doc.setFontSize(7);

  doc.text(
    "Nirikshan AI · SIH Prototype",
    margin,
    footerY
  );

  doc.text(
    "Cyber Fraud Helpline: 1930 · Available 24x7",
    pageWidth - margin - 73,
    footerY
  );

  doc.save(
    `${complaintNumber}.pdf`
  );
};


const handleSubmit = async (event) => {
  event.preventDefault();

  setSubmitError("");
  setSubmitting(true);

  /*
   * IMPORTANT:
   * File objects cannot be reliably stored
   * inside localStorage, and the API records evidence as
   * metadata only, so the files are reduced to plain
   * descriptors before the complaint is sent.
   */
  const evidenceMetadata =
    formData.evidence.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

  let complaintNumber;
  let caseNumber = null;

  try {
    // Files the complaint with the cybercrime desk. The server mints the reference,
    // stores the complaint and provisions a case + alert on the command center.
    const filed = await submitComplaint({
      complainantName: formData.fullName.trim(),
      phone: formData.mobile.trim(),
      email: formData.email.trim() || null,
      bankName: formData.bankName.trim() || null,
      accountNumber: formData.accountNumber.trim() || null,
      transactionId: formData.transactionId.trim() || null,
      transactionType: formData.transactionType,
      fraudAmount: String(formData.fraudAmount || "").trim(),
      location: formData.location.trim() || null,
      description: formData.description.trim(),
      fraudDate: formData.incidentDate || null,
      fraudTime: formData.incidentTime || null,
      evidence: evidenceMetadata,
      source: "PORTAL",
    });

    complaintNumber = filed.complaintNumber;
    caseNumber = filed.caseNumber;
  } catch (error) {
    // The citizen must never be left without a reference, so one is minted locally
    // and the failure is surfaced rather than silently dropping the filing.
    complaintNumber = `CYB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    setSubmitError(
      `We could not reach the cybercrime desk (${error.message}). Your reference is ${complaintNumber}. Please call 1930.`
    );
  } finally {
    setSubmitting(false);
  }

  const complaint = {
    ...formData,

    // Store metadata instead of File objects.
    evidence: evidenceMetadata,

    // Keep the amount exactly as entered.
    fraudAmount: String(
      formData.fraudAmount || ""
    ).trim(),

    complaintNumber,
    caseNumber,

    status: "Received",

    submittedAt:
      new Date().toISOString(),
  };

  localStorage.setItem(
    "nirikshanLatestComplaint",
    JSON.stringify(complaint)
  );


  navigate(
    `/complaint/${complaintNumber}/confirmation`
  );
};

  return (
    <div className="report-page">
      <div className="citizen-container">

        {/* Heading */}
        <div className="report-heading">
          <span className="report-kicker">
            CYBERCRIME COMPLAINT REGISTRATION
          </span>

          <h1>
            Report Cyber & Financial Fraud
          </h1>

          <p>
            Provide accurate information about the incident.
            Your information will be used to process and
            investigate your complaint.
          </p>
        </div>

        {/* Progress */}
        <div className="report-progress">
          {steps.map((step, index) => {
            const stepNumber = index + 1;

            return (
              <div
                className={`progress-step ${
                  currentStep >= stepNumber
                    ? "active"
                    : ""
                }`}
                key={step}
              >
                <div className="progress-circle">
                  {stepNumber}
                </div>

                <span>{step}</span>
              </div>
            );
          })}
        </div>

        <form
          className="report-card"
          onSubmit={handleSubmit}
        >

          {/* STEP 1 */}
          {currentStep === 1 && (
            <section>
              <div className="form-section-heading">
                <span>01</span>

                <div>
                  <h2>
                    Personal Details
                  </h2>

                  <p>
                    Enter your contact information so
                    that we can communicate updates
                    about your complaint.
                  </p>
                </div>
              </div>

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Full Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      updateField(
                        "fullName",
                        e.target.value
                      )
                    }
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Mobile Number <span>*</span>
                  </label>

                  <input
                    type="tel"
                    maxLength="10"
                    value={formData.mobile}
                    onChange={(e) =>
                      updateField(
                        "mobile",
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="10-digit mobile number"
                  />

                  <small>
                    Indian mobile number required
                  </small>
                </div>

                <div className="form-field full-width">
                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      updateField(
                        "email",
                        e.target.value
                      )
                    }
                    placeholder="example@email.com"
                  />

                  <small>
                    Optional — used for complaint
                    updates
                  </small>
                </div>

              </div>
            </section>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <section>
              <div className="form-section-heading">
                <span>02</span>

                <div>
                  <h2>
                    Incident Details
                  </h2>

                  <p>
                    Tell us what happened and when
                    the incident occurred.
                  </p>
                </div>
              </div>

              <div className="form-grid">

                <div className="form-field full-width">
                  <label>
                    Incident Description{" "}
                    <span>*</span>
                  </label>

                  <textarea
                    rows="7"
                    value={formData.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Describe the incident in detail..."
                  />

                  {errors.description && (
                    <small className="field-error">
                      {errors.description}
                    </small>
                  )}

                  <small>
                    Include relevant information such
                    as calls, messages, websites or
                    applications involved.
                  </small>
                </div>

                <div className="form-field">
                  <label>
                    Incident Date <span>*</span>
                  </label>

                  <input
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) =>
                      updateField(
                        "incidentDate",
                        e.target.value
                      )
                    }
                  />

                  {errors.incidentDate && (
                    <small className="field-error">
                      {errors.incidentDate}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label>
                    Incident Time
                  </label>

                  <input
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) =>
                      updateField(
                        "incidentTime",
                        e.target.value
                      )
                    }
                  />

                  {errors.incidentTime && (
                    <small className="field-error">
                      {errors.incidentTime}
                    </small>
                  )}
                </div>

              </div>
            </section>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <section>
              <div className="form-section-heading">
                <span>03</span>

                <div>
                  <h2>
                    Transaction Details
                  </h2>

                  <p>
                    Provide details about the
                    financial transaction involved
                    in the fraud.
                  </p>
                </div>
              </div>

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Bank / Financial Institution{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) =>
                      updateField(
                        "bankName",
                        e.target.value
                      )
                    }
                    placeholder="Enter bank name"
                  />

                  {errors.bankName && (
                    <small className="field-error">
                      {errors.bankName}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label>
                    Account Number <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      updateField(
                        "accountNumber",
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="9–18 digit account number"
                  />

                  {errors.accountNumber && (
                    <small className="field-error">
                      {errors.accountNumber}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label>
                    Transaction ID / UTR
                  </label>

                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(e) =>
                      updateField(
                        "transactionId",
                        e.target.value
                      )
                    }
                    placeholder="Enter transaction reference"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Transaction Type{" "}
                    <span>*</span>
                  </label>

                  <select
                    value={
                      formData.transactionType
                    }
                    onChange={(e) =>
                      updateField(
                        "transactionType",
                        e.target.value
                      )
                    }
                  >
                    <option>
                      UPI
                    </option>

                    <option>
                      NEFT / IMPS
                    </option>

                    <option>
                      Card
                    </option>

                    <option>
                      ATM Withdrawal
                    </option>

                    <option>
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Fraud Amount (Rs.){" "}
                    <span>*</span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.fraudAmount}
                    onChange={(e) =>
                      updateField(
                        "fraudAmount",
                        e.target.value
                      )
                    }
                    placeholder="Example: 500"
                  />

                  <small>
                    Enter the exact amount lost
                  </small>

                  {errors.fraudAmount && (
                    <small className="field-error">
                      {errors.fraudAmount}
                    </small>
                  )}
                </div>

              </div>
            </section>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <section>
              <div className="form-section-heading">
                <span>04</span>

                <div>
                  <h2>
                    Evidence & Location
                  </h2>

                  <p>
                    Upload screenshots, payment
                    receipts or other proof related
                    to the incident.
                  </p>
                </div>
              </div>

              <div className="form-grid">

                {/* UPLOAD */}
                <div className="form-field full-width">

                  <label>
                    Upload Screenshots / Proof
                  </label>

                  <div className="upload-box">

                    <div className="upload-icon">
                      ↑
                    </div>

                    <h3>
                      Upload your evidence
                    </h3>

                    <p>
                      Screenshots, payment receipts,
                      chat screenshots or documents
                    </p>

                    <p className="upload-format">
                      JPG, JPEG, PNG or PDF ·
                      Maximum 5 MB per file
                    </p>

                    <label
                      htmlFor="evidence-upload"
                      className="upload-button"
                    >
                      Choose Files

                      <input
                        id="evidence-upload"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        onChange={
                          handleEvidenceChange
                        }
                      />
                    </label>

                    <small className="upload-help">
                      You can select multiple
                      screenshots or documents.
                    </small>

                  </div>

                  {/* FILE LIST */}
                  {formData.evidence.length >
                    0 && (
                    <div className="file-list">

                      <h4>
                        Selected Evidence
                      </h4>

                      {formData.evidence.map(
                        (file, index) => (
                          <div
                            className="file-item"
                            key={`${file.name}-${index}`}
                          >
                            <div>
                              <strong>
                                {file.name}
                              </strong>

                              <small>
                                {(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}{" "}
                                MB
                              </small>
                            </div>

                            <button
                              type="button"
                              className="remove-file"
                              onClick={() =>
                                removeEvidence(
                                  index
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}

                    </div>
                  )}
                </div>

                {/* LOCATION */}
                <div className="form-field full-width">

                  <label>
                    Last Known Location
                  </label>

                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      updateField(
                        "location",
                        e.target.value
                      )
                    }
                    placeholder="Enter city, area or location"
                  />

                  <small>
                    Example: Pune, Maharashtra
                  </small>

                </div>

              </div>

              <div className="important-notice">
                <strong>
                  Important:
                </strong>

                <p>
                  If you have recently lost money
                  through financial cyber-fraud,
                  immediately call the Cyber Fraud
                  Helpline <strong>1930</strong>.
                </p>
              </div>
            </section>
          )}


          {/* NAVIGATION */}
<div className="form-actions">

  {currentStep > 1 ? (
    <button
      type="button"
      className="back-button"
      onClick={previousStep}
    >
      ← Previous
    </button>
  ) : (
    <span />
  )}

  {currentStep === 1 && (
    <button
      type="button"
      className="next-button"
      onClick={nextStep}
    >
      Continue →
    </button>
  )}

  {currentStep === 2 && (
    <button
      type="button"
      className="next-button"
      onClick={nextStep}
    >
      Continue →
    </button>
  )}

  {currentStep === 3 && (
    <button
      type="button"
      className="next-button"
      onClick={nextStep}
    >
      Continue to Evidence →
    </button>
  )}

  {currentStep === 4 && (
    <button
      type="submit"
      className="submit-button"
      disabled={submitting}
    >
      {submitting ? "Filing complaint…" : "Submit Complaint"}
    </button>
  )}

  {submitError && (
    <p
      role="alert"
      style={{
        marginTop: "16px",
        padding: "12px 14px",
        borderRadius: "6px",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        color: "#991B1B",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      {submitError}
    </p>
  )}

</div>
  

        </form>

        <div className="report-security-note">
          🔒 Your information is intended for
          secure complaint processing. Do not share
          OTPs, passwords or PINs in the complaint
          description.
        </div>

      </div>
    </div>
  );
}