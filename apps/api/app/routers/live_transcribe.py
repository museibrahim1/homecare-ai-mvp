"""
Live Transcription Endpoint

Provides a REST endpoint for streaming-style transcription.
The mobile app sends audio chunks, and gets back partial transcripts
in real-time using Deepgram Nova-3 (primary) with OpenAI Whisper as fallback.
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from typing import List, Optional

import requests

from app.core.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

DEEPGRAM_API = "https://api.deepgram.com/v1/listen"


class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float
    confidence: float
    speaker: Optional[int] = None


class LiveTranscriptResponse(BaseModel):
    transcript: str
    words: List[TranscriptWord]
    confidence: float
    duration: float
    provider: str


@router.post("/transcribe", response_model=LiveTranscriptResponse)
async def live_transcribe(
    file: UploadFile = File(...),
    language: str = Query("en", description="Language code"),
    diarize: bool = Query(False, description="Enable speaker diarization"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe an audio chunk in real-time.

    Send audio data (any format) and get back the transcript immediately.
    Optimized for short clips (5-60 seconds) during live recording.
    """
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio chunk too large (max 25MB)")

    content_type = file.content_type or "audio/wav"

    if deepgram_key:
        return _transcribe_deepgram(content, content_type, deepgram_key, language, diarize)
    elif openai_key:
        return _transcribe_openai(content, file.filename or "audio.wav", openai_key, language)
    else:
        raise HTTPException(status_code=503, detail="No transcription service configured")


def _transcribe_deepgram(
    audio_data: bytes,
    content_type: str,
    api_key: str,
    language: str,
    diarize: bool,
) -> LiveTranscriptResponse:
    params = {
        "model": "nova-3",
        "smart_format": "true",
        "punctuate": "true",
        "utterances": "true",
    }
    if language:
        params["language"] = language
    if diarize:
        params["diarize"] = "true"

    resp = requests.post(
        DEEPGRAM_API,
        params=params,
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": content_type,
        },
        data=audio_data,
        timeout=30,
    )

    if resp.status_code != 200:
        logger.error(f"Deepgram error {resp.status_code}: {resp.text[:300]}")
        raise HTTPException(status_code=502, detail="Transcription service error")

    data = resp.json()
    channels = data.get("results", {}).get("channels", [])
    if not channels:
        return LiveTranscriptResponse(
            transcript="", words=[], confidence=0, duration=0, provider="deepgram"
        )

    alt = channels[0].get("alternatives", [{}])[0]
    transcript = alt.get("transcript", "")
    confidence = alt.get("confidence", 0.0)
    duration = data.get("metadata", {}).get("duration", 0.0)

    words = []
    for w in alt.get("words", []):
        words.append(TranscriptWord(
            word=w.get("punctuated_word", w["word"]),
            start=w["start"],
            end=w["end"],
            confidence=w.get("confidence", 0.0),
            speaker=w.get("speaker"),
        ))

    return LiveTranscriptResponse(
        transcript=transcript,
        words=words,
        confidence=confidence,
        duration=duration,
        provider="deepgram",
    )


def _transcribe_openai(
    audio_data: bytes,
    filename: str,
    api_key: str,
    language: str,
) -> LiveTranscriptResponse:
    import openai

    client = openai.OpenAI(api_key=api_key)

    import tempfile, os
    ext = os.path.splitext(filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["word"],
                language=language if language != "en" else None,
            )

        transcript = response.text or ""
        words = []
        for w in getattr(response, "words", []) or []:
            words.append(TranscriptWord(
                word=w.word if hasattr(w, "word") else str(w),
                start=getattr(w, "start", 0.0),
                end=getattr(w, "end", 0.0),
                confidence=0.9,
            ))

        duration = getattr(response, "duration", 0.0) or 0.0

        return LiveTranscriptResponse(
            transcript=transcript,
            words=words,
            confidence=0.9,
            duration=duration,
            provider="whisper",
        )
    finally:
        os.remove(tmp_path)
