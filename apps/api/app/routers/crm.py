import logging
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.tenancy import owned_by_visible_users
from app.models.user import User
from app.models.client import Client
from app.models.agency_lead import AgencyLead
from app.models.appointment import Appointment
from app.models.care_tracker_entry import CareTrackerEntry
from app.models.client_activity import ClientActivity
from app.schemas.crm import (
    AgencyLeadCreate,
    AgencyLeadUpdate,
    AgencyLeadResponse,
    AgencyLeadConvertRequest,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    CareTrackerEntryCreate,
    CareTrackerEntryUpdate,
    CareTrackerEntryResponse,
    ClientActivityResponse,
    CrmMigrateLocalRequest,
    CrmMigrateLocalResponse,
)
from app.services.client_activity import log_client_activity

logger = logging.getLogger(__name__)

router = APIRouter()


def _normalize_lead_status(raw: Optional[str]) -> str:
    if not raw:
        return "new"
    key = raw.strip().lower().replace(" ", "_")
    if key in {"new", "contacted", "qualified"}:
        return key
    return "new"


def _parse_date(raw: Optional[str]) -> Optional[date]:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _owned_client(db: Session, current_user: User, client_id: UUID) -> Client:
    client = db.query(Client).filter(
        Client.id == client_id,
        owned_by_visible_users(db, current_user),
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


# --- Leads ---

@router.get("/leads", response_model=List[AgencyLeadResponse])
async def list_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AgencyLead)
        .filter(AgencyLead.created_by == current_user.id, AgencyLead.converted_at.is_(None))
        .order_by(AgencyLead.created_at.desc())
        .all()
    )


