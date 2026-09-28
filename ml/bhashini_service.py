import base64
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import requests


BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
BHASHINI_PIPELINE_ID = "64392f96daac500b55c543cd"
SUPPORTED_LANGUAGES = {
    "as", "bn", "en", "gu", "hi", "kn", "ml", "mr", "or", "pa", "ta", "te", "ur"
}


class BhashiniProcessingError(Exception):
    def __init__(self, stage, message):
        super().__init__(message)
        self.stage = stage


def _normalize_audio(input_path):
    if not shutil.which("ffmpeg"):
        raise BhashiniProcessingError(
            "audio_normalization",
            "FFmpeg is required to normalize audio for BHASHINI."
        )

    output = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    output_path = output.name
    output.close()
    try:
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", input_path,
                    "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
                    output_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=45,
            )
        except (OSError, subprocess.SubprocessError) as error:
            raise BhashiniProcessingError(
                "audio_normalization",
                "Audio could not be decoded or converted to 16 kHz mono WAV."
            ) from error

        if not Path(output_path).is_file() or Path(output_path).stat().st_size == 0:
            raise BhashiniProcessingError(
                "audio_normalization",
                "Audio conversion produced no usable output."
            )
        return output_path
    except Exception:
        Path(output_path).unlink(missing_ok=True)
        raise


def convert_to_bhashini_wav(input_path):
    return _normalize_audio(input_path)


def detect_spoken_language(audio_path):
    try:
        import whisper
    except ImportError as error:
        raise BhashiniProcessingError(
            "language_detection",
            "Automatic language detection is unavailable; select the spoken language and retry."
        ) from error

    try:
        model = whisper.load_model("base")
        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)
        _, probabilities = model.detect_language(mel)
    except Exception as error:
        raise BhashiniProcessingError(
            "language_detection",
            "The spoken language could not be detected from this audio."
        ) from error

    language_codes = sorted(SUPPORTED_LANGUAGES)
    available = {code: probabilities[code] for code in language_codes if code in probabilities}
    if not available or max(available.values(), default=0) <= 0:
        raise BhashiniProcessingError(
            "language_detection",
            "No supported language could be detected from this audio."
        )
    language = max(available, key=available.get)
    if language not in SUPPORTED_LANGUAGES:
        raise BhashiniProcessingError(
            "language_detection",
            "The detected language is not supported by the configured BHASHINI pipeline."
        )
    return language


def call_bhashini_pipeline_result(audio_file_path, source_lang):
    user_id = os.environ.get("BHASHINI_USER_ID")
    api_key = os.environ.get("BHASHINI_API_KEY")
    if not user_id or not api_key:
        raise BhashiniProcessingError(
            "configuration",
            "BHASHINI_USER_ID and BHASHINI_API_KEY must be configured server-side."
        )
    if source_lang not in SUPPORTED_LANGUAGES:
        raise BhashiniProcessingError(
            "language_selection",
            "A supported BHASHINI source language is required."
        )

    normalized_path = _normalize_audio(audio_file_path)
    try:
        with open(normalized_path, "rb") as audio_file:
            audio_b64 = base64.b64encode(audio_file.read()).decode("utf-8")
    finally:
        Path(normalized_path).unlink(missing_ok=True)

    config_payload = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}}},
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": "en",
                    }
                },
            },
        ],
        "pipelineRequestConfig": {"pipelineId": BHASHINI_PIPELINE_ID},
    }
    config_headers = {
        "userID": user_id,
        "ulcaApiKey": api_key,
        "Content-Type": "application/json",
    }

    try:
        config_response = requests.post(
            BHASHINI_CONFIG_URL,
            json=config_payload,
            headers=config_headers,
            timeout=15,
        )
        if config_response.status_code != 200:
            raise BhashiniProcessingError(
                "bhashini_configuration",
                f"BHASHINI pipeline configuration failed with HTTP {config_response.status_code}."
            )
        config_data = config_response.json()
        endpoint = config_data["pipelineInferenceAPIEndPoint"]
        callback_url = endpoint["callbackUrl"]
        inference_key = (
            endpoint.get("inferenceApiKey", {}).get("value")
            or os.environ.get("BHASHINI_INFERENCE_KEY")
        )
        service_ids = [
            config_data["pipelineResponseConfig"][index]["config"][0]["serviceId"]
            for index in range(2)
        ]
    except BhashiniProcessingError:
        raise
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as error:
        raise BhashiniProcessingError(
            "bhashini_configuration",
            "BHASHINI pipeline configuration could not be retrieved or parsed."
        ) from error

    if not inference_key:
        raise BhashiniProcessingError(
            "configuration",
            "BHASHINI did not provide an inference key; configure BHASHINI_INFERENCE_KEY server-side."
        )

    compute_payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_lang},
                    "serviceId": service_ids[0],
                    "audioFormat": "wav",
                    "samplingRate": 16000,
                },
            },
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": "en",
                    },
                    "serviceId": service_ids[1],
                },
            },
        ],
        "inputData": {"audio": [{"audioContent": audio_b64}]},
    }
    try:
        response = requests.post(
            callback_url,
            json=compute_payload,
            headers={
                "Authorization": inference_key,
                "Content-Type": "application/json",
            },
            timeout=45,
        )
        if response.status_code != 200:
            raise BhashiniProcessingError(
                "bhashini_inference",
                f"BHASHINI inference failed with HTTP {response.status_code}."
            )
        payload = response.json()
        outputs = payload["pipelineResponse"]
        asr_output = outputs[0]["output"][0]
        translation_output = outputs[1]["output"][0]
        transcript = asr_output.get("source") or asr_output.get("text") or asr_output.get("target")
        translated_text = translation_output.get("target")
        if not isinstance(transcript, str) or not transcript.strip():
            raise BhashiniProcessingError(
                "transcription",
                "BHASHINI returned no source-language transcript."
            )
        if not isinstance(translated_text, str) or not translated_text.strip():
            raise BhashiniProcessingError(
                "translation",
                "BHASHINI returned no English translation."
            )
        return {
            "transcript": transcript.strip(),
            "translated_text": translated_text.strip(),
            "detected_language": source_lang,
        }
    except BhashiniProcessingError:
        raise
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as error:
        raise BhashiniProcessingError(
            "bhashini_inference",
            "BHASHINI inference response could not be retrieved or parsed."
        ) from error


def call_bhashini_pipeline(audio_file_path, source_lang="hi"):
    return call_bhashini_pipeline_result(audio_file_path, source_lang)["translated_text"]


def process_bhashini_audio(audio_path, source_language="hi"):
    language_source = "user_selected"
    language = source_language
    if source_language == "auto":
        language = detect_spoken_language(audio_path)
        language_source = "whisper_audio_detection"

    result = call_bhashini_pipeline_result(audio_path, language)
    result["language_source"] = language_source
    result["source_language"] = language
    if language_source == "user_selected":
        result["detected_language"] = None
    return result


def transcribe_audio_result(audio_path, source_lang="auto"):
    return process_bhashini_audio(audio_path, source_language=source_lang)


def transcribe_audio(audio_path, source_lang="hi"):
    return transcribe_audio_result(audio_path, source_lang)["translated_text"]
