from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.note import Note
from app.schemas.note import NoteResponse, NoteUpdate

router = APIRouter()


@router.get("/{visit_id}/note", response_model=NoteResponse)
async def get_note(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the visit note."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    note = db.query(Note).filter(Note.visit_id == visit_id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No note available. Generate note first."
        )
    
    return note


@router.put("/{visit_id}/note", response_model=NoteResponse)
async def update_note(
    visit_id: UUID,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the visit note."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    note = db.query(Note).filter(Note.visit_id == visit_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    
    update_data = note_update.model_dump(exclude_unset=True)
    
    # If approving, record who approved
    if update_data.get("is_approved"):
        update_data["approved_by_id"] = current_user.id
    
    for field, value in update_data.items():
        setattr(note, field, value)
    
    db.commit()
    db.refresh(note)
    
    return note
