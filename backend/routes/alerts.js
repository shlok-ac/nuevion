/** Alert feed for the command center dashboard. */
const express = require("express");
const { all, get } = require("../config/db");

const router = express.Router();

router.get("/alerts", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const caseNumber = req.query.case;
  if (caseNumber) {
    const kase = get("SELECT id FROM cases WHERE case_number = ?", [caseNumber]);
    if (!kase) return res.json([]);
    return res.json(all("SELECT * FROM alerts WHERE case_id = ? ORDER BY id DESC", [kase.id]));
  }
  return res.json(all("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", [limit]));
});

module.exports = router;
