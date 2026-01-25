"""
Calls Router

API endpoints for managing Twilio call bridges and processing recordings.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Form, Request, Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.call import Call, CallStatus
from app.models.visit import Visit
from app.models.client import Client
from app.schemas.call import (
    CallInitiateRequest, CallInitiateResponse,
    CallResponse, CallStatusResponse, CallEndRequest, CallEndResponse,
    CallListResponse, CallStatusEnum,
)
from app.services.twilio_calls import get_twilio_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Call Management Endpoints
# =============================================================================

@router.post("/initiate", response_model=CallInitiateResponse)
async def initiate_call(
    request: CallInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initiate a recorded call bridge between caregiver and client.
    
    This creates a Twilio conference call:
    1. Calls the caregiver first
    2. Plays consent message when they answer
    3. Calls the client
    4. Plays consent message when they answer
    5. Records the entire conference
    """
    twilio = get_twilio_service()
    
    # Validate visit exists if provided
    if request.visit_id:
        visit = db.query(Visit).filter(Visit.id == request.visit_id).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
    
    # Validate client exists if provided
    client = None
    if request.client_id:
        client = db.query(Client).filter(Client.id == request.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    
    # Create call record
    call = Call(
        visit_id=request.visit_id,
        client_id=request.client_id,
        user_id=current_user.id,
        caregiver_phone=request.caregiver_phone,
        client_phone=request.client_phone,
        status=CallStatus.INITIATED,
    )
    db.add(call)
    db.flush()
    
    # Initiate call via Twilio
    success, message, call_sid = twilio.initiate_call(
        caregiver_phone=request.caregiver_phone,
        client_phone=request.client_phone,
        visit_id=str(call.id),
        caregiver_name=request.caregiver_name or "Care Provider",
        client_name=request.client_name or "Client",
    )
    
    if success:
        call.caregiver_call_sid = call_sid
        call.status = CallStatus.CAREGIVER_RINGING
        db.commit()
        
        return CallInitiateResponse(
            success=True,
            message="Call initiated successfully. Calling caregiver...",
            call_id=call.id,
            call_sid=call_sid,
        )
    else:
        call.status = CallStatus.FAILED
        call.error_message = message
        db.commit()
        
        raise HTTPException(status_code=500, detail=message)


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific call."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    return CallResponse(
        id=call.id,
        status=CallStatusEnum(call.status.value),
        caregiver_phone=call.caregiver_phone,
        client_phone=call.client_phone,
        visit_id=call.visit_id,
        client_id=call.client_id,
        started_at=call.started_at,
        ended_at=call.ended_at,
        duration_seconds=call.duration_seconds,
        has_recording=call.has_recording,
        recording_duration_seconds=call.recording_duration_seconds,
        caregiver_consent_at=call.caregiver_consent_at,
        client_consent_at=call.client_consent_at,
        pipeline_submitted=call.pipeline_submitted,
        audio_asset_id=call.audio_asset_id,
        created_at=call.created_at,
    )


