"""
Proposal Weaver Agent - Natural Language Generation for Proposal Creation
Uses NLG to create persuasive narratives from structured data.
Synthesizes SKU matches, pricing, risk profiles, and PWin highlights into high-quality proposals.
"""

from typing import TypedDict, Literal, Optional, List, Dict
import os
import json
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# ============================================================================
# Data Models
# ============================================================================

class SKUMatch(BaseModel):
    """Represents a matched SKU with technical details"""
    sku_id: str
    sku_name: str
    match_confidence_score: float
    technical_specs: Optional[Dict[str, str]] = None
    advantages: Optional[List[str]] = None


class PricingInfo(BaseModel):
    """Pricing information from Dynamic Pricing Agent"""
    total_price: float
    pricing_table: List[Dict]
    strategic_margin_adjustment: Optional[float] = None
    competitive_positioning: Optional[str] = None


class RiskProfile(BaseModel):
    """Risk assessment information"""
    overall_risk_level: Literal["Low", "Medium", "High"]
    risk_notes: List[str]
    critical_errors: Optional[List[str]] = None


class PWinHighlights(BaseModel):
    """Probability of winning highlights"""
    pwin_score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


class ClientType(BaseModel):
    """Client type classification"""
    client_type: Literal["PSU", "Private", "Government", "Enterprise"]
    client_name: Optional[str] = None
    industry: Optional[str] = None


class AgentState(TypedDict):
    """State for the Proposal Weaver Agent"""
    # Inputs from Blackboard
    sku_matches: List[Dict]  # SKU matches with technical details
    pricing_info: Dict  # Pricing information from Dynamic Pricing Agent
    risk_profile: Dict  # Risk assessment
    pwin_highlights: Dict  # PWin analysis highlights
    client_type: Dict  # Client type and details
    
    # Boilerplate Library
    boilerplate_library: Dict[str, List[str]]  # {section: [boilerplate_texts]}
    case_studies: List[Dict]  # List of case studies with metadata
    
    # Intermediate Results
    selected_boilerplate: Optional[Dict[str, str]]  # Selected boilerplate per section
    selected_case_studies: Optional[List[Dict]]  # Relevant case studies
    generated_sections: Optional[Dict[str, str]]  # Generated prose for each section
    
    # Outputs
    executive_summary: Optional[str]
    technical_section: Optional[str]
    pricing_section: Optional[str]
    risk_mitigation_section: Optional[str]
    competitive_advantages_section: Optional[str]
    case_studies_section: Optional[str]
    complete_proposal: Optional[str]
    
    # Metadata
    use_llm: bool


# ============================================================================
# Boilerplate Library (Default)
# ============================================================================

DEFAULT_BOILERPLATE_LIBRARY = {
    "introduction": [
        "We are pleased to present this comprehensive proposal for your consideration.",
        "Thank you for the opportunity to submit our proposal for this important project.",
        "We are excited to present our solution that addresses your specific requirements.",
    ],
    "technical_excellence": [
        "Our solution leverages cutting-edge technology to deliver superior performance.",
        "We have carefully matched our products to your technical specifications.",
        "Our technical approach ensures optimal alignment with your requirements.",
    ],
    "pricing_competitive": [
        "We have structured our pricing to provide exceptional value while maintaining competitive positioning.",
        "Our pricing reflects our commitment to delivering cost-effective solutions.",
        "We offer competitive pricing that balances quality and affordability.",
    ],
    "risk_mitigation": [
        "We have identified potential risks and developed comprehensive mitigation strategies.",
        "Our risk management approach ensures project success and minimizes potential disruptions.",
        "We proactively address risks through proven methodologies and contingency planning.",
    ],
    "conclusion": [
        "We look forward to the opportunity to partner with you on this project.",
        "We are confident that our solution will exceed your expectations.",
        "Thank you for considering our proposal. We are ready to begin immediately upon award.",
    ]
}

