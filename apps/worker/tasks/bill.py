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
def generate_billables(self, visit_id: str, manage_status: bool = True):
    """
    Generate billable items from transcript.
    
    Args:
        visit_id: UUID of the visit
        manage_status: When False (full pipeline), skip pipeline_state status
            writes so run_step remains the single writer.
    """
    logger.info(f"Starting billing generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, BillableItem
        from libs.pipeline_state import patch_pipeline_step
        
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")

        conversation_kind = (visit.pipeline_state or {}).get("conversation_kind")
        
        if manage_status:
            patch_pipeline_step(
                db,
                visit_id,
                "billing",
                status="processing",
                started_at=datetime.now(timezone.utc).isoformat(),
            )
            db.commit()
        
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id
        ).order_by(TranscriptSegment.start_ms).all()
        
        if not segments:
            raise ValueError(f"No transcript segments found for visit: {visit_id}")
        
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
        
        visit_start_ms = min(s.start_ms for s in segments)
        visit_end_ms = max(s.end_ms for s in segments)

        if conversation_kind == "out_of_scope":
            logger.info("Out-of-scope recording: skipping billables LLM")
            billable_blocks = []
        else:
            logger.info(
                "Generating billables from transcript kind=%s", conversation_kind
            )
            billable_blocks = generate_billables_from_transcript(
                segment_dicts,
                visit_start_ms,
                visit_end_ms,
                conversation_kind=conversation_kind,
            )
        
        db.query(BillableItem).filter(
            BillableItem.visit_id == visit.id
        ).delete()
        
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
        
        total_minutes = sum(b["minutes"] for b in billable_blocks)
        categories = {}
        for block in billable_blocks:
            cat = block["category"]
            categories[cat] = categories.get(cat, 0) + block["minutes"]
        
        if manage_status:
            patch_pipeline_step(
                db,
                visit_id,
                "billing",
                status="completed",
                finished_at=datetime.now(timezone.utc).isoformat(),
                item_count=len(billable_blocks),
                total_minutes=total_minutes,
                categories=categories,
                conversation_kind=conversation_kind,
            )
        
        visit.status = "pending_review"
        
        db.commit()
        logger.info(
            f"Billing completed for visit {visit_id}: {len(billable_blocks)} items, "
            f"{total_minutes} minutes"
        )
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "item_count": len(billable_blocks),
            "total_minutes": total_minutes,
        }
        
    except Exception as e:
        logger.error(f"Billing failed for visit {visit_id}: {str(e)}")
        
        if manage_status:
            try:
                from libs.pipeline_state import patch_pipeline_step
                patch_pipeline_step(
                    db,
                    visit_id,
                    "billing",
                    status="failed",
                    error=str(e),
                    finished_at=datetime.now(timezone.utc).isoformat(),
                )
                db.commit()
            except Exception:
                pass
        
        raise
    finally:
        db.close()
