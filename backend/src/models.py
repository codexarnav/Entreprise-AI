from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


# ============================================================================
# MASTER PROCESSING TABLE
# ============================================================================

class RFPProcessing(Base):
    """Master table tracking the entire RFP processing pipeline"""
    __tablename__ = 'rfp_processing'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rfp_id = Column(Integer, unique=True, index=True)
    file_path = Column(String, nullable=False)
    status = Column(String, default='pending')  # pending, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    rfp_data = relationship("RFPData", back_populates="processing", uselist=False, cascade="all, delete-orphan")
    risk_compliance = relationship("RiskCompliance", back_populates="processing", uselist=False, cascade="all, delete-orphan")
    pwin_analysis = relationship("PWinAnalysis", back_populates="processing", uselist=False, cascade="all, delete-orphan")
    technical_analysis = relationship("TechnicalAnalysis", back_populates="processing", uselist=False, cascade="all, delete-orphan")
    pricing_data = relationship("PricingData", back_populates="processing", uselist=False, cascade="all, delete-orphan")
    proposal = relationship("ProposalData", back_populates="processing", uselist=False, cascade="all, delete-orphan")


# ============================================================================
# AGENT OUTPUT TABLES
# ============================================================================

class RFPData(Base):
    """RFP Aggregator output"""
    __tablename__ = 'rfp_data'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    rfp_id = Column(Integer, unique=True, index=True)
    title = Column(String)
    buyer = Column(String)
    deadline = Column(String, nullable=True)
    technical_requirements = Column(JSON)  # List of strings
    scope_of_work = Column(JSON)  # List of strings
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="rfp_data")


class RiskCompliance(Base):
    """Risk and Compliance analysis output"""
    __tablename__ = 'risk_compliance'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    legal_risks = Column(JSON)  # List of strings
    flagging_score = Column(Float, nullable=True)
    risk_brief = Column(Text)
    report = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="risk_compliance")


class PWinAnalysis(Base):
    """PWin Agent analysis output"""
    __tablename__ = 'pwin_analysis'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    pwin_score = Column(Float)
    strengths = Column(JSON)  # List of strings
    weaknesses = Column(JSON)  # List of strings
    recommendations = Column(JSON)  # List of strings
    crm_id = Column(Integer, ForeignKey('crm_data.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="pwin_analysis")
    crm = relationship("CRMData", back_populates="pwin_analyses")


class TechnicalAnalysis(Base):
    """Technical Agent SKU matching output"""
    __tablename__ = 'technical_analysis'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    matched_skus = Column(JSON)  # List of SKUMatch objects
    technical_gaps = Column(JSON)  # List of TechnicalGap objects
    processing_status = Column(String)
    error_messages = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="technical_analysis")


class PricingData(Base):
    """Dynamic Pricing Agent output"""
    __tablename__ = 'pricing_data'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    pricing_table = Column(JSON)  # List of PricingItem objects
    total_price = Column(Float)
    base_margin = Column(Float, nullable=True)
    strategic_margin_adjustment = Column(Float, nullable=True)
    overall_risk_level = Column(String, nullable=True)
    risk_notes = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="pricing_data")


class ProposalData(Base):
    """Proposal Weaver output"""
    __tablename__ = 'proposal_data'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey('rfp_processing.id', ondelete='CASCADE'), nullable=True)
    executive_summary = Column(Text)
    technical_section = Column(Text)
    pricing_section = Column(Text)
    risk_mitigation_section = Column(Text)
    competitive_advantages_section = Column(Text)
    case_studies_section = Column(Text, nullable=True)
    complete_proposal = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processing = relationship("RFPProcessing", back_populates="proposal")


# ============================================================================
# SUPPORTING DATA TABLES
# ============================================================================

class CRMData(Base):
    """Customer Relationship Management data"""
    __tablename__ = 'crm_data'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(String, unique=True, index=True)
    customer_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    contact_phone = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)  # Small, Medium, Enterprise
    location = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    # Relationship metrics
    total_contracts = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    win_rate = Column(Float, nullable=True)  # Historical win rate with this customer
    
    # Status
    status = Column(String, default='active')  # active, inactive, prospect
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pwin_analyses = relationship("PWinAnalysis", back_populates="crm")


