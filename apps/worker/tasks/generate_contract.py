"""
Contract Generation Task

Generates service contracts based on visit and client data.
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
    Generate a service contract based on visit data.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting contract generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, BillableItem, Contract
        from libs.contract_gen import generate_contract_data
        
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
        
        # Get billable items to determine services
        billables = db.query(BillableItem).filter(
            BillableItem.visit_id == visit.id
        ).all()
        
        # Prepare client data
        client_data = {
            "full_name": client.full_name,
            "address": client.address,
            "phone": client.phone,
            "emergency_contact_name": client.emergency_contact_name,
            "emergency_contact_phone": client.emergency_contact_phone,
        }
        
        # Derive services from billables
        services = []
        seen_categories = set()
        for billable in billables:
            if billable.category not in seen_categories:
                services.append({
                    "name": billable.category.replace("_", " ").title(),
                    "description": billable.description or "",
                    "rate_modifier": 1.0,
                })
                seen_categories.add(billable.category)
        
        # Calculate suggested schedule and rates based on billables
        total_minutes = sum(b.adjusted_minutes or b.minutes for b in billables)
        weekly_hours = max(total_minutes / 60, 4)  # Minimum 4 hours
        
        # Generate contract data
        contract_data = generate_contract_data(
            client_data=client_data,
            services=services if services else None,
            weekly_hours=weekly_hours,
        )
        
        # Check for existing contract
        existing_contract = db.query(Contract).filter(
            Contract.client_id == client.id,
            Contract.status.in_(["draft", "pending_signature"]),
        ).first()
        
        if existing_contract:
            # Update existing draft
            existing_contract.services = services
            existing_contract.schedule = contract_data.get("schedule", {})
            existing_contract.weekly_hours = weekly_hours
            contract = existing_contract
        else:
            # Create new contract
            contract = Contract(
                client_id=client.id,
                title=f"Home Care Service Agreement - {client.full_name}",
                services=services,
                schedule=contract_data.get("schedule", {}),
                hourly_rate=25.00,  # Default rate
                weekly_hours=weekly_hours,
                cancellation_policy=contract_data.get("policies", {}).get("cancellation", ""),
                terms_and_conditions=contract_data.get("policies", {}).get("liability", ""),
            )
            db.add(contract)
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "contract": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("contract", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        
        db.commit()
        logger.info(f"Contract generation completed for visit {visit_id}")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "contract_id": str(contract.id),
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
