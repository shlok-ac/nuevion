CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP
);

CREATE TABLE complaints (
    id INTEGER PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    complainant_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    transaction_id VARCHAR(100),
    fraud_amount DECIMAL(15,2),
    transaction_type VARCHAR(50),
    fraud_date DATE,
    fraud_time TIME,
    location VARCHAR(100),
    description TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE cases (
    id INTEGER PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    complaint_id INTEGER NOT NULL,
    priority VARCHAR(20),
    status VARCHAR(50),
    assigned_to INTEGER,
    risk_level VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE atms (
    id INTEGER PRIMARY KEY,
    atm_id VARCHAR(50) UNIQUE NOT NULL,
    bank_name VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    highway_distance DECIMAL(10,2),
    lighting_score DECIMAL(5,2),
    cctv_coverage DECIMAL(5,2),
    historical_fraud_count INTEGER,
    withdrawal_limit DECIMAL(15,2),
    risk_score DECIMAL(5,2),
    risk_level VARCHAR(20)
);

CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    alert_type VARCHAR(100),
    severity VARCHAR(20),
    message TEXT,
    status VARCHAR(30),
    created_at TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);