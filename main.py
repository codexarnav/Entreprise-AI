
import os
import json
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv

from src.agents.rfp_aggregator import app as rfp_aggregator_app, RfpAggregatorInput, RfpAggregatorOutput
from src.agents.risk_and_compilance import app as risk_compliance_app
from src.agents.pwin import app as pwin_app, RfpAggregator as PwinRfpAggregator, RiskandCompilance, CRM, PwinState
from src.agents.Technical_Agent import TechnicalAgent, RFPRequirement
from src.agents.proposal_weaver_agent import create_proposal_weaver_agent
from src.agents.dynamic_pricing_agent import create_pricing_agent

load_dotenv()

def convert_rfp_aggregator_to_pwin_format(rfp_output: RfpAggregatorOutput) -> PwinRfpAggregator:
    """Convert RfpAggregatorOutput to PwinRfpAggregator format"""
    # Parse deadline to float if possible
    try:
        deadline_float = float(rfp_output.deadline) if rfp_output.deadline else 0.0
    except (ValueError, TypeError):
        deadline_float = 0.0  # Default if parsing fails
    
    return PwinRfpAggregator(
        rfp_id=rfp_output.rfp_id,
        title=rfp_output.title,
        buyer=rfp_output.buyer,
        deadline=deadline_float,
        technical_requirements=rfp_output.technical_requirements,
        scope_of_work=rfp_output.scope_of_work
    )

def convert_risk_compliance_to_pwin_format(risk_state: Dict) -> RiskandCompilance:
    """Convert RiskAndComplianceState to RiskandCompilance format"""
    return RiskandCompilance(
        legal_risks=risk_state.get('legal_risks'),
        flagging_score=risk_state.get('flagging_score'),
        risk_brief=risk_state.get('risk_brief', '')
    )


def convert_technical_requirements_to_rfp_requirements(
    technical_requirements: List[str],
    scope_of_work: List[str]
) -> List[RFPRequirement]:
    """Convert list of technical requirement strings to RFPRequirement objects"""
    rfp_requirements = []
    
    tech_reqs = technical_requirements if technical_requirements else []
    scope = scope_of_work if scope_of_work else []
    all_requirements = tech_reqs + scope
    
    if not all_requirements:
        all_requirements = ["General technical requirements"]
    
    for idx, req_text in enumerate(all_requirements, 1):
        rfp_requirements.append(
            RFPRequirement(
                id=f"REQ-{idx:03d}",
                description=req_text,
                parameters={},  # Could be extracted with LLM
                category="General",  # Could be categorized with LLM
                priority="Important"  # Default priority
            )
        )
    
    return rfp_requirements


def convert_technical_skus_to_pricing_format(
    matched_skus: List[Any],
    price_book: Dict[str, float]
) -> List[Dict]:
    """Convert TechnicalAgent SKUMatch objects to Dynamic Pricing Agent format"""
    pricing_sku_matches = []
    
    for match in matched_skus:
        # Extract similarity score (0-1) and convert to percentage (0-100)
        similarity_score = match.similarity_score if hasattr(match, 'similarity_score') else 0.0
        match_confidence_score = similarity_score * 100  # Convert to percentage
        
        # Get SKU ID and name
        sku_id = match.sku_id if hasattr(match, 'sku_id') else f"SKU-{len(pricing_sku_matches)+1}"
        product_name = match.product_name if hasattr(match, 'product_name') else "Unknown Product"
        
        # If SKU not in price book, add a default cost (you might want to handle this differently)
        if sku_id not in price_book:
            price_book[sku_id] = 1000.0  # Default cost
        
        pricing_sku_matches.append({
            "sku_id": sku_id,
            "sku_name": product_name,
            "match_confidence_score": match_confidence_score,
            "quantity": 1  # Default quantity, could be extracted from RFP
        })
    
    return pricing_sku_matches


