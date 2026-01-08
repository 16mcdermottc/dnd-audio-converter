from sqlmodel import create_engine, text
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def add_column():
    print("Adding error_message column...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE session ADD COLUMN error_message TEXT"))
            conn.commit() # Important for some drivers/configs
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column (maybe exists?): {e}")

if __name__ == "__main__":
    add_column()
