"""Pydantic request/response models for the sales_leads package."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class LeadSummary(BaseModel):
    id: UUID
    provider_name: str
    state: str
    city: Optional[str]
    phone: Optional[str]
    ownership_type: Optional[str]
    years_in_operation: Optional[float]
    star_rating: Optional[str]
    status: str
    priority: str
    contact_email: Optional[str]
    contact_name: Optional[str]
    email_send_count: int
    email_open_count: int
    last_email_sent_at: Optional[datetime]
    is_contacted: bool
    is_converted: bool
    campaign_tag: Optional[str]
    created_at: Optional[datetime]


class LeadDetail(BaseModel):
    id: UUID
    provider_name: str
    state: str
    city: Optional[str]
    address: Optional[str]
    zip_code: Optional[str]
    phone: Optional[str]
    ownership_type: Optional[str]
    ccn: Optional[str]
    certification_date: Optional[str]
    years_in_operation: Optional[float]
    star_rating: Optional[str]
    offers_nursing: bool
    offers_pt: bool
    offers_ot: bool
    offers_speech: bool
    offers_social: bool
    offers_aide: bool
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_title: Optional[str]
    website: Optional[str]
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
    source: Optional[str]
    is_contacted: bool
    is_converted: bool
    converted_at: Optional[datetime]
    activity_log: list
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    website: Optional[str] = None
    campaign_tag: Optional[str] = None
    is_contacted: Optional[bool] = None


class LeadEmailRequest(BaseModel):
    subject: str
    html_body: str
    to_email: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    lead_ids: List[UUID]
    status: str


class LeadStats(BaseModel):
    total: int
    new: int
    contacted: int
    email_sent: int
    email_opened: int
    responded: int
    converted: int
    not_interested: int
    no_response: int
    nebraska_count: int
    iowa_count: int
    last_5_years: int
    last_10_years: int
    has_email: int
    has_website: int



class ImportRequest(BaseModel):
    states: List[str] = ["NE", "IA"]
    all_states: bool = False
    exclude_government: bool = True
    limit_per_state: int = 1000


class CampaignSendRequest(BaseModel):
    template_id: str
    campaign_name: str
    state: Optional[str] = None
    status: Optional[str] = None
    has_email: Optional[bool] = True
    priority: Optional[str] = None
    max_years: Optional[float] = None
    exclude_already_emailed: bool = True


class SequenceLaunchRequest(BaseModel):
    campaign_name: str
    state: Optional[str] = None
    priority: Optional[str] = None
    max_years: Optional[float] = None
    exclude_already_emailed: bool = True


