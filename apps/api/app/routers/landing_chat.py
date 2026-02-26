"""
Landing Page AI Chat Agent

Public endpoint for the marketing site chat widget.
Uses OpenAI to answer visitor questions about PalmCare AI.
Rate-limited per IP to prevent abuse.
"""

import os
import time
import logging
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

SYSTEM_PROMPT = """You are PalmCare AI's friendly sales assistant on the marketing website.
Your job is to answer questions about PalmCare AI, help visitors understand the product,
and encourage them to schedule a demo.

KEY FACTS ABOUT PALMCARE AI:
- AI-powered home care agency management platform
- Core feature: Voice-powered assessments that turn recorded conversations into professional contracts in minutes
- AI transcribes conversations, identifies speakers, extracts care needs, services, schedules, medications, and billing items
- Automatic contract generation from assessment data
- OCR Template Engine: upload existing contract templates and auto-fill them
- Full Client CRM with pipeline management (intake → active care)
- Scheduling & visit tracking with caregiver mobile companion app
- Caregivers can clock in/out via GPS, log ADLs (Activities of Daily Living), view schedules
- Automated billing extraction from assessments
- Revenue analytics and custom reporting
- HIPAA compliant: 256-bit AES encryption, role-based access, audit trails
- Works for agencies of all sizes: small (up to 30 clients), medium (30-200), enterprise (200+)
- 14-day free trial available, no credit card required
- Onboarding typically takes 24 hours; caregivers learn the mobile app in ~15 minutes
- Support: email for all plans, priority live chat and phone for Growth/Pro, dedicated account manager for Enterprise

PRICING:
- We offer several tiers but encourage visitors to schedule a demo for personalized pricing
- All plans include a 14-day free trial

INTEGRATIONS:
- Google Calendar for scheduling
- Google Drive for document storage
- Gmail integration
- Stripe for billing
- Custom integrations available for Enterprise plans

GUIDELINES:
- Be helpful, concise, and professional but warm
- Keep responses under 150 words unless the visitor asks for detail
- Always guide toward scheduling a demo when appropriate
- If asked about competitors, focus on PalmCare AI's strengths (purpose-built for home care, voice-first, AI-native) without badmouthing others
- If asked something you don't know, say so honestly and suggest scheduling a demo to speak with the team
- Never make up features or pricing that isn't listed above
- Never discuss internal technical details, codebase, or infrastructure
- If someone asks about PHI/patient data, emphasize HIPAA compliance and security measures
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
async def chat_message(body: ChatRequest, request: Request):
    """Public chat endpoint for landing page visitors."""
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many messages. Please wait a few minutes.")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters).")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        logger.error("OPENAI_API_KEY not configured for landing chat")
        raise HTTPException(status_code=503, detail="Chat is temporarily unavailable.")

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for msg in body.history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content[:2000]})

        messages.append({"role": "user", "content": body.message.strip()})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=400,
            temperature=0.7,
        )

        reply = response.choices[0].message.content or "I'm sorry, I couldn't generate a response. Please try again."

        return ChatResponse(reply=reply)

    except Exception as e:
        logger.error(f"Landing chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat encountered an error. Please try again.")
