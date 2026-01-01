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

class SKUMatch(BaseModel):
    """Represents a matched SKU with confidence score"""
    sku_id: str
    sku_name: str
    match_confidence_score: float  # 0-100, percentage similarity
    standard_cost: float  # From price book
    is_innovation: bool = False
    nre_cost: Optional[float] = None  # Non-Recurring Engineering cost if innovation


class PricingItem(BaseModel):
    """Represents a priced item in the final output"""
    sku_id: str
    sku_name: str
    match_confidence_score: float
    base_cost: float
    risk_buffer: float
    innovation_cost: float
    adjusted_cost: float
    unit_price: float
    quantity: int = 1
    total_price: float


class AgentState(TypedDict):
    """State for the Dynamic Pricing Agent"""
    # Technical Inputs
    sku_matches: List[Dict]  # List of SKU matches with confidence scores
    price_book: Dict[str, float]  # Internal price book: {sku_id: standard_cost}
    
    # Innovation Data
    innovation_items: Optional[List[str]]  # List of SKU IDs that are innovation items
    nre_costs: Optional[Dict[str, float]]  # {sku_id: nre_cost}
    
    # Strategic Data (Text)
    competitor_brief: str  # Text summary from Competitor Intelligence Agent
    client_relationship: Literal["Strategic Client", "Transactional"]
    pwin_score: Optional[float]  # Probability of winning (0-100)
    goal: Literal["Maximize Profit", "Win Deal", "Market Share"]  # Business goal
    
    # Intermediate Results
    priced_items: Optional[List[Dict]]  # List of PricingItem dicts
    total_base_cost: Optional[float]
    total_risk_buffer: Optional[float]
    total_innovation_cost: Optional[float]
    strategic_margin_adjustment: Optional[float]  # From LLM (e.g., 0.05 for +5%)
    base_margin: Optional[float]  # Base margin percentage (e.g., 0.20 for 20%)
    
    # Outputs
    pricing_table: Optional[List[Dict]]  # Structured pricing table
    total_price: Optional[float]  # Final total price
    risk_notes: Optional[List[str]]  # Risk warnings
    critical_errors: Optional[List[str]]  # Critical pricing errors
    llm_reasoning: Optional[str]  # LLM's strategic reasoning
    
    # Metadata
    use_llm: bool  # Whether to use LLM for strategic reasoning


# ============================================================================
# LLM Helper Functions
# ============================================================================

def get_llm():
    """Get LLM instance - tries Gemini first, then OpenAI, then Anthropic"""
    # Try Google Gemini first
    if os.getenv("GOOGLE_API_KEY"):
        # Try newer Gemini models (2.5 and 2.0 series)
        model_names = [
            "gemini-2.5-flash",      # Latest fast model
            "gemini-2.0-flash",      # Stable 2.0 model
            "gemini-2.5-pro",        # Latest pro model
            "gemini-pro-latest",     # Latest pro alias
            "gemini-flash-latest"    # Latest flash alias
        ]
        
        for model_name in model_names:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    temperature=0.3
                )
                # Quick test to verify it works
                try:
                    llm.invoke("test")
                except Exception:
                    continue
                return llm
            except Exception:
                continue
        
        # If all models fail, print warning but don't crash
        print("⚠️  Gemini models not available. Falling back to rule-based pricing.")
        print("   Check your Google API key permissions or try updating langchain-google-genai.")
    
   


# ============================================================================
# Step 1: Costing with Risk Buffers (The "Safety Net")
# ============================================================================

