#!/usr/bin/env python3
"""Build the first-100 hand-research worksheet for manual outbound.

Implements the targeting step of marketing/outbound/MANUAL_OUTBOUND_PLAYBOOK.md:
pick WHO to research by hand before any messaging work.

Tier 1: the hand-collected NE/IA agencies in data/home_care_agency_leads.json
        (real websites, several personal-name emails). Some received a generic
        blast in July 2026; they have never received a personal email, so they
        stay in. Check the CRM before sending to anyone who already replied.
Tier 2: proprietary (non-government, non-franchise) agencies from the CMS file
        in nearby target states, interleaved round-robin by state so no single
        state dominates, filling the list to 100.

Output: marketing/outbound/first-100-worksheet.csv with blank research columns
to fill in during the 15-minute homework per prospect. Deterministic: same
inputs produce the same list.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEADS = ROOT / "data" / "home_care_agency_leads.json"
CMS = ROOT / "scripts" / "data" / "cms_agencies_full.json"
OUT = ROOT / "marketing" / "outbound" / "first-100-worksheet.csv"

TARGET = 100
# Local first, then the surrounding region.
TARGET_STATES = ["NE", "IA", "SD", "KS", "MO", "MN"]
# National franchises usually have corporate-mandated software; weak fit.
FRANCHISE_HINTS = (
    "home instead",
    "senior helpers",
    "comfort keepers",
    "right at home",
    "visiting angels",
    "brightstar",
    "interim healthcare",
    "amedisys",
    "bayada",
)

RESEARCH_COLUMNS = [
    "owner_name",
    "owner_source",
    "founded_or_npi_date",
    "personal_detail",
    "pain_hypothesis",
    "angle",
    "status",
]


def tier1() -> list[dict]:
    rows = []
    for a in json.loads(LEADS.read_text()):
        rows.append(
            {
                "tier": 1,
                "provider_name": a.get("provider_name", ""),
                "city": a.get("city", ""),
                "state": a.get("state", ""),
                "phone": "",
                "website": a.get("website", ""),
                "contact_email": a.get("contact_email", ""),
                "source": a.get("source", "hand-collected"),
            }
        )
    return rows


def tier2(exclude_names: set[str], needed: int) -> list[dict]:
    agencies = json.loads(CMS.read_text())
    by_state: dict[str, list[dict]] = {s: [] for s in TARGET_STATES}
    for a in agencies:
        state = a.get("state", "")
        name = (a.get("provider_name") or "").strip()
        ownership = (a.get("ownership_type") or "").lower()
        if state not in by_state or not name:
            continue
        if name.lower() in exclude_names:
            continue
        if "proprietary" not in ownership:
            continue
        if any(h in name.lower() for h in FRANCHISE_HINTS):
            continue
        by_state[state].append(a)

    for s in by_state:
        by_state[s].sort(key=lambda a: (a.get("city") or "", a.get("provider_name") or ""))

    rows: list[dict] = []
    idx = {s: 0 for s in TARGET_STATES}
    while len(rows) < needed:
        progressed = False
        for s in TARGET_STATES:
            if len(rows) >= needed:
                break
            pool = by_state[s]
            if idx[s] < len(pool):
                a = pool[idx[s]]
                idx[s] += 1
                progressed = True
                rows.append(
                    {
                        "tier": 2,
                        "provider_name": a.get("provider_name", ""),
                        "city": a.get("city", ""),
                        "state": s,
                        "phone": a.get("phone", ""),
                        "website": "",
                        "contact_email": "",
                        "source": f"CMS ({a.get('ownership_type', '')})",
                    }
                )
        if not progressed:
            break
    return rows


def main() -> None:
    t1 = tier1()
    exclude = {r["provider_name"].strip().lower() for r in t1}
    t2 = tier2(exclude, TARGET - len(t1))
    rows = t1 + t2

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fields = ["rank", "tier", "provider_name", "city", "state", "phone", "website", "contact_email", "source"] + RESEARCH_COLUMNS
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for i, r in enumerate(rows, 1):
            r["rank"] = i
            for c in RESEARCH_COLUMNS:
                r.setdefault(c, "")
            w.writerow(r)

    states = {}
    for r in rows:
        states[r["state"]] = states.get(r["state"], 0) + 1
    print(f"Wrote {len(rows)} prospects to {OUT.relative_to(ROOT)}")
    print(f"  Tier 1 (hand-collected): {len(t1)}, Tier 2 (CMS): {len(t2)}")
    print("  By state:", ", ".join(f"{s}={n}" for s, n in sorted(states.items())))


if __name__ == "__main__":
    main()
