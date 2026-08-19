#!/usr/bin/env python3
"""Stress-test concurrent assessments against a running local API + worker.

Does not print secrets. Creates a throwaway agency, then:
  1. Parallel live-transcribe chunks (iOS recording path)
  2. N concurrent full pipelines (upload + auto_process)
  3. A status-poll storm while those pipelines run (iOS poll loop)

Usage:
  .venv311/bin/python scripts/sandbox/stress_assessments.py
  PALM_STRESS_N=3 PALM_STRESS_API=http://127.0.0.1:8000 \\
    .venv311/bin/python scripts/sandbox/stress_assessments.py
"""
from __future__ import annotations

import json
import os
import struct
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
API = os.environ.get("PALM_STRESS_API", "http://127.0.0.1:8000").rstrip("/")
N = int(os.environ.get("PALM_STRESS_N", "3"))
POLL_SEC = float(os.environ.get("PALM_STRESS_POLL_SEC", "3"))
MAX_POLLS = int(os.environ.get("PALM_STRESS_MAX_POLLS", "100"))  # iOS: 100 x 3s
LIVE_CHUNKS = int(os.environ.get("PALM_STRESS_LIVE_CHUNKS", "6"))
TIMEOUT = 60


def _say_wav(text: str, dest: Path) -> Path:
    aiff = dest.with_suffix(".aiff")
    wav = dest.with_suffix(".wav")
    subprocess.run(["say", "-o", str(aiff), text], check=True)
    subprocess.run(
        ["afconvert", str(aiff), str(wav), "-d", "LEI16@16000", "-c", "1", "-f", "WAVE"],
        check=True,
    )
    return wav


def _silent_wav(seconds: float = 1.5) -> bytes:
    pcm = b"\x00\x00" * int(16000 * seconds)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(pcm),
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        16000,
        16000 * 2,
        2,
        16,
        b"data",
        len(pcm),
    )
    return header + pcm


