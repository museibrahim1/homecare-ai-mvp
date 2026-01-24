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
