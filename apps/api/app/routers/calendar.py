"""
Google Calendar Integration Router

Handles OAuth callbacks and calendar sync for users.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx

from app.core.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    code: str
    redirect_uri: str


class GoogleCalendarStatus(BaseModel):
    connected: bool
    token_expiry: Optional[datetime] = None


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str  # ISO format
    end_time: str    # ISO format
    location: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    event_id: str
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = None


@router.get("/status", response_model=GoogleCalendarStatus)
async def get_calendar_status(
    current_user: User = Depends(get_current_user),
):
    """Check if user has Google Calendar connected."""
    return GoogleCalendarStatus(
        connected=current_user.google_calendar_connected,
        token_expiry=current_user.google_calendar_token_expiry,
    )


@router.post("/connect")
async def connect_google_calendar(
    token_request: GoogleTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange OAuth code for tokens and save to user."""
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": token_request.code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": token_request.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code: {response.text}",
                )
            
            tokens = response.json()
        
        # Calculate token expiry
        expires_in = tokens.get("expires_in", 3600)
        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Save tokens to user
        current_user.google_calendar_connected = True
        current_user.google_calendar_access_token = tokens["access_token"]
        current_user.google_calendar_refresh_token = tokens.get("refresh_token")
        current_user.google_calendar_token_expiry = token_expiry
        
        db.commit()
        
        return {"success": True, "message": "Google Calendar connected successfully"}
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network error: {str(e)}",
        )


@router.post("/disconnect")
async def disconnect_google_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect Google Calendar from user account."""
    current_user.google_calendar_connected = False
    current_user.google_calendar_access_token = None
    current_user.google_calendar_refresh_token = None
    current_user.google_calendar_token_expiry = None
    
    db.commit()
    
    return {"success": True, "message": "Google Calendar disconnected"}


async def get_valid_access_token(user: User, db: Session) -> str:
    """Get a valid access token, refreshing if necessary."""
    if not user.google_calendar_connected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Calendar not connected",
        )
    
    # Check if token is expired or about to expire (5 min buffer)
    if user.google_calendar_token_expiry:
        buffer = timedelta(minutes=5)
        if datetime.now(timezone.utc) >= user.google_calendar_token_expiry - buffer:
            # Refresh the token
            if not user.google_calendar_refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired and no refresh token available",
                )
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "refresh_token": user.google_calendar_refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                
                if response.status_code != 200:
                    # Token refresh failed, user needs to reconnect
                    user.google_calendar_connected = False
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token refresh failed, please reconnect Google Calendar",
                    )
                
                tokens = response.json()
                expires_in = tokens.get("expires_in", 3600)
                
                user.google_calendar_access_token = tokens["access_token"]
                user.google_calendar_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                db.commit()
    
    return user.google_calendar_access_token


@router.post("/events")
async def create_calendar_event(
    event: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event in user's Google Calendar."""
    access_token = await get_valid_access_token(current_user, db)
    
    calendar_event = {
        "summary": event.title,
        "description": event.description or "",
        "location": event.location or "",
        "start": {
            "dateTime": event.start_time,
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": event.end_time,
            "timeZone": "UTC",
        },
        "reminders": {
            "useDefault": True,
        },
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            json=calendar_event,
        )
        
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create calendar event: {response.text}",
            )
        
        created_event = response.json()
        
    return {
        "success": True,
        "event_id": created_event["id"],
        "html_link": created_event.get("htmlLink"),
    }


@router.get("/events")
async def get_calendar_events(
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get events from user's Google Calendar."""
    access_token = await get_valid_access_token(current_user, db)
    
    # Default to next 30 days
    if not time_min:
        time_min = datetime.now(timezone.utc).isoformat()
    if not time_max:
        time_max = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch calendar events: {response.text}",
            )
        
        data = response.json()
        
    return {"events": data.get("items", [])}


@router.put("/events")
async def update_calendar_event(
    event: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an event in user's Google Calendar."""
    access_token = await get_valid_access_token(current_user, db)
    
    calendar_event = {
        "summary": event.title,
        "description": event.description or "",
        "location": event.location or "",
        "start": {
            "dateTime": event.start_time,
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": event.end_time,
            "timeZone": "UTC",
        },
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event.event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            json=calendar_event,
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update calendar event: {response.text}",
            )
        
        updated_event = response.json()
        
    return {"success": True, "event": updated_event}


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an event from user's Google Calendar."""
    access_token = await get_valid_access_token(current_user, db)
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete calendar event: {response.text}",
            )
        
    return {"success": True}
