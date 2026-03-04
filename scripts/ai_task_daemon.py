#!/usr/bin/env python3
"""
AI Task Daemon — Polls for inbound emails to ai@palmcareai.com and executes tasks.

Runs as a background daemon on macOS via launchd. Polls Resend inbound API
every 60 seconds, processes tasks using Claude, and emails results back.

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
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

# Add scripts dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_task_executor import execute_task, apply_changes, git_commit

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = PROJECT_ROOT / ".ai_task_state.json"
LOG_DIR = Path.home() / "Library" / "Logs"
LOG_FILE = LOG_DIR / "palmcare-ai-tasks.log"

POLL_INTERVAL = 60  # seconds
RESEND_BASE = "https://api.resend.com"

ALLOWED_SENDERS = {
    "support@palmtai.com",
    "museibrahim@palmtai.com",
    "museibrahim@gmail.com",
}

TARGET_RECIPIENT = "ai@palmcareai.com"
REPLY_TO = "support@palmtai.com"
FROM_ADDRESS = "PalmCare AI Agent <onboarding@palmtai.com>"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("ai_task_daemon")

# ---------------------------------------------------------------------------
# State management — tracks which emails have been processed
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
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def fetch_inbound_emails(limit: int = 20) -> list[dict]:
    """Fetch recent inbound emails from Resend."""
    headers = get_resend_headers()
    try:
        resp = requests.get(
            f"{RESEND_BASE}/emails/receiving",
            headers=headers,
            params={"limit": limit},
            timeout=15,
        )
        if resp.status_code == 429:
            logger.warning("Rate limited by Resend, will retry next cycle")
            return []
        if resp.status_code != 200:
            logger.error(f"Resend API error {resp.status_code}: {resp.text[:200]}")
            return []
        return resp.json().get("data", [])
    except requests.RequestException as e:
        logger.error(f"Network error fetching emails: {e}")
        return []


def get_email_detail(email_id: str) -> Optional[dict]:
    """Get full email content by ID."""
    headers = get_resend_headers()
    for attempt in range(3):
        try:
            resp = requests.get(
                f"{RESEND_BASE}/emails/receiving/{email_id}",
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"Failed to get email {email_id}: {resp.status_code}")
            return None
        except requests.RequestException as e:
            logger.error(f"Network error getting email {email_id}: {e}")
            time.sleep(2)
    return None


def send_reply_email(to: str, subject: str, html: str) -> bool:
    """Send a reply email via Resend."""
    headers = get_resend_headers()
    payload = {
        "from": FROM_ADDRESS,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    for attempt in range(3):
        try:
            resp = requests.post(
                f"{RESEND_BASE}/emails",
                headers=headers,
                json=payload,
                timeout=15,
            )
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


# ---------------------------------------------------------------------------
# Email parsing
# ---------------------------------------------------------------------------


def is_valid_sender(email_from: str) -> bool:
    """Check if sender is in the whitelist."""
    if not email_from:
        return False
    # Extract email from "Name <email>" format
    match = re.search(r'<([^>]+)>', email_from)
    addr = match.group(1).lower() if match else email_from.lower().strip()
    return addr in ALLOWED_SENDERS


def is_targeted_to_ai(email_to: list) -> bool:
    """Check if the email was sent to ai@palmcareai.com."""
    if not email_to:
        return False
    for addr in email_to:
        if TARGET_RECIPIENT in addr.lower():
            return True
    return False


def parse_task_type(subject: str) -> str:
    """Detect task type from subject line tags."""
    subject_upper = subject.upper()
    if "[QUESTION]" in subject_upper:
        return "question"
    if "[STATUS]" in subject_upper:
        return "status"
    return "code"


def clean_subject(subject: str) -> str:
    """Remove tags from subject to get clean task title."""
    cleaned = re.sub(r'\[(URGENT|QUESTION|STATUS)\]', '', subject, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_text_body(email: dict) -> str:
    """Extract plain text body from email, falling back to HTML stripping."""
    text = email.get("text", "")
    if text and text.strip():
        return text.strip()

    html = email.get("html", "")
    if html:
        # Basic HTML tag stripping
        text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    return "(no body)"


# ---------------------------------------------------------------------------
# Email report builder
# ---------------------------------------------------------------------------


def build_report_html(
    task_title: str,
    result: dict,
    apply_result: Optional[dict],
    commit_hash: Optional[str],
    duration_seconds: float,
) -> str:
    """Build a beautiful HTML email report."""
    status = result.get("status", "unknown")
    summary = result.get("summary", "No summary")
    notes = result.get("notes", "")
    questions = result.get("questions", [])

    status_colors = {
        "completed": ("#059669", "#ecfdf5", "#d1fae5"),
        "failed": ("#dc2626", "#fef2f2", "#fecaca"),
        "needs_clarification": ("#d97706", "#fffbeb", "#fde68a"),
    }
    color, bg, border = status_colors.get(status, ("#6b7280", "#f9fafb", "#e5e7eb"))
    status_label = status.replace("_", " ").title()

    files_html = ""
    if apply_result and apply_result.get("applied_files"):
        files_list = "".join(
            f'<li style="padding:4px 0;color:#374151;">{f}</li>'
            for f in apply_result["applied_files"]
        )
        files_html = f"""
        <div style="margin:20px 0;">
            <h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Files Changed</h3>
            <ul style="margin:0;padding-left:20px;font-family:monospace;font-size:13px;">{files_list}</ul>
        </div>"""

    commands_html = ""
    if apply_result and apply_result.get("ran_commands"):
        cmds = "".join(
            f'<li style="padding:4px 0;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">'
            f'{c["command"]}</code> (exit {c["exit_code"]})</li>'
            for c in apply_result["ran_commands"]
        )
        commands_html = f"""
        <div style="margin:20px 0;">
            <h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Commands Run</h3>
            <ul style="margin:0;padding-left:20px;font-size:13px;">{cmds}</ul>
        </div>"""

    errors_html = ""
    if apply_result and apply_result.get("errors"):
        errs = "".join(
            f'<li style="padding:4px 0;color:#dc2626;">{e}</li>'
            for e in apply_result["errors"]
        )
        errors_html = f"""
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
            <h3 style="color:#991b1b;font-size:16px;margin:0 0 8px 0;">Errors</h3>
            <ul style="margin:0;padding-left:20px;font-size:13px;">{errs}</ul>
        </div>"""

    questions_html = ""
    if questions:
        q_list = "".join(
            f'<li style="padding:4px 0;color:#92400e;">{q}</li>'
            for q in questions
        )
        questions_html = f"""
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
            <h3 style="color:#92400e;font-size:16px;margin:0 0 8px 0;">Questions for You</h3>
            <ul style="margin:0;padding-left:20px;font-size:14px;">{q_list}</ul>
            <p style="color:#92400e;font-size:13px;margin:12px 0 0 0;">
                Reply to this email to answer, and I'll continue the task.
            </p>
        </div>"""

    commit_html = ""
    if commit_hash:
        commit_html = f"""
        <div style="margin:16px 0;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <span style="color:#166534;font-size:14px;">
                Committed: <code style="background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:bold;">{commit_hash}</code>
            </span>
        </div>"""

    notes_html = ""
    if notes:
        notes_html = f"""
        <div style="margin:20px 0;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <h3 style="color:#6b7280;font-size:14px;margin:0 0 6px 0;">Notes</h3>
            <p style="color:#4b5563;font-size:14px;margin:0;line-height:1.5;">{notes}</p>
        </div>"""

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);padding:30px 24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">PalmCare AI Agent</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:13px;">Task Execution Report</p>
        </div>

        <div style="padding:24px;">
            <div style="display:flex;align-items:center;margin-bottom:20px;">
                <span style="background:{bg};color:{color};border:1px solid {border};padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;text-transform:uppercase;">
                    {status_label}
                </span>
                <span style="color:#9ca3af;font-size:13px;margin-left:12px;">
                    {duration_seconds:.1f}s
                </span>
            </div>

            <h2 style="color:#1f2937;font-size:18px;margin:0 0 12px 0;">{task_title}</h2>

            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0d9488;">
                <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">{summary}</p>
            </div>

            {files_html}
            {commands_html}
            {commit_html}
            {questions_html}
            {errors_html}
            {notes_html}
        </div>

        <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#0d9488;font-weight:600;margin:0 0 4px 0;font-size:13px;">PalmCare AI Agent</p>
            <p style="color:#9ca3af;font-size:11px;margin:0;">
                Reply to this email to send a follow-up task.
            </p>
        </div>
    </div>
    """


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------


