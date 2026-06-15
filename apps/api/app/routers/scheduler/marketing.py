import os
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, asc, func, or_, and_, case
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor

from .common import (
    _scheduled_demos, _team_goals, _marketing_assets,
    INSPIRING_MESSAGES, STATE_REGIONS, _region_for_state, ALL_STATES, STATE_NAMES,
)
from .schemas import (
    ScheduledDemoCreate, ScheduledDemoUpdate, CrmSearchResult,
    GoalCreate, GoalUpdate, MarketingAssetCreate,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/marketing-assets")
def list_marketing_assets(
    asset_type: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List marketing assets."""
    assets = list(_marketing_assets.values())
    if asset_type:
        assets = [a for a in assets if a.get("asset_type") == asset_type]
    return {"assets": sorted(assets, key=lambda a: a.get("created_at", ""), reverse=True)}


@router.post("/marketing-assets")
def create_marketing_asset(
    body: MarketingAssetCreate,
    user: User = Depends(get_current_user),
):
    """Create a marketing asset (email template, social post, call script, etc.)."""
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    asset = {
        "id": asset_id,
        "asset_type": body.asset_type,
        "title": body.title,
        "content": body.content,
        "target_audience": body.target_audience,
        "tags": body.tags,
        "created_by": user.full_name or user.email,
        "created_by_id": str(user.id),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    _marketing_assets[asset_id] = asset
    return {"ok": True, "asset": asset}


class AiGenerateRequest(BaseModel):
    prompt: str
    asset_type: str = "email_template"
    tone: str = "professional"
    length: str = "medium"


@router.post("/marketing-assets/ai-generate")
def ai_generate_marketing(
    body: AiGenerateRequest,
    user: User = Depends(get_current_user),
):
    """Use AI to generate excellent marketing material from a prompt."""
    try:
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise HTTPException(503, "AI generation unavailable — no API key configured")

        length_guide = {
            "short": "Keep it tight — 50-100 words max. Every word must earn its place.",
            "medium": "Aim for 100-200 words. Enough to persuade without losing attention.",
            "long": "Go detailed — 200-400 words. Cover objections, benefits, proof points.",
        }
        tone_guide = {
            "professional": "Tone: authoritative, clean, boardroom-ready. No fluff.",
            "conversational": "Tone: warm, human, like talking to a colleague over coffee. Contractions welcome.",
            "bold": "Tone: punchy, direct, high-energy. Short sentences. Strong verbs. No hedging.",
            "empathetic": "Tone: understanding, caring, solution-oriented. Acknowledge their pain first.",
        }
        format_guide = {
            "email_template": """FORMAT: Cold outreach email.
Structure: Subject line (compelling, under 8 words) → Opening hook (1 sentence, personal or provocative) → Pain point (what keeps them up at night) → Solution (what PalmCare AI does, specific) → Proof point (a number, a result, a comparison) → CTA (one clear next step) → Sign-off.
Do NOT start with "I hope this email finds you well" or any cliché opener. Lead with value or a question.""",
            "social_post": """FORMAT: LinkedIn post.
Structure: Hook line (stop-the-scroll first sentence) → Story or insight (2-3 sentences) → Key takeaway → CTA or question to drive engagement.
Use line breaks between ideas. No wall of text. Hashtags at the end (3-5 relevant ones). No emojis unless they add meaning.""",
            "call_script": """FORMAT: Cold call script.
Structure: Opener (who you are, why calling, in 15 seconds) → Permission question ("Did I catch you at a bad time?") → Pain discovery (ask about their documentation burden) → Bridge to solution (how PalmCare AI solves it) → Handle the top 3 objections (cost, switching, "we're fine") → Close (book the demo, get the email, schedule a follow-up).
Write it as natural dialogue, not a robot script. Include what to say when they say "not interested".""",
            "flyer": """FORMAT: Marketing flyer copy.
Structure: Headline (7 words or fewer, benefit-driven) → Subheadline → 3 key benefits with short descriptions → Social proof or stat → CTA with urgency.
Think Apple ad meets healthcare. Clean. Bold. No clip-art language.""",
        }

        system_prompt = f"""You are a world-class marketing copywriter working for PalmCare AI.

ABOUT THE PRODUCT:
PalmCare AI is an AI-powered platform for home healthcare agencies. Core capability: a caregiver records a patient assessment by voice, and the AI automatically generates SOAP notes, care plans, billable items, and legally-compliant service contracts for all 50 states. It eliminates 15-20 hours/week of documentation per agency.

Company: Palm Technologies, INC. Founded by Muse Ibrahim.
Website: palmcareai.com
Brand: teal (#0d9488), modern, healthcare-focused.
Tagline: "Where care meets intelligence"

ABOUT THE AUDIENCE:
Home care agency owners, administrators, directors of nursing. They're overwhelmed with paperwork, Medicare compliance, staff turnover, and thin margins. They care about: saving time, reducing errors, staying compliant, and keeping caregivers happy.

YOUR STANDARDS:
- Every piece must have a clear purpose and a single CTA
- No generic filler. No "In today's fast-paced world..." or "Are you tired of..."
- Be specific: use real numbers, real scenarios, real pain points
- Write like a human who understands healthcare, not a marketer who Googled it
- The reader should feel like you GET their world

{tone_guide.get(body.tone, tone_guide['professional'])}
{length_guide.get(body.length, length_guide['medium'])}

{format_guide.get(body.asset_type, format_guide['email_template'])}

OUTPUT FORMAT:
First line: TITLE: [a short, descriptive title for this asset]
Then a blank line, then the full content.
No other meta-commentary. Just the title line and the content."""

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": body.prompt}],
        )
        raw = msg.content[0].text if msg.content else ""

        title = ""
        content = raw
        lines = raw.strip().split("\n")
        if lines and lines[0].upper().startswith("TITLE:"):
            title = lines[0].split(":", 1)[1].strip()
            content = "\n".join(lines[1:]).strip()

        return {"ok": True, "title": title, "content": content, "asset_type": body.asset_type}

    except ImportError:
        raise HTTPException(503, "AI generation unavailable — anthropic not installed")
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        raise HTTPException(500, f"AI generation failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VISUAL FLYER / AD GENERATION (Nano Banana 2 via WaveSpeed)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WAVESPEED_SUBMIT = "https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image"
WAVESPEED_POLL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"


class VisualGenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "4:3"
    resolution: str = "1k"
    style: str = "modern"


@router.post("/marketing-assets/generate-visual")
def generate_visual_flyer(
    body: VisualGenerateRequest,
    user: User = Depends(get_current_user),
):
    """Generate a visual flyer/ad image using Nano Banana 2."""
    import time as _time
    import httpx

    api_key = os.getenv("WAVESPEED_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "Image generation unavailable — no WaveSpeed API key")

    style_modifiers = {
        "modern": "Clean modern minimalist design, professional, teal (#0d9488) accent color, white background, sans-serif typography",
        "bold": "Bold high-contrast design, large impactful typography, dark background with teal (#0d9488) highlights, attention-grabbing",
        "medical": "Healthcare professional design, soft blues and teals, medical imagery, trustworthy and clean, HIPAA-compliant feel",
        "premium": "Premium luxury design, dark navy background, gold and teal accents, sophisticated typography, executive-level",
    }

    style_mod = style_modifiers.get(body.style, style_modifiers["modern"])
    full_prompt = f"""Professional marketing flyer for PalmCare AI, a healthcare technology company.

{body.prompt}

Design style: {style_mod}
Brand: PalmCare AI logo text in teal (#0d9488), tagline "Where care meets intelligence"
Include: Clear headline text, professional layout, healthcare/technology imagery
Quality: High-resolution, print-ready, photorealistic rendering
Do NOT include: Watermarks, stock photo artifacts, blurry text"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(WAVESPEED_SUBMIT, headers=headers, json={
                "prompt": full_prompt,
                "resolution": body.resolution,
                "aspect_ratio": body.aspect_ratio,
                "enable_web_search": False,
                "output_format": "png",
            })
            resp.raise_for_status()
            submit_data = resp.json().get("data", {})
            task_id = submit_data.get("id", "") or resp.json().get("id", "")

        if not task_id:
            raise HTTPException(500, "No task ID returned from image generator")

        poll_url = WAVESPEED_POLL.format(task_id=task_id)
        image_url = None
        start = _time.time()

        with httpx.Client(timeout=20) as client:
            while _time.time() - start < 90:
                poll_resp = client.get(poll_url, headers=headers)
                poll_data = poll_resp.json().get("data", {})
                status = poll_data.get("status", "")

                if status == "completed":
                    outputs = poll_data.get("outputs", [])
                    if outputs:
                        image_url = outputs[0]
                    break
                if status == "failed":
                    error = poll_data.get("error", "Unknown error")
                    raise HTTPException(500, f"Image generation failed: {error}")

                _time.sleep(3)

        if not image_url:
            raise HTTPException(504, "Image generation timed out")

        return {
            "ok": True,
            "image_url": image_url,
            "task_id": task_id,
            "prompt": body.prompt,
            "aspect_ratio": body.aspect_ratio,
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"WaveSpeed API error: {e.response.status_code} {e.response.text}")
        raise HTTPException(502, f"Image API error: {e.response.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Visual generation failed: {e}")
        raise HTTPException(500, f"Visual generation failed: {str(e)}")


# {asset_id} routes MUST be last — FastAPI matches them as catch-alls.

@router.put("/marketing-assets/{asset_id}")
def update_marketing_asset(
    asset_id: str,
    body: MarketingAssetCreate,
    user: User = Depends(get_current_user),
):
    """Update a marketing asset."""
    if asset_id not in _marketing_assets:
        raise HTTPException(404, "Asset not found")
    asset = _marketing_assets[asset_id]
    asset["title"] = body.title
    asset["content"] = body.content
    asset["target_audience"] = body.target_audience
    asset["tags"] = body.tags
    asset["asset_type"] = body.asset_type
    asset["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True, "asset": asset}


@router.delete("/marketing-assets/{asset_id}")
def delete_marketing_asset(
    asset_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a marketing asset."""
    if asset_id not in _marketing_assets:
        raise HTTPException(404, "Asset not found")
    del _marketing_assets[asset_id]
    return {"ok": True}
