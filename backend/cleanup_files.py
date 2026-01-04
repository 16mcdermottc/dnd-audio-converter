import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load env vars
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_API_KEY:
    print("Error: GEMINI_API_KEY not found")
    exit(1)

client = genai.Client(api_key=GENAI_API_KEY)

def cleanup():
    print("Listing files on Gemini...")
    try:
        # The SDK returns an iterator
        files = list(client.files.list())
        print(f"Found {len(files)} files.")
        
        if not files:
            print("No files to delete.")
            return

        for f in files:
            print(f"Deleting {f.name}...", end=" ")
            try:
                client.files.delete(name=f.name)
                print("Deleted.")
            except Exception as e:
                print(f"Failed: {e}")
                
    except Exception as e:
        print(f"Error listing files: {e}")

if __name__ == "__main__":
    cleanup()
