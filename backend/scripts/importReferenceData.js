const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");
const pool = require("../config/postgres");
const { driver, neo4jConfigured } = require("../config/neo4j");
const { syncPredictionMapping } = require("../services/neo4jService");

const dataDirectory = path.resolve(__dirname, "../../data");

const readCsv = (fileName) => {
    const filePath = path.join(dataDirectory, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
};

const numberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const insertComplaints = async (client, rows) => {
    for (const row of rows) {
        await client.query(
            `INSERT INTO complaints (
                id, complaint_number, complainant_name, phone_number, bank_name,
                account_number, transaction_id, fraud_amount, transaction_type,
                fraud_date, fraud_time, location, description, source, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT DO NOTHING`,
            [
                numberOrNull(row.id),
                row.complaint_number,
                row.complainant_name,
                row.phone_number || null,
                row.bank_name || null,
                row.account_number || null,
                row.transaction_id || null,
                numberOrNull(row.fraud_amount),
                row.transaction_type || null,
                row.fraud_date || null,
                row.fraud_time || null,
                row.location || null,
                row.description || null,
                row.source || null,
                row.created_at || null
            ]
        );
    }
};

const insertCases = async (client, rows) => {
    for (const row of rows) {
        await client.query(
            `INSERT INTO cases (
                id, case_number, complaint_id, priority, status, assigned_to,
                risk_level, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8)
             ON CONFLICT DO NOTHING`,
            [
                numberOrNull(row.id),
                row.case_number,
                numberOrNull(row.complaint_id),
                row.priority || null,
                row.status || null,
                row.risk_level || null,
                row.created_at || null,
                row.updated_at || null
            ]
        );
    }
};

const insertAlerts = async (client, rows) => {
    for (const row of rows) {
        await client.query(
            `INSERT INTO alerts (
                id, case_id, alert_type, severity, message, status, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [
                numberOrNull(row.id),
                numberOrNull(row.case_id),
                row.alert_type || null,
                row.severity || null,
                row.message || null,
                row.status || null,
                row.created_at || null
            ]
        );
    }
};

const importAtmPredictions = async (client, rows) => {
    for (const row of rows) {
        await client.query(
            `INSERT INTO atms (
                atm_id, bank_name, city, latitude, longitude, highway_distance,
                lighting_score, cctv_coverage, historical_fraud_count,
                withdrawal_limit, risk_score, risk_level, predicted_risk_level,
                prediction_confidence, prediction_details, prediction_updated_at
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, NOW()
             )
             ON CONFLICT (atm_id) DO UPDATE SET
                bank_name = EXCLUDED.bank_name,
                city = EXCLUDED.city,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                highway_distance = EXCLUDED.highway_distance,
                lighting_score = EXCLUDED.lighting_score,
                cctv_coverage = EXCLUDED.cctv_coverage,
                historical_fraud_count = EXCLUDED.historical_fraud_count,
                withdrawal_limit = EXCLUDED.withdrawal_limit,
                risk_score = EXCLUDED.risk_score,
                risk_level = EXCLUDED.risk_level,
                predicted_risk_level = EXCLUDED.predicted_risk_level,
                prediction_confidence = EXCLUDED.prediction_confidence,
                prediction_details = EXCLUDED.prediction_details,
                prediction_updated_at = NOW()`,
            [
                row.atm_id,
                row.bank_name || null,
                row.city || null,
                numberOrNull(row.latitude),
                numberOrNull(row.longitude),
                numberOrNull(row.highway_distance),
                numberOrNull(row.lighting_score),
                numberOrNull(row.cctv_coverage),
                numberOrNull(row.historical_fraud_count),
                numberOrNull(row.withdrawal_limit),
                numberOrNull(row.risk_score),
                row.risk_level || null,
                row.predicted_risk_level || null,
                numberOrNull(row.prediction_confidence),
                JSON.stringify(row)
            ]
        );
    }
};

const importCashoutMappings = async (client, rows) => {
    let imported = 0;
    for (const row of rows) {
        const result = await client.query(
            `INSERT INTO complaint_cashout_predictions (
                complaint_id, atm_id, cashout_account, location,
                predicted_risk_level, prediction_confidence
             )
             SELECT complaints.id, atms.atm_id, $3, $4, $5, $6
             FROM complaints
             JOIN atms ON atms.atm_id = $2
             WHERE complaints.complaint_number = $1
             ON CONFLICT (complaint_id, atm_id) DO UPDATE SET
                cashout_account = EXCLUDED.cashout_account,
                location = EXCLUDED.location,
                predicted_risk_level = EXCLUDED.predicted_risk_level,
                prediction_confidence = EXCLUDED.prediction_confidence
             RETURNING complaint_id`,
            [
                row.complaint_number,
                row.atm_id,
                row.cashout_account || null,
                row.location || null,
                row.predicted_risk_level || null,
                numberOrNull(row.prediction_confidence)
            ]
        );
        imported += result.rowCount;
    }
    return imported;
};

const synchronizeSequence = async (client, sequence, table) => {
    await client.query(
        `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(id) FROM ${table}), 0), 1), EXISTS (SELECT 1 FROM ${table}))`,
        [sequence]
    );
};

const importReferenceData = async () => {
    const complaints = readCsv("complaints.csv");
    const cases = readCsv("cases.csv");
    const alerts = readCsv("alerts.csv");
    const predictions = readCsv("atm_predictions.csv");
    const cashoutMappings = readCsv("atm_cashout_mapping new.csv");
    const client = await pool.connect();
    let importedMappings = 0;

    try {
        await client.query("BEGIN");
        await insertComplaints(client, complaints);
        await insertCases(client, cases);
        await insertAlerts(client, alerts);
        await importAtmPredictions(client, predictions);
        importedMappings = await importCashoutMappings(client, cashoutMappings);

        await synchronizeSequence(client, "complaints_id_seq", "complaints");
        await synchronizeSequence(client, "cases_id_seq", "cases");
        await synchronizeSequence(client, "alerts_id_seq", "alerts");
        await synchronizeSequence(client, "atms_id_seq", "atms");
        await client.query("COMMIT");

        console.log(
            `Imported reference rows (conflicts preserved): complaints=${complaints.length}, cases=${cases.length}, alerts=${alerts.length}, ATM predictions=${predictions.length}, cash-out mappings=${importedMappings}`
        );
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    if (driver && neo4jConfigured) {
        const graphRows = await pool.query(
            `SELECT c.complaint_number, p.cashout_account, a.atm_id, a.bank_name,
                    a.latitude, a.longitude, p.predicted_risk_level,
                    p.prediction_confidence, p.location
             FROM complaint_cashout_predictions p
             JOIN complaints c ON c.id = p.complaint_id
             JOIN atms a ON a.atm_id = p.atm_id`
        );
        let graphSynced = 0;
        for (const row of graphRows.rows) {
            try {
                await syncPredictionMapping(row);
                graphSynced += 1;
            } catch (error) {
                console.error(`Neo4j mapping sync failed for ${row.complaint_number}:`, error.message);
            }
        }
        console.log(`Synced ${graphSynced} of ${graphRows.rowCount} stored cash-out mappings to Neo4j.`);
    } else {
        console.log("Neo4j mapping sync skipped because Neo4j is not configured.");
    }
};

importReferenceData().catch((error) => {
    console.error("Reference-data import failed:", error.message);
    process.exitCode = 1;
}).finally(async () => {
    if (driver) await driver.close();
    await pool.end();
});
