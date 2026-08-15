#!/usr/bin/env python3
"""Offline pipeline stress harness. No paid APIs.

Unsets ANTHROPIC / Deepgram keys for this process, then runs N concurrent
iterations that try to break classification, billing, contract facts, and
template rendering with real fixtures + adversarial junk.

Usage:
  .venv311/bin/python scripts/sandbox/stress_pipeline_offline.py
  PALM_STRESS_N=50 .venv311/bin/python scripts/sandbox/stress_pipeline_offline.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "scripts" / "sandbox" / "assessment-runs"
N = int(os.environ.get("PALM_STRESS_N", "50"))
WORKERS = int(os.environ.get("PALM_STRESS_WORKERS", "12"))

# Guarantee zero paid LLM/ASR spend from this process.
for key in (
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "DEEPGRAM_API_KEY",
    "ASSEMBLYAI_API_KEY",
):
    os.environ.pop(key, None)

sys.path.insert(0, str(ROOT / "apps" / "worker"))

from libs.billing import (  # noqa: E402
    filter_grounded_claude_services,
    generate_billables_from_transcript,
)
from libs.contract_facts import (  # noqa: E402
    clip_client_field,
    extract_declined_services,
    extract_stated_hourly_rate,
    extract_stated_weekly_hours,
    merge_declined_services,
    prefer_private_pay_rate,
    sanitize_identified_services,
)
from libs.contract_template import generate_contract_from_template  # noqa: E402
from libs.pipeline_efficiency import (  # noqa: E402
    classify_recording,
    empty_out_of_scope_assessment,
    heuristic_conversation_kind,
    trim_transcript_for_llm,
)


def _load(name: str) -> str:
    return (RUNS / name).read_text(encoding="utf-8", errors="replace")


INTAKE = _load("assess1_transcript.txt") if (RUNS / "assess1_transcript.txt").exists() else ""
CLINIC = _load("assess2_transcript.txt") if (RUNS / "assess2_transcript.txt").exists() else ""


def _segments(text: str, chunk: int = 220) -> List[Dict[str, Any]]:
    words = text.split()
    if not words:
        return []
    out = []
    t = 0
    for i in range(0, len(words), chunk):
        piece = " ".join(words[i : i + chunk])
        out.append(
            {
                "id": str(i),
                "start_ms": t,
                "end_ms": t + 30000,
                "text": piece,
                "speaker_label": f"SPEAKER_{i % 3}",
            }
        )
        t += 30000
    return out


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def scenario_intake_facts() -> Dict[str, Any]:
    _assert(INTAKE, "missing assess1 transcript fixture")
    kind = classify_recording(INTAKE)
    _assert(kind == "training_with_embedded_intake", f"intake kind={kind}")
    rate = extract_stated_hourly_rate(INTAKE)
    hours = extract_stated_weekly_hours(INTAKE)
    declined = extract_declined_services(INTAKE)
    _assert(rate == 18.0, f"rate={rate}")
    _assert(hours == 52.5, f"hours={hours}")
    _assert(any("bath" in d["name"].lower() for d in declined), f"declined={declined}")

    # Mock Claude path: grounded evidence only.
    fake = [
        {
            "category": "COMPANIONSHIP",
            "task": "Companionship",
            "evidence": "provide the companionship",
            "priority": "HIGH",
            "frequency": "Monday through Friday",
        },
        {
            "category": "SUPERVISION",
            "task": "Supervision",
            "evidence": "we will supervise the intake process",
            "priority": "MEDIUM",
            "frequency": "As needed",
        },
        {
            "category": "COMPANIONSHIP",
            "task": "Fake",
            "evidence": "totally invented never spoken quote xyz",
            "priority": "HIGH",
            "frequency": "Daily",
        },
    ]
    kept = filter_grounded_claude_services(fake, INTAKE)
    cats = [s["category"] for s in kept]
    _assert("COMPANIONSHIP" in cats, f"kept={kept}")
    _assert("SUPERVISION" not in cats, f"kept={kept}")
    _assert(len(kept) == 1, f"kept count={len(kept)}")

    billables = generate_billables_from_transcript(
        _segments(INTAKE),
        0,
        3_600_000,
        use_llm=False,
        conversation_kind=kind,
    )
    for b in billables:
        _assert(b.get("is_recommendation") is True, f"not recommendation: {b}")
        _assert(b.get("is_flagged") is False, f"flagged denied: {b}")

    services = sanitize_identified_services(
        [
            {
                "name": "Companion Care",
                "evidence": "provide the companionship",
                "frequency": "Monday through Friday",
            },
            {"name": "Fake", "evidence": "client needs daily assistance"},
        ],
        INTAKE,
    )
    _assert(len(services) == 1, f"services={services}")

    contract = generate_contract_from_template(
        {
            "hourly_rate": rate,
            "weekly_hours": hours,
            "services": services,
            "declined_services": merge_declined_services(
                declined,
                [{"name": "Maid / deep cleaning", "evidence": "not a maid service"}],
            ),
            "schedule": {
                "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "preferred_times": "8:30 AM to 7:00 PM",
                "care_need_level": "MODERATE",
            },
        },
        {"full_name": "Stress Intake Client"},
        assessment_data={"client_profile": {"secondary_conditions": "diabetes"}},
    )
    _assert("18.00" in contract, "missing rate in contract")
    _assert("52.5" in contract, "missing hours in contract")
    _assert("Companion Care" in contract, "missing service")
    _assert("DECLINED" in contract.upper() or "not included" in contract.lower(), "missing declined")
    _assert("diabetes" in contract, "secondary conditions mangled")
    _assert("d, i, a, b, e, t, e, s" not in contract, "character-joined conditions")
    return {"kind": kind, "rate": rate, "hours": hours, "billables": len(billables)}


def scenario_clinic_short_circuit() -> Dict[str, Any]:
    _assert(CLINIC, "missing assess2 transcript fixture")
    kind = classify_recording(CLINIC)
    _assert(kind == "out_of_scope", f"clinic kind={kind}")
    data = empty_out_of_scope_assessment(CLINIC)
    _assert(data["quoted_hourly_rate"] is None, "oos leaked rate")
    _assert(data["services_identified"] == [], "oos leaked services")
    rate = prefer_private_pay_rate(
        data.get("quoted_hourly_rate"),
        None,
        None,
        allow_system_default=False,
    )
    _assert(rate is None, f"oos prefer rate={rate}")
    billables = generate_billables_from_transcript(
        _segments(CLINIC),
        0,
        1_800_000,
        use_llm=False,
        conversation_kind=kind,
    )
    _assert(billables == [], f"oos must emit zero billables, got {billables}")
    contract = generate_contract_from_template(
        {
            "hourly_rate": 0,
            "weekly_hours": 0,
            "services": [],
            "declined_services": [],
            "schedule": {},
        },
        {"full_name": "Clinic Demo"},
        assessment_data=data,
    )
    _assert("0.00" in contract, "oos contract should show zero rate")
    return {"kind": kind, "billables": len(billables)}


def scenario_adversarial_junk() -> Dict[str, Any]:
    junk_cases = [
        "",
        "\x00\x01\x02",
        "🚀" * 5000,
        "A" * 250_000,
        None,  # type: ignore
    ]
    for junk in junk_cases:
        text = junk if isinstance(junk, str) else ""
        classify_recording(text)
        heuristic_conversation_kind(text)
        extract_stated_hourly_rate(text)
        extract_stated_weekly_hours(text)
        extract_declined_services(text)
        trim_transcript_for_llm(text, max_chars=1000)
        generate_billables_from_transcript(
            [{"id": "1", "start_ms": 0, "end_ms": 1, "text": junk}],
            0,
            1,
            use_llm=False,
            conversation_kind="home_care_intake",
        )
        generate_contract_from_template(
            {
                "hourly_rate": None,
                "weekly_hours": "",
                "services": [None, "Companionship", {"name": "Care", "frequency": None}],
                "schedule": {"preferred_days": "Mon-Fri", "special_requirements": "falls"},
            },
            {"full_name": "Junk"},
            assessment_data={
                "client_profile": {
                    "secondary_conditions": "COPD",
                    "risk_factors": "wandering",
                },
                "special_requirements": "night checks",
                "safety_concerns": "falls",
            },
        )
    clip_client_field("Independent — long mobility prose " + ("x" * 200), "mobility_status")
    sanitize_identified_services([None, "x", {"evidence": ""}], "hello")
    merge_declined_services(["Bathing"], [{"name": "Bathing assistance"}])
    return {"junk_cases": len(junk_cases)}


SCENARIOS: List[Tuple[str, Callable[[], Dict[str, Any]]]] = [
    ("intake_facts", scenario_intake_facts),
    ("clinic_short_circuit", scenario_clinic_short_circuit),
    ("adversarial_junk", scenario_adversarial_junk),
]


def run_one(i: int) -> Dict[str, Any]:
    t0 = time.monotonic()
    results: Dict[str, Any] = {"i": i, "ok": True, "scenarios": {}}
    try:
        for name, fn in SCENARIOS:
            results["scenarios"][name] = fn()
    except Exception as e:
        results["ok"] = False
        results["error"] = f"{type(e).__name__}: {e}"
        results["trace"] = traceback.format_exc(limit=8)
    results["ms"] = int((time.monotonic() - t0) * 1000)
    return results


def main() -> int:
    print(
        f"offline stress N={N} workers={WORKERS} "
        f"(ANTHROPIC_API_KEY unset={not bool(os.environ.get('ANTHROPIC_API_KEY'))})",
        flush=True,
    )
    if not INTAKE or not CLINIC:
        print("Missing assess1/assess2 transcript fixtures under scripts/sandbox/assessment-runs/")
        return 1

    t0 = time.monotonic()
    outcomes: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = [pool.submit(run_one, i) for i in range(N)]
        for fut in as_completed(futs):
            outcomes.append(fut.result())
            if len(outcomes) % 10 == 0:
                ok_so_far = sum(1 for o in outcomes if o["ok"])
                print(f"  progress {len(outcomes)}/{N} ok={ok_so_far}", flush=True)

    outcomes.sort(key=lambda o: o["i"])
    ok = sum(1 for o in outcomes if o["ok"])
    elapsed = round(time.monotonic() - t0, 2)
    fails = [o for o in outcomes if not o["ok"]]
    lat = sorted(o["ms"] for o in outcomes)
    summary = {
        "n": N,
        "ok": ok,
        "failed": len(fails),
        "elapsed_sec": elapsed,
        "p50_ms": lat[len(lat) // 2] if lat else None,
        "p95_ms": lat[int(len(lat) * 0.95) - 1] if lat else None,
        "max_ms": max(lat) if lat else None,
        "failures": [
            {"i": f["i"], "error": f.get("error"), "trace": f.get("trace")} for f in fails[:10]
        ],
        "sample_ok": next((o["scenarios"] for o in outcomes if o["ok"]), None),
    }
    dest = ROOT / "scripts" / "sandbox" / "stress_pipeline_offline_last.json"
    dest.write_text(json.dumps(summary, indent=2))
    print(json.dumps({k: summary[k] for k in summary if k != "failures"}, indent=2), flush=True)
    if fails:
        print(f"\nFIRST FAILURES ({len(fails)}):", flush=True)
        for f in fails[:5]:
            print(f"  [{f['i']}] {f.get('error')}", flush=True)
            if f.get("trace"):
                print(f.get("trace"), flush=True)
    print(f"wrote {dest}", flush=True)
    return 0 if ok == N else 1


if __name__ == "__main__":
    sys.exit(main())
