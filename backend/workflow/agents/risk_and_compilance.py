from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_community.document_loaders import TextLoader
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

NER_MODEL = "dslim/bert-base-NER"

tokenizer = AutoTokenizer.from_pretrained(NER_MODEL)
model = AutoModelForTokenClassification.from_pretrained(NER_MODEL)
ner = pipeline(
    "token-classification",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)
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
    if not state['chunked_text']:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150
        )
        chunks = splitter.split_text(state['parsed_text'])
        state['chunked_text'] = chunks
    return state

def ner_legal_bert(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Extract ALL legal entities using Legal-BERT. No filtering."""

    extracted_entities = []
    discovered_groups = set()

    for chunk in state["chunked_text"]:
        entities = ner(chunk)
        for ent in entities:
            group = ent["entity_group"]
            word = ent["word"]
            extracted_entities.append(f"{group}: {word}")
            discovered_groups.add(group)

    state['legal_risks'] = extracted_entities if extracted_entities else None
    return state

def generate_report(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Summarize extracted legal entities and assess risk with all risks and compliance stated."""

    prompt = f"""
    You are a senior legal and compliance expert.

    These are the extracted legal entities:
    {state['legal_risks']}

    TASK:
    - List ALL potential legal/compliance risks identified in the document.
    - List ALL compliance requirements mentioned.
    - Identify risky clauses (e.g., indemnity, liability, warranty, penalties).
    - Assign a flagging score between 0 and 1 (where 1 is highest risk).
    
    Return ONLY valid JSON:
    {{
      "all_risks": ["risk1", "risk2", ...],
      "all_compliance": ["compliance1", "compliance2", ...],
      "summary": "...",
      "flagging_score": 0.0
    }}
    """

    response = llm.invoke(prompt).content
    state["report"] = response
    return state

def access_risk(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Extract flagging score and all risks/compliance from the JSON report."""
    import json

    try:
        parsed = json.loads(state["report"])
        score = float(parsed.get("flagging_score", parsed.get("severity", 0.0)))
        all_risks = parsed.get("all_risks", [])
        all_compliance = parsed.get("all_compliance", [])
        
        # Update legal_risks to include all risks and compliance
        combined_risks = []
        if all_risks:
            combined_risks.extend([f"RISK: {r}" for r in all_risks])
        if all_compliance:
            combined_risks.extend([f"COMPLIANCE: {c}" for c in all_compliance])
        if combined_risks:
            state['legal_risks'] = combined_risks
    except:
        score = 0.5  

    state["flagging_score"] = score
    return state

def generate_risk_brief(state: RiskAndComplianceState) -> RiskAndComplianceState:
    """Generate a short risk brief for final output."""

    prompt = f"""
    Create a very concise Risk Brief based on:

    Report:
    {state['report']}

    Severity Score: {state['flagging_score']}

    Requirements:
    - 3–5 bullet points
    - High-level summary
    - Identified risks
    - Overall risk verdict
    """

    response = llm.invoke(prompt).content
    state["risk_brief"] = response
    return state

graph = StateGraph(RiskAndComplianceState)

graph.add_node("read_text_file", read_text_file)
graph.add_node("split_text", split_text)
graph.add_node("ner_legal_bert", ner_legal_bert)
graph.add_node("generate_report", generate_report)
graph.add_node("access_risk", access_risk)
graph.add_node("generate_risk_brief", generate_risk_brief)

graph.add_edge(START, "read_text_file")
graph.add_edge("read_text_file", "split_text")
graph.add_edge("split_text", "ner_legal_bert")
graph.add_edge("ner_legal_bert", "generate_report")
graph.add_edge("generate_report", "access_risk")
graph.add_edge("access_risk", "generate_risk_brief")

graph.add_edge("generate_risk_brief", END)

app = graph.compile()



    
