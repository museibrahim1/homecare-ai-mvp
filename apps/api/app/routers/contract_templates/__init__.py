"""
Contract Templates package — upload, OCR-scan, version, and manage templates.

Split out of a single 828-line contract_templates.py:
  - common.py    gallery dir resolution + _template_to_response helper
  - schemas.py   Pydantic models
  - crud.py      upload, list, field registry, preview (specific paths)
  - gallery.py   pre-made starter template gallery list/clone
  - detail.py    /{template_id} get/delete/rescan/mapping/reconcile

ROUTE ORDER MATTERS: all specific-path routers (crud, gallery) are included
BEFORE detail (which owns the catch-all /{template_id}), otherwise FastAPI
would try to parse "preview"/"registry"/"gallery" as a UUID. `router` is
re-exported so `from app.routers.contract_templates import router`
(mounted at /contract-templates) keeps working unchanged.
"""

from fastapi import APIRouter

from .crud import router as _crud_router
from .gallery import router as _gallery_router
from .detail import router as _detail_router

router = APIRouter()
router.include_router(_crud_router)
router.include_router(_gallery_router)
router.include_router(_detail_router)
