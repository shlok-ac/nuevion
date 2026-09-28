# nlp_engine.py
import requests
import base64
import os
import re
import subprocess
import tempfile
from datetime import datetime, timedelta

BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "bd3428a06b1c44a8b38e5abc0b195c3f")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "14821d876a-1df7-47c0-9208-1e52b428e4e7")
BHASHINI_INFERENCE_KEY = os.getenv("BHASHINI_INFERENCE_KEY", "VPLb6mzEQ0Kz4eCM0vklRvtp9lPR0o5dBfYUe_N9vuu-7Za40AaJZ7bjbuyeDwGi")
BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    "at": 80, "ate": 80
}

MONTH_MAP = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
}

ORDINAL_MAP = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14,
    'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18,
    'nineteenth': 19, 'twentieth': 20, 'twenty-first': 21, 'twenty first': 21,
    'twenty-second': 22, 'twenty second': 22, 'twenty-third': 23, 'twenty third': 23,
    'twenty-fourth': 24, 'twenty fourth': 24, 'twenty-fifth': 25, 'twenty fifth': 25,
    'twenty-sixth': 26, 'twenty sixth': 26, 'twenty-seventh': 27, 'twenty seventh': 27,
    'twenty-eighth': 28, 'twenty eighth': 28, 'twenty-ninth': 29, 'twenty ninth': 29,
    'thirtieth': 30, 'thirty-first': 31, 'thirty first': 31
}

CITY_COORDINATES = {
    "pune": (18.5204, 73.8567), "mumbai": (19.0760, 72.8777), "delhi": (28.6139, 77.2090),
    "chandigarh": (30.7333, 76.7794), "amritsar": (31.6340, 74.8723), "ludhiana": (30.9010, 75.8573),
    "jalandhar": (31.3260, 75.5762), "bengaluru": (12.9716, 77.5946), "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714), "kolkata": (22.5726, 88.3639)
}

def convert_to_bhashini_wav(input_path: str) -> str:
    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le", temp_wav]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return temp_wav

def bhashini_transcribe(audio_file_path: str, source_lang: str = "hi") -> str:
    norm_wav = convert_to_bhashini_wav(audio_file_path)
    try:
        with open(norm_wav, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")
    finally:
        if os.path.exists(norm_wav):
            os.remove(norm_wav)

    config_headers = {
        "userID": BHASHINI_USER_ID,
        "ulcaApiKey": BHASHINI_API_KEY,
        "Content-Type": "application/json"
    }
    config_payload = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}}},
            {"taskType": "translation", "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": "en"}}}
        ],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"}
    }

    cfg_resp = requests.post(BHASHINI_CONFIG_URL, json=config_payload, headers=config_headers, timeout=15)
    cfg_resp.raise_for_status()
    cfg_data = cfg_resp.json()

    callback_url = cfg_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
    inference_key = cfg_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"] or BHASHINI_INFERENCE_KEY
    asr_id = cfg_data["pipelineResponseConfig"][0]["config"][0]["serviceId"]
    trans_id = cfg_data["pipelineResponseConfig"][1]["config"][0]["serviceId"]

    compute_headers = {"Authorization": inference_key, "Content-Type": "application/json"}
    compute_payload = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}, "serviceId": asr_id, "audioFormat": "wav", "samplingRate": 16000}},
            {"taskType": "translation", "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": "en"}, "serviceId": trans_id}}
        ],
        "inputData": {"audio": [{"audioContent": audio_b64}]}
    }

    comp_resp = requests.post(callback_url, json=compute_payload, headers=compute_headers, timeout=25)
    comp_resp.raise_for_status()
    return comp_resp.json()["pipelineResponse"][-1]["output"][0]["target"]