DEFAULT_CASE_STUDIES = [
    {
        "title": "Large PSU Implementation",
        "client_type": "PSU",
        "industry": "Energy",
        "outcome": "Successfully delivered 20% cost savings and improved efficiency",
        "key_achievements": ["On-time delivery", "Cost optimization", "Technical excellence"],
        "relevance_score": 0.0
    },
    {
        "title": "Private Enterprise Transformation",
        "client_type": "Private",
        "industry": "Manufacturing",
        "outcome": "Achieved 30% productivity improvement",
        "key_achievements": ["Scalable solution", "ROI within 12 months", "Seamless integration"],
        "relevance_score": 0.0
    },
    {
        "title": "Government Sector Deployment",
        "client_type": "Government",
        "industry": "Public Services",
        "outcome": "Enhanced service delivery with 25% efficiency gain",
        "key_achievements": ["Compliance adherence", "Security excellence", "Public impact"],
        "relevance_score": 0.0
    }
]


# ============================================================================
# LLM Helper Functions
# ============================================================================

# Global flag to track quota exhaustion
_quota_exceeded = False

def is_quota_error(exception):
    """Check if exception is a quota/resource exhaustion error"""
    error_str = str(exception).lower()
    return (
        "quota" in error_str or
        "resourceexhausted" in error_str or
        "429" in error_str or
        "rate limit" in error_str or
        "rate_limit" in error_str
    )

def get_llm():
    """Get LLM instance - tries Gemini first, then OpenAI, then Anthropic"""
    global _quota_exceeded
    
    # If quota already exceeded, skip LLM initialization
    if _quota_exceeded:
        return None
    
    # Try Google Gemini first
    if os.getenv("GOOGLE_API_KEY"):
        # Try available models (skip if quota exceeded)
        model_names = [
            "gemini-pro",        # Stable model that should work
        ]
        
        for model_name in model_names:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    temperature=0.7,
                    max_retries=1  # Reduce retries to fail fast
                )
                # Quick test with minimal tokens
                try:
                    llm.invoke("Hi")
                except Exception as e:
                    if is_quota_error(e):
                        _quota_exceeded = True
                        print("⚠️  API quota exceeded. Falling back to template-based generation.")
                        return None
                    continue
                return llm
            except Exception as e:
                if is_quota_error(e):
                    _quota_exceeded = True
                    print("⚠️  API quota exceeded. Falling back to template-based generation.")
                    return None
                continue
        
        print("⚠️  Gemini models not available. Falling back to template-based generation.")
    
    
    
    return None


# ============================================================================
# Step 1: Select Relevant Boilerplate and Case Studies
# ============================================================================

def select_boilerplate_and_case_studies(state: AgentState) -> AgentState:
    """
    Step 1: Select relevant boilerplate and case studies based on client type.
    Customizes content selection for PSU vs Private clients.
    """
    client_type_data = state.get("client_type", {})
    client_type = client_type_data.get("client_type", "Private")
    
    boilerplate_library = state.get("boilerplate_library", DEFAULT_BOILERPLATE_LIBRARY)
    case_studies = state.get("case_studies", DEFAULT_CASE_STUDIES)
    
    # Select boilerplate (for now, use first option - can be enhanced with LLM selection)
    selected_boilerplate = {}
    for section, options in boilerplate_library.items():
        selected_boilerplate[section] = options[0] if options else ""
    
    # Select case studies based on client type
    selected_case_studies = []
    for case_study in case_studies:
        if case_study.get("client_type") == client_type:
            selected_case_studies.append(case_study)
    
    # If no exact match, select top 2 most relevant
    if not selected_case_studies:
        selected_case_studies = case_studies[:2]
    
    state["selected_boilerplate"] = selected_boilerplate
    state["selected_case_studies"] = selected_case_studies
    
    return state



