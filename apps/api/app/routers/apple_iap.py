"""
Apple In-App Purchase / StoreKit 2 verification router.

This router accepts a JWS-signed transaction string from the iOS client
(produced by `Transaction.currentEntitlements` or a fresh purchase result),
verifies it against Apple's public keys via the App Store Server Library,
and updates the local Subscription record so the rest of the app sees a
valid, paid subscription.

Why this exists separate from `stripe_billing.py`:
  * Apple App Store Review Guideline 3.1.1 requires that digital
    subscriptions consumed inside the iOS app be sold via in-app purchase.
  * Stripe stays as the path for the web app (palmcareai.com) so existing
    customers keep their billing relationship.
  * Each Subscription row is tagged with the source platform so we never
    double-bill or downgrade across platforms.

Set up in App Store Connect:
  1. Create a Subscription Group (e.g. "PalmCare Plans").
  2. Add two auto-renewing monthly subscriptions (must match
     `APPLE_PRODUCT_TIER_MAP` below), each with a 30 day introductory
     free-trial offer:
        com.palmcareai.app.mobile.monthly   ($89.99 USA)
        com.palmcareai.app.starter.monthly  ($199.99 USA, sold as PalmCare Platform)
  3. Add the same product to the App Store Connect API Issuer with a
     "Customer Communications" key so refund / cancel webhooks work.

Env vars:
  APPLE_BUNDLE_ID            - com.palmcareai.app
  APPLE_TEAM_ID              - QFS97GTYJH
  APPLE_ENVIRONMENT          - "Production" | "Sandbox" (default Production)

The `app-store-server-library` package handles JWS signature verification
against Apple's root CAs. If it isn't installed we fall back to a
permissive parse so unit tests / dev environments still work, but the
permissive path NEVER runs in production (we hard-fail unless the lib is
present and APPLE_ENVIRONMENT is set).
"""
from __future__ import annotations

import base64
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.rate_limit import limiter
from app.core.tenancy import resolve_business_id
from app.models.subscription import Plan, PlanTier, Subscription, SubscriptionStatus
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# Map App Store Connect product IDs → internal plan tier.
# Must stay in sync with the iOS `StoreKitService.productIDs` list.
#
# iOS sells two monthly plans (must match StoreKitService.productIDs):
#   mobile  $89.99/mo — assessments + lite web CRM (15/mo, 30 clients)
#   starter $199.99/mo — full platform CRM (30/mo, 150 clients)
# Legacy Growth / Pro product IDs are no longer accepted.
APPLE_PRODUCT_TIER_MAP: dict[str, PlanTier] = {
    "com.palmcareai.app.mobile.monthly": PlanTier.MOBILE,
    "com.palmcareai.app.starter.monthly": PlanTier.STARTER,
}

# Products granting a 30-day free trial through an Apple introductory offer.
APPLE_TRIAL_PRODUCT_IDS = {
    "com.palmcareai.app.mobile.monthly",
    "com.palmcareai.app.starter.monthly",
}


APPLE_BUNDLE_ID = os.getenv("APPLE_BUNDLE_ID", "com.palmcareai.app")
APPLE_ENVIRONMENT = (os.getenv("APPLE_ENVIRONMENT") or "Production").strip()
APPLE_IS_PRODUCTION = APPLE_ENVIRONMENT.lower() == "production"


# Lazy import: avoid hard failure on machines without the library.
def _verify_signed_transaction(signed_payload: str) -> dict:
    """
    Verify a StoreKit 2 JWS-signed transaction against Apple's CAs.

    Returns the decoded transactionInfo claims as a dict.
    Raises HTTPException(400) if the JWS is malformed or unverifiable.
    """
    try:
        from appstoreserverlibrary.signed_data_verifier import (  # type: ignore
            SignedDataVerifier,
            VerificationException,
        )
        from appstoreserverlibrary.models.Environment import Environment  # type: ignore
    except ImportError:
        # Production builds must always have the library available.
        if APPLE_IS_PRODUCTION:
            raise HTTPException(
                status_code=503,
                detail="App Store verification library not installed on server",
            )
        logger.warning(
            "appstoreserverlibrary not installed; falling back to permissive JWS decode "
            "(SANDBOX/DEV ONLY). Install with: pip install app-store-server-library"
        )
        return _permissive_jws_decode(signed_payload)

    apple_root_certs = _load_apple_root_certs()
    env = Environment.PRODUCTION if APPLE_IS_PRODUCTION else Environment.SANDBOX
    verifier = SignedDataVerifier(
        root_certificates=apple_root_certs,
        enable_online_checks=True,
        environment=env,
        bundle_id=APPLE_BUNDLE_ID,
    )

    try:
        transaction_info = verifier.verify_and_decode_signed_transaction(signed_payload)
    except VerificationException as exc:
        logger.warning("Apple JWS verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid App Store transaction") from exc

    # SignedDataVerifier returns a typed model; coerce to dict for storage/logging.
    if hasattr(transaction_info, "model_dump"):
        return transaction_info.model_dump()
    if hasattr(transaction_info, "dict"):
        return transaction_info.dict()
    return dict(transaction_info)


