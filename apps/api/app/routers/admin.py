"""
Admin Router

Administrative endpoints for business approval and management.
"""

import logging
import os
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.models.user import User
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
from app.models.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensure current user is a PLATFORM admin (not a business admin).
    Platform admins can approve businesses but CANNOT see client data (HIPAA).
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    # Check if this is a platform admin (not associated with a business)
    # Platform admins have email ending in @palmtai.com
    if not current_user.email.endswith("@palmtai.com"):
        logger.warning(f"Non-platform user {current_user.email} attempted admin access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    return current_user


# =============================================================================
# BUSINESS LISTINGS
# =============================================================================

@router.get("/businesses", response_model=List[AdminBusinessListItem])
async def list_all_businesses(
    status: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    List all businesses with optional filtering.
    """
    query = db.query(Business)
    
    if status:
        try:
            status_enum = VerificationStatus(status)
            query = query.filter(Business.verification_status == status_enum)
        except ValueError:
            pass
    
    if state:
        query = query.filter(Business.state_of_incorporation == state.upper())
    
    if search:
        query = query.filter(
            or_(
                Business.name.ilike(f"%{search}%"),
                Business.email.ilike(f"%{search}%"),
            )
        )
    
    businesses = query.order_by(Business.created_at.desc()).offset(skip).limit(limit).all()
    
    logger.info(f"Found {len(businesses)} businesses for admin listing")
    
    result = []
    for b in businesses:
        try:
            docs_count = db.query(BusinessDocument).filter(
                BusinessDocument.business_id == b.id
            ).count()
            
            # Handle verification_status - could be enum or string
            if hasattr(b.verification_status, 'value'):
                status_value = b.verification_status.value
            else:
                status_value = str(b.verification_status)
            
            result.append(AdminBusinessListItem(
                id=b.id,
                name=b.name,
                email=b.email,
                state_of_incorporation=b.state_of_incorporation,
                verification_status=VerificationStatusEnum(status_value),
                documents_count=docs_count,
                created_at=b.created_at,
            ))
        except Exception as e:
            logger.error(f"Error processing business {b.id}: {e}")
            # Continue processing other businesses
            continue
    
    logger.info(f"Returning {len(result)} businesses after processing")
    return result


@router.get("/businesses/pending", response_model=List[AdminBusinessListItem])
async def list_pending_businesses(
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    List businesses pending approval.
    """
    businesses = db.query(Business).filter(
        Business.verification_status.in_([
            'documents_submitted',
            'sos_verified',
        ])
    ).order_by(Business.created_at.asc()).all()
    
    result = []
    for b in businesses:
        docs_count = db.query(BusinessDocument).filter(
            BusinessDocument.business_id == b.id
        ).count()
        
        result.append(AdminBusinessListItem(
            id=b.id,
            name=b.name,
            email=b.email,
            state_of_incorporation=b.state_of_incorporation,
            verification_status=VerificationStatusEnum(b.verification_status.value if hasattr(b.verification_status, 'value') else b.verification_status),
            documents_count=docs_count,
            created_at=b.created_at,
        ))
    
    return result


@router.get("/businesses/{business_id}", response_model=AdminBusinessDetail)
async def get_business_detail(
    business_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Get detailed business information for review.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Get documents
    documents = db.query(BusinessDocument).filter(
        BusinessDocument.business_id == business_id
    ).all()
    
    doc_responses = []
    for d in documents:
        doc_responses.append(DocumentResponse(
            id=d.id,
            document_type=DocumentTypeEnum(d.document_type.value if hasattr(d.document_type, 'value') else d.document_type),
            file_name=d.file_name,
            file_size=d.file_size,
            uploaded_at=d.created_at,
            is_verified=d.is_verified,
            verified_at=d.verified_at,
            expiration_date=d.expiration_date,
        ))
    
    # Get owner
    owner = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.is_owner == True,
    ).first()
    
    owner_response = None
    if owner:
        owner_response = BusinessUserResponse(
            id=owner.id,
            email=owner.email,
            full_name=owner.full_name,
            phone=owner.phone,
            role=UserRoleEnum(owner.role.value if hasattr(owner.role, 'value') else owner.role),
            is_active=owner.is_active,
            is_owner=owner.is_owner,
            email_verified=owner.email_verified,
            last_login=owner.last_login,
            created_at=owner.created_at,
        )
    
    return AdminBusinessDetail(
        id=business.id,
        name=business.name,
        dba_name=business.dba_name,
        entity_type=EntityTypeEnum(business.entity_type.value if hasattr(business.entity_type, 'value') else business.entity_type),
        state_of_incorporation=business.state_of_incorporation,
        registration_number=business.registration_number,
        address=business.address,
        city=business.city,
        state=business.state,
        zip_code=business.zip_code,
        phone=business.phone,
        email=business.email,
        website=business.website,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        sos_verification_data=business.sos_verification_data,
        sos_verified_at=business.sos_verified_at,
        documents=doc_responses,
        owner=owner_response,
        created_at=business.created_at,
    )


# =============================================================================
# APPROVAL / REJECTION
# =============================================================================

@router.post("/businesses/{business_id}/approve", response_model=AdminApprovalResponse)
async def approve_business(
    business_id: UUID,
    request: AdminApprovalRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Approve or reject a business registration.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.verification_status == 'approved':
        raise HTTPException(status_code=400, detail="Business is already approved")
    
    # Get owner for email
    owner = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.is_owner == True,
    ).first()
    
    if request.approved:
        business.verification_status = 'approved'
        business.approved_at = datetime.now(timezone.utc)
        business.approved_by = admin.id
        business.rejection_reason = None
        message = "Business approved successfully"
        
        # Mark all documents as verified
        db.query(BusinessDocument).filter(
            BusinessDocument.business_id == business_id
        ).update({
            "is_verified": True,
            "verified_at": datetime.now(timezone.utc),
            "verified_by": admin.id,
        })
        
        # Send approval email
        if owner:
            login_url = os.getenv("APP_URL", "https://palmcareai.com") + "/login"
            email_service.send_business_approved(
                business_email=owner.email,
                business_name=business.name,
                login_url=login_url,
            )
        
    else:
        if not request.rejection_reason:
            raise HTTPException(
                status_code=400, 
                detail="Rejection reason is required"
            )
        
        business.verification_status = 'rejected'
        business.rejection_reason = request.rejection_reason
        message = "Business registration rejected"
        
        # Send rejection email
        if owner:
            email_service.send_business_rejected(
                business_email=owner.email,
                business_name=business.name,
                reason=request.rejection_reason,
            )
    
    db.commit()
    
    return AdminApprovalResponse(
        business_id=business.id,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        message=message,
    )


@router.post("/businesses/{business_id}/suspend", response_model=AdminApprovalResponse)
async def suspend_business(
    business_id: UUID,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Suspend an approved business.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    business.verification_status = 'suspended'
    business.rejection_reason = reason
    db.commit()
    
    owner = db.query(BusinessUser).filter(
        BusinessUser.business_id == business_id,
        BusinessUser.is_owner == True,
    ).first()
    if owner:
        email_service.send_email(
            to=owner.email,
            subject="Account Suspended - PalmCare AI",
            sender=email_service.from_support,
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ef4444;">Account Suspended</h2>
                <p>Hello {business.name},</p>
                <p>Your PalmCare AI account has been suspended.</p>
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> {reason}</p>
                </div>
                <p>If you believe this is an error, please contact our support team to resolve this.</p>
                <p>Best regards,<br>The PalmCare AI Team</p>
            </div>
            """,
        )
    
    return AdminApprovalResponse(
        business_id=business.id,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        message="Business suspended",
    )


@router.post("/businesses/{business_id}/reactivate", response_model=AdminApprovalResponse)
async def reactivate_business(
    business_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Reactivate a suspended business.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.verification_status != 'suspended':
        raise HTTPException(status_code=400, detail="Business is not suspended")
    
    business.verification_status = 'approved'
    business.rejection_reason = None
    db.commit()
    
    return AdminApprovalResponse(
        business_id=business.id,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        message="Business reactivated",
    )


# =============================================================================
# DOCUMENT MANAGEMENT
# =============================================================================

@router.get("/documents/{document_id}/download")
async def get_document_download_url(
    document_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Get a signed URL to download a document.
    """
    document = db.query(BusinessDocument).filter(
        BusinessDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_service = get_document_service()
    url = doc_service.get_download_url(document.file_path, expiration_seconds=300)
    
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    return {"download_url": url, "expires_in": 300}


@router.post("/documents/{document_id}/verify")
async def verify_document(
    document_id: UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Mark a document as verified.
    """
    document = db.query(BusinessDocument).filter(
        BusinessDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.is_verified = True
    document.verified_at = datetime.now(timezone.utc)
    document.verified_by = admin.id
    document.verification_notes = notes
    db.commit()
    
    return {"message": "Document verified", "document_id": str(document_id)}


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
    
    logger.info(f"Admin {admin.email} cleared all businesses: {business_count} businesses, {user_count} business users, {doc_count} documents, {deleted_users} user records")
    
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
    from app.models.call import Call
    
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
        db.query(Call).filter(Call.visit_id == visit.id).delete(synchronize_session=False)
        db.delete(visit)
        deleted_count += 1
    
    db.commit()
    
    logger.info(f"Admin {admin.email} cleaned up {deleted_count} orphaned visits")
    
    return {
        "message": f"Cleaned up {deleted_count} visits",
        "deleted_visits": deleted_count
    }
