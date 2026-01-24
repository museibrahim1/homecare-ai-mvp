"""
Contract Generation for Worker

Generates service contracts from client and visit data.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import date
from decimal import Decimal

logger = logging.getLogger(__name__)


def generate_contract_data(
    client_data: Dict[str, Any],
    services: List[Dict[str, Any]] = None,
    schedule: Dict[str, Any] = None,
    hourly_rate: float = 25.00,
    weekly_hours: float = 12.0,
) -> Dict[str, Any]:
    """Generate structured contract data."""
    
    if not services:
        services = [
            {"name": "Personal Care", "description": "Bathing, grooming, dressing assistance"},
            {"name": "Meal Preparation", "description": "Preparing nutritious meals"},
            {"name": "Medication Reminders", "description": "Reminding client to take medications"},
            {"name": "Light Housekeeping", "description": "Basic cleaning and organizing"},
            {"name": "Companionship", "description": "Social interaction and supervision"},
        ]
    
    if not schedule:
        schedule = {
            "days": ["Monday", "Wednesday", "Friday"],
            "start_time": "09:00",
            "end_time": "13:00",
            "hours_per_visit": 4,
        }
    
    weekly_cost = hourly_rate * weekly_hours
    monthly_estimate = weekly_cost * 4.33
    
    return {
        "client": {
            "name": client_data.get("full_name", ""),
            "address": client_data.get("address", ""),
            "phone": client_data.get("phone", ""),
            "emergency_contact": client_data.get("emergency_contact_name", ""),
            "emergency_phone": client_data.get("emergency_contact_phone", ""),
        },
        "services": services,
        "schedule": schedule,
        "rates": {
            "hourly_rate": hourly_rate,
            "weekly_hours": weekly_hours,
            "weekly_cost": weekly_cost,
            "monthly_estimate": monthly_estimate,
        },
        "terms": {
            "start_date": date.today().isoformat(),
            "duration": "Ongoing until terminated",
            "notice_period": "14 days written notice required",
            "payment_terms": "Payment due within 7 days of invoice",
        },
        "policies": {
            "cancellation": _cancellation_policy(),
            "liability": _liability_clause(),
            "confidentiality": _confidentiality_clause(),
        },
    }


def _cancellation_policy() -> str:
    return """Cancellation Policy:
- Cancellations made more than 24 hours in advance: No charge
- Cancellations made within 24 hours: 50% of scheduled visit fee
- No-show without notice: 100% of scheduled visit fee
- Emergency cancellations evaluated on a case-by-case basis"""


def _liability_clause() -> str:
    return """Liability:
The Agency maintains comprehensive liability insurance. Caregivers are 
employees of the Agency and are covered under workers' compensation. 
The Agency is not responsible for valuables left unsecured in the home."""


def _confidentiality_clause() -> str:
    return """Confidentiality:
All client information is kept strictly confidential in accordance with 
HIPAA regulations. Information will only be shared with healthcare providers 
directly involved in the client's care or as required by law."""
