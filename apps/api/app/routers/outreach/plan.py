import logging
import os
import uuid as _uuid
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, case, and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

from .common import (
    _drafts,
    EXCLUDED_LEAD_STATUSES, EXCLUDED_CALL_STATUSES, EXCLUDED_INVESTOR_STATUSES,
    PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER, TZ_ORDER,
    BUSINESS_TZ, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY,
    FULL_WORK_DAYS, LAUNCH_DATE,
    EASTERN_STATES, CENTRAL_STATES, MOUNTAIN_STATES, PACIFIC_STATES,
    AGENCY_SUBJECT_HOOKS, AGENCY_TEMPLATES, AGENCY_FOOTER, SITE_URL, IMG, PITCH_DECK_URL,
    _now_eastern, _today_eastern, _today_start, _week_bounds,
    _build_agency_html, _build_investor_text,
    _week_work_days, _cumulative_days_before,
)
from .schemas import (
    AgencyEmailItem, AgencyCallItem, InvestorEmailItem, OutreachStats,
    WeekDayProgress, DailyPlanResponse, MarkCalledBody, GenerateDraftBody,
    DraftResponse, ApproveDraftBody, WeeklySummaryResponse,
    AgencyDraftItem, InvestorDraftItem, WeeklyDayPlan, WeeklyPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Daily Plan ───

@router.get("/daily-plan", response_model=DailyPlanResponse)
def get_daily_plan(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    today = _today_start()
    week_start, week_end = _week_bounds()

    # --- Agency emails: has email, not emailed today ---
    agency_email_q = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None),
            SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .filter(
            (SalesLead.last_email_sent_at.is_(None)) | (SalesLead.last_email_sent_at < today)
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .limit(50)
        .all()
    )
    agency_emails = [
        AgencyEmailItem(
            id=l.id, provider_name=l.provider_name, state=l.state, city=l.city,
            contact_email=l.contact_email, contact_name=l.contact_name,
            phone=l.phone, status=l.status, priority=l.priority,
            email_send_count=l.email_send_count or 0,
            last_email_sent_at=l.last_email_sent_at,
        )
        for l in agency_email_q
    ]

    # --- Agency calls: no email, has phone ---
    agency_call_q = (
        db.query(SalesLead)
        .filter(
            (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
            SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
        )
        .order_by(PRIORITY_ORDER)
        .limit(10)
        .all()
    )
    agency_calls = [
        AgencyCallItem(
            id=l.id, provider_name=l.provider_name, state=l.state, city=l.city,
            phone=l.phone, status=l.status, priority=l.priority,
            is_contacted=l.is_contacted or False, notes=l.notes,
        )
        for l in agency_call_q
    ]

    # --- Investor emails ---
    investor_q = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None),
            Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .limit(10)
        .all()
    )
    investor_emails = [
        InvestorEmailItem(
            id=i.id, fund_name=i.fund_name, investor_type=i.investor_type,
            contact_name=i.contact_name, contact_email=i.contact_email,
            location=i.location, focus_stages=i.focus_stages or [],
            check_size_display=i.check_size_display, status=i.status,
            priority=i.priority, email_send_count=i.email_send_count or 0,
            last_email_sent_at=i.last_email_sent_at,
            relevance_reason=i.relevance_reason,
        )
        for i in investor_q
    ]

    # --- Stats ---
    total_leads = db.query(func.count(SalesLead.id)).scalar() or 0
    leads_with_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
    ).scalar() or 0
    leads_contacted = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,  # noqa: E712
    ).scalar() or 0
    leads_remaining_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        (SalesLead.last_email_sent_at.is_(None)) | (SalesLead.last_email_sent_at < today),
    ).scalar() or 0
    leads_no_email = db.query(func.count(SalesLead.id)).filter(
        (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
    ).scalar() or 0
    calls_remaining = db.query(func.count(SalesLead.id)).filter(
        SalesLead.phone.isnot(None), SalesLead.phone != "",
        SalesLead.is_contacted != True,  # noqa: E712
        SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
    ).scalar() or 0
    total_investors = db.query(func.count(Investor.id)).scalar() or 0
    investors_with_email = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
    ).scalar() or 0
    investors_contacted = db.query(func.count(Investor.id)).filter(
        Investor.email_send_count > 0,
    ).scalar() or 0
    investors_remaining = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
    ).scalar() or 0

    unsent_agency_emails = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
    ).scalar() or 0
    unsent_investor_emails = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
    ).scalar() or 0
    total_called = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,  # noqa: E712
        SalesLead.phone.isnot(None), SalesLead.phone != "",
    ).scalar() or 0
    total_with_phone = db.query(func.count(SalesLead.id)).filter(
        SalesLead.phone.isnot(None), SalesLead.phone != "",
    ).scalar() or 0

    stats = OutreachStats(
        total_leads=total_leads, leads_with_email=leads_with_email,
        leads_contacted=leads_contacted, leads_remaining_email=leads_remaining_email,
        leads_no_email=leads_no_email, calls_remaining=calls_remaining,
        total_investors=total_investors, investors_with_email=investors_with_email,
        investors_contacted=investors_contacted, investors_remaining=investors_remaining,
        unsent_agency_emails=unsent_agency_emails,
        unsent_investor_emails=unsent_investor_emails,
        total_called=total_called,
        total_with_phone=total_with_phone,
    )

    # --- Week progress (Mon–Fri) ---
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    week_progress: List[WeekDayProgress] = []
    for i, day_name in enumerate(day_names):
        day_start = week_start + timedelta(days=i)
        day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)

        emails_sent = db.query(func.count(SalesLead.id)).filter(
            SalesLead.last_email_sent_at >= day_start,
            SalesLead.last_email_sent_at <= day_end,
        ).scalar() or 0

        calls_made = db.query(func.count(SalesLead.id)).filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.called_at >= day_start,
            SalesLead.called_at <= day_end,
        ).scalar() or 0

        inv_emails_sent = db.query(func.count(Investor.id)).filter(
            Investor.last_email_sent_at >= day_start,
            Investor.last_email_sent_at <= day_end,
        ).scalar() or 0

        week_progress.append(WeekDayProgress(
            day=day_name, emails_sent=emails_sent,
            calls_made=calls_made, investor_emails_sent=inv_emails_sent,
        ))

    return DailyPlanResponse(
        agency_emails=agency_emails,
        agency_calls=agency_calls,
        investor_emails=investor_emails,
        stats=stats,
        week_progress=week_progress,
    )


