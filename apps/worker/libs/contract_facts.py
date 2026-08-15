"""Facts taken from the assessment transcript, not from LLM defaults.

Used by contract generation so a quoted rate or schedule in the conversation
wins over agency defaults and mock fallback services.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

PLACEHOLDER_EVIDENCE = {
    "client needs daily assistance",
    "multiple medications mentioned",
    "difficulty cooking safely",
    "unable to maintain home",
    "lives alone, needs monitoring",
}

HOUR_WORDS = {
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "noon": 12,
    "midnight": 0,
}

RATE_RE = re.compile(
    r"\$\s*(\d{1,3}(?:\.\d{1,2})?)\s*(?:an\s+hour|/hour|/hr|per\s+hour)",
    re.IGNORECASE,
)
WEEKDAY_SPAN_RE = re.compile(
    r"monday\s+(?:through|to)\s+friday|mon(?:day)?\s*[-/]\s*fri(?:day)?",
    re.IGNORECASE,
)
TIME_RANGE_RE = re.compile(
    r"\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s+"
    r"(?:to|until)\s+(?:about\s+)?"
    r"(\d{1,2}|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight)"
    r"(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?",
    re.IGNORECASE,
)


def _coerce_positive_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number <= 0:
        return None
    return number


def extract_stated_hourly_rate(text: str) -> Optional[float]:
    if not text:
        return None
    match = RATE_RE.search(text)
    if not match:
        return None
    rate = float(match.group(1))
    if rate < 8 or rate > 200:
        return None
    return rate


def _hour_to_minutes(hour: int, minute: int, ampm: Optional[str], *, is_end: bool, start_minutes: Optional[int]) -> int:
    ampm_l = (ampm or "").lower().replace(".", "")
    if ampm_l.startswith("p") and hour < 12:
        hour += 12
    elif ampm_l.startswith("a") and hour == 12:
        hour = 0
    elif not ampm_l:
        if is_end and start_minutes is not None:
            candidate = hour * 60 + minute
            if candidate <= start_minutes:
                hour += 12
        elif not is_end and 1 <= hour <= 11:
            pass
    return hour * 60 + minute


def _parse_hour_token(token: str) -> Optional[int]:
    token = token.lower()
    if token in HOUR_WORDS:
        return HOUR_WORDS[token]
    if token.isdigit():
        return int(token)
    return None


def extract_stated_weekly_hours(text: str) -> Optional[float]:
    if not text:
        return None
    if not WEEKDAY_SPAN_RE.search(text):
        return None

    matches = list(TIME_RANGE_RE.finditer(text))
    if not matches:
        return None
    match = matches[-1]
    start_hour = int(match.group(1))
    start_min = int(match.group(2) or 0)
    start_ampm = match.group(3)
    end_hour = _parse_hour_token(match.group(4))
    if end_hour is None:
        return None
    end_min = int(match.group(5) or 0)
    end_ampm = match.group(6)

    start_total = _hour_to_minutes(start_hour, start_min, start_ampm, is_end=False, start_minutes=None)
    end_total = _hour_to_minutes(end_hour, end_min, end_ampm, is_end=True, start_minutes=start_total)
    duration_min = end_total - start_total
    if duration_min < 60 or duration_min > 16 * 60:
        return None
    hours_per_day = duration_min / 60
    weekly = round(hours_per_day * 5, 1)
    if weekly < 5 or weekly > 80:
        return None
    return weekly


def prefer_private_pay_rate(
    quoted_rate: Optional[float],
    agency_private_pay: Optional[float],
    agency_default: Optional[float],
    care_need_level: str = "MODERATE",
    allow_system_default: bool = True,
) -> Optional[float]:
    quoted = _coerce_positive_float(quoted_rate)
    if quoted is not None and 8 <= quoted <= 200:
        return quoted
    agency_pp = _coerce_positive_float(agency_private_pay)
    if agency_pp is not None:
        return agency_pp
    agency_df = _coerce_positive_float(agency_default)
    if agency_df is not None:
        return agency_df
    if not allow_system_default:
        return None
    return {"HIGH": 28.0, "MODERATE": 24.0, "LOW": 20.0}.get(care_need_level, 24.0)


def sanitize_identified_services(
    services: Optional[List[Dict[str, Any]]],
    transcript_text: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if not services:
        return []
    cleaned: List[Dict[str, Any]] = []
    transcript_norm = re.sub(r"\s+", " ", (transcript_text or "").lower()).strip()
    for svc in services:
        if not isinstance(svc, dict):
            continue
        evidence = str(svc.get("evidence") or "").strip()
        evidence_l = evidence.lower()
        if not evidence or evidence_l in PLACEHOLDER_EVIDENCE:
            continue
        if transcript_norm:
            ev_norm = re.sub(r"\s+", " ", evidence_l)
            if len(ev_norm) >= 12 and ev_norm not in transcript_norm:
                # Allow long quotes if a substantial chunk appears
                chunk_ok = False
                if len(ev_norm) >= 40:
                    chunk_ok = ev_norm[:40] in transcript_norm or ev_norm[-40:] in transcript_norm
                if not chunk_ok:
                    continue
        cleaned.append(svc)
    return cleaned


# Matches apps/api Client column lengths. Long LLM prose must be clipped.
CLIENT_FIELD_LIMITS = {
    "primary_diagnosis": 255,
    "mobility_status": 100,
    "cognitive_status": 100,
    "living_situation": 100,
    "care_level": 50,
    "preferred_days": 255,
    "preferred_times": 255,
}


def clip_client_field(value: Any, field: str) -> Optional[str]:
    """Clip assessment text to the Client column limit.

    Prefers the short label before an em dash or hyphen when present, so
    "Independent — can do everything herself" becomes "Independent".
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    limit = CLIENT_FIELD_LIMITS.get(field)
    if not limit:
        return text
    if len(text) <= limit:
        return text
    for sep in (" — ", " – ", " - ", "—", "–"):
        if sep in text:
            head = text.split(sep, 1)[0].strip()
            if 0 < len(head) <= limit:
                return head
    return text[: limit - 1].rstrip() + "…"


