#!/usr/bin/env python3
"""
AI Task Daemon — Watches for tasks via email (Gmail IMAP) and file queue.

Supports three input methods:
  1. Gmail IMAP: Reads emails sent to ai@palmcareai.com (forwarded to Gmail)
  2. Resend inbound: Polls Resend API for inbound emails
  3. File-based: Drop .task files into ~/.palmcare/tasks/

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
import imaplib
import email as email_lib
from email.header import decode_header
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_task_executor import execute_task, apply_changes, git_commit

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DAEMON_HOME = Path.home() / ".palmcare"
TASKS_DIR = DAEMON_HOME / "tasks"
COMPLETED_DIR = DAEMON_HOME / "completed"
STATE_FILE = DAEMON_HOME / "state.json"
LOG_DIR = Path.home() / "Library" / "Logs"
LOG_FILE = LOG_DIR / "palmcare-ai-tasks.log"

POLL_INTERVAL = 30
RESEND_BASE = "https://api.resend.com"

ALLOWED_SENDERS = {
    "support@palmtai.com",
    "museibrahim@palmtai.com",
    "museibrahim@gmail.com",
}

TARGET_KEYWORDS = ["ai@palmcareai.com", "ai task", "aitask"]
REPLY_TO = "museibrahim@palmtai.com"
FROM_ADDRESS = "PalmCare AI Agent <onboarding@resend.dev>"

# Gmail IMAP config
GMAIL_USER = os.getenv("GMAIL_USER", "museibrahim@palmtai.com")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
GMAIL_IMAP_HOST = "imap.gmail.com"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_DIR.mkdir(parents=True, exist_ok=True)
TASKS_DIR.mkdir(parents=True, exist_ok=True)
COMPLETED_DIR.mkdir(parents=True, exist_ok=True)

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


def send_reply_email(to: str, subject: str, html: str) -> bool:
    headers = get_resend_headers()
    payload = {"from": FROM_ADDRESS, "to": [to], "subject": subject, "html": html}
    for attempt in range(3):
        try:
            resp = requests.post(f"{RESEND_BASE}/emails", headers=headers, json=payload, timeout=15)
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


def fetch_inbound_emails(limit: int = 20) -> list[dict]:
    headers = get_resend_headers()
    try:
        resp = requests.get(f"{RESEND_BASE}/emails/receiving", headers=headers, params={"limit": limit}, timeout=15)
        if resp.status_code != 200:
            return []
        return resp.json().get("data", [])
    except requests.RequestException:
        return []


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
# Gmail IMAP polling
# ---------------------------------------------------------------------------


def decode_mime_header(header_value: str) -> str:
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return " ".join(result)


def extract_email_address(header: str) -> str:
    match = re.search(r'<([^>]+)>', header)
    return match.group(1).lower() if match else header.lower().strip()


def get_email_text(msg) -> str:
    """Extract plain text from email message."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
            elif content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html = payload.decode(charset, errors="replace")
                    text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
                    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
                    text = re.sub(r'<[^>]+>', ' ', text)
                    return re.sub(r'\s+', ' ', text).strip()
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
    return "(no body)"


