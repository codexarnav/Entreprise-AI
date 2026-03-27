from langgraph.graph import StateGraph, START, END
from typing import List, Dict, Any, TypedDict, Optional
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from datetime import datetime


class Requirement(TypedDict):
    requirement_id: str
    deadline: datetime
    description: str
    priority: str
    pricing: Dict[str, Any]
    technical_specifications: Dict[str, Any]


class ProcurementState(TypedDict):
    requirement: Requirement
    vendors: List[Dict[str, Any]]
    market_insights: str
    normalized_vendors: List[Dict[str, float]]
    scored_vendors: List[Dict[str, Any]]
    top_vendors: List[Dict[str, Any]]
    negotiation_history: List[Dict[str, Any]]
    user_action: Optional[Dict[str, Any]]
    final_vendor: Optional[Dict[str, Any]]
    decision: Dict[str, Any]


def market_research(state: ProcurementState) -> ProcurementState:
    """LLM: Extract market trends, price insights, risks"""
    requirement = state["requirement"]
    
    prompt = f"""Analyze market conditions for this procurement:

Requirement:
- ID: {requirement['requirement_id']}
- Description: {requirement['description']}
- Priority: {requirement['priority']}
- Budget: {requirement['pricing'].get('budget', 'Not specified')}
- Tech Specs: {json.dumps(requirement['technical_specifications'])}

Provide:
1. Current market price trends
2. Supply chain risks
3. Compliance constraints
4. Recommended negotiation strategy

Keep response concise and factual."""

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-pro",
        temperature=0.3,
        api_key=os.getenv("GEMINI_API_KEY")
    )
    
    response = model.invoke(prompt)
    state["market_insights"] = response.content
    
    return state


def normalize_vendors(state: ProcurementState) -> ProcurementState:
    """Convert vendor data to numeric scores (0-1)"""
    vendors = state["vendors"]
    budget = state["requirement"]["pricing"].get("budget", 100000)
    
    normalized = []
    for vendor in vendors:
        norm_vendor = {
            "vendor_id": vendor.get("vendor_id"),
            "name": vendor.get("name"),
            "cost_score": 1.0 - (vendor.get("cost", budget) / budget * 0.5),
            "technical_score": vendor.get("technical_rating", 5) / 5.0,
            "delivery_score": 1.0 - ((vendor.get("avg_delivery_days", 30) - 1) / 60),
            "financial_score": vendor.get("financial_rating", 3) / 5.0,
            "compliance_score": 1.0 if vendor.get("compliant", True) else 0.5,
            "history_score": min(vendor.get("transaction_count", 0) / 50.0, 1.0),
        }
        normalized.append(norm_vendor)
    
    state["normalized_vendors"] = normalized
    return state


def compute_score(vendor: Dict[str, Any], weights: Dict[str, float]) -> float:
    """Weighted scoring engine (deterministic, no LLM)"""
    score = (
        vendor.get("cost_score", 0.5) * weights.get("cost", 0.25) +
        vendor.get("technical_score", 0.5) * weights.get("technical", 0.25) +
        vendor.get("delivery_score", 0.5) * weights.get("delivery", 0.15) +
        vendor.get("financial_score", 0.5) * weights.get("financial", 0.20) +
        vendor.get("compliance_score", 0.5) * weights.get("compliance", 0.10) +
        vendor.get("history_score", 0.5) * weights.get("history", 0.05)
    )
    return max(0.0, min(1.0, score))


