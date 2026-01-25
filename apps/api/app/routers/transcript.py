import re
import logging
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.transcript_segment import TranscriptSegment
from app.schemas.transcript import (
    TranscriptResponse, TranscriptSegmentResponse, TranscriptSource,
    TranscriptImportRequest, TranscriptImportResponse, TranscriptSegmentImport,
    SRTImportRequest, VTTImportRequest, PlainTextImportRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Helper Functions for Parsing Different Formats
# =============================================================================

def parse_srt_content(srt_content: str, speaker_pattern: Optional[str] = None) -> List[TranscriptSegmentImport]:
    """Parse SRT subtitle format into transcript segments."""
    segments = []
    
    # SRT format: index, timestamp line, text, blank line
    # 1
    # 00:00:00,000 --> 00:00:05,000
    # Hello, how are you?
    
    blocks = re.split(r'\n\n+', srt_content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        
        # Find timestamp line (contains -->)
        timestamp_line = None
        text_lines = []
        
        for i, line in enumerate(lines):
            if '-->' in line:
                timestamp_line = line
                text_lines = lines[i+1:]
                break
        
        if not timestamp_line:
            continue
        
        # Parse timestamp: 00:00:00,000 --> 00:00:05,000
        match = re.match(
            r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})',
            timestamp_line.strip()
        )
        
        if not match:
            continue
        
        h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
        start_ms = int(h1) * 3600000 + int(m1) * 60000 + int(s1) * 1000 + int(ms1)
        end_ms = int(h2) * 3600000 + int(m2) * 60000 + int(s2) * 1000 + int(ms2)
        
        text = ' '.join(text_lines).strip()
        if not text:
            continue
        
        # Extract speaker if pattern provided
        speaker_label = None
        if speaker_pattern:
            speaker_match = re.match(speaker_pattern, text)
            if speaker_match:
                speaker_label = speaker_match.group(1)
                text = text[speaker_match.end():].strip()
                # Remove leading colon/dash if present
                text = re.sub(r'^[:\-]\s*', '', text)
        
        segments.append(TranscriptSegmentImport(
            start_ms=start_ms,
            end_ms=end_ms,
            text=text,
            speaker_label=speaker_label
        ))
    
    return segments


def parse_vtt_content(vtt_content: str, speaker_pattern: Optional[str] = None) -> List[TranscriptSegmentImport]:
    """Parse WebVTT format into transcript segments."""
    segments = []
    
    # Remove WEBVTT header and any metadata
    content = re.sub(r'^WEBVTT.*?\n\n', '', vtt_content, flags=re.DOTALL)
    
    # VTT format similar to SRT but timestamps use . instead of ,
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        
        # Find timestamp line
        timestamp_line = None
        text_start_idx = 0
        
        for i, line in enumerate(lines):
            if '-->' in line:
                timestamp_line = line
                text_start_idx = i + 1
                break
        
        if not timestamp_line:
            continue
        
        # Parse timestamp: 00:00:00.000 --> 00:00:05.000
        # VTT can also have simpler format: 00:00.000 --> 00:05.000
        match = re.match(
            r'(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})',
            timestamp_line.strip()
        )
        
        if not match:
            continue
        
        h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
        h1 = h1 or '00'
        h2 = h2 or '00'
        start_ms = int(h1) * 3600000 + int(m1) * 60000 + int(s1) * 1000 + int(ms1)
        end_ms = int(h2) * 3600000 + int(m2) * 60000 + int(s2) * 1000 + int(ms2)
        
        text = ' '.join(lines[text_start_idx:]).strip()
        # Remove VTT styling tags
        text = re.sub(r'<[^>]+>', '', text)
        
        if not text:
            continue
        
        speaker_label = None
        if speaker_pattern:
            speaker_match = re.match(speaker_pattern, text)
            if speaker_match:
                speaker_label = speaker_match.group(1)
                text = text[speaker_match.end():].strip()
                text = re.sub(r'^[:\-]\s*', '', text)
        
        segments.append(TranscriptSegmentImport(
            start_ms=start_ms,
            end_ms=end_ms,
            text=text,
            speaker_label=speaker_label
        ))
    
    return segments


