#!/usr/bin/env python3
"""
50-state (+DC) assessment readiness test.

Phase 1 — structural validation of STATE_RULES (free, instant):
  every jurisdiction has all required fields, valid consent type,
  and a non-empty LLM prompt block.

Phase 2 — real contract analysis per state (LLM calls):
  runs the production contract-extraction step
  (LLMService.analyze_transcript_for_contract) against a realistic
  assessment transcript for EVERY state, verifying each state's rules
  inject correctly and a usable contract payload comes back.

Usage:
  python3 scripts/test_all_states.py            # phase 1 only
  python3 scripts/test_all_states.py --llm      # phases 1 + 2
  python3 scripts/test_all_states.py --llm --states FL,CA,NY
"""
import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "worker"))

# Load .env for ANTHROPIC_API_KEY
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

from libs.state_rules import (  # noqa: E402
    STATE_RULES,
    TWO_PARTY_CONSENT_STATES,
    get_recording_consent,
    get_state_rules_for_prompt,
)

REQUIRED_FIELDS = [
    "name", "medicaid_program", "hcbs_waivers", "assessment_tool",
    "assessment_requirements", "reassessment_frequency", "recording_consent",
    "licensing", "billing_codes", "key_regulations", "special_requirements",
]

ALL_JURISDICTIONS = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI",
    "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
    "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
    "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
}

TRANSCRIPT = """
Speaker 0: Good morning Mrs Whitfield, I'm Maria from Sunrise Home Care. I'm here to do your care assessment today. How are you feeling?
Speaker 1: Good morning. I'm doing alright, though my memory has been giving me some trouble lately, and I get a bit unsteady on the stairs.
Speaker 0: I understand. Let's talk about your daily routine. Do you need help with bathing or getting dressed in the morning?
Speaker 1: I can dress myself mostly, but I do need someone nearby when I bathe. I'm afraid of slipping. And I sometimes forget whether I took my pills.
Speaker 0: Okay, so we'll plan for bathing assistance and medication reminders twice a day. What about meals? Are you able to cook for yourself?
Speaker 1: My daughter brings groceries, but cooking is hard now. I left the stove on twice last month. I'd feel safer if someone helped with lunch and dinner.
Speaker 0: That's very helpful to know. We'll include meal preparation for lunch and dinner, five days a week. Do you use a walker or cane when you move around the house?
Speaker 1: I have a walker for outside, but inside I hold onto the furniture. The doctor said I should use it indoors too after my fall in January.
Speaker 0: I'll note fall risk and mobility assistance. We'll also do light housekeeping and laundry weekly. Based on what we discussed, I'm recommending personal care four hours daily, seven days a week, with medication reminders, bathing assistance, meal preparation, and companionship. Does that sound right to you?
Speaker 1: Yes, that sounds like exactly what I need. Thank you Maria. Will the same caregiver come each day?
Speaker 0: We'll assign a primary caregiver with a backup, so you'll always see a familiar face. I'll have the service agreement ready for you and your daughter to review today.
""".strip()

CLIENT_INFO = {
    "full_name": "Eleanor Whitfield",
    "date_of_birth": "1941-03-22",
    "primary_diagnosis": "Dementia, early stage",
    "care_level": "HIGH",
    "insurance_type": "medicare",
}


def phase1() -> bool:
    print(f"=== Phase 1: structural validation of {len(STATE_RULES)} jurisdictions ===")
    failures = []

    missing = ALL_JURISDICTIONS - set(STATE_RULES)
    extra = set(STATE_RULES) - ALL_JURISDICTIONS
    if missing:
        failures.append(f"missing jurisdictions: {sorted(missing)}")
    if extra:
        failures.append(f"unexpected jurisdictions: {sorted(extra)}")

    for code, rules in sorted(STATE_RULES.items()):
        for field in REQUIRED_FIELDS:
            value = rules.get(field)
            if not value or not str(value).strip():
                failures.append(f"{code}: missing/empty field '{field}'")

        consent = get_recording_consent(code)
        declared = rules.get("recording_consent", "")
        if code in TWO_PARTY_CONSENT_STATES and "two-party" not in consent:
            failures.append(f"{code}: in TWO_PARTY set but consent lookup says '{consent}'")
        if "two-party" in declared and "two-party" not in consent and code != "OR":
            failures.append(f"{code}: rules say '{declared}' but lookup says '{consent}'")

        prompt = get_state_rules_for_prompt(code)
        if rules["name"] not in prompt or rules["billing_codes"] not in prompt:
            failures.append(f"{code}: prompt block missing name or billing codes")

    if failures:
        print(f"FAIL — {len(failures)} problems:")
        for f in failures:
            print(f"  - {f}")
        return False
    print(f"PASS — all {len(STATE_RULES)} jurisdictions structurally valid "
          f"({len(TWO_PARTY_CONSENT_STATES)} two-party consent states + OR mixed)")
    return True


def run_state(code: str) -> tuple[str, str, str]:
    """Returns (code, PASS/FAIL, detail)."""
    from libs.llm import LLMService
    svc = LLMService(model="claude-sonnet-4-20250514")
    try:
        result = svc.analyze_transcript_for_contract(
            TRANSCRIPT, CLIENT_INFO, agency_state=code,
        )
        if not isinstance(result, dict) or not result:
            return code, "FAIL", "empty/non-dict result"

        text = json.dumps(result).lower()
        problems = []
        if "error" in result:
            problems.append(f"error key: {result['error']}")
        # The contract payload should reflect the care discussed
        for needle in ("bath", "meal", "medication"):
            if needle not in text:
                problems.append(f"'{needle}' missing from extraction")
        if problems:
            return code, "FAIL", "; ".join(problems)
        return code, "PASS", f"{len(json.dumps(result))} bytes extracted"
    except Exception as e:  # noqa: BLE001
        return code, "FAIL", f"{type(e).__name__}: {e}"


def phase2(states: list[str]) -> bool:
    print(f"\n=== Phase 2: LLM contract analysis for {len(states)} states ===")
    results = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(run_state, code): code for code in states}
        done = 0
        for fut in as_completed(futures):
            code, status, detail = fut.result()
            results[code] = (status, detail)
            done += 1
            print(f"[{done:2}/{len(states)}] {code}: {status} — {detail}", flush=True)

    failed = {c: d for c, (s, d) in results.items() if s != "PASS"}
    print(f"\n{len(results) - len(failed)}/{len(results)} states passed")
    if failed:
        print("FAILED STATES:")
        for code, detail in sorted(failed.items()):
            print(f"  {code}: {detail}")
        return False
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--llm", action="store_true", help="run LLM contract analysis per state")
    parser.add_argument("--states", help="comma-separated subset, e.g. FL,CA,NY")
    args = parser.parse_args()

    ok = phase1()
    if args.llm:
        if args.states:
            targets = [s.strip().upper() for s in args.states.split(",")]
        else:
            targets = sorted(STATE_RULES)
        ok = phase2(targets) and ok

    sys.exit(0 if ok else 1)
