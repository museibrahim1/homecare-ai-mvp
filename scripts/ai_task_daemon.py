#!/usr/bin/env python3
"""
AI Task Daemon — Watches for tasks via email (Resend inbound) and file queue.

Supports two input methods:
  1. Resend inbound: Polls Resend API for emails to museibrahim@palmtai.com
     (ai@palmcareai.com is forwarded here via Cloudflare Email Routing)
  2. File-based: Drop .task files into ~/.palmcare/tasks/

Results are emailed back via Resend.

Usage:
    python3 scripts/ai_task_daemon.py          # Run in foreground
    python3 scripts/ai_task_daemon.py --once    # Process once and exit
"""

import os
import sys
import json
import time
import signal
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_task_executor import execute_task, apply_changes, git_commit
from ai_subagents import detect_subagent, execute_with_subagent, SUBAGENTS

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_script_parent = Path(__file__).resolve().parent.parent
_candidate_roots = [
    Path.home() / "Desktop" / "AI Voice Contracter",
    _script_parent,
]
PROJECT_ROOT = next((p for p in _candidate_roots if (p / ".git").is_dir()), _script_parent)
DAEMON_HOME = Path.home() / ".palmcare"
TASKS_DIR = DAEMON_HOME / "tasks"
COMPLETED_DIR = DAEMON_HOME / "completed"
STATE_FILE = DAEMON_HOME / "state.json"
LOG_DIR = Path.home() / "Library" / "Logs"
LOG_FILE = LOG_DIR / "palmcare-ai-tasks.log"

POLL_INTERVAL = 30
RESEND_BASE = "https://api.resend.com"
CF_WORKER_URL = "https://palmcare-email-receiver.museibrahim.workers.dev"
CF_WORKER_SECRET = os.getenv("CF_WORKER_SECRET", "")

ALLOWED_SENDERS = {
    "support@palmtai.com",
    "museibrahim@palmtai.com",
    "museibrahim@gmail.com",
    "musajama89@gmail.com",
}

REPLY_TO = "museibrahim@palmtai.com"
FROM_ADDRESS = "PalmCare AI Agent <onboarding@resend.dev>"

