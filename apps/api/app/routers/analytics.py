"""
Analytics Router — Platform-wide usage tracking + churn analytics

Serves three audiences:
1. Public visitors: anonymous event tracking (clicks, page views, funnel steps)
2. CEO/Admin: churn risk dashboard, provider engagement, registration funnel, click maps
3. Providers: their own usage trends and activity summary
"""

import hashlib
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date, extract, and_
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.analytics import UsageAnalytics, ProviderEngagement, SiteEvent
from app.models.sales_lead import SalesLead

logger = logging.getLogger(__name__)

router = APIRouter()


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
    admin: User = Depends(require_permission("analytics")),
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
    admin: User = Depends(require_permission("analytics")),
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
    admin: User = Depends(require_permission("analytics")),
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
    admin: User = Depends(require_permission("analytics")),
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
    admin: User = Depends(require_permission("analytics")),
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


# =============================================================================
# PUBLIC: ANONYMOUS SITE EVENT TRACKING (no auth)
# =============================================================================

class PublicTrackRequest(BaseModel):
    session_id: str
    event_type: str  # page_view | click | funnel_step | scroll_depth
    page_path: Optional[str] = None
    element_id: Optional[str] = None
    element_text: Optional[str] = None
    element_tag: Optional[str] = None
    click_x: Optional[int] = None
    click_y: Optional[int] = None
    viewport_w: Optional[int] = None
    viewport_h: Optional[int] = None
    funnel_step: Optional[int] = None
    funnel_name: Optional[str] = None
    referrer: Optional[str] = None
    metadata: Optional[dict] = None


class PublicTrackBatch(BaseModel):
    events: List[PublicTrackRequest]


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


_public_rate_store: dict[str, list[float]] = defaultdict(list)
_PUBLIC_RATE_WINDOW = 60
_PUBLIC_RATE_MAX = 120  # 120 requests/min per IP


