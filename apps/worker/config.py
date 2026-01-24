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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
