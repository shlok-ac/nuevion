import json
import re
import sys
from datetime import datetime, timezone, timedelta

# Import transcription engine from Step 2
from ml.bhashini_service import transcribe_audio

# ==================== VOCABULARIES & MAPS ====================
WORD_TO_DIGIT_STR = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
    "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
    "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
    "eighty": "80", "ninety": "90",
    "oh": "0", "oto": "2", "sex": "6", "son": "1", "to": "2", "too": "2",
    "tree": "3", "for": "4", "ate": "8", "mine": "9"
}

WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
}

ORDINAL_MAP = {
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
    "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
    "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14,
    "fifteenth": 15, "sixteenth": 16, "seventeenth": 17, "eighteenth": 18,
    "nineteenth": 19, "twentieth": 20, "twenty-first": 21, "twenty first": 21,
    "twenty-second": 22, "twenty second": 22, "twenty-third": 23, "twenty third": 23,
    "twenty-fourth": 24, "twenty fourth": 24, "twenty-fifth": 25, "twenty fifth": 25,
    "twenty-sixth": 26, "twenty sixth": 26, "twenty-seventh": 27, "twenty seventh": 27,
    "twenty-eighth": 28, "twenty eighth": 28, "twenty-ninth": 29, "twenty ninth": 29,
    "thirtieth": 30, "thirty-first": 31, "thirty first": 31
}

CITY_COORDINATES = {
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
    "chandigarh": (30.7333, 76.7794),
    "amritsar": (31.6340, 74.8723),
    "ludhiana": (30.9010, 75.8573),
    "jalandhar": (31.3260, 75.5762),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714),
    "kolkata": (22.5726, 88.3639),
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

# ==================== PARSER HELPERS ====================
def parse_spoken_date(text: str, fallback_now: datetime) -> str:
    """Extracts spoken calendar dates or returns 'Not Specified'."""
    t_lower = text.lower()
    date_match = re.search(
        r'\b(?:on\s+(?:the\s+)?)?([a-z\-]+|\d{1,2}(?:st|nd|rd|th)?)\s+(?:of\s+)?'
        r'(january|february|march|april|may|june|july|august|september|october|november|december)'
        r'(?:,?\s*(?:twenty[- ](?:four|five|six|seven|eight|nine)|\d{2,4}))?\b',
        t_lower
    )
    if date_match:
        day_raw = date_match.group(1)
        month_raw = date_match.group(2)
        day = ORDINAL_MAP.get(day_raw, None)
        if not day:
            clean_d = re.sub(r'\D', '', day_raw)
            day = int(clean_d) if clean_d else fallback_now.day
        month = MONTH_MAP.get(month_raw, fallback_now.month)
        year = fallback_now.year
        return f"{year:04d}-{month:02d}-{day:02d}"

    if "yesterday" in t_lower:
        return (fallback_now - timedelta(days=1)).strftime("%Y-%m-%d")
    if "today" in t_lower:
        return fallback_now.strftime("%Y-%m-%d")

    return "Not Specified"


def parse_spoken_time(text: str) -> str:
    """Extracts spoken time (12-hr AM/PM) or returns 'Not Specified'."""
    t_lower = text.lower()
    digit_time = re.search(r'\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b', t_lower)
    if digit_time:
        return digit_time.group(1).upper()

    word_num = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
        'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12
    }
    m = re.search(
        r'\b(?:at|around)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\s*'
        r'(?:o\'?clock)?\s*(in the morning|in the afternoon|in the evening|at night|am|pm)?\b',
        t_lower
    )
    if m:
        hr_raw = m.group(1)
        hr = word_num.get(hr_raw, int(hr_raw) if hr_raw.isdigit() else 1)
        tod = m.group(2) or ""
        meridiem = "PM" if any(w in tod for w in ["afternoon", "evening", "night", "pm"]) else "AM"
        if hr == 12 and "afternoon" in tod:
            meridiem = "PM"
        return f"{hr:02d}:00 {meridiem}"

    return "Not Specified"


def parse_spoken_account_number(account_text: str, stolen_amount: float) -> str:
    """Extracts spoken destination account numbers across Indian numeral formats."""
    clean_text = re.split(r'\b(?:please|help|kindly|incident|sir|madam|from)\b', account_text.lower())[0]
    tokens = re.sub(r'[^a-z0-9\s]', '', clean_text).replace(" and ", " ").split()

    raw_digits_only = "".join([t for t in tokens if t.isdigit()])
    if len(raw_digits_only) >= 8 and (not stolen_amount or int(raw_digits_only) != int(stolen_amount)):
        return f"ACC_{raw_digits_only}"

    units = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
        'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
        'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
        'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
    }

    def parse_sub_crore(words):
        tot = 0
        cur = 0
        for w in words:
            if w in units:
                cur += units[w]
            elif w == 'hundred':
                cur *= 100
            elif w in ['thousand', 'hazar']:
                cur *= 1000
                tot += cur
                cur = 0
            elif w in ['lakh', 'lac']:
                cur *= 100000
                tot += cur
                cur = 0
            elif w.isdigit():
                cur += int(w)
        tot += cur
        return tot

    if 'crore' in tokens:
        crore_idx = tokens.index('crore')
        crore_part = parse_sub_crore(tokens[:crore_idx])
        sub_crore_part = parse_sub_crore(tokens[crore_idx+1:])
        full_val = crore_part * 10000000 + sub_crore_part
        if full_val > 0:
            return f"ACC_{full_val}"
    else:
        full_val = parse_sub_crore(tokens)
        if full_val > 0:
            return f"ACC_{full_val}"

    return "Not Specified"


