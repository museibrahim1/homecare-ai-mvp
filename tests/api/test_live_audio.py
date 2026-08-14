"""Unit tests for iOS-matching live transcription WAV helpers."""

import math
import struct
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from app.services.live_audio import (
    MIN_CHUNK_BYTES,
    SAMPLE_RATE,
    find_data_chunk_offset,
    ios_style_chunks,
    padded_coreaudio_wav,
    pcm_peak,
    wrap_pcm_in_wav,
)


def _sine_pcm(seconds: float, freq: float = 440.0, amplitude: int = 12000) -> bytes:
    n = int(SAMPLE_RATE * seconds)
    samples = []
    for i in range(n):
        val = int(amplitude * math.sin(2 * math.pi * freq * i / SAMPLE_RATE))
        samples.append(struct.pack("<h", val))
    return b"".join(samples)


def test_wrap_pcm_in_wav_is_canonical_riff():
    pcm = _sine_pcm(1.0)
    wav = wrap_pcm_in_wav(pcm)
    assert wav[:4] == b"RIFF"
    assert wav[8:12] == b"WAVE"
    assert find_data_chunk_offset(wav) == 44
    assert wav[44:] == pcm
    chunk_size = struct.unpack_from("<I", wav, 4)[0]
    assert chunk_size == 36 + len(pcm)


def test_find_data_chunk_offset_skips_coreaudio_junk():
    pcm = _sine_pcm(0.5)
    wav = padded_coreaudio_wav(pcm)
    offset = find_data_chunk_offset(wav)
    assert offset is not None
    assert offset > 44
    assert wav[offset : offset + len(pcm)] == pcm


def test_ios_style_chunks_from_padded_file_are_valid_wavs():
    # 4 seconds of PCM so two ~2s slices both exceed minNewBytes.
    pcm = _sine_pcm(4.0)
    wav = padded_coreaudio_wav(pcm)
    chunks = ios_style_chunks(wav, min_new_bytes=MIN_CHUNK_BYTES, max_chunk_bytes=MIN_CHUNK_BYTES * 2)
    assert len(chunks) >= 2
    reconstructed = b""
    for chunk in chunks:
        assert chunk[:4] == b"RIFF"
        off = find_data_chunk_offset(chunk)
        assert off == 44
        reconstructed += chunk[off:]
        assert pcm_peak(chunk) and pcm_peak(chunk) > 1000
    assert reconstructed == pcm[: len(reconstructed)]


def test_pcm_peak_silence_is_zero():
    pcm = b"\x00\x00" * SAMPLE_RATE
    wav = wrap_pcm_in_wav(pcm)
    assert pcm_peak(wav) == 0


def test_find_data_chunk_offset_rejects_garbage():
    assert find_data_chunk_offset(b"not a wav") is None
    assert find_data_chunk_offset(b"") is None
