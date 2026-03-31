from langgraph.graph import StateGraph,START,END
from pydantic import BaseModel
from typing import TypedDict,List,Optional,Annotated,Dict
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import TextLoader,PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()



class RfpAggregatorInput(BaseModel):
    text_path: Optional[str] = None
    pdf_path: Optional[str] = None
    documents: Optional[List[str]] = None
    chunked_text: Optional[List[str]] = None
class RfpAggregatorOutput(BaseModel):
    rfp_id:int
    title:str
    buyer:str
    deadline:Optional[str]
    technical_requirements:List[str]
    scope_of_work:List[str]

class RfpAggregatorState(TypedDict):
    rfp_aggregator_input:RfpAggregatorInput
    rfp_aggregator_output:Optional[RfpAggregatorOutput]

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.1,
        api_key=os.getenv("GEMINI_API_KEY")
    )

def document_loader(state:RfpAggregatorState)->RfpAggregatorState:
    """Load document from file path with robust path resolution"""
    path = state['rfp_aggregator_input'].pdf_path or state['rfp_aggregator_input'].text_path
    
    if not path:
        raise ValueError("No document path provided to loader")
        
    # Robust Path Resolution: Handle Linux-style absolute paths on Windows
    if path.startswith('/') and not path.startswith('//'):
        # Use abs path of project root to map /uploads/
        project_root = os.path.abspath(os.getcwd())
        if path.startswith('/uploads/'):
            path = os.path.join(project_root, "uploads", os.path.basename(path))
        else:
            path = os.path.join(project_root, path.lstrip('/'))
            
    if not os.path.exists(path):
        # Final fallback check in current directory
        if os.path.exists(os.path.basename(path)):
            path = os.path.abspath(os.path.basename(path))
        else:
            raise FileNotFoundError(f"RFP Document not found at {path}")

    if path.lower().endswith('.pdf'):
        loader = PyMuPDFLoader(path)
    else:
        loader = TextLoader(path)
        
    documents = loader.load()
    state['rfp_aggregator_input'].documents = [doc.page_content for doc in documents]
    return state

def chunks(state:RfpAggregatorState)->RfpAggregatorState:
    """Split long text into manageable chunks."""
    splitter=RecursiveCharacterTextSplitter(
        chunk_size=10000, # Increased for Gemini
        chunk_overlap=500
    )
    all_chunks = []
    for doc in state['rfp_aggregator_input'].documents:
        doc_chunks=splitter.split_text(doc)
        all_chunks.extend(doc_chunks)
    
    state['rfp_aggregator_input'].chunked_text = all_chunks
    return state


def rfp_aggregator_ner(state:RfpAggregatorState)->RfpAggregatorState:
    """Extract RFP details using Gemini 2.0 with JSON formatting."""
    full_text = "\n\n".join(state['rfp_aggregator_input'].chunked_text)
    llm = get_llm()
    
    prompt = f"""
    You are an expert RFP Analyst. Extract structured data from the following RFP text.
    
    RFP TEXT:
    {full_text[:5000]} # Gemini can handle more, but we truncate for performance if needed
    
    Output ONLY valid JSON in this format:
    {{
      "rfp_id": 1,
      "title": "String",
      "buyer": "String",
      "deadline": "ISO format string or epoch",
      "technical_requirements": ["list", "of", "strings"],
      "scope_of_work": ["list", "of", "strings"]
    }}
    
    Ensure `technical_requirements` captures specific hardware/software counts, SKUs, and performance specs.
    Ensure `scope_of_work` captures timeline and deliverables.
    """
    
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        
        # Strip markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.split("```")[0].strip()
            
        data = json.loads(content)
        
        # Map to Output model
        rfp_output = RfpAggregatorOutput(**data)
        
    except Exception as e:
        print(f"Extraction failed: {e}")
        # Fallback empty result
        rfp_output = RfpAggregatorOutput(
            rfp_id=0, title="Unknown", buyer="Unknown", deadline="",
            technical_requirements=[], scope_of_work=[]
        )

    return {**state, "rfp_aggregator_output": rfp_output}

graph=StateGraph(RfpAggregatorState)
graph.add_node("document_loader", document_loader)
graph.add_node("chunks", chunks)
graph.add_node("rfp_aggregator_ner", rfp_aggregator_ner)
graph.add_edge(START, "document_loader")
graph.add_edge("document_loader", "chunks")
graph.add_edge("chunks", "rfp_aggregator_ner")
graph.add_edge("rfp_aggregator_ner", END)

app=graph.compile()

