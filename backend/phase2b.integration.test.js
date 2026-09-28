require("dotenv").config();
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { after, before, test } = require("node:test");
const bcrypt = require("bcryptjs");
const pool = require("./config/postgres");
const { driver, neo4jDatabase } = require("./config/neo4j");

const backendDirectory = __dirname;
const analystEmail = `phase2b-${randomUUID()}@example.invalid`;
const analystPassword = randomUUID();
const transactionId = `PHASE2B-${randomUUID()}`;
const testBankName = `Phase 2B ${randomUUID()} Bank`;
const phoneNumber = `9${String(Date.now()).slice(-9)}`;
const accountNumber = `8${String(Date.now()).slice(-9)}`;
const jwtSecret = randomUUID() + randomUUID();
let analystId;
let complaintId;
let complaintNumber;
let caseNumber;
let serverProcess;
let baseUrl;
let token;
let healthPayload;
let atmPredictionSnapshot = [];

const getOpenPort = async () => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address();
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
    return port;
};

const apiRequest = async (endpoint, options = {}) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        signal: AbortSignal.timeout(45000)
    });
    const body = await response.json();
    return { response, body };
};

before(async () => {
    const passwordHash = await bcrypt.hash(analystPassword, 4);
    const user = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, created_at)
         VALUES ('Phase 2B integration test', $1, $2, 'analyst', NOW())
         RETURNING id`,
        [analystEmail, passwordHash]
    );
    analystId = user.rows[0].id;

    const port = await getOpenPort();
    baseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ["server.js"], {
        cwd: backendDirectory,
        env: {
            ...process.env,
            PORT: String(port),
            JWT_SECRET: jwtSecret
        },
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"]
    });

    let serverError = "";
    serverProcess.stderr.setEncoding("utf8");
    serverProcess.stderr.on("data", (chunk) => { serverError += chunk; });
    serverProcess.once("exit", (code) => {
        if (code !== null && code !== 0) serverError += `Backend exited with code ${code}`;
    });

    let lastError;
    for (let attempt = 0; attempt < 60; attempt += 1) {
        if (serverProcess.exitCode !== null) {
            throw new Error(`Integrated backend exited before readiness: ${serverError}`);
        }
        try {
            const result = await fetch(`${baseUrl}/api/health`, {
                signal: AbortSignal.timeout(2000)
            });
            if (result.ok) {
                healthPayload = await result.json();
                return;
            }
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Integrated backend health check timed out: ${lastError?.message || serverError}`);
});

after(async () => {
    if (serverProcess && serverProcess.exitCode === null) {
        serverProcess.kill("SIGTERM");
        await Promise.race([
            once(serverProcess, "exit"),
            new Promise((resolve) => setTimeout(resolve, 5000))
        ]);
        if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
    }

    if (driver && complaintId !== undefined) {
        const session = driver.session({ database: neo4jDatabase });
        try {
            await session.run(
                "MATCH (n:Complaint {id: $id}) DETACH DELETE n",
                { id: Number(complaintId) }
            );
            await session.run(
                "MATCH (c:Case {case_number: $caseNumber}) DETACH DELETE c",
                { caseNumber }
            );
            await session.run(
                "MATCH (t:Transaction {transaction_id: $transactionId}) DETACH DELETE t",
                { transactionId }
            );
            await session.run(
                "MATCH (a:Account {account_number: $accountNumber}) DETACH DELETE a",
                { accountNumber }
            );
            await session.run(
                "MATCH (b:Bank {name: $bankName}) DETACH DELETE b",
                { bankName: testBankName }
            );
        } finally {
            await session.close();
        }
    }

    if (caseNumber) await pool.query("DELETE FROM cases WHERE case_number = $1", [caseNumber]);
    if (complaintNumber) await pool.query("DELETE FROM complaints WHERE complaint_number = $1", [complaintNumber]);
    if (analystId) await pool.query("DELETE FROM users WHERE id = $1", [analystId]);
    for (const atm of atmPredictionSnapshot) {
        await pool.query(
            `UPDATE atms
             SET predicted_risk_level = $1,
                 prediction_confidence = $2,
                 prediction_details = $3::jsonb,
                 prediction_updated_at = $4
             WHERE atm_id = $5`,
            [
                atm.predicted_risk_level,
                atm.prediction_confidence,
                atm.prediction_details === null ? null : JSON.stringify(atm.prediction_details),
                atm.prediction_updated_at,
                atm.atm_id
            ]
        );
    }
    await pool.end();
    if (driver) await driver.close();
});

test("health reports PostgreSQL and Neo4j readiness", () => {
    assert.equal(healthPayload.status, "ready");
    assert.equal(healthPayload.services.postgres, "ok");
    assert.equal(healthPayload.services.neo4j, "ok");
});

