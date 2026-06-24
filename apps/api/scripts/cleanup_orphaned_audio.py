#!/usr/bin/env python3
"""Delete orphaned/abandoned audio from object storage.

Usage (from apps/api):
    python3 scripts/cleanup_orphaned_audio.py            # dry run (default)
    python3 scripts/cleanup_orphaned_audio.py --apply    # actually delete
    python3 scripts/cleanup_orphaned_audio.py --apply --abandoned-days 14

Safe to run on a schedule (e.g. weekly Railway cron). Only audio prefixes are
considered, so other objects in the bucket are never touched.
"""
import argparse
import json
import sys

from app.db.session import SessionLocal
from app.services.storage_cleanup import cleanup_orphaned_audio


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean up orphaned audio storage")
    parser.add_argument("--apply", action="store_true", help="Actually delete (default is dry run)")
    parser.add_argument("--abandoned-days", type=int, default=30)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        result = cleanup_orphaned_audio(
            db, dry_run=not args.apply, abandoned_days=args.abandoned_days
        )
    finally:
        db.close()

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
