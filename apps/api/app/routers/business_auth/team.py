import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.core.rate_limit import limiter
from sqlalchemy.orm import Session
from jose import jwt

from app.core.deps import get_db, get_current_user as get_current_api_user
from app.core.config import settings
from app.models.business import (
    Business, BusinessDocument, BusinessUser,
    VerificationStatus, EntityType, DocumentType, UserRole
)
from app.models.user import User  # For creating linked user account
from app.schemas.business import (
    BusinessRegistrationStep1, SOSVerificationRequest, SOSVerificationResponse,
    DocumentUploadRequest, DocumentResponse, BusinessRegistrationResponse,
    BusinessProfile, BusinessProfileUpdate, BusinessStatusResponse,
    BusinessUserCreate, BusinessUserUpdate, BusinessUserResponse, BusinessUserInviteResponse,
    BusinessLoginRequest, BusinessLoginResponse, PasswordResetRequest, PasswordResetConfirm,
    MagicLinkRequest, MagicLinkConfirm,
    VerificationStatusEnum, EntityTypeEnum, DocumentTypeEnum, UserRoleEnum
)
from app.services.sos_verification import get_sos_service
from app.services.document_storage import get_document_service
from app.services.email import get_email_service
from app.core.security import (
    check_account_lockout, record_failed_login, clear_login_attempts,
    get_password_hash, verify_password as _verify_password,
)

from .common import (
    REQUIRED_DOCUMENTS, hash_password, verify_password,
    create_access_token, get_current_business_user,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# AUTHENTICATED - Team Management
# =============================================================================

from app.models.subscription import Subscription, Plan

def get_team_limits(db: Session, company_name: str):
    """Get team limits based on subscription plan."""
    # Find business by company name
    business = db.query(Business).filter(Business.name == company_name).first()
    
    # Default limits for free tier
    default_limits = {
        "max_users": 1,
        "plan_name": "Free",
        "plan_tier": "free",
        "monthly_price": 0,
        "upgrade_options": []
    }
    
    if not business:
        return default_limits
    
    # Get subscription and plan
    subscription = db.query(Subscription).filter(
        Subscription.business_id == business.id
    ).first()
    
    if not subscription:
        return default_limits
    
    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        return default_limits
    
    # Get upgrade options (higher tier plans)
    tier_order = {"free": 0, "starter": 1, "professional": 2, "enterprise": 3}
    current_tier_level = tier_order.get(plan.tier.value if hasattr(plan.tier, 'value') else plan.tier, 0)
    
    upgrade_plans = db.query(Plan).filter(
        Plan.is_active == True
    ).all()
    
    upgrade_options = []
    for up in upgrade_plans:
        up_tier = up.tier.value if hasattr(up.tier, 'value') else up.tier
        up_level = tier_order.get(up_tier, 0)
        if up_level > current_tier_level:
            upgrade_options.append({
                "name": up.name,
                "tier": up_tier,
                "max_users": up.max_users,
                "monthly_price": float(up.monthly_price) if up.monthly_price else 0,
                "additional_users": up.max_users - plan.max_users,
            })
    
    # Sort by tier level
    upgrade_options.sort(key=lambda x: tier_order.get(x["tier"], 0))
    
    return {
        "max_users": plan.max_users,
        "plan_name": plan.name,
        "plan_tier": plan.tier.value if hasattr(plan.tier, 'value') else plan.tier,
        "monthly_price": float(plan.monthly_price) if plan.monthly_price else 0,
        "upgrade_options": upgrade_options
    }

@router.get("/team/limits")
async def get_team_plan_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Get team size limits based on current subscription plan."""
    # Get team limits
    limits = get_team_limits(db, current_user.company_name)
    
    # Count current team members
    current_count = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).count()
    
    return {
        "current_users": current_count,
        "max_users": limits["max_users"],
        "plan_name": limits["plan_name"],
        "plan_tier": limits["plan_tier"],
        "can_invite": current_count < limits["max_users"],
        "remaining_seats": max(0, limits["max_users"] - current_count),
        "upgrade_options": limits["upgrade_options"]
    }

@router.get("/team")
async def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """List all team members (users in the same company)."""
    # Get all users with the same company name
    team_members = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).all()
    
    # Get plan limits for context
    limits = get_team_limits(db, current_user.company_name)
    
    return {
        "members": [{
            "id": str(member.id),
            "email": member.email,
            "full_name": member.full_name,
            "role": member.role,
            "phone": member.phone,
            "is_active": member.is_active,
            "voiceprint_created": member.voiceprint is not None,
            "created_at": member.created_at.isoformat() if member.created_at else None,
        } for member in team_members],
        "limits": {
            "current_users": len(team_members),
            "max_users": limits["max_users"],
            "plan_name": limits["plan_name"],
            "can_invite": len(team_members) < limits["max_users"],
        }
    }


# Roles a business can assign to its own team. Platform-level roles
# ("admin", "admin_team") must never be reachable from tenant-facing APIs —
# get_current_admin_user only checks role == "admin", so allowing it here
# would be a self-service privilege escalation to platform admin.
ASSIGNABLE_TEAM_ROLES = {"caregiver", "user"}
TEAM_MANAGER_ROLES = {"user", "admin"}


def _require_team_manager(current_user: User):
    """Only business owners/managers (and platform admins) manage the team."""
    if current_user.role not in TEAM_MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only account owners can manage team members")
    if not current_user.company_name:
        raise HTTPException(status_code=403, detail="No business is associated with this account")


@router.post("/team/invite")
async def invite_team_member(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
    email: str = None,
    full_name: str = None,
    role: str = "caregiver",
):
    """Invite a new team member."""
    if not email or not full_name:
        raise HTTPException(status_code=400, detail="Email and full_name are required")

    _require_team_manager(current_user)
    if role not in ASSIGNABLE_TEAM_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(sorted(ASSIGNABLE_TEAM_ROLES))}")
    
    # Check team limits based on subscription plan
    limits = get_team_limits(db, current_user.company_name)
    
    # Lock existing team members to prevent concurrent inserts exceeding limit
    current_count = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).with_for_update().count()
    
    if current_count >= limits["max_users"]:
        # Include upgrade info in error message
        upgrade_msg = ""
        if limits["upgrade_options"]:
            next_plan = limits["upgrade_options"][0]
            upgrade_msg = f" Upgrade to {next_plan['name']} (${next_plan['monthly_price']}/mo) to add up to {next_plan['max_users']} users."
        
        raise HTTPException(
            status_code=403,
            detail=f"Team limit reached. Your {limits['plan_name']} plan allows {limits['max_users']} user(s).{upgrade_msg}"
        )
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    
    # Generate temporary password
    temp_password = secrets.token_urlsafe(12)
    
    # Create the new user
    try:
        new_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(temp_password),
            company_name=current_user.company_name,
            role=role,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create team member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create team member. Please try again.")
    
    # Send invitation email
    email_sent = False
    try:
        email_service = get_email_service()
        app_url = os.getenv("APP_URL", "https://palmcareai.com")
        invite_result = email_service.send_email(
            to=email,
            subject=f"You've been invited to join {current_user.company_name} on PalmCare AI",
            sender=email_service.from_welcome,
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">You've Been Invited!</h2>
                <p>Hi {full_name},</p>
                <p>{current_user.full_name} has invited you to join <strong>{current_user.company_name}</strong> on PalmCare AI.</p>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                    <p style="margin: 0 0 5px 0;">Email: {email}</p>
                    <p style="margin: 0;">Temporary Password: {temp_password}</p>
                </div>
                
                <p style="color: #dc2626; font-size: 14px;">Please change your password after your first login.</p>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{app_url}/login" 
                       style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Login Now
                    </a>
                </div>
            </div>
            """
        )
        email_sent = invite_result.get("success", False)
        if not email_sent:
            logger.warning(f"Invitation email failed: {invite_result.get('error')}")
    except Exception as e:
        logger.warning(f"Failed to send invitation email: {e}")
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "message": f"Invitation sent to {email}" if email_sent else f"Team member created but invitation email to {email} could not be sent. Please share credentials manually.",
    }


