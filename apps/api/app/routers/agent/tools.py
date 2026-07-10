"""
Tool implementations and dispatcher for the Palm AI agent.

Each _tool_* function performs one platform action (clients, visits, billing,
exports, outreach, etc.) and returns a JSON-serializable dict. `_execute_tool`
dispatches a Claude tool call to the right function. Cross-module imports
(outreach, sales_leads, document_generation) are done lazily inside the
functions to avoid import cycles.
"""

import os
import json
import logging
import time as _time
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _today_eastern() -> date:
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("America/New_York")).date()


def _find_client(db: Session, user: User, name: str):
    from app.models.client import Client
    return (
        db.query(Client)
        .filter(Client.created_by == user.id, Client.full_name.ilike(f"%{name}%"))
        .first()
    )


def _find_latest_visit(db: Session, user: User, client_name: str):
    from app.models.client import Client
    from app.models.visit import Visit
    client = _find_client(db, user, client_name)
    if not client:
        return None, None
    visit = (
        db.query(Visit)
        .filter(Visit.client_id == client.id)
        .order_by(Visit.created_at.desc())
        .first()
    )
    return client, visit


# ── Shared tool implementations ──────────────────────────────────────

def _tool_list_clients(db: Session, user: User, search: str = "", status: str = "", limit: int = 20) -> dict:
    from app.models.client import Client
    q = db.query(Client).filter(Client.created_by == user.id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(Client.full_name.ilike(pattern), Client.phone.ilike(pattern), Client.primary_diagnosis.ilike(pattern)))
    if status:
        q = q.filter(Client.status == status)
    clients = q.order_by(Client.full_name).limit(limit).all()
    return {
        "count": len(clients),
        "clients": [
            {"id": str(c.id), "name": c.full_name, "status": c.status, "care_level": c.care_level,
             "diagnosis": c.primary_diagnosis, "phone": c.phone, "city": c.city, "state": c.state,
             "age": (date.today().year - c.date_of_birth.year) if c.date_of_birth else None}
            for c in clients
        ],
    }


def _tool_get_client(db: Session, user: User, name: str) -> dict:
    client = _find_client(db, user, name)
    if not client:
        return {"error": f"No client found matching '{name}'"}
    return {
        "id": str(client.id), "name": client.full_name, "status": client.status,
        "care_level": client.care_level, "diagnosis": client.primary_diagnosis,
        "phone": client.phone, "email": client.email,
        "address": client.address, "city": client.city, "state": client.state, "zip": client.zip_code,
        "dob": client.date_of_birth.isoformat() if client.date_of_birth else None,
        "gender": client.gender, "mobility": client.mobility_status, "cognitive": client.cognitive_status,
        "living_situation": client.living_situation,
        "emergency_contact": client.emergency_contact_name,
        "emergency_phone": client.emergency_contact_phone,
        "emergency_relationship": client.emergency_contact_relationship,
        "notes": client.notes,
        "preferred_days": client.preferred_days, "preferred_times": client.preferred_times,
    }


def _tool_create_client(db: Session, user: User, data: dict) -> dict:
    from app.models.client import Client
    client = Client(created_by=user.id, **{k: v for k, v in data.items() if v is not None})
    db.add(client)
    db.commit()
    db.refresh(client)
    return {"ok": True, "id": str(client.id), "name": client.full_name, "status": client.status}


def _tool_update_client(db: Session, user: User, name: str, updates: dict) -> dict:
    client = _find_client(db, user, name)
    if not client:
        return {"error": f"No client found matching '{name}'"}
    for k, v in updates.items():
        if hasattr(client, k) and v is not None:
            setattr(client, k, v)
    db.commit()
    return {"ok": True, "name": client.full_name, "updated_fields": list(updates.keys())}


def _tool_list_visits(db: Session, user: User, client_name: str = "", status: str = "", limit: int = 10) -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    q = db.query(Visit).join(Client).filter(Client.created_by == user.id)
    if client_name:
        q = q.filter(Client.full_name.ilike(f"%{client_name}%"))
    if status:
        q = q.filter(Visit.status == status)
    visits = q.order_by(Visit.created_at.desc()).limit(limit).all()
    return {
        "count": len(visits),
        "visits": [
            {"id": str(v.id), "client": v.client.full_name if v.client else "?",
             "date": v.visit_date.isoformat() if v.visit_date else None,
             "status": v.status, "visit_type": v.visit_type,
             "has_transcript": bool(v.transcript_id), "has_note": bool(v.note_id)}
            for v in visits
        ],
    }


