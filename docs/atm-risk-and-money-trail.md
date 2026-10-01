# ATM Risk Prediction & Money Trail Intelligence

> Part of the Nuevion prototype. See the [root README](../README.md) for setup and API reference.

This subsystem identifies potentially high-risk cash-out locations after a cybercrime
complaint. It combines a supervised ATM risk classifier with a Neo4j graph of the
transaction path that fraudulent funds travel.

Prototype flow:

```text
Victim Account → Mule Account 1 → Mule Account 2 → Cash-out Account → Likely Cash-out ATM
```

## Where the code lives

| Concern | Location |
|---|---|
| Notebook the logic was derived from | `ml/ArthVyuh.ipynb` |
| Callable classifier used by the API | `ml/atm_risk_service.py` |
| Unit tests | `ml/test_atm_risk_service.py` |
| Neo4j schema / constraints / import | `database/neo4j/` |
| Money-trail Cypher reference queries | `database/neo4j/money_trail_queries.cypher` |
| Datasets | `data/` (`atms.csv`, `atm_predictions.csv`, `mule_hops.csv`, `atm_cashout_mapping.csv`) |
| Importer into PostgreSQL/Neo4j | `backend/scripts/importReferenceData.js` |

## 1. ATM risk prediction

`RandomForestClassifier(n_estimators=100, random_state=42)` predicts an ATM's `risk_level`.

Input features:

- `highway_distance`
- `lighting_score`
- `cctv_coverage`
- `historical_fraud_count`
- `withdrawal_limit`

Target: `risk_level` ∈ {`HIGH`, `MEDIUM`, `LOW`}

Training data: `data/atms.csv` (500 records), 80/20 stratified split, `random_state=42`.
Confidence is the highest `predict_proba()` class probability.

### Measured performance on this dataset

Accuracy ≈ 0.89

| Risk level | Precision | Recall | F1 |
|---|---|---|---|
| HIGH | 1.00 | 0.81 | 0.90 |
| LOW | 0.95 | 0.78 | 0.86 |
| MEDIUM | 0.83 | 0.98 | 0.90 |

### Feature importance

| Feature | Importance |
|---|---|
| `historical_fraud_count` | 0.6339 |
| `lighting_score` | 0.1247 |
| `cctv_coverage` | 0.1139 |
| `highway_distance` | 0.0977 |
| `withdrawal_limit` | 0.0299 |

These values describe relative contribution *within this trained prototype model*. They are
not evidence of causal real-world fraud behaviour.

## 2. Prediction output

`atm_predictions.csv` holds the original ATM fields plus the model's predictions
(`predicted_risk_level`, `prediction_confidence`).

## 3. Money trail generation

Input: `complaints.csv` → output: `mule_hops.csv`

Three hops are generated per complaint, giving 500 complaints × 3 = 1,500 hop records.

| Hop | From | To |
|---|---|---|
| 1 | Victim | Mule 1 |

## 6. End-to-end flow

```text
Complaint ──┬── ATM dataset ──→ Random Forest ──→ ATM risk prediction ──┐
            │                                                     ├─→ Cash-out Account
            └── Complaint data ─→ Mule hop generation ─→ Neo4j graph ─┘        │
                                                                              ▼
                                                              Likely ATM mapping
                                                                              │
                                                                              ▼
                                                              Predicted risk level
```

## 7. Worked example

For complaint `CMP100001`:

```text
ACC0001V → ACC0001M1 → ACC0001M2 → ACC0001M3 (cash-out)
```

The cash-out account connects to `ATM100459` — HDFC Bank, Ahmedabad, risk `HIGH`,
confidence 100%, at `23.016729, 72.646921`:

```text
ACC0001V      -[:TRANSFER]->          ACC0001M1
ACC0001M1     -[:TRANSFER]->          ACC0001M2
ACC0001M2     -[:TRANSFER]->          ACC0001M3
ACC0001M3     -[:LIKELY_CASHOUT_AT]-> ATM100459
```

## Requirements

Runtime service dependencies are declared in `ml/requirements.txt` (`scikit-learn`,
`requests`, `openai-whisper`). Exploratory work in `ml/ArthVyuh.ipynb` additionally uses
`pandas`, `numpy`, and `jupyter`.

## Limitations

This is a prototype built on synthetic/generated transaction data and the available dataset
fields. Specifically:

- Money trail hops are **generated**, not observed.
- The ATM-to-cash-out association is derived from complaint location and catalog data.
- A predicted ATM **does not prove** a withdrawal occurred there.
- Dataset metrics are not real-world fraud prediction performance.
- The live API classifies **ATM catalog risk only** — it does not identify where complaint
  funds went, and it never writes candidate associations into Neo4j as cash-out events.

Real deployment would require authorized access to banking transaction data, ATM records,
live complaint feeds, and law-enforcement/banking systems.

## Future scope

Real-time transaction streaming; integration with cybercrime complaint systems; real ATM
withdrawal data; bank transaction monitoring; graph-based fraud detection; Graph Neural
Networks; geospatial reachability analysis; ATM-level anomaly detection; real-time alerts
to banks and law enforcement; continuous retraining; explainable AI for risk predictions.

| 2 | Mule 1 | Mule 2 |
| 3 | Mule 2 | Cash-out Account |

Columns: `hop_id`, `complaint_id`, `hop_level`, `from_account`, `to_account`,
`amount_transferred_inr`, `time_delay_minutes`, `timestamp`.

## 4. Neo4j graph model

**Nodes**

- `(:Account { account_id })`
- `(:ATM { atm_id, bank_name, latitude, longitude, predicted_risk_level, prediction_confidence })`

**Relationships**

- `(:Account)-[:TRANSFER { amount_transferred_inr, complaint_id, time_delay_minutes, hop_level, timestamp }]->(:Account)`
- `(:Account)-[:LIKELY_CASHOUT_AT]->(:ATM)`

## 5. ATM cash-out mapping

`data/atm_cashout_mapping.csv` links each complaint's cash-out account to a likely ATM,
derived from complaint city and available ATM information.

Columns: `complaint_number`, `location`, `cashout_account`, `atm_id`, `bank_name_y`,
`latitude`, `longitude`, `predicted_risk_level`, `prediction_confidence`.
