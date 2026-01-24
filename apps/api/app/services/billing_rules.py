"""
Billing Rules Engine

This module contains the rules-based logic for extracting billable items
from transcript segments. Start with deterministic rules, then optionally
add AI extraction later while keeping the same BillableItem schema.
"""

import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


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


# Billing categories
CATEGORIES = {
    "ADL_HYGIENE": "Activities of Daily Living - Hygiene",
    "ADL_DRESSING": "Activities of Daily Living - Dressing",
    "ADL_MOBILITY": "Activities of Daily Living - Mobility",
    "MEAL_PREP": "Meal Preparation",
    "MEAL_ASSIST": "Meal Assistance",
    "MED_REMINDER": "Medication Reminder",
    "MED_ADMIN": "Medication Administration",
    "MOBILITY_ASSIST": "Mobility Assistance",
    "COMPANIONSHIP": "Companionship",
    "HOUSEHOLD_LIGHT": "Light Housekeeping",
    "EXERCISE": "Exercise Assistance",
    "VITALS": "Vital Signs Monitoring",
}

# Keyword patterns for task detection
# Format: (pattern, category_code, description)
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
    (r"\b(change|changing)\b.*\b(clothes|shirt|pants)\b", "ADL_DRESSING", "Clothing change"),
    
    # Mobility
    (r"\b(walk|walking|walker|cane|wheelchair)\b", "ADL_MOBILITY", "Mobility assistance"),
    (r"\b(stand|standing|sit|sitting|transfer|transferring)\b", "MOBILITY_ASSIST", "Transfer assistance"),
    (r"\b(exercise|exercises|stretch|stretching|physical therapy|pt)\b", "EXERCISE", "Exercise assistance"),
    
    # Housekeeping
    (r"\b(clean|cleaning|vacuum|vacuuming|dust|dusting|laundry)\b", "HOUSEHOLD_LIGHT", "Light housekeeping"),
    (r"\b(dishes|wash dishes|kitchen)\b", "HOUSEHOLD_LIGHT", "Kitchen cleaning"),
    
    # Companionship (default/fallback)
    (r"\b(talk|talking|chat|chatting|conversation|visit|visiting)\b", "COMPANIONSHIP", "Companionship"),
]


def detect_tasks_in_text(text: str) -> List[Tuple[str, str, str]]:
    """
    Detect tasks mentioned in text using keyword patterns.
    
    Returns: List of (category_code, description, matched_text)
    """
    text_lower = text.lower()
    detected = []
    
    for pattern, category, description in TASK_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            detected.append((category, description, str(matches[0]) if matches else ""))
    
    return detected


def consolidate_blocks(blocks: List[BillableBlock], min_gap_ms: int = 60000) -> List[BillableBlock]:
    """
    Consolidate adjacent billable blocks of the same category.
    
    Args:
        blocks: List of detected billable blocks
        min_gap_ms: Minimum gap (in ms) to keep blocks separate (default: 1 minute)
    
    Returns: Consolidated list of billable blocks
    """
    if not blocks:
        return []
    
    # Sort by start time
    sorted_blocks = sorted(blocks, key=lambda b: b.start_ms)
    
    consolidated = []
    current = sorted_blocks[0]
    
    for block in sorted_blocks[1:]:
        # If same category and gap is small, merge
        if block.category == current.category and (block.start_ms - current.end_ms) <= min_gap_ms:
            # Merge blocks
            current = BillableBlock(
                code=current.code,
                category=current.category,
                description=current.description,
                start_ms=current.start_ms,
                end_ms=max(current.end_ms, block.end_ms),
                minutes=0,  # Will recalculate
                evidence=current.evidence + block.evidence,
            )
        else:
            # Finalize current block
            current.minutes = (current.end_ms - current.start_ms) // 60000
            if current.minutes >= 1:  # Only keep blocks >= 1 minute
                consolidated.append(current)
            current = block
    
    # Don't forget the last block
    current.minutes = (current.end_ms - current.start_ms) // 60000
    if current.minutes >= 1:
        consolidated.append(current)
    
    return consolidated


def generate_billables_from_segments(
    segments: List[Dict[str, Any]],
    visit_start_ms: int,
    visit_end_ms: int,
    min_block_minutes: int = 5,
) -> List[BillableBlock]:
    """
    Generate billable items from transcript segments.
    
    Args:
        segments: List of transcript segments with text, start_ms, end_ms
        visit_start_ms: Start of the visit (first speech activity)
        visit_end_ms: End of the visit (last speech activity)
        min_block_minutes: Minimum minutes for a billable block (default: 5)
    
    Returns: List of BillableBlock objects
    """
    blocks = []
    
    for segment in segments:
        text = segment.get("text", "")
        start_ms = segment.get("start_ms", 0)
        end_ms = segment.get("end_ms", 0)
        segment_id = segment.get("id", "")
        
        # Detect tasks in this segment
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
                    "text": text[:200],  # Truncate for storage
                    "matched": matched_text,
                }],
            )
            blocks.append(block)
    
    # Consolidate adjacent blocks of same category
    consolidated = consolidate_blocks(blocks)
    
    # Apply minimum block duration
    final_blocks = []
    for block in consolidated:
        if block.minutes >= min_block_minutes:
            final_blocks.append(block)
        elif block.minutes > 0:
            # Flag short blocks for review
            block.is_flagged = True
            block.flag_reason = f"Duration ({block.minutes} min) below minimum ({min_block_minutes} min)"
            final_blocks.append(block)
    
    # If no tasks detected, create a default companionship block
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
    
    return final_blocks
