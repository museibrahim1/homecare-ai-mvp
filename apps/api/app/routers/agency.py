"""
Agency Settings Router

Manages agency-wide settings, branding, and templates.
"""

import os
import json
import re
import logging
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.agency_settings import AgencySettings

router = APIRouter()
logger = logging.getLogger(__name__)


class UploadedDocument(BaseModel):
    id: str
    name: str
    type: str
    category: str
    content: str
    uploaded_at: str


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
    documents: Optional[List[UploadedDocument]] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    tax_id: Optional[str] = None
    license_number: Optional[str] = None
    npi_number: Optional[str] = None
    contact_person: Optional[str] = None
    contact_title: Optional[str] = None


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
    documents: Optional[List[dict]] = None
    cancellation_policy: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    tax_id: Optional[str] = None
    license_number: Optional[str] = None
    npi_number: Optional[str] = None
    contact_person: Optional[str] = None
    contact_title: Optional[str] = None


class ExtractInfoRequest(BaseModel):
    content: str  # Base64 encoded document
    document_type: str


class ExtractedInfo(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    license_number: Optional[str] = None
    npi_number: Optional[str] = None
    contact_person: Optional[str] = None
    contact_title: Optional[str] = None
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
    
    # Parse documents JSON if it exists
    documents = []
    if hasattr(settings, 'documents') and settings.documents:
        try:
            documents = json.loads(settings.documents) if isinstance(settings.documents, str) else settings.documents
        except:
            documents = []
    
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
        documents=documents,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
        tax_id=getattr(settings, 'tax_id', None),
        license_number=getattr(settings, 'license_number', None),
        npi_number=getattr(settings, 'npi_number', None),
        contact_person=getattr(settings, 'contact_person', None),
        contact_title=getattr(settings, 'contact_title', None),
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
    
    # Handle documents as JSON
    if 'documents' in update_data:
        docs = update_data['documents']
        if docs is not None:
            update_data['documents'] = json.dumps([d.model_dump() if hasattr(d, 'model_dump') else d for d in docs])
        else:
            update_data['documents'] = '[]'
    
    for field, value in update_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    # Parse documents for response
    documents = []
    if settings.documents:
        try:
            documents = json.loads(settings.documents) if isinstance(settings.documents, str) else settings.documents
        except:
            documents = []
    
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
        documents=documents,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
        tax_id=getattr(settings, 'tax_id', None),
        license_number=getattr(settings, 'license_number', None),
        npi_number=getattr(settings, 'npi_number', None),
        contact_person=getattr(settings, 'contact_person', None),
        contact_title=getattr(settings, 'contact_title', None),
    )


@router.post("/extract-info", response_model=ExtractedInfo)
async def extract_company_info(
    request: ExtractInfoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Extract company information from an uploaded document using AI.
    Supports letterheads, policy documents, contracts, etc.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    
    # Try OpenAI first (more reliable), then fall back to Anthropic
    if openai_key:
        result = await _extract_with_openai(request.content, request.document_type, openai_key)
        if result.name or result.address or result.phone or result.email:
            return result
    
    if anthropic_key:
        result = await _extract_with_claude(request.content, request.document_type, anthropic_key)
        if result.name or result.address or result.phone or result.email:
            return result
    
    if not openai_key and not anthropic_key:
        logger.warning("No LLM API key found for document extraction")
    
    return ExtractedInfo()


async def _extract_with_claude(content: str, doc_type: str, api_key: str) -> ExtractedInfo:
    """Extract company info using Claude."""
    try:
        import anthropic
        
        client = anthropic.Anthropic(api_key=api_key)
        
        # Prepare prompt based on document type
        system_prompt = """You are an expert at extracting business information from documents.
        
Extract the following information if present:
- Company/Agency name
- Street address
- City, State, ZIP code
- Phone number
- Email address
- Website
- Tax ID / EIN
- License number
- NPI number (for healthcare)
- Contact person name
- Contact person title
- Cancellation policy (if this is a policy document)
- Terms and conditions (if present)

Return ONLY a JSON object with these fields (use null for missing fields):
{
    "name": "Company Name",
    "address": "123 Main St",
    "city": "City",
    "state": "State",
    "zip_code": "12345",
    "phone": "(555) 123-4567",
    "email": "email@company.com",
    "website": "https://www.company.com",
    "tax_id": "XX-XXXXXXX",
    "license_number": "ABC123",
    "npi_number": "1234567890",
    "contact_person": "John Smith",
    "contact_title": "Administrator",
    "cancellation_policy": "...",
    "terms_and_conditions": "..."
}"""

        # For base64 content, we'll describe it
        user_prompt = f"""This is a {doc_type} document (base64 encoded). 
        
Please analyze the document content and extract any company/business information you can find.
Look for:
- Letterhead information
- Contact details
- Business identifiers
- Policy text (if applicable)

Document content (first 5000 chars of base64): {content[:5000]}

Extract and return the JSON object with company information."""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0,
        )
        
        # Parse response
        response_text = response.content[0].text
        
        # Try to extract JSON from response
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return ExtractedInfo(**{k: v for k, v in data.items() if v is not None})
        
        return ExtractedInfo()
        
    except Exception as e:
        logger.error(f"Claude extraction failed: {e}")
        return ExtractedInfo()


