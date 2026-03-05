"""
AI Subagents — Specialized agents for marketing, sales, and reporting.

Each subagent has its own system prompt, relevant file context, and capabilities.
The daemon routes tasks to the appropriate subagent based on email subject tags.

Email subject tags:
  [MARKETING] — Marketing campaigns, content, branding
  [SALES]     — Sales outreach, lead management, follow-ups
  [REPORT]    — Analytics, dashboards, status reports
  [OUTREACH]  — Email outreach campaigns (send emails to leads/investors)
  [CODE]      — General code changes (default)
  [QUESTION]  — Answer questions without changing code
  [STATUS]    — Project status report
"""

import os
import json
import re
import subprocess
from pathlib import Path
from typing import Optional

import anthropic

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Shared skills block — injected into every subagent's system prompt
# ---------------------------------------------------------------------------

SHARED_SKILLS = """
=== SHARED SKILLS (available to ALL agents) ===

COMPANY INFO:
- Company: Palm Technologies, INC. / PalmCare AI
- Founder: Muse Ibrahim, President & CEO
- Website: palmcareai.com
- Email domains: palmtai.com (Google Workspace), send.palmcareai.com (Resend)
- AI Agent email: ai@palmcareai.com
- Brand color: Teal (#0d9488)
- Tagline: "Where care meets intelligence" / "PALM IT"
- Fundraising: $450K SAFE, $2.25M post-money valuation
- ARR: $92K
- Cost per assessment: ~$0.37

IMAGE GENERATION (Nano Banana 2 via WaveSpeed):
- API Key env var: WAVESPEED_API_KEY
- Submit: POST https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image
  Headers: Authorization: Bearer $WAVESPEED_API_KEY, Content-Type: application/json
  Body: {"prompt": "...", "resolution": "1k", "aspect_ratio": "16:9", "enable_web_search": false, "output_format": "png"}
- Poll result: GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
  Poll every 4 seconds until status=completed, then read outputs[0] for image URL
- Edit existing image: POST https://api.wavespeed.ai/api/v3/google/nano-banana-2/edit-image
  Body: {"prompt": "edit description", "image_url": "https://...", "resolution": "1k", "output_format": "png"}
- Resolutions: 0.5k (fast preview), 1k (default), 2k (high quality), 4k (max, slower)
- Aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9, 9:21, 5:4, 4:5, 16:10, 10:16
  NOTE: 3:1 is NOT supported. Use 21:9 for ultra-wide banners.
- Best practices: Use 1k for drafts, 2k for production. Use 4:5 for Instagram. Use 16:9 for LinkedIn/Facebook/Twitter.
- To generate images in a task, create a Python script that calls the API and saves to marketing/generated/

VOICEOVER GENERATION (ElevenLabs v3 via WaveSpeed):
- API Key env var: WAVESPEED_API_KEY
- Submit: POST https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3
  Headers: Authorization: Bearer $WAVESPEED_API_KEY, Content-Type: application/json
  Body: {"text": "...", "voice_id": "Alice", "similarity": 1.0, "stability": 0.5, "use_speaker_boost": true}
- Poll result: GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
- Available voices:
  Female: Alice (clear, professional - RECOMMENDED), Aria (expressive), Sarah (soft), Laura (warm),
          Charlotte (elegant), Jessica (friendly), Lily (gentle)
  Male: Roger (authoritative), George (deep), Charlie (casual), Callum (Scottish), Liam (young),
        Will (confident), Eric (clear), Chris (warm), Brian (newscast), Daniel (British), Bill (mature)
- Save audio files to videos/public/segments/ for video narration

VIDEO CREATION (Remotion):
- Project root: /videos/
- Preview: cd videos && npm run dev
- Render: cd videos && npx remotion render CompositionId output.mp4
- Generate narration: cd videos && python3 scripts/generate_narration.py --voice nova --segments
- Use interpolate() for linear animations, spring() for bouncy motion
- Use <Sequence> to time scenes, staticFile() for assets in /public
- OpenAI TTS voices: nova (female, warm), onyx (male, deep), alloy (neutral), fable (British), shimmer (soft)

EMAIL SENDING (Resend):
- API Key env var: RESEND_API_KEY
- Send: POST https://api.resend.com/emails
  Headers: Authorization: Bearer $RESEND_API_KEY, Content-Type: application/json
  Body: {"from": "PalmCare AI <onboarding@resend.dev>", "to": ["recipient@email.com"], "subject": "...", "html": "..."}
- NOTE: palmtai.com domain verification is currently FAILED. Use "onboarding@resend.dev" as the from address for now.
- For production sales emails, the from address should be "Muse Ibrahim <sales@palmtai.com>" once domain is re-verified.
- Track opens/clicks via Resend webhooks

TRANSCRIPTION (Deepgram Nova-3):
- API Key env var: DEEPGRAM_API_KEY
- Endpoint: POST https://api.deepgram.com/v1/listen
- Features: smart formatting, built-in diarization, sub-300ms latency, 36+ languages
- Batch: apps/worker/libs/deepgram_asr.py
- Live: POST /live/transcribe
- Fallback: OpenAI Whisper when Deepgram key not configured

APP SCREENSHOTS (for marketing/demos):
- Web screenshots: screenshots/01_landing.png, screenshots/02_login.png
- iOS screenshots: screenshots/ios/01-landing.png through 07-main-tabs.png
  (landing, login, register, home dashboard, voice recording, clients list, main tabs)
- Preview thumbnails: screenshots/*_preview.png
- Use real screenshots in marketing materials for authenticity

EXISTING MARKETING ASSETS:
- 10 AI-generated graphics in marketing/generated/ (LinkedIn, Instagram, Facebook, Twitter, email header)
- Social media copy bank: marketing/social-media-copy.md
- Graphics guide: marketing/social-media-graphics.md
- Image generation script: scripts/generate_marketing_images.py
- Marketing research: docs/marketing-research.md

PROJECT STRUCTURE:
- Web frontend: apps/web (Next.js)
- iOS app: ios-app (SwiftUI) — source of truth for mobile
- API backend: apps/api (FastAPI)
- Worker: apps/worker (Celery)
- Videos: videos/ (Remotion)
- Marketing: marketing/ (copy, graphics, generated images)
- Docs: docs/ (architecture, API costs, state requirements, marketing research)

=== END SHARED SKILLS ===
"""

