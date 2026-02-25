"""
Field-Level Encryption (worker-side mirror of api/app/core/encryption.py)

Shares the same FIELD_ENCRYPTION_KEY env var so both API and worker
can read/write encrypted fields.
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_fernet_instance = None


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        key = os.getenv("FIELD_ENCRYPTION_KEY")
        if not key:
            key = Fernet.generate_key().decode()
            logger.warning(
                "FIELD_ENCRYPTION_KEY not set — using auto-generated key. "
                "Encrypted data will NOT survive restarts."
            )
        _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet_instance


def encrypt_field(value):
    if value is None:
        return None
    f = _get_fernet()
    return f.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_field(encrypted):
    if encrypted is None:
        return None
    f = _get_fernet()
    try:
        return f.decrypt(encrypted.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return encrypted