def parse_plain_text(
    text_content: str, 
    format_hint: str = "dialogue",
    estimated_duration_ms: Optional[int] = None
) -> List[TranscriptSegmentImport]:
    """Parse plain text into transcript segments with estimated timing."""
    segments = []
    lines = [l.strip() for l in text_content.strip().split('\n') if l.strip()]
    
    if not lines:
        return segments
    
    if format_hint == "dialogue":
        # Format: "Speaker: text" or "Speaker - text"
        # Pattern matches: "Caregiver:", "Speaker 1:", "Client -", etc.
        dialogue_pattern = re.compile(r'^([A-Za-z0-9\s]+?)[\s]*[:\-]\s*(.+)$')
        
        total_words = sum(len(l.split()) for l in lines)
        words_per_ms = total_words / (estimated_duration_ms or 60000)  # Default 1 minute
        current_ms = 0
        
        for line in lines:
            match = dialogue_pattern.match(line)
            if match:
                speaker = match.group(1).strip()
                text = match.group(2).strip()
            else:
                speaker = None
                text = line
            
            if not text:
                continue
            
            # Estimate duration based on word count
            word_count = len(text.split())
            duration_ms = max(1000, int(word_count / words_per_ms)) if words_per_ms > 0 else 2000
            
            segments.append(TranscriptSegmentImport(
                start_ms=current_ms,
                end_ms=current_ms + duration_ms,
                text=text,
                speaker_label=speaker
            ))
            current_ms += duration_ms
    
    elif format_hint == "timestamped":
        # Format: "[00:00:00]" or "[00:00]" followed by text
        timestamp_pattern = re.compile(r'^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(.+)$')
        
        for i, line in enumerate(lines):
            match = timestamp_pattern.match(line)
            if match:
                hours_or_mins, mins_or_secs, secs, text = match.groups()
                
                if secs:  # HH:MM:SS format
                    start_ms = int(hours_or_mins) * 3600000 + int(mins_or_secs) * 60000 + int(secs) * 1000
                else:  # MM:SS format
                    start_ms = int(hours_or_mins) * 60000 + int(mins_or_secs) * 1000
                
                # End time is either next timestamp or estimated
                end_ms = start_ms + max(1000, len(text.split()) * 300)  # ~200ms per word
                
                # Check speaker pattern in text
                speaker = None
                speaker_match = re.match(r'^([A-Za-z0-9\s]+?)[\s]*[:\-]\s*(.+)$', text)
                if speaker_match:
                    speaker = speaker_match.group(1).strip()
                    text = speaker_match.group(2).strip()
                
                segments.append(TranscriptSegmentImport(
                    start_ms=start_ms,
                    end_ms=end_ms,
                    text=text,
                    speaker_label=speaker
                ))
        
        # Adjust end times to match next start time
        for i in range(len(segments) - 1):
            segments[i].end_ms = segments[i + 1].start_ms
    
    else:  # paragraph format
        # Treat as continuous text, split into chunks
        all_text = ' '.join(lines)
        words = all_text.split()
        
        chunk_size = 20  # words per segment
        duration = estimated_duration_ms or len(words) * 300  # ~300ms per word
        ms_per_word = duration / len(words) if words else 1
        
        current_ms = 0
        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)
            chunk_duration = int(len(chunk_words) * ms_per_word)
            
            segments.append(TranscriptSegmentImport(
                start_ms=int(current_ms),
                end_ms=int(current_ms + chunk_duration),
                text=chunk_text,
                speaker_label=None
            ))
            current_ms += chunk_duration
    
    return segments