class SKUCatalog(Base):
    """Product SKU catalog for technical matching"""
    __tablename__ = 'sku_catalog'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sku_id = Column(String, unique=True, index=True, nullable=False)
    sku_name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    subcategory = Column(String, nullable=True)
    
    # Technical specifications
    description = Column(Text)
    technical_specs = Column(JSON)  # Dict of technical specifications
    features = Column(JSON)  # List of features
    
    # Pricing
    standard_cost = Column(Float, nullable=False)
    list_price = Column(Float, nullable=True)
    currency = Column(String, default='USD')
    
    # Availability
    in_stock = Column(Boolean, default=True)
    lead_time_days = Column(Integer, nullable=True)
    
    # Innovation
    is_innovation = Column(Boolean, default=False)
    nre_cost = Column(Float, nullable=True)  # Non-recurring engineering cost
    
    # Metadata
    manufacturer = Column(String, nullable=True)
    spec_sheet_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    price_history = relationship("PriceHistory", back_populates="sku", cascade="all, delete-orphan")


class PriceHistory(Base):
    """Historical pricing data for SKUs"""
    __tablename__ = 'price_history'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sku_id = Column(String, ForeignKey('sku_catalog.sku_id', ondelete='CASCADE'), nullable=False)
    
    standard_cost = Column(Float, nullable=False)
    list_price = Column(Float, nullable=True)
    effective_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    
    # Pricing context
    reason = Column(String, nullable=True)  # price_increase, promotion, cost_reduction, etc.
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sku = relationship("SKUCatalog", back_populates="price_history")


class CompetitorData(Base):
    """Competitor intelligence data"""
    __tablename__ = 'competitor_data'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    competitor_name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=True)
    
    # Competitive intelligence
    strengths = Column(JSON)  # List of competitor strengths
    weaknesses = Column(JSON)  # List of competitor weaknesses
    typical_pricing_strategy = Column(String, nullable=True)  # aggressive, premium, competitive
    average_discount_percentage = Column(Float, nullable=True)
    
    # Win/Loss tracking
    wins_against = Column(Integer, default=0)
    losses_against = Column(Integer, default=0)
    
    # Notes
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BoilerplateLibrary(Base):
    """Reusable boilerplate content for proposals"""
    __tablename__ = 'boilerplate_library'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # executive_summary, technical, pricing, etc.
    client_type = Column(String, nullable=True)  # PSU, Private, Government, Enterprise
    
    content = Column(Text, nullable=False)
    
    # Metadata
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CaseStudy(Base):
    """Case studies for proposal inclusion"""
    __tablename__ = 'case_studies'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    client_name = Column(String, nullable=True)  # Can be anonymized
    industry = Column(String, nullable=True)
    
    # Case study details
    challenge = Column(Text)
    solution = Column(Text)
    results = Column(Text)
    
    # Metrics
    project_value = Column(Float, nullable=True)
    duration_months = Column(Integer, nullable=True)
    roi_percentage = Column(Float, nullable=True)
    
    # Categorization
    technologies_used = Column(JSON)  # List of technologies/SKUs
    keywords = Column(JSON)  # List of keywords for matching
    
    # Metadata
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    """Audit trail for all system actions"""
    __tablename__ = 'audit_log'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Action details
    action = Column(String, nullable=False)  # create, update, delete, process
    entity_type = Column(String, nullable=False)  # rfp, proposal, pricing, etc.
    entity_id = Column(Integer, nullable=True)
    
    # User/system info
    user_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # Details
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


# ============================================================================
# LEGACY MODELS (for backward compatibility)
# ============================================================================

class Rfpdata(Base):
    """Legacy RFP data model"""
    __tablename__ = 'rfp_ingestion_data'
    
    file_path = Column(String, primary_key=True, index=True)
    rfp_id = Column(Integer, unique=True, index=True)
    rfp_title = Column(String)
    buyer = Column(String)
    technical_requirements = Column(String)
    scope_of_work = Column(String)
    deadline = Column(String)


class RiskandCompilance(Base):
    """Legacy Risk and Compliance model"""
    __tablename__ = 'risk_and_compilance_data'
    
    file_path = Column(String, primary_key=True, index=True)
    legal_risks = Column(String)
    flagging_score = Column(String)
    risk_brief = Column(String)
