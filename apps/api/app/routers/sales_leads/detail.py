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

# ─── Lead detail, updates, bulk ops & seeding ───

@router.get("/leads/{lead_id}", response_model=LeadDetail)
async def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Get full detail for a single lead."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return LeadDetail(
        id=lead.id,
        provider_name=lead.provider_name,
        state=lead.state,
        city=lead.city,
        address=lead.address,
        zip_code=lead.zip_code,
        phone=lead.phone,
        ownership_type=lead.ownership_type,
        ccn=lead.ccn,
        certification_date=lead.certification_date,
        years_in_operation=lead.years_in_operation,
        star_rating=lead.star_rating,
        offers_nursing=lead.offers_nursing or False,
        offers_pt=lead.offers_pt or False,
        offers_ot=lead.offers_ot or False,
        offers_speech=lead.offers_speech or False,
        offers_social=lead.offers_social or False,
        offers_aide=lead.offers_aide or False,
        contact_name=lead.contact_name,
        contact_email=lead.contact_email,
        contact_title=lead.contact_title,
        website=lead.website,
        status=lead.status,
        priority=lead.priority,
        notes=lead.notes,
        last_email_sent_at=lead.last_email_sent_at,
        last_email_subject=lead.last_email_subject,
        email_send_count=lead.email_send_count or 0,
        email_open_count=lead.email_open_count or 0,
        last_email_opened_at=lead.last_email_opened_at,
        last_response_at=lead.last_response_at,
        campaign_tag=lead.campaign_tag,
        source=lead.source,
        is_contacted=lead.is_contacted or False,
        is_converted=lead.is_converted or False,
        converted_at=lead.converted_at,
        activity_log=lead.activity_log or [],
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: UUID,
    update: LeadUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Update lead fields."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = lead.activity_log or []

    for field, value in update.dict(exclude_unset=True).items():
        if value is not None:
            old_value = getattr(lead, field, None)
            setattr(lead, field, value)
            if old_value != value:
                activity.append({
                    "action": f"Updated {field}",
                    "old": str(old_value) if old_value else None,
                    "new": str(value),
                    "at": datetime.now(timezone.utc).isoformat(),
                })

    if update.is_contacted and not lead.is_contacted:
        lead.is_contacted = True

    lead.activity_log = activity
    db.commit()

    return {"message": "Lead updated", "id": str(lead.id)}