def process_email(email: dict, state: dict) -> bool:
    """Process a single inbound email as a task. Returns True if processed."""
    email_id = email.get("id", "")
    sender = email.get("from", "")
    recipients = email.get("to", [])
    subject = email.get("subject", "(no subject)")

    if email_id in state.get("processed_ids", []):
        return False

    if not is_valid_sender(sender):
        logger.info(f"Skipping email from unauthorized sender: {sender}")
        state["processed_ids"].append(email_id)
        save_state(state)
        return False

    if not is_targeted_to_ai(recipients):
        return False

    logger.info(f"Processing task: {subject} (from {sender})")

    detail = get_email_detail(email_id)
    if not detail:
        logger.error(f"Could not fetch email detail for {email_id}")
        return False

    task_type = parse_task_type(subject)
    task_title = clean_subject(subject)
    task_body = extract_text_body(detail)

    start_time = time.time()

    result = execute_task(
        task_title=task_title,
        task_body=task_body,
        task_type=task_type,
    )

    apply_result = None
    commit_hash = None

    if result.get("status") == "completed" and result.get("files_changed"):
        apply_result = apply_changes(result)
        commit_msg = f"AI Task: {task_title[:80]}"
        commit_hash = git_commit(commit_msg)
        if commit_hash:
            logger.info(f"Changes committed: {commit_hash}")

    duration = time.time() - start_time

    # Build and send report
    report_html = build_report_html(
        task_title=task_title,
        result=result,
        apply_result=apply_result,
        commit_hash=commit_hash,
        duration_seconds=duration,
    )

    status_emoji = {"completed": "Done", "failed": "Failed", "needs_clarification": "Question"}
    status_tag = status_emoji.get(result.get("status", ""), "Update")
    reply_subject = f"[{status_tag}] {task_title}"

    send_reply_email(REPLY_TO, reply_subject, report_html)

    state["processed_ids"].append(email_id)
    if result.get("status") == "completed":
        state["tasks_completed"] = state.get("tasks_completed", 0) + 1
    else:
        state["tasks_failed"] = state.get("tasks_failed", 0) + 1
    save_state(state)

    logger.info(f"Task complete: {result.get('status')} in {duration:.1f}s")
    return True


