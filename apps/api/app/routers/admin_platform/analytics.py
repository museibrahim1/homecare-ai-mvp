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
# ANALYTICS DASHBOARD
# =============================================================================

@router.get("/analytics/overview", response_model=PlatformStats)
async def get_platform_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get platform-wide analytics overview."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Business stats
    total_businesses = db.query(Business).count()
    active_businesses = db.query(Business).filter(
        Business.verification_status == 'approved'
    ).count()
    pending_approvals = db.query(Business).filter(
        Business.verification_status.in_([
            'pending',
            'sos_verified',
            'documents_submitted',
        ])
    ).count()
    
    # User stats (all users across all businesses + platform admins)
    total_business_users = db.query(BusinessUser).count()
    total_platform_users = db.query(User).count()
    total_users = total_business_users + total_platform_users
    
    # Visit stats
    total_visits = db.query(Visit).count()
    visits_this_month = db.query(Visit).filter(
        Visit.created_at >= month_start
    ).count()
    
    # Contract stats
    total_contracts = db.query(Contract).count()
    contracts_this_month = db.query(Contract).filter(
        Contract.created_at >= month_start
    ).count()
    
    # Subscription stats
    active_subscriptions = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).count()
    
    # Revenue (simplified - based on active subscriptions)
    revenue = db.query(func.sum(Plan.monthly_price)).join(
        Subscription, Subscription.plan_id == Plan.id
    ).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).scalar() or 0
    
    return PlatformStats(
        total_businesses=total_businesses,
        active_businesses=active_businesses,
        pending_approvals=pending_approvals,
        total_users=total_users,
        total_visits=total_visits,
        total_contracts=total_contracts,
        visits_this_month=visits_this_month,
        contracts_this_month=contracts_this_month,
        revenue_this_month=float(revenue),
        active_subscriptions=active_subscriptions,
    )


@router.get("/analytics/businesses", response_model=List[BusinessAnalytics])
async def get_business_analytics(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get analytics for all businesses (no client data - HIPAA compliant)."""
    businesses = db.query(Business).order_by(desc(Business.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for b in businesses:
        users_count = db.query(BusinessUser).filter(BusinessUser.business_id == b.id).count()
        
        # Get subscription tier
        subscription = db.query(Subscription).filter(Subscription.business_id == b.id).first()
        tier = None
        if subscription:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            tier = plan.tier.value if plan else None
        
        # Note: We count visits/contracts at business level, NOT individual client records
        # This maintains HIPAA compliance - we see metrics, not data
        result.append(BusinessAnalytics(
            id=b.id,
            name=b.name,
            status=b.verification_status.value if hasattr(b.verification_status, 'value') else b.verification_status,
            users_count=users_count,
            clients_count=0,  # Omitted for HIPAA - we track at aggregate level only
            visits_count=0,   # Omitted for HIPAA
            contracts_count=0, # Omitted for HIPAA
            subscription_tier=tier,
            created_at=b.created_at,
        ))
    
    return result


@router.get("/analytics/trends")
async def get_platform_trends(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get trend data for charts."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Daily signups
    signups = db.query(
        func.date(Business.created_at).label('date'),
        func.count(Business.id).label('count')
    ).filter(
        Business.created_at >= start_date
    ).group_by(func.date(Business.created_at)).all()
    
    return {
        "period_days": days,
        "signups_by_day": [{"date": str(s.date), "count": s.count} for s in signups],
    }


# =============================================================================
# SUBSCRIPTION MANAGEMENT
# =============================================================================

@router.get("/subscriptions/plans", response_model=List[dict])
async def list_plans(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all subscription plans."""
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.monthly_price).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "tier": p.tier.value,
            "monthly_price": float(p.monthly_price) if p.monthly_price else 0,
            "annual_price": float(p.annual_price) if p.annual_price else 0,
            "setup_fee": float(p.setup_fee) if p.setup_fee else 0,
            "max_users": p.max_users,
            "max_clients": p.max_clients,
            "max_visits_per_month": p.max_visits_per_month,
            "is_contact_sales": p.is_contact_sales or False,
            "features": p.features,
        }
        for p in plans
    ]


@router.post("/subscriptions/plans")
async def create_plan(
    name: str,
    tier: str,
    monthly_price: float,
    annual_price: float,
    max_users: int = 5,
    max_clients: int = 100,
    max_visits: int = 500,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Create a new subscription plan."""
    plan = Plan(
        name=name,
        tier=PlanTier(tier),
        monthly_price=monthly_price,
        annual_price=annual_price,
        max_users=max_users,
        max_clients=max_clients,
        max_visits_per_month=max_visits,
    )
    db.add(plan)
    db.commit()
    return {"id": str(plan.id), "message": "Plan created"}


@router.get("/subscriptions")
async def list_subscriptions(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all business subscriptions."""
    query = db.query(Subscription).join(Business)
    
    if status:
        query = query.filter(Subscription.status == SubscriptionStatus(status))
    
    subs = query.order_by(desc(Subscription.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for s in subs:
        business = db.query(Business).filter(Business.id == s.business_id).first()
        plan = db.query(Plan).filter(Plan.id == s.plan_id).first()
        result.append({
            "id": str(s.id),
            "business_name": business.name if business else "Unknown",
            "plan_name": plan.name if plan else "Unknown",
            "plan_tier": plan.tier.value if plan else None,
            "status": s.status.value,
            "billing_cycle": s.billing_cycle,
            "current_period_end": s.current_period_end.isoformat() if s.current_period_end else None,
            "visits_this_month": s.visits_this_month,
            "created_at": s.created_at.isoformat(),
        })
    
    return result


@router.put("/subscriptions/{subscription_id}/status")
async def update_subscription_status(
    subscription_id: UUID,
    new_status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Update subscription status (e.g., suspend, cancel)."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    sub.status = SubscriptionStatus(new_status)
    if new_status == "cancelled":
        sub.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": f"Subscription status updated to {new_status}"}


