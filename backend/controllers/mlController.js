const pool = require("../config/postgres");

const normalizeRiskLevel = (value) => {
    if (!value) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized.toUpperCase() : null;
};

const getLatestPredictions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, atm_id, bank_name, city, latitude, longitude,
                    risk_score, risk_level, predicted_risk_level,
                    prediction_confidence, prediction_details, prediction_updated_at
             FROM atms
             WHERE risk_score IS NOT NULL
             ORDER BY risk_score DESC, prediction_confidence DESC NULLS LAST, id ASC
             LIMIT 500`
        );

        res.json(result.rows.map((row) => ({
            ...row,
            atm_risk_inference: row.prediction_details?.live_atm_risk_inference || null,
            atm_risk_provenance: row.prediction_details?.live_atm_risk_inference
                ? "live_atm_risk_inference"
                : "imported_generated_reference_data_not_verified_cashout_events",
            data_notice: row.prediction_details?.live_atm_risk_inference
                ? "ATM risk classification only; not a complaint-to-ATM match or cash-out probability."
                : "Imported/generated reference data — not verified cash-out events."
        })));
    } catch (error) {
        console.error("Error fetching ML predictions:", error.message);
        res.status(500).json({
            message: "Failed to fetch ML predictions"
        });
    }
};

const saveMLResult = async (req, res) => {
    try {
        const {
            atm_id,
            risk_score,
            risk_level,
            predicted_risk_level,
            prediction_confidence,
            prediction_details
        } = req.body;

        const normalizedRiskScore = Number(risk_score);
        const normalizedRiskLevel = normalizeRiskLevel(risk_level || predicted_risk_level);
        const normalizedConfidence = prediction_confidence === undefined || prediction_confidence === null
            ? null
            : Number(prediction_confidence);

        if (
            !atm_id ||
            !Number.isFinite(normalizedRiskScore) ||
            normalizedRiskScore < 0 ||
            normalizedRiskScore > 100 ||
            !normalizedRiskLevel ||
            (normalizedConfidence !== null &&
                (!Number.isFinite(normalizedConfidence) || normalizedConfidence < 0 || normalizedConfidence > 100))
        ) {
            return res.status(400).json({
                message: "atm_id, a 0-100 risk_score, a risk_level and a valid optional prediction_confidence are required"
            });
        }

        const result = await pool.query(
            `
            UPDATE atms
            SET risk_score = $1,
                risk_level = $2,
                predicted_risk_level = $3,
                prediction_confidence = $4,
                prediction_details = $5::jsonb,
                prediction_updated_at = NOW()
            WHERE atm_id = $6
            RETURNING *
            `,
            [
                normalizedRiskScore,
                normalizedRiskLevel,
                normalizedRiskLevel,
                normalizedConfidence,
                JSON.stringify(prediction_details || req.body),
                atm_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "ATM not found"
            });
        }

        res.json({
            message: "ML result saved successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Error saving ML result:", error.message);

        res.status(500).json({
            message: "Failed to save ML result"
        });
    }
};

module.exports = {
    getLatestPredictions,
    saveMLResult
};