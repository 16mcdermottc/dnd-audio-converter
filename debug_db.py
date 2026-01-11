
import sys
import os
from sqlmodel import Session, select
sys.path.append(os.getcwd())

from backend.app.core.database import engine
from backend.app.models.models import Campaign

def list_campaigns():
    with Session(engine) as db:
        campaigns = db.exec(select(Campaign)).all()
        print(f"Found {len(campaigns)} campaigns:")
        for c in campaigns:
            print(f"ID: {c.id}, Name: {c.name}")

if __name__ == "__main__":
    list_campaigns()
