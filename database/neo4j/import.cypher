LOAD CSV WITH HEADERS FROM 'file:///complaints.csv' AS row

MERGE (c:Complaint {id: toInteger(row.id)})
SET c.complaint_number = row.complaint_number,
    c.complainant_name = row.complainant_name,
    c.fraud_amount = toFloat(row.fraud_amount),
    c.fraud_date = row.fraud_date,
    c.fraud_time = row.fraud_time,
    c.description = row.description,
    c.source = row.source

MERGE (a:Account {account_number: row.account_number})

MERGE (t:Transaction {transaction_id: row.transaction_id})
SET t.amount = toFloat(row.fraud_amount),
    t.type = row.transaction_type,
    t.date = row.fraud_date,
    t.time = row.fraud_time

MERGE (b:Bank {name: row.bank_name})

MERGE (l:Location {name: row.location})

MERGE (c)-[:INVOLVES]->(a)
MERGE (c)-[:HAS_TRANSACTION]->(t)
MERGE (a)-[:MADE]->(t)
MERGE (t)-[:AT_BANK]->(b)
MERGE (t)-[:OCCURRED_IN]->(l)