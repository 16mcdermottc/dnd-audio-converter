from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlmodel import select

from ...core.database import get_session, Session as DBSession
from ...models.models import Highlight, Quote, Moment, Persona

router = APIRouter(tags=["highlights_quotes_moments"])

# --- Highlight & Quote APIs ---

@router.put("/highlights/{id}", response_model=Highlight)
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

@router.delete("/highlights/{id}")
def delete_highlight(id: int, db: DBSession = Depends(get_session)):
    hl = db.get(Highlight, id)
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    db.delete(hl)
    db.commit()
    return {"ok": True}

@router.put("/quotes/{id}", response_model=Quote)
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

@router.delete("/quotes/{id}")
def delete_quote(id: int, db: DBSession = Depends(get_session)):
    qt = db.get(Quote, id)
    if not qt:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(qt)
    db.commit()
    return {"ok": True}

# --- Moment APIs ---

@router.get("/highlights/", response_model=List[Highlight])
def list_highlights(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Highlight)
    if campaign_id:
        query = query.where(Highlight.campaign_id == campaign_id)
    highlights = db.exec(query).all()
    
    # Backfill name from Persona if missing (for display)
    # Note: This modifies the objects in memory before serialization
    for h in highlights:
        if not h.name and h.persona_id:
             # Accessing property might trigger lazy load
             # Simple fallback lookup
             p = db.get(Persona, h.persona_id)
             if p:
                 h.name = p.name
                 
    return highlights

@router.get("/quotes/", response_model=List[Quote])
def list_quotes(campaign_id: int = None, db: DBSession = Depends(get_session)):
    query = select(Quote)
    if campaign_id:
        query = query.where(Quote.campaign_id == campaign_id)
    return db.exec(query).all()