# ─── Weekly Plan ───

@router.get("/weekly-plan", response_model=WeeklyPlanResponse)
def get_weekly_plan(
    week_offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Return weekly plan with pre-generated drafts.

    OPTIMIZED: Uses SQL LIMIT/OFFSET instead of loading all records.
    Past days show actual sent data; today/future show planned from sorted pool.
    Team members only see their assigned leads.
    """
    import math

    is_ceo = user.role == "admin" and user.email.endswith("@palmtai.com")
    is_team_member = not is_ceo
    user_id_str = str(user.id)

    today = _today_eastern()
    work_days = _week_work_days(week_offset)
    global_day_offset = _cumulative_days_before(week_offset)

    # ── Team members see only their assigned leads; CEO sees assigned-to-self first ──
    def _team_agency_filter(q):
        if is_team_member:
            return q.filter(SalesLead.assigned_to == user_id_str)
        return q

    def _team_call_filter(q):
        if is_team_member:
            return q.filter(SalesLead.assigned_to == user_id_str)
        return q

    SELF_ASSIGNED_FIRST = case(
        (SalesLead.assigned_to == user_id_str, 0),
        (SalesLead.assigned_to.isnot(None), 1),
        else_=2,
    )

    # ── Actionable email filter: unsent OR due for next drip step ──
    now_utc = datetime.now(timezone.utc)
    _actionable_email_filter = or_(
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
        and_(
            SalesLead.sequence_step < 5,
            SalesLead.next_email_scheduled_at.isnot(None),
            SalesLead.next_email_scheduled_at <= now_utc,
        ),
    )

    # ── Count totals with a single query per table (for pagination math) ──
    unsent_agency_base = _team_agency_filter(
        db.query(func.count(SalesLead.id))
        .filter(
            SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
            _actionable_email_filter,
        )
    )
    unsent_agency_total = unsent_agency_base.scalar() or 0

    unsent_inv_total = (
        db.query(func.count(Investor.id))
        .filter(
            Investor.contact_email.isnot(None), Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
            (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
        )
        .scalar() or 0
    )

    uncalled_total = _team_call_filter(
        db.query(func.count(SalesLead.id))
        .filter(
            SalesLead.phone.isnot(None), SalesLead.phone != "",
            SalesLead.is_contacted != True,  # noqa: E712
            SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
        )
    ).scalar() or 0

    # All agencies/investors with email (for total weeks calc)
    all_agency_email_count = _team_agency_filter(
        db.query(func.count(SalesLead.id))
        .filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES))
    ).scalar() or 0
    all_inv_email_count = (
        db.query(func.count(Investor.id))
        .filter(Investor.contact_email.isnot(None), Investor.contact_email != "",
                Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES))
        .scalar() or 0
    )

    total_days_agencies = math.ceil(all_agency_email_count / EMAILS_PER_DAY) if all_agency_email_count else 1
    total_days_investors = math.ceil(all_inv_email_count / INVESTORS_PER_DAY) if all_inv_email_count else 1
    total_days_calls = math.ceil(uncalled_total / CALLS_PER_DAY) if uncalled_total else 1
    total_days_needed = max(total_days_agencies, total_days_investors, total_days_calls, 1)

    days_accum = len(_week_work_days(0))
    total_weeks = 1
    while days_accum < total_days_needed:
        total_weeks += 1
        days_accum += 5

    # ── Track how many future-day items we've consumed ──
    future_agency_offset = 0
    future_inv_offset = 0
    future_call_offset = 0

    # Count future days before today in this week to set initial offsets
    for i, (day_name, day_date) in enumerate(work_days):
        if day_date >= today:
            break
        # Past days don't consume from the pool
    else:
        i = len(work_days)

    # For future days, we need a global offset based on all prior weeks' future days
    prior_future_days = max(global_day_offset - 0, 0)  # days consumed in prior weeks
    future_agency_offset = prior_future_days * EMAILS_PER_DAY
    future_inv_offset = prior_future_days * INVESTORS_PER_DAY
    future_call_offset = prior_future_days * CALLS_PER_DAY

    days: List[WeeklyDayPlan] = []

    for i, (day_name, day_date) in enumerate(work_days):
        day_start_utc = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
        day_end_utc = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)

        if day_date < today:
            # Past: query actual sent/called data (naturally limited by what happened)
            day_agencies = _team_agency_filter(
                db.query(SalesLead)
                .filter(SalesLead.last_email_sent_at >= day_start_utc,
                        SalesLead.last_email_sent_at <= day_end_utc,
                        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "")
            ).order_by(SalesLead.last_email_sent_at).all()
            if is_ceo:
                day_investors = (
                    db.query(Investor)
                    .filter(Investor.last_email_sent_at >= day_start_utc,
                            Investor.last_email_sent_at <= day_end_utc,
                            Investor.contact_email.isnot(None), Investor.contact_email != "")
                    .order_by(Investor.last_email_sent_at).all()
                )
            else:
                day_investors = []
            day_calls = _team_call_filter(
                db.query(SalesLead)
                .filter(SalesLead.is_contacted == True,  # noqa: E712
                        SalesLead.called_at >= day_start_utc, SalesLead.called_at <= day_end_utc)
            ).order_by(SalesLead.called_at).all()

        elif day_date == today:
            # Today: sent items + fill from unsent pool using LIMIT
            sent_today_agencies = _team_agency_filter(
                db.query(SalesLead)
                .filter(SalesLead.last_email_sent_at >= day_start_utc,
                        SalesLead.last_email_sent_at <= day_end_utc,
                        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "")
            ).order_by(SalesLead.last_email_sent_at).all()
            sent_ids = {l.id for l in sent_today_agencies}
            fill_a = max(EMAILS_PER_DAY - len(sent_today_agencies), 0)
            fill_q = _team_agency_filter(
                db.query(SalesLead)
                .filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                        _actionable_email_filter,
                        SalesLead.id.notin_(sent_ids) if sent_ids else True)
            )
            fill_agencies = fill_q.order_by(SELF_ASSIGNED_FIRST, PRIORITY_ORDER, SalesLead.created_at).limit(fill_a).all() if fill_a > 0 else []
            day_agencies = list(sent_today_agencies) + list(fill_agencies)

            if is_ceo:
                sent_today_investors = (
                    db.query(Investor)
                    .filter(Investor.last_email_sent_at >= day_start_utc,
                            Investor.last_email_sent_at <= day_end_utc,
                            Investor.contact_email.isnot(None), Investor.contact_email != "")
                    .order_by(Investor.last_email_sent_at).all()
                )
                sent_inv_ids = {inv.id for inv in sent_today_investors}
                fill_i = max(INVESTORS_PER_DAY - len(sent_today_investors), 0)
                fill_investors = (
                    db.query(Investor)
                    .filter(Investor.contact_email.isnot(None), Investor.contact_email != "",
                            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                            (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
                            Investor.id.notin_(sent_inv_ids) if sent_inv_ids else True)
                    .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
                    .limit(fill_i).all()
                ) if fill_i > 0 else []
                day_investors = list(sent_today_investors) + list(fill_investors)
            else:
                day_investors = []

            today_calls = _team_call_filter(
                db.query(SalesLead)
                .filter(SalesLead.is_contacted == True,  # noqa: E712
                        SalesLead.called_at >= day_start_utc, SalesLead.called_at <= day_end_utc)
            ).order_by(SalesLead.called_at).all()
            fill_c = max(CALLS_PER_DAY - len(today_calls), 0)
            fill_call_q = _team_call_filter(
                db.query(SalesLead)
                .filter(SalesLead.phone.isnot(None), SalesLead.phone != "",
                        SalesLead.is_contacted != True,  # noqa: E712
                        SalesLead.status.notin_(EXCLUDED_CALL_STATUSES))
            )
            fill_call_list = fill_call_q.order_by(SELF_ASSIGNED_FIRST, PRIORITY_ORDER, TZ_ORDER, SalesLead.created_at).limit(fill_c).all() if fill_c > 0 else []
            day_calls = list(today_calls) + list(fill_call_list)

        else:
            # Future: use LIMIT + OFFSET from sorted pool
            day_agencies = _team_agency_filter(
                db.query(SalesLead)
                .filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                        _actionable_email_filter)
            ).order_by(SELF_ASSIGNED_FIRST, PRIORITY_ORDER, SalesLead.created_at).offset(future_agency_offset).limit(EMAILS_PER_DAY).all()
            future_agency_offset += EMAILS_PER_DAY

            if is_ceo:
                day_investors = (
                    db.query(Investor)
                    .filter(Investor.contact_email.isnot(None), Investor.contact_email != "",
                            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                            (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)))
                    .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
                    .offset(future_inv_offset).limit(INVESTORS_PER_DAY).all()
                )
                future_inv_offset += INVESTORS_PER_DAY
            else:
                day_investors = []

            day_calls = _team_call_filter(
                db.query(SalesLead)
                .filter(SalesLead.phone.isnot(None), SalesLead.phone != "",
                        SalesLead.is_contacted != True,  # noqa: E712
                        SalesLead.status.notin_(EXCLUDED_CALL_STATUSES))
            ).order_by(SELF_ASSIGNED_FIRST, PRIORITY_ORDER, TZ_ORDER, SalesLead.created_at).offset(future_call_offset).limit(CALLS_PER_DAY).all()
            future_call_offset += CALLS_PER_DAY

        # Build response items
        agency_drafts = []
        for lead in day_agencies:
            subj, body = _build_agency_html(
                lead.provider_name, lead.city or "your area", lead.state or "US",
            )
            agency_drafts.append(AgencyDraftItem(
                id=lead.id, provider_name=lead.provider_name,
                state=lead.state, city=lead.city,
                contact_email=lead.contact_email, contact_name=lead.contact_name,
                phone=lead.phone, status=lead.status, priority=lead.priority,
                email_send_count=lead.email_send_count or 0,
                last_email_sent_at=lead.last_email_sent_at,
                draft_subject=subj, draft_body=body, is_html=True,
            ))

        investor_drafts = []
        for inv in day_investors:
            focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
            subj, body = _build_investor_text(
                inv.fund_name, inv.contact_name or "", focus,
            )
            investor_drafts.append(InvestorDraftItem(
                id=inv.id, fund_name=inv.fund_name,
                investor_type=inv.investor_type,
                contact_name=inv.contact_name, contact_email=inv.contact_email,
                location=inv.location, focus_stages=inv.focus_stages or [],
                check_size_display=inv.check_size_display,
                status=inv.status, priority=inv.priority,
                email_send_count=inv.email_send_count or 0,
                last_email_sent_at=inv.last_email_sent_at,
                draft_subject=subj, draft_body=body, is_html=False,
            ))

        calls = [
            AgencyCallItem(
                id=l.id, provider_name=l.provider_name, state=l.state,
                city=l.city, phone=l.phone, status=l.status,
                priority=l.priority, is_contacted=l.is_contacted or False,
                notes=l.notes, called_at=l.called_at,
                callback_requested=l.callback_requested or False,
                callback_date=l.callback_date, callback_notes=l.callback_notes,
                assigned_to=l.assigned_to, contact_name=l.contact_name,
                contact_email=l.contact_email,
            )
            for l in day_calls
        ]

        days.append(WeeklyDayPlan(
            date=day_date.isoformat(), day_name=day_name,
            is_today=(day_date == today),
            agency_drafts=agency_drafts, investor_drafts=investor_drafts, calls=calls,
        ))

    # ── Stats: 2 single-query aggregates instead of 12 separate COUNT queries ──
    lead_stats = db.query(
        func.count().label("total"),
        func.sum(case((and_(SalesLead.contact_email.isnot(None), SalesLead.contact_email != ""), 1), else_=0)).label("has_email"),
        func.sum(case((SalesLead.is_contacted == True, 1), else_=0)).label("contacted"),  # noqa: E712
        func.sum(case((and_(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                           SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES)), 1), else_=0)).label("remaining_email"),
        func.sum(case((or_(SalesLead.contact_email.is_(None), SalesLead.contact_email == ""), 1), else_=0)).label("no_email"),
        func.sum(case((and_(SalesLead.phone.isnot(None), SalesLead.phone != "",
                           SalesLead.is_contacted != True,
                           SalesLead.status.notin_(EXCLUDED_CALL_STATUSES)), 1), else_=0)).label("calls_remaining"),
        func.sum(case((and_(SalesLead.is_contacted == True,
                           SalesLead.phone.isnot(None), SalesLead.phone != ""), 1), else_=0)).label("total_called"),
        func.sum(case((and_(SalesLead.phone.isnot(None), SalesLead.phone != ""), 1), else_=0)).label("total_phone"),
    ).one()

    inv_stats = db.query(
        func.count().label("total"),
        func.sum(case((and_(Investor.contact_email.isnot(None), Investor.contact_email != ""), 1), else_=0)).label("has_email"),
        func.sum(case((Investor.email_send_count > 0, 1), else_=0)).label("contacted"),
        func.sum(case((and_(Investor.contact_email.isnot(None), Investor.contact_email != "",
                           Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES)), 1), else_=0)).label("remaining"),
    ).one()

    stats = OutreachStats(
        total_leads=lead_stats.total or 0,
        leads_with_email=lead_stats.has_email or 0,
        leads_contacted=lead_stats.contacted or 0,
        leads_remaining_email=lead_stats.remaining_email or 0,
        leads_no_email=lead_stats.no_email or 0,
        calls_remaining=lead_stats.calls_remaining or 0,
        total_investors=inv_stats.total or 0,
        investors_with_email=inv_stats.has_email or 0,
        investors_contacted=inv_stats.contacted or 0,
        investors_remaining=inv_stats.remaining or 0,
        unsent_agency_emails=unsent_agency_total,
        unsent_investor_emails=unsent_inv_total,
        total_called=lead_stats.total_called or 0,
        total_with_phone=lead_stats.total_phone or 0,
    )

    all_covered = (global_day_offset + len(work_days) >= total_days_needed)
    week_start_date = work_days[0][1] if work_days else today
    week_end_date = work_days[-1][1] if work_days else today

    return WeeklyPlanResponse(
        days=days, stats=stats,
        week_start=week_start_date.isoformat(), week_end=week_end_date.isoformat(),
        week_offset=week_offset, total_weeks=total_weeks,
        all_contacts_covered=all_covered,
    )