_BATHING_DECLINE_RE = re.compile(
    r"("
    r"don'?t\s+want\s+anybody\s+bathing\s+me|"
    r"do\s+not\s+want\s+(anybody|anyone)\s+bathing|"
    r"i\s+can\s+wash\s+myself|"
    r"i\s+can\s+bathe\s+myself|"
    r"you\s+can\s+bathe\s+yourself|"
    r"no\s+(bathing|personal\s+care)|"
    r"doesn'?t\s+want\s+(help\s+with\s+)?(bathing|showering)|"
    r"declined\s+(bathing|personal\s+care|shower)"
    r")",
    re.IGNORECASE,
)


def extract_declined_services(transcript_text: str) -> List[Dict[str, Any]]:
    """Heuristic declined services from the transcript (bathing first)."""
    if not transcript_text:
        return []
    declined: List[Dict[str, Any]] = []
    match = _BATHING_DECLINE_RE.search(transcript_text)
    if match:
        start = max(0, match.start() - 40)
        end = min(len(transcript_text), match.end() + 40)
        snippet = re.sub(r"\s+", " ", transcript_text[start:end]).strip()
        declined.append(
            {
                "name": "Bathing assistance",
                "evidence": snippet[:200],
            }
        )
    return declined


def merge_declined_services(
    *groups: Optional[List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Merge declined service lists, keeping the first evidence per name family."""
    merged: List[Dict[str, Any]] = []
    seen = set()

    def _family(name: str) -> str:
        n = name.lower()
        if any(k in n for k in ("bath", "shower", "hygiene", "personal care")):
            return "bathing"
        if any(k in n for k in ("maid", "deep clean", "housekeep")):
            return "maid_deep_clean"
        return n

    for group in groups:
        if not group:
            continue
        for item in group:
            if isinstance(item, str):
                name = item.strip()
                evidence = ""
            elif isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                evidence = str(item.get("evidence") or "").strip()
            else:
                continue
            if not name:
                continue
            key = _family(name)
            if key in seen:
                continue
            seen.add(key)
            merged.append({"name": name, "evidence": evidence})
    return merged
