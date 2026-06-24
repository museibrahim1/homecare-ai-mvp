"""Audio storage hygiene.

Finds and (optionally) removes the "storage graveyard": S3 objects no longer
referenced by any AudioAsset, AudioAsset rows whose visit was deleted, and
abandoned uploads that never finished processing. You pay monthly for every
orphaned object, so this keeps the bill honest.

Safety:
- dry_run=True by default — returns what WOULD be deleted, deletes nothing.
- Only audio prefixes ("visits/" and "audio/") are ever considered, so shared
  buckets (e.g. business documents) are never touched.
"""

import logging
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.services.storage import get_s3_client, delete_file_from_s3

logger = logging.getLogger(__name__)

AUDIO_PREFIXES = ("visits/", "audio/")


def _is_audio_key(key: str) -> bool:
    return bool(key) and key.startswith(AUDIO_PREFIXES)


def cleanup_orphaned_audio(db, dry_run: bool = True, abandoned_days: int = 30) -> dict:
    """Identify (and optionally delete) orphaned/abandoned audio.

    Returns a summary dict with counts and sample keys.
    """
    from app.models.audio_asset import AudioAsset
    from app.models.visit import Visit

    # Keys still referenced by an AudioAsset row.
    valid_keys = {k for (k,) in db.query(AudioAsset.s3_key).all() if k}

    # All audio-prefixed objects currently in the bucket.
    client = get_s3_client()
    bucket = settings.s3_bucket
    all_audio_keys: list[str] = []
    try:
        paginator = client.get_paginator("list_objects_v2")
        for prefix in AUDIO_PREFIXES:
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    all_audio_keys.append(obj["Key"])
    except Exception as e:
        logger.warning(f"Could not list S3 objects for cleanup: {type(e).__name__}: {e}")

    # 1) S3 objects with no AudioAsset row.
    orphan_objects = [k for k in all_audio_keys if _is_audio_key(k) and k not in valid_keys]

    # 2) AudioAsset rows whose visit no longer exists.
    orphan_rows = (
        db.query(AudioAsset)
        .outerjoin(Visit, AudioAsset.visit_id == Visit.id)
        .filter(Visit.id.is_(None))
        .all()
    )

    # 3) Abandoned uploads: never reached "processed" and older than cutoff.
    cutoff = datetime.now(timezone.utc) - timedelta(days=abandoned_days)
    abandoned_rows = (
        db.query(AudioAsset)
        .filter(AudioAsset.status != "processed", AudioAsset.created_at < cutoff)
        .all()
    )

    deleted = {"objects": 0, "orphan_rows": 0, "abandoned_rows": 0}

    if not dry_run:
        for key in orphan_objects:
            try:
                delete_file_from_s3(key)
                deleted["objects"] += 1
            except Exception as e:
                logger.warning(f"Failed to delete orphan object {key}: {e}")

        for row in orphan_rows:
            try:
                if row.s3_key:
                    delete_file_from_s3(row.s3_key)
                db.delete(row)
                deleted["orphan_rows"] += 1
            except Exception as e:
                logger.warning(f"Failed to delete orphan AudioAsset {row.id}: {e}")

        for row in abandoned_rows:
            try:
                if row.s3_key:
                    delete_file_from_s3(row.s3_key)
                db.delete(row)
                deleted["abandoned_rows"] += 1
            except Exception as e:
                logger.warning(f"Failed to delete abandoned AudioAsset {row.id}: {e}")

        db.commit()

    return {
        "dry_run": dry_run,
        "abandoned_days": abandoned_days,
        "found": {
            "orphan_objects": len(orphan_objects),
            "orphan_rows": len(orphan_rows),
            "abandoned_rows": len(abandoned_rows),
        },
        "deleted": deleted,
        "sample_orphan_objects": orphan_objects[:20],
    }