IGNORED_SENDERS = {
    "onboarding@resend.dev",
    "noreply@redditmail.com",
    "noreply@google.com",
    "workspace-noreply@google.com",
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_DIR.mkdir(parents=True, exist_ok=True)
TASKS_DIR.mkdir(parents=True, exist_ok=True)
COMPLETED_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("ai_task_daemon")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    _fh = logging.FileHandler(LOG_FILE)
    _fh.setFormatter(_fmt)
    logger.addHandler(_fh)
    # NOTE: No StreamHandler — launchd already redirects stdout to the same log file,
    # adding a StreamHandler would cause duplicate lines.
logger.propagate = False

# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"processed_ids": [], "last_poll": None, "tasks_completed": 0, "tasks_failed": 0}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str))


# ---------------------------------------------------------------------------
# Resend API helpers
# ---------------------------------------------------------------------------


def get_resend_headers() -> dict:
    api_key = os.getenv("RESEND_API_KEY", "")
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def send_reply_email(to: str, subject: str, html: str, attachments: list = None) -> bool:
    headers = get_resend_headers()
    payload = {"from": FROM_ADDRESS, "to": [to], "subject": subject, "html": html}
    if attachments:
        payload["attachments"] = attachments
    for attempt in range(3):
        try:
            resp = requests.post(f"{RESEND_BASE}/emails", headers=headers, json=payload, timeout=30)
            if resp.status_code in (200, 201):
                logger.info(f"Reply sent: {subject}")
                return True
            if resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            logger.error(f"Send failed {resp.status_code}: {resp.text[:200]}")
            return False
        except requests.RequestException as e:
            logger.error(f"Network error sending email: {e}")
            time.sleep(2)
    return False


def get_email_detail(email_id: str) -> Optional[dict]:
    headers = get_resend_headers()
    for attempt in range(3):
        try:
            resp = requests.get(f"{RESEND_BASE}/emails/receiving/{email_id}", headers=headers, timeout=15)
            if resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            if resp.status_code == 200:
                return resp.json()
            return None
        except requests.RequestException:
            time.sleep(2)
    return None


# ---------------------------------------------------------------------------
# Cloudflare Worker polling (primary email method)
# ---------------------------------------------------------------------------


def poll_cf_worker(state: dict) -> list[dict]:
    """Poll the Cloudflare Email Worker for new tasks stored in KV."""
    tasks = []
    try:
        resp = requests.get(
            f"{CF_WORKER_URL}/tasks",
            headers={"Authorization": f"Bearer {CF_WORKER_SECRET}"},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"CF Worker poll failed: {resp.status_code}")
            return []

        pending = resp.json().get("tasks", [])
        for task in pending:
            task_id = task.get("id", "")
            if task_id in state.get("processed_ids", []):
                continue

            sender = task.get("from", "").lower()
            if sender in IGNORED_SENDERS:
                ack_cf_task(task_id)
                state["processed_ids"].append(task_id)
                save_state(state)
                continue

            tasks.append({
                "source": "cf_worker",
                "id": task_id,
                "from": task.get("from", ""),
                "sender_email": sender,
                "subject": task.get("subject", "(no subject)"),
                "body": task.get("body", "(no body)"),
            })

    except requests.RequestException as e:
        logger.error(f"CF Worker poll error: {e}")
    except Exception as e:
        logger.exception(f"Unexpected error polling CF Worker: {e}")

    return tasks


def ack_cf_task(task_id: str):
    """Acknowledge a task in the CF Worker KV so it's not returned again."""
    try:
        requests.post(
            f"{CF_WORKER_URL}/tasks/ack",
            headers={
                "Authorization": f"Bearer {CF_WORKER_SECRET}",
                "Content-Type": "application/json",
            },
            json={"task_id": task_id},
            timeout=10,
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Resend inbound polling (fallback)
# ---------------------------------------------------------------------------


def extract_sender_email(from_field: str) -> str:
    match = re.search(r'<([^>]+)>', from_field)
    return match.group(1).lower() if match else from_field.lower().strip()


def is_task_email(detail: dict) -> bool:
    """Determine if an inbound email is a task for the AI agent."""
    sender = extract_sender_email(detail.get("from", ""))

    if sender in IGNORED_SENDERS:
        return False

    if sender in ALLOWED_SENDERS:
        return True

    subject = (detail.get("subject", "") or "").lower()
    headers = detail.get("headers", []) or []

    original_to = ""
    for h in headers:
        name = (h.get("name", "") or "").lower()
        if name in ("x-forwarded-to", "x-original-to", "delivered-to"):
            original_to = (h.get("value", "") or "").lower()
            if "ai@palmcareai.com" in original_to:
                return True

    if any(kw in subject for kw in ["ai task", "aitask", "[task]", "[question]", "[status]"]):
        return True

    return False


def poll_resend_inbound(state: dict) -> list[dict]:
    """Poll Resend inbound API for new emails."""
    headers = get_resend_headers()
    tasks = []

    try:
        resp = requests.get(
            f"{RESEND_BASE}/emails/receiving",
            headers=headers,
            params={"limit": 20},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"Resend inbound poll failed: {resp.status_code}")
            return []

        emails = resp.json().get("data", [])

        for email_summary in reversed(emails):
            eid = email_summary.get("id", "")
            if eid in state.get("processed_ids", []):
                continue

            detail = get_email_detail(eid)
            if not detail:
                state["processed_ids"].append(eid)
                save_state(state)
                continue

            if not is_task_email(detail):
                state["processed_ids"].append(eid)
                save_state(state)
                continue

            subject = detail.get("subject", "(no subject)")
            text = detail.get("text", "") or ""
            if not text:
                html = detail.get("html", "")
                if html:
                    text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
                    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
                    text = re.sub(r'<[^>]+>', ' ', text)
                    text = re.sub(r'\s+', ' ', text).strip()

            if not text:
                text = "(no body)"

            sender = extract_sender_email(detail.get("from", ""))
            tasks.append({
                "source": "resend_inbound",
                "id": eid,
                "from": detail.get("from", ""),
                "sender_email": sender,
                "subject": subject,
                "body": text,
            })

    except requests.RequestException as e:
        logger.error(f"Resend inbound poll error: {e}")
    except Exception as e:
        logger.exception(f"Unexpected error polling Resend inbound: {e}")

    return tasks


# ---------------------------------------------------------------------------
# Task parsing helpers
# ---------------------------------------------------------------------------


def parse_task_type(subject: str) -> str:
    subject_upper = subject.upper()
    if "[QUESTION]" in subject_upper:
        return "question"
    if "[STATUS]" in subject_upper:
        return "status"
    return "code"


def clean_subject(subject: str) -> str:
    cleaned = re.sub(r'\[(URGENT|QUESTION|STATUS)\]', '', subject, flags=re.IGNORECASE)
    cleaned = re.sub(r'^(Fwd?|Re):\s*', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


# ---------------------------------------------------------------------------
# File-based task queue
# ---------------------------------------------------------------------------


def check_file_tasks() -> list[dict]:
    tasks = []
    for task_file in sorted(TASKS_DIR.glob("*.task")):
        try:
            content = task_file.read_text(encoding="utf-8").strip()
            if not content:
                continue
            lines = content.split("\n", 1)
            title = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else ""
            tasks.append({"file": task_file, "title": title, "body": body, "task_type": parse_task_type(title)})
        except Exception as e:
            logger.error(f"Error reading task file {task_file}: {e}")
    return tasks


# ---------------------------------------------------------------------------
# Task execution (shared by all input methods)
# ---------------------------------------------------------------------------


def _is_marketing_material_request(title: str, body: str) -> bool:
    """Detect if the user is asking for marketing material to be sent visually."""
    text = (title + " " + body).lower()
    send_keywords = ["send me", "show me", "email me", "give me", "send the", "send it", "send back"]
    material_keywords = ["marketing", "material", "graphics", "images", "content", "copy", "social media", "posts", "campaign"]
    has_send = any(kw in text for kw in send_keywords)
    has_material = any(kw in text for kw in material_keywords)
    return has_send and has_material


def _build_marketing_material_email() -> tuple:
    """Build a rich visual email with all marketing material using public GitHub URLs.
    Returns (subject, html, attachments).
    """
    import base64
    import html as html_mod

    def esc(s):
        return html_mod.escape(str(s)) if s else ""

    GITHUB_RAW = "https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/main"
    MARKETING_URL = f"{GITHUB_RAW}/apps/web/public/marketing"

    marketing_dir = PROJECT_ROOT / "marketing" / "generated"
    web_marketing_dir = PROJECT_ROOT / "apps" / "web" / "public" / "marketing"
    copy_file = PROJECT_ROOT / "marketing" / "social-media-copy.md"

    attachments = []
    image_urls = {}

    all_graphics = {
        "iphone_home": ("iphone_home.png", "iPhone — Home Dashboard"),
        "iphone_record": ("iphone_record.png", "iPhone — Palm It Recording"),
        "iphone_clients": ("iphone_clients.png", "iPhone — Clients"),
        "hero_banner": ("hero_banner.png", "Hero — iPhone + CRM Dashboard (1920x1080)"),
        "ig_square": ("ig_square.png", "Instagram Square — iPhone + CRM (1080x1080)"),
        "ig_story": ("ig_story.png", "Instagram Story — Pipeline Flow (1080x1920)"),
        "fb_ad": ("fb_ad.png", "Facebook Ad — Before/After (1200x628)"),
        "twitter_banner": ("twitter_banner.png", "Twitter Banner — 3 iPhones + CRM"),
        "linkedin_crm": ("linkedin_crm.png", "LinkedIn — CRM Feature (1920x1080)"),
        "email_header": ("email_header.png", "Email Header — Teal Gradient"),
        "carousel_1": ("carousel_1.png", "Carousel 1 — Record"),
        "carousel_2": ("carousel_2.png", "Carousel 2 — Contract"),
        "carousel_3": ("carousel_3.png", "Carousel 3 — Manage"),
    }

    for key, (filename, _label) in all_graphics.items():
        image_urls[key] = f"{MARKETING_URL}/{filename}"
        local = marketing_dir / filename
        if not local.exists():
            local = web_marketing_dir / filename
        if local.exists():
            try:
                b64 = base64.b64encode(local.read_bytes()).decode()
                attachments.append({"filename": filename, "content": b64, "content_type": "image/png"})
            except Exception:
                pass

    copy_text = ""
    if copy_file.exists():
        try:
            raw = copy_file.read_text(encoding="utf-8", errors="replace")
            sections = raw.split("\n## ")
            for section in sections[1:6]:
                lines = section.strip().split("\n")
                title = lines[0].strip()
                body_lines = [l for l in lines[1:] if l.strip() and not l.startswith("---")]
                copy_text += f"<h3 style='color:#0d9488;font-size:15px;margin:16px 0 8px;'>{esc(title)}</h3>"
                for line in body_lines[:8]:
                    line = line.strip().lstrip("- *")
                    if line:
                        copy_text += f"<p style='color:#374151;font-size:13px;margin:4px 0;line-height:1.5;'>{esc(line)}</p>"
        except Exception:
            pass

    def img_tag(key, label, width="100%", max_width="500px"):
        if key in image_urls:
            return f'<div style="margin:12px 0;"><img src="{image_urls[key]}" alt="{esc(label)}" style="width:{width};max-width:{max_width};border-radius:8px;border:1px solid #e2e8f0;display:block;"><p style="color:#94a3b8;font-size:11px;margin:4px 0 0;text-align:center;">{esc(label)}</p></div>'
        return ""

    now_str = datetime.now().strftime("%b %d, %Y at %I:%M %p")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 24px;border-radius:14px 14px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">PalmCare AI Marketing Package</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">{now_str} &bull; All assets attached &bull; Generated via Nano Banana AI</p>
  </div>

  <div style="background:white;padding:24px;border-radius:0 0 14px 14px;border:1px solid #e2e8f0;border-top:none;">

    <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px;">Marketing Graphics (v3 — AI-Generated)</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px;">All graphics generated by Nano Banana 2 AI with photorealistic iPhone 15 Pro renders and CRM dashboard views. All images attached — save directly.</p>

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Hero Banner — iPhone + CRM</h3>
    {img_tag("hero_banner", "Hero — iPhone recording + CRM dashboard side by side", max_width="600px")}

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">LinkedIn — CRM Feature</h3>
    {img_tag("linkedin_crm", "LinkedIn — Dashboard + Pipeline + iPhone overlay", max_width="600px")}

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Instagram</h3>
    {img_tag("ig_square", "Instagram Square — Your CRM. Your phone.")}
    {img_tag("ig_story", "Instagram Story — From Voice to Contract", max_width="300px")}

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Instagram Carousel — Record → Contract → Manage</h3>
    <div style="text-align:center;">
      {img_tag("carousel_1", "Step 1: Record Your Assessment", width="30%", max_width="180px")}
      {img_tag("carousel_2", "Step 2: AI Builds the Contract", width="30%", max_width="180px")}
      {img_tag("carousel_3", "Step 3: Manage Everything", width="30%", max_width="180px")}
    </div>

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Facebook — Before/After</h3>
    {img_tag("fb_ad", "Facebook Ad — Before (paper) vs After (PalmCare AI)", max_width="600px")}

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Twitter Banner</h3>
    {img_tag("twitter_banner", "Twitter — 3 iPhones + CRM backdrop", max_width="600px")}

    <h3 style="color:#0d9488;font-size:14px;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Email Header</h3>
    {img_tag("email_header", "Email header — teal gradient with iPhone", max_width="600px")}

    <hr style="border:none;border-top:2px solid #e2e8f0;margin:28px 0;">

    <h2 style="color:#0f172a;font-size:18px;margin:0 0 8px;">iPhone 15 Pro Mockups</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px;">Photorealistic renders generated by Nano Banana AI.</p>

    <div style="text-align:center;background:#f8fafc;border-radius:12px;padding:20px 8px;">
      {img_tag("iphone_home", "Home Dashboard", width="30%", max_width="200px")}
      {img_tag("iphone_record", "Palm It Recording", width="30%", max_width="200px")}
      {img_tag("iphone_clients", "Clients", width="30%", max_width="200px")}
    </div>

    <hr style="border:none;border-top:2px solid #e2e8f0;margin:28px 0;">

    <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px;">Social Media Copy</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 12px;">Ready-to-post captions for each platform.</p>
    {copy_text if copy_text else '<p style="color:#94a3b8;font-size:13px;">Copy bank file not found.</p>'}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-top:24px;">
      <p style="color:#166534;font-size:13px;margin:0;"><strong>All images are attached to this email.</strong> Save them directly from the attachments. Reply to ai@palmcareai.com for any changes.</p>
    </div>

  </div>

  <div style="text-align:center;padding:20px 0;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">PalmCare AI Marketing Agent &bull; Palm Technologies, INC.</p>
  </div>

</div>
</body></html>"""

    return "Your Marketing Package — Graphics, Screenshots & Copy", html, attachments


def run_task(task_title: str, task_body: str, task_type: str, state: dict) -> dict:
    """Execute a task, routing to the appropriate subagent."""
    start_time = time.time()

    # Check if this is a request to send existing marketing material
    if _is_marketing_material_request(task_title, task_body):
        logger.info("Detected marketing material request — sending visual package")
        subject, html, attachments = _build_marketing_material_email()
        send_reply_email(REPLY_TO, subject, html, attachments)
        duration = time.time() - start_time
        result = {
            "summary": "Sent marketing package with all graphics, screenshots, and copy embedded in the email.",
            "status": "completed",
            "files_changed": [], "commands": [], "questions": [],
            "notes": "[Marketing Agent] Visual marketing package sent with inline images and attachments.",
        }
        state["tasks_completed"] = state.get("tasks_completed", 0) + 1
        save_state(state)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_record = {
            "title": task_title, "body": task_body[:500], "agent": "marketing",
            "status": "completed", "summary": result["summary"], "notes": result["notes"],
            "questions": [], "files_changed": [], "commit": None,
            "duration": round(duration, 1), "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            result_file = COMPLETED_DIR / f"{timestamp}_{task_title[:40].replace(' ', '_').replace('/', '_')}.result.json"
            result_file.write_text(json.dumps(result_record, indent=2, default=str))
        except Exception:
            pass
        logger.info(f"Marketing package sent in {duration:.1f}s")
        return {"result": result, "apply_result": None, "commit_hash": None, "duration": duration}

    agent_id = detect_subagent(task_title, task_body)
    if agent_id in SUBAGENTS:
        agent_name = SUBAGENTS[agent_id]["name"]
        logger.info(f"Routing to subagent: {agent_name}")
        result = execute_with_subagent(agent_id, task_title, task_body, task_type)
    else:
        result = execute_task(task_title=task_title, task_body=task_body, task_type=task_type)

    apply_result = None
    commit_hash = None
    if result.get("status") == "completed" and result.get("files_changed"):
        apply_result = apply_changes(result)
        commit_msg = f"AI Task: {task_title[:80]}"
        commit_hash = git_commit(commit_msg)
        if commit_hash:
            logger.info(f"Changes committed: {commit_hash}")

    duration = time.time() - start_time

    report_html = build_report_html(task_title, result, apply_result, commit_hash, duration)
    status_emoji = {"completed": "Done", "failed": "Failed", "needs_clarification": "Question"}
    status_tag = status_emoji.get(result.get("status", ""), "Update")
    send_reply_email(REPLY_TO, f"[{status_tag}] {task_title}", report_html)

    if result.get("status") == "completed":
        state["tasks_completed"] = state.get("tasks_completed", 0) + 1
    else:
        state["tasks_failed"] = state.get("tasks_failed", 0) + 1
    save_state(state)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_record = {
        "title": task_title,
        "body": task_body[:500],
        "agent": agent_id,
        "status": result.get("status", "unknown"),
        "summary": result.get("summary", ""),
        "notes": result.get("notes", ""),
        "questions": result.get("questions", []),
        "files_changed": [f.get("path", "") for f in result.get("files_changed", [])] if isinstance(result.get("files_changed"), list) else [],
        "commit": commit_hash,
        "duration": round(duration, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result_file = COMPLETED_DIR / f"{timestamp}_{task_title[:40].replace(' ', '_').replace('/', '_')}.result.json"
        result_file.write_text(json.dumps(result_record, indent=2, default=str))
    except Exception as e:
        logger.warning(f"Could not save result file: {e}")

    logger.info(f"Task complete: {result.get('status')} in {duration:.1f}s")
    return {"result": result, "apply_result": apply_result, "commit_hash": commit_hash, "duration": duration}


# ---------------------------------------------------------------------------
# Email report builder
# ---------------------------------------------------------------------------


def build_report_html(task_title, result, apply_result, commit_hash, duration_seconds):
    """Build a fully visualized, professional HTML email report.

    Every email should be self-contained and readable without the IDE —
    summaries are rendered as rich formatted text, file changes as collapsible
    cards, and questions/errors as highlighted callouts.
    """
    import html as html_mod

    status = result.get("status", "unknown")
    summary = result.get("summary", "No summary provided.")
    notes = result.get("notes", "")
    questions = result.get("questions", [])

    status_map = {
        "completed": ("Completed", "#059669", "#ecfdf5", "#d1fae5", "&#10003;"),
        "failed": ("Failed", "#dc2626", "#fef2f2", "#fecaca", "&#10007;"),
        "needs_clarification": ("Needs Your Input", "#d97706", "#fffbeb", "#fde68a", "&#63;"),
    }
    status_label, color, bg, border, icon = status_map.get(status, ("Update", "#6b7280", "#f9fafb", "#e5e7eb", "&#8226;"))

    agent_id = detect_subagent(task_title, "")
    agent_info = SUBAGENTS.get(agent_id, {})
    agent_name = agent_info.get("name", "General Agent")
    agent_color = agent_info.get("color", "#6b7280")
    agent_icon = agent_info.get("icon", "G") if hasattr(SUBAGENTS.get(agent_id, {}), "get") else "G"

    def esc(s):
        return html_mod.escape(str(s)) if s else ""

    def render_summary(text):
        """Render summary as formatted paragraphs with line breaks."""
        escaped = esc(text)
        paragraphs = escaped.split("\n\n")
        rendered = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if p.startswith("- ") or p.startswith("* "):
                items = [line.lstrip("- *").strip() for line in p.split("\n") if line.strip()]
                rendered.append("<ul style='margin:8px 0;padding-left:20px;'>" + "".join(f"<li style='padding:3px 0;color:#374151;font-size:14px;line-height:1.6;'>{i}</li>" for i in items) + "</ul>")
            else:
                rendered.append(f"<p style='color:#374151;font-size:14px;margin:8px 0;line-height:1.7;'>{p.replace(chr(10), '<br>')}</p>")
        return "\n".join(rendered) if rendered else f"<p style='color:#374151;font-size:14px;line-height:1.7;'>{escaped}</p>"

    sections = []

    # Files changed — show as clean list, NOT raw code dumps
    files_changed = result.get("files_changed", [])
    applied_files = (apply_result or {}).get("applied_files", [])
    if files_changed or applied_files:
        file_items = []
        for fc in files_changed:
            fpath = fc.get("path", "") if isinstance(fc, dict) else str(fc)
            action = fc.get("action", "modify") if isinstance(fc, dict) else "modify"
            desc = fc.get("description", "") if isinstance(fc, dict) else ""
            action_colors = {"create": "#059669", "modify": "#2563eb", "delete": "#dc2626"}
            action_bg = {"create": "#ecfdf5", "modify": "#eff6ff", "delete": "#fef2f2"}
            ac = action_colors.get(action, "#6b7280")
            ab = action_bg.get(action, "#f9fafb")
            file_items.append(
                f'<div style="padding:10px 14px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:10px;">'
                f'<span style="background:{ab};color:{ac};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;min-width:55px;text-align:center;">{esc(action)}</span>'
                f'<div><span style="font-family:monospace;font-size:13px;color:#1f2937;">{esc(fpath)}</span>'
                f'{"<br><span style=&quot;font-size:12px;color:#6b7280;&quot;>" + esc(desc) + "</span>" if desc else ""}'
                f'</div></div>'
            )
        if file_items:
            sections.append(
                f'<div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">'
                f'<div style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;">'
                f'<h3 style="color:#1f2937;font-size:15px;margin:0;font-weight:600;">Files Changed ({len(file_items)})</h3></div>'
                f'{"".join(file_items)}</div>'
            )

    # Commands run
    ran_commands = (apply_result or {}).get("ran_commands", [])
    if ran_commands:
        cmd_items = []
        for c in ran_commands:
            exit_code = c.get("exit_code", -1)
            ec_color = "#059669" if exit_code == 0 else "#dc2626"
            cmd_items.append(
                f'<div style="padding:8px 14px;border-bottom:1px solid #f3f4f6;font-family:monospace;font-size:12px;">'
                f'<code style="color:#1f2937;">$ {esc(c.get("command", ""))}</code>'
                f'<span style="float:right;color:{ec_color};font-weight:600;">exit {exit_code}</span></div>'
            )
        sections.append(
            f'<div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">'
            f'<div style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;">'
            f'<h3 style="color:#1f2937;font-size:15px;margin:0;font-weight:600;">Commands Run</h3></div>'
            f'{"".join(cmd_items)}</div>'
        )

    # Commit
    if commit_hash:
        sections.append(
            f'<div style="margin:16px 0;padding:14px 16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;display:flex;align-items:center;gap:10px;">'
            f'<span style="font-size:18px;">&#9989;</span>'
            f'<span style="color:#166534;font-size:14px;">Changes committed: <code style="background:#dcfce7;padding:3px 8px;border-radius:4px;font-weight:700;font-family:monospace;">{esc(commit_hash)}</code></span></div>'
        )

    # Questions
    if questions:
        q_items = "".join(f'<li style="padding:6px 0;color:#92400e;font-size:14px;line-height:1.5;">{esc(q)}</li>' for q in questions)
        sections.append(
            f'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:18px;margin:20px 0;">'
            f'<h3 style="color:#92400e;font-size:16px;margin:0 0 10px 0;">&#128172; Questions for You</h3>'
            f'<ul style="margin:0;padding-left:20px;">{q_items}</ul>'
            f'<p style="color:#b45309;font-size:13px;margin:14px 0 0 0;font-style:italic;">Reply to <strong>ai@palmcareai.com</strong> to answer these questions.</p></div>'
        )

    # Errors
    all_errors = (apply_result or {}).get("errors", [])
    if all_errors:
        e_items = "".join(f'<li style="padding:4px 0;color:#dc2626;font-size:13px;">{esc(e)}</li>' for e in all_errors)
        sections.append(
            f'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:18px;margin:20px 0;">'
            f'<h3 style="color:#991b1b;font-size:16px;margin:0 0 10px 0;">&#9888; Errors</h3>'
            f'<ul style="margin:0;padding-left:20px;">{e_items}</ul></div>'
        )

    # Notes
    if notes:
        sections.append(
            f'<div style="margin:20px 0;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">'
            f'<h3 style="color:#64748b;font-size:13px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.5px;">Agent Notes</h3>'
            f'<p style="color:#475569;font-size:14px;margin:0;line-height:1.6;">{esc(notes)}</p></div>'
        )

    sections_html = "\n".join(sections)
    now_str = datetime.now().strftime("%b %d, %Y at %I:%M %p")

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 24px;border-radius:14px 14px 0 0;">
    <table style="width:100%;"><tr>
      <td><h1 style="color:white;margin:0;font-size:20px;font-weight:700;">PalmCare AI</h1>
        <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">Task Report &bull; {now_str}</p></td>
      <td style="text-align:right;">
        <div style="display:inline-block;background:{agent_color};color:white;width:38px;height:38px;border-radius:10px;text-align:center;line-height:38px;font-weight:700;font-size:14px;">{esc(agent_icon)}</div>
      </td>
    </tr></table>
  </div>

  <!-- Body -->
  <div style="background:white;padding:24px;border-radius:0 0 14px 14px;border:1px solid #e2e8f0;border-top:none;">

    <!-- Status + Agent badges -->
    <div style="margin-bottom:20px;">
      <span style="display:inline-block;background:{bg};color:{color};border:1px solid {border};padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;text-transform:uppercase;margin-right:8px;">{icon} {status_label}</span>
      <span style="display:inline-block;background:{agent_color}18;color:{agent_color};padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">{esc(agent_name)}</span>
      <span style="display:inline-block;color:#94a3b8;font-size:12px;margin-left:8px;">{duration_seconds:.1f}s</span>
    </div>

    <!-- Task title -->
    <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px 0;font-weight:700;">{esc(task_title)}</h2>

    <!-- Summary -->
    <div style="background:#f8fafc;border-radius:10px;padding:18px;margin:0 0 20px 0;border-left:4px solid #0d9488;">
      <h3 style="color:#0d9488;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">Summary</h3>
      {render_summary(summary)}
    </div>

    {sections_html}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0;">
    <p style="color:#0d9488;font-weight:600;margin:0 0 4px;font-size:13px;">PalmCare AI Agent</p>
    <p style="color:#94a3b8;font-size:11px;margin:0;">Reply to <strong>ai@palmcareai.com</strong> &bull; Dashboard: localhost:5050</p>
  </div>

</div>
</body></html>"""


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------


def poll_cycle(state: dict) -> int:
    processed = 0

    # 1. File-based task queue (local)
    for task in check_file_tasks():
        try:
            title = clean_subject(task["title"])
            run_task(title, task["body"], task["task_type"], state)
            processed += 1
        except Exception as e:
            logger.exception(f"Error processing file task: {e}")
        finally:
            try:
                task_file = task.get("file")
                if task_file and task_file.exists():
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    task_file.rename(COMPLETED_DIR / f"{timestamp}_{task_file.stem}.done")
            except Exception:
                try:
                    task_file.unlink(missing_ok=True)
                except Exception:
                    pass
            time.sleep(2)

    # 2. Cloudflare Worker (primary email method — emails to ai@palmcareai.com)
    for cf_task in poll_cf_worker(state):
        try:
            title = clean_subject(cf_task["subject"])
            body = cf_task["body"]
            task_type = parse_task_type(cf_task["subject"])
            logger.info(f"CF Worker task from {cf_task['sender_email']}: {title}")
            run_task(title, body, task_type, state)
            ack_cf_task(cf_task["id"])
            state["processed_ids"].append(cf_task["id"])
            save_state(state)
            processed += 1
            time.sleep(2)
        except Exception as e:
            logger.exception(f"Error processing CF Worker task: {e}")

    # 3. Resend inbound (fallback)
    for inbound_task in poll_resend_inbound(state):
        try:
            title = clean_subject(inbound_task["subject"])
            body = inbound_task["body"]
            task_type = parse_task_type(inbound_task["subject"])
            logger.info(f"Resend inbound task from {inbound_task['sender_email']}: {title}")
            run_task(title, body, task_type, state)
            state["processed_ids"].append(inbound_task["id"])
            save_state(state)
            processed += 1
            time.sleep(2)
        except Exception as e:
            logger.exception(f"Error processing Resend inbound task: {e}")

    state["last_poll"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    return processed


def run_daemon():
    logger.info("=" * 60)
    logger.info("PalmCare AI Task Daemon starting")
    logger.info(f"  Project:    {PROJECT_ROOT}")
    logger.info(f"  Tasks dir:  {TASKS_DIR}")
    logger.info(f"  Resend:     {'ENABLED' if os.getenv('RESEND_API_KEY') else 'DISABLED'}")
    logger.info(f"  CF Worker:  {CF_WORKER_URL}")
    logger.info(f"  Email in:   CF Worker (ai@palmcareai.com -> Worker -> KV -> daemon)")
    logger.info(f"  Polling:    every {POLL_INTERVAL}s")
    logger.info(f"  Reply to:   {REPLY_TO}")
    logger.info(f"  Log:        {LOG_FILE}")
    logger.info("=" * 60)

    if not os.getenv("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY not set. Exiting.")
        sys.exit(1)

    state = load_state()
    state["processed_ids"] = state.get("processed_ids", [])[-500:]

    running = True

    def handle_signal(signum, frame):
        nonlocal running
        logger.info(f"Received signal {signum}, shutting down...")
        running = False

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    while running:
        try:
            count = poll_cycle(state)
            if count > 0:
                logger.info(f"Processed {count} task(s) this cycle")
        except Exception as e:
            logger.exception(f"Error in poll cycle: {e}")

        for _ in range(POLL_INTERVAL):
            if not running:
                break
            time.sleep(1)

    logger.info("Daemon stopped.")


if __name__ == "__main__":
    from dotenv import load_dotenv
    _env_path = Path.home() / ".palmcare" / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
    else:
        load_dotenv(PROJECT_ROOT / ".env")

    if "--once" in sys.argv:
        logger.info("Running single poll cycle...")
        state = load_state()
        count = poll_cycle(state)
        logger.info(f"Processed {count} task(s)")

    elif "--draft-investor-emails" in sys.argv:
        from email_agent import EmailAgent
        agent = EmailAgent()
        drafts = agent.draft_investor_emails()
        print(f"Drafted {len(drafts)} investor email(s).")
        agent.print_drafts(status="pending_review")

    elif "--draft-agency-emails" in sys.argv:
        from email_agent import EmailAgent
        agent = EmailAgent()
        drafts = agent.draft_agency_emails()
        print(f"Drafted {len(drafts)} agency email(s).")
        agent.print_drafts(status="pending_review")

    elif "--list-drafts" in sys.argv:
        from email_agent import EmailAgent
        agent = EmailAgent()
        agent.print_drafts()

    elif "--approve-emails" in sys.argv:
        from email_agent import EmailAgent
        agent = EmailAgent()
        results = agent.approve_all()
        for r in results:
            status_str = r.get("status", "unknown")
            print(f"  [{status_str.upper()}] {r.get('draft_id')} -> {r.get('to')}")
        print(f"Processed {len(results)} draft(s).")

    elif "--social-status" in sys.argv:
        from social_media_manager import SocialMediaManager
        sm = SocialMediaManager()
        print("Social Media Platform Status:")
        for platform, enabled in sm.get_platform_status().items():
            status_str = "CONFIGURED" if enabled else "NOT CONFIGURED"
            print(f"  {platform}: {status_str}")

    elif "--social-drafts" in sys.argv:
        from social_media_manager import SocialMediaManager
        sm = SocialMediaManager()
        drafts = sm.list_drafts()
        if not drafts:
            print("No social media drafts found.")
        else:
            for d in drafts:
                status_str = d.get("status", "?")
                platforms = ", ".join(d.get("platforms", []))
                print(f"  [{status_str.upper()}] {d['date']} | {platforms} | {d.get('copy', {}).get('twitter', '')[:60]}...")

    else:
        run_daemon()
