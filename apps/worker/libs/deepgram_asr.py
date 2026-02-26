"""
Deepgram Nova-3 ASR Module

Uses Deepgram's REST API for high-quality transcription with built-in
speaker diarization, smart formatting, and medical vocabulary support.

API: https://api.deepgram.com/v1/listen
Model: nova-3
"""

import logging
import os
import subprocess
import tempfile
from typing import List, Dict, Any, Optional

import requests

logger = logging.getLogger(__name__)

DEEPGRAM_API = "https://api.deepgram.com/v1/listen"


def transcribe_with_deepgram(
    audio_path: str,
    api_key: str,
    language: Optional[str] = "en",
    diarize: bool = True,
) -> List[Dict[str, Any]]:
    """
    Transcribe audio using Deepgram Nova-3.

    Returns list of segments: [{start_ms, end_ms, text, confidence, speaker}]
    """
    file_size = os.path.getsize(audio_path)
    file_size_mb = file_size / (1024 * 1024)
    logger.info(f"Deepgram transcription: {audio_path} ({file_size_mb:.1f}MB)")

    upload_path = audio_path
    cleanup = False

    if file_size_mb > 50 and not audio_path.endswith(".mp3"):
        mp3_path = tempfile.mktemp(suffix=".mp3")
        try:
            subprocess.run(
                [
                    "ffmpeg", "-i", audio_path,
                    "-b:a", "64k", "-ar", "16000", "-ac", "1",
                    "-y", mp3_path,
                ],
                capture_output=True, text=True, timeout=120,
            )
            if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
                upload_path = mp3_path
                cleanup = True
        except Exception as e:
            logger.warning(f"MP3 conversion failed: {e}")

    try:
        content_type = _get_content_type(upload_path)

        params = {
            "model": "nova-3",
            "smart_format": "true",
            "punctuate": "true",
            "paragraphs": "true",
            "utterances": "true",
            "utt_split": "0.8",
        }
        if diarize:
            params["diarize"] = "true"
        if language:
            params["language"] = language

        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": content_type,
        }

        with open(upload_path, "rb") as f:
            resp = requests.post(
                DEEPGRAM_API,
                params=params,
                headers=headers,
                data=f,
                timeout=300,
            )

        if resp.status_code != 200:
            logger.error(f"Deepgram API error {resp.status_code}: {resp.text[:500]}")
            raise ValueError(f"Deepgram API error: {resp.status_code}")

        result = resp.json()
        return _parse_deepgram_response(result, diarize)

    finally:
        if cleanup and os.path.exists(upload_path):
            os.remove(upload_path)


def _get_content_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".flac": "audio/flac",
    }.get(ext, "audio/wav")


def _parse_deepgram_response(
    result: dict, diarize: bool
) -> List[Dict[str, Any]]:
    """Parse Deepgram response into our standard segment format."""
    segments: List[Dict[str, Any]] = []

    utterances = result.get("results", {}).get("utterances", [])
    if utterances:
        for utt in utterances:
            seg = {
                "start_ms": int(utt["start"] * 1000),
                "end_ms": int(utt["end"] * 1000),
                "text": utt["transcript"].strip(),
                "confidence": utt.get("confidence", 0.0),
            }
            if diarize and "speaker" in utt:
                seg["speaker"] = f"SPEAKER_{utt['speaker']}"
            segments.append(seg)
        logger.info(f"Deepgram: {len(segments)} utterances parsed")
        return segments

    channels = result.get("results", {}).get("channels", [])
    if not channels:
        logger.warning("No channels in Deepgram response")
        return []

    alternatives = channels[0].get("alternatives", [])
    if not alternatives:
        return []

    words = alternatives[0].get("words", [])
    if not words:
        full_text = alternatives[0].get("transcript", "")
        if full_text:
            segments.append({
                "start_ms": 0,
                "end_ms": int(result.get("metadata", {}).get("duration", 0) * 1000),
                "text": full_text.strip(),
                "confidence": alternatives[0].get("confidence", 0.0),
            })
        return segments

    current_speaker = words[0].get("speaker", 0) if diarize else None
    chunk_start = words[0]["start"]
    chunk_words: list[str] = []

    for w in words:
        speaker = w.get("speaker", 0) if diarize else None

        if diarize and speaker != current_speaker and chunk_words:
            seg = {
                "start_ms": int(chunk_start * 1000),
                "end_ms": int(w["start"] * 1000),
                "text": " ".join(chunk_words).strip(),
                "confidence": 0.0,
            }
            if current_speaker is not None:
                seg["speaker"] = f"SPEAKER_{current_speaker}"
            segments.append(seg)
            chunk_words = []
            chunk_start = w["start"]
            current_speaker = speaker

        chunk_words.append(w.get("punctuated_word", w["word"]))

    if chunk_words:
        seg = {
            "start_ms": int(chunk_start * 1000),
            "end_ms": int(words[-1]["end"] * 1000),
            "text": " ".join(chunk_words).strip(),
            "confidence": 0.0,
        }
        if current_speaker is not None:
            seg["speaker"] = f"SPEAKER_{current_speaker}"
        segments.append(seg)

    logger.info(f"Deepgram: {len(segments)} segments from word-level data")
    return segments
