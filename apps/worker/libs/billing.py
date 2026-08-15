"""
Billing Rules Engine for Worker

Enhanced extraction of billable items from transcript segments using both
rules-based detection and LLM analysis for comprehensive billing.
"""

import re
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class BillableBlock:
    """Represents a detected billable time block."""
    code: str
    category: str
    description: str
    start_ms: int
    end_ms: int
    minutes: int
    evidence: List[Dict[str, Any]]
    service_type: str = ""
    rate_type: str = "hourly"
    is_flagged: bool = False
    flag_reason: str = None


# Enhanced task patterns with better categorization
TASK_PATTERNS = [
    # Personal Care / ADL — require assist language; do not match declined self-care talk
    (r"\b(help|assist|assistance|helping|assisting)\b.{0,40}\b(bath|bathing|shower|showering)\b", "ADL_HYGIENE", "Bathing/showering assistance", "Personal Care"),
    (r"\b(bath|bathing|shower|showering)\b.{0,40}\b(help|assist|assistance|helping|assisting)\b", "ADL_HYGIENE", "Bathing/showering assistance", "Personal Care"),
    (r"\b(your|her|his|their)\s+(bath|shower)\b", "ADL_HYGIENE", "Bathing/showering assistance", "Personal Care"),
    (r"\b(brush|brushing)\b.{0,20}\b(teeth|dental)\b", "ADL_HYGIENE", "Oral hygiene assistance", "Personal Care"),
    (r"\b(oral care|mouth care)\b", "ADL_HYGIENE", "Oral hygiene assistance", "Personal Care"),
    (r"\b(toileting|commode|bedpan)\b", "ADL_HYGIENE", "Toileting assistance", "Personal Care"),
    (r"\b(help|assist|assistance|helping|assisting)\b.{0,40}\b(bathroom|toilet|toileting)\b", "ADL_HYGIENE", "Toileting assistance", "Personal Care"),
    (r"\b(help|assist|assistance|helping|assisting)\b.{0,40}\b(dress|dressing|dressed|undress|clothes|clothing)\b", "ADL_DRESSING", "Dressing assistance", "Personal Care"),
    (r"\b(grooming|shave|shaving)\b", "ADL_GROOMING", "Grooming assistance", "Personal Care"),
    (r"\b(comb|brush)\b.{0,20}\b(hair)\b", "ADL_GROOMING", "Grooming assistance", "Personal Care"),
    
    # Medication — reminders/assistance, not intake questions about meds
    (r"\b(medication|medicine|pill|pills|meds)\b.{0,30}\b(reminder|remind|help|assist|organize|organizer)\b", "MED_REMINDER", "Medication reminder/assistance", "Medication Management"),
    (r"\b(remind|help|assist|organize)\b.{0,30}\b(medication|medicine|pill|pills|meds)\b", "MED_REMINDER", "Medication reminder/assistance", "Medication Management"),
    (r"\b(take|taking|took)\b.{0,20}\b(medication|medicine|pill|meds)\b", "MED_REMINDER", "Medication administration", "Medication Management"),
    (r"\b(metformin|lisinopril|aspirin|insulin)\b", "MED_REMINDER", "Specific medication assistance", "Medication Management"),
    
    # Vital Signs — actions taken, not diagnoses alone
    (r"\b(check|checking|take|taking|monitor|monitoring)\b.{0,30}\b(blood pressure|bp|pulse|heart rate|vitals|vital signs|temperature|blood sugar|glucose)\b", "VITALS", "Vital signs monitoring", "Health Monitoring"),
    (r"\b(blood pressure|bp|pulse|heart rate|vitals|vital signs)\b.{0,20}\b(check|checking|taken|reading)\b", "VITALS", "Vital signs check", "Health Monitoring"),
    
    # Meals
    (r"\b(breakfast|lunch|dinner|meal|supper)\b", "MEAL_PREP", "Meal preparation", "Nutrition"),
    (r"\b(prepare|cook|cooking|making|made|heat|warm|reheat)\b.*\b(food|meal|lunch|dinner|breakfast|eggs|toast)\b", "MEAL_PREP", "Meal preparation", "Nutrition"),
    (r"\b(feed|feeding|help|assist|helping|assisting)\b.*\b(eat|eating)\b", "MEAL_ASSIST", "Feeding assistance", "Nutrition"),
    (r"\b(diabetic|diabetes|sugar-free|low-carb|diet|dietary)\b.*\b(meal|food|diet)\b", "MEAL_PREP", "Diabetic meal preparation", "Nutrition"),
    (r"\b(grocery|groceries|shopping|food shopping)\b", "MEAL_PREP", "Grocery/meal planning", "Nutrition"),
    
    # Mobility
    (r"\b(walk|walking|walker|cane|ambulate|ambulation)\b", "ADL_MOBILITY", "Ambulation assistance", "Mobility"),
    (r"\b(wheelchair|transfer|transferring)\b", "MOBILITY_ASSIST", "Transfer/positioning assistance", "Mobility"),
    (r"\b(help|assist|assistance)\b.{0,40}\b(stand|standing|sit|sitting)\b", "MOBILITY_ASSIST", "Transfer/positioning assistance", "Mobility"),
    (r"\b(exercise|exercises|stretch|stretching|physical therapy|pt|range of motion)\b", "EXERCISE", "Exercise/therapy assistance", "Mobility"),
    (r"\b(fall|falls|falling|balance|steady|unsteady)\b", "MOBILITY_ASSIST", "Fall prevention/safety", "Mobility"),
    
    # Housekeeping
    (r"\b(clean|cleaning|tidy|tidying|straighten)\b", "HOUSEHOLD_LIGHT", "Light housekeeping", "Homemaking"),
    (r"\b(vacuum|vacuuming|sweep|sweeping|mop|mopping|dust|dusting)\b", "HOUSEHOLD_LIGHT", "Floor care", "Homemaking"),
    (r"\b(laundry|fold|folding|iron|ironing)\b", "HOUSEHOLD_LAUNDRY", "Laundry services", "Homemaking"),
    (r"\b(wash|washing)\b.{0,20}\b(clothes|clothing|linens|sheets|laundry)\b", "HOUSEHOLD_LAUNDRY", "Laundry services", "Homemaking"),
    (r"\b(dishes|dish|kitchen|counter|wipe|wiping)\b", "HOUSEHOLD_LIGHT", "Kitchen cleaning", "Homemaking"),
    (r"\b(trash|garbage|recycling|take out)\b", "HOUSEHOLD_LIGHT", "Trash removal", "Homemaking"),
    (r"\b(bed|beds|bedding|make the bed|change sheets)\b", "HOUSEHOLD_LIGHT", "Bed making/linen change", "Homemaking"),
    
    # Companionship — need language, not casual "talk/listen/read"
    (r"\b(lonely|loneliness|companion|companionship)\b", "COMPANIONSHIP", "Companionship/emotional support", "Companionship"),
    (r"\b(company|social\s+interaction|emotional\s+support)\b", "COMPANIONSHIP", "Social interaction", "Companionship"),
    
    # Supervision/Safety — only explicit leave-alone / monitoring need language
    (r"\b(cannot\s+be\s+left\s+alone|can't\s+be\s+left\s+alone|must\s+not\s+be\s+left\s+alone)\b", "SUPERVISION", "Safety supervision", "Supervision"),
    (r"\b(safety\s+monitoring|fall\s+prevention|needs\s+supervision|require[sd]?\s+supervision)\b", "SUPERVISION", "Safety monitoring", "Supervision"),
]

