"""
Process Call Recording Task

Downloads a Twilio call recording and submits it through the audio processing pipeline.
"""

import os
import uuid
import logging
from datetime import datetime, timezone

import requests
from celery import shared_task
from sqlalchemy.orm import Session

from db import SessionLocal
from models import AudioAsset, Visit, Call, CallStatus
from storage import upload_audio_file
from config import settings

logger = logging.getLogger(__name__)

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")


@shared_task(name="tasks.process_call_recording.process_call_recording")
def process_call_recording(call_id: str):
    """
    Process a completed Twilio call recording.
    
    1. Download recording from Twilio
    2. Upload to MinIO storage
    3. Create AudioAsset record
    4. Trigger the full audio processing pipeline
    
    Args:
        call_id: The Call record UUID
    """
    db: Session = SessionLocal()
    
    try:
        # Get the call record
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            logger.error(f"Call not found: {call_id}")
            return {"success": False, "error": "Call not found"}
        
        if not call.recording_sid or not call.recording_url:
            logger.error(f"No recording available for call: {call_id}")
            return {"success": False, "error": "No recording available"}
        
        logger.info(f"Processing recording for call {call_id}, recording_sid={call.recording_sid}")
        
        # Download recording from Twilio
        # Twilio recordings are in WAV format by default
        recording_url = f"{call.recording_url}.wav"
        
        logger.info(f"Downloading recording from: {recording_url}")
        
        response = requests.get(
            recording_url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            timeout=300,  # 5 minutes timeout for large files
        )
        
        if response.status_code != 200:
            error_msg = f"Failed to download recording: HTTP {response.status_code}"
            logger.error(error_msg)
            call.error_message = error_msg
            db.commit()
            return {"success": False, "error": error_msg}
        
        audio_data = response.content
        logger.info(f"Downloaded {len(audio_data)} bytes")
        
        # Generate filename
        filename = f"call_{call_id}_{call.recording_sid}.wav"
        
        # Upload to MinIO
        file_path = upload_audio_file(
            audio_data,
            filename,
            content_type="audio/wav",
        )
        
        if not file_path:
            error_msg = "Failed to upload recording to storage"
            logger.error(error_msg)
            call.error_message = error_msg
            db.commit()
            return {"success": False, "error": error_msg}
        
        logger.info(f"Uploaded recording to: {file_path}")
        
        # Create or get visit
        visit_id = call.visit_id
        if not visit_id:
            # Create a new visit for this call
            visit = Visit(
                client_id=call.client_id,
                caregiver_id=call.user_id,
                status="pending_review",
                scheduled_start=call.started_at,
                actual_start=call.started_at,
                actual_end=call.ended_at,
                pipeline_state={
                    "source": "call_recording",
                    "call_id": str(call_id),
                },
            )
            db.add(visit)
            db.flush()
            visit_id = visit.id
            call.visit_id = visit_id
            logger.info(f"Created new visit: {visit_id}")
        
        # Create audio asset
        audio_asset = AudioAsset(
            visit_id=visit_id,
            file_path=file_path,
            original_filename=filename,
            file_size_bytes=len(audio_data),
            duration_ms=call.recording_duration_seconds * 1000 if call.recording_duration_seconds else None,
            mime_type="audio/wav",
            source="twilio_call",
            asset_metadata={
                "call_id": str(call_id),
                "recording_sid": call.recording_sid,
                "caregiver_phone": call.caregiver_phone,
                "client_phone": call.client_phone,
            },
        )
        db.add(audio_asset)
        db.flush()
        
        # Update call record
        call.recording_downloaded = True
        call.recording_file_path = file_path
        call.audio_asset_id = audio_asset.id
        
        db.commit()
        
        logger.info(f"Created audio asset: {audio_asset.id}")
        
        # Trigger the full pipeline
        from tasks.transcribe import transcribe_visit
        from tasks.diarize import diarize_visit
        from tasks.align import align_visit
        from tasks.bill import generate_billables
        from tasks.generate_contract import generate_service_contract
        
        # Run pipeline steps
        logger.info(f"Starting pipeline for visit {visit_id}")
        
        try:
            # Transcribe
            logger.info("Running transcription...")
            transcribe_visit(visit_id=str(visit_id))
            
            # Diarize
            logger.info("Running diarization...")
            diarize_visit(visit_id=str(visit_id))
            
            # Align
            logger.info("Running alignment...")
            align_visit(visit_id=str(visit_id))
            
            # Generate billables
            logger.info("Generating billables...")
            generate_billables(visit_id=str(visit_id))
            
            # Generate contract
            logger.info("Generating contract...")
            generate_service_contract(visit_id=str(visit_id))
            
            # Update call as processed
            call.pipeline_submitted = True
            db.commit()
            
            logger.info(f"Pipeline completed for call {call_id}")
            
            return {
                "success": True,
                "call_id": str(call_id),
                "visit_id": str(visit_id),
                "audio_asset_id": str(audio_asset.id),
            }
            
        except Exception as e:
            logger.error(f"Pipeline error: {e}")
            call.error_message = f"Pipeline error: {str(e)}"
            db.commit()
            return {"success": False, "error": str(e)}
        
    except Exception as e:
        logger.exception(f"Error processing call recording: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()