def _auth(session: requests.Session, token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _ensure_local_user() -> tuple[str, str]:
    """Create or reset a local-only user via SQL so we do not depend on signup."""
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
    email = os.environ.get("PALM_STRESS_EMAIL", "assessment-stress@example.com")
    password = os.environ.get("PALM_STRESS_PASSWORD", "PalmLocal-Stress9!")
    import bcrypt
    import psycopg

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")
    user = os.environ.get("POSTGRES_USER", "homecare")
    dbpass = os.environ.get("POSTGRES_PASSWORD", "")
    dbname = os.environ.get("POSTGRES_DB", "homecare")
    with psycopg.connect(
        host="127.0.0.1",
        dbname=dbname,
        user=user,
        password=dbpass,
        autocommit=True,
    ) as conn:
        conn.execute(
            """
            INSERT INTO users (
                id, email, hashed_password, full_name, role, is_active, company_name,
                created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), %(email)s, %(hashed)s, 'Assessment Stress', 'admin', true, 'Stress Agency',
                now(), now()
            )
            ON CONFLICT (email) DO UPDATE
            SET hashed_password = EXCLUDED.hashed_password,
                is_active = true,
                updated_at = now()
            """,
            {"email": email, "hashed": hashed},
        )
    return email, password


def _is_local_api() -> bool:
    host = API.lower()
    return "127.0.0.1" in host or "localhost" in host


def login() -> str:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
    if _is_local_api():
        email, password = _ensure_local_user()
    else:
        email = os.environ.get("PALM_STRESS_EMAIL") or os.environ.get("DEMO_ACCOUNT_EMAIL")
        password = os.environ.get("PALM_STRESS_PASSWORD") or os.environ.get(
            "DEMO_ACCOUNT_PASSWORD"
        )
        if not email or not password:
            raise RuntimeError("Set DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD for production")
    last = ""
    for path, payload in (
        ("/auth/login", {"email": email, "password": password}),
        ("/auth/business/login", {"email": email, "password": password}),
    ):
        r = session.post(f"{API}{path}", json=payload, timeout=TIMEOUT)
        if r.status_code == 200 and r.json().get("access_token"):
            print(f"logged in {email} via {path}", flush=True)
            return r.json()["access_token"]
        last = f"{path} {r.status_code} {r.text[:200]}"
    raise RuntimeError(f"login failed: {last}")


def verify_artifacts(token: str, visit_id: str) -> dict:
    headers = _auth(session, token)
    out = {"visit_id": visit_id}
    for name, path in (
        ("billables", f"/visits/{visit_id}/billables"),
        ("note", f"/visits/{visit_id}/note"),
        ("contract", f"/visits/{visit_id}/contract"),
    ):
        r = session.get(f"{API}{path}", headers=headers, timeout=TIMEOUT)
        body = {}
        try:
            body = r.json()
        except Exception:
            body = {"raw": (r.text or "")[:160]}
        if name == "billables":
            items = body if isinstance(body, list) else body.get("items") or body.get("billables") or []
            count = len(items) if isinstance(items, list) else 0
            ok = r.status_code == 200 and count > 0
            out[name] = {"ok": ok, "status": r.status_code, "count": count}
        else:
            ok = r.status_code == 200 and bool(body.get("id"))
            out[name] = {"ok": ok, "status": r.status_code, "id": body.get("id")}
    out["ok"] = all(out[k]["ok"] for k in ("billables", "note", "contract"))
    return out


def pipeline_done(state: dict | None) -> tuple[bool, bool, str]:
    """Return (finished, success, summary)."""
    state = state or {}
    fp = (state.get("full_pipeline") or {}).get("status", "")
    if fp == "completed":
        return True, True, "full_pipeline completed"
    if fp == "failed":
        err = (state.get("full_pipeline") or {}).get("error", "failed")
        return True, False, f"full_pipeline failed: {err}"
    core = ("transcription", "billing", "note", "contract")
    statuses = {k: (state.get(k) or {}).get("status", "") for k in core}
    if any(s == "failed" for s in statuses.values()):
        failed = [k for k, s in statuses.items() if s == "failed"]
        return True, False, f"step failed: {failed} {statuses}"
    if all(s == "completed" for s in statuses.values()):
        return True, True, "core steps completed"
    inflight = [f"{k}={s or 'missing'}" for k, s in statuses.items()]
    return False, False, " ".join(inflight)


def live_chunk(token: str, wav: bytes, i: int) -> dict:
    t0 = time.monotonic()
    r = session.post(
        f"{API}/live/transcribe",
        headers=_auth(session, token),
        params={"language": "en", "diarize": "true"},
        files={"file": ("chunk.wav", wav, "audio/wav")},
        timeout=TIMEOUT,
    )
    ms = int((time.monotonic() - t0) * 1000)
    body = {}
    try:
        body = r.json()
    except Exception:
        body = {"raw": (r.text or "")[:200]}
    return {
        "i": i,
        "status": r.status_code,
        "ms": ms,
        "ok": r.status_code == 200,
        "text": (body.get("transcript") or body.get("text") or "")[:80],
        "detail": str(body.get("detail", ""))[:120],
    }


def start_assessment(token: str, wav_path: Path, i: int) -> dict:
    headers = _auth(session, token)
    t0 = time.monotonic()
    cr = session.post(
        f"{API}/clients",
        headers={**headers, "Content-Type": "application/json"},
        json={"full_name": f"Prod check {i} {datetime.now(timezone.utc).strftime('%H%M%S')}"},
        timeout=TIMEOUT,
    )
    if cr.status_code not in (200, 201):
        return {"i": i, "ok": False, "error": f"client {cr.status_code} {cr.text[:200]}"}
    client_id = cr.json()["id"]
    vr = session.post(
        f"{API}/visits",
        headers={**headers, "Content-Type": "application/json"},
        json={"client_id": client_id},
        timeout=TIMEOUT,
    )
    if vr.status_code not in (200, 201):
        return {"i": i, "ok": False, "error": f"visit {vr.status_code} {vr.text[:200]}"}
    visit_id = vr.json()["id"]
    with wav_path.open("rb") as fh:
        ur = session.post(
            f"{API}/uploads/audio",
            headers=headers,
            data={"visit_id": visit_id, "auto_process": "true"},
            files={"file": ("visit.wav", fh, "audio/wav")},
            timeout=120,
        )
    ms = int((time.monotonic() - t0) * 1000)
    if ur.status_code not in (200, 201):
        return {
            "i": i,
            "ok": False,
            "visit_id": visit_id,
            "error": f"upload {ur.status_code} {ur.text[:240]}",
            "upload_ms": ms,
        }
    return {"i": i, "ok": True, "visit_id": visit_id, "client_id": client_id, "upload_ms": ms}


def poll_visit(token: str, visit_id: str) -> dict:
    headers = _auth(session, token)
    t0 = time.monotonic()
    last = ""
    for n in range(1, MAX_POLLS + 1):
        r = session.get(f"{API}/pipeline/visits/{visit_id}/status", headers=headers, timeout=TIMEOUT)
        if r.status_code != 200:
            last = f"status {r.status_code} {r.text[:160]}"
            time.sleep(POLL_SEC)
            continue
        data = r.json()
        done, success, summary = pipeline_done(data.get("pipeline_state"))
        last = summary
        if done:
            return {
                "visit_id": visit_id,
                "ok": success,
                "polls": n,
                "sec": round(time.monotonic() - t0, 1),
                "summary": summary,
                "pipeline_state": data.get("pipeline_state"),
                "visit_status": data.get("status"),
            }
        time.sleep(POLL_SEC)
    return {
        "visit_id": visit_id,
        "ok": False,
        "polls": MAX_POLLS,
        "sec": round(time.monotonic() - t0, 1),
        "summary": f"timeout after {MAX_POLLS} polls: {last}",
        "pipeline_state": None,
        "visit_status": "timeout",
    }


def status_storm(token: str, visit_ids: list[str], waves: int = 8) -> dict:
    headers = _auth(session, token)
    latencies: list[int] = []
    codes: dict[int, int] = {}
    errors = 0

    def one(vid: str) -> tuple[int, int]:
        t0 = time.monotonic()
        r = session.get(f"{API}/pipeline/visits/{vid}/status", headers=headers, timeout=TIMEOUT)
        return r.status_code, int((time.monotonic() - t0) * 1000)

    jobs = visit_ids * waves
    with ThreadPoolExecutor(max_workers=min(20, len(jobs) or 1)) as pool:
        futs = [pool.submit(one, vid) for vid in jobs]
        for fut in as_completed(futs):
            try:
                code, ms = fut.result()
            except Exception:
                errors += 1
                continue
            codes[code] = codes.get(code, 0) + 1
            latencies.append(ms)
            if code != 200:
                errors += 1
    latencies.sort()
    p95 = latencies[int(len(latencies) * 0.95) - 1] if latencies else None
    return {
        "requests": len(jobs),
        "errors": errors,
        "codes": codes,
        "p50_ms": latencies[len(latencies) // 2] if latencies else None,
        "p95_ms": p95,
        "max_ms": max(latencies) if latencies else None,
    }


session = requests.Session()


def main() -> int:
    print(f"API {API}  N={N}  live_chunks={LIVE_CHUNKS}", flush=True)
    health_ok = True
    for path in ("/health", "/health/celery", "/health/redis", "/health/s3"):
        r = session.get(f"{API}{path}", timeout=10)
        body = (r.text or "")[:120]
        print(f"{path} {r.status_code} {body}", flush=True)
        if r.status_code != 200 or ('"ok"' not in body and '"healthy"' not in body):
            health_ok = False
    if not health_ok:
        print("Health check failed.")
        return 1

    token = login()

    phrase = (
        "Jane Smith needs help with bathing, dressing, and taking medication "
        "every morning. Her daughter lives nearby. She uses a walker."
    )
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = _say_wav(phrase, Path(tmp) / "stress")
        wav_bytes = wav_path.read_bytes()
        print(f"spoken wav {len(wav_bytes)} bytes")

        print("\n== live transcribe storm ==")
        with ThreadPoolExecutor(max_workers=LIVE_CHUNKS) as pool:
            live_futs = [pool.submit(live_chunk, token, wav_bytes, i) for i in range(LIVE_CHUNKS)]
            live_results = [f.result() for f in live_futs]
        live_ok = sum(1 for r in live_results if r["ok"])
        live_ms = sorted(r["ms"] for r in live_results)
        print(f"live {live_ok}/{LIVE_CHUNKS} ok  p50={live_ms[len(live_ms)//2]}ms  max={live_ms[-1]}ms")
        for r in live_results:
            flag = "ok" if r["ok"] else "FAIL"
            print(f"  [{flag}] chunk {r['i']} HTTP {r['status']} {r['ms']}ms {r['text'] or r['detail']}")

        print(f"\n== {N} concurrent assessments ==")
        t_all = time.monotonic()
        with ThreadPoolExecutor(max_workers=N) as pool:
            started = list(pool.map(lambda i: start_assessment(token, wav_path, i), range(N)))
        for s in started:
            if s.get("ok"):
                print(f"  queued visit {s['visit_id']} upload_ms={s['upload_ms']}")
            else:
                print(f"  FAIL start {s}")

        visit_ids = [s["visit_id"] for s in started if s.get("ok") and s.get("visit_id")]
        if not visit_ids:
            print("no visits queued")
            return 1

        print("\n== status poll storm ==")
        storm = status_storm(token, visit_ids)
        print(json.dumps(storm))

        print("\n== poll until complete (iOS window) ==")
        with ThreadPoolExecutor(max_workers=len(visit_ids)) as pool:
            polls = list(pool.map(lambda vid: poll_visit(token, vid), visit_ids))

    elapsed = round(time.monotonic() - t_all, 1)
    ok = sum(1 for p in polls if p["ok"])
    print(f"\nassessments {ok}/{len(polls)} completed in {elapsed}s", flush=True)
    for p in polls:
        flag = "ok" if p["ok"] else "FAIL"
        print(f"  [{flag}] {p['visit_id']} {p['sec']}s polls={p['polls']} {p['summary']}", flush=True)

    print("\n== artifacts (billables / note / contract) ==", flush=True)
    artifacts = [verify_artifacts(token, p["visit_id"]) for p in polls]
    artifacts_ok = 0
    for a in artifacts:
        flag = "ok" if a["ok"] else "FAIL"
        print(
            f"  [{flag}] {a['visit_id']} billables={a['billables']} note={a['note']} contract={a['contract']}",
            flush=True,
        )
        if a["ok"]:
            artifacts_ok += 1

    out = {
        "api": API,
        "n": N,
        "live_ok": live_ok,
        "live_total": LIVE_CHUNKS,
        "storm": storm,
        "assessments_ok": ok,
        "assessments_total": len(polls),
        "artifacts_ok": artifacts_ok,
        "elapsed_sec": elapsed,
        "polls": [{k: v for k, v in p.items() if k != "pipeline_state"} for p in polls],
        "artifacts": artifacts,
    }
    dest = ROOT / "scripts" / "sandbox" / "stress_assessments_last.json"
    dest.write_text(json.dumps(out, indent=2))
    print(f"wrote {dest}", flush=True)
    return 0 if ok == len(polls) and live_ok == LIVE_CHUNKS and storm["errors"] == 0 and artifacts_ok == len(polls) else 1


if __name__ == "__main__":
    sys.exit(main())
