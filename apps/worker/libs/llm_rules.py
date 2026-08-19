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

# PalmCare product intent + hard extraction guardrails.
# Injected into assessment/contract LLM prompts. State knowledge informs
# compliance fields; it must never erase facts the patient already stated.
PRODUCT_INTENT = """
PalmCare AI turns ONE recorded home-care assessment into four deliverables:
1) care plan needs, 2) billable items, 3) clinical/intake notes, 4) service contract.

The contract Schedule, weekly hours, hourly rate, and identified services are
first-class product outputs. Agencies use them the same day. Missing a spoken
schedule or rate is a product failure.
"""

EXTRACTION_GUARDRAILS = """
HARD GUARDRAILS (override state knowledge, examples, and JSON defaults):

1. TRANSCRIPT WINS
   - Extract only what the recording says. Empty/null beats inventing.
   - Do not invent ADLs, diagnoses, hours, rates, services, or schedules.

2. SPOKEN SCHEDULE IS MANDATORY TO CAPTURE
   - If the client/family states ANY schedule, cadence, or hours, you MUST set:
     stated_weekly_hours, recommended_schedule.total_hours_per_week,
     preferred_days and/or preferred_times when stated, and frequency.
   - Accept any phrasing: "Mon-Fri 8:30 to 7", "10 hours a week",
     "4 hours a day, 5 days a week", "Tuesdays and Thursdays", etc.
   - NEVER invent TBD / "to be determined" / 0 hrs/wk service_hours rows.
   - NEVER wipe or refuse a spoken schedule because a formal state tool
     (SLUMS, PHQ, NSI, ADL scoring, prior authorization, full CMP assessment)
     is still incomplete. Put unfinished formal tools ONLY in
     special_requirements. Do not put them in care_plan_goals or in
     recommended_schedule as a reason to leave hours at 0.

2b. CARE PLAN GOALS ARE VISIT-DERIVED CARE, NOT ADMIN CHECKLISTS
   - care_plan_goals must describe what the aide will do for this client
     from the conversation (bathing, med reminders, meals, transfers,
     fall safety, companionship, housekeeping).
   - FORBIDDEN in care_plan_goals: completing a state assessment tool,
     SLUMS / PHQ / NSI / CMP forms, prior authorization, waiver enrollment,
     "establish baseline scores", "obtain managed-care auth", "complete
     full assessment within N days", or any paperwork the agency still
     owes. Those are special_requirements or follow-up admin, never goals.

3. SPOKEN RATE IS MANDATORY TO CAPTURE
   - If a dollar rate is spoken ("$18 an hour"), set quoted_hourly_rate.

4. SERVICES
   - Only home-care services grounded with a direct transcript quote as evidence.
   - Declined services go in declined_services, not services_identified.
   - If this is unrelated audio with no in-home functional need (out_of_scope),
     empty services is correct. A simulated patient interview that describes
     inability to manage at home or "we need help" is an assessment.

5. STATE KNOWLEDGE ROLE
   - Use state rules for required disclosures, billing codes, and missing-field
     checklists. Do not use state rules to invent clinical facts or erase spoken ones.

6. OUTPUT DISCIPLINE
   - Prefer null/[] when unknown. Prefer a spoken approximate over blank when
     the patient stated one. Never fabricate precision.
"""

# Add custom instructions to the contract extraction prompt
CUSTOM_EXTRACTION_INSTRUCTIONS = f"""
## WHAT WE ARE BUILDING
{PRODUCT_INTENT.strip()}

## EXTRACTION GUARDRAILS
{EXTRACTION_GUARDRAILS.strip()}
"""

# Add custom instructions to the contract generation prompt
CUSTOM_CONTRACT_INSTRUCTIONS = """
Contract schedule and rates must reflect assessment facts:
- Prefer stated_weekly_hours and quoted_hourly_rate from the assessment.
- Do not replace a spoken schedule with "to be determined" boilerplate.
- Formal assessment / prior-auth follow-ups belong in special_requirements,
  not care_plan_goals and not as zeroed schedule rows.
- care_plan_goals must be aide-facing goals grounded in the visit
  (personal care, meds, meals, mobility). Never list SLUMS, PHQ, NSI,
  CMP, prior auth, or waiver paperwork as goals.
"""

# Add custom instructions to the note generation prompt
CUSTOM_NOTE_INSTRUCTIONS = """
When the intake discussed schedule or hours, mention them in the plan or
assessment narrative. Do not claim formal scoring tools were completed unless
the transcript says they were.
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

def get_product_guardrails_for_prompt() -> str:
    """Product intent + hard extraction guardrails for assessment/contract LLMs."""
    return f"""## WHAT PALMCARE IS BUILDING
{PRODUCT_INTENT.strip()}

## HARD EXTRACTION GUARDRAILS (override everything else in this prompt)
{EXTRACTION_GUARDRAILS.strip()}
"""


def get_rules_for_prompt() -> str:
    """Format rules for inclusion in LLM prompts."""
    rules = get_product_guardrails_for_prompt()
    rules += f"""
## YOUR AGENCY'S BUSINESS RULES

### Private Pay Hourly Rates
- HIGH Care Level: ${HOURLY_RATES['HIGH']:.2f}/hour
- MODERATE Care Level: ${HOURLY_RATES['MODERATE']:.2f}/hour  
- LOW Care Level: ${HOURLY_RATES['LOW']:.2f}/hour
- Overtime (weekends/holidays): {OVERTIME_MULTIPLIER}x regular rate

### Medicaid Rates (Default — agency can customize)
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
