"""
Scheduler & Goals package — team demo scheduling, auto-tasks, goal tracking.

Split out of a single 841-line scheduler.py:
  - common.py      shared in-memory stores + state/region constants
  - schemas.py     Pydantic models
  - territory.py   territory/state assignments + CRM autocomplete search
  - demos.py       scheduled demos CRUD
  - goals.py       team goals + auto-generation
  - marketing.py   marketing assets, AI generation, visual flyer generation

`router` is re-exported so `from app.routers.scheduler import router`
(mounted at /admin/scheduler) keeps working unchanged.
"""

from fastapi import APIRouter, Depends

from app.core.deps import require_permission

from .territory import router as _territory_router
from .demos import router as _demos_router
from .goals import router as _goals_router
from .marketing import router as _marketing_router

# The whole /admin/scheduler surface (team demos, goals, marketing assets, and
# the internal sales/investor CRM autocomplete) is staff-only. Gate it at the
# router level with the same permission the sibling /outreach router uses, so a
# regular tenant user can't read or mutate the company's internal CRM. The CEO
# (@palmtai.com admin) always passes require_permission.
router = APIRouter(dependencies=[Depends(require_permission("command_center"))])
router.include_router(_territory_router)
router.include_router(_demos_router)
router.include_router(_goals_router)
router.include_router(_marketing_router)
