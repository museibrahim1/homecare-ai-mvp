"""
Pyannote Diarization Module

Supports two methods:
1. pyannote.ai API (hosted service) - requires PYANNOTE_API_KEY
2. pyannote.audio (local models) - requires HF_TOKEN and GPU recommended
"""

import logging
import os
import json
from typing import List, Dict, Any, Optional
import requests

logger = logging.getLogger(__name__)

# API endpoint for pyannote.ai hosted service
PYANNOTE_API_URL = "https://api.pyannote.ai/v1/diarize"


def diarize_audio(
    audio_path: str,
    hf_token: Optional[str] = None,
    pyannote_api_key: Optional[str] = None,
    num_speakers: Optional[int] = None,
    min_speakers: int = 1,
    max_speakers: int = 4,
) -> List[Dict[str, Any]]:
    """
    Perform speaker diarization on audio file.
    
    Uses pyannote.ai API if PYANNOTE_API_KEY is provided, otherwise falls back
    to local pyannote.audio models with HF_TOKEN.
    
    Args:
        audio_path: Path to the audio file
        hf_token: Hugging Face token for local pyannote.audio models
        pyannote_api_key: API key for hosted pyannote.ai service
        num_speakers: Exact number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers
    
    Returns:
        List of speaker turns with timing information
    """
    # Get API key from parameter or environment
    api_key = pyannote_api_key or os.getenv("PYANNOTE_API_KEY")
    
    # Try pyannote.ai API first (easier, no local GPU needed)
    if api_key:
        try:
            return _diarize_with_api(
                audio_path, api_key, num_speakers, min_speakers, max_speakers
            )
        except Exception as e:
            logger.warning(f"pyannote.ai API failed: {e}, trying local models")
    
    # Fall back to local pyannote.audio models
    hf_token = hf_token or os.getenv("HF_TOKEN")
    if hf_token:
        try:
            return _diarize_with_local_models(
                audio_path, hf_token, num_speakers, min_speakers, max_speakers
            )
        except Exception as e:
            logger.warning(f"Local diarization failed: {e}")
    
    # Final fallback to mock
    logger.warning("No diarization method available, using mock")
    return _mock_diarization(audio_path)


def _diarize_with_api(
    audio_path: str,
    api_key: str,
    num_speakers: Optional[int] = None,
    min_speakers: int = 1,
    max_speakers: int = 4,
) -> List[Dict[str, Any]]:
    """
    Use pyannote.ai hosted API for diarization.
    """
    logger.info(f"Using pyannote.ai API for diarization")
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    
    # Build parameters
    params = {}
    if num_speakers:
        params["num_speakers"] = num_speakers
    else:
        params["min_speakers"] = min_speakers
        params["max_speakers"] = max_speakers
    
    # Upload audio file
    with open(audio_path, "rb") as f:
        files = {"audio": f}
        
        logger.info(f"Sending audio to pyannote.ai API...")
        response = requests.post(
            PYANNOTE_API_URL,
            headers=headers,
            files=files,
            data=params,
            timeout=300,  # 5 minute timeout for long audio
        )
    
    if response.status_code != 200:
        raise Exception(f"pyannote.ai API error: {response.status_code} - {response.text}")
    
    # Parse response
    result_data = response.json()
    
    # Convert API response to our format
    result = []
    for segment in result_data.get("output", {}).get("diarization", []):
        result.append({
            "speaker": segment.get("speaker", "SPEAKER_00"),
            "start_ms": int(segment.get("start", 0) * 1000),
            "end_ms": int(segment.get("end", 0) * 1000),
            "confidence": segment.get("confidence"),
        })
    
    logger.info(f"pyannote.ai API diarization complete: {len(result)} turns")
    return result


def _diarize_with_local_models(
    audio_path: str,
    hf_token: str,
    num_speakers: Optional[int] = None,
    min_speakers: int = 1,
    max_speakers: int = 4,
) -> List[Dict[str, Any]]:
    """
    Use local pyannote.audio models for diarization.
    """
    try:
        from pyannote.audio import Pipeline
        import torch
        
        logger.info(f"Loading pyannote.audio local pipeline")
        
        # Load pre-trained pipeline with Hugging Face authentication
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token,
        )
        
        # Use GPU if available
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
            logger.info("Using GPU for diarization")
        
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
                "confidence": None,
            })
        
        logger.info(f"Local diarization complete: {len(result)} turns")
        return result
        
    except ImportError:
        raise Exception("pyannote.audio not installed")


def _mock_diarization(audio_path: str) -> List[Dict[str, Any]]:
    """
    Generate mock diarization for testing without actual models.
    """
    logger.warning("Using mock diarization - set PYANNOTE_API_KEY or HF_TOKEN for real diarization")
    
    # Mock speaker turns matching typical conversation
    return [
        {"speaker": "SPEAKER_00", "start_ms": 0, "end_ms": 5000, "confidence": None},
        {"speaker": "SPEAKER_01", "start_ms": 5500, "end_ms": 10000, "confidence": None},
        {"speaker": "SPEAKER_00", "start_ms": 10500, "end_ms": 18000, "confidence": None},
        {"speaker": "SPEAKER_01", "start_ms": 19000, "end_ms": 25000, "confidence": None},
        {"speaker": "SPEAKER_00", "start_ms": 26000, "end_ms": 35000, "confidence": None},
        {"speaker": "SPEAKER_01", "start_ms": 36000, "end_ms": 42000, "confidence": None},
        {"speaker": "SPEAKER_00", "start_ms": 43000, "end_ms": 50000, "confidence": None},
    ]
