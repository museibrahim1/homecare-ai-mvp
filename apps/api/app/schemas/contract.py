from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class ContractBase(BaseModel):
    client_id: UUID
    title: str
    services: List[Dict[str, Any]] = []
    schedule: Dict[str, Any] = {}
    hourly_rate: Optional[Decimal] = None
    weekly_hours: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    services: Optional[List[Dict[str, Any]]] = None
    schedule: Optional[Dict[str, Any]] = None
    hourly_rate: Optional[Decimal] = None
    weekly_hours: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    status: Optional[str] = None


class ContractResponse(ContractBase):
    id: UUID
    contract_number: Optional[str] = None
    status: str
    client_signature_date: Optional[date] = None
    agency_signature_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
