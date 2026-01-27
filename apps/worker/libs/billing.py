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
    # Personal Care / ADL
    (r"\b(bath|bathing|shower|showering|wash|washing|clean up|cleaned up)\b", "ADL_HYGIENE", "Bathing/showering assistance", "Personal Care"),
    (r"\b(brush|brushing|teeth|dental|oral care|mouth care)\b", "ADL_HYGIENE", "Oral hygiene assistance", "Personal Care"),
    (r"\b(toileting|bathroom|restroom|toilet|commode|bedpan)\b", "ADL_HYGIENE", "Toileting assistance", "Personal Care"),
    (r"\b(dress|dressing|clothes|clothing|dressed|undress|outfit|changing)\b", "ADL_DRESSING", "Dressing assistance", "Personal Care"),
    (r"\b(grooming|shave|shaving|hair|comb|brush)\b", "ADL_GROOMING", "Grooming assistance", "Personal Care"),
    
    # Medication
    (r"\b(medication|medicine|pill|pills|meds|prescription|dosage)\b", "MED_REMINDER", "Medication reminder/assistance", "Medication Management"),
    (r"\b(take|taking|took)\b.*\b(medication|medicine|pill|meds)\b", "MED_REMINDER", "Medication administration", "Medication Management"),
    (r"\b(metformin|lisinopril|aspirin|insulin|blood pressure med)\b", "MED_REMINDER", "Specific medication assistance", "Medication Management"),
    
    # Vital Signs
    (r"\b(blood pressure|bp|pulse|heart rate|vitals|vital signs)\b", "VITALS", "Vital signs monitoring", "Health Monitoring"),
    (r"\b(temperature|thermometer|fever|oxygen|o2 sat|saturation)\b", "VITALS", "Vital signs check", "Health Monitoring"),
    (r"\b(weight|weigh|scale|blood sugar|glucose|diabetic check)\b", "VITALS", "Health monitoring", "Health Monitoring"),
    
    # Meals
    (r"\b(breakfast|lunch|dinner|meal|supper)\b", "MEAL_PREP", "Meal preparation", "Nutrition"),
    (r"\b(prepare|cook|cooking|making|made|heat|warm|reheat)\b.*\b(food|meal|lunch|dinner|breakfast|eggs|toast)\b", "MEAL_PREP", "Meal preparation", "Nutrition"),
    (r"\b(feed|feeding|help|assist|helping|assisting)\b.*\b(eat|eating)\b", "MEAL_ASSIST", "Feeding assistance", "Nutrition"),
    (r"\b(diabetic|diabetes|sugar-free|low-carb|diet|dietary)\b.*\b(meal|food|diet)\b", "MEAL_PREP", "Diabetic meal preparation", "Nutrition"),
    (r"\b(grocery|groceries|shopping|food shopping)\b", "MEAL_PREP", "Grocery/meal planning", "Nutrition"),
    
    # Mobility
    (r"\b(walk|walking|walker|cane|ambulate|ambulation)\b", "ADL_MOBILITY", "Ambulation assistance", "Mobility"),
    (r"\b(wheelchair|transfer|transferring|stand|standing|sit|sitting)\b", "MOBILITY_ASSIST", "Transfer/positioning assistance", "Mobility"),
    (r"\b(exercise|exercises|stretch|stretching|physical therapy|pt|range of motion)\b", "EXERCISE", "Exercise/therapy assistance", "Mobility"),
    (r"\b(fall|falls|falling|balance|steady|unsteady)\b", "MOBILITY_ASSIST", "Fall prevention/safety", "Mobility"),
    
    # Housekeeping
    (r"\b(clean|cleaning|tidy|tidying|straighten)\b", "HOUSEHOLD_LIGHT", "Light housekeeping", "Homemaking"),
    (r"\b(vacuum|vacuuming|sweep|sweeping|mop|mopping|dust|dusting)\b", "HOUSEHOLD_LIGHT", "Floor care", "Homemaking"),
    (r"\b(laundry|wash|washing|fold|folding|iron|ironing)\b.*\b(clothes|clothing|linens|sheets)?\b", "HOUSEHOLD_LAUNDRY", "Laundry services", "Homemaking"),
    (r"\b(dishes|dish|kitchen|counter|wipe|wiping)\b", "HOUSEHOLD_LIGHT", "Kitchen cleaning", "Homemaking"),
    (r"\b(trash|garbage|recycling|take out)\b", "HOUSEHOLD_LIGHT", "Trash removal", "Homemaking"),
    (r"\b(bed|beds|bedding|make the bed|change sheets)\b", "HOUSEHOLD_LIGHT", "Bed making/linen change", "Homemaking"),
    
    # Companionship
    (r"\b(lonely|loneliness|alone|company|companion|companionship)\b", "COMPANIONSHIP", "Companionship/emotional support", "Companionship"),
    (r"\b(talk|talking|chat|chatting|conversation|visit|visiting|listen)\b", "COMPANIONSHIP", "Social interaction", "Companionship"),
    (r"\b(cards|games|read|reading|tv|television|watch)\b", "COMPANIONSHIP", "Recreational activities", "Companionship"),
    
    # Supervision/Safety
    (r"\b(supervise|supervision|monitor|monitoring|watch|watching|observe)\b", "SUPERVISION", "Safety supervision", "Supervision"),
    (r"\b(safe|safety|secure|security|check on)\b", "SUPERVISION", "Safety monitoring", "Supervision"),
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


