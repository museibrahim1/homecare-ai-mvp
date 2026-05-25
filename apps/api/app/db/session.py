from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _build_engine():
    """Build the SQLAlchemy engine with pool args that match the driver.

    Postgres benefits from a real connection pool. SQLite (used by tests
    and `sqlite:///:memory:`) doesn't accept pool_size/max_overflow, so
    we omit those args when the URL looks like SQLite.

    Also enforces SSL when talking to a managed Postgres in production
    unless `?sslmode=` is already set on the DSN.
    """
    import os
    url = settings.database_url
    is_sqlite = url.startswith("sqlite")
    is_production = bool(os.getenv("RAILWAY_ENVIRONMENT"))

    connect_args = {}
    if not is_sqlite:
        if is_production and "sslmode" not in url:
            connect_args["sslmode"] = "require"
        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args=connect_args,
        )

    # SQLite branch — supports neither pool sizing nor sslmode.
    return create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if is_sqlite else {},
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