def convert_technical_skus_to_proposal_format(matched_skus: List[Any]) -> List[Dict]:
    """Convert TechnicalAgent SKUMatch objects to Proposal Weaver format"""
    proposal_sku_matches = []
    
    for match in matched_skus:
        similarity_score = match.similarity_score if hasattr(match, 'similarity_score') else 0.0
        match_confidence_score = similarity_score * 100
        
        sku_id = match.sku_id if hasattr(match, 'sku_id') else f"SKU-{len(proposal_sku_matches)+1}"
        product_name = match.product_name if hasattr(match, 'product_name') else "Unknown Product"
        
        # Extract advantages from match explanation
        advantages = []
        if hasattr(match, 'match_explanation'):
            advantages = [match.match_explanation]
        
        # Extract technical specs from matched parameters
        technical_specs = {}
        if hasattr(match, 'matched_parameters'):
            technical_specs = match.matched_parameters
        
        proposal_sku_matches.append({
            "sku_id": sku_id,
            "sku_name": product_name,
            "match_confidence_score": match_confidence_score,
            "technical_specs": technical_specs,
            "advantages": advantages
        })
    
    return proposal_sku_matches


# ============================================================================
# Main Orchestrator Function
# ============================================================================

def process_rfp(file_path: Optional[str] = None, pdf_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Main function to process RFP through the entire pipeline
    
    Args:
        file_path: Path to text file (optional if pdf_path provided)
        pdf_path: Path to PDF file (optional if file_path provided)
    
    Returns:
        Dictionary containing all results and final go/no-go decision
    """
    
    if not file_path and not pdf_path:
        raise ValueError("Either file_path or pdf_path must be provided")
    
    results = {
        "rfp_aggregator": None,
        "risk_compliance": None,
        "pwin": None,
        "technical_agent": None,
        "pricing": None,
        "proposal": None,
        "final_decision": None
    }
    
    print("=" * 80)
    print("RFP MANAGEMENT PIPELINE - STARTING")
    print("=" * 80)
    
    # ========================================================================
    # Step 1: RFP Aggregator
    # ========================================================================
    print("\n[1/7] Running RFP Aggregator...")
    try:
        rfp_input = RfpAggregatorInput(
            text_path=file_path or "",
            pdf_path=pdf_path,
            documents=None,
            chunked_text=None
        )
        
        rfp_state = {
            "rfp_aggregator_input": rfp_input,
            "rfp_aggregator_output": None
        }
        
        rfp_result = rfp_aggregator_app.invoke(rfp_state)
        rfp_output: RfpAggregatorOutput = rfp_result['rfp_aggregator_output']
        results['rfp_aggregator'] = rfp_output.model_dump()
        
        print(f"✓ Extracted RFP: {rfp_output.title}")
        print(f"  Buyer: {rfp_output.buyer}")
        print(f"  Technical Requirements: {len(rfp_output.technical_requirements)}")
        
    except Exception as e:
        print(f"✗ Error in RFP Aggregator: {e}")
        return {"error": f"RFP Aggregator failed: {str(e)}"}
    
    # ========================================================================
    # Step 2: Risk and Compliance
    # ========================================================================
    print("\n[2/7] Running Risk and Compliance Agent...")
    try:
        # Use the parsed text from RFP aggregator
        parsed_text = "".join(rfp_state['rfp_aggregator_input'].chunked_text)
        
        risk_state = {
            "file_path": file_path or "",  # Keep for compatibility, but not used
            "pdf_path": pdf_path,
            "parsed_text": parsed_text,
            "chunked_text": rfp_state['rfp_aggregator_input'].chunked_text,
            "legal_risks": None,
            "report": "",
            "flagging_score": None,
            "risk_brief": ""
        }
        
        risk_result = risk_compliance_app.invoke(risk_state)
        results['risk_compliance'] = {
            "legal_risks": risk_result.get('legal_risks'),
            "flagging_score": risk_result.get('flagging_score'),
            "risk_brief": risk_result.get('risk_brief')
        }
        
        print(f"✓ Risk Analysis Complete")
        print(f"  Flagging Score: {risk_result.get('flagging_score', 'N/A')}")
        print(f"  Legal Risks Found: {len(risk_result.get('legal_risks', []))}")
        
    except Exception as e:
        print(f"✗ Error in Risk and Compliance: {e}")
        # Continue with default values
        results['risk_compliance'] = {
            "legal_risks": [],
            "flagging_score": 0.5,
            "risk_brief": "Risk analysis failed"
        }
    
    # ========================================================================
    # Step 3: PWin Analysis
    # ========================================================================
    print("\n[3/7] Running PWin Agent...")
    try:
        pwin_rfp = convert_rfp_aggregator_to_pwin_format(rfp_output)
        pwin_risk = convert_risk_compliance_to_pwin_format(results['risk_compliance'])
        
        # Optional: Create CRM data (you might want to extract this from RFP or use defaults)
        crm_data = CRM(
            customer_id="CUST-001",
            customer_name=rfp_output.buyer,
            contact_email="",
            industry=None,
            company_size=None,
            location=None
        )
        
        pwin_state: PwinState = {
            "rfp_aggregator_input": pwin_rfp,
            "risk_and_compilance": pwin_risk,
            "crm": crm_data,
            "model_input_json": None,
            "pwin_labels": None,
            "pwin_score": None,
            "strength": None,
            "weekness": None,
            "recommendation": None
        }
        
        pwin_result = pwin_app.invoke(pwin_state)
        results['pwin'] = {
            "pwin_score": pwin_result.get('pwin_score'),
            "strength": pwin_result.get('strength'),
            "weekness": pwin_result.get('weekness'),
            "recommendation": pwin_result.get('recommendation')
        }
        
        print(f"✓ PWin Analysis Complete")
        print(f"  PWin Score: {pwin_result.get('pwin_score', 'N/A')}")
        
    except Exception as e:
        print(f"✗ Error in PWin Agent: {e}")
        return {"error": f"PWin Agent failed: {str(e)}"}
    
    # ========================================================================
    # Step 4: Technical Agent
    # ========================================================================
    print("\n[4/7] Running Technical Agent...")
    try:
        # Convert technical requirements to RFPRequirement format
        rfp_requirements = convert_technical_requirements_to_rfp_requirements(
            rfp_output.technical_requirements,
            rfp_output.scope_of_work
        )
        
        # Initialize Technical Agent
        technical_agent = TechnicalAgent(similarity_threshold=0.80)
        
        # Process RFP requirements
        technical_results = technical_agent.process_rfp(rfp_requirements)
        results['technical_agent'] = {
            "matched_skus": [
                {
                    "sku_id": sku.sku_id,
                    "product_name": sku.product_name,
                    "similarity_score": sku.similarity_score,
                    "matched_parameters": sku.matched_parameters,
                    "match_explanation": sku.match_explanation,
                    "confidence": sku.confidence
                }
                for sku in technical_results['matched_skus']
            ],
            "technical_gaps": [
                {
                    "requirement_id": gap.requirement_id,
                    "requirement_description": gap.requirement_description,
                    "gap_severity": gap.gap_severity
                }
                for gap in technical_results['technical_gaps']
            ],
            "status": technical_results['status']
        }
        
        print(f"✓ Technical Matching Complete")
        print(f"  Matched SKUs: {len(technical_results['matched_skus'])}")
        print(f"  Technical Gaps: {len(technical_results['technical_gaps'])}")
        
    except Exception as e:
        print(f"✗ Error in Technical Agent: {e}")
        return {"error": f"Technical Agent failed: {str(e)}"}
    
    print("\n[5/7] Running Dynamic Pricing Agent...")
    try:
        
        price_book = {}  # TODO: Load from your price book database
        
        # For demo purposes, create a default price book from matched SKUs
        for sku_match in technical_results['matched_skus']:
            sku_id = sku_match.sku_id
            if sku_id not in price_book:
                price_book[sku_id] = 1000.0  # Default cost
        
        pricing_sku_matches = convert_technical_skus_to_pricing_format(
            technical_results['matched_skus'],
            price_book
        )
        
        # Create pricing agent
        pricing_agent = create_pricing_agent()
        
        # Prepare pricing state
        pricing_state = {
            "sku_matches": pricing_sku_matches,
            "price_book": price_book,
            "innovation_items": [],  # Could be extracted from technical_gaps
            "nre_costs": {},
            "competitor_brief": "Standard market competition",  # Could be enhanced with competitor intelligence
            "client_relationship": "Strategic Client" if results['pwin']['pwin_score'] and results['pwin']['pwin_score'] > 0.7 else "Transactional",
            "pwin_score": results['pwin']['pwin_score'] * 100 if results['pwin']['pwin_score'] else 50.0,  # Convert to percentage
            "goal": "Win Deal" if results['pwin']['pwin_score'] and results['pwin']['pwin_score'] < 0.6 else "Maximize Profit",
            "base_margin": 0.20,  # 20% base margin
            "use_llm": bool(os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")),
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
        
        pricing_result = pricing_agent.invoke(pricing_state)
        results['pricing'] = {
            "pricing_table": pricing_result.get('pricing_table'),
            "total_price": pricing_result.get('total_price'),
            "risk_notes": pricing_result.get('risk_notes'),
            "critical_errors": pricing_result.get('critical_errors')
        }
        
        print(f"✓ Pricing Complete")
        print(f"  Total Price: ${pricing_result.get('total_price', 0):,.2f}")
        
    except Exception as e:
        print(f"✗ Error in Dynamic Pricing Agent: {e}")
        return {"error": f"Dynamic Pricing Agent failed: {str(e)}"}
    
    # ========================================================================
    # Step 6: Proposal Weaver Agent
    # ========================================================================
    print("\n[6/7] Running Proposal Weaver Agent...")
    try:
        # Convert technical SKUs to proposal format
        proposal_sku_matches = convert_technical_skus_to_proposal_format(
            technical_results['matched_skus']
        )
        
        # Create proposal weaver agent
        proposal_agent = create_proposal_weaver_agent()
        
        # Determine client type from buyer name (simple heuristic)
        buyer_name = rfp_output.buyer.lower()
        if any(keyword in buyer_name for keyword in ['government', 'govt', 'ministry', 'department']):
            client_type = "Government"
        elif any(keyword in buyer_name for keyword in ['psu', 'public sector', 'public enterprise']):
            client_type = "PSU"
        else:
            client_type = "Private"
        
        # Prepare proposal state
        proposal_state = {
            "sku_matches": proposal_sku_matches,
            "pricing_info": {
                "total_price": pricing_result.get('total_price', 0),
                "pricing_table": pricing_result.get('pricing_table', []),
                "strategic_margin_adjustment": pricing_result.get('strategic_margin_adjustment', 0)
            },
            "risk_profile": {
                "overall_risk_level": "High" if results['risk_compliance']['flagging_score'] and results['risk_compliance']['flagging_score'] > 0.7 else "Low" if results['risk_compliance']['flagging_score'] and results['risk_compliance']['flagging_score'] < 0.3 else "Medium",
                "risk_notes": results['risk_compliance'].get('legal_risks', [])[:5] if results['risk_compliance'].get('legal_risks') else []
            },
            "pwin_highlights": {
                "pwin_score": results['pwin']['pwin_score'] * 100 if results['pwin']['pwin_score'] else 50.0,
                "strengths": results['pwin'].get('strength', []) if isinstance(results['pwin'].get('strength'), list) else [],
                "weaknesses": results['pwin'].get('weekness', []) if isinstance(results['pwin'].get('weekness'), list) else [],
                "recommendations": results['pwin'].get('recommendation', []) if isinstance(results['pwin'].get('recommendation'), list) else []
            },
            "client_type": {
                "client_type": client_type,
                "client_name": rfp_output.buyer,
                "industry": None
            },
            "boilerplate_library": {},
            "case_studies": [],
            "use_llm": bool(os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")),
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
        
        proposal_result = proposal_agent.invoke(proposal_state)
        results['proposal'] = {
            "complete_proposal": proposal_result.get('complete_proposal'),
            "executive_summary": proposal_result.get('executive_summary')
        }
        
        print(f"✓ Proposal Generated")
        
    except Exception as e:
        print(f"✗ Error in Proposal Weaver Agent: {e}")
        # Don't fail the entire pipeline, just note the error
        results['proposal'] = {"error": str(e)}
    
    # ========================================================================
    # Step 7: Final Go/No-Go Decision
    # ========================================================================
    print("\n[7/7] Making Final Decision...")
    
    pwin_score = results['pwin']['pwin_score'] or 0.0
    flagging_score = results['risk_compliance']['flagging_score'] or 0.5
    has_critical_errors = bool(results['pricing'].get('critical_errors'))
    has_technical_gaps = len(technical_results['technical_gaps']) > 0
    
    # Decision logic
    decision = "NO-GO"
    decision_reason = []
    
    # Check PWin threshold (e.g., minimum 0.5)
    if pwin_score < 0.5:
        decision = "NO-GO"
        decision_reason.append(f"PWin score too low ({pwin_score:.2%})")
    else:
        decision_reason.append(f"PWin score acceptable ({pwin_score:.2%})")
    
    # Check risk threshold (e.g., flagging_score > 0.7 is high risk)
    if flagging_score > 0.7:
        decision = "NO-GO"
        decision_reason.append(f"High risk flagging score ({flagging_score:.2f})")
    else:
        decision_reason.append(f"Risk level acceptable ({flagging_score:.2f})")
    
    # Check for critical pricing errors
    if has_critical_errors:
        decision = "NO-GO"
        decision_reason.append("Critical pricing errors detected")
    
    # If all checks pass, it's a GO
    if pwin_score >= 0.5 and flagging_score <= 0.7 and not has_critical_errors:
        decision = "GO"
        decision_reason.append("All criteria met")
    
    results['final_decision'] = {
        "decision": decision,
        "reasons": decision_reason,
        "pwin_score": pwin_score,
        "flagging_score": flagging_score,
        "has_critical_errors": has_critical_errors,
        "has_technical_gaps": has_technical_gaps
    }
    
    print(f"✓ Final Decision: {decision}")
    for reason in decision_reason:
        print(f"  - {reason}")
    
    print("\n" + "=" * 80)
    print("RFP MANAGEMENT PIPELINE - COMPLETE")
    print("=" * 80)
    
    return results


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    
    input_path=input('enter your file path:')
    if input_path.lower().endswith('.pdf'):
        pdf_path = input_path
        file_path = None
    else:
        file_path = input_path
        pdf_path = None
    # Process RFP
    results = process_rfp(file_path=file_path, pdf_path=pdf_path)
    
    # Handle early errors gracefully
    if 'error' in results:
        print("\nPipeline failed:")
        print(results['error'])
    else:
        # Print summary
        print("\n" + "=" * 80)
        print("FINAL SUMMARY")
        print("=" * 80)
        final_decision = results.get('final_decision', {})
        print(f"Decision: {final_decision.get('decision', 'N/A')}")
        pwin_score = final_decision.get('pwin_score')
        flag_score = final_decision.get('flagging_score')
        print(f"PWin Score: {pwin_score:.2%}" if pwin_score is not None else "PWin Score: N/A")
        print(f"Risk Score: {flag_score:.2f}" if flag_score is not None else "Risk Score: N/A")
        total_price = results.get('pricing', {}).get('total_price')
        print(f"Total Price: ${total_price:,.2f}" if total_price else "Total Price: N/A")
        print("=" * 80)

