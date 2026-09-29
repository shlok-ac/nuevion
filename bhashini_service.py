import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / "backend" / ".env")

BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
SUPPORTED_LANGUAGES = {
    "as", "bn", "en", "gu", "hi", "kn", "ml", "mr", "or", "pa", "ta", "te", "ur"
}


class BhashiniProcessingError(Exception):
    def __init__(self, stage, message):
        super().__init__(message)
        self.stage = stage


def _required_environment():
    names = (
        "BHASHINI_USER_ID",
        "BHASHINI_API_KEY",
        "BHASHINI_INFERENCE_KEY",
        "BHASHINI_PIPELINE_ID",
    )
    missing = [name for name in names if not os.environ.get(name, "").strip()]
    if missing:
        raise BhashiniProcessingError(
            "configuration",
            "Missing required environment variables: " + ", ".join(missing),
        )
    return {name: os.environ[name].strip() for name in names}


def _normalize_audio(input_path):
    ffmpeg = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg")
    if not ffmpeg or not Path(ffmpeg).is_file():
        raise BhashiniProcessingError(
            "audio_normalization",
            "FFmpeg is required to normalize audio for BHASHINI.",
        )

    output = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    output_path = output.name
    output.close()
    try:
        subprocess.run(
            [
                ffmpeg, "-y", "-i", input_path,
                "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
                output_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=45,
        )
        if not Path(output_path).is_file() or Path(output_path).stat().st_size == 0:
            raise BhashiniProcessingError(
                "audio_normalization",
                "Audio conversion produced no usable output.",
            )
        return output_path
    except BhashiniProcessingError:
        Path(output_path).unlink(missing_ok=True)
        raise
    except (OSError, subprocess.SubprocessError) as error:
        Path(output_path).unlink(missing_ok=True)
        raise BhashiniProcessingError(
            "audio_normalization",
            "Audio decoding failed.",
        ) from error


def _load_whisper_model(stage):
    try:
        import whisper

        return whisper.load_model("base")
    except Exception as error:
        raise BhashiniProcessingError(
            stage,
            "OpenAI Whisper is unavailable for language detection or fallback.",
        ) from error


def detect_spoken_language(audio_path):
    model = _load_whisper_model("language_detection")
    try:
        import whisper

        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)
        _, probabilities = model.detect_language(mel)
        detected = max(probabilities, key=probabilities.get)
        if detected not in SUPPORTED_LANGUAGES:
            raise BhashiniProcessingError(
                "language_detection",
                "The detected language is not supported by this Bhashini pipeline.",
            )
        return detected
    except BhashiniProcessingError:
        raise
    except Exception as error:
        raise BhashiniProcessingError(
            "language_detection",
            "Automatic language detection failed.",
        ) from error


def call_bhashini_pipeline_result(audio_file_path, source_lang):
    config = _required_environment()
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
        "pipelineRequestConfig": {"pipelineId": config["BHASHINI_PIPELINE_ID"]},
    }
    config_headers = {
        "userID": config["BHASHINI_USER_ID"],
        "ulcaApiKey": config["BHASHINI_API_KEY"],
        "Content-Type": "application/json",
    }

    try:
        config_response = requests.post(
            BHASHINI_CONFIG_URL,
            json=config_payload,
            headers=config_headers,
            timeout=15,
        )
        config_response.raise_for_status()
        config_data = config_response.json()
        endpoint = config_data["pipelineInferenceAPIEndPoint"]
        callback_url = endpoint["callbackUrl"]
        inference_key = endpoint.get("inferenceApiKey", {}).get("value") or config[
            "BHASHINI_INFERENCE_KEY"
        ]
        service_ids = [
            config_data["pipelineResponseConfig"][index]["config"][0]["serviceId"]
            for index in range(2)
        ]

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
        response = requests.post(
            callback_url,
            json=compute_payload,
            headers={"Authorization": inference_key, "Content-Type": "application/json"},
            timeout=45,
        )
        response.raise_for_status()
        outputs = response.json()["pipelineResponse"]
        transcript = (
            outputs[0]["output"][0].get("source")
            or outputs[0]["output"][0].get("text")
            or outputs[0]["output"][0].get("target")
        )
        translated_text = outputs[1]["output"][0].get("target")
        if not transcript or not translated_text:
            raise BhashiniProcessingError(
                "bhashini_response",
                "Bhashini returned an incomplete ASR or translation result.",
            )
        return {
            "transcript": transcript.strip(),
            "translated_text": translated_text.strip(),
            "detected_language": source_lang,
            "source_language": source_lang,
            "language_source": "user_selected",
            "engine": "bhashini",
        }
    except BhashiniProcessingError:
        raise
    except (KeyError, IndexError, TypeError, ValueError, requests.RequestException) as error:
        raise BhashiniProcessingError(
            "bhashini_pipeline",
            "Bhashini ASR or translation request failed.",
        ) from error


def _whisper_result(audio_path, language):
    model = _load_whisper_model("whisper_fallback")
    try:
        transcript = model.transcribe(
            audio_path,
            task="transcribe",
            language=language,
            fp16=False,
        )["text"].strip()
        translated_text = model.transcribe(
            audio_path,
            task="translate",
            language=language,
            fp16=False,
        )["text"].strip()
        if not transcript or not translated_text:
            raise BhashiniProcessingError(
                "whisper_fallback",
                "Whisper returned no transcript or translation.",
            )
        return {
            "transcript": transcript,
            "translated_text": translated_text,
            "detected_language": language,
            "source_language": language,
            "language_source": "whisper_fallback",
            "engine": "whisper",
        }
    except BhashiniProcessingError:
        raise
    except Exception as error:
        raise BhashiniProcessingError(
            "whisper_fallback",
            "Whisper could not transcribe and translate the uploaded audio.",
        ) from error


def process_bhashini_audio(audio_path, source_language="auto"):
    language_source = "user_selected"
    language = source_language
    if source_language in ("auto", None, "", "undefined"):
        language = detect_spoken_language(audio_path)
        language_source = "whisper_audio_detection"

    if language not in SUPPORTED_LANGUAGES:
        raise BhashiniProcessingError(
            "language_selection",
            "The selected source language is not supported.",
        )

    if language == "en":
        try:
            result = _whisper_result(audio_path, language)
            result["language_source"] = language_source
            return result
        except BhashiniProcessingError:
            pass

    try:
        result = call_bhashini_pipeline_result(audio_path, language)
        result["language_source"] = language_source
        return result
    except BhashiniProcessingError as bhashini_error:
        try:
            return _whisper_result(audio_path, language)
        except BhashiniProcessingError as whisper_error:
            raise BhashiniProcessingError(
                whisper_error.stage,
                "Bhashini was unavailable and the Whisper fallback could not process audio.",
            ) from bhashini_error


def transcribe_audio_result(audio_path, source_lang="auto"):
    return process_bhashini_audio(audio_path, source_language=source_lang)


def transcribe_audio(audio_path, source_lang="auto"):
    return transcribe_audio_result(audio_path, source_lang)["translated_text"]


def main():
    payload = json.load(sys.stdin)
    result = process_bhashini_audio(
        payload["audio_path"],
        payload.get("source_language", "auto"),
    )
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except BhashiniProcessingError as error:
        print(f"BhashiniProcessingError stage={error.stage}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("BhashiniProcessingError stage=audio_processing", file=sys.stderr)
        sys.exit(1)