@router.post("/leads", response_model=AgencyLeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: AgencyLeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = AgencyLead(
        created_by=current_user.id,
        name=lead_in.name,
        email=lead_in.email,
        phone=lead_in.phone,
        source=lead_in.source,
        status=_normalize_lead_status(lead_in.status),
        notes=lead_in.notes,
        insurance_type=lead_in.insurance_type or None,
        insurance_id=lead_in.insurance_id or None,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/leads/{lead_id}", response_model=AgencyLeadResponse)
async def update_lead(
    lead_id: UUID,
    lead_in: AgencyLeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(AgencyLead).filter(
        AgencyLead.id == lead_id,
        AgencyLead.created_by == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    data = lead_in.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = _normalize_lead_status(data["status"])
    for field, value in data.items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(AgencyLead).filter(
        AgencyLead.id == lead_id,
        AgencyLead.created_by == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    db.delete(lead)
    db.commit()


@router.post("/leads/{lead_id}/convert", response_model=AgencyLeadResponse)
async def convert_lead(
    lead_id: UUID,
    body: AgencyLeadConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(AgencyLead).filter(
        AgencyLead.id == lead_id,
        AgencyLead.created_by == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if lead.converted_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead already converted")

    insurance_provider = None
    insurance_id = body.insurance_id or lead.insurance_id
    if body.insurance_type == "medicaid" or lead.insurance_type == "medicaid":
        insurance_provider = "Medicaid"
    elif body.insurance_type == "medicare" or lead.insurance_type == "medicare":
        insurance_provider = "Medicare"
    elif body.insurance_type == "private" or lead.insurance_type == "private":
        insurance_provider = "Private Insurance"

    client = Client(
        created_by=current_user.id,
        full_name=lead.name,
        email=lead.email,
        phone=lead.phone,
        status="intake",
        insurance_provider=insurance_provider,
        insurance_id=insurance_id,
        care_level=body.care_level,
        estimated_monthly_value=body.estimated_monthly_value,
        converted_from_lead_id=lead.id,
        notes=lead.notes,
    )
    db.add(client)
    db.flush()

    lead.converted_at = datetime.now(timezone.utc)
    lead.converted_client_id = client.id
    lead.status = "qualified"

    log_client_activity(
        db,
        client_id=client.id,
        activity_type="lead_converted",
        title=f"Lead converted: {lead.name}",
        description=lead.source or None,
        created_by=current_user.id,
        metadata={"lead_id": str(lead.id), "source": lead.source},
    )
    db.commit()
    db.refresh(lead)
    return lead


# --- Appointments ---

@router.get("/appointments", response_model=List[AppointmentResponse])
async def list_appointments(
    start: Optional[date] = None,
    end: Optional[date] = None,
    client_id: Optional[UUID] = None,
    is_follow_up: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Appointment).filter(Appointment.created_by == current_user.id)
    if start:
        q = q.filter(Appointment.appointment_date >= start)
    if end:
        q = q.filter(Appointment.appointment_date <= end)
    if client_id:
        q = q.filter(Appointment.client_id == client_id)
    if is_follow_up is not None:
        q = q.filter(Appointment.is_follow_up.is_(is_follow_up))
    return q.order_by(Appointment.appointment_date, Appointment.appointment_time).all()


@router.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appt_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if appt_in.client_id:
        _owned_client(db, current_user, appt_in.client_id)
    appt = Appointment(created_by=current_user.id, **appt_in.model_dump())
    db.add(appt)
    if appt.client_id:
        log_client_activity(
            db,
            client_id=appt.client_id,
            activity_type="appointment_scheduled",
            title=f"Appointment scheduled: {appt.title}",
            description=f"{appt.appointment_date.isoformat()} at {appt.appointment_time}",
            created_by=current_user.id,
            metadata={"appointment_id": str(appt.id), "type": appt.appointment_type},
        )
    db.commit()
    db.refresh(appt)
    return appt


@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    appt_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.created_by == current_user.id,
    ).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    data = appt_in.model_dump(exclude_unset=True)
    if data.get("client_id"):
        _owned_client(db, current_user, data["client_id"])
    for field, value in data.items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    return appt


@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.created_by == current_user.id,
    ).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    db.delete(appt)
    db.commit()


# --- Care tracker ---

@router.get("/care-tracker", response_model=List[CareTrackerEntryResponse])
async def list_care_tracker_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CareTrackerEntry)
        .filter(CareTrackerEntry.created_by == current_user.id)
        .order_by(CareTrackerEntry.updated_at.desc())
        .all()
    )


@router.post("/care-tracker", response_model=CareTrackerEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_care_tracker_entry(
    entry_in: CareTrackerEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_client(db, current_user, entry_in.client_id)
    entry = CareTrackerEntry(created_by=current_user.id, **entry_in.model_dump())
    db.add(entry)
    log_client_activity(
        db,
        client_id=entry.client_id,
        activity_type="care_tracker_added",
        title="Added to care tracker",
        description=entry.stage.replace("_", " ").title(),
        created_by=current_user.id,
        metadata={"entry_id": str(entry.id), "stage": entry.stage},
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/care-tracker/{entry_id}", response_model=CareTrackerEntryResponse)
async def update_care_tracker_entry(
    entry_id: UUID,
    entry_in: CareTrackerEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(CareTrackerEntry).filter(
        CareTrackerEntry.id == entry_id,
        CareTrackerEntry.created_by == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care tracker entry not found")
    old_stage = entry.stage
    data = entry_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value)
    if "stage" in data and data["stage"] != old_stage:
        log_client_activity(
            db,
            client_id=entry.client_id,
            activity_type="care_tracker_stage_changed",
            title=f"Care stage: {old_stage} → {entry.stage}",
            created_by=current_user.id,
            metadata={"entry_id": str(entry.id), "from": old_stage, "to": entry.stage},
        )
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/care-tracker/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_care_tracker_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(CareTrackerEntry).filter(
        CareTrackerEntry.id == entry_id,
        CareTrackerEntry.created_by == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care tracker entry not found")
    db.delete(entry)
    db.commit()


# --- Client activity ---

@router.get("/clients/{client_id}/activities", response_model=List[ClientActivityResponse])
async def list_client_activities(
    client_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_client(db, current_user, client_id)
    rows = (
        db.query(ClientActivity)
        .filter(ClientActivity.client_id == client_id)
        .order_by(ClientActivity.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows


# --- Local storage migration ---

@router.post("/migrate-local", response_model=CrmMigrateLocalResponse)
async def migrate_local_storage(
    body: CrmMigrateLocalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leads_imported = 0
    appointments_imported = 0
    care_tracker_imported = 0

    if body.leads:
        for item in body.leads:
            lead = AgencyLead(
                created_by=current_user.id,
                name=item.name,
                email=item.email or None,
                phone=item.phone or None,
                source=item.source or "Website",
                status=_normalize_lead_status(item.status),
                notes=item.notes or None,
                insurance_type=item.insurance_type or None,
                insurance_id=item.insurance_id or None,
            )
            db.add(lead)
            leads_imported += 1

    if body.appointments:
        for item in body.appointments:
            parsed = _parse_date(item.date)
            if not parsed:
                continue
            appt = Appointment(
                created_by=current_user.id,
                title=item.title,
                client_name=item.client,
                appointment_date=parsed,
                appointment_time=item.time or "09:00",
                duration_minutes=item.duration or 60,
                location=item.location,
                appointment_type=item.type or "visit",
                notes=item.notes,
                google_event_id=item.googleEventId,
            )
            db.add(appt)
            appointments_imported += 1

    if body.care_tracker:
        clients = db.query(Client).filter(owned_by_visible_users(db, current_user)).all()
        by_name = {c.full_name.lower(): c for c in clients}
        for item in body.care_tracker:
            client_id = None
            if item.clientId:
                try:
                    cid = UUID(item.clientId)
                    if db.query(Client).filter(Client.id == cid, owned_by_visible_users(db, current_user)).first():
                        client_id = cid
                except ValueError:
                    pass
            if not client_id and item.clientName:
                matched = by_name.get(item.clientName.lower())
                if matched:
                    client_id = matched.id
            if not client_id:
                continue
            entry = CareTrackerEntry(
                created_by=current_user.id,
                client_id=client_id,
                stage=item.stage or "follow_up",
                priority=item.priority or "routine",
                care_specialty=item.careSpecialty,
                start_date=_parse_date(item.startDate),
                target_date=_parse_date(item.targetDate),
                last_contact=_parse_date(item.lastContact),
                next_follow_up=_parse_date(item.nextFollowUp),
                notes=item.notes,
                phone=item.phone,
                assigned_to_name=item.assignedTo,
            )
            db.add(entry)
            care_tracker_imported += 1

    db.commit()
    return CrmMigrateLocalResponse(
        leads_imported=leads_imported,
        appointments_imported=appointments_imported,
        care_tracker_imported=care_tracker_imported,
    )
