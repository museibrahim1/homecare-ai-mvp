# Version: v22 - Add admin endpoint to clear all businesses
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

# Run database migrations and start server
# Use PORT env var from Railway (defaults to 8000)
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
