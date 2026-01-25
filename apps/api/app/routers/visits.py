from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.client import Client
from app.models.audio_asset import AudioAsset
from app.schemas.visit import VisitCreate, VisitUpdate, VisitResponse, VisitListResponse

router = APIRouter()


@router.get("", response_model=VisitListResponse)
async def list_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    client_id: Optional[UUID] = None,
    caregiver_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List visits with pagination and filters."""
    query = db.query(Visit).options(
        joinedload(Visit.client),
        joinedload(Visit.caregiver),
    )
    
    if status:
        query = query.filter(Visit.status == status)
    if client_id:
        query = query.filter(Visit.client_id == client_id)
    if caregiver_id:
        query = query.filter(Visit.caregiver_id == caregiver_id)
    
    total = query.count()
    visits = query.order_by(Visit.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return VisitListResponse(
        items=visits,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def create_visit(
    visit_in: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new visit."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == visit_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Verify caregiver exists
    caregiver = db.query(User).filter(User.id == visit_in.caregiver_id).first()
    if not caregiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver not found",
        )
    
    visit = Visit(
        **visit_in.model_dump(),
        pipeline_state={},
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific visit with full details."""
    visit = db.query(Visit).options(
        joinedload(Visit.client),
        joinedload(Visit.caregiver),
        joinedload(Visit.audio_assets),
    ).filter(Visit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    return visit


@router.put("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: UUID,
    visit_in: VisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    
    update_data = visit_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(visit, field, value)
    
    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visit(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    
    db.delete(visit)
    db.commit()
