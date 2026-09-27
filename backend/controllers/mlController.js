const pool = require("../config/postgres");

const saveMLResult = async (req, res) => {
    try {
        const {
            atm_id,
            risk_score,
            risk_level
        } = req.body;

        if (!atm_id || risk_score === undefined || !risk_level) {
            return res.status(400).json({
                message: "atm_id, risk_score and risk_level are required"
            });
        }

        const result = await pool.query(
            `
            UPDATE atms
            SET risk_score = $1,
                risk_level = $2
            WHERE atm_id = $3
            RETURNING *
            `,
            [risk_score, risk_level, atm_id]
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
    saveMLResult
};