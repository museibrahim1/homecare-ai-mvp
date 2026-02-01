"""S3/MinIO storage utilities for worker."""

import uuid
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
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


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for an S3/MinIO object.
    
    Args:
        key: The S3 key of the object
        expires_in: URL expiration time in seconds (default 1 hour)
        
    Returns:
        Presigned URL string
    """
    client = get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return None


def upload_audio_file(
    audio_data: bytes,
    filename: str,
    content_type: str = "audio/wav",
    folder: str = "audio",
) -> str:
    """
    Upload audio data to S3/MinIO.
    
    Args:
        audio_data: The audio file bytes
        filename: Original filename
        content_type: MIME type of the file
        folder: Folder/prefix in the bucket
        
    Returns:
        The S3 key (file path) where the file was uploaded
    """
    client = get_s3_client()
    
    # Generate unique key
    unique_id = str(uuid.uuid4())
    key = f"{folder}/{unique_id}_{filename}"
    
    try:
        client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=audio_data,
            ContentType=content_type,
        )
        return key
    except ClientError as e:
        print(f"Error uploading file: {e}")
        return None
