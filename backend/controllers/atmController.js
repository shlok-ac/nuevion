const pool = require("../config/postgres");

const getAllATMs = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM atms ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching ATMs:", error.message);

        res.status(500).json({
            message: "Failed to fetch ATMs"
        });
    }
};

module.exports = {
    getAllATMs
};