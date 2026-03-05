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

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DAEMON_HOME = Path.home() / ".palmcare"
TASKS_DIR = DAEMON_HOME / "tasks"
COMPLETED_DIR = DAEMON_HOME / "completed"
STATE_FILE = DAEMON_HOME / "state.json"
LOG_DIR = Path.home() / "Library" / "Logs"
LOG_FILE = LOG_DIR / "palmcare-ai-tasks.log"

POLL_INTERVAL = 30
RESEND_BASE = "https://api.resend.com"
CF_WORKER_URL = "https://palmcare-email-receiver.museibrahim.workers.dev"
CF_WORKER_SECRET = "palmcare-ai-daemon-2026"

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


def run_task(task_title: str, task_body: str, task_type: str, state: dict) -> dict:
    """Execute a task, routing to the appropriate subagent."""
    start_time = time.time()

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


def _read_file_content_for_email(file_path: str, max_chars: int = 8000) -> str:
    """Read file content for inclusion in email report. Returns HTML-escaped content."""
    import html as html_mod
    try:
        full_path = PROJECT_ROOT / file_path
        if not full_path.exists():
            return ""
        text = full_path.read_text(encoding="utf-8", errors="replace")
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n... (truncated — full file saved in repo)"
        return html_mod.escape(text)
    except Exception:
        return ""


def build_report_html(task_title, result, apply_result, commit_hash, duration_seconds):
    import html as html_mod
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

    agent_id = detect_subagent(task_title, "")
    agent_name = SUBAGENTS.get(agent_id, {}).get("name", "General Agent")
    agent_color = SUBAGENTS.get(agent_id, {}).get("color", "#6b7280")

    sections = []

    if apply_result and apply_result.get("applied_files"):
        items = "".join(f'<li style="padding:4px 0;color:#374151;">{html_mod.escape(f)}</li>' for f in apply_result["applied_files"])
        sections.append(f'<div style="margin:20px 0;"><h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Files Changed</h3><ul style="margin:0;padding-left:20px;font-family:monospace;font-size:13px;">{items}</ul></div>')

    file_contents_for_email = result.get("files_changed", [])
    if file_contents_for_email:
        for fc in file_contents_for_email:
            fpath = fc.get("path", "")
            action = fc.get("action", "modify")
            content = fc.get("content", "")
            if not content:
                content = _read_file_content_for_email(fpath)
            else:
                import html as html_mod2
                content = html_mod2.escape(content)
                if len(content) > 8000:
                    content = content[:8000] + "\n\n... (truncated)"

            if content:
                ext = Path(fpath).suffix.lower()
                is_code = ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".toml", ".yaml", ".yml", ".sh", ".css", ".html", ".sql", ".swift")
                font = "font-family:'SF Mono',Monaco,'Courier New',monospace;font-size:12px;" if is_code else "font-family:'Segoe UI',Arial,sans-serif;font-size:13px;"
                sections.append(
                    f'<div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">'
                    f'<div style="background:#1f2937;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">'
                    f'<span style="color:#e5e7eb;font-family:monospace;font-size:13px;font-weight:600;">{html_mod.escape(fpath)}</span>'
                    f'<span style="color:#9ca3af;font-size:11px;">{action}</span></div>'
                    f'<div style="background:#f9fafb;padding:16px;max-height:600px;overflow-y:auto;{font}line-height:1.6;white-space:pre-wrap;word-wrap:break-word;color:#374151;">{content}</div>'
                    f'</div>'
                )

    if apply_result and apply_result.get("ran_commands"):
        items = "".join(f'<li style="padding:4px 0;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">{html_mod.escape(c["command"])}</code> (exit {c["exit_code"]})</li>' for c in apply_result["ran_commands"])
        sections.append(f'<div style="margin:20px 0;"><h3 style="color:#1f2937;font-size:16px;margin:0 0 8px 0;">Commands Run</h3><ul style="margin:0;padding-left:20px;font-size:13px;">{items}</ul></div>')

    if commit_hash:
        sections.append(f'<div style="margin:16px 0;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;"><span style="color:#166534;font-size:14px;">Committed: <code style="background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:bold;">{html_mod.escape(commit_hash)}</code></span></div>')

    if questions:
        items = "".join(f'<li style="padding:4px 0;color:#92400e;">{html_mod.escape(q)}</li>' for q in questions)
        sections.append(f'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;"><h3 style="color:#92400e;font-size:16px;margin:0 0 8px 0;">Questions for You</h3><ul style="margin:0;padding-left:20px;font-size:14px;">{items}</ul><p style="color:#92400e;font-size:13px;margin:12px 0 0 0;">Reply to ai@palmcareai.com to answer.</p></div>')

    if apply_result and apply_result.get("errors"):
        items = "".join(f'<li style="padding:4px 0;color:#dc2626;">{html_mod.escape(e)}</li>' for e in apply_result["errors"])
        sections.append(f'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;"><h3 style="color:#991b1b;font-size:16px;margin:0 0 8px 0;">Errors</h3><ul style="margin:0;padding-left:20px;font-size:13px;">{items}</ul></div>')

    if notes:
        sections.append(f'<div style="margin:20px 0;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;"><h3 style="color:#6b7280;font-size:14px;margin:0 0 6px 0;">Notes</h3><p style="color:#4b5563;font-size:14px;margin:0;line-height:1.5;">{html_mod.escape(notes)}</p></div>')

    sections_html = "\n".join(sections)

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);padding:30px 24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">PalmCare AI Agent</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0 0;font-size:13px;">Task Execution Report</p>
        </div>
        <div style="padding:24px;">
            <div style="display:flex;align-items:center;margin-bottom:20px;gap:10px;flex-wrap:wrap;">
                <span style="background:{bg};color:{color};border:1px solid {border};padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;text-transform:uppercase;">{status_label}</span>
                <span style="background:{agent_color}22;color:{agent_color};padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">{html_mod.escape(agent_name)}</span>
                <span style="color:#9ca3af;font-size:13px;">{duration_seconds:.1f}s</span>
            </div>
            <h2 style="color:#1f2937;font-size:18px;margin:0 0 12px 0;">{html_mod.escape(task_title)}</h2>
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0d9488;">
                <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">{html_mod.escape(summary)}</p>
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

    # 1. File-based task queue (local)
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
    load_dotenv(PROJECT_ROOT / ".env")

    if "--once" in sys.argv:
        logger.info("Running single poll cycle...")
        state = load_state()
        count = poll_cycle(state)
        logger.info(f"Processed {count} task(s)")
    else:
        run_daemon()
