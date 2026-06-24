#!/usr/bin/env python3
"""Day-3 lifecycle push: nudge signups who haven't run their first assessment.

Run once daily (Railway cron). Targets users who signed up ~3 days ago and have
no visits yet, and sends a push to all their registered devices. Safe no-op if
APNs isn't configured.

Usage (from apps/api):
    python3 scripts/send_lifecycle_push.py
    python3 scripts/send_lifecycle_push.py --dry-run
"""
import argparse
import sys
from datetime import datetime, timezone, timedelta

from app.db.session import SessionLocal
from app.models.user import User
from app.models.visit import Visit
from app.models.client import Client
from app.models.device_token import DeviceToken
from app.services.push import send_push

TITLE = "Your first AI assessment is waiting"
BODY = "Turn a 10-minute visit into a finished care contract. Tap to start your first one."


def main() -> int:
    parser = argparse.ArgumentParser(description="Send day-3 lifecycle push")
    parser.add_argument("--dry-run", action="store_true", help="List targets without sending")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=4)
    window_end = now - timedelta(days=3)

    db = SessionLocal()
    targeted = sent = 0
    try:
        users = (
            db.query(User)
            .filter(
                User.created_at >= window_start,
                User.created_at < window_end,
                User.role == "user",
                User.is_active.is_(True),
            )
            .all()
        )
        for user in users:
            has_visit = (
                db.query(Visit)
                .join(Client, Visit.client_id == Client.id)
                .filter(Client.created_by == user.id)
                .first()
            )
            if has_visit:
                continue
            tokens = [t.token for t in db.query(DeviceToken).filter(DeviceToken.user_id == user.id).all()]
            if not tokens:
                continue
            targeted += 1
            if args.dry_run:
                print(f"[dry-run] would push to {user.email} ({len(tokens)} device(s))")
                continue
            result = send_push(tokens, TITLE, BODY, data={"deeplink": "palmcare://record"})
            sent += result.get("sent", 0)
    finally:
        db.close()

    print(f"Targeted {targeted} user(s); delivered {sent} push(es). dry_run={args.dry_run}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
