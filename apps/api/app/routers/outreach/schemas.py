"""Pydantic request/response models for the outreach package."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class AgencyEmailItem(BaseModel):
    id: UUID
    provider_name: str
    state: Optional[str]
    city: Optional[str]
    contact_email: Optional[str]
    contact_name: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]


class AgencyCallItem(BaseModel):
    id: UUID
    provider_name: str
    state: Optional[str]
    city: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    is_contacted: bool
    notes: Optional[str]
    called_at: Optional[datetime] = None
    callback_requested: bool = False
    callback_date: Optional[datetime] = None
    callback_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None


class InvestorEmailItem(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    location: Optional[str]
    focus_stages: list
    check_size_display: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]
    relevance_reason: Optional[str]


class OutreachStats(BaseModel):
    total_leads: int
    leads_with_email: int
    leads_contacted: int
    leads_remaining_email: int
    leads_no_email: int
    calls_remaining: int
    total_investors: int
    investors_with_email: int
    investors_contacted: int
    investors_remaining: int
    unsent_agency_emails: int = 0
    unsent_investor_emails: int = 0
    total_called: int = 0
    total_with_phone: int = 0


class WeekDayProgress(BaseModel):
    day: str
    emails_sent: int
    calls_made: int
    investor_emails_sent: int


class DailyPlanResponse(BaseModel):
    agency_emails: List[AgencyEmailItem]
    agency_calls: List[AgencyCallItem]
    investor_emails: List[InvestorEmailItem]
    stats: OutreachStats
    week_progress: List[WeekDayProgress]


class MarkCalledBody(BaseModel):
    notes: Optional[str] = None


class GenerateDraftBody(BaseModel):
    target_type: str  # "agency" | "investor"
    target_id: UUID


class DraftResponse(BaseModel):
    draft_id: str
    target_type: str
    target_id: str
    target_name: str
    to_email: str
    subject: str
    body: str
    is_html: bool


class ApproveDraftBody(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


class WeeklySummaryResponse(BaseModel):
    emails_sent: int
    calls_made: int
    investor_emails_sent: int
    conversions: int
    week_start: str
    week_end: str


class AgencyDraftItem(BaseModel):
    id: UUID
    provider_name: str
    state: Optional[str]
    city: Optional[str]
    contact_email: Optional[str]
    contact_name: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]
    draft_subject: str
    draft_body: str
    is_html: bool


class InvestorDraftItem(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    location: Optional[str]
    focus_stages: list
    check_size_display: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]
    draft_subject: str
    draft_body: str
    is_html: bool


class WeeklyDayPlan(BaseModel):
    date: str
    day_name: str
    is_today: bool
    agency_drafts: List[AgencyDraftItem]
    investor_drafts: List[InvestorDraftItem]
    calls: List[AgencyCallItem]


class WeeklyPlanResponse(BaseModel):
    days: List[WeeklyDayPlan]
    stats: OutreachStats
    week_start: str
    week_end: str
    week_offset: int
    total_weeks: int
    all_contacts_covered: bool
