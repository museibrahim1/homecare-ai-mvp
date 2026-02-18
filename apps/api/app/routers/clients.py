import logging
from datetime import date
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.contract import Contract
from app.models.visit import Visit
from app.models.transcript_segment import TranscriptSegment
from app.models.diarization_turn import DiarizationTurn
from app.models.billable_item import BillableItem
from app.models.note import Note
from app.models.audio_asset import AudioAsset
from app.models.call import Call
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List clients created by the current user (data isolation)."""
    # Filter by created_by for strict data isolation - only show user's own clients
    clients = db.query(Client).filter(
        Client.created_by == current_user.id
    ).offset(skip).limit(limit).all()
    return clients


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client (associated with the current user)."""
    client_data = client_in.model_dump()
    client_data['created_by'] = current_user.id  # Set owner for data isolation
    client = Client(**client_data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific client (data isolation enforced)."""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_in: ClientUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a client (data isolation enforced)."""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Track status change for notification
    old_status = client.status
    
    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    # Send notification if status changed
    new_status = client.status
    if old_status != new_status and new_status:
        email_service = get_email_service()
        background_tasks.add_task(
            email_service.send_client_status_change,
            user_email=current_user.email,
            client_name=client.full_name,
            old_status=old_status or "none",
            new_status=new_status,
            changed_by=current_user.full_name,
        )
    
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a client and all related records (data isolation enforced)."""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Delete all related records to avoid FK violations
    visits = db.query(Visit).filter(Visit.client_id == client_id).all()
    for visit in visits:
        db.query(TranscriptSegment).filter(TranscriptSegment.visit_id == visit.id).delete(synchronize_session=False)
        db.query(DiarizationTurn).filter(DiarizationTurn.visit_id == visit.id).delete(synchronize_session=False)
        db.query(BillableItem).filter(BillableItem.visit_id == visit.id).delete(synchronize_session=False)
        db.query(Note).filter(Note.visit_id == visit.id).delete(synchronize_session=False)
        db.query(AudioAsset).filter(AudioAsset.visit_id == visit.id).delete(synchronize_session=False)
        db.query(Call).filter(Call.visit_id == visit.id).delete(synchronize_session=False)
        db.delete(visit)
    
    # Delete contracts for this client
    db.query(Contract).filter(Contract.client_id == client_id).delete(synchronize_session=False)
    
    db.delete(client)
    db.commit()


@router.post("/{client_id}/activate-policy")
async def activate_client_policy(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-create a policy for a client who signed their service agreement.
    
    Finds the latest contract for this client, marks it as 'active' (signed),
    and sets the signature date. The contract then appears as an active policy
    in the Documents page.
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Find the latest contract for this client
    contract = db.query(Contract).filter(
        Contract.client_id == client_id
    ).order_by(desc(Contract.created_at)).first()
    
    if not contract:
        return {
            "success": False,
            "message": "No contract found for this client. Generate one through an assessment first.",
        }
    
    # Update contract status to active (signed policy)
    contract.status = "active"
    contract.client_signature_date = date.today()
    contract.agency_signature_date = date.today()
    
    # Also update the contract title to reflect it's now a policy
    if contract.title and "Proposal" in contract.title:
        contract.title = contract.title.replace("Proposal", "Service Agreement")
    
    db.commit()
    
    logger.info(f"Policy activated for client {client.full_name} (contract {contract.id})")
    
    return {
        "success": True,
        "message": f"Service agreement activated for {client.full_name}",
        "contract_id": str(contract.id),
        "contract_status": contract.status,
    }
