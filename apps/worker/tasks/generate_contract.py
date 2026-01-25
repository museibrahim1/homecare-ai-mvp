"""
Contract Generation Task

Generates service contracts using LLM analysis of visit transcripts.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db

logger = logging.getLogger(__name__)


@app.task(name="tasks.generate_contract.generate_service_contract", bind=True)
def generate_service_contract(self, visit_id: str):
    """
    Generate a service contract based on visit data and transcript analysis.
    
    Uses LLM to:
    1. Analyze transcript for services discussed
    2. Identify client needs and special requirements
    3. Generate customized contract terms
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting LLM-powered contract generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, BillableItem, TranscriptSegment, Contract
        from libs.contract_gen import generate_contract_data
        from libs.llm import get_llm_service
        
        # Get visit with relationships
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
        
        # Get billable items
        billables = db.query(BillableItem).filter(
            BillableItem.visit_id == visit.id
        ).all()
        
        # Prepare transcript text
        transcript_text = "\n".join([
            f"[{seg.start_ms // 1000}s] {seg.text}"
            for seg in segments
        ]) if segments else "No transcript available."
        
        # Prepare client info
        client_info = {
            "full_name": client.full_name,
            "address": client.address,
            "phone": client.phone,
            "emergency_contact_name": client.emergency_contact_name,
            "emergency_contact_phone": client.emergency_contact_phone,
        }
        
        # Initialize LLM service
        llm = get_llm_service()
        
        # Analyze transcript for contract-relevant information
        logger.info("Analyzing transcript with LLM...")
        analysis = llm.analyze_transcript_for_contract(transcript_text, client_info)
        
        # Extract services from LLM analysis
        llm_services = analysis.get("services_identified", [])
        services = []
        
        for svc in llm_services:
            services.append({
                "name": svc.get("name", ""),
                "description": svc.get("description", ""),
                "frequency": svc.get("frequency", "As needed"),
                "rate_modifier": 1.0,
            })
        
        # Also include services from billables if not already covered
        seen_services = {s["name"].lower() for s in services}
        for billable in billables:
            service_name = billable.category.replace("_", " ").title()
            if service_name.lower() not in seen_services:
                services.append({
                    "name": service_name,
                    "description": billable.description or "",
                    "frequency": "As needed",
                    "rate_modifier": 1.0,
                })
                seen_services.add(service_name.lower())
        
        # Get recommended schedule from analysis
        recommended_schedule = analysis.get("recommended_schedule", {})
        schedule = {
            "days": recommended_schedule.get("days", ["Monday", "Wednesday", "Friday"]),
            "start_time": "09:00",
            "end_time": "13:00",
            "hours_per_visit": 4,
            "frequency": recommended_schedule.get("frequency", "3 times per week"),
            "preferred_times": recommended_schedule.get("preferred_times", "morning"),
        }
        
        # Calculate hours
        total_minutes = sum(b.adjusted_minutes or b.minutes for b in billables)
        weekly_hours = max(total_minutes / 60, 4)  # Minimum 4 hours
        
        # Generate customized contract terms using LLM
        logger.info("Generating contract terms with LLM...")
        contract_terms = llm.generate_contract_terms(services, client_info, schedule)
        
        # Generate base contract data
        contract_data = generate_contract_data(
            client_data=client_info,
            services=services,
            schedule=schedule,
            weekly_hours=weekly_hours,
        )
        
        # Enhance with LLM-generated content
        if contract_terms:
            contract_data["policies"]["cancellation"] = contract_terms.get(
                "cancellation_policy", 
                contract_data["policies"]["cancellation"]
            )
            contract_data["policies"]["liability"] = contract_terms.get(
                "liability_clause",
                contract_data["policies"]["liability"]
            )
            contract_data["policies"]["confidentiality"] = contract_terms.get(
                "confidentiality_clause",
                contract_data["policies"]["confidentiality"]
            )
            contract_data["terms"]["termination"] = contract_terms.get(
                "termination_clause",
                "Either party may terminate with 14 days written notice."
            )
            contract_data["special_provisions"] = contract_terms.get(
                "special_provisions", []
            )
        
        # Add LLM analysis summary
        contract_data["llm_analysis"] = {
            "client_condition_summary": analysis.get("client_condition_summary", ""),
            "care_recommendations": analysis.get("care_recommendations", ""),
            "special_requirements": analysis.get("special_requirements", []),
            "summary": analysis.get("summary", ""),
        }
        
        # Check for existing contract
        existing_contract = db.query(Contract).filter(
            Contract.client_id == client.id,
            Contract.status.in_(["draft", "pending_signature"]),
        ).first()
        
        if existing_contract:
            # Update existing draft
            existing_contract.services = services
            existing_contract.schedule = schedule
            existing_contract.weekly_hours = weekly_hours
            existing_contract.cancellation_policy = contract_data["policies"]["cancellation"]
            existing_contract.terms_and_conditions = f"""
{contract_data["policies"]["liability"]}

{contract_data["policies"]["confidentiality"]}

TERMINATION:
{contract_data["terms"].get("termination", "")}

CARE SUMMARY:
{analysis.get("summary", "")}
""".strip()
            contract = existing_contract
        else:
            # Create new contract
            contract = Contract(
                client_id=client.id,
                title=f"Home Care Service Agreement - {client.full_name}",
                services=services,
                schedule=schedule,
                hourly_rate=25.00,
                weekly_hours=weekly_hours,
                cancellation_policy=contract_data["policies"]["cancellation"],
                terms_and_conditions=f"""
{contract_data["policies"]["liability"]}

{contract_data["policies"]["confidentiality"]}

TERMINATION:
{contract_data["terms"].get("termination", "")}

CARE SUMMARY:
{analysis.get("summary", "")}
""".strip(),
            )
            db.add(contract)
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "contract": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("contract", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "llm_used": True,
                "services_identified": len(services),
            }
        }
        
        db.commit()
        logger.info(f"Contract generation completed for visit {visit_id}")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "contract_id": str(contract.id),
            "services_count": len(services),
            "llm_analysis": analysis,
        }
        
    except Exception as e:
        logger.error(f"Contract generation failed for visit {visit_id}: {str(e)}")
        
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
