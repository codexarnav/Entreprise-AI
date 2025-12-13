"""
Technical Agent for RFP-to-Product Matching
Uses semantic embeddings and vector similarity for intelligent product matching
"""

from typing import TypedDict, List, Dict, Optional, Annotated
from dataclasses import dataclass
from datetime import datetime
import operator

from langgraph.graph import StateGraph, END


from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

# Vector DB
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from dotenv import load_dotenv
import os
import json

load_dotenv()

@dataclass
class RFPRequirement:
    """Single technical requirement from RFP"""
    id: str
    description: str
    parameters: Dict[str, str]
    category: str
    priority: str  


@dataclass
class SKUMatch:
    """Successful product match"""
    sku_id: str
    product_name: str
    similarity_score: float
    matched_parameters: Dict[str, str]
    spec_sheet_url: str
    match_explanation: str
    confidence: str  


@dataclass
class TechnicalGap:
    """Failed match requiring innovation"""
    requirement_id: str
    requirement_description: str
    missing_parameters: List[str]
    best_partial_match: Optional[Dict]
    gap_severity: str
    innovation_needed: str



class TechnicalAgentState(TypedDict):
    rfp_requirements: List[RFPRequirement]
    similarity_threshold: float
    
    current_requirement: Optional[RFPRequirement]
    requirement_index: int
    embedding_query: str
    
    retrieval_results: List[Dict]
    best_match: Optional[Dict]
    best_score: float
    
    matched_skus: Annotated[List[SKUMatch], operator.add]
    technical_gaps: Annotated[List[TechnicalGap], operator.add]
    
    processing_status: str
    error_messages: Annotated[List[str], operator.add]

