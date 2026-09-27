/** Service health and row counts. */
const express = require("express");
const { get } = require("../config/db");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    complaints: get("SELECT COUNT(*) AS n FROM complaints").n,
    cases: get("SELECT COUNT(*) AS n FROM cases").n,
    atms: get("SELECT COUNT(*) AS n FROM atms").n,
    muleHops: get("SELECT COUNT(*) AS n FROM mule_hops").n,
    alerts: get("SELECT COUNT(*) AS n FROM alerts").n,
    nlpExtractions: get("SELECT COUNT(*) AS n FROM nlp_extractions").n,
    mlRuns: get("SELECT COUNT(*) AS n FROM ml_runs").n,
  });
});

module.exports = router;
