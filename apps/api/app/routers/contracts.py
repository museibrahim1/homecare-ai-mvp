import base64
import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractUpdate, ContractResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{visit_id}/contract", response_model=ContractResponse)
async def get_visit_contract(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the contract associated with a visit's client (data isolation enforced)."""
    from app.models.visit import Visit
    
    # Join visit -> client and verify ownership
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == visit_id,
        Client.created_by == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No contract found for this client"
        )
    
    return contract


@router.put("/{visit_id}/contract", response_model=ContractResponse)
async def update_visit_contract(
    visit_id: UUID,
    contract_update: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the contract associated with a visit's client (data isolation enforced)."""
    from app.models.visit import Visit
    
    # Join visit -> client and verify ownership
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == visit_id,
        Client.created_by == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    update_data = contract_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)
    
    db.commit()
    db.refresh(contract)
    
    return contract


# Additional contract management endpoints
@router.get("/contracts", response_model=List[ContractResponse])
async def list_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List contracts for clients owned by the current user (data isolation)."""
    # Get client IDs belonging to this user
    user_client_ids = db.query(Client.id).filter(
        Client.created_by == current_user.id
    ).subquery()
    
    contracts = db.query(Contract).filter(
        Contract.client_id.in_(user_client_ids)
    ).offset(skip).limit(limit).all()
    return contracts


@router.post("/contracts", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_in: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new contract (data isolation enforced)."""
    # Verify client exists AND belongs to current user
    client = db.query(Client).filter(
        Client.id == contract_in.client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    # Exclude template_id (not a model column) before creating
    contract_data = contract_in.model_dump(exclude={"template_id"})
    contract = Contract(**contract_data)
    db.add(contract)
    db.commit()
    db.refresh(contract)
    
    return contract


@router.post("/contracts/{contract_id}/sync-to-client", response_model=ContractResponse)
async def sync_contract_to_client(
    contract_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sync contract data to client record (data isolation enforced).
    Updates client's scheduling preferences from contract schedule.
    """
    # Join contract -> client and verify ownership
    contract = db.query(Contract).join(Client, Contract.client_id == Client.id).filter(
        Contract.id == contract_id,
        Client.created_by == current_user.id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    client = db.query(Client).filter(Client.id == contract.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    # Sync schedule to client preferences
    if contract.schedule:
        schedule = contract.schedule
        if "days" in schedule:
            days = schedule["days"]
            if isinstance(days, list):
                client.preferred_days = ", ".join(days)
        
        # Build preferred times from schedule
        times_parts = []
        if "start_time" in schedule:
            times_parts.append(schedule["start_time"])
        if "end_time" in schedule:
            times_parts.append(schedule["end_time"])
        if times_parts:
            client.preferred_times = " - ".join(times_parts)
        elif "hours_per_week" in schedule:
            client.preferred_times = f"{schedule['hours_per_week']} hours/week"
    
    # Sync care level from services if available
    if contract.services:
        high_care_services = ["skilled nursing", "wound care", "medical", "injection"]
        moderate_care_services = ["personal care", "bathing", "dressing", "mobility"]
        
        has_high = any(
            any(hs in str(s.get("name", "")).lower() for hs in high_care_services)
            for s in contract.services
        )
        has_moderate = any(
            any(ms in str(s.get("name", "")).lower() for ms in moderate_care_services)
            for s in contract.services
        )
        
        if has_high and not client.care_level:
            client.care_level = "HIGH"
        elif has_moderate and not client.care_level:
            client.care_level = "MODERATE"
    
    db.commit()
    db.refresh(contract)
    
    return contract


@router.get("/clients/{client_id}/contracts", response_model=List[ContractResponse])
async def get_client_contracts(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all contracts for a specific client (data isolation enforced)."""
    # Verify client exists AND belongs to current user
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    contracts = db.query(Contract).filter(
        Contract.client_id == client_id
    ).order_by(Contract.created_at.desc()).all()
    
    return contracts


@router.post("/contracts/{contract_id}/export-template")
async def export_contract_with_template(
    contract_id: UUID,
    template_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export a contract as a filled DOCX using an OCR-scanned template.
    Uses the template's field mapping to populate all detected fields
    from the contract/client/agency data in the database.
    """
    from app.models.contract_template import ContractTemplate
    from app.models.agency_settings import AgencySettings
    from app.services.document_generation import get_template_placeholders, fill_docx_template

    # Verify contract ownership
    contract = db.query(Contract).join(Client, Contract.client_id == Client.id).filter(
        Contract.id == contract_id,
        Client.created_by == current_user.id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    client = db.query(Client).filter(Client.id == contract.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get the template — either specified or the user's active template
    if template_id:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.id == template_id,
            ContractTemplate.owner_id == current_user.id,
        ).first()
    else:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.owner_id == current_user.id,
            ContractTemplate.is_active == True,
        ).order_by(ContractTemplate.version.desc()).first()

    if not template:
        raise HTTPException(status_code=404, detail="No contract template found. Upload one in Templates.")

    if not template.file_url:
        raise HTTPException(status_code=400, detail="Template has no file stored")

    # Decode the stored template file
    if template.file_url.startswith("data:"):
        _, encoded = template.file_url.split(",", 1)
        template_bytes = base64.b64decode(encoded)
    else:
        raise HTTPException(status_code=400, detail="Template file format not supported")

    # Get agency settings
    agency_settings = db.query(AgencySettings).filter(
        AgencySettings.user_id == current_user.id,
    ).first()

    # Build placeholders from contract + client + agency data
    placeholders = get_template_placeholders(client, contract, agency_settings)

    # Fill the template
    try:
        filled_docx = fill_docx_template(template_bytes, placeholders)
    except Exception as e:
        logger.error(f"Template fill failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate contract from template")

    safe_name = (client.full_name or "contract").replace(" ", "_")
    filename = f"{safe_name}_Service_Agreement.docx"

    return Response(
        content=filled_docx,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
