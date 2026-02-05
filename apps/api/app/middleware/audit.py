"""
HIPAA Compliance: Audit Logging Middleware

Logs access to PHI (Protected Health Information) endpoints.
"""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

# Endpoints that access PHI and require audit logging
PHI_ENDPOINTS = [
    "/clients",
    "/visits", 
    "/notes",
    "/contracts",
    "/assessments",
    "/transcripts",
    "/billing",
    "/audio",
]

# Sensitive operations
SENSITIVE_METHODS = ["POST", "PUT", "PATCH", "DELETE"]


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    HIPAA Compliance: Log all access to PHI endpoints.
    
    Logs:
    - User ID (from JWT if authenticated)
    - Endpoint accessed
    - HTTP method
    - Client IP
    - Timestamp
    - Response status
    - Response time
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip non-PHI endpoints for performance
        path = request.url.path
        
        is_phi_access = any(path.startswith(f"/api{ep}") or path.startswith(ep) for ep in PHI_ENDPOINTS)
        
        if not is_phi_access:
            return await call_next(request)
        
        # Record start time
        start_time = time.time()
        
        # Extract user info from authorization header if present
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import decode_access_token
                token = auth_header[7:]
                payload = decode_access_token(token)
                if payload:
                    user_id = payload.get("sub")
            except Exception:
                pass
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time_ms = (time.time() - start_time) * 1000
        
        # Log PHI access
        log_data = {
            "event": "phi_access",
            "user_id": user_id,
            "method": request.method,
            "path": path,
            "client_ip": client_ip,
            "status_code": response.status_code,
            "response_time_ms": round(response_time_ms, 2),
            "user_agent": request.headers.get("User-Agent", "unknown")[:100],
        }
        
        # Log to structured logger
        if response.status_code >= 400:
            logger.warning(f"PHI Access Error: {log_data}")
        elif request.method in SENSITIVE_METHODS:
            logger.info(f"PHI Modification: {log_data}")
        else:
            logger.debug(f"PHI Read: {log_data}")
        
        # For sensitive operations, also log to database
        if request.method in SENSITIVE_METHODS and user_id:
            try:
                db = SessionLocal()
                try:
                    from app.services.audit import log_action
                    log_action(
                        db, 
                        user_id, 
                        f"phi_{request.method.lower()}", 
                        "phi_access",
                        None,
                        {
                            "path": path,
                            "ip": client_ip,
                            "status": response.status_code,
                            "response_time_ms": round(response_time_ms, 2)
                        }
                    )
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Failed to log PHI access to database: {e}")
        
        return response
