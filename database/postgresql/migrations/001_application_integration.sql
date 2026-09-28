BEGIN;

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS nlp_result JSONB,
    ADD COLUMN IF NOT EXISTS evidence_metadata JSONB,
    ADD COLUMN IF NOT EXISTS complainant_email VARCHAR(254);

ALTER TABLE atms
    ADD COLUMN IF NOT EXISTS predicted_risk_level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS prediction_confidence DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS prediction_details JSONB,
    ADD COLUMN IF NOT EXISTS prediction_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS complaint_cashout_predictions (
    id BIGSERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    atm_id VARCHAR(50) NOT NULL REFERENCES atms(atm_id) ON UPDATE CASCADE,
    cashout_account VARCHAR(100),
    location VARCHAR(100),
    predicted_risk_level VARCHAR(20),
    prediction_confidence DECIMAL(5,2),
    source VARCHAR(40) NOT NULL DEFAULT 'offline_model_output',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (complaint_id, atm_id)
);

CREATE SEQUENCE IF NOT EXISTS atms_id_seq;
SELECT setval(
    'atms_id_seq',
    GREATEST(COALESCE((SELECT MAX(id) FROM atms), 0), 1),
    EXISTS (SELECT 1 FROM atms)
);
ALTER TABLE atms ALTER COLUMN id SET DEFAULT nextval('atms_id_seq');
ALTER SEQUENCE atms_id_seq OWNED BY atms.id;

CREATE SEQUENCE IF NOT EXISTS users_id_seq;
SELECT setval(
    'users_id_seq',
    GREATEST(COALESCE((SELECT MAX(id) FROM users), 0), 1),
    EXISTS (SELECT 1 FROM users)
);
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
ALTER SEQUENCE users_id_seq OWNED BY users.id;

CREATE SEQUENCE IF NOT EXISTS complaints_id_seq;
SELECT setval(
    'complaints_id_seq',
    GREATEST(COALESCE((SELECT MAX(id) FROM complaints), 0), 1),
    EXISTS (SELECT 1 FROM complaints)
);
ALTER TABLE complaints ALTER COLUMN id SET DEFAULT nextval('complaints_id_seq');
ALTER SEQUENCE complaints_id_seq OWNED BY complaints.id;

CREATE SEQUENCE IF NOT EXISTS cases_id_seq;
SELECT setval(
    'cases_id_seq',
    GREATEST(COALESCE((SELECT MAX(id) FROM cases), 0), 1),
    EXISTS (SELECT 1 FROM cases)
);
ALTER TABLE cases ALTER COLUMN id SET DEFAULT nextval('cases_id_seq');
ALTER SEQUENCE cases_id_seq OWNED BY cases.id;

CREATE SEQUENCE IF NOT EXISTS alerts_id_seq;
SELECT setval(
    'alerts_id_seq',
    GREATEST(COALESCE((SELECT MAX(id) FROM alerts), 0), 1),
    EXISTS (SELECT 1 FROM alerts)
);
ALTER TABLE alerts ALTER COLUMN id SET DEFAULT nextval('alerts_id_seq');
ALTER SEQUENCE alerts_id_seq OWNED BY alerts.id;

CREATE INDEX IF NOT EXISTS complaints_number_phone_idx
    ON complaints (complaint_number, phone_number);
CREATE INDEX IF NOT EXISTS cases_complaint_created_idx
    ON cases (complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS atms_city_risk_idx
    ON atms (city, risk_score DESC);
CREATE INDEX IF NOT EXISTS complaint_cashout_complaint_idx
    ON complaint_cashout_predictions (complaint_id);

COMMIT;
