import os
import json
import numpy as np
import cv2
import pytesseract

from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI


VENDOR_MEMORY: List[Dict[str, Any]] = []
EMBEDDING_MEMORY: List[Dict[str, Any]] = []

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-pro",
    temperature=0.2,
    api_key=os.getenv("GEMINI_API_KEY")
)

def extract_text_from_image(image_path: str) -> str:
    try:
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

        text = pytesseract.image_to_string(thresh)
        return text.strip()
    except Exception as e:
        print("OCR Error:", e)
        return ""

def extract_structured_data(text: str) -> Dict[str, Any]:
    prompt = f"""
    Extract structured data from this OCR text.

    Return STRICT JSON:
    {{
      "name": "",
      "aadhar_number": "",
      "pan_number": "",
      "address": ""
    }}

    Text:
    {text}
    """

    res = llm.invoke(prompt)

    try:
        return json.loads(res.content)
    except:
        return {}

def resolve_vendor(data: Dict[str, Any]) -> Dict:
    for vendor in VENDOR_MEMORY:
        if vendor.get("pan_number") == data.get("pan_number"):
            return {"status": "existing", "vendor": vendor}
    return {"status": "new"}


def kyc_verification(data, input_aadhar, input_pan) -> Dict:
    if data.get("aadhar_number") == input_aadhar and data.get("pan_number") == input_pan:
        return {"status": "verified", "confidence": 0.9}
    return {"status": "failed", "confidence": 0.4}

def generate_embedding(image_path: str):
    try:
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        resized = cv2.resize(gray, (64, 64))  # fixed size
        flattened = resized.flatten().astype("float32")

        normalized = flattened / np.linalg.norm(flattened)
        return normalized
    except:
        return None

def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2)

def compare_faces(emb1, emb2, threshold=0.85):
    similarity = cosine_similarity(emb1, emb2)
    return similarity > threshold

def fraud_check(data, new_embedding) -> Dict:
    for vendor in VENDOR_MEMORY:
        if vendor.get("pan_number") == data.get("pan_number"):
            return {"fraud_flag": True, "reason": "Duplicate PAN detected"}

    for emb in EMBEDDING_MEMORY:
        if compare_faces(emb["embedding"], new_embedding):
            return {"fraud_flag": True, "reason": "Duplicate face detected"}

    return {"fraud_flag": False, "reason": ""}


def risk_engine(data: Dict[str, Any]) -> Dict:
    prompt = f"""
    Evaluate vendor risk.

    Return JSON:
    {{
      "financial_risk": 0-1,
      "compliance_risk": 0-1,
      "overall_risk": 0-1,
      "reason": ""
    }}

    Data:
    {data}
    """

    res = llm.invoke(prompt)

    try:
        return json.loads(res.content)
    except:
        return {
            "financial_risk": 0.5,
            "compliance_risk": 0.5,
            "overall_risk": 0.5,
            "reason": "fallback"
        }


def compliance_check(data: Dict[str, Any]) -> Dict:
    issues = []

    if not data.get("pan_number"):
        issues.append("Missing PAN")

    if not data.get("aadhar_number"):
        issues.append("Missing Aadhaar")

    return {
        "compliant": len(issues) == 0,
        "issues": issues
    }

def onboarding_decision(kyc, face_match, fraud, risk, compliance) -> Dict:
    reasoning = []

    if kyc["status"] != "verified":
        return {"status": "rejected", "confidence": 0.3, "reasoning": ["KYC failed"]}

    reasoning.append("KYC verified")

    if fraud["fraud_flag"]:
        return {"status": "rejected", "confidence": 0.2, "reasoning": [fraud["reason"]]}

    if not face_match:
        return {"status": "manual_review", "confidence": 0.5, "reasoning": ["Face mismatch"]}

    reasoning.append("Face verified")

    if risk["overall_risk"] > 0.7:
        return {"status": "rejected", "confidence": 0.4, "reasoning": ["High risk"]}

    reasoning.append("Risk acceptable")

    if not compliance["compliant"]:
        return {"status": "manual_review", "confidence": 0.6, "reasoning": compliance["issues"]}

    reasoning.append("Compliance passed")

    confidence = (
        kyc["confidence"] * 0.3 +
        (1 if face_match else 0.5) * 0.2 +
        (1 - risk["overall_risk"]) * 0.3 +
        (1 if compliance["compliant"] else 0.5) * 0.2
    )

    return {
        "status": "approved",
        "confidence": round(confidence, 2),
        "reasoning": reasoning
    }

def run_onboarding_pipeline(input_data: Dict[str, Any]) -> Dict:

    text = extract_text_from_image(input_data["image_path"])

    structured = extract_structured_data(text)

    entity = resolve_vendor(structured)

    kyc = kyc_verification(
        structured,
        input_data["aadhar_number"],
        input_data["pan_number"]
    )

    embedding = generate_embedding(input_data["image_path"])

    face_match = True if embedding is not None else False

    fraud = fraud_check(structured, embedding)

    risk = risk_engine(structured)

    compliance = compliance_check(structured)

    decision = onboarding_decision(kyc, face_match, fraud, risk, compliance)

    if decision["status"] == "approved":
        VENDOR_MEMORY.append(structured)
        EMBEDDING_MEMORY.append({
            "pan": structured.get("pan_number"),
            "embedding": embedding
        })

    return {
        "structured_data": structured,
        "entity_status": entity,
        "kyc": kyc,
        "fraud": fraud,
        "risk": risk,
        "compliance": compliance,
        "decision": decision
    }

if __name__ == "__main__":

    input_data = {
        "image_path": "sample_vendor_doc.jpg",
        "aadhar_number": "123456789012",
        "pan_number": "ABCDE1234F"
    }

    result = run_onboarding_pipeline(input_data)

    print(json.dumps(result, indent=2))