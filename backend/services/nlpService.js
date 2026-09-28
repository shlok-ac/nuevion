const { spawn } = require("node:child_process");
const path = require("node:path");

const NLP_SCRIPT = path.resolve(__dirname, "../../ml/nlp_service.py");

const analyzeComplaintText = (text) => new Promise((resolve, reject) => {
    const python = process.env.NLP_PYTHON || "python";
    const child = spawn(python, [NLP_SCRIPT], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
    }, Number(process.env.NLP_TIMEOUT_MS || 10000));

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
    });
    child.on("close", (code) => {
        clearTimeout(timeout);
        if (timedOut) {
            reject(new Error("NLP analysis timed out"));
            return;
        }
        if (code !== 0) {
            reject(new Error(stderr.trim() || `NLP process exited with status ${code}`));
            return;
        }
        try {
            resolve(JSON.parse(stdout));
        } catch (error) {
            reject(new Error("NLP service returned invalid JSON"));
        }
    });

    child.stdin.end(JSON.stringify({ text }));
});

const processVoiceComplaint = (audioFilePath, sourceLang = "hi") => {
  return new Promise((resolve, reject) => {
    const path = require("path");
    const { spawn } = require("child_process");
    const scriptPath = path.join(__dirname, "..", "nlp_engine.py");
    const pyProcess = spawn("python3", [scriptPath, audioFilePath, sourceLang]);

    let stdoutData = "";
    let stderrData = "";

    pyProcess.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProcess.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    pyProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`NLP Engine exited with code ${code}: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse NLP JSON output: ${stdoutData}`));
      }
    });
  });
};
module.exports = { analyzeComplaintText, processVoiceComplaint };
