import logging
import os
import json
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_, and_, cast, Date, extract
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User, UserRole
from app.models.sales_lead import SalesLead, LeadStatus
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

from .common import (
    ALL_US_STATES, STATE_NAMES, EMAIL_TEMPLATES, SEQUENCE_ORDER, SEQUENCE_DAYS,
    _render_template, _auto_start_sequence,
)
from .schemas import (
    LeadSummary, LeadDetail, LeadUpdate, LeadEmailRequest, BulkStatusUpdate,
    LeadStats, ImportRequest, CampaignSendRequest, SequenceLaunchRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Internal endpoints (cron-key auth) ───

def _require_internal_key(request: Request):
    """Validate internal API key or cron secret. Delegates to shared helper."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)


class InternalAddLeadAndEmail(BaseModel):
    provider_name: str
    state: str
    city: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    send_email: bool = True
    campaign_name: str = "cold-outreach-mar-2026"


class BatchEnrichEntry(BaseModel):
    ccn: Optional[str] = None
    provider_name: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None


@router.get("/leads/internal/scan-emails")
async def scan_all_emails(
    request: Request,
    db: Session = Depends(get_db),
):
    """Return all leads that have a contact_email, for external scanning."""
    _require_internal_key(request)
    leads = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != ""
    ).all()
    return [
        {"id": str(l.id), "name": l.provider_name, "email": l.contact_email, "state": l.state}
        for l in leads
    ]


@router.post("/leads/internal/clear-bad-emails-advanced")
async def clear_bad_emails_advanced(
    request: Request,
    db: Session = Depends(get_db),
):
    """Advanced email cleanup: clear webmaster@, junk emails, and deduplicate
    corporate chain emails (keep only 1 per duplicate email)."""
    import re as _re
    _require_internal_key(request)

    body = await request.json()
    bad_prefixes = body.get("bad_prefixes", [])
    bad_exact = body.get("bad_exact", [])
    dedup_threshold = body.get("dedup_threshold", 5)

    leads = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != ""
    ).all()

    cleared_prefix = 0
    cleared_exact = 0
    cleared_dedup = 0
    cleared_invalid = 0
    details = []

    bad_exact_set = {e.lower().strip() for e in bad_exact}
    email_groups = {}

    for lead in leads:
        email = (lead.contact_email or "").lower().strip()
        if not email:
            continue

        should_clear = False
        reason = ""

        if email in bad_exact_set:
            should_clear = True
            reason = "exact_match"
            cleared_exact += 1

        elif any(email.startswith(p.lower()) for p in bad_prefixes):
            should_clear = True
            reason = "prefix_match"
            cleared_prefix += 1

        elif not _re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            should_clear = True
            reason = "invalid_format"
            cleared_invalid += 1

        if should_clear:
            details.append({"name": lead.provider_name, "email": email, "reason": reason})
            lead.contact_email = None
        else:
            email_groups.setdefault(email, []).append(lead)

    for email, group in email_groups.items():
        if len(group) >= dedup_threshold:
            for lead in group[1:]:
                lead.contact_email = None
                cleared_dedup += 1
                details.append({"name": lead.provider_name, "email": email, "reason": f"dedup({len(group)} copies)"})

    db.commit()
    return {
        "cleared_prefix": cleared_prefix,
        "cleared_exact": cleared_exact,
        "cleared_invalid": cleared_invalid,
        "cleared_dedup": cleared_dedup,
        "total_cleared": cleared_prefix + cleared_exact + cleared_invalid + cleared_dedup,
        "details_sample": details[:100],
    }


@router.post("/leads/internal/batch-enrich")
async def internal_batch_enrich(
    request: Request,
    items: List[BatchEnrichEntry],
    db: Session = Depends(get_db),
):
    """Batch-enrich existing leads with missing contact data.
    Matches by CCN (preferred) or provider_name+state fallback.
    Only fills in fields that are currently null/empty — never overwrites."""
    _require_internal_key(request)

    updated = 0
    not_found = 0
    skipped = 0

    for item in items:
        lead = None
        if item.ccn:
            lead = db.query(SalesLead).filter(SalesLead.ccn == item.ccn).first()
        if not lead and item.provider_name and item.state:
            lead = db.query(SalesLead).filter(
                SalesLead.provider_name.ilike(f"%{item.provider_name}%"),
                SalesLead.state == item.state.upper(),
            ).first()

        if not lead:
            not_found += 1
            continue

        changed = False
        if item.phone and not lead.phone:
            lead.phone = item.phone
            changed = True
        if item.address and not lead.address:
            lead.address = item.address
            changed = True
        if item.city and not lead.city:
            lead.city = item.city
            changed = True
        if item.zip_code and not lead.zip_code:
            lead.zip_code = item.zip_code
            changed = True
        if item.website and not lead.website:
            lead.website = item.website
            changed = True
        if item.contact_email and not lead.contact_email:
            lead.contact_email = item.contact_email
            changed = True
        if item.contact_name and not lead.contact_name:
            lead.contact_name = item.contact_name
            changed = True

        if changed:
            activity = lead.activity_log or []
            activity.append({
                "action": "Batch enrichment",
                "at": datetime.now(timezone.utc).isoformat(),
            })
            lead.activity_log = activity
            updated += 1
        else:
            skipped += 1

    db.commit()
    return {"updated": updated, "not_found": not_found, "skipped_no_change": skipped, "total": len(items)}


class BatchClearBadEmailsRequest(BaseModel):
    bad_domains: List[str]


@router.post("/leads/internal/clear-bad-emails")
async def clear_bad_emails(
    request: Request,
    body: BatchClearBadEmailsRequest,
    db: Session = Depends(get_db),
):
    """Clear contact_email on leads whose email domain matches a bad domain list.
    Also checks subdomains (e.g. sentry.wixpress.com for wixpress.com)."""
    _require_internal_key(request)

    leads = db.query(SalesLead).filter(SalesLead.contact_email.isnot(None)).all()
    cleared = 0
    bad_set = {d.lower() for d in body.bad_domains}

    for lead in leads:
        email = (lead.contact_email or "").lower().strip()
        if not email or "@" not in email:
            continue
        domain = email.rsplit("@", 1)[1]
        is_bad = domain in bad_set or any(domain.endswith("." + bd) for bd in bad_set)
        if is_bad:
            lead.contact_email = None
            cleared += 1

    db.commit()
    return {"cleared": cleared, "total_checked": len(leads)}


@router.post("/leads/internal/cleanup-hospitals-gov")
async def cleanup_hospitals_gov(
    request: Request,
    dry_run: bool = True,
    db: Session = Depends(get_db),
):
    """Remove hospitals, government agencies, and leads with bad phone/email data.

    Pass ?dry_run=false to actually delete. Default is dry run (report only).
    """
    import re
    _require_internal_key(request)

    HOSPITAL_KEYWORDS = [
        "hospital", "medical center", "medical ctr", "med ctr",
        "regional medical", "community hospital", "general hospital",
        "memorial hospital", "children's hospital", "childrens hospital",
        "rehabilitation hospital", "rehab hospital", "surgical center",
        "ambulatory surgical", "dialysis center", "dialysis clinic",
        "skilled nursing facility", "snf ",
        "nursing home", "long term acute", "ltac",
        "psychiatric hospital", "psychiatric center",
        "behavioral health center", "mental health center",
    ]

    HOSPITAL_EXCLUDE = [
        "home health", "home care", "homecare", "home healthcare",
        "home hospice", "at home", "in home", "in-home",
    ]

    GOV_KEYWORDS = [
        "department of health", "dept of health", "public health department",
        "va medical center", "va health care", "department of veterans",
        "indian health service", "military health",
        "state of ", "city of ",
    ]

    GOV_OWNERSHIP = ["Government Operated"]

    BAD_EMAIL_PATTERNS = [
        r"^(test|example|fake|noreply|no-reply|donotreply|admin@localhost)",
        r"@(example\.com|test\.com|localhost|mailinator\.com|guerrillamail\.com|tempmail\.com|throwaway\.email|yopmail\.com)",
        r"@(startmail\.com|mastodon\.social|sentry\.wixpress\.com|wixpress\.com|shiftdigital\.com)",
        r"^(support@startmail|mickeymouse@|firstname@|info@info\.)",
        r"@safford\.com$",
    ]

    BAD_PHONE_PATTERNS = [
        r"^1?555\d{7}$",
        r"^0{10}",
        r"^1{10}$",
        r"^(123456|000000|999999)",
    ]

    all_leads = db.query(SalesLead).all()

    hospitals = []
    gov_agencies = []
    bad_emails = []
    bad_phones = []
    too_short_phones = []

    for lead in all_leads:
        name_lower = (lead.provider_name or "").lower()

        is_hospital = any(kw in name_lower for kw in HOSPITAL_KEYWORDS)
        is_home_care = any(kw in name_lower for kw in HOSPITAL_EXCLUDE)
        if is_hospital and not is_home_care:
            hospitals.append({"id": str(lead.id), "name": lead.provider_name, "state": lead.state, "reason": "hospital_keyword"})
            continue

        is_gov_ownership = lead.ownership_type in GOV_OWNERSHIP
        is_gov_name = any(kw in name_lower for kw in GOV_KEYWORDS)
        is_private = (lead.ownership_type or "").strip() in ("Proprietary", "Non-Profit", "-", "")
        if is_gov_ownership or (is_gov_name and not is_home_care and not is_private):
            gov_agencies.append({"id": str(lead.id), "name": lead.provider_name, "state": lead.state,
                                 "ownership": lead.ownership_type, "reason": "government"})
            continue

        email = (lead.contact_email or "").strip().lower()
        if email:
            is_bad_email = False
            for pat in BAD_EMAIL_PATTERNS:
                if re.search(pat, email):
                    is_bad_email = True
                    break
            if not is_bad_email and ("@" not in email or "." not in email.split("@")[-1]):
                is_bad_email = True
            if is_bad_email:
                bad_emails.append({"id": str(lead.id), "name": lead.provider_name, "email": email})

        phone = re.sub(r"[^\d]", "", lead.phone or "")
        if phone:
            if len(phone) < 10:
                too_short_phones.append({"id": str(lead.id), "name": lead.provider_name, "phone": lead.phone})
            else:
                for pat in BAD_PHONE_PATTERNS:
                    if re.match(pat, phone):
                        bad_phones.append({"id": str(lead.id), "name": lead.provider_name, "phone": lead.phone})
                        break

    deleted_count = 0
    email_cleared = 0
    phone_cleared = 0

    if not dry_run:
        delete_ids = set()
        for item in hospitals + gov_agencies:
            delete_ids.add(item["id"])

        if delete_ids:
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            deleted_count = db.query(SalesLead).filter(
                SalesLead.id.in_(list(delete_ids))
            ).delete(synchronize_session="fetch")

        for item in bad_emails:
            lead = db.query(SalesLead).filter(SalesLead.id == item["id"]).first()
            if lead:
                lead.contact_email = None
                email_cleared += 1

        for item in bad_phones + too_short_phones:
            lead = db.query(SalesLead).filter(SalesLead.id == item["id"]).first()
            if lead:
                lead.phone = None
                phone_cleared += 1

        db.commit()

    return {
        "dry_run": dry_run,
        "total_leads": len(all_leads),
        "hospitals_found": len(hospitals),
        "gov_agencies_found": len(gov_agencies),
        "bad_emails_found": len(bad_emails),
        "bad_phones_found": len(bad_phones),
        "too_short_phones_found": len(too_short_phones),
        "deleted": deleted_count,
        "emails_cleared": email_cleared,
        "phones_cleared": phone_cleared,
        "hospital_samples": hospitals[:20],
        "gov_samples": gov_agencies[:20],
        "bad_email_samples": bad_emails[:20],
        "bad_phone_samples": bad_phones[:10],
        "short_phone_samples": too_short_phones[:10],
    }


class BatchAddEntry(BaseModel):
    provider_name: str
    state: str
    city: Optional[str] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    ccn: Optional[str] = None
    ownership_type: Optional[str] = None


@router.post("/leads/internal/batch-add")
async def internal_batch_add(
    request: Request,
    items: List[BatchAddEntry],
    db: Session = Depends(get_db),
):
    """Add new leads in bulk (no email required). Deduplicates by CCN.
    For CMS data import where agencies have phones but no emails."""
    _require_internal_key(request)

    added = 0
    skipped = 0

    for item in items:
        if item.ccn:
            existing = db.query(SalesLead).filter(SalesLead.ccn == item.ccn).first()
            if existing:
                skipped += 1
                continue
        else:
            existing = db.query(SalesLead).filter(
                SalesLead.provider_name.ilike(f"%{item.provider_name}%"),
                SalesLead.state == item.state.upper(),
            ).first()
            if existing:
                skipped += 1
                continue

        lead = SalesLead(
            provider_name=item.provider_name.strip().title(),
            state=item.state.upper(),
            city=(item.city or "").strip().title() or None,
            address=(item.address or "").strip().title() or None,
            zip_code=(item.zip_code or "").strip() or None,
            phone=item.phone,
            ccn=item.ccn,
            ownership_type=(item.ownership_type or "").strip().title() or None,
            priority="medium",
            source="cms_provider_data",
        )
        db.add(lead)
        added += 1

        if added % 500 == 0:
            db.flush()

    db.commit()
    return {"added": added, "skipped_duplicates": skipped, "total": len(items)}


@router.post("/leads/internal/add-and-email")
async def internal_add_lead_and_email(
    request: Request,
    items: List[InternalAddLeadAndEmail],
    db: Session = Depends(get_db),
):
    """Add new leads, send outreach emails, and auto-start sequences. Internal key auth."""
    _require_internal_key(request)

    now = datetime.now(timezone.utc)
    results = []

    for item in items:
        existing = db.query(SalesLead).filter(
            SalesLead.contact_email == item.contact_email.lower().strip()
        ).first()

        if existing:
            lead = existing
            if item.contact_name and not lead.contact_name:
                lead.contact_name = item.contact_name
            if item.notes:
                lead.notes = f"{lead.notes or ''}\n{item.notes}".strip()
        else:
            lead = SalesLead(
                provider_name=item.provider_name.strip().title(),
                state=item.state.upper(),
                city=(item.city or "").strip().title() or None,
                contact_email=item.contact_email.lower().strip(),
                contact_name=item.contact_name,
                phone=item.phone,
                notes=item.notes,
                priority="high",
                source="phone_outreach",
            )
            db.add(lead)
            db.flush()

        if item.send_email and lead.contact_email:
            data = {
                "provider_name": lead.provider_name,
                "city": lead.city or "your area",
                "state": lead.state,
                "state_full": STATE_NAMES.get(lead.state, lead.state),
            }
            tmpl = EMAIL_TEMPLATES["warm_open"]
            subject = _render_template(tmpl["subject"], data)
            body = _render_template(tmpl["body"], data)

            result = email_service.send_email(
                to=lead.contact_email,
                subject=subject,
                sender=email_service.from_sales,
                html=body,
            )

            if result.get("success"):
                lead.last_email_sent_at = now
                lead.last_email_subject = subject
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.status = LeadStatus.email_sent.value
                if result.get("id"):
                    lead.resend_email_id = result["id"]

                activity = lead.activity_log or []
                activity.append({
                    "action": "Email sent (internal/phone-outreach)",
                    "subject": subject,
                    "to": lead.contact_email,
                    "resend_id": result.get("id"),
                    "at": now.isoformat(),
                })
                lead.activity_log = activity

                _auto_start_sequence(lead, item.campaign_name, db)

                results.append({
                    "provider_name": lead.provider_name,
                    "email": lead.contact_email,
                    "status": "sent",
                    "lead_id": str(lead.id),
                })
            else:
                results.append({
                    "provider_name": lead.provider_name,
                    "email": lead.contact_email,
                    "status": "send_failed",
                    "error": result.get("error"),
                })
        else:
            results.append({
                "provider_name": lead.provider_name,
                "email": lead.contact_email,
                "status": "added_no_email",
                "lead_id": str(lead.id),
            })

    db.commit()
    sent_count = sum(1 for r in results if r["status"] == "sent")
    return {"total": len(results), "sent": sent_count, "results": results}


@router.post("/leads/internal/start-recent-sequences")
async def internal_start_recent_sequences(
    request: Request,
    db: Session = Depends(get_db),
):
    """Find all leads emailed in the last N days without active sequences and start them.

    Query param: days (default 2), campaign_name (default auto-sequence-mar-2026)
    """
    _require_internal_key(request)

    days = int(request.query_params.get("days", "2"))
    campaign_name = request.query_params.get("campaign_name", "auto-sequence-mar-2026")

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    leads = db.query(SalesLead).filter(
        SalesLead.last_email_sent_at >= cutoff,
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
        (SalesLead.sequence_step.is_(None)) | (SalesLead.sequence_step == 0),
        SalesLead.sequence_completed != True,
        SalesLead.status.notin_(["not_interested", "converted", "responded"]),
    ).all()

    started = 0
    for lead in leads:
        _auto_start_sequence(lead, campaign_name, db)
        started += 1

    db.commit()
    return {
        "message": f"Started sequences for {started} leads emailed in last {days} days",
        "started": started,
        "total_checked": len(leads),
    }
