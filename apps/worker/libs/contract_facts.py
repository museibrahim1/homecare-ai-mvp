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
HOURS_PER_WEEK_RE = re.compile(
    r"(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?)\s*(?:a|per|/)\s*week",
    re.IGNORECASE,
)
HOURS_PER_DAY_RE = re.compile(
    r"(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?)\s*(?:a|per|/)\s*day",
    re.IGNORECASE,
)
DAYS_PER_WEEK_RE = re.compile(
    r"(\d)\s*days?\s*(?:a|per|/)\s*week",
    re.IGNORECASE,
)
DAY_NAME_RE = re.compile(
    r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b",
    re.IGNORECASE,
)

_TBD_PHRASE_RE = re.compile(
    r"to\s+be\s+determined|tbd|following\s+full\s+assessment|"
    r"prior\s+authorization|cannot\s+be\s+recommended|"
    r"incomplete\s+assessment|full\s+in[- ]person",
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


def _count_named_weekdays(text: str) -> int:
    found = set()
    aliases = {
        "mon": "monday", "tue": "tuesday", "tues": "tuesday", "wed": "wednesday",
        "thu": "thursday", "thur": "thursday", "thurs": "thursday",
        "fri": "friday", "sat": "saturday", "sun": "sunday",
    }
    for match in DAY_NAME_RE.finditer(text or ""):
        raw = match.group(1).lower()
        found.add(aliases.get(raw, raw))
    return len(found)


def extract_stated_weekly_hours(text: str) -> Optional[float]:
    """Pull weekly hours from spoken schedule language in the transcript.

    Supports:
    - Explicit "10 hours a week" / "12 hrs/week"
    - "4 hours a day" × "5 days a week" (or Mon–Fri / named days)
    - Monday through Friday + time range (e.g. 8:30 to 7)
    """
    if not text:
        return None

    explicit = HOURS_PER_WEEK_RE.search(text)
    if explicit:
        weekly = float(explicit.group(1))
        if 5 <= weekly <= 80:
            return weekly

    per_day = HOURS_PER_DAY_RE.search(text)
    if per_day:
        hours_per_day = float(per_day.group(1))
        days = None
        days_match = DAYS_PER_WEEK_RE.search(text)
        if days_match:
            days = int(days_match.group(1))
        elif WEEKDAY_SPAN_RE.search(text):
            days = 5
        else:
            named = _count_named_weekdays(text)
            if named >= 2:
                days = named
        if days and 1 <= days <= 7 and 1 <= hours_per_day <= 16:
            weekly = round(hours_per_day * days, 1)
            if 5 <= weekly <= 80:
                return weekly

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


def _is_tbd_text(value: Any) -> bool:
    if value is None:
        return False
    text = str(value).strip()
    if not text:
        return False
    return bool(_TBD_PHRASE_RE.search(text))


def sanitize_recommended_schedule(
    schedule: Optional[Dict[str, Any]],
    *,
    stated_weekly_hours: Optional[float] = None,
) -> Dict[str, Any]:
    """Drop invented TBD / 0-hr placeholder schedule rows.

    When the patient stated hours, keep those and clear LLM filler that says
    schedule cannot be set until a formal assessment.
    """
    cleaned: Dict[str, Any] = dict(schedule or {})
    raw_rows = cleaned.get("service_hours") or []
    kept_rows: List[Dict[str, Any]] = []
    if isinstance(raw_rows, list):
        for row in raw_rows:
            if not isinstance(row, dict):
                continue
            name = str(row.get("service") or row.get("name") or "")
            level = str(row.get("need_level") or "")
            hours = _coerce_positive_float(row.get("hours_per_week")) or 0.0
            if _is_tbd_text(name) or _is_tbd_text(level) or _is_tbd_text(row.get("rationale")):
                continue
            if hours <= 0 and (_is_tbd_text(name) or "to be determined" in name.lower()):
                continue
            if hours <= 0:
                continue
            kept_rows.append(row)
    cleaned["service_hours"] = kept_rows

    freq = cleaned.get("frequency")
    if _is_tbd_text(freq):
        cleaned["frequency"] = ""
    rationale = cleaned.get("rationale")
    if _is_tbd_text(rationale):
        cleaned["rationale"] = ""

    if stated_weekly_hours and stated_weekly_hours > 0:
        cleaned["total_hours_per_week"] = float(stated_weekly_hours)
        if not cleaned.get("frequency"):
            cleaned["frequency"] = f"{stated_weekly_hours:g} hours per week (stated in assessment)"
        if not kept_rows:
            cleaned["service_hours"] = [{
                "service": "Stated care schedule",
                "need_level": "stated",
                "hours_per_week": float(stated_weekly_hours),
                "rationale": "Hours taken from the schedule spoken during the assessment",
            }]
    elif kept_rows:
        total = sum(float(r.get("hours_per_week") or 0) for r in kept_rows)
        if total > 0:
            cleaned["total_hours_per_week"] = total

    return cleaned


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


_IN_SCOPE_KINDS = {
    "home_care_intake",
    "home_care_visit",
    "training_with_embedded_intake",
}

_HOUSEWORK_NEED_RE = re.compile(
    r"(?:she |he |they )?(?:can'?t|cannot|couldn'?t)\s+"
    r"(?:do|manage)\s+.{0,50}(?:around the house|housework|household)",
    re.IGNORECASE,
)
_NEED_HELP_RE = re.compile(r"we need (?:some )?help", re.IGNORECASE)
_CLINIC_SKIP_RATIONALE_RE = re.compile(
    r"not a home care|out of scope|no in-home|physician training|"
    r"not a home care intake|not a home care visit",
    re.IGNORECASE,
)


def grounded_home_need_services(transcript_text: Optional[str]) -> List[Dict[str, Any]]:
    """Services taken from spoken in-home need, not from clinic frame."""
    text = transcript_text or ""
    if not text.strip():
        return []
    services: List[Dict[str, Any]] = []
    housework = _HOUSEWORK_NEED_RE.search(text)
    if housework:
        services.append(
            {
                "name": "Homemaker",
                "description": "Help with household tasks the client cannot manage",
                "evidence": housework.group(0).strip(),
                "frequency": "",
                "priority": "High",
            }
        )
    need_help = _NEED_HELP_RE.search(text)
    if need_help:
        services.append(
            {
                "name": "Companion Care",
                "description": "In-home support requested by the family",
                "evidence": need_help.group(0).strip(),
                "frequency": "",
                "priority": "High",
            }
        )
    return services


def grounded_home_need_goals(transcript_text: Optional[str]) -> Dict[str, Any]:
    """Aide-facing goals from the same spoken in-home need."""
    services = grounded_home_need_services(transcript_text)
    if not services:
        return {}
    short: List[str] = []
    evidence = " ".join(str(s.get("evidence") or "") for s in services).lower()
    if any("homemak" in str(s.get("name") or "").lower() for s in services) or "house" in evidence:
        short.append("Help with housework the client cannot manage around the house")
    if any("companion" in str(s.get("name") or "").lower() for s in services) or "need" in evidence:
        short.append("Provide in-home help the family asked for")
    if not short:
        short.append("Provide in-home help for needs spoken in the assessment")
    return {
        "short_term": short,
        "long_term": [
            "Keep the household supported so the family is not left without help"
        ],
        "maintenance": [
            "Check household tasks and energy during each visit"
        ],
    }


def grounded_home_need_billables(transcript_text: Optional[str]) -> List[Dict[str, Any]]:
    """Recommended billables whose evidence is a direct transcript quote."""
    out: List[Dict[str, Any]] = []
    for svc in grounded_home_need_services(transcript_text):
        name = str(svc.get("name") or "").lower()
        if "homemak" in name:
            category, task = "HOUSEKEEPING", "Homemaker / housework help"
        else:
            category, task = "COMPANIONSHIP", "In-home help requested by family"
        out.append(
            {
                "category": category,
                "task": task,
                "evidence": svc.get("evidence") or "",
                "priority": "HIGH",
                "frequency": "As needed",
            }
        )
    return out


def _goals_have_items(goals: Any) -> bool:
    if not isinstance(goals, dict):
        return False
    for key in ("short_term", "long_term", "maintenance", "maintenance_goals", "goals"):
        items = goals.get(key)
        if isinstance(items, list) and any(care_goal_text(g) for g in items):
            return True
    return False


def apply_in_scope_home_need_fallback(
    assessment_data: Optional[Dict[str, Any]],
    transcript_text: Optional[str],
    conversation_kind: Optional[str] = None,
) -> Dict[str, Any]:
    """Fill empty extract when an in-scope recording still describes home need.

    Does not invent hours or rates. Quotes must already appear in the transcript.
    """
    data = dict(assessment_data or {})
    kind = (conversation_kind or data.get("conversation_kind") or "").strip()
    if kind == "out_of_scope":
        return data
    fallback_services = grounded_home_need_services(transcript_text)
    if not fallback_services:
        return data
    if kind in _IN_SCOPE_KINDS:
        data["conversation_kind"] = kind

    data["services_identified"] = sanitize_identified_services(
        data.get("services_identified"),
        transcript_text=transcript_text,
    )
    data["care_plan_goals"] = sanitize_care_plan_goals(data.get("care_plan_goals"))

    existing_services = data.get("services_identified") or []
    if not existing_services:
        data["services_identified"] = fallback_services
        data["home_need_fallback"] = True

    if not _goals_have_items(data.get("care_plan_goals")):
        data["care_plan_goals"] = grounded_home_need_goals(transcript_text)
        data["home_need_fallback"] = True

    eicna = dict(data.get("eicna_assessment") or {})
    rationale = str(eicna.get("rationale") or "")
    if not rationale.strip() or _CLINIC_SKIP_RATIONALE_RE.search(rationale):
        eicna["rationale"] = (
            "Family reports the client cannot manage around the house and asked for help at home."
        )
        if not eicna.get("care_need_level") or str(eicna.get("care_need_level")).upper() == "LOW":
            eicna["care_need_level"] = "MODERATE"
        data["eicna_assessment"] = eicna
        data["home_need_fallback"] = True
    return data


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


_ADMIN_CARE_PLAN_GOAL_RE = re.compile(
    r"("
    r"\bslums\b|\bphq[- ]?[29]\b|\bnsi\b|"
    r"care management program|\bcmp assessment\b|"
    r"prior authori[sz]ation|\bheritage health\b|"
    r"hcbs waiver|waiver program|"
    r"baseline (?:adl|iadl)|"
    r"complete full .{0,60}assessment|"
    r"within \d+ business days of referral|"
    r"screening tools and document scores|"
    r"obtain .{0,60}prior auth|"
    r"establish appropriate service frequency|"
    r"develop individualized care plan based on|"
    r"connect client with applicable"
    r")",
    re.IGNORECASE,
)


def is_admin_checklist_care_goal(text: Any) -> bool:
    """True when a 'goal' is state paperwork / screening admin, not aide work."""
    raw = str(text or "").strip()
    if not raw:
        return True
    return bool(_ADMIN_CARE_PLAN_GOAL_RE.search(raw))


def sanitize_care_plan_goals(goals: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Drop formal-assessment / prior-auth checklist items from care_plan_goals."""
    if not isinstance(goals, dict):
        return {}
    out: Dict[str, Any] = {}
    for key in ("short_term", "long_term", "maintenance", "maintenance_goals"):
        raw = goals.get(key)
        if not isinstance(raw, list):
            continue
        kept = []
        for item in raw:
            if isinstance(item, dict):
                title = item.get("title") or item.get("goal") or item.get("text") or ""
                if is_admin_checklist_care_goal(title):
                    continue
                kept.append(item)
            else:
                if is_admin_checklist_care_goal(item):
                    continue
                kept.append(item)
        out[key] = kept
    raw_list = goals.get("goals")
    if isinstance(raw_list, list):
        kept_struct = []
        for item in raw_list:
            if isinstance(item, dict):
                title = item.get("title") or item.get("goal") or item.get("text") or ""
                if is_admin_checklist_care_goal(title):
                    continue
                kept_struct.append(item)
            else:
                if is_admin_checklist_care_goal(item):
                    continue
                kept_struct.append(item)
        out["goals"] = kept_struct
    # Preserve any other keys untouched (structured goal objects, etc.)
    for key, value in goals.items():
        if key not in out:
            out[key] = value
    return out


def care_goal_text(item: Any) -> str:
    """Plain-text line for a care-plan goal (string or {title/goal/text} object)."""
    if isinstance(item, dict):
        return str(item.get("title") or item.get("goal") or item.get("text") or "").strip()
    return str(item or "").strip()


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
