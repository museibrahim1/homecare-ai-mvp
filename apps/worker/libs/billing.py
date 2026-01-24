"""
Billing Rules Engine for Worker

Rules-based extraction of billable items from transcript segments.
"""

import re
import logging
from typing import List, Dict, Any, Tuple
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
    is_flagged: bool = False
    flag_reason: str = None


# Keyword patterns for task detection
TASK_PATTERNS = [
    # Medication
    (r"\b(take|taking|medication|medicine|pill|pills|meds)\b", "MED_REMINDER", "Medication reminder"),
    (r"\b(blood pressure|bp|heart rate|pulse|temperature|vitals)\b", "VITALS", "Vital signs check"),
    
    # Meals
    (r"\b(breakfast|lunch|dinner|meal|eating|food|snack)\b", "MEAL_PREP", "Meal preparation"),
    (r"\b(prepare|cook|cooking|making|heat|warm)\b.*\b(food|meal|lunch|dinner|breakfast)\b", "MEAL_PREP", "Meal preparation"),
    (r"\b(help|assist|helping|assisting)\b.*\b(eat|eating)\b", "MEAL_ASSIST", "Meal assistance"),
    
    # Hygiene
    (r"\b(bath|bathing|shower|showering|wash|washing)\b", "ADL_HYGIENE", "Bathing assistance"),
    (r"\b(brush|brushing|teeth|dental|oral)\b", "ADL_HYGIENE", "Oral hygiene"),
    (r"\b(toileting|bathroom|restroom|toilet)\b", "ADL_HYGIENE", "Toileting assistance"),
    
    # Dressing
    (r"\b(dress|dressing|clothes|clothing|dressed|outfit)\b", "ADL_DRESSING", "Dressing assistance"),
    
    # Mobility
    (r"\b(walk|walking|walker|cane|wheelchair)\b", "ADL_MOBILITY", "Mobility assistance"),
    (r"\b(stand|standing|sit|sitting|transfer|transferring)\b", "MOBILITY_ASSIST", "Transfer assistance"),
    (r"\b(exercise|exercises|stretch|stretching|physical therapy|pt)\b", "EXERCISE", "Exercise assistance"),
    
    # Housekeeping
    (r"\b(clean|cleaning|vacuum|vacuuming|dust|dusting|laundry)\b", "HOUSEHOLD_LIGHT", "Light housekeeping"),
    
    # Companionship
    (r"\b(talk|talking|chat|chatting|conversation|visit|visiting)\b", "COMPANIONSHIP", "Companionship"),
]


def detect_tasks_in_text(text: str) -> List[Tuple[str, str, str]]:
    """Detect tasks mentioned in text using keyword patterns."""
    text_lower = text.lower()
    detected = []
    
    for pattern, category, description in TASK_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            detected.append((category, description, str(matches[0]) if matches else ""))
    
    return detected


def consolidate_blocks(blocks: List[BillableBlock], min_gap_ms: int = 60000) -> List[BillableBlock]:
    """Consolidate adjacent billable blocks of the same category."""
    if not blocks:
        return []
    
    sorted_blocks = sorted(blocks, key=lambda b: b.start_ms)
    consolidated = []
    current = sorted_blocks[0]
    
    for block in sorted_blocks[1:]:
        if block.category == current.category and (block.start_ms - current.end_ms) <= min_gap_ms:
            current = BillableBlock(
                code=current.code,
                category=current.category,
                description=current.description,
                start_ms=current.start_ms,
                end_ms=max(current.end_ms, block.end_ms),
                minutes=0,
                evidence=current.evidence + block.evidence,
            )
        else:
            current.minutes = (current.end_ms - current.start_ms) // 60000
            if current.minutes >= 1:
                consolidated.append(current)
            current = block
    
    current.minutes = (current.end_ms - current.start_ms) // 60000
    if current.minutes >= 1:
        consolidated.append(current)
    
    return consolidated


def generate_billables_from_transcript(
    segments: List[Dict[str, Any]],
    visit_start_ms: int,
    visit_end_ms: int,
    min_block_minutes: int = 5,
) -> List[Dict[str, Any]]:
    """
    Generate billable items from transcript segments.
    
    Returns list of dicts (not dataclasses) for JSON serialization.
    """
    logger.info(f"Generating billables from {len(segments)} segments")
    
    blocks = []
    
    for segment in segments:
        text = segment.get("text", "")
        start_ms = segment.get("start_ms", 0)
        end_ms = segment.get("end_ms", 0)
        segment_id = segment.get("id", "")
        
        detected_tasks = detect_tasks_in_text(text)
        
        for category, description, matched_text in detected_tasks:
            block = BillableBlock(
                code=category,
                category=category,
                description=description,
                start_ms=start_ms,
                end_ms=end_ms,
                minutes=0,
                evidence=[{
                    "segment_id": segment_id,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "text": text[:200],
                    "matched": matched_text,
                }],
            )
            blocks.append(block)
    
    # Consolidate
    consolidated = consolidate_blocks(blocks)
    
    # Apply minimum duration and flag short blocks
    final_blocks = []
    for block in consolidated:
        if block.minutes >= min_block_minutes:
            final_blocks.append(block)
        elif block.minutes > 0:
            block.is_flagged = True
            block.flag_reason = f"Duration ({block.minutes} min) below minimum ({min_block_minutes} min)"
            final_blocks.append(block)
    
    # Default to companionship if no tasks detected
    if not final_blocks and visit_end_ms > visit_start_ms:
        total_minutes = (visit_end_ms - visit_start_ms) // 60000
        if total_minutes >= min_block_minutes:
            final_blocks.append(BillableBlock(
                code="COMPANIONSHIP",
                category="COMPANIONSHIP",
                description="General companionship and supervision",
                start_ms=visit_start_ms,
                end_ms=visit_end_ms,
                minutes=total_minutes,
                evidence=[],
                is_flagged=True,
                flag_reason="No specific tasks detected - defaulted to companionship",
            ))
    
    logger.info(f"Generated {len(final_blocks)} billable items")
    
    # Convert to dicts
    return [asdict(block) for block in final_blocks]
