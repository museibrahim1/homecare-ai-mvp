#!/usr/bin/env python3
"""Upload one real assessment audio file to production and wait for the pipeline.

Does not print secrets. Usage:
  PALM_ASSESS_FILE=/path/to.mp3 PALM_ASSESS_NAME="Sharon" \\
    .venv311/bin/python scripts/sandbox/run_real_assessment.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

API = os.environ.get("PALM_STRESS_API", "https://api-production-a0a2.up.railway.app").rstrip("/")
FILE = Path(os.environ["PALM_ASSESS_FILE"])
NAME = os.environ.get("PALM_ASSESS_NAME", FILE.stem[:80])
POLL_SEC = float(os.environ.get("PALM_ASSESS_POLL_SEC", "5"))
MAX_POLLS = int(os.environ.get("PALM_ASSESS_MAX_POLLS", "240"))  # 20 min at 5s
OUT_DIR = ROOT / "scripts" / "sandbox" / "assessment-runs"


def login(session: requests.Session) -> str:
    email = os.environ["DEMO_ACCOUNT_EMAIL"]
    password = os.environ["DEMO_ACCOUNT_PASSWORD"]
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        r = session.post(
            f"{API}/auth/business/login",
            json={"email": email, "password": password},
            timeout=30,
        )
    r.raise_for_status()
    print(f"logged in {email}", flush=True)
    return r.json()["access_token"]


def pipeline_done(state: dict | None) -> tuple[bool, bool, str]:
    state = state or {}
    fp = (state.get("full_pipeline") or {}).get("status", "")
    if fp == "completed":
        return True, True, "full_pipeline completed"
    if fp == "failed":
        return True, False, f"full_pipeline failed: {(state.get('full_pipeline') or {}).get('error')}"
    core = ("transcription", "billing", "note", "contract")
    statuses = {k: (state.get(k) or {}).get("status", "") for k in core}
    if any(s == "failed" for s in statuses.values()):
        failed = [k for k, s in statuses.items() if s == "failed"]
        return True, False, f"step failed: {failed} {statuses}"
    if all(s == "completed" for s in statuses.values()):
        return True, True, "core steps completed"
    return False, False, " ".join(f"{k}={s or 'missing'}" for k, s in statuses.items())


def summarize(session: requests.Session, headers: dict, visit_id: str) -> dict:
    out: dict = {"visit_id": visit_id}
    tr = session.get(f"{API}/visits/{visit_id}/transcript", headers=headers, timeout=60)
    out["transcript_http"] = tr.status_code
    segs = []
    if tr.status_code == 200:
        body = tr.json()
        segs = body.get("segments") or body.get("items") or []
        if not segs and isinstance(body, list):
            segs = body
    speakers = {}
    texts = []
    for seg in segs:
        if not isinstance(seg, dict):
            continue
        sp = seg.get("speaker_label") or seg.get("speaker") or "?"
        speakers[sp] = speakers.get(sp, 0) + 1
        texts.append(f"[{sp}] {seg.get('text','')}")
    full = "\n".join(texts)
    out["segment_count"] = len(segs)
    out["speakers"] = speakers
    out["word_count"] = len(full.split())
    out["transcript_excerpt"] = full[:2500]
    out["transcript_tail"] = full[-1500:] if len(full) > 2500 else ""

    br = session.get(f"{API}/visits/{visit_id}/billables", headers=headers, timeout=30)
    bbody = br.json() if br.status_code == 200 else {}
    items = bbody.get("items") or bbody.get("billables") or (bbody if isinstance(bbody, list) else [])
    out["billables_http"] = br.status_code
    out["billable_count"] = len(items) if isinstance(items, list) else 0
    out["billables"] = [
        {
            "category": it.get("category"),
            "description": (it.get("description") or it.get("name") or "")[:200],
            "minutes": it.get("minutes") or it.get("adjusted_minutes") or it.get("duration_minutes"),
        }
        for it in (items if isinstance(items, list) else [])
        if isinstance(it, dict)
    ]

    nr = session.get(f"{API}/visits/{visit_id}/note", headers=headers, timeout=30)
    nbody = nr.json() if nr.status_code == 200 else {}
    out["note_http"] = nr.status_code
    out["note_id"] = nbody.get("id")
    out["note_narrative"] = (nbody.get("narrative") or "")[:3000]
    sd = nbody.get("structured_data") or {}
    out["note_structured_keys"] = list(sd.keys()) if isinstance(sd, dict) else []

    cr = session.get(f"{API}/visits/{visit_id}/contract", headers=headers, timeout=30)
    cbody = cr.json() if cr.status_code == 200 else {}
    out["contract_http"] = cr.status_code
    out["contract_id"] = cbody.get("id")
    out["contract_title"] = cbody.get("title")
    out["contract_weekly_hours"] = cbody.get("weekly_hours")
    out["contract_hourly_rate"] = cbody.get("hourly_rate")
    out["contract_services"] = cbody.get("services")
    terms = cbody.get("terms_and_conditions") or cbody.get("content") or ""
    out["contract_has_declined_section"] = "SERVICES NOT INCLUDED" in terms
    out["contract_has_per_service_schedule"] = "Per-service schedule" in terms or "PER-SERVICE" in terms
    out["contract_terms_excerpt"] = terms[:2500] if terms else ""
    return out


def main() -> int:
    if not FILE.exists():
        print(f"missing file {FILE}")
        return 1
    print(f"file {FILE.name} bytes={FILE.stat().st_size}", flush=True)
    session = requests.Session()
    token = login(session)
    headers = {"Authorization": f"Bearer {token}"}

    cr = session.post(f"{API}/clients", headers=headers, json={"full_name": NAME}, timeout=30)
    cr.raise_for_status()
    client_id = cr.json()["id"]
    vr = session.post(f"{API}/visits", headers=headers, json={"client_id": client_id}, timeout=30)
    vr.raise_for_status()
    visit_id = vr.json()["id"]
    print(f"client {client_id} visit {visit_id}", flush=True)

    mime = "audio/mpeg" if FILE.suffix.lower() == ".mp3" else "audio/wav"
    t0 = time.monotonic()
    with FILE.open("rb") as fh:
        ur = session.post(
            f"{API}/uploads/audio",
            headers=headers,
            data={"visit_id": visit_id, "auto_process": "true"},
            files={"file": (FILE.name, fh, mime)},
            timeout=180,
        )
    print(f"upload {ur.status_code} {int((time.monotonic()-t0)*1000)}ms {ur.text[:240]}", flush=True)
    ur.raise_for_status()

    last = ""
    success = False
    polls = 0
    timings = {}
    kind = None
    for n in range(1, MAX_POLLS + 1):
        polls = n
        sr = session.get(f"{API}/pipeline/visits/{visit_id}/status", headers=headers, timeout=30)
        body = sr.json() if sr.status_code == 200 else {}
        state = (body or {}).get("pipeline_state") or {}
        kind = state.get("conversation_kind") or (state.get("classify") or {}).get("conversation_kind")
        timings = (state.get("full_pipeline") or {}).get("timings_ms") or timings
        done, success, last = pipeline_done(state)
        elapsed = round(time.monotonic() - t0, 1)
        if n == 1 or n % 6 == 0 or done:
            print(f"  poll {n} {elapsed}s kind={kind} {last}", flush=True)
        if done:
            timings = (state.get("full_pipeline") or {}).get("timings_ms") or {
                k: (state.get(k) or {}).get("duration_ms")
                for k in ("transcription", "classify", "billing", "note", "contract")
            }
            break
        time.sleep(POLL_SEC)
    elapsed = round(time.monotonic() - t0, 1)
    print(f"pipeline {'ok' if success else 'FAIL'} after {elapsed}s polls={polls} {last}", flush=True)

    summary = summarize(session, headers, visit_id)
    report = {
        "file": str(FILE),
        "name": NAME,
        "visit_id": visit_id,
        "client_id": client_id,
        "elapsed_sec": elapsed,
        "polls": polls,
        "success": success,
        "last": last,
        "conversation_kind": kind,
        "timings_ms": timings,
        "ran_at": datetime.now(timezone.utc).isoformat(),
        **summary,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{FILE.stem[:60].replace(' ', '_')}.json"
    dest.write_text(json.dumps(report, indent=2, default=str))
    print(f"speakers {summary.get('speakers')} segments={summary.get('segment_count')} words={summary.get('word_count')}")
    print(f"kind={kind} timings_ms={timings}")
    print(f"billables {summary.get('billable_count')} { [b.get('category') for b in summary.get('billables') or []] }")
    print(f"note_id {summary.get('note_id')} contract_id {summary.get('contract_id')} hours={summary.get('contract_weekly_hours')}")
    print(
        f"contract declined_section={summary.get('contract_has_declined_section')} "
        f"per_service_schedule={summary.get('contract_has_per_service_schedule')}"
    )
    for s in summary.get("contract_services") or []:
        if isinstance(s, dict):
            print(f"  service {s.get('name')} | freq={s.get('frequency')}")
    print(f"wrote {dest}")
    return 0 if success and summary.get("note_id") and summary.get("contract_id") else 1


if __name__ == "__main__":
    sys.exit(main())
