from fastapi import HTTPException, BackgroundTasks
from sqlmodel import Session as DBSession
import json

from ..models.models import Session
from ..models.enums import ProcessingStatus
from ..services.llm.generators import process_session_pipeline, process_text_session_pipeline
from ..core.database import engine

class SessionService:
    @staticmethod
    def regenerate_session(session_id: int, db: DBSession, background_tasks: BackgroundTasks) -> dict:
        session = db.get(Session, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Determine paths (check new relation first, then fallback)
        paths = []
        if session.audio_files:
             paths = [f.file_path for f in session.audio_files]
        elif session.audio_file_paths:
             try:
                 paths = json.loads(session.audio_file_paths)
             except:
                 paths = [session.audio_file_paths]

        session.status = ProcessingStatus.PROCESSING
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Logic for text vs audio pipeline
        # Naive check: if first file ends with .txt, assume text session
        if paths and paths[0].endswith(".txt"):
             background_tasks.add_task(process_text_session_pipeline, session.id, engine)
        else:
             background_tasks.add_task(process_session_pipeline, session.id, engine)

        return {"ok": True, "status": ProcessingStatus.PROCESSING}
