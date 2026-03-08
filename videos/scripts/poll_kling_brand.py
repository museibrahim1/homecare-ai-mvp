#!/usr/bin/env python3
"""Poll and download previously submitted Kling brand clips (fixed URLs)."""

import json
import sys
import time
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "kling-brand"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

env_path = SCRIPT_DIR.parent.parent / ".env"
FAL_KEY = None
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("FAL_KEY="):
            FAL_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

BASE = "https://queue.fal.run/fal-ai/kling-video/requests"

REQUESTS = {
    "01_palm_trees_establishing.mp4": "b3cda560-669b-4980-b947-be1b4bd70df1",
    "02_greeting_outdoor.mp4": "f7582f18-6e2e-436f-a2eb-6d10eae67e71",
    "03_conversation_patio.mp4": "1dc7c59e-5041-42d1-9d5e-1f1acd62f192",
    "04_phone_recording.mp4": "6eb39395-47f7-4592-ab7b-864378e42f75",
    "05_showing_contract.mp4": "edad1920-cc54-41de-b9f7-22045b1bf71b",
    "06_palm_sunset_hero.mp4": "9b7b4388-25dd-4f13-94c9-0de6dccf0a8e",
}


def check_status(rid):
    url = f"{BASE}/{rid}/status"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Key {FAL_KEY}")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())


def get_result(rid):
    url = f"{BASE}/{rid}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Key {FAL_KEY}")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())


def main():
    pending = {}
    for filename, rid in REQUESTS.items():
        dest = OUTPUT_DIR / filename
        if dest.exists():
            print(f"SKIP  {filename} (already downloaded)")
            continue
        pending[filename] = rid

    if not pending:
        print("All clips already downloaded!")
        return

    for rnd in range(60):
        if not pending:
            break
        print(f"\n--- Round {rnd+1} ({len(pending)} remaining) ---")
        done = []
        for filename, rid in pending.items():
            try:
                data = check_status(rid)
                status = data.get("status", "UNKNOWN")
                print(f"  {filename}: {status}")

                if status == "COMPLETED":
                    result = get_result(rid)
                    video_url = result.get("video", {}).get("url")
                    if video_url:
                        dest = OUTPUT_DIR / filename
                        print(f"    DOWNLOADING...")
                        urllib.request.urlretrieve(video_url, str(dest))
                        sz = dest.stat().st_size // 1024
                        print(f"    DONE ({sz} KB)")
                        done.append(filename)
                    else:
                        print(f"    No video URL: {str(result)[:200]}")
                elif status in ("FAILED", "CANCELLED"):
                    print(f"    FAILED — removing from queue")
                    done.append(filename)
            except Exception as e:
                print(f"  {filename}: error — {e}")

        for f in done:
            del pending[f]

        if pending:
            time.sleep(20)

    print("\n=== FINAL ===")
    for fn in REQUESTS:
        p = OUTPUT_DIR / fn
        s = "✓" if p.exists() else "✗"
        print(f"  {s} {fn}")


if __name__ == "__main__":
    main()
