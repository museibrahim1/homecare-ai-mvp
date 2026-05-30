"""Pydantic models for the platform admin package."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class PlatformStats(BaseModel):
    total_businesses: int
    active_businesses: int
    pending_approvals: int
    total_users: int
    total_visits: int
    total_contracts: int
    visits_this_month: int
    contracts_this_month: int
    revenue_this_month: float
    active_subscriptions: int


class BusinessAnalytics(BaseModel):
    id: UUID
    name: str
    status: str
    users_count: int
    clients_count: int
    visits_count: int
    contracts_count: int
    subscription_tier: Optional[str]
    created_at: datetime


class ComplianceAlert(BaseModel):
    id: UUID
    business_id: UUID
    business_name: str
    alert_type: str
    document_type: Optional[str]
    expiration_date: Optional[datetime]
    days_until_expiry: Optional[int]
    severity: str


class AuditLogEntry(BaseModel):
    id: UUID
    user_email: Optional[str]
    action: str
    entity_type: Optional[str]
    description: Optional[str]
    ip_address: Optional[str]
    created_at: datetime


class PlatformUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "admin"


class PlatformUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = "Unknown"
    role: str = "user"
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None


class TicketSummary(BaseModel):
    id: UUID
    ticket_number: str
    subject: str
    business_name: Optional[str]
    category: str
    priority: str
    status: str
    created_at: datetime


class TicketDetail(BaseModel):
    id: UUID
    ticket_number: str
    subject: str
    description: str
    business_name: Optional[str]
    submitted_by_name: Optional[str]
    submitted_by_email: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[str]
    responses: List[dict]
    created_at: datetime
    first_response_at: Optional[datetime]


class TicketResponseCreate(BaseModel):
    message: str


class SystemHealthStatus(BaseModel):
    api_status: str
    database_status: str
    redis_status: str
    storage_status: str
    worker_status: str
    last_checked: datetime
