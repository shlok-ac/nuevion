-- SentinCash demo schema (SQLite via node:sqlite, no external DB server required).
-- Superset of database/postgresql/schema.sql with the tables the demo pipeline needs.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL,
    created_at    TEXT
);

-- Source is one of: CSV (seeded), PORTAL (citizen portal), HELPLINE_NLP (transcript).
CREATE TABLE IF NOT EXISTS complaints (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_number  TEXT UNIQUE NOT NULL,
    complainant_name TEXT,
    phone_number     TEXT,
    bank_name        TEXT,
    account_number   TEXT,
    transaction_id   TEXT,
    fraud_amount     REAL,
    transaction_type TEXT,
    fraud_date       TEXT,
    fraud_time       TEXT,
    location         TEXT,
    description      TEXT,
    source           TEXT DEFAULT 'CSV',
    created_at       TEXT
);

CREATE TABLE IF NOT EXISTS cases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number  TEXT UNIQUE NOT NULL,
    complaint_id INTEGER,
    priority     TEXT,
    status       TEXT,
    assigned_to  INTEGER,
    risk_level   TEXT,
    created_at   TEXT,
    updated_at   TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS atms (
    id                    INTEGER PRIMARY KEY,
    atm_id                TEXT UNIQUE NOT NULL,
    bank_name             TEXT,
    city                  TEXT,
    latitude              REAL,
    longitude             REAL,
    highway_distance      REAL,
    lighting_score        REAL,
    cctv_coverage         REAL,
    historical_fraud_count INTEGER,
    withdrawal_limit      REAL,
    risk_score            REAL,
    risk_level            TEXT
);

-- The money trail. One row per hop; hop_level 1..3 chains victim -> mules -> cash-out.
CREATE TABLE IF NOT EXISTS mule_hops (
    hop_id                  TEXT PRIMARY KEY,
    complaint_id            TEXT NOT NULL,
    hop_level               INTEGER NOT NULL,
    from_account            TEXT NOT NULL,
    to_account              TEXT NOT NULL,
    amount_transferred_inr  REAL,
    time_delay_minutes      INTEGER,
    timestamp               TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id     INTEGER NOT NULL,
    alert_type  TEXT,
    severity    TEXT,
    message     TEXT,
    status      TEXT,
    created_at  TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Derived registries (no source CSV exists for these; the sync step derives them).
CREATE TABLE IF NOT EXISTS suspects (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    aliases      TEXT,
    phone        TEXT,
    aadhaar      TEXT,
    bank         TEXT,
    accounts     INTEGER,
    linked_cases TEXT,
    status       TEXT,
    risk         TEXT,
    location     TEXT
);

CREATE TABLE IF NOT EXISTS mule_accounts (
    account_id    TEXT PRIMARY KEY,
    bank          TEXT,
    linked_cases  TEXT,
    total_inflow  REAL,
    total_outflow REAL,
    risk          TEXT,
    status        TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
    id          TEXT PRIMARY KEY,
    case_id     TEXT NOT NULL,
    type        TEXT,
    description TEXT,
    source      TEXT,
    collected   TEXT,
    hash        TEXT
);

-- Structured output of the helpline NLP extractor.
CREATE TABLE IF NOT EXISTS nlp_extractions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id        INTEGER,
    transcript          TEXT,
    complainant_name    TEXT,
    stolen_amount_inr   REAL,
    transfer_mode       TEXT,
    scam_category       TEXT,
    mule_accounts       TEXT,
    bank_mentions       TEXT,
    confidence          REAL,
    created_at          TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

-- Model registry so a risk score is traceable to the run that produced it.
CREATE TABLE IF NOT EXISTS ml_runs (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    model_version        TEXT NOT NULL,
    algorithm            TEXT,
    accuracy             REAL,
    feature_importance   TEXT,
    per_class            TEXT,
    trained_at           TEXT,
    notes                TEXT
);

CREATE INDEX IF NOT EXISTS idx_cases_complaint   ON cases(complaint_id);
CREATE INDEX IF NOT EXISTS idx_alerts_case       ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_hops_complaint    ON mule_hops(complaint_id);
CREATE INDEX IF NOT EXISTS idx_hops_from         ON mule_hops(from_account);
CREATE INDEX IF NOT EXISTS idx_hops_to           ON mule_hops(to_account);
CREATE INDEX IF NOT EXISTS idx_atms_risk         ON atms(risk_level);
CREATE INDEX IF NOT EXISTS idx_evidence_case     ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_nlp_complaint     ON nlp_extractions(complaint_id);
