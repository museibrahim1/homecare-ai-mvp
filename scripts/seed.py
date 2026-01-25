#!/usr/bin/env python3
"""
Database Seed Script

Creates initial admin user, caregivers, clients, and sample data for development.
Run this after a fresh database setup to populate test data.

Usage:
    python scripts/seed.py
    
Or from docker:
    docker exec aivoicecontracter-api-1 python /app/../scripts/seed.py
"""

import sys
import os

# Add the API app to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.client import Client
from app.models.visit import Visit


def seed_database():
    """Seed the database with initial data."""
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "admin@homecare.ai").first()
        if existing_admin:
            print("Admin user already exists. Checking for missing data...")
            
            # Still check for caregivers and clients
            caregiver_count = db.query(User).filter(User.role == 'caregiver').count()
            client_count = db.query(Client).count()
            
            if caregiver_count >= 4 and client_count >= 4:
                print("All test data exists, skipping seed.")
                return
            print(f"Found {caregiver_count} caregivers, {client_count} clients. Adding missing data...")
        
        # =============================================
        # ADMIN USER
        # =============================================
        if not existing_admin:
            print("Creating admin user...")
            admin = User(
                id=uuid4(),
                email="admin@homecare.ai",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role="admin",
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(admin)
            db.flush()
        
        # =============================================
        # CAREGIVERS
        # =============================================
        caregivers_data = [
            {"full_name": "Sarah Johnson", "email": "sarah@homecare.ai", "phone": "555-0101"},
            {"full_name": "Michael Brown", "email": "michael@homecare.ai", "phone": "555-0102"},
            {"full_name": "Emily Davis", "email": "emily@homecare.ai", "phone": "555-0103"},
            {"full_name": "David Martinez", "email": "david@homecare.ai", "phone": "555-0104"},
        ]
        
        caregivers = []
        for cg_data in caregivers_data:
            existing = db.query(User).filter(User.email == cg_data["email"]).first()
            if existing:
                caregivers.append(existing)
                continue
                
            print(f"Creating caregiver: {cg_data['full_name']}...")
            caregiver = User(
                id=uuid4(),
                email=cg_data["email"],
                hashed_password=get_password_hash("password123"),
                full_name=cg_data["full_name"],
                role="caregiver",
                is_active=True,
                phone=cg_data.get("phone"),
                created_at=now,
                updated_at=now,
            )
            db.add(caregiver)
            caregivers.append(caregiver)
        
        db.flush()
        
        # =============================================
        # CLIENTS
        # =============================================
        clients_data = [
            {
                "full_name": "Maria Garcia",
                "phone": "555-1001",
                "email": "maria@example.com",
                "address": "123 Oak Street",
                "city": "Lincoln",
                "state": "NE",
                "zip_code": "68501",
                "emergency_contact_name": "Carlos Garcia",
                "emergency_contact_phone": "555-1002",
                "primary_diagnosis": "Type 2 Diabetes",
                "medical_notes": "Requires daily blood sugar monitoring. Takes insulin.",
                "care_plan": "Daily visits for medication management and meal preparation.",
                "care_level": "MODERATE",
            },
            {
                "full_name": "James Wilson",
                "phone": "555-2001",
                "email": "james@example.com",
                "address": "456 Pine Avenue",
                "city": "Omaha",
                "state": "NE",
                "zip_code": "68102",
                "emergency_contact_name": "Linda Wilson",
                "emergency_contact_phone": "555-2002",
                "primary_diagnosis": "Post-stroke recovery",
                "medical_notes": "Limited mobility on left side. Uses walker.",
                "care_plan": "Physical therapy exercises, personal care assistance.",
                "care_level": "HIGH",
            },
            {
                "full_name": "Dorothy Chen",
                "phone": "555-3001",
                "email": "dorothy@example.com",
                "address": "789 Maple Drive",
                "city": "Des Moines",
                "state": "IA",
                "zip_code": "50301",
                "emergency_contact_name": "Michael Chen",
                "emergency_contact_phone": "555-3002",
                "primary_diagnosis": "Alzheimer's (early stage)",
                "medical_notes": "Memory lapses, needs reminders for daily activities.",
                "care_plan": "Companionship, meal prep, medication reminders.",
                "care_level": "MODERATE",
            },
            {
                "full_name": "William Thompson",
                "phone": "555-4001",
                "email": "william@example.com",
                "address": "321 Cedar Lane",
                "city": "Council Bluffs",
                "state": "IA",
                "zip_code": "51501",
                "emergency_contact_name": "Susan Thompson",
                "emergency_contact_phone": "555-4002",
                "primary_diagnosis": "COPD",
                "medical_notes": "Uses oxygen therapy. Avoid strenuous activities.",
                "care_plan": "Respiratory monitoring, light housekeeping, errands.",
                "care_level": "HIGH",
            },
        ]
        
        clients = []
        for cl_data in clients_data:
            existing = db.query(Client).filter(Client.email == cl_data["email"]).first()
            if existing:
                clients.append(existing)
                continue
                
            print(f"Creating client: {cl_data['full_name']}...")
            client = Client(
                id=uuid4(),
                full_name=cl_data["full_name"],
                phone=cl_data.get("phone"),
                email=cl_data.get("email"),
                address=cl_data.get("address"),
                city=cl_data.get("city"),
                state=cl_data.get("state"),
                zip_code=cl_data.get("zip_code"),
                emergency_contact_name=cl_data.get("emergency_contact_name"),
                emergency_contact_phone=cl_data.get("emergency_contact_phone"),
                primary_diagnosis=cl_data.get("primary_diagnosis"),
                medical_notes=cl_data.get("medical_notes"),
                care_plan=cl_data.get("care_plan"),
                care_level=cl_data.get("care_level"),
                status="active",
                created_at=now,
                updated_at=now,
            )
            db.add(client)
            clients.append(client)
        
        db.commit()
        
        # Final counts
        caregiver_count = db.query(User).filter(User.role == 'caregiver').count()
        client_count = db.query(Client).count()
        
        print("\n" + "="*50)
        print("✅ Database seeded successfully!")
        print("="*50)
        print(f"\nCreated/verified:")
        print(f"  • 1 Admin user")
        print(f"  • {caregiver_count} Caregivers")
        print(f"  • {client_count} Clients")
        print("\nLogin credentials:")
        print("  Admin:     admin@homecare.ai / admin123")
        print("  Caregiver: sarah@homecare.ai / password123")
        print("             (or michael@, emily@, david@homecare.ai)")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
