#!/usr/bin/env python3
"""Run the FastAPI app on 127.0.0.1:8000 against docker Postgres/Redis/MinIO.

Does not print secrets. Loads repo-root .env and fills DATABASE_URL from
POSTGRES_* when it is not already set.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

if not os.environ.get("DATABASE_URL"):
    user = os.environ.get("POSTGRES_USER", "homecare")
    password = os.environ.get("POSTGRES_PASSWORD", "")
    db = os.environ.get("POSTGRES_DB", "homecare")
    os.environ["DATABASE_URL"] = (
        f"postgresql+psycopg://{user}:{password}@127.0.0.1:5432/{db}"
    )
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/0")
os.environ.setdefault("S3_ENDPOINT_URL", "http://127.0.0.1:9000")
if not os.environ.get("S3_ACCESS_KEY"):
    os.environ["S3_ACCESS_KEY"] = os.environ.get("MINIO_ROOT_USER", "")
if not os.environ.get("S3_SECRET_KEY"):
    os.environ["S3_SECRET_KEY"] = os.environ.get("MINIO_ROOT_PASSWORD", "")
os.environ.setdefault("S3_BUCKET", "palmcare-audio")

# Local sandbox: never require production-only gates.
os.environ.setdefault("DEBUG", "true")

os.chdir(ROOT / "apps" / "api")

import uvicorn

if __name__ == "__main__":
    print("Starting local API on http://127.0.0.1:8000")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=False,
    )
