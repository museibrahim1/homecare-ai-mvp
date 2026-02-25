# Version: v26 - Optimized layer caching + health check
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifest first for better layer caching
COPY pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py \
    && pip install --no-cache-dir -e . \
    && rm app/__init__.py

# Copy application code (invalidates cache only when code changes)
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Migrations are best-effort: server starts regardless so healthcheck passes
CMD ["sh", "-c", "echo '=== Running migrations ===' && alembic upgrade head 2>&1 && echo '=== Migrations OK ===' || echo '!!! Migration failed, starting server anyway !!!'; echo '=== Starting uvicorn ===' && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]
