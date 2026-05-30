"""Pydantic models for the scheduler package."""

from typing import List, Optional

from pydantic import BaseModel


class ScheduledDemoCreate(BaseModel):
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    company_name: Optional[str] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    duration_minutes: int = 30
    notes: Optional[str] = None
    lead_id: Optional[str] = None
    investor_id: Optional[str] = None
    source: str = "cold_call"  # cold_call | inbound | referral


class ScheduledDemoUpdate(BaseModel):
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    company_name: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CrmSearchResult(BaseModel):
    id: str
    type: str  # "lead" | "investor"
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goal_type: str = "calls"  # calls | demos | emails | conversions
    target_value: int = 10
    area: Optional[str] = None  # state or region
    due_date: Optional[str] = None


class GoalUpdate(BaseModel):
    current_value: Optional[int] = None
    status: Optional[str] = None


class MarketingAssetCreate(BaseModel):
    asset_type: str  # email_template | social_post | flyer | call_script
    title: str
    content: str
    target_audience: Optional[str] = None
    tags: List[str] = []
