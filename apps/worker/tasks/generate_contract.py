"""
Contract Generation Task

Generates service contracts using agency templates filled with
data extracted from care assessment conversations via Claude LLM.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID
from decimal import Decimal

from worker import app
from db import get_db
from config import settings

logger = logging.getLogger(__name__)


@app.task(name="tasks.generate_contract.generate_service_contract", bind=True)
def generate_service_contract(self, visit_id: str):
    """
    Generate a service contract using templates with LLM-extracted data.
    
    Process:
    1. Extract care-relevant data from transcript using Claude
    2. Fill in agency contract template with extracted data
    3. Save contract record with all extracted information
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting contract generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, BillableItem, Contract
        from libs.llm import get_llm_service
        from libs.contract_template import generate_contract_from_template, generate_docx_contract
        
        # Get visit
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "contract": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get client
        client = visit.client
        if not client:
            raise ValueError(f"No client found for visit: {visit_id}")
        
        # Get transcript segments
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id
        ).order_by(TranscriptSegment.start_ms).all()
        
        # Prepare transcript text
        transcript_text = "\n".join([
            f"[{s.start_ms // 1000}s] {s.speaker_label or 'Speaker'}: {s.text}"
            for s in segments
        ]) if segments else "No transcript available"
        
        # Prepare client info
        client_info = {
            "full_name": client.full_name,
            "address": client.address or "Not provided",
            "phone": client.phone or "Not provided",
            "emergency_contact_name": client.emergency_contact_name,
            "emergency_contact_phone": client.emergency_contact_phone,
        }
        
        # =====================================================================
        # STEP 1: Extract data from transcript using Claude
        # =====================================================================
        logger.info(f"Extracting care data from transcript using Claude...")
        llm_service = get_llm_service()
        
        assessment_data = llm_service.analyze_transcript_for_contract(
            transcript_text=transcript_text,
            client_info=client_info,
        )
        
        # Get care need level
        eicna = assessment_data.get("eicna_assessment", {})
        care_need_level = eicna.get("care_need_level", "MODERATE")
        logger.info(f"Extraction complete - Care Need Level: {care_need_level}")
        
        # =====================================================================
        # STEP 2: Process extracted data for template
        # =====================================================================
        
        # Extract services
        services = assessment_data.get("services_identified", [])
        if not services:
            services = [
                {"name": "Personal Care", "description": "Assistance with daily activities", "frequency": "As needed"},
                {"name": "Companionship", "description": "Social interaction and supervision", "frequency": "During visits"},
            ]
        
        # Extract schedule
        schedule = assessment_data.get("recommended_schedule", {})
        
        # =====================================================================
        # SERVICE-BASED HOURS CALCULATION
        # Hours based on service type and need level (light/moderate/high)
        # =====================================================================
        
        # Get service hours from schedule
        service_hours = schedule.get("service_hours", [])
        if service_hours:
            calculated_hours = sum(float(sh.get("hours_per_week", 0)) for sh in service_hours)
            logger.info(f"Service hours from {len(service_hours)} services:")
            for sh in service_hours:
                logger.info(f"  - {sh.get('service')} ({sh.get('need_level', 'moderate')}): {sh.get('hours_per_week')} hrs/week")
            weekly_hours = calculated_hours
            logger.info(f"Total from service_hours: {weekly_hours} hrs/week")
        else:
            # Fall back to total_hours_per_week if provided
            weekly_hours = float(schedule.get("total_hours_per_week", 0))
            if weekly_hours > 0:
                logger.info(f"Using total_hours_per_week: {weekly_hours}")
        
        # If still no hours, calculate from services using consolidated categories
        if weekly_hours == 0 and services:
            # Consolidated service categories (moderate need level defaults)
            service_hour_defaults = {
                "personal care": 8,       # Bathing, dressing, grooming combined
                "toileting": 6,           # Toileting/incontinence care
                "incontinence": 6,
                "meal": 12,               # Meal prep, cooking, feeding
                "food": 12,
                "nutrition": 12,
                "medication": 4,          # Medication management
                "homemaker": 6,           # Housekeeping, laundry combined
                "housekeeping": 6,
                "companion": 10,          # Companion care
                "supervision": 15,        # Safety supervision
                "safety": 15,
                "dementia": 20,           # Dementia care (high supervision)
                "mobility": 5,            # Mobility/transfer assistance
                "transfer": 5,
                "transportation": 4,      # Transportation/escort
                "respite": 12,            # Respite care
                "nursing": 5,             # Skilled nursing
                "wound": 5,
            }
            
            # Track which consolidated categories we've already counted
            counted_categories = set()
            
            logger.info(f"Calculating hours from {len(services)} services (consolidated):")
            for svc in services:
                svc_name = svc.get("name", "").lower() if isinstance(svc, dict) else str(svc).lower()
                
                # Map to consolidated category
                category = None
                svc_hours = 0
                
                # Personal care consolidation
                if any(word in svc_name for word in ["bath", "dress", "groom", "hygiene", "personal care"]):
                    category = "personal_care"
                    svc_hours = 8
                # Toileting
                elif any(word in svc_name for word in ["toilet", "incontinence", "catheter"]):
                    category = "toileting"
                    svc_hours = 6
                # Meal services consolidation
                elif any(word in svc_name for word in ["meal", "food", "cook", "feed", "nutrition"]):
                    category = "meals"
                    svc_hours = 12
                # Medication
                elif "medication" in svc_name or "med" in svc_name:
                    category = "medication"
                    svc_hours = 4
                # Homemaker consolidation
                elif any(word in svc_name for word in ["homemaker", "housekeep", "laundry", "clean", "errand"]):
                    category = "homemaker"
                    svc_hours = 6
                # Companion
                elif "companion" in svc_name:
                    category = "companion"
                    svc_hours = 10
                # Supervision/Safety
                elif any(word in svc_name for word in ["supervision", "safety", "monitor", "dementia"]):
                    category = "supervision"
                    svc_hours = 15
                # Mobility
                elif any(word in svc_name for word in ["mobility", "transfer", "walk", "exercise"]):
                    category = "mobility"
                    svc_hours = 5
                # Transportation
                elif "transport" in svc_name:
                    category = "transportation"
                    svc_hours = 4
                # Respite
                elif "respite" in svc_name:
                    category = "respite"
                    svc_hours = 12
                # Skilled nursing
                elif any(word in svc_name for word in ["nursing", "wound", "skilled"]):
                    category = "nursing"
                    svc_hours = 5
                else:
                    category = svc_name
                    svc_hours = 4
                
                # Only count each consolidated category once
                if category not in counted_categories:
                    counted_categories.add(category)
                    weekly_hours += svc_hours
                    logger.info(f"  - {category}: {svc_hours} hrs/week")
                else:
                    logger.info(f"  - {svc_name}: (already counted under {category})")
            
            logger.info(f"Total from services: {weekly_hours} hrs/week")
        
        # =====================================================================
        # RATE DETERMINATION (based on specific care needs)
        # =====================================================================
        
        # Base rate by care level
        base_rate_map = {
            "HIGH": 28.00,      # Base for high care needs
            "MODERATE": 24.00,  # Base for moderate needs
            "LOW": 20.00,       # Base for light assistance
        }
        base_rate = base_rate_map.get(care_need_level, 24.00)
        
        # Rate adjustments based on specific needs
        rate_adjustments = []
        
        # Check services for specialized care needs
        service_names = [s.get('name', '').lower() if isinstance(s, dict) else str(s).lower() for s in services]
        service_text = ' '.join(service_names)
        
        # Skilled nursing or medical care (+$8-10/hr)
        if any(x in service_text for x in ['nursing', 'wound', 'catheter', 'injection', 'skilled']):
            rate_adjustments.append(("Skilled nursing care", 10.00))
        
        # Dementia/Alzheimer's care (+$5/hr)
        if any(x in service_text for x in ['dementia', 'alzheimer', 'memory', 'cognitive']):
            rate_adjustments.append(("Dementia care specialist", 5.00))
        
        # Safety supervision/wandering (+$3/hr)
        if any(x in service_text for x in ['supervision', 'wandering', 'safety monitor']):
            rate_adjustments.append(("Safety supervision", 3.00))
        
        # Check client profile for additional needs
        if client_profile:
            cognitive = client_profile.get('cognitive_status', '').lower()
            if any(x in cognitive for x in ['dementia', 'impair', 'confusion', 'alzheimer']):
                if ("Dementia care specialist", 5.00) not in rate_adjustments:
                    rate_adjustments.append(("Cognitive impairment care", 4.00))
            
            # Mobility challenges (+$2/hr)
            mobility = client_profile.get('mobility_status', '').lower()
            if any(x in mobility for x in ['wheelchair', 'bedbound', 'hoyer', 'lift', 'transfer']):
                rate_adjustments.append(("Mobility/transfer assistance", 2.00))
        
        # Check special requirements
        special_reqs = assessment_data.get('special_requirements', [])
        for req in special_reqs:
            req_text = str(req).lower() if isinstance(req, str) else str(req.get('requirement', '')).lower()
            
            # Specialized diet management (+$1/hr)
            if any(x in req_text for x in ['diabetic', 'tube feed', 'g-tube', 'pureed', 'thickened']):
                if not any('diet' in adj[0].lower() for adj in rate_adjustments):
                    rate_adjustments.append(("Specialized diet management", 1.00))
            
            # Bilingual caregiver (+$2/hr)
            if any(x in req_text for x in ['spanish', 'bilingual', 'interpreter', 'non-english']):
                rate_adjustments.append(("Bilingual caregiver", 2.00))
        
        # Check safety concerns for high-risk factors
        safety_concerns = assessment_data.get('safety_concerns', [])
        high_severity_count = sum(1 for s in safety_concerns 
                                   if isinstance(s, dict) and s.get('severity', '').lower() == 'high')
        if high_severity_count >= 2:
            rate_adjustments.append(("Multiple high-risk factors", 2.00))
        
        # Calculate final rate
        total_adjustment = sum(adj[1] for adj in rate_adjustments)
        hourly_rate = base_rate + total_adjustment
        
        # Cap at reasonable maximum
        hourly_rate = min(hourly_rate, 55.00)  # Max $55/hr
        
        # Log rate breakdown
        logger.info(f"Rate calculation: Base ${base_rate:.2f} ({care_need_level})")
        for adj_name, adj_amount in rate_adjustments:
            logger.info(f"  + ${adj_amount:.2f} for {adj_name}")
        logger.info(f"  = ${hourly_rate:.2f}/hr final rate")
        
        # Ensure we have at least some hours if services were identified
        if weekly_hours == 0 and len(services) > 0:
            weekly_hours = len(services) * 4  # Minimum 4 hrs per service
            logger.info(f"Fallback: {weekly_hours} hrs from {len(services)} services x 4 hrs each")
        
        # Log the final calculation
        weekly_cost = hourly_rate * weekly_hours
        monthly_cost = weekly_cost * 4.33
        logger.info(f"Final calculation: {weekly_hours} hrs/week x ${hourly_rate}/hr = ${weekly_cost}/week (${monthly_cost:.0f}/month)")
        
        # Build contract services list
        contract_services = []
        for svc in services:
            if isinstance(svc, str):
                contract_services.append({"name": svc, "description": "", "frequency": ""})
            else:
                contract_services.append({
                    "name": svc.get("name", "Care Service"),
                    "description": svc.get("description", ""),
                    "frequency": svc.get("frequency", "As needed"),
                    "priority": svc.get("priority", "Medium"),
                    "evidence": svc.get("evidence", ""),
                })
        
        # Build extended schedule with all assessment data
        extended_schedule = {
            **schedule,
            "care_need_level": care_need_level,
            "eicna_rationale": eicna.get("rationale", ""),
            "client_profile": assessment_data.get("client_profile", {}),
            "safety_concerns": assessment_data.get("safety_concerns", []),
            "special_requirements": assessment_data.get("special_requirements", []),
            "care_plan_goals": assessment_data.get("care_plan_goals", {}),
            "family_involvement": assessment_data.get("family_involvement", {}),
            "extracted_mentions": assessment_data.get("extracted_mentions", {}),
        }
        
        # =====================================================================
        # STEP 3: Generate contract using template
        # =====================================================================
        logger.info(f"Generating contract from template...")
        
        contract_data = {
            "services": contract_services,
            "schedule": extended_schedule,
            "hourly_rate": hourly_rate,
            "weekly_hours": weekly_hours,
            "cancellation_policy": "",  # Use default from template
            "terms_and_conditions": "",  # Use default from template
        }
        
        # Generate contract text (for preview/display)
        contract_text = generate_contract_from_template(
            contract_data=contract_data,
            client_info=client_info,
            assessment_data=assessment_data,
        )
        
        # =====================================================================
        # STEP 4: Update Client Record with Assessment Data
        # =====================================================================
        logger.info(f"Updating client record with assessment data...")
        
        client_profile = assessment_data.get("client_profile", {})
        
        # Update client with extracted medical/care information
        if client_profile.get("primary_diagnosis"):
            client.primary_diagnosis = client_profile.get("primary_diagnosis")
        
        if client_profile.get("secondary_conditions"):
            conditions = client_profile.get("secondary_conditions")
            if isinstance(conditions, list):
                client.secondary_diagnoses = ", ".join(conditions)
            else:
                client.secondary_diagnoses = str(conditions)
        
        if client_profile.get("mobility_status"):
            client.mobility_status = client_profile.get("mobility_status")
        
        if client_profile.get("cognitive_status"):
            client.cognitive_status = client_profile.get("cognitive_status")
        
        if client_profile.get("living_situation"):
            client.living_situation = client_profile.get("living_situation")
        
        # Update care level
        client.care_level = care_need_level
        
        # Update special requirements
        special_reqs = assessment_data.get("special_requirements", [])
        if special_reqs:
            if isinstance(special_reqs, list):
                # Handle list of objects or strings
                reqs_text = []
                for req in special_reqs:
                    if isinstance(req, dict):
                        reqs_text.append(req.get("name") or req.get("requirement") or str(req))
                    else:
                        reqs_text.append(str(req))
                client.special_requirements = "\n".join(reqs_text)
            else:
                client.special_requirements = str(special_reqs)
        
        # Update schedule preferences
        if schedule.get("preferred_days"):
            days = schedule.get("preferred_days")
            if isinstance(days, list):
                day_strs = []
                for d in days:
                    if isinstance(d, dict):
                        day_strs.append(d.get("day", str(d)))
                    else:
                        day_strs.append(str(d))
                client.preferred_days = ", ".join(day_strs)
            else:
                client.preferred_days = str(days)
        
        if schedule.get("preferred_times"):
            client.preferred_times = schedule.get("preferred_times")
        
        # Update medical notes with assessment summary
        condition_summary = assessment_data.get("client_condition_summary", "")
        if condition_summary:
            existing_notes = client.medical_notes or ""
            assessment_note = f"\n\n--- Assessment {datetime.now(timezone.utc).strftime('%Y-%m-%d')} ---\n{condition_summary}"
            client.medical_notes = existing_notes + assessment_note
        
        # Update care plan goals
        care_goals = assessment_data.get("care_plan_goals", {})
        if care_goals:
            short_term = care_goals.get("short_term", [])
            long_term = care_goals.get("long_term", [])
            care_plan_text = ""
            if short_term:
                care_plan_text += "Short-term Goals:\n" + "\n".join(f"• {g}" for g in short_term)
            if long_term:
                care_plan_text += "\n\nLong-term Goals:\n" + "\n".join(f"• {g}" for g in long_term)
            if care_plan_text:
                client.care_plan = care_plan_text
        
        logger.info(f"Client {client.full_name} updated with care level: {care_need_level}")
        
        # =====================================================================
        # STEP 5: Find Best Matching Caregiver
        # =====================================================================
        logger.info(f"Finding best caregiver match for care level: {care_need_level}")
        
        try:
            from models import Caregiver
            
            # Build query for matching caregivers
            caregiver_query = db.query(Caregiver).filter(Caregiver.status == 'active')
            
            # Filter by care level capability
            if care_need_level == "HIGH":
                caregiver_query = caregiver_query.filter(Caregiver.can_handle_high_care == True)
            elif care_need_level == "MODERATE":
                caregiver_query = caregiver_query.filter(Caregiver.can_handle_moderate_care == True)
            else:
                caregiver_query = caregiver_query.filter(Caregiver.can_handle_low_care == True)
            
            # Filter by availability
            caregiver_query = caregiver_query.filter(
                Caregiver.current_client_count < Caregiver.max_clients
            )
            
            caregivers = caregiver_query.all()
            
            # Score caregivers
            best_match = None
            best_score = 0
            
            # Get specializations needed from assessment
            client_specializations = []
            if client_profile.get("primary_diagnosis"):
                diag = client_profile["primary_diagnosis"].lower()
                if "dementia" in diag or "alzheimer" in diag:
                    client_specializations.append("dementia")
                if "diabetes" in diag:
                    client_specializations.append("diabetes")
                if "depression" in diag or "anxiety" in diag:
                    client_specializations.append("mental health")
            
            for cg in caregivers:
                score = 50
                
                # Care level match
                if care_need_level == "HIGH" and cg.can_handle_high_care:
                    score += 20
                
                # Experience bonus
                if cg.years_experience and cg.years_experience >= 5:
                    score += 15
                elif cg.years_experience and cg.years_experience >= 2:
                    score += 10
                
                # Specialization match
                if cg.specializations and client_specializations:
                    matching = set(client_specializations) & set(cg.specializations)
                    score += len(matching) * 15
                
                # Location match
                if client.city and cg.city and client.city.lower() == cg.city.lower():
                    score += 10
                if client.state and cg.state and client.state.lower() == cg.state.lower():
                    score += 5
                
                # Rating bonus
                if cg.rating and cg.rating >= 4.5:
                    score += 10
                
                # Availability bonus
                if cg.current_client_count is not None and cg.max_clients:
                    availability = 1 - (cg.current_client_count / cg.max_clients)
                    score += availability * 10
                
                if score > best_score:
                    best_score = score
                    best_match = cg
            
            if best_match:
                logger.info(f"Best caregiver match: {best_match.full_name} (score: {best_score})")
                extended_schedule["recommended_caregiver"] = {
                    "id": str(best_match.id),
                    "name": best_match.full_name,
                    "certification": best_match.certification_level,
                    "match_score": best_score,
                    "years_experience": best_match.years_experience,
                    "specializations": best_match.specializations or [],
                }
            else:
                logger.info("No matching caregiver found")
                extended_schedule["recommended_caregiver"] = None
                
        except Exception as e:
            logger.warning(f"Caregiver matching failed: {e}")
            extended_schedule["recommended_caregiver"] = None
        
        # =====================================================================
        # STEP 6: Save contract to database
        # =====================================================================
        
        # Check for existing contract
        existing_contract = db.query(Contract).filter(
            Contract.client_id == client.id,
            Contract.status.in_(["draft", "pending_signature"]),
        ).first()
        
        if existing_contract:
            existing_contract.services = contract_services
            existing_contract.schedule = extended_schedule
            existing_contract.weekly_hours = Decimal(str(weekly_hours))
            existing_contract.hourly_rate = Decimal(str(hourly_rate))
            existing_contract.cancellation_policy = ""  # Template handles this
            existing_contract.terms_and_conditions = contract_text  # Store full text
            existing_contract.updated_at = datetime.now(timezone.utc)
            contract = existing_contract
        else:
            contract = Contract(
                client_id=client.id,
                title=f"Home Care Service Agreement - {client.full_name}",
                services=contract_services,
                schedule=extended_schedule,
                hourly_rate=Decimal(str(hourly_rate)),
                weekly_hours=Decimal(str(weekly_hours)),
                cancellation_policy="",
                terms_and_conditions=contract_text,
            )
            db.add(contract)
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "contract": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("contract", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "care_need_level": care_need_level,
                "services_count": len(contract_services),
            }
        }
        
        db.commit()
        logger.info(f"Contract generation completed for visit {visit_id}")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "contract_id": str(contract.id),
            "care_need_level": care_need_level,
            "services_identified": len(contract_services),
        }
        
    except Exception as e:
        logger.error(f"Contract generation failed for visit {visit_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "contract": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