def _tool_create_visit(db: Session, user: User, client_name: str, visit_date: str = "", visit_type: str = "initial_assessment", notes: str = "") -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    client = _find_client(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    vd = None
    if visit_date:
        try:
            vd = datetime.strptime(visit_date, "%Y-%m-%d").date()
        except ValueError:
            vd = _today_eastern()
    else:
        vd = _today_eastern()
    visit = Visit(client_id=client.id, visit_date=vd, visit_type=visit_type, status="scheduled", notes=notes)
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return {"ok": True, "id": str(visit.id), "client": client.full_name, "date": vd.isoformat(), "type": visit_type}


def _tool_get_visit_status(db: Session, user: User, client_name: str) -> dict:
    client, visit = _find_latest_visit(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    if not visit:
        return {"error": f"No visits found for {client.full_name}"}
    ps = visit.pipeline_state or {}
    return {
        "client": client.full_name, "visit_id": str(visit.id),
        "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
        "status": visit.status,
        "pipeline": {
            "transcription": ps.get("transcribe_status", "not_started"),
            "diarization": ps.get("diarize_status", "not_started"),
            "billing": ps.get("bill_status", "not_started"),
            "note": ps.get("note_status", "not_started"),
            "contract": ps.get("contract_status", "not_started"),
        },
        "has_audio": bool(visit.audio_key),
        "has_transcript": bool(visit.transcript_id),
    }


def _tool_get_billables(db: Session, user: User, client_name: str) -> dict:
    from app.models.billable import BillableItem
    client, visit = _find_latest_visit(db, user, client_name)
    if not visit:
        return {"error": f"No visit found for '{client_name}'"}
    items = db.query(BillableItem).filter(BillableItem.visit_id == visit.id).all()
    total_mins = sum(getattr(i, 'adjusted_minutes', None) or getattr(i, 'duration_minutes', 0) or 0 for i in items)
    approved = [i for i in items if getattr(i, 'is_approved', False)]
    return {
        "client": client.full_name, "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
        "total_items": len(items), "approved": len(approved), "total_minutes": total_mins,
        "items": [
            {"service": getattr(i, 'service_description', '') or getattr(i, 'description', ''),
             "category": getattr(i, 'category', ''),
             "minutes": getattr(i, 'adjusted_minutes', None) or getattr(i, 'duration_minutes', 0),
             "approved": getattr(i, 'is_approved', False),
             "flagged": getattr(i, 'is_flagged', False),
             "flag_reason": getattr(i, 'flag_reason', None)}
            for i in items[:20]
        ],
    }


def _tool_get_visit_note(db: Session, user: User, client_name: str) -> dict:
    from app.models.note import Note
    client, visit = _find_latest_visit(db, user, client_name)
    if not visit:
        return {"error": f"No visit found for '{client_name}'"}
    note = db.query(Note).filter(Note.visit_id == visit.id).first()
    if not note:
        return {"error": f"No note generated yet for {client.full_name}'s visit"}
    content = getattr(note, 'content', '') or getattr(note, 'note_text', '') or ''
    return {
        "client": client.full_name,
        "note_preview": content[:1000],
        "is_approved": getattr(note, 'is_approved', False),
        "note_type": getattr(note, 'note_type', 'clinical'),
    }


def _tool_get_contract(db: Session, user: User, client_name: str) -> dict:
    from app.models.contract import Contract
    client = _find_client(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    contract = db.query(Contract).filter(Contract.client_id == client.id).order_by(Contract.created_at.desc()).first()
    if not contract:
        return {"error": f"No contract found for {client.full_name}"}
    content = getattr(contract, 'content', '') or getattr(contract, 'contract_text', '') or ''
    return {
        "client": client.full_name, "status": getattr(contract, 'status', 'draft'),
        "contract_preview": content[:1000],
        "created": contract.created_at.isoformat() if contract.created_at else None,
        "is_active": getattr(contract, 'is_active', False),
    }


def _tool_create_note(db: Session, user: User, title: str, content: str, client_name: str = "", tags: list = None, pinned: bool = False) -> dict:
    from app.models.smart_note import SmartNote
    client_id = None
    if client_name:
        client = _find_client(db, user, client_name)
        if client:
            client_id = client.id
    note = SmartNote(user_id=user.id, title=title, content=content, client_id=client_id, tags=tags or [], is_pinned=pinned)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"ok": True, "id": str(note.id), "title": note.title, "client_id": str(client_id) if client_id else None}


def _tool_list_notes(db: Session, user: User, search: str = "", tag: str = "", client_name: str = "", limit: int = 10) -> dict:
    from app.models.smart_note import SmartNote
    q = db.query(SmartNote).filter(SmartNote.user_id == user.id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(SmartNote.title.ilike(pattern), SmartNote.content.ilike(pattern)))
    if tag:
        q = q.filter(SmartNote.tags.contains([tag]))
    if client_name:
        client = _find_client(db, user, client_name)
        if client:
            q = q.filter(SmartNote.client_id == client.id)
    notes = q.order_by(SmartNote.created_at.desc()).limit(limit).all()
    return {
        "count": len(notes),
        "notes": [
            {"id": str(n.id), "title": n.title, "pinned": n.is_pinned,
             "tags": n.tags or [], "preview": (n.content or "")[:100],
             "created": n.created_at.isoformat() if n.created_at else None}
            for n in notes
        ],
    }


def _tool_list_tasks(db: Session, user: User, status: str = "", priority: str = "") -> dict:
    from app.models.smart_note import Task
    q = db.query(Task).filter(Task.user_id == user.id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    tasks = q.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).limit(20).all()
    return {
        "count": len(tasks),
        "tasks": [
            {"id": str(t.id), "title": t.title, "status": t.status, "priority": t.priority,
             "due": t.due_date.isoformat() if t.due_date else None}
            for t in tasks
        ],
    }


def _tool_complete_task(db: Session, user: User, task_title: str) -> dict:
    from app.models.smart_note import Task
    task = db.query(Task).filter(Task.user_id == user.id, Task.title.ilike(f"%{task_title}%")).first()
    if not task:
        return {"error": f"No task found matching '{task_title}'"}
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "task": task.title, "status": "completed"}


def _tool_list_caregivers(db: Session, user: User, search: str = "", certification: str = "", status: str = "", limit: int = 10) -> dict:
    from app.models.caregiver import Caregiver
    q = db.query(Caregiver).filter(Caregiver.created_by == user.id)
    if search:
        q = q.filter(Caregiver.full_name.ilike(f"%{search}%"))
    if status:
        q = q.filter(Caregiver.status == status)
    cgs = q.order_by(Caregiver.full_name).limit(limit).all()
    return {
        "count": len(cgs),
        "caregivers": [
            {"id": str(c.id), "name": c.full_name, "status": c.status,
             "certifications": c.certifications or [], "phone": c.phone,
             "rating": c.rating, "experience_years": c.years_experience}
            for c in cgs
        ],
    }


def _tool_match_caregiver(db: Session, user: User, client_name: str) -> dict:
    from app.models.client import Client
    from app.models.caregiver import Caregiver
    client = _find_client(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    caregivers = db.query(Caregiver).filter(Caregiver.created_by == user.id, Caregiver.status == "active").all()
    if not caregivers:
        return {"error": "No active caregivers found"}

    scored = []
    for cg in caregivers:
        score = 50
        if client.care_level == "HIGH" and getattr(cg, 'can_handle_high_care', False):
            score += 20
        if cg.rating:
            score += int(cg.rating * 5)
        if cg.years_experience and cg.years_experience > 3:
            score += 10
        scored.append((score, cg))
    scored.sort(key=lambda x: -x[0])

    return {
        "client": client.full_name, "care_level": client.care_level,
        "matches": [
            {"name": cg.full_name, "score": s, "certifications": cg.certifications or [],
             "rating": cg.rating, "experience": cg.years_experience, "phone": cg.phone}
            for s, cg in scored[:5]
        ],
    }


def _tool_get_reports_overview(db: Session, user: User) -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    from app.models.contract import Contract
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    total_clients = db.query(func.count(Client.id)).filter(Client.created_by == user.id).scalar() or 0
    active_clients = db.query(func.count(Client.id)).filter(Client.created_by == user.id, Client.status == "active").scalar() or 0
    total_visits = db.query(func.count(Visit.id)).join(Client).filter(Client.created_by == user.id).scalar() or 0
    recent_visits = db.query(func.count(Visit.id)).join(Client).filter(Client.created_by == user.id, Visit.created_at >= week_ago).scalar() or 0
    total_contracts = db.query(func.count(Contract.id)).join(Client).filter(Client.created_by == user.id).scalar() or 0
    return {
        "total_clients": total_clients, "active_clients": active_clients,
        "total_assessments": total_visits, "assessments_this_week": recent_visits,
        "total_contracts": total_contracts,
    }


def _tool_get_billing_report(db: Session, user: User, days: int = 30) -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    from app.models.billable import BillableItem
    since = datetime.now(timezone.utc) - timedelta(days=days)
    items = (
        db.query(BillableItem)
        .join(Visit).join(Client)
        .filter(Client.created_by == user.id, BillableItem.created_at >= since)
        .all()
    )
    total_mins = sum(getattr(i, 'adjusted_minutes', None) or getattr(i, 'duration_minutes', 0) or 0 for i in items)
    cats = {}
    for i in items:
        cat = getattr(i, 'category', 'other') or 'other'
        cats[cat] = cats.get(cat, 0) + (getattr(i, 'adjusted_minutes', None) or getattr(i, 'duration_minutes', 0) or 0)
    return {
        "period_days": days, "total_items": len(items),
        "total_minutes": total_mins, "total_hours": round(total_mins / 60, 1),
        "by_category": cats,
    }


def _tool_get_calendar_events(db: Session, user: User, days: int = 7) -> dict:
    if not getattr(user, 'google_calendar_connected', False):
        return {"error": "Google Calendar is not connected. Connect it in Settings > Calendar."}
    return {"info": "Calendar events are fetched live from Google. Use the Calendar tab in the app to view your schedule."}


def _tool_get_usage(db: Session, user: User) -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    completed = (
        db.query(func.count(Visit.id))
        .join(Client)
        .filter(Client.created_by == user.id, Visit.status == "completed")
        .scalar() or 0
    )
    return {"completed_assessments": completed, "plan": "Free (50 max)" if completed < 50 else "Check subscription", "remaining": max(50 - completed, 0)}


# ── Document tool implementations ────────────────────────────────────

_GENERATED_FILES: dict = {}  # token -> {path, filename, content_type, created, user_id}

def _sanitize_filename(name: str) -> str:
    """Strip path separators and dangerous characters from filenames."""
    import re
    name = os.path.basename(name)
    name = re.sub(r'[^\w\s\-\.]', '_', name)
    return name[:200] or "document"

def _make_file_token(file_bytes: bytes, filename: str, content_type: str, user_id: str = "") -> str:
    import hashlib
    import secrets as _secrets
    safe_name = _sanitize_filename(filename)
    token = _secrets.token_urlsafe(24)
    import tempfile
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{safe_name}")
    tmp.write(file_bytes)
    tmp.close()
    _GENERATED_FILES[token] = {
        "path": tmp.name, "filename": safe_name,
        "content_type": content_type, "created": datetime.now(timezone.utc),
        "user_id": str(user_id),
    }
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    for k in list(_GENERATED_FILES.keys()):
        if _GENERATED_FILES[k]["created"] < cutoff:
            try:
                os.remove(_GENERATED_FILES[k]["path"])
            except OSError:
                pass
            del _GENERATED_FILES[k]
    return token


def _tool_export_contract(db: Session, user: User, client_name: str, fmt: str = "pdf") -> dict:
    from app.models.contract import Contract
    client = _find_client(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    contract = db.query(Contract).filter(Contract.client_id == client.id).order_by(Contract.created_at.desc()).first()
    if not contract:
        return {"error": f"No contract found for {client.full_name}"}
    from app.services.document_generation import generate_contract_pdf, generate_contract_docx
    if fmt == "docx":
        doc_bytes = generate_contract_docx(contract, client)
        fname = f"{client.full_name.replace(' ', '_')}_Contract.docx"
        ctype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        doc_bytes = generate_contract_pdf(contract, client)
        fname = f"{client.full_name.replace(' ', '_')}_Contract.pdf"
        ctype = "application/pdf"
    token = _make_file_token(doc_bytes, fname, ctype, str(user.id))
    return {"ok": True, "download_url": f"/platform/agent/download/{token}", "filename": fname, "format": fmt}


def _tool_export_note(db: Session, user: User, client_name: str, fmt: str = "pdf") -> dict:
    from app.models.note import Note
    client, visit = _find_latest_visit(db, user, client_name)
    if not visit:
        return {"error": f"No visit found for '{client_name}'"}
    note = db.query(Note).filter(Note.visit_id == visit.id).first()
    if not note:
        return {"error": f"No note generated yet for {client.full_name}"}
    from app.services.document_generation import generate_note_pdf, generate_note_docx
    if fmt == "docx":
        doc_bytes = generate_note_docx(note, client)
        fname = f"{client.full_name.replace(' ', '_')}_Note.docx"
        ctype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        doc_bytes = generate_note_pdf(note, client)
        fname = f"{client.full_name.replace(' ', '_')}_Note.pdf"
        ctype = "application/pdf"
    token = _make_file_token(doc_bytes, fname, ctype, str(user.id))
    return {"ok": True, "download_url": f"/platform/agent/download/{token}", "filename": fname, "format": fmt}


def _tool_export_timesheet(db: Session, user: User, client_name: str) -> dict:
    from app.models.billable import BillableItem
    import csv, io
    client, visit = _find_latest_visit(db, user, client_name)
    if not visit:
        return {"error": f"No visit found for '{client_name}'"}
    items = db.query(BillableItem).filter(BillableItem.visit_id == visit.id).all()
    if not items:
        return {"error": f"No billable items for {client.full_name}"}
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Service", "Category", "Minutes", "Approved", "Flagged"])
    for i in items:
        w.writerow([getattr(i, 'service_description', '') or getattr(i, 'description', ''),
                     getattr(i, 'category', ''),
                     getattr(i, 'adjusted_minutes', None) or getattr(i, 'duration_minutes', 0),
                     getattr(i, 'is_approved', False), getattr(i, 'is_flagged', False)])
    csv_bytes = buf.getvalue().encode('utf-8')
    fname = f"{client.full_name.replace(' ', '_')}_Timesheet.csv"
    token = _make_file_token(csv_bytes, fname, "text/csv", str(user.id))
    return {"ok": True, "download_url": f"/platform/agent/download/{token}", "filename": fname, "format": "csv", "rows": len(items)}


def _tool_export_billing_report(db: Session, user: User, days: int = 30) -> dict:
    from app.models.client import Client
    from app.models.visit import Visit
    from app.models.billable import BillableItem
    import csv, io
    since = datetime.now(timezone.utc) - timedelta(days=days)
    items = (
        db.query(BillableItem, Client.full_name, Visit.visit_date)
        .join(Visit, BillableItem.visit_id == Visit.id)
        .join(Client, Visit.client_id == Client.id)
        .filter(Client.created_by == user.id, BillableItem.created_at >= since)
        .all()
    )
    if not items:
        return {"error": "No billing data found for that period"}
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Client", "Visit Date", "Service", "Category", "Minutes", "Approved"])
    for item, client_name, visit_date in items:
        w.writerow([client_name, visit_date.isoformat() if visit_date else "",
                     getattr(item, 'service_description', '') or getattr(item, 'description', ''),
                     getattr(item, 'category', ''),
                     getattr(item, 'adjusted_minutes', None) or getattr(item, 'duration_minutes', 0),
                     getattr(item, 'is_approved', False)])
    csv_bytes = buf.getvalue().encode('utf-8')
    fname = f"Billing_Report_{days}d.csv"
    token = _make_file_token(csv_bytes, fname, "text/csv", str(user.id))
    return {"ok": True, "download_url": f"/platform/agent/download/{token}", "filename": fname, "format": "csv", "rows": len(items)}


def _tool_generate_document(db: Session, user: User, title: str, doc_type: str, instructions: str, client_name: str = "") -> dict:
    import anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "AI not configured"}
    client_data = None
    if client_name:
        c = _find_client(db, user, client_name)
        if c:
            client_data = f"Client: {c.full_name}, DOB: {c.date_of_birth}, Diagnosis: {c.primary_diagnosis}, Care Level: {c.care_level}, Address: {c.address} {c.city} {c.state}"
    ai = anthropic.Anthropic(api_key=api_key)
    prompt = f"Generate a professional {doc_type} document.\nTitle: {title}\nInstructions: {instructions}"
    if client_data:
        prompt += f"\nClient Information: {client_data}"
    prompt += "\n\nWrite the complete document content in clean, professional prose. Use markdown formatting."
    resp = ai.messages.create(model="claude-sonnet-4-6", max_tokens=4096, messages=[{"role": "user", "content": prompt}])
    content = resp.content[0].text if resp.content else ""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    import io
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=1*inch, bottomMargin=1*inch, leftMargin=1*inch, rightMargin=1*inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    body_style = ParagraphStyle('DocBody', parent=styles['Normal'], fontSize=11, leading=16, spaceAfter=8)
    story = [Paragraph(title, title_style), Spacer(1, 12)]
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 8))
        elif line.startswith('# '):
            story.append(Paragraph(line[2:], ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, spaceAfter=10)))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, spaceAfter=8)))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], ParagraphStyle('H3', parent=styles['Heading3'], fontSize=12, spaceAfter=6)))
        elif line.startswith('- ') or line.startswith('* '):
            story.append(Paragraph(f"• {line[2:]}", body_style))
        else:
            clean = line.replace('**', '').replace('*', '')
            story.append(Paragraph(clean, body_style))
    doc.build(story)
    pdf_bytes = buf.getvalue()
    fname = f"{title.replace(' ', '_')}.pdf"
    token = _make_file_token(pdf_bytes, fname, "application/pdf", str(user.id))
    return {"ok": True, "download_url": f"/platform/agent/download/{token}", "filename": fname, "format": "pdf", "pages": "~" + str(max(1, len(content) // 3000))}


def _tool_email_document(db: Session, user: User, client_name: str, doc_type: str, recipient_email: str, recipient_name: str = "", message: str = "") -> dict:
    client = _find_client(db, user, client_name)
    if not client:
        return {"error": f"No client found matching '{client_name}'"}
    from app.models.contract import Contract
    from app.models.note import Note
    if doc_type == "contract":
        contract = db.query(Contract).filter(Contract.client_id == client.id).order_by(Contract.created_at.desc()).first()
        if not contract:
            return {"error": f"No contract for {client.full_name}"}
        from app.services.document_generation import generate_contract_pdf
        pdf = generate_contract_pdf(contract, client)
        fname = f"{client.full_name}_Contract.pdf"
        subject = f"Service Contract - {client.full_name}"
    else:
        _, visit = _find_latest_visit(db, user, client_name)
        if not visit:
            return {"error": f"No visit found for {client.full_name}"}
        note = db.query(Note).filter(Note.visit_id == visit.id).first()
        if not note:
            return {"error": f"No note for {client.full_name}"}
        from app.services.document_generation import generate_note_pdf
        pdf = generate_note_pdf(note, client)
        fname = f"{client.full_name}_Note.pdf"
        subject = f"Visit Note - {client.full_name}"
    import base64
    from app.services.email import email_service
    result = email_service.send_email(
        to=recipient_email, subject=subject,
        html=f"<p>Hi {recipient_name or 'there'},</p><p>{message or f'Please find the attached {doc_type} for {client.full_name}.'}</p><p>Best regards,<br/>{user.full_name or 'PalmCare AI'}</p>",
        reply_to=user.email,
        attachments=[{"filename": fname, "content": base64.b64encode(pdf).decode(), "type": "application/pdf"}],
    )
    if result.get("success"):
        return {"ok": True, "sent_to": recipient_email, "document": fname}
    return {"error": f"Failed to send: {result.get('error', 'unknown')}"}


# ── Admin tool implementations (reuse from previous version) ─────────

def _tool_get_outreach_stats(db: Session) -> dict:
    from app.models.sales_lead import SalesLead
    from app.models.investor import Investor
    total_leads = db.query(func.count(SalesLead.id)).scalar() or 0
    leads_emailed = db.query(func.count(SalesLead.id)).filter(SalesLead.email_send_count > 0).scalar() or 0
    leads_contacted = db.query(func.count(SalesLead.id)).filter(SalesLead.is_contacted == True).scalar() or 0
    unsent_agencies = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
    ).scalar() or 0
    total_investors = db.query(func.count(Investor.id)).scalar() or 0
    investors_with_email = db.query(func.count(Investor.id)).filter(Investor.contact_email.isnot(None), Investor.contact_email != "").scalar() or 0
    investors_emailed = db.query(func.count(Investor.id)).filter(Investor.email_send_count > 0).scalar() or 0
    unsent_investors = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
    ).scalar() or 0
    callbacks = db.query(func.count(SalesLead.id)).filter(SalesLead.callback_requested == True).scalar() or 0
    return {
        "total_leads": total_leads, "leads_emailed": leads_emailed,
        "leads_contacted_by_phone": leads_contacted, "unsent_agency_emails": unsent_agencies,
        "total_investors": total_investors, "investors_with_email": investors_with_email,
        "investors_emailed": investors_emailed, "unsent_investor_emails": unsent_investors,
        "callbacks_pending": callbacks,
    }


def _tool_get_weekly_summary(db: Session, week_offset: int = 0) -> dict:
    from app.routers.outreach import _week_work_days, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY, BUSINESS_TZ
    today = _today_eastern()
    work_days = _week_work_days(week_offset)
    days_summary = []
    for day_name, day_date in work_days:
        day_start_utc = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
        day_end_utc = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
        from app.models.sales_lead import SalesLead
        from app.models.investor import Investor
        a_sent = db.query(func.count(SalesLead.id)).filter(SalesLead.last_email_sent_at >= day_start_utc, SalesLead.last_email_sent_at <= day_end_utc).scalar() or 0
        i_sent = db.query(func.count(Investor.id)).filter(Investor.last_email_sent_at >= day_start_utc, Investor.last_email_sent_at <= day_end_utc).scalar() or 0
        calls = db.query(func.count(SalesLead.id)).filter(SalesLead.is_contacted == True, SalesLead.called_at >= day_start_utc, SalesLead.called_at <= day_end_utc).scalar() or 0
        is_past = day_date < today
        days_summary.append({"day": day_name, "date": day_date.isoformat(), "is_past": is_past,
                             "agencies_sent": a_sent, "investors_sent": i_sent, "calls_made": calls,
                             "targets": {"agencies": EMAILS_PER_DAY, "investors": INVESTORS_PER_DAY, "calls": CALLS_PER_DAY}})
    return {"week_offset": week_offset, "days": days_summary}


def _tool_batch_send_emails(db: Session, user: User, types: list) -> dict:
    from app.routers.outreach import (EMAILS_PER_DAY, INVESTORS_PER_DAY, EXCLUDED_LEAD_STATUSES, EXCLUDED_INVESTOR_STATUSES,
                                       PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER, _build_agency_html, _build_investor_text)
    from app.services.email import email_service
    from app.models.sales_lead import SalesLead
    from app.models.investor import Investor
    today = _today_eastern()
    now = datetime.now(timezone.utc)
    results = {"agencies": {"sent": 0, "skipped": 0, "failed": 0}, "investors": {"sent": 0, "skipped": 0, "failed": 0}}
    if "agency" in types:
        unsent = db.query(SalesLead).filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                                             SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                                             (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None))).order_by(PRIORITY_ORDER, SalesLead.created_at).limit(EMAILS_PER_DAY).all()
        for lead in unsent:
            if lead.last_email_sent_at and lead.last_email_sent_at.date() >= today:
                results["agencies"]["skipped"] += 1; continue
            subj, html = _build_agency_html(lead.provider_name, lead.city or "your area", lead.state or "US")
            r = email_service.send_email(to=lead.contact_email, subject=subj, html=html, reply_to="sales@palmtai.com", sender="Muse Ibrahim <sales@send.palmtai.com>")
            if r.get("success"):
                lead.last_email_sent_at = now; lead.email_send_count = (lead.email_send_count or 0) + 1; lead.status = "email_sent"; lead.updated_at = now
                activity = list(lead.activity_log or []); activity.append({"action": "email_sent", "timestamp": now.isoformat(), "by": user.email}); lead.activity_log = activity
                results["agencies"]["sent"] += 1
            else:
                results["agencies"]["failed"] += 1
            _time.sleep(0.6)
    if "investor" in types:
        unsent_inv = db.query(Investor).filter(Investor.contact_email.isnot(None), Investor.contact_email != "",
                                               Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                                               (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None))).order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at).limit(INVESTORS_PER_DAY).all()
        for inv in unsent_inv:
            if inv.last_email_sent_at and inv.last_email_sent_at.date() >= today:
                results["investors"]["skipped"] += 1; continue
            focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
            subj, text = _build_investor_text(inv.fund_name, inv.contact_name or "", focus)
            html = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{text}</pre>"
            r = email_service.send_email(to=inv.contact_email, subject=subj, html=html, text=text, reply_to="invest@palmtai.com", sender="Muse Ibrahim <invest@send.palmtai.com>")
            if r.get("success"):
                inv.last_email_sent_at = now; inv.email_send_count = (inv.email_send_count or 0) + 1; inv.status = "email_sent"; inv.updated_at = now
                activity = list(inv.activity_log or []); activity.append({"action": "email_sent", "timestamp": now.isoformat(), "by": user.email}); inv.activity_log = activity
                results["investors"]["sent"] += 1
            else:
                results["investors"]["failed"] += 1
            _time.sleep(0.6)
    db.commit()
    return results


