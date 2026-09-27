const pool = require("../config/postgres");

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

module.exports = {
    getAllComplaints
};