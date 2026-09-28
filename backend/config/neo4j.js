const neo4j = require("neo4j-driver");
require("dotenv").config();

const neo4jConfigured = Boolean(
    process.env.NEO4J_URI &&
    process.env.NEO4J_USER &&
    process.env.NEO4J_PASSWORD
);

const driver = neo4jConfigured
    ? neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    )
    : null;

async function verifyNeo4jConnection() {
    if (!driver) {
        throw new Error("Neo4j is not configured");
    }

    const session = driver.session({
        database: process.env.NEO4J_DATABASE || undefined
    });

    try {
        await session.run("RETURN 1 AS test");
        console.log("Neo4j connected successfully");
    } catch (error) {
        console.error("Neo4j connection failed:", error.message);
        throw error;
    } finally {
        await session.close();
    }
}

module.exports = {
    driver,
    neo4jConfigured,
    neo4jDatabase: process.env.NEO4J_DATABASE || undefined,
    verifyNeo4jConnection
};