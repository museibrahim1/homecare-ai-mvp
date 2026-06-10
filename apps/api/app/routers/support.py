"""
User-facing support tickets.

Lets any signed-in user (mobile or web) submit a ticket, see their own
tickets, and reply to them. Platform-admin triage lives in
`routers/admin_platform/support.py` and shares the same tables.
"""

import logging
import uuid as uuid_lib
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.support_ticket import (
    SupportTicket,
    TicketCategory,
    TicketPriority,
    TicketResponse,
    TicketStatus,
)
from app.models.user import User
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()

ADMIN_NOTIFY_EMAIL = "sales@palmtai.com"


# =============================================================================
# Schemas
# =============================================================================

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10, max_length=10000)
    category: str = "general"
    app_version: Optional[str] = None
    platform: Optional[str] = None  # "ios" / "web"


class TicketReplyCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)


class TicketReplyOut(BaseModel):
    id: str
    message: str
    from_support: bool
    created_at: str


class TicketOut(BaseModel):
    id: str
    ticket_number: str
    subject: str
    description: str
    category: str
    status: str
    created_at: str
    updated_at: Optional[str] = None
    resolution: Optional[str] = None
    replies: List[TicketReplyOut] = []


class TicketSummaryOut(BaseModel):
    id: str
    ticket_number: str
    subject: str
    category: str
    status: str
    created_at: str


# =============================================================================
# Helpers
# =============================================================================

def _ticket_out(ticket: SupportTicket, include_replies: bool = True) -> TicketOut:
    replies = []
    if include_replies:
        for r in ticket.responses:
            replies.append(TicketReplyOut(
                id=str(r.id),
                message=r.message,
                from_support=r.is_admin_response == "true",
                created_at=r.created_at.isoformat() if r.created_at else "",
            ))
    return TicketOut(
        id=str(ticket.id),
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category.value if ticket.category else "general",
        status=ticket.status.value if ticket.status else "open",
        created_at=ticket.created_at.isoformat() if ticket.created_at else "",
        updated_at=ticket.updated_at.isoformat() if ticket.updated_at else None,
        resolution=ticket.resolution,
        replies=replies,
    )


def _owned_ticket(ticket_id: UUID, user: User, db: Session) -> SupportTicket:
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket or ticket.submitted_by_id != user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def _notify_admin_new_ticket(ticket_number: str, subject: str, description: str,
                             category: str, user_email: str, user_name: str,
                             platform: str, app_version: str) -> None:
    try:
        email_service.send_email(
            to=ADMIN_NOTIFY_EMAIL,
            subject=f"[{ticket_number}] New support ticket: {subject}",
            html=f"""
            <div style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#0d9488;margin:0 0 12px;">New Support Ticket</h2>
                <table style="font-size:14px;color:#1e293b;border-collapse:collapse;">
                    <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Ticket</td><td><strong>{ticket_number}</strong></td></tr>
                    <tr><td style="padding:3px 12px 3px 0;color:#64748b;">From</td><td>{user_name} ({user_email})</td></tr>
                    <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Category</td><td>{category}</td></tr>
                    <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Platform</td><td>{platform or "—"} {app_version or ""}</td></tr>
                </table>
                <div style="background:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;padding:14px;margin:16px 0;">
                    <p style="margin:0 0 6px;font-weight:600;">{subject}</p>
                    <p style="margin:0;white-space:pre-wrap;color:#334155;">{description}</p>
                </div>
            </div>
            """,
            reply_to=user_email,
        )
    except Exception:
        logger.exception("Failed to send admin notification for ticket %s", ticket_number)


def _confirm_user_ticket(user_email: str, user_name: str, ticket_number: str, subject: str) -> None:
    try:
        email_service.send_email(
            to=user_email,
            subject=f"We got your request — {ticket_number}",
            sender=email_service.from_support,
            html=f"""
            <div style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#0d9488;margin:0 0 12px;">We're on it</h2>
                <p style="color:#1e293b;">Hi {user_name or "there"},</p>
                <p style="color:#1e293b;">Your support request <strong>{ticket_number}</strong> was received:</p>
                <div style="background:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;padding:14px;margin:16px 0;">
                    <p style="margin:0;font-weight:600;">{subject}</p>
                </div>
                <p style="color:#64748b;font-size:14px;">Our team typically responds within one business day.
                You can track this ticket anytime in the app under Settings &rarr; Support.</p>
                <p style="color:#1e293b;">— The PALM Support Team</p>
            </div>
            """,
        )
    except Exception:
        logger.exception("Failed to send ticket confirmation to %s", user_email)


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/tickets", response_model=TicketOut, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit a new support ticket."""
    try:
        category = TicketCategory(payload.category)
    except ValueError:
        category = TicketCategory.GENERAL

    description = payload.description.strip()
    meta_bits = [b for b in [payload.platform, payload.app_version] if b]
    if meta_bits:
        description += f"\n\n—\nSubmitted from: {' '.join(meta_bits)}"

    ticket = SupportTicket(
        ticket_number=f"PALM-{uuid_lib.uuid4().hex[:6].upper()}",
        submitted_by_id=user.id,
        submitted_by_email=user.email,
        submitted_by_name=user.full_name,
        subject=payload.subject.strip(),
        description=description,
        category=category,
        priority=TicketPriority.HIGH if category == TicketCategory.BUG_REPORT else TicketPriority.MEDIUM,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    background.add_task(
        _notify_admin_new_ticket,
        ticket.ticket_number, ticket.subject, ticket.description,
        category.value, user.email, user.full_name or "",
        payload.platform or "", payload.app_version or "",
    )
    background.add_task(
        _confirm_user_ticket,
        user.email, user.full_name or "", ticket.ticket_number, ticket.subject,
    )

    return _ticket_out(ticket)


@router.get("/tickets", response_model=List[TicketSummaryOut])
async def list_my_tickets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List the current user's tickets, newest first."""
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.submitted_by_id == user.id)
        .order_by(desc(SupportTicket.created_at))
        .limit(100)
        .all()
    )
    return [
        TicketSummaryOut(
            id=str(t.id),
            ticket_number=t.ticket_number,
            subject=t.subject,
            category=t.category.value if t.category else "general",
            status=t.status.value if t.status else "open",
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in tickets
    ]


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_my_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get one of the current user's tickets, including the reply thread."""
    return _ticket_out(_owned_ticket(ticket_id, user, db))


@router.post("/tickets/{ticket_id}/replies", response_model=TicketOut)
async def reply_to_my_ticket(
    ticket_id: UUID,
    payload: TicketReplyCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Add a reply to one of the current user's tickets."""
    ticket = _owned_ticket(ticket_id, user, db)
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=400, detail="This ticket is closed. Please open a new one.")

    db.add(TicketResponse(
        ticket_id=ticket.id,
        responder_id=user.id,
        responder_email=user.email,
        responder_name=user.full_name,
        is_admin_response="false",
        message=payload.message.strip(),
    ))
    # A customer reply reopens the conversation for triage.
    ticket.status = TicketStatus.OPEN
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    background.add_task(
        _notify_admin_new_ticket,
        ticket.ticket_number, f"Re: {ticket.subject}", payload.message.strip(),
        ticket.category.value if ticket.category else "general",
        user.email, user.full_name or "", "", "",
    )

    return _ticket_out(ticket)
