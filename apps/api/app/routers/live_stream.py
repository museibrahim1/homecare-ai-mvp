"""
WebSocket streaming transcription via Deepgram Flux.

Proxies audio from the mobile client to Deepgram's v2/listen WebSocket
and relays transcript events back in real-time.
"""

import asyncio
import json
import logging
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

DEEPGRAM_WS = "wss://api.deepgram.com/v2/listen"


async def verify_ws_token(token: Optional[str]) -> Optional[str]:
    """Verify JWT and return user id, or None if invalid."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub")
    except JWTError:
        return None


async def m4a_to_pcm(m4a_bytes: bytes) -> bytes:
    """Convert m4a audio to PCM s16le 16kHz mono using ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp_in:
        tmp_in.write(m4a_bytes)
        tmp_in_path = tmp_in.name

    try:
        process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-loglevel", "error",
            "-i", tmp_in_path,
            "-f", "s16le",
            "-ar", "16000",
            "-ac", "1",
            "-",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0 and stderr:
            logger.warning(f"ffmpeg conversion: {stderr.decode()[:200]}")
        return stdout or b""
    finally:
        if os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)


def _is_m4a(data: bytes) -> bool:
    """Heuristic: m4a/mp4 starts with ftyp at offset 4."""
    return len(data) >= 8 and data[4:8] in (b"ftyp", b"mdat")

@router.websocket("/stream")
async def websocket_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="JWT for auth"),
    encoding: str = Query("m4a", description="Audio encoding: m4a or linear16"),
):
    """
    WebSocket endpoint for live streaming transcription.

    Client sends binary audio chunks. Server relays to Deepgram Flux
    and streams back transcript events in real-time.

    Query params:
      - token: JWT (required)
      - encoding: "m4a" (default, converts to PCM) or "linear16" (raw PCM)
    """
    await websocket.accept()

    user_id = await verify_ws_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        await websocket.send_json({"type": "error", "message": "Deepgram not configured"})
        await websocket.close(code=1011)
        return

    deepgram_ws = None
    convert_audio = encoding.lower() == "m4a"

    try:
        import websockets

        url = (
            f"{DEEPGRAM_WS}?"
            "model=flux-general-en&"
            "encoding=linear16&"
            "sample_rate=16000&"
            "eot_threshold=0.7&"
            "eot_timeout_ms=5000"
        )

        deepgram_ws = await websockets.connect(
            url,
            extra_headers={"Authorization": f"Token {api_key}"},
            ping_interval=10,
            ping_timeout=5,
        )

        async def forward_from_deepgram():
            try:
                async for msg in deepgram_ws:
                    if isinstance(msg, str):
                        data = json.loads(msg)
                        event = data.get("type")
                        if event == "TurnInfo":
                            transcript = data.get("transcript", "")
                            if transcript:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "event": data.get("event"),
                                    "transcript": transcript,
                                    "turn_index": data.get("turn_index"),
                                })
                        elif event == "Connected":
                            await websocket.send_json({"type": "connected"})
                        elif event == "Error":
                            await websocket.send_json({
                                "type": "error",
                                "message": data.get("description", "Unknown error"),
                            })
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Deepgram forward error: {e}")
                try:
                    await websocket.send_json({"type": "error", "message": str(e)})
                except Exception:
                    pass

        async def forward_from_client():
            try:
                while True:
                    raw = await websocket.receive()
                    if "bytes" in raw:
                        msg = raw["bytes"]
                    elif "text" in raw:
                        try:
                            ctrl = json.loads(raw["text"])
                            if ctrl.get("type") == "CloseStream":
                                await deepgram_ws.send(json.dumps({"type": "CloseStream"}))
                            continue
                        except json.JSONDecodeError:
                            continue
                    else:
                        continue
                    if not msg:
                        continue
                    pcm = await m4a_to_pcm(msg) if convert_audio and _is_m4a(msg) else msg
                    if pcm:
                        await deepgram_ws.send(pcm)
            except WebSocketDisconnect:
                pass
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Client forward error: {e}")

        deepgram_task = asyncio.create_task(forward_from_deepgram())
        client_task = asyncio.create_task(forward_from_client())
        done, _ = await asyncio.wait(
            [deepgram_task, client_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in (deepgram_task, client_task):
            if not t.done():
                t.cancel()
                try:
                    await t
                except asyncio.CancelledError:
                    pass

    except Exception as e:
        logger.error(f"WebSocket stream error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if deepgram_ws:
            await deepgram_ws.close()
        try:
            await websocket.close()
        except Exception:
            pass
