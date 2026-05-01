
import os
import json
import re
import logging
from typing import List, Dict, Any, Optional, TypedDict

from pydantic import BaseModel, Field, validator
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from apify_client import ApifyClient
from langchain.text_splitters import RecursiveCharacterTextSplitter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CompetitorInput(BaseModel):
    """Input for competitor analysis workflow."""
    product_url: str = Field(..., description="URL of competitor product page")
    company_url: str = Field(..., description="URL of competitor company page")


class CompetitorOutput(BaseModel):
    """Structured competitor intelligence output."""
    title: str = Field(..., description="Company/product name extracted")
    competitor_brief: str = Field(..., description="3-5 sentence executive summary")
    pricing_strategy: str = Field(..., description="Pricing model, tiers, and strategy")
    target_market: str = Field(..., description="Primary customer segments targeted")
    strengths: List[str] = Field(
        default_factory=list,
        description="Key competitive advantages (3-5 items)"
    )
    weaknesses: List[str] = Field(
        default_factory=list,
        description="Identified gaps or vulnerabilities (2-4 items)"
    )
    strategic_threat: str = Field(
        ...,
        description="Why this competitor matters strategically"
    )
    opportunity: str = Field(
        ...,
        description="Market/product opportunity to exploit or address"
    )
    confidence: float = Field(
        default=0.75,
        ge=0.0,
        le=1.0,
        description="Confidence score (0.0-1.0) based on data quality"
    )

    @validator('strengths', 'weaknesses')
    def validate_list_items(cls, v):
        """Ensure list items are non-empty strings."""
        return [item.strip() for item in v if isinstance(item, str) and item.strip()]


class CompetitorWorkflowState(TypedDict):
    """LangGraph workflow state."""
    competitor_input: CompetitorInput
    competitor_output: Optional[CompetitorOutput]
    error: Optional[str]

def clean_text(text: str) -> str:
    
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common HTML artifacts
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    
    # Remove URLs (noise in competitor analysis)
    text = re.sub(r'https?://\S+', '', text)
    
    # Remove email addresses to avoid noise
    text = re.sub(r'\S+@\S+', '', text)
    
    return text.strip()


def chunk_text(text: str, chunk_size: int = 4000, overlap: int = 300) -> List[str]:
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_text(text)


