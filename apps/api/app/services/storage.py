import boto3
from botocore.config import Config
from app.core.config import settings


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


def ensure_bucket_exists():
    """Create the bucket if it doesn't exist."""
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except client.exceptions.ClientError:
        client.create_bucket(Bucket=settings.s3_bucket)


def upload_file_to_s3(key: str, content: bytes, content_type: str = None):
    """Upload a file to S3/MinIO."""
    client = get_s3_client()
    ensure_bucket_exists()
    
    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type
    
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=content,
        **extra_args,
    )
    
    return key


def download_file_from_s3(key: str) -> bytes:
    """Download a file from S3/MinIO."""
    client = get_s3_client()
    
    response = client.get_object(Bucket=settings.s3_bucket, Key=key)
    return response["Body"].read()


def get_presigned_url(key: str, expiration: int = 3600) -> str:
    """Generate a presigned URL for downloading a file."""
    client = get_s3_client()
    
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expiration,
    )


def delete_file_from_s3(key: str):
    """Delete a file from S3/MinIO."""
    client = get_s3_client()
    client.delete_object(Bucket=settings.s3_bucket, Key=key)