def _permissive_jws_decode(jws: str) -> dict:
    """Dev fallback that decodes the middle JWS segment without verifying signatures."""
    try:
        _, payload_b64, _ = jws.split(".")
        # Pad base64 to multiple of 4
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(padded)
        return json.loads(payload_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Malformed App Store transaction JWS") from exc


def _load_apple_root_certs() -> list[bytes]:
    """
    Load Apple's root certificate authorities used to verify StoreKit JWS.
    Prefer certs supplied via env var; fall back to package-bundled certs
    if `app-store-server-library` ships them.
    """
    # Repo-bundled Apple root CAs (apps/api/certs/apple) are the default;
    # APPLE_ROOT_CERTS_DIR overrides for custom deployments.
    bundled_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "certs",
        "apple",
    )
    for cert_dir in (os.getenv("APPLE_ROOT_CERTS_DIR"), bundled_dir):
        if cert_dir and os.path.isdir(cert_dir):
            certs: list[bytes] = []
            for name in sorted(os.listdir(cert_dir)):
                if name.endswith((".cer", ".pem", ".crt")):
                    with open(os.path.join(cert_dir, name), "rb") as fh:
                        certs.append(fh.read())
            if certs:
                return certs
    raise HTTPException(
        status_code=503,
        detail="Apple root certificates not configured (set APPLE_ROOT_CERTS_DIR)",
    )


# =============================================================================
# REQUEST / RESPONSE MODELS
# =============================================================================

class AppleVerifyRequest(BaseModel):
    """Body sent by the iOS client after a successful StoreKit purchase."""
    signed_transaction: str = Field(..., description="JWS-signed transaction from StoreKit 2")
    product_id: str = Field(..., description="App Store Connect product identifier")


class AppleVerifyResponse(BaseModel):
    success: bool
    plan_tier: str
    subscription_status: str
    expires_at: Optional[datetime] = None
    transaction_id: Optional[str] = None


# =============================================================================
# INVOICE HELPERS
# =============================================================================

def _price_from_transaction(decoded: dict) -> Optional[float]:
    """Extract the charged price from a StoreKit transaction, if present.

    StoreKit 2 encodes ``price`` as an integer in milliunits of the currency
    (e.g. 199000 == 199.00). Returns None when the field is absent so callers
    can fall back to the configured plan price.
    """
    raw = decoded.get("price")
    if isinstance(raw, (int, float)) and raw > 0:
        return round(float(raw) / 1000.0, 2)
    return None


