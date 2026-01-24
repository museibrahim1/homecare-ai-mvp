"""
Note Generation Service

Generates structured visit notes from transcript and billable data.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


def generate_structured_note(
    visit_data: Dict[str, Any],
    billable_items: List[Dict[str, Any]],
    transcript_segments: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generate a structured visit note from visit data.
    
    Returns a dictionary with structured fields that can be rendered into
    various formats (DOCX, PDF, etc.).
    """
    
    # Extract tasks performed from billable items
    tasks_performed = []
    for item in billable_items:
        if item.get("category") and item.get("description"):
            tasks_performed.append({
                "category": item["category"],
                "description": item["description"],
                "duration_minutes": item.get("adjusted_minutes") or item.get("minutes", 0),
            })
    
    # Calculate total visit duration
    total_minutes = sum(item.get("minutes", 0) for item in billable_items)
    
    # Generate observations from transcript (simplified - could use LLM later)
    observations = generate_observations_from_transcript(transcript_segments)
    
    # Build structured note
    structured_data = {
        "visit_info": {
            "visit_id": visit_data.get("id"),
            "date": visit_data.get("actual_start", visit_data.get("scheduled_start")),
            "client_name": visit_data.get("client_name", ""),
            "caregiver_name": visit_data.get("caregiver_name", ""),
            "duration_minutes": total_minutes,
        },
        "tasks_performed": tasks_performed,
        "observations": observations,
        "risks_concerns": detect_concerns(transcript_segments),
        "client_condition": "stable",  # Could be enhanced with AI analysis
        "follow_up_needed": False,
        "medications_administered": [],
        "vitals": {},
    }
    
    return structured_data


def generate_observations_from_transcript(
    segments: List[Dict[str, Any]],
) -> str:
    """
    Generate observation notes from transcript segments.
    
    This is a simplified version - could be enhanced with LLM summarization.
    """
    if not segments:
        return "Visit conducted as scheduled."
    
    # Count word frequency for key topics
    all_text = " ".join(s.get("text", "") for s in segments).lower()
    
    observations = []
    
    # Check for positive indicators
    positive_indicators = ["good", "well", "happy", "comfortable", "better"]
    if any(word in all_text for word in positive_indicators):
        observations.append("Client appeared to be in good spirits during the visit.")
    
    # Check for health-related mentions
    if "pain" in all_text or "hurt" in all_text:
        observations.append("Client mentioned some discomfort during the visit.")
    
    if "appetite" in all_text or "eating" in all_text:
        observations.append("Appetite and eating habits were discussed.")
    
    if "sleep" in all_text or "tired" in all_text:
        observations.append("Sleep patterns were discussed with client.")
    
    if not observations:
        observations.append("Visit completed without notable concerns.")
    
    return " ".join(observations)


def detect_concerns(segments: List[Dict[str, Any]]) -> str:
    """
    Detect potential concerns from transcript.
    """
    if not segments:
        return "None noted."
    
    all_text = " ".join(s.get("text", "") for s in segments).lower()
    
    concerns = []
    
    # Check for concerning keywords
    concern_keywords = {
        "fall": "Fall risk mentioned",
        "dizzy": "Dizziness reported",
        "confused": "Confusion noted",
        "forgot": "Memory concerns",
        "pain": "Pain reported",
        "emergency": "Emergency mentioned",
    }
    
    for keyword, concern in concern_keywords.items():
        if keyword in all_text:
            concerns.append(concern)
    
    return "; ".join(concerns) if concerns else "None noted."


def generate_narrative(structured_data: Dict[str, Any]) -> str:
    """
    Generate a narrative note from structured data.
    """
    visit_info = structured_data.get("visit_info", {})
    tasks = structured_data.get("tasks_performed", [])
    observations = structured_data.get("observations", "")
    concerns = structured_data.get("risks_concerns", "None noted.")
    
    # Build narrative
    narrative_parts = []
    
    # Opening
    date_str = ""
    if visit_info.get("date"):
        if isinstance(visit_info["date"], str):
            date_str = visit_info["date"]
        else:
            date_str = visit_info["date"].strftime("%B %d, %Y")
    
    narrative_parts.append(
        f"Home care visit conducted on {date_str}. "
        f"Total visit duration: {visit_info.get('duration_minutes', 0)} minutes."
    )
    
    # Services provided
    if tasks:
        task_descriptions = [t.get("description", "") for t in tasks if t.get("description")]
        if task_descriptions:
            narrative_parts.append(
                f"Services provided during this visit included: {', '.join(task_descriptions)}."
            )
    
    # Observations
    if observations:
        narrative_parts.append(f"Observations: {observations}")
    
    # Concerns
    narrative_parts.append(f"Risks/Concerns: {concerns}")
    
    # Closing
    narrative_parts.append("Visit completed as scheduled. Client was left in stable condition.")
    
    return "\n\n".join(narrative_parts)
