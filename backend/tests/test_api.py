from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.models import Campaign, Session as DBSession

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "D&D Audio Manager API is running (Modular)"}

def test_create_campaign_mutation():
    mutation = """
    mutation {
        create_campaign(name: "Test Campaign", description: "A test description") {
            id
            name
            description
        }
    }
    """
    response = client.post("/graphql", json={"query": mutation})
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["create_campaign"]["name"] == "Test Campaign"
    assert data["data"]["create_campaign"]["description"] == "A test description"

def test_get_campaigns_query():
    # Ensure previously created campaign exists
    query = """
    query {
        campaigns {
            id
            name
        }
    }
    """
    response = client.post("/graphql", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    campaigns = data["data"]["campaigns"]
    assert len(campaigns) > 0
    assert any(c["name"] == "Test Campaign" for c in campaigns)
