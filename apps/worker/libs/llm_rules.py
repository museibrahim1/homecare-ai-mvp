"""
LLM Rules Configuration

Customize how the AI extracts information, generates contracts, and creates notes.
Edit this file to change AI behavior without modifying core code.
"""

# =============================================================================
# BUSINESS RULES - Rates and Hours
# =============================================================================

# Private pay rates (default)
HOURLY_RATES = {
    "HIGH": 35.00,      # Complex care needs
    "MODERATE": 30.00,  # Regular care needs
    "LOW": 25.00,       # Basic companionship
}

# =============================================================================
# MEDICAID BILLING RATES
# =============================================================================

MEDICAID_RATES = {
    # Companion Care - supervision, socialization, light housekeeping
    "COMPANION": 25.00,
    
    # Personal Care - ADLs: bathing, dressing, grooming, toileting, feeding
    # Also includes hospice and respite services
    "PERSONAL_CARE": 28.00,
    
    # Hospice companion/personal care - same as personal care rate
    "HOSPICE": 28.00,
    
    # Respite care - same as personal care rate  
    "RESPITE": 28.00,
}

# Service-to-Medicaid rate mapping
# Maps service categories to the correct Medicaid rate tier
MEDICAID_SERVICE_RATE_MAP = {
    # $25/hr - Companion Care services
    "companion care": "COMPANION",
    "companionship": "COMPANION",
    "supervision": "COMPANION",
    "emotional support": "COMPANION",
    "light housekeeping": "COMPANION",
    "homemaker": "COMPANION",
    "housekeeping": "COMPANION",
    "transportation": "COMPANION",
    "escort": "COMPANION",
    "errands": "COMPANION",
    
    # $28/hr - Personal Care services (including hospice & respite)
    "personal care": "PERSONAL_CARE",
    "bathing": "PERSONAL_CARE",
    "dressing": "PERSONAL_CARE",
    "grooming": "PERSONAL_CARE",
    "toileting": "PERSONAL_CARE",
    "feeding": "PERSONAL_CARE",
    "meal preparation": "PERSONAL_CARE",
    "medication management": "PERSONAL_CARE",
    "medication": "PERSONAL_CARE",
    "mobility assistance": "PERSONAL_CARE",
    "transfer": "PERSONAL_CARE",
    "ambulation": "PERSONAL_CARE",
    "wound care": "PERSONAL_CARE",
    "vital signs": "PERSONAL_CARE",
    "health monitoring": "PERSONAL_CARE",
    "skilled nursing": "PERSONAL_CARE",
    "dementia care": "PERSONAL_CARE",
    "alzheimer": "PERSONAL_CARE",
    "hospice": "HOSPICE",
    "respite": "RESPITE",
    "respite care": "RESPITE",
}

# Medicare rates (can be customized per agency contract)
MEDICARE_RATES = {
    "SKILLED_NURSING": 45.00,
    "HOME_HEALTH_AIDE": 28.00,
    "PERSONAL_CARE": 30.00,
}

# Minimum/Maximum hours per week
MIN_HOURS_PER_WEEK = 4
MAX_HOURS_PER_WEEK = 60

# Minimum hours per visit
MIN_HOURS_PER_VISIT = 2

# Overtime multiplier (weekends/holidays)
OVERTIME_MULTIPLIER = 1.5

# =============================================================================
# SERVICE CATEGORIES - What services your agency provides
# =============================================================================

SERVICE_CATEGORIES = [
    {
        "name": "Personal Care/ADL Assistance",
        "description": "Bathing, dressing, grooming, toileting, feeding assistance",
        "includes": ["bathing", "shower", "dressing", "grooming", "oral care", "shaving", "toileting", "incontinence care"],
        "billable": True,
    },
    {
        "name": "Medication Management",
        "description": "Medication reminders, pill box organization, compliance monitoring",
        "includes": ["medication reminder", "pill organizer", "medication compliance"],
        "billable": True,
    },
    {
        "name": "Meal Preparation",
        "description": "Cooking meals, special diets, nutrition monitoring, feeding assistance",
        "includes": ["cooking", "meal prep", "feeding", "nutrition", "diabetic diet", "special diet"],
        "billable": True,
    },
    {
        "name": "Light Housekeeping",
        "description": "Cleaning, laundry, dishes, changing linens, organizing",
        "includes": ["cleaning", "laundry", "dishes", "vacuuming", "organizing", "linens"],
        "billable": True,
    },
    {
        "name": "Companion Care",
        "description": "Supervision, conversation, activities, emotional support",
        "includes": ["companionship", "conversation", "activities", "supervision", "emotional support"],
        "billable": True,
    },
    {
        "name": "Mobility Assistance",
        "description": "Transfers, ambulation, wheelchair assistance, exercises",
        "includes": ["transfer", "walking", "wheelchair", "ambulation", "exercises", "gait belt"],
        "billable": True,
    },
    {
        "name": "Transportation/Escort",
        "description": "Doctor appointments, errands, shopping assistance",
        "includes": ["transportation", "escort", "appointment", "errands", "shopping"],
        "billable": True,
    },
    {
        "name": "Respite Care",
        "description": "Relief for family caregivers",
        "includes": ["respite", "caregiver relief", "family break"],
        "billable": True,
    },
    {
        "name": "Skilled Nursing",
        "description": "Wound care, vital signs, catheter care (if licensed)",
        "includes": ["wound care", "vital signs", "catheter", "injection", "blood sugar"],
        "billable": True,
        "requires_license": True,
    },
    {
        "name": "Dementia/Alzheimer's Care",
        "description": "Specialized supervision, redirection, safety monitoring",
        "includes": ["dementia care", "alzheimer", "memory care", "redirection", "wandering prevention"],
        "billable": True,
        "specialty": True,
    },
]