def compress_text(chunks: List[str], max_total_length: int = 10000) -> str:
    
    if not chunks:
        return ""
    
    if len(chunks) == 1:
        return chunks[0][:max_total_length]
    
    # Always include first chunk
    compressed = [chunks[0]]
    current_length = len(chunks[0])
    
    # Sample remaining chunks evenly
    remaining_chunks = chunks[1:]
    step = max(1, len(remaining_chunks) // 5)  # Sample every Nth chunk
    
    for chunk in remaining_chunks[::step]:
        if current_length + len(chunk) > max_total_length:
            break
        compressed.append(chunk)
        current_length += len(chunk)
    
    result = " [CHUNK_BREAK] ".join(compressed)
    return result[:max_total_length]

class CompetitorCrawler:
    """Production-grade web crawler powered by Apify."""
    
    def __init__(self):
        """Initialize Apify client."""
        api_token = os.getenv("APIFY_TOKEN")
        if not api_token:
            raise ValueError("APIFY_TOKEN environment variable not set")
        self.client = ApifyClient(api_token)
    
    def crawl_urls(
        self,
        product_url: str,
        company_url: str,
        max_pages: int = 10,
        max_depth: int = 2
    ) -> str:
        
        try:
            logger.info(f"Starting crawl for {product_url} and {company_url}")
            
            run = self.client.actor('apify/website-content-crawler').call(
                run_input={
                    "startUrls": [
                        {"url": product_url},
                        {"url": company_url}
                    ],
                    "maxDepth": max_depth,
                    "maxPagesPerCrawl": max_pages,
                    "includeUrlGlobs": [],
                    "excludeUrlGlobs": [],
                    "proxyConfiguration": {
                        "useApifyProxy": True
                    }
                }
            )
            
            # Extract text from all crawled pages
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                logger.warning("No dataset returned from crawler")
                return ""
            
            items = list(self.client.dataset(dataset_id).iterate_items())
            logger.info(f"Crawled {len(items)} pages")
            
            # Concatenate text content with metadata
            texts = []
            for item in items:
                text = item.get("text", "").strip()
                if text:
                    texts.append(text)
            
            combined_text = " ".join(texts)
            logger.info(f"Total text extracted: {len(combined_text)} characters")
            
            return combined_text
            
        except Exception as e:
            logger.error(f"Crawl error: {str(e)}")
            raise


def build_competitor_insight_prompt(scraped_content: str) -> str:
    return f"""You are a competitive intelligence analyst specialized in B2B SaaS markets.

Your task: Analyze the below company/product content and extract structured competitor insights.

===== CONTENT TO ANALYZE =====
{scraped_content}

===== REQUIREMENT =====
Return ONLY a single valid JSON object matching this schema EXACTLY:

{{
    "title": "string - official company or product name",
    "competitor_brief": "string - 2-4 sentence executive summary of what they do",
    "pricing_strategy": "string - their pricing model (subscription tiers, enterprise pricing, etc). If not found, write 'Pricing information not publicly available.'",
    "target_market": "string - primary customer segments (e.g., 'Enterprise Fortune 500', 'SMB SaaS', etc.)",
    "strengths": ["string", "string", "string"] - 3-5 key competitive advantages observed,
    "weaknesses": ["string", "string"] - 2-4 gaps or vulnerabilities,
    "strategic_threat": "string - 1-2 sentences on why this competitor matters to us strategically",
    "opportunity": "string - 1-2 sentences on market opportunity we can exploit or address",
    "confidence": 0.85
}}

===== CRITICAL RULES =====
1. Return ONLY the JSON object, no other text
2. All fields are REQUIRED
3. Do NOT hallucinate information not in the content
4. For missing data, write: "Not found in available content"
5. Confidence score: 
   - 0.9-1.0 if data is explicit and comprehensive
   - 0.7-0.9 if some inference required
   - 0.5-0.7 if significant gaps exist
   - Below 0.5 if content is too thin
6. Strengths/weaknesses: focus on facts, not opinions
7. Never return null values - use empty strings or "Not found in available content"

===== START ANALYSIS NOW ====="""


def parse_llm_json_response(response_text: str) -> Dict[str, Any]:
    
    response_text = response_text.strip()
  
    if "```json" in response_text:
        start = response_text.find("```json") + 7
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()
    elif "```" in response_text:
        start = response_text.find("```") + 3
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()
    
    # Find JSON object boundaries
    start_idx = response_text.find('{')
    end_idx = response_text.rfind('}')
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError("No JSON object found in response")
    
    json_str = response_text[start_idx:end_idx + 1]
    
    try:
        parsed = json.loads(json_str)
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {str(e)}")
        raise ValueError(f"Invalid JSON in response: {str(e)}")


def analyze_competitor_with_llm(content: str) -> CompetitorOutput:
   
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-pro",
        temperature=0.3,  # Lower temp for factual analysis
        api_key=os.getenv("GEMINI_API_KEY")
    )
    
    prompt = build_competitor_insight_prompt(content)
    
    logger.info("Invoking LLM for competitor analysis (SINGLE CALL)")
    try:
        response = model.invoke(prompt)
        response_text = response.content
    except Exception as e:
        logger.error(f"LLM invocation failed: {str(e)}")
        raise ValueError(f"LLM error: {str(e)}")
    
    logger.info("LLM analysis complete, parsing response")
    
    # Parse JSON from response
    try:
        parsed_data = parse_llm_json_response(response_text)
    except ValueError as e:
        logger.error(f"Failed to parse LLM response: {str(e)}")
        raise
    
    # Validate and construct output model
    try:
        output = CompetitorOutput(
            title=parsed_data.get("title", "Unknown"),
            competitor_brief=parsed_data.get("competitor_brief", ""),
            pricing_strategy=parsed_data.get("pricing_strategy", ""),
            target_market=parsed_data.get("target_market", ""),
            strengths=parsed_data.get("strengths", []),
            weaknesses=parsed_data.get("weaknesses", []),
            strategic_threat=parsed_data.get("strategic_threat", ""),
            opportunity=parsed_data.get("opportunity", ""),
            confidence=float(parsed_data.get("confidence", 0.7))
        )
        logger.info(f"Successfully parsed competitor: {output.title}")
        return output
    except Exception as e:
        logger.error(f"Failed to construct output model: {str(e)}")
        raise ValueError(f"Output validation failed: {str(e)}")