def _check_public_rate_limit(request: Request) -> str:
    """Rate-limit public analytics endpoints. Returns client IP."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip() or "unknown"
    key = f"analytics:{ip}"
    now = time.time()
    _public_rate_store[key] = [t for t in _public_rate_store[key] if t > now - _PUBLIC_RATE_WINDOW]
    if len(_public_rate_store[key]) >= _PUBLIC_RATE_MAX:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded.")
    _public_rate_store[key].append(now)
    return ip


@router.post("/public/track")
async def public_track(req: PublicTrackRequest, request: Request, db: Session = Depends(get_db)):
    """Record a single anonymous site event (no auth required)."""
    ip = _check_public_rate_limit(request)
    ev = SiteEvent(
        session_id=req.session_id[:64],
        event_type=req.event_type[:50],
        page_path=(req.page_path or "")[:500] or None,
        element_id=(req.element_id or "")[:200] or None,
        element_text=(req.element_text or "")[:500] or None,
        element_tag=(req.element_tag or "")[:50] or None,
        click_x=req.click_x,
        click_y=req.click_y,
        viewport_w=req.viewport_w,
        viewport_h=req.viewport_h,
        funnel_step=req.funnel_step,
        funnel_name=(req.funnel_name or "")[:100] or None,
        referrer=(req.referrer or "")[:1000] or None,
        user_agent=(request.headers.get("user-agent") or "")[:1000] or None,
        ip_hash=_hash_ip(ip),
        meta=req.metadata or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(ev)
    db.commit()
    return {"ok": True}


@router.post("/public/track-batch")
async def public_track_batch(req: PublicTrackBatch, request: Request, db: Session = Depends(get_db)):
    """Record a batch of anonymous site events (no auth, max 50 per call)."""
    ip = _check_public_rate_limit(request)
    ip_h = _hash_ip(ip)
    ua = (request.headers.get("user-agent") or "")[:1000] or None
    now = datetime.now(timezone.utc)

    for e in req.events[:50]:
        db.add(SiteEvent(
            session_id=e.session_id[:64],
            event_type=e.event_type[:50],
            page_path=(e.page_path or "")[:500] or None,
            element_id=(e.element_id or "")[:200] or None,
            element_text=(e.element_text or "")[:500] or None,
            element_tag=(e.element_tag or "")[:50] or None,
            click_x=e.click_x, click_y=e.click_y,
            viewport_w=e.viewport_w, viewport_h=e.viewport_h,
            funnel_step=e.funnel_step,
            funnel_name=(e.funnel_name or "")[:100] or None,
            referrer=(e.referrer or "")[:1000] or None,
            user_agent=ua, ip_hash=ip_h, meta=e.metadata or {},
            created_at=now,
        ))
    db.commit()
    return {"ok": True, "count": min(len(req.events), 50)}


# =============================================================================
# ADMIN: REGISTRATION FUNNEL ANALYTICS
# =============================================================================

@router.get("/registration/funnel")
async def registration_funnel(
    days: int = Query(30, ge=1, le=365),
    funnel_name: str = Query("registration", pattern="^[a-z_]+$"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("analytics")),
):
    """Registration funnel: how many unique sessions reach each step, with drop-off rates."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = db.query(
        SiteEvent.funnel_step,
        func.count(func.distinct(SiteEvent.session_id)).label("unique_sessions"),
    ).filter(
        SiteEvent.event_type == "funnel_step",
        SiteEvent.funnel_name == funnel_name,
        SiteEvent.funnel_step.isnot(None),
        SiteEvent.created_at >= since,
    ).group_by(SiteEvent.funnel_step).order_by(SiteEvent.funnel_step).all()

    step_labels = {
        1: "Account Info",
        2: "Agency Details",
        3: "Plan Selection",
        4: "Stripe Checkout",
        5: "Completed",
    }

    total_started = rows[0].unique_sessions if rows else 0

    steps = []
    prev_count = total_started
    for r in rows:
        drop = prev_count - r.unique_sessions if prev_count > 0 else 0
        drop_rate = round(drop / max(prev_count, 1) * 100, 1)
        steps.append({
            "step": r.funnel_step,
            "label": step_labels.get(r.funnel_step, f"Step {r.funnel_step}"),
            "unique_sessions": r.unique_sessions,
            "drop_off": drop,
            "drop_off_rate": drop_rate,
            "percentage_of_start": round(r.unique_sessions / max(total_started, 1) * 100, 1),
        })
        prev_count = r.unique_sessions

    total_page_views = db.query(func.count(SiteEvent.id)).filter(
        SiteEvent.event_type == "page_view",
        SiteEvent.page_path.ilike("/register%"),
        SiteEvent.created_at >= since,
    ).scalar() or 0

    unique_visitors = db.query(func.count(func.distinct(SiteEvent.session_id))).filter(
        SiteEvent.event_type == "page_view",
        SiteEvent.page_path.ilike("/register%"),
        SiteEvent.created_at >= since,
    ).scalar() or 0

    completed = next((s["unique_sessions"] for s in steps if s["step"] == 5), 0)

    return {
        "period_days": days,
        "funnel_name": funnel_name,
        "total_page_views": total_page_views,
        "unique_visitors": unique_visitors,
        "total_started": total_started,
        "total_completed": completed,
        "completion_rate": round(completed / max(total_started, 1) * 100, 1),
        "steps": steps,
    }


