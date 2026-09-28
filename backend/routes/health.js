/** Service health and row counts. */
const express = require("express");
const { get } = require("../config/db");
const { status } = require("../services/liveSync");

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
    // Whether the generated command-center files are current. `lastRun.ok === false`
    // means a rebuild failed and the UI is serving stale rows.
    sync: status(),
  });
});

module.exports = router;