# ==================== MAIN COMPLAINT PARSER ====================
def parse_complaint_from_text(transcript: str) -> dict:
    text = transcript.strip()
    clean_t = text.replace(",", "")
    t_lower = clean_t.lower()
    now = datetime.now(timezone.utc)

    # Split amount from account phrases so large account numbers aren't treated as stolen cash
    parts = re.split(r'\b(?:to\s+account|into\s+account|account\s+number|acc\s+no|mule)\b', t_lower, maxsplit=1)
    amount_section = parts[0]
    account_section = parts[1] if len(parts) > 1 else ""

    # 1. Stolen Amount (handles self-corrections e.g. "not X, no Y" and additions)
    pattern = re.compile(
        r'\b(?:rs\.?|inr|rupees)?\s*'
        r'(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|\d+)\s*'
        r'(lakh|lac|thousand|hazar)\b|'
        r'(?:rs\.?|inr|rupees)\s*(\d{3,7})|(\d{3,7})\s*(?:rs\.?|inr|rupees)',
        re.I
    )

    matches = []
    for m in pattern.finditer(amount_section):
        val = 0
        if m.group(1) and m.group(2):
            raw = m.group(1).lower()
            b = int(raw) if raw.isdigit() else WORD_TO_NUM.get(raw, 0)
            u = m.group(2).lower()
            val = b * (100000 if ("lakh" in u or "lac" in u) else 1000)
        else:
            raw_d = m.group(3) or m.group(4)
            if raw_d:
                val = int(raw_d)
        if val > 0:
            matches.append((val, m.start(), m.end()))

    amount = "Not Specified"
    if matches:
        if len(matches) == 1:
            amount = matches[0][0]
        else:
            last_match = matches[-1]
            prior_context = amount_section[max(0, last_match[1]-20):last_match[1]]
            if any(w in prior_context for w in ["no ", "not ", "actually", "sorry", "yes "]):
                amount = last_match[0]
            elif " and " in amount_section and not any(w in amount_section for w in ["or", "not", "no"]):
                amount = sum(m[0] for m in matches)
            else:
                amount = matches[-1][0]

    # 2. Transfer Mode
    transfer_mode = "Not Specified"
    if any(term in t_lower for term in ("credit card", "debit card", " card", "card limit", "cvv", "otp")):
        transfer_mode = "CARD_PAYMENT"
    elif any(term in t_lower for term in ("net banking", "internet banking", "bank transfer")):
        transfer_mode = "NET_BANKING"
    else:
        for mode in ("NEFT", "IMPS", "RTGS", "UPI"):
            if re.search(r"\b" + mode + r"\b", text, re.IGNORECASE):
                transfer_mode = mode
                break

    # 3. Destination Mule Account
    account = "Not Specified"
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
    elif account_section:
        spoken_acc = parse_spoken_account_number(account_section, amount if isinstance(amount, (int, float)) else 0)
        if spoken_acc != "Not Specified":
            account = spoken_acc

    # 4. Scam Category
    scam_category = "FINANCIAL_FRAUD"
    for category, keywords in SCAM_RULES:
        if any(keyword in t_lower for keyword in keywords):
            scam_category = category
            break

    # 5. Incident Date, Time & Coordinates (strict "Not Specified" when absent)
    incident_date = parse_spoken_date(text, now)
    incident_time = parse_spoken_time(text)

    city_found = next((name for name in CITY_COORDINATES if re.search(r"\b" + name + r"\b", t_lower)), None)
    if city_found:
        incident_place = city_found.title()
        latitude = round(CITY_COORDINATES[city_found][0], 6)
        longitude = round(CITY_COORDINATES[city_found][1], 6)
    else:
        incident_place = "Not Specified"
        latitude = "Not Specified"
        longitude = "Not Specified"

    return {
        "english_transcript": text,
        "stolen_amount_inr": amount,
        "transfer_mode": transfer_mode,
        "initial_mule_account": account,
        "incident_date": incident_date,
        "incident_time": incident_time,
        "incident_place": incident_place,
        "victim_lat": latitude,
        "victim_lon": longitude,
        "scam_category": scam_category,
        "processed_at": now.isoformat(),
    }


# ==================== VOICE TRIAGE BRIDGE (STEP 4) ====================
def process_voice_call(audio_path: str, source_lang: str = "hi") -> dict:
    """Takes incoming call audio, transcribes via Bhashini, and extracts complaint fields."""
    transcript = transcribe_audio(audio_path, source_lang=source_lang)
    return parse_complaint_from_text(transcript)


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
