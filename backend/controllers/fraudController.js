const { driver } = require("../config/neo4j");

const traceFraud = async (req, res) => {
    const complaintId = req.params.complaintId;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (c:Complaint)-[:INVOLVES]->(a:Account)
                  -[:MADE]->(t:Transaction)
            OPTIONAL MATCH (t)-[:AT_BANK]->(b:Bank)
            OPTIONAL MATCH (t)-[:OCCURRED_IN]->(l:Location)

            WHERE c.id = $complaintId

            RETURN
                c.id AS complaint_id,
                c.complaint_number AS complaint_number,
                a.account_number AS account_number,
                t.transaction_id AS transaction_id,
                t.amount AS amount,
                t.type AS transaction_type,
                b.name AS bank,
                l.name AS location
            `,
            {
                complaintId: Number(complaintId)
            }
        );

        const fraudTrace = result.records.map(record => ({
            complaint_id: record.get("complaint_id"),
            complaint_number: record.get("complaint_number"),
            account_number: record.get("account_number"),
            transaction_id: record.get("transaction_id"),
            amount: record.get("amount"),
            transaction_type: record.get("transaction_type"),
            bank: record.get("bank"),
            location: record.get("location")
        }));

        res.json({
            success: true,
            data: fraudTrace
        });

    } catch (error) {
        console.error("Neo4j fraud tracing error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to trace fraud"
        });

    } finally {
        await session.close();
    }
};

module.exports = {
    traceFraud
};