def scoring_engine(state: ProcurementState) -> ProcurementState:
    """Score all vendors deterministically"""
    priority = state["requirement"].get("priority", "balanced").lower()
    
    if priority == "cost":
        weights = {"cost": 0.40, "technical": 0.20, "delivery": 0.15, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    elif priority == "technical":
        weights = {"cost": 0.20, "technical": 0.40, "delivery": 0.15, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    elif priority == "speed":
        weights = {"cost": 0.20, "technical": 0.25, "delivery": 0.30, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    else:  # balanced
        weights = {"cost": 0.25, "technical": 0.25, "delivery": 0.15, "financial": 0.20, "compliance": 0.10, "history": 0.05}
    
    scored = []
    for vendor in state["normalized_vendors"]:
        final_score = compute_score(vendor, weights)
        scored.append({
            **vendor,
            "final_score": final_score,
            "score_breakdown": {
                "cost": vendor.get("cost_score", 0) * weights["cost"],
                "technical": vendor.get("technical_score", 0) * weights["technical"],
                "delivery": vendor.get("delivery_score", 0) * weights["delivery"],
                "financial": vendor.get("financial_score", 0) * weights["financial"],
                "compliance": vendor.get("compliance_score", 0) * weights["compliance"],
                "history": vendor.get("history_score", 0) * weights["history"],
            }
        })
    
    scored.sort(key=lambda x: x["final_score"], reverse=True)
    state["scored_vendors"] = scored
    return state

def select_top_vendors(state: ProcurementState) -> ProcurementState:
    """Select top 2-3 vendors for negotiation"""
    top_count = min(3, max(1, len(state["scored_vendors"])))
    state["top_vendors"] = state["scored_vendors"][:top_count]
    return state

def negotiation_simulation(state: ProcurementState, user_action: Dict[str, Any]) -> ProcurementState:
    
    vendor_id = user_action.get("vendor_id")
    intent = user_action.get("negotiation_intent", "reduce_cost")
    target_value = user_action.get("target_value")
    
    negotiated_vendors = state["top_vendors"].copy()
    negotiated_vendor = None
    vendor_index = -1
    
    for idx, vendor in enumerate(negotiated_vendors):
        if vendor.get("vendor_id") == vendor_id:
            negotiated_vendor = vendor.copy()
            vendor_index = idx
            break
    
    if negotiated_vendor is None:
        state["user_action"] = user_action
        return state
    
    original_vendor = negotiated_vendor.copy()
    tradeoff_note = []
    
    if intent == "reduce_cost":
        # Cost reduction causes delivery delay and financial risk
        cost_reduction_pct = 0.90  # 10% cost reduction
        original_cost = negotiated_vendor.get("cost", 10000)
        new_cost = original_cost * cost_reduction_pct
        
        negotiated_vendor["cost"] = new_cost
        negotiated_vendor["cost_score"] = min(1.0, (1.0 - (new_cost / 100000)) * 0.5 + negotiated_vendor.get("cost_score", 0) * 0.5)
        
        # Delivery slips
        negotiated_vendor["delivery_score"] = max(0.4, negotiated_vendor.get("delivery_score", 0.5) - 0.10)
        tradeoff_note.append(f"Cost reduced by {(1-cost_reduction_pct)*100:.0f}%")
        tradeoff_note.append(f"Delivery timeline +5 days (delivery_score: {original_vendor.get('delivery_score', 0):.3f} → {negotiated_vendor['delivery_score']:.3f})")
        
        # Financial risk increases
        negotiated_vendor["financial_score"] = max(0.4, negotiated_vendor.get("financial_score", 0.5) - 0.08)
        tradeoff_note.append(f"Financial stability risk increases (financial_score: {original_vendor.get('financial_score', 0):.3f} → {negotiated_vendor['financial_score']:.3f})")
    
    elif intent == "accelerate_delivery":
        # Faster delivery increases cost and reduces profit margin
        acceleration_factor = 1.15  # 15% faster
        original_cost = negotiated_vendor.get("cost", 10000)
        new_cost = original_cost * acceleration_factor
        
        negotiated_vendor["cost"] = new_cost
        negotiated_vendor["cost_score"] = max(0.3, negotiated_vendor.get("cost_score", 0.5) - 0.12)
        tradeoff_note.append(f"Accelerated delivery incurs {(acceleration_factor-1)*100:.0f}% cost increase")
        
        # Delivery improves significantly
        negotiated_vendor["delivery_score"] = min(1.0, negotiated_vendor.get("delivery_score", 0.5) + 0.15)
        tradeoff_note.append(f"Delivery timeline: -7 days (delivery_score: {original_vendor.get('delivery_score', 0):.3f} → {negotiated_vendor['delivery_score']:.3f})")
        
        # Financial strain
        negotiated_vendor["financial_score"] = max(0.4, negotiated_vendor.get("financial_score", 0.5) - 0.08)
        tradeoff_note.append(f"Vendor financial stress increases (financial_score: {original_vendor.get('financial_score', 0):.3f} → {negotiated_vendor['financial_score']:.3f})")
    
    elif intent == "improve_terms":
        # Better terms reduce both cost and delivery slightly
        negotiated_vendor["compliance_score"] = min(1.0, negotiated_vendor.get("compliance_score", 0.7) + 0.10)
        negotiated_vendor["cost_score"] = min(1.0, negotiated_vendor.get("cost_score", 0.5) + 0.05)
        tradeoff_note.append(f"Enhanced compliance commitments (compliance_score: {original_vendor.get('compliance_score', 0):.3f} → {negotiated_vendor['compliance_score']:.3f})")
        tradeoff_note.append(f"Minor cost concessions (cost_score: {original_vendor.get('cost_score', 0):.3f} → {negotiated_vendor['cost_score']:.3f})")
    
    negotiated_vendor["negotiation_note"] = " | ".join(tradeoff_note)
    negotiated_vendor["negotiated_at"] = datetime.now().isoformat()
    
    if vendor_index >= 0:
        negotiated_vendors[vendor_index] = negotiated_vendor
    
    state["top_vendors"] = negotiated_vendors
    state["user_action"] = user_action
    
    history_entry = {
        "timestamp": datetime.now().isoformat(),
        "vendor_id": vendor_id,
        "vendor_name": negotiated_vendor.get("name"),
        "intent": intent,
        "tradeoffs": tradeoff_note,
        "updated_scores": {
            "cost": negotiated_vendor.get("cost_score"),
            "delivery": negotiated_vendor.get("delivery_score"),
            "financial": negotiated_vendor.get("financial_score"),
            "compliance": negotiated_vendor.get("compliance_score"),
        }
    }
    state["negotiation_history"].append(history_entry)
    
    return state


def rescore_after_negotiation(state: ProcurementState) -> ProcurementState:
    """Re-score all vendors after negotiation"""
    priority = state["requirement"].get("priority", "balanced").lower()
    
    if priority == "cost":
        weights = {"cost": 0.40, "technical": 0.20, "delivery": 0.15, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    elif priority == "technical":
        weights = {"cost": 0.20, "technical": 0.40, "delivery": 0.15, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    elif priority == "speed":
        weights = {"cost": 0.20, "technical": 0.25, "delivery": 0.30, "financial": 0.15, "compliance": 0.05, "history": 0.05}
    else:
        weights = {"cost": 0.25, "technical": 0.25, "delivery": 0.15, "financial": 0.20, "compliance": 0.10, "history": 0.05}
    
    rescored = []
    for vendor in state["top_vendors"]:
        final_score = compute_score(vendor, weights)
        rescored.append({
            **vendor,
            "final_score": final_score,
            "score_breakdown": {
                "cost": vendor.get("cost_score", 0) * weights["cost"],
                "technical": vendor.get("technical_score", 0) * weights["technical"],
                "delivery": vendor.get("delivery_score", 0) * weights["delivery"],
                "financial": vendor.get("financial_score", 0) * weights["financial"],
                "compliance": vendor.get("compliance_score", 0) * weights["compliance"],
                "history": vendor.get("history_score", 0) * weights["history"],
            }
        })
    
    rescored.sort(key=lambda x: x["final_score"], reverse=True)
    state["top_vendors"] = rescored
    
    return state

def decision_engine(state: ProcurementState) -> ProcurementState:
    """Make final vendor selection"""
    if not state["top_vendors"]:
        state["final_vendor"] = None
        state["decision"] = {"status": "failed", "reason": "No vendors available"}
        return state
    
    selected = state["top_vendors"][0]
    
    decision = {
        "status": "approved",
        "selected_vendor": {
            "vendor_id": selected.get("vendor_id"),
            "name": selected.get("name"),
            "final_score": selected.get("final_score"),
            "score_breakdown": selected.get("score_breakdown"),
        },
        "reasoning": [
            f"Highest final score: {selected.get('final_score'):.3f}",
            f"Cost score: {selected.get('cost_score', 0):.3f}",
            f"Technical score: {selected.get('technical_score', 0):.3f}",
            f"Delivery capability: {selected.get('delivery_score', 0):.3f}",
            f"Financial stability: {selected.get('financial_score', 0):.3f}",
        ],
        "confidence": min(selected.get("final_score", 0) + 0.1, 1.0),
        "alternatives": [
            {
                "vendor_id": v.get("vendor_id"),
                "name": v.get("name"),
                "score": v.get("final_score")
            }
            for v in state["top_vendors"][1:]
        ]
    }
    
    state["final_vendor"] = selected
    state["decision"] = decision
    
    return state

def purchase_order_generation(state: ProcurementState) -> ProcurementState:
    """Generate PO from final decision"""
    if state["decision"]["status"] != "approved":
        state["decision"]["purchase_order"] = None
        return state
    
    vendor = state["final_vendor"]
    requirement = state["requirement"]
    
    purchase_order = {
        "po_number": f"PO-{requirement['requirement_id']}-{vendor['vendor_id']}",
        "vendor": {
            "vendor_id": vendor.get("vendor_id"),
            "name": vendor.get("name"),
            "contact": vendor.get("contact_information", "N/A"),
        },
        "requirement_id": requirement["requirement_id"],
        "amount": float(vendor.get("cost", 0)),
        "currency": requirement["pricing"].get("currency", "USD"),
        "deadline": requirement["deadline"].isoformat(),
        "delivery_timeline": vendor.get("avg_delivery_days", 30),
        "technical_specs": requirement["technical_specifications"],
        "final_vendor_score": vendor.get("final_score"),
        "approval_confidence": state["decision"]["confidence"],
        "created_at": datetime.now().isoformat(),
    }
    
    state["decision"]["purchase_order"] = purchase_order
    
    return state

def build_procurement_graph():
    """
    Build LangGraph workflow.
    
    Default flow: Market Research → Normalize → Score → Select Top Vendors
    
    Negotiation is USER-DRIVEN (via API/UI), not automatic.
    Decision engine is called separately after user satisfaction.
    """
    graph = StateGraph(ProcurementState)
    
    graph.add_node("market_research", market_research)
    graph.add_node("normalize_vendors", normalize_vendors)
    graph.add_node("scoring_engine", scoring_engine)
    graph.add_node("select_top_vendors", select_top_vendors)
    
    graph.add_edge(START, "market_research")
    graph.add_edge("market_research", "normalize_vendors")
    graph.add_edge("normalize_vendors", "scoring_engine")
    graph.add_edge("scoring_engine", "select_top_vendors")
    graph.add_edge("select_top_vendors", END)
    
    return graph.compile()


def build_decision_graph():
    """Build decision graph (called after user finishes negotiation)"""
    graph = StateGraph(ProcurementState)
    
    graph.add_node("decision_engine", decision_engine)
    graph.add_node("purchase_order_generation", purchase_order_generation)
    
    graph.add_edge(START, "decision_engine")
    graph.add_edge("decision_engine", "purchase_order_generation")
    graph.add_edge("purchase_order_generation", END)
    
    return graph.compile()


def run_initial_procurement(requirement: Requirement, vendors: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Execute initial procurement workflow (non-interactive).
    Returns top vendors ready for user negotiation.
    """
    graph = build_procurement_graph()
    
    initial_state: ProcurementState = {
        "requirement": requirement,
        "vendors": vendors,
        "market_insights": "",
        "normalized_vendors": [],
        "scored_vendors": [],
        "top_vendors": [],
        "negotiation_history": [],
        "user_action": None,
        "final_vendor": None,
        "decision": {},
    }
    
    result = graph.invoke(initial_state)
    
    return {
        "market_insights": result["market_insights"],
        "top_vendors": result["top_vendors"],
        "all_scores": result["scored_vendors"],
        "recommendation_stage": "ready_for_negotiation",
    }


def handle_negotiation_request(state: ProcurementState, user_action: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle user negotiation request.
    Simulates tradeoffs, re-scores vendors, returns updated rankings.
    """
    negotiated_state = negotiation_simulation(state, user_action)
    rescored_state = rescore_after_negotiation(negotiated_state)
    
    return {
        "top_vendors": rescored_state["top_vendors"],
        "negotiation_history": rescored_state["negotiation_history"],
        "recommendation": get_recommendation(rescored_state),
        "confidence": rescored_state["top_vendors"][0].get("final_score", 0) if rescored_state["top_vendors"] else 0,
    }


def get_recommendation(state: ProcurementState) -> str:
    """Generate human-readable recommendation"""
    if not state["top_vendors"]:
        return "No vendors available for recommendation"
    
    top = state["top_vendors"][0]
    return f"Recommend {top.get('name')} with score {top.get('final_score', 0):.3f}"


def finalize_procurement(state: ProcurementState) -> Dict[str, Any]:
    """
    Execute decision and PO generation after user is satisfied.
    """
    graph = build_decision_graph()
    
    result = graph.invoke(state)
    
    return {
        "decision": result["decision"],
        "purchase_order": result["decision"].get("purchase_order"),
        "negotiation_summary": result["negotiation_history"],
    }