from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractUpdate, ContractResponse

router = APIRouter()


@router.get("/{visit_id}/contract", response_model=ContractResponse)
async def get_visit_contract(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the contract associated with a visit's client."""
    from app.models.visit import Visit
    
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
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
    """Update the contract associated with a visit's client."""
    from app.models.visit import Visit
    
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
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
    """List all contracts."""
    contracts = db.query(Contract).offset(skip).limit(limit).all()
    return contracts


@router.post("/contracts", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_in: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new contract."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == contract_in.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    contract = Contract(**contract_in.model_dump())
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
    Sync contract data to client record.
    Updates client's scheduling preferences from contract schedule.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
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
    """Get all contracts for a specific client."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    contracts = db.query(Contract).filter(
        Contract.client_id == client_id
    ).order_by(Contract.created_at.desc()).all()
    
    return contracts
