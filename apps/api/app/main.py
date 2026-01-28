import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    auth,
    users,
    clients,
    visits,
    uploads,
    pipeline,
    transcript,
    diarization,
    billing,
    notes,
    contracts,
    exports,
    integrations,
    agency,
    template_parser,
    caregivers,
    business_auth,
    admin,
    reports,
    # calls,  # Twilio integration disabled for MVP - re-enable when needed
)

app = FastAPI(
    title="Homecare AI API",
    description="AI Voice Analyzer for In-Home Healthcare Agencies",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware - allow frontend origins
# Get additional origins from environment (comma-separated)
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Railway deployments
    "https://web-production-11611.up.railway.app",
    "https://helcarai.up.railway.app",  # Custom domain placeholder
]

# Add any custom origins from environment
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    cors_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(clients.router, prefix="/clients", tags=["Clients"])
app.include_router(visits.router, prefix="/visits", tags=["Visits"])
app.include_router(uploads.router, prefix="/uploads", tags=["Uploads"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])
app.include_router(transcript.router, prefix="/visits", tags=["Transcripts"])
app.include_router(diarization.router, prefix="/visits", tags=["Diarization"])
app.include_router(billing.router, prefix="/visits", tags=["Billing"])
app.include_router(notes.router, prefix="/visits", tags=["Notes"])
app.include_router(contracts.router, prefix="/visits", tags=["Contracts"])
app.include_router(exports.router, prefix="/exports", tags=["Exports"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
app.include_router(agency.router, prefix="/agency", tags=["Agency Settings"])
app.include_router(template_parser.router, prefix="/template", tags=["Template Parser"])
app.include_router(caregivers.router, prefix="/caregivers", tags=["Caregivers"])
app.include_router(business_auth.router, prefix="/auth/business", tags=["Business Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
# app.include_router(calls.router, prefix="/calls", tags=["Calls"])  # Twilio disabled for MVP


@app.on_event("startup")
async def seed_database():
    """Create default admin user and test data if database is empty."""
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    from app.models.client import Client
    from app.models.caregiver import Caregiver
    from app.core.security import get_password_hash
    from datetime import date
    import logging
    
    logger = logging.getLogger(__name__)
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin_exists = db.query(User).filter(User.email == "admin@homecare.ai").first()
        if not admin_exists:
            logger.info("Creating admin user...")
            admin = User(
                email="admin@homecare.ai",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Admin user created: admin@homecare.ai / admin123")
        
        # Check if any clients exist
        client_count = db.query(Client).count()
        if client_count == 0:
            logger.info("No clients found, creating sample clients...")
            
            clients = [
                Client(
                    full_name="Jane Smith",
                    preferred_name="Jane",
                    date_of_birth=date(1945, 3, 15),
                    gender="Female",
                    phone="402-555-0101",
                    email="jane.smith@email.com",
                    address="123 Oak Street",
                    city="Lincoln",
                    state="NE",
                    zip_code="68502",
                    emergency_contact_name="John Smith",
                    emergency_contact_phone="402-555-0102",
                    emergency_contact_relationship="Son",
                    primary_diagnosis="Mild Dementia",
                    mobility_status="Walker",
                    cognitive_status="Mild impairment",
                    living_situation="Alone",
                    care_level="MODERATE",
                    status="active",
                    notes="Requires assistance with daily activities. Prefers morning visits.",
                ),
                Client(
                    full_name="Robert Johnson",
                    preferred_name="Bob",
                    date_of_birth=date(1938, 7, 22),
                    gender="Male",
                    phone="402-555-0201",
                    email="robert.j@email.com",
                    address="456 Maple Avenue",
                    city="Omaha",
                    state="NE",
                    zip_code="68104",
                    emergency_contact_name="Mary Johnson",
                    emergency_contact_phone="402-555-0202",
                    emergency_contact_relationship="Wife",
                    primary_diagnosis="Parkinson's Disease",
                    mobility_status="Wheelchair",
                    cognitive_status="Intact",
                    living_situation="With spouse",
                    care_level="HIGH",
                    status="active",
                    notes="Needs help with transfers. Enjoys conversation.",
                ),
            ]
            for client in clients:
                db.add(client)
            db.commit()
            logger.info(f"Created {len(clients)} sample clients")
        
        # Check if any caregivers exist
        caregiver_count = db.query(Caregiver).count()
        if caregiver_count == 0:
            logger.info("No caregivers found, creating sample caregivers...")
            
            caregivers = [
                Caregiver(
                    full_name="Sarah Johnson",
                    email="sarah@homecare.ai",
                    phone="402-555-0301",
                    certifications=["CNA", "CPR", "First Aid"],
                    hourly_rate=25.00,
                    status="active",
                    rating=4.8,
                    bio="Experienced caregiver with 5 years in home health.",
                ),
                Caregiver(
                    full_name="Michael Chen",
                    email="michael@homecare.ai",
                    phone="402-555-0302",
                    certifications=["RN", "CPR", "Wound Care"],
                    hourly_rate=35.00,
                    status="active",
                    rating=4.9,
                    bio="Registered nurse specializing in geriatric care.",
                ),
            ]
            for caregiver in caregivers:
                db.add(caregiver)
            db.commit()
            logger.info(f"Created {len(caregivers)} sample caregivers")
            
        logger.info("Database seeding complete")
            
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/", tags=["Health"])
async def root():
    return {"status": "healthy", "service": "homecare-ai-api"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
