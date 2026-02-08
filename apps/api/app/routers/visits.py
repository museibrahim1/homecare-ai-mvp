import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.models.client import Client
from app.models.transcript_segment import TranscriptSegment
from app.models.billable_item import BillableItem
from app.models.note import Note
from app.models.contract import Contract
from app.models.audio_asset import AudioAsset
from app.models.diarization_turn import DiarizationTurn
from app.models.call import Call
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.business import BusinessUser
from app.schemas.visit import VisitCreate, VisitUpdate, VisitResponse, VisitListResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Free tier limit
FREE_ASSESSMENT_LIMIT = 2


def _get_user_subscription(db: Session, user: User):
    """Check if user has an active paid subscription."""
    # Platform admins are unlimited
    role = user.role.value if hasattr(user.role, 'value') else (user.role or "user")
    if role == "admin" and hasattr(user, 'email') and user.email.endswith("@palmtai.com"):
        return {"has_paid_plan": True, "plan_name": "Platform Admin", "tier": "enterprise"}
    
    # Check if user belongs to a business with an active subscription
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == user.email
    ).first()
    
    if business_user:
        sub = db.query(Subscription).filter(
            Subscription.business_id == business_user.business_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
        ).first()
        if sub and sub.plan:
            plan_tier = sub.plan.tier.value if hasattr(sub.plan.tier, 'value') else str(sub.plan.tier)
            if plan_tier != "free":
                return {
                    "has_paid_plan": True,
                    "plan_name": sub.plan.name,
                    "tier": plan_tier,
                    "max_visits": sub.plan.max_visits_per_month,
                }
    
    return {"has_paid_plan": False, "plan_name": "Free", "tier": "free"}


@router.get("/usage")
async def get_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's assessment usage and plan limits."""
    # Count completed assessments (any status beyond scheduled)
    completed_count = db.query(Visit).join(
        Client, Visit.client_id == Client.id
    ).filter(
        Client.created_by == current_user.id,
        Visit.status.in_(['pending_review', 'approved', 'exported', 'in_progress']),
    ).count()
    
    # Also count total visits created by this user
    total_visits = db.query(Visit).join(
        Client, Visit.client_id == Client.id
    ).filter(
        Client.created_by == current_user.id,
    ).count()
    
    sub_info = _get_user_subscription(db, current_user)
    
    if sub_info["has_paid_plan"]:
        max_allowed = sub_info.get("max_visits", 999)
        can_create = True
    else:
        max_allowed = FREE_ASSESSMENT_LIMIT
        can_create = total_visits < FREE_ASSESSMENT_LIMIT
    
    return {
        "completed_assessments": completed_count,
        "total_assessments": total_visits,
        "max_allowed": max_allowed,
        "can_create": can_create,
        "plan_name": sub_info["plan_name"],
        "plan_tier": sub_info["tier"],
        "has_paid_plan": sub_info["has_paid_plan"],
        "upgrade_required": not can_create,
    }


