from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.audio_asset import AudioAsset
from app.schemas.upload import UploadResponse
from app.services.storage import upload_file_to_s3
from app.services.audit import log_action
from app.services.jobs import enqueue_task

router = APIRouter()


@router.post("/audio", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio(
    visit_id: UUID = Form(...),
    file: UploadFile = File(...),
    auto_process: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload an audio file for a visit.
    
    If auto_process=true, automatically runs the full pipeline:
    transcribe -> diarize -> align -> bill -> note -> contract
    """
    # Verify visit exists
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/x-m4a"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Generate S3 key
    s3_key = f"visits/{visit_id}/audio/{file.filename}"
    
    # Upload to S3
    try:
        upload_file_to_s3(s3_key, content, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )
    
    # Create audio asset record
    audio_asset = AudioAsset(
        visit_id=visit_id,
        s3_key=s3_key,
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=file_size,
        status="uploaded",
    )
    db.add(audio_asset)
    
    # Update visit status
    visit.status = "in_progress"
    
    # Commit the audio asset first (before queuing the pipeline)
    db.commit()
    db.refresh(audio_asset)
    
    # If auto_process is enabled, start the full pipeline AFTER commit
    task_id = None
    if auto_process and auto_process.lower() == "true":
        # Queue the full pipeline task (audio asset now exists in DB)
        task_id = enqueue_task("full_pipeline", visit_id=str(visit_id))
        
        # Update pipeline state
        visit.pipeline_state = {
            "full_pipeline": {"status": "queued", "task_id": task_id},
            "transcription": {"status": "pending"},
            "diarization": {"status": "pending"},
            "alignment": {"status": "pending"},
            "billing": {"status": "pending"},
            "note": {"status": "pending"},
            "contract": {"status": "pending"},
        }
        db.commit()
    
    log_action(db, current_user.id, "audio_uploaded", "audio_asset", audio_asset.id)
    
    return audio_asset
