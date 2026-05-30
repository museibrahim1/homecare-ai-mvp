"""
Sales Leads package — CEO-ONLY.

Private CRM for outbound sales campaigns (data sourced from the CMS Provider
Data API). Only accessible to platform admin accounts (@palmtai.com).

Split out of a single 2,591-line sales_leads.py into focused modules:
  - common.py        brand colors, email wrapper/templates, state names,
                     drip-sequence cadence, _auto_start_sequence
  - schemas.py       Pydantic request/response models
  - crud.py          lead list, stats, email-template listing/preview
  - campaigns.py     campaign send, drip-sequence launch/process/status, analytics, CMS import
  - detail.py        lead detail/update, bulk operations, seeding
  - email_actions.py per-lead send, open/response logging, Resend webhook
  - internal.py      cron-key-authenticated automation endpoints

`router` and `_auto_start_sequence` are re-exported so existing imports
(`from app.routers.sales_leads import router` / `_auto_start_sequence`) keep
working unchanged.
"""

from fastapi import APIRouter

from .common import _auto_start_sequence  # noqa: F401  (re-exported for outreach package)

from .crud import router as _crud_router
from .campaigns import router as _campaigns_router
from .detail import router as _detail_router
from .email_actions import router as _email_actions_router
from .internal import router as _internal_router

router = APIRouter()
router.include_router(_crud_router)
router.include_router(_campaigns_router)
router.include_router(_detail_router)
router.include_router(_email_actions_router)
router.include_router(_internal_router)