def _tool_mark_call_done(db: Session, user: User, lead_name: str, notes: str = "", callback: bool = False) -> dict:
    from app.models.sales_lead import SalesLead
    lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{lead_name}%")).first()
    if not lead:
        return {"error": f"No lead found matching '{lead_name}'"}
    now = datetime.now(timezone.utc)
    lead.is_contacted = True; lead.status = "contacted"; lead.called_at = now; lead.updated_at = now
    if notes:
        ts = now.strftime("[%Y-%m-%d %H:%M]"); lead.notes = f"{lead.notes or ''}\n{ts} Call: {notes}".strip()
    if callback:
        lead.callback_requested = True; lead.callback_notes = notes
    activity = list(lead.activity_log or []); activity.append({"action": "called", "timestamp": now.isoformat(), "notes": notes, "by": user.email}); lead.activity_log = activity
    db.commit()
    return {"ok": True, "lead": lead.provider_name, "phone": lead.phone, "callback": callback}


def _tool_search_leads(db: Session, query: str = "", state: str = "", status: str = "", limit: int = 10) -> dict:
    from app.models.sales_lead import SalesLead
    q = db.query(SalesLead)
    if query:
        p = f"%{query}%"; q = q.filter(or_(SalesLead.provider_name.ilike(p), SalesLead.city.ilike(p), SalesLead.notes.ilike(p)))
    if state:
        q = q.filter(SalesLead.state == state.upper())
    if status:
        q = q.filter(SalesLead.status == status)
    leads = q.limit(limit).all()
    return {"count": len(leads), "leads": [{"name": l.provider_name, "state": l.state, "phone": l.phone, "email": l.contact_email, "status": l.status, "contacted": l.is_contacted, "emails_sent": l.email_send_count or 0} for l in leads]}


