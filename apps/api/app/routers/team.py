"""
Team Management Router

Allows the CEO to create and manage admin team members with
granular permissions for command center, sales, investors,
marketing, and analytics workspaces.
"""

import logging
import secrets
import string
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_ceo_only
from app.core.security import get_password_hash
from app.models.user import User
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_PERMISSIONS = [
    "command_center",
    "sales_leads",
    "investors",
    "marketing",
    "analytics",
    "admin_full",
]


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ── Schemas ──────────────────────────────────────────────────

class InviteRequest(BaseModel):
    full_name: str
    email: EmailStr
    permissions: List[str]
    phone: Optional[str] = None


class UpdatePermissionsRequest(BaseModel):
    permissions: List[str]


class TeamMemberResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    permissions: list
    is_active: bool
    phone: Optional[str] = None
    temp_password: bool = False
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────

@router.get("/team", response_model=List[TeamMemberResponse])
def list_team_members(
    db: Session = Depends(get_db),
    ceo: User = Depends(require_ceo_only),
):
    """List all admin team members (excluding the CEO themselves)."""
    members = (
        db.query(User)
        .filter(
            User.invited_by.isnot(None),
        )
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        TeamMemberResponse(
            id=str(m.id),
            full_name=m.full_name,
            email=m.email,
            role=m.role,
            permissions=m.permissions or [],
            is_active=m.is_active,
            phone=m.phone,
            temp_password=m.temp_password,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in members
    ]


@router.post("/team/invite", response_model=TeamMemberResponse)
def invite_team_member(
    body: InviteRequest,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_ceo_only),
):
    """Create a new admin team member account and email them credentials."""
    for perm in body.permissions:
        if perm not in VALID_PERMISSIONS:
            raise HTTPException(400, f"Invalid permission: {perm}")

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(409, "A user with this email already exists")

    temp_pw = _generate_temp_password()

    member = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(temp_pw),
        role="admin_team",
        is_active=True,
        phone=body.phone,
        permissions=body.permissions,
        invited_by=str(ceo.id),
        temp_password=True,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    _send_invite_email(member, temp_pw)

    logger.info(f"Team member invited: {body.email} by {ceo.email}")

    return TeamMemberResponse(
        id=str(member.id),
        full_name=member.full_name,
        email=member.email,
        role=member.role,
        permissions=member.permissions or [],
        is_active=member.is_active,
        phone=member.phone,
        temp_password=member.temp_password,
        created_at=member.created_at.isoformat() if member.created_at else None,
    )


@router.put("/team/{user_id}/permissions", response_model=TeamMemberResponse)
def update_team_permissions(
    user_id: str,
    body: UpdatePermissionsRequest,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_ceo_only),
):
    """Update a team member's permissions."""
    for perm in body.permissions:
        if perm not in VALID_PERMISSIONS:
            raise HTTPException(400, f"Invalid permission: {perm}")

    member = db.query(User).filter(User.id == user_id, User.invited_by.isnot(None)).first()
    if not member:
        raise HTTPException(404, "Team member not found")

    member.permissions = body.permissions
    db.commit()
    db.refresh(member)

    logger.info(f"Permissions updated for {member.email}: {body.permissions}")

    return TeamMemberResponse(
        id=str(member.id),
        full_name=member.full_name,
        email=member.email,
        role=member.role,
        permissions=member.permissions or [],
        is_active=member.is_active,
        phone=member.phone,
        temp_password=member.temp_password,
        created_at=member.created_at.isoformat() if member.created_at else None,
    )


@router.delete("/team/{user_id}")
def deactivate_team_member(
    user_id: str,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_ceo_only),
):
    """Deactivate a team member account."""
    member = db.query(User).filter(User.id == user_id, User.invited_by.isnot(None)).first()
    if not member:
        raise HTTPException(404, "Team member not found")

    member.is_active = not member.is_active
    db.commit()

    status = "activated" if member.is_active else "deactivated"
    logger.info(f"Team member {status}: {member.email}")
    return {"ok": True, "status": status}


@router.post("/team/{user_id}/reset-password")
def reset_team_password(
    user_id: str,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_ceo_only),
):
    """Reset a team member's password and email them a new one."""
    member = db.query(User).filter(User.id == user_id, User.invited_by.isnot(None)).first()
    if not member:
        raise HTTPException(404, "Team member not found")

    temp_pw = _generate_temp_password()
    member.hashed_password = get_password_hash(temp_pw)
    member.temp_password = True
    db.commit()

    _send_invite_email(member, temp_pw, is_reset=True)

    logger.info(f"Password reset for team member: {member.email}")
    return {"ok": True}


# ── Helpers ──────────────────────────────────────────────────

def _send_invite_email(member: User, password: str, is_reset: bool = False):
    email_svc = get_email_service()
    action = "Password Reset" if is_reset else "Team Invitation"
    subject = f"{'Your password has been reset' if is_reset else 'You\'ve been invited to PalmCare AI'}"

    perms_labels = {
        "command_center": "Command Center",
        "sales_leads": "Sales & Leads",
        "investors": "Investors",
        "marketing": "Marketing",
        "analytics": "Analytics",
        "admin_full": "Full Admin Access",
    }
    perms_html = ", ".join(perms_labels.get(p, p) for p in (member.permissions or []))

    html = f"""
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f6f6f6; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto;">
            <div style="text-align: center; padding-bottom: 30px;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #0d9488;">PalmCare AI</h1>
            </div>
            <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <p style="font-size: 15px; color: #333; line-height: 1.5;">Hi {member.full_name},</p>
                <p style="font-size: 15px; color: #333; line-height: 1.5;">
                    {'Your PalmCare AI password has been reset by the administrator.' if is_reset else 'You have been invited to the PalmCare AI admin team.'}
                    Use the credentials below to sign in:
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0; width: 120px;">Email</td>
                        <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{member.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Password</td>
                        <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0; font-family: monospace;">{password}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #747487;">Access</td>
                        <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600;">{perms_html or 'None assigned'}</td>
                    </tr>
                </table>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="https://palmcareai.com/login" style="background-color: #0d9488; color: #fff; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Sign In</a>
                </div>
                <p style="font-size: 13px; color: #999; line-height: 1.5;">You will be prompted to change your password on first sign-in.</p>
            </div>
            <div style="text-align: center; padding-top: 24px;">
                <p style="margin: 0; font-size: 12px; color: #aaa;">&copy; 2026 Palm Technologies, INC.</p>
            </div>
        </div>
    </div>
    """

    email_svc.send_email(
        to=member.email,
        subject=subject,
        html=html,
        sender="PalmCare AI <sales@send.palmtai.com>",
    )
