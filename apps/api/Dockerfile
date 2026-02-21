# Version: v25 - Resilient startup: migrations don't block server
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application code first
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Expose port (Railway uses PORT env variable)
EXPOSE 8000

# Run database migrations then start server
# Migrations are best-effort: server starts regardless so healthcheck passes
CMD ["sh", "-c", "echo '=== Running migrations ===' && alembic upgrade head 2>&1 && echo '=== Migrations OK ===' || echo '!!! Migration failed, starting server anyway !!!'; echo '=== Starting uvicorn ===' && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]
