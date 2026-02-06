"""
Combined Transcript Analysis using Claude

Performs speaker identification AND billables extraction in a SINGLE API call
for efficiency and cost savings.
"""

import json
import logging
import os
import re
from typing import Dict, List, Any, Tuple

import anthropic

logger = logging.getLogger(__name__)


def analyze_transcript_combined(
    segments: List[Dict[str, Any]],
    unique_speakers: List[str],
) -> Tuple[Dict[str, str], List[Dict[str, Any]]]:
    """
    Combined analysis: Speaker identification + Billables extraction in ONE Claude call.
    
    Args:
        segments: List of transcript segments with speaker_label and text
        unique_speakers: List of unique speaker labels (SPEAKER_00, SPEAKER_01, etc.)
    
    Returns:
        Tuple of (speaker_names_dict, billables_list)
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("No ANTHROPIC_API_KEY, skipping combined analysis")
        return {}, []
    
    # Build transcript text from ALL segments
    transcript_lines = []
    for seg in segments:
        speaker = seg.get("speaker_label", "Speaker")
        text = seg.get("text", "")
        transcript_lines.append(f"[{speaker}]: {text}")
    
    transcript_text = "\n".join(transcript_lines)
    
    # If transcript is very long, trim to fit context window
    if len(transcript_text) > 100000:
        logger.info(f"Transcript is very long ({len(transcript_text)} chars), trimming for analysis")
        transcript_text = transcript_text[:60000] + "\n\n[... middle portion ...]\n\n" + transcript_text[-40000:]
    
    logger.info(f"Analyzing {len(segments)} segments ({len(transcript_text)} chars) for combined analysis")
    speakers_list = ", ".join(unique_speakers)
    
    prompt = f"""Analyze this home care assessment transcript and provide TWO things:

1. SPEAKER IDENTIFICATION: Identify the exact names of each speaker
2. BILLABLE SERVICES: Extract ALL care services/tasks mentioned

The following speakers need names: {speakers_list}

TRANSCRIPT:
{transcript_text}

=== INSTRUCTIONS ===

For SPEAKER IDENTIFICATION:
- Look for introductions: "I'm Dr. Drostman", "Hi, I'm Davis", "I'm Mrs. Smith"  
- How others address them: "Hello Doctor", "Thank you Mary"
- Use EXACT names if stated, otherwise use roles (Doctor, Patient, Husband, Caregiver)
- You MUST provide a name for EVERY speaker: {speakers_list}

For BILLABLE SERVICES:
- Extract EVERY care task, service, or need mentioned
- Categories: PERSONAL_CARE, MEDICATION, HEALTH_MONITORING, MEALS, MOBILITY, HOUSEKEEPING, TRANSPORTATION, COMPANIONSHIP, SUPERVISION, MEDICAL_CARE, COGNITIVE_SUPPORT, OTHER
- Include the exact quote as evidence
- Be THOROUGH - don't miss anything

=== RESPONSE FORMAT (JSON) ===

Return a JSON object with this EXACT structure:
{{
  "speakers": {{
    "SPEAKER_00": "Name or Role",
    "SPEAKER_01": "Name or Role",
    "SPEAKER_02": "Name or Role"
  }},
  "services": [
    {{
      "category": "PERSONAL_CARE",
      "task": "Bathing assistance",
      "evidence": "exact quote from transcript",
      "priority": "HIGH"
    }}
  ]
}}

JSON:"""

    try:
        client = anthropic.Anthropic(api_key=api_key, timeout=120.0)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,  # Comprehensive extraction needs more tokens
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = response.content[0].text.strip()
        
        # Handle markdown code blocks
        if "```" in response_text:
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response_text)
            if json_match:
                response_text = json_match.group(1).strip()
        
        # Parse JSON
        result = json.loads(response_text)
        
        speaker_names = result.get("speakers", {})
        services = result.get("services", [])
        
        logger.info(f"Combined analysis: {len(speaker_names)} speakers, {len(services)} services")
        
        return speaker_names, services
        
    except Exception as e:
        logger.error(f"Combined analysis failed: {e}")
        return {}, []


def process_services_to_billables(
    services: List[Dict[str, Any]],
    visit_start_ms: int,
    visit_end_ms: int,
) -> List[Dict[str, Any]]:
    """
    Convert extracted services to billable items grouped by category.
    """
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
        "MEDICAL_CARE": "Medical Care",
        "COGNITIVE_SUPPORT": "Cognitive Support",
        "OTHER": "Other Services",
    }
    
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
        "Medical Care": 35.00,
        "Cognitive Support": 30.00,
        "Other Services": 25.00,
    }
    
    # Group services by category
    category_tasks: Dict[str, List[Dict]] = {}
    
    for service in services:
        cat = service.get("category", "OTHER")
        category_name = category_mapping.get(cat, cat)
        
        if category_name not in category_tasks:
            category_tasks[category_name] = []
        
        category_tasks[category_name].append({
            "task": service.get("task", "Care service"),
            "evidence": service.get("evidence", ""),
            "priority": service.get("priority", "MEDIUM"),
        })
    
    # Create billable items
    result = []
    
    for category_name, tasks in category_tasks.items():
        task_list = [t["task"] for t in tasks]
        evidence_list = [{"text": t["evidence"], "task": t["task"], "priority": t["priority"]} for t in tasks]
        
        item = {
            "code": category_name.upper().replace(" ", "_"),
            "category": category_name,
            "description": f"{category_name}: {len(tasks)} tasks identified",
            "start_ms": visit_start_ms,
            "end_ms": visit_end_ms,
            "minutes": 0,
            "evidence": evidence_list,
            "service_type": category_name,
            "rate_type": "hourly",
            "label": category_name,
            "default_rate": category_rates.get(category_name, 25.00),
            "color": "blue",
            "task_count": len(tasks),
            "tasks": task_list,
            "is_flagged": False,
            "flag_reason": None,
        }
        result.append(item)
    
    return result
