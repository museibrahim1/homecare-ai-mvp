"""
LLM Service for AI-powered text generation.

Supports both OpenAI (GPT) and Anthropic (Claude) models.
Enhanced with homecare/care assessment domain knowledge.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)

# Optional imports - gracefully handle if not installed
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


# =============================================================================
# CARE ASSESSMENT DOMAIN KNOWLEDGE
# =============================================================================

# Research-based assessment framework from:
# "Development of the Essential Individual Care Needs Assessment Tool for Public Health Nurses"
# PMC12000994 - Public Health Nursing, 2025
# https://pmc.ncbi.nlm.nih.gov/articles/PMC12000994/

EICNA_FRAMEWORK = """
## ESSENTIAL INDIVIDUAL CARE NEEDS ASSESSMENT (EICNA) FRAMEWORK

Based on validated research (Yoshioka-Maeda et al., 2025), this framework uses 21 essential
assessment items to determine care need levels. Items are weighted by φ (phi) coefficients
indicating their correlation with high care needs.

### ASSESSMENT DOMAINS AND WEIGHTED ITEMS

#### BIO (Physical/Medical) Domain
| Item | Weight (φ) | What to Assess |
|------|------------|----------------|
| Insufficient medical care | 0.428 | Not receiving needed medical treatment, missed appointments |
| Sudden deterioration of disease | 0.388 | Recent health decline, unstable symptoms |
| Poor daily care/lifestyle habits | 0.373 | Nutrition, hygiene, sleep, exercise deficits |

#### PSYCHO (Psychological) Domain
| Item | Weight (φ) | What to Assess |
|------|------------|----------------|
| Inability to accept situation | 0.391 | Denial, not recognizing need for help |
| Refusal attitude to intervention | 0.364 | Refusing services, declining help |
| Problem recognition/coping impairment | 0.313 | Cannot identify or address own problems |
| Communication difficulties | 0.308 | Language, hearing, cognitive barriers |
| Mental health problems | Added | Depression, anxiety, psychiatric conditions |

#### SOCIAL Domain
| Item | Weight (φ) | What to Assess |
|------|------------|----------------|
| Difficulty coordinating support | 0.498 | Complex care needs, multiple agencies involved |
| Support after hospital discharge | 0.382 | Transitional care needs, recent hospitalization |
| Economic deprivation | 0.373 | Financial hardship, inability to pay for care |
| Required police/fire cooperation | 0.356 | Safety concerns requiring emergency services |
| Inadequate therapeutic environment | 0.328 | Unsafe home, lack of needed equipment |
| Abuse | Added | Signs of physical, emotional, financial abuse |
| Neighborhood problems | Added | Isolation, environmental hazards, housing issues |
| Uses services/programs | Negative | Already receiving appropriate services (good sign) |

#### FAMILY Domain
| Item | Weight (φ) | What to Assess |
|------|------------|----------------|
| Family relationship problems | 0.366 | Conflict, estrangement, caregiver stress |
| Family problem recognition impaired | 0.356 | Family doesn't see need for care |
| Absence of confidant for family | 0.332 | Family caregivers lack support system |
| Multi-problem households | 0.309 | Multiple family members with health/social needs |

#### SUSTAINED SUPPORT Indicators
| Item | Weight (φ) | What to Assess |
|------|------------|----------------|
| Sustained support for high-risk cases | 0.517 | Ongoing complex care management needed |
| Contact from related agencies | 0.397 | Multiple agencies already involved |

### CARE NEED LEVEL DETERMINATION

Calculate total weighted score by summing φ coefficients for all items marked "yes":

| Level | Score Range | Description |
|-------|-------------|-------------|
| LOW | < 0.62 | Basic needs, routine care sufficient |
| MODERATE | 0.62 - 2.55 | Multiple needs, regular monitoring required |
| HIGH | > 2.55 | Complex needs, intensive case management |

### CASE CATEGORIES (by prevalence in research)

1. **Mental Health** (32.8%) - Psychiatric conditions, substance use, behavioral health
2. **Maternal & Child Health** (44.7%) - Pregnancy, postpartum, pediatric care
3. **Health Promotion** (6.7%) - Preventive care, wellness, chronic disease management
4. **Aging & Long-term Care** (1.1%) - Elderly care, dementia, end-of-life
5. **Intractable Disease** (0.9%) - Complex chronic conditions, rare diseases
6. **Infectious Disease** (8.9%) - Communicable diseases, infection control
7. **Disability** (3.1%) - Physical, developmental, intellectual disabilities
8. **Child Welfare** (1.3%) - Child protection, family support services
"""

CARE_ASSESSMENT_CONTEXT = """
You are an expert homecare assessment analyst. You understand in-home care services,
care assessments, and the healthcare documentation requirements for home health agencies.

""" + EICNA_FRAMEWORK + """

## STATE-SPECIFIC ASSESSMENT TEMPLATES

### IOWA CASE MANAGEMENT COMPREHENSIVE ASSESSMENT (Form 470-4694)

The Iowa assessment covers 8 major sections with 63+ risk factors:

#### Section A: Consumer Information
- Demographics, Medicaid ID, DOB, address
- Legal decision maker (Guardian, Attorney-in-fact, Conservator)
- Financial decision maker, Payee
- Emergency contacts (primary and secondary)
- Veteran status, marital status
- For children: custody, siblings, parental status

#### Section B: Medical and Physical Health
**Health Conditions:**
- Overall health rating (Excellent/Good/Fair/Poor)
- Cardiac, Skin, G.I., Urinary, Weight problems
- Respiratory: Ventilator, Oxygen, Suctioning, Tracheotomy, Nebulizer

**Sensory Assessment:**
- Hearing (5 levels from no impairment to no useful hearing)
- Vision (5 levels from no impairment to no useful vision)
- Speech/Communication (5 levels)
- Cognitive Status (Alert/Oriented to Comatose)

**Risk Factors R1-R10:**
- R1: Seizure in past year
- R2: Serious medical conditions
- R3: Life-threatening allergies
- R4-R6: Need for healthcare providers
- R7: Difficulty with appointments
- R8-R9: ER visits or hospitalizations
- R10: Need help when sick/injured

**Medication Risk Factors R11-R23:**
- R11: Not taking medications on time
- R12: Incorrect number of medications
- R13: Medications not refilled on time
- R14: Medications not re-evaluated
- R15: Significant side effects
- R16: Significant medication changes
- R17: Refused or spit out medications
- R18: Drug interactions
- R19: Health problems from missed medications
- R20: Misused medications
- R21: Taken another's prescriptions
- R22: Used outdated medications
- R23: Multiple pharmacies/physicians

