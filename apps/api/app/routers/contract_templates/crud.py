import base64
import hashlib
import json
import logging
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.contract_template import ContractTemplate
from app.services.ocr_template_scanner import (
    extract_text,
    detect_fields_with_ai,
    build_field_mapping,
    reconcile_versions,
    compute_file_hash,
    DB_FIELD_REGISTRY,
)

from .common import GALLERY_DIR, _template_to_response
from .schemas import (
    FieldInfo, TemplateResponse, TemplateListItem,
    FieldMappingUpdate, ReconciliationReport, GalleryItem,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload", response_model=TemplateResponse)
async def upload_and_scan_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a contract template (PDF or DOCX), run OCR to extract text,
    detect form fields via AI, and build the field mapping.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content_type = file.content_type or ""
    is_pdf = file.filename.lower().endswith(".pdf") or "pdf" in content_type
    is_docx = file.filename.lower().endswith((".docx", ".doc")) or "word" in content_type

    if not (is_pdf or is_docx):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    file_hash = compute_file_hash(file_bytes)

    existing = db.query(ContractTemplate).filter(
        ContractTemplate.owner_id == current_user.id,
        ContractTemplate.file_hash == file_hash,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"This file was already uploaded as template '{existing.name}' (v{existing.version})"
        )

    latest = db.query(ContractTemplate).filter(
        ContractTemplate.owner_id == current_user.id,
        ContractTemplate.name == name,
    ).order_by(ContractTemplate.version.desc()).first()
    next_version = (latest.version + 1) if latest else 1

    if latest:
        db.query(ContractTemplate).filter(
            ContractTemplate.owner_id == current_user.id,
            ContractTemplate.name == name,
            ContractTemplate.is_active == True,
        ).update({"is_active": False})

    ocr_text = await extract_text(file_bytes, file.filename, content_type)
    detected_fields = await detect_fields_with_ai(ocr_text, file.filename)
    field_mapping, unmapped_fields = build_field_mapping(detected_fields)

    # AI second pass: try to map remaining unmapped fields
    if unmapped_fields:
        try:
            from app.services.ocr_template_scanner import ai_auto_map_unmapped
            extra_mapping, unmapped_fields = await ai_auto_map_unmapped(unmapped_fields, field_mapping)
            field_mapping.update(extra_mapping)
            logger.info(f"AI auto-mapped {len(extra_mapping)} additional fields, {len(unmapped_fields)} still unmapped")
        except Exception as e:
            logger.warning(f"AI auto-mapping second pass failed: {e}")

    file_url = f"data:{content_type};base64,{base64.b64encode(file_bytes).decode()}"

    template = ContractTemplate(
        owner_id=current_user.id,
        name=name,
        version=next_version,
        description=description,
        is_active=True,
        file_type="pdf" if is_pdf else "docx",
        file_url=file_url,
        file_hash=file_hash,
        ocr_text=ocr_text,
        detected_fields=detected_fields,
        field_mapping=field_mapping,
        unmapped_fields=unmapped_fields,
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return _template_to_response(template)


@router.get("/", response_model=List[TemplateListItem])
async def list_templates(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contract templates for the current user."""
    query = db.query(ContractTemplate).filter(
        ContractTemplate.owner_id == current_user.id,
    )
    if active_only:
        query = query.filter(ContractTemplate.is_active == True)

    templates = query.order_by(ContractTemplate.created_at.desc()).all()

    return [
        TemplateListItem(
            id=t.id,
            name=t.name,
            version=t.version,
            is_active=t.is_active,
            file_type=t.file_type,
            field_count=len(t.detected_fields or []),
            unmapped_count=len(t.unmapped_fields or []),
            created_at=str(t.created_at),
        )
        for t in templates
    ]


@router.get("/registry/fields")
async def get_field_registry(
    current_user: User = Depends(get_current_user),
):
    """
    Return all known database fields that templates can map to.
    Used by the frontend to let users manually map unmapped fields.
    """
    return {
        "fields": [
            {
                "field_id": field_id,
                "path": info["path"],
                "type": info["type"],
                "category": info["category"],
            }
            for field_id, info in DB_FIELD_REGISTRY.items()
        ],
        "categories": sorted(set(info["category"] for info in DB_FIELD_REGISTRY.values())),
    }


@router.get("/preview/{contract_id}")
async def preview_template_with_data(
    contract_id: UUID,
    template_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the active OCR template's detected fields populated with
    actual contract + client + agency data.  The frontend renders this
    as a live preview so the user can see exactly what the exported
    document will contain.
    """
    from app.models.contract import Contract
    from app.models.client import Client
    from app.models.agency_settings import AgencySettings
    from app.services.document_generation import get_template_placeholders, docx_to_html

    contract = db.query(Contract).join(Client, Contract.client_id == Client.id).filter(
        Contract.id == contract_id,
        Client.created_by == current_user.id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    client = db.query(Client).filter(Client.id == contract.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if template_id:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.id == template_id,
            ContractTemplate.owner_id == current_user.id,
        ).first()
    else:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.owner_id == current_user.id,
            ContractTemplate.is_active == True,
        ).order_by(ContractTemplate.version.desc()).first()

    agency_settings = db.query(AgencySettings).filter(
        AgencySettings.user_id == current_user.id,
    ).first()

    placeholders = get_template_placeholders(client, contract, agency_settings)

    # Alias table: maps OCR field_ids that don't directly exist in placeholders
    # to the correct placeholder key. Handles "bill_to_*" -> "client_*", etc.
    FIELD_ALIASES: dict[str, str] = {
        "name": "client_name",
        "address": "client_address",
        "city": "client_city",
        "state": "client_state",
        "zip": "client_zip",
        "zip_code": "client_zip",
        "phone": "client_phone",
        "home_phone": "client_phone",
        "work_phone": "work_phone",
        "cell_phone": "client_phone",
        "email": "client_email",
        "dob": "date_of_birth",
        "bill_to_name": "client_name",
        "bill_to_address": "client_address",
        "bill_to_city": "client_city",
        "bill_to_state": "client_state",
        "bill_to_zip": "client_zip",
        "bill_to_phone": "client_phone",
        "bill_to_home_phone": "client_phone",
        "bill_to_work_phone": "work_phone",
        "bill_to_email": "client_email",
        "administrative_fee": "admin_fee",
        "total": "monthly_cost",
        "total_cost": "monthly_cost",
        "monthly_package": "monthly_cost",
        "weekday_rate": "hourly_rate",
        "client_rate": "hourly_rate",
        "rate": "hourly_rate",
        "services_provided": "services",
        "services_list": "services",
        "hours_per_week": "weekly_hours",
        "days_of_service": "schedule_days",
        "diagnosis": "primary_diagnosis",
        "care_need_level": "care_level",
        "effective_date": "contract_date",
        "start_date": "effective_date",
        "agreement_date": "contract_date",
        "date": "date",
        "signature": "",
        "client_signature": "",
        "agency_signature": "",
        "signature_date": "date",
        "client_signature_date": "date",
        "agency_signature_date": "date",
        "termination_policy": "cancellation_policy",
        "policies_and_procedures": "policies_and_procedures",
        "emergency_contact_name": "emergency_contact",
        "social_security": "ssn",
    }

    def resolve_value(fid: str, field_mapping: dict) -> str:
        """Try multiple strategies to find a value for a field_id."""
        # Strategy 1: direct placeholder match
        val = placeholders.get(fid, "")
        if val:
            return str(val)

        # Strategy 2: check field_mapping -> db path -> short key
        if fid in field_mapping:
            mapped_path = field_mapping[fid]
            short_key = mapped_path.rsplit(".", 1)[-1] if "." in mapped_path else mapped_path
            val = placeholders.get(short_key, "")
            if val:
                return str(val)

        # Strategy 3: alias table
        alias_key = FIELD_ALIASES.get(fid, "")
        if alias_key:
            val = placeholders.get(alias_key, "")
            if val:
                return str(val)

        # Strategy 4: strip common prefixes and retry
        for prefix in ("client_", "bill_to_", "agency_", "contract_"):
            if fid.startswith(prefix):
                base = fid[len(prefix):]
                val = placeholders.get(base, "") or placeholders.get(f"client_{base}", "")
                if val:
                    return str(val)

        return ""

    def _get_template_html(file_url: str) -> str:
        """Extract DOCX bytes from a data-URL and convert to filled HTML."""
        if not file_url or not file_url.startswith("data:"):
            return ""
        try:
            _, encoded = file_url.split(",", 1)
            template_bytes = base64.b64decode(encoded)
            return docx_to_html(template_bytes, placeholders)
        except Exception as e:
            logger.warning(f"HTML preview generation failed: {e}")
            return ""

    if template:
        mapping = template.field_mapping or {}
        unmapped_ids = {u.get("field_id") for u in (template.unmapped_fields or [])}
        filled_fields = []
        for field in (template.detected_fields or []):
            fid = field.get("field_id", "")
            value = resolve_value(fid, mapping)
            is_mapped = fid not in unmapped_ids
            if value and not is_mapped:
                is_mapped = True

            filled_fields.append({
                "field_id": fid,
                "label": field.get("label", fid),
                "section": field.get("section", ""),
                "type": field.get("type", "text"),
                "required": field.get("required", False),
                "value": value,
                "is_mapped": is_mapped,
            })

        document_html = _get_template_html(template.file_url) if template.file_url else ""

        return {
            "has_template": True,
            "template_name": template.name,
            "template_version": template.version,
            "file_type": template.file_type,
            "fields": filled_fields,
            "document_html": document_html,
        }

    # Fallback: check agency_settings for a legacy uploaded template
    has_legacy = False
    legacy_name = None
    legacy_base64 = None
    if agency_settings:
        if agency_settings.documents:
            try:
                docs = json.loads(agency_settings.documents) if isinstance(agency_settings.documents, str) else agency_settings.documents
                for doc in (docs or []):
                    if doc.get("category") == "contract_template" and doc.get("content"):
                        has_legacy = True
                        legacy_name = doc.get("name", "Uploaded Template")
                        content = doc["content"]
                        legacy_base64 = content.split(",", 1)[1] if "," in content else content
                        break
            except Exception:
                pass
        if not has_legacy and getattr(agency_settings, "contract_template", None):
            has_legacy = True
            legacy_name = getattr(agency_settings, "contract_template_name", None) or "Uploaded Template"
            content = agency_settings.contract_template
            legacy_base64 = content.split(",", 1)[1] if "," in content else content

    if not has_legacy:
        return {"has_template": False, "fields": [], "template_name": None}

    # Generate HTML from the legacy DOCX
    legacy_html = ""
    if legacy_base64:
        try:
            template_bytes = base64.b64decode(legacy_base64)
            legacy_html = docx_to_html(template_bytes, placeholders)
        except Exception as e:
            logger.warning(f"Legacy template HTML generation failed: {e}")

    PREVIEW_FIELDS = [
        ("agency_name", "Agency Name", "agency_info", True),
        ("agency_address", "Agency Address", "agency_info", False),
        ("agency_city", "Agency City", "agency_info", False),
        ("agency_state", "Agency State", "agency_info", False),
        ("agency_zip", "Agency ZIP", "agency_info", False),
        ("agency_phone", "Agency Phone", "agency_info", False),
        ("agency_email", "Agency Email", "agency_info", False),
        ("client_name", "Client Name", "client_info", True),
        ("date_of_birth", "Date of Birth", "client_info", False),
        ("client_address", "Client Address", "client_info", False),
        ("client_city", "Client City", "client_info", False),
        ("client_state", "Client State", "client_info", False),
        ("client_zip", "Client ZIP", "client_info", False),
        ("client_phone", "Client Phone", "client_info", False),
        ("client_email", "Client Email", "client_info", False),
        ("emergency_contact", "Emergency Contact", "client_info", False),
        ("emergency_phone", "Emergency Phone", "client_info", False),
        ("care_level", "Care Need Level", "assessment", True),
        ("primary_diagnosis", "Primary Diagnosis", "assessment", False),
        ("mobility_status", "Mobility Status", "assessment", False),
        ("cognitive_status", "Cognitive Status", "assessment", False),
        ("services", "Services", "services", True),
        ("schedule_days", "Days of Service", "schedule", False),
        ("weekly_hours", "Hours per Week", "schedule", False),
        ("hourly_rate", "Hourly Rate", "rates", True),
        ("weekend_rate", "Weekend Rate", "rates", False),
        ("holiday_rate", "Holiday Rate", "rates", False),
        ("weekly_cost", "Weekly Cost", "rates", False),
        ("monthly_cost", "Monthly Cost", "rates", False),
        ("admin_fee", "Administrative Fee", "rates", False),
        ("deposit", "Deposit", "rates", False),
        ("contract_date", "Contract Date", "contract", True),
        ("effective_date", "Effective Date", "contract", False),
        ("special_requirements", "Special Requirements", "requirements", False),
        ("safety_concerns", "Safety Considerations", "requirements", False),
        ("cancellation_policy", "Cancellation Policy", "policies", False),
        ("terms_and_conditions", "Terms & Conditions", "policies", False),
        ("policies_and_procedures", "Policies & Procedures", "policies", False),
    ]

    filled_fields = []
    for fid, label, section, required in PREVIEW_FIELDS:
        value = placeholders.get(fid, "")
        filled_fields.append({
            "field_id": fid,
            "label": label,
            "section": section,
            "type": "text",
            "required": required,
            "value": str(value) if value else "",
            "is_mapped": True,
        })

    return {
        "has_template": True,
        "template_name": legacy_name,
        "template_version": 1,
        "file_type": "docx",
        "fields": filled_fields,
        "document_html": legacy_html,
    }


