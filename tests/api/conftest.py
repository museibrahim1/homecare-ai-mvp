"""Test fixtures for API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api'))

# Set env var to disable seeding in tests BEFORE importing app
os.environ["TESTING"] = "1"

from app.main import app
from app.db.base import Base
from app.core.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole


# Use PostgreSQL from environment (CI) or fallback to SQLite for local dev
# Note: SQLite doesn't support JSONB, so PostgreSQL is required for full tests
TEST_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Reset module-level rate limiters and caches between each test.

    The auth router and security module keep in-memory dicts
    (_rate_limit_store, _login_attempts) that persist across tests in the
    same process.  After ~10 login calls the rate limiter starts returning
    HTTP 429, which breaks the auth_headers fixture.
    """
    # --- auth router rate-limit store ---
    from app.routers.auth import _rate_limit_store
    _rate_limit_store.clear()

    # --- security module login-attempt tracker ---
    import app.core.security as sec
    sec._login_attempts.clear()
    sec._redis_client = None          # force fresh Redis probe each test

    yield

    # clean up again after the test (belt-and-suspenders)
    _rate_limit_store.clear()
    sec._login_attempts.clear()
    sec._redis_client = None


@pytest.fixture(scope="function")
def db_engine():
    """Create test database engine."""
    if TEST_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            TEST_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        # PostgreSQL for CI - use psycopg driver
        engine = create_engine(TEST_DATABASE_URL)
    
    # Drop all tables first to ensure clean state (with cascade for foreign keys)
    with engine.connect() as conn:
        # Disable foreign key checks and truncate in PostgreSQL
        if not TEST_DATABASE_URL.startswith("sqlite"):
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
    
    Base.metadata.create_all(bind=engine)
    yield engine
    # Clean up after test
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded_db(db_session):
    """Seed database with test data."""
    admin = User(
        email="admin@palmtai.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role=UserRole.admin,  # lowercase enum value
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    return db_session


@pytest.fixture(scope="function")
def auth_headers(client, seeded_db):
    """Get authentication headers for admin user."""
    response = client.post(
        "/auth/login",
        json={"email": "admin@palmtai.com", "password": "admin123"}
    )
    data = response.json()
    assert response.status_code == 200, (
        f"Login failed (HTTP {response.status_code}): {data}"
    )
    assert "access_token" in data, f"Missing access_token in response: {data}"
    return {"Authorization": f"Bearer {data['access_token']}"}
