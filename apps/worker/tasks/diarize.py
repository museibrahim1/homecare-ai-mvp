"""
Speaker Identification Task

Deepgram already separates speakers during transcription (each transcript
segment carries a SPEAKER_n label). This task takes that separation one step
further: it uses Claude to figure out the *real name* of each speaker from what
they say ("I'm Dr. Drostman", "My name is Sarah") and rewrites the generic
SPEAKER_n labels to those names.

It deliberately does NOT do acoustic diarization (that was the old pyannote
path, which is redundant now that Deepgram diarizes inline).
"""

import os
import json
import logging
from datetime import datetime, timezone
from uuid import UUID
from typing import Dict, List

from worker import app
from db import get_db

logger = logging.getLogger(__name__)


def identify_speaker_names(db, visit_id: UUID) -> dict:
    """
    Use AI to identify speaker names from transcript content.

    Analyzes the transcript for introductions like "I'm Dr. Smith" or
    "My name is John" and maps them to the SPEAKER_n labels Deepgram assigned.

    Returns:
        Dict mapping generic labels (SPEAKER_00) to names (Dr. Smith)
    """
    from models import TranscriptSegment
    import anthropic

    # Get ALL transcript segments with speaker labels to find all speakers
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id,
        TranscriptSegment.speaker_label.isnot(None)
    ).order_by(TranscriptSegment.start_ms).all()

    if not segments:
        return {}

    # Find all unique speaker labels
    unique_speakers = list(set(seg.speaker_label for seg in segments))
    logger.info(f"Found {len(unique_speakers)} unique speakers: {unique_speakers}")

    # Build transcript excerpt - include first 50 segments from each speaker for context
    speaker_segments: Dict[str, List] = {}
    for seg in segments:
        speaker = seg.speaker_label
        if speaker not in speaker_segments:
            speaker_segments[speaker] = []
        if len(speaker_segments[speaker]) < 50:  # First 50 segments per speaker
            speaker_segments[speaker].append(seg)

    # Combine segments chronologically for context
    all_segments = []
    for speaker_segs in speaker_segments.values():
        all_segments.extend(speaker_segs)
    all_segments.sort(key=lambda s: s.start_ms)

    # Build transcript text from combined segments (limit to ~150 total)
    transcript_lines = []
    for seg in all_segments[:150]:
        transcript_lines.append(f"[{seg.speaker_label}]: {seg.text}")

    transcript_text = "\n".join(transcript_lines)
    logger.info(f"Built transcript with {len(transcript_lines)} lines from {len(unique_speakers)} speakers")

    # Use Claude to identify names
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("No ANTHROPIC_API_KEY set, skipping speaker name identification")
        return {}

    try:
        client = anthropic.Anthropic(api_key=api_key, timeout=120.0)

        # Include list of speakers that need identification
        speakers_list = ", ".join(unique_speakers)

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Analyze this transcript and identify the EXACT NAMES of each speaker.

The following speakers need to be identified: {speakers_list}

Look for:
- Self-introductions: "I'm Dr. Drostman", "My name is Sarah", "I'm Mrs. Smith", "Hi, I'm Davis"
- How others address them: "Hello Dr. Jones", "Thank you, Mary"
- Name mentions in context
- Family relationships mentioned (husband, wife, caregiver, etc.)

Transcript:
{transcript_text}

IMPORTANT: 
1. You MUST provide a name for EVERY speaker: {speakers_list}
2. Use the EXACT names spoken in the transcript (e.g., "Dr. Drostman", "Mrs. Smith", "Davis")
3. If someone introduces themselves (like "I'm Davis"), use that name
4. Only fall back to roles like "Doctor", "Patient", "Husband" if NO name is ever mentioned for that speaker

Return ONLY a JSON object mapping ALL speaker labels to their names.

Example output format:
{{"SPEAKER_00": "Dr. Drostman", "SPEAKER_01": "Mrs. Smith", "SPEAKER_02": "Davis"}}

JSON response:"""
            }]
        )

        # Parse the JSON response
        response_text = response.content[0].text.strip()

        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        speaker_names = json.loads(response_text)
        logger.info(f"Identified {len(speaker_names)} speaker names from transcript")
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


@app.task(name="tasks.diarize.diarize_visit", bind=True)
def diarize_visit(self, visit_id: str):
    """
    Identify speaker names for a visit from its (already speaker-separated)
    transcript. Requires transcription to have run first.
    """
    logger.info(f"Starting speaker identification for visit {visit_id}")

    db = get_db()
    visit = None

    try:
        from models import Visit, TranscriptSegment

        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")

        visit.pipeline_state = {
            **visit.pipeline_state,
            "diarization": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()

        # Deepgram tagged each segment with a SPEAKER_n label during
        # transcription; we just need those to exist.
        labeled_count = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id,
            TranscriptSegment.speaker_label.isnot(None),
        ).count()

        if labeled_count == 0:
            raise ValueError(
                "No speaker-labeled transcript found. Run transcription first."
            )

        # Turn SPEAKER_0 / SPEAKER_1 into real names using the transcript content.
        speaker_names = identify_speaker_names(db, visit.id)
        updated = update_speaker_names(db, visit.id, speaker_names)

        # Report the distinct speakers now on the transcript.
        rows = db.query(TranscriptSegment.speaker_label).filter(
            TranscriptSegment.visit_id == visit.id,
            TranscriptSegment.speaker_label.isnot(None),
        ).distinct().all()
        speakers = [r[0] for r in rows]

        visit.pipeline_state = {
            **visit.pipeline_state,
            "diarization": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("diarization", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "speakers": speakers,
                "renamed_segments": updated,
            }
        }
        db.commit()
        logger.info(
            f"Speaker identification completed for visit {visit_id}: "
            f"{len(speakers)} speakers, {updated} segments renamed"
        )

        return {
            "status": "success",
            "visit_id": visit_id,
            "speakers": speakers,
            "renamed_segments": updated,
        }

    except Exception as e:
        logger.error(f"Speaker identification failed for visit {visit_id}: {str(e)}")

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
