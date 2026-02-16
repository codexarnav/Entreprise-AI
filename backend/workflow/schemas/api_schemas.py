# Pydantic schemas for API validation

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class RFPInput(BaseModel):
    """Input schema for RFP processing."""
    file_path: Optional[str] = Field(None, description="Path to text file")
    pdf_path: Optional[str] = Field(None, description="Path to PDF file")

    class Config:
        schema_extra = {
            "example": {
                "file_path": "/path/to/rfp.txt",
                "pdf_path": None
            }
        }

class RFPOutput(BaseModel):
    """Output schema for RFP processing results."""
    rfp_aggregator: Dict[str, Any]
    risk_compliance: Dict[str, Any]
    pwin: Dict[str, Any]
    technical_agent: Dict[str, Any]
    pricing: Dict[str, Any]
    proposal: Dict[str, Any]
    final_decision: Dict[str, Any]

class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None