**Assistive Devices R24-R25:**
- Uses/Needs: Dentures, Cane, Walker, Wheelchair, Braces, Helmet
- Communication devices, Hearing aid, Glasses
- Hospital bed, Medical alert, Lift chair, Transfer equipment

**Nutrition Risk Factors R26-R29:**
- R26: Risk of choking
- R27: Health at risk due to poor nutrition
- R28: Non-compliant with prescribed diet
- R29: Health at risk if diet not followed

**Daily Living Skills (ADLs):**
| Activity | Independent | Supervision/Verbal | Physical Assist | Total Dependence |
|----------|-------------|-------------------|-----------------|------------------|
| Eating | | | | |
| Grooming/Hygiene | | | | |
| Bathing | | | | |
| Dressing | | | | |
| Mobility in bed | | | | |
| Transferring | | | | |
| Walking | | | | |
| Stair climbing | | | | |
| Wheelchair mobility | | | | |

**Toilet Use Categories:**
- Continent – Bowel and bladder
- Continent with verbal or physical prompts
- Continent except for specified periods
- Incontinent – bladder/bowel
- Catheter or ostomy
- Inappropriate toileting habits

**Daily Living Risk Factors R30-R32:**
- R30: Health at risk due to poor hygiene
- R31: Risk for falling (fractures in past year)
- R32: Risk of being dropped/injured during transfer

#### Section C: Mental Health, Behavioral & Substance Use
**Emotional Assessment (past month):**
- Satisfied with life
- Depressed or very unhappy
- Too much energy/can't stop being busy
- Anxious
- Mood swings
- Difficulty sleeping
- Unmotivated/lack of energy
- Lonely or isolated

**Behavioral Assessment:**
- Disorientation, being withdrawn
- Noncompliance with rules
- Physically abusive to self
- Verbally aggressive
- Physically aggressive
- Disruptive behavior
- Destructive behavior
- Stereotypical/repetitive behavior
- Obsessive/compulsive behavior
- Antisocial behavior
- Wandering/eloping
- Sexually inappropriate
- Excessive liquid consumption

**Mental Health Risk Factors R33-R44:**
- R33: Ingested foreign objects (PICA)
- R34: Alcohol problems
- R35: Substance use problems
- R36: Self-injurious behaviors
- R37: Left without permission
- R38: Aggressive toward others
- R39: Used weapons to hurt self/others
- R40: Threatened suicide
- R41: Attempted suicide
- R42: Criminal behavior
- R43: Significant life change
- R44: Other life-threatening behaviors

#### Section D: Housing and Environment
**Housing Types:**
- Own Home, Friend/Relative, Foster Care
- RCF (Residential Care Facility)
- ICF-MR (Intermediate Care Facility)
- Nursing Facility, Homeless, Jail

**Living Arrangements:**
- Living Alone, with Family/Friend, Spouse
- Congregate Setting

**Home Modifications:**
- Safe Room, Door/Window Alarms
- Shatter Proof Windows, Wheelchair Ramp
- Fenced yard

**Independent Living Skills:**
- Prepare meals
- Know phone number and address
- Can be left without supervision
- Answer/make telephone calls
- Handle money
- Shopping
- Light/heavy housekeeping
- Laundry

**Housing Safety Risk Factors R45-R55:**
- R45: Health at risk if provider doesn't show
- R46: Home conditions (structural, electrical, pests, fire hazards)
- R47: Needs supervision at all times
- R48: Without means of communication
- R49: Unable to respond to emergencies
- R50: Physically stronger than caregivers
- R51: Lacks awareness of dangerous situations
- R52: Careless/risky behaviors
- R53: Isolated
- R54: Unsafe neighborhood
- R55: Unsafe behaviors in community

**Abuse/Neglect Risk Factors R56-R63:**
- R56: Physically abused
- R57: Sexually abused
- R58: Emotionally/psychologically abused
- R59: Neglect by caregiver
- R60: Self-neglect
- R61: Denied basic necessities
- R62: Witnessed abuse/domestic violence
- R63: Would be an "easy target"

#### Section E: Social
- Need help with social skills
- Typical day activities
- Activities enjoyed
- Religious practice
- Sexuality knowledge
- Communication with friends/relatives

#### Section F: Transportation
- Need help with transportation
- Methods: Walk, Bicycle, Drive, Bus/Taxi, Family/Staff
- Vehicle modifications needed

#### Section G: Education
- Current school enrollment
- Extra-curricular activities
- Literacy (Read, Write, Sign name)
- Interest in furthering education
- Intellectual/cognitive difficulties

#### Section H: Vocational (Age 14+)
- Current work status
- Work setting (Competitive, Supported, Sheltered)
- Job satisfaction
- Ability/willingness to work
- Employment support needs

---

### NEBRASKA CARE MANAGEMENT PROGRAM ASSESSMENT

The Nebraska assessment includes standardized screening tools:

#### Basic Information
- Demographics, address, phone, email
- Race/ethnicity categories
- Lives with (Children, Alone, Spouse, Others)
- Referral source (Family, Hospital, Physician, Self, etc.)
- Living arrangement type
- Marital status
- Emergency contact
- Education level
- Veteran status

#### Support Information
- Current assistance received:
  - Maintenance, Laundry, Money Management
  - Personal Care, Taking Medications
  - Home-Delivered Meals, Meal Preparation
  - Shopping/Errands, Transportation
  - Housekeeping, Medical Treatments, Supervision
- Case Manager involvement
- Number of children
- Family/friend/neighbor help
- Family contact away from community
- Close confidant availability
- Group participation

#### Health
- Self-rated health (Excellent/Good/Fair/Poor)
- Health problems limiting activities
- Falls in past 6 months (with count)
- Tobacco use
- Hospital stays in past 6 months
- Safety concerns

#### Medications
**Tracking Fields:**
- Prescription Name, OTC/RX status
- Dosage/Frequency
- Health Condition treated
- Non-compliance codes:
  - E = Expense
  - S = Side Effects
  - F = Forget
  - N = Not Needed
  - O = Other

