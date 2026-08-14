"""API tests for POST /live/transcribe."""

import io
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from app.services.live_audio import wrap_pcm_in_wav


def _silent_wav(seconds: float = 1.5) -> bytes:
    pcm = b"\x00\x00" * int(16000 * seconds)
    return wrap_pcm_in_wav(pcm)


def test_live_transcribe_requires_auth(client):
    wav = _silent_wav()
    resp = client.post(
        "/live/transcribe",
        files={"file": ("chunk.wav", io.BytesIO(wav), "audio/wav")},
    )
    assert resp.status_code == 401


def test_live_transcribe_rejects_empty_file(client, auth_headers):
    resp = client.post(
        "/live/transcribe",
        headers=auth_headers,
        files={"file": ("chunk.wav", io.BytesIO(b""), "audio/wav")},
    )
    assert resp.status_code == 400


def test_live_transcribe_deepgram_success(client, auth_headers, monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "")

    payload = {
        "results": {
            "channels": [
                {
                    "alternatives": [
                        {
                            "transcript": "needs help with bathing",
                            "confidence": 0.92,
                            "words": [
                                {
                                    "word": "needs",
                                    "punctuated_word": "needs",
                                    "start": 0.1,
                                    "end": 0.3,
                                    "confidence": 0.9,
                                    "speaker": 0,
                                },
                                {
                                    "word": "bathing",
                                    "punctuated_word": "bathing",
                                    "start": 0.4,
                                    "end": 0.8,
                                    "confidence": 0.95,
                                    "speaker": 0,
                                },
                            ],
                        }
                    ]
                }
            ]
        },
        "metadata": {"duration": 1.5},
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = payload

    with patch("app.routers.live_transcribe.requests.post", return_value=mock_resp) as post:
        resp = client.post(
            "/live/transcribe?language=en&diarize=true",
            headers=auth_headers,
            files={"file": ("chunk.wav", io.BytesIO(_silent_wav()), "audio/wav")},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["transcript"] == "needs help with bathing"
    assert body["provider"] == "deepgram"
    assert len(body["words"]) == 2
    assert body["words"][1]["word"] == "bathing"
    assert body["words"][1]["speaker"] == 0
    assert post.call_count == 1
    sent_headers = post.call_args.kwargs.get("headers") or post.call_args[1].get("headers")
    assert sent_headers["Content-Type"] == "audio/wav"


def test_live_transcribe_falls_back_to_whisper(client, auth_headers, monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")

    dg = MagicMock()
    dg.status_code = 503
    dg.text = "unavailable"

    whisper = MagicMock()
    whisper.text = "medication reminders"
    whisper.words = []
    whisper.duration = 1.2

    class _FakeOpenAI:
        def __init__(self, api_key):
            self.audio = MagicMock()
            self.audio.transcriptions.create.return_value = whisper

    with patch("app.routers.live_transcribe.requests.post", return_value=dg), \
         patch("openai.OpenAI", _FakeOpenAI):
        resp = client.post(
            "/live/transcribe",
            headers=auth_headers,
            files={"file": ("chunk.wav", io.BytesIO(_silent_wav()), "audio/wav")},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "medication" in body["transcript"]
    assert body["provider"] == "whisper"


def test_live_transcribe_deepgram_error_without_whisper(client, auth_headers, monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "")

    dg = MagicMock()
    dg.status_code = 503
    dg.text = "unavailable"

    with patch("app.routers.live_transcribe.requests.post", return_value=dg):
        resp = client.post(
            "/live/transcribe",
            headers=auth_headers,
            files={"file": ("chunk.wav", io.BytesIO(_silent_wav()), "audio/wav")},
        )

    assert resp.status_code == 502
