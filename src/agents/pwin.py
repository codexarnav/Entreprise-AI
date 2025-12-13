from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel
from typing import TypedDict, List, Optional,Annotated,Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import numpy as np
from torch import cuda
import json
import os
from dotenv import load_dotenv

load_dotenv()

class RfpAggregator(BaseModel):
    rfp_id:int
    title:str
    buyer:str
    deadline:float
    technical_requirements:List[str]
    scope_of_work:List[str]

class RiskandCompilance(BaseModel):
    legal_risks:Optional[List[str]]
    flagging_score:Optional[float]
    risk_brief:str

class CRM(BaseModel):
    customer_id:str
    customer_name:str
    contact_email:str
    industry:Annotated[Optional[str],None]
    company_size:Annotated[Optional[str],None]
    location:Annotated[Optional[str],None]

class PwinState(TypedDict):
    rfp_aggregator_input:RfpAggregator
    risk_and_compilance:Optional[RiskandCompilance]
    crm:Optional[CRM]
    model_input_json:Optional[str]  # JSON input for LLM
    #output
    pwin_labels:Optional[str]
    pwin_score:Optional[float]
    strength:Optional[Dict[str,float]]
    weekness:Optional[Dict[str,float]]
    recommendation:Optional[str]



llm=ChatGoogleGenerativeAI(model='gemini-2.0-flash',temperature=0.2,api_key=os.getenv("GEMINI_API_KEY"))


def prepare_data(state:PwinState)->PwinState:
    """Prepare input for llm by converting all to json """
    rfp_json=state['rfp_aggregator_input'].dict()
    risk_json = state['risk_and_compilance'].dict() if state['risk_and_compilance'] else {}
    crm_json = state['crm'].dict() if state['crm'] else {}

    model_input={
        "rfp_aggregator_input": rfp_json,
        "risk_and_compilance": risk_json,
        "crm": crm_json
    }
    model_input_json = json.dumps(model_input, indent=2)

    return state | {
        "model_input_json": model_input_json}

def PwinAgentLLM(state:PwinState)->PwinState:
    """Call LLM to get PWin score and other details."""

    prompt=PromptTemplate(
        template="""You are an expert bid-qualification analyst.

Given the structured data below, estimate the Probability of Win (PWin),
and provide strengths, weaknesses, risks, and recommendations.

Respond STRICTLY in the following JSON format:
{{
  "pwin_score": float between 0 and 1,
  "strengths": [list of strings],
  "weaknesses": [list of strings],
  "risks": [list of strings],
  "recommendations": [list of strings]
}}

Data: {model_input_json}""",
        input_variables=["model_input_json"]
    )
    formatted_prompt = prompt.format(model_input_json=state['model_input_json'])
    raw_output = llm.invoke(formatted_prompt).content
    result = json.loads(raw_output)

    return state | {
        "pwin_score": result["pwin_score"],
        "strength": result["strengths"],
        "weekness": result["weaknesses"],
        "recommendation": result["recommendations"]
    }


graph=StateGraph(PwinState)
graph.add_node("prepare_data", prepare_data)
graph.add_node("PwinAgentLLM", PwinAgentLLM)

graph.add_edge(START, "prepare_data")
graph.add_edge("prepare_data", "PwinAgentLLM")
graph.add_edge("PwinAgentLLM", END)        

app=graph.compile()


