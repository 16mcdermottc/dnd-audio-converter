from google import genai
from ...core.config import settings

def get_client():
    if settings.GEMINI_API_KEY:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    print("WARNING: GEMINI_API_KEY not found in .env")
    return None

client = get_client()
