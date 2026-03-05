#!/usr/bin/env python3
"""
PalmCare AI Subagent Dashboard — Real-time monitoring UI.

Runs on http://localhost:5050
Shows: subagent status, task history, daemon health, live logs.
"""

import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, Response

DAEMON_HOME = Path.home() / ".palmcare"
STATE_FILE = DAEMON_HOME / "state.json"
COMPLETED_DIR = DAEMON_HOME / "completed"
TASKS_DIR = DAEMON_HOME / "tasks"
LOG_FILE = Path.home() / "Library" / "Logs" / "palmcare-ai-tasks.log"
PROJECT_ROOT = Path(__file__).resolve().parent.parent

app = Flask(__name__)

SUBAGENTS = {
    "marketing": {
        "name": "Marketing Agent",
        "icon": "M",
        "color": "#0d9488",
        "tags": ["[MARKETING]", "[CONTENT]", "[BRAND]"],
        "desc": "Email campaigns, content, branding",
    },
    "sales": {
        "name": "Sales Agent",
        "icon": "S",
        "color": "#6366f1",
        "tags": ["[SALES]", "[LEADS]", "[CRM]"],
        "desc": "Lead management, outreach, follow-ups",
    },
    "outreach": {
        "name": "Outreach Agent",
        "icon": "O",
        "color": "#f59e0b",
        "tags": ["[OUTREACH]", "[EMAIL]", "[CAMPAIGN]"],
        "desc": "Cold emails, sequences, bulk sends",
    },
    "report": {
        "name": "Reporting Agent",
        "icon": "R",
        "color": "#ec4899",
        "tags": ["[REPORT]", "[ANALYTICS]", "[DASHBOARD]"],
        "desc": "Analytics, dashboards, status reports",
    },
    "code": {
        "name": "General Agent",
        "icon": "G",
        "color": "#6b7280",
        "tags": [],
        "desc": "Code changes, questions, misc tasks",
    },
}


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {}


