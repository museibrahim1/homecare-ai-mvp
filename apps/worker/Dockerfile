FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run Celery worker
CMD ["celery", "-A", "worker", "worker", "--loglevel=info", "--concurrency=2"]
# Trigger rebuild Sat Jan 31 23:08:21 CST 2026
