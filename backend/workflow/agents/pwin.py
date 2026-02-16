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
    
    # Parse JSON response with error handling
    try:
        # Extract content if it's a string
        if isinstance(raw_output, str):
            content = raw_output.strip()
            
            # Check if response is empty
            if not content:
                raise ValueError("Empty response from LLM")
            
            # Try to extract JSON from markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            result = json.loads(content)
        else:
            # If not a string, try to use it directly
            result = raw_output if isinstance(raw_output, dict) else {}
        
        # Validate required fields and provide defaults
        pwin_score = result.get("pwin_score", 0.5)
        strengths = result.get("strengths", [])
        weaknesses = result.get("weaknesses", [])
        recommendations = result.get("recommendations", [])
        
        # Ensure pwin_score is a float between 0 and 1
        if not isinstance(pwin_score, (int, float)):
            pwin_score = 0.5
        pwin_score = max(0.0, min(1.0, float(pwin_score)))
        
        # Ensure lists are actually lists
        if not isinstance(strengths, list):
            strengths = [str(strengths)] if strengths else []
        if not isinstance(weaknesses, list):
            weaknesses = [str(weaknesses)] if weaknesses else []
        if not isinstance(recommendations, list):
            recommendations = [str(recommendations)] if recommendations else []
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"Error parsing LLM response: {e}")
        print(f"Raw output: {raw_output[:200]}...")  # Print first 200 chars for debugging
        # Return default values on error
        result = {
            "pwin_score": 0.5,
            "strengths": [],
            "weaknesses": ["Unable to parse LLM response"],
            "recommendations": ["Review the RFP manually"]
        }
        pwin_score = 0.5
        strengths = []
        weaknesses = result["weaknesses"]
        recommendations = result["recommendations"]

    return state | {
        "pwin_score": pwin_score,
        "strength": strengths,
        "weekness": weaknesses,
        "recommendation": recommendations
    }


graph=StateGraph(PwinState)
graph.add_node("prepare_data", prepare_data)
graph.add_node("PwinAgentLLM", PwinAgentLLM)

graph.add_edge(START, "prepare_data")
graph.add_edge("prepare_data", "PwinAgentLLM")
graph.add_edge("PwinAgentLLM", END)        

app=graph.compile()


