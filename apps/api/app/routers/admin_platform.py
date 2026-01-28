"""
Platform Admin Router

Comprehensive admin dashboard endpoints for platform management.
Features: Analytics, Subscriptions, Compliance, Audit Logs, Users, Support, System Health
"""

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

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# AUTH HELPERS
# =============================================================================

def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is a platform admin."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    if not current_user.email.endswith("@homecare.ai"):
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user


# =============================================================================
# SCHEMAS
# =============================================================================

class PlatformStats(BaseModel):
    total_businesses: int
    active_businesses: int
    pending_approvals: int
    total_users: int
    total_visits: int
    total_contracts: int
    visits_this_month: int
    contracts_this_month: int
    revenue_this_month: float
    active_subscriptions: int


class BusinessAnalytics(BaseModel):
    id: UUID
    name: str
    status: str
    users_count: int
    clients_count: int
    visits_count: int
    contracts_count: int
    subscription_tier: Optional[str]
    created_at: datetime


class ComplianceAlert(BaseModel):
    id: UUID
    business_id: UUID
    business_name: str
    alert_type: str
    document_type: Optional[str]
    expiration_date: Optional[datetime]
    days_until_expiry: Optional[int]
    severity: str


class AuditLogEntry(BaseModel):
    id: UUID
    user_email: Optional[str]
    action: str
    entity_type: Optional[str]
    description: Optional[str]
    ip_address: Optional[str]
    created_at: datetime


class PlatformUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "admin"


class PlatformUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime


class TicketSummary(BaseModel):
    id: UUID
    ticket_number: str
    subject: str
    business_name: Optional[str]
    category: str
    priority: str
    status: str
    created_at: datetime


class TicketDetail(BaseModel):
    id: UUID
    ticket_number: str
    subject: str
    description: str
    business_name: Optional[str]
    submitted_by_name: Optional[str]
    submitted_by_email: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[str]
    responses: List[dict]
    created_at: datetime
    first_response_at: Optional[datetime]


class TicketResponseCreate(BaseModel):
    message: str


