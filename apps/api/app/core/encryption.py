"""
Field-Level Encryption for Sensitive Data (HIPAA Compliance)

Uses Fernet (AES-256-CBC with HMAC-SHA256) to encrypt sensitive database fields
like EIN, SSN, and voiceprint data at rest.
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_fernet_instance = None


def _get_fernet() -> Fernet:
    """Lazy-init a Fernet cipher from FIELD_ENCRYPTION_KEY env var."""
    global _fernet_instance
    if _fernet_instance is None:
        key = os.getenv("FIELD_ENCRYPTION_KEY")
        if not key:
            key = Fernet.generate_key().decode()
            logger.warning(
                "FIELD_ENCRYPTION_KEY not set — using auto-generated key. "
                "Encrypted data will NOT survive restarts. "
                "Set FIELD_ENCRYPTION_KEY env var for production."
            )
        _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet_instance


def encrypt_field(value: str) -> str:
    """Encrypt a plaintext string and return the Fernet token as a string.

    Returns None unchanged so callers don't need to guard against it.
    """
    if value is None:
        return None
    f = _get_fernet()
    return f.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_field(encrypted: str) -> str:
    """Decrypt a Fernet token back to plaintext.

    Returns None unchanged. If decryption fails (e.g. the value was stored
    before encryption was enabled), the raw value is returned as-is with a
    warning so existing unencrypted data doesn't break reads.
    """
    if encrypted is None:
        return None
    f = _get_fernet()
    try:
        return f.decrypt(encrypted.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        logger.warning("Failed to decrypt field — returning raw value (pre-encryption data?)")
        return encrypted
