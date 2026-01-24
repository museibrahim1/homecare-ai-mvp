from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.diarization_turn import DiarizationTurn
from app.schemas.diarization import DiarizationResponse, DiarizationTurnResponse

router = APIRouter()


@router.get("/{visit_id}/diarization", response_model=DiarizationResponse)
async def get_diarization(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the diarization turns for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    turns = db.query(DiarizationTurn).filter(
        DiarizationTurn.visit_id == visit_id
    ).order_by(DiarizationTurn.start_ms).all()
    
    if not turns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No diarization available. Run diarization first."
        )
    
    # Get unique speakers
    speakers = list(set(t.speaker for t in turns))
    
    return DiarizationResponse(
        visit_id=visit_id,
        turns=[DiarizationTurnResponse.model_validate(t) for t in turns],
        speakers=speakers,
        total_turns=len(turns),
    )