def generate_executive_summary(state: AgentState) -> AgentState:
    """
    Step 2: Generate a tailored Executive Summary using NLG.
    Synthesizes key highlights from all inputs.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        # Fallback to template-based summary
        state["executive_summary"] = generate_template_executive_summary(state)
        return state
    
    sku_matches = state.get("sku_matches", [])
    pricing_info = state.get("pricing_info", {})
    pwin_highlights = state.get("pwin_highlights", {})
    client_type_data = state.get("client_type", {})
    
    # Extract key information
    total_price = pricing_info.get("total_price", 0)
    pwin_score = pwin_highlights.get("pwin_score", 0)
    client_name = client_type_data.get("client_name", "Valued Client")
    client_type = client_type_data.get("client_type", "Private")
    
    # Count SKU matches
    num_items = len(sku_matches)
    high_confidence_matches = [m for m in sku_matches if m.get("match_confidence_score", 0) > 90]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert proposal writer specializing in creating compelling executive summaries 
        for technical proposals. Your summaries are persuasive, professional, and tailored to the client type.
        
        Guidelines:
        - For PSU clients: Emphasize compliance, reliability, and public value
        - For Private clients: Focus on ROI, efficiency, and competitive advantage
        - Highlight technical excellence and superior value proposition
        - Keep it concise (150-200 words) but impactful
        - Use professional business language"""),
        ("user", """Create an executive summary for a proposal with the following details:

Client: {client_name} ({client_type})
Total Proposal Value: ${total_price:,.2f}
Probability of Winning: {pwin_score}%
Number of Items: {num_items}
High Confidence Matches: {high_confidence_count}

Key Strengths:
{strengths}

Write a compelling executive summary that synthesizes these elements into a persuasive narrative.""")
    ])
    
    try:
        strengths = pwin_highlights.get("strengths", [])
        strengths_text = "\n".join(f"- {s}" for s in strengths[:5]) if strengths else "Technical excellence and competitive pricing"
        
        chain = prompt | llm
        response = chain.invoke({
            "client_name": client_name,
            "client_type": client_type,
            "total_price": total_price,
            "pwin_score": pwin_score,
            "num_items": num_items,
            "high_confidence_count": len(high_confidence_matches),
            "strengths": strengths_text
        })
        
        executive_summary = response.content if hasattr(response, 'content') else str(response)
        state["executive_summary"] = executive_summary
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation for remaining sections.")
        else:
            print(f"LLM executive summary error: {e}, using template")
        state["executive_summary"] = generate_template_executive_summary(state)
    
    return state


def generate_template_executive_summary(state: AgentState) -> str:
    """Template-based fallback for executive summary"""
    pricing_info = state.get("pricing_info", {})
    pwin_highlights = state.get("pwin_highlights", {})
    client_type_data = state.get("client_type", {})
    
    client_name = client_type_data.get("client_name", "Valued Client")
    total_price = pricing_info.get("total_price", 0)
    pwin_score = pwin_highlights.get("pwin_score", 0)
    
    return f"""EXECUTIVE SUMMARY

We are pleased to present this comprehensive proposal to {client_name}. Our solution has been carefully designed to meet your specific requirements, with a total investment of ${total_price:,.2f}.

Our proposal demonstrates strong alignment with your technical specifications, competitive pricing, and a robust risk mitigation strategy. With a probability of winning assessment of {pwin_score}%, we are confident in our ability to deliver exceptional value and exceed your expectations.

We look forward to the opportunity to partner with you on this important initiative."""


# ============================================================================
# Step 3: Generate Technical Section (Generative Weaving)
# ============================================================================

def generate_technical_section(state: AgentState) -> AgentState:
    """
    Step 3: Generate Technical Section using Generative Weaving.
    Converts structured SKU match data into persuasive prose.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        state["technical_section"] = generate_template_technical_section(state)
        return state
    
    sku_matches = state.get("sku_matches", [])
    selected_boilerplate = state.get("selected_boilerplate", {})
    
    # Prepare SKU match data for weaving
    sku_data = []
    for match in sku_matches:
        sku_data.append({
            "sku_id": match.get("sku_id", ""),
            "sku_name": match.get("sku_name", ""),
            "confidence": match.get("match_confidence_score", 0),
            "advantages": match.get("advantages", [])
        })
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert technical writer. Your task is to convert structured technical data 
        into compelling prose that highlights superior specification matching and technical advantages.
        
        Guidelines:
        - Transform table-like data into flowing narrative
        - Emphasize how each SKU matches client requirements
        - Highlight technical advantages and superior specifications
        - Use persuasive language that demonstrates expertise
        - Structure: Introduction → Item-by-item analysis → Summary"""),
        ("user", """Convert the following SKU match data into persuasive technical prose:

{sku_data}

Write a comprehensive technical section (300-400 words) that weaves this structured data into a compelling narrative about technical excellence and specification matching.""")
    ])
    
    try:
        sku_data_json = json.dumps(sku_data, indent=2)
        
        chain = prompt | llm
        response = chain.invoke({
            "sku_data": sku_data_json
        })
        
        technical_section = response.content if hasattr(response, 'content') else str(response)
        state["technical_section"] = technical_section
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation.")
        else:
            print(f"LLM technical section error: {e}, using template")
        state["technical_section"] = generate_template_technical_section(state)
    
    return state


