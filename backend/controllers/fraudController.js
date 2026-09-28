const { driver, neo4jDatabase } = require("../config/neo4j");

const traceFraud = async (req, res) => {
    const complaintId = Number(req.params.complaintId);
    if (!Number.isInteger(complaintId) || complaintId < 1) {
        return res.status(400).json({
            success: false,
            message: "A valid complaint ID is required"
        });
    }
    if (!driver) {
        return res.status(503).json({
            success: false,
            message: "Neo4j is not configured"
        });
    }

    const session = driver.session({ database: neo4jDatabase });
    try {
        const complaintResult = await session.run(
            `
            MATCH (c:Complaint {id: $complaintId})
            OPTIONAL MATCH (c)-[reportedAccountRel:INVOLVES]->(reportedAccount:Account)
            OPTIONAL MATCH (c)-[extractedAccountRel:IDENTIFIES_MULE_ACCOUNT]->(extractedAccount:Account)
            OPTIONAL MATCH (c)-[reportedTransactionRel:HAS_TRANSACTION]->(t:Transaction)
            OPTIONAL MATCH (t)-[reportedBankRel:AT_BANK]->(b:Bank)
            OPTIONAL MATCH (t)-[reportedLocationRel:OCCURRED_IN]->(l:Location)
            RETURN c.complaint_number AS complaint_number,
                   c.provenance AS complaint_provenance,
                   c.verified AS complaint_verified,
                   collect(DISTINCT CASE WHEN reportedAccount IS NULL THEN null ELSE {
                       account_number: reportedAccount.account_number,
                       provenance: reportedAccountRel.provenance,
                       verified: reportedAccountRel.verified
                   } END) AS reported_accounts,
                   collect(DISTINCT CASE WHEN extractedAccount IS NULL THEN null ELSE {
                       account_id: extractedAccount.account_id,
                       provenance: extractedAccountRel.provenance,
                       verified: extractedAccountRel.verified
                   } END) AS extracted_accounts,
                   collect(DISTINCT CASE WHEN t IS NULL THEN null ELSE {
                       transaction_id: t.transaction_id,
                       amount: t.amount,
                       transaction_type: t.type,
                       bank: b.name,
                       location: l.name,
                       provenance: reportedTransactionRel.provenance,
                       verified: reportedTransactionRel.verified,
                       bank_provenance: reportedBankRel.provenance,
                       location_provenance: reportedLocationRel.provenance
                   } END) AS reported_transactions
            `,
            { complaintId }
        );

        if (complaintResult.records.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Complaint graph record not found"
            });
        }

        const prototypeResult = await session.run(
            `MATCH (c:Complaint {id: $complaintId})
             OPTIONAL MATCH (c)-[cashoutAccountRel:CASHOUT_ACCOUNT]->(account:Account)
                           -[cashoutRel:LIKELY_CASHOUT_AT]->(atm:ATM)
             RETURN collect(DISTINCT CASE WHEN atm IS NULL THEN null ELSE {
                 cashout_account: account.account_id,
                 atm_id: atm.atm_id,
                 bank_name: atm.bank_name,
                 latitude: atm.latitude,
                 longitude: atm.longitude,
                 location: cashoutRel.location,
                 provenance: coalesce(cashoutRel.provenance, cashoutAccountRel.provenance, 'generated_prototype_mapping'),
                 verified: coalesce(cashoutRel.verified, false)
             } END) AS mappings`,
            { complaintId }
        );

        const complaint = complaintResult.records[0];
        const prototypeMappings = prototypeResult.records[0]?.get("mappings") || [];

        res.json({
            success: true,
            data: {
                complaint_id: complaintId,
                complaint_number: complaint.get("complaint_number"),
                provenance: complaint.get("complaint_provenance"),
                verified: complaint.get("complaint_verified"),
                reported_accounts: complaint.get("reported_accounts").filter(Boolean),
                NLP_extracted_accounts: complaint.get("extracted_accounts").filter(Boolean),
                reported_transactions: complaint.get("reported_transactions").filter(Boolean),
                prototype_mappings: prototypeMappings.filter(Boolean).map((mapping) => ({
                    ...mapping,
                    label: "Imported/generated reference data — not verified cash-out events."
                }))
            }
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