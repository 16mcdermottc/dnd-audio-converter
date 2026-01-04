from google import genai
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("No API Key found")
else:
    client = genai.Client(api_key=api_key)
    print("Listing available models...")
    for model in client.models.list():
        print(f"Model: {model.name}")
        print(f"  DisplayName: {model.display_name}")
        print("-" * 20)
