const pool = require("../config/postgres");

const getDashboardData = async (req, res) => {
    try {
        const [complaints, cases, atms, alerts] = await Promise.all([
            pool.query("SELECT * FROM complaints ORDER BY id"),
            pool.query(
                `SELECT cs.id, cs.case_number, cs.complaint_id, cs.priority, cs.status,
                        cs.assigned_to, cs.risk_level, cs.created_at, cs.updated_at,
                        co.complaint_number, co.complainant_name AS victim,
                        co.location AS branch, co.bank_name,
                        co.account_number AS account, co.account_number,
                        co.transaction_type AS "fraudType", co.transaction_type,
                        co.fraud_amount AS amount, co.fraud_amount,
                        co.location, co.description,
                        co.nlp_result AS nlp_analysis,
                        co.source AS complaint_source,
                        COALESCE(cs.updated_at, cs.created_at, co.created_at) AS "lastActivity",
                        COALESCE((
                            SELECT json_agg(json_build_object(
                                'candidate_type', 'same_city_atm_candidate',
                                'atm_id', atm.atm_id,
                                'bank_name', atm.bank_name,
                                'city', atm.city,
                                'latitude', atm.latitude,
                                'longitude', atm.longitude,
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
                 ORDER BY cs.created_at DESC, cs.id DESC`
            ),
            pool.query("SELECT * FROM atms ORDER BY id"),
            pool.query("SELECT * FROM alerts ORDER BY id")
        ]);

        res.json({
            complaints: complaints.rows,
            cases: cases.rows,
            atms: atms.rows,
            alerts: alerts.rows
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error.message);
        res.status(500).json({
            message: "Failed to fetch dashboard data"
        });
    }
};

module.exports = {
    getDashboardData
};
