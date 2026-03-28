from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class WorkflowModel(BaseModel):
    id:str=Field(alias="_id")
    prompt:str
    type: Optional[str] = None
    session_id: Optional[str] = None

    perception: Dict = Field(default_factory=dict)
    goal: Dict = Field(default_factory=dict)

    tasks: List[str] = Field(default_factory=list)

    current_step: int = 0
    status: str = "running"

    entity_refs: Dict = Field(default_factory=dict)
    results: Dict = Field(default_factory=dict)

    created_at: datetime
    updated_at: datetime

class TaskModel(BaseModel):
    id: str = Field(alias="_id")
    workflow_id: str

    task_name: str=Field(default_factory=str)
    step: int=Field(default_factory=int)

    status: str = "pending"  

    input: Dict = Field(default_factory=dict)
    output: Dict = Field(default_factory=dict)

    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class SessionModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str

    context: List[Dict] = Field(default_factory=list)

    last_workflow_id: str

    created_at: datetime
    updated_at: datetime

class RfpModel(BaseModel):
    id: str = Field(alias="_id")

    source: str=Field(default_factory=str)
    document_path: str=Field(default_factory=str)

    parsed_data: Dict = Field(default_factory=dict)
    risk_analysis: Dict = Field(default_factory=dict)
    technical_fit: Dict = Field(default_factory=dict)
    pricing: Dict = Field(default_factory=dict)

    status: str = "pending"

    created_at: datetime

class VendorModel(BaseModel):
    id: str = Field(alias="_id")

    name: str=Field(default_factory=str)
    pan: str=Field(default_factory=str)
    aadhar: str=Field(default_factory=str)

    kyc_status: str=Field(default_factory=str)
    risk_score: float=Field(default_factory=float)

    embedding: List[float] = []

    created_at: datetime

class ProcurementModel(BaseModel):
    id: str = Field(alias="_id")
    rfp_id: str
    vendors: List[Dict]
    selected_vendor: str=Field(default_factory=str)
    negotiation_history: List[Dict] = Field(default_factory=list)
    final_decision: Dict=Field(default_factory=dict)
    created_at: datetime

class AuditLogs(BaseModel):
    id:str=Field(alias='_id')
    workflow_id:str
    event:str=Field(default_factory=str)
    details:Dict=Field(default_factory=dict)
    timestamp:datetime
