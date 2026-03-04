#!/usr/bin/env python3
"""
AI Task Daemon — Watches for tasks and executes them using Claude.

Supports two input methods:
  1. File-based: Drop .task files into ~/.palmcare/tasks/
  2. Resend inbound: Email ai@palmcareai.com (when Cloudflare routing is set up)

Results are emailed back via Resend and logged locally.

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

POLL_INTERVAL = 30  # seconds — check for file tasks more frequently
RESEND_BASE = "https://api.resend.com"

ALLOWED_SENDERS = {
    "support@palmtai.com",
    "museibrahim@palmtai.com",
    "museibrahim@gmail.com",
}

TARGET_RECIPIENT = "ai@palmcareai.com"
REPLY_TO = "museibrahim@palmtai.com"
FROM_ADDRESS = "PalmCare AI Agent <onboarding@resend.dev>"

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
            return []
        return resp.json().get("data", [])
    except requests.RequestException:
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
            return None
        except requests.RequestException:
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
    if not email_from:
        return False
    match = re.search(r'<([^>]+)>', email_from)
    addr = match.group(1).lower() if match else email_from.lower().strip()
    return addr in ALLOWED_SENDERS


def is_targeted_to_ai(email_to: list) -> bool:
    if not email_to:
        return False
    for addr in email_to:
        if TARGET_RECIPIENT in addr.lower():
            return True
    return False


def parse_task_type(subject: str) -> str:
    subject_upper = subject.upper()
    if "[QUESTION]" in subject_upper:
        return "question"
    if "[STATUS]" in subject_upper:
        return "status"
    return "code"


def clean_subject(subject: str) -> str:
    cleaned = re.sub(r'\[(URGENT|QUESTION|STATUS)\]', '', subject, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_text_body(email: dict) -> str:
    text = email.get("text", "")
    if text and text.strip():
        return text.strip()
    html = email.get("html", "")
    if html:
        text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    return "(no body)"


# ---------------------------------------------------------------------------
# File-based task queue
# ---------------------------------------------------------------------------


def check_file_tasks() -> list[dict]:
    """Check ~/.palmcare/tasks/ for new .task files."""
    tasks = []
    for task_file in sorted(TASKS_DIR.glob("*.task")):
        try:
            content = task_file.read_text(encoding="utf-8").strip()
            if not content:
                continue

            lines = content.split("\n", 1)
            title = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else ""

            tasks.append({
                "file": task_file,
                "title": title,
                "body": body,
                "task_type": parse_task_type(title),
            })
        except Exception as e:
            logger.error(f"Error reading task file {task_file}: {e}")
    return tasks


def process_file_task(task: dict, state: dict) -> bool:
    """Process a file-based task."""
    task_file = task["file"]
    task_title = clean_subject(task["title"])
    task_body = task["body"]
    task_type = task["task_type"]

    logger.info(f"Processing file task: {task_title} ({task_file.name})")

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

    # Move task file to completed/
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    completed_name = f"{timestamp}_{task_file.stem}.done"
    task_file.rename(COMPLETED_DIR / completed_name)

    # Save result alongside
    result_file = COMPLETED_DIR / f"{timestamp}_{task_file.stem}.result.json"
    result_file.write_text(json.dumps({
        "title": task_title,
        "status": result.get("status"),
        "summary": result.get("summary"),
        "commit": commit_hash,
        "duration": duration,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }, indent=2))

    if result.get("status") == "completed":
        state["tasks_completed"] = state.get("tasks_completed", 0) + 1
    else:
        state["tasks_failed"] = state.get("tasks_failed", 0) + 1
    save_state(state)

    logger.info(f"File task complete: {result.get('status')} in {duration:.1f}s")
    return True


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
                Drop a new .task file to answer, and I'll continue.
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
                Drop .task files in ~/.palmcare/tasks/ to send more tasks.
            </p>
        </div>
    </div>
    """


# ---------------------------------------------------------------------------
# Email processing (Resend inbound — used when Cloudflare routing is set up)
# ---------------------------------------------------------------------------


def process_email(email: dict, state: dict) -> bool:
    email_id = email.get("id", "")
    sender = email.get("from", "")
    recipients = email.get("to", [])
    subject = email.get("subject", "(no subject)")

    if email_id in state.get("processed_ids", []):
        return False

    if not is_valid_sender(sender):
        state["processed_ids"].append(email_id)
        save_state(state)
        return False

    if not is_targeted_to_ai(recipients):
        return False

    logger.info(f"Processing email task: {subject} (from {sender})")

    detail = get_email_detail(email_id)
    if not detail:
        logger.error(f"Could not fetch email detail for {email_id}")
        return False

    task_type = parse_task_type(subject)
    task_title = clean_subject(subject)
    task_body = extract_text_body(detail)

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

    state["processed_ids"].append(email_id)
    if result.get("status") == "completed":
        state["tasks_completed"] = state.get("tasks_completed", 0) + 1
    else:
        state["tasks_failed"] = state.get("tasks_failed", 0) + 1
    save_state(state)

    logger.info(f"Email task complete: {result.get('status')} in {duration:.1f}s")
    return True


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------


def poll_cycle(state: dict) -> int:
    """Run one poll cycle. Checks file tasks first, then Resend inbound."""
    processed = 0

    # 1. Check file-based task queue (primary method)
    file_tasks = check_file_tasks()
    for task in file_tasks:
        try:
            if process_file_task(task, state):
                processed += 1
                time.sleep(2)
        except Exception as e:
            logger.exception(f"Error processing file task: {e}")

    # 2. Check Resend inbound emails (secondary method)
    try:
        emails = fetch_inbound_emails(limit=20)
        for email in reversed(emails):
            email_id = email.get("id", "")
            if email_id in state.get("processed_ids", []):
                continue
            if process_email(email, state):
                processed += 1
                time.sleep(2)
    except Exception:
        pass  # Resend polling is best-effort

    state["last_poll"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    return processed


def run_daemon():
    """Main daemon loop."""
    logger.info("=" * 60)
    logger.info("PalmCare AI Task Daemon starting")
    logger.info(f"  Project:    {PROJECT_ROOT}")
    logger.info(f"  Tasks dir:  {TASKS_DIR}")
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
