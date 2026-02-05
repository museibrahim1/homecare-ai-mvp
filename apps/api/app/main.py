import os
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)


class CatchAllMiddleware(BaseHTTPMiddleware):
    """Middleware to catch all exceptions and ensure CORS headers are always sent."""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"Unhandled exception in middleware: {type(e).__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Get origin from request
            origin = request.headers.get("origin", "")
            
            # Build response with CORS headers
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {str(e)}"},
            )
            
            # Add CORS headers manually
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "https://web-production-11611.up.railway.app",
            ]
            
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"
            
            return response
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
    admin_platform,
    reports,
    stripe_billing,
    calendar,
    drive,
    gmail,
    voiceprint,
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
    # Local dev (when 3000 is occupied)
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    # Railway deployments
    "https://web-production-11611.up.railway.app",
    "https://helcarai.up.railway.app",  # Custom domain placeholder
]

# Add any custom origins from environment
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    cors_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

# HIPAA Compliance: Add audit logging middleware for PHI access
from app.middleware.audit import AuditLoggingMiddleware
app.add_middleware(AuditLoggingMiddleware)

# Add catch-all middleware FIRST (runs last, catches everything)
app.add_middleware(CatchAllMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure errors return JSON with proper CORS
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and return JSON response."""
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
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
app.include_router(admin_platform.router, prefix="/platform", tags=["Platform Admin"])
app.include_router(stripe_billing.router, prefix="/billing", tags=["Billing"])
app.include_router(calendar.router, prefix="/calendar", tags=["Google Calendar"])
app.include_router(voiceprint.router, prefix="/voiceprint", tags=["Voiceprint"])
app.include_router(drive.router, prefix="/drive", tags=["Google Drive"])
app.include_router(gmail.router, prefix="/gmail", tags=["Gmail"])
# app.include_router(calls.router, prefix="/calls", tags=["Calls"])  # Twilio disabled for MVP


@app.on_event("startup")
async def seed_database():
    """Create default admin user and test data if database is empty."""
    # Skip seeding during tests
    if os.getenv("TESTING"):
        return
    
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
                    preferred_name="Sarah",
                    email="sarah@homecare.ai",
                    phone="402-555-0301",
                    certifications=["CNA", "CPR", "First Aid"],
                    certification_level="CNA",
                    status="active",
                    rating=4.8,
                    years_experience=5,
                    can_handle_high_care=True,
                    notes="Experienced caregiver with 5 years in home health.",
                ),
                Caregiver(
                    full_name="Michael Chen",
                    preferred_name="Mike",
                    email="michael@homecare.ai",
                    phone="402-555-0302",
                    certifications=["RN", "CPR", "Wound Care"],
                    certification_level="RN",
                    status="active",
                    rating=4.9,
                    years_experience=8,
                    can_handle_high_care=True,
                    notes="Registered nurse specializing in geriatric care.",
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


@app.get("/health/redis", tags=["Health"])
async def redis_health_check():
    """Check Redis connectivity for task queue."""
    import redis
    redis_url = settings.redis_url
    
    try:
        r = redis.from_url(redis_url)
        r.ping()
        connected = True
        error = None
    except Exception as e:
        connected = False
        error = str(e)
    
    # Mask password in URL for display
    display_url = redis_url
    if "@" in display_url:
        parts = display_url.split("@")
        display_url = parts[0].split(":")[0] + ":***@" + parts[1]
    
    return {
        "redis_url": display_url,
        "redis_url_source": "REDIS_URL env" if os.getenv("REDIS_URL") else "default (localhost)",
        "connected": connected,
        "error": error,
    }


@app.get("/health/celery", tags=["Health"])
async def celery_health_check():
    """Check Celery task queue status."""
    from app.services.jobs import celery_app
    
    try:
        # Check if we can inspect workers
        inspector = celery_app.control.inspect()
        active_workers = inspector.active()
        registered_tasks = inspector.registered()
        
        return {
            "status": "ok",
            "workers_found": active_workers is not None and len(active_workers) > 0,
            "active_workers": list(active_workers.keys()) if active_workers else [],
            "registered_tasks": registered_tasks,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


@app.get("/health/s3", tags=["Health"])
async def s3_health_check():
    """Check S3/MinIO storage connectivity."""
    import boto3
    from botocore.config import Config
    
    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        # Try to list the bucket
        client.head_bucket(Bucket=settings.s3_bucket)
        connected = True
        error = None
    except Exception as e:
        connected = False
        error = str(e)
    
    # Mask sensitive values
    endpoint_display = settings.s3_endpoint_url if settings.s3_endpoint_url else "NOT SET"
    
    return {
        "s3_endpoint_url": endpoint_display,
        "s3_bucket": settings.s3_bucket,
        "s3_access_key_set": bool(settings.s3_access_key) and settings.s3_access_key != "minio",
        "s3_secret_key_set": bool(settings.s3_secret_key) and settings.s3_secret_key != "minio12345",
        "connected": connected,
        "error": error,
    }


@app.get("/health/openai", tags=["Health"])
async def openai_health_check():
    """Check OpenAI API key configuration."""
    openai_key = os.getenv("OPENAI_API_KEY", "")
    
    # Try to use the key
    test_result = None
    if openai_key and len(openai_key) > 10:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            # Quick test - list models
            models = client.models.list()
            test_result = "success"
        except Exception as e:
            test_result = f"error: {str(e)[:100]}"
    
    return {
        "openai_api_key_set": bool(openai_key) and len(openai_key) > 10,
        "openai_api_key_length": len(openai_key) if openai_key else 0,
        "openai_api_key_prefix": openai_key[:7] + "..." if openai_key and len(openai_key) > 10 else "NOT SET",
        "test_result": test_result,
    }


@app.get("/health/google", tags=["Health"])
async def google_health_check():
    """Check if Google OAuth credentials are configured."""
    return {
        "google_client_id_set": bool(settings.google_client_id),
        "google_client_id_preview": settings.google_client_id[:20] + "..." if settings.google_client_id else None,
        "google_client_secret_set": bool(settings.google_client_secret),
        "google_client_secret_length": len(settings.google_client_secret) if settings.google_client_secret else 0,
    }
