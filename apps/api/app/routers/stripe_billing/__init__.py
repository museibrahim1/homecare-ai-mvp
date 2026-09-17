"""
Subscription package (mounted at /billing).

Two payment channels, one Subscription row per business:
  * Apple In-App Purchase (app.routers.apple_iap) inside the iOS app.
  * Stripe Checkout + Customer Portal for the web (checkout.py, webhooks.py).

`router` is re-exported so `from app.routers.stripe_billing import router`
(mounted at /billing) keeps working.
"""

from fastapi import APIRouter

from .plans import router as _plans_router
from .billing import router as _billing_router
from .checkout import router as _checkout_router
from .webhooks import router as _webhooks_router

router = APIRouter()
router.include_router(_plans_router)
router.include_router(_billing_router)
router.include_router(_checkout_router)
router.include_router(_webhooks_router)