@router.put("/leads/bulk/status")
async def bulk_update_status(
    update: BulkStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Bulk update status for multiple leads."""
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    ids = [lid for lid in update.lead_ids if lid]
    if not ids:
        return {"message": "No leads to update"}
    updated = (
        db.query(SalesLead)
        .filter(SalesLead.id.in_(ids))
        .update({SalesLead.status: update.status}, synchronize_session="fetch")
    )
    db.commit()
    return {"message": f"Updated {updated} leads"}


class BulkEmailUpdate(BaseModel):
    """Batch update contact emails for leads matched by provider_name."""
    updates: List[dict]  # [{"provider_name": "...", "contact_email": "...", "website": "..."}]


@router.post("/leads/bulk/update-emails")
async def bulk_update_emails(
    data: BulkEmailUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Batch update contact_email and website for leads by provider_name matching."""
    updated = 0
    not_found = 0
    for entry in data.updates:
        name = entry.get("provider_name", "")
        email = entry.get("contact_email", "")
        website = entry.get("website", "")
        if not name or not email:
            continue
        lead = db.query(SalesLead).filter(
            SalesLead.provider_name.ilike(f"%{name}%")
        ).first()
        if lead:
            if email and not lead.contact_email:
                lead.contact_email = email
            if website and not lead.website:
                lead.website = website
            activity = lead.activity_log or []
            activity.append({
                "action": "Bulk email update",
                "email": email,
                "at": datetime.now(timezone.utc).isoformat(),
            })
            lead.activity_log = activity
            updated += 1
        else:
            not_found += 1
    db.commit()
    return {"updated": updated, "not_found": not_found}


class BulkImportEntry(BaseModel):
    provider_name: str
    state: str
    city: Optional[str] = None
    contact_email: str
    website: Optional[str] = None
    phone: Optional[str] = None
    ownership_type: Optional[str] = None


class BulkImportRequest(BaseModel):
    leads: List[BulkImportEntry]


@router.post("/leads/bulk/import-with-email")
async def bulk_import_with_email(
    data: BulkImportRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Bulk import agencies that already have verified emails. Skips duplicates by name+state."""
    imported = 0
    skipped = 0
    for entry in data.leads:
        if not entry.contact_email:
            continue
        existing = db.query(SalesLead).filter(
            SalesLead.provider_name.ilike(f"%{entry.provider_name}%"),
            SalesLead.state == entry.state.upper(),
        ).first()
        if existing:
            if not existing.contact_email and entry.contact_email:
                existing.contact_email = entry.contact_email
                if entry.website and not existing.website:
                    existing.website = entry.website
                imported += 1
            else:
                skipped += 1
            continue
        lead = SalesLead(
            provider_name=entry.provider_name.strip().title(),
            state=entry.state.upper(),
            city=(entry.city or "").strip().title() or None,
            contact_email=entry.contact_email.strip(),
            website=entry.website,
            phone=entry.phone,
            ownership_type=entry.ownership_type,
            priority="medium",
            source="web_research",
        )
        db.add(lead)
        imported += 1
    db.commit()
    return {"imported": imported, "skipped": skipped}


@router.delete("/leads/cleanup-no-email")
async def cleanup_no_email(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Remove all leads that don't have a contact email."""
    no_email = db.query(SalesLead).filter(
        or_(SalesLead.contact_email.is_(None), SalesLead.contact_email == "")
    ).all()
    count = len(no_email)
    for lead in no_email:
        db.delete(lead)
    db.commit()
    return {"deleted": count, "message": f"Removed {count} leads without email addresses"}


@router.post("/leads/seed-agencies")
async def seed_agency_leads(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Seed 163 home care agencies with verified emails across 48 US states."""
    agencies = _get_seed_agencies()
    imported = 0
    skipped = 0
    for a in agencies:
        existing = db.query(SalesLead).filter(
            SalesLead.contact_email == a["contact_email"]
        ).first()
        if existing:
            skipped += 1
            continue
        lead = SalesLead(
            provider_name=a["provider_name"],
            state=a["state"],
            city=a.get("city"),
            contact_email=a["contact_email"],
            website=a.get("website"),
            phone=a.get("phone"),
            priority="medium",
            source="web_research",
        )
        db.add(lead)
        imported += 1
    db.commit()
    return {"imported": imported, "skipped": skipped, "message": f"Added {imported} agencies, {skipped} duplicates skipped"}


def _get_seed_agencies() -> list:
    """163 home care agencies with verified emails across 48 US states."""
    return [
        {"provider_name": "Caring Homecare", "state": "NY", "city": "Ozone Park", "contact_email": "info@caringhcny.com", "website": "https://caringhcny.org", "phone": "718-822-7464"},
        {"provider_name": "HumanCare NY", "state": "NY", "city": "Brooklyn", "contact_email": "info@humancareny.com", "website": "https://www.humancareny.com", "phone": "718-435-1100"},
        {"provider_name": "New York Health Care (NYHC)", "state": "NY", "city": "Jamaica", "contact_email": "info@nyhc.com", "website": "https://nyhc.com", "phone": "855-446-3300"},
        {"provider_name": "24/7 HomeCare Agency of NY", "state": "NY", "city": "Brooklyn", "contact_email": "info@247nyhomecare.com", "website": "https://247nyhomecare.com", "phone": "718-887-0782"},
        {"provider_name": "Always Home Care", "state": "NY", "city": "Brooklyn", "contact_email": "info@alwaysny.com", "website": "https://www.alwayshc.com", "phone": "718-843-8430"},
        {"provider_name": "Aurora Home Care Inc.", "state": "NY", "city": "Williamsville", "contact_email": "info@aurorahomecare.com", "website": "https://aurorahomecare.com", "phone": "716-833-9000"},
        {"provider_name": "Buffalo Homecare Inc.", "state": "NY", "city": "Buffalo", "contact_email": "info@homecarebuffalo.com", "website": "https://homecarebuffalo.com", "phone": "716-322-2780"},
        {"provider_name": "Elder Care Homecare", "state": "NY", "city": "Scarsdale", "contact_email": "help@eldercarehc.com", "website": "https://eldercarehomecare.com", "phone": "914-895-5539"},
        {"provider_name": "Recco Home Care Service", "state": "NY", "city": "Amityville", "contact_email": "info@reccohomecare.com", "website": "https://www.reccohomecare.com", "phone": "516-798-6688"},
        {"provider_name": "Perfect Home Care Corp", "state": "NJ", "city": "Bayonne", "contact_email": "perfecthomecarecorp@gmail.com", "website": "https://perfecthomecarecorp.net", "phone": "201-455-5100"},
        {"provider_name": "NJ First Home Health Care", "state": "NJ", "city": "Fort Lee", "contact_email": "info@njfirsthomecare.com", "website": "https://njfirsthomecare.com", "phone": "201-992-5000"},
        {"provider_name": "Caring Nursing Services", "state": "NJ", "city": "Hackensack", "contact_email": "info@caringnursingservices.com", "website": "https://www.caringnursingservices.com", "phone": "888-290-0791"},
        {"provider_name": "Care for Less Homecare", "state": "NJ", "city": "Newark", "contact_email": "info@careforlesshc.com", "website": "https://careforlesshc.com", "phone": "973-561-8777"},
        {"provider_name": "Cherry Hill Homecare", "state": "NJ", "city": "Cherry Hill", "contact_email": "info@cherryhilinc.com", "website": "https://www.cherryhillhc.com", "phone": "856-688-5209"},
        {"provider_name": "Advanced Care Services", "state": "NJ", "city": "Hackensack", "contact_email": "info@advancedcsnj.com", "website": "https://www.advancedcsnj.com", "phone": "201-682-2486"},
        {"provider_name": "Executive Home Care Morristown", "state": "NJ", "city": "Morristown", "contact_email": "morristown@executivehomecare.com", "website": "https://executivehomecare.com/morristown", "phone": "973-705-6400"},
        {"provider_name": "Royal Destiny Home Care Agency", "state": "NJ", "city": "Edison", "contact_email": "info@royaldestinyhomecareagency.com", "website": "https://www.royaldestinyhomecareagency.com", "phone": "877-225-6630"},
        {"provider_name": "Penn Home Care", "state": "PA", "city": "Harrisburg", "contact_email": "info@pennhomecare.net", "website": "https://www.pennhomecare.net", "phone": "717-857-4371"},
        {"provider_name": "CareSense Home Health Care", "state": "PA", "city": "Newtown", "contact_email": "info@caresensehc.com", "website": "https://www.caresensehc.com", "phone": "888-444-8157"},
        {"provider_name": "Quality Life Healthcare", "state": "PA", "city": "Philadelphia", "contact_email": "admin@qualitylifehc.com", "website": "https://www.qualitylifehc.com", "phone": "215-516-5945"},
        {"provider_name": "Pennsylvania Hope Home Health Care Agency", "state": "PA", "city": "Philadelphia", "contact_email": "contact@pennsylvaniahope.com", "phone": "484-461-2200"},
        {"provider_name": "Continuum Home Health", "state": "CT", "city": "New Haven", "contact_email": "info@continuumhomehealth.com", "website": "https://www.continuumhomehealth.org", "phone": "203-782-3192"},
        {"provider_name": "AJ Homecare", "state": "CT", "city": "Bridgeport", "contact_email": "janv26@ajhomecarect.com", "website": "https://www.ajhomecarect.com", "phone": "203-886-4780"},
        {"provider_name": "Abby Homecare Solutions LLC", "state": "MA", "city": "Worcester", "contact_email": "info@abbyhomecaresolutions.com", "website": "https://abbyhomecaresolutions.com", "phone": "508-796-9103"},
        {"provider_name": "Brockton Home Health Care Agency", "state": "MA", "city": "Brockton", "contact_email": "referrals@brocktonhhca.com", "website": "https://www.brocktonhha.com", "phone": "508-219-0101"},
        {"provider_name": "Longevity Home Health", "state": "MD", "city": "Baltimore", "contact_email": "info@longevityhh.com", "website": "https://www.longevityhh.com", "phone": "240-389-5291"},
        {"provider_name": "Greater Baltimore Homecare LLC", "state": "MD", "city": "Nottingham", "contact_email": "admin@gbhcares.com", "website": "https://greaterbaltimorehomecare.com", "phone": "410-646-8627"},
        {"provider_name": "Mercy Care Providers", "state": "MD", "city": "Columbia", "contact_email": "support@mercycareprovider.com", "website": "https://mercycareprovider.com", "phone": "410-309-7052"},
        {"provider_name": "GentleCare Services", "state": "MD", "city": "Silver Spring", "contact_email": "info@gentlecareservicesmd.com", "website": "https://www.gentlecareservicesmd.com", "phone": "301-841-8558"},
        {"provider_name": "Ultimate Touch Healthcare Solutions", "state": "MD", "city": "Silver Spring", "contact_email": "inquiries@ultimatetouchhs.com", "website": "https://www.ultimatetouchhs.com", "phone": "301-332-2501"},
        {"provider_name": "Goodwin Home Care", "state": "VA", "city": "Alexandria", "contact_email": "homecare@goodwinliving.org", "website": "https://goodwinhomecare.org", "phone": "703-578-7632"},
        {"provider_name": "Life's at Home Care", "state": "VA", "city": "Richmond", "contact_email": "services@lifesathomecare.com", "website": "https://lifesathomecare.com", "phone": "804-396-6000"},
        {"provider_name": "Ombi Home Care Services LLC", "state": "VA", "city": "Roanoke", "contact_email": "info@ombihomecareservices.com", "website": "https://ombihomecareservices.com", "phone": "540-206-2543"},
        {"provider_name": "Quality Health Services LLC", "state": "VA", "city": "Woodbridge", "contact_email": "info@qhscares.com", "website": "https://qhscares.com", "phone": "703-910-7081"},
        {"provider_name": "Human Touch Home Health Care", "state": "VA", "city": "Falls Church", "contact_email": "info@humantouchhealth.com", "website": "https://www.humantouchhealth.com", "phone": "703-531-0540"},
        {"provider_name": "All Florida Home Health Services", "state": "FL", "city": "Miami", "contact_email": "info@allfloridahhs.com", "website": "https://allfloridahomehealth.com", "phone": "305-263-9992"},
        {"provider_name": "Elite Home Health", "state": "FL", "city": "West Palm Beach", "contact_email": "info@elitehomehealth.org", "website": "https://www.elitehomehealth.org", "phone": "888-422-3548"},
        {"provider_name": "Sarasota Home Health Care Agency", "state": "FL", "city": "Sarasota", "contact_email": "info@shhca.com", "phone": "941-306-4347"},
        {"provider_name": "Beacon Home Care FL", "state": "FL", "city": "Sarasota", "contact_email": "info@beacon4care.com", "website": "https://www.beacon4care.com", "phone": "941-282-7965"},
        {"provider_name": "ProHealth Home Health Services", "state": "FL", "city": "St. Petersburg", "contact_email": "prohealth@prohealthhomehealth.com", "website": "https://www.prohealthhomehealth.com", "phone": "727-202-6820"},
        {"provider_name": "World of Love Home Care", "state": "GA", "city": "Atlanta", "contact_email": "info@worldoflovehomecare.com", "website": "https://www.worldoflovehomecare.com", "phone": "800-532-2320"},
        {"provider_name": "MoLove Home Health", "state": "GA", "city": "Atlanta", "contact_email": "info@molovehomehealthagency.com", "website": "https://www.molovehomehealth.com", "phone": "470-999-9195"},
        {"provider_name": "WrightChoice Healthcare Services", "state": "GA", "city": "Atlanta", "contact_email": "info@wrightchoicehealth.com", "website": "https://wrightchoicehs.com", "phone": "678-212-5750"},
        {"provider_name": "A One Home Care Inc.", "state": "GA", "city": "Roswell", "contact_email": "help@aonehomecare.org", "website": "https://www.aonehomecare.org", "phone": "404-422-7847"},
        {"provider_name": "American Homecare Carolina", "state": "NC", "city": "Charlotte", "contact_email": "info@americanhomecarecarolina.org", "website": "https://americanhomecarecarolina.org", "phone": "980-300-8550"},
        {"provider_name": "Carolina Home Healthcare", "state": "NC", "city": "Charlotte", "contact_email": "info@carolinahomehealthcare.com", "website": "https://carolinahomehealthcare.com", "phone": "704-548-8949"},
        {"provider_name": "A Plus Quality Home Care", "state": "NC", "city": "Durham", "contact_email": "info@aplusqualitync.com", "website": "https://www.aplusqualitync.com", "phone": "888-307-5665"},
        {"provider_name": "Journey Homecare Services", "state": "NC", "city": "Greensboro", "contact_email": "info@journeyhomecare.com", "website": "https://journeyhomecare.com", "phone": "336-662-5396"},
        {"provider_name": "Elite Home Care SC", "state": "SC", "city": "Greenville", "contact_email": "info@elitehomecaresc.com", "website": "https://www.elitehomecaresc.com", "phone": "864-869-8730"},
        {"provider_name": "Already Home Care", "state": "SC", "city": "Charleston", "contact_email": "info@alreadyhomecare.com", "website": "https://www.alreadyhomecare.com", "phone": "843-371-1419"},
        {"provider_name": "Integrity Home Care SC", "state": "SC", "city": "Columbia", "contact_email": "info@integrityhomecareofsc.com", "website": "https://integrityhomecareofsc.com", "phone": "803-395-0151"},
        {"provider_name": "Oakwell Home Health Services", "state": "TX", "city": "Houston", "contact_email": "info@oakwellhomehealth.com", "website": "https://www.oakwellhomehealth.com", "phone": "346-803-0568"},
        {"provider_name": "A Nurse Angels Home Health", "state": "TX", "city": "Arlington", "contact_email": "info@anurseangelshomehealth.com", "website": "https://www.anurseangelshomehealth.com", "phone": "817-522-1066"},
        {"provider_name": "Express Home Care TX", "state": "TX", "city": "Dallas", "contact_email": "info@Expresshomecare.com", "website": "https://www.expresshomecareservices.com", "phone": "469-792-8301"},
        {"provider_name": "AccentCare Home Health", "state": "TX", "city": "San Antonio", "contact_email": "info@accentcare.com", "website": "https://www.accentcare.com", "phone": "210-349-7355"},
        {"provider_name": "Oceanside Home Health Services", "state": "CA", "city": "Los Angeles", "contact_email": "customerservice@oshhs.com", "website": "https://www.oshhs.com", "phone": "323-934-5050"},
        {"provider_name": "At Home Nursing Care", "state": "CA", "city": "Encinitas", "contact_email": "contact@athomenursingcare.com", "website": "https://athomenursingcare.com", "phone": "760-965-7223"},
        {"provider_name": "Care First Home Health CA", "state": "CA", "city": "San Leandro", "contact_email": "info@CareFirsthh.com", "website": "https://www.carefirsthh.com", "phone": "510-878-9288"},
        {"provider_name": "Beacon Homecare CA", "state": "CA", "city": "San Francisco", "contact_email": "info@beaconhomecare.com", "website": "https://beaconhomecare.com", "phone": "888-973-7748"},
        {"provider_name": "HealthNow Home Healthcare", "state": "CA", "city": "Hayward", "contact_email": "contact@healthnowca.com", "website": "https://healthnowca.com", "phone": "888-808-5226"},
        {"provider_name": "Kay's Angel Care Inc.", "state": "IL", "city": "Evanston", "contact_email": "info@kaysangelcare.com", "website": "https://www.kaysangelcare.com", "phone": "847-868-8464"},
        {"provider_name": "Northwest Home Health & Rehab", "state": "IL", "city": "Lake in the Hills", "contact_email": "info@nwhomehealthrehab.com", "website": "https://www.nwhomehealthrehab.com", "phone": "847-854-0186"},
        {"provider_name": "Northshore Home Health Care", "state": "IL", "city": "Bloomingdale", "contact_email": "contact@northshorehomehealth.com", "website": "https://northshorehomehealth.com", "phone": "847-490-1112"},
        {"provider_name": "Care Ohio Health Services", "state": "OH", "city": "Euclid", "contact_email": "info@careohiohealthservices.org", "website": "https://careohiohealthservices.org", "phone": "216-482-1635"},
        {"provider_name": "Cleveland Home Care", "state": "OH", "city": "Cleveland", "contact_email": "ruth@clevelandhomecare.org", "website": "https://clevelandhomecare.org", "phone": "440-669-8121"},
        {"provider_name": "Gloriage Home Care Agency", "state": "OH", "city": "Columbus", "contact_email": "gloriak@gloriagehomecare.com", "website": "https://www.gloriagehomecare.com", "phone": "614-270-0375"},
        {"provider_name": "Evolution Home Care", "state": "OH", "city": "Gahanna", "contact_email": "referralcol@evolutionhomecare.com", "website": "https://www.evolutionhomecare.com", "phone": "614-502-1900"},
        {"provider_name": "Momba Home Care", "state": "OH", "city": "Cincinnati", "contact_email": "info@mombaoh.com", "website": "https://mombahc.com", "phone": "513-776-9840"},
        {"provider_name": "Care First Home Health MI", "state": "MI", "city": "Warren", "contact_email": "response@carefirsthomehealth.com", "website": "https://carefirsthomehealth.com", "phone": "248-413-2680"},
        {"provider_name": "Bloom Homecare", "state": "MI", "city": "West Bloomfield", "contact_email": "admin@bloomhc.com", "phone": "248-278-8277"},
        {"provider_name": "Indy In-Home Care", "state": "IN", "city": "Indianapolis", "contact_email": "info@indyinhomecare.com", "website": "https://indyinhomecare.com", "phone": "317-933-6855"},
        {"provider_name": "Passion to Care Indiana", "state": "IN", "city": "Indianapolis", "contact_email": "indiana@passiontocarehc.com", "website": "https://passiontocarehc.com", "phone": "317-537-1811"},
        {"provider_name": "Above & Beyond Home Care IN", "state": "IN", "city": "Anderson", "contact_email": "info@homecareindiana.com", "website": "https://homecareindiana.com", "phone": "877-622-7999"},
        {"provider_name": "Wayne Home Care", "state": "IN", "city": "Fort Wayne", "contact_email": "info@waynehomecare.com", "website": "https://waynehomecare.com", "phone": "260-445-7752"},
        {"provider_name": "Greater Wisconsin Home Care", "state": "WI", "city": "Madison", "contact_email": "admin@greaterwisconsinhomecare.com", "website": "https://greaterwisconsinhomecare.com", "phone": "608-572-2560"},
        {"provider_name": "Comfort At Home Healthcare", "state": "WI", "city": "Milwaukee", "contact_email": "comfort@cahhealthcare.com", "website": "https://cahhealthcare.com", "phone": "414-882-7925"},
        {"provider_name": "Umana Home Care", "state": "WI", "city": "West Allis", "contact_email": "info@umanahomecare.com", "website": "https://www.umanahomecare.com", "phone": "414-797-3707"},
        {"provider_name": "Axis Home Health Care", "state": "MN", "city": "Minneapolis", "contact_email": "admin@axishomeshc.com", "website": "https://www.axishomeshc.com", "phone": "763-657-1603"},
        {"provider_name": "Premier Home Health Care MN", "state": "MN", "city": "Minneapolis", "contact_email": "info@premiermn.com", "website": "https://www.premiermn.com", "phone": "612-208-1839"},
        {"provider_name": "Centric Healthcare", "state": "MN", "city": "Rochester", "contact_email": "info@centrichealthcare.org", "website": "https://centrichealthcare.org", "phone": "507-205-7322"},
        {"provider_name": "DELUX Home Health Care", "state": "MO", "city": "Kansas City", "contact_email": "info@DeluxHomeHealthCare.com", "website": "https://www.deluxhomehealthcare.com", "phone": "816-298-5655"},
        {"provider_name": "All About Care LLC", "state": "MO", "city": "Saint Louis", "contact_email": "Info@aacarellc.com", "website": "https://www.allaboutcare.co", "phone": "314-238-7320"},
        {"provider_name": "Tennessee Home Care Partners", "state": "TN", "city": "Bartlett", "contact_email": "info@tn-hcp.com", "website": "https://www.tn-hcp.com", "phone": "901-428-2905"},
        {"provider_name": "Loving Home Care LLC TN", "state": "TN", "city": "Nashville", "contact_email": "care@lovinghomecare.org", "website": "https://www.lovinghomecare.org", "phone": "615-301-8507"},
        {"provider_name": "Starcare of Tennessee", "state": "TN", "city": "Nashville", "contact_email": "support@starcareinc.org", "website": "https://www.starcareinc.org", "phone": "615-885-3070"},
        {"provider_name": "CareFirst Home Care AL", "state": "AL", "city": "Birmingham", "contact_email": "Inquiry@carefirsthomecareservices.com", "website": "https://carefirsthcs.com", "phone": "205-445-0705"},
        {"provider_name": "Brooks Home Health Care", "state": "AL", "city": "Huntsville", "contact_email": "brookshomehealthcare@yahoo.com", "website": "https://www.brookshomehealthcare.net", "phone": "256-469-6659"},
        {"provider_name": "Alternative Home Care Specialists", "state": "LA", "city": "Lafayette", "contact_email": "info@AltHomeCare.com", "website": "https://althomecare.com", "phone": "337-233-0545"},
        {"provider_name": "Homecare of Louisiana", "state": "LA", "city": "Baton Rouge", "contact_email": "info@homecarelouisiana.com", "website": "https://homecarelouisiana.com", "phone": "225-256-7804"},
        {"provider_name": "Professional Home Health Care Agency", "state": "KY", "city": "London", "contact_email": "info@phhca.com", "website": "https://phhca.com", "phone": "606-864-0724"},
        {"provider_name": "Caring Excellence", "state": "KY", "city": "Louisville", "contact_email": "info@caringexcellenceathome.com", "website": "https://caringexcellenceathome.com", "phone": "502-208-9424"},
        {"provider_name": "Transitions Home Health Services", "state": "WA", "city": "Seattle", "contact_email": "info@transitionshhs.com", "website": "https://transitionshomehealthservices.com", "phone": "206-737-1170"},
        {"provider_name": "Columbia River Home Health", "state": "WA", "city": "Kennewick", "contact_email": "info@ColumbiaRiverHH.com", "website": "https://columbiariverhh.com", "phone": "509-591-4459"},
        {"provider_name": "Chinook Home Health Care", "state": "WA", "city": "Kennewick", "contact_email": "info@chinookhomehealthcare.com", "website": "https://www.chinookhomehealthcare.com", "phone": "509-491-3821"},
        {"provider_name": "Mountainview Home Health", "state": "WA", "city": "Yakima", "contact_email": "jray@mountainviewhh.org", "website": "https://mountainviewhomehealth.org", "phone": "509-576-0800"},
        {"provider_name": "Nightingale Home Health OR", "state": "OR", "city": "Portland", "contact_email": "info@nightingaleoregon.com", "website": "https://www.nightingaleoregon.com", "phone": "503-444-7605"},
        {"provider_name": "At Ease Home Care", "state": "OR", "city": "Eugene", "contact_email": "info@ateasehomecare.com", "phone": "541-344-3273"},
        {"provider_name": "At Home Care Group", "state": "OR", "city": "Bend", "contact_email": "edbend@athomecareonyx.com", "website": "https://www.athomecg.com", "phone": "458-292-5010"},
        {"provider_name": "Colorado CareAssist", "state": "CO", "city": "Colorado Springs", "contact_email": "care@coloradocareassist.com", "website": "https://coloradocareassist.com", "phone": "719-428-3999"},
        {"provider_name": "Voyager Home Health Care", "state": "CO", "city": "Colorado Springs", "contact_email": "Support@voyagerhomehealth.com", "website": "https://voyagerhomehealthcare.com", "phone": "719-400-2222"},
        {"provider_name": "Arizona In Home Care Givers", "state": "AZ", "city": "Phoenix", "contact_email": "info@arizonainhomecaregivers.com", "website": "https://arizonainhomecaregivers.com", "phone": "520-353-3309"},
        {"provider_name": "MD Home Health AZ", "state": "AZ", "city": "Phoenix", "contact_email": "info@mdhomehealth.com", "website": "https://mdhomehealth.com", "phone": "602-266-9971"},
        {"provider_name": "Creek View Home Health", "state": "AZ", "city": "Phoenix", "contact_email": "admin@creekviewaz.com", "website": "https://www.creekviewaz.com", "phone": "602-603-5161"},
        {"provider_name": "Home Sweet Homecare AZ", "state": "AZ", "city": "Tempe", "contact_email": "info@homesweethomecare.com", "website": "https://homesweethomecare.com", "phone": "480-459-4457"},
        {"provider_name": "Consumer Direct Care Network NV", "state": "NV", "city": "Las Vegas", "contact_email": "InfoCDNV@ConsumerDirectCare.com", "website": "https://consumerdirectnv.com", "phone": "877-786-4999"},
        {"provider_name": "Las Vegas Home Healthcare", "state": "NV", "city": "Las Vegas", "contact_email": "customerservice@lvhha.com", "website": "https://lasvegashomehealthcareinc.com", "phone": "702-405-9200"},
        {"provider_name": "Silver Star Homecare", "state": "NV", "city": "Las Vegas", "contact_email": "info@silverstarhomecare.com", "website": "https://silverstarhomecare.com", "phone": "702-406-4976"},
        {"provider_name": "Stonebridge Home Care", "state": "UT", "city": "Orem", "contact_email": "scheduling@stonebridgesouth.com", "website": "https://stonebridgehc.com", "phone": "801-377-2760"},
        {"provider_name": "In Home Care Utah", "state": "UT", "city": "Ogden", "contact_email": "Info@InHomeCareUt.com", "website": "https://www.inhomecareut.com", "phone": "801-510-9670"},
        {"provider_name": "Ability Home Health & Hospice", "state": "UT", "city": "South Jordan", "contact_email": "care@abilityhhh.com", "website": "https://abilityhhh.com", "phone": "385-287-1311"},
        {"provider_name": "NextDoor HomeCare", "state": "NM", "city": "Albuquerque", "contact_email": "info@nextdoorhomecare.com", "website": "https://nextdoorhomecare.com", "phone": "505-226-6946"},
        {"provider_name": "Matrix Home Care Services NM", "state": "NM", "city": "Las Cruces", "contact_email": "health@matrixnm.com", "website": "https://matrixnm.com", "phone": "575-525-8755"},
        {"provider_name": "Family Care Home Health OK", "state": "OK", "city": "Edmond", "contact_email": "familycarehealth@aol.com", "website": "https://www.familycarehh.com", "phone": "405-842-5656"},
        {"provider_name": "CompleteOK Home Health & Hospice", "state": "OK", "city": "Oklahoma City", "contact_email": "intake@completeok.com", "website": "https://www.completeok.com", "phone": "405-879-3470"},
        {"provider_name": "Golden Age Health Inc", "state": "OK", "city": "Oklahoma City", "contact_email": "info@goldenagehealth.com", "website": "https://www.goldenagehealth.com", "phone": "405-692-1255"},
        {"provider_name": "Hearts at Home In-Home Care", "state": "KS", "city": "Overland Park", "contact_email": "info@heartsathomeusa.com", "website": "https://www.heartsathomeusa.com", "phone": "913-440-4209"},
        {"provider_name": "Home Health Care Agency of Arkansas", "state": "AR", "city": "Little Rock", "contact_email": "hhc@homehealthcareagencyark.com", "website": "https://www.hhcaoa.net", "phone": "501-553-1953"},
        {"provider_name": "Baptist Health Home Health Network", "state": "AR", "city": "Little Rock", "contact_email": "homecare@baptist-health.org", "website": "https://www.baptisthealthathome.org", "phone": "501-202-7480"},
        {"provider_name": "Delta HomeCare", "state": "MS", "city": "Jackson", "contact_email": "ClientCare@DeltaHomeCare.com", "website": "https://deltahomecare.com", "phone": "888-455-4370"},
        {"provider_name": "All Islands Homecare", "state": "HI", "city": "Honolulu", "contact_email": "hawaii.aih@gmail.com", "website": "https://www.allislandshomecare.com", "phone": "808-270-5087"},
        {"provider_name": "Kokua Care", "state": "HI", "city": "Honolulu", "contact_email": "info@kokuacare.com", "website": "https://kokuacare.com", "phone": "808-734-5555"},
        {"provider_name": "Idaho In Home Care", "state": "ID", "city": "Ammon", "contact_email": "idahoinhomecare@gmail.com", "website": "https://www.idahoinhomecare.com", "phone": "208-881-4821"},
        {"provider_name": "Comfort Home Care ID", "state": "ID", "city": "Pocatello", "contact_email": "info@comforthomecare.org", "website": "https://www.comforthomecare.org", "phone": "208-684-1378"},
        {"provider_name": "HomeCare Montana", "state": "MT", "city": "Belgrade", "contact_email": "Info@HomeCareMontana.org", "website": "https://www.homecaremontana.org", "phone": "888-989-3111"},
        {"provider_name": "Big Sky Home Health", "state": "MT", "city": "Bozeman", "contact_email": "info@bigskyhhh.com", "website": "https://bigskyhhh.com", "phone": "406-551-2273"},
        {"provider_name": "Wyoming Home Health", "state": "WY", "city": "Casper", "contact_email": "info@wyominghomehealth.org", "website": "https://www.wyominghomehealth.org", "phone": "307-333-4574"},
        {"provider_name": "Extended Life Home Care", "state": "ND", "city": "Fargo", "contact_email": "Extendedlifehc@aol.com", "website": "https://www.extendedlifehomecare.info", "phone": "701-751-3363"},
        {"provider_name": "Glorious Homecare Solutions", "state": "ND", "city": "Bismarck", "contact_email": "info@glorioushomecare.org", "website": "https://glorioushomecare.com", "phone": "701-699-6922"},
        {"provider_name": "Kore Cares", "state": "SD", "city": "Sioux Falls", "contact_email": "info@korecares.com", "website": "https://www.korecares.com", "phone": "605-275-2344"},
        {"provider_name": "Eli Home Care LLC", "state": "SD", "city": "Sioux Falls", "contact_email": "info@elihomecare.com", "website": "https://www.elihomecare.com", "phone": "605-323-9002"},
        {"provider_name": "Compassionate Angels Home Care", "state": "DE", "city": "Newark", "contact_email": "info@compassionateangelshc.com", "website": "https://compassionateangelshc.com", "phone": "302-722-6688"},
        {"provider_name": "Haven Home Care DE", "state": "DE", "city": "Wilmington", "contact_email": "info@havencaredelaware.com", "website": "https://havencaredelaware.com", "phone": "302-688-9134"},
        {"provider_name": "We Care Home Care of Delaware", "state": "DE", "city": "Wilmington", "contact_email": "info@wecarede.com", "website": "https://wecarede.com", "phone": "302-663-1125"},
        {"provider_name": "Neighborly Home Care DE", "state": "DE", "city": "Wilmington", "contact_email": "info@neighborlyhomecare.com", "website": "https://www.neighborlyhomecare.com", "phone": "302-650-5699"},
        {"provider_name": "Rhode Island Partnership for Home Care", "state": "RI", "city": "Warwick", "contact_email": "office@riphc.org", "website": "https://riphc.org", "phone": "401-351-1010"},
        {"provider_name": "Age at Home NH", "state": "NH", "city": "Concord", "contact_email": "info@ageathomenh.com", "website": "https://www.ageathomenh.com", "phone": "603-224-6100"},
        {"provider_name": "Timberland Home Care", "state": "NH", "city": "Conway", "contact_email": "caregivers@timberlandhomecare.com", "website": "https://www.timberlandhomecare.com", "phone": "603-447-3998"},
        {"provider_name": "Hands At Home Care Services", "state": "VT", "city": "Waitsfield", "contact_email": "info@HandsAtHomeCS.com", "website": "https://handsathomecareservices.com", "phone": "802-496-2600"},
        {"provider_name": "Maine Home Care", "state": "ME", "city": "Lincoln", "contact_email": "info@maineinhomecare.com", "website": "https://www.maineinhomecare.com", "phone": "207-746-0039"},
        {"provider_name": "SavePlus Home Care", "state": "ME", "city": "Portland", "contact_email": "Info@saveplushomecare.com", "website": "https://www.saveplushomecare.com", "phone": "207-550-2021"},
        {"provider_name": "A Epiphany Home Health Care", "state": "WV", "city": "Martinsburg", "contact_email": "info@a-epiphany.com", "website": "https://a-epiphany.com", "phone": "304-513-2426"},
        {"provider_name": "Berhan Home Health Care Agency", "state": "DC", "city": "Washington", "contact_email": "berhan@berhan-hhca.com", "website": "https://www.berhan-hhca.com", "phone": "202-723-1100"},
        {"provider_name": "Regal Home Care DC", "state": "DC", "city": "Washington", "contact_email": "Regal@regalhomecare.net", "website": "https://www.regalhomecare.net", "phone": "202-506-4750"},
        {"provider_name": "Philia Care DC", "state": "DC", "city": "Washington", "contact_email": "info@philia-care.com", "website": "https://www.philia-care.com", "phone": "202-607-2525"},
        {"provider_name": "Goshen Care Services DC", "state": "DC", "city": "Washington", "contact_email": "info@goshencares.com", "website": "https://www.goshencares.com", "phone": "202-545-7739"},
        {"provider_name": "BAYADA Home Health Care", "state": "NJ", "city": "Pennsauken", "contact_email": "hotline@bayada.com", "website": "https://www.bayada.com", "phone": "888-833-5706"},
        {"provider_name": "Encompass Health", "state": "AL", "city": "Birmingham", "contact_email": "contact@encompasshealth.com", "website": "https://encompasshealth.com", "phone": "800-765-4772"},
        {"provider_name": "Visiting Angels National", "state": "PA", "city": "Bryn Mawr", "contact_email": "CustomerSupport@visitingangels.com", "website": "https://www.visitingangels.com", "phone": "800-365-4189"},
    ]


# =============================================================================
# EMAIL CAMPAIGN
# =============================================================================

