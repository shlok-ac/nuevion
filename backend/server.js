const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const pool = require("./config/postgres");
const { driver, neo4jConfigured, neo4jDatabase } = require("./config/neo4j");

const allowedOrigins = new Set(
    (process.env.FRONTEND_ORIGINS ||
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin is not allowed by CORS"));
    }
}));
app.use(express.json({ limit: "1mb" }));

// Complaint routes
const complaintRoutes = require("./routes/complaintRoutes");
const caseRoutes = require("./routes/caseRoutes");
const atmRoutes = require("./routes/atmRoutes");
const alertRoutes = require("./routes/alertRoutes");
const fraudRoutes = require("./routes/fraudRoutes");
const mlRoutes = require("./routes/mlRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const nlpRoutes = require("./routes/nlpRoutes");

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/atms", atmRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/nlp", nlpRoutes);

app.get("/api/health", async (req, res) => {
    const services = {
        backend: "ok",
        postgres: "unavailable",
        neo4j: neo4jConfigured ? "unavailable" : "not_configured"
    };

    try {
        await pool.query("SELECT 1");
        services.postgres = "ok";
    } catch (error) {
        console.error("PostgreSQL health check failed:", error.message);
    }

    if (driver) {
        const session = driver.session({ database: neo4jDatabase });
        try {
            await session.run("RETURN 1 AS health");
            services.neo4j = "ok";
        } catch (error) {
            console.error("Neo4j health check failed:", error.message);
        } finally {
            await session.close();
        }
    }

    const ready = services.postgres === "ok" && services.neo4j === "ok";
    res.json({
        status: ready ? "ready" : "degraded",
        services
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "Cyber Fraud Detection Backend is running"
    });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const closeServer = async () => {
    server.close(async () => {
        if (driver) await driver.close();
        await pool.end();
    });
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);