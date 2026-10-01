// Connectivity check for the configured PostgreSQL instance.
// Run with: npm run check:db
const pool = require("../config/postgres");

async function testDatabase() {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        console.log("PostgreSQL connection successful!");
        console.log(result.rows[0]);

    } catch (error) {
        console.error("Database connection failed:");
        console.error(error.message);

    } finally {
        await pool.end();
    }
}

testDatabase();