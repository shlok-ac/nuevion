const { spawn } = require("node:child_process");
const path = require("node:path");

const ATM_RISK_SCRIPT = path.resolve(__dirname, "../../ml/atm_risk_service.py");

const predictAtmRisk = (atms) => new Promise((resolve, reject) => {
    const python = process.env.ATM_RISK_PYTHON || process.env.NLP_PYTHON || "python";
    const child = spawn(python, [ATM_RISK_SCRIPT], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
    }, Number(process.env.ATM_RISK_TIMEOUT_MS || 30000));

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
            reject(new Error("ATM risk inference timed out"));
            return;
        }
        if (code !== 0) {
            reject(new Error(stderr.trim() || `ATM risk service exited with status ${code}`));
            return;
        }
        try {
            const result = JSON.parse(stdout);
            if (!Array.isArray(result.predictions)) {
                throw new Error("ATM risk service response is missing predictions");
            }
            resolve(result.predictions);
        } catch (error) {
            reject(new Error(`ATM risk service returned an invalid response: ${error.message}`));
        }
    });

    child.stdin.end(JSON.stringify({ atms }));
});

module.exports = { predictAtmRisk };
