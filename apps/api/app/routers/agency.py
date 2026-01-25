"""
Agency Settings Router

Manages agency-wide settings, branding, and templates.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.agency_settings import AgencySettings

router = APIRouter()


class AgencySettingsUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contract_template: Optional[str] = None
    contract_template_name: Optional[str] = None
    contract_template_type: Optional[str] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class AgencySettingsResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contract_template: Optional[str] = None
    contract_template_name: Optional[str] = None
    contract_template_type: Optional[str] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None


def get_or_create_settings(db: Session) -> AgencySettings:
    """Get or create the singleton agency settings record."""
    settings = db.query(AgencySettings).filter(
        AgencySettings.settings_key == "default"
    ).first()
    
    if not settings:
        settings = AgencySettings(settings_key="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.get("", response_model=AgencySettingsResponse)
async def get_agency_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get agency settings."""
    settings = get_or_create_settings(db)
    return AgencySettingsResponse(
        id=str(settings.id),
        name=settings.name,
        address=settings.address,
        city=settings.city,
        state=settings.state,
        zip_code=settings.zip_code,
        phone=settings.phone,
        email=settings.email,
        website=settings.website,
        logo=settings.logo,
        primary_color=settings.primary_color,
        secondary_color=settings.secondary_color,
        contract_template=settings.contract_template,
        contract_template_name=settings.contract_template_name,
        contract_template_type=settings.contract_template_type,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
    )


@router.put("", response_model=AgencySettingsResponse)
async def update_agency_settings(
    settings_update: AgencySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update agency settings."""
    settings = get_or_create_settings(db)
    
    update_data = settings_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    return AgencySettingsResponse(
        id=str(settings.id),
        name=settings.name,
        address=settings.address,
        city=settings.city,
        state=settings.state,
        zip_code=settings.zip_code,
        phone=settings.phone,
        email=settings.email,
        website=settings.website,
        logo=settings.logo,
        primary_color=settings.primary_color,
        secondary_color=settings.secondary_color,
        contract_template=settings.contract_template,
        contract_template_name=settings.contract_template_name,
        contract_template_type=settings.contract_template_type,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
    )


# Public endpoint (no auth) for contract generation worker
@router.get("/public", response_model=AgencySettingsResponse)
async def get_public_agency_settings(
    db: Session = Depends(get_db),
):
    """Get agency settings (public - for worker access)."""
    settings = get_or_create_settings(db)
    return AgencySettingsResponse(
        id=str(settings.id),
        name=settings.name,
        address=settings.address,
        city=settings.city,
        state=settings.state,
        zip_code=settings.zip_code,
        phone=settings.phone,
        email=settings.email,
        website=settings.website,
        logo=settings.logo,
        primary_color=settings.primary_color,
        secondary_color=settings.secondary_color,
        contract_template=settings.contract_template,
        contract_template_name=settings.contract_template_name,
        contract_template_type=settings.contract_template_type,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
    )
