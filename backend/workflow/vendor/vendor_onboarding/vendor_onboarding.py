import os
import json
import numpy as np
import cv2
import pytesseract
from mediapipe import solutions as mp

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

def capture_video(output_path: str = "captured_face.jpg"):
    """Capture live video and save face image when user presses Space"""
    try:
        cam = cv2.VideoCapture(0)
        if not cam.isOpened():
            print("Error: Cannot access camera")
            return None
            
        while True:
            ret, frame = cam.read()
            if not ret:
                print("Failed to grab frame")
                break
            cv2.imshow("Press Space to Capture", frame)
            k = cv2.waitKey(1)
            if k % 256 == 32:  # Space key
                cv2.imwrite(output_path, frame)
                print(f"Face image captured and saved at {output_path}")
                cam.release()
                cv2.destroyAllWindows()
                return output_path
        
        cam.release()
        cv2.destroyAllWindows()
        return None
    except Exception as e:
        print(f"Video capture error: {e}")
        return None

def extract_face_from_image(image_path: str):
    """Extract face from ID document image using MediaPipe"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            print("Error: Cannot read image")
            return None
            
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        face_detection = mp.face_detection.FaceDetection()
        result = face_detection.process(rgb_img)
        
        if result.detections:
            detection = result.detections[0]
            bbox = detection.location_data.bounding_box
            h, w = img.shape[:2]
            
            x = int(bbox.xmin * w)
            y = int(bbox.ymin * h)
            width = int(bbox.width * w)
            height = int(bbox.height * h)
            
            face_crop = img[max(0, y):min(h, y + height), max(0, x):min(w, x + width)]
            return face_crop
        else:
            print("No face detected in ID document")
            return None
    except Exception as e:
        print(f"Face extraction error: {e}")
        return None

def generate_embedding(image_or_path) -> np.ndarray:
    """Generate face embedding from image (can be file path or numpy array)"""
    try:
        if isinstance(image_or_path, str):
            img = cv2.imread(image_or_path)
        else:
            img = image_or_path
            
        if img is None:
            print("Error: Cannot read image for embedding")
            return None
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (64, 64))  
        flattened = resized.flatten().astype("float32")
        
        # Normalize the embedding
        norm = np.linalg.norm(flattened)
        if norm > 0:
            normalized = flattened / norm
        else:
            normalized = flattened
            
        return normalized
    except Exception as e:
        print(f"Embedding generation error: {e}")
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
    
    print("=" * 60)
    print("STARTING VENDOR ONBOARDING PIPELINE")
    print("=" * 60)
    
    # Step 1-3: Image input -> OCR -> LLM extraction
    print("\n[1] Extracting text from ID document (OCR)...")
    text = extract_text_from_image(input_data["image_path"])
    
    print("[2] Extracting structured data via LLM...")
    structured = extract_structured_data(text)
    
    print("[3] Resolving vendor entity...")
    entity = resolve_vendor(structured)

    # Step 4: KYC verification
    print("[4] KYC verification - Number verification...")
    kyc = kyc_verification(
        structured,
        input_data["aadhar_number"],
        input_data["pan_number"]
    )
    
    if kyc["status"] != "verified":
        print(f"  ❌ KYC verification failed: {kyc}")
        return {
            "structured_data": structured,
            "entity_status": entity,
            "kyc": kyc,
            "decision": {
                "status": "rejected",
                "confidence": 0.1,
                "reasoning": ["KYC verification failed at initial stage"]
            }
        }
    
    print(f"  ✓ KYC verified with confidence: {kyc['confidence']}")

    # Step 5: Live video capture
    print("[5] Initiating live video capture...")
    captured_face_path = capture_video("captured_live_face.jpg")
    
    if captured_face_path is None:
        print("  ❌ Failed to capture live face")
        return {
            "structured_data": structured,
            "entity_status": entity,
            "kyc": kyc,
            "decision": {
                "status": "rejected",
                "confidence": 0.1,
                "reasoning": ["Failed to capture live face video"]
            }
        }
    
    print(f"  ✓ Live face captured: {captured_face_path}")

    # Step 6: Extract face from ID document
    print("[6] Extracting face from ID document...")
    id_face = extract_face_from_image(input_data["image_path"])
    
    if id_face is None:
        print("  ⚠ Could not extract face from ID, using full document image")
        id_face_embedding = generate_embedding(input_data["image_path"])
    else:
        print("  ✓ Face extracted from ID document")
        id_face_embedding = generate_embedding(id_face)

    # Step 7: Generate embedding from captured live face
    print("[7] Generating embedding from captured live face...")
    captured_face_embedding = generate_embedding(captured_face_path)
    
    if captured_face_embedding is None:
        print("  ❌ Failed to generate embedding from captured face")
        face_match = False
    else:
        print("  ✓ Embedding generated from captured face")
        face_match = True

    # Step 8: Face comparison using cosine similarity
    print("[8] Comparing faces using cosine similarity...")
    if face_match and id_face_embedding is not None:
        similarity = cosine_similarity(id_face_embedding, captured_face_embedding)
        face_match = compare_faces(id_face_embedding, captured_face_embedding, threshold=0.85)
        print(f"  Cosine similarity score: {similarity:.4f}")
        if face_match:
            print(f"  ✓ Face match verified (simulation)")
        else:
            print(f"  ❌ Face mismatch detected")
    else:
        print("  ⚠ Cannot perform face comparison")
        face_match = False

    # Step 9: Fraud check
    print("[9] Running fraud detection...")
    fraud = fraud_check(structured, captured_face_embedding)
    if fraud["fraud_flag"]:
        print(f"  ⚠ Fraud flag raised: {fraud['reason']}")
    else:
        print(f"  ✓ No fraud detected")

    # Step 10: Risk engine
    print("[10] Running risk assessment engine...")
    risk = risk_engine(structured)
    print(f"  Overall risk score: {risk.get('overall_risk', 'N/A')}")

    # Step 11: Compliance check
    print("[11] Running compliance check...")
    compliance = compliance_check(structured)
    if compliance["compliant"]:
        print(f"  ✓ Compliance passed")
    else:
        print(f"  ⚠ Compliance issues: {compliance['issues']}")

    # Step 12: Onboarding decision
    print("[12] Making final onboarding decision...")
    decision = onboarding_decision(kyc, face_match, fraud, risk, compliance)
    
    print(f"\n  DECISION: {decision['status'].upper()}")
    print(f"  Confidence: {decision['confidence']}")
    print(f"  Reasoning: {decision['reasoning']}")

    # Store approved vendor
    if decision["status"] == "approved":
        print("\n[13] Storing vendor and embedding data...")
        VENDOR_MEMORY.append(structured)
        EMBEDDING_MEMORY.append({
            "pan": structured.get("pan_number"),
            "embedding": captured_face_embedding
        })
        print("  ✓ Vendor onboarded successfully")

    print("\n" + "=" * 60)
    print("ONBOARDING PIPELINE COMPLETED")
    print("=" * 60 + "\n")

    return {
        "structured_data": structured,
        "entity_status": entity,
        "kyc": kyc,
        "face_images": {
            "id_document_path": input_data["image_path"],
            "captured_face_path": captured_face_path
        },
        "face_comparison": {
            "similarity_score": cosine_similarity(id_face_embedding, captured_face_embedding) if face_match else None,
            "match": face_match
        },
        "fraud": fraud,
        "risk": risk,
        "compliance": compliance,
        "decision": decision
    }

if __name__ == "__main__":

    input_data = {
        "image_path": "sample_vendor_doc.jpg",
        "aadhar_number": "551563214154",
        "pan_number": "ABCDE1234F"
    }

    result = run_onboarding_pipeline(input_data)        

    print(json.dumps(result, indent=2))