def poll_cycle(state: dict) -> int:
    """Run one poll cycle. Returns number of tasks processed."""
    emails = fetch_inbound_emails(limit=20)
    if not emails:
        return 0

    processed = 0
    for email in reversed(emails):  # Process oldest first
        email_id = email.get("id", "")
        if email_id in state.get("processed_ids", []):
            continue
        if process_email(email, state):
            processed += 1
            time.sleep(2)  # Brief pause between tasks

    state["last_poll"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    return processed


def run_daemon():
    """Main daemon loop."""
    logger.info("=" * 60)
    logger.info("PalmCare AI Task Daemon starting")
    logger.info(f"  Project: {PROJECT_ROOT}")
    logger.info(f"  Polling: every {POLL_INTERVAL}s")
    logger.info(f"  Inbox:   {TARGET_RECIPIENT}")
    logger.info(f"  Reply:   {REPLY_TO}")
    logger.info(f"  Log:     {LOG_FILE}")
    logger.info("=" * 60)

    # Verify required env vars
    if not os.getenv("RESEND_API_KEY"):
        logger.error("RESEND_API_KEY not set. Exiting.")
        sys.exit(1)
    if not os.getenv("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY not set. Exiting.")
        sys.exit(1)

    state = load_state()
    # Keep only last 500 processed IDs to prevent unbounded growth
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

        # Sleep in small increments so we can respond to signals
        for _ in range(POLL_INTERVAL):
            if not running:
                break
            time.sleep(1)

    logger.info("Daemon stopped.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")

    if "--once" in sys.argv:
        logger.info("Running single poll cycle...")
        state = load_state()
        count = poll_cycle(state)
        logger.info(f"Processed {count} task(s)")
    else:
        run_daemon()
