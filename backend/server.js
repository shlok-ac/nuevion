/**
 * SentinCash demo API.
 *
 * Replaces the Postgres/Neo4j stack for the demo: SQLite via node:sqlite (built into
 * Node 24) and hop-ordered traversal for the money trail, so the whole pipeline runs
 * with no external services. The Cypher under database/neo4j stays the production
 * reference for the graph projection.
 *
 * Routes are split by domain: see routes/ for the individual routers.
 */
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { DB_PATH } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/v1", require("./routes/health"));
app.use("/api/v1", require("./routes/complaints"));
app.use("/api/v1", require("./routes/cases"));
app.use("/api/v1", require("./routes/atms"));
app.use("/api/v1", require("./routes/alerts"));
app.use("/api/v1", require("./routes/moneyTrail"));
app.use("/api/v1", require("./routes/nlp"));
app.use("/api/v1", require("./routes/triageVoice"));
app.use("/api/v1", require("./routes/ml"));
app.use("/api/v1", require("./routes/auth"));
app.use("/api/v1", require("./routes/sync"));

app.get("/", (req, res) => {
  res.json({
    message: "SentinCash API is running",
    database: DB_PATH,
    ml: "ml-random-forest (in-process)",
    nlp: "rule-based helpline extractor",
    docs: "/api/v1/health",
  });
});

const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SentinCash API listening on http://localhost:${PORT}`);
    console.log(`  database: ${DB_PATH}`);
    console.log("  login not enforced (JWT_AUTH unset) — POST /api/v1/auth/login works");
  });
}

module.exports = app;