def get_daemon_status() -> dict:
    try:
        result = subprocess.run(
            ["launchctl", "list"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if "palmcare" in line:
                parts = line.split()
                pid = parts[0] if parts[0] != "-" else None
                exit_code = parts[1] if len(parts) > 1 else None
                return {
                    "running": pid is not None and pid != "-",
                    "pid": pid,
                    "exit_code": exit_code,
                }
    except Exception:
        pass
    return {"running": False, "pid": None, "exit_code": None}


def get_completed_tasks() -> list:
    tasks = []
    if not COMPLETED_DIR.exists():
        return tasks

    result_files = sorted(COMPLETED_DIR.glob("*.result.json"), reverse=True)[:50]
    for rf in result_files:
        try:
            result_data = json.loads(rf.read_text())
            ts_match = re.match(r"(\d{8}_\d{6})", rf.stem)
            timestamp = result_data.get("timestamp")
            if not timestamp and ts_match:
                timestamp = datetime.strptime(ts_match.group(1), "%Y%m%d_%H%M%S").isoformat()

            tasks.append({
                "file": rf.name,
                "title": result_data.get("title", rf.stem),
                "body": result_data.get("body", "")[:300],
                "timestamp": timestamp,
                "agent": result_data.get("agent", detect_agent_from_title(result_data.get("title", ""))),
                "status": result_data.get("status", "completed"),
                "summary": result_data.get("summary", ""),
                "notes": result_data.get("notes", ""),
                "questions": result_data.get("questions", []),
                "files_changed": result_data.get("files_changed", []),
                "commit": result_data.get("commit"),
                "duration": result_data.get("duration"),
            })
        except Exception:
            pass

    done_files = sorted(COMPLETED_DIR.glob("*.done"), reverse=True)[:50]
    seen_timestamps = {t.get("timestamp", "") for t in tasks}
    for f in done_files:
        try:
            content = f.read_text(encoding="utf-8", errors="replace").strip()
            lines = content.split("\n", 1)
            title = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else ""

            ts_match = re.match(r"(\d{8}_\d{6})", f.stem)
            timestamp = None
            if ts_match:
                timestamp = datetime.strptime(ts_match.group(1), "%Y%m%d_%H%M%S").isoformat()

            if timestamp in seen_timestamps:
                continue

            tasks.append({
                "file": f.name,
                "title": title,
                "body": body[:300],
                "timestamp": timestamp,
                "agent": detect_agent_from_title(title),
                "status": "completed",
                "summary": "",
                "notes": "",
                "questions": [],
                "files_changed": [],
                "commit": None,
                "duration": None,
            })
        except Exception:
            pass

    tasks.sort(key=lambda t: t.get("timestamp") or "", reverse=True)
    return tasks[:50]


def detect_agent_from_title(title: str) -> str:
    upper = title.upper()
    for agent_id, agent in SUBAGENTS.items():
        for tag in agent["tags"]:
            if tag in upper:
                return agent_id
    keywords = {
        "marketing": ["marketing", "brand", "content", "campaign design"],
        "sales": ["lead", "crm", "pipeline", "agency", "investor"],
        "outreach": ["send email", "outreach", "cold email", "email blast"],
        "report": ["report", "analytics", "dashboard", "metrics", "stats"],
    }
    lower = title.lower()
    for agent_id, kws in keywords.items():
        if any(kw in lower for kw in kws):
            return agent_id
    return "code"


def get_recent_logs(lines: int = 100) -> list:
    try:
        content = LOG_FILE.read_text(encoding="utf-8", errors="replace")
        all_lines = content.strip().split("\n")
        seen = set()
        deduped = []
        for line in all_lines:
            if line not in seen:
                seen.add(line)
                deduped.append(line)
        return deduped[-lines:]
    except Exception:
        return []


def get_pending_tasks() -> list:
    tasks = []
    if not TASKS_DIR.exists():
        return tasks
    for f in sorted(TASKS_DIR.glob("*.task")):
        try:
            content = f.read_text(encoding="utf-8", errors="replace").strip()
            lines = content.split("\n", 1)
            tasks.append({"file": f.name, "title": lines[0].strip()})
        except Exception:
            pass
    return tasks


# --- API Endpoints ---

@app.route("/api/status")
def api_status():
    state = load_state()
    daemon = get_daemon_status()
    return jsonify({
        "daemon": daemon,
        "last_poll": state.get("last_poll"),
        "tasks_completed": state.get("tasks_completed", 0),
        "tasks_failed": state.get("tasks_failed", 0),
        "processed_count": len(state.get("processed_ids", [])),
        "server_time": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/agents")
def api_agents():
    completed = get_completed_tasks()
    agent_stats = {}
    for agent_id in SUBAGENTS:
        count = sum(1 for t in completed if t["agent"] == agent_id)
        last_task = next((t for t in completed if t["agent"] == agent_id), None)
        agent_stats[agent_id] = {
            **SUBAGENTS[agent_id],
            "tasks_handled": count,
            "last_task": last_task,
        }
    return jsonify(agent_stats)


@app.route("/api/tasks")
def api_tasks():
    return jsonify({
        "completed": get_completed_tasks(),
        "pending": get_pending_tasks(),
    })


@app.route("/api/logs")
def api_logs():
    return jsonify({"lines": get_recent_logs(200)})


@app.route("/")
def index():
    return DASHBOARD_HTML


# --- Dashboard HTML ---

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PalmCare AI — Subagent Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f1117;--card:#1a1d27;--border:#2a2d3a;--text:#e4e4e7;--muted:#71717a;--teal:#0d9488;--teal-dim:#0d948833}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.header{background:linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#0d9488 100%);padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:700;color:#fff}
.header .subtitle{font-size:12px;color:rgba(255,255,255,.7);margin-top:2px}
.status-badge{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.2);padding:8px 16px;border-radius:20px}
.status-dot{width:8px;height:8px;border-radius:50%;animation:pulse 2s infinite}
.status-dot.online{background:#34d399}
.status-dot.offline{background:#ef4444;animation:none}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.status-text{font-size:13px;color:#fff;font-weight:500}
.grid{display:grid;gap:20px;padding:24px 32px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.stat-card .label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.stat-card .value{font-size:28px;font-weight:700;margin-top:4px}
.stat-card .sub{font-size:11px;color:var(--muted);margin-top:4px}
.agents-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.agent-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;transition:border-color .2s,transform .2s}
.agent-card:hover{border-color:var(--teal);transform:translateY(-2px)}
.agent-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.agent-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
.agent-name{font-size:15px;font-weight:600}
.agent-desc{font-size:12px;color:var(--muted)}
.agent-stats{display:flex;gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
.agent-stat{text-align:center;flex:1}
.agent-stat .num{font-size:18px;font-weight:700}
.agent-stat .lbl{font-size:10px;color:var(--muted);text-transform:uppercase}
.agent-tags{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.tag{font-size:10px;padding:3px 8px;border-radius:6px;background:var(--teal-dim);color:var(--teal);font-weight:600}
.section-title{font-size:16px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title .dot{width:6px;height:6px;border-radius:50%;background:var(--teal)}
.tasks-table{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.tasks-table table{width:100%;border-collapse:collapse}
.tasks-table th{text-align:left;padding:12px 16px;font-size:11px;text-transform:uppercase;color:var(--muted);background:rgba(0,0,0,.2);letter-spacing:.5px}
.tasks-table td{padding:12px 16px;font-size:13px;border-top:1px solid var(--border)}
.tasks-table tr:hover td{background:rgba(13,148,136,.05)}
.status-pill{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600}
.status-pill.completed{background:#05966933;color:#34d399}
.status-pill.failed{background:#ef444433;color:#f87171}
.status-pill.pending{background:#f59e0b33;color:#fbbf24}
.log-box{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;max-height:400px;overflow-y:auto;font-family:'SF Mono',Monaco,monospace;font-size:11px;line-height:1.7;color:var(--muted)}
.log-box .log-info{color:#60a5fa}
.log-box .log-error{color:#f87171}
.log-box .log-warn{color:#fbbf24}
.log-box .log-route{color:#a78bfa}
.log-box .log-task{color:#34d399}
.empty{text-align:center;padding:40px;color:var(--muted);font-size:14px}
.task-summary{font-size:12px;color:var(--muted);max-height:0;overflow:hidden;transition:max-height .3s;line-height:1.6;padding:0 16px}
.task-summary.open{max-height:300px;padding:8px 16px 12px}
.task-summary .sum-text{color:var(--text);font-size:13px}
.task-summary .sum-label{color:var(--teal);font-size:10px;text-transform:uppercase;font-weight:600;margin-top:6px;display:block}
.task-summary .sum-files{font-family:'SF Mono',Monaco,monospace;font-size:11px;color:#60a5fa}
.task-row{cursor:pointer}
.task-row:hover td{background:rgba(13,148,136,.08)}
.task-detail-row td{padding:0!important;border-top:none!important}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:900px){.stats-row{grid-template-columns:repeat(2,1fr)}.two-col{grid-template-columns:1fr}}
@media(max-width:600px){.stats-row{grid-template-columns:1fr}.grid{padding:16px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>PalmCare AI — Subagent Dashboard</h1>
    <div class="subtitle">Real-time monitoring &bull; ai@palmcareai.com</div>
  </div>
  <div class="status-badge">
    <div class="status-dot" id="statusDot"></div>
    <span class="status-text" id="statusText">Checking...</span>
  </div>
</div>

<div class="grid">
  <!-- Stats Row -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="label">Tasks Completed</div>
      <div class="value" id="tasksCompleted">—</div>
      <div class="sub" id="lastPoll">Last poll: —</div>
    </div>
    <div class="stat-card">
      <div class="label">Tasks Failed</div>
      <div class="value" id="tasksFailed">—</div>
      <div class="sub">Errors in execution</div>
    </div>
    <div class="stat-card">
      <div class="label">Emails Processed</div>
      <div class="value" id="emailsProcessed">—</div>
      <div class="sub">Inbound emails scanned</div>
    </div>
    <div class="stat-card">
      <div class="label">Daemon PID</div>
      <div class="value" id="daemonPid">—</div>
      <div class="sub" id="daemonUptime">—</div>
    </div>
  </div>

  <!-- Agents -->
  <div>
    <div class="section-title"><span class="dot"></span> Subagents</div>
    <div class="agents-grid" id="agentsGrid"></div>
  </div>

  <!-- Tasks + Logs -->
  <div class="two-col">
    <div>
      <div class="section-title"><span class="dot"></span> Recent Tasks</div>
      <div class="tasks-table" id="tasksTable">
        <div class="empty">Loading...</div>
      </div>
    </div>
    <div>
      <div class="section-title"><span class="dot"></span> Live Logs</div>
      <div class="log-box" id="logBox">Loading...</div>
    </div>
  </div>
</div>

<script>
const $ = s => document.querySelector(s);

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function fetchStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    const dot = $('#statusDot');
    const txt = $('#statusText');
    if (d.daemon.running) {
      dot.className = 'status-dot online';
      txt.textContent = 'Daemon Running';
    } else {
      dot.className = 'status-dot offline';
      txt.textContent = 'Daemon Offline';
    }
    $('#tasksCompleted').textContent = d.tasks_completed;
    $('#tasksFailed').textContent = d.tasks_failed;
    $('#emailsProcessed').textContent = d.processed_count;
    $('#daemonPid').textContent = d.daemon.pid || '—';
    $('#lastPoll').textContent = 'Last poll: ' + timeAgo(d.last_poll);
    $('#daemonUptime').textContent = d.daemon.running ? 'Active' : 'Exit code: ' + (d.daemon.exit_code || '?');
  } catch(e) { console.error(e); }
}

async function fetchAgents() {
  try {
    const r = await fetch('/api/agents');
    const agents = await r.json();
    let html = '';
    for (const [id, a] of Object.entries(agents)) {
      const tags = a.tags.map(t => `<span class="tag">${t}</span>`).join('');
      const lastTitle = a.last_task ? a.last_task.title.substring(0, 50) : 'No tasks yet';
      const lastTime = a.last_task ? timeAgo(a.last_task.timestamp) : '';
      html += `
        <div class="agent-card">
          <div class="agent-header">
            <div class="agent-icon" style="background:${a.color}">${a.icon}</div>
            <div>
              <div class="agent-name">${a.name}</div>
              <div class="agent-desc">${a.desc}</div>
            </div>
          </div>
          <div class="agent-stats">
            <div class="agent-stat"><div class="num">${a.tasks_handled}</div><div class="lbl">Tasks</div></div>
            <div class="agent-stat"><div class="num" style="font-size:12px;color:var(--muted)">${lastTitle}</div><div class="lbl">${lastTime || 'Last Task'}</div></div>
          </div>
          <div class="agent-tags">${tags}</div>
        </div>`;
    }
    $('#agentsGrid').innerHTML = html;
  } catch(e) { console.error(e); }
}

async function fetchTasks() {
  try {
    const r = await fetch('/api/tasks');
    const d = await r.json();
    const all = [...d.pending.map(t => ({...t, status: 'pending'})), ...d.completed];
    if (!all.length) {
      $('#tasksTable').innerHTML = '<div class="empty">No tasks yet. Send an email to ai@palmcareai.com</div>';
      return;
    }
    let rows = all.slice(0, 25).map((t, i) => {
      const status = t.status || 'completed';
      const agent = t.agent || '—';
      const dur = t.duration ? t.duration + 's' : '—';
      const hasSummary = t.summary || t.notes || (t.files_changed && t.files_changed.length);
      let detail = '';
      if (hasSummary) {
        let inner = '';
        if (t.summary) inner += `<span class="sum-label">Summary</span><span class="sum-text">${esc(t.summary)}</span>`;
        if (t.notes) inner += `<span class="sum-label">Notes</span><span class="sum-text">${esc(t.notes).substring(0,500)}</span>`;
        if (t.files_changed && t.files_changed.length) inner += `<span class="sum-label">Files Changed</span><span class="sum-files">${t.files_changed.map(esc).join('<br>')}</span>`;
        if (t.commit) inner += `<span class="sum-label">Commit</span><span class="sum-files">${esc(t.commit)}</span>`;
        if (t.questions && t.questions.length) inner += `<span class="sum-label">Questions</span><span class="sum-text">${t.questions.map(esc).join('<br>')}</span>`;
        detail = `<tr class="task-detail-row"><td colspan="5"><div class="task-summary" id="detail-${i}">${inner}</div></td></tr>`;
      }
      return `<tr class="task-row" onclick="toggleDetail(${i})">
        <td>${esc(t.title?.substring(0,50) || t.file)}</td>
        <td><span class="status-pill ${status}">${status}</span></td>
        <td>${esc(agent)}</td>
        <td>${dur}</td>
        <td>${timeAgo(t.timestamp)}</td>
      </tr>${detail}`;
    }).join('');
    $('#tasksTable').innerHTML = `<table><thead><tr><th>Task</th><th>Status</th><th>Agent</th><th>Duration</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch(e) { console.error(e); }
}

function toggleDetail(i) {
  const el = document.getElementById('detail-' + i);
  if (el) el.classList.toggle('open');
}

function colorLog(line) {
  if (line.includes('[ERROR]')) return '<span class="log-error">' + esc(line) + '</span>';
  if (line.includes('[WARNING]')) return '<span class="log-warn">' + esc(line) + '</span>';
  if (line.includes('Routing to subagent')) return '<span class="log-route">' + esc(line) + '</span>';
  if (line.includes('Task complete') || line.includes('Reply sent')) return '<span class="log-task">' + esc(line) + '</span>';
  if (line.includes('[INFO]')) return '<span class="log-info">' + esc(line) + '</span>';
  return esc(line);
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function fetchLogs() {
  try {
    const r = await fetch('/api/logs');
    const d = await r.json();
    const box = $('#logBox');
    box.innerHTML = d.lines.map(colorLog).join('<br>');
    box.scrollTop = box.scrollHeight;
  } catch(e) { console.error(e); }
}

async function refresh() {
  await Promise.all([fetchStatus(), fetchAgents(), fetchTasks(), fetchLogs()]);
}

refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>"""


if __name__ == "__main__":
    print("=" * 50)
    print("PalmCare AI Subagent Dashboard")
    print(f"  URL: http://localhost:5050")
    print(f"  State: {STATE_FILE}")
    print(f"  Logs:  {LOG_FILE}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5050, debug=False)
