"""
Diarization Task

Uses pyannote.audio for speaker diarization.
"""

import os
import tempfile
import logging
from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional

from worker import app
from db import get_db
from storage import download_file_to_path, get_presigned_url
from config import settings
from libs.pyannote_diar import diarize_audio

logger = logging.getLogger(__name__)


def calculate_overlap(seg_start: int, seg_end: int, turn_start: int, turn_end: int) -> int:
    """Calculate the overlap in milliseconds between a segment and a turn."""
    overlap_start = max(seg_start, turn_start)
    overlap_end = min(seg_end, turn_end)
    return max(0, overlap_end - overlap_start)


def identify_speaker_names(db, visit_id: UUID) -> dict:
    """
    Use AI to identify speaker names from transcript content.
    
    Analyzes the transcript for introductions like "I'm Dr. Smith" or 
    "My name is John" and maps them to speaker labels.
    
    Returns:
        Dict mapping generic labels (SPEAKER_00) to names (Dr. Smith)
    """
    from models import TranscriptSegment
    import anthropic
    import os
    
    # Get transcript segments with speaker labels
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id,
        TranscriptSegment.speaker_label.isnot(None)
    ).order_by(TranscriptSegment.start_ms).limit(50).all()  # First 50 segments
    
    if not segments:
        return {}
    
    # Build transcript excerpt with speaker labels
    transcript_lines = []
    for seg in segments:
        transcript_lines.append(f"[{seg.speaker_label}]: {seg.text}")
    
    transcript_text = "\n".join(transcript_lines)
    
    # Use Claude to identify names
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("No ANTHROPIC_API_KEY set, skipping speaker name identification")
        return {}
    
    try:
        client = anthropic.Anthropic(api_key=api_key)
        
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Analyze this transcript and identify the EXACT NAMES of each speaker.

Look for:
- Self-introductions: "I'm Dr. Drostman", "My name is Sarah", "I'm Mrs. Smith"
- How others address them: "Hello Dr. Jones", "Thank you, Mary"
- Name mentions in context

Transcript:
{transcript_text}

IMPORTANT: Use the EXACT names spoken in the transcript (e.g., "Dr. Drostman", "Mrs. Smith", "Davis"). 
Only fall back to roles like "Doctor" or "Patient" if NO name is ever mentioned for that speaker.

Return ONLY a JSON object mapping speaker labels to their exact names.

Example output format:
{{"SPEAKER_00": "Dr. Drostman", "SPEAKER_01": "Mrs. Smith", "SPEAKER_02": "Davis"}}

