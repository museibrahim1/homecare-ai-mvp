import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.business import Business, BusinessDocument, BusinessUser, VerificationStatus
from app.models.subscription import Plan, Subscription, Invoice, PlanTier, SubscriptionStatus
from app.models.support_ticket import SupportTicket, TicketResponse, TicketStatus, TicketPriority, TicketCategory
from app.models.audit_log import AuditLog
from app.models.visit import Visit
from app.models.contract import Contract
from app.models.client import Client
from app.services.email import email_service

from .common import require_platform_admin
from .schemas import (
    PlatformStats, BusinessAnalytics, ComplianceAlert, AuditLogEntry,
    PlatformUserCreate, PlatformUserResponse, TicketSummary, TicketDetail,
    TicketResponseCreate, SystemHealthStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# SUPPORT TICKETS
# =============================================================================

@router.get("/support/tickets", response_model=List[TicketSummary])
async def list_support_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """List all support tickets."""
    query = db.query(SupportTicket)
    
    if status:
        query = query.filter(SupportTicket.status == TicketStatus(status))
    if priority:
        query = query.filter(SupportTicket.priority == TicketPriority(priority))
    if category:
        query = query.filter(SupportTicket.category == TicketCategory(category))
    
    tickets = query.order_by(desc(SupportTicket.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for t in tickets:
        business = db.query(Business).filter(Business.id == t.business_id).first() if t.business_id else None
        result.append(TicketSummary(
            id=t.id,
            ticket_number=t.ticket_number,
            subject=t.subject,
            business_name=business.name if business else None,
            category=t.category.value,
            priority=t.priority.value,
            status=t.status.value,
            created_at=t.created_at,
        ))
    
    return result


@router.get("/support/tickets/{ticket_id}", response_model=TicketDetail)
async def get_ticket_detail(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get ticket details."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    business = db.query(Business).filter(Business.id == ticket.business_id).first() if ticket.business_id else None
    assigned = db.query(User).filter(User.id == ticket.assigned_to_id).first() if ticket.assigned_to_id else None
    
    responses = []
    for r in ticket.responses:
        responses.append({
            "id": str(r.id),
            "message": r.message,
            "responder_name": r.responder_name,
            "responder_email": r.responder_email,
            "is_admin": r.is_admin_response == "true",
            "created_at": r.created_at.isoformat(),
        })
    
    return TicketDetail(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        business_name=business.name if business else None,
        submitted_by_name=ticket.submitted_by_name,
        submitted_by_email=ticket.submitted_by_email,
        category=ticket.category.value,
        priority=ticket.priority.value,
        status=ticket.status.value,
        assigned_to=assigned.full_name if assigned else None,
        responses=responses,
        created_at=ticket.created_at,
        first_response_at=ticket.first_response_at,
    )


@router.post("/support/tickets/{ticket_id}/respond")
async def respond_to_ticket(
    ticket_id: UUID,
    response_data: TicketResponseCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Respond to a support ticket."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    response = TicketResponse(
        ticket_id=ticket.id,
        responder_id=admin.id,
        responder_email=admin.email,
        responder_name=admin.full_name,
        is_admin_response="true",
        message=response_data.message,
    )
    db.add(response)
    
    # Update ticket
    if not ticket.first_response_at:
        ticket.first_response_at = datetime.now(timezone.utc)
    ticket.status = TicketStatus.IN_PROGRESS
    
    db.commit()
    
    submitter = db.query(User).filter(User.id == ticket.submitted_by_id).first()
    if submitter:
        email_service.send_email(
            to=submitter.email,
            subject=f"Update on your support ticket - PalmCare AI",
            sender=email_service.from_support,
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">Support Ticket Update</h2>
                <p>Hi {submitter.full_name},</p>
                <p>Our team has responded to your support ticket:</p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #6366f1;">
                    <p style="margin: 0; white-space: pre-wrap;">{response_data.message}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">If you need further assistance, please reply to this ticket in the app.</p>
                <p>Best regards,<br>The PalmCare AI Support Team</p>
            </div>
            """,
        )
    
    return {"message": "Response added"}


@router.put("/support/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: UUID,
    new_status: str,
    resolution: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Update ticket status."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = TicketStatus(new_status)
    
    if new_status in ["resolved", "closed"]:
        ticket.resolved_at = datetime.now(timezone.utc)
        ticket.resolved_by_id = admin.id
        if resolution:
            ticket.resolution = resolution
    
    db.commit()
    
    return {"message": f"Ticket status updated to {new_status}"}


@router.put("/support/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: UUID,
    assignee_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Assign ticket to an admin."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    assignee = db.query(User).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    ticket.assigned_to_id = assignee_id
    db.commit()
    
    return {"message": f"Ticket assigned to {assignee.full_name}"}


@router.get("/support/stats")
async def get_support_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Get support ticket statistics."""
    total = db.query(SupportTicket).count()
    open_tickets = db.query(SupportTicket).filter(
        SupportTicket.status == TicketStatus.OPEN
    ).count()
    in_progress = db.query(SupportTicket).filter(
        SupportTicket.status == TicketStatus.IN_PROGRESS
    ).count()
    resolved = db.query(SupportTicket).filter(
        SupportTicket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()
    
    avg_response_hours = None
    try:
        responded_tickets = db.query(SupportTicket).filter(
            SupportTicket.first_response_at.isnot(None),
        ).all()
        if responded_tickets:
            total_seconds = sum(
                (t.first_response_at - t.created_at).total_seconds()
                for t in responded_tickets
                if t.first_response_at and t.created_at
            )
            avg_response_hours = round(total_seconds / len(responded_tickets) / 3600, 1)
    except Exception:
        pass
    
    return {
        "total_tickets": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "avg_response_time_hours": avg_response_hours,
    }


