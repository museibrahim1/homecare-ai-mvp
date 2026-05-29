"""
Outreach package — CEO-ONLY.

Daily/weekly outreach plan, draft generation, send tracking, digests, and
data-maintenance crons for agency sales leads and investor fundraising.
Only accessible to platform admin accounts (@palmtai.com).

Split out of a single 2,845-line outreach.py into focused modules:
  - common.py       shared constants, timezone helpers, email templates
  - schemas.py      Pydantic request/response models
  - plan.py         /daily-plan, /weekly-plan
  - calls.py        call logging, callbacks, lead assignment
  - drafts.py       draft generation, approval, batch send
  - digest.py       weekly summary, daily digest emails, cron data feeds
  - maintenance.py  past-call logging, data fixes, audits, sequence repair

`router` and the helper names below are re-exported so existing imports
(`from app.routers.outreach import router`, and agent.py's internal imports)
keep working unchanged.
"""

from fastapi import APIRouter

# Re-export shared symbols that other modules (e.g. agent.py) import directly.
from .common import (  # noqa: F401
    _week_work_days,
    _cumulative_days_before,
    _build_agency_html,
    _build_investor_text,
    _now_eastern,
    _today_eastern,
    _today_start,
    _week_bounds,
    EMAILS_PER_DAY,
    INVESTORS_PER_DAY,
    CALLS_PER_DAY,
    BUSINESS_TZ,
    EXCLUDED_LEAD_STATUSES,
    EXCLUDED_CALL_STATUSES,
    EXCLUDED_INVESTOR_STATUSES,
    PRIORITY_ORDER,
    INVESTOR_PRIORITY_ORDER,
)

from .plan import router as _plan_router
from .calls import router as _calls_router
from .drafts import router as _drafts_router
from .digest import router as _digest_router
from .maintenance import router as _maintenance_router

router = APIRouter()
router.include_router(_plan_router)
router.include_router(_calls_router)
router.include_router(_drafts_router)
router.include_router(_digest_router)
router.include_router(_maintenance_router)
