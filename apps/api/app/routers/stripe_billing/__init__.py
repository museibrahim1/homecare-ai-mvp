"""
Subscription read package (mounted at /billing).

Payments and subscription management have moved to Apple In-App Purchase
(see app.routers.apple_iap). This package now ONLY exposes read-only
subscription/plan endpoints so the web app can display the current plan and
usage. All Stripe checkout/portal/webhook/signup code has been removed.

`router` is re-exported so `from app.routers.stripe_billing import router`
(mounted at /billing) keeps working.
"""

from fastapi import APIRouter

from .plans import router as _plans_router
from .billing import router as _billing_router

router = APIRouter()
router.include_router(_plans_router)
router.include_router(_billing_router)