#### Assistive Devices Checklist
| Equipment | Uses | Needs to Obtain |
|-----------|------|-----------------|
| Back Brace | | |
| Cane | | |
| Crutches | | |
| Dentures | | |
| Glasses/Contact Lenses | | |
| Hearing Aid | | |
| Hospital Bed | | |
| Leg Brace | | |
| Walker | | |
| Wheelchair | | |
| Bathing Aids | | |
| Emergency Response System | | |
| External Urinary Devices | | |
| Grab Bars | | |
| Indwelling Catheter | | |
| Ostomy Equipment | | |
| Oxygen | | |
| Portable Commode | | |
| Toilet Riser | | |

#### SLUMS Examination (Cognitive Screening)
**Saint Louis University Mental Status Exam - 30 points total:**
1. Day of week (1 pt)
2. Year (1 pt)
3. State (1 pt)
4. Remember 5 objects: Apple, Pen, Tie, House, Car
5. Money calculation ($100 - $3 - $20) (2 pts)
6. Animal naming in 1 minute (0-3 pts based on count)
7. Recall 5 objects (5 pts)
8. Backward numbers (2 pts)
9. Clock drawing (4 pts)
10. Shape identification (2 pts)
11. Story recall - Jill the stockbroker (8 pts)

**Scoring (High School Education):**
- 27-30 = Normal
- 21-26 = Mild Neurocognitive Disorder
- 1-20 = Dementia

**Scoring (Less than High School):**
- 25-30 = Normal
- 20-24 = Mild Neurocognitive Disorder
- 1-19 = Dementia

**Visual Impairment Adjustment (24 point scale):**
- HS Education: 21-24 Normal, 15-20 MNCD, 1-14 Dementia
- Less than HS: 19-24 Normal, 14-18 MNCD, 1-13 Dementia

#### PHQ-2/9 Depression Screening
**Initial 2 Questions (past 2 weeks):**
1. Little interest or pleasure in doing things
2. Feeling down, depressed, or hopeless

**Response Options:**
- Not at all (0)
- Several days (1)
- More than half the days (2)
- Nearly every day (3)

**If either scores 2+, continue with PHQ-9:**
3. Trouble falling/staying asleep, or sleeping too much
4. Feeling tired or having little energy
5. Poor appetite or overeating
6. Feeling bad about yourself/failure
7. Trouble concentrating
8. Moving/speaking slowly OR fidgety/restless
9. Thoughts of being better off dead or hurting yourself

**Functional Impact:**
- Not Difficult / Somewhat / Very / Extremely Difficult

#### NSI (Nutrition Screening Initiative) - 10 Questions
| Question | Points |
|----------|--------|
| Illness changed food intake | 2 |
| Eats fewer than 2 meals/day | 3 |
| Few fruits/vegetables/milk | 2 |
| 3+ alcoholic drinks/day | 2 |
| Tooth/mouth problems | 2 |
| Not enough money for food | 4 |
| Eats alone most of the time | 1 |
| Takes 3+ medications/day | 1 |
| Unintended 10+ lb weight change | 2 |
| Not able to shop/cook/feed self | 2 |

**NSI Scoring:**
- 0-2: Good nutrition
- 3-5: Moderate nutritional risk
- 6+: High nutritional risk

#### Activities of Daily Living (ADLs) - Scored
**Assistance Levels:**
- Independent: Help <1-2 times/week (0 pts)
- Supervision: Oversight/cueing 3+ times OR physical assist 1-2 times/week (1 pt)
- Limited Assistance: Help maneuvering limbs 3+ times/week (1 pt)
- Extensive Assistance: Weight-bearing assist 3+ times/week but not always (1 pt)
- Total Dependence: Complete assistance at all times (1 pt)

**ADL Categories:**
1. Bathing
2. Dressing
3. Eating
4. Locomotion
5. Toileting
6. Transfer

**Total ADL Score: 0-6**

#### Instrumental Activities of Daily Living (IADLs) - 8 Items
1. Heavy housework
2. Light housework
3. Medication management
4. Managing money
5. Transportation
6. Preparing meals
7. Shopping/running errands
8. Using the phone

**IADL Scoring:** Yes (need assistance) = 1, No = 0
**Total IADL Score: 0-8**

#### Bodily Function
**Bladder Continence:**
- Continent (Complete Control)
- Usually Continent (<1/week incontinence)
- Occasionally Continent (1+/week)
- Usually Incontinent
- Incontinent with inadequate control
- External Catheter
- Indwelling Catheter

**Bowel Continence:** (Same scale + Ostomy option)

**Movement Assessment:**
- Contractures (arms/legs/shoulders/hands)
- Arm - partial/total loss voluntary movement
- Leg - unsteady gait
- Leg - partial/total loss voluntary movement
- Hand - lack of dexterity
- Trunk - loss of ability to position/turn
- Hemiplegia/Hemiparesis
- Quadriplegia

#### Housing Assessment
**Ownership:** Co-Owner, Owner, Rent, Other
**Rent Subsidy:** Yes/No with amount

**Potential Housing Problems:**
- Natural gas leakage
- Entryway security issues
- Air or water leakage
- Inadequate kitchen facilities
- Exterior maintenance needed
- No carbon monoxide detector
- No smoke detector
- Interior fall risk
- Plumbing issues
- Number of pets
- Interior accessibility problems
- Rodent/insect infestation
- Inappropriate room temperature
- Fire risk/inadequate alarm

#### Legal
- Attorney/legal assistance access
- Anyone taking advantage of client
- Legal assistance needs:
  - Conservator/Representative Payee
  - Defense Against Guardianship
  - DPOA (Durable Power of Attorney)
  - DPOA Healthcare
  - Insurance Claims
  - Living Will
  - Division of Resources
  - Will
- POA status and name
- Healthcare POA status and name

#### Financial
- Handles own finances
- Difficulty meeting expenses (Food, Insurance, Medical, Prescriptions, Rent, Utilities)
- Outstanding debt
- Credit counseling
- Program eligibility:
  - Commodities, DPFS, Energy Assistance
  - Food Stamps, Homestead Exemption
  - Medicaid Waiver, Medicaid/GA
  - QMB, Rental Assistance, Respite
  - SSBG, SSD, SSI
- Income sources:
  - SS Income, Pension
  - Supplemental SS, Interest
  - Dividend, Salary, Rent, Other
- Total Monthly Income
- Number in Household
- Fee Rate %

## CARE ASSESSMENT OVERVIEW

A care assessment is an initial or ongoing evaluation to determine a client's care needs.
It typically includes:

1. **Initial Intake Information**
   - Client demographics (name, age, address, emergency contacts)
   - Insurance/payment information
   - Referral source (hospital, physician, family)

