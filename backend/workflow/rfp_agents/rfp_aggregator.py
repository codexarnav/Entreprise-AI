from langgraph.graph import StateGraph,START,END
from pydantic import BaseModel
from typing import TypedDict,List,Optional,Annotated,Dict
from transformers import AutoTokenizer,AutoModelForQuestionAnswering,pipeline
from langchain_community.document_loaders import TextLoader,PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()



class RfpAggregatorInput(BaseModel):
    text_path:str
    pdf_path:Optional[str]
    documents:Optional[List[str]]
    chunked_text:Optional[List[str]]
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

tokenizer=AutoTokenizer.from_pretrained("deepset/roberta-base-squad2")
model=AutoModelForQuestionAnswering.from_pretrained("deepset/roberta-base-squad2")
ner=pipeline(
    "question-answering",
    model=model,
    tokenizer=tokenizer
)

def document_loader(state:RfpAggregatorState)->RfpAggregatorState:
    """Load document from file path"""
    if state['rfp_aggregator_input'].pdf_path:
        loader=PyMuPDFLoader(state['rfp_aggregator_input'].pdf_path)
    else:
        loader=TextLoader(state['rfp_aggregator_input'].text_path)
    documents=loader.load()
    state['rfp_aggregator_input'].documents=[doc.page_content for doc in documents]
    return state

def chunks(state:RfpAggregatorState)->RfpAggregatorState:
    """Split long text into manageable chunks."""
    splitter=RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )
    for doc in state['rfp_aggregator_input'].documents:
        doc_chunks=splitter.split_text(doc)
    state['rfp_aggregator_input'].chunked_text=doc_chunks
    return state


def rfp_aggregator_ner(state:RfpAggregatorState)->RfpAggregatorState:
    """Extract Rfp details using deepset/roberta"""
    rfp_text="".join(state['rfp_aggregator_input'].chunked_text)
    questions={
        "title":"What is the title of the RFP?",
        "buyer":"Who is the buyer?",
        "deadline":"What is the deadline? Provide in epoch format.",
        "technical_requirements":"List the technical requirements mentioned.",
        "scope_of_work":"What is the scope of work?"
    }
    rfp_details={}
    for key,question in questions.items():
        answer=ner(question=question,context=rfp_text)
        rfp_details[key]=answer['answer']

    
    raw_deadline = rfp_details.get('deadline') or ""
    try:
        
        deadline_value = str(float(raw_deadline))
    except Exception:
        deadline_value = raw_deadline.strip()
    rfp_output=RfpAggregatorOutput(
        rfp_id=1,
        title=rfp_details['title'],
        buyer=rfp_details['buyer'],
        deadline=deadline_value,
        technical_requirements=[req.strip() for req in rfp_details['technical_requirements'].split(',')],
        scope_of_work=[scope.strip() for scope in rfp_details['scope_of_work'].split(',')]
    )
    return state | {
        "rfp_aggregator_output": rfp_output
    }

graph=StateGraph(RfpAggregatorState)
graph.add_node("document_loader", document_loader)
graph.add_node("chunks", chunks)
graph.add_node("rfp_aggregator_ner", rfp_aggregator_ner)
graph.add_edge(START, "document_loader")
graph.add_edge("document_loader", "chunks")
graph.add_edge("chunks", "rfp_aggregator_ner")
graph.add_edge("rfp_aggregator_ner", END)

app=graph.compile()

