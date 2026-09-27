# SentinCash — Demo Pipeline

A working end-to-end data pipeline for the cybercrime command center, built to run with
**no external infrastructure**: no PostgreSQL, no Neo4j, no Python, no Docker.

```
citizen-portal ──POST /complaints──┐
                                 ├──► API ──► SQLite (node:sqlite) ──► npm run sync ──► frontend data files
helpline text  ──POST /nlp/extract─┘                    │
                                                      └──► Random Forest (trains in-process)
```

## Worked scenario: a ₹4,20,000 investment scam

One incident, end to end. Every value below is real output you can reproduce with the
commands shown.

### 1. A citizen files a complaint

The victim opens the portal, logs in with OTP `1234`, and completes the four-step form.
`ReportFraud.jsx` posts it to the API instead of writing to `localStorage`.

```bash
curl -X POST http://localhost:5000/api/v1/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "complainantName": "Ramesh Kulkarni",
    "phone": "9876543210",
    "bankName": "HDFC Bank",
    "fraudAmount": 420000,
    "transactionType": "UPI",
    "location": "Pune",
    "description": "Investment scam, money moved to a fake trading desk",
    "source": "PORTAL"
  }'
```

```json
{
  "success": true,
  "complaintNumber": "CYB-2026-47012",
  "caseNumber": "C-2026-0503",
  "priority": "high",
  "complaintId": 501,
  "caseId": 501
}
```

The **server**, not the browser, mints the reference, and priority is derived from the
amount (₹4.2L → `high`). One request writes **three** rows in a single transaction: the
`complaints` record, a `cases` record, and an `alerts` record — so the case exists
before anyone opens the dashboard.

### 2. A helpline call arrives about the same ring

A second victim calls 1930. In production the audio would go through
faster-whisper/Bhashini in `ml/*.ipynb`; this demo takes the transcript as text and runs
the real extraction stage.

```bash
curl -X POST http://localhost:5000/api/v1/nlp/extract \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Mera naam Sunita Pillai hai, main Mumbai se bol rahi hoon. Maine UPI se 1 lakh 87 hazaar 500 rupay bheje the merchant@axis par. Mera ICICI Bank ka account hai aur abhi tak paise nahi aaye."
  }'
```

```json
{
  "complaintNumber": "1930-2026-5419",
  "priority": "medium",
  "extracted": {
    "complainant_name": "Sunita Pillai",
    "location": "Mumbai",
    "stolen_amount_inr": 187500,
    "transfer_mode": "UPI",
    "scam_category": "FINANCIAL_FRAUD",
    "mule_accounts": ["merchant@axis"],
    "bank_mentions": ["ICICI Bank"],
    "confidence": 0.6
  }
}
```

What the extractor had to get right:

| Extracted | From the transcript | Rule applied |
|---|---|---|
| `stolen_amount_inr: 187500` | *"1 lakh 87 hazaar 500"* | compound scale words → 1×10⁵ + 87×10³ + 500 |
| `complainant_name` | *"Mera naam Sunita Pillai hai"* | romanised-Hindi name pattern |
| `mule_accounts` | *"merchant@axis"* | UPI VPA pattern |
| `scam_category` | *"paise nahi aaye"* + UPI | taxonomy classifier, 8 classes |

The amount is the hard part: `1 lakh 87 hazaar 500` must read as 187,500, and an adjacent
10-digit account number must **not** be mistaken for the loss figure. The extractor also
guards Indian digit grouping, so `1,87,500` reads as 187500 rather than 1.875. This is
persisted as a complaint + case + alert + a row in `nlp_extractions`, so it appears on
the dashboard exactly like the portal filing did.

### 3. An analyst traces the money

For a complaint that already has hops recorded, the money trail walks
victim → mule → cash-out:

```bash
curl http://localhost:5000/api/v1/money-trail/CMP100001
```