def parse_complaint_from_text(transcript: str) -> dict:
    clean_t = transcript.replace(",", "")
    t_lower = clean_t.lower()
    now = datetime.now()

    acc_split = re.split(r'\b(?:to\s+account|into\s+account|account\s+number|acc\s+no|mule)\b', t_lower, maxsplit=1)
    amount_section = acc_split[0]
    account_section = acc_split[1] if len(acc_split) > 1 else ""

    # Amount
    pattern = re.compile(
        r'\b(?:rs\.?|inr|rupees)?\s*'
        r'(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|at|ate|\d+)\s*'
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

    stolen_amount = "Not Specified"
    if matches:
        if len(matches) == 1:
            stolen_amount = matches[0][0]
        else:
            last_match = matches[-1]
            prior_context = amount_section[max(0, last_match[1]-25):last_match[1]]
            if any(w in prior_context for w in ["no ", "not ", "actually", "sorry", "yes "]):
                stolen_amount = last_match[0]
            elif " or " in amount_section:
                stolen_amount = matches[-1][0]
            elif " and " in amount_section and not any(w in amount_section for w in ["or", "not", "no"]):
                stolen_amount = sum(m[0] for m in matches)
            else:
                stolen_amount = matches[-1][0]

    # Transfer Mode
    transfer_mode = "Not Specified"
    if any(k in t_lower for k in ["credit card", "debit card", "card details", "atm card"]):
        transfer_mode = "CARD_PAYMENT"
    elif any(k in t_lower for k in ["net banking", "internet banking", "neft", "imps"]):
        transfer_mode = "NET_BANKING"
    elif any(k in t_lower for k in ["upi", "gpay", "phonepe", "paytm"]):
        transfer_mode = "UPI"

    # Mule Account
    mule_acc = "Not Specified"
    if account_section:
        phonetic_map = {"at": "8", "ate": "8", "oto": "2", "sex": "6", "son": "1", "tree": "3", "for": "4", "to": "2", "too": "2", "oh": "0", "zero": "0"}
        word_to_d = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9"}
        tokens = re.sub(r'[^a-z0-9\s]', '', re.split(r'\b(?:please|help|kindly|sir|madam|from)\b', account_section)[0]).split()
        
        digits = []
        for t in tokens:
            if t.isdigit(): digits.append(t)
            elif t in word_to_d: digits.append(word_to_d[t])
            elif t in phonetic_map: digits.append(phonetic_map[t])
        
        acc_str = "".join(digits)
        if len(acc_str) >= 4 and (not isinstance(stolen_amount, int) or int(acc_str) != stolen_amount):
            mule_acc = f"ACC_{acc_str}"

    # Date
    incident_date = "Not Specified"
    date_match = re.search(r'\b(?:on\s+(?:the\s+)?)?([a-z\-]+|\d{1,2}(?:st|nd|rd|th)?)\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b', t_lower)
    if date_match:
        d_raw = date_match.group(1)
        day = ORDINAL_MAP.get(d_raw, None) or (int(re.sub(r'\D', '', d_raw)) if re.sub(r'\D', '', d_raw) else 28)
        month = MONTH_MAP.get(date_match.group(2), 9)
        incident_date = f"2026-{month:02d}-{day:02d}"
    elif "today" in t_lower:
        incident_date = now.strftime("%Y-%m-%d")
    elif "yesterday" in t_lower:
        incident_date = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    # Time
    incident_time = "Not Specified"
    m_col = re.search(r'\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b', amount_section)
    if m_col:
        hr, mn = int(m_col.group(1)), int(m_col.group(2))
        tod = m_col.group(3) or ""
        meridiem = "AM" if "a" in tod else ("PM" if "p" in tod else ("PM" if hr == 12 or 1 <= hr <= 6 else "AM"))
        incident_time = f"{hr:02d}:{mn:02d} {meridiem}"
    else:
        word_time_num = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12}
        m_word = re.search(r'\b(?:at|around)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\s*(?:o\'?clock)?\s*(in the morning|in the afternoon|in the evening|at night|am|pm)\b', amount_section)
        if m_word:
            hr_val = m_word.group(1)
            hr = int(hr_val) if hr_val.isdigit() else word_time_num.get(hr_val, 1)
            tod = m_word.group(2)
            meridiem = "PM" if any(w in tod for w in ["afternoon", "evening", "night", "pm"]) else "AM"
            incident_time = f"{hr:02d}:00 {meridiem}"

    # Place & Geo
    incident_place = "Not Specified"
    victim_lat = "Not Specified"
    victim_lon = "Not Specified"
    for city, coords in CITY_COORDINATES.items():
        if re.search(r'\b' + city + r'\b', t_lower):
            incident_place = city.title()
            victim_lat = round(coords[0], 6)
            victim_lon = round(coords[1], 6)
            break

    # Category
    scam_category = "FINANCIAL_FRAUD"
    if any(k in t_lower for k in ["electricity", "power bill", "bijli", "water bill"]):
        scam_category = "UTILITY_BILL_FRAUD"
    elif transfer_mode == "CARD_PAYMENT":
        scam_category = "CREDIT_CARD_FRAUD"
    elif any(k in t_lower for k in ["digital arrest", "cbi", "police"]):
        scam_category = "DIGITAL_ARREST"

    return {
        "complaint_id": f"1930_2026_{now.strftime('%M%S')}",
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
        "incident_date": incident_date,
        "incident_time": incident_time,
        "incident_place": incident_place,
        "english_transcript": transcript,
        "stolen_amount_inr": stolen_amount,
        "transfer_mode": transfer_mode,
        "initial_mule_account": mule_acc,
        "victim_lat": victim_lat,
        "victim_lon": victim_lon,
        "scam_category": scam_category
    }

def process_call_audio(audio_path: str, source_lang: str = "hi") -> dict:
    try:
        english_transcript = bhashini_transcribe(audio_path, source_lang=source_lang)
    except Exception:
        import whisper
        model = whisper.load_model("base")
        res = model.transcribe(audio_path, task="translate", fp16=False)
        english_transcript = res["text"].strip()

    complaint_data = parse_complaint_from_text(english_transcript)
    if os.path.exists(audio_path):
        try: os.remove(audio_path)
        except Exception: pass
    return complaint_data
    
if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        lang = sys.argv[2] if len(sys.argv) > 2 else "hi"
        result = process_call_audio(audio_file, source_lang=lang)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No audio file provided"}))
