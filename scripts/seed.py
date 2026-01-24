#!/usr/bin/env python3
"""
Database Seed Script

Creates initial admin user and sample data for development.
"""

import sys
import os

# Add the API app to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.client import Client
from app.models.visit import Visit


def seed_database():
    """Seed the database with initial data."""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "admin@homecare.ai").first()
        if existing_admin:
            print("Admin user already exists, skipping seed.")
            return
        
        print("Creating admin user...")
        admin = User(
            email="admin@homecare.ai",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin User",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        
        print("Creating sample caregiver...")
        caregiver = User(
            email="caregiver@homecare.ai",
            hashed_password=get_password_hash("caregiver123"),
            full_name="Jane Smith",
            role=UserRole.CAREGIVER,
            is_active=True,
            phone="555-0123",
        )
        db.add(caregiver)
        
        print("Creating sample clients...")
        client1 = Client(
            full_name="Robert Johnson",
            phone="555-1001",
            address="123 Oak Street, Apt 4B, Springfield, IL 62701",
            emergency_contact_name="Sarah Johnson",
            emergency_contact_phone="555-1002",
            medical_notes="Type 2 diabetes, managed with medication. Mild arthritis.",
            care_plan="Daily visits for medication reminders, meal prep, and companionship.",
        )
        db.add(client1)
        
        client2 = Client(
            full_name="Margaret Williams",
            phone="555-2001",
            address="456 Maple Avenue, Springfield, IL 62702",
            emergency_contact_name="David Williams",
            emergency_contact_phone="555-2002",
            medical_notes="High blood pressure. Uses walker for mobility.",
            care_plan="Three visits per week for personal care and light housekeeping.",
        )
        db.add(client2)
        
        db.commit()
        db.refresh(admin)
        db.refresh(caregiver)
        db.refresh(client1)
        db.refresh(client2)
        
        print("Creating sample visits...")
        now = datetime.now(timezone.utc)
        
        visit1 = Visit(
            client_id=client1.id,
            caregiver_id=caregiver.id,
            scheduled_start=now - timedelta(hours=2),
            scheduled_end=now - timedelta(hours=1),
            status="pending_review",
            pipeline_state={
                "transcription": {"status": "completed"},
                "diarization": {"status": "completed"},
                "billing": {"status": "completed"},
            },
        )
        db.add(visit1)
        
        visit2 = Visit(
            client_id=client2.id,
            caregiver_id=caregiver.id,
            scheduled_start=now + timedelta(days=1, hours=9),
            scheduled_end=now + timedelta(days=1, hours=13),
            status="scheduled",
            pipeline_state={},
        )
        db.add(visit2)
        
        db.commit()
        
        print("\n✅ Database seeded successfully!")
        print("\nLogin credentials:")
        print("  Admin: admin@homecare.ai / admin123")
        print("  Caregiver: caregiver@homecare.ai / caregiver123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
