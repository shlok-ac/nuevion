const pool = require("../config/postgres");

const getAllCases = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM cases ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching cases:", error.message);

        res.status(500).json({
            message: "Failed to fetch cases"
        });
    }
};

const getCaseById = async (req, res) => {
    const identifier = String(req.params.caseId || "").trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(identifier)) {
        return res.status(400).json({ message: "A valid case identifier is required" });
    }

    try {
        const result = await pool.query(
            `SELECT cs.id, cs.case_number, cs.complaint_id, cs.priority, cs.status,
                    cs.assigned_to, cs.risk_level, cs.created_at, cs.updated_at,
                    co.complaint_number, co.complainant_name AS victim,
                    co.bank_name, co.location AS branch, co.account_number AS account,
                    co.transaction_type AS "fraudType", co.transaction_type,
                    co.fraud_amount AS amount, co.fraud_amount, co.location, co.description,
                    co.phone_number, co.transaction_id, co.fraud_date AS "filedDate",
                    co.fraud_time, co.source AS complaint_source,
                    co.nlp_result AS nlp_analysis,
                    co.evidence_metadata,
                    COALESCE(cs.updated_at, cs.created_at, co.created_at) AS "lastActivity",
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'candidate_type', 'same_city_atm_candidate',
                            'atm_id', atm.atm_id, 'bank_name', atm.bank_name,
                            'city', atm.city, 'latitude', atm.latitude, 'longitude', atm.longitude,
                            'highway_distance', atm.highway_distance,
                            'lighting_score', atm.lighting_score,
                            'cctv_coverage', atm.cctv_coverage,
                            'historical_fraud_count', atm.historical_fraud_count,
                            'withdrawal_limit', atm.withdrawal_limit,
                            'historical_risk_score', atm.risk_score,
                            'historical_risk_level', atm.risk_level,
                            'atm_risk_level', atm.prediction_details #>> '{live_atm_risk_inference,risk_level}',
                            'atm_risk_confidence', (atm.prediction_details #>> '{live_atm_risk_inference,prediction_confidence}')::numeric,
                            'confidence_type', atm.prediction_details #>> '{live_atm_risk_inference,confidence_type}',
                            'model_features', atm.prediction_details #> '{live_atm_risk_inference,features}',
                            'risk_model', atm.prediction_details #>> '{live_atm_risk_inference,model_version}',
                            'risk_inference_updated_at', atm.prediction_updated_at,
                            'cashout_probability', NULL
                        ) ORDER BY atm.atm_id)
                        FROM atms atm
                        WHERE LOWER(BTRIM(atm.city)) = LOWER(BTRIM(co.location))
                    ), '[]'::json) AS same_city_atm_candidates,
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'atm_id', atm.atm_id,
                            'cashout_account', pred.cashout_account,
                            'location', pred.location,
                            'bank_name', atm.bank_name,
                            'latitude', atm.latitude,
                            'longitude', atm.longitude,
                            'historical_atm_risk_level', pred.predicted_risk_level,
                            'historical_prediction_confidence', pred.prediction_confidence,
                            'provenance', 'generated_prototype_mapping',
                            'verified', false,
                            'label', 'Imported/generated reference data — not verified cash-out events.'
                        ) ORDER BY pred.id)
                        FROM complaint_cashout_predictions pred
                        JOIN atms atm ON atm.atm_id = pred.atm_id
                        WHERE pred.complaint_id = co.id
                    ), '[]'::json) AS generated_prototype_mappings
             FROM cases cs
             JOIN complaints co ON co.id = cs.complaint_id
             WHERE cs.id::text = $1 OR cs.case_number = $1
             ORDER BY cs.created_at DESC
             LIMIT 1`,
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Case not found" });
        }
        return res.json({
            ...result.rows[0],
            title: result.rows[0].description || result.rows[0].complaint_number,
            live_record: true,
            data_provenance: "live_postgresql_complaint_and_case"
        });
    } catch (error) {
        console.error("Error fetching case:", error.message);
        return res.status(500).json({ message: "Failed to fetch case" });
    }
};

module.exports = {
    getAllCases,
    getCaseById
};