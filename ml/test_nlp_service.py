import unittest

from nlp_service import parse_complaint_from_text


class ComplaintTextParsingTests(unittest.TestCase):
    def test_extracts_supported_amount_transfer_account_and_city(self):
        result = parse_complaint_from_text(
            "The caller took Rs 25,000 through UPI and sent it to mule account 1234567890 in Pune."
        )

        self.assertEqual(result["stolen_amount_inr"], 25000)
        self.assertEqual(result["transfer_mode"], "UPI")
        self.assertEqual(result["initial_mule_account"], "ACC_MULE_1234567890")
        self.assertEqual((result["victim_lat"], result["victim_lon"]), (18.5204, 73.8567))

    def test_does_not_invent_amount_mode_account_or_location(self):
        result = parse_complaint_from_text(
            "A suspicious caller told me to withdraw money near the railway station."
        )

        self.assertIsNone(result["stolen_amount_inr"])
        self.assertIsNone(result["transfer_mode"])
        self.assertIsNone(result["initial_mule_account"])
        self.assertIsNone(result["victim_lat"])
        self.assertIsNone(result["victim_lon"])

    def test_classifies_using_the_notebook_keyword_rules(self):
        result = parse_complaint_from_text(
            "Someone used AnyDesk and screen share to access my phone."
        )

        self.assertEqual(result["scam_category"], "REMOTE_ACCESS_MALWARE")


if __name__ == "__main__":
    unittest.main()
