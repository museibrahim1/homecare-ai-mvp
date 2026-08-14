#!/usr/bin/env python3
"""Local sandbox for live transcription.

Generates a known spoken phrase, chunks it the way the iOS app does, and
sends those chunks to Deepgram (and optionally the local API).

Usage:
  python3 scripts/sandbox/live_transcribe_sandbox.py
  python3 scripts/sandbox/live_transcribe_sandbox.py --api http://127.0.0.1:8000 --token JWT
"""
from __future__ import annotations

import argparse
import io
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app.services.live_audio import (  # noqa: E402
    find_data_chunk_offset,
    ios_style_chunks,
    padded_coreaudio_wav,
    pcm_peak,
    wrap_pcm_in_wav,
)

PHRASE = (
    "The client needs help with bathing dressing and medication reminders "
    "every morning."
)
KEYWORDS = ("bathing", "dressing", "medication")
DEEPGRAM_API = "https://api.deepgram.com/v1/listen"


def generate_speech_wav() -> bytes:
    """macOS say -> 16 kHz 16-bit mono WAV."""
    with tempfile.TemporaryDirectory() as td:
        aiff = Path(td) / "speech.aiff"
        wav = Path(td) / "speech.wav"
        subprocess.run(
            ["say", "-r", "160", "-o", str(aiff), PHRASE],
            check=True,
        )
        subprocess.run(
            [
                "afconvert",
                "-f", "WAVE",
                "-d", "LEI16@16000",
                "-c", "1",
                str(aiff),
                str(wav),
            ],
            check=True,
        )
        return wav.read_bytes()


def deepgram_transcribe(wav: bytes, api_key: str, diarize: bool) -> dict:
    import requests

    params = {
        "model": "nova-3",
        "smart_format": "true",
        "punctuate": "true",
        "utterances": "true",
        "language": "en",
    }
    if diarize:
        params["diarize"] = "true"
    resp = requests.post(
        DEEPGRAM_API,
        params=params,
        headers={"Authorization": f"Token {api_key}", "Content-Type": "audio/wav"},
        data=wav,
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Deepgram {resp.status_code}: {resp.text[:400]}")
    data = resp.json()
    alt = (data.get("results", {}).get("channels") or [{}])[0].get("alternatives") or [{}]
    alt = alt[0]
    return {
        "transcript": alt.get("transcript", "") or "",
        "words": len(alt.get("words") or []),
        "duration": data.get("metadata", {}).get("duration", 0),
        "peak": pcm_peak(wav),
    }


def check_keywords(label: str, transcript: str) -> bool:
    lower = transcript.lower()
    missing = [k for k in KEYWORDS if k not in lower]
    ok = not missing
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {label}: {transcript!r}")
    if missing:
        print(f"         missing keywords: {missing}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="", help="Optional local API base, e.g. http://127.0.0.1:8000")
    ap.add_argument("--token", default="", help="JWT for local API (optional if --api; will login)")
    ap.add_argument("--email", default="", help="Login email for --api")
    args = ap.parse_args()

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        print("DEEPGRAM_API_KEY is not set")
        return 2

    print("Generating speech WAV…")
    wav = generate_speech_wav()
    offset = find_data_chunk_offset(wav)
    print(f"  bytes={len(wav)} data_offset={offset} peak={pcm_peak(wav)}")

    failures = 0

    print("\n1. Full file, no diarize")
    r = deepgram_transcribe(wav, api_key, diarize=False)
    print(f"   duration={r['duration']} words={r['words']}")
    if not check_keywords("full/no-diarize", r["transcript"]):
        failures += 1

    print("\n2. Full file, diarize=true (iOS default)")
    r = deepgram_transcribe(wav, api_key, diarize=True)
    print(f"   duration={r['duration']} words={r['words']}")
    if not check_keywords("full/diarize", r["transcript"]):
        failures += 1

    print("\n3. iOS-style chunks from canonical WAV, diarize=true")
    chunks = ios_style_chunks(wav, min_new_bytes=32_000, max_chunk_bytes=96_000)
    print(f"   {len(chunks)} chunks")
    combined = []
    for i, chunk in enumerate(chunks):
        r = deepgram_transcribe(chunk, api_key, diarize=True)
        print(f"   chunk {i}: peak={r['peak']} words={r['words']} {r['transcript']!r}")
        combined.append(r["transcript"])
    if not check_keywords("ios-chunks/canonical", " ".join(combined)):
        failures += 1

    print("\n4. iOS-style chunks from CoreAudio-padded WAV, diarize=true")
    pcm = wav[offset:] if offset is not None else wav[44:]
    padded = padded_coreaudio_wav(pcm)
    print(f"   padded bytes={len(padded)} data_offset={find_data_chunk_offset(padded)}")
    chunks = ios_style_chunks(padded, min_new_bytes=32_000, max_chunk_bytes=96_000)
    combined = []
    for i, chunk in enumerate(chunks):
        r = deepgram_transcribe(chunk, api_key, diarize=True)
        print(f"   chunk {i}: peak={r['peak']} words={r['words']} {r['transcript']!r}")
        combined.append(r["transcript"])
    if not check_keywords("ios-chunks/padded", " ".join(combined)):
        failures += 1

    print("\n5. Wrong offset (byte 44 on padded file) — expected broken")
    junk_as_pcm = wrap_pcm_in_wav(padded[44 : 44 + 96_000])
    r = deepgram_transcribe(junk_as_pcm, api_key, diarize=True)
    print(f"   peak={r['peak']} transcript={r['transcript']!r}")
    if r["transcript"].strip():
        print("   note: Deepgram still decoded something from misaligned PCM")
    else:
        print("   confirmed: misaligned header bytes transcribe as silence/empty")

    if args.api:
        print(f"\n6. Local API {args.api}")
        import requests

        token = args.token
        if not token:
            email = args.email or os.environ.get("ADMIN_EMAIL") or "admin@palmtai.com"
            password = os.environ.get("ADMIN_PASSWORD") or os.environ.get("DEMO_ACCOUNT_PASSWORD") or ""
            if not password:
                print("   SKIP: --token or ADMIN_PASSWORD required")
            else:
                login = requests.post(
                    f"{args.api.rstrip('/')}/auth/login",
                    json={"email": email, "password": password},
                    timeout=30,
                )
                if login.status_code != 200:
                    print(f"   LOGIN FAIL HTTP {login.status_code} {login.text[:300]}")
                    failures += 1
                    token = ""
                else:
                    token = login.json().get("access_token") or login.json().get("token") or ""
                    print(f"   logged in as {email}")

        if token:
            chunk = chunks[0] if chunks else wav
            resp = requests.post(
                f"{args.api.rstrip('/')}/live/transcribe?language=en&diarize=true",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("chunk.wav", io.BytesIO(chunk), "audio/wav")},
                timeout=30,
            )
            print(f"   HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"   {resp.text[:400]}")
                failures += 1
            else:
                body = resp.json()
                print(f"   provider={body.get('provider')} words={len(body.get('words') or [])}")
                if not check_keywords("local-api", body.get("transcript", "")):
                    failures += 1

    print("\n" + ("ALL CHECKS PASSED" if failures == 0 else f"{failures} CHECK(S) FAILED"))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
