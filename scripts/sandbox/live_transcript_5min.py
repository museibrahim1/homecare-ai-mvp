#!/usr/bin/env python3
"""5-minute Simulator live-transcript demo.

The iOS Simulator microphone records silence, so this script launches the
Debug app, then keeps appending spoken WAV phrases into the in-progress
recording so Deepgram has real audio for the full 5 minutes.

Usage:
  .venv311/bin/python scripts/sandbox/live_transcript_5min.py
"""
from __future__ import annotations

import os
import struct
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

UDID = os.environ.get("PALM_SIM_UDID", "175D8808-C1BD-4C74-B3DD-3E77DAB10193")
BUNDLE = "com.palmcareai.app"
DURATION_SEC = int(os.environ.get("PALM_LIVE_SECONDS", str(5 * 60)))
INJECT_EVERY_SEC = 12
SHOT_DIR = Path("/tmp/palm-live-5min")
DESKTOP = Path("/Users/musaibrahim/Desktop/PalmCare Documents")

PHRASES = [
    "Jane Smith needs help with bathing, dressing, and taking medication every morning.",
    "She also needs help transferring from the bed to a chair and walking with a walker.",
    "Her daughter lives nearby and checks in on her every weekend.",
    "She takes blood pressure medication twice a day with breakfast and dinner.",
    "Ambulation is limited to short distances inside the home with a walker.",
    "She needs meal preparation for lunch and dinner, and a reminder to drink water.",
    "Night time toileting is a fall risk. A bedside commode would help.",
    "She is oriented to person and place. Short term memory is starting to decline.",
    "Standby assistance is needed for showering because of poor balance.",
    "The care plan should include medication reminders, bathing, dressing, and meals.",
]


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=False, **kwargs)


def say_to_pcm(text: str, dest: Path) -> bytes:
    aiff = dest.with_suffix(".aiff")
    wav = dest.with_suffix(".wav")
    run(["say", "-o", str(aiff), text])
    run(["afconvert", str(aiff), str(wav), "-d", "LEI16@16000", "-c", "1", "-f", "WAVE"])
    data = wav.read_bytes()
    i = 12
    while i + 8 <= len(data):
        four = data[i : i + 4]
        size = struct.unpack_from("<I", data, i + 4)[0]
        if four == b"data":
            return data[i + 8 : i + 8 + size]
        i += 8 + size + (size % 2)
    raise RuntimeError(f"no PCM in {wav}")


def latest_recording() -> Path | None:
    root = Path.home() / "Library/Developer/CoreSimulator/Devices" / UDID / "data/Containers/Data/Application"
    recs = list(root.glob("*/Documents/Recordings/recording_*.wav"))
    if not recs:
        return None
    return max(recs, key=lambda p: p.stat().st_mtime)


def screenshot(label: str) -> Path:
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    dest = SHOT_DIR / f"{label}.png"
    run(["xcrun", "simctl", "io", UDID, "screenshot", str(dest)])
    DESKTOP.mkdir(parents=True, exist_ok=True)
    desktop = DESKTOP / f"palm-live-5min-{label}.png"
    if dest.exists():
        desktop.write_bytes(dest.read_bytes())
    print(f"screenshot {label} -> {dest}", flush=True)
    return dest


def launch_app() -> None:
    env = os.environ.copy()
    email = "demo-screenshots@palmtai.com"
    password = os.environ.get("DEMO_ACCOUNT_PASSWORD", "")
    if not password:
        sys.exit("DEMO_ACCOUNT_PASSWORD missing from .env")
    env["SIMCTL_CHILD_AUTOMATION_LOGIN_EMAIL"] = email
    env["SIMCTL_CHILD_AUTOMATION_LOGIN_PASSWORD"] = password
    run(["xcrun", "simctl", "terminate", UDID, BUNDLE], env=env)
    r = run(
        [
            "xcrun",
            "simctl",
            "launch",
            "--terminate-running-process",
            UDID,
            BUNDLE,
            "OPEN_RECORD_TAB",
            "LIVE_TRANSCRIPT_SMOKE",
        ],
        env=env,
    )
    if r.returncode != 0:
        sys.exit(f"simctl launch failed: {r.returncode}")
    print("app launched", flush=True)


def wait_for_recording(timeout: float = 20) -> Path:
    deadline = time.time() + timeout
    while time.time() < deadline:
        rec = latest_recording()
        if rec and rec.stat().st_mtime > time.time() - 30:
            print(f"recording {rec.name} size={rec.stat().st_size}", flush=True)
            return rec
        time.sleep(0.5)
    sys.exit("no in-progress recording found")


def main() -> None:
    cache = Path("/tmp/palm-live-phrases")
    cache.mkdir(parents=True, exist_ok=True)
    pcms: list[bytes] = []
    for i, phrase in enumerate(PHRASES):
        dest = cache / f"phrase-{i:02d}"
        pcm = say_to_pcm(phrase, dest)
        pcms.append(pcm)
        print(f"phrase {i}: {len(pcm)} bytes  {phrase[:60]}", flush=True)

    launch_app()
    time.sleep(5)
    rec = wait_for_recording()
    screenshot("00-start")

    started = time.time()
    inject_index = 0
    next_inject = started + 2
    shot_at = {s for s in (15, 45, 60, 90, 120, 180, 240, 300) if s <= DURATION_SEC}
    taken: set[int] = set()

    while True:
        now = time.time()
        elapsed = now - started
        if elapsed >= DURATION_SEC:
            break
        if now >= next_inject:
            pcm = pcms[inject_index % len(pcms)]
            with rec.open("ab") as f:
                f.write(pcm)
            print(
                f"+{int(elapsed):03d}s inject #{inject_index} {len(pcm)} bytes file={rec.stat().st_size}",
                flush=True,
            )
            inject_index += 1
            next_inject = now + INJECT_EVERY_SEC
            # The recorder may have rotated to a new file if the app relaunched.
            newest = latest_recording()
            if newest and newest != rec:
                rec = newest
                print(f"switched recording to {rec.name}", flush=True)
        for mark in sorted(shot_at):
            if mark not in taken and elapsed >= mark:
                screenshot(f"{mark:03d}s")
                taken.add(mark)
        time.sleep(0.4)

    # Label by actual run length (PALM_LIVE_SECONDS). Do not hardcode 300s —
    # shorter runs would be mislabeled, and longer runs would overwrite the
    # real mid-run 300s capture.
    screenshot(f"{DURATION_SEC:03d}s")
    print(f"done. {DURATION_SEC}-second live transcript demo finished.", flush=True)


if __name__ == "__main__":
    main()
