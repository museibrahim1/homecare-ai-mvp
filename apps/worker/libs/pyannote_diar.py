"""
Pyannote Diarization Module

Uses pyannote.audio for speaker diarization.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def diarize_audio(
    audio_path: str,
    hf_token: Optional[str] = None,
    num_speakers: Optional[int] = None,
    min_speakers: int = 1,
    max_speakers: int = 4,
) -> List[Dict[str, Any]]:
    """
    Perform speaker diarization on audio file.
    
    Args:
        audio_path: Path to the audio file
        hf_token: Hugging Face token for accessing pyannote models
        num_speakers: Exact number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers
    
    Returns:
        List of speaker turns with timing information
    """
    try:
        from pyannote.audio import Pipeline
        import torch
        
        logger.info(f"Loading pyannote diarization pipeline")
        
        # Load pre-trained pipeline with Hugging Face authentication
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token,
        )
        
        # Use GPU if available
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
        
        # Run diarization
        logger.info(f"Diarizing: {audio_path}")
        
        diarization_params = {
            "min_speakers": min_speakers,
            "max_speakers": max_speakers,
        }
        if num_speakers:
            diarization_params["num_speakers"] = num_speakers
        
        diarization = pipeline(audio_path, **diarization_params)
        
        # Convert to list of dicts
        result = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            result.append({
                "speaker": speaker,
                "start_ms": int(turn.start * 1000),
                "end_ms": int(turn.end * 1000),
                "confidence": None,  # pyannote doesn't provide per-turn confidence
            })
        
        logger.info(f"Diarization complete: {len(result)} turns")
        return result
        
    except ImportError:
        logger.warning("pyannote.audio not installed, using mock diarization")
        return _mock_diarization(audio_path)
    except Exception as e:
        logger.error(f"Diarization error: {str(e)}")
        # Fall back to mock if auth fails (common issue with HF tokens)
        if "token" in str(e).lower() or "auth" in str(e).lower():
            logger.warning("Authentication failed, using mock diarization")
            return _mock_diarization(audio_path)
        raise


def _mock_diarization(audio_path: str) -> List[Dict[str, Any]]:
    """
    Generate mock diarization for testing without actual models.
    """
    logger.warning("Using mock diarization - install pyannote.audio for real diarization")
    
    # Mock speaker turns matching the mock transcription
    return [
        {"speaker": "SPEAKER_00", "start_ms": 0, "end_ms": 5000, "confidence": None},  # Caregiver
        {"speaker": "SPEAKER_01", "start_ms": 5500, "end_ms": 10000, "confidence": None},  # Client
        {"speaker": "SPEAKER_00", "start_ms": 10500, "end_ms": 18000, "confidence": None},  # Caregiver
        {"speaker": "SPEAKER_01", "start_ms": 19000, "end_ms": 25000, "confidence": None},  # Client
        {"speaker": "SPEAKER_00", "start_ms": 26000, "end_ms": 35000, "confidence": None},  # Caregiver
        {"speaker": "SPEAKER_01", "start_ms": 36000, "end_ms": 42000, "confidence": None},  # Client
        {"speaker": "SPEAKER_00", "start_ms": 43000, "end_ms": 50000, "confidence": None},  # Caregiver
    ]
