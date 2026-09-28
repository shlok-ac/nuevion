import json
import re
import sys
from datetime import datetime, timezone


CITY_COORDINATES = {
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
}

SCAM_RULES = [
    ("CREDIT_CARD_FRAUD", ("credit card", "debit card", "card block", "cvv", "otp card", "card limit")),
    ("DIGITAL_ARREST", ("digital arrest", "cbi", "police", "customs", "narcotics", "arrest warrant", "ed officer", "skype call")),
    ("UTILITY_BILL_FRAUD", ("electricity", "power bill", "bill update", "bijli", "water bill", "challan")),
    ("TASK_JOB_FRAUD", ("task", "part time", "job", "telegram", "youtube like", "hotel review", "work from home")),
    ("INVESTMENT_TRADING_FRAUD", ("trading", "crypto", "bitcoin", "stocks", "ipo allotment", "share market", "forex")),
    ("LOAN_APP_EXTORTION", ("loan app", "instant loan", "blackmail", "morph", "contacts hacked", "recovery agent")),
    ("COURIER_CUSTOMS_FRAUD", ("fedex", "dhl", "parcel", "drugs in parcel", "customs clearance")),
    ("KYC_SIM_EXPIRY_FRAUD", ("kyc update", "sim block", "pan card link", "verification")),
    ("LOTTERY_REWARD_FRAUD", ("lottery", "lucky draw", "scratch card", "reward points", "cashback offer")),
    ("REMOTE_ACCESS_MALWARE", ("anydesk", "teamviewer", "rustdesk", "quicksupport", "screen share")),
]


def parse_complaint_from_text(transcript):
    text = transcript.strip()
    lower_text = text.lower()

    amount = None
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac)", text, re.IGNORECASE)
    thousand_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:thousand|hazar)", text, re.IGNORECASE)
    currency_match = re.search(
        r"(?:rs\.?|inr|rupees|₹)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees)",
        text,
        re.IGNORECASE,
    )
    if lakh_match:
        amount = round(float(lakh_match.group(1)) * 100000, 2)
    elif thousand_match:
        amount = round(float(thousand_match.group(1)) * 1000, 2)
    elif currency_match:
        raw_amount = currency_match.group(1) or currency_match.group(2)
        amount = float(raw_amount.replace(",", ""))

    transfer_mode = None
    if any(term in lower_text for term in ("credit card", "debit card", " card")):
        transfer_mode = "CARD_PAYMENT"
    elif any(term in lower_text for term in ("net banking", "internet banking", "bank transfer")):
        transfer_mode = "NET_BANKING"
    else:
        for mode in ("NEFT", "IMPS", "RTGS", "UPI"):
            if re.search(r"\b" + mode + r"\b", text, re.IGNORECASE):
                transfer_mode = mode
                break

    account = None
    direct_mule = re.search(
        r"\bmule\b(?:\s+(?:account|acc|no|number|id|is|in|to|at|into|on))*\s*[:\-#]?\s*([0-9a-zA-Z]+)",
        text,
        re.IGNORECASE,
    )
    vpa_match = re.search(r"[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+", text)
    account_match = re.search(r"(?:account|acc|a/c|number)\s*[:\-#]?\s*([0-9]{4,18})", text, re.IGNORECASE)
    if direct_mule and not direct_mule.group(1).isalpha():
        account = f"ACC_MULE_{direct_mule.group(1).upper()}"
    elif vpa_match:
        account = vpa_match.group(0)
    elif account_match:
        account = f"ACC_{account_match.group(1)}"

    scam_category = "FINANCIAL_FRAUD"
    for category, keywords in SCAM_RULES:
        if any(keyword in lower_text for keyword in keywords):
            scam_category = category
            break

    city = next((name for name in CITY_COORDINATES if re.search(r"\b" + name + r"\b", lower_text)), None)
    latitude, longitude = CITY_COORDINATES[city] if city else (None, None)

    return {
        "english_transcript": text,
        "stolen_amount_inr": amount,
        "transfer_mode": transfer_mode,
        "initial_mule_account": account,
        "victim_lat": latitude,
        "victim_lon": longitude,
        "scam_category": scam_category,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    payload = json.load(sys.stdin)
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")
    if len(text) > 8000:
        raise ValueError("text exceeds the 8000-character limit")
    json.dump(parse_complaint_from_text(text), sys.stdout)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