def generate_template_technical_section(state: AgentState) -> str:
    """Template-based fallback for technical section"""
    sku_matches = state.get("sku_matches", [])
    
    section = "TECHNICAL APPROACH\n\n"
    section += "Our solution has been meticulously designed to align with your technical specifications. "
    section += f"We have identified {len(sku_matches)} key components that match your requirements:\n\n"
    
    for i, match in enumerate(sku_matches[:10], 1):  # Limit to first 10
        sku_name = match.get("sku_name", "Unknown")
        confidence = match.get("match_confidence_score", 0)
        section += f"{i}. {sku_name}: With a match confidence of {confidence:.1f}%, this component "
        section += "demonstrates strong alignment with your specifications.\n"
    
    section += "\nOur technical approach ensures optimal performance and reliability."
    
    return section


# ============================================================================
# Step 4: Generate Pricing Section
# ============================================================================

def generate_pricing_section(state: AgentState) -> AgentState:
    """
    Step 4: Generate Pricing Section that presents pricing information persuasively.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        state["pricing_section"] = generate_template_pricing_section(state)
        return state
    
    pricing_info = state.get("pricing_info", {})
    pricing_table = pricing_info.get("pricing_table", [])
    total_price = pricing_info.get("total_price", 0)
    strategic_adjustment = pricing_info.get("strategic_margin_adjustment", 0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at presenting pricing information in proposals. 
        Your goal is to make pricing appear competitive, value-driven, and justified.
        
        Guidelines:
        - Emphasize value proposition, not just cost
        - Highlight competitive positioning
        - Use professional pricing language
        - Structure: Value statement → Pricing overview → Summary"""),
        ("user", """Create a pricing section for a proposal with:

Total Price: ${total_price:,.2f}
Number of Line Items: {num_items}
Strategic Positioning: {positioning}

Write a compelling pricing section (200-250 words) that presents this pricing information 
in a way that emphasizes value and competitive advantage.""")
    ])
    
    try:
        positioning = "Competitive" if strategic_adjustment <= 0 else "Premium"
        if strategic_adjustment < -0.05:
            positioning = "Highly Competitive"
        
        chain = prompt | llm
        response = chain.invoke({
            "total_price": total_price,
            "num_items": len(pricing_table),
            "positioning": positioning
        })
        
        pricing_section = response.content if hasattr(response, 'content') else str(response)
        state["pricing_section"] = pricing_section
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation.")
        else:
            print(f"LLM pricing section error: {e}, using template")
        state["pricing_section"] = generate_template_pricing_section(state)
    
    return state


def generate_template_pricing_section(state: AgentState) -> str:
    """Template-based fallback for pricing section"""
    pricing_info = state.get("pricing_info", {})
    total_price = pricing_info.get("total_price", 0)
    pricing_table = pricing_info.get("pricing_table", [])
    
    section = "PRICING\n\n"
    section += f"Our proposal represents exceptional value with a total investment of ${total_price:,.2f}. "
    section += f"This comprehensive solution includes {len(pricing_table)} line items, each carefully "
    section += "priced to provide optimal value while maintaining competitive positioning.\n\n"
    section += "Our pricing structure reflects our commitment to delivering cost-effective solutions "
    section += "without compromising on quality or performance."
    
    return section


# ============================================================================
# Step 5: Generate Risk Mitigation Section
# ============================================================================

def generate_risk_mitigation_section(state: AgentState) -> AgentState:
    """
    Step 5: Generate Risk Mitigation Section based on risk profile.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        state["risk_mitigation_section"] = generate_template_risk_section(state)
        return state
    
    risk_profile = state.get("risk_profile", {})
    risk_level = risk_profile.get("overall_risk_level", "Medium")
    risk_notes = risk_profile.get("risk_notes", [])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at writing risk mitigation sections for proposals.
        Your goal is to acknowledge risks while demonstrating proactive management and confidence.
        
        Guidelines:
        - Acknowledge identified risks professionally
        - Present mitigation strategies confidently
        - Emphasize experience and proven methodologies
        - Structure: Risk overview → Mitigation strategies → Confidence statement"""),
        ("user", """Create a risk mitigation section for a proposal with:

Overall Risk Level: {risk_level}
Risk Notes: {risk_notes}

Write a comprehensive risk mitigation section (200-250 words) that addresses these risks 
and demonstrates strong mitigation strategies.""")
    ])
    
    try:
        risk_notes_text = "\n".join(f"- {note}" for note in risk_notes[:5]) if risk_notes else "Standard project risks"
        
        chain = prompt | llm
        response = chain.invoke({
            "risk_level": risk_level,
            "risk_notes": risk_notes_text
        })
        
        risk_section = response.content if hasattr(response, 'content') else str(response)
        state["risk_mitigation_section"] = risk_section
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation.")
        else:
            print(f"LLM risk section error: {e}, using template")
        state["risk_mitigation_section"] = generate_template_risk_section(state)
    
    return state


