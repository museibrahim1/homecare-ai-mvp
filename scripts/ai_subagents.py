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
# Subagent definitions
# ---------------------------------------------------------------------------

SUBAGENTS = {
    "marketing": {
        "name": "Marketing Agent",
        "tags": ["[MARKETING]", "[CONTENT]", "[BRAND]"],
        "description": "Handles marketing campaigns, content creation, email templates, and branding.",
        "context_files": [
            "docs/marketing-research.md",
            "apps/web/src/emails/mobile-app-launch.html",
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
- Marketing research from 10 top brands
- 163 agency leads with emails across 48 states
- 60+ investor contacts

CAPABILITIES:
- Create/edit email templates and campaigns
- Write marketing copy (landing pages, emails, social media)
- Update website content and messaging
- Design email sequences and drip campaigns
- Create investor pitch materials
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

CAPABILITIES:
- Manage lead/investor data and statuses
- Create and modify outreach email templates
- Build campaign sequences
- Track email opens, clicks, responses
- Generate outreach reports
- Update CRM code and API endpoints

SENDER: Muse Ibrahim <sales@palmtai.com>
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
- From: "Muse Ibrahim <sales@palmtai.com>" (for sales) or "PalmCare AI <onboarding@resend.dev>" (testing)
- Track opens/clicks via Resend webhooks

EMAIL TEMPLATES AVAILABLE:
1. warm_open: "{provider_name} — quick question"
2. pattern_interrupt: "this isn't another software pitch"
3. aspiration: "close clients before you leave their home"
4. proof_point: "never lose a client to paperwork again"
5. graceful_exit: "closing the loop, {provider_name}"

MERGE TAGS: {provider_name}, {city}, {state}, {state_full}, {contact_name}, {fund_name}

CAPABILITIES:
- Generate email sending scripts
- Create personalized email batches
- Schedule follow-up sequences
- Track campaign performance
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

CAPABILITIES:
- Generate summary reports (emailed as HTML)
- Create data visualizations descriptions
- Analyze campaign performance
- Track conversion funnels
- Identify trends and recommendations
- Build scheduled report scripts

REPORT FORMAT: Generate clean HTML tables and summaries suitable for email delivery.
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
        "marketing": ["marketing", "brand", "content", "landing page", "website copy", "social media", "campaign design"],
        "sales": ["lead", "crm", "pipeline", "prospect", "agency", "investor", "follow up", "follow-up"],
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
    """Get the system prompt for a subagent."""
    if agent_id not in SUBAGENTS:
        return ""
    return SUBAGENTS[agent_id].get("system_prompt_extra", "")


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
