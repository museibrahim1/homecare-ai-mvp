"""
Analytics Router — Platform-wide usage tracking + churn analytics

Serves two audiences:
1. CEO/Admin: churn risk dashboard, provider engagement scores, lead funnel
2. Providers: their own usage trends and activity summary
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date, extract
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.analytics import UsageAnalytics, ProviderEngagement
from app.models.sales_lead import SalesLead

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# =============================================================================
# EVENT TRACKING (both admin and provider can post)
# =============================================================================

class TrackEventRequest(BaseModel):
    event_type: str
    event_data: Optional[dict] = None
    page_path: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/track")
async def track_event(
    req: TrackEventRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record a usage event (login, page_view, feature_use, etc.)."""
    business_id = None
    try:
        from app.models.business import Business
        biz = db.query(Business).filter(Business.owner_id == user.id).first()
        if biz:
            business_id = biz.id
    except Exception:
        pass

    ev = UsageAnalytics(
        user_id=user.id,
        business_id=business_id,
        event_type=req.event_type,
        event_data=req.event_data or {},
        page_path=req.page_path,
        session_id=req.session_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ev)
    db.commit()
    return {"status": "tracked"}


# =============================================================================
# PROVIDER SELF-SERVICE ANALYTICS
# =============================================================================

@router.get("/my-usage")
async def my_usage(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the current user's own activity summary."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    events = db.query(UsageAnalytics).filter(
        UsageAnalytics.user_id == user.id,
        UsageAnalytics.created_at >= since,
    ).all()

    event_counts = {}
    for ev in events:
        event_counts[ev.event_type] = event_counts.get(ev.event_type, 0) + 1

    daily = db.query(
        cast(UsageAnalytics.created_at, Date).label("day"),
        func.count().label("count"),
    ).filter(
        UsageAnalytics.user_id == user.id,
        UsageAnalytics.created_at >= since,
    ).group_by("day").order_by("day").all()

    logins = db.query(UsageAnalytics).filter(
        UsageAnalytics.user_id == user.id,
        UsageAnalytics.event_type == "login",
        UsageAnalytics.created_at >= since,
    ).count()

    top_pages = db.query(
        UsageAnalytics.page_path,
        func.count().label("views"),
    ).filter(
        UsageAnalytics.user_id == user.id,
        UsageAnalytics.event_type == "page_view",
        UsageAnalytics.page_path.isnot(None),
        UsageAnalytics.created_at >= since,
    ).group_by(UsageAnalytics.page_path).order_by(desc("views")).limit(10).all()

    return {
        "period_days": days,
        "total_events": len(events),
        "logins": logins,
        "event_breakdown": event_counts,
        "daily_activity": [{"date": str(d.day), "count": d.count} for d in daily],
        "top_pages": [{"page": p.page_path, "views": p.views} for p in top_pages],
    }


# =============================================================================
# ADMIN: CHURN ANALYTICS DASHBOARD
# =============================================================================

@router.get("/churn/overview")
async def churn_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """High-level churn risk breakdown across all providers."""
    engagements = db.query(ProviderEngagement).all()

    risk_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    total_mrr = 0
    at_risk_mrr = 0

    for e in engagements:
        risk = e.churn_risk or "low"
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
        total_mrr += e.mrr or 0
        if risk in ("high", "critical"):
            at_risk_mrr += e.mrr or 0

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    active_7d = db.query(func.count(func.distinct(UsageAnalytics.user_id))).filter(
        UsageAnalytics.created_at >= week_ago,
    ).scalar() or 0

    active_30d = db.query(func.count(func.distinct(UsageAnalytics.user_id))).filter(
        UsageAnalytics.created_at >= month_ago,
    ).scalar() or 0

    total_users = db.query(User).filter(User.is_active == True, User.role != "admin").count()

    return {
        "total_providers": len(engagements),
        "risk_breakdown": risk_counts,
        "total_mrr": round(total_mrr, 2),
        "at_risk_mrr": round(at_risk_mrr, 2),
        "active_users_7d": active_7d,
        "active_users_30d": active_30d,
        "total_users": total_users,
        "retention_rate_30d": round(active_30d / max(total_users, 1) * 100, 1),
    }