def analyze_transcript_with_llm(
    segments: List[Dict[str, Any]],
    llm_client: Optional[Any] = None
) -> List[Dict[str, Any]]:
    """
    Use LLM to analyze transcript and extract billable services.
    Falls back to rule-based if LLM unavailable.
    """
    if not llm_client:
        return []
    
    # Combine segments into full transcript
    full_text = "\n".join([
        f"[{s.get('speaker_label', 'Speaker')}]: {s.get('text', '')}"
        for s in segments
    ])
    
    prompt = f"""Analyze this home care assessment conversation and identify all billable care services mentioned.

TRANSCRIPT:
{full_text}

For each service identified, provide:
1. category: One of [ADL_HYGIENE, ADL_DRESSING, ADL_GROOMING, MED_REMINDER, VITALS, MEAL_PREP, MEAL_ASSIST, ADL_MOBILITY, MOBILITY_ASSIST, EXERCISE, HOUSEHOLD_LIGHT, HOUSEHOLD_LAUNDRY, COMPANIONSHIP, SUPERVISION]
2. description: Brief description of the specific service
3. evidence: The exact quote from transcript that mentions this need
4. estimated_minutes_per_visit: Estimated time for this service per visit
5. frequency: How often needed (daily, weekly, etc.)
6. priority: HIGH, MEDIUM, or LOW based on client's expressed needs

Return as JSON array. Be thorough - identify ALL services mentioned, including:
- Personal care (bathing, dressing, grooming, toileting)
- Medication management
- Vital signs monitoring
- Meal preparation and feeding assistance
- Mobility and transfer assistance
- Housekeeping and laundry
- Companionship and supervision

JSON:"""

    try:
        response = llm_client.generate(prompt, max_tokens=2000)
        
        # Parse JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            services = json.loads(json_match.group())
            return services
    except Exception as e:
        logger.warning(f"LLM analysis failed: {e}")
    
    return []


def generate_billables_from_transcript(
    segments: List[Dict[str, Any]],
    visit_start_ms: int,
    visit_end_ms: int,
    min_block_minutes: int = 5,
    use_llm: bool = False,
    llm_client: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """
    Generate billable items from transcript segments.
    
    Extracts and categorizes care services mentioned in the transcript.
    Does NOT calculate time - just identifies and lists services with evidence.
    
    Returns list of dicts for JSON serialization.
    """
    logger.info(f"Generating billables from {len(segments)} segments")
    
    segment_services: Dict[str, List[Dict]] = {}  # Track services by category
    
    # Process each segment to find mentioned services
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
    
    # Create billable items from detected services
    result = []
    service_order = ["Personal Care", "Medication Management", "Health Monitoring", "Nutrition", "Mobility", "Homemaking", "Companionship", "Supervision"]
    
    # Sort categories by service type
    sorted_categories = sorted(
        segment_services.keys(),
        key=lambda c: (
            service_order.index(segment_services[c][0]["service_type"]) 
            if segment_services[c] and segment_services[c][0]["service_type"] in service_order 
            else 99
        )
    )
    
    for category in sorted_categories:
        detections = segment_services[category]
        if not detections:
            continue
        
        # Collect all evidence for this service
        all_evidence = [d["evidence"] for d in detections]
        
        # Get category info
        cat_info = CATEGORY_INFO.get(category, {"label": category, "default_rate": 25.00, "color": "gray"})
        
        # Create item dict - NO time calculations
        item = {
            "code": category,
            "category": category,
            "description": detections[0]["description"],
            "start_ms": min(d["start_ms"] for d in detections),
            "end_ms": max(d["end_ms"] for d in detections),
            "minutes": 0,  # Not calculating time per service
            "evidence": all_evidence,
            "service_type": detections[0]["service_type"],
            "rate_type": "hourly",
            "label": cat_info.get("label", category),
            "default_rate": cat_info.get("default_rate", 25.00),
            "color": cat_info.get("color", "gray"),
            "mention_count": len(all_evidence),
            "is_flagged": len(all_evidence) == 1,
            "flag_reason": "Single mention - verify service is needed" if len(all_evidence) == 1 else None,
        }
        result.append(item)
    
    logger.info(f"Generated {len(result)} billable service items")
    
    return result
