#!/usr/bin/env python3
"""
Seed development data inside the API container.

This exists because the repo-root `scripts/seed.py` is not mounted into the
`api` container by default (compose mounts `./apps/api:/app`).

Usage:
  docker compose exec api python scripts/seed.py
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.business import Business  # noqa: F401 (ensure mapper registry is fully configured)
from app.models.client import Client
from app.models.user import User, UserRole


def seed() -> None:
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        # --- Admin user (used by the Next.js demo login UI) ---
        admin = db.query(User).filter(User.email == "admin@palmtai.com").first()
        if not admin:
            admin = User(
                email="admin@palmtai.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role=UserRole.admin,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(admin)
        else:
            # Ensure role is admin for demo access.
            admin.role = UserRole.admin
            admin.is_active = True
            admin.updated_at = now

        # --- Optional: ensure at least one client exists ---
        existing_client = db.query(Client).first()
        if not existing_client:
            db.add(
                Client(
                    full_name="Margaret Johnson",
                    phone="(555) 123-4567",
                    address="456 Oak Street",
                    city="Lincoln",
                    state="NE",
                    zip_code="68510",
                    status="active",
                    created_at=now,
                    updated_at=now,
                )
            )

        db.commit()
        print("✅ Seed complete.")
        print("Login: admin@palmtai.com / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