def calculate_costs_with_risk_buffers(state: AgentState) -> AgentState:
    """
    Step 1: Calculate costs with risk buffers based on match confidence scores.
    - Perfect Match (>95%): Use Standard_Cost
    - Imperfect Match (70-95%): Standard_Cost + 15% Risk Buffer
    - Innovation Item: Standard_Cost + NRE_Cost
    - Unmatched: Flag as CRITICAL_PRICING_ERROR
    """
    sku_matches = state["sku_matches"]
    price_book = state["price_book"]
    innovation_items = state.get("innovation_items", []) or []
    nre_costs = state.get("nre_costs", {}) or {}
    
    priced_items = []
    critical_errors = []
    risk_notes = []
    
    total_base_cost = 0.0
    total_risk_buffer = 0.0
    total_innovation_cost = 0.0
    
    RISK_BUFFER_PERCENTAGE = 0.15  # 15% risk buffer for imperfect matches
    
    for match in sku_matches:
        sku_id = match.get("sku_id", "")
        sku_name = match.get("sku_name", "Unknown")
        match_confidence = match.get("match_confidence_score", 0.0)
        
        # Get standard cost from price book
        standard_cost = price_book.get(sku_id, None)
        
        # Check if unmatched (no price book entry)
        if standard_cost is None:
            critical_errors.append(
                f"CRITICAL_PRICING_ERROR: SKU '{sku_id}' ({sku_name}) not found in price book. "
                f"Cannot generate price."
            )
            continue
        
        # Initialize costs
        base_cost = standard_cost
        risk_buffer = 0.0
        innovation_cost = 0.0
        
        # Determine risk buffer based on match confidence
        if match_confidence > 95:
            # Perfect Match: No risk buffer
            risk_buffer = 0.0
        elif match_confidence >= 70:
            # Imperfect Match: Apply 15% risk buffer
            risk_buffer = base_cost * RISK_BUFFER_PERCENTAGE
            # Note: Item number will be set later when we know the position in the list
        else:
            # Low confidence (<70%): Critical error
            critical_errors.append(
                f"CRITICAL_PRICING_ERROR: SKU '{sku_id}' ({sku_name}) has match confidence "
                f"{match_confidence:.1f}% (below 70% threshold). Cannot generate reliable price."
            )
            continue
        
        # Check if innovation item
        if sku_id in innovation_items:
            innovation_cost = nre_costs.get(sku_id, 0.0)
            if innovation_cost > 0:
                risk_notes.append(
                    f"Innovation item '{sku_name}' (SKU: {sku_id}) includes NRE cost: ${innovation_cost:,.2f}"
                )
        
        # Calculate adjusted cost
        adjusted_cost = base_cost + risk_buffer + innovation_cost
        
        # Create pricing item with item number
        item_number = len(priced_items) + 1
        pricing_item = {
            "item_number": item_number,
            "sku_id": sku_id,
            "sku_name": sku_name,
            "match_confidence_score": match_confidence,
            "base_cost": round(base_cost, 2),
            "risk_buffer": round(risk_buffer, 2),
            "innovation_cost": round(innovation_cost, 2),
            "adjusted_cost": round(adjusted_cost, 2),
            "quantity": match.get("quantity", 1),
        }
        
        priced_items.append(pricing_item)
        
        # Add risk note with item number if risk buffer was applied
        if risk_buffer > 0:
            risk_notes.append(
                f"Warning: Item #{item_number} priced with {RISK_BUFFER_PERCENTAGE*100:.0f}% buffer due to low technical match confidence."
            )
        
        # Accumulate totals
        total_base_cost += base_cost * pricing_item["quantity"]
        total_risk_buffer += risk_buffer * pricing_item["quantity"]
        total_innovation_cost += innovation_cost * pricing_item["quantity"]
    
    state["priced_items"] = priced_items
    state["total_base_cost"] = round(total_base_cost, 2)
    state["total_risk_buffer"] = round(total_risk_buffer, 2)
    state["total_innovation_cost"] = round(total_innovation_cost, 2)
    state["critical_errors"] = critical_errors
    state["risk_notes"] = risk_notes
    
    return state


# ============================================================================
# Step 2: LLM Strategic Reasoning (The "Brain")
# ============================================================================