# =============================================================================
# CARE LEVEL RULES - When to assign HIGH/MODERATE/LOW
# =============================================================================

# Conditions that indicate HIGH care level
HIGH_CARE_INDICATORS = [
    "dementia",
    "alzheimer",
    "parkinson",
    "stroke",
    "heart failure",
    "chf",
    "copd",
    "diabetes requiring monitoring",
    "frequent falls",
    "bedbound",
    "wheelchair dependent",
    "total incontinence",
    "feeding tube",
    "oxygen therapy",
    "wound care",
    "multiple chronic conditions",
    "recent hospitalization",
    "lives alone with cognitive impairment",
    "caregiver burnout",
    "depression",
    "anxiety",
]

# Conditions that indicate MODERATE care level
MODERATE_CARE_INDICATORS = [
    "uses walker",
    "occasional incontinence",
    "mild forgetfulness",
    "arthritis",
    "diabetes well-controlled",
    "hypertension controlled",
    "needs meal preparation",
    "needs housekeeping help",
    "needs medication reminders",
]

# Default to LOW only if no indicators present
LOW_CARE_DEFAULT = True

# =============================================================================
# EXTRACTION RULES - What to look for in transcripts
# =============================================================================

# Keywords to identify ADL needs
ADL_KEYWORDS = {
    "bathing": ["bath", "shower", "wash", "hygiene", "sponge bath"],
    "dressing": ["dress", "clothes", "buttons", "zipper", "shoes"],
    "eating": ["feed", "eating", "meal", "swallow", "choke"],
    "toileting": ["bathroom", "toilet", "incontinence", "catheter", "ostomy"],
    "transferring": ["transfer", "bed to chair", "lift", "hoyer", "gait belt"],
    "walking": ["walk", "ambulate", "mobility", "walker", "cane", "wheelchair"],
}

# Keywords to identify IADL needs
IADL_KEYWORDS = {
    "meal_preparation": ["cook", "meal prep", "kitchen", "stove"],
    "housekeeping": ["clean", "laundry", "vacuum", "dishes"],
    "medication": ["medication", "pills", "prescription", "pharmacy"],
    "transportation": ["drive", "appointment", "errands", "shopping"],
    "finances": ["bills", "banking", "money", "finances"],
}

# Safety concern keywords
SAFETY_KEYWORDS = {
    "fall_risk": ["fall", "unsteady", "balance", "dizziness", "vertigo"],
    "wandering": ["wander", "elope", "gets lost", "confusion at night"],
    "fire_safety": ["stove on", "cooking safety", "burns", "fire risk"],
    "medication_safety": ["wrong medication", "overdose", "missed dose", "confusion about meds"],
}

# =============================================================================
# CONTRACT GENERATION RULES
# =============================================================================

CONTRACT_RULES = {
    # Notice period for cancellation (hours)
    "cancellation_notice_hours": 24,
    
    # Percentage charged for late cancellation
    "late_cancellation_fee_percent": 50,
    
    # Termination notice period (days)
    "termination_notice_days": 14,
    
    # Payment terms (days)
    "payment_due_days": 7,
    
    # Include these standard clauses
    "standard_clauses": [
        "cancellation_policy",
        "liability_insurance",
        "confidentiality_hipaa",
        "termination_rights",
        "caregiver_background_checks",
        "emergency_procedures",
    ],
}

# =============================================================================
# NOTE GENERATION RULES
# =============================================================================

NOTE_RULES = {
    # Always include these sections in visit notes
    "required_sections": [
        "subjective",      # Client's reported feelings
        "objective",       # Observable facts
        "assessment",      # Professional evaluation
        "plan",           # Next steps
        "tasks_performed", # What was done
    ],
    
    # Flag these observations for supervisor review
    "alert_triggers": [
        "fall",
        "skin breakdown",
        "confusion",
        "medication error",
        "missed medication",
        "weight change",
        "refused care",
        "behavioral change",
        "signs of abuse",
        "neglect",
    ],
    
    # Minimum documentation per visit
    "minimum_tasks_documented": 1,
}

