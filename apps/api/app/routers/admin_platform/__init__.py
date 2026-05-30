"""
Platform Admin package.

Comprehensive admin dashboard endpoints for platform management.
Split out of a single 1,173-line admin_platform.py:
  - common.py       require_platform_admin auth dependency
  - schemas.py      Pydantic models
  - analytics.py    analytics overview/businesses/trends + subscription management
  - compliance.py   compliance alerts/summary + audit logs
  - users.py        platform user management
  - support.py      support tickets + stats
  - system.py       system health/metrics + announcements

`router` is re-exported so `from app.routers.admin_platform import router`
(mounted at /platform) keeps working unchanged.
"""

from fastapi import APIRouter

from .analytics import router as _analytics_router
from .compliance import router as _compliance_router
from .users import router as _users_router
from .support import router as _support_router
from .system import router as _system_router

router = APIRouter()
router.include_router(_analytics_router)
router.include_router(_compliance_router)
router.include_router(_users_router)
router.include_router(_support_router)
router.include_router(_system_router)
