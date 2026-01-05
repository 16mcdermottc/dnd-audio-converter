from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlmodel import SQLModel, create_engine, Session as DBSession, select
from .models import Session, Transcript, Persona, Moment, Campaign, Highlight, Quote, PersonaRead
from sqlalchemy.orm import selectinload
import os
import aiofiles
from typing import List

# Database Setup
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with DBSession(engine) as session:
        yield session

app = FastAPI(title="D&D Campaign Audio Manager")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "D&D Audio Manager API is running"}

from pydantic import BaseModel

class TextImportRequest(BaseModel):
    name: str
    content: str
    campaign_id: int

from .pipeline import process_session_pipeline, process_text_session_pipeline

@app.post("/import_session_text/")
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
            
        import json
        saved_paths = [file_path]
        
        # Create DB Entry
        new_session = Session(
            name=request.name,
            campaign_id=request.campaign_id,
            audio_file_paths=json.dumps(saved_paths), # Reusing this field
            status="uploaded"
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger TEXT Pipeline
        background_tasks.add_task(process_text_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": "uploaded"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_session/")
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
            
        import json
        # Create DB Entry
        new_session = Session(
            name=name,
            campaign_id=campaign_id,
            audio_file_paths=json.dumps(saved_paths),
            status="uploaded"
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger AI Pipeline in background
        print(f"Triggering background task for session {new_session.id}", flush=True)
        background_tasks.add_task(process_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": "uploaded", "file_count": len(saved_paths)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LocalSessionRequest(BaseModel):
    name: str
    campaign_id: int
    file_paths: List[str]

class MergePersonaRequest(BaseModel):
    target_persona_id: int
    source_persona_id: int

@app.post("/import_local_session/")
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
        import json
        # Create DB Entry
        new_session = Session(
            name=request.name,
            campaign_id=request.campaign_id,
            audio_file_paths=json.dumps(valid_paths),
            status="uploaded" # Ready for processing
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Trigger AI Pipeline in background
        print(f"Triggering background task for local session {new_session.id}", flush=True)
        background_tasks.add_task(process_session_pipeline, new_session.id, engine)
        
        return {"session_id": new_session.id, "status": "uploaded", "file_count": len(valid_paths)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... (Previous code)

# --- Campaign APIs ---

@app.post("/campaigns/", response_model=Campaign)
def create_campaign(campaign: Campaign, db: DBSession = Depends(get_session)):
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@app.get("/campaigns/", response_model=List[Campaign])
def list_campaigns(db: DBSession = Depends(get_session)):
    return db.exec(select(Campaign)).all()

@app.get("/campaigns/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: int, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@app.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"ok": True}

from .pipeline import generate_campaign_summary_pipeline

@app.post("/campaigns/{campaign_id}/generate_summary")
def generate_campaign_summary(campaign_id: int, background_tasks: BackgroundTasks, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    background_tasks.add_task(generate_campaign_summary_pipeline, campaign_id, engine)
    return {"message": "Campaign summary generation started"}

# --- Session APIs (Updated) ---

@app.get("/sessions/", response_model=List[Session])
def list_sessions(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Session)
    if campaign_id:
        query = query.where(Session.campaign_id == campaign_id)
    return db.exec(query.order_by(Session.created_at.desc())).all()

# ... (upload and import_text need updating too, doing that separately for cleanliness)


@app.get("/sessions/{session_id}", response_model=Session)
def get_session_details(session_id: int, db: DBSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_session)):
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}

# --- Persona APIs ---

@app.get("/personas/", response_model=List[Persona])
def list_personas(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Persona)
    if campaign_id:
        query = query.where(Persona.campaign_id == campaign_id)
    return db.exec(query).all()

@app.get("/personas/{persona_id}", response_model=PersonaRead)
def get_persona(persona_id: int, db: DBSession = Depends(get_session)):
    statement = select(Persona).where(Persona.id == persona_id).options(
        selectinload(Persona.highlights_list),
        selectinload(Persona.quotes_list)
    )
    persona = db.exec(statement).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona

@app.post("/personas/", response_model=PersonaRead)
def create_persona(persona: Persona, db: DBSession = Depends(get_session)):
    # Basic CRUD for manual overrides
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona

@app.put("/personas/{persona_id}", response_model=PersonaRead)
def update_persona(persona_id: int, persona_update: Persona, db: DBSession = Depends(get_session)):
    db_persona = db.get(Persona, persona_id)
    if not db_persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Update fields
    db_persona.name = persona_update.name
    db_persona.role = persona_update.role
    db_persona.description = persona_update.description
    db_persona.voice_description = persona_update.voice_description
    db_persona.summary = persona_update.summary
    
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

@app.delete("/personas/{persona_id}")
def delete_persona(persona_id: int, db: DBSession = Depends(get_session)):
    persona = db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    db.delete(persona)
    db.commit()
    return {"ok": True}

@app.post("/personas/merge", response_model=Persona)
def merge_personas(request: MergePersonaRequest, db: DBSession = Depends(get_session)):
    target = db.get(Persona, request.target_persona_id)
    source = db.get(Persona, request.source_persona_id)

    if not target or not source:
        raise HTTPException(status_code=404, detail="One or both personas not found")
    
    # 1. Reassign Highlights
    source_highlights = db.exec(select(Highlight).where(Highlight.persona_id == source.id)).all()
    for hl in source_highlights:
        hl.persona_id = target.id
        db.add(hl)

    # 2. Reassign Quotes
    source_quotes = db.exec(select(Quote).where(Quote.persona_id == source.id)).all()
    for qt in source_quotes:
        qt.persona_id = target.id
        db.add(qt)

    # 3. Merge legacy string fields (just in case they still exist/matter)
    def append_text(orig, new):
        if not new or new == "None": return orig
        if not orig: return new
        return f"{orig}\n{new}"

    target.highlights = append_text(target.highlights, source.highlights)
    target.low_points = append_text(target.low_points, source.low_points)
    target.memorable_quotes = append_text(target.memorable_quotes, source.memorable_quotes)
    
    # Merge summary
    if source.summary and source.summary not in (target.summary or ""):
         target.summary = append_text(target.summary, f"[Merged from {source.name}] {source.summary}")
    
    # Merge voice description if target is empty
    if not target.voice_description and source.voice_description:
        target.voice_description = source.voice_description

    db.add(target)
    db.delete(source)
    db.commit()
    db.refresh(target)
    # Re-fetch to display all new relations
    db.refresh(target) 
    return target

# --- Highlight & Quote APIs ---

@app.put("/highlights/{id}", response_model=Highlight)
def update_highlight(id: int, hl_data: Highlight, db: DBSession = Depends(get_session)):
    hl = db.get(Highlight, id)
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    hl.text = hl_data.text
    hl.persona_id = hl_data.persona_id
    hl.type = hl_data.type
    
    db.add(hl)
    db.commit()
    db.refresh(hl)
    return hl

@app.delete("/highlights/{id}")
def delete_highlight(id: int, db: DBSession = Depends(get_session)):
    hl = db.get(Highlight, id)
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    db.delete(hl)
    db.commit()
    return {"ok": True}

@app.put("/quotes/{id}", response_model=Quote)
def update_quote(id: int, qt_data: Quote, db: DBSession = Depends(get_session)):
    qt = db.get(Quote, id)
    if not qt:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    qt.text = qt_data.text
    qt.persona_id = qt_data.persona_id
    qt.speaker_name = qt_data.speaker_name
    
    db.add(qt)
    db.commit()
    db.refresh(qt)
    return qt

@app.delete("/quotes/{id}")
def delete_quote(id: int, db: DBSession = Depends(get_session)):
    qt = db.get(Quote, id)
    if not qt:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(qt)
    db.commit()
    return {"ok": True}

# --- Moment APIs ---

@app.get("/moments/", response_model=List[Moment])
def list_moments(db: DBSession = Depends(get_session)):
    return db.exec(select(Moment)).all()

if __name__ == "__main__":
    import uvicorn
    # Increase timeouts for large file uploads
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        timeout_keep_alive=300, # 5 minutes
        limit_concurrency=100
    )


