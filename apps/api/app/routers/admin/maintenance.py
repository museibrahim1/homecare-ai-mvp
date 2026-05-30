import logging
import os
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.business import (
    Business, BusinessDocument, BusinessUser,
    VerificationStatus, DocumentType
)
from app.schemas.business import (
    AdminBusinessListItem, AdminBusinessDetail, AdminApprovalRequest,
    AdminApprovalResponse, DocumentResponse,
    VerificationStatusEnum, EntityTypeEnum, DocumentTypeEnum, UserRoleEnum,
    BusinessUserResponse
)
from app.services.document_storage import get_document_service
from app.services.email import email_service

from .common import require_platform_admin

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# DATABASE MANAGEMENT
# =============================================================================

@router.delete("/businesses/clear-all")
async def clear_all_businesses(
    confirm: str = Query(..., description="Must be 'CONFIRM' to proceed"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Clear ALL businesses from the database (for testing/demo reset).
    
    WARNING: This is destructive! Requires confirm='CONFIRM' parameter.
    """
    if confirm != "CONFIRM":
        raise HTTPException(
            status_code=400,
            detail="Must provide confirm=CONFIRM to clear all businesses"
        )
    
    from app.models.user import User as UserModel
    from app.models.audit_log import AuditLog
    from app.models.client import Client
    from app.models.visit import Visit
    from app.models.contract import Contract
    from app.models.transcript_segment import TranscriptSegment
    from app.models.billable_item import BillableItem
    from app.models.note import Note
    from app.models.audio_asset import AudioAsset
    
    # Get all business user emails FIRST (before any deletes)
    business_users = db.query(BusinessUser).all()
    business_user_emails = [bu.email for bu in business_users]
    
    # Get counts before deletion
    business_count = db.query(Business).count()
    user_count = len(business_users)
    doc_count = db.query(BusinessDocument).count()
    
    # Get user IDs to delete (non-admin users from business signups)
    users_to_delete = db.query(UserModel).filter(
        UserModel.email.in_(business_user_emails),
        UserModel.role != 'admin'
    ).all()
    user_ids_to_delete = [u.id for u in users_to_delete]
    
    deleted_visits = 0
    deleted_clients = 0
    deleted_audit_logs = 0
    deleted_users = 0
    
    if user_ids_to_delete:
        # Get client IDs created by these users
        client_ids = [c.id for c in db.query(Client.id).filter(Client.created_by.in_(user_ids_to_delete)).all()]
        
        # Get visit IDs for these clients or caregivers
        visit_ids = []
        if client_ids:
            visit_ids.extend([v.id for v in db.query(Visit.id).filter(Visit.client_id.in_(client_ids)).all()])
        visit_ids.extend([v.id for v in db.query(Visit.id).filter(Visit.caregiver_id.in_(user_ids_to_delete)).all()])
        visit_ids = list(set(visit_ids))  # Remove duplicates
        
        # Delete in order of dependencies
        if visit_ids:
            # 1. Delete transcript segments, billables, notes, audio assets for visits
            db.query(TranscriptSegment).filter(TranscriptSegment.visit_id.in_(visit_ids)).delete(synchronize_session=False)
            db.query(BillableItem).filter(BillableItem.visit_id.in_(visit_ids)).delete(synchronize_session=False)
            db.query(Note).filter(Note.visit_id.in_(visit_ids)).delete(synchronize_session=False)
            db.query(AudioAsset).filter(AudioAsset.visit_id.in_(visit_ids)).delete(synchronize_session=False)
            
            # 2. Delete visits
            deleted_visits = db.query(Visit).filter(Visit.id.in_(visit_ids)).delete(synchronize_session=False)
        
        # 3. Delete contracts for clients
        if client_ids:
            db.query(Contract).filter(Contract.client_id.in_(client_ids)).delete(synchronize_session=False)
        
        # 4. Delete clients
        if client_ids:
            deleted_clients = db.query(Client).filter(Client.id.in_(client_ids)).delete(synchronize_session=False)
        
        # 5. Delete audit logs
        deleted_audit_logs = db.query(AuditLog).filter(AuditLog.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
    
    # 6. Delete business documents
    db.query(BusinessDocument).delete(synchronize_session=False)
    
    # 7. Delete business users
    db.query(BusinessUser).delete(synchronize_session=False)
    
    # 8. Delete businesses
    db.query(Business).delete(synchronize_session=False)
    
    # 9. Delete corresponding User records (but NOT the admin user)
    if user_ids_to_delete:
        deleted_users = db.query(UserModel).filter(
            UserModel.id.in_(user_ids_to_delete)
        ).delete(synchronize_session=False)
    
    db.commit()
    
    logger.info(f"Admin {admin.id} cleared all businesses: {business_count} businesses, {user_count} business users, {doc_count} documents, {deleted_users} user records")
    
    return {
        "message": "All businesses cleared successfully",
        "deleted": {
            "businesses": business_count,
            "business_users": user_count,
            "documents": doc_count,
            "user_records": deleted_users,
            "audit_logs": deleted_audit_logs,
            "clients": deleted_clients,
            "visits": deleted_visits,
        }
    }


# =============================================================================
# STATS
# =============================================================================

@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Get admin dashboard statistics.
    """
    total = db.query(Business).count()
    pending = db.query(Business).filter(
        Business.verification_status.in_([
            'pending',
            'sos_verified',
            'documents_submitted',
        ])
    ).count()
    approved = db.query(Business).filter(
        Business.verification_status == 'approved'
    ).count()
    rejected = db.query(Business).filter(
        Business.verification_status == 'rejected'
    ).count()
    suspended = db.query(Business).filter(
        Business.verification_status == 'suspended'
    ).count()
    
    return {
        "total_businesses": total,
        "pending_approval": pending,
        "approved": approved,
        "rejected": rejected,
        "suspended": suspended,
    }


# =============================================================================
# CLEANUP ORPHANED DATA
# =============================================================================

@router.delete("/cleanup/visits")
async def cleanup_orphaned_visits(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Clean up ALL orphaned visits and related data.
    This is for cleaning up demo/test data that doesn't belong to any business.
    Platform admin only - does NOT access PHI, just removes orphaned records.
    """
    from app.models.visit import Visit
    from app.models.transcript_segment import TranscriptSegment
    from app.models.diarization_turn import DiarizationTurn
    from app.models.billable_item import BillableItem
    from app.models.note import Note
    from app.models.audio_asset import AudioAsset
    
    # Get all visit IDs
    all_visits = db.query(Visit).all()
    deleted_count = 0
    
    for visit in all_visits:
        # Delete all related records first
        db.query(TranscriptSegment).filter(TranscriptSegment.visit_id == visit.id).delete(synchronize_session=False)
        db.query(DiarizationTurn).filter(DiarizationTurn.visit_id == visit.id).delete(synchronize_session=False)
        db.query(BillableItem).filter(BillableItem.visit_id == visit.id).delete(synchronize_session=False)
        db.query(Note).filter(Note.visit_id == visit.id).delete(synchronize_session=False)
        db.query(AudioAsset).filter(AudioAsset.visit_id == visit.id).delete(synchronize_session=False)
        db.delete(visit)
        deleted_count += 1
    
    db.commit()
    
    logger.info(f"Admin {admin.id} cleaned up {deleted_count} orphaned visits")
    
    return {
        "message": f"Cleaned up {deleted_count} visits",
        "deleted_visits": deleted_count
    }
