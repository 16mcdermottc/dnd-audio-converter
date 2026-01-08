from sqlmodel import create_engine, text
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, status FROM session"))
    for row in result:
        print(f"ID: {row.id}, Status: '{row.status}'")
