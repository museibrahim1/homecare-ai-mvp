#!/usr/bin/env python3
"""Record a full marketing demo: Record → Processing → Contract.

Launches the DEBUG app with MARKETING_FULL_PIPELINE automation, injects
spoken WAV into the live recording, keeps the Simulator screen recording
running through upload/pipeline, then through the visit tab walk ending
on Contract.

Usage:
  .venv311/bin/python scripts/sandbox/record_assessment_marketing.py
  PALM_SIM_UDID=<udid> .venv311/bin/python scripts/sandbox/record_assessment_marketing.py
"""
from __future__ import annotations

import os
import signal
import struct
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

UDID = os.environ.get("PALM_SIM_UDID", "7E14CFD1-B6F6-4532-A176-B11F8FB96FE9")
BUNDLE = "com.palmcareai.app"
DESKTOP = Path("/Users/musaibrahim/Desktop/PalmCare Documents")
OUT_DIR = ROOT / "marketing" / "screen-recordings"
# Record inject window (app auto-stops at ~40s after start). Extra time covers
# upload + pipeline + tab walk on Contract.
INJECT_SECONDS = int(os.environ.get("PALM_MARKETING_RECORD_SEC", "45"))
POST_PROCESS_WAIT = int(os.environ.get("PALM_MARKETING_PROCESS_WAIT", "180"))
INJECT_EVERY_SEC = 8

PHRASES = [
    "Eleanor needs help with bathing, dressing, and medication reminders every morning.",
    "She needs about twenty hours a week, Monday through Friday, at twenty eight dollars an hour.",
    "Cooking is hard now. She needs help with lunch and dinner, and light housekeeping.",
    "Her daughter lives nearby and checks in on her every weekend.",
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
    root = (
        Path.home()
        / "Library/Developer/CoreSimulator/Devices"
        / UDID
        / "data/Containers/Data/Application"
    )
    recs = list(root.glob("*/Documents/Recordings/recording_*.wav"))
    if not recs:
        return None
    return max(recs, key=lambda p: p.stat().st_mtime)


def launch_app() -> None:
    env = os.environ.copy()
    email = os.environ.get("DEMO_ACCOUNT_EMAIL", "demo-screenshots@palmtai.com")
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
            "MARKETING_FULL_PIPELINE",
            "SKIP_PAYWALL",
        ],
        env=env,
    )
    if r.returncode != 0:
        sys.exit(f"simctl launch failed: {r.returncode}")
    print("app launched with MARKETING_FULL_PIPELINE", flush=True)


def wait_for_recording(timeout: float = 45) -> Path:
    deadline = time.time() + timeout
    while time.time() < deadline:
        rec = latest_recording()
        if rec and rec.stat().st_mtime > time.time() - 60:
            print(f"recording {rec.name} size={rec.stat().st_size}", flush=True)
            return rec
        time.sleep(0.5)
    sys.exit("no in-progress recording found — is a DEBUG build installed?")


def main() -> int:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    # Write under /tmp first — simctl has been flaky finalizing into paths with spaces.
    raw = Path(f"/tmp/palm-full-pipeline-raw-{stamp}.mp4")
    final = OUT_DIR / f"full-pipeline-{stamp}.mp4"
    desktop_copy = DESKTOP / final.name

    cache = Path("/tmp/palm-marketing-phrases")
    cache.mkdir(parents=True, exist_ok=True)
    pcms: list[bytes] = []
    for i, phrase in enumerate(PHRASES):
        pcm = say_to_pcm(phrase, cache / f"phrase-{i:02d}")
        pcms.append(pcm)
        print(f"phrase {i}: {len(pcm)} bytes", flush=True)

    print(f"screen recording -> {raw}", flush=True)
    if raw.exists():
        raw.unlink()
    # Launch app first, then start capture so the first frames are the product.
    launch_app()
    time.sleep(2)

    rec_proc = subprocess.Popen(
        [
            "xcrun",
            "simctl",
            "io",
            UDID,
            "recordVideo",
            "--codec=h264",
            "--force",
            str(raw),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    started_rec = False
    deadline = time.time() + 20
    assert rec_proc.stderr is not None

    def _drain() -> None:
        assert rec_proc.stderr is not None
        for line in rec_proc.stderr:
            print(f"simctl: {line.strip()}", flush=True)

    import threading

    drain_thread = threading.Thread(target=_drain, daemon=True)
    drain_thread.start()
    # Give simctl a moment to print Recording started (drained on thread).
    time.sleep(2.5)
    if rec_proc.poll() is not None:
        print("recordVideo exited early", flush=True)
        return 1
    started_rec = True
    print("recordVideo running", flush=True)

    # App waits ~4s then ~2.5s before starting; give it room.
    time.sleep(6)
    try:
        rec = wait_for_recording()
    except SystemExit as exc:
        if rec_proc.poll() is None:
            rec_proc.send_signal(signal.SIGINT)
            rec_proc.wait(timeout=60)
        raise exc

    started = time.time()
    inject_index = 0
    next_inject = started + 1
    print(f"injecting audio for {INJECT_SECONDS}s, then waiting {POST_PROCESS_WAIT}s for process+contract", flush=True)

    while True:
        now = time.time()
        elapsed = now - started
        # Keep capturing through processing + contract walk.
        if elapsed >= INJECT_SECONDS + POST_PROCESS_WAIT:
            break
        if elapsed < INJECT_SECONDS and now >= next_inject:
            pcm = pcms[inject_index % len(pcms)]
            with rec.open("ab") as f:
                f.write(pcm)
            print(
                f"+{int(elapsed):03d}s inject #{inject_index} file={rec.stat().st_size}",
                flush=True,
            )
            inject_index += 1
            next_inject = now + INJECT_EVERY_SEC
            newest = latest_recording()
            if newest and newest != rec:
                rec = newest
                print(f"switched recording to {rec.name}", flush=True)
        elif elapsed >= INJECT_SECONDS and int(elapsed) % 15 == 0:
            print(f"+{int(elapsed):03d}s waiting on processing / contract UI…", flush=True)
            time.sleep(1)
        time.sleep(0.4)

    if rec_proc.poll() is None:
        print("stopping screen recording…", flush=True)
        rec_proc.send_signal(signal.SIGINT)
        try:
            rec_proc.wait(timeout=90)
        except subprocess.TimeoutExpired:
            print("recordVideo finalize timed out; killing", flush=True)
            rec_proc.kill()
            rec_proc.wait(timeout=10)

    # Give disk a beat to flush the moov atom.
    time.sleep(2)
    size = raw.stat().st_size if raw.exists() else 0
    print(f"raw size={size}", flush=True)
    if size < 50_000:
        print(f"recording missing or too small: {raw}", flush=True)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ff = subprocess.run(
        ["ffmpeg", "-y", "-i", str(raw), "-c", "copy", "-movflags", "+faststart", str(final)],
        check=False,
        capture_output=True,
    )
    out = final if ff.returncode == 0 and final.exists() else raw
    if out == raw:
        # Still publish something usable.
        final.write_bytes(raw.read_bytes())
        out = final
    desktop_copy.write_bytes(out.read_bytes())
    print(f"saved {out} ({out.stat().st_size // (1024*1024)} MB)", flush=True)
    print(f"desktop copy {desktop_copy}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