async def _extract_with_openai(content: str, doc_type: str, api_key: str) -> ExtractedInfo:
    """Extract company info using OpenAI."""
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # If content is base64, try to decode the text portion
        text_content = content
        if content.startswith("data:"):
            # It's a data URL, extract the base64 part
            try:
                import base64
                base64_data = content.split(",")[1] if "," in content else content
                decoded = base64.b64decode(base64_data)
                # Try to decode as text
                try:
                    text_content = decoded.decode('utf-8')
                except:
                    text_content = str(decoded[:2000])
            except:
                text_content = content[:3000]
        
        system_prompt = """You are an expert at extracting business information from documents.
        
Extract ALL of the following information if present in the document:
- name: Company or agency name
- address: Street address
- city: City name
- state: State (abbreviation or full name)
- zip_code: ZIP or postal code
- phone: Phone number
- email: Email address  
- website: Website URL
- tax_id: Tax ID or EIN (format: XX-XXXXXXX)
- license_number: Business or healthcare license number
- npi_number: National Provider Identifier (10 digits)
- contact_person: Primary contact name
- contact_title: Contact's job title
- cancellation_policy: Any cancellation policy text
- terms_and_conditions: Any terms and conditions text

Return a JSON object with these exact field names. Use null for any field not found."""

        user_content = f"""Extract company/business information from this {doc_type} document:

{text_content[:4000]}

Return ONLY a valid JSON object with the extracted information."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        
        data = json.loads(response.choices[0].message.content)
        logger.info(f"OpenAI extracted: {data}")
        return ExtractedInfo(**{k: v for k, v in data.items() if v is not None and k in ExtractedInfo.model_fields})
        
    except Exception as e:
        logger.error(f"OpenAI extraction failed: {e}")
        return ExtractedInfo()


# Public endpoint (no auth) for contract generation worker
@router.get("/public", response_model=AgencySettingsResponse)
async def get_public_agency_settings(
    db: Session = Depends(get_db),
):
    """Get agency settings (public - for worker access)."""
    settings = get_or_create_settings(db)
    
    documents = []
    if hasattr(settings, 'documents') and settings.documents:
        try:
            documents = json.loads(settings.documents) if isinstance(settings.documents, str) else settings.documents
        except:
            documents = []
    
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
        documents=documents,
        cancellation_policy=settings.cancellation_policy,
        terms_and_conditions=settings.terms_and_conditions,
        tax_id=getattr(settings, 'tax_id', None),
        license_number=getattr(settings, 'license_number', None),
        npi_number=getattr(settings, 'npi_number', None),
        contact_person=getattr(settings, 'contact_person', None),
        contact_title=getattr(settings, 'contact_title', None),
    )
