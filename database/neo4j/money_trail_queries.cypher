// ============================================================
// NIRIKSHAN AI - NEO4J QUERIES
// Member 3 - Money Trail & ATM Risk Graph
// ============================================================


// ============================================================
// 1. VERIFY ACCOUNT NODES
// ============================================================

MATCH (a:Account)
RETURN count(a) AS account_count;


// ============================================================
// 2. VERIFY ATM NODES
// ============================================================

MATCH (a:ATM)
RETURN count(a) AS atm_count;


// ============================================================
// 3. VERIFY TRANSFER RELATIONSHIPS
// ============================================================

MATCH ()-[r:TRANSFER]->()
RETURN count(r) AS transfer_count;


// ============================================================
// 4. VERIFY LIKELY CASH-OUT RELATIONSHIPS
// ============================================================

MATCH ()-[r:LIKELY_CASHOUT_AT]->()
RETURN count(r) AS likely_cashout_relationships;


// ============================================================
// 5. VERIFY COMPLETE MONEY TRAIL FOR ONE COMPLAINT
// ============================================================

MATCH p=(v:Account {account_id:"ACC0001V"})
      -[:TRANSFER*3]->
      (c:Account)
      -[:LIKELY_CASHOUT_AT]->
      (atm:ATM)
RETURN p;


// ============================================================
// 6. VERIFY A SPECIFIC CASH-OUT ACCOUNT
// ============================================================

MATCH (a:Account {account_id:"ACC0001M3"})
RETURN a;


// ============================================================
// 7. FIND THE PREDICTED CASH-OUT ATM
// ============================================================

MATCH (a:Account {account_id:"ACC0001M3"})
      -[r:LIKELY_CASHOUT_AT]->
      (atm:ATM)
RETURN a, r, atm;


// ============================================================
// 8. SHOW CASH-OUT DETAILS
// ============================================================

MATCH (a:Account)
      -[r:LIKELY_CASHOUT_AT]->
      (atm:ATM)
RETURN
    a.account_id AS cashout_account,
    r.complaint_number AS complaint_number,
    r.location AS location,
    r.predicted_risk_level AS risk_level,
    r.prediction_confidence AS confidence,
    atm.atm_id AS atm_id,
    atm.bank_name AS bank_name,
    atm.latitude AS latitude,
    atm.longitude AS longitude
LIMIT 20;


// ============================================================
// 9. SHOW HIGH-RISK PREDICTED ATMs
// ============================================================

MATCH (atm:ATM)
WHERE atm.predicted_risk_level = "HIGH"
RETURN
    atm.atm_id AS atm_id,
    atm.bank_name AS bank_name,
    atm.latitude AS latitude,
    atm.longitude AS longitude,
    atm.predicted_risk_level AS risk_level,
    atm.prediction_confidence AS confidence
ORDER BY atm.prediction_confidence DESC;


// ============================================================
// 10. COMPLETE GRAPH COUNTS
// ============================================================

MATCH (a:Account)
WITH count(a) AS accounts

MATCH (atm:ATM)
WITH accounts, count(atm) AS atms

MATCH ()-[t:TRANSFER]->()
WITH accounts, atms, count(t) AS transfers

MATCH ()-[l:LIKELY_CASHOUT_AT]->()
RETURN
    accounts,
    atms,
    transfers,
    count(l) AS likely_cashout_links;