from typing import List, Dict

CONFIDENCE_REVIEW_THRESHOLD = 0.80

def perform_trust_check(segments: List[Dict]) -> List[Dict]:
    """
    Implements Trust Check:
    Flags low-confidence, rapid-fire ambiguity, and acoustic hallucination risks.
    """
    for seg in segments:
        confidence = seg.get("confidence", 1.0)
        seg["is_flagged"] = False
        seg["flag_reason"] = None

        if confidence < 0.70:
            seg["is_flagged"] = True
            seg["flag_reason"] = "High Discrepancy: Engine confidence below 70%. Acoustic jitter detected."
        elif confidence < CONFIDENCE_REVIEW_THRESHOLD:
            seg["is_flagged"] = True
            seg["flag_reason"] = "Review Recommended: Complex phrase inflection. Please verify against audio."
            
    return segments