"""Time utilities."""

from datetime import datetime, timezone


def ms_to_timestamp(ms: int) -> str:
    """Convert milliseconds to HH:MM:SS format."""
    seconds = ms // 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def timestamp_to_ms(timestamp: str) -> int:
    """Convert HH:MM:SS or MM:SS to milliseconds."""
    parts = timestamp.split(":")
    
    if len(parts) == 3:
        hours, minutes, seconds = map(int, parts)
    elif len(parts) == 2:
        hours = 0
        minutes, seconds = map(int, parts)
    else:
        return 0
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000


def utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)
