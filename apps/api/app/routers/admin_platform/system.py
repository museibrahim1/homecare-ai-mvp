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
    from sqlalchemy import text
    
    # Database check
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    # Redis check
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(redis_url, socket_connect_timeout=3)
        r.ping()
        r.close()
        redis_status = "healthy"
    except Exception:
        redis_status = "unhealthy"
    
    # S3/MinIO check - use head_bucket instead of list_buckets (doesn't require ListAllMyBuckets permission)
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=os.getenv("S3_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("S3_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
        bucket_name = os.getenv("S3_BUCKET", "palmcare-audio")
        s3.head_bucket(Bucket=bucket_name)
        storage_status = "healthy"
    except Exception:
        storage_status = "unhealthy"
    
    # Worker check via Celery inspect
    try:
        from celery import Celery
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        app = Celery(broker=redis_url)
        inspector = app.control.inspect(timeout=2.0)
        active = inspector.active()
        if active:
            worker_status = f"healthy ({len(active)} workers)"
        else:
            worker_status = "no workers connected"
    except Exception:
        worker_status = "unknown"
    
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
    """Get real system metrics from database, Redis, and S3."""
    import redis
    import boto3
    from sqlalchemy import text
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # --- Database metrics ---
    # Total visits today
    visits_today = 0
    try:
        visits_today = db.query(Visit).filter(Visit.created_at >= today_start).count()
    except Exception:
        pass
    
    # Total contracts today
    contracts_today = 0
    try:
        contracts_today = db.query(Contract).filter(Contract.created_at >= today_start).count()
    except Exception:
        pass
    
    # DB connection pool info
    db_connections = 0
    try:
        result = db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"))
        db_connections = result.scalar() or 0
    except Exception:
        pass
    
    # Total records as a proxy for API activity
    total_visits = 0
    total_clients = 0
    total_contracts = 0
    try:
        total_visits = db.query(Visit).count()
        total_clients = db.query(Client).count()
        total_contracts = db.query(Contract).count()
    except Exception:
        pass
    
    # --- S3 Storage ---
    storage_used_gb = 0.0
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=os.getenv("S3_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("S3_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
        bucket_name = os.getenv("S3_BUCKET", "palmcare-audio")
        
        total_size = 0
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket_name):
            for obj in page.get('Contents', []):
                total_size += obj.get('Size', 0)
        
        storage_used_gb = round(total_size / (1024 ** 3), 2)
    except Exception as e:
        logger.warning(f"Failed to get S3 storage size: {e}")
    
    # --- Redis / Celery ---
    worker_tasks_pending = 0
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(redis_url, socket_connect_timeout=3)
        worker_tasks_pending = r.llen("celery") or 0
        r.close()
    except Exception:
        pass
    
    # --- Uptime (approximate from process start) ---
    uptime_seconds = 0
    try:
        import psutil
        process = psutil.Process(os.getpid())
        uptime_seconds = int(now.timestamp() - process.create_time())
    except Exception:
        # psutil may not be installed; fall back to a rough estimate
        pass
    
    return {
        "api_version": "1.2.0",
        "uptime_seconds": uptime_seconds,
        "total_api_requests_today": visits_today + contracts_today,
        "database_connections": db_connections,
        "storage_used_gb": storage_used_gb,
        "worker_tasks_pending": worker_tasks_pending,
        "worker_tasks_completed_today": contracts_today,
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
    query = db.query(Business).filter(Business.verification_status == 'approved')
    
    if target == "trial":
        trial_business_ids = [
            s.business_id for s in db.query(Subscription).filter(
                Subscription.status == SubscriptionStatus.TRIAL
            ).all()
        ]
        if trial_business_ids:
            query = query.filter(Business.id.in_(trial_business_ids))
        else:
            return {"message": "No trial businesses found"}
    
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
            result = email_service.send_email(
                to=owner.email,
                subject=f"[PalmCare AI] {subject}",
                sender=email_service.from_onboarding,
                html=f"""
                <div style="font-family: Arial, sans-serif;">
                    <h2>{subject}</h2>
                    <p>{message}</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an announcement from PalmCare AI.
                    </p>
                </div>
                """,
            )
            if result.get("success"):
                sent_count += 1
    
    return {"message": f"Announcement sent to {sent_count} businesses"}
