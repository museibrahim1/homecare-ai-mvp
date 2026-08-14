#!/usr/bin/env python3
"""Generate Aug 2026 data-backed social stills via WaveSpeed Nano Banana 2."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

API_KEY = os.getenv("WAVESPEED_API_KEY")
if not API_KEY:
    print("ERROR: WAVESPEED_API_KEY not set")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
# nano-banana-pro is the proven path used by gen_social_batch1.py
SUBMIT_URL = "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/text-to-image"
POLL_URL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

OUT = PROJECT_ROOT / "marketing/campaigns/aug-2026-from-data/generated"
OUT.mkdir(parents=True, exist_ok=True)

IMAGES = [
    {
        "name": "reel_evenings_back_9x16",
        "aspect_ratio": "9:16",
        "prompt": (
            "Photorealistic vertical 9:16 marketing still. Home care nurse in a warm living room "
            "holds an iPhone 15 Pro Space Black at eye level. Screen shows PalmCare AI recording UI "
            "with teal #0d9488 waveform and a Record control. Soft evening window light. Calm, "
            "relieved expression. Shallow depth of field. No text overlays, no logos, no watermarks."
        ),
    },
    {
        "name": "reel_drive_back_9x16",
        "aspect_ratio": "9:16",
        "prompt": (
            "Photorealistic vertical 9:16 still. Split mood in one frame: foreground shows a tired "
            "home care coordinator in a car at dusk, dashboard soft light, clipboard and loose "
            "paper forms on the passenger seat. Through the windshield, a quiet suburban street. "
            "Feeling of the second job after the visit. Teal #0d9488 rim light subtle on the phone "
            "in the cup holder. No text overlays, no logos."
        ),
    },
    {
        "name": "reel_visit_over_9x16",
        "aspect_ratio": "9:16",
        "prompt": (
            "Photorealistic vertical 9:16 still. POV looking down at an iPhone 15 Pro Space Black "
            "in a driveway beside a car door. Screen shows PalmCare AI contract review UI in teal "
            "#0d9488 with a completed service agreement preview. Late afternoon sun. Keys in the "
            "other hand. Sense that paperwork is already done. No text overlays, no watermarks."
        ),
    },
    {
        "name": "reel_four_docs_9x16",
        "aspect_ratio": "9:16",
        "prompt": (
            "Photorealistic vertical 9:16 product still. iPhone 15 Pro Space Black centered on a "
            "clean desk, slight angle. Screen shows PalmCare AI with four teal #0d9488 document "
            "cards stacked: Transcript, Care Plan, Billables, Contract. Soft studio light, subtle "
            "palm leaf shadow in background. Apple product photography style. No text overlays "
            "outside the phone UI, no watermarks."
        ),
    },
    {
        "name": "feed_myth_bust_1x1",
        "aspect_ratio": "1:1",
        "prompt": (
            "Photorealistic square 1:1 marketing photo. Diverse home care caregiver kneeling beside "
            "an elderly client in a bright living room, holding hands gently, real human care moment. "
            "iPhone with teal #0d9488 app UI rests on the coffee table unused in this beat, showing "
            "that care is human and the phone only handles paperwork later. Warm natural light. "
            "No text overlays, no watermarks."
        ),
    },
    {
        "name": "feed_friday_1x1",
        "aspect_ratio": "1:1",
        "prompt": (
            "Photorealistic square 1:1 lifestyle photo. Home care agency coordinator walking out of "
            "a clinic entrance at golden hour Friday, smiling, jacket over shoulder, iPhone in hand "
            "showing a teal #0d9488 completed visit summary. Weekend energy, clock-out relief. "
            "Soft palm trees in background. No text overlays, no watermarks."
        ),
    },
]


def submit(img: dict) -> str:
    payload = {
        "prompt": img["prompt"],
        "aspect_ratio": img["aspect_ratio"],
        "resolution": "2k",
        "output_format": "png",
    }
    r = requests.post(SUBMIT_URL, json=payload, headers=HEADERS, timeout=60)
    r.raise_for_status()
    data = r.json()
    task_id = data.get("data", data).get("id") or data.get("id")
    if not task_id:
        raise RuntimeError(f"No task id: {data}")
    return task_id


def poll(task_id: str, timeout_s: int = 300) -> str:
    url = POLL_URL.format(task_id=task_id)
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        r = requests.get(url, headers=HEADERS, timeout=60)
        r.raise_for_status()
        data = r.json().get("data", r.json())
        status = (data.get("status") or "").lower()
        if status in ("completed", "succeeded", "success"):
            outputs = data.get("outputs") or data.get("output") or []
            if isinstance(outputs, str):
                return outputs
            if outputs:
                return outputs[0] if isinstance(outputs[0], str) else outputs[0].get("url")
            raise RuntimeError(f"Done but no URL: {data}")
        if status in ("failed", "error"):
            raise RuntimeError(f"Failed: {data}")
        time.sleep(4)
    raise TimeoutError(task_id)


def download(url: str, dest: Path) -> None:
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    dest.write_bytes(r.content)


def main() -> int:
    print(f"Generating {len(IMAGES)} images → {OUT}")
    for img in IMAGES:
        dest = OUT / f"{img['name']}.png"
        if dest.exists() and dest.stat().st_size > 10_000:
            print(f"  skip existing {dest.name}")
            continue
        print(f"  submit {img['name']} ({img['aspect_ratio']})...")
        task_id = submit(img)
        print(f"    task {task_id}")
        url = poll(task_id)
        download(url, dest)
        print(f"    saved {dest.name} ({dest.stat().st_size // 1024} KB)")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
