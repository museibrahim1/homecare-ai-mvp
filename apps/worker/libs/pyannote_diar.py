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
    audio_url: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Perform speaker diarization on audio file.
    
    Uses pyannote.ai API if PYANNOTE_API_KEY is provided, otherwise falls back
    to local pyannote.audio models with HF_TOKEN.
    
    Args:
        audio_path: Path to the audio file (local or S3 key)
        hf_token: Hugging Face token for local pyannote.audio models
        pyannote_api_key: API key for hosted pyannote.ai service
        num_speakers: Exact number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers
        audio_url: Public URL to the audio file (for pyannote.ai API)
    
    Returns:
        List of speaker turns with timing information
    """
    # Get tokens from parameters or environment
    api_key = pyannote_api_key or os.getenv("PYANNOTE_API_KEY")
    hf_token = hf_token or os.getenv("HF_TOKEN")
    
    # Prefer pyannote.ai API if we have both API key and URL (faster, no GPU needed)
    if api_key and audio_url:
        try:
            logger.info("Using pyannote.ai API for diarization (preferred)")
            return _diarize_with_api(
                audio_path, api_key, num_speakers, min_speakers, max_speakers, audio_url
            )
        except Exception as e:
            logger.warning(f"pyannote.ai API failed: {e}, trying local models")
    
    # Try local models as fallback
    if hf_token:
        try:
            logger.info("Using local pyannote.audio models")
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
    audio_url: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Use pyannote.ai hosted API for diarization.
    
    The API requires a URL to the audio file. If audio_url is not provided,
    we'll try to construct one from the S3/MinIO storage.
    """
    logger.info(f"Using pyannote.ai API for diarization")
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Build request body
    body: Dict[str, Any] = {}
    
    # Get audio URL - either provided or construct from S3
    if audio_url:
        body["url"] = audio_url
    else:
        # Try to get public URL from S3/MinIO
        s3_url = _get_s3_public_url(audio_path)
        if s3_url:
            body["url"] = s3_url
        else:
            raise Exception("pyannote.ai API requires a public URL for the audio file")
    
    # Add speaker configuration
    # Note: minSpeakers/maxSpeakers require model "precision-2"
    if num_speakers:
        body["numSpeakers"] = num_speakers
        body["model"] = "precision-2"
    else:
        body["minSpeakers"] = min_speakers
        body["maxSpeakers"] = max_speakers
        body["model"] = "precision-2"
    
    logger.info(f"Sending request to pyannote.ai API with URL: {body.get('url', 'N/A')[:50]}...")
    logger.info(f"Request body (without URL): model={body.get('model')}, minSpeakers={body.get('minSpeakers')}, maxSpeakers={body.get('maxSpeakers')}, numSpeakers={body.get('numSpeakers')}")
    
    response = requests.post(
        PYANNOTE_API_URL,
        headers=headers,
        json=body,
        timeout=300,  # 5 minute timeout for long audio
    )
    
    if response.status_code != 200:
        raise Exception(f"pyannote.ai API error: {response.status_code} - {response.text}")
    
    # Parse response
    result_data = response.json()
    logger.info(f"pyannote.ai API response: {json.dumps(result_data)[:500]}")
    
    # Convert API response to our format
    # The API returns diarization in the "output" field
    result = []
    diarization_data = result_data.get("output", result_data.get("diarization", []))
    
    if isinstance(diarization_data, dict):
        diarization_data = diarization_data.get("diarization", [])
    
    for segment in diarization_data:
        result.append({
            "speaker": segment.get("speaker", "SPEAKER_00"),
            "start_ms": int(float(segment.get("start", 0)) * 1000),
            "end_ms": int(float(segment.get("end", 0)) * 1000),
            "confidence": segment.get("confidence"),
        })
    
    logger.info(f"pyannote.ai API diarization complete: {len(result)} turns")
    return result


def _get_s3_public_url(audio_path: str) -> Optional[str]:
    """
    Get a public/presigned URL for an audio file from S3/MinIO.
    """
    try:
        import boto3
        from botocore.config import Config
        
        s3_endpoint = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
        s3_access_key = os.getenv("S3_ACCESS_KEY", "minio")
        s3_secret_key = os.getenv("S3_SECRET_KEY", "minio12345")
        s3_bucket = os.getenv("S3_BUCKET", "homecare-audio")
        
        # Extract the S3 key from the path
        # audio_path might be like "/tmp/audio.wav" or "visits/123/audio.wav"
        if audio_path.startswith("/tmp/"):
            # This is a local temp file, we need to upload it first
            logger.info("Audio is local file, cannot get S3 URL")
            return None
        
        s3_key = audio_path
        if s3_key.startswith(f"s3://{s3_bucket}/"):
            s3_key = s3_key[len(f"s3://{s3_bucket}/"):]
        
        # Create S3 client
        s3_client = boto3.client(
            "s3",
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            config=Config(signature_version="s3v4"),
        )
        
        # Generate presigned URL (valid for 1 hour)
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": s3_bucket, "Key": s3_key},
            ExpiresIn=3600,
        )
        
        logger.info(f"Generated presigned URL for {s3_key}")
        return url
        
    except Exception as e:
        logger.warning(f"Could not generate S3 URL: {e}")
        return None


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
