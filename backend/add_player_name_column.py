from sqlmodel import Session, create_engine, text
from backend.models import sqlite_url

engine = create_engine(sqlite_url)

def migrate():
    with Session(engine) as session:
        try:
            # Check if column exists strictly to avoid error, though sqlite allows adding duplicate column names sometimes or errors if exists depending on version
            # Easier to just try catch the specific error or just run it. 
            # SQLite doesn't support IF NOT EXISTS in ADD COLUMN standardly in all versions, but we can try.
            session.exec(text("ALTER TABLE persona ADD COLUMN player_name VARCHAR"))
            session.commit()
            print("Successfully added player_name column to persona table.")
        except Exception as e:
            print(f"Migration failed (might already exist): {e}")

if __name__ == "__main__":
    migrate()