```
hop_level  from_account  to_account  amount      timestamp
         1  ACC0001V      ACC0001M1    78057.36   2026-08-21 10:39:07
         2  ACC0001M1     ACC0001M2    73949.08   2026-08-21 10:56:07
         3  ACC0001M2     ACC0001M3    69840.79   2026-08-21 11:04:07
                                              → cash-out at ATM100459
```

Each layer sheds a little value, the classic mule pattern: ₹78,057 in, ₹69,840 reaching
the terminal account 25 minutes later. The response also carries the predicted ATM.

### 4. The model says which ATM to watch

The Random Forest scores every ATM. Retraining recomputes the metrics and rewrites
`risk_score` / `risk_level` on all 500 rows:

```bash
curl -X POST http://localhost:5000/api/v1/ml/retrain
```

```
Trained rf-100trees-2026-09-27
  algorithm  : RandomForestClassifier (100 trees, seed 42)
  train/test : 400/100 (stratified 80/20)
  accuracy   : 0.86
  per class  :
    LOW     P=0.9048  R=0.8261  F1=0.8636  n=23
    MEDIUM  P=0.8333  R=0.9000  F1=0.8654  n=50
    HIGH    P=0.8800  R=0.8148  F1=0.8462  n=27
  importance :
    historical_fraud_count   0.4828
    cctv_coverage            0.1799
    highway_distance         0.1709
    lighting_score           0.1381
    withdrawal_limit         0.0283
  scored     : 500 ATMs written back to the database
```

These are **measured**, not copied from the notebook. The dominant feature,
`historical_fraud_count`, matches what the scikit-learn model found. The cash-out ATM
for the traced complaint (`ATM100459`) is scored `HIGH` at `84%` confidence, which is
what puts it on the map's callout list.

Across all 500 ATMs the live scores span roughly 42–98 (mean ≈ 80), so the heatmap
gradient reflects real per-ATM predictions rather than a constant.

### 5. The dashboard picks it all up

```bash
npm run sync
```

```
Regenerated frontend data files:
  public/atm_predictions.csv      500 rows
  public/fraud_incidents.csv      500 rows
  public/cell_towers.csv           10 rows
  public/caller_cases.csv          10 rows
  src/lib/investigationData.js    503 cases, 500 chains
                                suspects=12, mules=60, alerts=40
```

Refreshing the command center now shows the new case in the queue, the money trail drawn
hop by hop, and the heatmap coloured by the model's live scores — with no frontend code
change.

### The same incident, end to end

| Time | Actor | What happened | Where it landed |
|---|---|---|---|
| 11:04 | Victim | Files a complaint in the portal | `complaints` + `cases` + `alerts` |
| 11:06 | Second victim | Calls 1930; transcript extracted | `complaints` + `nlp_extractions` |
| 11:08 | Analyst | Opens the money trail | `mule_hops` → 3-hop chain |
| 11:10 | Model | Scores the cash-out ATM `HIGH / 84%` | `atms.risk_score`, `ml_runs` |
| 11:12 | — | `npm run sync` | `investigationData.js` + 4 CSVs |
| 11:12 | Analyst | Refreshes — case, trail and heatmap are live | — |

## Quick start

```bash
cd backend
npm install
npm run seed     # CSVs -> SQLite (500 complaints, 500 cases, 1500 hops, 500 ATMs)
npm run train    # trains the Random Forest, writes scores back to the atms table
npm run sync     # SQLite -> frontend/public/*.csv + frontend/src/lib/investigationData.js
npm run dev      # API on http://localhost:5000
```

In a second and third terminal:

```bash
cd frontend      && npm run dev    # command center on http://localhost:5173
cd citizen-portal && npm run dev   # citizen portal  on http://localhost:5174
```

To make a new portal filing or helpline call appear in the UI, re-run `npm run sync`
and refresh the command center.

## Why these technologies

