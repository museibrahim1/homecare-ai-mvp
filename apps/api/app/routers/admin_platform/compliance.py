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
            document_type=doc.document_type.value if hasattr(doc.document_type, 'value') else doc.document_type,
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


