#!/usr/bin/env python3
"""Generate Kling O3 Pro cinematic clips in 9:16 for Reels ad."""
import os
import sys
import json
import time
import requests

FAL_KEY = os.environ.get("FAL_KEY", "")
if not FAL_KEY:
    print("ERROR: FAL_KEY not set")
    sys.exit(1)

HEADERS = {"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"}
BASE = "https://queue.fal.run"
MODEL = "fal-ai/kling-video/v2/master/text-to-video"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "kling-reel")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CLIPS = [
    {
        "name": "01_paperwork_stress",
        "prompt": "Close-up of a home care worker's hands surrounded by scattered paperwork, insurance forms, and a laptop on a cluttered desk, dim warm office lighting, shallow depth of field, the worker sighs and rubs their temples, cinematic realistic style, moody amber lighting with soft shadows, 4K quality, no blur or artifacts.",
        "duration": "5",
        "aspect_ratio": "9:16",
    },
    {
        "name": "02_caregiver_arrives",
        "prompt": "A professional female caregiver in scrubs walks up to a beautiful suburban home front door, carrying an iPad, warm golden hour sunlight, slow-motion cinematic camera tracking her from the side, lush green lawn, teal accent on her lanyard badge, confident smile, photorealistic style, soft bokeh background, 4K quality.",
        "duration": "5",
        "aspect_ratio": "9:16",
    },
    {
        "name": "03_talking_to_client",
        "prompt": "A caring female nurse sitting across from an elderly woman in a cozy well-lit living room, having a warm conversation, the nurse holds a modern smartphone naturally recording the conversation, soft natural window light, warm tones, close medium shot, cinematic depth of field, empathetic genuine expressions, photorealistic style, 4K quality.",
        "duration": "5",
        "aspect_ratio": "9:16",
    },
    {
        "name": "04_phone_glow",
        "prompt": "Close-up of hands holding a sleek iPhone showing a glowing teal interface with waveform audio visualization, dark ambient background with soft teal light illuminating the hands, the screen pulses gently with recording activity, cinematic shallow depth of field, premium tech product shot style, subtle light reflections, 4K quality.",
        "duration": "5",
        "aspect_ratio": "9:16",
    },
    {
        "name": "05_happy_family",
        "prompt": "A warm scene of an elderly couple sitting on a couch, smiling gratefully as a professional caregiver shows them a document on a tablet, bright natural daylight from large windows, modern tasteful living room, expressions of relief and trust, slow gentle camera push-in, cinematic realistic style, warm color grading, 4K quality.",
        "duration": "5",
        "aspect_ratio": "9:16",
    },
]


def submit_clip(clip):
    payload = {
        "prompt": clip["prompt"],
        "duration": clip["duration"],
        "aspect_ratio": clip["aspect_ratio"],
    }
    resp = requests.post(f"{BASE}/{MODEL}", json=payload, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()
    req_id = data.get("request_id")
    status_url = data.get("status_url", "")
    response_url = data.get("response_url", "")
    print(f"  Submitted {clip['name']}: request_id={req_id}")
    return {"id": req_id, "status_url": status_url, "response_url": response_url}


def poll_result(info, name, max_wait=300):
    req_id = info["id"]
    status_url = info.get("status_url") or f"{BASE}/fal-ai/kling-video/requests/{req_id}/status"
    result_url = info.get("response_url") or f"{BASE}/fal-ai/kling-video/requests/{req_id}"
    for i in range(max_wait // 5):
        time.sleep(5)
        try:
            resp = requests.get(status_url, headers=HEADERS)
            text = resp.text.strip()
            if text.startswith("{"):
                data = json.loads(text)
            else:
                data = {"status": text.strip('"')}
        except Exception as e:
            print(f"  Poll parse error for {name}: {e}, raw: {resp.text[:200]}")
            continue

        status = data.get("status", "UNKNOWN")
        if status == "COMPLETED":
            try:
                result_resp = requests.get(result_url, headers=HEADERS)
                result = result_resp.json()
                video_url = None
                if isinstance(result.get("video"), dict):
                    video_url = result["video"].get("url")
                elif isinstance(result.get("video"), str):
                    video_url = result["video"]
                if not video_url and isinstance(result.get("data"), dict):
                    vid = result["data"].get("video")
                    if isinstance(vid, dict):
                        video_url = vid.get("url")
                    elif isinstance(vid, str):
                        video_url = vid
                if not video_url:
                    for k, v in result.items():
                        if isinstance(v, dict) and "url" in v:
                            video_url = v["url"]
                            break
                return video_url
            except Exception as e:
                print(f"  Result fetch error {name}: {e}")
                return None
        if status in ("FAILED", "CANCELLED"):
            print(f"  FAILED {name}: {data}")
            return None
        if i % 6 == 0:
            print(f"  Polling {name}: {status} ({i*5}s)")
    print(f"  TIMEOUT {name}")
    return None


def download(url, path):
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(path, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)


if __name__ == "__main__":
    print("=== Generating Kling O3 Pro 9:16 Reel Clips ===\n")

    pending = {}
    for clip in CLIPS:
        out = os.path.join(OUTPUT_DIR, f"{clip['name']}.mp4")
        if os.path.exists(out):
            print(f"  [skip] {clip['name']} exists")
            continue
        info = submit_clip(clip)
        pending[clip["name"]] = (info, out)

    print(f"\n  Waiting for {len(pending)} clips...\n")

    for name, (info, out) in pending.items():
        video_url = poll_result(info, name)
        if video_url:
            print(f"  Downloading {name}...")
            download(video_url, out)
            print(f"  Saved: {out}")
        else:
            print(f"  FAILED: {name}")

    print("\n=== Done ===")
