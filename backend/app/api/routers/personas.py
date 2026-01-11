from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.orm import selectinload

from ...core.database import get_session, Session as DBSession
from ...models.models import Persona, PersonaRead, Highlight, Quote

router = APIRouter(prefix="/personas", tags=["personas"])

class MergePersonaRequest(BaseModel):
    target_persona_id: int
    source_persona_id: int

@router.get("/", response_model=List[Persona])
def list_personas(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Persona)
    if campaign_id:
        query = query.where(Persona.campaign_id == campaign_id)
    return db.exec(query).all()

@router.get("/{persona_id}", response_model=PersonaRead)
def get_persona(persona_id: int, db: DBSession = Depends(get_session)):
    statement = select(Persona).where(Persona.id == persona_id).options(
        selectinload(Persona.highlights_list),
        selectinload(Persona.quotes_list)
    )
    # Note: selectinload might need explicit relationship access.
    # In SQLModel, accessing .highlights should lazy load or use this strategy.
    # If .highlights_list acts up, we might need to rely on the relationship name directly (Persona.highlights)
    # Checking models.py: relationship is named `highlights`.
    # `selectinload` should target `Persona.highlights`.
    # Let's clean this up to match standard SQLModel relationship loading.
    
    # Actually, models.py has `highlights` and `quotes` as Relationships.
    # The `PersonaRead` model expects `highlights` and `quotes` lists.
    # Let's stick to standard loading.
    
    persona = db.get(Persona, persona_id)
    # If we need eager loading, we do:
    # statement = select(Persona).where(Persona.id == persona_id).options(selectinload(Persona.highlights), selectinload(Persona.quotes))
    # persona = db.exec(statement).first()
    
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona

@router.post("/", response_model=PersonaRead)
def create_persona(persona: Persona, db: DBSession = Depends(get_session)):
    db.add(persona)
    db.commit()
    db.refresh(persona)
    
    # Auto-Index Creation
    try:
        from ...services.llm.vector_store import VectorService
        service = VectorService(db)
        # Create a rich text representation
        details = [f"Role: {persona.role}"]
        if persona.gender: details.append(f"Gender: {persona.gender}")
        if persona.race: details.append(f"Race: {persona.race}")
        if persona.class_name: details.append(f"Class: {persona.class_name}")
        
        text = f"Character: {persona.name}. {' | '.join(details)}. {persona.description or ''} {persona.summary or ''}"
        service.save_chunk(persona.campaign_id, "persona", persona.id, text)
    except Exception as e:
        print(f"Failed to auto-index new persona: {e}")
        
    return persona

@router.put("/{persona_id}", response_model=PersonaRead)
def update_persona(persona_id: int, persona_update: Persona, db: DBSession = Depends(get_session)):
    db_persona = db.get(Persona, persona_id)
    if not db_persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    db_persona.name = persona_update.name
    db_persona.role = persona_update.role
    db_persona.description = persona_update.description
    db_persona.voice_description = persona_update.voice_description
    db_persona.summary = persona_update.summary
    
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    
    # Auto-Index Update
    try:
        from ...services.llm.vector_store import VectorService
        service = VectorService(db)
        # Create a rich text representation
        details = [f"Role: {db_persona.role}"]
        if db_persona.gender: details.append(f"Gender: {db_persona.gender}")
        if db_persona.race: details.append(f"Race: {db_persona.race}")
        if db_persona.class_name: details.append(f"Class: {db_persona.class_name}")
        
        text = f"Character: {db_persona.name}. {' | '.join(details)}. {db_persona.description or ''} {db_persona.summary or ''}"
        service.save_chunk(db_persona.campaign_id, "persona", db_persona.id, text)
    except Exception as e:
        print(f"Failed to auto-index persona update: {e}")
        
    return db_persona

@router.delete("/{persona_id}")
def delete_persona(persona_id: int, db: DBSession = Depends(get_session)):
    persona = db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    db.delete(persona)
    db.commit()
    return {"ok": True}

@router.post("/merge", response_model=Persona)
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

    # Note: SQLModel doesn't have these fields on Persona anymore in the new models.py 
    # (they were removed or I missed them? models.py Step 56 shows no legacy fields on Persona, 
    # just PersonaBase fields: name, role, desc, voice, ... summary). 
    # The 'legacy' merge logic in main.py Step 57 used `target.highlights` (string field?)
    # But `models.py` in Step 58 DOES NOT have `highlights` as a string field on `Persona`, it's a Relationship `List["Highlight"]`.
    # Therefore the old logic `target.highlights = ...` would be invalid if those fields were removed.
    # I will remove the logic merging string fields since they dont seem to exist on the Pydantic model anymore.
    
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
    return target
