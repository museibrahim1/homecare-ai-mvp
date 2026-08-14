"""WAV helpers shared by live transcription.

Mirrors the iOS LiveTranscriptionService chunk path:
  * CoreAudio pads WAV headers with JUNK/FLLR, so PCM does not start at byte 44.
  * Incremental chunks are raw PCM tails wrapped in a fresh 44-byte RIFF header
    so Deepgram can decode them without the original file header.
"""

from __future__ import annotations

import struct
from typing import Optional


SAMPLE_RATE = 16000
CHANNELS = 1
BIT_DEPTH = 16
WAV_HEADER_SIZE = 44
# ~1 second of mono 16 kHz / 16-bit PCM. Matches iOS minNewBytes.
MIN_CHUNK_BYTES = 32_000


def find_data_chunk_offset(wav: bytes) -> Optional[int]:
    """Return the byte offset where PCM samples begin, or None."""
    if len(wav) < 12 or wav[:4] != b"RIFF":
        return None
    i = 12
    while i + 8 <= len(wav):
        four_cc = wav[i : i + 4]
        size = struct.unpack_from("<I", wav, i + 4)[0]
        if four_cc == b"data":
            return i + 8
        i += 8 + size + (size % 2)
    return None


def wrap_pcm_in_wav(
    pcm: bytes,
    sample_rate: int = SAMPLE_RATE,
    channels: int = CHANNELS,
    bit_depth: int = BIT_DEPTH,
) -> bytes:
    """Build a canonical 44-byte RIFF/WAV around a PCM payload."""
    if len(pcm) % 2:
        pcm = pcm[:-1]
    byte_rate = sample_rate * channels * (bit_depth // 8)
    block_align = channels * (bit_depth // 8)
    data_size = len(pcm)
    chunk_size = 36 + data_size
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bit_depth,
        b"data",
        data_size,
    )
    return header + pcm


def pcm_peak(content: bytes) -> Optional[int]:
    """Max abs int16 sample of a WAV chunk (None if not parseable)."""
    if len(content) < 44 or content[:4] != b"RIFF":
        return None
    offset = find_data_chunk_offset(content)
    if offset is None or offset + 2 > len(content):
        return None
    pcm = content[offset:]
    n = len(pcm) // 2
    if n == 0:
        return None
    step = max(1, n // 50_000)
    peak = 0
    for j in range(0, n, step):
        val = struct.unpack_from("<h", pcm, j * 2)[0]
        abs_val = abs(val)
        if abs_val > peak:
            peak = abs_val
            if peak >= 32767:
                break
    return peak


def ios_style_chunks(
    wav: bytes,
    min_new_bytes: int = MIN_CHUNK_BYTES,
    max_chunk_bytes: int = 4 * 1024 * 1024,
) -> list[bytes]:
    """Split a growing WAV the way iOS LiveTranscriptionService does.

    Finds the real `data` offset, then wraps each PCM slice in a fresh header.
    """
    offset = find_data_chunk_offset(wav)
    if offset is None:
        offset = WAV_HEADER_SIZE
    chunks: list[bytes] = []
    while True:
        available = len(wav) - offset
        if available <= min_new_bytes:
            break
        take = min(max_chunk_bytes, available)
        pcm = wav[offset : offset + take]
        if len(pcm) <= min_new_bytes:
            break
        chunks.append(wrap_pcm_in_wav(pcm))
        offset += take
    return chunks


def padded_coreaudio_wav(pcm: bytes) -> bytes:
    """Simulate a CoreAudio WAV: JUNK + FLLR before the data chunk (~4 KB)."""
    junk_payload = b"\x00" * 2048
    fllr_payload = b"\x00" * 2044
    junk = b"JUNK" + struct.pack("<I", len(junk_payload)) + junk_payload
    fllr = b"FLLR" + struct.pack("<I", len(fllr_payload)) + fllr_payload
    fmt = struct.pack(
        "<4sIHHIIHH",
        b"fmt ",
        16,
        1,
        CHANNELS,
        SAMPLE_RATE,
        SAMPLE_RATE * CHANNELS * (BIT_DEPTH // 8),
        CHANNELS * (BIT_DEPTH // 8),
        BIT_DEPTH,
    )
    data = b"data" + struct.pack("<I", len(pcm)) + pcm
    body = junk + fllr + fmt + data
    riff = b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WAVE" + body
    return riff
