/**
 * ATM cash-out risk model endpoints.
 *
 * The Random Forest trains for real in-process (ml-random-forest), so the metrics
 * returned here are measured, not copied from a document.
 */
const express = require("express");
const ml = require("../services/ml");
const { requestSync } = require("../services/liveSync");

const router = express.Router();

router.get("/ml/metrics", (req, res) => {
  res.json(ml.getMetrics());
});

router.get("/ml/history", (req, res) => {
  res.json(ml.history(Math.min(Number(req.query.limit) || 20, 100)));
});

router.post("/ml/retrain", (req, res) => {
  try {
    const metrics = ml.train();
    // Retraining rewrites every ATM's risk_score / risk_level, which the ATM
    // Intelligence page and the region rankings are built from. Those live in the
    // generated files, so push the new scores out to them.
    requestSync("model retrain");
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Scores one ATM from its raw features. */
router.post("/ml/predict", (req, res) => {
  try {
    res.json(ml.predictFeatures(req.body || {}));
  } catch (error) {
    res.status(400).json({ message: error.message, features: ml.FEATURES });
  }
});

module.exports = router;
