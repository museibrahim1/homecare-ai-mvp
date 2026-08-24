"""Cron signup + web traffic stats for the daily CEO digest."""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.analytics import SiteEvent
from app.models.business import Business, BusinessUser
from app.routers.outreach.common import BUSINESS_TZ, _today_eastern

router = APIRouter()


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    start_local = datetime(day.year, day.month, day.day, tzinfo=BUSINESS_TZ)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


@router.get("/cron/signup-stats")
def cron_signup_stats(
    request: Request,
    db: Session = Depends(get_db),
    day: Optional[str] = Query(
        None,
        description="Report date in US Eastern (YYYY-MM-DD). Defaults to today.",
    ),
):
    """Signup count + public site traffic for one calendar day (US Eastern)."""
    from app.core.internal_auth import require_internal_key

    require_internal_key(request)

    if day:
        try:
            report_day = date.fromisoformat(day)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid day; use YYYY-MM-DD")
    else:
        report_day = _today_eastern()

    day_start, day_end = _day_bounds(report_day)

    businesses = (
        db.query(Business)
        .filter(Business.created_at >= day_start, Business.created_at < day_end)
        .order_by(Business.created_at)
        .all()
    )

    signup_rows = []
    for b in businesses:
        owner = (
            db.query(BusinessUser)
            .filter(BusinessUser.business_id == b.id, BusinessUser.is_owner.is_(True))
            .first()
        )
        signup_rows.append(
            {
                "business_id": str(b.id),
                "agency_name": b.name,
                "owner_email": owner.email if owner else b.email,
                "owner_name": owner.full_name if owner else None,
                "state": b.state,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
        )

    page_views = (
        db.query(func.count(SiteEvent.id))
        .filter(
            SiteEvent.event_type == "page_view",
            SiteEvent.created_at >= day_start,
            SiteEvent.created_at < day_end,
        )
        .scalar()
        or 0
    )

    unique_sessions = (
        db.query(func.count(func.distinct(SiteEvent.session_id)))
        .filter(
            SiteEvent.event_type == "page_view",
            SiteEvent.created_at >= day_start,
            SiteEvent.created_at < day_end,
        )
        .scalar()
        or 0
    )

    register_page_views = (
        db.query(func.count(SiteEvent.id))
        .filter(
            SiteEvent.event_type == "page_view",
            SiteEvent.page_path == "/register",
            SiteEvent.created_at >= day_start,
            SiteEvent.created_at < day_end,
        )
        .scalar()
        or 0
    )

    registration_completions = (
        db.query(func.count(func.distinct(SiteEvent.session_id)))
        .filter(
            SiteEvent.event_type == "funnel_step",
            SiteEvent.funnel_name == "registration",
            SiteEvent.funnel_step >= 4,
            SiteEvent.created_at >= day_start,
            SiteEvent.created_at < day_end,
        )
        .scalar()
        or 0
    )

    # Signups by day for trailing window (inclusive of report_day)
    window_start_day = report_day - timedelta(days=6)
    window_start, _ = _day_bounds(window_start_day)
    signup_counts = (
        db.query(
            func.date(func.timezone("America/New_York", Business.created_at)).label("day"),
            func.count(Business.id).label("count"),
        )
        .filter(Business.created_at >= window_start, Business.created_at < day_end)
        .group_by("day")
        .order_by("day")
        .all()
    )

    return {
        "report_date": str(report_day),
        "timezone": "America/New_York",
        "signups_today": len(signup_rows),
        "signups": signup_rows,
        "web_traffic": {
            "page_views": page_views,
            "unique_sessions": unique_sessions,
            "register_page_views": register_page_views,
            "registration_completions": registration_completions,
        },
        "signups_by_day": [
            {"date": str(row.day), "count": row.count} for row in signup_counts
        ],
    }
