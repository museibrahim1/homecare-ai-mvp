from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.transcript_segment import TranscriptSegment
from app.schemas.transcript import TranscriptResponse, TranscriptSegmentResponse

router = APIRouter()


@router.get("/{visit_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the transcript for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).order_by(TranscriptSegment.start_ms).all()
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transcript available. Run transcription first."
        )
    
    # Calculate totals
    total_duration_ms = max(s.end_ms for s in segments) if segments else 0
    word_count = sum(len(s.text.split()) for s in segments)
    
    return TranscriptResponse(
        visit_id=visit_id,
        segments=[TranscriptSegmentResponse.model_validate(s) for s in segments],
        total_duration_ms=total_duration_ms,
        word_count=word_count,
    )
