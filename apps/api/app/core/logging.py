import logging
import sys
from app.core.config import settings


def setup_logging():
    """Configure application logging."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    
    # Reduce noise from third-party libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    
    return logging.getLogger(__name__)


logger = setup_logging()
