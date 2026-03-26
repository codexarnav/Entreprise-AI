from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine, SessionLocal
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import traceback
import logging

# Import all agents
from workflow.rfp_agents.rfp_aggregator import (
    RfpAggregatorInput, RfpAggregatorOutput, RfpAggregatorState,
    document_loader, chunks, rfp_aggregator_ner
)
from workflow.rfp_agents.risk_and_compilance import (
    RiskAndComplianceState, read_text_file, split_text, 
    ner_legal_bert, generate_report, access_risk, generate_risk_brief
)
from workflow.rfp_agents.pwin import (
    PwinState, RfpAggregator, RiskandCompilance, CRM,
    prepare_data, PwinAgentLLM
)
from workflow.rfp_agents.Technical_Agent import TechnicalAgent, RFPRequirement
from workflow.rfp_agents.dynamic_pricing_agent import create_pricing_agent, AgentState as PricingAgentState
from workflow.rfp_agents.proposal_weaver_agent import create_proposal_weaver_agent, AgentState as ProposalAgentState

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database initialization
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="RFP Processing System - Scalable Backend",
    description="Production-ready REST API for RFP processing with 6 AI agents",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

# RFP Aggregator Models
class RFPAggregatorRequest(BaseModel):
    text_path: str
    pdf_path: Optional[str] = None

class RFPAggregatorResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    rfp_id: int
    title: str
    buyer: str
    deadline: Optional[str]
    technical_requirements: List[str]
    scope_of_work: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Risk & Compliance Models
class RiskComplianceRequest(BaseModel):
    file_path: str

class RiskComplianceResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    legal_risks: List[str]
    flagging_score: Optional[float]
    risk_brief: str
    report: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# PWin Models
class CRMData(BaseModel):
    customer_id: str
    customer_name: str
    contact_email: str
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None

class PWinRequest(BaseModel):
    rfp_id: int
    crm_data: Optional[CRMData] = None

class PWinResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    pwin_score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Technical Agent Models
class TechnicalAnalysisRequest(BaseModel):
    rfp_id: int
    similarity_threshold: Optional[float] = 0.80

class TechnicalAnalysisResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    matched_skus: List[Dict[str, Any]]
    technical_gaps: List[Dict[str, Any]]
    processing_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Dynamic Pricing Models
class PricingRequest(BaseModel):
    processing_id: int
    base_margin: Optional[float] = 0.25

class PricingResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    pricing_table: List[Dict[str, Any]]
    total_price: float
    base_margin: Optional[float]
    strategic_margin_adjustment: Optional[float]
    overall_risk_level: Optional[str]
    risk_notes: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


# Proposal Weaver Models
class ProposalRequest(BaseModel):
    processing_id: int
    client_type: Optional[str] = "Private"

class ProposalUpdateRequest(BaseModel):
    client_type: Optional[str] = None
    regenerate: bool = False

class ProposalResponse(BaseModel):
    id: int
    processing_id: Optional[int]
    executive_summary: str
    technical_section: str
    pricing_section: str
    risk_mitigation_section: str
    competitive_advantages_section: str
    case_studies_section: Optional[str]
    complete_proposal: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# 1. RFP AGGREGATOR - GET & POST
# ============================================================================