# Service category rates (can be customized per agency)
CATEGORY_INFO = {
    "ADL_HYGIENE": {"label": "Personal Care - Hygiene", "default_rate": 28.00, "color": "blue"},
    "ADL_DRESSING": {"label": "Personal Care - Dressing", "default_rate": 26.00, "color": "blue"},
    "ADL_GROOMING": {"label": "Personal Care - Grooming", "default_rate": 25.00, "color": "blue"},
    "MED_REMINDER": {"label": "Medication Management", "default_rate": 28.00, "color": "orange"},
    "VITALS": {"label": "Health Monitoring", "default_rate": 30.00, "color": "red"},
    "MEAL_PREP": {"label": "Meal Preparation", "default_rate": 24.00, "color": "green"},
    "MEAL_ASSIST": {"label": "Feeding Assistance", "default_rate": 26.00, "color": "green"},
    "ADL_MOBILITY": {"label": "Mobility Assistance", "default_rate": 28.00, "color": "cyan"},
    "MOBILITY_ASSIST": {"label": "Transfer Assistance", "default_rate": 28.00, "color": "cyan"},
    "EXERCISE": {"label": "Exercise/Therapy", "default_rate": 30.00, "color": "cyan"},
    "HOUSEHOLD_LIGHT": {"label": "Light Housekeeping", "default_rate": 22.00, "color": "purple"},
    "HOUSEHOLD_LAUNDRY": {"label": "Laundry Services", "default_rate": 22.00, "color": "purple"},
    "COMPANIONSHIP": {"label": "Companionship", "default_rate": 22.00, "color": "pink"},
    "SUPERVISION": {"label": "Safety Supervision", "default_rate": 24.00, "color": "yellow"},
}


