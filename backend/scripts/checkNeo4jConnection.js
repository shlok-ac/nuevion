// Connectivity check for the configured Neo4j instance.
// Run with: npm run check:neo4j
const { verifyNeo4jConnection, driver } = require("../config/neo4j");

async function testNeo4j() {
    await verifyNeo4jConnection();
    await driver.close();
}

testNeo4j();