@app.post("/api/v1/rfp-aggregator", response_model=RFPAggregatorResponse, tags=["1. RFP Aggregator"])
def create_rfp_aggregation(request: RFPAggregatorRequest, db: Session = Depends(get_db)):
    """
    **POST**: Process RFP document and extract structured data
    
    Extracts:
    - RFP ID, Title, Buyer
    - Deadline
    - Technical Requirements
    - Scope of Work
    """
    try:
        logger.info(f"Processing RFP from: {request.text_path}")
        
        # Run RFP Aggregator
        state = RfpAggregatorState(
            rfp_aggregator_input=RfpAggregatorInput(
                text_path=request.text_path,
                pdf_path=request.pdf_path
            ),
            rfp_aggregator_output=None
        )
        
        state = document_loader(state)
        state = chunks(state)
        state = rfp_aggregator_ner(state)
        output = state['rfp_aggregator_output']
        
        # Store in database
        db_rfp = models.RFPData(
            rfp_id=output.rfp_id,
            title=output.title,
            buyer=output.buyer,
            deadline=output.deadline,
            technical_requirements=output.technical_requirements,
            scope_of_work=output.scope_of_work
        )
        db.add(db_rfp)
        db.commit()
        db.refresh(db_rfp)
        
        logger.info(f"RFP Aggregation completed. RFP ID: {output.rfp_id}")
        return db_rfp
        
    except Exception as e:
        logger.error(f"RFP Aggregation failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"RFP Aggregation failed: {str(e)}")


@app.get("/api/v1/rfp-aggregator/{rfp_id}", response_model=RFPAggregatorResponse, tags=["1. RFP Aggregator"])
def get_rfp_aggregation(rfp_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve RFP aggregation data by RFP ID
    """
    db_rfp = db.query(models.RFPData).filter(models.RFPData.rfp_id == rfp_id).first()
    if not db_rfp:
        raise HTTPException(status_code=404, detail=f"RFP {rfp_id} not found")
    return db_rfp


# ============================================================================
# 2. RISK & COMPLIANCE - POST & GET (for fetching risks)
# ============================================================================

@app.post("/api/v1/risk-compliance", response_model=RiskComplianceResponse, tags=["2. Risk & Compliance"])
def create_risk_analysis(request: RiskComplianceRequest, db: Session = Depends(get_db)):
    """
    **POST**: Analyze legal risks and compliance requirements
    
    Analyzes:
    - Legal risks and entities
    - Compliance requirements
    - Risk flagging score (0-1)
    - Risk brief summary
    """
    try:
        logger.info(f"Analyzing risks for: {request.file_path}")
        
        state = RiskAndComplianceState(
            file_path=request.file_path,
            parsed_text="",
            chunked_text=[],
            legal_risks=None,
            report="",
            flagging_score=None,
            risk_brief=""
        )
        
        state = read_text_file(state)
        state = split_text(state)
        state = ner_legal_bert(state)
        state = generate_report(state)
        state = access_risk(state)
        state = generate_risk_brief(state)
        
        # Store in database
        db_risk = models.RiskCompliance(
            legal_risks=state['legal_risks'] or [],
            flagging_score=state['flagging_score'],
            risk_brief=state['risk_brief'],
            report=state['report']
        )
        db.add(db_risk)
        db.commit()
        db.refresh(db_risk)
        
        logger.info(f"Risk analysis completed. Flagging score: {state['flagging_score']}")
        return db_risk
        
    except Exception as e:
        logger.error(f"Risk analysis failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@app.get("/api/v1/risk-compliance/{risk_id}", response_model=RiskComplianceResponse, tags=["2. Risk & Compliance"])
def get_risk_analysis(risk_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Fetch risk analysis by ID
    
    Returns all identified risks and compliance requirements
    """
    db_risk = db.query(models.RiskCompliance).filter(models.RiskCompliance.id == risk_id).first()
    if not db_risk:
        raise HTTPException(status_code=404, detail=f"Risk analysis {risk_id} not found")
    return db_risk


@app.get("/api/v1/risk-compliance/by-processing/{processing_id}", response_model=RiskComplianceResponse, tags=["2. Risk & Compliance"])
def get_risk_by_processing(processing_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Fetch risks by processing ID
    """
    db_risk = db.query(models.RiskCompliance).filter(
        models.RiskCompliance.processing_id == processing_id
    ).first()
    if not db_risk:
        raise HTTPException(status_code=404, detail=f"No risk analysis found for processing {processing_id}")
    return db_risk


# ============================================================================
# 3. PWIN ANALYSIS - GET & POST
# ============================================================================

@app.post("/api/v1/pwin", response_model=PWinResponse, tags=["3. PWin Analysis"])
def create_pwin_analysis(request: PWinRequest, db: Session = Depends(get_db)):
    """
    **POST**: Calculate probability of winning (PWin)
    
    Calculates:
    - PWin score (0-1)
    - Strengths
    - Weaknesses
    - Recommendations
    """
    try:
        logger.info(f"Calculating PWin for RFP: {request.rfp_id}")
        
        # Get RFP data
        db_rfp = db.query(models.RFPData).filter(models.RFPData.rfp_id == request.rfp_id).first()
        if not db_rfp:
            raise HTTPException(status_code=404, detail=f"RFP {request.rfp_id} not found. Run RFP aggregator first.")
        
        # Get risk data if available
        db_risk = db.query(models.RiskCompliance).filter(
            models.RiskCompliance.processing_id == db_rfp.processing_id
        ).first() if db_rfp.processing_id else None
        
        # Prepare state
        state = PwinState(
            rfp_aggregator_input=RfpAggregator(
                rfp_id=db_rfp.rfp_id,
                title=db_rfp.title,
                buyer=db_rfp.buyer,
                deadline=float(db_rfp.deadline) if db_rfp.deadline else 0.0,
                technical_requirements=db_rfp.technical_requirements,
                scope_of_work=db_rfp.scope_of_work
            ),
            risk_and_compilance=RiskandCompilance(
                legal_risks=db_risk.legal_risks if db_risk else [],
                flagging_score=db_risk.flagging_score if db_risk else None,
                risk_brief=db_risk.risk_brief if db_risk else ""
            ) if db_risk else None,
            crm=CRM(**request.crm_data.dict()) if request.crm_data else None,
            model_input_json=None,
            pwin_labels=None,
            pwin_score=None,
            strength=None,
            weekness=None,
            recommendation=None
        )
        
        state = prepare_data(state)
        state = PwinAgentLLM(state)
        
        # Store in database
        db_pwin = models.PWinAnalysis(
            processing_id=db_rfp.processing_id,
            pwin_score=state['pwin_score'],
            strengths=state['strength'] or [],
            weaknesses=state['weekness'] or [],
            recommendations=state['recommendation'] or []
        )
        db.add(db_pwin)
        db.commit()
        db.refresh(db_pwin)
        
        logger.info(f"PWin analysis completed. Score: {state['pwin_score']}")
        return db_pwin
        
    except Exception as e:
        logger.error(f"PWin analysis failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"PWin analysis failed: {str(e)}")


@app.get("/api/v1/pwin/{pwin_id}", response_model=PWinResponse, tags=["3. PWin Analysis"])
def get_pwin_analysis(pwin_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve PWin analysis by ID
    """
    db_pwin = db.query(models.PWinAnalysis).filter(models.PWinAnalysis.id == pwin_id).first()
    if not db_pwin:
        raise HTTPException(status_code=404, detail=f"PWin analysis {pwin_id} not found")
    return db_pwin


@app.get("/api/v1/pwin/by-processing/{processing_id}", response_model=PWinResponse, tags=["3. PWin Analysis"])
def get_pwin_by_processing(processing_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve PWin analysis by processing ID
    """
    db_pwin = db.query(models.PWinAnalysis).filter(
        models.PWinAnalysis.processing_id == processing_id
    ).first()
    if not db_pwin:
        raise HTTPException(status_code=404, detail=f"No PWin analysis found for processing {processing_id}")
    return db_pwin


# ============================================================================
# 4. TECHNICAL AGENT - GET, POST, DELETE
# ============================================================================

@app.post("/api/v1/technical-analysis", response_model=TechnicalAnalysisResponse, tags=["4. Technical Agent"])
def create_technical_analysis(request: TechnicalAnalysisRequest, db: Session = Depends(get_db)):
    """
    **POST**: Match RFP requirements to SKU catalog
    
    Performs:
    - Semantic matching of requirements to products
    - SKU identification
    - Technical gap analysis
    """
    try:
        logger.info(f"Running technical analysis for RFP: {request.rfp_id}")
        
        # Get RFP data
        db_rfp = db.query(models.RFPData).filter(models.RFPData.rfp_id == request.rfp_id).first()
        if not db_rfp:
            raise HTTPException(status_code=404, detail=f"RFP {request.rfp_id} not found. Run RFP aggregator first.")
        
        # Initialize technical agent
        technical_agent = TechnicalAgent(similarity_threshold=request.similarity_threshold)
        
        # Convert requirements
        requirements = [
            RFPRequirement(
                id=f"req_{i}",
                description=req,
                parameters={},
                category="technical",
                priority="high"
            )
            for i, req in enumerate(db_rfp.technical_requirements)
        ]
        
        # Process
        result = technical_agent.process_rfp(requirements, request.similarity_threshold)
        
        # Store in database
        db_technical = models.TechnicalAnalysis(
            processing_id=db_rfp.processing_id,
            matched_skus=[sku.dict() if hasattr(sku, 'dict') else sku for sku in result['matched_skus']],
            technical_gaps=[gap.dict() if hasattr(gap, 'dict') else gap for gap in result['technical_gaps']],
            processing_status=result['processing_status'],
            error_messages=result.get('error_messages', [])
        )
        db.add(db_technical)
        db.commit()
        db.refresh(db_technical)
        
        logger.info(f"Technical analysis completed. Matched SKUs: {len(result['matched_skus'])}, Gaps: {len(result['technical_gaps'])}")
        return db_technical
        
    except Exception as e:
        logger.error(f"Technical analysis failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Technical analysis failed: {str(e)}")


@app.get("/api/v1/technical-analysis/{analysis_id}", response_model=TechnicalAnalysisResponse, tags=["4. Technical Agent"])
def get_technical_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve technical analysis by ID
    """
    db_technical = db.query(models.TechnicalAnalysis).filter(models.TechnicalAnalysis.id == analysis_id).first()
    if not db_technical:
        raise HTTPException(status_code=404, detail=f"Technical analysis {analysis_id} not found")
    return db_technical


@app.get("/api/v1/technical-analysis/by-processing/{processing_id}", response_model=TechnicalAnalysisResponse, tags=["4. Technical Agent"])
def get_technical_by_processing(processing_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve technical analysis by processing ID
    """
    db_technical = db.query(models.TechnicalAnalysis).filter(
        models.TechnicalAnalysis.processing_id == processing_id
    ).first()
    if not db_technical:
        raise HTTPException(status_code=404, detail=f"No technical analysis found for processing {processing_id}")
    return db_technical


@app.delete("/api/v1/technical-analysis/{analysis_id}", tags=["4. Technical Agent"])
def delete_technical_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """
    **DELETE**: Remove technical analysis
    """
    db_technical = db.query(models.TechnicalAnalysis).filter(models.TechnicalAnalysis.id == analysis_id).first()
    if not db_technical:
        raise HTTPException(status_code=404, detail=f"Technical analysis {analysis_id} not found")
    
    db.delete(db_technical)
    db.commit()
    logger.info(f"Technical analysis {analysis_id} deleted")
    return {"message": f"Technical analysis {analysis_id} deleted successfully"}


# ============================================================================
# 5. DYNAMIC PRICING - POST ONLY
# ============================================================================

@app.post("/api/v1/pricing", response_model=PricingResponse, tags=["5. Dynamic Pricing"])
def create_pricing(request: PricingRequest, db: Session = Depends(get_db)):
    """
    **POST**: Calculate dynamic pricing with strategic adjustments
    
    Calculates:
    - Base costs with risk buffers
    - Strategic margin adjustments
    - Final pricing table
    - Total price
    """
    try:
        logger.info(f"Calculating pricing for processing: {request.processing_id}")
        
        # Get processing data
        processing = db.query(models.RFPProcessing).filter(models.RFPProcessing.id == request.processing_id).first()
        if not processing:
            raise HTTPException(status_code=404, detail=f"Processing {request.processing_id} not found")
        
        # Get technical analysis
        db_technical = db.query(models.TechnicalAnalysis).filter(
            models.TechnicalAnalysis.processing_id == request.processing_id
        ).first()
        if not db_technical:
            raise HTTPException(
                status_code=400, 
                detail="Technical analysis not found. Run technical agent first."
            )
        
        # Get RFP data
        db_rfp = db.query(models.RFPData).filter(models.RFPData.processing_id == request.processing_id).first()
        
        # Initialize pricing agent
        pricing_agent = create_pricing_agent()
        
        # Convert requirements
        requirements = [
            {"id": f"req_{i}", "description": req}
            for i, req in enumerate(db_rfp.technical_requirements)
        ] if db_rfp else []
        
        # Prepare state
        pricing_state = PricingAgentState(
            sku_matches=db_technical.matched_skus,
            price_book={},
            technical_gaps=db_technical.technical_gaps,
            rfp_requirements=requirements,
            innovation_items=None,
            risk_buffer_percentage=None,
            strategic_margin_adjustment=None,
            overall_risk_level=None,
            base_margin=request.base_margin,
            pricing_table=None,
            total_price=None,
            risk_notes=None,
            critical_errors=None,
            llm_reasoning=None,
            use_llm=True
        )
        
        # Process
        result = pricing_agent.invoke(pricing_state)
        
        # Store in database
        db_pricing = models.PricingData(
            processing_id=request.processing_id,
            pricing_table=result.get('pricing_table', []),
            total_price=result.get('total_price', 0.0),
            base_margin=result.get('base_margin'),
            strategic_margin_adjustment=result.get('strategic_margin_adjustment'),
            overall_risk_level=result.get('overall_risk_level'),
            risk_notes=result.get('risk_notes', [])
        )
        db.add(db_pricing)
        db.commit()
        db.refresh(db_pricing)
        
        logger.info(f"Pricing calculated. Total: ${result.get('total_price', 0.0):,.2f}")
        return db_pricing
        
    except Exception as e:
        logger.error(f"Pricing calculation failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")


# ============================================================================
# 6. PROPOSAL WEAVER - GET, POST, DELETE, PUT
# ============================================================================

@app.post("/api/v1/proposal", response_model=ProposalResponse, tags=["6. Proposal Weaver"])
def create_proposal(request: ProposalRequest, db: Session = Depends(get_db)):
    """
    **POST**: Generate complete proposal document
    
    Generates:
    - Executive Summary
    - Technical Section
    - Pricing Section
    - Risk Mitigation Section
    - Competitive Advantages
    - Complete Proposal
    """
    try:
        logger.info(f"Generating proposal for processing: {request.processing_id}")
        
        # Get all required data
        processing = db.query(models.RFPProcessing).filter(models.RFPProcessing.id == request.processing_id).first()
        if not processing:
            raise HTTPException(status_code=404, detail=f"Processing {request.processing_id} not found")
        
        db_rfp = db.query(models.RFPData).filter(models.RFPData.processing_id == request.processing_id).first()
        db_technical = db.query(models.TechnicalAnalysis).filter(
            models.TechnicalAnalysis.processing_id == request.processing_id
        ).first()
        db_pricing = db.query(models.PricingData).filter(
            models.PricingData.processing_id == request.processing_id
        ).first()
        db_pwin = db.query(models.PWinAnalysis).filter(
            models.PWinAnalysis.processing_id == request.processing_id
        ).first()
        
        if not all([db_technical, db_pricing, db_pwin]):
            raise HTTPException(
                status_code=400, 
                detail="Missing required data. Ensure technical analysis, pricing, and PWin analysis are completed."
            )
        
        # Initialize proposal agent
        proposal_agent = create_proposal_weaver_agent()
        
        # Prepare state
        proposal_state = ProposalAgentState(
            sku_matches=db_technical.matched_skus,
            pricing_info={
                'total_price': db_pricing.total_price,
                'pricing_table': db_pricing.pricing_table,
                'strategic_margin_adjustment': db_pricing.strategic_margin_adjustment,
                'competitive_positioning': 'competitive'
            },
            risk_profile={
                'overall_risk_level': db_pricing.overall_risk_level or 'Medium',
                'risk_notes': db_pricing.risk_notes or [],
                'critical_errors': None
            },
            pwin_highlights={
                'pwin_score': db_pwin.pwin_score,
                'strengths': db_pwin.strengths,
                'weaknesses': db_pwin.weaknesses,
                'recommendations': db_pwin.recommendations
            },
            client_type={
                'client_type': request.client_type,
                'client_name': db_rfp.buyer if db_rfp else 'Client',
                'industry': None
            },
            boilerplate_library={},
            case_studies_library={},
            selected_boilerplate=None,
            selected_case_studies=None,
            executive_summary=None,
            technical_section=None,
            pricing_section=None,
            risk_mitigation_section=None,
            competitive_advantages_section=None,
            case_studies_section=None,
            complete_proposal=None,
            use_llm=True
        )
        
        # Process
        result = proposal_agent.invoke(proposal_state)
        
        # Store in database
        db_proposal = models.ProposalData(
            processing_id=request.processing_id,
            executive_summary=result.get('executive_summary', ''),
            technical_section=result.get('technical_section', ''),
            pricing_section=result.get('pricing_section', ''),
            risk_mitigation_section=result.get('risk_mitigation_section', ''),
            competitive_advantages_section=result.get('competitive_advantages_section', ''),
            case_studies_section=result.get('case_studies_section'),
            complete_proposal=result.get('complete_proposal', '')
        )
        db.add(db_proposal)
        db.commit()
        db.refresh(db_proposal)
        
        logger.info(f"Proposal generated successfully for processing {request.processing_id}")
        return db_proposal
        
    except Exception as e:
        logger.error(f"Proposal generation failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Proposal generation failed: {str(e)}")


@app.get("/api/v1/proposal/{proposal_id}", response_model=ProposalResponse, tags=["6. Proposal Weaver"])
def get_proposal(proposal_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve proposal by ID
    """
    db_proposal = db.query(models.ProposalData).filter(models.ProposalData.id == proposal_id).first()
    if not db_proposal:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    return db_proposal


@app.get("/api/v1/proposal/by-processing/{processing_id}", response_model=ProposalResponse, tags=["6. Proposal Weaver"])
def get_proposal_by_processing(processing_id: int, db: Session = Depends(get_db)):
    """
    **GET**: Retrieve proposal by processing ID
    """
    db_proposal = db.query(models.ProposalData).filter(
        models.ProposalData.processing_id == processing_id
    ).first()
    if not db_proposal:
        raise HTTPException(status_code=404, detail=f"No proposal found for processing {processing_id}")
    return db_proposal


@app.put("/api/v1/proposal/{proposal_id}", response_model=ProposalResponse, tags=["6. Proposal Weaver"])
def update_proposal(proposal_id: int, request: ProposalUpdateRequest, db: Session = Depends(get_db)):
    """
    **PUT**: Update/regenerate proposal
    
    Can regenerate proposal with different client type or update existing
    """
    try:
        db_proposal = db.query(models.ProposalData).filter(models.ProposalData.id == proposal_id).first()
        if not db_proposal:
            raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
        
        if request.regenerate:
            logger.info(f"Regenerating proposal {proposal_id}")
            
            # Get all required data
            processing_id = db_proposal.processing_id
            db_rfp = db.query(models.RFPData).filter(models.RFPData.processing_id == processing_id).first()
            db_technical = db.query(models.TechnicalAnalysis).filter(
                models.TechnicalAnalysis.processing_id == processing_id
            ).first()
            db_pricing = db.query(models.PricingData).filter(
                models.PricingData.processing_id == processing_id
            ).first()
            db_pwin = db.query(models.PWinAnalysis).filter(
                models.PWinAnalysis.processing_id == processing_id
            ).first()
            
            # Initialize proposal agent
            proposal_agent = create_proposal_weaver_agent()
            
            # Prepare state
            proposal_state = ProposalAgentState(
                sku_matches=db_technical.matched_skus,
                pricing_info={
                    'total_price': db_pricing.total_price,
                    'pricing_table': db_pricing.pricing_table,
                    'strategic_margin_adjustment': db_pricing.strategic_margin_adjustment,
                    'competitive_positioning': 'competitive'
                },
                risk_profile={
                    'overall_risk_level': db_pricing.overall_risk_level or 'Medium',
                    'risk_notes': db_pricing.risk_notes or [],
                    'critical_errors': None
                },
                pwin_highlights={
                    'pwin_score': db_pwin.pwin_score,
                    'strengths': db_pwin.strengths,
                    'weaknesses': db_pwin.weaknesses,
                    'recommendations': db_pwin.recommendations
                },
                client_type={
                    'client_type': request.client_type or 'Private',
                    'client_name': db_rfp.buyer if db_rfp else 'Client',
                    'industry': None
                },
                boilerplate_library={},
                case_studies_library={},
                selected_boilerplate=None,
                selected_case_studies=None,
                executive_summary=None,
                technical_section=None,
                pricing_section=None,
                risk_mitigation_section=None,
                competitive_advantages_section=None,
                case_studies_section=None,
                complete_proposal=None,
                use_llm=True
            )
            
            # Process
            result = proposal_agent.invoke(proposal_state)
            
            # Update fields
            db_proposal.executive_summary = result.get('executive_summary', '')
            db_proposal.technical_section = result.get('technical_section', '')
            db_proposal.pricing_section = result.get('pricing_section', '')
            db_proposal.risk_mitigation_section = result.get('risk_mitigation_section', '')
            db_proposal.competitive_advantages_section = result.get('competitive_advantages_section', '')
            db_proposal.case_studies_section = result.get('case_studies_section')
            db_proposal.complete_proposal = result.get('complete_proposal', '')
            
            db.commit()
            db.refresh(db_proposal)
            
            logger.info(f"Proposal {proposal_id} regenerated successfully")
        
        return db_proposal
        
    except Exception as e:
        logger.error(f"Proposal update failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Proposal update failed: {str(e)}")


@app.delete("/api/v1/proposal/{proposal_id}", tags=["6. Proposal Weaver"])
def delete_proposal(proposal_id: int, db: Session = Depends(get_db)):
    """
    **DELETE**: Remove proposal
    """
    db_proposal = db.query(models.ProposalData).filter(models.ProposalData.id == proposal_id).first()
    if not db_proposal:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    
    db.delete(db_proposal)
    db.commit()
    logger.info(f"Proposal {proposal_id} deleted")
    return {"message": f"Proposal {proposal_id} deleted successfully"}


# ============================================================================
# MASTER PIPELINE (OPTIONAL - Run all agents sequentially)
# ============================================================================

class CompletePipelineRequest(BaseModel):
    text_path: str
    pdf_path: Optional[str] = None
    crm_data: Optional[CRMData] = None
    similarity_threshold: Optional[float] = 0.80
    base_margin: Optional[float] = 0.25
    client_type: Optional[str] = "Private"

@app.post("/api/v1/pipeline/complete", tags=["Master Pipeline"])
def run_complete_pipeline(request: CompletePipelineRequest, db: Session = Depends(get_db)):
    """
    **POST**: Run complete RFP processing pipeline (all 6 agents sequentially)
    
    Returns processing_id to track progress and retrieve results
    """
    processing = None
    try:
        # Create processing record
        processing = models.RFPProcessing(
            rfp_id=1,  # Will be updated after RFP aggregation
            file_path=request.text_path,
            status='processing'
        )
        db.add(processing)
        db.commit()
        db.refresh(processing)
        
        logger.info(f"🚀 Starting complete pipeline for processing_id: {processing.id}")
        
        # Step 1: RFP Aggregator
        logger.info("Step 1/6: RFP Aggregator")
        rfp_req = RFPAggregatorRequest(text_path=request.text_path, pdf_path=request.pdf_path)
        rfp_result = create_rfp_aggregation(rfp_req, db)
        
        # Update processing with rfp_id
        processing.rfp_id = rfp_result.rfp_id
        db_rfp = db.query(models.RFPData).filter(models.RFPData.id == rfp_result.id).first()
        db_rfp.processing_id = processing.id
        db.commit()
        
        # Step 2: Risk & Compliance
        logger.info("Step 2/6: Risk & Compliance")
        risk_req = RiskComplianceRequest(file_path=request.text_path)
        risk_result = create_risk_analysis(risk_req, db)
        db_risk = db.query(models.RiskCompliance).filter(models.RiskCompliance.id == risk_result.id).first()
        db_risk.processing_id = processing.id
        db.commit()
        
        # Step 3: PWin Analysis
        logger.info("Step 3/6: PWin Analysis")
        pwin_req = PWinRequest(rfp_id=rfp_result.rfp_id, crm_data=request.crm_data)
        pwin_result = create_pwin_analysis(pwin_req, db)
        
        # Step 4: Technical Analysis
        logger.info("Step 4/6: Technical Agent")
        tech_req = TechnicalAnalysisRequest(rfp_id=rfp_result.rfp_id, similarity_threshold=request.similarity_threshold)
        tech_result = create_technical_analysis(tech_req, db)
        
        # Step 5: Dynamic Pricing
        logger.info("Step 5/6: Dynamic Pricing")
        pricing_req = PricingRequest(processing_id=processing.id, base_margin=request.base_margin)
        pricing_result = create_pricing(pricing_req, db)
        
        # Step 6: Proposal Weaver
        logger.info("Step 6/6: Proposal Weaver")
        proposal_req = ProposalRequest(processing_id=processing.id, client_type=request.client_type)
        proposal_result = create_proposal(proposal_req, db)
        
        # Update processing status
        processing.status = 'completed'
        db.commit()
        
        logger.info(f"✅ Complete pipeline finished for processing_id: {processing.id}")
        
        return {
            "processing_id": processing.id,
            "rfp_id": rfp_result.rfp_id,
            "status": "completed",
            "message": "All 6 agents completed successfully",
            "results": {
                "rfp_aggregator_id": rfp_result.id,
                "risk_compliance_id": risk_result.id,
                "pwin_id": pwin_result.id,
                "technical_analysis_id": tech_result.id,
                "pricing_id": pricing_result.id,
                "proposal_id": proposal_result.id
            }
        }
        
    except Exception as e:
        if processing:
            processing.status = 'failed'
            processing.error_message = str(e)
            db.commit()
        
        logger.error(f"❌ Pipeline failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RFP Processing System",
        "version": "2.0.0",
        "agents": {
            "1": "RFP Aggregator (GET, POST)",
            "2": "Risk & Compliance (GET, POST)",
            "3": "PWin Analysis (GET, POST)",
            "4": "Technical Agent (GET, POST, DELETE)",
            "5": "Dynamic Pricing (POST)",
            "6": "Proposal Weaver (GET, POST, PUT, DELETE)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
