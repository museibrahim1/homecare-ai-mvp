#!/usr/bin/env python3
"""Prepare demo-screenshots@palmtai.com for a live demo.

1) Delete sandbox/test clients (keeps showcase names)
2) Upload hero assessment audio onto Eleanor Whitfield
3) Upload second assessment onto Harold Jensen
4) Import short spoken-schedule transcripts + process for Rosa, Robert, Margaret

Does not print secrets.

Usage:
  .venv311/bin/python scripts/sandbox/prepare_demo_account.py
  PREPARE_DEMO_DRY_RUN=1 .venv311/bin/python scripts/sandbox/prepare_demo_account.py
  PREPARE_DEMO_SKIP_CLEAN=1 PREPARE_DEMO_SKIP_UPLOAD=1 ...
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
DRY = os.environ.get("PREPARE_DEMO_DRY_RUN", "").strip() in {"1", "true", "yes"}
SKIP_CLEAN = os.environ.get("PREPARE_DEMO_SKIP_CLEAN", "").strip() in {"1", "true", "yes"}
SKIP_UPLOAD = os.environ.get("PREPARE_DEMO_SKIP_UPLOAD", "").strip() in {"1", "true", "yes"}
POLL_SEC = float(os.environ.get("PALM_ASSESS_POLL_SEC", "5"))
MAX_POLLS = int(os.environ.get("PALM_ASSESS_MAX_POLLS", "240"))

KEEP_NAMES = {
    "Eleanor Whitfield",
    "Harold Jensen",
    "Rosa Delgado",
    "Robert Calloway",
    "Margaret Okafor",
}

INTAKE_MP3 = Path(
    os.environ.get(
        "PALM_DEMO_INTAKE_MP3",
        str(ROOT / "Home Care Business Client Intake Role Play copy.mp3"),
    )
)
INTERVIEW_MP3 = Path(
    os.environ.get(
        "PALM_DEMO_INTERVIEW_MP3",
        str(ROOT / "Simulated Interview Demonstration of Patient and her Husband copy.mp3"),
    )
)

OUT = ROOT / "scripts" / "sandbox" / "demo_prepare_report.json"


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
    # process-transcript path may skip transcription
    interesting = [k for k in core if (state.get(k) or {}).get("status")]
    if interesting and all((state.get(k) or {}).get("status") == "completed" for k in interesting):
        if (state.get("contract") or {}).get("status") == "completed" and (
            (state.get("note") or {}).get("status") == "completed"
        ):
            return True, True, "core steps completed"
    return False, False, " ".join(f"{k}={s or 'missing'}" for k, s in statuses.items())


def wait_pipeline(session: requests.Session, headers: dict, visit_id: str, label: str) -> dict:
    """Wait until note + contract artifacts exist (pipeline flags can lag)."""
    t0 = time.monotonic()
    last = ""
    success = False
    for n in range(1, MAX_POLLS + 1):
        sr = session.get(f"{API}/pipeline/visits/{visit_id}/status", headers=headers, timeout=30)
        body = sr.json() if sr.status_code == 200 else {}
        state = (body or {}).get("pipeline_state") or {}
        done, success, last = pipeline_done(state)
        # Artifact-based success: process-transcript often leaves billing "processing"
        # even after billables/note/contract are saved.
        cr = session.get(f"{API}/visits/{visit_id}/contract", headers=headers, timeout=30)
        nr = session.get(f"{API}/visits/{visit_id}/note", headers=headers, timeout=30)
        if cr.status_code == 200 and nr.status_code == 200:
            success = True
            last = "note+contract ready"
            done = True
        if n == 1 or n % 6 == 0 or done:
            print(f"  [{label}] poll {n} {round(time.monotonic()-t0,1)}s {last}", flush=True)
        if done:
            break
        time.sleep(POLL_SEC)
    return {
        "visit_id": visit_id,
        "label": label,
        "success": success,
        "elapsed_sec": round(time.monotonic() - t0, 1),
        "last": last,
    }


def summarize(session: requests.Session, headers: dict, visit_id: str) -> dict:
    out: dict = {"visit_id": visit_id}
    br = session.get(f"{API}/visits/{visit_id}/billables", headers=headers, timeout=30)
    bbody = br.json() if br.status_code == 200 else {}
    items = bbody.get("items") or bbody.get("billables") or []
    out["billable_count"] = len(items) if isinstance(items, list) else 0
    cr = session.get(f"{API}/visits/{visit_id}/contract", headers=headers, timeout=30)
    cbody = cr.json() if cr.status_code == 200 else {}
    out["contract_http"] = cr.status_code
    out["weekly_hours"] = cbody.get("weekly_hours")
    out["hourly_rate"] = cbody.get("hourly_rate")
    sched = cbody.get("schedule") or {}
    out["frequency"] = (sched.get("frequency") or "")[:120]
    out["service_hour_rows"] = len(sched.get("service_hours") or [])
    goals = sched.get("care_plan_goals") or {}
    out["care_plan_goals"] = goals
    if isinstance(goals, dict):
        flat = []
        for k in ("short_term", "long_term", "maintenance", "maintenance_goals"):
            for g in goals.get(k) or []:
                flat.append(str(g)[:120])
        out["care_plan_goal_preview"] = flat[:8]
    nr = session.get(f"{API}/visits/{visit_id}/note", headers=headers, timeout=30)
    out["note_http"] = nr.status_code
    return out


def delete_junk(session: requests.Session, headers: dict, clients: list[dict]) -> list[str]:
    deleted = []
    for c in clients:
        name = c.get("full_name") or ""
        if name in KEEP_NAMES:
            continue
        cid = c["id"]
        print(f"delete junk client {name!r} ({cid[:8]}…)", flush=True)
        if DRY:
            deleted.append(name)
            continue
        r = session.delete(f"{API}/clients/{cid}", headers=headers, timeout=60)
        print(f"  -> {r.status_code}", flush=True)
        if r.status_code in (200, 204):
            deleted.append(name)
    return deleted


def upload_audio(
    session: requests.Session,
    headers: dict,
    *,
    client_id: str,
    client_name: str,
    path: Path,
) -> dict:
    print(f"upload {path.name} -> {client_name}", flush=True)
    if DRY:
        return {"dry_run": True, "client": client_name, "file": str(path)}
    vr = session.post(f"{API}/visits", headers=headers, json={"client_id": client_id}, timeout=30)
    vr.raise_for_status()
    visit_id = vr.json()["id"]
    mime = "audio/mpeg" if path.suffix.lower() == ".mp3" else "audio/wav"
    with path.open("rb") as fh:
        ur = session.post(
            f"{API}/uploads/audio",
            headers=headers,
            data={"visit_id": visit_id, "auto_process": "true"},
            files={"file": (path.name, fh, mime)},
            timeout=180,
        )
    print(f"  upload {ur.status_code} visit={visit_id}", flush=True)
    ur.raise_for_status()
    result = wait_pipeline(session, headers, visit_id, client_name)
    result["summary"] = summarize(session, headers, visit_id)
    result["client"] = client_name
    result["file"] = str(path)
    return result


def spoken_schedule_transcript(client_name: str, hours_per_week: int, rate: int) -> list[dict]:
    """Short grounded intake with an explicit spoken schedule + rate."""
    first = client_name.split()[0]
    lines = [
        (0, f"Good morning {first}, I'm Maria from Sunrise Home Care. I'm here for your care assessment."),
        (1, "Thank you for coming. I've been needing more help around the house."),
        (0, "Do you need help with bathing, dressing, or medication reminders?"),
        (1, "Yes, I need help bathing and someone to remind me about my pills twice a day."),
        (0, "What about meals and housekeeping?"),
        (1, "Cooking is hard now. I need help with lunch and dinner, and light housekeeping."),
        (
            0,
            f"Based on what we discussed, I recommend about {hours_per_week} hours a week of care, "
            f"Monday through Friday, at ${rate} an hour. Does that sound right?",
        ),
        (1, f"Yes, {hours_per_week} hours a week Monday through Friday at ${rate} an hour works for me."),
        (0, "Great. I'll get the care plan, notes, and service agreement ready for you today."),
    ]
    segs = []
    t = 0
    for sp, text in lines:
        start = t
        end = t + max(2500, len(text) * 60)
        segs.append(
            {
                "start_ms": start,
                "end_ms": end,
                "speaker_label": f"SPEAKER_{sp}",
                "text": text,
            }
        )
        t = end + 400
    return segs


def import_and_process(
    session: requests.Session,
    headers: dict,
    *,
    client_id: str,
    client_name: str,
    hours: int,
    rate: int,
) -> dict:
    print(f"import transcript -> {client_name} ({hours} hrs/wk @ ${rate})", flush=True)
    if DRY:
        return {"dry_run": True, "client": client_name, "hours": hours, "rate": rate}
    vr = session.post(f"{API}/visits", headers=headers, json={"client_id": client_id}, timeout=30)
    vr.raise_for_status()
    visit_id = vr.json()["id"]
    segs = spoken_schedule_transcript(client_name, hours, rate)
    ir = session.post(
        f"{API}/visits/{visit_id}/transcript/import",
        headers=headers,
        json={"segments": segs, "source": "import_json", "replace_existing": True},
        timeout=60,
    )
    print(f"  import {ir.status_code} {ir.text[:160]}", flush=True)
    ir.raise_for_status()
    pr = session.post(
        f"{API}/pipeline/visits/{visit_id}/process-transcript"
        f"?generate_note=true&generate_contract=true&generate_billing=true",
        headers=headers,
        timeout=60,
    )
    print(f"  process {pr.status_code} {pr.text[:160]}", flush=True)
    pr.raise_for_status()
    result = wait_pipeline(session, headers, visit_id, client_name)
    result["summary"] = summarize(session, headers, visit_id)
    result["client"] = client_name
    result["mode"] = "import_transcript"
    return result


def delete_old_showcase_visits(
    session: requests.Session, headers: dict, clients_by_name: dict[str, dict]
) -> list[str]:
    """Remove prior broken/showcase visits so demo opens the fresh ones."""
    removed = []
    visits = session.get(f"{API}/visits?limit=100", headers=headers, timeout=30).json()
    items = visits.get("items") or []
    keep_ids = {c["id"] for c in clients_by_name.values()}
    for v in items:
        if v.get("client_id") not in keep_ids:
            continue
        vid = v["id"]
        print(f"delete old visit {vid[:8]}… for showcase client", flush=True)
        if DRY:
            removed.append(vid)
            continue
        r = session.delete(f"{API}/visits/{vid}", headers=headers, timeout=60)
        print(f"  -> {r.status_code}", flush=True)
        if r.status_code in (200, 204):
            removed.append(vid)
    return removed


def main() -> int:
    session = requests.Session()
    token = login(session)
    headers = {"Authorization": f"Bearer {token}"}

    clients = session.get(f"{API}/clients", headers=headers, timeout=30).json()
    report: dict = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "api": API,
        "dry_run": DRY,
        "before_client_count": len(clients),
    }

    if not SKIP_CLEAN:
        report["deleted_clients"] = delete_junk(session, headers, clients)
        clients = session.get(f"{API}/clients", headers=headers, timeout=30).json()
    else:
        report["deleted_clients"] = []

    by_name = {c["full_name"]: c for c in clients}
    missing = sorted(KEEP_NAMES - set(by_name))
    if missing:
        print(f"ERROR missing showcase clients: {missing}", flush=True)
        report["error"] = f"missing {missing}"
        OUT.write_text(json.dumps(report, indent=2))
        return 1

    if not SKIP_UPLOAD:
        report["deleted_showcase_visits"] = delete_old_showcase_visits(session, headers, by_name)

        if not INTAKE_MP3.exists():
            print(f"missing intake mp3 {INTAKE_MP3}", flush=True)
            return 1
        if not INTERVIEW_MP3.exists():
            print(f"missing interview mp3 {INTERVIEW_MP3}", flush=True)
            return 1

        # Accuracy test: every showcase client gets a REAL recorded assessment
        # from one of the two production MP3s (no fake short transcripts).
        mp3_assignments = [
            ("Eleanor Whitfield", INTAKE_MP3),
            ("Harold Jensen", INTERVIEW_MP3),
            ("Rosa Delgado", INTAKE_MP3),
            ("Robert Calloway", INTERVIEW_MP3),
            ("Margaret Okafor", INTAKE_MP3),
        ]
        runs = []
        for name, path in mp3_assignments:
            runs.append(
                upload_audio(
                    session,
                    headers,
                    client_id=by_name[name]["id"],
                    client_name=name,
                    path=path,
                )
            )
        report["runs"] = runs
        report["mp3_assignments"] = [
            {"client": n, "file": p.name} for n, p in mp3_assignments
        ]

    clients = session.get(f"{API}/clients", headers=headers, timeout=30).json()
    report["after_client_count"] = len(clients)
    report["showcase_clients"] = [c["full_name"] for c in clients if c["full_name"] in KEEP_NAMES]
    OUT.write_text(json.dumps(report, indent=2, default=str))
    print(f"wrote {OUT}", flush=True)

    fails = [r for r in report.get("runs", []) if not r.get("dry_run") and not r.get("success")]
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
