import csv
import json
import math
import sys
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


FEATURES = [
    "highway_distance",
    "lighting_score",
    "cctv_coverage",
    "historical_fraud_count",
    "withdrawal_limit",
]
TRAINING_DATA = Path(__file__).resolve().parent.parent / "data" / "atms.csv"


def _read_training_rows():
    with TRAINING_DATA.open("r", newline="", encoding="utf-8-sig") as file:
        rows = list(csv.DictReader(file))
    if not rows or any(not row.get("risk_level") for row in rows):
        raise ValueError("ATM training data must contain labeled risk_level rows")
    return rows


def _feature_vector(row):
    values = []
    for feature in FEATURES:
        try:
            value = float(row[feature])
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"ATM feature {feature} is missing or invalid") from error
        if not math.isfinite(value):
            raise ValueError(f"ATM feature {feature} must be finite")
        values.append(value)
    return values


def predict_atm_risk(atms):
    if not isinstance(atms, list) or not atms:
        raise ValueError("atms must be a non-empty list")

    training_rows = _read_training_rows()
    training_features = [_feature_vector(row) for row in training_rows]
    training_labels = [row["risk_level"].strip().upper() for row in training_rows]
    row_indexes = list(range(len(training_rows)))
    x_train, _, y_train, _, train_indexes, _ = train_test_split(
        training_features,
        training_labels,
        row_indexes,
        test_size=0.2,
        random_state=42,
        stratify=training_labels,
    )

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(x_train, y_train)

    candidate_features = [_feature_vector(atm) for atm in atms]
    predictions = model.predict(candidate_features)
    probabilities = model.predict_proba(candidate_features)
    training_atm_ids = {
        training_rows[index]["atm_id"]
        for index in train_indexes
    }
    known_training_atm_ids = {row["atm_id"] for row in training_rows}
    results = []
    for atm, label, probability_row in zip(atms, predictions, probabilities):
        atm_id = atm.get("atm_id")
        if atm_id in training_atm_ids:
            confidence_type = "in_sample_class_probability_not_calibrated"
        elif atm_id in known_training_atm_ids:
            confidence_type = "held_out_class_probability_not_calibrated"
        else:
            confidence_type = "unseen_atm_class_probability_not_calibrated"
        results.append(
            {
                "atm_id": atm_id,
                "risk_level": str(label),
                "prediction_confidence": round(float(max(probability_row)) * 100, 2),
                "confidence_type": confidence_type,
                "model": "RandomForestClassifier",
                "model_version": "ArthVyuh.ipynb: n_estimators=100, random_state=42",
                "target": "ATM risk_level",
                "features": {feature: value for feature, value in zip(FEATURES, _feature_vector(atm))},
                "training_data": "data/atms.csv",
                "provenance": "live_atm_risk_inference",
                "cashout_probability": None,
            }
        )
    return results


def main():
    payload = json.load(sys.stdin)
    predictions = predict_atm_risk(payload.get("atms"))
    json.dump({"predictions": predictions}, sys.stdout)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, json.JSONDecodeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