# =============================================================================
# AGENCY INFORMATION - Your company details
# =============================================================================

AGENCY_INFO = {
    "name": "Your Home Care Agency",
    "address": "123 Main Street, City, State ZIP",
    "phone": "(555) 123-4567",
    "email": "info@youragency.com",
    "license_number": "HC-12345",
    "npi_number": "1234567890",
    "tax_id": "XX-XXXXXXX",
}

# =============================================================================
# CUSTOM PROMPTS - Override default LLM behavior
# =============================================================================

# Add custom instructions to the contract extraction prompt
CUSTOM_EXTRACTION_INSTRUCTIONS = """
# Add your custom instructions here. Examples:

# - Always identify if client is a veteran (VA benefits may apply)
# - Check for long-term care insurance mentions
# - Note if client prefers morning or afternoon visits
# - Flag if client has pets that may affect care
# - Identify cultural or religious considerations
"""

# Add custom instructions to the contract generation prompt
CUSTOM_CONTRACT_INSTRUCTIONS = """
# Add your custom contract clauses here. Examples:

# - Pet policy: Caregiver is not responsible for pet care
# - Smoking policy: No smoking during visits
# - Holiday rate: 1.5x regular rate applies on major holidays
# - Background check: All caregivers pass FBI background check
"""

# Add custom instructions to the note generation prompt
CUSTOM_NOTE_INSTRUCTIONS = """
# Add your custom note requirements here. Examples:

# - Always document fluid intake for clients on diuretics
# - Note if client ate breakfast before AM visit
# - Document fall risk assessment on each visit
# - Record pain level (0-10) if applicable
"""

# =============================================================================
# DO NOT EXTRACT - Services outside your scope
# =============================================================================

EXCLUDED_SERVICES = [
    "physical therapy",
    "occupational therapy", 
    "speech therapy",
    "medical equipment sales",
    "hospital services",
    "doctor appointments content",
    "surgery",
    "lab work",
    "x-rays",
    "insurance questions",
    "legal advice",
    "financial planning",
]

# =============================================================================
# HELPER FUNCTION - Get rules as dict for LLM prompt
# =============================================================================

def get_rules_for_prompt() -> str:
    """Format rules for inclusion in LLM prompts."""
    rules = f"""
## YOUR AGENCY'S BUSINESS RULES

### Private Pay Hourly Rates
- HIGH Care Level: ${HOURLY_RATES['HIGH']:.2f}/hour
- MODERATE Care Level: ${HOURLY_RATES['MODERATE']:.2f}/hour  
- LOW Care Level: ${HOURLY_RATES['LOW']:.2f}/hour
- Overtime (weekends/holidays): {OVERTIME_MULTIPLIER}x regular rate

### Medicaid Rates (Fixed - Not adjustable)
- Companion Care: ${MEDICAID_RATES['COMPANION']:.2f}/hour (supervision, socialization, light housekeeping)
- Personal Care: ${MEDICAID_RATES['PERSONAL_CARE']:.2f}/hour (ADLs, medication, health monitoring)
- Hospice: ${MEDICAID_RATES['HOSPICE']:.2f}/hour
- Respite: ${MEDICAID_RATES['RESPITE']:.2f}/hour

### Medicare Rates
- Skilled Nursing: ${MEDICARE_RATES['SKILLED_NURSING']:.2f}/hour
- Home Health Aide: ${MEDICARE_RATES['HOME_HEALTH_AIDE']:.2f}/hour
- Personal Care: ${MEDICARE_RATES['PERSONAL_CARE']:.2f}/hour

### Service Hours
- Minimum per visit: {MIN_HOURS_PER_VISIT} hours
- Minimum per week: {MIN_HOURS_PER_WEEK} hours
- Maximum per week: {MAX_HOURS_PER_WEEK} hours

### Service Categories Available
"""
    for svc in SERVICE_CATEGORIES:
        rules += f"- **{svc['name']}**: {svc['description']}\n"
    
    rules += f"""
### Care Level Assignment
Assign HIGH level if any of these present:
{', '.join(HIGH_CARE_INDICATORS[:10])}...

{CUSTOM_EXTRACTION_INSTRUCTIONS}

### Contract Terms
- Cancellation notice: {CONTRACT_RULES['cancellation_notice_hours']} hours
- Late cancellation fee: {CONTRACT_RULES['late_cancellation_fee_percent']}%
- Termination notice: {CONTRACT_RULES['termination_notice_days']} days
- Payment due: {CONTRACT_RULES['payment_due_days']} days

{CUSTOM_CONTRACT_INSTRUCTIONS}

### Note Requirements
Required sections: {', '.join(NOTE_RULES['required_sections'])}
Alert triggers: {', '.join(NOTE_RULES['alert_triggers'][:5])}...

{CUSTOM_NOTE_INSTRUCTIONS}

### Services NOT Provided (ignore these in transcript)
{', '.join(EXCLUDED_SERVICES)}
"""
    return rules