class SystemHealthStatus(BaseModel):
    api_status: str
    database_status: str
    redis_status: str
    storage_status: str
    worker_status: str
    last_checked: datetime


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
        Business.verification_status == VerificationStatus.APPROVED
    ).count()
    pending_approvals = db.query(Business).filter(
        Business.verification_status.in_([
            VerificationStatus.PENDING,
            VerificationStatus.SOS_VERIFIED,
            VerificationStatus.DOCUMENTS_SUBMITTED,
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
            status=b.verification_status.value,
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


# =============================================================================
# COMPLIANCE ALERTS
# =============================================================================

@router.get("/compliance/alerts", response_model=List[ComplianceAlert])
async def get_compliance_alerts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get compliance alerts for expiring documents across all businesses."""
    now = datetime.now(timezone.utc)
    alert_threshold = now + timedelta(days=30)  # Alert for docs expiring in 30 days
    
    # Find documents expiring soon
    expiring_docs = db.query(BusinessDocument).filter(
        BusinessDocument.expiration_date != None,
        BusinessDocument.expiration_date <= alert_threshold.date(),
    ).all()
    
    alerts = []
    for doc in expiring_docs:
        business = db.query(Business).filter(Business.id == doc.business_id).first()
        days_until = (doc.expiration_date - now.date()).days if doc.expiration_date else 0
        
        severity = "low"
        if days_until <= 0:
            severity = "critical"
        elif days_until <= 7:
            severity = "high"
        elif days_until <= 14:
            severity = "medium"
        
        alerts.append(ComplianceAlert(
            id=doc.id,
            business_id=doc.business_id,
            business_name=business.name if business else "Unknown",
            alert_type="document_expiring",
            document_type=doc.document_type.value,
            expiration_date=datetime.combine(doc.expiration_date, datetime.min.time()) if doc.expiration_date else None,
            days_until_expiry=days_until,
            severity=severity,
        ))
    
    # Sort by severity (critical first)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: severity_order.get(x.severity, 4))
    
    return alerts


@router.get("/compliance/summary")
async def get_compliance_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get compliance summary statistics."""
    now = datetime.now(timezone.utc)
    
    # Count docs by status
    total_docs = db.query(BusinessDocument).count()
    verified_docs = db.query(BusinessDocument).filter(BusinessDocument.is_verified == True).count()
    
    # Expired docs
    expired = db.query(BusinessDocument).filter(
        BusinessDocument.expiration_date != None,
        BusinessDocument.expiration_date < now.date(),
    ).count()
    
    # Expiring in 30 days
    expiring_soon = db.query(BusinessDocument).filter(
        BusinessDocument.expiration_date != None,
        BusinessDocument.expiration_date >= now.date(),
        BusinessDocument.expiration_date <= (now + timedelta(days=30)).date(),
    ).count()
    
    return {
        "total_documents": total_docs,
        "verified_documents": verified_docs,
        "expired_documents": expired,
        "expiring_in_30_days": expiring_soon,
        "compliance_rate": round((verified_docs / total_docs * 100) if total_docs > 0 else 0, 1),
    }


# =============================================================================
# AUDIT LOGS
# =============================================================================

@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_email: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get audit logs with filtering."""
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True)
    
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_email:
        query = query.filter(User.email.ilike(f"%{user_email}%"))
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)
    
    logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        result.append(AuditLogEntry(
            id=log.id,
            user_email=user.email if user else None,
            action=log.action,
            entity_type=log.entity_type,
            description=log.description,
            ip_address=log.ip_address,
            created_at=log.created_at,
        ))
    
    return result


@router.get("/audit-logs/actions")
async def get_audit_action_types(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get list of all audit action types."""
    actions = db.query(AuditLog.action).distinct().all()
    return [a[0] for a in actions]


# =============================================================================
# PLATFORM USER MANAGEMENT
# =============================================================================

@router.get("/users", response_model=List[PlatformUserResponse])
async def list_platform_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all platform admin users."""
    users = db.query(User).filter(
        User.email.endswith("@homecare.ai")
    ).all()
    
    return [
        PlatformUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if u.role else "user",
            is_active=u.is_active,
            last_login=u.last_login,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/users", response_model=PlatformUserResponse)
async def create_platform_user(
    user_data: PlatformUserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Create a new platform admin user."""
    # Must be @homecare.ai email
    if not user_data.email.endswith("@homecare.ai"):
        raise HTTPException(
            status_code=400,
            detail="Platform admins must use @homecare.ai email"
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
        password_hash=get_password_hash(temp_password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # TODO: Send invite email with temp password
    logger.info(f"Created platform user {user_data.email} with temp password")
    
    return PlatformUserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role.value,
        is_active=new_user.is_active,
        last_login=new_user.last_login,
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


# =============================================================================
# SUPPORT TICKETS
# =============================================================================

@router.get("/support/tickets", response_model=List[TicketSummary])
async def list_support_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all support tickets."""
    query = db.query(SupportTicket)
    
    if status:
        query = query.filter(SupportTicket.status == TicketStatus(status))
    if priority:
        query = query.filter(SupportTicket.priority == TicketPriority(priority))
    if category:
        query = query.filter(SupportTicket.category == TicketCategory(category))
    
    tickets = query.order_by(desc(SupportTicket.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for t in tickets:
        business = db.query(Business).filter(Business.id == t.business_id).first() if t.business_id else None
        result.append(TicketSummary(
            id=t.id,
            ticket_number=t.ticket_number,
            subject=t.subject,
            business_name=business.name if business else None,
            category=t.category.value,
            priority=t.priority.value,
            status=t.status.value,
            created_at=t.created_at,
        ))
    
    return result


@router.get("/support/tickets/{ticket_id}", response_model=TicketDetail)
async def get_ticket_detail(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get ticket details."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    business = db.query(Business).filter(Business.id == ticket.business_id).first() if ticket.business_id else None
    assigned = db.query(User).filter(User.id == ticket.assigned_to_id).first() if ticket.assigned_to_id else None
    
    responses = []
    for r in ticket.responses:
        responses.append({
            "id": str(r.id),
            "message": r.message,
            "responder_name": r.responder_name,
            "responder_email": r.responder_email,
            "is_admin": r.is_admin_response == "true",
            "created_at": r.created_at.isoformat(),
        })
    
    return TicketDetail(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        business_name=business.name if business else None,
        submitted_by_name=ticket.submitted_by_name,
        submitted_by_email=ticket.submitted_by_email,
        category=ticket.category.value,
        priority=ticket.priority.value,
        status=ticket.status.value,
        assigned_to=assigned.full_name if assigned else None,
        responses=responses,
        created_at=ticket.created_at,
        first_response_at=ticket.first_response_at,
    )


@router.post("/support/tickets/{ticket_id}/respond")
async def respond_to_ticket(
    ticket_id: UUID,
    response_data: TicketResponseCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Respond to a support ticket."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    response = TicketResponse(
        ticket_id=ticket.id,
        responder_id=admin.id,
        responder_email=admin.email,
        responder_name=admin.full_name,
        is_admin_response="true",
        message=response_data.message,
    )
    db.add(response)
    
    # Update ticket
    if not ticket.first_response_at:
        ticket.first_response_at = datetime.now(timezone.utc)
    ticket.status = TicketStatus.IN_PROGRESS
    
    db.commit()
    
    # TODO: Send email notification to ticket submitter
    
    return {"message": "Response added"}


@router.put("/support/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: UUID,
    new_status: str,
    resolution: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Update ticket status."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = TicketStatus(new_status)
    
    if new_status in ["resolved", "closed"]:
        ticket.resolved_at = datetime.now(timezone.utc)
        ticket.resolved_by_id = admin.id
        if resolution:
            ticket.resolution = resolution
    
    db.commit()
    
    return {"message": f"Ticket status updated to {new_status}"}


@router.put("/support/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: UUID,
    assignee_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Assign ticket to an admin."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    assignee = db.query(User).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    ticket.assigned_to_id = assignee_id
    db.commit()
    
    return {"message": f"Ticket assigned to {assignee.full_name}"}


@router.get("/support/stats")
async def get_support_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get support ticket statistics."""
    total = db.query(SupportTicket).count()
    open_tickets = db.query(SupportTicket).filter(
        SupportTicket.status == TicketStatus.OPEN
    ).count()
    in_progress = db.query(SupportTicket).filter(
        SupportTicket.status == TicketStatus.IN_PROGRESS
    ).count()
    resolved = db.query(SupportTicket).filter(
        SupportTicket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()
    
    # Average response time (simplified)
    # In production, calculate from first_response_at - created_at
    
    return {
        "total_tickets": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "avg_response_time_hours": 4.5,  # Placeholder
    }


# =============================================================================
# SYSTEM HEALTH
# =============================================================================

@router.get("/system/health", response_model=SystemHealthStatus)
async def get_system_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get system health status."""
    import redis
    import boto3
    from botocore.exceptions import ClientError
    
    # Database check
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Redis check
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(redis_url)
        r.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
    
    # S3/MinIO check
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=os.getenv("S3_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("S3_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
        s3.list_buckets()
        storage_status = "healthy"
    except Exception as e:
        storage_status = f"unhealthy: {str(e)}"
    
    # Worker check (via Redis queue)
    try:
        # Check if there are workers registered
        worker_status = "healthy"  # Simplified - in prod check Celery inspect
    except Exception as e:
        worker_status = f"unknown: {str(e)}"
    
    return SystemHealthStatus(
        api_status="healthy",
        database_status=db_status,
        redis_status=redis_status,
        storage_status=storage_status,
        worker_status=worker_status,
        last_checked=datetime.now(timezone.utc),
    )


@router.get("/system/metrics")
async def get_system_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get system metrics."""
    return {
        "api_version": "1.0.0",
        "uptime_seconds": 0,  # Would need to track start time
        "total_api_requests_today": 0,  # Would need request logging
        "database_connections": 0,  # Would need connection pool stats
        "storage_used_gb": 0,  # Would need to query S3
        "worker_tasks_pending": 0,  # Would need Celery inspect
        "worker_tasks_completed_today": 0,
    }


# =============================================================================
# ANNOUNCEMENTS
# =============================================================================

@router.post("/announcements")
async def send_announcement(
    subject: str,
    message: str,
    target: str = "all",  # all, active, trial
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Send announcement to businesses."""
    query = db.query(Business).filter(Business.verification_status == VerificationStatus.APPROVED)
    
    if target == "trial":
        # Would filter by subscription status
        pass
    
    businesses = query.all()
    
    sent_count = 0
    for business in businesses:
        # Get owner email
        owner = db.query(BusinessUser).filter(
            BusinessUser.business_id == business.id,
            BusinessUser.is_owner == True,
        ).first()
        
        if owner:
            # Send email
            email_service.send_email(
                to=owner.email,
                subject=f"[Homecare AI] {subject}",
                html=f"""
                <div style="font-family: Arial, sans-serif;">
                    <h2>{subject}</h2>
                    <p>{message}</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an announcement from Homecare AI platform.
                    </p>
                </div>
                """,
            )
            sent_count += 1
    
    return {"message": f"Announcement sent to {sent_count} businesses"}
