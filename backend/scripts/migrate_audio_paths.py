import sys
import os
import json
from sqlmodel import Session, select

# Add backend to sys.path to allow imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.app.core.database import engine
from sqlmodel import SQLModel, Field, Relationship, Session as DBSession
from typing import Optional, List

# Define local models to bypass Enum validation issues during migration
class SessionLocal(SQLModel, table=True):
    __tablename__ = "session"
    id: Optional[int] = Field(default=None, primary_key=True)
    audio_file_paths: Optional[str] = Field(default=None) 
    status: str = Field(default="pending")

class SessionAudioFile(SQLModel, table=True):
    __tablename__ = "sessionaudiofile" # Explicitly match if needed, though default might be snake_case
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    file_path: str

def migrate_audio_paths():
    print("Starting migration of audio file paths...")
    # Ensure new table exists
    SQLModel.metadata.create_all(engine)
    
    with DBSession(engine) as db:
        sessions = db.exec(select(SessionLocal)).all()
        
        migrated_count = 0
        for session in sessions:
            if not session.audio_file_paths:
                continue
                
            try:
                paths = json.loads(session.audio_file_paths)
            except:
                # Handle potential single string legacy
                paths = [session.audio_file_paths]
            
            if not isinstance(paths, list):
                paths = [paths]
                
            print(f"Session {session.id}: Found {len(paths)} paths.")
            
            # Check if already migrated to avoid duplicates if run multiple times
            existing_files = db.exec(select(SessionAudioFile).where(SessionAudioFile.session_id == session.id)).all()
            if existing_files:
                print(f"Skipping Session {session.id}, already has {len(existing_files)} files linked.")
                continue

            for p in paths:
                new_file = SessionAudioFile(session_id=session.id, file_path=p)
                db.add(new_file)
            
            migrated_count += 1
        
        db.commit()
        print(f"Migration completed. Migrated {migrated_count} sessions.")

if __name__ == "__main__":
    migrate_audio_paths()
