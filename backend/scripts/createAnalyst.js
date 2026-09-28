require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/postgres");

const createAnalyst = async () => {
    const name = process.env.INITIAL_ANALYST_NAME?.trim();
    const email = process.env.INITIAL_ANALYST_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ANALYST_PASSWORD;

    if (!name || !email || !password || password.length < 12) {
        throw new Error("Set INITIAL_ANALYST_NAME, INITIAL_ANALYST_EMAIL and an INITIAL_ANALYST_PASSWORD of at least 12 characters.");
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount) {
        throw new Error("An account already exists for INITIAL_ANALYST_EMAIL; no account was changed.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
        `INSERT INTO users (name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, 'analyst', NOW())`,
        [name, email, passwordHash]
    );
    console.log(`Created analyst account for ${email}.`);
};

createAnalyst()
    .catch((error) => {
        console.error("Analyst setup failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