def get_strategic_margin_adjustment(state: AgentState) -> AgentState:
    """
    Step 2: Use LLM to analyze strategic context and output Strategic Margin Adjustment.
    Returns a single floating point number (e.g., 0.05 for +5%).
    """
    use_llm = state.get("use_llm", True)
    llm = get_llm() if use_llm else None
    
    if llm is None:
        # Fallback to rule-based if no LLM
        strategic_adjustment = calculate_rule_based_margin(state)
        state["strategic_margin_adjustment"] = strategic_adjustment
        state["llm_reasoning"] = "Rule-based margin adjustment (LLM not available)"
        return state
    
    competitor_brief = state.get("competitor_brief", "")
    client_relationship = state.get("client_relationship", "Transactional")
    pwin_score = state.get("pwin_score", 50.0)
    goal = state.get("goal", "Maximize Profit")
    
    # Check if using Gemini (needs different prompt format)
    is_gemini = isinstance(llm, ChatGoogleGenerativeAI) if llm else False
    
    if is_gemini:
        # Gemini works better with a single user message
        prompt = ChatPromptTemplate.from_messages([
            ("user", """You are a strategic pricing analyst. Analyze the competitive and client context to determine the optimal strategic margin adjustment.

Context:
- Competitor Brief: {competitor_brief}
- Client Relationship: {client_relationship}
- PWin Score: {pwin_score}%
- Business Goal: {goal}

Guidelines:
- High PWin (>80%) with Strategic Client: Consider +5% to +15%
- Aggressive competitors: Consider -5% to -15%
- Goal "Win Deal": Consider -10% to -20%
- Goal "Maximize Profit": Consider +5% to +20%
- Transactional clients: Generally lower margins than Strategic

Output your response as a valid JSON object with exactly these two fields:
{{
  "strategic_margin_adjustment": <float number, e.g., 0.05 for +5%, -0.10 for -10%>,
  "reasoning": "<brief explanation of your strategic decision>"
}}""")
        ])
    else:
        # OpenAI/Anthropic format
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strategic pricing analyst. Your task is to analyze the competitive and 
            client context to determine the optimal strategic margin adjustment.
            
            Consider:
            - Competitor behavior and market dynamics
            - Client relationship type (Strategic vs Transactional)
            - Probability of winning (PWin)
            - Business goal (Maximize Profit, Win Deal, Market Share)
            
            Output a JSON object with:
            - "strategic_margin_adjustment": A single floating point number representing the margin adjustment.
              Examples: 0.05 for +5%, -0.10 for -10%, 0.0 for no change.
            - "reasoning": A brief explanation of your strategic decision.
            
            Guidelines:
            - High PWin (>80%) with Strategic Client: Consider +5% to +15%
            - Aggressive competitors: Consider -5% to -15%
            - Goal "Win Deal": Consider -10% to -20%
            - Goal "Maximize Profit": Consider +5% to +20%
            - Transactional clients: Generally lower margins than Strategic"""),
            ("user", """Analyze the following context and determine the Strategic Margin Adjustment.

Competitor Brief: {competitor_brief}

Client Relationship: {client_relationship}
PWin Score: {pwin_score}%
Business Goal: {goal}