test("complaint, NLP, ATM candidates, risk inference, dashboard, and fraud trace work end to end", async () => {
    const login = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: analystEmail, password: analystPassword })
    });
    assert.equal(login.response.status, 200);
    token = login.body.token;
    assert.ok(token);

    const dashboardBefore = await apiRequest("/api/dashboard");
    assert.equal(dashboardBefore.response.status, 200);

    const alertsBefore = await apiRequest("/api/alerts");
    assert.equal(alertsBefore.response.status, 200);

    const atmSnapshot = await pool.query(
        `SELECT atm_id, predicted_risk_level, prediction_confidence,
                prediction_details, prediction_updated_at
         FROM atms WHERE LOWER(BTRIM(city)) = 'pune'`
    );
    atmPredictionSnapshot = atmSnapshot.rows;

    const nlp = await apiRequest("/api/nlp/analyze", {
        method: "POST",
        body: JSON.stringify({ text: "Fraud transfer of Rs 12,500 through UPI in Pune." })
    });
    assert.equal(nlp.response.status, 200);
    assert.equal(nlp.body.data.stolen_amount_inr, 12500);

    const submitted = await apiRequest("/api/complaints", {
        method: "POST",
        body: JSON.stringify({
            fullName: "Phase 2B Integration Test",
            mobile: phoneNumber,
            bankName: testBankName,
            accountNumber,
            transactionId,
            fraudAmount: 12500,
            transactionType: "UPI",
            incidentDate: new Date().toISOString().slice(0, 10),
            incidentTime: "12:30",
            location: "Pune",
            description: "Fraud transfer of Rs 12,500 through UPI in Pune."
        })
    });
    assert.equal(submitted.response.status, 201);
    complaintId = submitted.body.complaint?.id;
    complaintNumber = submitted.body.complaint?.complaint_number;
    caseNumber = submitted.body.case?.case_number;
    assert.equal(submitted.body.nlp.status, "complete");
    assert.equal(submitted.body.nlp.data.verified, false);
    assert.equal(submitted.body.atm_candidates.status, "inferred");
    assert.ok(submitted.body.atm_candidates.candidates.length > 0);
    assert.equal(submitted.body.atm_candidates.candidates[0].cashout_probability, null);
    assert.ok(submitted.body.atm_candidates.candidates[0].atm_risk_level);
    assert.ok(submitted.body.atm_candidates.candidates[0].model_features);
    assert.equal(submitted.body.graph.status, "synced");

    const stored = await pool.query(
        `SELECT c.nlp_result, cs.case_number
         FROM complaints c JOIN cases cs ON cs.complaint_id = c.id
         WHERE c.id = $1`,
        [complaintId]
    );
    assert.equal(stored.rows[0].case_number, caseNumber);
    assert.equal(stored.rows[0].nlp_result.verified, false);
    assert.equal(stored.rows[0].nlp_result.stolen_amount_inr, 12500);

    const atmId = submitted.body.atm_candidates.candidates[0].atm_id;
    const storedAtm = await pool.query(
        `SELECT prediction_details #> '{live_atm_risk_inference}' AS inference
         FROM atms WHERE atm_id = $1`,
        [atmId]
    );
    assert.equal(storedAtm.rows[0].inference.provenance, "live_atm_risk_inference");

    const predictions = await apiRequest("/api/ml/predictions");
    assert.equal(predictions.response.status, 200);
    assert.ok(predictions.body.some((row) => row.atm_id === atmId && row.atm_risk_inference));

    const dashboardAfter = await apiRequest("/api/dashboard");
    assert.equal(dashboardAfter.response.status, 200);
    const dashboardCase = dashboardAfter.body.cases.find((row) => row.case_number === caseNumber);
    assert.ok(dashboardCase);
    assert.equal(dashboardCase.nlp_analysis.verified, false);
    assert.ok(dashboardCase.same_city_atm_candidates.length > 0);

    const caseDetail = await apiRequest(`/api/cases/${encodeURIComponent(caseNumber)}`);
    assert.equal(caseDetail.response.status, 200);
    assert.equal(caseDetail.body.live_record, true);
    assert.ok(caseDetail.body.same_city_atm_candidates.length > 0);

    const alertsAfter = await apiRequest("/api/alerts");
    assert.equal(alertsAfter.response.status, 200);
    assert.equal(alertsAfter.body.length, alertsBefore.body.length);

    const trace = await apiRequest(`/api/fraud/trace/${complaintId}`);
    assert.equal(trace.response.status, 200);
    assert.equal(trace.body.data.verified, false);
    assert.ok(trace.body.data.reported_accounts.length > 0);
    assert.ok(trace.body.data.reported_transactions.length > 0);
});
