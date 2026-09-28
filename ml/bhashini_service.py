import os
import base64
import requests
import subprocess
import tempfile

# ==================== CREDENTIALS ====================
BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "bd3428a06b1c44a8b38e5abc0b195c3f")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "14821d876a-1df7-47c0-9208-1e52b428e4e7")
BHASHINI_INFERENCE_KEY = os.getenv("BHASHINI_INFERENCE_KEY", "VPLb6mzEQ0Kz4eCM0vklRvtp9lPR0o5dBfYUe_N9vuu-7Za40AaJZ7bjbuyeDwGi")
BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
# ======================================================

def convert_to_bhashini_wav(input_path: str) -> str:
    """Converts audio to standard 16kHz mono WAV required by Bhashini."""
    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-acodec", "pcm_s16le",
        temp_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return temp_wav

def bhashini_transcribe(audio_file_path: str, source_lang: str = "hi") -> str:
    """Invokes Bhashini ULCA ASR + Translation pipeline to output English."""
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

    compute_headers = {
        "Authorization": inference_key,
        "Content-Type": "application/json"
    }

    compute_payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_lang},
                    "serviceId": asr_id,
                    "audioFormat": "wav",
                    "samplingRate": 16000
                }
            },
            {
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source_lang, "targetLanguage": "en"},
                    "serviceId": trans_id
                }
            }
        ],
        "inputData": {"audio": [{"audioContent": audio_b64}]}
    }

    comp_resp = requests.post(callback_url, json=compute_payload, headers=compute_headers, timeout=25)
    comp_resp.raise_for_status()
    resp_json = comp_resp.json()
    return resp_json["pipelineResponse"][-1]["output"][0]["target"]

def transcribe_audio(audio_path: str, source_lang: str = "hi") -> str:
    """Master transcription function with local Whisper fallback."""
    try:
        return bhashini_transcribe(audio_path, source_lang=source_lang)
    except Exception as e:
        print(f"[Warning] Bhashini failed ({e}), falling back to local Whisper...")
        import whisper
        model = whisper.load_model("base")
        res = model.transcribe(audio_path, task="translate", fp16=False)
        return res["text"].strip()
