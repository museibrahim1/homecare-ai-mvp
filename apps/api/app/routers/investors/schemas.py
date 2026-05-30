"""Pydantic request/response models for the investors package."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class InvestorSummary(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    website: Optional[str]
    focus_sectors: list
    focus_stages: list
    check_size_display: Optional[str]
    location: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    status: str
    priority: str
    email_send_count: int
    email_open_count: int
    last_email_sent_at: Optional[datetime]
    campaign_tag: Optional[str]
    source: Optional[str]
    relevance_reason: Optional[str]
    created_at: Optional[datetime]


class InvestorDetail(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    website: Optional[str]
    description: Optional[str]
    focus_sectors: list
    focus_stages: list
    check_size_min: Optional[str]
    check_size_max: Optional[str]
    check_size_display: Optional[str]
    location: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_title: Optional[str]
    contact_linkedin: Optional[str]
    contact_twitter: Optional[str]
    relevance_reason: Optional[str]
    portfolio_companies: list
    source: Optional[str]
    status: str
    priority: str
    notes: Optional[str]
    last_email_sent_at: Optional[datetime]
    last_email_subject: Optional[str]
    email_send_count: int
    email_open_count: int
    last_email_opened_at: Optional[datetime]
    last_response_at: Optional[datetime]
    campaign_tag: Optional[str]
    activity_log: list
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class InvestorCreate(BaseModel):
    fund_name: str
    investor_type: Optional[str] = "vc_fund"
    website: Optional[str] = None
    description: Optional[str] = None
    focus_sectors: Optional[list] = []
    focus_stages: Optional[list] = []
    check_size_min: Optional[str] = None
    check_size_max: Optional[str] = None
    check_size_display: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_linkedin: Optional[str] = None
    contact_twitter: Optional[str] = None
    relevance_reason: Optional[str] = None
    portfolio_companies: Optional[list] = []
    source: Optional[str] = "manual"
    priority: Optional[str] = "medium"
    notes: Optional[str] = None


class InvestorUpdate(BaseModel):
    fund_name: Optional[str] = None
    investor_type: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    focus_sectors: Optional[list] = None
    focus_stages: Optional[list] = None
    check_size_display: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_linkedin: Optional[str] = None
    relevance_reason: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    campaign_tag: Optional[str] = None


class BulkEmailRequest(BaseModel):
    investor_ids: List[UUID]
    subject: str
    html_body: str


class SingleEmailRequest(BaseModel):
    subject: str
    html_body: str
    to_email: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    investor_ids: List[UUID]
    status: str


class InvestorStats(BaseModel):
    total: int
    new: int
    contacted: int
    email_sent: int
    responded: int
    meeting_scheduled: int
    interested: int
    passed: int
    committed: int
    has_email: int
    vc_funds: int
    angels: int
    avg_priority_score: float


# ─── Helpers ───

