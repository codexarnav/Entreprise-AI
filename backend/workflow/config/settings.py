# Configuration settings for RFP Management Pipeline

import os
from typing import Optional

class Config:
    """Application configuration."""

    # API Keys
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")

    # Model settings
    DEFAULT_LLM_MODEL = "gemini-2.0-flash"
    DEFAULT_TEMPERATURE = 0.2

    # Processing settings
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 150
    SIMILARITY_THRESHOLD = 0.80

    # File paths
    LOG_LEVEL = "INFO"
    MAX_FILE_SIZE_MB = 10

    @classmethod
    def validate(cls):
        """Validate configuration."""
        if not any([cls.GEMINI_API_KEY, cls.OPENAI_API_KEY, cls.ANTHROPIC_API_KEY]):
            raise ValueError("At least one LLM API key must be configured")

config = Config()