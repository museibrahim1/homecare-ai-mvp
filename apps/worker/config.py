"""Worker configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+psycopg://homecare:homecare@localhost:5432/homecare"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # S3/MinIO
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minio"
    s3_secret_key: str = "minio12345"
    s3_bucket: str = "homecare-audio"
    
    # ASR Configuration
    asr_model_size: str = "medium"
    use_gpu: bool = False
    
    # Diarization
    hf_token: str = ""  # Hugging Face token for pyannote models
    
    # LLM Configuration (OpenAI)
    openai_api_key: str = ""  # OpenAI API key for contract/note generation
    llm_model: str = "gpt-4o-mini"  # Model to use (gpt-4o-mini, gpt-4o, gpt-4-turbo)
    llm_temperature: float = 0.7  # Generation temperature (0.0-2.0)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
