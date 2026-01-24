"""
Voice Activity Detection (VAD) Module

Detects speech segments in audio for better transcription and billing.
"""

import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


def detect_speech_segments(
    audio_path: str,
    min_speech_duration_ms: int = 250,
    min_silence_duration_ms: int = 500,
) -> List[Tuple[int, int]]:
    """
    Detect speech segments in audio file.
    
    Args:
        audio_path: Path to the audio file
        min_speech_duration_ms: Minimum speech segment duration
        min_silence_duration_ms: Minimum silence to split segments
    
    Returns:
        List of (start_ms, end_ms) tuples for speech segments
    """
    try:
        # Try using Silero VAD
        return _silero_vad(audio_path, min_speech_duration_ms, min_silence_duration_ms)
    except ImportError:
        logger.warning("Silero VAD not available, using simple energy-based VAD")
        return _simple_energy_vad(audio_path, min_speech_duration_ms, min_silence_duration_ms)


def _silero_vad(
    audio_path: str,
    min_speech_duration_ms: int,
    min_silence_duration_ms: int,
) -> List[Tuple[int, int]]:
    """Use Silero VAD model for speech detection."""
    import torch
    import torchaudio
    
    # Load Silero VAD model
    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
    )
    
    get_speech_timestamps, _, read_audio, *_ = utils
    
    # Load audio
    wav = read_audio(audio_path, sampling_rate=16000)
    
    # Get speech timestamps
    speech_timestamps = get_speech_timestamps(
        wav,
        model,
        sampling_rate=16000,
        min_speech_duration_ms=min_speech_duration_ms,
        min_silence_duration_ms=min_silence_duration_ms,
    )
    
    # Convert to ms
    segments = []
    for ts in speech_timestamps:
        start_ms = int(ts["start"] / 16)  # 16000 samples/s = 16 samples/ms
        end_ms = int(ts["end"] / 16)
        segments.append((start_ms, end_ms))
    
    return segments


def _simple_energy_vad(
    audio_path: str,
    min_speech_duration_ms: int,
    min_silence_duration_ms: int,
) -> List[Tuple[int, int]]:
    """Simple energy-based VAD fallback."""
    try:
        import numpy as np
        import soundfile as sf
        
        # Load audio
        data, sample_rate = sf.read(audio_path)
        
        # Convert to mono if stereo
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        
        # Calculate energy in windows
        window_size = int(sample_rate * 0.025)  # 25ms windows
        hop_size = int(sample_rate * 0.010)  # 10ms hop
        
        energies = []
        for i in range(0, len(data) - window_size, hop_size):
            window = data[i:i + window_size]
            energy = np.sum(window ** 2) / window_size
            energies.append(energy)
        
        energies = np.array(energies)
        
        # Threshold based on energy distribution
        threshold = np.percentile(energies, 30)
        
        # Find speech segments
        is_speech = energies > threshold
        
        segments = []
        in_speech = False
        start_frame = 0
        
        for i, speech in enumerate(is_speech):
            if speech and not in_speech:
                start_frame = i
                in_speech = True
            elif not speech and in_speech:
                start_ms = start_frame * 10  # 10ms per frame
                end_ms = i * 10
                if (end_ms - start_ms) >= min_speech_duration_ms:
                    segments.append((start_ms, end_ms))
                in_speech = False
        
        # Handle case where audio ends during speech
        if in_speech:
            start_ms = start_frame * 10
            end_ms = len(is_speech) * 10
            if (end_ms - start_ms) >= min_speech_duration_ms:
                segments.append((start_ms, end_ms))
        
        return segments
        
    except Exception as e:
        logger.error(f"Simple VAD failed: {str(e)}")
        return []


def get_speech_ratio(speech_segments: List[Tuple[int, int]], total_duration_ms: int) -> float:
    """Calculate the ratio of speech to total audio duration."""
    if total_duration_ms <= 0:
        return 0.0
    
    total_speech_ms = sum(end - start for start, end in speech_segments)
    return total_speech_ms / total_duration_ms


def get_visit_boundaries(
    speech_segments: List[Tuple[int, int]],
    padding_ms: int = 60000,
) -> Tuple[int, int]:
    """
    Get visit start and end times based on speech activity.
    
    Args:
        speech_segments: List of speech segments
        padding_ms: Padding to add before first and after last speech
    
    Returns:
        (visit_start_ms, visit_end_ms)
    """
    if not speech_segments:
        return (0, 0)
    
    first_speech = min(start for start, _ in speech_segments)
    last_speech = max(end for _, end in speech_segments)
    
    visit_start = max(0, first_speech - padding_ms)
    visit_end = last_speech + padding_ms
    
    return (visit_start, visit_end)
