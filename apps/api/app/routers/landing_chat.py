"""
Landing Page AI Chat Agent

Public endpoint for the marketing site chat widget.
Uses Anthropic Claude Haiku for fast, low-cost responses about PalmCare AI.
Rate-limited per IP to prevent abuse.
"""

import os
import time
import logging
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

SYSTEM_PROMPT = """You are Palm, the AI assistant for PalmCare AI. Your slogan is "Palm it."

Your ONLY purpose is to:
1. Answer questions about PalmCare AI and its features
2. Get visitors signed up for a demo

PERSONALITY:
- Friendly, confident, and direct
- Speak in short, punchy sentences
- Always steer the conversation toward booking a demo
- End most responses by asking if they'd like to schedule a demo
- Use "Palm it." naturally when it fits (e.g., "Paperwork piling up? Palm it.")

KEY FACTS ABOUT PALMCARE AI:
- AI-powered home care agency management platform
- Core feature: Voice-powered assessments that turn recorded conversations into professional contracts in minutes
- AI transcribes conversations, identifies speakers, extracts care needs, services, schedules, medications, and billing items
- Automatic contract generation from assessment data
- OCR Template Engine: upload existing contract templates and auto-fill them
- Full Client CRM with pipeline management (intake to active care)
- Scheduling & visit tracking with caregiver mobile companion app
- Caregivers can clock in/out via GPS, log ADLs (Activities of Daily Living), view schedules
- Automated billing extraction from assessments
- Revenue analytics and custom reporting
- HIPAA compliant: 256-bit AES encryption, role-based access, audit trails
- Works for agencies of all sizes: small (up to 30 clients), medium (30-200), enterprise (200+)
- 14-day free trial available, no credit card required
- Onboarding typically takes 24 hours; caregivers learn the mobile app in ~15 minutes
- Google Calendar, Google Drive, Gmail, and Stripe integrations

STRICT RULES:
- ONLY answer questions about PalmCare AI, home care management, and the product
- If someone asks about ANYTHING unrelated (weather, politics, coding, math, personal questions, other products), politely redirect: "I'm Palm — I only know PalmCare AI inside and out! Ask me about our features, or let's get you scheduled for a demo."
- NEVER answer general knowledge questions, do math, write code, or discuss topics outside PalmCare AI
- NEVER make up features or pricing that isn't listed above
- NEVER discuss internal technical details, codebase, or infrastructure
- Keep responses under 100 words — be concise
- Always push toward scheduling a demo. The demo form is on the same page — tell them to scroll down or click "Schedule a Demo"
- If they seem interested, say something like: "Ready to see it live? Scroll down to book your free demo — takes 30 seconds!"
"""

# Simple in-memory rate limiter: max 20 messages per IP per 5 minutes
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_WINDOW = 300  # 5 minutes
RATE_MAX = 20


def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < RATE_WINDOW]
    if len(_rate_limits[ip]) >= RATE_MAX:
        return False
    _rate_limits[ip].append(now)
    return True


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/message", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat_message(body: ChatRequest, request: Request):
    """Public chat endpoint for landing page visitors."""
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many messages. Please wait a few minutes.")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters).")

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not configured for landing chat")
        raise HTTPException(status_code=503, detail="Chat is temporarily unavailable.")

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)

        user_messages: list[dict] = []
        for msg in body.history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                user_messages.append({"role": role, "content": content[:2000]})

        user_messages.append({"role": "user", "content": body.message.strip()})

        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=400,
            system=SYSTEM_PROMPT,
            messages=user_messages,
            temperature=0.7,
        )

        reply = response.content[0].text if response.content else "I'm sorry, I couldn't generate a response. Please try again."

        return ChatResponse(reply=reply)

    except Exception as e:
        logger.error(f"Landing chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat encountered an error. Please try again.")