class TechnicalAgent:
    """
    Semantic matching engine for RFP requirements to product catalog
    """
    
    def __init__(
        self,
        embeddings: Optional[GoogleGenerativeAIEmbeddings] = None,
        llm: Optional[ChatGoogleGenerativeAI] = None,
        vectorstore_path: str = "./product_vectorstore",
        similarity_threshold: float = 0.80
    ):
        """
        Initialize Technical Agent using GEMINI models
        """
        #self.embeddings = embeddings or GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


        self.llm = llm or ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0,
            api_key=os.getenv("GEMINI_API_KEY")
        )

        self.similarity_threshold = similarity_threshold
        
        # Vector DB
        self.vectorstore = Chroma(
            persist_directory=vectorstore_path,
            embedding_function=self.embeddings,
            collection_name="product_catalog"
        )
        
        # Build state graph
        self.workflow = self._build_graph()
    

    # ========================================================================
    # GRAPH DEFINITION
    # ========================================================================

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(TechnicalAgentState)
        
        workflow.add_node("initialize", self._initialize_processing)
        workflow.add_node("get_next_requirement", self._get_next_requirement)
        workflow.add_node("create_semantic_query", self._create_semantic_query)
        workflow.add_node("vector_search", self._vector_search)
        workflow.add_node("evaluate_match", self._evaluate_match)
        workflow.add_node("create_sku_match", self._create_sku_match)
        workflow.add_node("create_gap_alert", self._create_gap_alert)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("initialize")
        
        workflow.add_edge("initialize", "get_next_requirement")
        
        workflow.add_conditional_edges(
            "get_next_requirement",
            self._route_after_requirement_check,
            {"process": "create_semantic_query", "complete": "finalize"}
        )
        
        workflow.add_edge("create_semantic_query", "vector_search")
        workflow.add_edge("vector_search", "evaluate_match")
        
        workflow.add_conditional_edges(
            "evaluate_match",
            self._route_after_evaluation,
            {"match": "create_sku_match", "gap": "create_gap_alert"}
        )
        
        workflow.add_edge("create_sku_match", "get_next_requirement")
        workflow.add_edge("create_gap_alert", "get_next_requirement")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()



    def _initialize_processing(self, state: TechnicalAgentState) -> Dict:
        return {
            "requirement_index": 0,
            "matched_skus": [],
            "technical_gaps": [],
            "error_messages": [],
            "processing_status": "initialized"
        }


    def _get_next_requirement(self, state: TechnicalAgentState) -> Dict:
        idx = state["requirement_index"]
        reqs = state["rfp_requirements"]
        
        if idx < len(reqs):
            return {"current_requirement": reqs[idx], "processing_status": "processing_requirement"}
        return {"current_requirement": None, "processing_status": "all_requirements_processed"}


    def _create_semantic_query(self, state: TechnicalAgentState) -> Dict:
        req = state["current_requirement"]

        prompt = ChatPromptTemplate.from_template(
            """You are a technical product matching expert. Convert this RFP requirement 
            into an optimized search query.
            
            Requirement Description: {description}
            Technical Parameters: {parameters}
            Category: {category}
            
            Output only a concise, keyword-rich semantic search query.
            """
        )
        
        chain = prompt | self.llm
        response = chain.invoke({
            "description": req.description,
            "parameters": str(req.parameters),
            "category": req.category
        })
        
        return {"embedding_query": response.content.strip()}


    def _vector_search(self, state: TechnicalAgentState) -> Dict:
        query = state["embedding_query"]
        
        results = self.vectorstore.similarity_search_with_score(query, k=5)
        
        formatted = []
        for doc, score in results:
            formatted.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "similarity_score": float(score)
            })
        
        best = formatted[0] if formatted else None
        best_score = best["similarity_score"] if best else 0.0
        
        return {
            "retrieval_results": formatted,
            "best_match": best,
            "best_score": best_score
        }


    def _evaluate_match(self, state: TechnicalAgentState) -> Dict:
        distance = state["best_score"]
        similarity = 1 - (distance / 2) if distance <= 2 else 0
        
        return {"best_score": similarity}


    def _create_sku_match(self, state: TechnicalAgentState) -> Dict:
    
        req = state["current_requirement"]
        match = state["best_match"]
        score = state["best_score"]
    
        # 🔁 Safely parse parameters back to dict
        raw_params = match["metadata"].get("parameters", "{}")
        if isinstance(raw_params, str):
            try:
                matched_params = json.loads(raw_params)
            except json.JSONDecodeError:
                matched_params = {}
        else:
            matched_params = raw_params  # in case it's already dict for some reason
    
        prompt = ChatPromptTemplate.from_template(
            """Explain why this product matches the RFP requirement.
            
            RFP Requirement:
            {requirement}
            Parameters: {req_params}
            
            Matched Product:
            {product_content}
            Metadata: {product_metadata}
            
            Similarity Score: {score:.2%}
            
            Provide a concise, technical explanation.
            """
        )
    
        chain = prompt | self.llm
        explanation = chain.invoke({
            "requirement": req.description,
            "req_params": str(req.parameters),
            "product_content": match["content"],
            "product_metadata": str(match["metadata"]),
            "score": score
        }).content.strip()
        
        confidence = "High" if score >= 0.9 else "Medium" if score >= 0.8 else "Low"
    
        sku = SKUMatch(
            sku_id=match["metadata"].get("sku_id", ""),
            product_name=match["metadata"].get("product_name", ""),
            similarity_score=score,
            matched_parameters=matched_params,  # ⬅️ now a proper dict again
            spec_sheet_url=match["metadata"].get("spec_sheet_url", ""),
            match_explanation=explanation,
            confidence=confidence,
        )
    
        return {
            "matched_skus": [sku],
            "requirement_index": state["requirement_index"] + 1,
        }
    


    def _create_gap_alert(self, state: TechnicalAgentState) -> Dict:
        req = state["current_requirement"]
        best = state["best_match"]
        score = state["best_score"]

        prompt = ChatPromptTemplate.from_template(
            """Analyze the technical gap between this RFP requirement and the best product match.
            
            Requirement:
            {requirement}
            Required Parameters: {req_params}
            
            Best Partial Match (Score: {score:.2%}):
            {product_content}
            Specs: {product_metadata}
            
            Identify:
            - Missing parameters
            - Gap severity
            - Innovation needed
            
            Give a structured analysis.
            """
        )

        chain = prompt | self.llm
        analysis = chain.invoke({
            "requirement": req.description,
            "req_params": str(req.parameters),
            "score": score,
            "product_content": best["content"] if best else "None",
            "product_metadata": str(best["metadata"]) if best else "{}"
        }).content.strip()
        
        severity = "Critical" if req.priority == "Critical" or score < 0.50 else (
                    "Moderate" if score < 0.70 else "Minor")

        gap = TechnicalGap(
            requirement_id=req.id,
            requirement_description=req.description,
            missing_parameters=list(req.parameters.keys()),
            best_partial_match=best,
            gap_severity=severity,
            innovation_needed=analysis
        )

        return {
            "technical_gaps": [gap],
            "requirement_index": state["requirement_index"] + 1
        }


    def _finalize_results(self, state: TechnicalAgentState) -> Dict:
        total = len(state["rfp_requirements"])
        matched = len(state["matched_skus"])
        gaps = len(state["technical_gaps"])

        return {"processing_status": f"Complete: {matched}/{total} matched, {gaps} gaps identified"}


    

    def _route_after_requirement_check(self, state: TechnicalAgentState):
        return "complete" if state["current_requirement"] is None else "process"


    def _route_after_evaluation(self, state: TechnicalAgentState):
        return "match" if state["best_score"] >= state["similarity_threshold"] else "gap"


    

    def process_rfp(self, requirements: List[RFPRequirement], similarity_threshold: Optional[float] = None):
        initial = {
            "rfp_requirements": requirements,
            "similarity_threshold": similarity_threshold or self.similarity_threshold,
            "requirement_index": 0,
            "matched_skus": [],
            "technical_gaps": [],
            "error_messages": []
        }
        
        final_state = self.workflow.invoke(initial)

        return {
            "matched_skus": final_state["matched_skus"],
            "technical_gaps": final_state["technical_gaps"],
            "status": final_state["processing_status"],
            "errors": final_state["error_messages"]
        }


    def add_products_to_catalog(self, products: List[Dict]):
        docs = []
    
        for p in products:
            params = p.get("parameters", {})
    
            text = f"""
            Product: {p['product_name']}
            SKU: {p['sku_id']}
            Category: {p.get('category', 'Unknown')}
            Description: {p['description']}
            Specifications: {params}
            """.strip()
    
            # ✅ Serialize complex fields (dict) as JSON string
            metadata = {
                "sku_id": p["sku_id"],
                "product_name": p["product_name"],
                "parameters": json.dumps(params),  # ⬅️ now a string
                "spec_sheet_url": p.get("spec_sheet_url", ""),
                "category": p.get("category", "Unknown"),
            }
    
            doc = Document(
                page_content=text,
                metadata=metadata,
            )
            docs.append(doc)
    
        self.vectorstore.add_documents(docs)
        print(f"Added {len(docs)} products to catalog")
    



