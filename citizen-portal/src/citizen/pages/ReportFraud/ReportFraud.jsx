import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { analyzeComplaintAudio, createComplaint } from "../../../lib/api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioLanguage, setAudioLanguage] = useState("hi");
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [audioError, setAudioError] = useState("");

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

  const selectAudioFile = (event) => {
    const file = event.target.files?.[0] || null;
    setAudioAnalysis(null);
    setAudioError("");
    if (!file) {
      setAudioFile(null);
      return;
    }
    const supportedAudio = file.type.startsWith("audio/") ||
      /\.(wav|mp3|m4a|mp4|ogg|webm|flac)$/i.test(file.name);
    if (!supportedAudio) {
      setAudioFile(null);
      setAudioError("Choose a supported audio file.");
      return;
    }
    if (file.size === 0 || file.size > 20 * 1024 * 1024) {
      setAudioFile(null);
      setAudioError("Audio must be non-empty and 20 MB or smaller.");
      return;
    }
    setAudioFile(file);
  };

  const analyzeAudio = async () => {
    if (!audioFile) {
      setAudioError("Choose a complaint audio file first.");
      return;
    }
    setIsAnalyzingAudio(true);
    setAudioError("");
    setAudioAnalysis(null);
    try {
      const result = await analyzeComplaintAudio(audioFile, audioLanguage);
      if (
        typeof result?.transcript !== "string" ||
        !result.transcript.trim() ||
        typeof result?.translated_text !== "string" ||
        !result.translated_text.trim() ||
        !result.analysis_token
      ) {
        throw new Error("Audio analysis returned an incomplete result.");
      }

      const structured = result.structured_complaint || {};
      const amount = structured.stolen_amount_inr;
      const transactionType = structured.transfer_mode;
      const location = structured.location;
      const incidentDate = structured.incident_date;
      const incidentTime = structured.incident_time;
      const parsedTime = typeof incidentTime === "string"
        ? incidentTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
        : null;
      let formTime = null;
      if (parsedTime) {
        let hour = Number(parsedTime[1]) % 12;
        if (parsedTime[3].toUpperCase() === "PM") hour += 12;
        formTime = `${String(hour).padStart(2, "0")}:${parsedTime[2]}`;
      } else if (typeof incidentTime === "string" && /^\d{2}:\d{2}$/.test(incidentTime)) {
        formTime = incidentTime;
      }

      setFormData((previous) => ({
        ...previous,
        description: result.transcript,
        fraudAmount: typeof amount === "number" ? String(amount) : previous.fraudAmount,
        transactionType: typeof transactionType === "string" &&
          transactionType !== "Not Specified"
          ? transactionType
          : previous.transactionType,
        location: typeof location === "string" && location
          ? location
          : previous.location,
        incidentDate: typeof incidentDate === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(incidentDate)
          ? incidentDate
          : previous.incidentDate,
        incidentTime: formTime || previous.incidentTime,
      }));
      setAudioAnalysis(result);
    } catch (error) {
      const stage = error.stage ? `${error.stage}: ` : "";
      setAudioError(`${stage}${error.message || "Audio analysis failed."}`);
    } finally {
      setIsAnalyzingAudio(false);
    }
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

const drawArthaVyuhSeal = (doc, x, y) => {
  // Original ArthaVyūh circular seal.
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

  drawArthaVyuhSeal(
    doc,
    margin + 15,
    28
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);

  doc.text(
    "ARTHAVYŪH",
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
    "This document confirms that the complaint details below have been submitted through ArthaVyūh.",
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
    "ArthaVyūh · SIH Prototype",
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
  setIsSubmitting(true);
  setSubmitError("");

  /*
   * IMPORTANT:
   * File objects cannot be reliably stored
   * inside localStorage.
   *
   * Convert them into plain metadata first.
   */
  const evidenceMetadata =
    formData.evidence.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

  try {
    const result = await createComplaint({
      ...formData,
      evidence: evidenceMetadata,
      fraudAmount: String(formData.fraudAmount || "").trim(),
      ...(audioAnalysis?.transcript === formData.description
        ? {
            audio_analysis_token: audioAnalysis.analysis_token,
            source: "1930_audio_prototype",
          }
        : {}),
    });
    const complaintNumber = result?.complaint?.complaint_number;
    if (!complaintNumber) {
      throw new Error("The backend did not return a complaint number.");
    }

    const complaint = {
      ...formData,
      evidence: evidenceMetadata,
      fraudAmount: String(formData.fraudAmount || "").trim(),
      complaintNumber,
      status: result.case?.status || "Received",
      submittedAt: result.complaint?.created_at || new Date().toISOString(),
      nlp: result.nlp,
      graph: result.graph,
    };

    localStorage.setItem("arthavyuhLatestComplaint", JSON.stringify(complaint));
    navigate(`/complaint/${complaintNumber}/confirmation`);
  } catch (error) {
    setSubmitError(error.message || "Complaint submission failed. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
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
                  <label htmlFor="complaint-audio">Prototype 1930 audio complaint</label>
                  <p className="report-security-note">
                    This is a local audio simulation only. It is not connected to the real 1930 helpline.
                    Extracted details are unverified; review them and complete any missing required fields.
                  </p>
                  <input
                    id="complaint-audio"
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.mp4,.ogg,.webm,.flac"
                    onChange={selectAudioFile}
                    disabled={isAnalyzingAudio || isSubmitting}
                  />
                  <div className="form-field">
                    <label htmlFor="audio-language">Spoken language</label>
                    <select
                      id="audio-language"
                      value={audioLanguage}
                      onChange={(event) => {
                        setAudioLanguage(event.target.value);
                        setAudioAnalysis(null);
                      }}
                      disabled={isAnalyzingAudio || isSubmitting}
                    >
                      <option value="auto">Detect automatically</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                      <option value="bn">Bengali</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                      <option value="gu">Gujarati</option>
                      <option value="pa">Punjabi</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="next-button"
                    onClick={analyzeAudio}
                    disabled={!audioFile || isAnalyzingAudio || isSubmitting}
                  >
                    {isAnalyzingAudio ? "Processing audio…" : "Transcribe and extract details"}
                  </button>
                  {audioFile && <small>Selected: {audioFile.name}</small>}
                  {audioError && <small className="field-error" role="alert">{audioError}</small>}
                  {audioAnalysis && (
                    <div className="important-notice" role="status">
                      <strong>Audio analysis complete — extracted details are not verified.</strong>
                      <p>
                        {audioAnalysis.detected_language
                          ? `Detected language: ${audioAnalysis.detected_language}`
                          : `Selected language: ${audioAnalysis.source_language}`}
                      </p>
                      <p><strong>Transcript:</strong> {audioAnalysis.transcript}</p>
                      <p><strong>English translation:</strong> {audioAnalysis.translated_text}</p>
                      <p><strong>Parser:</strong> {audioAnalysis.provenance?.text_parser || "Not available"}</p>
                      <p>
                        <strong>Extracted fields:</strong>{" "}
                        {Object.entries(audioAnalysis.structured_complaint || {})
                          .filter(([field, value]) => (
                            field !== "english_transcript" &&
                            field !== "processed_at" &&
                            value !== null &&
                            value !== undefined &&
                            value !== "" &&
                            value !== "Not Specified"
                          ))
                          .map(([field, value]) => `${field.replaceAll("_", " ")}: ${value}`)
                          .join(" · ") || "No structured fields extracted"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="form-field full-width">
                  <label>
                    Incident Description{" "}
                    <span>*</span>
                  </label>

                  <textarea
                    rows="7"
                    value={formData.description}
                    onChange={(e) => {
                      updateField("description", e.target.value);
                      if (audioAnalysis && e.target.value !== audioAnalysis.transcript) {
                        setAudioAnalysis(null);
                      }
                    }}
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
    <>
      {submitError && (
        <p role="alert" className="submit-error">
          {submitError}
        </p>
      )}
      <button
        type="submit"
        className="submit-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Complaint"}
      </button>
    </>
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