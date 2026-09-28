const pool = require("../config/postgres");
const { randomBytes } = require("node:crypto");
const { analyzeComplaintText } = require("../services/nlpService");
const { predictAtmRisk } = require("../services/atmRiskService");
const { syncComplaintGraph } = require("../services/neo4jService");
const jwt = require("jsonwebtoken");

const nullableTrimmed = (value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
};

const inferSameCityAtmRisk = async (location) => {
    if (!location) {
        return { status: "not_applicable", reason: "Complaint has no structured location" };
    }

    const candidates = await pool.query(
        `SELECT atm_id, bank_name, city, latitude, longitude,
                highway_distance, lighting_score, cctv_coverage,
                historical_fraud_count, withdrawal_limit,
                risk_score AS historical_risk_score,
                risk_level AS historical_risk_level
         FROM atms
         WHERE LOWER(BTRIM(city)) = LOWER(BTRIM($1))
         ORDER BY atm_id`,
        [location]
    );

    if (candidates.rows.length === 0) {
        return {
            status: "no_catalog_city_match",
            reason: "No ATM catalog city exactly matches the complaint location",
            candidates: []
        };
    }

    const predictions = await predictAtmRisk(candidates.rows);
    if (predictions.length !== candidates.rows.length) {
        throw new Error("ATM risk service returned a different number of predictions than candidates");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const updatedCandidates = [];
        for (let index = 0; index < candidates.rows.length; index += 1) {
            const atm = candidates.rows[index];
            const prediction = predictions[index];
            if (prediction.atm_id !== atm.atm_id) {
                throw new Error("ATM risk service returned predictions in an unexpected order");
            }
            const update = await client.query(
                `UPDATE atms
                 SET predicted_risk_level = $1,
                     prediction_confidence = $2,
                     prediction_details = COALESCE(prediction_details, '{}'::jsonb)
                         || jsonb_build_object('live_atm_risk_inference', $3::jsonb),
                     prediction_updated_at = NOW()
                 WHERE atm_id = $4
                 RETURNING prediction_updated_at`,
                [
                    prediction.risk_level,
                    prediction.prediction_confidence,
                    JSON.stringify(prediction),
                    atm.atm_id
                ]
            );
            if (!update.rowCount) {
                throw new Error(`ATM ${atm.atm_id} disappeared while saving its risk inference`);
            }
            updatedCandidates.push({
                ...atm,
                candidate_type: "same_city_atm_candidate",
                candidate_basis: "Exact normalized match between complaint location and ATM catalog city",
                atm_risk_level: prediction.risk_level,
                atm_risk_confidence: prediction.prediction_confidence,
                confidence_type: prediction.confidence_type,
                risk_model: prediction.model_version,
                model_features: prediction.features,
                risk_inference_updated_at: update.rows[0].prediction_updated_at,
                cashout_probability: null
            });
        }
        await client.query("COMMIT");
        return {
            status: "inferred",
            classification: "ATM risk only; not a complaint-to-ATM match or cash-out probability",
            candidates: updatedCandidates
        };
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("ATM risk persistence rollback failed:", rollbackError.message);
        }
        throw error;
    } finally {
        client.release();
    }
};