@router.get("/churn/providers")
async def churn_providers(
    risk: Optional[str] = None,
    sort_by: str = Query("engagement_score", pattern="^(engagement_score|days_since_last_activity|mrr|logins_last_30d)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List providers with their engagement scores and churn risk."""
    query = db.query(ProviderEngagement)

    if risk:
        query = query.filter(ProviderEngagement.churn_risk == risk)

    sort_col = getattr(ProviderEngagement, sort_by, ProviderEngagement.engagement_score)
    order_fn = desc if sort_order == "desc" else lambda x: x
    query = query.order_by(order_fn(sort_col))

    providers = query.limit(limit).all()

    return [
        {
            "id": str(p.id),
            "business_id": str(p.business_id),
            "business_name": p.business_name,
            "engagement_score": round(p.engagement_score or 0, 1),
            "churn_risk": p.churn_risk,
            "days_since_last_activity": p.days_since_last_activity,
            "last_login_at": p.last_login_at.isoformat() if p.last_login_at else None,
            "total_logins": p.total_logins,
            "logins_last_7d": p.logins_last_7d,
            "logins_last_30d": p.logins_last_30d,
            "assessments_created": p.assessments_created,
            "clients_added": p.clients_added,
            "contracts_generated": p.contracts_generated,
            "notes_created": p.notes_created,
            "plan_tier": p.plan_tier,
            "subscription_status": p.subscription_status,
            "mrr": p.mrr,
        }
        for p in providers
    ]


@router.post("/churn/refresh")
async def refresh_engagement_scores(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Recalculate engagement scores for all provider accounts.

    Scoring weights:
    - Logins (7d): 20pts max
    - Logins (30d): 15pts max
    - Assessments: 25pts max
    - Clients added: 15pts max
    - Contracts: 15pts max
    - Notes: 10pts max
    """
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    users = db.query(User).filter(User.is_active == True, User.role != "admin").all()
    updated = 0

    for user in users:
        business_id = None
        business_name = None
        try:
            from app.models.business import Business
            biz = db.query(Business).filter(Business.owner_id == user.id).first()
            if biz:
                business_id = biz.id
                business_name = biz.name if hasattr(biz, 'name') else (biz.business_name if hasattr(biz, 'business_name') else None)
        except Exception:
            pass

        if not business_id:
            business_id = user.id

        logins_7d = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "login",
            UsageAnalytics.created_at >= week_ago,
        ).count()

        logins_30d = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "login",
            UsageAnalytics.created_at >= month_ago,
        ).count()

        total_logins = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "login",
        ).count()

        assessments = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "assessment_created",
        ).count()

        clients = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "client_added",
        ).count()

        contracts = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "contract_generated",
        ).count()

        notes = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "note_created",
        ).count()

        last_event = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
        ).order_by(desc(UsageAnalytics.created_at)).first()

        last_login = db.query(UsageAnalytics).filter(
            UsageAnalytics.user_id == user.id,
            UsageAnalytics.event_type == "login",
        ).order_by(desc(UsageAnalytics.created_at)).first()

        days_inactive = (now - last_event.created_at).days if last_event else 999

        score = 0
        score += min(logins_7d * 4, 20)
        score += min(logins_30d, 15)
        score += min(assessments * 5, 25)
        score += min(clients * 3, 15)
        score += min(contracts * 5, 15)
        score += min(notes * 2, 10)

        if days_inactive <= 3:
            risk = "low"
        elif days_inactive <= 7:
            risk = "medium"
        elif days_inactive <= 21:
            risk = "high"
        else:
            risk = "critical"

        if score >= 60:
            risk = "low"
        elif score >= 35 and risk == "medium":
            risk = "low"

        existing = db.query(ProviderEngagement).filter(
            ProviderEngagement.user_id == user.id,
        ).first()

        if existing:
            existing.business_id = business_id
            existing.business_name = business_name or user.full_name
            existing.total_logins = total_logins
            existing.last_login_at = last_login.created_at if last_login else None
            existing.logins_last_7d = logins_7d
            existing.logins_last_30d = logins_30d
            existing.assessments_created = assessments
            existing.clients_added = clients
            existing.contracts_generated = contracts
            existing.notes_created = notes
            existing.engagement_score = score
            existing.churn_risk = risk
            existing.days_since_last_activity = days_inactive
            existing.updated_at = now
        else:
            db.add(ProviderEngagement(
                business_id=business_id,
                user_id=user.id,
                business_name=business_name or user.full_name,
                total_logins=total_logins,
                last_login_at=last_login.created_at if last_login else None,
                logins_last_7d=logins_7d,
                logins_last_30d=logins_30d,
                assessments_created=assessments,
                clients_added=clients,
                contracts_generated=contracts,
                notes_created=notes,
                engagement_score=score,
                churn_risk=risk,
                days_since_last_activity=days_inactive,
                created_at=now,
                updated_at=now,
            ))

        updated += 1

    db.commit()

    return {"message": f"Refreshed engagement for {updated} providers"}


# =============================================================================
# ADMIN: LEAD FUNNEL (aggregated from sales_leads)
# =============================================================================

@router.get("/leads/funnel")
async def lead_funnel(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Sales funnel: new → contacted → email_sent → opened → responded → meeting → converted."""
    stages = [
        "new", "contacted", "email_sent", "email_opened",
        "responded", "meeting_scheduled", "demo_given",
        "negotiating", "converted",
    ]

    funnel = []
    total = db.query(SalesLead).count()
    for stage in stages:
        count = db.query(SalesLead).filter(SalesLead.status == stage).count()
        funnel.append({
            "stage": stage,
            "count": count,
            "percentage": round(count / max(total, 1) * 100, 1),
        })

    lost = db.query(SalesLead).filter(
        SalesLead.status.in_(["not_interested", "no_response"])
    ).count()

    return {
        "total_leads": total,
        "funnel": funnel,
        "lost": lost,
        "lost_percentage": round(lost / max(total, 1) * 100, 1),
        "conversion_rate": round(
            db.query(SalesLead).filter(SalesLead.status == "converted").count() / max(total, 1) * 100, 1
        ),
    }


# =============================================================================
# ADMIN: PLATFORM ACTIVITY OVERVIEW
# =============================================================================

@router.get("/platform/activity")
async def platform_activity(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Platform-wide activity trends for admin dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    daily = db.query(
        cast(UsageAnalytics.created_at, Date).label("day"),
        func.count().label("total"),
        func.count(func.distinct(UsageAnalytics.user_id)).label("unique_users"),
    ).filter(
        UsageAnalytics.created_at >= since,
    ).group_by("day").order_by("day").all()

    top_features = db.query(
        UsageAnalytics.event_type,
        func.count().label("count"),
    ).filter(
        UsageAnalytics.created_at >= since,
    ).group_by(UsageAnalytics.event_type).order_by(desc("count")).limit(15).all()

    return {
        "period_days": days,
        "daily_activity": [
            {"date": str(d.day), "total": d.total, "unique_users": d.unique_users}
            for d in daily
        ],
        "top_features": [
            {"feature": f.event_type, "count": f.count}
            for f in top_features
        ],
    }
