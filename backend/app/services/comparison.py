import re
from typing import Dict, List, Optional
from rapidfuzz import fuzz

def normalize_text(text: str) -> str:
    """Normalizes whitespace and standard punctuation for fair phonetic/token comparison."""
    if not text:
        return ""
    cleaned = re.sub(r'[^\w\s]', ' ', text, flags=re.UNICODE)
    return " ".join(cleaned.split()).lower()

def detect_number_mismatch(text1: str, text2: str) -> bool:
    """Detects if one engine transcribed numbers/amounts that the other missed or got different."""
    nums1 = set(re.findall(r'\b\d+\b', text1))
    nums2 = set(re.findall(r'\b\d+\b', text2))
    return nums1 != nums2

def detect_hallucinatory_repetitions(text: str) -> bool:
    """Detects repeated tokens (common ASR hallucination loops)."""
    words = text.lower().split()
    if len(words) < 4:
        return False
    for i in range(len(words) - 2):
        if words[i] == words[i+1] == words[i+2]:
            return True
    return False

def compare_engine_segments(
    engine1_text: str,
    engine2_text: str,
    acoustic_confidence: float = 0.95
) -> Dict:
    """
    Performs cross-engine transcript alignment and comparison.
    Returns:
      - comparison_score (0.0 - 1.0)
      - is_flagged (bool)
      - review_status ('review_suggested' or 'unverified')
      - flag_reason (str or None)
    """
    s1 = (engine1_text or "").strip()
    s2 = (engine2_text or "").strip()

    if not s1 and not s2:
        return {
            "comparison_score": 1.0,
            "is_flagged": False,
            "review_status": "unverified",
            "flag_reason": None
        }

    if not s1 or not s2:
        return {
            "comparison_score": 0.0,
            "is_flagged": True,
            "review_status": "review_suggested",
            "flag_reason": "Single Engine Dropout: One engine failed to transcribe this segment."
        }

    norm1 = normalize_text(s1)
    norm2 = normalize_text(s2)

    # Calculate RapidFuzz token and string ratio
    lev_ratio = fuzz.ratio(norm1, norm2) / 100.0
    token_ratio = fuzz.token_sort_ratio(norm1, norm2) / 100.0
    similarity = max(lev_ratio, (lev_ratio * 0.4 + token_ratio * 0.6))

    # Evaluate warning patterns
    has_num_mismatch = detect_number_mismatch(s1, s2)
    has_repetition = detect_hallucinatory_repetitions(s1) or detect_hallucinatory_repetitions(s2)
    low_confidence = acoustic_confidence < 0.78

    is_flagged = False
    flag_reasons = []

    if similarity < 0.82:
        is_flagged = True
        flag_reasons.append(f"Engine Disagreement ({int(similarity * 100)}% match): Engine 1 and Engine 2 produced divergent text.")
    
    if has_num_mismatch:
        is_flagged = True
        flag_reasons.append("Numerical Mismatch: Discrepancy in digits or transaction figures.")

    if has_repetition:
        is_flagged = True
        flag_reasons.append("Suspicious Repetition: Potential ASR hallucination loop detected.")

    if low_confidence:
        is_flagged = True
        flag_reasons.append(f"Acoustic Ambiguity: Acoustic confidence is low ({int(acoustic_confidence * 100)}%).")

    review_status = "review_suggested" if is_flagged else "unverified"
    flag_reason_str = " | ".join(flag_reasons) if flag_reasons else None

    return {
        "comparison_score": round(similarity, 3),
        "is_flagged": is_flagged,
        "review_status": review_status,
        "flag_reason": flag_reason_str
    }