def create_fallback_output(error_msg: str) -> CompetitorOutput:
    
    return CompetitorOutput(
        title="Analysis Failed",
        competitor_brief=f"Unable to complete analysis: {error_msg}",
        pricing_strategy="Not found in available content",
        target_market="Not found in available content",
        strengths=["Unable to assess"],
        weaknesses=["Data insufficient"],
        strategic_threat="Unable to assess",
        opportunity="Unable to assess",
        confidence=0.0
    )

def competitor_analysis_node(state: CompetitorWorkflowState) -> CompetitorWorkflowState:
   
    try:
        competitor_input = state['competitor_input']
        
        # Step 1: Crawl
        logger.info("=" * 70)
        logger.info("COMPETITOR ANALYSIS WORKFLOW STARTED")
        logger.info("=" * 70)
        
        crawler = CompetitorCrawler()
        raw_content = crawler.crawl_urls(
            product_url=competitor_input.product_url,
            company_url=competitor_input.company_url,
            max_pages=10,
            max_depth=2
        )
        
        if not raw_content.strip():
            logger.warning("No content retrieved from crawl")
            return state | {
                "competitor_output": create_fallback_output("No content retrieved"),
                "error": "No content retrieved from URLs"
            }
        
        # Step 2: Clean
        logger.info("Cleaning extracted content")
        clean_content = clean_text(raw_content)
        
        # Step 3: Chunk
        logger.info("Chunking content for compression")
        chunks = chunk_text(clean_content, chunk_size=2000, overlap=300)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Step 4: Compress
        logger.info("Compressing chunked content to fit token budget")
        compressed_content = compress_text(chunks, max_total_length=30000)
        logger.info(f"Compressed to {len(compressed_content)} characters")
        
        # Step 5-6: LLM Analysis + Validation
        logger.info("Starting LLM analysis")
        competitor_output = analyze_competitor_with_llm(compressed_content)
        
        logger.info("=" * 70)
        logger.info(f"ANALYSIS COMPLETE: {competitor_output.title}")
        logger.info(f"Confidence: {competitor_output.confidence}")
        logger.info("=" * 70)
        
        return state | {
            "competitor_output": competitor_output,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Workflow error: {str(e)}", exc_info=True)
        return state | {
            "competitor_output": create_fallback_output(str(e)),
            "error": str(e)
        }

def create_competitor_workflow():
    """Create and compile the LangGraph workflow."""
    workflow = StateGraph(CompetitorWorkflowState)
    workflow.add_node("competitor_analysis", competitor_analysis_node)
    workflow.add_edge(START, "competitor_analysis")
    workflow.add_edge("competitor_analysis", END)
    return workflow.compile()


if __name__ == "__main__":
    app = create_competitor_workflow()
    initial_state = {
        "competitor_input": CompetitorInput(
            product_url="https://www.notion.so",
            company_url="https://www.notion.so/about"
        ),
        "competitor_output": None,
        "error": None
    }
    
    
    result = app.invoke(initial_state)
    output = result.get("competitor_output")
    if output:
        print("\n" + "=" * 70)
        print("COMPETITOR INTELLIGENCE REPORT")
        print("=" * 70)
        print(json.dumps(output.model_dump(), indent=2))
    
    if result.get("error"):
        print(f"\nWorkflow Error: {result['error']}")
