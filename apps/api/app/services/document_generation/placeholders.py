"""Template placeholder extraction for document generation."""

import io
import re
import base64
import logging
from typing import Any, List, Dict, Optional
from datetime import date

logger = logging.getLogger(__name__)


def get_template_placeholders(client: Any, contract: Any, agency_settings: Optional[Any] = None) -> Dict[str, str]:
    """
    Build a dictionary of all template placeholders and their values.
    
    Supports placeholders like:
    - {client_name}, {{client_name}}, [client_name], [[client_name]]
    - {CLIENT_NAME} (case-insensitive)
    """
    schedule = contract.schedule or {}
    services = contract.services or []
    client_profile = schedule.get("client_profile", {})
    
    # Calculate costs
    hourly_rate = float(contract.hourly_rate or 0)
    weekly_hours = float(contract.weekly_hours or 0)
    weekly_cost = hourly_rate * weekly_hours
    monthly_cost = weekly_cost * 4.33
    
    # Format schedule days
    days = schedule.get("preferred_days", [])
    if isinstance(days, list):
        days_str = ", ".join([
            d if isinstance(d, str) else (d.get('day', str(d)) if isinstance(d, dict) else str(d)) 
            for d in days
        ]) if days else "To be determined"
    else:
        days_str = str(days) if days else "To be determined"
    
    # Format services list
    services_text = ""
    for i, svc in enumerate(services, 1):
        if isinstance(svc, str):
            services_text += f"{i}. {svc}\n"
        else:
            name = svc.get('name', 'Service')
            desc = svc.get('description', '')
            freq = svc.get('frequency', '')
            line = f"{i}. {name}"
            if desc:
                line += f": {desc}"
            if freq:
                line += f" ({freq})"
            services_text += line + "\n"
    
    # Format special requirements
    special_reqs = schedule.get("special_requirements", [])
    reqs_text = ""
    for req in special_reqs:
        if isinstance(req, str):
            reqs_text += f"• {req}\n"
        elif isinstance(req, dict):
            reqs_text += f"• {req.get('name', req.get('requirement', str(req)))}\n"
    
    # Format safety concerns
    safety = schedule.get("safety_concerns", [])
    safety_text = ""
    for concern in safety:
        if isinstance(concern, str):
            safety_text += f"• {concern}\n"
        elif isinstance(concern, dict):
            safety_text += f"• {concern.get('concern', str(concern))}\n"
    
    # Agency info
    agency_name = "Home Care Services Agency"
    agency_address = ""
    agency_city = ""
    agency_state = ""
    agency_zip = ""
    agency_phone = ""
    agency_email = ""
    
    if agency_settings:
        agency_name = agency_settings.name or agency_name
        agency_address = agency_settings.address or ""
        agency_city = agency_settings.city or ""
        agency_state = agency_settings.state or ""
        agency_zip = agency_settings.zip_code or ""
        agency_phone = agency_settings.phone or ""
        agency_email = agency_settings.email or ""
    
    # Build full agency address
    agency_full_address = agency_address
    city_state_zip = ", ".join(filter(None, [agency_city, agency_state])) 
    if agency_zip:
        city_state_zip += f" {agency_zip}"
    if city_state_zip:
        agency_full_address += f"\n{city_state_zip}" if agency_full_address else city_state_zip
    
    # All placeholders (multiple variations for flexibility)
    placeholders = {
        # Dates
        'date': date.today().strftime('%B %d, %Y'),
        'contract_date': date.today().strftime('%B %d, %Y'),
        'effective_date': date.today().strftime('%B %d, %Y'),
        'today': date.today().strftime('%B %d, %Y'),
        'current_date': date.today().strftime('%B %d, %Y'),
        
        # Agency info
        'agency_name': agency_name,
        'agency': agency_name,
        'company_name': agency_name,
        'provider_name': agency_name,
        'agency_address': agency_full_address,
        'agency_street': agency_address,
        'agency_city': agency_city,
        'agency_state': agency_state,
        'agency_zip': agency_zip,
        'agency_zip_code': agency_zip,
        'agency_phone': agency_phone,
        'agency_email': agency_email,
        
        # Client info
        'client_name': client.full_name or '',
        'client': client.full_name or '',
        'patient_name': client.full_name or '',
        'patient': client.full_name or '',
        'client_first_name': (client.full_name or '').split()[0] if client.full_name else '',
        'client_last_name': (client.full_name or '').split()[-1] if client.full_name and len((client.full_name or '').split()) > 1 else '',
        'client_address': client.address or '',
        'client_street': client.address or '',
        'client_city': client.city or '',
        'client_state': client.state or '',
        'client_zip': client.zip_code or '',
        'client_zip_code': client.zip_code or '',
        'client_phone': client.phone or '',
        'home_phone': client.phone or '',
        'work_phone': getattr(client, 'work_phone', '') or '',
        'cell_phone': client.phone or '',
        'client_email': client.email or '',
        'date_of_birth': getattr(client, 'date_of_birth', '') or '',
        'dob': getattr(client, 'date_of_birth', '') or '',
        'emergency_contact': client.emergency_contact_name or '',
        'emergency_contact_name': client.emergency_contact_name or '',
        'emergency_phone': client.emergency_contact_phone or '',
        'emergency_contact_phone': client.emergency_contact_phone or '',
        
        # Care assessment
        'care_level': schedule.get('care_need_level', 'MODERATE'),
        'care_need_level': schedule.get('care_need_level', 'MODERATE'),
        'primary_diagnosis': client_profile.get('primary_diagnosis', 'See medical records'),
        'diagnosis': client_profile.get('primary_diagnosis', 'See medical records'),
        'mobility_status': client_profile.get('mobility_status', 'N/A'),
        'mobility': client_profile.get('mobility_status', 'N/A'),
        'cognitive_status': client_profile.get('cognitive_status', 'N/A'),
        'living_situation': client_profile.get('living_situation', 'N/A'),
        
        # Services
        'services': services_text.strip() or 'As determined by care plan',
        'services_list': services_text.strip() or 'As determined by care plan',
        
        # Schedule
        'schedule_days': days_str,
        'days': days_str,
        'preferred_days': days_str,
        'schedule_time': schedule.get('preferred_times', 'Flexible'),
        'preferred_time': schedule.get('preferred_times', 'Flexible'),
        'time': schedule.get('preferred_times', 'Flexible'),
        'frequency': schedule.get('frequency', 'As scheduled'),
        'weekly_hours': f"{weekly_hours:.0f}",
        'hours_per_week': f"{weekly_hours:.0f}",
        
        # Rates
        'hourly_rate': f"${hourly_rate:.2f}",
        'hourly_rate_value': f"{hourly_rate:.2f}",  # Without $ sign
        'rate': f"${hourly_rate:.2f}",
        'rate_value': f"{hourly_rate:.2f}",
        'weekly_cost': f"${weekly_cost:.2f}",
        'weekly_estimate': f"${weekly_cost:.2f}",
        'monthly_cost': f"${monthly_cost:.2f}",
        'monthly_estimate': f"${monthly_cost:.2f}",
        'weekday_rate': f"{hourly_rate:.2f}",
        'weekend_rate': f"{hourly_rate * 1.25:.2f}",  # 25% premium
        'holiday_rate': f"{hourly_rate * 1.5:.2f}",  # Time and a half
        
        # Requirements and safety
        'special_requirements': reqs_text.strip() or 'None specified',
        'requirements': reqs_text.strip() or 'None specified',
        'safety_concerns': safety_text.strip() or 'None noted',
        'safety': safety_text.strip() or 'None noted',

        # Contract ID
        'contract_id': str(contract.id) if contract.id else '',

        # Additional billing fields for custom templates
        'admin_fee': '25',
        'deposit': f"${weekly_cost:.2f}" if weekly_cost else '',
        'prepayment': '',
        'ssn': '',
        'medicaid_number': '',
        'medicare_number': '',
        'physician_name': '',
        'physician_phone': '',

        # Cancellation / Terms / Policies (long text)
        'cancellation_policy': getattr(contract, 'cancellation_policy', '') or 'Either party may terminate this agreement with 30 days written notice.',
        'terms_and_conditions': getattr(contract, 'terms_and_conditions', '') or '',
        'policies_and_procedures': getattr(contract, 'policies_and_procedures', '') or '',
    }
    
    return placeholders


