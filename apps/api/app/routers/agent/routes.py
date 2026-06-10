import os
import json
import logging
import time as _time
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.rate_limit import limiter
from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole

from .prompts import AGENT_MODEL, SYSTEM_PROMPT, ADMIN_ROLE_CONTEXT, USER_ROLE_CONTEXT
from .tool_schemas import SHARED_TOOLS, ADMIN_TOOLS
from .tools import _execute_tool, _GENERATED_FILES, _today_eastern

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_TTS_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
ALLOWED_AGENT_ROLES = {"user", "assistant"}


class AgentMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_AGENT_ROLES:
            raise ValueError("role must be 'user' or 'assistant'")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 50_000:
            raise ValueError("message too long (max 50000 chars)")
        return v


class AgentChatRequest(BaseModel):
    message: str
    history: List[AgentMessage] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("message cannot be empty")
        if len(v) > 10_000:
            raise ValueError("message too long (max 10000 chars)")
        return v

    @field_validator("history")
    @classmethod
    def validate_history(cls, v: List) -> List:
        if len(v) > 40:
            return v[-40:]
        return v


class AgentChatResponse(BaseModel):
    response: str
    tool_calls: List[dict] = []
    files: List[dict] = []


@router.post("/chat", response_model=AgentChatResponse)
@limiter.limit("30/minute")
async def agent_chat(
    request: Request,
    body: AgentChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Chat with the Palm AI agent. Available to all authenticated users.
    Admin users get outreach tools; normal users get workspace tools."""
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI agent is not configured")

    client = anthropic.Anthropic(api_key=api_key)
    today = _today_eastern()
    user_role = getattr(user, 'role', '')
    is_admin = user_role in ('admin', 'admin_team', UserRole.admin)

    tools = list(SHARED_TOOLS)
    role_context = USER_ROLE_CONTEXT
    if is_admin:
        tools.extend(ADMIN_TOOLS)
        role_context = ADMIN_ROLE_CONTEXT

    system = SYSTEM_PROMPT.format(
        today=today.strftime("%A, %B %d, %Y"),
        user_name=user.full_name or "User",
        user_email=user.email,
        user_role="Admin / CEO" if is_admin else "Team Member",
        role_context=role_context,
    )

    messages = []
    for msg in body.history[-20:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    tool_calls_log = []

    for _ in range(6):
        response = client.messages.create(
            model=AGENT_MODEL,
            max_tokens=4096,
            system=system,
            tools=tools,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})
                    logger.info(f"Agent tool: {block.name}({json.dumps(block.input, default=str)[:200]})")
                    result_str = _execute_tool(block.name, block.input, db, user)
                    tool_calls_log.append({"tool": block.name, "input": block.input, "result": json.loads(result_str)})
                    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result_str})
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})
            continue

        text_parts = [b.text for b in response.content if b.type == "text"]
        files = [{"url": tc["result"]["download_url"], "filename": tc["result"]["filename"], "format": tc["result"].get("format", "")}
                 for tc in tool_calls_log if tc.get("result", {}).get("download_url")]
        return AgentChatResponse(response="\n".join(text_parts), tool_calls=tool_calls_log, files=files)

    text_parts = [b.text for b in response.content if b.type == "text"]
    files = [{"url": tc["result"]["download_url"], "filename": tc["result"]["filename"], "format": tc["result"].get("format", "")}
             for tc in tool_calls_log if tc.get("result", {}).get("download_url")]
    return AgentChatResponse(response="\n".join(text_parts) or "Done.", tool_calls=tool_calls_log, files=files)


# ══════════════════════════════════════════════════════════════════════
#  FILE DOWNLOAD ENDPOINT
# ══════════════════════════════════════════════════════════════════════

@router.get("/download/{token}")
async def download_file(token: str, user: User = Depends(get_current_user)):
    """Download a file generated by the agent (user-scoped)."""
    from fastapi.responses import StreamingResponse
    info = _GENERATED_FILES.get(token)
    if not info:
        raise HTTPException(status_code=404, detail="File not found or expired")
    if info.get("user_id") and info["user_id"] != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        with open(info["path"], "rb") as f:
            content = f.read()
        del _GENERATED_FILES[token]
        try:
            os.remove(info["path"])
        except OSError:
            pass
        return StreamingResponse(
            iter([content]),
            media_type=info["content_type"],
            headers={"Content-Disposition": f'attachment; filename="{info["filename"]}"'},
        )
    except FileNotFoundError:
        _GENERATED_FILES.pop(token, None)
        raise HTTPException(status_code=404, detail="File expired")


# ══════════════════════════════════════════════════════════════════════
#  TEXT-TO-SPEECH ENDPOINT
# ══════════════════════════════════════════════════════════════════════

class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"

    @field_validator("voice")
    @classmethod
    def validate_voice(cls, v: str) -> str:
        if v not in ALLOWED_TTS_VOICES:
            raise ValueError(f"voice must be one of: {', '.join(sorted(ALLOWED_TTS_VOICES))}")
        return v

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if len(v) > 4096:
            raise ValueError("text too long (max 4096 chars)")
        return v


@router.post("/tts")
@limiter.limit("20/minute")
async def text_to_speech(request: Request, body: TTSRequest, user: User = Depends(get_current_user)):
    """Convert text to speech using OpenAI TTS. Returns MP3 audio."""
    from fastapi.responses import StreamingResponse
    import openai

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="TTS not configured")

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    oai = openai.OpenAI(api_key=api_key)
    response = oai.audio.speech.create(
        model="tts-1",
        voice=body.voice,
        input=text,
        response_format="mp3",
    )

    audio_bytes = response.content
    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="palm_speech.mp3"'},
    )