def _tool_search_investors(db: Session, query: str = "", has_email: bool = False, limit: int = 10) -> dict:
    from app.models.investor import Investor
    q = db.query(Investor)
    if query:
        p = f"%{query}%"; q = q.filter(or_(Investor.fund_name.ilike(p), Investor.contact_name.ilike(p), Investor.location.ilike(p)))
    if has_email:
        q = q.filter(Investor.contact_email.isnot(None), Investor.contact_email != "")
    return {"count": q.count(), "investors": [{"fund": i.fund_name, "type": i.investor_type, "email": i.contact_email, "status": i.status, "emails_sent": i.email_send_count or 0} for i in q.limit(limit).all()]}


def _tool_get_callbacks(db: Session) -> dict:
    from app.models.sales_lead import SalesLead
    leads = db.query(SalesLead).filter(SalesLead.callback_requested == True).order_by(SalesLead.updated_at.desc()).all()
    return {"count": len(leads), "callbacks": [{"name": l.provider_name, "phone": l.phone, "state": l.state, "callback_notes": l.callback_notes, "notes": (l.notes or "")[:200]} for l in leads]}


def _tool_get_pending_work(db: Session) -> dict:
    from app.models.sales_lead import SalesLead
    from app.models.investor import Investor
    unsent_a = db.query(func.count(SalesLead.id)).filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "", (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None))).scalar() or 0
    unsent_i = db.query(func.count(Investor.id)).filter(Investor.contact_email.isnot(None), Investor.contact_email != "", (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None))).scalar() or 0
    uncalled = db.query(func.count(SalesLead.id)).filter(SalesLead.phone.isnot(None), SalesLead.phone != "", SalesLead.is_contacted != True).scalar() or 0
    cbs = db.query(func.count(SalesLead.id)).filter(SalesLead.callback_requested == True).scalar() or 0
    return {"unsent_agency_emails": unsent_a, "unsent_investor_emails": unsent_i, "uncalled_leads": uncalled, "callbacks_pending": cbs}