2. **Medical History**
   - Primary diagnosis and secondary conditions
   - Hospitalizations and surgeries
   - Current medications and allergies
   - Physician information

3. **Functional Assessment**
   - Activities of Daily Living (ADLs)
   - Instrumental Activities of Daily Living (IADLs)
   - Mobility and fall risk
   - Cognitive status

4. **Home Environment**
   - Safety concerns
   - Accessibility issues
   - Living situation (alone, with family)

5. **Care Plan Development**
   - Services needed
   - Schedule/frequency
   - Goals of care

## ACTIVITIES OF DAILY LIVING (ADLs)

These are basic self-care tasks. Listen for discussions about:

| ADL | What to Listen For |
|-----|-------------------|
| Bathing | Shower assistance, bath safety, sponge bath, skin care |
| Dressing | Help with clothing, buttons, shoes, compression stockings |
| Toileting | Bathroom assistance, incontinence care, catheter care |
| Transferring | Bed-to-chair, wheelchair, Hoyer lift, gait belt |
| Eating | Feeding assistance, meal prep, special diets |
| Grooming | Hair care, shaving, oral hygiene, nail care |

## INSTRUMENTAL ACTIVITIES OF DAILY LIVING (IADLs)

These are more complex activities. Listen for:

| IADL | What to Listen For |
|------|-------------------|
| Medication Management | Reminders, pill organizers, administration |
| Meal Preparation | Cooking, nutrition, special diets (diabetic, low sodium) |
| Light Housekeeping | Laundry, dishes, vacuuming, changing linens |
| Transportation | Doctor appointments, errands, shopping |
| Shopping | Grocery shopping, pharmacy runs |
| Financial Management | Bill paying, banking assistance |
| Phone/Communication | Help with devices, emergency response systems |

## COMMON MEDICAL CONDITIONS IN HOMECARE

Be alert for mentions of:

