/** ATM intelligence: the live model's scores plus geography for the heatmap. */
const express = require("express");
const { all, get } = require("../config/db");

const router = express.Router();

router.get("/atms", (req, res) => {
  res.json(all("SELECT * FROM atms ORDER BY id LIMIT ?", [
    Math.min(Number(req.query.limit) || 500, 2000),
  ]));
});

/** Highest predicted cash-out risk, used to rank the map's callout list. */
router.get("/atms/top-risk", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 100);
  const city = req.query.city;
  const rows = city
    ? all(
        "SELECT * FROM atms WHERE city = ? ORDER BY risk_score DESC LIMIT ?",
        [city, limit],
      )
    : all("SELECT * FROM atms ORDER BY risk_score DESC LIMIT ?", [limit]);
  res.json(rows);
});

router.get("/atms/:atmId", (req, res) => {
  const row = get("SELECT * FROM atms WHERE atm_id = ?", [req.params.atmId]);
  if (!row) return res.status(404).json({ message: "ATM not found" });
  res.json(row);
});

module.exports = router;
