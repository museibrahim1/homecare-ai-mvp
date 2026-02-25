"""
MFA (Multi-Factor Authentication) Router

HIPAA Compliance: TOTP-based MFA for admin accounts.
"""

import logging
import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import MFASetupResponse, MFAVerifyRequest, MFAEnableRequest
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/setup", response_model=MFASetupResponse)
async def mfa_setup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a TOTP secret and otpauth URI for the user to scan with an authenticator app."""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled. Disable it first to reconfigure.",
        )

    secret = pyotp.random_base32()
    current_user.mfa_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    otpauth_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="PalmCare AI",
    )

    log_action(
        db=db, user_id=current_user.id, action="mfa_setup_initiated",
        entity_type="user", entity_id=current_user.id,
        description="MFA setup initiated",
    )

    return MFASetupResponse(secret=secret, otpauth_uri=otpauth_uri)


@router.post("/verify")
async def mfa_verify(
    request: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify a TOTP code against the user's secret (before enabling)."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA has not been set up. Call /auth/mfa/setup first.",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code. Please try again.",
        )

    return {"valid": True, "message": "Code verified. Call /auth/mfa/enable to activate MFA."}


@router.post("/enable")
async def mfa_enable(
    request: MFAEnableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm and enable MFA for the current user. Requires a valid TOTP code."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA has not been set up. Call /auth/mfa/setup first.",
        )

    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled.",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code. MFA was not enabled.",
        )

    current_user.mfa_enabled = True
    db.commit()

    log_action(
        db=db, user_id=current_user.id, action="mfa_enabled",
        entity_type="user", entity_id=current_user.id,
        description="MFA successfully enabled",
    )

    return {"success": True, "message": "MFA has been enabled for your account."}


@router.post("/disable")
async def mfa_disable(
    request: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable MFA. Requires a valid TOTP code for confirmation."""
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled.",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code. MFA was not disabled.",
        )

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.commit()

    log_action(
        db=db, user_id=current_user.id, action="mfa_disabled",
        entity_type="user", entity_id=current_user.id,
        description="MFA disabled",
    )

    return {"success": True, "message": "MFA has been disabled."}