@router.get("/{call_id}/status", response_model=CallStatusResponse)
async def get_call_status(
    call_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current status of a call (for polling)."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Calculate duration if call is in progress
    duration = call.duration_seconds
    if call.started_at and call.is_active:
        duration = int((datetime.now(timezone.utc) - call.started_at).total_seconds())
    
    return CallStatusResponse(
        call_id=call.id,
        status=CallStatusEnum(call.status.value),
        caregiver_connected=call.status in [
            CallStatus.CAREGIVER_CONNECTED,
            CallStatus.CLIENT_RINGING,
            CallStatus.IN_PROGRESS,
            CallStatus.COMPLETED,
        ],
        client_connected=call.status in [
            CallStatus.IN_PROGRESS,
            CallStatus.COMPLETED,
        ],
        duration_seconds=duration,
        recording_available=call.has_recording,
        error_message=call.error_message,
    )


@router.post("/{call_id}/end", response_model=CallEndResponse)
async def end_call(
    call_id: UUID,
    request: CallEndRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """End an active call."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if not call.is_active:
        raise HTTPException(status_code=400, detail="Call is not active")
    
    twilio = get_twilio_service()
    
    # End both legs if they exist
    if call.caregiver_call_sid:
        twilio.end_call(call.caregiver_call_sid)
    if call.client_call_sid:
        twilio.end_call(call.client_call_sid)
    
    # Update call status
    call.status = CallStatus.COMPLETED
    call.ended_at = datetime.now(timezone.utc)
    if call.started_at:
        call.duration_seconds = int((call.ended_at - call.started_at).total_seconds())
    
    db.commit()
    
    return CallEndResponse(
        success=True,
        message="Call ended successfully",
        call_id=call.id,
        final_status=CallStatusEnum(call.status.value),
        duration_seconds=call.duration_seconds,
    )


@router.get("/", response_model=CallListResponse)
async def list_calls(
    visit_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List calls with optional filtering."""
    query = db.query(Call)
    
    if visit_id:
        query = query.filter(Call.visit_id == visit_id)
    if client_id:
        query = query.filter(Call.client_id == client_id)
    if status:
        try:
            status_enum = CallStatus(status)
            query = query.filter(Call.status == status_enum)
        except ValueError:
            pass
    
    total = query.count()
    calls = query.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()
    
    return CallListResponse(
        calls=[
            CallResponse(
                id=c.id,
                status=CallStatusEnum(c.status.value),
                caregiver_phone=c.caregiver_phone,
                client_phone=c.client_phone,
                visit_id=c.visit_id,
                client_id=c.client_id,
                started_at=c.started_at,
                ended_at=c.ended_at,
                duration_seconds=c.duration_seconds,
                has_recording=c.has_recording,
                recording_duration_seconds=c.recording_duration_seconds,
                caregiver_consent_at=c.caregiver_consent_at,
                client_consent_at=c.client_consent_at,
                pipeline_submitted=c.pipeline_submitted,
                audio_asset_id=c.audio_asset_id,
                created_at=c.created_at,
            )
            for c in calls
        ],
        total=total,
    )


# =============================================================================
# Twilio TwiML Endpoints (return XML for Twilio)
# =============================================================================

@router.post("/twiml/caregiver")
async def twiml_caregiver(
    request: Request,
    visit_id: str = Query(...),
    conference: str = Query(...),
    client_phone: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    TwiML endpoint for when caregiver answers.
    Plays consent message and adds to conference.
    """
    twilio = get_twilio_service()
    twiml = twilio.generate_caregiver_twiml(visit_id, conference, client_phone)
    
    # Update call status - caregiver connected
    call = db.query(Call).filter(Call.id == visit_id).first()
    if call:
        call.status = CallStatus.CAREGIVER_CONNECTED
        call.caregiver_consent_at = datetime.now(timezone.utc)
        call.consent_message_played = True
        db.commit()
    
    return Response(content=twiml, media_type="application/xml")


@router.post("/twiml/client")
async def twiml_client(
    request: Request,
    visit_id: str = Query(...),
    conference: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    TwiML endpoint for when client answers.
    Plays consent message and adds to conference.
    """
    twilio = get_twilio_service()
    twiml = twilio.generate_client_twiml(visit_id, conference)
    
    # Update call status - client consent given
    call = db.query(Call).filter(Call.id == visit_id).first()
    if call:
        call.client_consent_at = datetime.now(timezone.utc)
        db.commit()
    
    return Response(content=twiml, media_type="application/xml")


# =============================================================================
# Twilio Webhook Endpoints
# =============================================================================

@router.post("/webhook/status")
async def webhook_status(
    request: Request,
    visit_id: str = Query(...),
    role: str = Query(...),  # "caregiver" or "client"
    db: Session = Depends(get_db),
):
    """
    Webhook for call status updates from Twilio.
    """
    form_data = await request.form()
    call_status = form_data.get("CallStatus")
    call_sid = form_data.get("CallSid")
    call_duration = form_data.get("CallDuration")
    
    logger.info(f"Call status webhook: visit={visit_id}, role={role}, status={call_status}")
    
    call = db.query(Call).filter(Call.id == visit_id).first()
    if not call:
        logger.error(f"Call not found for visit_id: {visit_id}")
        return {"status": "ok"}
    
    # Update call based on status
    if call_status == "ringing":
        if role == "caregiver":
            call.status = CallStatus.CAREGIVER_RINGING
        else:
            call.status = CallStatus.CLIENT_RINGING
            
    elif call_status == "in-progress" or call_status == "answered":
        if role == "caregiver":
            call.status = CallStatus.CAREGIVER_CONNECTED
            # Now call the client
            twilio = get_twilio_service()
            success, msg, client_sid = twilio.initiate_client_call(
                call.client_phone,
                str(call.id),
                f"assessment_{call.id}"
            )
            if success:
                call.client_call_sid = client_sid
                call.status = CallStatus.CLIENT_RINGING
        else:
            # Client connected - both parties now in conference
            call.status = CallStatus.IN_PROGRESS
            call.started_at = datetime.now(timezone.utc)
            
    elif call_status == "completed":
        if call.status != CallStatus.COMPLETED:
            call.status = CallStatus.COMPLETED
            call.ended_at = datetime.now(timezone.utc)
            if call_duration:
                call.duration_seconds = int(call_duration)
                
    elif call_status == "busy":
        call.status = CallStatus.BUSY
        call.error_message = f"{role.capitalize()} line was busy"
        
    elif call_status == "no-answer":
        call.status = CallStatus.NO_ANSWER
        call.error_message = f"{role.capitalize()} did not answer"
        
    elif call_status == "failed":
        call.status = CallStatus.FAILED
        call.error_message = f"Call to {role} failed"
    
    # Store metadata
    call.call_metadata = call.call_metadata or {}
    call.call_metadata[f"{role}_last_status"] = call_status
    call.call_metadata[f"{role}_call_sid"] = call_sid
    
    db.commit()
    
    return {"status": "ok"}


@router.post("/webhook/recording")
async def webhook_recording(
    request: Request,
    visit_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Webhook for recording completion from Twilio.
    Downloads the recording and submits to the audio processing pipeline.
    """
    form_data = await request.form()
    recording_sid = form_data.get("RecordingSid")
    recording_url = form_data.get("RecordingUrl")
    recording_status = form_data.get("RecordingStatus")
    recording_duration = form_data.get("RecordingDuration")
    
    logger.info(f"Recording webhook: visit={visit_id}, sid={recording_sid}, status={recording_status}")
    
    call = db.query(Call).filter(Call.id == visit_id).first()
    if not call:
        logger.error(f"Call not found for visit_id: {visit_id}")
        return {"status": "ok"}
    
    if recording_status == "completed":
        call.recording_sid = recording_sid
        call.recording_url = recording_url
        if recording_duration:
            call.recording_duration_seconds = int(recording_duration)
        
        # Trigger async task to download and process recording
        # Import here to avoid circular imports
        from app.services.jobs import submit_call_recording_for_processing
        submit_call_recording_for_processing(str(call.id))
        
        db.commit()
        logger.info(f"Recording saved for call {call.id}, submitted for processing")
    
    return {"status": "ok"}


@router.post("/webhook/conference")
async def webhook_conference(
    request: Request,
    visit_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Webhook for conference events from Twilio.
    """
    form_data = await request.form()
    event = form_data.get("StatusCallbackEvent")
    conference_sid = form_data.get("ConferenceSid")
    call_sid = form_data.get("CallSid")
    
    logger.info(f"Conference webhook: visit={visit_id}, event={event}, conf={conference_sid}")
    
    call = db.query(Call).filter(Call.id == visit_id).first()
    if not call:
        return {"status": "ok"}
    
    if event == "conference-start":
        call.conference_sid = conference_sid
    elif event == "participant-join":
        # Check if both parties are now in
        twilio = get_twilio_service()
        participants = twilio.get_conference_participants(f"assessment_{visit_id}")
        if len(participants) >= 2:
            call.status = CallStatus.IN_PROGRESS
            if not call.started_at:
                call.started_at = datetime.now(timezone.utc)
    elif event == "conference-end":
        if call.status != CallStatus.COMPLETED:
            call.status = CallStatus.COMPLETED
            call.ended_at = datetime.now(timezone.utc)
            if call.started_at:
                call.duration_seconds = int(
                    (call.ended_at - call.started_at).total_seconds()
                )
    
    db.commit()
    return {"status": "ok"}
