
// ============================================================
// SentinCash - Neo4j Queries
// ATM Risk Prediction + Money Trail Graph
// ============================================================


// ============================================================
// 1. CHECK TOTAL ACCOUNT NODES AND TRANSFER RELATIONSHIPS
// ============================================================

MATCH (a:Account)
WITH count(a) AS account_count
MATCH ()-[t:TRANSFER]->()
RETURN account_count, count(t) AS transfer_count;


// ============================================================
// 2. VIEW THE MONEY TRAIL FOR COMPLAINT CMP100001
// ============================================================

MATCH p=(a:Account)-[:TRANSFER*3]->(b:Account)
WHERE a.account_id = "ACC0001V"
RETURN p;


// ============================================================
// 3. VIEW COMPLETE MONEY TRAIL + LIKELY CASH-OUT ATM
// ============================================================

MATCH p=(v:Account {account_id: "ACC0001V"})
-[:TRANSFER*3]->
(cash:Account)
-[:LIKELY_CASHOUT_AT]->
(atm:ATM)
RETURN p;


// ============================================================
// 4. FIND ALL CASH-OUT ACCOUNT TO ATM CONNECTIONS
// ============================================================

MATCH (cash:Account)-[:LIKELY_CASHOUT_AT]->(atm:ATM)
RETURN cash, atm;


// ============================================================
// 5. COUNT LIKELY CASH-OUT ATM CONNECTIONS
// ============================================================

MATCH ()-[r:LIKELY_CASHOUT_AT]->()
RETURN count(r) AS cashout_connection_count;


// ============================================================
// 6. VIEW ATM INFORMATION
// ============================================================

MATCH (atm:ATM)
RETURN atm;


// ============================================================
// 7. VIEW HIGH-RISK PREDICTED ATMs
// ============================================================

MATCH (atm:ATM)
WHERE atm.predicted_risk_level = "HIGH"
RETURN atm;


// ============================================================
// 8. FIND CASH-OUT ACCOUNTS CONNECTED TO HIGH-RISK ATMs
// ============================================================

MATCH (cash:Account)-[:LIKELY_CASHOUT_AT]->(atm:ATM)
WHERE atm.predicted_risk_level = "HIGH"
RETURN cash, atm;


// ============================================================
// 9. VIEW A SPECIFIC COMPLAINT'S MONEY TRAIL
// ============================================================

MATCH p=(a:Account)-[t:TRANSFER*]->(b:Account)
WHERE ALL(rel IN relationships(p)
          WHERE rel.complaint_id = "CMP100001")
RETURN p;


// ============================================================
// 10. VIEW TRANSFER DETAILS FOR CMP100001
// ============================================================

MATCH (a:Account)-[t:TRANSFER]->(b:Account)
WHERE t.complaint_id = "CMP100001"
RETURN
    a.account_id AS from_account,
    b.account_id AS to_account,
    t.hop_level AS hop_level,
    t.amount_transferred_inr AS amount_transferred_inr,
    t.time_delay_minutes AS time_delay_minutes,
    t.timestamp AS timestamp,
    t.complaint_id AS complaint_id
ORDER BY t.hop_level;


// ============================================================
// 11. FIND THE FINAL CASH-OUT ACCOUNT FOR CMP100001
// ============================================================

MATCH (a:Account)-[t:TRANSFER]->(b:Account)
WHERE t.complaint_id = "CMP100001"
  AND t.hop_level = 3
RETURN
    a.account_id AS previous_account,
    b.account_id AS cashout_account,
    t.amount_transferred_inr AS amount_transferred_inr;


// ============================================================
// 12. FIND THE PREDICTED ATM FOR CMP100001
// ============================================================

MATCH (cash:Account)-[:LIKELY_CASHOUT_AT]->(atm:ATM)
WHERE cash.account_id = "ACC0001M3"
RETURN
    cash.account_id AS cashout_account,
    atm.atm_id AS atm_id,
    atm.bank_name AS bank_name,
    atm.predicted_risk_level AS predicted_risk_level,
    atm.prediction_confidence AS prediction_confidence,
    atm.latitude AS latitude,
    atm.longitude AS longitude;


// ============================================================
// 13. VIEW COMPLETE END-TO-END PATH FOR CMP100001
// ============================================================

MATCH p=(victim:Account {account_id: "ACC0001V"})
-[:TRANSFER*3]->
(cashout:Account)
-[:LIKELY_CASHOUT_AT]->
(atm:ATM)
RETURN p;


// ============================================================
// 14. COUNT ATM NODES
// ============================================================

MATCH (atm:ATM)
RETURN count(atm) AS atm_count;


// ============================================================
// 15. COUNT TRANSFER RELATIONSHIPS
// ============================================================

MATCH ()-[t:TRANSFER]->()
RETURN count(t) AS transfer_count;


// ============================================================
// 16. COUNT LIKELY CASH-OUT RELATIONSHIPS
// ============================================================

MATCH ()-[r:LIKELY_CASHOUT_AT]->()
RETURN count(r) AS likely_cashout_count;


// ============================================================
// 17. VIEW SAMPLE ACCOUNT NODES
// ============================================================

MATCH (a:Account)
RETURN a
LIMIT 20;


// ============================================================
// 18. VIEW SAMPLE ATM NODES
// ============================================================

MATCH (atm:ATM)
RETURN atm
LIMIT 20;


// ============================================================
// 19. VIEW SAMPLE TRANSFER RELATIONSHIPS
// ============================================================

MATCH (a:Account)-[t:TRANSFER]->(b:Account)
RETURN a, t, b
LIMIT 20;


// ============================================================
// 20. VIEW SAMPLE COMPLETE GRAPH
// ============================================================

MATCH (a:Account)-[t:TRANSFER]->(b:Account)
OPTIONAL MATCH (b)-[r:LIKELY_CASHOUT_AT]->(atm:ATM)
RETURN a, t, b, r, atm
LIMIT 50;