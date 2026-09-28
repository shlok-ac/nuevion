const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const { processVoiceComplaint } = require("../services/nlpService");

const {
  createComplaint,
  getComplaintStatus,
  getAllComplaints,
} = require("../controllers/complaintController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

router.post("/", createComplaint);
router.get("/:complaintNumber/status", getComplaintStatus);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("analyst"),
  getAllComplaints
);

// POST /api/complaints/triage-voice
router.post("/triage-voice", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided in request." });
  }

  const audioFilePath = req.file.path;
  const sourceLang = req.body.source_lang || "hi";

  try {
    // Run Bhashini Dhruva ASR + Translation + Acoustic Entity Extraction
    const complaintData = await processVoiceComplaint(audioFilePath, sourceLang);

    return res.status(200).json({
      status: "success",
      complaint: complaintData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  } finally {
    // Purge temporary audio from disk to maintain privacy & free storage
    if (fs.existsSync(audioFilePath)) {
      try {
        fs.unlinkSync(audioFilePath);
      } catch (cleanupErr) {
        console.error("Audio cleanup failed:", cleanupErr);
      }
    }
  }
});

module.exports = router;
