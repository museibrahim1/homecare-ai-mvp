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
    # calls,  # Twilio integration disabled for MVP - re-enable when needed
)

app = FastAPI(
    title="Homecare AI API",
    description="AI Voice Analyzer for In-Home Healthcare Agencies",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
app.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
app.include_router(agency.router, prefix="/agency", tags=["Agency Settings"])
app.include_router(template_parser.router, prefix="/template", tags=["Template Parser"])
app.include_router(caregivers.router, prefix="/caregivers", tags=["Caregivers"])
app.include_router(business_auth.router, prefix="/auth/business", tags=["Business Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
# app.include_router(calls.router, prefix="/calls", tags=["Calls"])  # Twilio disabled for MVP


@app.get("/", tags=["Health"])
async def root():
    return {"status": "healthy", "service": "homecare-ai-api"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
