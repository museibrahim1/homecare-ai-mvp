"""
Alignment/Merge Module

Aligns transcript segments with diarization speaker turns.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def align_transcript_with_diarization(
    segments: List[Dict[str, Any]],
    turns: List[Dict[str, Any]],
    overlap_threshold: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Align transcript segments with diarization turns.
    
    For each transcript segment, find the speaker turn that overlaps most
    and assign the speaker label.
    
    Args:
        segments: List of transcript segments with start_ms, end_ms, text
        turns: List of diarization turns with speaker, start_ms, end_ms
        overlap_threshold: Minimum overlap ratio to assign speaker
    
    Returns:
        List of aligned segments with speaker_label added
    """
    logger.info(f"Aligning {len(segments)} segments with {len(turns)} speaker turns")
    
    aligned = []
    
    for segment in segments:
        seg_start = segment["start_ms"]
        seg_end = segment["end_ms"]
        seg_duration = seg_end - seg_start
        
        if seg_duration <= 0:
            segment["speaker_label"] = "Unknown"
            aligned.append(segment)
            continue
        
        # Find overlapping speaker turns
        best_speaker = None
        best_overlap = 0
        
        for turn in turns:
            turn_start = turn["start_ms"]
            turn_end = turn["end_ms"]
            
            # Calculate overlap
            overlap_start = max(seg_start, turn_start)
            overlap_end = min(seg_end, turn_end)
            overlap = max(0, overlap_end - overlap_start)
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = turn["speaker"]
        
        # Assign speaker if overlap is sufficient
        overlap_ratio = best_overlap / seg_duration if seg_duration > 0 else 0
        
        if best_speaker and overlap_ratio >= overlap_threshold:
            segment["speaker_label"] = format_speaker_label(best_speaker)
        else:
            segment["speaker_label"] = "Unknown"
        
        aligned.append(segment)
    
    logger.info(f"Alignment complete: {len(aligned)} segments aligned")
    return aligned


def format_speaker_label(speaker: str) -> str:
    """
    Format speaker label for display.
    
    SPEAKER_00 -> "Speaker A"
    SPEAKER_01 -> "Speaker B"
    etc.
    """
    if speaker.startswith("SPEAKER_"):
        try:
            num = int(speaker.split("_")[1])
            return f"Speaker {chr(65 + num)}"  # A, B, C, ...
        except (IndexError, ValueError):
            pass
    
    return speaker


def identify_caregiver_speaker(
    segments: List[Dict[str, Any]],
    caregiver_keywords: List[str] = None,
) -> str:
    """
    Attempt to identify which speaker is the caregiver based on language patterns.
    
    Caregivers typically:
    - Use more directive language ("let me help", "time to take")
    - Ask health-related questions
    - Discuss tasks and schedules
    
    Returns the speaker label most likely to be the caregiver.
    """
    if caregiver_keywords is None:
        caregiver_keywords = [
            "let me", "help you", "medication", "medicine", "pills",
            "blood pressure", "exercise", "breakfast", "lunch", "dinner",
            "schedule", "appointment", "check", "monitor", "assist",
        ]
    
    speaker_scores = {}
    
    for segment in segments:
        speaker = segment.get("speaker_label", "")
        text = segment.get("text", "").lower()
        
        if not speaker or speaker == "Unknown":
            continue
        
        if speaker not in speaker_scores:
            speaker_scores[speaker] = 0
        
        # Count keyword matches
        for keyword in caregiver_keywords:
            if keyword in text:
                speaker_scores[speaker] += 1
    
    if not speaker_scores:
        return "Unknown"
    
    # Return speaker with highest score
    return max(speaker_scores, key=speaker_scores.get)
