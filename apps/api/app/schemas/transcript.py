from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class TranscriptSource(str, Enum):
    """Source of transcript data"""
    WHISPER = "whisper"
    WHISPER_API = "whisper_api"
    IMPORT_JSON = "import_json"
    IMPORT_SRT = "import_srt"
    IMPORT_VTT = "import_vtt"
    IMPORT_TEXT = "import_text"
    EXTERNAL_API = "external_api"


class TranscriptSegmentResponse(BaseModel):
    id: UUID
    visit_id: UUID
    start_ms: int
    end_ms: int
    text: str
    speaker_label: Optional[str] = None
    confidence: Optional[float] = None
    source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptResponse(BaseModel):
    visit_id: UUID
    segments: List[TranscriptSegmentResponse]
    total_duration_ms: int
    word_count: int
    source: Optional[str] = None  # Primary source of transcript


# =============================================================================
# Import Schemas - For importing transcripts from external sources
# =============================================================================

class TranscriptSegmentImport(BaseModel):
    """Single segment for import"""
    start_ms: int = Field(..., ge=0, description="Start time in milliseconds")
    end_ms: int = Field(..., ge=0, description="End time in milliseconds")
    text: str = Field(..., min_length=1, description="Transcript text")
    speaker_label: Optional[str] = Field(None, description="Speaker identifier (e.g., 'Speaker A', 'Caregiver', 'Client')")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Confidence score 0-1")


class TranscriptImportRequest(BaseModel):
    """Request to import transcript segments directly"""
    segments: List[TranscriptSegmentImport] = Field(..., min_length=1, description="List of transcript segments")
    source: TranscriptSource = Field(default=TranscriptSource.IMPORT_JSON, description="Source of the transcript")
    external_reference: Optional[str] = Field(None, description="External reference ID or URL")
    replace_existing: bool = Field(default=False, description="If true, replace existing transcript segments")
    skip_further_processing: bool = Field(default=False, description="If true, skip billing/note generation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "segments": [
                    {"start_ms": 0, "end_ms": 5000, "text": "Hello, how are you today?", "speaker_label": "Caregiver"},
                    {"start_ms": 5000, "end_ms": 10000, "text": "I'm doing well, thank you for asking.", "speaker_label": "Client"},
                ],
                "source": "import_json",
                "replace_existing": True
            }
        }


class TranscriptImportResponse(BaseModel):
    """Response after importing transcript"""
    visit_id: UUID
    segments_imported: int
    total_duration_ms: int
    word_count: int
    source: str
    message: str


class SRTImportRequest(BaseModel):
    """Request to import SRT subtitle file content"""
    srt_content: str = Field(..., min_length=1, description="Raw SRT file content")
    speaker_pattern: Optional[str] = Field(
        None, 
        description="Regex pattern to extract speaker from text (e.g., '^(Speaker \\d+):')"
    )
    replace_existing: bool = Field(default=False)
    
    class Config:
        json_schema_extra = {
            "example": {
                "srt_content": "1\n00:00:00,000 --> 00:00:05,000\nHello, how are you?\n\n2\n00:00:05,000 --> 00:00:10,000\nI'm doing well.",
                "replace_existing": True
            }
        }


class VTTImportRequest(BaseModel):
    """Request to import WebVTT file content"""
    vtt_content: str = Field(..., min_length=1, description="Raw VTT file content")
    speaker_pattern: Optional[str] = Field(None, description="Regex pattern to extract speaker")
    replace_existing: bool = Field(default=False)


class PlainTextImportRequest(BaseModel):
    """Request to import plain text with optional timestamps"""
    text_content: str = Field(..., min_length=1, description="Plain text content")
    format_hint: Literal["dialogue", "paragraph", "timestamped"] = Field(
        default="dialogue",
        description="Format hint: 'dialogue' (Speaker: text), 'paragraph' (continuous text), 'timestamped' ([00:00] text)"
    )
    estimated_duration_ms: Optional[int] = Field(None, description="Estimated total duration if no timestamps")
    replace_existing: bool = Field(default=False)
    
    class Config:
        json_schema_extra = {
            "example": {
                "text_content": "Caregiver: Hello, how are you feeling today?\nClient: I'm feeling much better, thank you.",
                "format_hint": "dialogue",
                "replace_existing": True
            }
        }


class TranscriptExportFormat(str, Enum):
    """Export format options"""
    JSON = "json"
    SRT = "srt"
    VTT = "vtt"
    TXT = "txt"
    DOCX = "docx"
