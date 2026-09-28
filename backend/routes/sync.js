/**
 * Manual control over the command center's data rebuild.
 *
 * The rebuild now runs automatically after every write (see services/liveSync.js), so
 * this endpoint is for the cases that still need a human: inspecting the last rebuild,
 * forcing one on demand, and recovering with `npm run sync`'s equivalent when
 * AUTO_SYNC=false.
 */
const express = require("express");
const { syncNow, status } = require("../services/liveSync");

const router = express.Router();

/** Last rebuild outcome, plus whether one is queued or running right now. */
router.get("/sync", (req, res) => {
  res.json(status());
});

/**
 * Forces a rebuild now and returns the row counts written. Unlike the automatic path this
 * one is synchronous, so the response reflects the finished files.
 */
router.post("/sync", (req, res) => {
  const result = syncNow("manual rebuild");
  if (!result) {
    const state = status();
    return res.status(state.lastRun?.ok === false ? 500 : 409).json({
      success: false,
      message:
        state.lastRun?.ok === false
          ? `Rebuild failed: ${state.lastRun.error}`
          : "A rebuild is already running",
      ...state,
    });
  }
  res.json({ success: true, ...result });
});

module.exports = router;