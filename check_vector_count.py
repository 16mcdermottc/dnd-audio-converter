
from sqlmodel import Session, select, func
import sys
import os
sys.path.append(os.getcwd())
from backend.app.core.database import engine
from backend.app.models.models import VectorStore

def check_progress():
    with Session(engine) as db:
        count = db.exec(select(func.count(VectorStore.id))).one()
        print(f"VectorStore currently has {count} entries.")

if __name__ == "__main__":
    check_progress()
