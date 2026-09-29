/**
 * Complaint ingestion and lookup.
 *
 * A portal submission auto-provisions a case and an alert, so anything filed in the
 * citizen portal is immediately visible on the command center. The command center reads
 * generated files rather than the database, so the write also triggers a rebuild (see
 * services/liveSync.js) — filing a complaint no longer needs a manual `npm run sync`.
 */
const express = require("express");
const { get, run, transaction } = require("../config/db");
const { requestSync } = require("../services/liveSync");

const router = express.Router();

/** Amount-based triage, matching the seeded priority vocabulary. */
const priorityFor = (amount) =>
  amount >= 1000000 ? "critical" : amount >= 250000 ? "high" : "medium";

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

router.post("/complaints", (req, res) => {
  const b = req.body || {};
  const complaintNumber =
    b.complaintNumber ||
    `CYB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  if (get("SELECT id FROM complaints WHERE complaint_number = ?", [complaintNumber])) {
    return res.status(409).json({ message: "Complaint number already exists", complaintNumber });
  }

  const amount = Number(b.fraudAmount ?? b.amount ?? 0) || 0;
  const timestamp = now();
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
        b.complainantName || b.name || "Anonymous",
        b.phone || b.phoneNumber || null,
        b.bankName || null,
        b.accountNumber || null,
        b.transactionId || null,
        amount,
        b.transactionType || "UPI",
        String(b.fraudDate || timestamp).slice(0, 10),
        String(b.fraudTime || timestamp).slice(11, 19) || null,
        b.location || b.city || null,
        b.description || "",
        b.source || "PORTAL",
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
        "NEW_COMPLAINT",
        priority,
        `New ${
          b.source === "BHASHINI_VOICE"
            ? "Bhashini voice"
            : b.source === "HELPLINE_NLP"
              ? "helpline"
              : "portal"
        } complaint ${complaintNumber} registered for ${b.complainantName || b.name || "citizen"}`,
        "OPEN",
        timestamp,
      ],
    );

    return { complaintId, caseId, caseNumber };
  });

  // Scheduled after the commit, so the rebuild reads the new rows. The response is sent
  // first — the rebuild is debounced and runs on a later tick, off the request path.
  requestSync(`portal complaint ${complaintNumber}`);

  res.status(201).json({ success: true, complaintNumber, priority, ...created });
});

router.get("/complaints", (req, res) => {
  const { all } = require("../config/db");
  res.json(all("SELECT * FROM complaints ORDER BY id DESC LIMIT ?", [
    Math.min(Number(req.query.limit) || 100, 1000),
  ]));
});

router.get("/complaints/:complaintNumber", (req, res) => {
  const row = get("SELECT * FROM complaints WHERE complaint_number = ?", [req.params.complaintNumber]);
  if (!row) return res.status(404).json({ message: "Complaint not found" });
  res.json(row);
});

module.exports = router;
