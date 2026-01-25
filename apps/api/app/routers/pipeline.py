from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.transcript_segment import TranscriptSegment
from app.services.jobs import enqueue_task

router = APIRouter()


@router.post("/visits/{visit_id}/process-transcript")
async def process_transcript_only(
    visit_id: UUID,
    generate_note: bool = Query(True, description="Generate visit note from transcript"),
    generate_contract: bool = Query(True, description="Generate service contract"),
    generate_billing: bool = Query(True, description="Extract billable items"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process an imported transcript (skip audio transcription/diarization).
    
    Use this after importing a transcript to generate billing, notes, and contracts.
    This is useful when you have a transcript from another source and don't need
    to re-transcribe audio.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # Check if transcript exists
    segment_count = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).count()
    
    if segment_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript found. Import or upload audio first."
        )
    
    tasks_queued = []
    pipeline_state = visit.pipeline_state or {}
    
    # Mark transcription as completed (since we have segments)
    if pipeline_state.get("transcription", {}).get("status") != "completed":
        pipeline_state["transcription"] = {"status": "completed", "source": "imported"}
    
    # Queue billing task
    if generate_billing:
        task_id = enqueue_task("bill", visit_id=str(visit_id))
        pipeline_state["billing"] = {"status": "queued", "task_id": task_id}
        tasks_queued.append("billing")
    
    # Queue note generation (depends on billing)
    if generate_note:
        task_id = enqueue_task("generate_note", visit_id=str(visit_id))
        pipeline_state["note"] = {"status": "queued", "task_id": task_id}
        tasks_queued.append("note")
    
    # Queue contract generation
    if generate_contract:
        task_id = enqueue_task("generate_contract", visit_id=str(visit_id))
        pipeline_state["contract"] = {"status": "queued", "task_id": task_id}
        tasks_queued.append("contract")
    
    visit.pipeline_state = pipeline_state
    db.commit()
    
    return {
        "message": f"Processing transcript ({segment_count} segments)",
        "tasks_queued": tasks_queued,
        "pipeline_state": pipeline_state
    }


@router.post("/visits/{visit_id}/transcribe")
async def start_transcription(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start transcription job for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # Check if audio exists
    if not visit.audio_assets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No audio uploaded for this visit")
    
    # Enqueue transcription task
    task_id = enqueue_task("transcribe", visit_id=str(visit_id))
    
    # Update pipeline state
    visit.pipeline_state = {
        **visit.pipeline_state,
        "transcription": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Transcription job queued", "task_id": task_id}


@router.post("/visits/{visit_id}/diarize")
async def start_diarization(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start diarization job for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    task_id = enqueue_task("diarize", visit_id=str(visit_id))
    
    visit.pipeline_state = {
        **visit.pipeline_state,
        "diarization": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Diarization job queued", "task_id": task_id}


@router.post("/visits/{visit_id}/align")
async def start_alignment(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Align transcription with diarization (merge speaker turns)."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    task_id = enqueue_task("align", visit_id=str(visit_id))
    
    visit.pipeline_state = {
        **visit.pipeline_state,
        "alignment": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Alignment job queued", "task_id": task_id}


@router.post("/visits/{visit_id}/bill")
async def start_billing(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate billable items from transcript."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    task_id = enqueue_task("bill", visit_id=str(visit_id))
    
    visit.pipeline_state = {
        **visit.pipeline_state,
        "billing": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Billing job queued", "task_id": task_id}


@router.post("/visits/{visit_id}/note")
async def start_note_generation(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate visit note from transcript and billables."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    task_id = enqueue_task("generate_note", visit_id=str(visit_id))
    
    visit.pipeline_state = {
        **visit.pipeline_state,
        "note": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Note generation job queued", "task_id": task_id}


@router.post("/visits/{visit_id}/contract")
async def start_contract_generation(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate service contract based on visit data."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    task_id = enqueue_task("generate_contract", visit_id=str(visit_id))
    
    visit.pipeline_state = {
        **visit.pipeline_state,
        "contract": {"status": "queued", "task_id": task_id}
    }
    db.commit()
    
    return {"message": "Contract generation job queued", "task_id": task_id}


@router.get("/visits/{visit_id}/status")
async def get_pipeline_status(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current pipeline status for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    return {
        "visit_id": str(visit_id),
        "status": visit.status,
        "pipeline_state": visit.pipeline_state,
    }