Provide your recommendation as JSON with "strategic_margin_adjustment" (float) and "reasoning" (string).""")
        ])
    
    try:
        chain = prompt | llm
        response = chain.invoke({
            "competitor_brief": competitor_brief,
            "client_relationship": client_relationship,
            "pwin_score": pwin_score,
            "goal": goal
        })
        
        # Parse JSON response
        content = response.content
        if isinstance(content, str):
            # Try to extract JSON from markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            result = json.loads(content)
        else:
            result = content
        
        strategic_adjustment = float(result.get("strategic_margin_adjustment", 0.0))
        reasoning = result.get("reasoning", "LLM-based strategic margin adjustment")
        
        state["strategic_margin_adjustment"] = round(strategic_adjustment, 4)
        state["llm_reasoning"] = reasoning
        
    except Exception as e:
        print(f"LLM strategic reasoning error: {e}, falling back to rule-based")
        strategic_adjustment = calculate_rule_based_margin(state)
        state["strategic_margin_adjustment"] = strategic_adjustment
        state["llm_reasoning"] = f"Rule-based fallback (LLM error: {str(e)})"
    
    return state


def calculate_rule_based_margin(state: AgentState) -> float:
    """Rule-based fallback for strategic margin adjustment"""
    client_relationship = state.get("client_relationship", "Transactional")
    pwin_score = state.get("pwin_score", 50.0)
    goal = state.get("goal", "Maximize Profit")
    competitor_brief = state.get("competitor_brief", "").lower()
    
    adjustment = 0.0
    
    # PWin-based adjustment
    if pwin_score > 80:
        adjustment += 0.10  # High PWin: +10%
    elif pwin_score < 40:
        adjustment -= 0.10  # Low PWin: -10%
    
    # Goal-based adjustment
    if goal == "Win Deal":
        adjustment -= 0.15  # Prioritize winning: -15%
    elif goal == "Maximize Profit":
        adjustment += 0.10  # Maximize profit: +10%
    
    # Client relationship adjustment
    if client_relationship == "Strategic Client":
        adjustment += 0.05  # Strategic clients: +5%
    
    # Competitor adjustment (simple keyword detection)
    if "aggressive" in competitor_brief or "undercut" in competitor_brief:
        adjustment -= 0.10  # Aggressive competitor: -10%
    
    return round(adjustment, 4)


# ============================================================================
# Step 3: Final Calculation
# ============================================================================

def calculate_final_pricing(state: AgentState) -> AgentState:
    """
    Step 3: Calculate final prices using the formula:
    Final_Price = (Base_Cost + Risk_Buffer + Innovation_Cost) * (1 + Base_Margin + Strategic_Adjustment)
    """
    # Check for critical errors
    if state.get("critical_errors"):
        state["total_price"] = None
        state["pricing_table"] = []
        return state
    
    priced_items = state["priced_items"]
    if not priced_items:
        state["total_price"] = None
        state["pricing_table"] = []
        return state
    
    base_margin = state.get("base_margin", 0.20)  # Default 20% base margin
    strategic_adjustment = state.get("strategic_margin_adjustment", 0.0)
    
    total_price = 0.0
    pricing_table = []
    
    for item in priced_items:
        adjusted_cost = item["adjusted_cost"]
        quantity = item["quantity"]
        
        # Calculate unit price
        # Final_Price = Adjusted_Cost * (1 + Base_Margin + Strategic_Adjustment)
        unit_price = adjusted_cost * (1 + base_margin + strategic_adjustment)
        total_item_price = unit_price * quantity
        
        pricing_item = {
            "item_number": item.get("item_number", len(pricing_table) + 1),
            "sku_id": item["sku_id"],
            "sku_name": item["sku_name"],
            "match_confidence_score": item["match_confidence_score"],
            "base_cost": item["base_cost"],
            "risk_buffer": item["risk_buffer"],
            "innovation_cost": item["innovation_cost"],
            "adjusted_cost": item["adjusted_cost"],
            "unit_price": round(unit_price, 2),
            "quantity": quantity,
            "total_price": round(total_item_price, 2)
        }
        
        pricing_table.append(pricing_item)
        total_price += total_item_price
    
    state["pricing_table"] = pricing_table
    state["total_price"] = round(total_price, 2)
    state["base_margin"] = base_margin
    
    return state


# ============================================================================
# LangGraph Agent Construction
# ============================================================================

def create_pricing_agent():
    """Create and return the Dynamic Pricing Agent graph"""
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("calculate_costs", calculate_costs_with_risk_buffers)
    workflow.add_node("strategic_reasoning", get_strategic_margin_adjustment)
    workflow.add_node("final_calculation", calculate_final_pricing)
    
    # Define the flow
    workflow.set_entry_point("calculate_costs")
    workflow.add_edge("calculate_costs", "strategic_reasoning")
    workflow.add_edge("strategic_reasoning", "final_calculation")
    workflow.add_edge("final_calculation", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    # Check if LLM is available
    use_llm = bool(os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))
    if not use_llm:
        print("⚠️  No LLM API key found. Using rule-based strategic reasoning.")
        print("   Set GOOGLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to use LLM.\n")
    
    # Demo inputs
    demo_state = {
        "sku_matches": [
            {
                "sku_id": "SKU-001",
                "sku_name": "Premium Widget A",
                "match_confidence_score": 92.5,  # Imperfect match
                "quantity": 10
            },
            {
                "sku_id": "SKU-002",
                "sku_name": "Standard Widget B",
                "match_confidence_score": 98.0,  # Perfect match
                "quantity": 5
            },
            {
                "sku_id": "SKU-003",
                "sku_name": "Custom Widget C",
                "match_confidence_score": 75.0,  # Imperfect match
                "quantity": 2
            }
        ],
        "price_book": {
            "SKU-001": 1000.0,  # Standard cost
            "SKU-002": 500.0,
            "SKU-003": 1500.0
        },
        "innovation_items": ["SKU-003"],  # SKU-003 is an innovation item
        "nre_costs": {
            "SKU-003": 5000.0  # NRE cost for innovation
        },
        "competitor_brief": "Competitor X is aggressive and has been undercutting prices by 10-15%. Market is competitive.",
        "client_relationship": "Strategic Client",
        "pwin_score": 85.0,
        "goal": "Maximize Profit",
        "base_margin": 0.20,  # 20% base margin
        "use_llm": use_llm,
        "priced_items": None,
        "total_base_cost": None,
        "total_risk_buffer": None,
        "total_innovation_cost": None,
        "strategic_margin_adjustment": None,
        "pricing_table": None,
        "total_price": None,
        "risk_notes": None,
        "critical_errors": None,
        "llm_reasoning": None
    }
    
    # Create and run the agent
    agent = create_pricing_agent()
    result = agent.invoke(demo_state)
    
    # Display results
    print("=" * 70)
    print("Dynamic Pricing Agent (The Profit Engine) - Results")
    print("=" * 70)
    
    print(f"\nClient: {result.get('client_relationship', 'N/A')}")
    print(f"Goal: {result.get('goal', 'N/A')}")
    pwin_score = result.get('pwin_score') or 0.0
    print(f"PWin: {pwin_score}%")
    print(f"Using LLM: {'Yes' if result.get('use_llm') else 'No (Rule-based)'}")
    
    # Check for critical errors
    if result.get("critical_errors"):
        print(f"\n{'='*70}")
        print("⚠️  CRITICAL PRICING ERRORS:")
        print('='*70)
        for error in result["critical_errors"]:
            print(f"  ❌ {error}")
        print('='*70)
    
    # Display cost breakdown
    print(f"\n--- Step 1: Costing with Risk Buffers ---")
    total_base_cost = result.get('total_base_cost') or 0.0
    total_risk_buffer = result.get('total_risk_buffer') or 0.0
    total_innovation_cost = result.get('total_innovation_cost') or 0.0
    print(f"Total Base Cost: ${total_base_cost:,.2f}")
    print(f"Total Risk Buffer: ${total_risk_buffer:,.2f}")
    print(f"Total Innovation Cost (NRE): ${total_innovation_cost:,.2f}")
    
    # Display strategic reasoning
    print(f"\n--- Step 2: Strategic Margin Adjustment ---")
    strategic_adj = result.get("strategic_margin_adjustment") or 0.0
    print(f"Strategic Margin Adjustment: {strategic_adj*100:+.2f}%")
    if result.get("llm_reasoning"):
        print(f"Reasoning: {result['llm_reasoning']}")
    
    # Display pricing table
    if result.get("pricing_table"):
        print(f"\n--- Step 3: Structured Pricing Table ---")
        print(f"{'Item':<6} {'SKU':<12} {'Item Name':<25} {'Unit Price':<15} {'Quantity':<10} {'Total Price':<15}")
        print("-" * 90)
        
        for item in result["pricing_table"]:
            item_num = item.get("item_number", result["pricing_table"].index(item) + 1)
            print(f"#{item_num:<5} {item['sku_id']:<12} {item['sku_name'][:24]:<25} "
                  f"${item['unit_price']:>13,.2f} {item['quantity']:>9} ${item['total_price']:>13,.2f}")
        
        print("-" * 90)
        total_price = result.get('total_price') or 0.0
        print(f"{'TOTAL':<6} {'':<12} {'':<25} {'':<15} {'':<10} ${total_price:>13,.2f}")
    
    # Display risk notes
    if result.get("risk_notes"):
        print(f"\n--- Risk Notes ---")
        for note in result["risk_notes"]:
            print(f"  ⚠️  {note}")
    
    print("\n" + "=" * 70)
