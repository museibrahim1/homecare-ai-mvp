"""
Twilio Call Bridge Service

Handles initiating, managing, and recording phone calls via Twilio.
Uses conference rooms to bridge caregiver and client calls with server-side recording.
"""

import os
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from uuid import UUID

import requests
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.voice_response import VoiceResponse, Dial, Say

logger = logging.getLogger(__name__)

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_WEBHOOK_BASE_URL = os.getenv("TWILIO_WEBHOOK_BASE_URL", "http://localhost:8000")

# Two-party consent states (all parties must consent to recording)
TWO_PARTY_CONSENT_STATES = [
    "CA", "CT", "DE", "FL", "IL", "MD", "MA", "MI", "MT", "NH", 
    "OR", "PA", "WA"
]

# Consent message templates
CONSENT_MESSAGES = {
    "caregiver_one_party": (
        "This call will be recorded for care assessment purposes. "
        "Please wait while we connect you to the client."
    ),
    "caregiver_two_party": (
        "This call will be recorded for care assessment purposes. "
        "By staying on the line, you consent to being recorded. "
        "Please wait while we connect you to the client."
    ),
    "client_one_party": (
        "This call is being recorded for care assessment purposes. "
        "You will now be connected to your care provider."
    ),
    "client_two_party": (
        "This call is being recorded for care assessment purposes. "
        "By staying on the line, you consent to being recorded. "
        "You will now be connected to your care provider."
    ),
}


