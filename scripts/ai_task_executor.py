"""
AI Task Executor — Uses Claude API to execute coding tasks on the project.

Reads project files, generates code changes, applies them, and returns results.
Designed to be called by the AI Task Daemon (ai_task_daemon.py).
"""

import os
import re
import json
import glob
import subprocess
import logging
from pathlib import Path
from typing import Optional

import anthropic

logger = logging.getLogger("ai_task_executor")

PROJECT_ROOT = Path(__file__).resolve().parent.parent

IGNORE_DIRS = {
    "node_modules", ".next", ".git", "__pycache__", ".pytest_cache",
    "dist", "build", ".turbo", ".vercel", "venv", ".venv", "env",
    "videos/node_modules", "videos/.next", "videos/out",
}

IGNORE_EXTENSIONS = {
    ".pyc", ".pyo", ".so", ".dylib", ".o", ".a",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".mp3", ".mp4", ".wav", ".ogg", ".webm",
    ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz", ".bz2",
    ".lock", ".xcuserstate",
}

MAX_FILE_SIZE = 100_000  # 100KB per file
MAX_CONTEXT_FILES = 40
MAX_RESPONSE_TOKENS = 8192


def get_project_tree(max_depth: int = 3) -> str:
    """Generate a compact project tree for context."""
    lines = []

    def _walk(path: Path, prefix: str, depth: int):
        if depth > max_depth:
            return
        try:
            entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
        except PermissionError:
            return

        dirs = [e for e in entries if e.is_dir() and e.name not in IGNORE_DIRS and not e.name.startswith(".")]
        files = [e for e in entries if e.is_file() and e.suffix not in IGNORE_EXTENSIONS]

        for i, d in enumerate(dirs):
            connector = "└── " if (i == len(dirs) - 1 and not files) else "├── "
            lines.append(f"{prefix}{connector}{d.name}/")
            extension = "    " if connector.startswith("└") else "│   "
            _walk(d, prefix + extension, depth + 1)

        for i, f in enumerate(files[:20]):
            connector = "└── " if i == len(files[:20]) - 1 else "├── "
            lines.append(f"{prefix}{connector}{f.name}")
        if len(files) > 20:
            lines.append(f"{prefix}    ... and {len(files) - 20} more files")

    lines.append(f"{PROJECT_ROOT.name}/")
    _walk(PROJECT_ROOT, "", 0)
    return "\n".join(lines[:200])


def read_file_safe(filepath: str) -> Optional[str]:
    """Read a file, returning None if it's too large or binary."""
    path = Path(filepath)
    if not path.exists():
        return None
    if path.stat().st_size > MAX_FILE_SIZE:
        return f"[File too large: {path.stat().st_size:,} bytes]"
    if path.suffix in IGNORE_EXTENSIONS:
        return None
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def find_relevant_files(task_description: str) -> list[dict]:
    """Find files likely relevant to a task based on keywords."""
    keywords = set(re.findall(r'[a-zA-Z_]{3,}', task_description.lower()))
    scored_files = []

    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        rel_root = Path(root).relative_to(PROJECT_ROOT)

        for fname in files:
            fpath = Path(root) / fname
            if fpath.suffix in IGNORE_EXTENSIONS:
                continue
            if fpath.stat().st_size > MAX_FILE_SIZE:
                continue

            rel_path = str(rel_root / fname)
            name_lower = rel_path.lower()

            score = 0
            for kw in keywords:
                if kw in name_lower:
                    score += 3
            if any(p in name_lower for p in ["readme", "claude.md", "main.py", "main.ts", "index.ts"]):
                score += 1

            if score > 0:
                scored_files.append({"path": rel_path, "score": score})

    scored_files.sort(key=lambda x: -x["score"])
    return scored_files[:MAX_CONTEXT_FILES]


