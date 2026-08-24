#!/usr/bin/env python3
"""Pre-demo health check for demo@agency.com (Comfort Keepers and similar demos).

Verifies login, subscription access, client load speed, and key endpoints.
Does not print secrets.

Usage:
  python3 scripts/sandbox/comfort_keepers_demo_check.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
API = os.environ.get("PALM_STRESS_API", "https://api-production-a0a2.up.railway.app").rstrip("/")
EMAIL = os.environ.get("DEMO_AGENCY_EMAIL", "demo@agency.com")
PASSWORD = os.environ.get("DEMO_AGENCY_PASSWORD", "demo1234")
OUT = ROOT / "scripts" / "sandbox" / "comfort_keepers_demo_check.json"


def login(session: requests.Session) -> str:
    r = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def timed_get(session: requests.Session, path: str, headers: dict) -> tuple[int, float, dict | list | None]:
    t0 = time.monotonic()
    r = session.get(f"{API}{path}", headers=headers, timeout=60)
    elapsed = round(time.monotonic() - t0, 3)
    body = None
    if r.headers.get("content-type", "").startswith("application/json"):
        try:
            body = r.json()
        except Exception:
            body = None
    return r.status_code, elapsed, body


def main() -> int:
    session = requests.Session()
    report: dict = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "api": API,
        "email": EMAIL,
        "checks": [],
        "ok": True,
    }

    try:
        token = login(session)
        report["login"] = "ok"
    except Exception as exc:
        report["login"] = f"failed: {exc}"
        report["ok"] = False
        OUT.write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))
        return 1

    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        ("/auth/me", "user profile"),
        ("/clients", "clients list"),
        ("/visits/usage", "subscription usage"),
        ("/billing/subscription", "billing"),
        ("/visits?page_size=20", "visits list"),
    ]

    for path, label in endpoints:
        code, elapsed, body = timed_get(session, path, headers)
        entry = {"label": label, "path": path, "status": code, "seconds": elapsed}
        if path == "/visits/usage" and isinstance(body, dict):
            entry["upgrade_required"] = body.get("upgrade_required")
            entry["has_paid_plan"] = body.get("has_paid_plan")
            if body.get("upgrade_required"):
                report["ok"] = False
        if path == "/clients" and isinstance(body, list):
            entry["client_count"] = len(body)
            if body:
                cid = body[0]["id"]
                _, detail_sec, _ = timed_get(session, f"/clients/{cid}", headers)
                entry["sample_client_detail_seconds"] = detail_sec
        if code >= 400:
            report["ok"] = False
        report["checks"].append(entry)

    # Find a visit with completed artifacts for demo walkthrough
    _, _, visits_body = timed_get(session, "/visits?status=pending_review&page_size=5", headers)
    showcase = []
    if isinstance(visits_body, dict):
        for v in visits_body.get("items") or []:
            vid = v.get("id")
            if not vid:
                continue
            note_code, _, _ = timed_get(session, f"/visits/{vid}/note", headers)
            contract_code, _, _ = timed_get(session, f"/visits/{vid}/contract", headers)
            bill_code, _, _ = timed_get(session, f"/visits/{vid}/billables", headers)
            showcase.append(
                {
                    "visit_id": vid,
                    "client": (v.get("client") or {}).get("full_name"),
                    "note": note_code,
                    "contract": contract_code,
                    "billables": bill_code,
                }
            )
    report["showcase_visits"] = showcase
    if not any(s["note"] == 200 and s["contract"] == 200 for s in showcase):
        report["ok"] = False
        report["warnings"] = ["No pending_review visit with note+contract ready for live walkthrough"]

    OUT.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
