#!/usr/bin/env python3
"""Preflight report for auth hardening impact.

Checks who would be blocked by:
1) email verification gate at business login
2) mandatory MFA for privileged API users in production

Usage (from apps/api):
  python3 scripts/auth_impact_preflight.py
  python3 scripts/auth_impact_preflight.py --limit 100
"""

import argparse
import sys

from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.business import BusinessUser
from app.models.user import User


def main() -> int:
    parser = argparse.ArgumentParser(description="Preflight auth hardening impact report")
    parser.add_argument("--limit", type=int, default=50, help="Max rows shown per section")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        print("=== Auth Impact Preflight ===")
        print(f"require_email_verification={settings.require_email_verification}")
        print()

        # Business auth impact: unverified business users.
        unverified_q = (
            db.query(BusinessUser)
            .filter(
                BusinessUser.is_active.is_(True),
                BusinessUser.email_verified.is_(False),
            )
            .order_by(BusinessUser.created_at.desc())
        )
        unverified_count = unverified_q.count()
        print(f"Business users currently unverified: {unverified_count}")
        for u in unverified_q.limit(args.limit):
            print(f"  - {u.email} | role={u.role} | owner={bool(u.is_owner)}")
        if unverified_count > args.limit:
            print(f"  ... (+{unverified_count - args.limit} more)")
        print()

        # API auth impact in production: privileged users without MFA.
        # Enforcement currently applies to admin/admin_team in production env.
        no_mfa_q = (
            db.query(User)
            .filter(
                User.is_active.is_(True),
                User.role.in_(["admin", "admin_team"]),
                (
                    (User.mfa_enabled.is_(False))
                    | (User.mfa_secret.is_(None))
                    | (User.mfa_secret == "")
                ),
            )
            .order_by(User.created_at.desc())
        )
        no_mfa_count = no_mfa_q.count()
        print(f"Privileged API users missing MFA: {no_mfa_count}")
        for u in no_mfa_q.limit(args.limit):
            print(f"  - {u.email} | role={u.role} | mfa_enabled={bool(u.mfa_enabled)}")
        if no_mfa_count > args.limit:
            print(f"  ... (+{no_mfa_count - args.limit} more)")
        print()

        print("Done.")
        return 0
    except OperationalError as e:
        print("Database connection failed.")
        print("Set DATABASE_URL to your running API database and retry, for example:")
        print("  DATABASE_URL='postgresql+psycopg://.../...' python3 scripts/auth_impact_preflight.py")
        print(f"Details: {e.__class__.__name__}")
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
