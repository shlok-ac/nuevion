# SentinCash — Feature Guide with Worked Examples

Every feature that was added, explained through a realistic cybercrime scenario, with the
exact command and the **actual output** you get back. Nothing here is aspirational: each
block was executed against the running API, and `scripts/capture-examples.js` reproduces
all of it on demand.

> **Data disclaimer.** Every record is synthetic. The model scores real *predictions* on
> synthetic *features*. The accuracy figures describe fit to this dataset and are not
> real-world fraud performance.

---

## Contents

1. [How to run it](#how-to-run-it)
2. [Real-world scenario: one fraud ring, six victims](#scenario)
3. [Features, one by one](#features)
4. [What you can build on top of this](#what-you-can-build)
5. [Endpoint reference](#endpoints)
6. [What is deliberately not included](#not-included)

---

<a name="how-to-run-it"></a>
## 1. How to run it

```bash
cd backend
npm install
npm run seed     # CSVs -> SQLite  (500 complaints, 500 cases, 500 ATMs, 1500 hops)
npm run train    # trains the Random Forest, writes scores back to the atms table
npm run sync     # SQLite -> frontend data files
npm run dev      # API on http://localhost:5000
```

```bash
cd frontend      && npm run dev    # command center  :5173
cd citizen-portal && npm run dev   # citizen portal   :5174
```

Recreate every example in this file:

```bash
node scripts/capture-examples.js    # writes scripts/capture-examples.result.txt
node scripts/verify-readme.js       # checks the README scenario still matches
node scripts/probe-metrics.js       # guards the ml/metrics regression
```

---

<a name="scenario"></a>
## 2. Real-world scenario: one fraud ring, six victims

This is the story the features were built for. A single operation runs a **fake trading
desk** that pulls money out of victims through a chain of mule accounts, then cashes out
at a physical ATM before the victim notices.

| # | Victim | Channel | Lost | What happened |
|---|---|---|---|---|
| 1 | Meera Patil, Ahmedabad | IMPS | ₹82,165 | Debited after a "KYC update" call |
| 2 | Ramesh Kulkarni, Pune | UPI | ₹4,20,000 | Sent to a fake investment desk |
| 3 | Sunita Pillai, Mumbai | Net banking | ₹1,87,500 | Redirected to `merchant@axis` |
| 4 | Anjali Sharma, Jaipur | AnyDesk + extortion | ₹2,50,000 | Trapped in a fake task job, told she'd be "digitally arrested" |
| 5 | Kavita Menon, Kochi | Loan app | ₹60,000 | Blackmailed with explicit photos |
| 6 | Ravi Sharma, Delhi | Credit card | ₹12,50,000 | "Guaranteed returns" crypto pitch |


<a name="features"></a>
## 3. Features, one by one

### 3.1 Citizen portal complaint intake

**What it does.** A citizen files a complaint in the browser. The portal POSTs to the API
instead of writing to `localStorage`, and the server mints the reference number.

**Why it matters.** In the original prototype the complaint never left the laptop —
refreshing the page lost it. Now the filing is durable and immediately visible to an
officer.

```bash
curl -X POST http://localhost:5000/api/v1/complaints \
  -H "Content-Type: application/json" \
  -d '{"complainantName":"Ramesh Kulkarni","phone":"9876543210","bankName":"HDFC Bank",
       "fraudAmount":420000,"transactionType":"UPI","location":"Pune",
       "description":"Investment scam, money moved to a fake trading desk","source":"PORTAL"}'
```

```json
{
  "success": true,
  "complaintNumber": "CYB-2026-82209",
  "caseNumber": "C-2026-0514",
  "priority": "high",
  "complaintId": 514,
  "caseId": 514
}
```

**One request, three rows.** A single transaction writes the `complaints` record, a
`cases` record and an `alerts` record. Nobody has to open the dashboard to create the
case — it exists the moment the citizen clicks submit.

**Priority is automatic**, derived from the amount:

| Amount | Priority |
|---|---|
| ≥ ₹10,00,000 | `critical` |
| ≥ ₹2,50,000 | `high` |
| below that | `medium` |

**What you can do with it**
- Change the thresholds to match your own fraud-prevention policy.
- Post from a mobile app or an IVR callback flow — the contract is plain JSON.
- Reject a duplicate reference (§3.9) so a double-tapped button can't file twice.

---

### 3.2 Helpline transcript triage (NLP)

**What it does.** A 1930 helpline call is turned into a structured incident: who called,
from where, how much, which payment rail, and which scam category.

**Why it matters.** During a call an officer is writing notes, not typing a form. This
turns speech straight into a triage-ready record.

```bash
curl -X POST http://localhost:5000/api/v1/nlp/extract \
  -H "Content-Type: application/json" \
  -d '{"transcript":"Hello, my name is Anjali Sharma. I am calling from Jaipur. Some fraudster trapped me in a fake task job and made me install AnyDesk for remote access. They are threatening digital arrest unless I pay 2.5 lakh to 9876543210."}'
```

```json
{
  "complainant_name": "Anjali Sharma",
  "phone_number": "9876543210",
  "location": "Jaipur",
  "stolen_amount_inr": 250000,
  "transfer_mode": "UPI",
  "scam_category": "DIGITAL_ARREST",
  "mule_accounts": ["9876543210"],
  "bank_mentions": [],
  "confidence": 0.6
}
```

**The eight scam categories** it distinguishes:

| Category | Trigger phrases |
|---|---|
| `CREDIT_CARD_FRAUD` | "credit card", card charge/blocked |
| `DIGITAL_ARREST` | "digital arrest", EDP, police call, cybercrime cell |
| `UTILITY_BILL_FRAUD` | electricity / water / gas bill |
| `TASK_JOB_FRAUD` | "task job", "part time job", "work from home" |
| `INVESTMENT_TRADING_FRAUD` | invest, crypto, forex, share, "guaranteed return" |
| `LOAN_APP_EXTORTION` | loan app, extortion, explicit photos, blackmail |
| `REMOTE_ACCESS_MALWARE` | AnyDesk, TeamViewer, "remote access", screen share |
| `FINANCIAL_FRAUD` | fallback for UPI / IMPS / NEFT / scam mentions |

**Dry run — extract without persisting.** Useful for tuning rules before letting them
write to the database:

```bash
curl -X POST http://localhost:5000/api/v1/nlp/extract \
  -H "Content-Type: application/json" \
  -d '{"transcript":"Mera naam Kavita Menon hai, main Kochi se. Ek fake loan app ne mere saath explicit photos ki dhamki di aur 60,000 rupees maange, warna police ko batayenge.","persist":false}'
```

```json
{
  "complainant_name": "Kavita Menon",
  "stolen_amount_inr": 60000,
  "scam_category": "LOAN_APP_EXTORTION",
  "confidence": 0.2
}
```

Note the low `confidence` — she gave only a name and an amount. That's the signal to read
this one by hand rather than auto-triage it.

**Credit-card detection with Indian grouping** — `12,50,000` → `1250000`, with the rail
inferred from "credit card":

```json
{
  "complainant_name": "Ramesh Kulkarni",
  "location": "Pune",
  "stolen_amount_inr": 1250000,
  "transfer_mode": "CARD_PAYMENT",
  "scam_category": "CREDIT_CARD_FRAUD",
  "confidence": 0.2
}
```

**What you can do with it**
- Add a category: append a pattern to `TAXONOMY` in `services/nlp.js` — no other file changes.
- Feed `bank_mentions` into a fraud hotlist check before the case is even triaged.
- Route by category: send `LOAN_APP_EXTORTION` to the women's-safety desk, `DIGITAL_ARREST` to a senior officer immediately.
- Swap in a real ASR feed later (§6) — the output shape doesn't change.

---

### 3.3 The money trail

**What it does.** Reconstructs where the money went: victim → mule 1 → mule 2 → cash-out.

```bash
curl http://localhost:5000/api/v1/money-trail/CMP100001

---

### 3.4 The ATM risk model

**What it does.** A Random Forest scores every ATM for cash-out likelihood, using the five
features the notebook defined.

```bash
curl -X POST http://localhost:5000/api/v1/ml/retrain
```

```
Trained rf-100trees-2026-09-27
  algorithm  : RandomForestClassifier (100 trees, seed 42)
  features   : highway_distance, lighting_score, cctv_coverage,
               historical_fraud_count, withdrawal_limit
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

**These numbers are measured, not copied.** The model genuinely trains on every call, on a
stratified 80/20 split with seed 42 — the same protocol as `ml/ArthVyuh.ipynb`. The
dominant feature, `historical_fraud_count` (0.48), matches what the scikit-learn model found.

**What each feature means, and why it predicts risk:**

| Feature | What it captures | Why it matters |
|---|---|---|
| `historical_fraud_count` | Fraud already seen at that ATM | Strongest by far — a site hit before usually gets hit again |
| `cctv_coverage` | Camera presence | Low coverage enables cash-out |
| `highway_distance` | Distance from a highway | Isolated sites are easier to approach unnoticed |
| `lighting_score` | Surrounding illumination | Dark sites hide activity |
| `withdrawal_limit` | Per-transaction cap | High limits move more cash per visit |

**Ask it about a single ATM.** The most useful feature day to day — score a hypothetical
site without touching the database. Same algorithm, opposite verdicts:

```bash
# A well-lit, camera-covered, low-crime site in a busy area
curl -X POST http://localhost:5000/api/v1/ml/predict -H "Content-Type: application/json" \
  -d '{"highway_distance":2.1,"lighting_score":90,"cctv_coverage":85,
       "historical_fraud_count":3,"withdrawal_limit":20000}'
```
```json
{ "riskLevel": "LOW", "confidence": 66 }
```

```bash
# A dark, isolated, high-crime site with a high withdrawal limit
curl -X POST http://localhost:5000/api/v1/ml/predict -H "Content-Type: application/json" \
  -d '{"highway_distance":9.4,"lighting_score":12,"cctv_coverage":8,
       "historical_fraud_count":88,"withdrawal_limit":100000}'
```
```json
{ "riskLevel": "HIGH", "confidence": 82 }
```

**Rank the danger zones** during an active investigation:

```bash
curl "http://localhost:5000/api/v1/atms/top-risk?limit=5&city=Mumbai"
```

```json
[
  { "atm_id": "ATM100475", "bank": "SBI",                "risk_level": "MEDIUM", "risk_score": 98 },
  { "atm_id": "ATM100221", "bank": "HDFC Bank",          "risk_level": "MEDIUM", "risk_score": 96 },
  { "atm_id": "ATM100260", "bank": "ICICI Bank",         "risk_level": "HIGH",   "risk_score": 92 },
  { "atm_id": "ATM100012", "bank": "Kotak Mahindra Bank","risk_level": "MEDIUM", "risk_score": 90 },

---

### 3.5 Case management

**What it does.** Officers move a case through its lifecycle. Everything is recorded.

```bash
curl -X PATCH http://localhost:5000/api/v1/cases/C-2026-0512 \
  -H "Content-Type: application/json" \
  -d '{"status":"frozen","priority":"critical","riskLevel":"CRITICAL"}'
```

**Before:**
```json
{"id":512,"case_number":"C-2026-0512","priority":"high","status":"active","risk_level":"HIGH"}
```
**After:**
```json
{"id":512,"case_number":"C-2026-0512","priority":"critical","status":"frozen","risk_level":"CRITICAL"}
```

That single call is a real operational record: the account lien is requested, the case is
escalated, the risk is restated. Updatable fields are `status`, `priority`, `riskLevel` and
`assignedTo`; anything else is rejected rather than silently ignored.

**Pull a case with everything attached:**

```bash
curl http://localhost:5000/api/v1/cases/C-2026-0512
```

Returns the case **plus** its complaint, its alerts and its hop count in one round trip —
so a case detail page needs a single request.

**What you can do with it**
- Build a work queue: filter by `status=active&priority=critical`.
- Record who owns what via `assignedTo`.
- Drive the dashboard's activity feed from `updated_at`.

---

### 3.6 Alerts

**What it does.** Every meaningful event raises an alert, so an officer sees the case move.

```bash
curl "http://localhost:5000/api/v1/alerts?case=C-2026-0512"
```

```json
[
  {
    "id": 512,
    "case_id": 512,
    "alert_type": "NLP_EXTRACTION",
    "severity": "high",
    "message": "Helpline triage: DIGITAL_ARREST for Rs 250000 via UPI",
    "status": "OPEN",
    "created_at": "2026-09-27 16:49:52"
  }
]
```

The alert text is already readable — no formatting needed. This is the feed behind the
command center's "live activity" panel.

**Alert types raised automatically:** `NEW_COMPLAINT` (portal filing) and `NLP_EXTRACTION`
(helpline call), both auto-prioritised from the amount.

**What you can do with it**
- Wire these to push notifications, email or WhatsApp for `severity=critical`.
- Add a rule: raise an alert when a mule account appears in a second case.
- Build an SLA timer from `created_at` — a `critical` case sitting in `OPEN` for 10
  minutes is itself an alert.

---

### 3.7 Pushing the database to the dashboard

**What it does.** `npm run sync` reads SQLite and rewrites the command center's data files,
so the UI shows current data with **no frontend code change**.

```bash
npm run sync
```

```
Regenerated frontend data files:
  public/atm_predictions.csv      500 rows
  public/fraud_incidents.csv      500 rows
  public/cell_towers.csv           10 rows
  public/caller_cases.csv          10 rows

---

### 3.8 Authentication

**What it does.** Four role-based accounts, real bcrypt password hashing, JWT issuance.

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@demo.gov","password":"Demo@123"}'
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": { "id": 1, "name": "Ananya Sharma", "email": "analyst@demo.gov", "role": "analyst" }
}
```

A wrong password is rejected:

```bash
{"message":"Invalid email or password"}   # HTTP 401
```

**The four roles** — list them with `GET /api/v1/auth/demo-accounts`:

| Email | Role | Real-world equivalent |
|---|---|---|
| `analyst@demo.gov` | `analyst` | Cybercrime analyst |
| `admin@demo.gov` | `admin` | Unit head |
| `police@demo.gov` | `police_officer` | Investigating officer |
| `bank@demo.gov` | `bank_officer` | Bank liaison |

> **The original `users.csv` could never log anyone in.** It shipped literal
> `hashed_password_1` placeholders, which no bcrypt comparison can match. The seeder now
> generates real hashes; the other 496 roster rows get an inert hash that matches nothing.

**Login is not enforced on the read routes** — a deliberate demo decision so the command
center opens straight to the dashboard. The endpoint, the hashing and the middleware in
`middleware/authMiddleware.js` are all ready. Set `JWT_AUTH=true` and mount that middleware
on the read routers to switch it on.

**What you can do with it**
- Enforce role-based access: analysts read, police officers edit, bank officers see only
  accounts at their own bank.
- Build the login screen whenever you're ready — the endpoint is already live.
- Extend to refresh tokens and revocation for longer sessions.

---

### 3.9 Built-in data integrity

Some behaviour you get without asking. Duplicate references are refused:

```bash
curl -X POST http://localhost:5000/api/v1/complaints \
  -H "Content-Type: application/json" \
  -d '{"complaintNumber":"CYB-2026-00001","complainantName":"Test"}'
```

```
HTTP 409  {"message":"Complaint number already exists","complaintNumber":"CYB-2026-00001"}
```

Other guarantees:

| Guarantee | How |
|---|---|
| No half-written complaints | Complaint + case + alert are one transaction |
| No orphan records | Foreign keys enforced; seeding clears child-first |
| No invalid model output | `POST /api/v1/ml/predict` returns 400 listing the required features |
| Scores are real | Regression-tested against the all-zeros failure mode |

---

### 3.10 Tests

Two suites, 18 checks, all passing.

```bash
npm test                       # NLP: 8 transcript cases + unit checks
node test/pipeline.test.js     # end-to-end against a live API: 10 checks
```

The NLP suite covers romanised Hindi, compound amounts, Indian digit grouping and all
eight scam categories. The pipeline suite asserts that a filed complaint is really in the
database, that the money trail returns the right chain, that per-class support sums to the
test-set size, that the dominant feature matches the notebook, and that model scores are
genuinely varied and non-zero.


---

<a name="what-you-can-build"></a>
## 4. What you can build on top of this

Concrete next features this foundation supports:

| Idea | How |
|---|---|
| **Real-time alerts** | SSE stream of `/alerts` → push to a duty officer's browser |
| **Ring detection** | SQL: accounts appearing across ≥2 complaints become flagged suspects |
| **Bank freeze workflow** | `PATCH /cases/:id` → generate a Sec 106 BNSS notice → track dispatch |
| **Officer audit log** | Middleware recording who viewed which victim's PII — a DPDP Act requirement |
| **Whisper ASR** | Python service replacing the text field in `/nlp/extract`; output shape unchanged |
| **Neo4j graph** | `database/neo4j/import.cypher` is ready; load hops as `TRANSFER` edges |
| **More ML models** | Add a feature column, extend `FEATURES`, retrain |
| **WhatsApp/SMS alerts** | Outbound call from the alert stream; OTP provider for the portal |
| **City dashboards** | `GET /atms/top-risk?city=` already filters |
| **Case export** | `GET /export` composition for FIR paperwork |

**Honest gaps to close first for real use:** PII encryption at rest, a proper audit trail,
rate limiting on the public complaint endpoint, and real OTP instead of the `1234`
placeholder.

---

<a name="endpoints"></a>
## 5. Endpoint reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Row counts across all tables |
| `POST` | `/api/v1/complaints` | File a complaint; auto-provisions case + alert |
| `GET` | `/api/v1/complaints` | List complaints (newest first) |
| `GET` | `/api/v1/complaints/:number` | Look up one complaint |
| `GET` | `/api/v1/cases` | List cases |
| `GET` | `/api/v1/cases/:id` | One case with complaint + alerts + hop count |
| `PATCH` | `/api/v1/cases/:id` | Update `status`, `priority`, `riskLevel`, `assignedTo` |
| `GET` | `/api/v1/alerts` | Alert feed; `?case=` to filter |
| `GET` | `/api/v1/atms` | ATMs with live model scores |
| `GET` | `/api/v1/atms/top-risk` | Ranked by score; `?city=` to filter |
| `GET` | `/api/v1/atms/:atmId` | One ATM |
| `GET` | `/api/v1/money-trail/:complaintNumber` | Hops + predicted cash-out ATM |
| `POST` | `/api/v1/nlp/extract` | Transcript → structured incident (`persist:false` to dry-run) |
| `GET` | `/api/v1/nlp/extractions` | Past extractions |
| `GET` | `/api/v1/ml/metrics` | Accuracy, per-class P/R/F1, feature importance |
| `GET` | `/api/v1/ml/history` | Every training run |
| `POST` | `/api/v1/ml/retrain` | Retrain and rescore all 500 ATMs |
| `POST` | `/api/v1/ml/predict` | Score one ATM from raw features |
| `POST` | `/api/v1/auth/login` | Issue a JWT |
| `GET` | `/api/v1/auth/demo-accounts` | The four demo operators |

---

<a name="not-included"></a>
## 6. What is deliberately not included

Stated plainly so nothing surprises you mid-demo:

- **No live audio transcription.** Python isn't installed, so the notebooks can't run. The
  NLP endpoint takes text. Real ASR needs a Python service — the output contract won't change.
- **No Neo4j at runtime.** The money trail reads hop-ordered rows. The Cypher files remain
  as the production graph design.
- **No real OTP/SMS.** The portal keeps `1234`. The `otp_codes` table is ready.
- **No file uploads.** Evidence is recorded as metadata (name, size, type) only.
- **No login enforcement.** The command-center login screen is deferred by decision.
- **No PII encryption, audit log, CI or Docker.** Production concerns, out of demo scope.
- **All data is synthetic.** Never present the 0.86 accuracy as real-world fraud performance.

> ⚠️ **Action item regardless of scope:** the Bhashini API keys
> (`BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_INFERENCE_KEY`) are hardcoded in
> `ml/NLP(BHASHINI) (1).ipynb` and are in git history. Rotate them and purge the history.

That last check exists because of a real bug: a misread library return shape wrote
`risk_score = 0` for all 500 ATMs while still producing valid-looking labels, so a naive
assertion passed. The test now pins that failure mode.

  src/lib/investigationData.js    503 cases, 500 chains
                                suspects=12, mules=60, alerts=40
```

**Why this works without touching the frontend.** The command center reads data through
exactly two channels, and both are *data* rather than *code*:

| Channel | How it's read | What the generator writes |
|---|---|---|
| `frontend/public/*.csv` | `fetch()` at runtime | Same filenames, same column names |
| `frontend/src/lib/investigationData.js` | ES module import | Same exports, same object shapes |

`investigationData.js` is regenerated with `cases`, nested `muleChains`, `suspects`,
`muleAccounts`, `alerts` and `evidenceByCase` — identical to what the components already
import. The money trail's nested `children` tree is built from the real hops, so
`MoneyTrailGraph.jsx` renders genuine database data through unmodified code.

**Verify nothing was touched:**

```bash
git status --porcelain -- frontend/
# 5 files, all data. No .jsx, .css, .html, vite.config.js or package.json.
```

**What you can do with it**
- Wire it to a file watcher or cron job for a live dashboard.
- Point the same generator at a different database without touching the UI.
- Add a new export in `db/sync.js` and the dashboard can consume it as another CSV.

  { "atm_id": "ATM100113", "bank": "Bank of Maharashtra","risk_level": "MEDIUM", "risk_score": 90 }
]
```

**What you can do with it**
- Prioritise bank liaison: send freeze notices to the top-scoring ATMs first.
- Justify surveillance requests — every score names the model and features behind it.
- Track the model over time via `GET /api/v1/ml/history`.
- Add a feature (foot traffic, time of day) by adding a column to `data/atms.csv` and one string to `FEATURES`.

```

```
hop_level  from_account  to_account  amount      timestamp
         1  ACC0001V      ACC0001M1    78057.36   2026-08-21 10:39:07
         2  ACC0001M1     ACC0001M2    73949.08   2026-08-21 10:56:07
         3  ACC0001M2     ACC0001M3    69840.79   2026-08-21 11:04:07
                                        → cash-out at ATM100459 (HIGH)
```

**Read the pattern, not just the numbers.** Each layer sheds a little value: ₹78,057 in,
₹69,840 out — about 10.5% lost across three hops in 25 minutes. That decay is the
fingerprint of a laundering chain, and it's visible at a glance on the dashboard.

The response also carries the **predicted cash-out ATM with its live model score**, so one
call answers "where did the money go" *and* "where will they try to withdraw it".

**What you can do with it**
- Detect ring patterns: accounts appearing across many victims are your priority targets.
- Calculate time-to-drain and alert while a chain is still moving.
- Feed the terminal account into a bank freeze request — that's the `LegalWindow` page.
- Add a 4th hop: the data model already stores arbitrary `hop_level` values.


**It handles the messy parts of spoken Indian numbers.** Each of these is a real case:

| Spoken / written | Parsed as |
|---|---|
| "4 lakh 20 hazaar" | 420000 |
| "1 lakh 87 hazaar 500" | 187500 |
| "2.5 lakh" | 250000 |
| "three lakh" | 300000 |
| "12,50,000" | 1250000 |
| "4,20,000" | 420000 |
| "1,87,500" | 187500 |

Indian digit grouping is the trap here: `4,20,000` is 420,000, **not** 4.20. A naive
parse gives you a number a hundred times too small.

Two guards that matter operationally:
- **A 10-digit account number is never read as a loss amount.** In the Anjali Sharma call
  above, `9876543210` was correctly captured as a phone number, not as ₹98.7 crore.
- **The largest plausible value wins**, so a stray UTR can't override the real amount.

**`confidence` tells you when to trust it** — the fraction of independent signals that
fired (amount, VPA, account, spoken-id, bank). Low means read it manually.

The six accounts route through shared mules, and the trail terminates at `ATM100459` in
Ahmedabad. Everything below is one of those victims arriving through a different door —
and the system converging on the same answer.

---
