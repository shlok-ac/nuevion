/**
 * Helpline NLP ingestion.
 *
 * Takes a 1930 call transcript, runs the rule-based extractor over it, and persists a
 * complaint + case + alert + extraction record so the result surfaces on the command
 * center exactly like a portal submission. Persisting also schedules the command
 * center's data rebuild, so a triaged call appears without a manual `npm run sync`.
 *
 * The ASR stage (faster-whisper / Bhashini) lives in ml/*.ipynb and needs Python,
 * which is not installed on the demo machine; this endpoint covers the extraction
 * stage and takes the transcript as text.
 */
const express = require("express");
const { all, get, run, transaction } = require("../config/db");
const nlp = require("../services/nlp");
const { requestSync } = require("../services/liveSync");

const router = express.Router();

const priorityFor = (amount) =>
  amount >= 1000000 ? "critical" : amount >= 250000 ? "high" : "medium";
const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

router.post("/nlp/extract", (req, res) => {
  const { transcript, complainantName, phoneNumber, persist = true } = req.body || {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ message: "transcript (string) is required" });
  }

  const extracted = nlp.extractFromTranscript(transcript);
  if (complainantName) extracted.complainant_name = complainantName;
  if (phoneNumber) extracted.phone_number = phoneNumber;

  if (!persist) {
    return res.json({ success: true, persisted: false, extracted });
  }

  const complaintNumber = `1930-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = now();
  const amount = extracted.stolen_amount_inr || 0;
  const priority = priorityFor(amount);

  const created = transaction(() => {
    const inserted = run(
      `INSERT INTO complaints
        (complaint_number, complainant_name, phone_number, bank_name, account_number,
         transaction_id, fraud_amount, transaction_type, fraud_date, fraud_time, location,
         description, source, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        complaintNumber,
        extracted.complainant_name || "Helpline caller",
        extracted.phone_number,
        extracted.bank_mentions[0] || null,
        extracted.mule_accounts[0] || null,
        null,
        amount,
        extracted.transfer_mode,
        timestamp.slice(0, 10),
        timestamp.slice(11, 19),
        extracted.location,
        `Helpline 1930 triage: ${extracted.scam_category}`,
        "HELPLINE_NLP",
        timestamp,
      ],
    );
    const complaintId = Number(inserted.lastInsertRowid);

    const caseNumber = `C-${new Date().getFullYear()}-${String(complaintId).padStart(4, "0")}`;
    run(
      `INSERT INTO cases (case_number, complaint_id, priority, status, assigned_to, risk_level, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [caseNumber, complaintId, priority, "active", 1, priority.toUpperCase(), timestamp, timestamp],
    );
    const caseId = get("SELECT id FROM cases WHERE case_number = ?", [caseNumber]).id;

    run(
      "INSERT INTO alerts (case_id, alert_type, severity, message, status, created_at) VALUES (?,?,?,?,?,?)",
      [
        caseId,
        "NLP_EXTRACTION",
        priority,
        `Helpline triage: ${extracted.scam_category} for Rs ${amount} via ${extracted.transfer_mode}`,
        "OPEN",
        timestamp,
      ],
    );

    run(
      `INSERT INTO nlp_extractions
        (complaint_id, transcript, complainant_name, stolen_amount_inr, transfer_mode,
         scam_category, mule_accounts, bank_mentions, confidence, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        complaintId,
        extracted.transcript,
        extracted.complainant_name,
        amount,
        extracted.transfer_mode,
        extracted.scam_category,
        JSON.stringify(extracted.mule_accounts),
        JSON.stringify(extracted.bank_mentions),
        extracted.confidence,
        timestamp,
      ],
    );

    return { complaintId, caseId, caseNumber };
  });

  requestSync(`helpline triage ${complaintNumber}`);

  res.status(201).json({ success: true, complaintNumber, priority, ...created, extracted });
});

router.get("/nlp/extractions", (req, res) => {
  res.json(all("SELECT * FROM nlp_extractions ORDER BY id DESC LIMIT ?", [
    Math.min(Number(req.query.limit) || 50, 500),
  ]));
});

module.exports = router;
