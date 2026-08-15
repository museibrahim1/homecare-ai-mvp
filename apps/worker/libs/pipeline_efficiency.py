"""Pipeline efficiency helpers: classify, trim, and out-of-scope short circuits."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, Optional

from libs.contract_facts import extract_stated_hourly_rate, extract_stated_weekly_hours

logger = logging.getLogger(__name__)

VALID_KINDS = {
    "home_care_intake",
    "home_care_visit",
    "training_with_embedded_intake",
    "out_of_scope",
}


def trim_transcript_for_llm(text: str, max_chars: int = 50000) -> str:
    """Keep head and tail so long coaching intros still fit context cheaply."""
    if not text or len(text) <= max_chars:
        return text or ""
    head = int(max_chars * 0.6)
    tail = max_chars - head - 80
    return (
        text[:head]
        + "\n\n[... middle of conversation omitted for speed ...]\n\n"
        + text[-tail:]
    )


def heuristic_conversation_kind(text: str) -> Optional[str]:
    """Cheap local guess. Returns None when unsure so the LLM can decide."""
    if not text:
        return None
    sample = (text[:4000] + "\n" + text[-3000:]).lower()

    clinic_hits = sum(
        1
        for p in (
            r"\bdr\.?\s",
            r"\bdoctor\b",
            r"\bout of role\b",
            r"\bdiarrhea\b",
            r"\bcounseling\b",
            r"\birritable bowel\b",
            r"\bibs\b",
            r"\bphysical exam\b",
        )
        if re.search(p, sample)
    )
    home_hits = sum(
        1
        for p in (
            r"\bcaregiver\b",
            r"\bhome care\b",
            r"\bcompanionship\b",
            r"\ban hour\b",
            r"\bmonday through friday\b",
            r"\bservice agreement\b",
            r"\bintake\b",
        )
        if re.search(p, sample)
    )
    training_hits = sum(
        1
        for p in (
            r"\bcoach\b",
            r"\brole play\b",
            r"\brole-play\b",
            r"\bcoming to you live\b",
            r"\bshout out\b",
            r"\bmy clients\b",
        )
        if re.search(p, sample)
    )

    if clinic_hits >= 3 and home_hits <= 1:
        return "out_of_scope"
    if training_hits >= 2 and home_hits >= 2:
        return "training_with_embedded_intake"
    if home_hits >= 3 and clinic_hits <= 1:
        # Visit vs intake is harder; leave for LLM unless clearly visit tasks
        if re.search(r"\b(i assisted|helped (her|him|you) (with|to)|vital signs taken)\b", sample):
            return "home_care_visit"
        return "home_care_intake"
    return None


def classify_recording(transcript_text: str) -> str:
    """
    Classify the recording kind. Prefers a free heuristic, then a tiny Claude call.
    Defaults to home_care_intake when unknown so we do not skip real assessments.
    """
    guessed = heuristic_conversation_kind(transcript_text)
    if guessed:
        logger.info(f"Heuristic conversation_kind={guessed}")
        return guessed

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "home_care_intake"

    sample = trim_transcript_for_llm(transcript_text, max_chars=12000)
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key, timeout=45.0)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=120,
            temperature=0,
            system=(
                "Classify a recording for a home care agency app. "
                "Return ONLY JSON: {\"conversation_kind\": \"...\"}. "
                "Kinds: home_care_intake, home_care_visit, "
                "training_with_embedded_intake, out_of_scope."
            ),
            messages=[{"role": "user", "content": sample}],
        )
        raw = response.content[0].text.strip()
        if "```" in raw:
            m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if m:
                raw = m.group(1).strip()
        kind = (json.loads(raw).get("conversation_kind") or "").strip()
        if kind in VALID_KINDS:
            logger.info(f"LLM conversation_kind={kind}")
            return kind
    except Exception as e:
        logger.warning(f"Recording classify failed: {e}")

    return "home_care_intake"


def empty_out_of_scope_assessment(transcript_text: str) -> Dict[str, Any]:
    """Skip the heavy contract LLM when the recording is not home care."""
    quoted = extract_stated_hourly_rate(transcript_text)
    stated = extract_stated_weekly_hours(transcript_text)
    return {
        "conversation_kind": "out_of_scope",
        "used_fallback": False,
        "quoted_hourly_rate": quoted,
        "stated_weekly_hours": stated,
        "services_identified": [],
        "client_profile": {},
        "recommended_schedule": {
            "total_hours_per_week": float(stated or 0),
            "service_hours": [],
            "preferred_days": [],
            "preferred_times": "",
            "rationale": "Out of scope for home care documentation",
        },
        "eicna_assessment": {
            "care_need_level": "LOW",
            "rationale": "Recording is not a home care intake or visit",
            "risk_factors": [],
        },
        "safety_concerns": [],
        "special_requirements": [],
        "care_plan_goals": {},
        "client_condition_summary": (
            "This recording is outside home care scope. No home care services were extracted."
        ),
    }