# ---------------------------------------------------------------------------
# Subagent definitions
# ---------------------------------------------------------------------------

SUBAGENTS = {
    "marketing": {
        "name": "Marketing Agent",
        "tags": ["[MARKETING]", "[CONTENT]", "[BRAND]"],
        "description": "Handles marketing campaigns, content creation, email templates, and branding.",
        "context_files": [
            "docs/marketing-research.md",
            "marketing/social-media-copy.md",
            "marketing/social-media-graphics.md",
            "apps/web/src/app/page.tsx",
            "apps/web/src/app/mobile-app/page.tsx",
            "apps/web/src/app/features/page.tsx",
            "apps/web/src/app/about/page.tsx",
        ],
        "system_prompt_extra": """You are the MARKETING specialist for PalmCare AI.

BRAND GUIDELINES:
- Company: Palm Technologies, INC. / PalmCare AI
- Tagline: "Where care meets intelligence" / "PALM IT"
- Brand color: Teal (#0d9488)
- Founder: Muse Ibrahim, President & CEO
- Voice: Professional but warm, confident, innovative
- CTA style: "Palm It" buttons
- Email style: Plain text preferred for cold outreach, Apple-style HTML for marketing

EXISTING ASSETS:
- 5-email cold outreach sequence (Warm Open, Pattern Interrupt, Aspiration, Proof Point, Graceful Exit)
- Mobile app launch email template
- Marketing research from 10 top brands (docs/marketing-research.md)
- 10 AI-generated graphics in marketing/generated/ (LinkedIn hero, Instagram feature/story/carousel, Facebook ad, Twitter showcase, ROI infographic, email header)
- Social media copy bank with platform-specific posts (marketing/social-media-copy.md)
- 163 agency leads with emails across 48 states
- 60+ investor contacts
- Real iOS app screenshots in screenshots/ios/

YOUR MARKETING CAPABILITIES:
- Create/edit email templates and campaigns
- Write marketing copy (landing pages, emails, social media)
- Update website content and messaging
- Design email sequences and drip campaigns
- Create investor pitch materials
- Generate NEW images by creating Python scripts that call the Nano Banana 2 API (see SHARED SKILLS)
- Generate voiceovers by creating Python scripts that call ElevenLabs v3 API (see SHARED SKILLS)
- Create marketing videos using Remotion (see SHARED SKILLS)
- Reference real app screenshots for authentic marketing content

WHEN GENERATING IMAGES:
Create a Python script as a file_changed with action "create" that:
1. Imports requests, os, json, time
2. Loads WAVESPEED_API_KEY from env
3. POSTs to the text-to-image endpoint with a detailed prompt
4. Polls for result every 4 seconds
5. Downloads the image to marketing/generated/
Include the script in your files_changed response so the daemon can execute it.
""",
    },
    "sales": {
        "name": "Sales Agent",
        "tags": ["[SALES]", "[LEADS]", "[CRM]"],
        "description": "Manages sales leads, outreach sequences, and CRM operations.",
        "context_files": [
            "apps/api/app/routers/sales_leads.py",
            "apps/api/app/models/sales_lead.py",
            "apps/api/app/routers/investors.py",
            "apps/api/app/models/investor.py",
            "apps/api/app/services/email.py",
        ],
        "system_prompt_extra": """You are the SALES specialist for PalmCare AI.

SALES DATA:
- 163 home care agency leads with verified emails across 48 states
- 60+ investor contacts with emails
- 5-email cold outreach sequence already built
- Resend for email delivery with open/click tracking
- Resend webhook for email event tracking

LEAD STATUSES: new, contacted, email_sent, opened, responded, meeting, converted, lost
INVESTOR STATUSES: new, contacted, email_sent, responded, meeting, due_diligence, committed, passed

YOUR SALES CAPABILITIES:
- Manage lead/investor data and statuses
- Create and modify outreach email templates
- Build campaign sequences
- Track email opens, clicks, responses
- Generate outreach reports
- Update CRM code and API endpoints
- Generate pitch deck visuals and sales collateral images (see SHARED SKILLS for Nano Banana 2 API)
- Create personalized proposal documents

SENDER: Muse Ibrahim <sales@palmtai.com> (use onboarding@resend.dev until domain is re-verified)
SIGNATURE: Muse Ibrahim, President & CEO, Palm Technologies, INC.
""",
    },
    "outreach": {
        "name": "Outreach Agent",
        "tags": ["[OUTREACH]", "[EMAIL]", "[CAMPAIGN]"],
        "description": "Executes email outreach campaigns — actually sends emails to leads and investors.",
        "context_files": [
            "apps/api/app/routers/sales_leads.py",
            "apps/api/app/models/sales_lead.py",
            "apps/api/app/services/email.py",
        ],
        "system_prompt_extra": """You are the OUTREACH execution agent for PalmCare AI.

YOUR JOB: Execute email campaigns by generating the code/commands needed to send emails.

IMPORTANT: You don't send emails directly. You generate Python scripts or API calls that
the daemon will execute to send emails via Resend.

RESEND API:
- API Key: Available via RESEND_API_KEY env var
- Send endpoint: POST https://api.resend.com/emails
- From: "PalmCare AI <onboarding@resend.dev>" (palmtai.com domain is currently failed, use resend.dev)
- Track opens/clicks via Resend webhooks
- Headers: {"Authorization": "Bearer $RESEND_API_KEY", "Content-Type": "application/json"}
- Body: {"from": "PalmCare AI <onboarding@resend.dev>", "to": ["email"], "subject": "...", "html": "..."}

EMAIL TEMPLATES AVAILABLE:
1. warm_open: "{provider_name} — quick question"
2. pattern_interrupt: "this isn't another software pitch"
3. aspiration: "close clients before you leave their home"
4. proof_point: "never lose a client to paperwork again"
5. graceful_exit: "closing the loop, {provider_name}"

MERGE TAGS: {provider_name}, {city}, {state}, {state_full}, {contact_name}, {fund_name}

YOUR OUTREACH CAPABILITIES:
- Generate email sending scripts (Python with requests library)
- Create personalized email batches
- Schedule follow-up sequences
- Track campaign performance
- Generate email header images using Nano Banana 2 API (see SHARED SKILLS)
- Use the email header from marketing/generated/email_header_outreach.png

WHEN SENDING EMAILS:
Create a Python script as a file_changed that:
1. Loads RESEND_API_KEY from env
2. Reads lead data from a CSV or hardcoded list
3. Personalizes each email with merge tags
4. POSTs to Resend API for each recipient
5. Logs results
""",
    },
    "report": {
        "name": "Reporting Agent",
        "tags": ["[REPORT]", "[ANALYTICS]", "[DASHBOARD]", "[STATS]"],
        "description": "Generates analytics reports, dashboards, and status summaries.",
        "context_files": [
            "apps/api/app/routers/analytics.py",
            "apps/api/app/models/analytics.py",
            "apps/api/app/routers/sales_leads.py",
            "apps/api/app/routers/investors.py",
        ],
        "system_prompt_extra": """You are the REPORTING & ANALYTICS specialist for PalmCare AI.

AVAILABLE DATA:
- Sales leads: 163 agencies, email campaign events, sequence progress
- Investors: 60+ contacts, outreach status
- Platform: Usage analytics, provider engagement, churn risk
- Campaigns: Per-template sent/delivered/opened/clicked/replied/bounced

ANALYTICS ENDPOINTS:
- /analytics/churn/overview — Risk breakdown, MRR, retention
- /analytics/churn/providers — Engagement scores per provider
- /analytics/leads/funnel — Sales funnel metrics
- /analytics/platform/activity — Daily activity trends
- /platform/sales/leads/stats — Lead aggregate stats
- /platform/sales/leads/campaigns/analytics — Campaign performance

YOUR REPORTING CAPABILITIES:
- Generate summary reports (emailed as HTML)
- Create data visualizations and infographic images (see SHARED SKILLS for Nano Banana 2 API)
- Analyze campaign performance
- Track conversion funnels
- Identify trends and recommendations
- Build scheduled report scripts
- Generate charts/graphs as images using Nano Banana 2

REPORT FORMAT: Generate clean HTML tables and summaries suitable for email delivery.
When creating visual reports, generate images via the Nano Banana 2 API and embed the URLs in the HTML report.
""",
    },
}


