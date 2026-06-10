"""
"Send from my business email" router.

Endpoints for connecting a caregiver/agency's own Google Workspace / Gmail
mailbox so service agreements are sent from their address. The OAuth code is
obtained on the client (mobile app) via the Google consent screen and exchanged
here for tokens.
"""
import urllib.parse

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.services import email_sender as sender

router = APIRouter()


class AuthURLResponse(BaseModel):
    auth_url: str


class ConnectRequest(BaseModel):
    code: str
    redirect_uri: str


class SenderStatus(BaseModel):
    connected: bool
    address: str | None = None
    provider: str | None = None


@router.get("/status", response_model=SenderStatus)
async def status(current_user: User = Depends(get_current_user)):
    """Whether the user has connected their own sending mailbox."""
    return SenderStatus(
        connected=bool(current_user.email_sender_connected),
        address=current_user.email_sender_address,
        provider=current_user.email_sender_provider,
    )


@router.get("/auth-url", response_model=AuthURLResponse)
async def auth_url(redirect_uri: str, state: str = "", current_user: User = Depends(get_current_user)):
    """Build the Google consent URL the client opens to grant gmail.send."""
    params = {
        "client_id": settings.google_client_id or "",
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": sender.GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "false",
        "login_hint": current_user.email or "",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return AuthURLResponse(auth_url=url)


@router.post("/connect", response_model=SenderStatus)
async def connect(
    req: ConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange the OAuth code and store the user's sending credentials."""
    await sender.exchange_and_store(current_user, db, req.code, req.redirect_uri)
    return SenderStatus(
        connected=bool(current_user.email_sender_connected),
        address=current_user.email_sender_address,
        provider=current_user.email_sender_provider,
    )


@router.post("/disconnect")
async def disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sender.disconnect(current_user, db)
    return {"success": True}