def build_system_prompt() -> str:
    """Build the system prompt with project context."""
    tree = get_project_tree()

    return f"""You are an AI coding assistant working on the PalmCare AI project.
You execute tasks by reading files, making changes, and running commands.

PROJECT ROOT: {PROJECT_ROOT}

PROJECT STRUCTURE:
{tree}

TECH STACK:
- Frontend: Next.js (apps/web), SwiftUI iOS (ios-app)
- Backend: FastAPI (apps/api), Celery worker (apps/worker)
- Database: PostgreSQL with Alembic migrations
- Email: Resend
- AI: Anthropic Claude, Deepgram, OpenAI (fallback)

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact structure:
{{
  "summary": "Brief description of what you did",
  "status": "completed" | "failed" | "needs_clarification",
  "files_changed": [
    {{
      "path": "relative/path/to/file",
      "action": "create" | "modify" | "delete",
      "content": "full file content (for create/modify)",
      "description": "what changed in this file"
    }}
  ],
  "commands": [
    {{
      "command": "shell command to run",
      "description": "why this command is needed"
    }}
  ],
  "questions": ["any questions for the user if status is needs_clarification"],
  "notes": "any additional context or warnings"
}}

RULES:
- Always provide the FULL file content for modified files, not just diffs
- Use relative paths from the project root
- Only modify files that need changing
- If the task is unclear, set status to "needs_clarification" and ask questions
- For questions-only tasks (no code changes), set files_changed to [] and commands to []
- Never modify .env files or files containing secrets
- Always preserve existing code style and conventions
- If you need to read a file first, mention it in notes and I'll provide it in a follow-up"""


