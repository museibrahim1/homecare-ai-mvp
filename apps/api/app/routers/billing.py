from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.billable_item import BillableItem
from app.schemas.billing import BillingResponse, BillableItemResponse, BillableItemUpdate

router = APIRouter()


@router.get("/{visit_id}/billables", response_model=BillingResponse)
async def get_billables(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get billable items for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    items = db.query(BillableItem).filter(
        BillableItem.visit_id == visit_id
    ).order_by(BillableItem.start_ms).all()
    
    # Calculate totals
    total_minutes = sum(item.minutes for item in items)
    total_adjusted = sum(item.adjusted_minutes or item.minutes for item in items)
    
    # Group by category
    categories = {}
    for item in items:
        if item.category not in categories:
            categories[item.category] = 0
        categories[item.category] += item.adjusted_minutes or item.minutes
    
    return BillingResponse(
        visit_id=visit_id,
        items=[BillableItemResponse.model_validate(item) for item in items],
        total_minutes=total_minutes,
        total_adjusted_minutes=total_adjusted,
        categories=categories,
    )


@router.put("/{visit_id}/billables", response_model=BillingResponse)
async def update_billables(
    visit_id: UUID,
    updates: List[BillableItemUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update billable items (batch update)."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # This is a simplified version - in production, you'd match by item ID
    # For now, just return current billables
    return await get_billables(visit_id, db, current_user)


@router.put("/{visit_id}/billables/{item_id}", response_model=BillableItemResponse)
async def update_billable_item(
    visit_id: UUID,
    item_id: UUID,
    update: BillableItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a specific billable item."""
    item = db.query(BillableItem).filter(
        BillableItem.id == item_id,
        BillableItem.visit_id == visit_id,
    ).first()
    
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billable item not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    return item