def detect_tasks_in_text(text: str) -> List[Tuple[str, str, str, str]]:
    """Detect tasks mentioned in text using keyword patterns."""
    text_lower = text.lower()
    detected = []
    seen_categories = set()
    
    for pattern, category, description, service_type in TASK_PATTERNS:
        if category in seen_categories:
            continue
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            detected.append((category, description, str(matches[0]) if matches else "", service_type))
            seen_categories.add(category)
    
    return detected


_SUPERVISION_NEED_RE = re.compile(
    r"\b("
    r"cannot\s+be\s+left\s+alone|can't\s+be\s+left\s+alone|"
    r"must\s+not\s+be\s+left\s+alone|needs?\s+supervision|"
    r"require[sd]?\s+supervision|safety\s+monitoring|fall\s+prevention|"
    r"wandering|elopement"
    r")\b",
    re.IGNORECASE,
)


def _normalize_for_match(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def evidence_appears_in_transcript(evidence: str, transcript_text: str, min_chars: int = 12) -> bool:
    """True when evidence is a real substring of the transcript (allowing whitespace drift)."""
    quote = _normalize_for_match(evidence)
    haystack = _normalize_for_match(transcript_text)
    if len(quote) < min_chars or not haystack:
        return False
    if quote in haystack:
        return True
    # Allow a long quote if a substantial contiguous chunk appears
    if len(quote) >= 40:
        chunk = quote[:40]
        if chunk in haystack:
            return True
        chunk = quote[-40:]
        if chunk in haystack:
            return True
    return False


def is_valid_supervision_evidence(evidence: str) -> bool:
    return bool(_SUPERVISION_NEED_RE.search(evidence or ""))


def filter_grounded_claude_services(
    services: Optional[List[Dict[str, Any]]],
    transcript_text: str,
) -> List[Dict[str, Any]]:
    """Keep only Claude billables whose evidence is in the transcript and category-valid."""
    if not services:
        return []
    kept: List[Dict[str, Any]] = []
    for service in services:
        if not isinstance(service, dict):
            continue
        evidence = str(service.get("evidence") or "").strip()
        if not evidence_appears_in_transcript(evidence, transcript_text):
            continue
        cat = str(service.get("category") or "").upper()
        if cat == "SUPERVISION" and not is_valid_supervision_evidence(evidence):
            continue
        kept.append(service)
    return kept


def format_billable_description(category_name: str, tasks: List[Dict[str, Any]]) -> str:
    """Human-readable description with verbatim evidence and stated frequency."""
    if not tasks:
        return category_name
    parts = []
    for task in tasks[:4]:
        name = str(task.get("task") or category_name).strip()
        quote = str(task.get("evidence") or "").strip()
        frequency = str(task.get("frequency") or "").strip()
        if len(quote) > 140:
            quote = quote[:137].rstrip() + "..."
        bit = name
        if frequency and frequency.lower() not in ("as needed", "n/a", ""):
            bit += f" [{frequency}]"
        elif frequency:
            bit += f" [{frequency}]"
        if quote:
            bit += f': "{quote}"'
        parts.append(bit)
    return "; ".join(parts)


def consolidate_blocks(blocks: List[BillableBlock], min_gap_ms: int = 120000) -> List[BillableBlock]:
    """Consolidate adjacent billable blocks of the same category."""
    if not blocks:
        return []
    
    sorted_blocks = sorted(blocks, key=lambda b: (b.category, b.start_ms))
    consolidated = []
    
    # Group by category first
    category_blocks: Dict[str, List[BillableBlock]] = {}
    for block in sorted_blocks:
        if block.category not in category_blocks:
            category_blocks[block.category] = []
        category_blocks[block.category].append(block)
    
    # Consolidate within each category
    for category, cat_blocks in category_blocks.items():
        if not cat_blocks:
            continue
            
        cat_blocks.sort(key=lambda b: b.start_ms)
        current = cat_blocks[0]
        
        for block in cat_blocks[1:]:
            # Merge if same category and close in time
            if (block.start_ms - current.end_ms) <= min_gap_ms:
                current = BillableBlock(
                    code=current.code,
                    category=current.category,
                    description=current.description,
                    start_ms=current.start_ms,
                    end_ms=max(current.end_ms, block.end_ms),
                    minutes=0,
                    evidence=current.evidence + block.evidence,
                    service_type=current.service_type,
                )
            else:
                current.minutes = max(1, (current.end_ms - current.start_ms) // 60000)
                consolidated.append(current)
                current = block
        
        current.minutes = max(1, (current.end_ms - current.start_ms) // 60000)
        consolidated.append(current)
    
    return consolidated


def analyze_transcript_with_claude(
    segments: List[Dict[str, Any]],
) -> Optional[List[Dict[str, Any]]]:
    """
    Use Claude to analyze transcript and extract ALL billable services comprehensively.

    Returns:
      - list (possibly empty) when Claude answered successfully
      - None when Claude could not run (caller may fall back to keyword rules)
    """
    import os
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("No ANTHROPIC_API_KEY, skipping LLM billables analysis")
        return None
    
    try:
        import anthropic
    except ImportError:
        logger.warning("anthropic package not installed, skipping LLM billables analysis")
        return None
    
    # Combine ALL segments into full transcript (no limit)
    # For very long transcripts, we include all segments but may truncate individual lines
    full_text = "\n".join([
        f"[{s.get('speaker_label', 'Speaker')}]: {s.get('text', '')}"
        for s in segments
    ])
    
    # If transcript is extremely long (>100k chars), summarize to fit in context window
    if len(full_text) > 100000:
        logger.info(f"Transcript is very long ({len(full_text)} chars), using first and last portions")
        # Take first 60k chars and last 40k chars to capture beginning and end of assessment
        full_text = full_text[:60000] + "\n\n[... middle portion of conversation ...]\n\n" + full_text[-40000:]
    
    logger.info(f"Analyzing {len(segments)} segments ({len(full_text)} chars) for billable services")
    from libs.pipeline_efficiency import trim_transcript_for_llm
    full_text = trim_transcript_for_llm(full_text, max_chars=50000)
    
    prompt = f"""Analyze this recording for IN-HOME CARE services a home care agency would actually provide.

Extract only tasks the client or family asked a caregiver to do, or clearly cannot do at home without help.

Do NOT extract:
- Clinic, hospital, or doctor-visit care (exams, counseling referrals, prescriptions, procedures)
- Training or coaching about how to run a home care business
- Casual words like sit, stand, bathroom, talk, or medicine unless they describe caregiver assistance
- Services the client declined (for example: "I can wash myself" is not bathing assistance)
- Independent medication taking ("I know how to take my medicine") is not medication management
- SUPERVISION unless the transcript clearly says the person cannot be left alone, needs supervision, or needs safety monitoring. Do not invent supervision from coaching, training, or general presence.

If this is a coaching/role-play with an embedded intake, extract from the person who would receive care (often a parent), not the coach.
If this is a medical interview with no home-care request, return [] unless someone clearly cannot manage meals, housekeeping, or personal care at home.

TRANSCRIPT:
{full_text}

For EACH real home-care need, provide:
1. category: Choose from [PERSONAL_CARE, MEDICATION, HEALTH_MONITORING, MEALS, MOBILITY, HOUSEKEEPING, TRANSPORTATION, COMPANIONSHIP, SUPERVISION, COGNITIVE_SUPPORT, OTHER]
2. task: Specific task (e.g., "Companionship", "Grocery transportation")
3. evidence: Exact quote copied from the transcript. No invented quotes.
4. priority: HIGH/MEDIUM/LOW
5. frequency: If stated, else "As needed"

Return a JSON array. Empty array is correct when no home-care services were requested.

JSON:"""

    try:
        client = anthropic.Anthropic(api_key=api_key, timeout=120.0)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = response.content[0].text.strip()
        
        # Handle markdown code blocks
        if "```" in response_text:
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response_text)
            if json_match:
                response_text = json_match.group(1).strip()
        
        # Parse JSON
        services = json.loads(response_text)
        if isinstance(services, dict):
            services = services.get("services") or services.get("items") or []
        if not isinstance(services, list):
            logger.warning(f"Claude billables returned non-list: {type(services)}")
            return None
        logger.info(f"Claude extracted {len(services)} billable services")
        return services
        
    except Exception as e:
        logger.warning(f"Claude billables analysis failed: {e}")
        return None


def generate_billables_from_transcript(
    segments: List[Dict[str, Any]],
    visit_start_ms: int,
    visit_end_ms: int,
    min_block_minutes: int = 5,
    use_llm: bool = True,  # Default to using Claude
    llm_client: Optional[Any] = None,
    conversation_kind: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate billable items from transcript segments using Claude AI.
    
    Extracts and categorizes ALL care services mentioned in the transcript.
    Groups tasks by category and prices by category.

    For intakes / training-with-embedded-intake, items are recommended services
    (frequency + evidence). minutes stay 0 unless this is a real home_care_visit
    with timed work (we do not invent visit minutes).
    
    Returns list of dicts for JSON serialization.
    """
    logger.info(f"Generating billables from {len(segments)} segments using Claude")
    
    transcript_text = "\n".join(str(s.get("text") or "") for s in segments)
    kind = (conversation_kind or "").strip()
    # Only real visits should look like timed delivered care. Intakes and
    # training role-plays are recommended services (frequency + evidence).
    is_recommendation = kind != "home_care_visit"

    # Use Claude to extract all services. None = Claude unavailable; [] = no home-care needs.
    claude_services = analyze_transcript_with_claude(segments) if use_llm else None
    llm_succeeded = claude_services is not None
    claude_services = filter_grounded_claude_services(claude_services or [], transcript_text)
    
    # Also run rules-based detection as backup (only used if Claude failed)
    segment_services: Dict[str, List[Dict]] = {}
    for segment in segments:
        text = segment.get("text", "")
        start_ms = segment.get("start_ms", 0)
        end_ms = segment.get("end_ms", start_ms + 30000)
        segment_id = segment.get("id", "")
        speaker = segment.get("speaker_label", "")
        
        detected_tasks = detect_tasks_in_text(text)
        
        for category, description, matched_text, service_type in detected_tasks:
            evidence = {
                "segment_id": segment_id,
                "start_ms": start_ms,
                "end_ms": end_ms,
                "text": text[:300],
                "matched": matched_text,
                "speaker": speaker,
            }
            
            if category not in segment_services:
                segment_services[category] = []
            
            segment_services[category].append({
                "start_ms": start_ms,
                "end_ms": end_ms,
                "evidence": evidence,
                "description": description,
                "service_type": service_type,
            })
    
    # Map Claude categories to our categories
    category_mapping = {
        "PERSONAL_CARE": "Personal Care",
        "MEDICATION": "Medication Management", 
        "HEALTH_MONITORING": "Health Monitoring",
        "MEALS": "Nutrition",
        "MOBILITY": "Mobility",
        "HOUSEKEEPING": "Homemaking",
        "TRANSPORTATION": "Transportation",
        "COMPANIONSHIP": "Companionship",
        "SUPERVISION": "Supervision",
        "COGNITIVE_SUPPORT": "Cognitive Support",
        "OTHER": "Other Services",
    }
    skip_categories = {"MEDICAL_CARE", "Medical Care"}
    
    category_rates = {
        "Personal Care": 28.00,
        "Medication Management": 28.00,
        "Health Monitoring": 30.00,
        "Nutrition": 24.00,
        "Mobility": 28.00,
        "Homemaking": 22.00,
        "Transportation": 20.00,
        "Companionship": 22.00,
        "Supervision": 24.00,
        "Cognitive Support": 30.00,
        "Other Services": 25.00,
    }
    
    # Group Claude services by category with all tasks listed
    category_tasks: Dict[str, List[Dict]] = {}
    
    for service in claude_services:
        cat = service.get("category", "OTHER")
        if cat in skip_categories:
            continue
        category_name = category_mapping.get(cat, cat)
        if category_name in skip_categories:
            continue
        
        if category_name not in category_tasks:
            category_tasks[category_name] = []
        
        category_tasks[category_name].append({
            "task": service.get("task", "Care service"),
            "evidence": service.get("evidence", ""),
            "priority": service.get("priority", "MEDIUM"),
            "frequency": service.get("frequency", "As needed"),
        })
    
    # Create result with categories containing task lists
    result = []
    
    for category_name, tasks in category_tasks.items():
        evidence_list = [
            {
                "text": t["evidence"],
                "task": t["task"],
                "priority": t["priority"],
                "frequency": t.get("frequency"),
            }
            for t in tasks
        ]
        task_list = [t["task"] for t in tasks]
        frequencies = [str(t.get("frequency") or "").strip() for t in tasks if t.get("frequency")]
        primary_frequency = next((f for f in frequencies if f), None)
        
        item = {
            "code": category_name.upper().replace(" ", "_"),
            "category": category_name,
            "description": format_billable_description(category_name, tasks),
            "start_ms": visit_start_ms,
            "end_ms": visit_end_ms,
            # Do not invent visit minutes for intakes / recommendations.
            "minutes": 0,
            "evidence": evidence_list,
            "service_type": category_name,
            "rate_type": "hourly",
            "label": category_name,
            "default_rate": category_rates.get(category_name, 25.00),
            "color": "blue",
            "task_count": len(tasks),
            "tasks": task_list,
            "frequency": primary_frequency,
            "is_recommendation": is_recommendation,
            "is_flagged": bool(is_recommendation),
            "flag_reason": (
                "Recommended from assessment (not timed visit work)"
                if is_recommendation
                else None
            ),
        }
        result.append(item)
    
    # Keyword rules only when Claude could not run. An empty Claude list means
    # no home-care services were found (clinic interview, out of scope, etc.).
    if not llm_succeeded and not category_tasks:
        for category, detections in segment_services.items():
            service_type = detections[0]["service_type"] if detections else category
            cat_info = CATEGORY_INFO.get(category, {"label": category, "default_rate": 25.00})
            all_evidence = [d["evidence"] for d in detections]
            quote = (detections[0]["evidence"].get("text") if detections else "") or ""
            desc = detections[0]["description"] if detections else category
            if quote:
                desc = f'{desc}: "{quote[:140]}"'
            
            item = {
                "code": category,
                "category": service_type,
                "description": desc,
                "start_ms": min(d["start_ms"] for d in detections),
                "end_ms": max(d["end_ms"] for d in detections),
                "minutes": 0,
                "evidence": all_evidence,
                "service_type": service_type,
                "rate_type": "hourly",
                "label": cat_info.get("label", category),
                "default_rate": cat_info.get("default_rate", 25.00),
                "color": "gray",
                "task_count": len(all_evidence),
                "tasks": [detections[0]["description"]] if detections else [],
                "is_flagged": True,
                "flag_reason": "Detected by rules only - verify needed",
            }
            result.append(item)
    
    logger.info(f"Generated {len(result)} billable categories with {sum(item.get('task_count', 0) for item in result)} total tasks")
    
    return result
