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
from app.models.caregiver import Caregiver
from app.models.visit import Visit


def seed_database():
    """Seed the database with initial data."""
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "museibrahim@palmtai.com").first()
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
        # ADMIN USER (Platform Admin)
        # =============================================
        admin_email = "museibrahim@palmtai.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            print("Creating admin user...")
            admin = User(
                id=uuid4(),
                email=admin_email,
                hashed_password=get_password_hash("HomeHealthCareAi13"),
                full_name="Musa Ibrahim",
                role="admin",
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(admin)
            db.flush()
        
        # =============================================
        # DEMO AGENCY USER (For demos - no admin access)
        # =============================================
        demo_agency_email = "demo@agency.com"
        existing_demo = db.query(User).filter(User.email == demo_agency_email).first()
        if not existing_demo:
            print("Creating demo agency user...")
            demo_user = User(
                id=uuid4(),
                email=demo_agency_email,
                hashed_password=get_password_hash("demo1234"),
                full_name="Demo Agency",
                role="owner",  # Agency owner role - no platform admin access
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(demo_user)
            db.flush()
        
        # =============================================
        # CAREGIVERS
        # =============================================
        caregivers_data = [
            {"full_name": "Sarah Johnson", "email": "sarah@palmtai.com", "phone": "555-0101"},
            {"full_name": "Michael Brown", "email": "michael@palmtai.com", "phone": "555-0102"},
            {"full_name": "Emily Davis", "email": "emily@palmtai.com", "phone": "555-0103"},
            {"full_name": "David Martinez", "email": "david@palmtai.com", "phone": "555-0104"},
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
        # NOTE: care_level is intentionally NOT pre-assigned
        # Care levels should be determined through proper assessment, not assumed
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
                # Medical info to be filled during intake assessment
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
            },
        ]
        
        clients = []
        for cl_data in clients_data:
            existing = db.query(Client).filter(Client.email == cl_data["email"]).first()
            if existing:
                clients.append(existing)
                continue
                
            print(f"Creating client: {cl_data['full_name']}...")
            # Note: Medical info (diagnosis, care_level, care_plan) should be 
            # filled during intake assessment, not pre-assumed
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
                # care_level intentionally left blank - should be assessed
                # primary_diagnosis intentionally left blank - should be assessed
                # care_plan intentionally left blank - should be assessed
                status="active",
                created_at=now,
                updated_at=now,
            )
            db.add(client)
            clients.append(client)
        
        db.flush()
        
        # =============================================
        # CAREGIVERS (Separate from Users - for assignments)
        # =============================================
        caregivers_records = [
            {
                "full_name": "Sarah Johnson",
                "email": "sarah@palmtai.com",
                "phone": "555-0101",
                "certification_level": "CNA",
                "specializations": ["dementia", "mobility"],
                "languages": ["English", "Spanish"],
                "can_handle_high_care": True,
                "years_experience": 5,
                "city": "Lincoln",
                "state": "NE",
            },
            {
                "full_name": "Michael Brown",
                "email": "michael@palmtai.com",
                "phone": "555-0102",
                "certification_level": "HHA",
                "specializations": ["diabetes", "wound care"],
                "languages": ["English"],
                "can_handle_high_care": True,
                "years_experience": 8,
                "city": "Omaha",
                "state": "NE",
            },
            {
                "full_name": "Emily Davis",
                "email": "emily@palmtai.com",
                "phone": "555-0103",
                "certification_level": "CNA",
                "specializations": ["pediatrics", "respite"],
                "languages": ["English", "French"],
                "can_handle_high_care": False,
                "years_experience": 3,
                "city": "Des Moines",
                "state": "IA",
            },
            {
                "full_name": "David Martinez",
                "email": "david@palmtai.com",
                "phone": "555-0104",
                "certification_level": "RN",
                "specializations": ["COPD", "cardiac", "high-care"],
                "languages": ["English", "Spanish"],
                "can_handle_high_care": True,
                "years_experience": 10,
                "city": "Council Bluffs",
                "state": "IA",
            },
        ]
        
        for cg_data in caregivers_records:
            existing = db.query(Caregiver).filter(Caregiver.email == cg_data["email"]).first()
            if existing:
                continue
                
            print(f"Creating caregiver record: {cg_data['full_name']}...")
            caregiver = Caregiver(
                id=uuid4(),
                full_name=cg_data["full_name"],
                email=cg_data["email"],
                phone=cg_data.get("phone"),
                certification_level=cg_data.get("certification_level"),
                specializations=cg_data.get("specializations", []),
                languages=cg_data.get("languages", ["English"]),
                can_handle_high_care=cg_data.get("can_handle_high_care", False),
                can_handle_moderate_care=True,
                can_handle_low_care=True,
                years_experience=cg_data.get("years_experience", 0),
                city=cg_data.get("city"),
                state=cg_data.get("state"),
                status="active",
                created_at=now,
                updated_at=now,
            )
            db.add(caregiver)
        
        db.commit()
        
        # Final counts
        user_caregiver_count = db.query(User).filter(User.role == 'caregiver').count()
        caregiver_count = db.query(Caregiver).count()
        client_count = db.query(Client).count()
        
        print("\n" + "="*50)
        print("✅ Database seeded successfully!")
        print("="*50)
        print(f"\nCreated/verified:")
        print(f"  • 1 Admin user (platform admin)")
        print(f"  • 1 Demo agency user")
        print(f"  • {user_caregiver_count} Caregiver users (for login)")
        print(f"  • {caregiver_count} Caregiver records (for assignment)")
        print(f"  • {client_count} Clients")
        print("\nLogin credentials:")
        print("  Platform Admin: museibrahim@palmtai.com / [your password]")
        print("  Demo Agency:    demo@agency.com / demo1234")
        print("  Caregiver:      sarah@palmtai.com / password123")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
