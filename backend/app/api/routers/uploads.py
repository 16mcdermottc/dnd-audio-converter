import os
import aiofiles
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from ...core.database import get_session, Session as DBSession, engine
from ...core.config import settings
from ...models.models import Session, Campaign
from ...services.llm.generators import process_session_pipeline, process_text_session_pipeline
from ...models.enums import ProcessingStatus

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

class TextImportRequest(BaseModel):
    name: str
    content: str
    campaign_id: int

class LocalSessionRequest(BaseModel):
    name: str
    campaign_id: int
    file_paths: List[str]

@router.post("/import_session_text/")
async def import_session_text(
    request: TextImportRequest,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_session)
):
    # Verify campaign exists
    if not db.get(Campaign, request.campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        # Save text content to a file 
        safe_filename = f"{request.name.replace(' ', '_')}.txt"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as out_file:
            await out_file.write(request.content)
            
        saved_paths = [file_path]
        
        # Create DB Entry
        new_session = Session(
            name=request.name,
            campaign_id=request.campaign_id,
            audio_file_paths=json.dumps(saved_paths), # Reusing this field
            status=ProcessingStatus.UPLOADED
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger TEXT Pipeline
        background_tasks.add_task(process_text_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": ProcessingStatus.UPLOADED}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload_session/")
async def upload_session(
    name: str, 
    campaign_id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...), 
    db: DBSession = Depends(get_session)
):
    # Verify campaign exists
    if not db.get(Campaign, campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        saved_paths = []
        for file in files:
            # Create a safe filename
            safe_filename = f"{name.replace(' ', '_')}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            # Write file to disk (Chunked copy to handle large files)
            async with aiofiles.open(file_path, 'wb') as out_file:
                while content := await file.read(1024 * 1024 * 10):  # 10MB chunks
                    await out_file.write(content)
            saved_paths.append(file_path)
            
        # Create DB Entry
        new_session = Session(
            name=name,
            campaign_id=campaign_id,
            audio_file_paths=json.dumps(saved_paths),
            status=ProcessingStatus.UPLOADED
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger AI Pipeline in background
        print(f"Triggering background task for session {new_session.id}", flush=True)
        background_tasks.add_task(process_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": ProcessingStatus.UPLOADED, "file_count": len(saved_paths)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import_local_session/")
async def import_local_session(
    request: LocalSessionRequest,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_session)
):
    # Verify campaign exists
    if not db.get(Campaign, request.campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Verify all files exist
    valid_paths = []
    for path in request.file_paths:
        clean_path = path.strip().strip('"').strip("'") # Remove potential quotes
        if not os.path.exists(clean_path):
            raise HTTPException(status_code=400, detail=f"File not found: {clean_path}")
        valid_paths.append(clean_path)

    try:
        # Create DB Entry
        new_session = Session(
            name=request.name,
            campaign_id=request.campaign_id,
            audio_file_paths=json.dumps(valid_paths),
            status=ProcessingStatus.UPLOADED # Ready for processing
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger AI Pipeline in background
        print(f"Triggering background task for local session {new_session.id}", flush=True)
        background_tasks.add_task(process_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": ProcessingStatus.UPLOADED, "file_count": len(valid_paths)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reupload_session/{session_id}")
async def reupload_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: DBSession = Depends(get_session)
):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        saved_paths = []
        for file in files:
            # Create a safe filename - prefix with session ID to differentiate reuploads if needed, 
            # or just keep similar logic but ensure uniqueness.
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            safe_filename = f"{session.name.replace(' ', '_')}_{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            # Write file to disk
            async with aiofiles.open(file_path, 'wb') as out_file:
                while content := await file.read(1024 * 1024 * 10):
                    await out_file.write(content)
            saved_paths.append(file_path)
            
        # Update Session
        session.audio_file_paths = json.dumps(saved_paths)
        session.status = ProcessingStatus.UPLOADED 
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Trigger Pipeline
        print(f"Triggering background task for reuploaded session {session.id}", flush=True)
        background_tasks.add_task(process_session_pipeline, session.id, engine)
        
        return {"session_id": session.id, "status": ProcessingStatus.PROCESSING, "file_count": len(saved_paths)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