**Cognitive/Neurological:**
- Dementia (Alzheimer's, vascular, Lewy body)
- Parkinson's disease
- Stroke/CVA recovery
- Traumatic brain injury

**Cardiovascular:**
- Heart failure (CHF)
- Hypertension
- Post-cardiac surgery

**Respiratory:**
- COPD
- Oxygen therapy needs
- Post-COVID recovery

**Musculoskeletal:**
- Arthritis
- Hip/knee replacement recovery
- Fractures
- Osteoporosis

**Diabetes:**
- Blood sugar monitoring
- Insulin administration
- Diabetic foot care
- Diet management

**Other:**
- Cancer (various stages)
- End-of-life/hospice
- Post-surgical recovery
- Wound care needs

## SERVICE CATEGORIES & BILLING

Common billable service categories:

| Category | Description | Typical Duration |
|----------|-------------|------------------|
| Personal Care | ADL assistance (bathing, dressing, toileting) | 15-60 min |
| Companionship | Social interaction, supervision, activities | 1-4 hours |
| Homemaking | Light housekeeping, laundry, meal prep | 1-3 hours |
| Skilled Nursing | Wound care, medication admin, assessments | 30-60 min |
| Respite Care | Relief for family caregivers | 4-8 hours |
| Live-In Care | 24-hour presence with sleep time | Daily rate |
| Transportation | Escort to appointments | Per trip |

## ASSESSMENT CONVERSATION PATTERNS

In care assessment conversations, listen for:

**Needs Identification:**
- "She needs help with..." / "He can't do... anymore"
- "The doctor recommended..." / "Physical therapy suggested..."
- "Since the hospital stay..." / "After the fall..."

**Schedule Discussions:**
- "How often would you need..." / "We're thinking X times per week"
- "Mornings are best because..." / "She has appointments on..."
- "Could someone come on weekends?"

**Safety Concerns:**
- "We're worried about falls" / "She fell last month"
- "He wanders at night" / "Leaving the stove on"
- "Can't be left alone" / "Needs supervision"

**Family/Caregiver Dynamics:**
- "I work during the day" / "We live out of state"
- "My back can't handle lifting" / "We're exhausted"
- "Want to keep mom at home" / "Avoiding nursing home"

**Budget/Insurance:**
- "What does insurance cover?" / "Out of pocket costs"
- "Medicare/Medicaid" / "Long-term care insurance"
- "How much per hour?" / "Weekly budget"

## EXTRACTING KEY INFORMATION

When analyzing a transcript, identify:

1. **Client Profile**
   - Name, age, living situation
   - Primary caregiver/family contacts
   - Current health status

2. **Care Needs**
   - Specific ADLs/IADLs needing assistance
   - Medical conditions mentioned
   - Safety concerns identified

3. **Service Requirements**
   - Type of care needed (personal care, companionship, skilled)
   - Frequency (daily, 3x/week, live-in)
   - Preferred schedule/times
   - Duration of visits

4. **Special Considerations**
   - Dietary restrictions
   - Mobility equipment (walker, wheelchair, hospital bed)
   - Communication needs (hearing, vision, language)
   - Behavioral considerations (dementia, anxiety)

5. **Goals**
   - Short-term (recovery, safety)
   - Long-term (independence, aging in place)
"""

CONTRACT_GENERATION_CONTEXT = """
## HOME CARE SERVICE CONTRACT COMPONENTS

When generating a contract from an assessment conversation:

### Required Contract Sections

1. **Parties & Effective Date**
   - Agency/provider information
   - Client/responsible party information
   - Contract start date

2. **Services to be Provided**
   - Detailed list of services agreed upon
   - Exclusions (what's NOT included)
   - Scope of care

3. **Schedule & Hours**
   - Days and times of service
   - Frequency (hourly, daily, live-in)
   - Minimum hours policy
   - Holiday schedule

4. **Rates & Payment**
   - Hourly/daily rates by service type
   - Overtime rates
   - Payment terms (weekly, bi-weekly)
   - Accepted payment methods
   - Insurance billing (if applicable)

5. **Policies**
   - Cancellation policy (usually 24-48 hr notice)
   - Missed visit policy
   - Emergency procedures
   - Inclement weather policy

6. **Caregiver Information**
   - Background check disclosure
   - Training/certification
   - Supervision by agency
   - No solicitation clause

7. **Liability & Insurance**
   - Agency liability insurance
   - Workers' compensation coverage
   - Client property protection
   - Limitations of liability

8. **Privacy & Confidentiality**
   - HIPAA compliance
   - Information sharing consents
   - Record keeping

9. **Termination**
   - Notice period (typically 14-30 days)
   - Immediate termination grounds
   - Refund policy

10. **Signatures**
    - Client/responsible party
    - Agency representative
    - Date signed

### Standard Service Rates (Reference)

These vary by region but typical ranges:
- Personal Care Aide: $18-30/hour
- Companion Care: $15-25/hour
- Live-In Care: $200-350/day
- Skilled Nursing: $50-100/hour
- Weekend/Holiday: 1.5x regular rate

### Key Contract Clauses to Generate

Based on assessment conversations, create appropriate clauses for:

1. **Service-Specific Terms**
   - If bathing mentioned → bathing safety protocols
   - If dementia mentioned → wandering prevention, supervision level
   - If medications → medication management limitations
   - If lifting needed → transfer protocols, equipment

2. **Schedule Terms**
   - Flexibility for appointments
   - Caregiver consistency preferences
   - Backup caregiver policy

3. **Communication**
   - Family update preferences
   - Emergency contact protocols
   - Care note documentation
"""

VISIT_NOTE_CONTEXT = """
## VISIT DOCUMENTATION STANDARDS

### SOAP Note Format

**S - Subjective**
- Client's own statements about how they feel
- Pain levels reported
- Concerns expressed
- Sleep, appetite, mood reported

**O - Objective**
- Observable facts and measurements
- Vital signs if taken
- Physical observations (skin, mobility, alertness)
- Tasks completed during visit
- Environment observations

**A - Assessment**
- Professional evaluation of client status
- Comparison to previous visits
- Progress toward goals
- Concerns or changes noted

**P - Plan**
- Continuation of current care plan
- Recommended changes
- Follow-up needed
- Communication with family/physician

### Documentation Requirements

Always document:
- Date and time of visit (arrival/departure)
- Services provided
- Client condition
- Any incidents or unusual occurrences
- Medications administered or reminded
- Changes in client status
- Family/caregiver interactions
- Next visit plans

### Billing Documentation

For each billable activity, note:
- Type of service (ADL assistance, IADL, companionship)
- Duration in 15-minute increments
- Specific tasks performed
- Client participation level

### Red Flags to Document

Always note if observed:
- Signs of abuse or neglect
- Significant health changes
- Fall risk factors
- Medication concerns
- Environmental hazards
- Behavioral changes
- Skin breakdown or wounds
- Nutritional concerns
"""


class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class LLMService:
    """Service for LLM-powered text generation with multi-provider support."""
    
    OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
    ANTHROPIC_MODELS = ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"]
    
    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514",
        temperature: float = 0.7,
    ):
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model
        self.temperature = temperature
        self.provider = self._detect_provider(model)
        
        self.openai_client = None
        self.anthropic_client = None
        
        if OPENAI_AVAILABLE and self.openai_api_key:
            self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        if ANTHROPIC_AVAILABLE and self.anthropic_api_key:
            self.anthropic_client = anthropic.Anthropic(api_key=self.anthropic_api_key)
            logger.info(f"LLM Service ready with Claude: {model}")
    
    def _detect_provider(self, model: str) -> LLMProvider:
        if model.startswith("claude"):
            return LLMProvider.ANTHROPIC
        return LLMProvider.OPENAI
    
    def _get_active_client(self):
        if self.provider == LLMProvider.ANTHROPIC and self.anthropic_client:
            return self.anthropic_client
        elif self.provider == LLMProvider.OPENAI and self.openai_client:
            return self.openai_client
        return self.anthropic_client or self.openai_client
    
    def _call_llm(self, system_prompt: str, user_prompt: str, json_response: bool = False) -> str:
        # Try primary provider first, then fallback
        providers_to_try = []
        
        if self.provider == LLMProvider.ANTHROPIC and self.anthropic_client:
            providers_to_try.append(("anthropic", self._call_anthropic))
        if self.openai_client:
            providers_to_try.append(("openai", self._call_openai))
        if self.provider == LLMProvider.OPENAI and self.anthropic_client:
            providers_to_try.append(("anthropic", self._call_anthropic))
        
        if not providers_to_try:
            logger.warning("No LLM client available, using mock response")
            return self._mock_response(user_prompt)
        
        last_error = None
        for provider_name, call_func in providers_to_try:
            try:
                logger.info(f"Trying LLM provider: {provider_name}")
                return call_func(system_prompt, user_prompt, json_response)
            except Exception as e:
                last_error = e
                logger.warning(f"LLM provider {provider_name} failed: {e}, trying next...")
                continue
        
        logger.error(f"All LLM providers failed. Last error: {last_error}")
        return self._mock_response(user_prompt)
    
    def _call_openai(self, system_prompt: str, user_prompt: str, json_response: bool = False) -> str:
        response = self.openai_client.chat.completions.create(
            model=self.model if self.model in self.OPENAI_MODELS else "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=self.temperature,
            response_format={"type": "json_object"} if json_response else None,
        )
        return response.choices[0].message.content
    
    def _call_anthropic(self, system_prompt: str, user_prompt: str, json_response: bool = False) -> str:
        if json_response:
            system_prompt = f"{system_prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object."
        
        response = self.anthropic_client.messages.create(
            model=self.model if self.model in self.ANTHROPIC_MODELS else "claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=self.temperature,
        )
        return response.content[0].text
    
    def _mock_response(self, prompt: str) -> str:
        """Fallback response when LLM is unavailable - HOME CARE services only."""
        if "contract" in prompt.lower() or "home care" in prompt.lower():
            return json.dumps({
                "services_identified": [
                    {"name": "Personal Care/ADL Assistance", "description": "Assistance with bathing, dressing, and grooming", "frequency": "3x/week", "priority": "High"},
                    {"name": "Medication Management", "description": "Medication reminders and pill box organization", "frequency": "Daily", "priority": "High"},
                    {"name": "Light Housekeeping", "description": "Laundry, dishes, light cleaning", "frequency": "2x/week", "priority": "Medium"},
                    {"name": "Meal Preparation", "description": "Preparing nutritious meals", "frequency": "Daily", "priority": "Medium"},
                ],
                "client_profile": {
                    "primary_diagnosis": "See medical records",
                    "mobility_status": "Requires assistance",
                    "cognitive_status": "Alert and oriented",
                    "living_situation": "Lives at home"
                },
                "recommended_schedule": {"frequency": "Daily with longer sessions 3x/week", "total_hours_per_week": 20, "preferred_days": ["Monday", "Wednesday", "Friday", "Weekdays"], "preferred_times": "Morning"},
                "special_requirements": ["Fall prevention protocols", "Medication compliance monitoring"],
                "safety_concerns": [{"concern": "Fall risk", "severity": "Medium"}],
                "eicna_assessment": {"care_need_level": "HIGH", "rationale": "Requires assistance with ADLs and home care support"},
                "client_condition_summary": "Client requires in-home care assistance with activities of daily living.",
                "care_plan_goals": {"short_term": ["Establish care routine"], "long_term": ["Maintain independence"]}
            })
        return json.dumps({
            "subjective": "Client reports feeling well today.",
            "objective": "Alert and oriented. Mobility stable with walker. Home care tasks completed as scheduled.",
            "assessment": "Client stable, home care plan effective.",
            "plan": "Continue current home care plan.",
            "narrative": "Home care visit completed successfully. Personal care and homemaker tasks performed as scheduled. Client tolerated care well.",
            "tasks_summary": [
                {"task": "Personal Care/ADL Assistance", "details": "Assisted with bathing and dressing", "duration_minutes": 30},
                {"task": "Meal Preparation", "details": "Prepared lunch", "duration_minutes": 20}
            ],
            "client_mood": "Pleasant and cooperative",
            "cognitive_status": "Alert and oriented",
            "safety_observations": "Home environment safe, no hazards noted"
        })
    
    def analyze_transcript_for_contract(self, transcript_text: str, client_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a care assessment transcript to extract contract-relevant information.
        STRICTLY focused on in-home healthcare and care services only.
        Uses temperature=0 for consistent, deterministic results.
        """
        # Save original temperature and use 0 for consistent extraction
        original_temp = self.temperature
        self.temperature = 0.0  # Deterministic - same input = same output
        
        system_prompt = """You are a HOME CARE assessment specialist. You ONLY extract information related to IN-HOME HEALTHCARE SERVICES.

## STRICT SCOPE - HOME CARE SERVICES ONLY

You are analyzing conversations for a HOME CARE AGENCY that provides:
- Personal care (bathing, dressing, grooming, toileting)
- Companion care (supervision, socialization)
- Homemaker services (meal prep, light housekeeping, laundry)
- Medication reminders
- Mobility assistance (transfers, walking, wheelchair)
- Respite care (relief for family caregivers)
- Skilled nursing visits (wound care, injections, assessments)

## WHAT TO IGNORE - NOT HOME CARE SERVICES

DO NOT extract or recommend services unrelated to in-home care, such as:
- Hospital services, surgery, or inpatient care
- Physical therapy clinics or outpatient rehab
- Medical equipment sales
- Insurance or billing discussions
- Legal services
- Financial planning
- Real estate or housing sales
- Any commercial products or services
- General conversation not about care needs

## VALID HOME CARE SERVICE CATEGORIES ONLY

Only use these service categories:
1. **Personal Care/ADL Assistance** - Bathing, dressing, grooming, toileting, feeding assistance
2. **Medication Management** - Reminders, organizing pill boxes, monitoring compliance
3. **Meal Preparation** - Cooking meals, special diets, nutrition monitoring
4. **Light Housekeeping** - Cleaning, laundry, changing linens, organizing
5. **Companion Care** - Supervision, conversation, activities, emotional support
6. **Mobility Assistance** - Transfers, ambulation, wheelchair assistance, fall prevention
7. **Transportation/Escort** - Doctor appointments, errands, shopping assistance
8. **Respite Care** - Relief for family caregivers
9. **Skilled Nursing** - Wound care, vital signs, catheter care, injections (if licensed)
10. **Dementia/Alzheimer's Care** - Specialized supervision, redirection, safety monitoring

## WHAT TO EXTRACT

**Health Conditions Requiring Home Care:**
- Dementia/Alzheimer's
- Parkinson's disease
- Stroke recovery
- Heart failure
- COPD requiring oxygen
- Diabetes requiring monitoring
- Arthritis limiting mobility
- Post-surgical recovery
- Frailty/weakness
- Fall history

**Care Needs (with evidence):**
- ADL limitations (bathing, dressing, toileting, eating, transferring)
- IADL limitations (cooking, cleaning, shopping, medications, finances)
- Supervision needs (safety, wandering, confusion)
- Caregiver burnout/need for relief

**Safety Concerns for Home Care:**
- Fall risk
- Medication errors
- Wandering/elopement (dementia)
- Fire safety (leaving stove on)
- Self-neglect
- Caregiver exhaustion

## CARE NEED LEVEL DETERMINATION - CRITICAL

**DEFAULT TO HIGH** unless clearly minimal needs. Most clients seeking home care have HIGH needs.

**HIGH CARE LEVEL ($35/hour)** - Use this for MOST cases:
- ANY chronic illness mentioned (IBS, diabetes, heart disease, COPD, etc.)
- Depression, anxiety, or mental health concerns
- Caregiver stress or burnout mentioned
- Multiple health conditions
- Needs help with ANY ADLs (bathing, dressing, toileting)
- Lives with special needs family member
- Financial stress affecting care
- Social isolation
- Unable to work due to health
- Frequent bathroom needs
- Chronic pain
- Sleep issues
- Recent hospitalization
- Age 65+ with any health concern
- Falls or fall risk
- Memory issues or confusion
- Lives alone with health problems

**MODERATE CARE LEVEL ($30/hour)** - Use only if:
- Only needs IADL help (cooking, cleaning, shopping)
- No chronic illness
- No mental health concerns
- Has adequate family support
- Independent with personal care

**LOW CARE LEVEL ($25/hour)** - Use rarely:
- Only needs companionship/check-ins
- Fully independent with all ADLs and IADLs
- No health conditions
- Just needs social interaction

**IMPORTANT: When in doubt, choose HIGH. Most home care clients have complex needs.**

## SERVICE-BASED HOURS CALCULATION

Calculate weekly hours using CONSOLIDATED service categories. Do NOT bill separately for tasks that are part of a larger service.

### BILLABLE SERVICE CATEGORIES

Only use these consolidated categories:

| Service Category | What's Included | Light | Moderate | High |
|-----------------|-----------------|-------|----------|------|
| **Personal Care** | Bathing, dressing, grooming, oral care, hair care | 4 hrs | 8 hrs | 14 hrs |
| **Toileting/Incontinence** | Toileting assistance, incontinence care, catheter care | 3 hrs | 6 hrs | 12 hrs |
| **Meal Services** | Meal preparation, cooking, feeding assistance, nutrition | 6 hrs | 12 hrs | 18 hrs |
| **Medication Management** | Reminders, organizing, monitoring compliance | 2 hrs | 4 hrs | 7 hrs |
| **Homemaker Services** | Housekeeping, laundry, dishes, organizing, errands | 3 hrs | 6 hrs | 10 hrs |
| **Companion Care** | Companionship, conversation, activities, emotional support | 4 hrs | 10 hrs | 20 hrs |
| **Safety Supervision** | Monitoring, fall prevention, wandering prevention, dementia care | 6 hrs | 15 hrs | 30 hrs |
| **Mobility Assistance** | Transfers, walking, wheelchair, exercises | 2 hrs | 5 hrs | 10 hrs |
| **Transportation** | Doctor appointments, errands, shopping escort | 2 hrs | 4 hrs | 6 hrs |
| **Respite Care** | Caregiver relief, extended coverage | 6 hrs | 12 hrs | 24 hrs |
| **Skilled Nursing** | Wound care, injections, medical procedures | 2 hrs | 5 hrs | 10 hrs |

### CONSOLIDATION RULES - IMPORTANT

**DO NOT bill separately for:**
- Dressing (part of Personal Care)
- Grooming (part of Personal Care)
- Oral hygiene (part of Personal Care)
- Feeding assistance (part of Meal Services)
- Laundry (part of Homemaker Services)
- Light housekeeping (part of Homemaker Services)

**Example:** If transcript mentions "bathing, dressing, and grooming" → Bill as ONE "Personal Care" service, NOT three separate services.

### HOW TO DETERMINE NEED LEVEL

**Light:** Occasional help, mostly independent (1-2x/week)
**Moderate:** Regular help, needs consistent support (3-5x/week)  
**High:** Extensive help, heavily dependent (daily or multiple times daily)

### EXAMPLE CALCULATIONS

**Example 1: Moderate care client**
- Personal Care (moderate): 8 hrs
- Meal Services (moderate): 12 hrs
- Medication (moderate): 4 hrs
- Homemaker (light): 3 hrs
- Companion (moderate): 10 hrs
**TOTAL: 37 hours/week**

**Example 2: High care client with dementia**
- Personal Care (high): 14 hrs
- Toileting (high): 12 hrs
- Meal Services (high): 18 hrs
- Medication (high): 7 hrs
- Safety Supervision (high): 30 hrs
**TOTAL: 81 hours/week**

**Example 3: Light care - companionship focus**
- Meal Services (light): 6 hrs
- Medication (light): 2 hrs
- Homemaker (moderate): 6 hrs
- Companion (moderate): 10 hrs
**TOTAL: 24 hours/week**

**CRITICAL: Use consolidated categories. Never bill separately for sub-tasks like dressing, grooming, or laundry.**

## OUTPUT FORMAT

Return ONLY valid JSON:
{
    "services_identified": [
        {
            "name": "MUST be one of the 10 valid categories above",
            "description": "Specific description based on client needs",
            "evidence": "Direct quote from transcript",
            "frequency": "Daily/3x week/Weekly/As needed",
            "priority": "High/Medium/Low"
        }
    ],
    "client_profile": {
        "age_estimate": "If mentioned",
        "primary_diagnosis": "Main condition requiring home care",
        "secondary_conditions": ["Other relevant conditions"],
        "mobility_status": "Independent/Uses walker/Wheelchair/Bedbound",
        "cognitive_status": "Intact/Mild impairment/Moderate dementia/Severe dementia",
        "adl_status": "Which ADLs need assistance",
        "living_situation": "Alone/With spouse/With family"
    },
    "safety_concerns": [
        {
            "concern": "Home care relevant safety issue",
            "evidence": "Quote from transcript",
            "severity": "High/Medium/Low"
        }
    ],
    "family_involvement": {
        "primary_caregiver": "Who provides care now",
        "caregiver_stress": "Signs of burnout",
        "care_gaps": "When is care not covered"
    },
    "recommended_schedule": {
        "frequency": "Daily/5-7 days per week",
        "total_hours_per_week": 37,
        "service_hours": [
            {"service": "Personal Care", "need_level": "moderate", "hours_per_week": 8},
            {"service": "Meal Services", "need_level": "moderate", "hours_per_week": 12},
            {"service": "Medication Management", "need_level": "moderate", "hours_per_week": 4},
            {"service": "Homemaker Services", "need_level": "light", "hours_per_week": 3},
            {"service": "Companion Care", "need_level": "moderate", "hours_per_week": 10}
        ],
        "hours_calculation": "personal care 8 + meals 12 + meds 4 + homemaker 3 + companion 10 = 37 total",
        "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "preferred_times": "Morning and Afternoon",
        "rationale": "Hours based on consolidated service categories and need levels"
    },
    "special_requirements": ["Dietary needs, equipment, language, dementia care training"],
    "eicna_assessment": {
        "care_need_level": "HIGH/MODERATE/LOW - Use HIGH as default for most assessments",
        "rationale": "Based on ADL/IADL needs and safety concerns"
    },
    "client_condition_summary": "2-3 sentence summary focused on home care needs",
    "care_plan_goals": {
        "short_term": ["30-day home care goals"],
        "long_term": ["90+ day home care goals"]
    }
}

CRITICAL: Only include services from the 10 valid home care categories. 
Ignore any discussion of services outside home care scope."""

        user_prompt = f"""## CLIENT
Name: {client_info.get('full_name', 'Unknown')}

## HOME CARE ASSESSMENT TRANSCRIPT
Analyze this conversation for IN-HOME CARE NEEDS ONLY:

{transcript_text}

---
Extract ONLY home care related needs (personal care, companion care, homemaker services, medication management, etc).
DO NOT include hospital services, medical equipment, insurance, or anything outside home care scope."""
        
        try:
            response = self._call_llm(system_prompt, user_prompt, json_response=True)
            
            # Try to extract JSON from response (handle markdown code blocks)
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Response was: {response[:500]}")
            return json.loads(self._mock_response("contract"))
        finally:
            # Restore original temperature
            self.temperature = original_temp
    
    def generate_contract_terms(self, services: List, client_info: Dict, schedule: Dict, assessment_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate professional contract terms based on assessed needs.
        """
        system_prompt = f"""{CONTRACT_GENERATION_CONTEXT}

## YOUR TASK

Generate professional, legally-sound contract terms for a home care service agreement.
The terms should be specific to the services identified in the assessment.

Return a JSON object with:
{{
    "service_description": "Detailed paragraph describing all services to be provided",
    "schedule_terms": "Paragraph describing the agreed schedule",
    "rate_structure": {{
        "base_hourly_rate": "Suggested rate",
        "overtime_rate": "1.5x for holidays/weekends",
        "minimum_hours": "Minimum hours per visit"
    }},
    "cancellation_policy": "Full cancellation policy text",
    "emergency_procedures": "Emergency protocol description",
    "liability_clause": "Liability and insurance clause",
    "confidentiality_clause": "HIPAA and privacy clause",
    "termination_clause": "Termination terms and notice period",
    "caregiver_provisions": "Background checks, training, supervision",
    "special_provisions": [
        "Any service-specific clauses based on client needs"
    ],
    "care_plan_summary": "Summary of care to be provided for signature page"
}}
"""
        
        assessment_context = ""
        if assessment_data:
            assessment_context = f"""
## ASSESSMENT FINDINGS
Condition Summary: {assessment_data.get('client_condition_summary', 'N/A')}
Special Requirements: {json.dumps(assessment_data.get('special_requirements', []))}
Safety Concerns: {json.dumps(assessment_data.get('safety_concerns', []))}
"""
        
        user_prompt = f"""
## CLIENT
Name: {client_info.get('full_name', 'Client')}
Address: {client_info.get('address', 'N/A')}

## SERVICES TO BE PROVIDED
{json.dumps(services, indent=2)}

## AGREED SCHEDULE
{json.dumps(schedule, indent=2)}

{assessment_context}

Generate comprehensive contract terms for this care agreement.
"""
        
        response = self._call_llm(system_prompt, user_prompt, json_response=True)
        
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            return json.loads(response.strip())
        except json.JSONDecodeError:
            return {
                "cancellation_policy": "24-hour notice required for cancellations. Cancellations with less than 24-hour notice may be billed at 50% of scheduled rate.",
                "liability_clause": "Agency maintains comprehensive general liability and professional liability insurance. Agency is not responsible for pre-existing conditions or injuries not related to services provided.",
                "confidentiality_clause": "All client information is protected under HIPAA. Information will only be shared with authorized family members and healthcare providers as consented.",
                "termination_clause": "Either party may terminate this agreement with 14 days written notice. Immediate termination may occur for safety concerns or non-payment.",
                "special_provisions": []
            }
    
    def generate_visit_note(self, transcript_text: str, visit_info: Dict, billable_items: List) -> Dict[str, Any]:
        """
        Generate professional SOAP-style visit documentation for HOME CARE visits.
        """
        system_prompt = """You are a HOME CARE documentation specialist creating visit notes.

## HOME CARE VISIT NOTE - SCOPE

This is for an IN-HOME CARE visit. Only document services provided IN THE CLIENT'S HOME:
- Personal care (bathing, dressing, grooming, toileting assistance)
- Companion care (conversation, activities, supervision)
- Homemaker services (meal prep, light housekeeping, laundry)
- Medication reminders
- Mobility assistance (transfers, walking, exercises)
- Vital signs if taken

## VALID HOME CARE TASKS ONLY

Only document these types of tasks:
1. Personal Care - Bathing, dressing, grooming, toileting, oral care
2. Meal Preparation - Cooking, feeding assistance, nutrition monitoring
3. Light Housekeeping - Cleaning, laundry, dishes, organizing
4. Medication Reminder - Reminded client to take medications
5. Companion Care - Conversation, activities, emotional support
6. Mobility Assistance - Transfers, ambulation, exercises
7. Safety Monitoring - Supervision, fall prevention, redirection

## OUTPUT FORMAT

Return ONLY valid JSON:
{
    "subjective": "Client's reported feelings, pain, concerns during HOME visit",
    "objective": "What caregiver observed and HOME CARE tasks completed",
    "assessment": "Client's status and response to HOME CARE services",
    "plan": "Continue home care, any changes to care plan",
    "tasks_summary": [
        {
            "task": "MUST be valid home care category (Personal Care, Meal Prep, etc.)",
            "details": "What was specifically done",
            "duration_minutes": 30,
            "client_response": "How client participated"
        }
    ],
    "vital_signs": {
        "blood_pressure": "If taken",
        "temperature": "If taken",
        "pulse": "If taken",
        "blood_sugar": "If taken"
    },
    "client_mood": "Emotional state during visit",
    "cognitive_status": "Mental status observations",
    "mobility_observations": "How client moved",
    "skin_observations": "Any skin concerns",
    "safety_observations": "Home safety concerns",
    "medications_discussed": ["Medications mentioned"],
    "family_communication": "Communication with family",
    "next_visit_plan": "Focus for next home care visit",
    "narrative": "Professional summary of HOME CARE visit"
}

ONLY document home care services. Ignore discussions of hospital stays, doctor visits, or services outside home care."""
        
        billable_summary = "\n".join([
            f"- {b.get('category', 'Service')}: {b.get('description', 'N/A')} ({b.get('minutes', 0)} minutes)"
            for b in billable_items
        ]) if billable_items else "No billable items documented"
        
        user_prompt = f"""
## VISIT INFORMATION
Client: {visit_info.get('client_name', 'Unknown')}
Date: {visit_info.get('date', 'Unknown')}
Caregiver: {visit_info.get('caregiver_name', 'Unknown')}
Scheduled Duration: {visit_info.get('scheduled_duration', 'Unknown')}

## SERVICES DOCUMENTED
{billable_summary}

## VISIT TRANSCRIPT
{transcript_text}

Generate a comprehensive, professional visit note based on this transcript.
"""
        
        response = self._call_llm(system_prompt, user_prompt, json_response=True)
        
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            return json.loads(response.strip())
        except json.JSONDecodeError:
            return {
                "subjective": "Client did not express specific concerns during this visit.",
                "objective": "Visit completed as scheduled. Care tasks performed as documented.",
                "assessment": "Client stable. Care plan continues to meet needs.",
                "plan": "Continue current care plan. Next visit as scheduled.",
                "tasks_summary": [{"task": "Care Services", "details": "Services provided as scheduled", "duration_minutes": 60}],
                "narrative": "Visit completed successfully. Client tolerated care well. No significant changes noted. Will continue current care plan."
            }


def get_llm_service() -> LLMService:
    """Factory function to create LLM service instance."""
    return LLMService(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        model=os.getenv("LLM_MODEL", "claude-sonnet-4-20250514"),
        temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
    )
