"""
Note Generation for Worker

Generates structured visit notes from transcript and billable data.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def generate_structured_note(
    visit_data: Dict[str, Any],
    billable_items: List[Dict[str, Any]],
    transcript_segments: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Generate a structured visit note."""
    
    # Extract tasks from billables
    tasks_performed = []
    for item in billable_items:
        if item.get("category") and item.get("description"):
            tasks_performed.append({
                "category": item["category"],
                "description": item["description"],
                "duration_minutes": item.get("adjusted_minutes") or item.get("minutes", 0),
            })
    
    total_minutes = sum(item.get("minutes", 0) for item in billable_items)
    observations = _generate_observations(transcript_segments)
    concerns = _detect_concerns(transcript_segments)
    
    return {
        "visit_info": {
            "visit_id": visit_data.get("id"),
            "date": str(visit_data.get("actual_start") or visit_data.get("scheduled_start") or ""),
            "client_name": visit_data.get("client_name", ""),
            "caregiver_name": visit_data.get("caregiver_name", ""),
            "duration_minutes": total_minutes,
        },
        "tasks_performed": tasks_performed,
        "observations": observations,
        "risks_concerns": concerns,
        "client_condition": "stable",
        "follow_up_needed": False,
        "medications_administered": [],
        "vitals": {},
    }


def _generate_observations(segments: List[Dict[str, Any]]) -> str:
    """Generate observation notes from transcript."""
    if not segments:
        return "Visit conducted as scheduled."
    
    all_text = " ".join(s.get("text", "") for s in segments).lower()
    observations = []
    
    positive_indicators = ["good", "well", "happy", "comfortable", "better"]
    if any(word in all_text for word in positive_indicators):
        observations.append("Client appeared to be in good spirits during the visit.")
    
    if "pain" in all_text or "hurt" in all_text:
        observations.append("Client mentioned some discomfort during the visit.")
    
    if "appetite" in all_text or "eating" in all_text:
        observations.append("Appetite and eating habits were discussed.")
    
    if "sleep" in all_text or "tired" in all_text:
        observations.append("Sleep patterns were discussed with client.")
    
    if not observations:
        observations.append("Visit completed without notable concerns.")
    
    return " ".join(observations)


def _detect_concerns(segments: List[Dict[str, Any]]) -> str:
    """Detect potential concerns from transcript."""
    if not segments:
        return "None noted."
    
    all_text = " ".join(s.get("text", "") for s in segments).lower()
    
    concern_keywords = {
        "fall": "Fall risk mentioned",
        "dizzy": "Dizziness reported",
        "confused": "Confusion noted",
        "forgot": "Memory concerns",
        "pain": "Pain reported",
    }
    
    concerns = []
    for keyword, concern in concern_keywords.items():
        if keyword in all_text:
            concerns.append(concern)
    
    return "; ".join(concerns) if concerns else "None noted."


def generate_narrative(structured_data: Dict[str, Any]) -> str:
    """Generate a narrative note from structured data."""
    visit_info = structured_data.get("visit_info", {})
    tasks = structured_data.get("tasks_performed", [])
    observations = structured_data.get("observations", "")
    concerns = structured_data.get("risks_concerns", "None noted.")
    
    parts = []
    
    date_str = visit_info.get("date", "")
    parts.append(
        f"Home care visit conducted on {date_str}. "
        f"Total visit duration: {visit_info.get('duration_minutes', 0)} minutes."
    )
    
    if tasks:
        task_descriptions = [t.get("description", "") for t in tasks if t.get("description")]
        if task_descriptions:
            parts.append(f"Services provided: {', '.join(task_descriptions)}.")
    
    if observations:
        parts.append(f"Observations: {observations}")
    
    parts.append(f"Risks/Concerns: {concerns}")
    parts.append("Visit completed as scheduled. Client was left in stable condition.")
    
    return "\n\n".join(parts)
