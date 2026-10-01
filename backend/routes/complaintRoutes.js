const express = require("express");
const router = express.Router();
const fs = require("fs");
const os = require("node:os");
const path = require("node:path");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const upload = multer({
  dest: path.join(os.tmpdir(), "arthavyuh-audio-upload"),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream") {
      callback(null, true);
      return;
    }
    const error = new Error("Unsupported audio content type");
    error.code = "UNSUPPORTED_AUDIO";
    callback(error);
  }
});

const {
  processVoiceComplaint,
  NlpServiceError
} = require("../services/nlpService");

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

const parseVoiceAudio = (req, res, next) => {
  upload.single("audio")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        stage: "upload",
        message: "Audio must be 20 MB or smaller."
      });
    }
    if (error.code === "UNSUPPORTED_AUDIO") {
      return res.status(415).json({
        stage: "upload",
        message: "Upload an audio file with a supported audio content type."
      });
    }
    return res.status(400).json({
      stage: "upload",
      message: "Audio upload could not be read."
    });
  });
};

// POST /api/complaints/triage-voice
router.post("/triage-voice", parseVoiceAudio, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      stage: "upload",
      message: "No audio file provided in request."
    });
  }

  const audioFilePath = req.file.path;
  const sourceLang = String(req.body.source_lang || "auto").trim().toLowerCase();
  const supportedLanguages = new Set([
    "as", "bn", "en", "gu", "hi", "kn", "ml", "mr", "or", "pa", "ta", "te", "ur", "auto"
  ]);

  try {
    if (!supportedLanguages.has(sourceLang)) {
      return res.status(400).json({
        stage: "language_selection",
        message: "Select a supported spoken language or choose automatic detection."
      });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({
        stage: "configuration",
        message: "Audio analysis signing is not configured."
      });
    }

    const analysis = await processVoiceComplaint(audioFilePath, sourceLang);
    if (
      typeof analysis.transcript !== "string" ||
      !analysis.transcript.trim() ||
      analysis.transcript.length > 8000 ||
      typeof analysis.translated_text !== "string" ||
      !analysis.translated_text.trim() ||
      analysis.translated_text.length > 8000 ||
      !analysis.structured_complaint
    ) {
      return res.status(422).json({
        stage: "nlp_parsing",
        message: "Audio analysis did not return a complete supported result."
      });
    }

    const analysisToken = jwt.sign({
      purpose: "bhashini_audio_complaint",
      ...analysis
    }, process.env.JWT_SECRET, {
      expiresIn: "15m",
      issuer: "arthavyuh-backend",
      audience: "bhashini-audio-complaint"
    });

    return res.status(200).json({
      status: "success",
      ...analysis,
      complaint: analysis.structured_complaint,
      analysis_token: analysisToken
    });
  } catch (error) {
    const stage = error instanceof NlpServiceError ? error.stage : "audio_processing";
    const message = error instanceof NlpServiceError
      ? error.message
      : "Audio processing failed.";
    console.error(`Voice complaint processing failed at stage: ${stage}`);
    return res.status(error instanceof NlpServiceError ? 503 : 500).json({
      status: "error",
      stage,
      message,
    });
  } finally {
    await fs.promises.unlink(audioFilePath).catch(() => {
      console.error("Temporary voice upload cleanup failed.");
    });
  }
});

module.exports = router;