def detect_subagent(subject: str, body: str = "") -> str:
    """Detect which subagent should handle a task based on subject tags and content."""
    text = (subject + " " + body).upper()

    for agent_id, agent in SUBAGENTS.items():
        for tag in agent["tags"]:
            if tag in text:
                return agent_id

    keywords = {
        "marketing": ["marketing", "brand", "content", "landing page", "website copy", "social media", "campaign design", "graphic", "image", "video", "voiceover"],
        "sales": ["lead", "crm", "pipeline", "prospect", "agency", "investor", "follow up", "follow-up", "pitch deck"],
        "outreach": ["send email", "outreach", "cold email", "email blast", "bulk email", "campaign send"],
        "report": ["report", "analytics", "dashboard", "metrics", "stats", "performance", "funnel"],
    }

    for agent_id, kws in keywords.items():
        if any(kw in text.lower() for kw in kws):
            return agent_id

    return "code"


def get_subagent_context(agent_id: str) -> str:
    """Load context files for a subagent."""
    if agent_id not in SUBAGENTS:
        return ""

    agent = SUBAGENTS[agent_id]
    context_parts = []

    for filepath in agent.get("context_files", []):
        full_path = PROJECT_ROOT / filepath
        if full_path.exists():
            try:
                content = full_path.read_text(encoding="utf-8", errors="replace")
                if len(content) > 50000:
                    content = content[:50000] + "\n... [truncated]"
                context_parts.append(f"--- {filepath} ---\n{content}")
            except Exception:
                pass

    return "\n\n".join(context_parts)


