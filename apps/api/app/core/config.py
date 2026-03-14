from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import logging
import secrets

_config_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

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
    
@lru_cache()
def get_settings() -> Settings:
    import os
    s = Settings()
    is_production = bool(os.getenv("RAILWAY_ENVIRONMENT"))
    if not s.jwt_secret:
        if is_production:
            raise RuntimeError(
                "FATAL: JWT_SECRET is required in production. "
                "Set the JWT_SECRET environment variable."
            )
        _config_logger.warning(
            "JWT_SECRET not set — using auto-generated secret (dev only). "
            "Sessions will NOT survive restarts."
        )
        s.jwt_secret = secrets.token_urlsafe(64)
    if "palmcare:palmcare@localhost" in s.database_url and is_production:
        raise RuntimeError(
            "FATAL: Using default local database credentials in production. "
            "Set the DATABASE_URL environment variable."
        )
    return s


settings = get_settings()