def execute_task(
    task_title: str,
    task_body: str,
    extra_context: Optional[str] = None,
    task_type: str = "code",
) -> dict:
    """
    Execute a task using Claude API.

    Args:
        task_title: The task title (from email subject)
        task_body: The task description (from email body)
        extra_context: Additional file contents or context
        task_type: "code" for code changes, "question" for Q&A, "status" for status check

    Returns:
        dict with keys: summary, status, files_changed, commands, questions, notes
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "summary": "Cannot execute: ANTHROPIC_API_KEY not set",
            "status": "failed",
            "files_changed": [],
            "commands": [],
            "questions": [],
            "notes": "Set ANTHROPIC_API_KEY in .env",
        }

    client = anthropic.Anthropic(api_key=api_key)

    relevant_files = find_relevant_files(f"{task_title} {task_body}")
    file_contents = []
    for f in relevant_files[:15]:
        content = read_file_safe(str(PROJECT_ROOT / f["path"]))
        if content and not content.startswith("[File too large"):
            file_contents.append(f"--- {f['path']} ---\n{content}")

    user_message = f"TASK: {task_title}\n\n{task_body}"

    if extra_context:
        user_message += f"\n\nADDITIONAL CONTEXT:\n{extra_context}"

    if file_contents:
        user_message += "\n\nRELEVANT FILES:\n" + "\n\n".join(file_contents[:10])

    if task_type == "question":
        user_message += "\n\nThis is a QUESTION — do not make code changes. Just answer the question in the summary field."
    elif task_type == "status":
        git_status = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True, text=True, cwd=PROJECT_ROOT,
        ).stdout
        git_log = subprocess.run(
            ["git", "log", "--oneline", "-10"],
            capture_output=True, text=True, cwd=PROJECT_ROOT,
        ).stdout
        user_message += f"\n\nGIT STATUS:\n{git_status}\n\nRECENT COMMITS:\n{git_log}"
        user_message += "\n\nThis is a STATUS request — summarize the project state, don't make changes."

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=MAX_RESPONSE_TOKENS,
            system=build_system_prompt(),
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
                "files_changed": [],
                "commands": [],
                "questions": [],
                "notes": "Response was not in JSON format; raw text returned as summary.",
            }

        for key in ["summary", "status", "files_changed", "commands", "questions", "notes"]:
            if key not in result:
                result[key] = [] if key in ("files_changed", "commands", "questions") else ""

        return result

    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        return {
            "summary": f"Claude API error: {e}",
            "status": "failed",
            "files_changed": [],
            "commands": [],
            "questions": [],
            "notes": str(e),
        }
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        return {
            "summary": f"Response parsing error: {e}",
            "status": "failed",
            "files_changed": [],
            "commands": [],
            "questions": [],
            "notes": response_text[:1000] if 'response_text' in dir() else "",
        }


def apply_changes(result: dict) -> dict:
    """
    Apply file changes and run commands from a task result.

    Returns dict with applied_files, ran_commands, errors.
    """
    applied_files = []
    ran_commands = []
    errors = []

    for fc in result.get("files_changed", []):
        fpath = PROJECT_ROOT / fc["path"]
        action = fc.get("action", "modify")

        try:
            if action == "delete":
                if fpath.exists():
                    fpath.unlink()
                    applied_files.append(f"Deleted: {fc['path']}")
                else:
                    errors.append(f"Cannot delete (not found): {fc['path']}")
            elif action in ("create", "modify"):
                fpath.parent.mkdir(parents=True, exist_ok=True)
                fpath.write_text(fc.get("content", ""), encoding="utf-8")
                applied_files.append(f"{action.title()}d: {fc['path']}")
            else:
                errors.append(f"Unknown action '{action}' for {fc['path']}")
        except Exception as e:
            errors.append(f"Error with {fc['path']}: {e}")

    for cmd in result.get("commands", []):
        command = cmd.get("command", "")
        if not command:
            continue

        dangerous = ["rm -rf /", "rm -rf ~", "sudo", "curl | sh", "wget | sh"]
        if any(d in command for d in dangerous):
            errors.append(f"Blocked dangerous command: {command}")
            continue

        try:
            proc = subprocess.run(
                command, shell=True, capture_output=True, text=True,
                cwd=PROJECT_ROOT, timeout=120,
            )
            ran_commands.append({
                "command": command,
                "exit_code": proc.returncode,
                "stdout": proc.stdout[:500] if proc.stdout else "",
                "stderr": proc.stderr[:500] if proc.stderr else "",
            })
        except subprocess.TimeoutExpired:
            errors.append(f"Command timed out (120s): {command}")
        except Exception as e:
            errors.append(f"Command error: {command} — {e}")

    return {
        "applied_files": applied_files,
        "ran_commands": ran_commands,
        "errors": errors,
    }


def git_commit(message: str) -> Optional[str]:
    """Stage all changes and commit. Returns commit hash or None."""
    try:
        subprocess.run(
            ["git", "add", "-A"],
            capture_output=True, cwd=PROJECT_ROOT, check=True,
        )

        status = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, cwd=PROJECT_ROOT,
        )
        if not status.stdout.strip():
            return None

        result = subprocess.run(
            ["git", "commit", "-m", message],
            capture_output=True, text=True, cwd=PROJECT_ROOT,
        )
        if result.returncode == 0:
            hash_result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True, cwd=PROJECT_ROOT,
            )
            return hash_result.stdout.strip()
        else:
            logger.error(f"Git commit failed: {result.stderr}")
            return None
    except Exception as e:
        logger.error(f"Git error: {e}")
        return None


if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")

    if len(sys.argv) < 2:
        print("Usage: python ai_task_executor.py 'Task description'")
        sys.exit(1)

    task = " ".join(sys.argv[1:])
    print(f"Executing task: {task}")
    result = execute_task("CLI Task", task)
    print(json.dumps(result, indent=2))

    if result.get("files_changed"):
        confirm = input("\nApply changes? (y/n): ").strip().lower()
        if confirm == "y":
            apply_result = apply_changes(result)
            print(json.dumps(apply_result, indent=2))

            commit_msg = f"AI Task: {task[:80]}"
            commit_hash = git_commit(commit_msg)
            if commit_hash:
                print(f"\nCommitted: {commit_hash}")