def create_transcript_segments(
    db: Session,
    visit_id: UUID,
    segments: List[TranscriptSegmentImport],
    source: TranscriptSource,
    external_reference: Optional[str] = None,
    replace_existing: bool = False
) -> Tuple[int, int, int]:
    """Create transcript segments in database. Returns (count, duration_ms, word_count)."""
    
    if replace_existing:
        # Delete existing segments for this visit
        db.query(TranscriptSegment).filter(TranscriptSegment.visit_id == visit_id).delete()
    
    now = datetime.now(timezone.utc)
    total_duration_ms = 0
    word_count = 0
    
    for seg in segments:
        segment = TranscriptSegment(
            id=uuid4(),
            visit_id=visit_id,
            start_ms=seg.start_ms,
            end_ms=seg.end_ms,
            text=seg.text,
            speaker_label=seg.speaker_label,
            confidence=seg.confidence,
            source=source.value,
            external_reference=external_reference,
            created_at=now,
            updated_at=now,
        )
        db.add(segment)
        
        total_duration_ms = max(total_duration_ms, seg.end_ms)
        word_count += len(seg.text.split())
    
    # Update visit pipeline state
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if visit:
        pipeline_state = visit.pipeline_state or {}
        pipeline_state["transcription"] = {
            "status": "completed",
            "source": source.value,
            "imported_at": now.isoformat(),
            "segments_count": len(segments)
        }
        # If speakers are provided, mark alignment as done too
        if any(seg.speaker_label for seg in segments):
            pipeline_state["alignment"] = {
                "status": "completed",
                "source": "imported",
                "imported_at": now.isoformat()
            }
        visit.pipeline_state = pipeline_state
    
    db.commit()
    
    return len(segments), total_duration_ms, word_count


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/{visit_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the transcript for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).order_by(TranscriptSegment.start_ms).all()
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transcript available. Upload audio or import a transcript."
        )
    
    # Calculate totals
    total_duration_ms = max(s.end_ms for s in segments) if segments else 0
    word_count = sum(len(s.text.split()) for s in segments)
    
    # Determine primary source
    sources = set(s.source for s in segments if s.source)
    primary_source = list(sources)[0] if len(sources) == 1 else "mixed"
    
    return TranscriptResponse(
        visit_id=visit_id,
        segments=[TranscriptSegmentResponse.model_validate(s) for s in segments],
        total_duration_ms=total_duration_ms,
        word_count=word_count,
        source=primary_source,
    )


@router.post("/{visit_id}/transcript/import", response_model=TranscriptImportResponse)
async def import_transcript(
    visit_id: UUID,
    request: TranscriptImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import transcript segments directly (JSON format).
    
    Use this when you have a transcript from another source (e.g., another transcription
    service, manual transcription, etc.) and want to import it for billing/note generation.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # Validate segments
    for i, seg in enumerate(request.segments):
        if seg.end_ms <= seg.start_ms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Segment {i}: end_ms must be greater than start_ms"
            )
    
    # Sort segments by start time
    sorted_segments = sorted(request.segments, key=lambda s: s.start_ms)
    
    count, duration_ms, word_count = create_transcript_segments(
        db=db,
        visit_id=visit_id,
        segments=sorted_segments,
        source=request.source,
        external_reference=request.external_reference,
        replace_existing=request.replace_existing,
    )
    
    logger.info(f"Imported {count} transcript segments for visit {visit_id} from {request.source}")
    
    return TranscriptImportResponse(
        visit_id=visit_id,
        segments_imported=count,
        total_duration_ms=duration_ms,
        word_count=word_count,
        source=request.source.value,
        message=f"Successfully imported {count} segments ({word_count} words)"
    )


