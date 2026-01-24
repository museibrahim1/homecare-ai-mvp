"""Text utilities."""

import re
from typing import List


def clean_transcript_text(text: str) -> str:
    """Clean up transcript text."""
    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def truncate_text(text: str, max_length: int = 200, suffix: str = "...") -> str:
    """Truncate text to max length."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def extract_keywords(text: str, min_length: int = 3) -> List[str]:
    """Extract keywords from text."""
    # Simple keyword extraction - remove common words
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall", "can", "this",
        "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
        "what", "which", "who", "when", "where", "why", "how", "all", "each",
        "every", "both", "few", "more", "most", "other", "some", "such", "no",
        "not", "only", "same", "so", "than", "too", "very", "just", "also",
    }
    
    # Extract words
    words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    
    # Filter
    keywords = [
        word for word in words
        if len(word) >= min_length and word not in stop_words
    ]
    
    # Return unique keywords
    return list(dict.fromkeys(keywords))
