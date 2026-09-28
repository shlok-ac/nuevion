import unittest

from atm_risk_service import FEATURES, predict_atm_risk


class AtmRiskServiceTests(unittest.TestCase):
    def test_predicts_existing_atm_risk_without_cashout_probability(self):
        result = predict_atm_risk(
            [
                {
                    "atm_id": "test-atm",
                    "highway_distance": 3.63,
                    "lighting_score": 46,
                    "cctv_coverage": 69,
                    "historical_fraud_count": 47,
                    "withdrawal_limit": 20000,
                }
            ]
        )[0]

        self.assertEqual(result["atm_id"], "test-atm")
        self.assertIn(result["risk_level"], {"HIGH", "MEDIUM", "LOW"})
        self.assertGreaterEqual(result["prediction_confidence"], 0)
        self.assertLessEqual(result["prediction_confidence"], 100)
        self.assertEqual(set(result["features"]), set(FEATURES))
        self.assertIsNone(result["cashout_probability"])
        self.assertEqual(result["provenance"], "live_atm_risk_inference")

    def test_rejects_missing_model_feature(self):
        with self.assertRaisesRegex(ValueError, "lighting_score"):
            predict_atm_risk(
                [
                    {
                        "atm_id": "incomplete-atm",
                        "highway_distance": 3.63,
                        "cctv_coverage": 69,
                        "historical_fraud_count": 47,
                        "withdrawal_limit": 20000,
                    }
                ]
            )


if __name__ == "__main__":
    unittest.main()
