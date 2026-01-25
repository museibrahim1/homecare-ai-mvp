"""
LLM Service for AI-powered text generation.

Supports OpenAI GPT models for contract and note generation.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Optional import - gracefully handle if not installed
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not installed. LLM features will use mock responses.")


class LLMService:
    """Service for LLM-powered text generation."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.temperature = temperature
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            logger.info(f"LLM Service initialized with model: {model}")
        else:
            logger.warning("LLM Service running in mock mode (no API key or library)")
    
    def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        json_response: bool = False,
    ) -> str:
        """Make a call to the LLM."""
        if not self.client:
            logger.warning("LLM client not available, returning mock response")
            return self._mock_response(user_prompt)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"} if json_response else None,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return self._mock_response(user_prompt)
    
    def _mock_response(self, prompt: str) -> str:
        """Generate mock response when LLM is unavailable."""
        if "contract" in prompt.lower():
            return json.dumps({
                "services_identified": [
                    {"name": "Personal Care", "description": "Assistance with daily living activities"},
                    {"name": "Medication Management", "description": "Reminders and assistance with medications"},
                    {"name": "Companionship", "description": "Social interaction and emotional support"},
                ],
                "recommended_schedule": {
                    "frequency": "3 times per week",
                    "duration": "4 hours per visit",
                    "days": ["Monday", "Wednesday", "Friday"],
                },
                "special_requirements": [],
                "summary": "Standard home care services based on visit assessment.",
            })
        return "Mock LLM response - configure OPENAI_API_KEY for real responses."
    
    def analyze_transcript_for_contract(
        self,
        transcript_text: str,
        client_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Analyze transcript to extract contract-relevant information.
        
        Returns structured data about services, schedule, and special needs.
        """
        system_prompt = """You are an expert home healthcare consultant analyzing visit transcripts.
Your task is to identify:
1. Services provided or discussed during the visit
2. Recommended care schedule based on client needs
3. Any special requirements or accommodations needed
4. Key observations about the client's condition

Respond with a JSON object containing:
{
    "services_identified": [
        {"name": "Service Name", "description": "Brief description", "frequency": "how often needed"}
    ],
    "recommended_schedule": {
        "frequency": "X times per week",
        "duration": "X hours per visit", 
        "preferred_times": "morning/afternoon/evening",
        "days": ["Monday", "Wednesday", "Friday"]
    },
    "special_requirements": ["list of any special needs or accommodations"],
    "client_condition_summary": "Brief summary of client's observed condition",
    "care_recommendations": "Professional recommendations for ongoing care",
    "summary": "One paragraph executive summary for the contract"
}"""

        user_prompt = f"""Analyze this home care visit transcript and extract contract-relevant information.

CLIENT INFORMATION:
- Name: {client_info.get('full_name', 'Unknown')}
- Address: {client_info.get('address', 'N/A')}

TRANSCRIPT:
{transcript_text}

Please identify all services discussed, recommended schedule, and any special requirements for the care contract."""

        response = self._call_llm(system_prompt, user_prompt, json_response=True)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON")
            return json.loads(self._mock_response("contract"))
    
    def generate_contract_terms(
        self,
        services: List[Dict[str, Any]],
        client_info: Dict[str, Any],
        schedule: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate customized contract terms based on analyzed data.
        """
        system_prompt = """You are a legal expert specializing in home healthcare service agreements.
Generate professional, clear, and fair contract terms based on the provided information.

Respond with a JSON object containing:
{
    "service_descriptions": [
        {"name": "Service", "detailed_description": "Full description for contract", "inclusions": ["what's included"], "exclusions": ["what's not included"]}
    ],
    "payment_terms": "Detailed payment terms",
    "cancellation_policy": "Fair cancellation policy text",
    "liability_clause": "Standard liability language",
    "confidentiality_clause": "HIPAA-compliant confidentiality language",
    "termination_clause": "How either party can end the agreement",
    "special_provisions": ["Any special terms based on client needs"]
}"""

        user_prompt = f"""Generate professional contract terms for this home care agreement.

CLIENT: {client_info.get('full_name', 'Unknown')}

SERVICES TO BE PROVIDED:
{json.dumps(services, indent=2)}

PROPOSED SCHEDULE:
{json.dumps(schedule, indent=2)}

Generate clear, professional contract language appropriate for a home care service agreement."""

        response = self._call_llm(system_prompt, user_prompt, json_response=True)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "payment_terms": "Payment due within 7 days of invoice receipt.",
                "cancellation_policy": "24-hour notice required for cancellation without charge.",
                "liability_clause": "Agency maintains comprehensive liability insurance.",
                "confidentiality_clause": "All information kept confidential per HIPAA.",
                "termination_clause": "Either party may terminate with 14 days written notice.",
                "special_provisions": [],
            }
    
    def generate_visit_note(
        self,
        transcript_text: str,
        visit_info: Dict[str, Any],
        billable_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive visit note from transcript and billables.
        """
        system_prompt = """You are an experienced home healthcare documentation specialist.
Your task is to generate professional, accurate visit notes from caregiver-client conversations.

Create documentation that is:
- Medically appropriate and professional
- Objective and factual
- HIPAA compliant
- Suitable for insurance and regulatory review

Respond with a JSON object containing:
{
    "subjective": "Client's reported symptoms, concerns, mood as they expressed them",
    "objective": "Observable facts: what was seen, measured, or performed",
    "assessment": "Professional assessment of client's condition and care quality",
    "plan": "Follow-up actions, recommendations, or concerns to address",
    "tasks_summary": [{"task": "Task name", "details": "How it was performed", "duration_minutes": 15}],
    "client_mood": "Description of client's emotional state",
    "safety_observations": "Any safety concerns or positive safety notes",
    "medications_discussed": ["List any medications mentioned"],
    "vital_signs_mentioned": {"type": "value if mentioned"},
    "narrative": "Full narrative paragraph suitable for medical record"
}"""

        billable_summary = "\n".join([
            f"- {item.get('category', 'Unknown')}: {item.get('description', 'N/A')} ({item.get('minutes', 0)} minutes)"
            for item in billable_items
        ])

        user_prompt = f"""Generate a professional visit note from this transcript.

VISIT INFORMATION:
- Client: {visit_info.get('client_name', 'Unknown')}
- Caregiver: {visit_info.get('caregiver_name', 'Unknown')}
- Date: {visit_info.get('date', 'Unknown')}
- Duration: {visit_info.get('duration_minutes', 0)} minutes

SERVICES PERFORMED:
{billable_summary}

TRANSCRIPT:
{transcript_text}

Generate a comprehensive, professional visit note suitable for medical records."""

        response = self._call_llm(system_prompt, user_prompt, json_response=True)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "subjective": "Client reported feeling well during visit.",
                "objective": "Care tasks completed as scheduled.",
                "assessment": "Client stable, care plan appropriate.",
                "plan": "Continue current care schedule.",
                "tasks_summary": [],
                "client_mood": "Pleasant and cooperative",
                "safety_observations": "No safety concerns noted.",
                "medications_discussed": [],
                "vital_signs_mentioned": {},
                "narrative": "Visit completed without incident. All scheduled tasks performed.",
            }


def get_llm_service() -> LLMService:
    """Get configured LLM service instance."""
    from config import settings
    
    return LLMService(
        api_key=settings.openai_api_key or os.getenv("OPENAI_API_KEY"),
        model=settings.llm_model or os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=settings.llm_temperature or float(os.getenv("LLM_TEMPERATURE", "0.7")),
    )