| Choice | Reason |
|---|---|
| **SQLite via `node:sqlite`** | Built into Node 24 — real SQL, zero install, no server. Replaces the Postgres pool for the demo; `database/postgresql/schema.sql` stays the production reference. |
| **`ml-random-forest`** | The JS port of the same CART algorithm the scikit-learn notebook uses. The model **genuinely trains at runtime**, so the reported metrics are measured rather than copied. |
| **No Python** | Not installed on the demo machine, so the notebooks cannot run. The ASR stage (faster-whisper / Bhashini) remains in `ml/*.ipynb`; the entity-extraction stage runs in Node. |
| **Hop-ordered traversal** | The money trail reads `mule_hops` in `hop_level` order instead of a Cypher traversal, so the demo needs no graph database. `database/neo4j/` remains the production artifact. |

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Row counts across all tables |
| `POST` | `/api/v1/complaints` | File a complaint; auto-provisions a case + alert |
| `GET` | `/api/v1/complaints/:number` | Look up a complaint |
| `GET` | `/api/v1/cases`, `/cases/:id` | Cases, with complaint + alerts joined |
| `PATCH` | `/api/v1/cases/:id` | Update status / priority / risk |
| `GET` | `/api/v1/alerts` | Alert feed |
| `GET` | `/api/v1/atms`, `/atms/top-risk` | ATMs with live model scores |
| `GET` | `/api/v1/money-trail/:complaintNumber` | Victim → mule → cash-out hops + predicted ATM |
| `POST` | `/api/v1/nlp/extract` | Helpline transcript → structured incident (persists it) |
| `GET` | `/api/v1/nlp/extractions` | Past extractions |
| `GET` | `/api/v1/ml/metrics`, `/ml/history` | Model metrics and run registry |
| `POST` | `/api/v1/ml/retrain` | Retrain and rescore every ATM |
| `POST` | `/api/v1/ml/predict` | Score one ATM from raw features |
| `POST` | `/api/v1/auth/login` | Issue a JWT (not enforced on reads) |

## The frontend is unchanged

The command center keeps its original source. It has two data inputs, and both are
*data* rather than *code*, so `npm run sync` can regenerate them with identical shapes:

- `frontend/public/*.csv` — read at runtime via `fetch()`
- `frontend/src/lib/investigationData.js` — an ES module, regenerated with the same exports

`git diff` shows no `.jsx`, `.css`, `.html`, `vite.config.js` or `package.json` change
in `frontend/`.

## NLP extraction

`services/nlp.js` ports the rules from `Team Leader/README.md` to JavaScript: spoken
Indian numerics (*lakhs*, *hazar*, *crore* including compound forms like
"4 lakh 20 hazaar"), payment rails, UPI VPAs and bare account numbers, and the
eight-way scam taxonomy. Indian digit grouping is handled explicitly — `4,20,000`
reads as 420000, not 4.2.

## Demo accounts

Seeded with real bcrypt hashes (the original `users.csv` carried literal
`hashed_password_1` placeholders that could never authenticate):

```
analyst@demo.gov   admin@demo.gov   police@demo.gov   bank@demo.gov   →   Demo@123
```

## Tests

```bash
npm test                            # NLP extraction (8 transcript cases + unit checks)
node test/pipeline.test.js          # end-to-end against a running API (9 checks)
```

## Limitations

- **All data is synthetic.** Model metrics describe fit to this dataset and are not
  real-world fraud prediction performance. Every generated row is tagged accordingly.
- **No live audio transcription** — Python is not installed. The NLP endpoint takes text.
- **No real OTP/SMS** — the portal keeps its hardcoded `1234`.
- **No file uploads** — evidence is recorded as metadata only.
- **Login is not enforced** — the command-center login screen is deferred by decision;
  the endpoint and middleware are ready.
- The Bhashini API keys committed in `ml/NLP(BHASHINI) (1).ipynb` should be rotated
  and the file's history purged regardless of this demo's scope.
