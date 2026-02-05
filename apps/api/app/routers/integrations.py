"""
Integrations Router

API endpoints for importing clients from external sources:
- Monday.com
- CSV/Excel upload
- Generic JSON API
- Webhooks
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class ClientImport(BaseModel):
    """Schema for importing a single client - all fields supported."""
    # Basic Information
    full_name: str
    preferred_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    
    # Contact Information
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Emergency Contacts
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_2_name: Optional[str] = None
    emergency_contact_2_phone: Optional[str] = None
    emergency_contact_2_relationship: Optional[str] = None
    
    # Medical Information
    primary_diagnosis: Optional[str] = None
    secondary_diagnoses: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    physician_name: Optional[str] = None
    physician_phone: Optional[str] = None
    medical_notes: Optional[str] = None
    
    # Care Information
    mobility_status: Optional[str] = None
    cognitive_status: Optional[str] = None
    living_situation: Optional[str] = None
    care_level: Optional[str] = None
    care_plan: Optional[str] = None
    special_requirements: Optional[str] = None
    
    # Insurance & Billing
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None
    billing_address: Optional[str] = None
    
    # Scheduling Preferences
    preferred_days: Optional[str] = None
    preferred_times: Optional[str] = None
    
    # Status
    status: Optional[str] = "active"
    intake_date: Optional[str] = None
    discharge_date: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # External system reference
    external_id: Optional[str] = None
    external_source: Optional[str] = None  # e.g., "monday.com", "salesforce"


class BulkImportRequest(BaseModel):
    """Request for bulk client import."""
    clients: List[ClientImport]
    source: str = "api"
    skip_duplicates: bool = True


class BulkImportResponse(BaseModel):
    """Response for bulk import."""
    imported: int
    skipped: int
    errors: List[Dict[str, Any]]
    clients: List[Dict[str, Any]]


class MondayWebhookPayload(BaseModel):
    """Monday.com webhook payload."""
    event: Dict[str, Any]
    challenge: Optional[str] = None


class IntegrationConfig(BaseModel):
    """Configuration for an integration."""
    enabled: bool = False
    api_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    board_id: Optional[str] = None
    field_mapping: Optional[Dict[str, str]] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def find_existing_client(db: Session, client_data: ClientImport, user_id) -> Optional[Client]:
    """Find existing client by external_id, email, or phone (data isolation enforced)."""
    if client_data.external_id and client_data.external_source:
        existing = db.query(Client).filter(
            Client.external_id == client_data.external_id,
            Client.external_source == client_data.external_source,
            Client.created_by == user_id
        ).first()
        if existing:
            return existing
    
    if client_data.email:
        existing = db.query(Client).filter(
            Client.email == client_data.email,
            Client.created_by == user_id
        ).first()
        if existing:
            return existing
    
    if client_data.phone:
        existing = db.query(Client).filter(
            Client.phone == client_data.phone,
            Client.created_by == user_id
        ).first()
        if existing:
            return existing
    
    return None


def create_client_from_import(db: Session, client_data: ClientImport, user_id) -> Client:
    """Create a new client from import data (with data isolation)."""
    client = Client(
        # Data isolation - assign to importing user
        created_by=user_id,
        # Basic Information
        full_name=client_data.full_name,
        preferred_name=client_data.preferred_name,
        date_of_birth=client_data.date_of_birth,
        gender=client_data.gender,
        # Contact Information
        phone=client_data.phone,
        phone_secondary=client_data.phone_secondary,
        email=client_data.email,
        address=client_data.address,
        city=client_data.city,
        state=client_data.state,
        zip_code=client_data.zip_code,
        # Emergency Contacts
        emergency_contact_name=client_data.emergency_contact_name,
        emergency_contact_phone=client_data.emergency_contact_phone,
        emergency_contact_relationship=client_data.emergency_contact_relationship,
        emergency_contact_2_name=client_data.emergency_contact_2_name,
        emergency_contact_2_phone=client_data.emergency_contact_2_phone,
        emergency_contact_2_relationship=client_data.emergency_contact_2_relationship,
        # Medical Information
        primary_diagnosis=client_data.primary_diagnosis,
        secondary_diagnoses=client_data.secondary_diagnoses,
        allergies=client_data.allergies,
        medications=client_data.medications,
        physician_name=client_data.physician_name,
        physician_phone=client_data.physician_phone,
        medical_notes=client_data.medical_notes,
        # Care Information
        mobility_status=client_data.mobility_status,
        cognitive_status=client_data.cognitive_status,
        living_situation=client_data.living_situation,
        care_level=client_data.care_level,
        care_plan=client_data.care_plan,
        special_requirements=client_data.special_requirements,
        # Insurance & Billing
        insurance_provider=client_data.insurance_provider,
        insurance_id=client_data.insurance_id,
        medicaid_id=client_data.medicaid_id,
        medicare_id=client_data.medicare_id,
        billing_address=client_data.billing_address,
        # Scheduling
        preferred_days=client_data.preferred_days,
        preferred_times=client_data.preferred_times,
        # Status
        status=client_data.status or "active",
        intake_date=client_data.intake_date,
        discharge_date=client_data.discharge_date,
        # Notes
        notes=client_data.notes,
        # External Integration
        external_id=client_data.external_id,
        external_source=client_data.external_source,
    )
    db.add(client)
    return client


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/import/bulk", response_model=BulkImportResponse)
async def bulk_import_clients(
    request: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk import clients from JSON data.
    
    Useful for:
    - Initial data migration
    - Syncing from external CRM
    - Batch updates
    """
    imported = 0
    skipped = 0
    errors = []
    created_clients = []
    
    for idx, client_data in enumerate(request.clients):
        try:
            # Check for existing client (with data isolation)
            if request.skip_duplicates:
                existing = find_existing_client(db, client_data, current_user.id)
                if existing:
                    skipped += 1
                    continue
            
            # Create new client (with data isolation)
            client = create_client_from_import(db, client_data, current_user.id)
            db.flush()  # Get the ID
            
            created_clients.append({
                "id": str(client.id),
                "full_name": client.full_name,
                "external_id": client.external_id,
            })
            imported += 1
            
        except Exception as e:
            errors.append({
                "index": idx,
                "client_name": client_data.full_name,
                "error": str(e),
            })
    
    db.commit()
    
    return BulkImportResponse(
        imported=imported,
        skipped=skipped,
        errors=errors,
        clients=created_clients,
    )


