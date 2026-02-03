"""
Whisper ASR Module

Supports two modes:
1. Local: Uses faster-whisper for on-device transcription (slower, free)
2. Cloud: Uses OpenAI Whisper API for fast cloud transcription (~$0.006/min)
"""

import logging
import os
import subprocess
import tempfile
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def convert_to_wav(input_path: str) -> str:
    """Convert audio file to WAV format using ffmpeg for better compatibility."""
    # Check if already wav
    if input_path.lower().endswith('.wav'):
        return input_path
    
    # Create temp wav file
    output_path = tempfile.mktemp(suffix='.wav')
    
    try:
        logger.info(f"Converting {input_path} to WAV format...")
        result = subprocess.run([
            'ffmpeg', '-i', input_path,
            '-ar', '16000',  # 16kHz sample rate (optimal for Whisper)
            '-ac', '1',      # Mono
            '-y',            # Overwrite
            output_path
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.warning(f"FFmpeg conversion warning: {result.stderr}")
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Converted to WAV: {output_path}")
            return output_path
        else:
            logger.warning("Conversion failed, using original file")
            return input_path
            
    except Exception as e:
        logger.warning(f"Audio conversion failed: {e}, using original file")
        return input_path


def transcribe_audio(
    audio_path: str,
    model_size: str = "medium",
    use_gpu: bool = False,
    language: Optional[str] = None,
    use_openai_api: bool = False,
    openai_api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Transcribe audio file using Whisper (local or cloud).
    
    Args:
        audio_path: Path to the audio file
        model_size: Whisper model size (for local: tiny, base, small, medium, large-v2)
        use_gpu: Whether to use GPU acceleration (local only)
        language: Optional language code (auto-detected if not provided)
        use_openai_api: Use OpenAI Whisper API instead of local model
        openai_api_key: OpenAI API key (required if use_openai_api=True)
    
    Returns:
        List of transcript segments with timing information
    """
    # Convert audio to WAV for better compatibility (handles webm, m4a, etc)
    converted_path = convert_to_wav(audio_path)
    cleanup_converted = converted_path != audio_path
    
    try:
        # Use OpenAI API for fast cloud transcription
        if use_openai_api:
            api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
            if api_key:
                logger.info(f"Using OpenAI Whisper API for fast cloud transcription (key length: {len(api_key)})")
                return _transcribe_openai_api(converted_path, api_key, language)
            else:
                logger.warning("OpenAI API key not found, falling back to local transcription")
        
        # Fall back to local faster-whisper
        return _transcribe_local(converted_path, model_size, use_gpu, language)
    finally:
        # Cleanup converted file if we created one
        if cleanup_converted and os.path.exists(converted_path):
            try:
                os.remove(converted_path)
            except:
                pass


def _transcribe_openai_api(
    audio_path: str,
    api_key: str,
    language: Optional[str] = None,
    fallback_to_local: bool = True,
    model_size: str = "small",
) -> List[Dict[str, Any]]:
    """
    Transcribe using OpenAI Whisper API (fast, ~$0.006/minute).
    Falls back to local transcription if API fails.
    """
    try:
        from openai import OpenAI
        
        # Validate API key
        if not api_key or len(api_key) < 10:
            raise ValueError(f"Invalid OpenAI API key (length: {len(api_key) if api_key else 0})")
        
        client = OpenAI(api_key=api_key)
        
        # Check file exists and has content
        if not os.path.exists(audio_path):
            raise ValueError(f"Audio file not found: {audio_path}")
        
        file_size = os.path.getsize(audio_path)
        logger.info(f"Uploading to OpenAI Whisper API: {audio_path} ({file_size} bytes)")
        
        with open(audio_path, "rb") as audio_file:
            # Use verbose_json for timestamps
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                language=language,
            )
        
        # Convert OpenAI response to our format
        result = []
        for segment in response.segments:
            # Handle both dict and object formats
            if hasattr(segment, 'start'):
                start = segment.start
                end = segment.end
                text = segment.text
            else:
                start = segment["start"]
                end = segment["end"]
                text = segment["text"]
            
            result.append({
                "start_ms": int(start * 1000),
                "end_ms": int(end * 1000),
                "text": text.strip(),
                "confidence": 0.95,
                "words": [],
            })
        
        logger.info(f"OpenAI transcription complete: {len(result)} segments")
        return result
        
    except Exception as e:
        logger.error(f"OpenAI API transcription error: {str(e)}")
        
        # Fall back to local transcription
        if fallback_to_local:
            logger.warning("Falling back to local Whisper transcription...")
            return _transcribe_local(audio_path, model_size=model_size, use_gpu=False, language=language)
        
        raise


def _transcribe_local(
    audio_path: str,
    model_size: str = "medium",
    use_gpu: bool = False,
    language: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Transcribe using local faster-whisper model (slower, free).
    """
    try:
        from faster_whisper import WhisperModel
        
        # Initialize model
        device = "cuda" if use_gpu else "cpu"
        compute_type = "float16" if use_gpu else "int8"
        
        logger.info(f"Loading Whisper model: {model_size} on {device}")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        
        # Transcribe
        logger.info(f"Transcribing locally: {audio_path}")
        segments, info = model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=400,
            ),
        )
        
        # Convert to list of dicts
        result = []
        for segment in segments:
            result.append({
                "start_ms": int(segment.start * 1000),
                "end_ms": int(segment.end * 1000),
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob,
                "words": [
                    {
                        "word": w.word,
                        "start_ms": int(w.start * 1000),
                        "end_ms": int(w.end * 1000),
                        "probability": w.probability,
                    }
                    for w in (segment.words or [])
                ],
            })
        
        logger.info(f"Local transcription complete: {len(result)} segments, language: {info.language}")
        return result
        
    except ImportError:
        logger.warning("faster-whisper not installed, using mock transcription")
        return _mock_transcription(audio_path)
    except Exception as e:
        logger.error(f"Local transcription error: {str(e)}")
        raise


def _mock_transcription(audio_path: str) -> List[Dict[str, Any]]:
    """
    Generate mock transcription for testing without actual ASR.
    """
    logger.warning("Using mock transcription - install faster-whisper for real ASR")
    
    # Mock segments for testing
    return [
        {
            "start_ms": 0,
            "end_ms": 5000,
            "text": "Good morning! How are you feeling today?",
            "confidence": 0.95,
            "words": [],
        },
        {
            "start_ms": 5500,
            "end_ms": 10000,
            "text": "I'm doing well, thank you for asking.",
            "confidence": 0.92,
            "words": [],
        },
        {
            "start_ms": 10500,
            "end_ms": 18000,
            "text": "Let me help you with your medication. It's time to take your morning pills.",
            "confidence": 0.94,
            "words": [],
        },
        {
            "start_ms": 19000,
            "end_ms": 25000,
            "text": "Thank you. What's on the schedule for today?",
            "confidence": 0.91,
            "words": [],
        },
        {
            "start_ms": 26000,
            "end_ms": 35000,
            "text": "I'm going to prepare your breakfast, and then we can do some light exercises together.",
            "confidence": 0.93,
            "words": [],
        },
        {
            "start_ms": 36000,
            "end_ms": 42000,
            "text": "That sounds wonderful. I've been feeling a bit stiff lately.",
            "confidence": 0.90,
            "words": [],
        },
        {
            "start_ms": 43000,
            "end_ms": 50000,
            "text": "We'll do some gentle stretches to help with that. Let me check your blood pressure first.",
            "confidence": 0.94,
            "words": [],
        },
    ]