def _tool_send_single_email(db: Session, user: User, name: str, entity_type: str) -> dict:
    from app.routers.outreach import _build_agency_html, _build_investor_text
    from app.services.email import email_service
    from app.models.sales_lead import SalesLead
    from app.models.investor import Investor
    now = datetime.now(timezone.utc)
    if entity_type == "agency":
        lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{name}%")).first()
        if not lead: return {"error": f"No agency matching '{name}'"}
        if not lead.contact_email: return {"error": f"{lead.provider_name} has no email"}
        subj, html = _build_agency_html(lead.provider_name, lead.city or "your area", lead.state or "US")
        r = email_service.send_email(to=lead.contact_email, subject=subj, html=html, reply_to="sales@palmtai.com", sender="Muse Ibrahim <sales@send.palmtai.com>")
        if r.get("success"):
            lead.last_email_sent_at = now; lead.email_send_count = (lead.email_send_count or 0) + 1; lead.status = "email_sent"; lead.updated_at = now; db.commit()
            return {"ok": True, "sent_to": lead.contact_email, "name": lead.provider_name}
        return {"error": f"Failed: {r.get('error', 'unknown')}"}
    elif entity_type == "investor":
        inv = db.query(Investor).filter(Investor.fund_name.ilike(f"%{name}%")).first()
        if not inv: return {"error": f"No investor matching '{name}'"}
        if not inv.contact_email: return {"error": f"{inv.fund_name} has no email"}
        focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
        subj, text = _build_investor_text(inv.fund_name, inv.contact_name or "", focus)
        html = f"<pre style='font-family:-apple-system,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;'>{text}</pre>"
        r = email_service.send_email(to=inv.contact_email, subject=subj, html=html, text=text, reply_to="invest@palmtai.com", sender="Muse Ibrahim <invest@send.palmtai.com>")
        if r.get("success"):
            inv.last_email_sent_at = now; inv.email_send_count = (inv.email_send_count or 0) + 1; inv.status = "email_sent"; inv.updated_at = now; db.commit()
            return {"ok": True, "sent_to": inv.contact_email, "name": inv.fund_name}
        return {"error": f"Failed: {r.get('error', 'unknown')}"}
    return {"error": f"Unknown type: {entity_type}"}