const createComplaint = async (req, res) => {
    const body = req.body || {};
    const complainantName = nullableTrimmed(body.fullName || body.complainant_name);
    const phoneNumber = nullableTrimmed(body.mobile || body.phone_number);
    const email = nullableTrimmed(body.email || body.complainant_email);
    const description = nullableTrimmed(body.description);
    const bankName = nullableTrimmed(body.bankName || body.bank_name);
    const accountNumber = nullableTrimmed(body.accountNumber || body.account_number);
    const transactionType = nullableTrimmed(body.transactionType || body.transaction_type);
    const incidentDate = nullableTrimmed(body.incidentDate || body.fraud_date);
    const incidentTime = nullableTrimmed(body.incidentTime || body.fraud_time);
    const location = nullableTrimmed(body.location);
    const transactionId = nullableTrimmed(body.transactionId || body.transaction_id);
    const fraudAmount = Number(body.fraudAmount ?? body.fraud_amount);
    const audioAnalysisToken = nullableTrimmed(body.audio_analysis_token);
    let audioAnalysis = null;

    if (!complainantName || complainantName.length < 3) {
        return res.status(400).json({ message: "A valid complainant name is required" });
    }
    if (!phoneNumber || !/^[6-9]\d{9}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "A valid 10-digit Indian mobile number is required" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
    }
    if (!description || description.length > 8000) {
        return res.status(400).json({ message: "Complaint description is required and must be at most 8000 characters" });
    }
    if (!bankName) {
        return res.status(400).json({ message: "Bank or financial institution is required" });
    }
    if (!accountNumber || !/^\d{9,18}$/.test(accountNumber)) {
        return res.status(400).json({ message: "Account number must contain 9 to 18 digits" });
    }
    if (!transactionType) {
        return res.status(400).json({ message: "Transaction type is required" });
    }
    if (!Number.isFinite(fraudAmount) || fraudAmount <= 0) {
        return res.status(400).json({ message: "Fraud amount must be greater than zero" });
    }
    if (!incidentDate || !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate) || Number.isNaN(Date.parse(incidentDate))) {
        return res.status(400).json({ message: "A valid incident date is required" });
    }
    if (audioAnalysisToken) {
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ message: "Audio analysis validation is not configured" });
        }
        try {
            const decoded = jwt.verify(audioAnalysisToken, process.env.JWT_SECRET, {
                issuer: "nuevion-backend",
                audience: "bhashini-audio-complaint"
            });
            if (
                decoded.purpose !== "bhashini_audio_complaint" ||
                decoded.transcript !== description ||
                typeof decoded.translated_text !== "string" ||
                !decoded.structured_complaint ||
                typeof decoded.structured_complaint !== "object"
            ) {
                return res.status(400).json({
                    message: "Audio analysis does not match the complaint description; process the audio again."
                });
            }
            audioAnalysis = decoded;
        } catch (error) {
            return res.status(400).json({
                message: "Audio analysis is invalid or expired; process the audio again."
            });
        }
    }

    const evidence = Array.isArray(body.evidence)
        ? body.evidence
            .filter((item) => item && typeof item.name === "string")
            .slice(0, 10)
            .map((item) => ({
                name: item.name.slice(0, 255),
                size: Number.isFinite(Number(item.size)) ? Number(item.size) : null,
                type: typeof item.type === "string" ? item.type.slice(0, 100) : null
            }))
        : [];
    const complaintNumber = `CYB-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const caseNumber = `CASE-${complaintNumber}`;
    let client;
    let complaint;
    let investigationCase;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        const complaintResult = await client.query(
            `INSERT INTO complaints (
                complaint_number, complainant_name, phone_number, bank_name,
                account_number, transaction_id, fraud_amount, transaction_type,
                fraud_date, fraud_time, location, description, source,
                created_at, evidence_metadata, complainant_email
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                NOW(), $14::jsonb, $15
            ) RETURNING *`,
            [
                complaintNumber,
                complainantName,
                phoneNumber,
                bankName,
                accountNumber,
                transactionId,
                fraudAmount,
                transactionType,
                incidentDate,
                incidentTime,
                location,
                description,
                audioAnalysis ? "1930_audio_prototype" : "citizen_portal",
                JSON.stringify(evidence),
                email
            ]
        );
        complaint = complaintResult.rows[0];

        const caseResult = await client.query(
            `INSERT INTO cases (
                case_number, complaint_id, status, created_at, updated_at
            ) VALUES ($1, $2, 'Received', NOW(), NOW())
            RETURNING *`,
            [caseNumber, complaint.id]
        );
        investigationCase = caseResult.rows[0];
        await client.query("COMMIT");
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Complaint transaction rollback failed:", rollbackError.message);
            }
        }
        console.error("Complaint persistence failed:", error.message);
        return res.status(client ? 500 : 503).json({ message: "Complaint could not be saved" });
    } finally {
        if (client) client.release();
    }

    let nlp = { status: "unavailable" };
    try {
        const analysis = audioAnalysis
            ? audioAnalysis.structured_complaint
            : await analyzeComplaintText(description);
        const storedAnalysis = {
            ...analysis,
            ...(audioAnalysis ? {
                transcript: audioAnalysis.transcript,
                translated_text: audioAnalysis.translated_text,
                detected_language: audioAnalysis.detected_language,
                source_language: audioAnalysis.source_language,
                field_provenance: audioAnalysis.field_provenance,
                audio_provenance: audioAnalysis.provenance
            } : {}),
            provenance: audioAnalysis
                ? "bhashini_audio_nlp_extraction"
                : "complaint_text_nlp_extraction",
            verified: false
        };
        const update = await pool.query(
            "UPDATE complaints SET nlp_result = $1::jsonb WHERE id = $2 RETURNING nlp_result",
            [JSON.stringify(storedAnalysis), complaint.id]
        );
        complaint.nlp_result = update.rows[0].nlp_result;
        nlp = { status: "complete", data: complaint.nlp_result };
    } catch (error) {
        console.error("Complaint NLP analysis failed:", error.message);
        nlp = { status: "failed", message: "Text analysis is unavailable; the original complaint was saved" };
    }

    let atmCandidates;
    try {
        atmCandidates = await inferSameCityAtmRisk(complaint.location);
    } catch (error) {
        console.error("Same-city ATM risk inference failed:", error.message);
        atmCandidates = {
            status: "failed",
            reason: "ATM risk inference is unavailable; no cash-out relationship was inferred",
            candidates: []
        };
    }

    let graph = { status: "unavailable" };
    complaint.case_number = investigationCase.case_number;
    complaint.case_status = investigationCase.status;
    try {
        await syncComplaintGraph(complaint);
        graph = { status: "synced" };
    } catch (error) {
        console.error("Complaint graph synchronization failed:", error.message);
        graph = { status: "failed", message: "Graph synchronization is unavailable; the complaint remains in PostgreSQL" };
    }

    return res.status(201).json({
        complaint,
        case: investigationCase,
        nlp,
        atm_candidates: atmCandidates,
        graph
    });
};

const getAllComplaints = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM complaints ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching complaints:", error.message);

        res.status(500).json({
            message: "Failed to fetch complaints"
        });
    }
};

const getComplaintStatus = async (req, res) => {
    const complaintNumber = String(req.params.complaintNumber || "").trim();
    const phoneNumber = String(req.query.phone || "").trim();
    if (!complaintNumber || !/^[6-9]\d{9}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "Complaint number and registered phone number are required" });
    }

    try {
        const result = await pool.query(
            `SELECT c.complaint_number, c.created_at,
                    COALESCE(cs.status, 'Received') AS status
             FROM complaints c
             LEFT JOIN LATERAL (
                 SELECT status
                 FROM cases
                 WHERE complaint_id = c.id
                 ORDER BY created_at DESC
                 LIMIT 1
             ) cs ON TRUE
             WHERE c.complaint_number = $1 AND c.phone_number = $2`,
            [complaintNumber, phoneNumber]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No complaint matches those details" });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Complaint status lookup failed:", error.message);
        return res.status(500).json({ message: "Unable to retrieve complaint status" });
    }
};

module.exports = {
    createComplaint,
    getComplaintStatus,
    getAllComplaints
};