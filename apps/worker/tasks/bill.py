"""
Billing Task

Generates billable items from transcript segments using rules engine.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db
from libs.billing import generate_billables_from_transcript

logger = logging.getLogger(__name__)


@app.task(name="tasks.bill.generate_billables", bind=True)
def generate_billables(self, visit_id: str):
    """
    Generate billable items from transcript.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting billing generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, BillableItem
        
        # Get visit
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "billing": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get transcript segments
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id
        ).order_by(TranscriptSegment.start_ms).all()
        
        if not segments:
            raise ValueError(f"No transcript segments found for visit: {visit_id}")
        
        # Convert to dicts
        segment_dicts = [
            {
                "id": str(s.id),
                "start_ms": s.start_ms,
                "end_ms": s.end_ms,
                "text": s.text,
                "speaker_label": s.speaker_label,
            }
            for s in segments
        ]
        
        # Calculate visit boundaries
        visit_start_ms = min(s.start_ms for s in segments)
        visit_end_ms = max(s.end_ms for s in segments)
        
        # Generate billables using rules engine
        billable_blocks = generate_billables_from_transcript(
            segment_dicts,
            visit_start_ms,
            visit_end_ms,
        )
        
        # Delete existing billables for this visit
        db.query(BillableItem).filter(
            BillableItem.visit_id == visit.id
        ).delete()
        
        # Save billables to database
        for block in billable_blocks:
            billable_item = BillableItem(
                visit_id=visit.id,
                code=block["code"],
                category=block["category"],
                description=block["description"],
                start_ms=block["start_ms"],
                end_ms=block["end_ms"],
                minutes=block["minutes"],
                evidence=block["evidence"],
                is_flagged=block.get("is_flagged", False),
                flag_reason=block.get("flag_reason"),
            )
            db.add(billable_item)
        
        # Calculate totals
        total_minutes = sum(b["minutes"] for b in billable_blocks)
        categories = {}
        for block in billable_blocks:
            cat = block["category"]
            categories[cat] = categories.get(cat, 0) + block["minutes"]
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "billing": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("billing", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "item_count": len(billable_blocks),
                "total_minutes": total_minutes,
                "categories": categories,
            }
        }
        
        # Update visit status
        visit.status = "pending_review"
        
        db.commit()
        logger.info(f"Billing completed for visit {visit_id}: {len(billable_blocks)} items, {total_minutes} minutes")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "item_count": len(billable_blocks),
            "total_minutes": total_minutes,
        }
        
    except Exception as e:
        logger.error(f"Billing failed for visit {visit_id}: {str(e)}")
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "billing": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