@router.post("/{visit_id}/transcript/import/srt", response_model=TranscriptImportResponse)
async def import_transcript_srt(
    visit_id: UUID,
    request: SRTImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import transcript from SRT subtitle format.
    
    SRT is a common subtitle format used by many transcription services.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    try:
        segments = parse_srt_content(request.srt_content, request.speaker_pattern)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse SRT content: {str(e)}"
        )
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid segments found in SRT content"
        )
    
    count, duration_ms, word_count = create_transcript_segments(
        db=db,
        visit_id=visit_id,
        segments=segments,
        source=TranscriptSource.IMPORT_SRT,
        replace_existing=request.replace_existing,
    )
    
    return TranscriptImportResponse(
        visit_id=visit_id,
        segments_imported=count,
        total_duration_ms=duration_ms,
        word_count=word_count,
        source=TranscriptSource.IMPORT_SRT.value,
        message=f"Successfully imported {count} segments from SRT ({word_count} words)"
    )


@router.post("/{visit_id}/transcript/import/vtt", response_model=TranscriptImportResponse)
async def import_transcript_vtt(
    visit_id: UUID,
    request: VTTImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import transcript from WebVTT format.
    
    WebVTT is used by many web-based transcription services.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    try:
        segments = parse_vtt_content(request.vtt_content, request.speaker_pattern)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse VTT content: {str(e)}"
        )
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid segments found in VTT content"
        )
    
    count, duration_ms, word_count = create_transcript_segments(
        db=db,
        visit_id=visit_id,
        segments=segments,
        source=TranscriptSource.IMPORT_VTT,
        replace_existing=request.replace_existing,
    )
    
    return TranscriptImportResponse(
        visit_id=visit_id,
        segments_imported=count,
        total_duration_ms=duration_ms,
        word_count=word_count,
        source=TranscriptSource.IMPORT_VTT.value,
        message=f"Successfully imported {count} segments from VTT ({word_count} words)"
    )


@router.post("/{visit_id}/transcript/import/text", response_model=TranscriptImportResponse)
async def import_transcript_text(
    visit_id: UUID,
    request: PlainTextImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import transcript from plain text.
    
    Supports multiple formats:
    - **dialogue**: "Speaker: text" format (most common for conversations)
    - **timestamped**: "[00:00] text" format
    - **paragraph**: Continuous text (will be split into chunks)
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    try:
        segments = parse_plain_text(
            request.text_content,
            request.format_hint,
            request.estimated_duration_ms
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse text content: {str(e)}"
        )
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid segments found in text content"
        )
    
    count, duration_ms, word_count = create_transcript_segments(
        db=db,
        visit_id=visit_id,
        segments=segments,
        source=TranscriptSource.IMPORT_TEXT,
        replace_existing=request.replace_existing,
    )
    
    return TranscriptImportResponse(
        visit_id=visit_id,
        segments_imported=count,
        total_duration_ms=duration_ms,
        word_count=word_count,
        source=TranscriptSource.IMPORT_TEXT.value,
        message=f"Successfully imported {count} segments from text ({word_count} words)"
    )


def detect_transcript_format(content: str) -> tuple[str, str]:
    """
    Auto-detect the format of transcript content.
    Returns (format_type, text_format_hint).
    format_type: 'srt', 'vtt', 'json', 'text'
    text_format_hint: 'dialogue', 'timestamped', 'paragraph' (only for text)
    """
    content = content.strip()
    
    # Check for JSON
    if content.startswith('[') or content.startswith('{'):
        try:
            import json
            parsed = json.loads(content)
            if isinstance(parsed, (list, dict)):
                return 'json', ''
        except:
            pass
    
    # Check for WebVTT
    if content.upper().startswith('WEBVTT'):
        return 'vtt', ''
    
    # Check for SRT format (numbered blocks with timestamps)
    # SRT typically starts with "1\n00:00:..." or has multiple blocks with arrow timestamps
    srt_pattern = r'^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->'
    if re.search(srt_pattern, content, re.MULTILINE):
        return 'srt', ''
    
    # Check for VTT-style timestamps without header
    vtt_pattern = r'^\d{2}:\d{2}[:.]\d{3}\s*-->'
    if re.search(vtt_pattern, content, re.MULTILINE):
        return 'vtt', ''
    
    # Now check plain text formats
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    if not lines:
        return 'text', 'paragraph'
    
    # Check for timestamped format: [00:00] or [00:00:00]
    timestamped_pattern = r'^\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s+'
    timestamped_count = sum(1 for line in lines if re.match(timestamped_pattern, line))
    if timestamped_count > len(lines) * 0.5:  # More than 50% have timestamps
        return 'text', 'timestamped'
    
    # Check for dialogue format: "Speaker: text" or "Speaker - text"
    dialogue_pattern = r'^[A-Za-z0-9\s]+[\s]*[:\-]\s*.+'
    dialogue_count = sum(1 for line in lines if re.match(dialogue_pattern, line))
    if dialogue_count > len(lines) * 0.3:  # More than 30% look like dialogue
        return 'text', 'dialogue'
    
    # Default to paragraph
    return 'text', 'paragraph'


