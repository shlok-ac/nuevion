const { spawn } = require("node:child_process");
const path = require("node:path");

const NLP_SCRIPT = path.resolve(__dirname, "../../ml/nlp_service.py");

class NlpServiceError extends Error {
    constructor(stage, message) {
        super(message);
        this.name = "NlpServiceError";
        this.stage = stage;
    }
}

const runNlpProcess = (payload, timeoutMs) => new Promise((resolve, reject) => {
    const python = process.env.NLP_PYTHON || "python";
    const child = spawn(python, [NLP_SCRIPT], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputTooLarge = false;

    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 1024 * 1024) {
            outputTooLarge = true;
            child.kill();
        }
    });
    child.stderr.on("data", (chunk) => {
        stderr += chunk;
        if (stderr.length > 64 * 1024) stderr = stderr.slice(-64 * 1024);
    });
    child.on("error", () => {
        clearTimeout(timeout);
        reject(new NlpServiceError("runtime", "The configured Python NLP runtime could not start."));
    });
    child.on("close", (code) => {
        clearTimeout(timeout);
        if (timedOut) {
            reject(new NlpServiceError("timeout", "NLP processing timed out."));
            return;
        }
        if (outputTooLarge) {
            reject(new NlpServiceError("nlp_processing", "NLP processing returned an invalid response."));
            return;
        }
        if (code !== 0) {
            try {
                const failure = JSON.parse(stderr.trim());
                reject(new NlpServiceError(
                    failure.stage || "nlp_processing",
                    failure.message || "NLP processing failed."
                ));
            } catch {
                reject(new NlpServiceError("nlp_processing", "NLP processing failed."));
            }
            return;
        }
        try {
            resolve(JSON.parse(stdout));
        } catch {
            reject(new NlpServiceError("nlp_processing", "NLP service returned invalid JSON."));
        }
    });

    child.stdin.end(JSON.stringify(payload));
});

const analyzeComplaintText = (text) => runNlpProcess(
    { text },
    Number(process.env.NLP_TIMEOUT_MS || 10000)
);

const processVoiceComplaint = async (audioFilePath, sourceLang = "auto") => {
    if (typeof audioFilePath !== "string" || !audioFilePath.trim()) {
        throw new NlpServiceError("upload", "A readable audio file path is required.");
    }
    return runNlpProcess(
        { audio_path: audioFilePath, source_language: sourceLang },
        Number(process.env.BHASHINI_TIMEOUT_MS || 120000)
    );
};

module.exports = {
    analyzeComplaintText,
    processVoiceComplaint,
    NlpServiceError
};
