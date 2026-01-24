"""
Whisper ASR Module

Uses faster-whisper for efficient speech-to-text transcription.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def transcribe_audio(
    audio_path: str,
    model_size: str = "medium",
    use_gpu: bool = False,
    language: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Transcribe audio file using faster-whisper.
    
    Args:
        audio_path: Path to the audio file
        model_size: Whisper model size (tiny, base, small, medium, large-v2)
        use_gpu: Whether to use GPU acceleration
        language: Optional language code (auto-detected if not provided)
    
    Returns:
        List of transcript segments with timing information
    """
    try:
        from faster_whisper import WhisperModel
        
        # Initialize model
        device = "cuda" if use_gpu else "cpu"
        compute_type = "float16" if use_gpu else "int8"
        
        logger.info(f"Loading Whisper model: {model_size} on {device}")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        
        # Transcribe
        logger.info(f"Transcribing: {audio_path}")
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
        
        logger.info(f"Transcription complete: {len(result)} segments, language: {info.language}")
        return result
        
    except ImportError:
        logger.warning("faster-whisper not installed, using mock transcription")
        return _mock_transcription(audio_path)
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
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