def _tool_assign_leads(db: Session, user: User, team_member_email: str, assign_type: str, count: int = 20, states: list = None) -> dict:
    from app.models.sales_lead import SalesLead
    member = db.query(User).filter(User.email == team_member_email, User.is_active == True).first()
    if not member: return {"error": f"No active member: {team_member_email}"}
    q = db.query(SalesLead).filter(SalesLead.assigned_to.is_(None))
    if assign_type == "call":
        q = q.filter(SalesLead.phone.isnot(None), SalesLead.phone != "", SalesLead.is_contacted != True)
    else:
        q = q.filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "", (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)))
    if states:
        q = q.filter(SalesLead.state.in_([s.upper() for s in states]))
    leads = q.limit(count).all()
    now = datetime.now(timezone.utc)
    for lead in leads:
        lead.assigned_to = str(member.id); lead.assigned_type = assign_type; lead.updated_at = now
    db.commit()
    return {"ok": True, "assigned": len(leads), "to": member.full_name or member.email, "type": assign_type}


def _tool_add_lead_notes(db: Session, user: User, lead_name: str, notes: str) -> dict:
    from app.models.sales_lead import SalesLead
    lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{lead_name}%")).first()
    if not lead: return {"error": f"No lead matching '{lead_name}'"}
    now = datetime.now(timezone.utc)
    ts = now.strftime("[%Y-%m-%d %H:%M]")
    lead.notes = f"{lead.notes or ''}\n{ts} Note: {notes}".strip(); lead.updated_at = now
    activity = list(lead.activity_log or []); activity.append({"action": "note_added", "timestamp": now.isoformat(), "notes": notes, "by": user.email}); lead.activity_log = activity
    db.commit()
    return {"ok": True, "lead": lead.provider_name}


