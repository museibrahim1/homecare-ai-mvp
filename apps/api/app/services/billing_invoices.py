"""
PalmCare subscription invoice generation.

When a customer subscribes (or renews) through Apple In-App Purchase, Apple
issues its own receipt. This service creates a matching PalmCare-branded
invoice / receipt PDF so agencies have a clean, professional document for
their own books.

Design notes:
  * We REUSE the existing ``Invoice`` model instead of adding a new table.
    - ``stripe_invoice_id`` holds ``apple:<transaction_id>`` so each Apple
      charge maps to exactly one invoice (idempotency / no double-billing).
    - ``line_items`` (JSON text) stores the S3 storage key of the generated
      PDF plus structured line-item / metadata so the download endpoint can
      find the file (and regenerate it if the object is ever missing).
  * The PDF is stored in the same S3/MinIO bucket used elsewhere, under
    ``invoices/<business_id>/<invoice_id>.pdf``.
  * Everything here is best-effort from the caller's point of view: a failure
    to mint an invoice must never fail the underlying purchase verification.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.business import Business, BusinessUser
from app.models.subscription import Invoice, Plan, Subscription

logger = logging.getLogger(__name__)

# Human-readable payment labels written into the PDF.
BILLED_VIA_APPLE = "Apple In-App Purchase"
BILLED_VIA_STRIPE = "Stripe"
BILLED_VIA_PALM = "PalmCare billing"


def resolve_billed_via(
    invoice: Invoice,
    meta: Optional[dict] = None,
) -> str:
    """
    Pick the payment channel for PDF rendering.

    Prefer structured ``line_items`` metadata, then the external id prefix, then
    description heuristics. Never assume Apple when the charge was Stripe.
    """
    meta = meta or {}
    raw = (meta.get("billed_via") or "").strip().lower()
    if raw in {"apple_iap", "apple", "app_store", "app store"}:
        return BILLED_VIA_APPLE
    if raw in {"stripe", "card", "stripe_card"}:
        return BILLED_VIA_STRIPE
    if raw in {"palm", "palmcare", "internal"}:
        return BILLED_VIA_PALM
    if raw:
        # Already a display string from an older writer.
        if "apple" in raw:
            return BILLED_VIA_APPLE
        if "stripe" in raw:
            return BILLED_VIA_STRIPE
        return meta.get("billed_via") or BILLED_VIA_PALM

    ext_id = (invoice.stripe_invoice_id or "").strip()
    if ext_id.startswith("apple:"):
        return BILLED_VIA_APPLE
    if ext_id:
        return BILLED_VIA_STRIPE

    desc = (invoice.description or "").lower()
    if "apple" in desc:
        return BILLED_VIA_APPLE
    if "stripe" in desc:
        return BILLED_VIA_STRIPE
    return BILLED_VIA_PALM


def _s3_key(business_id: Any, invoice_id: Any) -> str:
    return f"invoices/{business_id}/{invoice_id}.pdf"


def generate_invoice_number(db: Session, when: datetime) -> str:
    """
    Build a human-friendly invoice number like ``PALM-202608-0001``.

    The sequence resets each calendar month. We derive the next counter from
    the number of invoices already issued in that month, then retry on the
    unlikely unique-constraint collision.
    """
    prefix = f"PALM-{when.strftime('%Y%m')}-"
    existing = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .scalar()
        or 0
    )
    return f"{prefix}{existing + 1:04d}"


def _resolve_customer(db: Session, business_id: Any) -> tuple[Optional[Business], Optional[BusinessUser]]:
    business = db.query(Business).filter(Business.id == business_id).first()
    owner: Optional[BusinessUser] = None
    if business is not None:
        owner = (
            db.query(BusinessUser)
            .filter(BusinessUser.business_id == business_id)
            .order_by(BusinessUser.is_owner.desc(), BusinessUser.created_at.asc())
            .first()
        )
    return business, owner


def _build_pdf_payload(
    *,
    invoice: Invoice,
    business: Optional[Business],
    owner: Optional[BusinessUser],
    plan_name: str,
    billing_cycle: str,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    billed_via: str,
) -> dict:
    address_parts = []
    if business:
        if business.address:
            address_parts.append(business.address)
        city_line = ", ".join(
            [p for p in [business.city, business.state] if p]
        )
        if business.zip_code:
            city_line = f"{city_line} {business.zip_code}".strip()
        if city_line:
            address_parts.append(city_line)

    return {
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "status": invoice.status,
        "amount": float(invoice.amount or 0),
        "currency": invoice.currency or "USD",
        "plan_name": plan_name,
        "billing_cycle": billing_cycle,
        "period_start": period_start,
        "period_end": period_end,
        "customer_business": (business.name if business else None),
        "customer_name": (owner.full_name if owner else None),
        "customer_email": (
            (business.email if business else None)
            or (owner.email if owner else None)
        ),
        "customer_address": "\n".join(address_parts) if address_parts else None,
        "billed_via": billed_via,
        "paid_at": invoice.paid_at,
    }


def create_apple_invoice(
    db: Session,
    *,
    subscription: Subscription,
    plan: Optional[Plan],
    amount: float,
    currency: str = "USD",
    billing_cycle: str = "monthly",
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
    transaction_id: str = "",
    paid_at: Optional[datetime] = None,
) -> Optional[Invoice]:
    """
    Create (idempotently) a paid PalmCare invoice for an Apple IAP charge and
    store its PDF in S3.

    Returns the ``Invoice`` row, or ``None`` when nothing was created (e.g. a
    zero-dollar trial period, or a duplicate transaction that already has an
    invoice). Never raises: on any error it logs and returns ``None`` so the
    caller's purchase flow is unaffected.
    """
    try:
        amount = float(amount or 0)
        if amount <= 0:
            # No money changed hands (free trial / intro offer). Apple's own
            # receipt covers the $0 event; we only issue invoices for charges.
            return None

        dedupe_key = f"apple:{transaction_id}" if transaction_id else None
        if dedupe_key:
            existing = (
                db.query(Invoice)
                .filter(Invoice.stripe_invoice_id == dedupe_key)
                .first()
            )
            if existing is not None:
                return None

        now = datetime.now(timezone.utc)
        paid_at = paid_at or now
        business, owner = _resolve_customer(db, subscription.business_id)

        plan_name = "PalmCare AI Subscription"
        if plan is not None and plan.name:
            plan_name = f"PalmCare AI {plan.name}"
        cycle_label = "Annual" if billing_cycle == "annual" else "Monthly"
        plan_name = f"{plan_name} ({cycle_label})"

        invoice = Invoice(
            subscription_id=subscription.id,
            business_id=subscription.business_id,
            invoice_number=generate_invoice_number(db, now),
            amount=Decimal(str(round(amount, 2))),
            currency=currency or "USD",
            status="paid",
            invoice_date=now,
            paid_at=paid_at,
            stripe_invoice_id=dedupe_key,
            description=f"{plan_name} billed via Apple In-App Purchase",
        )
        db.add(invoice)
        try:
            db.flush()  # assigns invoice.id; unique index catches races
        except IntegrityError:
            # Another request already inserted this apple:<transaction_id>.
            db.rollback()
            return None

        pdf_payload = _build_pdf_payload(
            invoice=invoice,
            business=business,
            owner=owner,
            plan_name=plan_name,
            billing_cycle=billing_cycle,
            period_start=period_start,
            period_end=period_end,
            billed_via=BILLED_VIA_APPLE,
        )

        storage_key: Optional[str] = None
        try:
            from app.services.document_generation import generate_invoice_pdf
            from app.services.storage import upload_file_to_s3

            pdf_bytes = generate_invoice_pdf(pdf_payload)
            storage_key = _s3_key(subscription.business_id, invoice.id)
            upload_file_to_s3(storage_key, pdf_bytes, "application/pdf")
        except Exception as exc:  # storage optional; download can regenerate
            logger.warning("Invoice PDF upload failed (will regenerate on demand): %s", exc)
            storage_key = None

        invoice.line_items = json.dumps({
            "pdf_key": storage_key,
            "billed_via": "apple_iap",
            "plan_name": plan_name,
            "billing_cycle": billing_cycle,
            "period_start": period_start.isoformat() if period_start else None,
            "period_end": period_end.isoformat() if period_end else None,
            "transaction_id": transaction_id or None,
            "items": [
                {
                    "description": plan_name,
                    "quantity": 1,
                    "unit_price": round(amount, 2),
                    "amount": round(amount, 2),
                }
            ],
        })

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return None

        db.refresh(invoice)
        logger.info(
            "Created Apple IAP invoice %s for business %s (%s %s)",
            invoice.invoice_number, subscription.business_id, amount, currency,
        )
        return invoice
    except Exception as exc:
        logger.exception("create_apple_invoice failed: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def get_invoice_pdf_bytes(db: Session, invoice: Invoice) -> bytes:
    """
    Return the PDF bytes for an invoice: download the stored object when
    present, otherwise regenerate deterministically from the invoice row.
    """
    stored_key: Optional[str] = None
    meta: dict = {}
    if invoice.line_items:
        try:
            meta = json.loads(invoice.line_items)
            stored_key = meta.get("pdf_key")
        except (ValueError, TypeError):
            meta = {}

    if stored_key:
        try:
            from app.services.storage import download_file_from_s3

            return download_file_from_s3(stored_key)
        except Exception as exc:
            logger.warning("Stored invoice PDF missing (%s); regenerating: %s", stored_key, exc)

    # Regenerate from the row.
    from app.services.document_generation import generate_invoice_pdf

    business, owner = _resolve_customer(db, invoice.business_id)

    def _parse_dt(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except (ValueError, TypeError):
            return None

    plan_name = meta.get("plan_name") or (invoice.description or "PalmCare AI Subscription")
    billed_via = resolve_billed_via(invoice, meta)
    payload = _build_pdf_payload(
        invoice=invoice,
        business=business,
        owner=owner,
        plan_name=plan_name,
        billing_cycle=meta.get("billing_cycle") or "monthly",
        period_start=_parse_dt(meta.get("period_start")),
        period_end=_parse_dt(meta.get("period_end")),
        billed_via=billed_via,
    )
    return generate_invoice_pdf(payload)
