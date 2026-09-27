const neo4j = require("neo4j-driver");
require("dotenv").config();

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(
        process.env.NEO4J_USER,
        process.env.NEO4J_PASSWORD
    )
);

async function verifyNeo4jConnection() {
    const session = driver.session();

    try {
        await session.run("RETURN 1 AS test");
        console.log("Neo4j connected successfully");
    } catch (error) {
        console.error("Neo4j connection failed:");
        console.error(error.message);
    } finally {
        await session.close();
    }
}

module.exports = {
    driver,
    verifyNeo4jConnection
};