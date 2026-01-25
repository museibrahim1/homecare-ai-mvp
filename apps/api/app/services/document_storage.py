"""
Document Storage Service

Handles secure document uploads and retrieval for business verification.
Uses MinIO for object storage with signed URLs for secure access.
"""

import os
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, BinaryIO, Tuple
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Allowed file types for document uploads
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class DocumentStorageService:
    """
    Service for storing and retrieving business verification documents.
    
    Documents are stored in MinIO with the following structure:
    - business-documents/
      - {business_id}/
        - {document_type}/
          - {uuid}_{original_filename}
    """
    
    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: str = "business-documents",
    ):
        self.endpoint_url = endpoint_url or os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.access_key = access_key or os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = secret_key or os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.bucket_name = bucket_name
        
        # Create S3 client for MinIO
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",  # MinIO doesn't care but boto3 needs it
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create the bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
            except ClientError as e:
                logger.error(f"Failed to create bucket: {e}")
    
    def upload_document(
        self,
        business_id: str,
        document_type: str,
        file_content: bytes,
        original_filename: str,
        mime_type: str,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Upload a document to storage.
        
        Args:
            business_id: UUID of the business
            document_type: Type of document (e.g., "business_license")
            file_content: Raw file bytes
            original_filename: Original name of the file
            mime_type: MIME type of the file
            
        Returns:
            Tuple of (success, file_path or error message, file_size)
        """
        # Validate file type
        if mime_type not in ALLOWED_MIME_TYPES:
            return False, f"File type not allowed: {mime_type}", None
        
        # Validate file size
        if len(file_content) > MAX_FILE_SIZE:
            return False, f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB", None
        
        # Generate unique filename
        file_ext = ALLOWED_MIME_TYPES.get(mime_type, "")
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = self._sanitize_filename(original_filename)
        new_filename = f"{unique_id}_{safe_filename}"
        
        # Build path
        file_path = f"{business_id}/{document_type}/{new_filename}"
        
        try:
            # Upload to MinIO
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=file_content,
                ContentType=mime_type,
                Metadata={
                    "original_filename": original_filename,
                    "business_id": business_id,
                    "document_type": document_type,
                    "uploaded_at": datetime.utcnow().isoformat(),
                },
            )
            
            file_size = self._format_file_size(len(file_content))
            logger.info(f"Uploaded document: {file_path}")
            return True, file_path, file_size
            
        except ClientError as e:
            logger.error(f"Failed to upload document: {e}")
            return False, str(e), None
    
    def get_download_url(
        self, 
        file_path: str, 
        expiration_seconds: int = 3600
    ) -> Optional[str]:
        """
        Generate a signed URL for downloading a document.
        
        Args:
            file_path: Path to the file in storage
            expiration_seconds: URL validity period (default 1 hour)
            
        Returns:
            Signed URL or None if error
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": file_path,
                },
                ExpiresIn=expiration_seconds,
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate download URL: {e}")
            return None
    
    def delete_document(self, file_path: str) -> bool:
        """
        Delete a document from storage.
        
        Args:
            file_path: Path to the file in storage
            
        Returns:
            True if deleted successfully
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            logger.info(f"Deleted document: {file_path}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete document: {e}")
            return False
    
    def delete_business_documents(self, business_id: str) -> bool:
        """
        Delete all documents for a business.
        
        Args:
            business_id: UUID of the business
            
        Returns:
            True if all deleted successfully
        """
        try:
            # List all objects with business prefix
            paginator = self.s3_client.get_paginator("list_objects_v2")
            prefix = f"{business_id}/"
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                objects = page.get("Contents", [])
                if objects:
                    delete_keys = [{"Key": obj["Key"]} for obj in objects]
                    self.s3_client.delete_objects(
                        Bucket=self.bucket_name,
                        Delete={"Objects": delete_keys},
                    )
            
            logger.info(f"Deleted all documents for business: {business_id}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete business documents: {e}")
            return False
    
    def get_document_info(self, file_path: str) -> Optional[dict]:
        """
        Get metadata about a document.
        
        Args:
            file_path: Path to the file in storage
            
        Returns:
            Document metadata or None
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            return {
                "file_path": file_path,
                "size": self._format_file_size(response.get("ContentLength", 0)),
                "mime_type": response.get("ContentType"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError:
            return None
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and other issues."""
        # Remove path separators
        filename = filename.replace("/", "_").replace("\\", "_")
        # Remove special characters
        safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
        filename = "".join(c if c in safe_chars else "_" for c in filename)
        # Limit length
        if len(filename) > 100:
            name, ext = os.path.splitext(filename)
            filename = name[:100-len(ext)] + ext
        return filename
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"


# Singleton instance
_doc_service: Optional[DocumentStorageService] = None


def get_document_service() -> DocumentStorageService:
    """Get or create the document storage service instance."""
    global _doc_service
    if _doc_service is None:
        _doc_service = DocumentStorageService()
    return _doc_service
