"""
PalmCare AI Agent — Claude-powered assistant for the entire platform.

Two modes:
  - Admin/CEO: outreach tools (emails, calls, investors, team assignments)
  - Normal user: workspace tools (clients, assessments, billing, contracts, notes, scheduling)
  - Shared: search, reports, settings

Split out of a single 1,710-line agent.py:
  - prompts.py       model id + system/role prompts
  - tool_schemas.py  Claude tool (function-calling) definitions
  - tools.py         _tool_* implementations, _execute_tool dispatcher, file-token store
  - routes.py        request/response schemas + /chat, /download, /tts endpoints

`router` is re-exported so `from app.routers.agent import router` keeps working.
"""

from .routes import router  # noqa: F401
