const { driver, neo4jDatabase } = require("../config/neo4j");

const syncComplaintGraph = async (complaint) => {
    if (!driver) {
        throw new Error("Neo4j is not configured");
    }

    const session = driver.session({ database: neo4jDatabase });
    try {
        await session.executeWrite(async (transaction) => {
            await transaction.run(
                `MERGE (c:Complaint {id: $id})
                 SET c.complaint_number = $complaintNumber,
                     c.complainant_name = $complainantName,
                     c.fraud_amount = $fraudAmount,
                     c.fraud_date = $fraudDate,
                     c.fraud_time = $fraudTime,
                     c.description = $description,
                     c.source = $source,
                     c.provenance = 'citizen_complaint_submission',
                     c.verified = false`,
                {
                    id: Number(complaint.id),
                    complaintNumber: complaint.complaint_number,
                    complainantName: complaint.complainant_name,
                    fraudAmount: complaint.fraud_amount === null ? null : Number(complaint.fraud_amount),
                    fraudDate: complaint.fraud_date instanceof Date
                        ? complaint.fraud_date.toISOString().slice(0, 10)
                        : complaint.fraud_date,
                    fraudTime: complaint.fraud_time instanceof Date
                        ? complaint.fraud_time.toISOString().slice(11, 19)
                        : complaint.fraud_time,
                    description: complaint.description,
                    source: complaint.source
                }
            );

            if (complaint.case_number) {
                await transaction.run(
                    `MATCH (c:Complaint {id: $id})
                     MERGE (cs:Case {case_number: $caseNumber})
                     SET cs.status = $status
                     MERGE (c)-[r:HAS_CASE]->(cs)
                     SET r.provenance = 'backend_case_creation',
                         r.verified = false`,
                    {
                        id: Number(complaint.id),
                        caseNumber: complaint.case_number,
                        status: complaint.case_status || "Received"
                    }
                );
            }

            const extractedAccount = complaint.nlp_result?.initial_mule_account;
            if (extractedAccount) {
                await transaction.run(
                    `MATCH (c:Complaint {id: $id})
                     MERGE (a:Account {account_id: $accountId})
                     MERGE (c)-[r:IDENTIFIES_MULE_ACCOUNT]->(a)
                     SET r.provenance = 'complaint_text_nlp_extraction',
                         r.verified = false`,
                    { id: Number(complaint.id), accountId: extractedAccount }
                );
            }

            if (complaint.account_number) {
                await transaction.run(
                    `MATCH (c:Complaint {id: $id})
                     MERGE (a:Account {account_number: $accountNumber})
                     MERGE (c)-[r:INVOLVES]->(a)
                     SET r.provenance = 'complainant_submitted_account',
                         r.verified = false`,
                    { id: Number(complaint.id), accountNumber: complaint.account_number }
                );
            }

            if (complaint.transaction_id) {
                await transaction.run(
                    `MATCH (c:Complaint {id: $id})
                     MERGE (t:Transaction {transaction_id: $transactionId})
                     SET t.amount = $amount, t.type = $transactionType,
                         t.date = $date, t.time = $time,
                         t.provenance = 'complainant_submitted_transaction',
                         t.verified = false
                     MERGE (c)-[r:HAS_TRANSACTION]->(t)
                     SET r.provenance = 'complainant_report',
                         r.verified = false`,
                    {
                        id: Number(complaint.id),
                        transactionId: complaint.transaction_id,
                        amount: complaint.fraud_amount === null ? null : Number(complaint.fraud_amount),
                        transactionType: complaint.transaction_type,
                        date: complaint.fraud_date instanceof Date
                            ? complaint.fraud_date.toISOString().slice(0, 10)
                            : complaint.fraud_date,
                        time: complaint.fraud_time instanceof Date
                            ? complaint.fraud_time.toISOString().slice(11, 19)
                            : complaint.fraud_time
                    }
                );

                if (complaint.account_number) {
                    await transaction.run(
                        `MATCH (a:Account {account_number: $accountNumber})
                         MATCH (t:Transaction {transaction_id: $transactionId})
                         MERGE (a)-[r:MADE]->(t)
                         SET r.provenance = 'complainant_report',
                             r.verified = false`,
                        {
                            accountNumber: complaint.account_number,
                            transactionId: complaint.transaction_id
                        }
                    );
                }

                if (complaint.bank_name) {
                    await transaction.run(
                        `MATCH (t:Transaction {transaction_id: $transactionId})
                         MERGE (b:Bank {name: $bankName})
                         MERGE (t)-[r:AT_BANK]->(b)
                         SET r.provenance = 'complainant_report',
                             r.verified = false`,
                        { transactionId: complaint.transaction_id, bankName: complaint.bank_name }
                    );
                }

                if (complaint.location) {
                    await transaction.run(
                        `MATCH (t:Transaction {transaction_id: $transactionId})
                         MERGE (l:Location {name: $location})
                         MERGE (t)-[r:OCCURRED_IN]->(l)
                         SET r.provenance = 'complainant_report',
                             r.verified = false`,
                        { transactionId: complaint.transaction_id, location: complaint.location }
                    );
                }
            }
        });
    } finally {
        await session.close();
    }
};

const syncPredictionMapping = async (mapping) => {
    if (!driver) throw new Error("Neo4j is not configured");

    const session = driver.session({ database: neo4jDatabase });
    try {
        await session.executeWrite((transaction) => transaction.run(
            `MATCH (c:Complaint {complaint_number: $complaintNumber})
             MERGE (account:Account {account_id: $cashoutAccount})
             MERGE (atm:ATM {atm_id: $atmId})
             SET atm.bank_name = $bankName,
                 atm.latitude = $latitude,
                 atm.longitude = $longitude,
                 atm.predicted_risk_level = $riskLevel,
                 atm.prediction_confidence = $confidence,
                 atm.provenance = 'generated_prototype_mapping',
                 atm.verified = false
             MERGE (c)-[accountRel:CASHOUT_ACCOUNT]->(account)
             SET accountRel.provenance = 'generated_prototype_mapping',
                 accountRel.verified = false
             MERGE (account)-[r:LIKELY_CASHOUT_AT]->(atm)
             SET r.complaint_number = $complaintNumber,
                 r.location = $location,
                 r.predicted_risk_level = $riskLevel,
                 r.prediction_confidence = $confidence,
                 r.provenance = 'generated_prototype_mapping',
                 r.verified = false`,
            {
                complaintNumber: mapping.complaint_number,
                cashoutAccount: mapping.cashout_account,
                atmId: mapping.atm_id,
                bankName: mapping.bank_name,
                latitude: mapping.latitude === null ? null : Number(mapping.latitude),
                longitude: mapping.longitude === null ? null : Number(mapping.longitude),
                riskLevel: mapping.predicted_risk_level,
                confidence: mapping.prediction_confidence === null ? null : Number(mapping.prediction_confidence),
                location: mapping.location
            }
        ));
    } finally {
        await session.close();
    }
};

module.exports = { syncComplaintGraph, syncPredictionMapping };
