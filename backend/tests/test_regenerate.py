import sys
import os
# Add project root to path (h:\workspace\dnd-audio-converter)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.app.main import app
from backend.app.models.models import Session, Campaign
import json

client = TestClient(app)

def test_regenerate_session_endpoint():
    # 1. Setup Data
    # We need a session in the DB. 
    # Since we use a real DB dependency override in tests usually, or rely on the app using a test DB.
    # The existing `test_api.py` assumes a running DB or implicit setup.
    # Let's see if we can mock the DB or if we should rely on the `client` functionality with a fixture.
    # Given the previous `test_api.py` didn't show explicit fixture usage, it might be running against a dev DB or in-memory sqlite is default?
    # Actually `test_api.py` just ran queries.
    # Let's try to mock the DB session logic or just create a campaign/session via API first.

    # Create Campaign
    create_campaign_query = """
    mutation {
        create_campaign(name: "Regen Test Campaign", description: "Test") {
            id
        }
    }
    """
    res = client.post("/graphql", json={"query": create_campaign_query})
    assert res.status_code == 200
    campaign_id = res.json()["data"]["create_campaign"]["id"]

    # Create Session manually via SQLModel (harder without direct DB access in test) 
    # or via `upload_session` endpoint.
    # Let's use `import_session_text` as it's easier (no file upload mocking needed for creation).
    res = client.post("/import_session_text/", json={
        "name": "Regen Session",
        "content": "Test Content",
        "campaign_id": campaign_id
    })
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # 2. Test Regenerate
    # We want to mock the background task to ensure it's called, avoiding actual Gemini calls.
    with patch("backend.app.services.session_service.process_text_session_pipeline") as mock_pipeline:
        res = client.post(f"/sessions/{session_id}/regenerate")
        assert res.status_code == 200
        assert res.json()["status"] == "processing"
        
        # Verify background task was added
        mock_pipeline.assert_called_once()
        # Check args: session_id should be passed
        args, _ = mock_pipeline.call_args
        assert args[0] == session_id

def test_reupload_session_endpoint():
    # 1. Setup Campaign
    create_campaign_query = """
    mutation {
        create_campaign(name: "Reupload Test Campaign", description: "Test") {
            id
        }
    }
    """
    res = client.post("/graphql", json={"query": create_campaign_query})
    campaign_id = res.json()["data"]["create_campaign"]["id"]

    # 2. Create Initial Session
    res = client.post("/import_session_text/", json={
        "name": "Reupload Session",
        "content": "Initial Content",
        "campaign_id": campaign_id
    })
    session_id = res.json()["session_id"]

    # 3. Test Reupload
    with patch("backend.app.api.routers.uploads.process_session_pipeline") as mock_pipeline:
        # Prepare dummy file
        files = [('files', ('new_audio.mp3', b'dummy audio content', 'audio/mpeg'))]
        
        res = client.post(f"/reupload_session/{session_id}", files=files)
        assert res.status_code == 200
        assert res.json()["status"] == "processing"
        
        # Verify pipeline called
        mock_pipeline.assert_called_once()
