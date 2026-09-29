# ArthaVyuh — Demo Pipeline

A working end-to-end data pipeline for the cybercrime command center, built to run with
**no external infrastructure**: no PostgreSQL, no Neo4j, and no Docker. Voice triage uses
the Python Bhashini service and falls back to a clearly labelled demo when live credentials
are not configured.

```
citizen-portal ──POST /complaints──┐
                                 ├──► API ──► SQLite (node:sqlite) ──┐
helpline text  ──POST /nlp/extract─┤                    │                 │
voice audio    ──POST /triage-voice┘                    │                 │
                                                      └──► Random Forest ├──► frontend data files
                                                            (trains in-process)   (rebuilt automatically)
```

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

`npm run sync` is only needed for the **initial** build. From then on the API rebuilds the
command center's data files itself, so a portal filing or helpline call shows up on the
dashboard on its own — refresh the command center and it is there.

## Automatic rebuilds

The command center reads two generated files rather than the database, so anything written
to SQLite has to be projected into them. `services/liveSync.js` does that automatically
whenever a write route commits:

| Trigger | Route |
|---|---|
| Citizen files a complaint | `POST /api/v1/complaints` |
| Helpline call is triaged | `POST /api/v1/nlp/extract` |
| Analyst edits triage | `PATCH /api/v1/cases/:id` |
| Model is retrained | `POST /api/v1/ml/retrain` |

The rebuild is **debounced** (250ms by default), so a burst of filings costs one pass rather
than one per complaint, and it is **scheduled, never awaited** — the citizen gets their
complaint number back immediately and the files catch up a moment later. It is also
**failure-isolated**: a rebuild error is logged and recorded in `GET /api/v1/sync`, but can
never fail a complaint that is already committed.

```bash
curl localhost:5000/api/v1/sync            # last rebuild status
curl -X POST localhost:5000/api/v1/sync    # force one now
```

Set `AUTO_SYNC=false` to turn the automatic rebuilds off and go back to running
`npm run sync` by hand.

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
| `POST` | `/api/v1/triage-voice` | Multipart audio + sourceLanguage → Bhashini ASR/translation and existing NLP |
| `GET` | `/api/v1/nlp/extractions` | Past extractions |
| `GET` | `/api/v1/ml/metrics`, `/ml/history` | Model metrics and run registry |
| `POST` | `/api/v1/ml/retrain` | Retrain and rescore every ATM |
| `POST` | `/api/v1/ml/predict` | Score one ATM from raw features |
| `POST` | `/api/v1/auth/login` | Issue a JWT (not enforced on reads) |
| `GET` | `/api/v1/sync` | Last data-rebuild status |
| `POST` | `/api/v1/sync` | Force a data rebuild now |

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
npm test                            # NLP extraction (8 transcript cases) + data-rebuild checks
node test/pipeline.test.js          # end-to-end against a running API (14 checks)
```

## Limitations

- **All data is synthetic.** Model metrics describe fit to this dataset and are not
  real-world fraud prediction performance. Every generated row is tagged accordingly.
- **Voice credentials are external** — without BHASHINI_USER_ID, BHASHINI_API_KEY, and
  BHASHINI_INFERENCE_KEY, voice uploads use the labelled sample Marathi demo transcript.
  Configure these only in the backend environment; never expose them in the frontend.
- **No real OTP/SMS** — the portal keeps its hardcoded `1234`.
- **No file uploads** — evidence is recorded as metadata only.
- **Login is not enforced** — the command-center login screen is deferred by decision;
  the endpoint and middleware are ready.
- The Bhashini API keys committed in `ml/NLP(BHASHINI) (1).ipynb` should be rotated
  and the file's history purged regardless of this demo's scope.
