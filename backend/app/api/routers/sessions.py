from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from sqlmodel import select

from ...core.database import get_session, Session as DBSession, engine
from ...models.models import Session
from ...models.enums import ProcessingStatus
from ...services.llm.generators import process_session_pipeline, process_text_session_pipeline
import json

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.get("/", response_model=List[Session])
def list_sessions(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Session)
    if campaign_id:
        query = query.where(Session.campaign_id == campaign_id)
    return db.exec(query.order_by(Session.created_at.desc())).all()

@router.get("/{session_id}", response_model=Session)
def get_session_details(session_id: int, db: DBSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}

from ...services.session_service import SessionService

@router.post("/{session_id}/regenerate")
def regenerate_session(
    session_id: int, 
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_session)
):
    return SessionService.regenerate_session(session_id, db, background_tasks)

@router.post("/", response_model=Session)
def create_session(session: Session, db: DBSession = Depends(get_session)):
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.put("/{session_id}", response_model=Session)
def update_session(session_id: int, session_data: Session, db: DBSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.name = session_data.name
    session.status = session_data.status
    # Add other fields as needed
    
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
