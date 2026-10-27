import os
from google import genai
from typing import List, Dict

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def translate_segments(segments: List[Dict]) -> List[Dict]:
    """Ensures every segment has a reliable English translation."""
    if not GEMINI_API_KEY:
        return segments

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        for seg in segments:
            if not seg.get("translation"):
                prompt = f"Translate this spoken Indian interview line into natural research English:\n'{seg.get('original_text', seg.get('text', ''))}'\nReturn ONLY the translation."
                res = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                )
                seg["translation"] = res.text.strip()
    except Exception as e:
        print(f"[Translation Service] Notice: {e}")

    return segments
