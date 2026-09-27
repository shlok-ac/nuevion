# Sharvari - NLP Audio Ingestion & Real-Time Cybercrime Triage Engine

This module serves as the automated intake and intelligence layer for **SentinCash**. It extracts structured transactional, demographic, and geospatial forensic records directly from incoming citizen helpline calls (Helpline 1930) to trigger immediate banking liens and law enforcement interdiction before the Golden Hour expires.

---

## 📌 Deliverables & Architecture Overview

- **`nlp/audio_transcription_triage.py`**: Real-time audio ingestion and phonetic transcription engine powered by `faster-whisper`.
- **`nlp/entity_extraction.py`**: Rule-based and semantic NLP parser extracting target banking rails, financial loss values, mule identifiers, and fraud taxonomies.
- **`data/extracted_complaint_payload.json`**: Real-time structured JSON incident schema exported directly to the database and tactical dashboard.

---

## 🎯 Key Capabilities & Extraction Rules

### 1. Robust Multilingual Speech-to-Text (ASR)
- Ingests real caller recordings (`.mp3`, `.wav`, `.m4a`) in Hindi, Indian English, and code-mixed conversational Hinglish.
- Optimized using 8-bit quantized `faster-whisper` (`base` model) for sub-second inference.

### 2. Forensic Entity Extraction
- **Stolen Amount Detection:** Resolves spoken Indian numeric phrasing (e.g., *lakh*, *hazar*, direct numeric values, comma-separated currency values).
- **Payment Method Identification:** Auto-detects transfer channels (`CARD_PAYMENT`, `UPI`, `IMPS`, `NEFT`, `RTGS`, `NET_BANKING`).
- **Mule Identifier Extraction:** Resolves spoken VPAs, comma-separated tokens (e.g., `ACC, MULE, 4593`), direct bank account strings (9–18 digits), and standard UPI virtual payment addresses (`user@bank`).
- **Dynamic Scam Classification:** Categorizes caller scenarios into standard cybercrime classifications:
  - `CREDIT_CARD_FRAUD`
  - `DIGITAL_ARREST`
  - `UTILITY_BILL_FRAUD`
  - `TASK_JOB_FRAUD`
  - `INVESTMENT_TRADING_FRAUD`
  - `LOAN_APP_EXTORTION`
  - `REMOTE_ACCESS_MALWARE`
  - `FINANCIAL_FRAUD`

---

## 🚀 Execution & Usage

### 1. Install Dependencies
```bash
pip install -r requirements.txt
