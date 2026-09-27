const { verifyNeo4jConnection, driver } = require("./config/neo4j");

async function testNeo4j() {
    await verifyNeo4jConnection();
    await driver.close();
}

testNeo4j();