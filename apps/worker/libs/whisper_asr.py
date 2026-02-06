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


def _split_audio_for_api(audio_path: str, max_size_mb: float = 24.0) -> List[str]:
    """
    Split audio file into chunks that fit within OpenAI's 25MB limit.
    Returns list of chunk file paths. Uses pydub for splitting.
    """
    file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
    
    if file_size_mb <= max_size_mb:
        return [audio_path]
    
    logger.info(f"Audio file is {file_size_mb:.1f}MB, splitting into chunks (max {max_size_mb}MB each)")
    
    try:
        from pydub import AudioSegment
        
        audio = AudioSegment.from_file(audio_path)
        total_duration_ms = len(audio)
        
        # Calculate chunk duration based on file size ratio
        num_chunks = int(file_size_mb / max_size_mb) + 1
        chunk_duration_ms = total_duration_ms // num_chunks
        
        # Minimum 60 seconds per chunk
        chunk_duration_ms = max(chunk_duration_ms, 60000)
        
        chunks = []
        start = 0
        chunk_idx = 0
        
        while start < total_duration_ms:
            end = min(start + chunk_duration_ms, total_duration_ms)
            chunk = audio[start:end]
            
            # Export as mp3 (much smaller than wav)
            chunk_path = tempfile.mktemp(suffix=f"_chunk{chunk_idx}.mp3")
            chunk.export(chunk_path, format="mp3", bitrate="64k")
            
            chunk_size = os.path.getsize(chunk_path) / (1024 * 1024)
            logger.info(f"  Chunk {chunk_idx}: {start/1000:.1f}s - {end/1000:.1f}s ({chunk_size:.1f}MB)")
            
            chunks.append(chunk_path)
            start = end
            chunk_idx += 1
        
        logger.info(f"Split into {len(chunks)} chunks")
        return chunks
        
    except ImportError:
        logger.error("pydub not installed - cannot split audio. Trying to convert to mp3 with ffmpeg.")
        # Try converting to mp3 which is much smaller
        mp3_path = tempfile.mktemp(suffix='.mp3')
        try:
            result = subprocess.run([
                'ffmpeg', '-i', audio_path,
                '-b:a', '64k',  # Low bitrate for smaller file
                '-ar', '16000',
                '-ac', '1',
                '-y', mp3_path
            ], capture_output=True, text=True)
            
            if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
                mp3_size = os.path.getsize(mp3_path) / (1024 * 1024)
                logger.info(f"Converted to mp3: {mp3_size:.1f}MB")
                if mp3_size <= max_size_mb:
                    return [mp3_path]
        except Exception as e:
            logger.error(f"ffmpeg conversion failed: {e}")
        
        # Last resort: return original file and let API error handle it
        return [audio_path]


def _transcribe_openai_api(
    audio_path: str,
    api_key: str,
    language: Optional[str] = None,
    fallback_to_local: bool = True,
    model_size: str = "small",
) -> List[Dict[str, Any]]:
    """
    Transcribe using OpenAI Whisper API (fast, ~$0.006/minute).
    Automatically splits large files into chunks.
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
        file_size_mb = file_size / (1024 * 1024)
        logger.info(f"Preparing for OpenAI Whisper API: {audio_path} ({file_size_mb:.1f}MB)")
        
        # Split large files into chunks
        chunk_paths = _split_audio_for_api(audio_path)
        is_chunked = len(chunk_paths) > 1
        
        all_segments = []
        time_offset_ms = 0
        
        for chunk_idx, chunk_path in enumerate(chunk_paths):
            chunk_size = os.path.getsize(chunk_path) / (1024 * 1024)
            logger.info(f"Transcribing chunk {chunk_idx + 1}/{len(chunk_paths)} ({chunk_size:.1f}MB)")
            
            try:
                with open(chunk_path, "rb") as audio_file:
                    response = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                        timestamp_granularities=["segment"],
                        language=language,
                    )
                
                # Track the last end time for offset calculation
                chunk_max_end_ms = 0
                
                for segment in response.segments:
                    if hasattr(segment, 'start'):
                        start = segment.start
                        end = segment.end
                        text = segment.text
                    else:
                        start = segment["start"]
                        end = segment["end"]
                        text = segment["text"]
                    
                    seg_start_ms = int(start * 1000) + time_offset_ms
                    seg_end_ms = int(end * 1000) + time_offset_ms
                    
                    all_segments.append({
                        "start_ms": seg_start_ms,
                        "end_ms": seg_end_ms,
                        "text": text.strip(),
                        "confidence": 0.95,
                        "words": [],
                    })
                    
                    chunk_max_end_ms = max(chunk_max_end_ms, int(end * 1000))
                
                # Update offset for next chunk
                if is_chunked:
                    # Use actual audio duration for more accurate offset
                    try:
                        from pydub import AudioSegment
                        chunk_audio = AudioSegment.from_file(chunk_path)
                        time_offset_ms += len(chunk_audio)
                    except:
                        # Fallback: use the last segment's end time
                        time_offset_ms += chunk_max_end_ms
                
                logger.info(f"  Chunk {chunk_idx + 1} produced {len(response.segments)} segments")
                
            finally:
                # Clean up chunk files (but not the original)
                if chunk_path != audio_path and os.path.exists(chunk_path):
                    try:
                        os.remove(chunk_path)
                    except:
                        pass
        
        logger.info(f"OpenAI transcription complete: {len(all_segments)} total segments from {len(chunk_paths)} chunk(s)")
        return all_segments
        
    except Exception as e:
        logger.error(f"OpenAI API transcription error: {str(e)}")
        
        # Clean up any remaining chunk files
        if 'chunk_paths' in locals():
            for cp in chunk_paths:
                if cp != audio_path and os.path.exists(cp):
                    try:
                        os.remove(cp)
                    except:
                        pass
        
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