@router.put("/team/{user_id}")
async def update_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
    role: str = None,
    is_active: bool = None,
):
    """Update a team member's role or status."""
    _require_team_manager(current_user)

    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")

    # Check same company (company_name must be present — two users with no
    # company are NOT teammates).
    if not member.company_name or member.company_name != current_user.company_name:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user")

    # Can't deactivate yourself
    if is_active is False and member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    if role is not None:
        if role not in ASSIGNABLE_TEAM_ROLES:
            raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(sorted(ASSIGNABLE_TEAM_ROLES))}")
        # Changing your own role is how a caregiver-turned-manager would
        # self-promote; require another manager to do it.
        if member.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot change your own role")
        member.role = role
    if is_active is not None:
        member.is_active = is_active
    
    db.commit()
    db.refresh(member)
    
    return {
        "id": str(member.id),
        "email": member.email,
        "full_name": member.full_name,
        "role": member.role,
        "is_active": member.is_active,
    }


@router.delete("/team/{user_id}")
async def remove_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Remove a team member (soft delete - deactivate)."""
    _require_team_manager(current_user)

    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")

    # Check same company (must be non-empty on both sides)
    if not member.company_name or member.company_name != current_user.company_name:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user")
    
    # Can't remove yourself
    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own account")
    
    # Soft delete - deactivate
    member.is_active = False
    db.commit()
    
    return {"message": f"User {member.email} has been deactivated"}


# Legacy endpoints (keeping for backwards compatibility)
@router.get("/users", response_model=List[BusinessUserResponse])
async def list_business_users(
    db: Session = Depends(get_db),
):
    """List all users in the business. (Legacy - use /team instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team endpoint instead")


@router.post("/users", response_model=BusinessUserInviteResponse)
async def invite_user(
    user_data: BusinessUserCreate,
    db: Session = Depends(get_db),
):
    """Invite a new user to the business. (Legacy - use /team/invite instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team/invite endpoint instead")


@router.delete("/users/{user_id}")
async def remove_user(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Remove a user from the business. (Legacy - use /team/{user_id}/deactivate instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team/{user_id}/deactivate endpoint instead")