def generate_template_risk_section(state: AgentState) -> str:
    """Template-based fallback for risk section"""
    risk_profile = state.get("risk_profile", {})
    risk_level = risk_profile.get("overall_risk_level", "Medium")
    risk_notes = risk_profile.get("risk_notes", [])
    
    section = "RISK MITIGATION\n\n"
    section += f"We have conducted a comprehensive risk assessment and identified a {risk_level.lower()} overall risk level. "
    section += "Our risk management approach includes:\n\n"
    
    if risk_notes:
        for note in risk_notes[:5]:
            section += f"- {note}\n"
    else:
        section += "- Proactive risk identification and monitoring\n"
        section += "- Contingency planning for critical path items\n"
        section += "- Regular risk review and mitigation updates\n"
    
    section += "\nWe are confident in our ability to manage and mitigate these risks effectively."
    
    return section


# ============================================================================
# Step 6: Generate Competitive Advantages Section
# ============================================================================

def generate_competitive_advantages_section(state: AgentState) -> AgentState:
    """
    Step 6: Generate Competitive Advantages Section using PWin highlights.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        state["competitive_advantages_section"] = generate_template_competitive_section(state)
        return state
    
    pwin_highlights = state.get("pwin_highlights", {})
    strengths = pwin_highlights.get("strengths", [])
    recommendations = pwin_highlights.get("recommendations", [])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at writing competitive advantages sections for proposals.
        Your goal is to highlight why this proposal stands out from competitors.
        
        Guidelines:
        - Emphasize unique strengths and differentiators
        - Use persuasive language
        - Structure: Key advantages → Supporting details → Summary"""),
        ("user", """Create a competitive advantages section highlighting:

Strengths: {strengths}
Recommendations: {recommendations}

Write a compelling competitive advantages section (200-250 words) that showcases why this proposal is superior.""")
    ])
    
    try:
        strengths_text = "\n".join(f"- {s}" for s in strengths[:5]) if strengths else "Technical excellence"
        recommendations_text = "\n".join(f"- {r}" for r in recommendations[:3]) if recommendations else "Proven track record"
        
        chain = prompt | llm
        response = chain.invoke({
            "strengths": strengths_text,
            "recommendations": recommendations_text
        })
        
        competitive_section = response.content if hasattr(response, 'content') else str(response)
        state["competitive_advantages_section"] = competitive_section
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation.")
        else:
            print(f"LLM competitive section error: {e}, using template")
        state["competitive_advantages_section"] = generate_template_competitive_section(state)
    
    return state


def generate_template_competitive_section(state: AgentState) -> str:
    """Template-based fallback for competitive section"""
    pwin_highlights = state.get("pwin_highlights", {})
    strengths = pwin_highlights.get("strengths", ["Technical excellence", "Competitive pricing"])
    
    section = "COMPETITIVE ADVANTAGES\n\n"
    section += "Our proposal offers several key advantages:\n\n"
    
    for strength in strengths[:5]:
        section += f"- {strength}\n"
    
    section += "\nThese advantages position us as the ideal partner for this project."
    
    return section


# ============================================================================
# Step 7: Generate Case Studies Section
# ============================================================================