@router.post("/import/csv")
async def import_clients_from_csv(
    file: UploadFile = File(...),
    skip_duplicates: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import clients from a CSV file.
    
    Expected columns (case-insensitive):
    - name / full_name (required)
    - phone / phone_number
    - email
    - address
    - date_of_birth / dob
    - emergency_contact_name
    - emergency_contact_phone
    - notes
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Normalize column names
    column_mapping = {
        'name': 'full_name',
        'full_name': 'full_name',
        'client_name': 'full_name',
        'phone': 'phone',
        'phone_number': 'phone',
        'telephone': 'phone',
        'email': 'email',
        'email_address': 'email',
        'address': 'address',
        'street_address': 'address',
        'date_of_birth': 'date_of_birth',
        'dob': 'date_of_birth',
        'birthday': 'date_of_birth',
        'emergency_contact': 'emergency_contact_name',
        'emergency_contact_name': 'emergency_contact_name',
        'emergency_phone': 'emergency_contact_phone',
        'emergency_contact_phone': 'emergency_contact_phone',
        'notes': 'notes',
        'comments': 'notes',
    }
    
    imported = 0
    skipped = 0
    errors = []
    created_clients = []
    
    for idx, row in enumerate(reader):
        try:
            # Map columns
            mapped_row = {}
            for key, value in row.items():
                normalized_key = key.lower().strip().replace(' ', '_')
                if normalized_key in column_mapping:
                    mapped_row[column_mapping[normalized_key]] = value.strip() if value else None
            
            if not mapped_row.get('full_name'):
                errors.append({
                    "row": idx + 2,  # +2 for header and 0-index
                    "error": "Missing required field: name/full_name",
                })
                continue
            
            client_data = ClientImport(
                full_name=mapped_row.get('full_name'),
                phone=mapped_row.get('phone'),
                email=mapped_row.get('email'),
                address=mapped_row.get('address'),
                date_of_birth=mapped_row.get('date_of_birth'),
                emergency_contact_name=mapped_row.get('emergency_contact_name'),
                emergency_contact_phone=mapped_row.get('emergency_contact_phone'),
                notes=mapped_row.get('notes'),
                external_source='csv_import',
            )
            
            # Check for duplicates (with data isolation)
            if skip_duplicates:
                existing = find_existing_client(db, client_data, current_user.id)
                if existing:
                    skipped += 1
                    continue
            
            # Create client (with data isolation)
            client = create_client_from_import(db, client_data, current_user.id)
            db.flush()
            
            created_clients.append({
                "id": str(client.id),
                "full_name": client.full_name,
            })
            imported += 1
            
        except Exception as e:
            errors.append({
                "row": idx + 2,
                "error": str(e),
            })
    
    db.commit()
    
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "clients": created_clients,
    }