# ══════════════════════════════════════════════════════════════════════
#  TOOL ROUTER
# ══════════════════════════════════════════════════════════════════════

# Tools that expose the platform's internal CRM / outreach machinery. These
# must never run for a normal tenant user, even if a future refactor somehow
# hands the model the admin tool schemas. Non-admins never receive these
# schemas today (see routes.py), so this is defense-in-depth, not the only gate.
_ADMIN_TOOLS = frozenset({
    "get_outreach_stats", "get_weekly_summary", "batch_send_emails",
    "mark_call_done", "search_leads", "search_investors", "get_callbacks",
    "get_pending_work", "send_single_email", "assign_leads_to_team",
    "add_lead_notes",
})


def _is_platform_admin(user: User) -> bool:
    return (
        getattr(user, "role", None) == UserRole.admin
        and (user.email or "").endswith("@palmtai.com")
    )


def _execute_tool(tool_name: str, tool_input: dict, db: Session, user: User) -> str:
    try:
        if tool_name in _ADMIN_TOOLS and not _is_platform_admin(user):
            logger.warning(
                "Blocked admin tool '%s' for non-admin user %s",
                tool_name, getattr(user, "email", "?"),
            )
            return json.dumps({"error": "Not authorized for this action."})
        # Shared tools
        if tool_name == "list_clients":
            result = _tool_list_clients(db, user, tool_input.get("search", ""), tool_input.get("status", ""), tool_input.get("limit", 20))
        elif tool_name == "get_client":
            result = _tool_get_client(db, user, tool_input["name"])
        elif tool_name == "create_client":
            fields = {k: v for k, v in tool_input.items() if k != "name" and v is not None}
            result = _tool_create_client(db, user, fields)
        elif tool_name == "update_client":
            result = _tool_update_client(db, user, tool_input["name"], tool_input.get("updates", {}))
        elif tool_name == "list_visits":
            result = _tool_list_visits(db, user, tool_input.get("client_name", ""), tool_input.get("status", ""), tool_input.get("limit", 10))
        elif tool_name == "create_visit":
            result = _tool_create_visit(db, user, tool_input["client_name"], tool_input.get("visit_date", ""), tool_input.get("visit_type", "initial_assessment"), tool_input.get("notes", ""))
        elif tool_name == "get_visit_status":
            result = _tool_get_visit_status(db, user, tool_input["client_name"])
        elif tool_name == "get_billables":
            result = _tool_get_billables(db, user, tool_input["client_name"])
        elif tool_name == "get_visit_note":
            result = _tool_get_visit_note(db, user, tool_input["client_name"])
        elif tool_name == "get_contract":
            result = _tool_get_contract(db, user, tool_input["client_name"])
        elif tool_name == "create_note":
            result = _tool_create_note(db, user, tool_input["title"], tool_input["content"], tool_input.get("client_name", ""), tool_input.get("tags"), tool_input.get("pinned", False))
        elif tool_name == "list_notes":
            result = _tool_list_notes(db, user, tool_input.get("search", ""), tool_input.get("tag", ""), tool_input.get("client_name", ""), tool_input.get("limit", 10))
        elif tool_name == "list_tasks":
            result = _tool_list_tasks(db, user, tool_input.get("status", ""), tool_input.get("priority", ""))
        elif tool_name == "complete_task":
            result = _tool_complete_task(db, user, tool_input["task_title"])
        elif tool_name == "list_caregivers":
            result = _tool_list_caregivers(db, user, tool_input.get("search", ""), tool_input.get("certification", ""), tool_input.get("status", ""), tool_input.get("limit", 10))
        elif tool_name == "match_caregiver":
            result = _tool_match_caregiver(db, user, tool_input["client_name"])
        elif tool_name == "get_reports_overview":
            result = _tool_get_reports_overview(db, user)
        elif tool_name == "get_billing_report":
            result = _tool_get_billing_report(db, user, tool_input.get("days", 30))
        elif tool_name == "get_calendar_events":
            result = _tool_get_calendar_events(db, user, tool_input.get("days", 7))
        elif tool_name == "get_usage":
            result = _tool_get_usage(db, user)
        # Document tools
        elif tool_name == "export_contract":
            result = _tool_export_contract(db, user, tool_input["client_name"], tool_input.get("format", "pdf"))
        elif tool_name == "export_note":
            result = _tool_export_note(db, user, tool_input["client_name"], tool_input.get("format", "pdf"))
        elif tool_name == "export_timesheet":
            result = _tool_export_timesheet(db, user, tool_input["client_name"])
        elif tool_name == "export_billing_report":
            result = _tool_export_billing_report(db, user, tool_input.get("days", 30))
        elif tool_name == "generate_document":
            result = _tool_generate_document(db, user, tool_input["title"], tool_input["doc_type"], tool_input["instructions"], tool_input.get("client_name", ""))
        elif tool_name == "email_document":
            result = _tool_email_document(db, user, tool_input["client_name"], tool_input["doc_type"], tool_input["recipient_email"], tool_input.get("recipient_name", ""), tool_input.get("message", ""))
        # Admin tools
        elif tool_name == "get_outreach_stats":
            result = _tool_get_outreach_stats(db)
        elif tool_name == "get_weekly_summary":
            result = _tool_get_weekly_summary(db, tool_input.get("week_offset", 0))
        elif tool_name == "batch_send_emails":
            result = _tool_batch_send_emails(db, user, tool_input["types"])
        elif tool_name == "mark_call_done":
            result = _tool_mark_call_done(db, user, tool_input["lead_name"], tool_input.get("notes", ""), tool_input.get("callback", False))
        elif tool_name == "search_leads":
            result = _tool_search_leads(db, tool_input.get("query", ""), tool_input.get("state", ""), tool_input.get("status", ""), tool_input.get("limit", 10))
        elif tool_name == "search_investors":
            result = _tool_search_investors(db, tool_input.get("query", ""), tool_input.get("has_email", False), tool_input.get("limit", 10))
        elif tool_name == "get_callbacks":
            result = _tool_get_callbacks(db)
        elif tool_name == "get_pending_work":
            result = _tool_get_pending_work(db)
        elif tool_name == "send_single_email":
            result = _tool_send_single_email(db, user, tool_input["name"], tool_input["type"])
        elif tool_name == "assign_leads_to_team":
            result = _tool_assign_leads(db, user, tool_input["team_member_email"], tool_input["assign_type"], tool_input.get("count", 20), tool_input.get("states"))
        elif tool_name == "add_lead_notes":
            result = _tool_add_lead_notes(db, user, tool_input["lead_name"], tool_input["notes"])
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        logger.error(f"Tool error [{tool_name}]: {e}", exc_info=True)
        result = {"error": "An internal error occurred while processing this request."}

    return json.dumps(result, default=str)


# ══════════════════════════════════════════════════════════════════════
#  API MODELS & ENDPOINT
# ══════════════════════════════════════════════════════════════════════