def generate_case_studies_section(state: AgentState) -> AgentState:
    """
    Step 7: Generate Case Studies Section using selected case studies.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    if llm is None:
        state["case_studies_section"] = generate_template_case_studies_section(state)
        return state
    
    selected_case_studies = state.get("selected_case_studies", [])
    client_type_data = state.get("client_type", {})
    client_type = client_type_data.get("client_type", "Private")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at writing case study sections for proposals.
        Your goal is to present relevant case studies that demonstrate success and build confidence.
        
        Guidelines:
        - Highlight outcomes and achievements
        - Connect case studies to current proposal
        - Use persuasive narrative
        - Structure: Introduction → Case study summaries → Relevance statement"""),
        ("user", """Create a case studies section for a {client_type} client proposal using these case studies:

{case_studies}

Write a compelling case studies section (250-300 words) that demonstrates relevant success stories.""")
    ])
    
    try:
        case_studies_text = json.dumps(selected_case_studies, indent=2)
        
        chain = prompt | llm
        response = chain.invoke({
            "client_type": client_type,
            "case_studies": case_studies_text
        })
        
        case_studies_section = response.content if hasattr(response, 'content') else str(response)
        state["case_studies_section"] = case_studies_section
        
    except Exception as e:
        if is_quota_error(e):
            _quota_exceeded = True
            print("⚠️  API quota exceeded. Using template-based generation.")
        else:
            print(f"LLM case studies section error: {e}, using template")
        state["case_studies_section"] = generate_template_case_studies_section(state)
    
    return state


def generate_template_case_studies_section(state: AgentState) -> str:
    """Template-based fallback for case studies section"""
    selected_case_studies = state.get("selected_case_studies", [])
    
    section = "RELEVANT CASE STUDIES\n\n"
    section += "Our track record demonstrates consistent success in similar engagements:\n\n"
    
    for case_study in selected_case_studies[:3]:
        title = case_study.get("title", "Project")
        outcome = case_study.get("outcome", "Successful delivery")
        section += f"• {title}: {outcome}\n"
    
    section += "\nThese case studies demonstrate our ability to deliver exceptional results."
    
    return section


# ============================================================================
# Step 8: Weave Complete Proposal
# ============================================================================

def weave_complete_proposal(state: AgentState) -> AgentState:
    """
    Step 8: Weave all sections into a complete, cohesive proposal document.
    """
    global _quota_exceeded
    use_llm = state.get("use_llm", True) and not _quota_exceeded
    llm = get_llm() if use_llm else None
    
    # Collect all sections
    sections = {
        "Executive Summary": state.get("executive_summary", ""),
        "Technical Approach": state.get("technical_section", ""),
        "Pricing": state.get("pricing_section", ""),
        "Risk Mitigation": state.get("risk_mitigation_section", ""),
        "Competitive Advantages": state.get("competitive_advantages_section", ""),
        "Case Studies": state.get("case_studies_section", "")
    }
    
    if llm:
        # Use LLM to create smooth transitions and cohesive narrative
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert proposal writer. Your task is to weave individual sections 
            into a cohesive, professional proposal document with smooth transitions.
            
            Guidelines:
            - Add appropriate section headers
            - Create smooth transitions between sections
            - Ensure consistent tone and style
            - Add a professional cover page structure
            - Maintain persuasive narrative flow"""),
            ("user", """Weave the following proposal sections into a complete, cohesive document:

{sections}

