const express = require("express");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const multer = require("multer");
const nlp = require("../services/nlp");

const router = express.Router();
const uploadDirectory = path.join(os.tmpdir(), "senticash-voice-triage");
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const requiredBhashiniVariables = [
  "BHASHINI_USER_ID",
  "BHASHINI_API_KEY",
  "BHASHINI_INFERENCE_KEY",
  "BHASHINI_PIPELINE_ID",
];

const demoTranscript =
  "माझ्या खात्यातून दोन लाख रुपये गेले आहेत. एका व्यक्तीने पोलिस अधिकारी असल्याचे सांगून मला पैसे UPI वर पाठवायला सांगितले.";
const demoTranslation =
  "A person pretending to be a police officer called me and told me to send Rs 200,000 through UPI.";

function makeStructuredComplaint(transcript, translatedText) {
  const extracted = nlp.extractFromTranscript(translatedText);
  const processedAt = new Date().toISOString();
  const complaintId = `1930-${processedAt.replace(/\D/g, "").slice(0, 14)}-${Date.now() % 1000}`;
  const location = extracted.location || null;

  return {
    complaint_id: complaintId,
    reference_id: complaintId,
    english_transcript: extracted.transcript,
    stolen_amount_inr: extracted.stolen_amount_inr,
    transfer_mode: extracted.transfer_mode,
    initial_mule_account: extracted.mule_accounts[0] || null,
    incident_date: null,
    incident_time: null,
    incident_place: location,
    location,
    victim_lat: null,
    victim_lon: null,
    scam_category: extracted.scam_category,
    processed_at: processedAt,
    complainant_name: extracted.complainant_name,
    phone_number: extracted.phone_number,
    confidence: extracted.confidence,
  };
}

function runBhashiniPython(audioPath, sourceLanguage) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "..", "..", "bhashini_service.py");
    const child = spawn(
      process.env.PYTHON_EXECUTABLE || "python",
      [scriptPath],
      {
        cwd: path.resolve(__dirname, "..", ".."),
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("Audio processing timed out."));
    }, 120000);

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(result);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 2_000_000) {
        child.kill();
        finish(new Error("Audio processing returned an oversized response."));
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
    });
    child.on("error", () => finish(new Error("Python runtime could not be started.")));
    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        const stage = stderr.match(/stage=([a-z_]+)/)?.[1] || "audio_processing";
        const error = new Error("Bhashini and Whisper processing failed.");
        error.stage = stage;
        finish(error);
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (!result.transcript || !result.translated_text) {
          throw new Error("ASR or translation returned no text.");
        }
        finish(null, result);
      } catch {
        finish(new Error("Audio processing returned an invalid response."));
      }
    });
    child.stdin.end(JSON.stringify({ audio_path: audioPath, source_language: sourceLanguage }));
  });
}

router.post("/triage-voice", (req, res) => {
  upload.single("audio")(req, res, async (uploadError) => {
    if (uploadError) {
      const status = uploadError instanceof multer.MulterError ? 400 : 500;
      return res.status(status).json({
        status: "error",
        message: uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE"
          ? "Audio file must be 25 MB or smaller."
          : "Audio upload failed.",
      });
    }
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "audio file is required." });
    }

    const sourceLanguage = req.body?.sourceLanguage || "auto";
    if (!new Set(["auto", "en", "hi", "mr", "pa", "ta", "te", "bn", "gu"]).has(sourceLanguage)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        status: "error",
        message: "sourceLanguage must be auto or a supported language code.",
      });
    }

    try {
      const missingVariables = requiredBhashiniVariables.filter(
        (name) => !process.env[name]?.trim(),
      );
      let transcript;
      let translatedText;
      let mode;
      let detectedLanguage;

      if (missingVariables.length > 0) {
        transcript = demoTranscript;
        translatedText = demoTranslation;
        mode = "demo";
        detectedLanguage = "mr";
      } else {
        const result = await runBhashiniPython(req.file.path, sourceLanguage);
        transcript = result.transcript;
        translatedText = result.translated_text;
        detectedLanguage = result.detected_language || result.source_language || sourceLanguage;
        mode = result.engine === "whisper" ? "whisper_fallback" : "bhashini";
      }

      const structuredComplaint = makeStructuredComplaint(transcript, translatedText);
      return res.json({
        status: "success",
        mode,
        message: mode === "demo" ? "Demo Mode: live Bhashini credentials are not configured." : undefined,
        complaint_id: structuredComplaint.complaint_id,
        scam_category: structuredComplaint.scam_category,
        structured_complaint: structuredComplaint,
        transcript,
        translated_text: translatedText,
        detected_language: detectedLanguage,
      });
    } catch (error) {
      const stage = error.stage || "voice_processing";
      console.error(`Voice triage failed at ${stage}.`);
      return res.status(502).json({
        status: "error",
        stage,
        message: error.message || "Voice processing failed.",
      });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  });
});

module.exports = router;
