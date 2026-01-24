"""S3/MinIO storage utilities for worker."""

import boto3
from botocore.config import Config
from config import settings


def get_s3_client():
    """Get configured S3/MinIO client."""
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def download_file(key: str) -> bytes:
    """Download a file from S3/MinIO."""
    client = get_s3_client()
    response = client.get_object(Bucket=settings.s3_bucket, Key=key)
    return response["Body"].read()


def download_file_to_path(key: str, local_path: str):
    """Download a file to a local path."""
    content = download_file(key)
    with open(local_path, "wb") as f:
        f.write(content)
    return local_path
