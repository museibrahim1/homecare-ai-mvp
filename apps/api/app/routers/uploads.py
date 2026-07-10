import os
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.rate_limit import limiter
from app.core.deps import get_db, get_current_user
from app.core.tier_limits import enforce_ai_tier_limit
from app.models.user import User
from app.models.visit import Visit
from app.models.client import Client
from app.models.audio_asset import AudioAsset
from app.schemas.upload import UploadResponse
from app.services.storage import upload_file_to_s3, download_file_from_s3
from app.services.audit import log_action
from app.services.jobs import enqueue_task

router = APIRouter()


def get_user_visit(db: Session, visit_id: UUID, current_user: User) -> Visit:
    """Helper to get a visit with data isolation enforced."""
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == visit_id,
        Client.created_by == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


@router.post(
    "/audio",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(enforce_ai_tier_limit)],
)
@limiter.limit("30/minute")
async def upload_audio(
    request: Request,
    visit_id: UUID = Form(...),
    file: UploadFile = File(...),
    auto_process: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload an audio file for a visit (data isolation enforced).
    
    If auto_process=true, automatically runs the full pipeline:
    transcribe -> diarize -> align -> bill -> note -> contract
    """
    # Verify visit exists and belongs to user
    visit = get_user_visit(db, visit_id, current_user)
    
    # Validate file type - be permissive with audio formats
    allowed_types = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac",
        "audio/ogg", "audio/webm", "audio/flac", "audio/x-flac",
        "audio/amr", "audio/3gpp", "audio/3gpp2",
        "video/mp4", "video/webm",  # Some recorders send video content type
        "application/octet-stream",  # Generic binary - accept and let whisper handle it
    ]
    # Also accept any content type that starts with "audio/"
    is_audio = file.content_type and (
        file.content_type in allowed_types or 
        file.content_type.startswith("audio/") or
        file.content_type.startswith("video/")
    )
    # If no content type or unrecognized, check file extension
    if not is_audio and file.filename:
        audio_extensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac', '.mp4', '.amr', '.3gp']
        is_audio = any(file.filename.lower().endswith(ext) for ext in audio_extensions)
    
    if file.content_type and not is_audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Upload an audio file (mp3, wav, m4a, etc.)",
        )
    
    # Read file content
    content = await file.read()
    MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large. Maximum size is 500MB.")
    file_size = len(content)

    # Magic-byte sniff: the content_type/extension can be spoofed, so verify
    # the first few bytes look like one of the audio/video containers we
    # actually support. We accept WAV (RIFF), MP3 (ID3/sync), MP4/M4A (ftyp),
    # OGG, WebM/Matroska, FLAC, AMR, and 3GPP.
    if file_size >= 12:
        head = content[:16]
        looks_like_audio = (
            head[:4] == b"RIFF" and head[8:12] == b"WAVE"      # WAV
            or head[:3] == b"ID3"                                  # MP3 w/ ID3
            or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)      # MP3 frame sync
            or head[4:8] == b"ftyp"                                # MP4/M4A/3GP
            or head[:4] == b"OggS"                                  # OGG
            or head[:4] == b"\x1aE\xdf\xa3"                       # Matroska/WebM
            or head[:4] == b"fLaC"                                  # FLAC
            or head[:6] == b"#!AMR\n"                              # AMR
            or head[:3] == b"FFC"                                   # AAC ADTS variant
        )
        if not looks_like_audio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file doesn't look like a supported audio recording.",
            )
    
    # Sanitize filename to prevent path traversal
    import re
    safe_filename = os.path.basename(file.filename or "recording.wav")
    safe_filename = re.sub(r'[^\w\s\-\.]', '_', safe_filename)[:200] or "recording.wav"
    s3_key = f"visits/{visit_id}/audio/{safe_filename}"
    
    # Upload to S3
    try:
        upload_file_to_s3(s3_key, content, file.content_type)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file. Please try again.",
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


@router.get("/audio/{audio_id}/download")
async def download_audio(
    audio_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an audio file (data isolation enforced)."""
    # Get audio asset
    audio = db.query(AudioAsset).filter(AudioAsset.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found")
    
    # Verify ownership through visit -> client chain
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == audio.visit_id,
        Client.created_by == current_user.id
    ).first()
    
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found")
    
    # Download from S3
    try:
        content = download_file_from_s3(audio.s3_key)
        
        # Determine content type
        content_type = audio.content_type or "audio/mpeg"
        filename = audio.original_filename or f"audio_{audio_id}.mp3"
        # The original filename is user-supplied at upload time: strip header
        # control characters and quotes so it can't break the response headers.
        safe_filename = "".join(c for c in filename if c.isprintable() and c not in '"\\;') or f"audio_{audio_id}.mp3"

        return StreamingResponse(
            io.BytesIO(content),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file. Please try again."
        )
