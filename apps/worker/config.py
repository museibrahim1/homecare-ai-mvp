"""Worker configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+psycopg://palmcare:palmcare@localhost:5432/palmcare"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # S3/MinIO
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minio"
    s3_secret_key: str = "minio12345"
    s3_bucket: str = "palmcare-audio"
    
    # ASR Configuration
    # Options: tiny, base, small, medium, large-v2, large-v3
    # tiny = fastest (~10x realtime), large-v3 = most accurate
    asr_model_size: str = "small"  # Good balance of speed/accuracy
    use_gpu: bool = False
    
    # Cloud ASR (OpenAI Whisper API) - ~$0.006/minute
    # Set to True to use OpenAI API instead of local model
    use_openai_whisper: bool = True
    
    # Deepgram Nova-3 - Transcription + built-in diarization (~$0.0077/min)
    # Set DEEPGRAM_API_KEY to enable; takes priority over Whisper when set.
    # Deepgram's diarize=True replaces the old pyannote step, saving ~$0.08/assessment.
    deepgram_api_key: str = ""
    use_deepgram: bool = True  # Use Deepgram when API key is available
    
    # Legacy diarization config (pyannote removed — Deepgram handles this now)
    hf_token: str = ""  # Kept for backward compat; no longer used at runtime
    skip_diarization: bool = True  # Always True — Deepgram diarizes inline
    
    # LLM Configuration
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-4-20250514"
    llm_temperature: float = 0.7
    
    # Pipeline Configuration
    parallel_pipeline: bool = True  # Run independent steps in parallel
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