@router.post("/{visit_id}/transcript/import/auto")
async def import_transcript_auto(
    visit_id: UUID,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-detect format and import transcript.
    
    This endpoint automatically detects whether the content is:
    - JSON (structured segments)
    - SRT (SubRip subtitle format)
    - VTT (WebVTT format)
    - Plain text (dialogue, timestamped, or paragraph)
    
    Just paste or upload any transcript and we'll figure out the format.
    """
    content = request.get('content', '').strip()
    replace_existing = request.get('replace_existing', True)
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content provided"
        )
    
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # Detect format
    format_type, text_hint = detect_transcript_format(content)
    detected_format = format_type
    if text_hint:
        detected_format = f"{format_type} ({text_hint})"
    
    logger.info(f"Auto-detected format: {detected_format} for visit {visit_id}")
    
    # Parse based on detected format
    try:
        if format_type == 'json':
            import json
            parsed = json.loads(content)
            segments_data = parsed if isinstance(parsed, list) else parsed.get('segments', [parsed])
            
            segments = []
            for seg in segments_data:
                segments.append(TranscriptSegmentImport(
                    start_ms=seg.get('start_ms', 0),
                    end_ms=seg.get('end_ms', seg.get('start_ms', 0) + 1000),
                    text=seg.get('text', ''),
                    speaker_label=seg.get('speaker_label') or seg.get('speaker'),
                    confidence=seg.get('confidence')
                ))
            source = TranscriptSource.IMPORT_JSON
            
        elif format_type == 'srt':
            segments = parse_srt_content(content)
            source = TranscriptSource.IMPORT_SRT
            
        elif format_type == 'vtt':
            segments = parse_vtt_content(content)
            source = TranscriptSource.IMPORT_VTT
            
        else:  # text
            segments = parse_plain_text(content, text_hint or 'dialogue')
            source = TranscriptSource.IMPORT_TEXT
            
    except Exception as e:
        logger.error(f"Failed to parse transcript: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse transcript: {str(e)}"
        )
    
    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid segments found in content. Please check the format."
        )
    
    # Create segments
    count, duration_ms, word_count = create_transcript_segments(
        db=db,
        visit_id=visit_id,
        segments=segments,
        source=source,
        replace_existing=replace_existing,
    )
    
    logger.info(f"Imported {count} segments for visit {visit_id}, detected as {detected_format}")
    
    return {
        "visit_id": str(visit_id),
        "segments_imported": count,
        "total_duration_ms": duration_ms,
        "word_count": word_count,
        "detected_format": detected_format,
        "source": source.value,
        "message": f"Successfully imported {count} segments ({word_count} words) - detected as {detected_format}"
    }


@router.delete("/{visit_id}/transcript")
async def delete_transcript(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all transcript segments for a visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    deleted_count = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).delete()
    
    # Update pipeline state
    pipeline_state = visit.pipeline_state or {}
    pipeline_state["transcription"] = {"status": "pending"}
    pipeline_state["alignment"] = {"status": "pending"}
    visit.pipeline_state = pipeline_state
    
    db.commit()
    
    return {"message": f"Deleted {deleted_count} transcript segments"}
