import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.business import Business, BusinessDocument, BusinessUser, VerificationStatus
from app.models.subscription import Plan, Subscription, Invoice, PlanTier, SubscriptionStatus
from app.models.support_ticket import SupportTicket, TicketResponse, TicketStatus, TicketPriority, TicketCategory
from app.models.audit_log import AuditLog
from app.models.visit import Visit
from app.models.contract import Contract
from app.models.client import Client
from app.services.email import email_service

from .common import require_platform_admin
from .schemas import (
    PlatformStats, BusinessAnalytics, ComplianceAlert, AuditLogEntry,
    PlatformUserCreate, PlatformUserResponse, TicketSummary, TicketDetail,
    TicketResponseCreate, SystemHealthStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# PLATFORM USER MANAGEMENT
# =============================================================================

@router.get("/users", response_model=List[PlatformUserResponse])
async def list_platform_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all users on the platform (paginated)."""
    users = db.query(User).order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for u in users:
        try:
            role_val = u.role.value if hasattr(u.role, 'value') else (u.role or "user")
            result.append(PlatformUserResponse(
                id=u.id,
                email=u.email or "unknown",
                full_name=u.full_name or "Unknown",
                role=str(role_val),
                is_active=u.is_active if u.is_active is not None else True,
                last_login=getattr(u, 'last_login', None),
                created_at=u.created_at,
            ))
        except Exception as e:
            logger.error(f"Error serializing user {u.id}: {e}")
            continue
    
    return result


@router.post("/users", response_model=PlatformUserResponse)
async def create_platform_user(
    user_data: PlatformUserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Create a new platform admin user."""
    # Must be @palmtai.com email
    if not user_data.email.endswith("@palmtai.com"):
        raise HTTPException(
            status_code=400,
            detail="Platform admins must use @palmtai.com email"
        )
    
    # Check if exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create with temporary password
    import secrets
    from app.core.security import get_password_hash
    
    temp_password = secrets.token_urlsafe(12)
    
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(temp_password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    app_url = os.getenv("APP_URL", "https://palmcareai.com")
    invite_result = email_service.send_email(
        to=user_data.email,
        subject="You've been added as a Platform Admin - PalmCare AI",
        sender=email_service.from_welcome,
        html=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Welcome to PalmCare AI Admin</h2>
            <p>Hi {user_data.full_name},</p>
            <p>You've been granted platform administrator access to PalmCare AI.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                <p style="margin: 0 0 5px 0;">Email: {user_data.email}</p>
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
        """,
    )
    if invite_result.get("success"):
        logger.info(f"Created platform user {new_user.id} — invite email sent")
    else:
        logger.error(f"Created platform user {new_user.id} — invite email FAILED: {invite_result.get('error')}")
    
    return PlatformUserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role.value if hasattr(new_user.role, 'value') else (new_user.role or "user"),
        is_active=new_user.is_active,
        last_login=getattr(new_user, 'last_login', None),
        created_at=new_user.created_at,
    )


@router.put("/users/{user_id}/deactivate")
async def deactivate_platform_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Deactivate a platform user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated"}


@router.delete("/users/{user_id}")
async def delete_platform_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Permanently delete a platform user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.email} deleted"}


@router.post("/users/{user_id}/force-logout")
async def force_logout_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Force logout a user from all devices by invalidating all their tokens."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.force_logout_at = datetime.now(timezone.utc)
    
    # Also clear Google tokens
    if getattr(user, 'google_calendar_connected', False):
        user.google_calendar_connected = False
        user.google_calendar_access_token = None
        user.google_calendar_refresh_token = None
        user.google_calendar_token_expiry = None
    
    db.commit()
    
    logger.info(f"Admin {admin.id} force-logged out user {user.id}")
    return {
        "success": True,
        "message": f"{user.email} has been logged out of all devices",
    }