class TwilioCallService:
    """
    Service for managing Twilio call bridges.
    
    Flow:
    1. App calls initiate_call(caregiver_phone, client_phone, visit_id)
    2. Twilio calls the caregiver first
    3. When caregiver answers, they hear consent message and are placed in conference
    4. Twilio then calls the client
    5. When client answers, they hear consent message and join the conference
    6. Conference is recorded
    7. When call ends, Twilio sends webhook with recording URL
    """
    
    def __init__(self):
        self.enabled = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)
        if self.enabled:
            # Set a 30-second timeout for all Twilio REST API requests
            self.client = Client(
                TWILIO_ACCOUNT_SID,
                TWILIO_AUTH_TOKEN,
                timeout=30,
            )
            logger.info("Twilio call service initialized")
        else:
            self.client = None
            logger.warning("Twilio call service disabled - credentials not configured")
    
    def initiate_call(
        self,
        caregiver_phone: str,
        client_phone: str,
        visit_id: str,
        caregiver_name: str = "Care Provider",
        client_name: str = "Client",
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Initiate a recorded call bridge between caregiver and client.
        
        Args:
            caregiver_phone: Caregiver's phone number (E.164 format: +1XXXXXXXXXX)
            client_phone: Client's phone number (E.164 format)
            visit_id: Visit ID to associate with this call
            caregiver_name: Name to use in announcements
            client_name: Name to use in announcements
        
        Returns:
            Tuple of (success, message, call_sid)
        """
        if not self.enabled:
            return False, "Twilio service not configured", None
        
        # Normalize phone numbers
        caregiver_phone = self._normalize_phone(caregiver_phone)
        client_phone = self._normalize_phone(client_phone)
        
        if not caregiver_phone or not client_phone:
            return False, "Invalid phone number format", None
        
        try:
            # Create a unique conference name based on visit_id
            conference_name = f"assessment_{visit_id}"
            
            # First, call the caregiver
            # When they answer, the TwiML webhook will play consent and add them to conference
            caregiver_call = self.client.calls.create(
                to=caregiver_phone,
                from_=TWILIO_PHONE_NUMBER,
                url=f"{TWILIO_WEBHOOK_BASE_URL}/calls/twiml/caregiver?visit_id={visit_id}&conference={conference_name}&client_phone={client_phone}",
                status_callback=f"{TWILIO_WEBHOOK_BASE_URL}/calls/webhook/status?visit_id={visit_id}&role=caregiver",
                status_callback_event=["initiated", "ringing", "answered", "completed"],
                status_callback_method="POST",
                record=False,  # We record the conference, not individual legs
            )
            
            logger.info(f"Initiated caregiver call: {caregiver_call.sid} for visit {visit_id}")
            
            return True, "Call initiated successfully", caregiver_call.sid
            
        except TwilioRestException as e:
            logger.error(
                f"Twilio API error initiating call for visit {visit_id}: "
                f"status={e.status}, code={e.code}, msg={e.msg}",
                exc_info=True,
            )
            return False, f"Twilio error: {e.msg}", None
        except ConnectionError as e:
            logger.error(f"Network error initiating call for visit {visit_id}: {e}", exc_info=True)
            return False, "Network error connecting to Twilio", None
        except Exception as e:
            logger.exception(f"Unexpected error initiating call for visit {visit_id}: {e}")
            return False, str(e), None
    
    def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """Get the current status of a call."""
        if not self.enabled:
            return {"error": "Twilio service not configured"}
        
        try:
            call = self.client.calls(call_sid).fetch()
            return {
                "sid": call.sid,
                "status": call.status,
                "direction": call.direction,
                "duration": call.duration,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error fetching call {call_sid}: status={e.status}, code={e.code}", exc_info=True)
            return {"error": f"Twilio error: {e.msg}"}
        except Exception as e:
            logger.exception(f"Unexpected error fetching call status for {call_sid}: {e}")
            return {"error": str(e)}
    
    def end_call(self, call_sid: str) -> Tuple[bool, str]:
        """End an active call."""
        if not self.enabled:
            return False, "Twilio service not configured"
        
        try:
            call = self.client.calls(call_sid).update(status="completed")
            logger.info(f"Ended call: {call_sid}")
            return True, "Call ended successfully"
        except TwilioRestException as e:
            logger.error(f"Twilio API error ending call {call_sid}: status={e.status}, code={e.code}", exc_info=True)
            return False, f"Twilio error: {e.msg}"
        except Exception as e:
            logger.exception(f"Unexpected error ending call {call_sid}: {e}")
            return False, str(e)
    
    def get_conference_participants(self, conference_name: str) -> list:
        """Get participants in a conference."""
        if not self.enabled:
            return []
        
        try:
            conferences = self.client.conferences.list(
                friendly_name=conference_name,
                status="in-progress",
                limit=1
            )
            
            if not conferences:
                return []
            
            participants = self.client.conferences(
                conferences[0].sid
            ).participants.list()
            
            return [
                {
                    "call_sid": p.call_sid,
                    "muted": p.muted,
                    "hold": p.hold,
                }
                for p in participants
            ]
        except TwilioRestException as e:
            logger.error(
                f"Twilio API error getting participants for conference {conference_name}: "
                f"status={e.status}, code={e.code}",
                exc_info=True,
            )
            return []
        except Exception as e:
            logger.exception(f"Unexpected error getting conference participants for {conference_name}: {e}")
            return []
    
    def download_recording(self, recording_sid: str) -> Tuple[bool, Optional[bytes], str]:
        """
        Download a recording from Twilio.
        
        Returns:
            Tuple of (success, audio_bytes, error_message)
        """
        if not self.enabled:
            return False, None, "Twilio service not configured"
        
        try:
            recording = self.client.recordings(recording_sid).fetch()
            
            # Get the recording media URL
            media_url = f"https://api.twilio.com{recording.uri.replace('.json', '.wav')}"
            
            # Download using requests with auth
            response = requests.get(
                media_url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=300  # 5 minutes for large recordings
            )
            
            if response.status_code == 200:
                return True, response.content, ""
            else:
                return False, None, f"Failed to download: HTTP {response.status_code}"
                
        except TwilioRestException as e:
            logger.error(
                f"Twilio API error downloading recording {recording_sid}: "
                f"status={e.status}, code={e.code}",
                exc_info=True,
            )
            return False, None, f"Twilio error: {e.msg}"
        except requests.Timeout as e:
            logger.error(f"Timeout downloading recording {recording_sid}: {e}")
            return False, None, "Download timed out"
        except Exception as e:
            logger.exception(f"Unexpected error downloading recording {recording_sid}: {e}")
            return False, None, str(e)
    
    def _normalize_phone(self, phone: str) -> Optional[str]:
        """Normalize phone number to E.164 format."""
        if not phone:
            return None
        
        # Remove all non-digit characters except +
        digits = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        # If it doesn't start with +, assume US number
        if not digits.startswith('+'):
            if len(digits) == 10:
                digits = '+1' + digits
            elif len(digits) == 11 and digits.startswith('1'):
                digits = '+' + digits
        
        # Validate length (E.164 is max 15 digits)
        if len(digits) < 10 or len(digits) > 16:
            return None
        
        return digits
    
    # =========================================================================
    # TwiML Generators - These generate the XML responses for Twilio webhooks
    # =========================================================================
    
    def generate_caregiver_twiml(
        self,
        visit_id: str,
        conference_name: str,
        client_phone: str,
        state: str = None,
    ) -> str:
        """
        Generate TwiML for when caregiver answers.
        Plays consent message (state-specific if two-party consent required),
        then adds to conference.
        """
        response = VoiceResponse()
        
        # Determine consent message based on state
        is_two_party = state and state.upper() in TWO_PARTY_CONSENT_STATES
        consent_key = "caregiver_two_party" if is_two_party else "caregiver_one_party"
        consent_message = CONSENT_MESSAGES[consent_key]
        
        # Play consent message
        response.say(consent_message, voice="Polly.Joanna")
        
        # Add caregiver to conference
        dial = Dial()
        dial.conference(
            conference_name,
            start_conference_on_enter=True,
            end_conference_on_exit=True,
            record="record-from-start",
            recording_status_callback=f"{TWILIO_WEBHOOK_BASE_URL}/calls/webhook/recording?visit_id={visit_id}",
            recording_status_callback_event="completed",
            status_callback=f"{TWILIO_WEBHOOK_BASE_URL}/calls/webhook/conference?visit_id={visit_id}",
            status_callback_event="start end join leave",
            wait_url="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
        )
        response.append(dial)
        
        return str(response)
    
    def generate_client_twiml(
        self,
        visit_id: str,
        conference_name: str,
        state: str = None,
    ) -> str:
        """
        Generate TwiML for when client answers.
        Plays consent message (state-specific if two-party consent required),
        then adds them to the conference.
        """
        response = VoiceResponse()
        
        # Determine consent message based on state
        is_two_party = state and state.upper() in TWO_PARTY_CONSENT_STATES
        consent_key = "client_two_party" if is_two_party else "client_one_party"
        consent_message = CONSENT_MESSAGES[consent_key]
        
        # Play consent message
        response.say(consent_message, voice="Polly.Joanna")
        
        # Add client to conference
        dial = Dial()
        dial.conference(
            conference_name,
            start_conference_on_enter=False,  # Don't start until caregiver is in
            end_conference_on_exit=False,
            beep=True,  # Beep when joining
        )
        response.append(dial)
        
        return str(response)
    
    def initiate_client_call(
        self,
        client_phone: str,
        visit_id: str,
        conference_name: str,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Call the client and add them to an existing conference.
        This is triggered after the caregiver has joined.
        """
        if not self.enabled:
            return False, "Twilio service not configured", None
        
        client_phone = self._normalize_phone(client_phone)
        if not client_phone:
            return False, "Invalid client phone number", None
        
        try:
            client_call = self.client.calls.create(
                to=client_phone,
                from_=TWILIO_PHONE_NUMBER,
                url=f"{TWILIO_WEBHOOK_BASE_URL}/calls/twiml/client?visit_id={visit_id}&conference={conference_name}",
                status_callback=f"{TWILIO_WEBHOOK_BASE_URL}/calls/webhook/status?visit_id={visit_id}&role=client",
                status_callback_event=["initiated", "ringing", "answered", "completed"],
                status_callback_method="POST",
            )
            
            logger.info(f"Initiated client call: {client_call.sid} for visit {visit_id}")
            return True, "Client call initiated", client_call.sid
            
        except TwilioRestException as e:
            logger.error(
                f"Twilio API error calling client for visit {visit_id}: "
                f"status={e.status}, code={e.code}, msg={e.msg}",
                exc_info=True,
            )
            return False, f"Twilio error: {e.msg}", None
        except ConnectionError as e:
            logger.error(f"Network error calling client for visit {visit_id}: {e}", exc_info=True)
            return False, "Network error connecting to Twilio", None
        except Exception as e:
            logger.exception(f"Unexpected error calling client for visit {visit_id}: {e}")
            return False, str(e), None


# Singleton instance
_twilio_service: Optional[TwilioCallService] = None


def get_twilio_service() -> TwilioCallService:
    """Get or create the Twilio call service instance."""
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioCallService()
    return _twilio_service
