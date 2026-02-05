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
    
    # JWT - HIPAA: Shorter token lifetime for security
    jwt_secret: str = "change-me-to-a-secure-random-string"
    jwt_issuer: str = "homecare-ai"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 1  # HIPAA: 1 hour token lifetime (was 24)
    
    # HIPAA Security Settings
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_number: bool = True
    password_require_special: bool = False
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # ASR
    asr_model_size: str = "medium"
    use_gpu: bool = False
    
    # Application
    debug: bool = True
    log_level: str = "INFO"
    
    # Google Calendar
    google_client_id: str = ""
    google_client_secret: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