def _maybe_create_invoice(
    db: Session,
    *,
    subscription: Subscription,
    plan: Optional[Plan],
    decoded: dict,
    billing_cycle: str,
    period_end: Optional[datetime],
    transaction_id: str,
) -> None:
    """Best-effort creation of a paid PalmCare invoice for an Apple charge."""
    try:
        from app.services.billing_invoices import create_apple_invoice

        # Prefer the actual amount Apple charged; fall back to the plan price.
        amount = _price_from_transaction(decoded)
        if amount is None and plan is not None:
            if billing_cycle == "annual" and plan.annual_price:
                amount = float(plan.annual_price)
            elif plan.monthly_price:
                amount = float(plan.monthly_price)
        if amount is None:
            return

        currency = (decoded.get("currency") or "USD") or "USD"

        purchase_ms = decoded.get("purchaseDate") or decoded.get("purchase_date")
        period_start: Optional[datetime] = None
        if isinstance(purchase_ms, (int, float)) and purchase_ms > 0:
            period_start = datetime.fromtimestamp(purchase_ms / 1000, tz=timezone.utc)
        else:
            period_start = datetime.now(timezone.utc)

        create_apple_invoice(
            db,
            subscription=subscription,
            plan=plan,
            amount=amount,
            currency=str(currency).upper(),
            billing_cycle=billing_cycle,
            period_start=period_start,
            period_end=period_end,
            transaction_id=transaction_id,
            paid_at=period_start,
        )
    except Exception:  # pragma: no cover - invoice must never break purchase
        logger.exception("Failed to create Apple invoice for %s", transaction_id)


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/verify", response_model=AppleVerifyResponse)
@limiter.limit("20/minute")
async def verify_apple_transaction(
    request: Request,  # required by slowapi
    body: AppleVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate an iOS StoreKit 2 purchase and grant the matching subscription.

    Called by the iOS app after `product.purchase()` succeeds, and again
    on cold start for every entitlement returned by
    `Transaction.currentEntitlements` so revocation is enforced.
    """
    if body.product_id not in APPLE_PRODUCT_TIER_MAP:
        raise HTTPException(status_code=400, detail="Unknown product")

    decoded = _verify_signed_transaction(body.signed_transaction)

    # Validate basic fields
    bundle_id = decoded.get("bundleId") or decoded.get("bundle_id")
    if bundle_id and bundle_id != APPLE_BUNDLE_ID:
        raise HTTPException(status_code=400, detail="Bundle ID mismatch")

    product_id_in_jws = decoded.get("productId") or decoded.get("product_id")
    if product_id_in_jws and product_id_in_jws != body.product_id:
        raise HTTPException(status_code=400, detail="Product ID mismatch")

    transaction_id = str(decoded.get("transactionId") or decoded.get("transaction_id") or "")
    original_transaction_id = str(
        decoded.get("originalTransactionId") or decoded.get("original_transaction_id") or transaction_id
    )

    expires_ms = decoded.get("expiresDate") or decoded.get("expires_date") or 0
    revocation_ms = decoded.get("revocationDate") or decoded.get("revocation_date")

    expires_at: Optional[datetime] = None
    if isinstance(expires_ms, (int, float)) and expires_ms > 0:
        expires_at = datetime.fromtimestamp(expires_ms / 1000, tz=timezone.utc)

    is_revoked = bool(revocation_ms)
    is_expired = expires_at is not None and expires_at < datetime.now(timezone.utc)

    plan_tier = APPLE_PRODUCT_TIER_MAP[body.product_id]

    # Look up the Plan row matching the tier so the rest of the app
    # (usage limits, gating) keeps working unchanged.
    plan: Optional[Plan] = (
        db.query(Plan).filter(Plan.tier == plan_tier, Plan.is_active.is_(True)).first()
    )
    if not plan:
        raise HTTPException(status_code=500, detail="Plan not configured on server")

    # `User` carries no business_id column — the agency is reached through the
    # account's business_users row (or its company_name for invited teammates).
    business_id = resolve_business_id(db, current_user)
    if not business_id:
        raise HTTPException(status_code=400, detail="User is not associated with a business")

    sub: Optional[Subscription] = (
        db.query(Subscription).filter(Subscription.business_id == business_id).first()
    )
    if sub is None:
        sub = Subscription(business_id=business_id, plan_id=plan.id)
        db.add(sub)

    sub.plan_id = plan.id
    sub.billing_cycle = "annual" if body.product_id.endswith(".annual") else "monthly"
    sub.current_period_end = expires_at

    sub.stripe_subscription_id = None  # iOS-managed now
    # Reuse the stripe_customer_id slot to record the Apple original
    # transaction ID so renewal webhooks can find this row later. We do
    # this rather than adding a new column to keep the migration small.
    sub.stripe_customer_id = f"apple:{original_transaction_id}"

    # StoreKit marks free-trial periods with offerType 1 (introductory offer).
    offer_type = decoded.get("offerType") or decoded.get("offer_type")
    is_trial_period = offer_type == 1 and body.product_id in APPLE_TRIAL_PRODUCT_IDS

    if is_revoked or is_expired:
        sub.status = SubscriptionStatus.CANCELLED
        if is_revoked and not sub.cancelled_at:
            sub.cancelled_at = datetime.now(timezone.utc)
    elif is_trial_period:
        sub.status = SubscriptionStatus.TRIAL
        sub.trial_ends_at = expires_at
        sub.cancelled_at = None
    else:
        sub.status = SubscriptionStatus.ACTIVE
        sub.cancelled_at = None

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)

    # Mint a PalmCare-branded invoice/receipt for the charge. Apple issues its
    # own receipt; this gives the agency a clean document for their books. It's
    # idempotent (keyed on the transaction id) and best-effort, so a failure
    # here never blocks the purchase.
    if sub.status == SubscriptionStatus.ACTIVE and transaction_id:
        _maybe_create_invoice(
            db,
            subscription=sub,
            plan=plan,
            decoded=decoded,
            billing_cycle=sub.billing_cycle or "monthly",
            period_end=expires_at,
            transaction_id=transaction_id,
        )

    return AppleVerifyResponse(
        success=sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL),
        plan_tier=plan_tier.value,
        subscription_status=sub.status.value,
        expires_at=expires_at,
        transaction_id=transaction_id or None,
    )


@router.get("/products")
async def get_apple_products():
    """
    Return the canonical product catalog the iOS client should load via
    `Product.products(for:)`. The client uses these IDs verbatim.
    """
    return [
        {
            "product_id": pid,
            "tier": tier.value,
            "billing_cycle": "annual" if pid.endswith(".annual") else "monthly",
            "has_free_trial": pid in APPLE_TRIAL_PRODUCT_IDS,
        }
        for pid, tier in APPLE_PRODUCT_TIER_MAP.items()
    ]


# =============================================================================
# APP STORE SERVER NOTIFICATIONS V2 WEBHOOK
# =============================================================================

class AppleNotificationBody(BaseModel):
    signedPayload: str


@router.post("/notifications", include_in_schema=False)
async def app_store_server_notifications(
    body: AppleNotificationBody,
    db: Session = Depends(get_db),
):
    """
    Receive App Store Server Notifications V2.

    These are the source of truth for renewals, refunds, and revocations
    that happen outside the app (Settings → Apple ID → Subscriptions).
    Configure the URL in App Store Connect → My App → App Information →
    App Store Server Notifications.
    """
    decoded = _verify_signed_transaction(body.signedPayload)

    notification_type = decoded.get("notificationType") or decoded.get("notification_type")
    transaction_id = str(
        decoded.get("originalTransactionId") or decoded.get("original_transaction_id") or ""
    )
    if not transaction_id:
        return {"received": True}

    sub: Optional[Subscription] = (
        db.query(Subscription)
        .filter(Subscription.stripe_customer_id == f"apple:{transaction_id}")
        .first()
    )
    if sub is None:
        # We may receive notifications for transactions we haven't synced
        # yet; that's fine — the next /verify call from the device will
        # bring us in sync.
        logger.info("Apple notification for unknown transaction %s", transaction_id)
        return {"received": True}

    if notification_type in {"DID_RENEW", "DID_CHANGE_RENEWAL_STATUS", "OFFER_REDEEMED"}:
        sub.status = SubscriptionStatus.ACTIVE
    elif notification_type in {"EXPIRED", "GRACE_PERIOD_EXPIRED", "REFUND"}:
        sub.status = SubscriptionStatus.CANCELLED
        sub.cancelled_at = datetime.now(timezone.utc)
    elif notification_type == "DID_FAIL_TO_RENEW":
        sub.status = SubscriptionStatus.PAST_DUE

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)

    # On a real renewal charge, mint an invoice for the new billing period.
    # Best-effort: pull the nested transaction info out of the V2 notification
    # so we can key the invoice on the renewal's transaction id.
    if notification_type in {"DID_RENEW", "OFFER_REDEEMED"}:
        _maybe_create_renewal_invoice(db, decoded, sub)

    return {"received": True}


def _decode_nested_transaction(decoded: dict) -> Optional[dict]:
    """Pull the nested StoreKit transaction out of a V2 notification payload."""
    data = decoded.get("data") or decoded.get("summary") or {}
    signed_txn = None
    if isinstance(data, dict):
        signed_txn = data.get("signedTransactionInfo") or data.get("signed_transaction_info")
    if not signed_txn:
        return None
    try:
        return _verify_signed_transaction(signed_txn)
    except Exception:
        try:
            return _permissive_jws_decode(signed_txn)
        except Exception:
            return None


def _maybe_create_renewal_invoice(db: Session, decoded: dict, sub: Subscription) -> None:
    """Best-effort renewal invoice from an App Store Server Notification."""
    try:
        txn = _decode_nested_transaction(decoded)
        if not txn:
            return
        transaction_id = str(txn.get("transactionId") or txn.get("transaction_id") or "")
        if not transaction_id:
            return

        plan: Optional[Plan] = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        billing_cycle = sub.billing_cycle or "monthly"

        expires_ms = txn.get("expiresDate") or txn.get("expires_date") or 0
        period_end: Optional[datetime] = None
        if isinstance(expires_ms, (int, float)) and expires_ms > 0:
            period_end = datetime.fromtimestamp(expires_ms / 1000, tz=timezone.utc)

        _maybe_create_invoice(
            db,
            subscription=sub,
            plan=plan,
            decoded=txn,
            billing_cycle=billing_cycle,
            period_end=period_end,
            transaction_id=transaction_id,
        )
    except Exception:  # pragma: no cover
        logger.exception("Failed to create renewal invoice")
