"""
Caregiver Router

CRUD operations and integrations for caregiver management.
"""

import logging
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
import csv
import io

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.caregiver import Caregiver
from app.schemas.caregiver import (
    CaregiverCreate, CaregiverUpdate, CaregiverResponse, 
    CaregiverListResponse, CaregiverMatchRequest, CaregiverMatchResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[CaregiverListResponse])
async def list_caregivers(
    status: Optional[str] = None,
    certification: Optional[str] = None,
    can_handle_high_care: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List caregivers (data isolation enforced)."""
    # Only show caregivers created by current user
    query = db.query(Caregiver).filter(Caregiver.created_by == current_user.id)
    
    if status:
        query = query.filter(Caregiver.status == status)
    if certification:
        query = query.filter(Caregiver.certification_level == certification)
    if can_handle_high_care is not None:
        query = query.filter(Caregiver.can_handle_high_care == can_handle_high_care)
    if search:
        query = query.filter(
            or_(
                Caregiver.full_name.ilike(f"%{search}%"),
                Caregiver.email.ilike(f"%{search}%"),
                Caregiver.phone.ilike(f"%{search}%"),
            )
        )
    
    return query.order_by(Caregiver.full_name).all()


@router.post("", response_model=CaregiverResponse, status_code=status.HTTP_201_CREATED)
async def create_caregiver(
    caregiver_in: CaregiverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new caregiver (data isolation enforced)."""
    caregiver_data = caregiver_in.model_dump()
    caregiver_data['created_by'] = current_user.id  # Set owner for data isolation
    caregiver = Caregiver(**caregiver_data)
    db.add(caregiver)
    db.commit()
    db.refresh(caregiver)
    return caregiver


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
async def get_caregiver(
    caregiver_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific caregiver (data isolation enforced)."""
    caregiver = db.query(Caregiver).filter(
        Caregiver.id == caregiver_id,
        Caregiver.created_by == current_user.id
    ).first()
    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    return caregiver


@router.put("/{caregiver_id}", response_model=CaregiverResponse)
async def update_caregiver(
    caregiver_id: UUID,
    caregiver_in: CaregiverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a caregiver (data isolation enforced)."""
    caregiver = db.query(Caregiver).filter(
        Caregiver.id == caregiver_id,
        Caregiver.created_by == current_user.id
    ).first()
    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    
    update_data = caregiver_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(caregiver, field, value)
    
    db.commit()
    db.refresh(caregiver)
    return caregiver


@router.delete("/{caregiver_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_caregiver(
    caregiver_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a caregiver (data isolation enforced)."""
    caregiver = db.query(Caregiver).filter(
        Caregiver.id == caregiver_id,
        Caregiver.created_by == current_user.id
    ).first()
    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    
    db.delete(caregiver)
    db.commit()


# =====================================================================
# CAREGIVER MATCHING
# =====================================================================

@router.post("/match", response_model=List[CaregiverMatchResponse])
async def match_caregivers(
    request: CaregiverMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Find best matching caregivers for a client based on care needs (data isolation enforced).
    Used by Claude after care assessment to recommend caregivers.
    """
    query = db.query(Caregiver).filter(
        Caregiver.status == 'active',
        Caregiver.created_by == current_user.id
    )
    
    # Filter by care level capability
    if request.care_level == "HIGH":
        query = query.filter(Caregiver.can_handle_high_care == True)
    elif request.care_level == "MODERATE":
        query = query.filter(Caregiver.can_handle_moderate_care == True)
    else:
        query = query.filter(Caregiver.can_handle_low_care == True)
    
    # Filter by availability (has capacity)
    query = query.filter(Caregiver.current_client_count < Caregiver.max_clients)
    
    caregivers = query.all()
    
    # Score and rank caregivers
    matches = []
    for cg in caregivers:
        score = 50.0  # Base score
        reasons = []
        
        # Care level match
        if request.care_level == "HIGH" and cg.can_handle_high_care:
            score += 20
            reasons.append("Qualified for high-care clients")
        
        # Specialization match
        if request.specializations_needed and cg.specializations:
            matching_specs = set(request.specializations_needed) & set(cg.specializations)
            if matching_specs:
                score += len(matching_specs) * 10
                reasons.append(f"Specializes in: {', '.join(matching_specs)}")
        
        # Language match
        if request.preferred_language and cg.languages:
            if request.preferred_language in cg.languages:
                score += 15
                reasons.append(f"Speaks {request.preferred_language}")
        
        # Location match
        if request.city and cg.city:
            if request.city.lower() == cg.city.lower():
                score += 10
                reasons.append("Same city as client")
        if request.state and cg.state:
            if request.state.lower() == cg.state.lower():
                score += 5
                reasons.append("Same state as client")
        
        # Experience bonus
        if cg.years_experience >= 5:
            score += 10
            reasons.append(f"{cg.years_experience} years experience")
        elif cg.years_experience >= 2:
            score += 5
            reasons.append(f"{cg.years_experience} years experience")
        
        # Rating bonus
        if cg.rating >= 4.5:
            score += 10
            reasons.append(f"Highly rated ({cg.rating}/5)")
        
        # Availability bonus (fewer clients = more available)
        availability_ratio = 1 - (cg.current_client_count / cg.max_clients)
        score += availability_ratio * 10
        if availability_ratio > 0.5:
            reasons.append("High availability")
        
        matches.append(CaregiverMatchResponse(
            caregiver=CaregiverListResponse.model_validate(cg),
            match_score=min(score, 100),
            match_reasons=reasons,
        ))
    
    # Sort by score descending
    matches.sort(key=lambda x: x.match_score, reverse=True)
    
    return matches[:10]  # Return top 10 matches


# =====================================================================
# INTEGRATIONS
# =====================================================================

@router.post("/import/csv")
async def import_caregivers_from_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import caregivers from a CSV file.
    
    Expected columns: full_name, phone, email, certification_level, 
    specializations (comma-separated), languages (comma-separated),
    can_handle_high_care (true/false), years_experience, city, state
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    text = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(text))
    
    imported = 0
    errors = []
    
    for row in reader:
        try:
            # Check for existing caregiver by email
            if row.get('email'):
                existing = db.query(Caregiver).filter(
                    Caregiver.email == row['email']
                ).first()
                if existing:
                    errors.append(f"Caregiver with email {row['email']} already exists")
                    continue
            
            caregiver = Caregiver(
                full_name=row.get('full_name', '').strip(),
                phone=row.get('phone', '').strip() or None,
                email=row.get('email', '').strip() or None,
                certification_level=row.get('certification_level', '').strip() or None,
                specializations=row.get('specializations', '').split(',') if row.get('specializations') else [],
                languages=row.get('languages', '').split(',') if row.get('languages') else ['English'],
                can_handle_high_care=row.get('can_handle_high_care', '').lower() == 'true',
                can_handle_moderate_care=True,
                can_handle_low_care=True,
                years_experience=int(row.get('years_experience', 0)) if row.get('years_experience') else 0,
                city=row.get('city', '').strip() or None,
                state=row.get('state', '').strip() or None,
                status='active',
                external_source='csv',
            )
            db.add(caregiver)
            imported += 1
        except Exception as e:
            errors.append(f"Error importing row: {str(e)}")
    
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors,
        "message": f"Successfully imported {imported} caregivers"
    }


@router.post("/import/bulk")
async def import_caregivers_bulk(
    caregivers: List[CaregiverCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import multiple caregivers via JSON array."""
    imported = 0
    errors = []
    
    for cg_data in caregivers:
        try:
            # Check for existing
            if cg_data.email:
                existing = db.query(Caregiver).filter(
                    Caregiver.email == cg_data.email
                ).first()
                if existing:
                    errors.append(f"Caregiver with email {cg_data.email} already exists")
                    continue
            
            caregiver = Caregiver(**cg_data.model_dump())
            db.add(caregiver)
            imported += 1
        except Exception as e:
            errors.append(str(e))
    
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors,
        "message": f"Successfully imported {imported} caregivers"
    }


@router.post("/webhooks/generic")
async def caregiver_webhook(
    data: dict,
    db: Session = Depends(get_db),
):
    """
    Generic webhook for receiving caregiver data from external systems.
    No auth required - intended for automated integrations.
    """
    try:
        caregiver = Caregiver(
            full_name=data.get('full_name') or data.get('name', 'Unknown'),
            phone=data.get('phone'),
            email=data.get('email'),
            certification_level=data.get('certification_level') or data.get('certification'),
            specializations=data.get('specializations', []),
            languages=data.get('languages', ['English']),
            can_handle_high_care=data.get('can_handle_high_care', False),
            can_handle_moderate_care=data.get('can_handle_moderate_care', True),
            can_handle_low_care=data.get('can_handle_low_care', True),
            years_experience=data.get('years_experience', 0),
            city=data.get('city'),
            state=data.get('state'),
            status='active',
            external_id=data.get('external_id'),
            external_source=data.get('source', 'webhook'),
        )
        db.add(caregiver)
        db.commit()
        db.refresh(caregiver)
        
        return {"status": "success", "caregiver_id": str(caregiver.id)}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
