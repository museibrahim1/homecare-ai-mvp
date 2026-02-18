from pydantic_settings import BaseSettings
from functools import lru_cache
import logging
import secrets

_config_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+psycopg://palmcare:palmcare@localhost:5432/palmcare"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # S3/MinIO
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = ""  # Set S3_ACCESS_KEY env var
    s3_secret_key: str = ""  # Set S3_SECRET_KEY env var
    s3_bucket: str = "palmcare-audio"
    
    # JWT - HIPAA: Shorter token lifetime for security
    jwt_secret: str = ""  # REQUIRED: set JWT_SECRET env var
    jwt_issuer: str = "palmcare-ai"
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
    debug: bool = False
    log_level: str = "INFO"
    
    # Google Calendar
    google_client_id: str = ""
    google_client_secret: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    # Auto-generate JWT secret if not provided (warns in production)
    if not s.jwt_secret:
        generated = secrets.token_urlsafe(64)
        _config_logger.warning(
            "JWT_SECRET not set — using auto-generated secret. "
            "Sessions will NOT survive restarts. Set JWT_SECRET env var for production."
        )
        s.jwt_secret = generated
    return s


settings = get_settings()
