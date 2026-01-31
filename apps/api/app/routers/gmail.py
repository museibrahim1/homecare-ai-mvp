"""
Gmail Integration Router

Handles OAuth and email operations for Gmail.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx
import base64
from email.mime.text import MIMEText

from app.core.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    code: str
    redirect_uri: str


class GmailStatus(BaseModel):
    connected: bool


class EmailMessage(BaseModel):
    id: str
    from_name: str = ""
    from_email: str = ""
    subject: str = ""
    snippet: str = ""
    date: str = ""
    unread: bool = False
    starred: bool = False
    hasAttachment: bool = False


class EmailListResponse(BaseModel):
    messages: List[EmailMessage]


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.get("/status", response_model=GmailStatus)
async def get_gmail_status(
    current_user: User = Depends(get_current_user),
):
    """Check if user has Gmail connected."""
    return GmailStatus(connected=current_user.google_calendar_connected)


@router.post("/connect")
async def connect_gmail(
    token_request: GoogleTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange OAuth code for tokens and save to user."""
    try:
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
        
        expires_in = tokens.get("expires_in", 3600)
        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        current_user.google_calendar_connected = True
        current_user.google_calendar_access_token = tokens["access_token"]
        current_user.google_calendar_refresh_token = tokens.get("refresh_token") or current_user.google_calendar_refresh_token
        current_user.google_calendar_token_expiry = token_expiry
        
        db.commit()
        
        return {"success": True, "message": "Gmail connected successfully"}
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network error: {str(e)}",
        )


@router.post("/disconnect")
async def disconnect_gmail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect Gmail from user account."""
    current_user.google_calendar_connected = False
    current_user.google_calendar_access_token = None
    current_user.google_calendar_refresh_token = None
    current_user.google_calendar_token_expiry = None
    
    db.commit()
    
    return {"success": True, "message": "Gmail disconnected"}


async def get_valid_access_token(user: User, db: Session) -> str:
    """Get a valid access token, refreshing if necessary."""
    if not user.google_calendar_connected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gmail not connected",
        )
    
    if user.google_calendar_token_expiry:
        buffer = timedelta(minutes=5)
        if datetime.now(timezone.utc) >= user.google_calendar_token_expiry - buffer:
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
                    user.google_calendar_connected = False
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token refresh failed, please reconnect Gmail",
                    )
                
                tokens = response.json()
                expires_in = tokens.get("expires_in", 3600)
                
                user.google_calendar_access_token = tokens["access_token"]
                user.google_calendar_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                db.commit()
    
    return user.google_calendar_access_token


def parse_email_headers(headers: list) -> dict:
    """Parse email headers into a dict."""
    result = {}
    for header in headers:
        name = header.get("name", "").lower()
        value = header.get("value", "")
        if name in ["from", "subject", "date"]:
            result[name] = value
    return result


def parse_from_field(from_str: str) -> tuple:
    """Parse 'Name <email>' format."""
    if "<" in from_str and ">" in from_str:
        parts = from_str.split("<")
        name = parts[0].strip().strip('"')
        email = parts[1].replace(">", "").strip()
        return name, email
    return from_str, from_str


@router.get("/messages", response_model=EmailListResponse)
async def list_messages(
    max_results: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List emails from user's Gmail inbox."""
    access_token = await get_valid_access_token(current_user, db)
    
    messages = []
    
    async with httpx.AsyncClient() as client:
        # Get message list
        list_response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "maxResults": max_results,
                "labelIds": "INBOX",
            },
        )
        
        if list_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch messages: {list_response.text}",
            )
        
        message_list = list_response.json().get("messages", [])
        
        # Get details for each message
        for msg in message_list[:max_results]:
            msg_response = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            )
            
            if msg_response.status_code == 200:
                msg_data = msg_response.json()
                headers = parse_email_headers(msg_data.get("payload", {}).get("headers", []))
                labels = msg_data.get("labelIds", [])
                
                from_name, from_email = parse_from_field(headers.get("from", ""))
                
                # Format date
                date_str = headers.get("date", "")
                try:
                    # Try to parse and format date
                    if date_str:
                        # Simple date formatting
                        if "," in date_str:
                            date_str = date_str.split(",")[1].strip()[:12]
                except:
                    pass
                
                messages.append(EmailMessage(
                    id=msg["id"],
                    from_name=from_name,
                    from_email=from_email,
                    subject=headers.get("subject", "(No Subject)"),
                    snippet=msg_data.get("snippet", ""),
                    date=date_str,
                    unread="UNREAD" in labels,
                    starred="STARRED" in labels,
                    hasAttachment=any("filename" in str(msg_data.get("payload", {})).lower()),
                ))
    
    return EmailListResponse(messages=messages)


@router.post("/send")
async def send_email(
    email_data: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send an email via Gmail."""
    access_token = await get_valid_access_token(current_user, db)
    
    # Create email message
    message = MIMEText(email_data.body)
    message["to"] = email_data.to
    message["subject"] = email_data.subject
    
    # Encode message
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"raw": raw_message},
        )
        
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email: {response.text}",
            )
        
        return {"success": True, "message": "Email sent successfully"}


@router.get("/messages/{message_id}")
async def get_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific email message."""
    access_token = await get_valid_access_token(current_user, db)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"format": "full"},
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )
        
        return response.json()