# =============================================================================
# MONDAY.COM INTEGRATION
# =============================================================================

@router.post("/webhooks/monday")
async def monday_webhook(
    payload: Dict[str, Any],
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Webhook endpoint for Monday.com.
    
    Handles:
    - Challenge verification
    - Item created events
    - Item updated events
    """
    # Handle challenge verification
    if "challenge" in payload:
        return {"challenge": payload["challenge"]}
    
    event = payload.get("event", {})
    event_type = event.get("type")
    
    if event_type == "create_item" or event_type == "update_item":
        # Extract item data
        item_id = event.get("itemId") or event.get("pulseId")
        board_id = event.get("boardId")
        column_values = event.get("columnValues", {})
        item_name = event.get("pulseName") or event.get("itemName", "")
        
        # Map Monday.com columns to client fields
        # Default mapping - agencies can customize this
        client_data = ClientImport(
            full_name=item_name,
            phone=extract_monday_value(column_values, ["phone", "phone_number", "telephone"]),
            email=extract_monday_value(column_values, ["email", "email_address"]),
            address=extract_monday_value(column_values, ["address", "location", "street"]),
            notes=extract_monday_value(column_values, ["notes", "comments", "text"]),
            external_id=str(item_id),
            external_source="monday.com",
        )
        
        # Check if client exists (update) or create new
        existing = db.query(Client).filter(
            Client.external_id == str(item_id),
            Client.external_source == "monday.com"
        ).first()
        
        if existing:
            # Update existing client
            existing.full_name = client_data.full_name
            if client_data.phone:
                existing.phone = client_data.phone
            if client_data.email:
                existing.email = client_data.email
            if client_data.address:
                existing.address = client_data.address
            if client_data.notes:
                existing.notes = client_data.notes
            existing.updated_at = datetime.now(timezone.utc)
        else:
            # Create new client
            create_client_from_import(db, client_data)
        
        db.commit()
        return {"status": "success", "action": "update" if existing else "create"}
    
    return {"status": "ignored", "event_type": event_type}


def extract_monday_value(column_values: Dict, possible_keys: List[str]) -> Optional[str]:
    """Extract value from Monday.com column values."""
    for key in possible_keys:
        for col_id, col_data in column_values.items():
            col_title = col_data.get("title", "").lower()
            if key in col_title:
                value = col_data.get("text") or col_data.get("value")
                if isinstance(value, str):
                    return value
                elif isinstance(value, dict):
                    return value.get("text") or value.get("phone") or value.get("email")
    return None


# =============================================================================
# GENERIC WEBHOOK / API SYNC
# =============================================================================

@router.post("/webhooks/generic")
async def generic_webhook(
    payload: Dict[str, Any],
    x_webhook_source: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Generic webhook for any external system.
    
    Expects JSON with client data fields.
    Can include single client or array of clients.
    """
    # Handle single client or array
    clients_data = payload.get("clients") or payload.get("data") or [payload]
    if not isinstance(clients_data, list):
        clients_data = [clients_data]
    
    source = x_webhook_source or payload.get("source", "webhook")
    
    imported = 0
    errors = []
    
    for item in clients_data:
        try:
            # Flexible field mapping
            client_data = ClientImport(
                full_name=item.get("full_name") or item.get("name") or item.get("client_name", "Unknown"),
                phone=item.get("phone") or item.get("phone_number") or item.get("telephone"),
                email=item.get("email") or item.get("email_address"),
                address=item.get("address") or item.get("street_address"),
                date_of_birth=item.get("date_of_birth") or item.get("dob") or item.get("birthday"),
                emergency_contact_name=item.get("emergency_contact_name") or item.get("emergency_contact"),
                emergency_contact_phone=item.get("emergency_contact_phone") or item.get("emergency_phone"),
                notes=item.get("notes") or item.get("comments"),
                external_id=str(item.get("id") or item.get("external_id", "")),
                external_source=source,
            )
            
            # Check for existing
            existing = find_existing_client(db, client_data)
            if existing:
                # Update
                existing.full_name = client_data.full_name
                if client_data.phone:
                    existing.phone = client_data.phone
                if client_data.email:
                    existing.email = client_data.email
                if client_data.address:
                    existing.address = client_data.address
            else:
                # Create
                create_client_from_import(db, client_data)
            
            imported += 1
            
        except Exception as e:
            errors.append({"item": item.get("name", "unknown"), "error": str(e)})
    
    db.commit()
    
    return {
        "status": "success",
        "imported": imported,
        "errors": errors,
    }


# =============================================================================
# FETCH FROM EXTERNAL SOURCES
# =============================================================================

@router.post("/fetch/monday")
async def fetch_from_monday(
    board_id: str = Form(...),
    api_key: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch clients from a Monday.com board.
    
    Requires:
    - board_id: The Monday.com board ID
    - api_key: Monday.com API key
    """
    import httpx
    
    query = """
    query ($boardId: ID!) {
        boards(ids: [$boardId]) {
            items_page(limit: 500) {
                items {
                    id
                    name
                    column_values {
                        id
                        title
                        text
                        value
                    }
                }
            }
        }
    }
    """
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.monday.com/v2",
            json={"query": query, "variables": {"boardId": board_id}},
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Monday.com API error: {response.text}"
            )
        
        data = response.json()
    
    if "errors" in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Monday.com API error: {data['errors']}"
        )
    
    boards = data.get("data", {}).get("boards", [])
    if not boards:
        return {"imported": 0, "message": "No boards found"}
    
    items = boards[0].get("items_page", {}).get("items", [])
    
    imported = 0
    skipped = 0
    
    for item in items:
        item_id = item.get("id")
        item_name = item.get("name", "")
        column_values = {cv["id"]: cv for cv in item.get("column_values", [])}
        
        # Check if already exists (with data isolation)
        existing = db.query(Client).filter(
            Client.external_id == str(item_id),
            Client.external_source == "monday.com",
            Client.created_by == current_user.id
        ).first()
        
        if existing:
            skipped += 1
            continue
        
        # Create client (with data isolation)
        client_data = ClientImport(
            full_name=item_name,
            phone=extract_monday_column(column_values, ["phone", "telephone"]),
            email=extract_monday_column(column_values, ["email"]),
            address=extract_monday_column(column_values, ["address", "location"]),
            notes=extract_monday_column(column_values, ["notes", "text"]),
            external_id=str(item_id),
            external_source="monday.com",
        )
        
        create_client_from_import(db, client_data, current_user.id)
        imported += 1
    
    db.commit()
    
    return {
        "imported": imported,
        "skipped": skipped,
        "total_items": len(items),
    }


def extract_monday_column(column_values: Dict, keywords: List[str]) -> Optional[str]:
    """Extract value from Monday.com column by title keywords."""
    for col_id, col_data in column_values.items():
        title = col_data.get("title", "").lower()
        for keyword in keywords:
            if keyword in title:
                return col_data.get("text")
    return None


# =============================================================================
# INTEGRATION STATUS
# =============================================================================

@router.get("/status")
async def get_integration_status(
    current_user: User = Depends(get_current_user),
):
    """Get status of available integrations."""
    return {
        "integrations": [
            {
                "id": "monday",
                "name": "Monday.com",
                "description": "Import clients from Monday.com boards",
                "webhook_url": "/api/integrations/webhooks/monday",
                "fetch_url": "/api/integrations/fetch/monday",
                "status": "available",
            },
            {
                "id": "csv",
                "name": "CSV Import",
                "description": "Import clients from CSV files",
                "upload_url": "/api/integrations/import/csv",
                "status": "available",
            },
            {
                "id": "api",
                "name": "API Import",
                "description": "Bulk import via JSON API",
                "endpoint": "/api/integrations/import/bulk",
                "status": "available",
            },
            {
                "id": "webhook",
                "name": "Generic Webhook",
                "description": "Receive client data from any system",
                "webhook_url": "/api/integrations/webhooks/generic",
                "status": "available",
            },
        ]
    }
