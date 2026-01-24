"""
Contract Generation Service

Generates service contracts from client and visit data.
"""

from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal


def generate_contract_data(
    client_data: Dict[str, Any],
    services: List[Dict[str, Any]] = None,
    schedule: Dict[str, Any] = None,
    hourly_rate: Decimal = None,
    weekly_hours: Decimal = None,
) -> Dict[str, Any]:
    """
    Generate structured contract data.
    """
    
    # Default services if none provided
    if not services:
        services = [
            {"name": "Personal Care", "description": "Bathing, grooming, dressing assistance", "rate_modifier": 1.0},
            {"name": "Meal Preparation", "description": "Preparing nutritious meals", "rate_modifier": 1.0},
            {"name": "Medication Reminders", "description": "Reminding client to take medications", "rate_modifier": 1.0},
            {"name": "Light Housekeeping", "description": "Basic cleaning and organizing", "rate_modifier": 1.0},
            {"name": "Companionship", "description": "Social interaction and supervision", "rate_modifier": 1.0},
        ]
    
    # Default schedule if none provided
    if not schedule:
        schedule = {
            "days": ["Monday", "Wednesday", "Friday"],
            "start_time": "09:00",
            "end_time": "13:00",
            "hours_per_visit": 4,
        }
    
    # Calculate weekly cost
    hours_per_week = weekly_hours or Decimal("12")
    rate = hourly_rate or Decimal("25.00")
    weekly_cost = hours_per_week * rate
    monthly_estimate = weekly_cost * Decimal("4.33")
    
    contract_data = {
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
            "hourly_rate": float(rate),
            "weekly_hours": float(hours_per_week),
            "weekly_cost": float(weekly_cost),
            "monthly_estimate": float(monthly_estimate),
        },
        "terms": {
            "start_date": date.today().isoformat(),
            "duration": "Ongoing until terminated",
            "notice_period": "14 days written notice required",
            "payment_terms": "Payment due within 7 days of invoice",
        },
        "policies": {
            "cancellation": generate_cancellation_policy(),
            "liability": generate_liability_clause(),
            "confidentiality": generate_confidentiality_clause(),
        },
    }
    
    return contract_data


def generate_cancellation_policy() -> str:
    """Generate standard cancellation policy."""
    return """
Cancellation Policy:
- Cancellations made more than 24 hours in advance: No charge
- Cancellations made within 24 hours: 50% of scheduled visit fee
- No-show without notice: 100% of scheduled visit fee
- Emergency cancellations will be evaluated on a case-by-case basis
""".strip()


def generate_liability_clause() -> str:
    """Generate standard liability clause."""
    return """
Liability:
The Agency maintains comprehensive liability insurance. Caregivers are 
employees of the Agency and are covered under workers' compensation. 
The Agency is not responsible for valuables left unsecured in the home.
""".strip()


def generate_confidentiality_clause() -> str:
    """Generate confidentiality clause."""
    return """
Confidentiality:
All client information is kept strictly confidential in accordance with 
HIPAA regulations. Information will only be shared with healthcare providers 
directly involved in the client's care or as required by law.
""".strip()


def generate_contract_text(contract_data: Dict[str, Any]) -> str:
    """
    Generate full contract text from structured data.
    """
    client = contract_data.get("client", {})
    services = contract_data.get("services", [])
    schedule = contract_data.get("schedule", {})
    rates = contract_data.get("rates", {})
    terms = contract_data.get("terms", {})
    policies = contract_data.get("policies", {})
    
    text_parts = []
    
    # Header
    text_parts.append("HOME CARE SERVICE AGREEMENT")
    text_parts.append("=" * 50)
    text_parts.append("")
    
    # Client Information
    text_parts.append("CLIENT INFORMATION")
    text_parts.append("-" * 30)
    text_parts.append(f"Name: {client.get('name', '')}")
    text_parts.append(f"Address: {client.get('address', '')}")
    text_parts.append(f"Phone: {client.get('phone', '')}")
    text_parts.append(f"Emergency Contact: {client.get('emergency_contact', '')} - {client.get('emergency_phone', '')}")
    text_parts.append("")
    
    # Services
    text_parts.append("SERVICES PROVIDED")
    text_parts.append("-" * 30)
    for service in services:
        text_parts.append(f"• {service.get('name', '')}: {service.get('description', '')}")
    text_parts.append("")
    
    # Schedule
    text_parts.append("SCHEDULE")
    text_parts.append("-" * 30)
    days = schedule.get("days", [])
    text_parts.append(f"Days: {', '.join(days)}")
    text_parts.append(f"Hours: {schedule.get('start_time', '')} - {schedule.get('end_time', '')}")
    text_parts.append(f"Hours per visit: {schedule.get('hours_per_visit', '')}")
    text_parts.append("")
    
    # Rates
    text_parts.append("RATES AND FEES")
    text_parts.append("-" * 30)
    text_parts.append(f"Hourly Rate: ${rates.get('hourly_rate', 0):.2f}")
    text_parts.append(f"Weekly Hours: {rates.get('weekly_hours', 0)}")
    text_parts.append(f"Estimated Weekly Cost: ${rates.get('weekly_cost', 0):.2f}")
    text_parts.append(f"Estimated Monthly Cost: ${rates.get('monthly_estimate', 0):.2f}")
    text_parts.append("")
    
    # Terms
    text_parts.append("TERMS")
    text_parts.append("-" * 30)
    text_parts.append(f"Start Date: {terms.get('start_date', '')}")
    text_parts.append(f"Duration: {terms.get('duration', '')}")
    text_parts.append(f"Notice Period: {terms.get('notice_period', '')}")
    text_parts.append(f"Payment: {terms.get('payment_terms', '')}")
    text_parts.append("")
    
    # Policies
    text_parts.append("POLICIES")
    text_parts.append("-" * 30)
    text_parts.append(policies.get("cancellation", ""))
    text_parts.append("")
    text_parts.append(policies.get("liability", ""))
    text_parts.append("")
    text_parts.append(policies.get("confidentiality", ""))
    text_parts.append("")
    
    # Signatures
    text_parts.append("SIGNATURES")
    text_parts.append("-" * 30)
    text_parts.append("")
    text_parts.append("Client Signature: _________________________ Date: _________")
    text_parts.append("")
    text_parts.append("Agency Representative: ___________________ Date: _________")
    
    return "\n".join(text_parts)
