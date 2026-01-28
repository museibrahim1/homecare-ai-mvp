"""
Support Ticket Model

Handles support requests from businesses.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_ON_CUSTOMER = "waiting_on_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, Enum):
    GENERAL = "general"
    BILLING = "billing"
    TECHNICAL = "technical"
    FEATURE_REQUEST = "feature_request"
    BUG_REPORT = "bug_report"
    ACCOUNT = "account"
    COMPLIANCE = "compliance"


class SupportTicket(Base):
    """Support tickets from businesses."""
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(20), unique=True, nullable=False)
    
    # Who submitted
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    submitted_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    submitted_by_email = Column(String(255), nullable=False)
    submitted_by_name = Column(String(255))
    
    # Ticket details
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(TicketCategory), default=TicketCategory.GENERAL)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    
    # Assignment
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Resolution
    resolution = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    first_response_at = Column(DateTime(timezone=True))
    
    # Relationships
    responses = relationship("TicketResponse", back_populates="ticket", order_by="TicketResponse.created_at")


class TicketResponse(Base):
    """Responses to support tickets."""
    __tablename__ = "ticket_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False)
    
    # Who responded
    responder_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    responder_email = Column(String(255), nullable=False)
    responder_name = Column(String(255))
    is_admin_response = Column(String(10), default="false")  # true if from platform admin
    
    # Response content
    message = Column(Text, nullable=False)
    
    # Attachments (S3 paths)
    attachments = Column(Text)  # JSON list
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="responses")