Create a complete proposal document with proper formatting, section headers, and smooth transitions.""")
        ])
        
        try:
            sections_text = "\n\n".join([f"=== {title} ===\n{content}" for title, content in sections.items()])
            
            chain = prompt | llm
            response = chain.invoke({
                "sections": sections_text
            })
            
            complete_proposal = response.content if hasattr(response, 'content') else str(response)
            state["complete_proposal"] = complete_proposal
            
        except Exception as e:
            if is_quota_error(e):
                _quota_exceeded = True
                print("⚠️  API quota exceeded. Using template-based generation.")
            else:
                print(f"LLM proposal weaving error: {e}, using template")
            state["complete_proposal"] = weave_template_proposal(sections)
    else:
        state["complete_proposal"] = weave_template_proposal(sections)
    
    return state


def weave_template_proposal(sections: Dict[str, str]) -> str:
    """Template-based proposal weaving"""
    proposal = "=" * 80 + "\n"
    proposal += "PROPOSAL DOCUMENT\n"
    proposal += "=" * 80 + "\n\n"
    
    for title, content in sections.items():
        proposal += f"{'=' * 80}\n"
        proposal += f"{title.upper()}\n"
        proposal += f"{'=' * 80}\n\n"
        proposal += content + "\n\n"
    
    proposal += "=" * 80 + "\n"
    proposal += "END OF PROPOSAL\n"
    proposal += "=" * 80 + "\n"
    
    return proposal


# ============================================================================
# LangGraph Agent Construction
# ============================================================================

def create_proposal_weaver_agent():
    """Create and return the Proposal Weaver Agent graph"""
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("select_content", select_boilerplate_and_case_studies)
    workflow.add_node("generate_exec_summary", generate_executive_summary)
    workflow.add_node("generate_technical", generate_technical_section)
    workflow.add_node("generate_pricing", generate_pricing_section)
    workflow.add_node("generate_risk", generate_risk_mitigation_section)
    workflow.add_node("generate_competitive", generate_competitive_advantages_section)
    workflow.add_node("generate_case_studies", generate_case_studies_section)
    workflow.add_node("weave_proposal", weave_complete_proposal)
    
    # Define the flow
    workflow.set_entry_point("select_content")
    workflow.add_edge("select_content", "generate_exec_summary")
    
    # Generate sections in parallel (can be done sequentially too)
    workflow.add_edge("generate_exec_summary", "generate_technical")
    workflow.add_edge("generate_technical", "generate_pricing")
    workflow.add_edge("generate_pricing", "generate_risk")
    workflow.add_edge("generate_risk", "generate_competitive")
    workflow.add_edge("generate_competitive", "generate_case_studies")
    workflow.add_edge("generate_case_studies", "weave_proposal")
    workflow.add_edge("weave_proposal", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    # Reset quota flag for new run
    _quota_exceeded = False
    
    # Check if LLM is available
    use_llm = bool(os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))
    if not use_llm:
        print("⚠️  No LLM API key found. Using template-based generation.")
        print("   Set GOOGLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to use LLM.\n")
    
    # Demo inputs
    demo_state = {
        "sku_matches": [
            {
                "sku_id": "SKU-001",
                "sku_name": "Premium Widget A",
                "match_confidence_score": 92.5,
                "advantages": ["Superior performance", "Energy efficient", "Long warranty"]
            },
            {
                "sku_id": "SKU-002",
                "sku_name": "Standard Widget B",
                "match_confidence_score": 98.0,
                "advantages": ["Proven reliability", "Cost effective"]
            }
        ],
        "pricing_info": {
            "total_price": 150000.0,
            "pricing_table": [
                {"sku_id": "SKU-001", "total_price": 100000.0},
                {"sku_id": "SKU-002", "total_price": 50000.0}
            ],
            "strategic_margin_adjustment": 0.05
        },
        "risk_profile": {
            "overall_risk_level": "Low",
            "risk_notes": [
                "All SKUs have high match confidence",
                "Standard implementation approach",
                "Proven technology stack"
            ]
        },
        "pwin_highlights": {
            "pwin_score": 85.0,
            "strengths": [
                "Strong technical match",
                "Competitive pricing",
                "Proven track record",
                "Excellent client relationship"
            ],
            "weaknesses": [
                "Some competitors have longer market presence"
            ],
            "recommendations": [
                "Emphasize technical superiority",
                "Highlight cost-effectiveness",
                "Leverage case studies"
            ]
        },
        "client_type": {
            "client_type": "PSU",
            "client_name": "National Energy Corporation",
            "industry": "Energy"
        },
        "boilerplate_library": DEFAULT_BOILERPLATE_LIBRARY,
        "case_studies": DEFAULT_CASE_STUDIES,
        "use_llm": use_llm,
        "selected_boilerplate": None,
        "selected_case_studies": None,
        "generated_sections": None,
        "executive_summary": None,
        "technical_section": None,
        "pricing_section": None,
        "risk_mitigation_section": None,
        "competitive_advantages_section": None,
        "case_studies_section": None,
        "complete_proposal": None
    }
    
    # Create and run the agent
    agent = create_proposal_weaver_agent()
    result = agent.invoke(demo_state)
    
    # Display results
    print("=" * 80)
    print("Proposal Weaver Agent - Results")
    print("=" * 80)
    
    print(f"\nClient: {result['client_type'].get('client_name', 'Unknown')} ({result['client_type'].get('client_type', 'Unknown')})")
    print(f"Using LLM: {'Yes' if result.get('use_llm') else 'No (Template-based)'}")
    
    print("\n" + "=" * 80)
    print("COMPLETE PROPOSAL")
    print("=" * 80)
    print(result.get("complete_proposal", "Proposal generation failed"))
    
    print("\n" + "=" * 80)

