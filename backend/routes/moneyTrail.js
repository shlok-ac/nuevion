/**
 * The money trail: victim -> mule -> cash-out.
 *
 * Reads the hops recorded for a complaint and attaches the predicted cash-out ATM
 * from the mapping CSV. This is the demo stand-in for the Cypher traversal in
 * database/neo4j/import.cypher; hop_level already encodes the traversal order.
 */
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { all, get } = require("../config/db");
const { parseCsv } = require("../lib/csv");

const router = express.Router();

const MAPPING_CSV = path.join(__dirname, "..", "..", "data", "atm_cashout_mapping new.csv");

/** Cached because the mapping never changes at runtime. */
let mappingByComplaint = null;
const loadMapping = () => {
  if (mappingByComplaint) return mappingByComplaint;
  try {
    const rows = parseCsv(fs.readFileSync(MAPPING_CSV, "utf8"));
    mappingByComplaint = new Map(rows.map((r) => [r.complaint_number, r]));
  } catch {
    // The mapping file is optional; the trail still renders without a cash-out node.
    mappingByComplaint = new Map();
  }
  return mappingByComplaint;
};

router.get("/money-trail/:complaintNumber", (req, res) => {
  const complaintNumber = req.params.complaintNumber;

  const complaint = get("SELECT * FROM complaints WHERE complaint_number = ?", [complaintNumber]);
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });

  const hops = all("SELECT * FROM mule_hops WHERE complaint_id = ? ORDER BY hop_level, hop_id", [
    complaintNumber,
  ]);

  const mapping = loadMapping().get(complaintNumber);
  let cashout = null;
  if (mapping) {
    cashout = {
      cashout_account: mapping.cashout_account,
      atm_id: mapping.atm_id,
      bank_name: mapping.bank_name,
      latitude: Number(mapping.latitude),
      longitude: Number(mapping.longitude),
      predicted_risk_level: mapping.predicted_risk_level,
      prediction_confidence: Number(mapping.prediction_confidence),
      // The live model output, when the seeded ATM id resolves.
      atm: get("SELECT * FROM atms WHERE atm_id = ?", [mapping.atm_id]) || null,
    };
  }

  res.json({ complaint, hops, cashout, hopCount: hops.length });
});

module.exports = router;