def poll_gmail(state: dict) -> list[dict]:
    """Poll Gmail via IMAP for emails forwarded from ai@palmcareai.com."""
    if not GMAIL_APP_PASSWORD:
        return []

    tasks = []
    try:
        mail = imaplib.IMAP4_SSL(GMAIL_IMAP_HOST)
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        mail.select("INBOX")

        # Search for unread emails that mention ai@palmcareai.com or are from allowed senders
        _, data = mail.search(None, "UNSEEN")
        if not data[0]:
            mail.logout()
            return []

        msg_ids = data[0].split()
        logger.info(f"Gmail: {len(msg_ids)} unread emails found")

        for msg_id in msg_ids[-20:]:  # Process last 20 unread
            _, msg_data = mail.fetch(msg_id, "(RFC822)")
            raw_email = msg_data[0][1]
            msg = email_lib.message_from_bytes(raw_email)

            message_id = msg.get("Message-ID", "")
            if message_id in state.get("processed_ids", []):
                continue

            from_addr = decode_mime_header(msg.get("From", ""))
            to_addr = decode_mime_header(msg.get("To", ""))
            subject = decode_mime_header(msg.get("Subject", "(no subject)"))
            sender_email = extract_email_address(from_addr)

            # Check if this is a task email (sent to ai@palmcareai.com or from allowed sender)
            is_ai_email = any(kw in to_addr.lower() for kw in TARGET_KEYWORDS)
            is_ai_email = is_ai_email or any(kw in subject.lower() for kw in TARGET_KEYWORDS)
            is_allowed = sender_email in ALLOWED_SENDERS

            if not (is_ai_email and is_allowed):
                continue

            body = get_email_text(msg)

            tasks.append({
                "source": "gmail",
                "message_id": message_id,
                "gmail_msg_id": msg_id,
                "from": from_addr,
                "subject": subject,
                "body": body,
            })

            # Mark as read
            mail.store(msg_id, "+FLAGS", "\\Seen")

        mail.logout()

    except imaplib.IMAP4.error as e:
        logger.error(f"Gmail IMAP error: {e}")
    except Exception as e:
        logger.error(f"Gmail polling error: {e}")

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


def run_task(task_title: str, task_body: str, task_type: str, state: dict) -> dict:
    """Execute a task and return the result with apply info."""
    start_time = time.time()

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

    logger.info(f"Task complete: {result.get('status')} in {duration:.1f}s")
    return {"result": result, "apply_result": apply_result, "commit_hash": commit_hash, "duration": duration}


# ---------------------------------------------------------------------------
# Email report builder
# ---------------------------------------------------------------------------


