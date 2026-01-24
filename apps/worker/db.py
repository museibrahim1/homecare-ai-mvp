"""Database session for worker."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Get database session."""
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise
