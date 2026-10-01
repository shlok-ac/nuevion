# NLP Audio Ingestion & Cybercrime Triage Engine

> Part of the Nuevion prototype. See the [root README](../README.md) for setup and API reference.

This subsystem is the automated intake layer for citizen complaints. It converts an audio
complaint into structured, queryable fields — amount, payment channel, mule identifiers,
location, and fraud category — so analysts can act before the fraud window closes.

The citizen portal's optional audio flow calls `POST /api/complaints/triage-voice`, which
returns the transcript, its English translation, the structured fields, and a short-lived
signed analysis token. Submitting the complaint then happens through the normal
`POST /api/complaints` intake.

## Where the code lives

| Concern | Location |
|---|---|
| Speech recognition & translation (BHASHINI) | `ml/bhashini_service.py` |
| Text parser / entity extraction | `ml/nlp_service.py` |
| Unit tests | `ml/test_nlp_service.py` |
| Exploratory notebooks | `ml/nlp_bhashini.ipynb`, `ml/nlp_whisper.ipynb` |
| HTTP route | `backend/routes/complaintRoutes.js` |
| Node → Python bridge | `backend/services/nlpService.js` |
| Citizen-portal UI | `citizen-portal/src/citizen/pages/ReportFraud/ReportFraud.jsx` |
| Dependencies | `ml/requirements.txt` |

## Pipeline

```text
Audio upload (.mp3 / .wav / .m4a)
        │
        ▼
FFmpeg normalise → 16 kHz mono PCM WAV
        │
        ▼
BHASHINI ASR + translation  (falls back to OpenAI Whisper on failure)
        │
        ▼
English transcript
        │
        ▼
Rule-based entity extraction  (ml/nlp_service.py)
        │
        ▼
Structured complaint fields → database + dashboard
```

## 1. Speech-to-text

Audio is normalised with FFmpeg before recognition, which requires FFmpeg to be installed
server-side. The citizen portal asks the caller to select a spoken language, which avoids
the optional Whisper-based automatic language detector.

Recognition runs against the BHASHINI pipeline (`ASR` → `translation`, source language
Hindi by default). If the BHASHINI call fails, the service falls back to a local Whisper
`base` model.

### Credentials

`BHASHINI_USER_ID` and `BHASHINI_API_KEY` are read from the **backend environment** only
(`backend/.env`, sourced from `backend/.env.example`). `BHASHINI_INFERENCE_KEY` is
required only if the BHASHINI configuration response does not return one.

Both values are mandatory server-side: the service raises a clear error rather than
silently degrading if they are missing. Credentials are never committed to this repository
and never belong in notebooks. See the credential-rotation note in the [root
README](../README.md#security-known-exposed-bhashini-credentials).

## 2. Entity extraction

`ml/nlp_service.py` parses the English transcript into structured fields.

**Stolen amount** — resolves spoken Indian numeric phrasing (*lakh*, *hazar*, comma-separated
currency values, direct numerals).

**Payment channel** — auto-detects `CARD_PAYMENT`, `UPI`, `IMPS`, `NEFT`, `RTGS`,
`NET_BANKING`.

**Mule identifiers** — resolves spoken VPAs, comma-separated tokens (e.g. *"ACC, MULE,
4593"*), direct account strings, and standard UPI addresses (`user@bank`).

**Scam classification** — categorises the call into a standard cybercrime taxonomy:

`CREDIT_CARD_FRAUD`, `DIGITAL_ARREST`, `UTILITY_BILL_FRAUD`, `TASK_JOB_FRAUD`,
`INVESTMENT_TRADING_FRAUD`, `LOAN_APP_EXTORTION`, `REMOTE_ACCESS_MALWARE`,
`FINANCIAL_FRAUD`

**Provenance** — every response records which speech and parser produced it and sets
`verified: false`. The original transcript is retained as the complaint description, and
NLP details are stored in `complaints.nlp_result`.

## Requirements

Declared in `ml/requirements.txt`. The transcription path additionally needs **FFmpeg** on
the machine running the backend. Whisper is only required for the optional automatic
language-detection path.

## Limitations

- This is a **local audio prototype**. There is no integration with the real 1930 helpline.
- Transcription requires server-side BHASHINI credentials and FFmpeg.
- Extraction is rule-based, so unseen phrasing is not recognised.
- All extracted entities are unverified (`verified: false`); none are police-verified.
- A parsed complaint is a *candidate* for triage, not confirmed criminal evidence.

## Future scope

Streaming ingestion for live calls; language auto-detection; semantically scored entity
extraction beyond the current rules; confidence scoring per extracted field; bilingual
storage of the original transcript; and a reviewed/verified flag with analyst sign-off.