# ============================================================================
# USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    # Initialize agent
    agent = TechnicalAgent(
        similarity_threshold=0.80
    )
    
    # Sample: Add products to catalog
    sample_products = [
        {
            "sku_id": "CBL-1100-XLPE-ARM",
            "product_name": "1.1kV XLPE Armored Cable",
            "description": "Medium voltage power cable with XLPE insulation and steel wire armor",
            "parameters": {
                "voltage": "1.1kV",
                "insulation": "XLPE",
                "armor": "SWA",
                "conductor": "Copper",
                "cores": "3-Core",
            },
            "spec_sheet_url": "https://example.com/specs/cbl1100.pdf",
            "category": "Cable"
        },
        {
            "sku_id": "CBL-300-ALU-PVC",
            "product_name": "300V Aluminum PVC Cable",
            "description": "Low voltage flexible PVC insulated cable for general electrical wiring",
            "parameters": {
                "voltage": "300V",
                "insulation": "PVC",
                "conductor": "Aluminum",
                "cores": "2-Core",
            },
            "spec_sheet_url": "https://example.com/specs/cbl300.pdf",
            "category": "Cable"
        },
        {
            "sku_id": "CBL-FRLSH-1KV-4C",
            "product_name": "1kV FR-LSH Fire Retardant Cable",
            "description": "Fire retardant low smoke halogen cable for indoor industrial wiring",
            "parameters": {
                "voltage": "1kV",
                "insulation": "FR-LSH",
                "conductor": "Copper",
                "armor": "None",
                "cores": "4-Core"
            },
            "spec_sheet_url": "https://example.com/specs/frlsh.pdf",
            "category": "Cable"
        },
        {
            "sku_id": "CBL-33KV-HT-XLPE",
            "product_name": "33kV High Tension XLPE Power Cable",
            "description": "High tension power cable designed for substations and transmission",
            "parameters": {
                "voltage": "33kV",
                "insulation": "XLPE",
                "armor": "SWA",
                "conductor": "Copper",
                "cores": "Single Core"
            },
            "spec_sheet_url": "https://example.com/specs/33kv.pdf",
            "category": "Cable"
        },
        {
            "sku_id": "CBL-CONTROL-1.1KV-12C",
            "product_name": "1.1kV Multi-Core Control Cable",
            "description": "Control cable used in automation and industrial panels",
            "parameters": {
                "voltage": "1.1kV",
                "insulation": "PVC",
                "armor": "None",
                "conductor": "Copper",
                "cores": "12-Core"
            },
            "spec_sheet_url": "https://example.com/specs/control.pdf",
            "category": "Control Cable"
        },
        {
            "sku_id": "CBL-SOLAR-DC-1500V",
            "product_name": "1500V Solar DC Cable",
            "description": "UV-resistant, weatherproof cable for solar PV installations",
            "parameters": {
                "voltage": "1500V DC",
                "insulation": "XLPE",
                "conductor": "Copper",
                "cores": "Single Core",
                "temperature_rating": "120C"
            },
            "spec_sheet_url": "https://example.com/specs/solar.pdf",
            "category": "Solar Cable"
        },
        {
            "sku_id": "CBL-ARMORED-INSTR-600V",
            "product_name": "600V Armored Instrumentation Cable",
            "description": "Shielded armored instrumentation cable for industrial sensors",
            "parameters": {
                "voltage": "600V",
                "insulation": "PVC",
                "armor": "SWA",
                "conductor": "Copper",
                "shielding": "Aluminum Foil",
                "cores": "4-Pair"
            },
            "spec_sheet_url": "https://example.com/specs/instr-armored.pdf",
            "category": "Instrumentation"
        },
        {
            "sku_id": "CBL-ETH-CAT6-IND",
            "product_name": "Industrial CAT6 Ethernet Cable",
            "description": "High-speed rugged Ethernet cable for industrial networking",
            "parameters": {
                "type": "CAT6",
                "speed": "1Gbps",
                "shielding": "STP",
                "temperature_rating": "90C"
            },
            "spec_sheet_url": "https://example.com/specs/cat6.pdf",
            "category": "Networking"
        },
        {
            "sku_id": "CBL-OFC-SM-12C",
            "product_name": "12 Core Single-Mode Fiber Optic Cable",
            "description": "Low-loss optical fiber cable for telecom backbone",
            "parameters": {
                "fiber_type": "Single Mode",
                "cores": "12",
                "jacket": "HDPE",
                "application": "Outdoor Underground"
            },
            "spec_sheet_url": "https://example.com/specs/ofc12.pdf",
            "category": "Fiber Optic"
        },
        {
            "sku_id": "CBL-HVAC-400HZ",
            "product_name": "400Hz Aircraft Grade Cable",
            "description": "Low-weight cable designed for aircraft electrical systems",
            "parameters": {
                "frequency": "400Hz",
                "insulation": "Silicone",
                "conductor": "Tinned Copper",
                "temperature_rating": "200C"
            },
            "spec_sheet_url": "https://example.com/specs/aircraft.pdf",
            "category": "Aerospace Cable"
        }
    ]

    
    agent.add_products_to_catalog(sample_products)
    
    # Sample: Process RFP requirements
    sample_requirements = [
        RFPRequirement(
            id="REQ-001",
            description="Medium voltage power cable for industrial installation",
            parameters={
                "voltage": "1.1kV",
                "insulation": "XLPE",
                "armor": "Required",
                "fire_rating": "FR-LSH"
            },
            category="Cable",
            priority="Critical"
        )
    ]
    
    # Process
    results = agent.process_rfp(sample_requirements)
    
    print("\n=== TECHNICAL AGENT RESULTS ===")
    print(f"\nStatus: {results['status']}")
    print(f"\nMatched SKUs: {len(results['matched_skus'])}")
    for match in results['matched_skus']:
        print(f"  - {match.product_name} (Score: {match.similarity_score:.2%})")
    
    print(f"\nTechnical Gaps: {len(results['technical_gaps'])}")
    for gap in results['technical_gaps']:
        print(f"  - {gap.requirement_id}: {gap.gap_severity} severity")