@router.get("/registration/clicks")
async def registration_clicks(
    days: int = Query(30, ge=1, le=365),
    page_path: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("analytics")),
):
    """Click analytics: which elements users click on, grouped by element."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    filters = [
        SiteEvent.event_type == "click",
        SiteEvent.created_at >= since,
    ]
    if page_path:
        filters.append(SiteEvent.page_path == page_path)

    by_element = db.query(
        SiteEvent.element_id,
        SiteEvent.element_text,
        SiteEvent.element_tag,
        SiteEvent.page_path,
        func.count().label("clicks"),
        func.count(func.distinct(SiteEvent.session_id)).label("unique_sessions"),
    ).filter(*filters).filter(
        SiteEvent.element_id.isnot(None),
    ).group_by(
        SiteEvent.element_id, SiteEvent.element_text, SiteEvent.element_tag, SiteEvent.page_path,
    ).order_by(desc("clicks")).limit(50).all()

    click_positions = db.query(
        SiteEvent.click_x, SiteEvent.click_y,
        SiteEvent.viewport_w, SiteEvent.viewport_h,
        SiteEvent.page_path,
    ).filter(*filters).filter(
        SiteEvent.click_x.isnot(None),
        SiteEvent.click_y.isnot(None),
    ).order_by(desc(SiteEvent.created_at)).limit(500).all()

    by_page = db.query(
        SiteEvent.page_path,
        func.count().label("clicks"),
    ).filter(*filters).group_by(SiteEvent.page_path).order_by(desc("clicks")).all()

    return {
        "period_days": days,
        "elements": [
            {
                "element_id": e.element_id,
                "text": e.element_text,
                "tag": e.element_tag,
                "page": e.page_path,
                "clicks": e.clicks,
                "unique_sessions": e.unique_sessions,
            }
            for e in by_element
        ],
        "positions": [
            {"x": p.click_x, "y": p.click_y, "vw": p.viewport_w, "vh": p.viewport_h, "page": p.page_path}
            for p in click_positions
        ],
        "by_page": [{"page": p.page_path, "clicks": p.clicks} for p in by_page],
    }


@router.get("/registration/page-views")
async def registration_page_views(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("analytics")),
):
    """Page view analytics: daily views per page, top pages, unique visitors."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    daily = db.query(
        cast(SiteEvent.created_at, Date).label("day"),
        func.count().label("views"),
        func.count(func.distinct(SiteEvent.session_id)).label("unique"),
    ).filter(
        SiteEvent.event_type == "page_view",
        SiteEvent.created_at >= since,
    ).group_by("day").order_by("day").all()

    top_pages = db.query(
        SiteEvent.page_path,
        func.count().label("views"),
        func.count(func.distinct(SiteEvent.session_id)).label("unique"),
    ).filter(
        SiteEvent.event_type == "page_view",
        SiteEvent.created_at >= since,
        SiteEvent.page_path.isnot(None),
    ).group_by(SiteEvent.page_path).order_by(desc("views")).limit(20).all()

    top_referrers = db.query(
        SiteEvent.referrer,
        func.count().label("count"),
    ).filter(
        SiteEvent.event_type == "page_view",
        SiteEvent.created_at >= since,
        SiteEvent.referrer.isnot(None),
        SiteEvent.referrer != "",
    ).group_by(SiteEvent.referrer).order_by(desc("count")).limit(15).all()

    return {
        "period_days": days,
        "daily": [{"date": str(d.day), "views": d.views, "unique": d.unique} for d in daily],
        "top_pages": [{"page": p.page_path, "views": p.views, "unique": p.unique} for p in top_pages],
        "top_referrers": [{"referrer": r.referrer, "count": r.count} for r in top_referrers],
    }


@router.get("/registration/sessions")
async def registration_sessions(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("analytics")),
):
    """Recent visitor sessions with their journey through the registration funnel."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    sessions = db.query(
        SiteEvent.session_id,
        func.min(SiteEvent.created_at).label("started_at"),
        func.max(SiteEvent.created_at).label("last_event_at"),
        func.count().label("total_events"),
        func.max(SiteEvent.funnel_step).label("max_step"),
    ).filter(
        SiteEvent.created_at >= since,
    ).group_by(SiteEvent.session_id).order_by(desc("last_event_at")).limit(limit).all()

    result = []
    for s in sessions:
        pages = db.query(SiteEvent.page_path).filter(
            SiteEvent.session_id == s.session_id,
            SiteEvent.event_type == "page_view",
            SiteEvent.page_path.isnot(None),
        ).distinct().all()

        result.append({
            "session_id": s.session_id[:8] + "...",
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "last_event": s.last_event_at.isoformat() if s.last_event_at else None,
            "total_events": s.total_events,
            "max_funnel_step": s.max_step,
            "pages_visited": [p.page_path for p in pages],
        })

    return {"period_days": days, "sessions": result}
