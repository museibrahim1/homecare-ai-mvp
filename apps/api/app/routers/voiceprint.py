"""
Voiceprint API endpoints for speaker identification.

Allows users to create voiceprints from voice samples for automatic
speaker identification during diarization.
"""

import os
import logging
import requests
import time
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

PYANNOTE_API_KEY = os.getenv("PYANNOTE_API_KEY")
PYANNOTE_API_URL = "https://api.pyannote.ai/v1"


@router.post("/create")
async def create_voiceprint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a voiceprint from a voice sample.
    
    Requirements:
    - Audio must contain only the speaker's voice (no other speakers)
    - Maximum 30 seconds duration
    - Supported formats: WAV, MP3, M4A
    """
    if not PYANNOTE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voiceprint service not configured. Please add PYANNOTE_API_KEY."
        )
    
    # Read the file
    audio_data = await file.read()
    
    # Check file size (30 seconds of audio is roughly 1-5MB depending on format)
    max_size = 10 * 1024 * 1024  # 10MB limit
    if len(audio_data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file too large. Maximum 30 seconds / 10MB."
        )
    
    # Upload to temporary storage and get URL
    # For now, we'll use the pyannote API with base64 data
    import base64
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    
    # Determine content type
    content_type = file.content_type or 'audio/wav'
    if 'mp3' in (file.filename or '').lower():
        content_type = 'audio/mpeg'
    elif 'm4a' in (file.filename or '').lower():
        content_type = 'audio/mp4'
    
    try:
        # Create voiceprint using pyannote API
        headers = {
            "Authorization": f"Bearer {PYANNOTE_API_KEY}",
            "Content-Type": "application/json",
        }
        
        # First, we need to upload the audio to get a URL
        # Since pyannote requires a URL, we'll need to use a different approach
        # For now, let's use their media upload endpoint or data URI
        
        data_uri = f"data:{content_type};base64,{audio_base64}"
        
        response = requests.post(
            f"{PYANNOTE_API_URL}/voiceprint",
            headers=headers,
            json={"url": data_uri},
            timeout=60,
        )
        
        if response.status_code != 200:
            logger.error(f"Pyannote voiceprint creation failed: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create voiceprint: {response.text}"
            )
        
        result = response.json()
        job_id = result.get("jobId")
        
        if not job_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to get job ID from pyannote"
            )
        
        # Poll for results
        voiceprint_data = None
        for _ in range(30):  # Poll for up to 30 seconds
            time.sleep(1)
            
            poll_response = requests.get(
                f"{PYANNOTE_API_URL}/jobs/{job_id}",
                headers={"Authorization": f"Bearer {PYANNOTE_API_KEY}"},
                timeout=30,
            )
            
            if poll_response.status_code == 200:
                poll_data = poll_response.json()
                poll_status = poll_data.get("status")
                
                if poll_status == "succeeded":
                    voiceprint_data = poll_data.get("output", {}).get("voiceprint")
                    break
                elif poll_status == "failed":
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Voiceprint creation failed"
                    )
        
        if not voiceprint_data:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Voiceprint creation timed out"
            )
        
        # Store voiceprint in user record
        current_user.voiceprint = voiceprint_data
        current_user.voiceprint_created_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Voiceprint created for user {current_user.id}")
        
        return {
            "status": "success",
            "message": "Voiceprint created successfully",
            "created_at": current_user.voiceprint_created_at.isoformat(),
        }
        
    except requests.RequestException as e:
        logger.error(f"Pyannote API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with voiceprint service: {str(e)}"
        )


@router.get("/status")
async def get_voiceprint_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's voiceprint status."""
    return {
        "has_voiceprint": current_user.voiceprint is not None,
        "created_at": current_user.voiceprint_created_at.isoformat() if current_user.voiceprint_created_at else None,
    }


@router.delete("/delete")
async def delete_voiceprint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the current user's voiceprint."""
    if not current_user.voiceprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No voiceprint found"
        )
    
    current_user.voiceprint = None
    current_user.voiceprint_created_at = None
    db.commit()
    
    return {
        "status": "success",
        "message": "Voiceprint deleted successfully",
    }


@router.get("/team")
async def get_team_voiceprints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get voiceprint status for current user only (data isolation enforced)."""
    # Only return current user's voiceprint status - no team data leak
    return {
        "team": [
            {
                "id": str(current_user.id),
                "name": current_user.full_name,
                "has_voiceprint": current_user.voiceprint is not None,
                "created_at": current_user.voiceprint_created_at.isoformat() if current_user.voiceprint_created_at else None,
            }
        ]
    }