def build_report_html(task_title, result, apply_result, commit_hash, duration_seconds):
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

    sections = []

    if apply_result and apply_result.get("applied_files"):
        items = "".join(f'<li style="padding:4px 0;color:#374151;">{f}</li>' for f in apply_result["applied_files"])
        sections.append(f'<div style="margin:20px 0;"><h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Files Changed</h3><ul style="margin:0;padding-left:20px;font-family:monospace;font-size:13px;">{items}</ul></div>')

    if apply_result and apply_result.get("ran_commands"):
        items = "".join(f'<li style="padding:4px 0;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">{c["command"]}</code> (exit {c["exit_code"]})</li>' for c in apply_result["ran_commands"])
        sections.append(f'<div style="margin:20px 0;"><h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Commands Run</h3><ul style="margin:0;padding-left:20px;font-size:13px;">{items}</ul></div>')

    if commit_hash:
        sections.append(f'<div style="margin:16px 0;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;"><span style="color:#166534;font-size:14px;">Committed: <code style="background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:bold;">{commit_hash}</code></span></div>')

    if questions:
        items = "".join(f'<li style="padding:4px 0;color:#92400e;">{q}</li>' for q in questions)
        sections.append(f'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;"><h3 style="color:#92400e;font-size:16px;margin:0 0 8px 0;">Questions for You</h3><ul style="margin:0;padding-left:20px;font-size:14px;">{items}</ul><p style="color:#92400e;font-size:13px;margin:12px 0 0 0;">Reply to ai@palmcareai.com to answer.</p></div>')

    if apply_result and apply_result.get("errors"):
        items = "".join(f'<li style="padding:4px 0;color:#dc2626;">{e}</li>' for e in apply_result["errors"])
        sections.append(f'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;"><h3 style="color:#991b1b;font-size:16px;margin:0 0 8px 0;">Errors</h3><ul style="margin:0;padding-left:20px;font-size:13px;">{items}</ul></div>')

    if notes:
        sections.append(f'<div style="margin:20px 0;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;"><h3 style="color:#6b7280;font-size:14px;margin:0 0 6px 0;">Notes</h3><p style="color:#4b5563;font-size:14px;margin:0;line-height:1.5;">{notes}</p></div>')

    sections_html = "\n".join(sections)

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);padding:30px 24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">PalmCare AI Agent</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:13px;">Task Execution Report</p>
        </div>
        <div style="padding:24px;">
            <div style="display:flex;align-items:center;margin-bottom:20px;">
                <span style="background:{bg};color:{color};border:1px solid {border};padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;text-transform:uppercase;">{status_label}</span>
                <span style="color:#9ca3af;font-size:13px;margin-left:12px;">{duration_seconds:.1f}s</span>
            </div>
            <h2 style="color:#1f2937;font-size:18px;margin:0 0 12px 0;">{task_title}</h2>
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0d9488;">
                <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">{summary}</p>
            </div>
            {sections_html}
        </div>
        <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#0d9488;font-weight:600;margin:0 0 4px 0;font-size:13px;">PalmCare AI Agent</p>
            <p style="color:#9ca3af;font-size:11px;margin:0;">Reply to ai@palmcareai.com to send more tasks</p>
        </div>
    </div>"""


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------


def poll_cycle(state: dict) -> int:
    processed = 0

    # 1. File-based task queue
    for task in check_file_tasks():
        try:
            title = clean_subject(task["title"])
            run_task(title, task["body"], task["task_type"], state)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            task["file"].rename(COMPLETED_DIR / f"{timestamp}_{task['file'].stem}.done")
            processed += 1
            time.sleep(2)
        except Exception as e:
            logger.exception(f"Error processing file task: {e}")

    # 2. Gmail IMAP (primary email method)
    if GMAIL_APP_PASSWORD:
        for gmail_task in poll_gmail(state):
            try:
                title = clean_subject(gmail_task["subject"])
                body = gmail_task["body"]
                task_type = parse_task_type(gmail_task["subject"])
                run_task(title, body, task_type, state)
                state["processed_ids"].append(gmail_task["message_id"])
                save_state(state)
                processed += 1
                time.sleep(2)
            except Exception as e:
                logger.exception(f"Error processing Gmail task: {e}")

    # 3. Resend inbound (fallback)
    try:
        for email_data in reversed(fetch_inbound_emails(limit=20)):
            eid = email_data.get("id", "")
            if eid in state.get("processed_ids", []):
                continue
            sender = email_data.get("from", "")
            recipients = email_data.get("to", [])
            match = re.search(r'<([^>]+)>', sender)
            sender_addr = match.group(1).lower() if match else sender.lower().strip()
            if sender_addr not in ALLOWED_SENDERS:
                state["processed_ids"].append(eid)
                save_state(state)
                continue
            if not any("ai@palmcareai.com" in r.lower() for r in recipients):
                continue
            detail = get_email_detail(eid)
            if not detail:
                continue
            subject = detail.get("subject", "(no subject)")
            text = detail.get("text", "") or ""
            if not text:
                html = detail.get("html", "")
                text = re.sub(r'<[^>]+>', ' ', html)
                text = re.sub(r'\s+', ' ', text).strip()
            title = clean_subject(subject)
            run_task(title, text, parse_task_type(subject), state)
            state["processed_ids"].append(eid)
            save_state(state)
            processed += 1
            time.sleep(2)
    except Exception:
        pass

    state["last_poll"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    return processed


def run_daemon():
    logger.info("=" * 60)
    logger.info("PalmCare AI Task Daemon starting")
    logger.info(f"  Project:    {PROJECT_ROOT}")
    logger.info(f"  Tasks dir:  {TASKS_DIR}")
    logger.info(f"  Gmail:      {'ENABLED' if GMAIL_APP_PASSWORD else 'DISABLED (set GMAIL_APP_PASSWORD)'}")
    logger.info(f"  Resend:     {'ENABLED' if os.getenv('RESEND_API_KEY') else 'DISABLED'}")
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
    load_dotenv(PROJECT_ROOT / ".env")

    if "--once" in sys.argv:
        logger.info("Running single poll cycle...")
        state = load_state()
        count = poll_cycle(state)
        logger.info(f"Processed {count} task(s)")
    else:
        run_daemon()
