const pool = require("../config/postgres");

const getAllAlerts = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM alerts ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching alerts:", error.message);

        res.status(500).json({
            message: "Failed to fetch alerts"
        });
    }
};

module.exports = {
    getAllAlerts
};