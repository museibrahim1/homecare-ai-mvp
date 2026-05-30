"""
Admin package — platform-admin business approval and management endpoints.

Split out of a single 805-line admin.py:
  - common.py        require_platform_admin auth dependency (HIPAA-aware)
  - businesses.py    business listings, approval/suspend/reactivate, documents
  - quick_setup.py   demo onboarding quick-setup flow
  - maintenance.py   database clear-all, stats, orphaned-data cleanup

`router` is re-exported so `from app.routers.admin import router`
(mounted at /admin) keeps working unchanged.
"""

from fastapi import APIRouter

from .businesses import router as _businesses_router
from .quick_setup import router as _quick_setup_router
from .maintenance import router as _maintenance_router

router = APIRouter()
router.include_router(_businesses_router)
router.include_router(_quick_setup_router)
router.include_router(_maintenance_router)