@router.get("", response_model=VisitListResponse)
async def list_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    client_id: Optional[UUID] = None,
    caregiver_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List visits with pagination and filters (strict data isolation - only your clients)."""
    # Get client IDs that belong to this user for strict data isolation
    # Only show visits for clients created by this user (HIPAA compliant)
    user_client_ids = [c[0] for c in db.query(Client.id).filter(
        Client.created_by == current_user.id
    ).all()]
    
    if not user_client_ids:
        return VisitListResponse(items=[], total=0, page=page, page_size=page_size)
    
    query = db.query(Visit).options(
        joinedload(Visit.client),
        joinedload(Visit.caregiver),
    ).filter(
        Visit.client_id.in_(user_client_ids)
    )
    
    if status:
        query = query.filter(Visit.status == status)
    if client_id:
        query = query.filter(Visit.client_id == client_id)
    if caregiver_id:
        query = query.filter(Visit.caregiver_id == caregiver_id)
    
    total = query.count()
    visits = query.order_by(Visit.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return VisitListResponse(
        items=visits,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def create_visit(
    visit_in: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new visit (data isolation enforced)."""
    # Check free tier limit
    sub_info = _get_user_subscription(db, current_user)
    if not sub_info["has_paid_plan"]:
        total_visits = db.query(Visit).join(
            Client, Visit.client_id == Client.id
        ).filter(
            Client.created_by == current_user.id,
        ).count()
        if total_visits >= FREE_ASSESSMENT_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Free plan limit reached. You've used your 2 free assessments. Please upgrade to continue.",
            )
    
    # Verify client exists AND belongs to current user
    client = db.query(Client).filter(
        Client.id == visit_in.client_id,
        Client.created_by == current_user.id
    ).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Use current user as caregiver if not provided
    caregiver_id = visit_in.caregiver_id or current_user.id
    
    # Verify caregiver exists
    caregiver = db.query(User).filter(User.id == caregiver_id).first()
    if not caregiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver not found",
        )
    
    visit_data = visit_in.model_dump()
    visit_data['caregiver_id'] = caregiver_id  # Ensure caregiver_id is set
    
    visit = Visit(
        **visit_data,
        pipeline_state={},
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def get_user_visit(db: Session, visit_id: UUID, current_user: User) -> Visit:
    """Helper to get a visit with strict data isolation - only your clients."""
    # User can only access visits for clients they created (own)
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == visit_id,
        Client.created_by == current_user.id
    ).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    return visit


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific visit with full details (data isolation enforced)."""
    # First verify ownership
    get_user_visit(db, visit_id, current_user)
    
    # Then load with relationships
    visit = db.query(Visit).options(
        joinedload(Visit.client),
        joinedload(Visit.caregiver),
    ).filter(Visit.id == visit_id).first()
    
    return visit


@router.put("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: UUID,
    visit_in: VisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a visit (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
    update_data = visit_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(visit, field, value)
    
    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visit(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a visit and all related records (strict data isolation - only your clients)."""
    visit = get_user_visit(db, visit_id, current_user)
    
    try:
        # Delete all related records first to avoid foreign key constraint errors
        db.query(TranscriptSegment).filter(TranscriptSegment.visit_id == visit_id).delete(synchronize_session=False)
        db.query(DiarizationTurn).filter(DiarizationTurn.visit_id == visit_id).delete(synchronize_session=False)
        db.query(BillableItem).filter(BillableItem.visit_id == visit_id).delete(synchronize_session=False)
        db.query(Note).filter(Note.visit_id == visit_id).delete(synchronize_session=False)
        db.query(AudioAsset).filter(AudioAsset.visit_id == visit_id).delete(synchronize_session=False)
        db.query(Call).filter(Call.visit_id == visit_id).delete(synchronize_session=False)
        
        # Now delete the visit itself
        db.delete(visit)
        db.commit()
    except Exception:
        db.rollback()
        raise


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_visits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete ALL visits for the current user's clients. Use with caution!"""
    # Only delete visits for clients you own (strict data isolation)
    user_client_ids = [c[0] for c in db.query(Client.id).filter(Client.created_by == current_user.id).all()]
    
    if not user_client_ids:
        return {"deleted": 0}
    
    visits = db.query(Visit).filter(Visit.client_id.in_(user_client_ids)).all()
    
    deleted_count = 0
    for visit in visits:
        # Delete all related records
        db.query(TranscriptSegment).filter(TranscriptSegment.visit_id == visit.id).delete(synchronize_session=False)
        db.query(DiarizationTurn).filter(DiarizationTurn.visit_id == visit.id).delete(synchronize_session=False)
        db.query(BillableItem).filter(BillableItem.visit_id == visit.id).delete(synchronize_session=False)
        db.query(Note).filter(Note.visit_id == visit.id).delete(synchronize_session=False)
        db.query(AudioAsset).filter(AudioAsset.visit_id == visit.id).delete(synchronize_session=False)
        db.query(Call).filter(Call.visit_id == visit.id).delete(synchronize_session=False)
        db.delete(visit)
        deleted_count += 1
    
    db.commit()
    return {"deleted": deleted_count}


@router.post("/{visit_id}/restart")
async def restart_assessment(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Restart an assessment by clearing ALL generated data including audio files.
    
    This deletes:
    - All transcript segments
    - All diarization turns
    - All billable items
    - Generated notes
    - Generated contract
    - Audio assets (DB records + S3 files)
    - Resets pipeline state
    """
    visit = get_user_visit(db, visit_id, current_user)
    
    # Delete transcript segments
    deleted_segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).delete()
    
    # Delete diarization turns
    deleted_diarization = db.query(DiarizationTurn).filter(
        DiarizationTurn.visit_id == visit_id
    ).delete()
    
    # Delete billable items
    deleted_billables = db.query(BillableItem).filter(
        BillableItem.visit_id == visit_id
    ).delete()
    
    # Delete notes
    deleted_notes = db.query(Note).filter(
        Note.visit_id == visit_id
    ).delete()
    
    # Delete contracts associated with the visit's client
    if visit.client_id:
        deleted_contracts = db.query(Contract).filter(
            Contract.client_id == visit.client_id
        ).delete()
    else:
        deleted_contracts = 0
    
    # Delete audio assets (DB records + S3 files)
    audio_assets = db.query(AudioAsset).filter(
        AudioAsset.visit_id == visit_id
    ).all()
    deleted_audio = len(audio_assets)
    
    for audio in audio_assets:
        # Delete from S3
        if audio.s3_key:
            try:
                from app.services.storage import delete_file_from_s3
                delete_file_from_s3(audio.s3_key)
            except Exception as e:
                # Log but don't fail - S3 cleanup is best-effort
                import logging
                logging.getLogger(__name__).warning(f"Failed to delete S3 file {audio.s3_key}: {e}")
        db.delete(audio)
    
    # Delete calls if any
    deleted_calls = db.query(Call).filter(
        Call.visit_id == visit_id
    ).delete()
    
    # Reset pipeline state completely
    visit.pipeline_state = {}
    visit.status = "pending"
    visit.audio_url = None
    
    db.commit()
    
    return {
        "status": "success",
        "message": "Assessment restarted successfully. Upload new audio to begin.",
        "deleted": {
            "transcript_segments": deleted_segments,
            "diarization_turns": deleted_diarization,
            "billable_items": deleted_billables,
            "notes": deleted_notes,
            "contracts": deleted_contracts,
            "audio_files": deleted_audio,
            "calls": deleted_calls,
        }
    }
