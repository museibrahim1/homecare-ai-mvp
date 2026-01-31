"""
Google Drive Integration Router

Handles OAuth and file operations for Google Drive.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx

from app.core.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    code: str
    redirect_uri: str


class DriveStatus(BaseModel):
    connected: bool


class DriveFile(BaseModel):
    id: str
    name: str
    mimeType: str
    size: Optional[str] = None
    modifiedTime: Optional[str] = None
    webViewLink: Optional[str] = None


class DriveFilesResponse(BaseModel):
    files: List[DriveFile]


@router.get("/status", response_model=DriveStatus)
async def get_drive_status(
    current_user: User = Depends(get_current_user),
):
    """Check if user has Google Drive connected."""
    # Reuse Google Calendar connection for Drive (same OAuth tokens)
    return DriveStatus(connected=current_user.google_calendar_connected)


@router.post("/connect")
async def connect_drive(
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
        
        # Calculate token expiry
        expires_in = tokens.get("expires_in", 3600)
        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Save tokens to user (reuse calendar fields)
        current_user.google_calendar_connected = True
        current_user.google_calendar_access_token = tokens["access_token"]
        current_user.google_calendar_refresh_token = tokens.get("refresh_token") or current_user.google_calendar_refresh_token
        current_user.google_calendar_token_expiry = token_expiry
        
        db.commit()
        
        return {"success": True, "message": "Google Drive connected successfully"}
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network error: {str(e)}",
        )


@router.post("/disconnect")
async def disconnect_drive(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect Google Drive from user account."""
    current_user.google_calendar_connected = False
    current_user.google_calendar_access_token = None
    current_user.google_calendar_refresh_token = None
    current_user.google_calendar_token_expiry = None
    
    db.commit()
    
    return {"success": True, "message": "Google Drive disconnected"}


async def get_valid_access_token(user: User, db: Session) -> str:
    """Get a valid access token, refreshing if necessary."""
    if not user.google_calendar_connected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Drive not connected",
        )
    
    # Check if token is expired or about to expire (5 min buffer)
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
                        detail="Token refresh failed, please reconnect Google Drive",
                    )
                
                tokens = response.json()
                expires_in = tokens.get("expires_in", 3600)
                
                user.google_calendar_access_token = tokens["access_token"]
                user.google_calendar_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                db.commit()
    
    return user.google_calendar_access_token


@router.get("/files", response_model=DriveFilesResponse)
async def list_drive_files(
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List files from user's Google Drive."""
    access_token = await get_valid_access_token(current_user, db)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "pageSize": page_size,
                "fields": "files(id,name,mimeType,size,modifiedTime,webViewLink)",
                "orderBy": "modifiedTime desc",
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch files: {response.text}",
            )
        
        data = response.json()
    
    files = [
        DriveFile(
            id=f["id"],
            name=f["name"],
            mimeType=f["mimeType"],
            size=f.get("size"),
            modifiedTime=f.get("modifiedTime"),
            webViewLink=f.get("webViewLink"),
        )
        for f in data.get("files", [])
    ]
    
    return DriveFilesResponse(files=files)


@router.get("/files/{file_id}")
async def get_drive_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metadata for a specific file."""
    access_token = await get_valid_access_token(current_user, db)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "fields": "id,name,mimeType,size,modifiedTime,webViewLink,parents",
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )
        
        return response.json()
