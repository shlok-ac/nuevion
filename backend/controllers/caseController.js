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

module.exports = {
    getAllCases
};