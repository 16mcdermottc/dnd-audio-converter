
import sys
import os
import requests

# Add the current directory to sys.path
sys.path.append(os.getcwd())

def trigger_indexing(campaign_id=4):
    url = f"http://127.0.0.1:8000/api/chat/index/{campaign_id}"
    print(f"Triggering indexing for Campaign {campaign_id}...")
    try:
        response = requests.post(url)
        if response.status_code == 200:
            print("Indexing started successfully!")
            print(response.json())
        else:
            print(f"Failed to start indexing: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    trigger_indexing()