def get_subagent_system_prompt(agent_id: str) -> str:
    """Get the system prompt for a subagent, including shared skills."""
    if agent_id not in SUBAGENTS:
        return ""
    agent_prompt = SUBAGENTS[agent_id].get("system_prompt_extra", "")
    return f"{SHARED_SKILLS}\n\n{agent_prompt}"


def execute_with_subagent(
    agent_id: str,
    task_title: str,
    task_body: str,
    task_type: str = "code",
) -> dict:
    """Execute a task using a specific subagent."""
    from ai_task_executor import build_system_prompt, find_relevant_files, read_file_safe, MAX_RESPONSE_TOKENS

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "summary": "Cannot execute: ANTHROPIC_API_KEY not set",
            "status": "failed",
            "files_changed": [], "commands": [], "questions": [], "notes": "",
        }

    client = anthropic.Anthropic(api_key=api_key)

    base_prompt = build_system_prompt()
    subagent_prompt = get_subagent_system_prompt(agent_id)
    subagent_context = get_subagent_context(agent_id)

    system = f"{base_prompt}\n\n{subagent_prompt}" if subagent_prompt else base_prompt

    relevant_files = find_relevant_files(f"{task_title} {task_body}")
    file_contents = []
    for f in relevant_files[:10]:
        content = read_file_safe(str(PROJECT_ROOT / f["path"]))
        if content and not content.startswith("[File too large"):
            file_contents.append(f"--- {f['path']} ---\n{content}")

    user_message = f"TASK: {task_title}\n\n{task_body}"

    if subagent_context:
        user_message += f"\n\nSUBAGENT CONTEXT FILES:\n{subagent_context[:30000]}"

    if file_contents:
        user_message += "\n\nADDITIONAL RELEVANT FILES:\n" + "\n\n".join(file_contents[:5])

    if task_type == "question":
        user_message += "\n\nThis is a QUESTION — do not make code changes. Just answer in the summary field."

    agent_name = SUBAGENTS.get(agent_id, {}).get("name", "General Agent")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=MAX_RESPONSE_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )

        response_text = response.content[0].text
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "summary": response_text[:500],
                "status": "completed",
                "files_changed": [], "commands": [], "questions": [],
                "notes": f"Handled by {agent_name}. Response was not JSON.",
            }

        for key in ["summary", "status", "files_changed", "commands", "questions", "notes"]:
            if key not in result:
                result[key] = [] if key in ("files_changed", "commands", "questions") else ""

        result["notes"] = f"[{agent_name}] " + (result.get("notes", "") or "")
        return result

    except Exception as e:
        return {
            "summary": f"{agent_name} error: {e}",
            "status": "failed",
            "files_changed": [], "commands": [], "questions": [],
            "notes": str(e),
        }
