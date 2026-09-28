/** Case listing and lookup. */
const express = require("express");
const { all, get, run } = require("../config/db");
const { requestSync } = require("../services/liveSync");

const router = express.Router();

router.get("/cases", (req, res) => {
  res.json(all("SELECT * FROM cases ORDER BY id DESC LIMIT ?", [
    Math.min(Number(req.query.limit) || 100, 1000),
  ]));
});

/** Case with its complaint, alerts and hop count joined in one round trip. */
router.get("/cases/:caseId", (req, res) => {
  const { complaint_number: caseNumber } = { complaint_number: req.params.caseId };
  const numericId = Number(req.params.caseId);
  const row = get(
    "SELECT * FROM cases WHERE case_number = ? OR id = ?",
    [caseNumber, Number.isFinite(numericId) ? numericId : -1],
  );
  if (!row) return res.status(404).json({ message: "Case not found" });

  const complaint = get("SELECT * FROM complaints WHERE id = ?", [row.complaint_id]) || null;
  const alerts = all("SELECT * FROM alerts WHERE case_id = ? ORDER BY id DESC", [row.id]);
  const hopCount =
    get("SELECT COUNT(*) AS n FROM mule_hops WHERE complaint_id = ?", [
      complaint?.complaint_number || "",
    ]).n;

  res.json({ ...row, complaint, alerts, hopCount });
});

/** Updates triage fields on a case. */
router.patch("/cases/:caseId", (req, res) => {
  const numericId = Number(req.params.caseId);
  const existing = get(
    "SELECT * FROM cases WHERE case_number = ? OR id = ?",
    [req.params.caseId, Number.isFinite(numericId) ? numericId : -1],
  );
  if (!existing) return res.status(404).json({ message: "Case not found" });

  const allowed = { status: "status", priority: "priority", riskLevel: "risk_level", assignedTo: "assigned_to" };
  const updates = [];
  const values = [];
  for (const [key, column] of Object.entries(allowed)) {
    if (req.body?.[key] !== undefined) {
      updates.push(`${column} = ?`);
      values.push(req.body[key]);
    }
  }
  if (!updates.length) return res.status(400).json({ message: "No updatable fields supplied" });

  run(
    `UPDATE cases SET ${updates.join(", ")}, updated_at = ? WHERE id = ?`,
    [...values, new Date().toISOString().replace("T", " ").slice(0, 19), existing.id],
  );

  // Triage edits are rendered on the dashboard, which reads the generated module, so the
  // change has to be rebuilt into it. Scheduled, not awaited, to keep the PATCH fast.
  requestSync(`case ${existing.case_number} triage update`);

  res.json(get("SELECT * FROM cases WHERE id = ?", [existing.id]));
});

module.exports = router;