JSON response:"""
            }]
        )
        
        # Parse the JSON response
        import json
        response_text = response.content[0].text.strip()
        
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        speaker_names = json.loads(response_text)
        logger.info(f"Identified speaker names: {speaker_names}")
        return speaker_names
        
    except Exception as e:
        logger.warning(f"Failed to identify speaker names: {e}")
        return {}


def update_speaker_names(db, visit_id: UUID, speaker_names: dict) -> int:
    """
    Update transcript segments with identified speaker names.
    """
    from models import TranscriptSegment
    
    if not speaker_names:
        return 0
    
    updated = 0
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id,
        TranscriptSegment.speaker_label.isnot(None)
    ).all()
    
    for segment in segments:
        if segment.speaker_label in speaker_names:
            segment.speaker_label = speaker_names[segment.speaker_label]
            updated += 1
    
    db.commit()
    logger.info(f"Updated {updated} segments with speaker names")
    return updated


def align_diarization_with_transcript(db, visit_id: UUID, turns: List[dict]) -> int:
    """
    Align diarization turns with transcript segments.
    
    Uses the midpoint of each segment to find which speaker was active,
    which is more accurate for dialogue where speakers alternate quickly.
    
    Args:
        db: Database session
        visit_id: UUID of the visit
        turns: List of diarization turn dicts with speaker, start_ms, end_ms
    
    Returns:
        Number of segments that were aligned with speaker labels
    """
    from models import TranscriptSegment
    
    if not turns:
        logger.info(f"No diarization turns to align for visit {visit_id}")
        return 0
    
    # Sort turns by start time for efficient lookup
    sorted_turns = sorted(turns, key=lambda t: t["start_ms"])
    
    # Get all transcript segments for this visit
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).order_by(TranscriptSegment.start_ms).all()
    
    if not segments:
        logger.info(f"No transcript segments found for visit {visit_id}")
        return 0
    
    aligned_count = 0
    
    for segment in segments:
        # Use the midpoint of the segment to find the active speaker
        midpoint = (segment.start_ms + segment.end_ms) // 2
        best_speaker = None
        
        # Find the turn that contains the midpoint
        for turn in sorted_turns:
            if turn["start_ms"] <= midpoint <= turn["end_ms"]:
                best_speaker = turn["speaker"]
                break
        
        # If no turn contains midpoint, find the closest turn
        if not best_speaker:
            min_distance = float('inf')
            for turn in sorted_turns:
                # Distance to turn's time range
                if midpoint < turn["start_ms"]:
                    distance = turn["start_ms"] - midpoint
                elif midpoint > turn["end_ms"]:
                    distance = midpoint - turn["end_ms"]
                else:
                    distance = 0
                
                if distance < min_distance:
                    min_distance = distance
                    best_speaker = turn["speaker"]
        
        # Assign speaker label if we found a speaker
        if best_speaker:
            segment.speaker_label = best_speaker
            aligned_count += 1
    
    db.commit()
    logger.info(f"Aligned {aligned_count}/{len(segments)} transcript segments with speaker labels")
    
    return aligned_count


@app.task(name="tasks.diarize.diarize_visit", bind=True)
def diarize_visit(self, visit_id: str):
    """
    Perform speaker diarization for a visit.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting diarization for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, AudioAsset, DiarizationTurn
        
        # Get visit and audio
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "diarization": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get audio asset
        audio_asset = db.query(AudioAsset).filter(
            AudioAsset.visit_id == visit.id
        ).first()
        
        if not audio_asset:
            raise ValueError(f"No audio found for visit: {visit_id}")
        
        # Download audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            download_file_to_path(audio_asset.s3_key, tmp_path)
            
            # Generate presigned URL for pyannote.ai API
            audio_url = get_presigned_url(audio_asset.s3_key, expires_in=3600)
            logger.info(f"Generated presigned URL for diarization API")
            
            # Perform diarization - pass both local path and URL
            # API will use URL, local models will use path
            turns = diarize_audio(
                tmp_path, 
                hf_token=settings.hf_token,
                pyannote_api_key=os.getenv("PYANNOTE_API_KEY"),
                audio_url=audio_url
            )
            
            # Delete existing turns for this visit
            db.query(DiarizationTurn).filter(
                DiarizationTurn.visit_id == visit.id
            ).delete()
            
            # Save turns to database
            for turn in turns:
                diarization_turn = DiarizationTurn(
                    visit_id=visit.id,
                    audio_asset_id=audio_asset.id,
                    speaker=turn["speaker"],
                    start_ms=turn["start_ms"],
                    end_ms=turn["end_ms"],
                    confidence=turn.get("confidence"),
                )
                db.add(diarization_turn)
            
            db.commit()  # Commit turns before alignment
            
            # Align diarization with transcript segments
            aligned_count = align_diarization_with_transcript(db, visit.id, turns)
            
            # Identify speaker names from transcript content
            speaker_names = identify_speaker_names(db, visit.id)
            if speaker_names:
                update_speaker_names(db, visit.id, speaker_names)
            
            # Update pipeline state - use identified names if available
            speakers = list(set(t["speaker"] for t in turns))
            if speaker_names:
                speakers = list(speaker_names.values())
            visit.pipeline_state = {
                **visit.pipeline_state,
                "diarization": {
                    "status": "completed",
                    "started_at": visit.pipeline_state.get("diarization", {}).get("started_at"),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "turn_count": len(turns),
                    "speakers": speakers,
                    "aligned_segments": aligned_count,
                }
            }
            
            db.commit()
            logger.info(f"Diarization completed for visit {visit_id}: {len(turns)} turns, {len(speakers)} speakers, {aligned_count} segments aligned")
            
            return {
                "status": "success",
                "visit_id": visit_id,
                "turn_count": len(turns),
                "speakers": speakers,
                "aligned_segments": aligned_count,
            }
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        logger.error(f"Diarization failed for visit {visit_id}: {str(e)}")
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "diarization": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
