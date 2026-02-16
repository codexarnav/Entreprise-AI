# Logging utilities

import logging
import sys
from pathlib import Path

def setup_logging(log_level: str = "INFO", log_file: str = "rfp_pipeline.log"):
    """Set up logging configuration."""

    # Create logs directory if it doesn't exist
    log_path = Path("logs")
    log_path.mkdir(exist_ok=True)

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_path / log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Reduce noise from third-party libraries
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("torch").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.WARNING)

    return logging.getLogger(__name__)

# Global logger instance
logger = setup_logging()