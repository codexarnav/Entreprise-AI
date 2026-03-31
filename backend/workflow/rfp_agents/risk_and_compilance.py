import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, List, Optional, Dict
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.2,
    api_key=os.getenv("GEMINI_API_KEY")
)

class RiskAndComplianceState(TypedDict):
    file_path: str
    parsed_text: str
    chunked_text: List[str]
    legal_risks: Optional[List[str]]
    report: str
    flagging_score: Optional[float]
    risk_brief: str

def read_text_file(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Load text from file or use provided parsed_text."""
    if not state['parsed_text']:
        loader = TextLoader(state['file_path'])
        documents = loader.load()
        state['parsed_text'] = documents[0].page_content
    return state

def split_text(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Split long text into manageable chunks."""
    if not state.get('chunked_text') and state.get('parsed_text'):
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=20000, # Gemini optimized context
            chunk_overlap=500
        )
        state['chunked_text'] = splitter.split_text(state['parsed_text'])
    return state

def analyze_risk_compliance(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Unified extraction of risks and compliance using Gemini 2.0."""
    context = "\n".join(state.get('chunked_text', [])) or state.get('parsed_text', "")
    
    prompt = f"""
    You are a high-level Legal & Compliance analyst for an industrial OEM.
    Analyze the provided RFP text for critical business risks and regulatory compliance markers.

    TEXT CONTENT:
    {context[:5000]}

    TASK:
    1. EXTRACT ALL RISKS: Liability limits, indemnity gaps, penalty clauses, payment term risks.
    2. EXTRACT COMPLIANCE: ISO standards, environmental certifications, safety protocols, local laws.
    3. FLAG: Overall risk score (0.0 to 1.0).

    RETURN ONLY VALID JSON:
    {{
      "all_risks": ["Risk list"],
      "all_compliance": ["Compliance list"],
      "summary": "High-level brief (3-5 bullets)",
      "flagging_score": 0.0
    }}
    """
    
    try:
        response = llm.invoke(prompt)
        data = json.loads(response.content.strip().strip('```json').strip('```'))
        
        state['risk_brief'] = data.get("summary", "")
        state['flagging_score'] = data.get("flagging_score", 0.0)
        
        combined = []
        combined.extend([f"RISK: {r}" for r in data.get("all_risks", [])])
        combined.extend([f"COMPLIANCE: {c}" for c in data.get("all_compliance", [])])
        state['legal_risks'] = combined
        
        state['report'] = json.dumps(data)
        
    except Exception as e:
        print(f"Risk analysis failed: {e}")
        state['legal_risks'] = []
        state['flagging_score'] = 0.5
        
    return state

graph = StateGraph(RiskAndComplianceState)

graph.add_node("read_text_file", read_text_file)
graph.add_node("split_text", split_text)
graph.add_node("analyze_risk_compliance", analyze_risk_compliance)

graph.add_edge(START, "read_text_file")
graph.add_edge("read_text_file", "split_text")
graph.add_edge("split_text", "analyze_risk_compliance")
graph.add_edge("analyze_risk_compliance", END)

app = graph.compile()



    
