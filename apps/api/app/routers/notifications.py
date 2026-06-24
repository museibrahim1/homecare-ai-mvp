"""Device push-token registration."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.device_token import DeviceToken

logger = logging.getLogger(__name__)

router = APIRouter()


class DeviceRegisterRequest(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)
    platform: str = Field("ios", pattern="^(ios|android)$")


@router.post("/register-device", status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register (or refresh) a push token for the current user's device."""
    now = datetime.now(timezone.utc)
    existing = db.query(DeviceToken).filter(DeviceToken.token == payload.token).first()
    if existing:
        existing.user_id = current_user.id
        existing.platform = payload.platform
        existing.last_seen_at = now
    else:
        db.add(DeviceToken(
            user_id=current_user.id,
            token=payload.token,
            platform=payload.platform,
            last_seen_at=now,
        ))
    db.commit()
    return {"registered": True}


@router.post("/unregister-device")
async def unregister_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a push token (e.g. on logout or when permission is revoked)."""
    deleted = db.query(DeviceToken).filter(
        DeviceToken.token == payload.token,
        DeviceToken.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"unregistered": bool(deleted)}
