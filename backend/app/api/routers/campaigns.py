from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from sqlmodel import select

from ...core.database import get_session, Session as DBSession, engine
from ...models.models import Campaign
from ...services.llm.generators import generate_campaign_summary_pipeline

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/", response_model=Campaign)
def create_campaign(campaign: Campaign, db: DBSession = Depends(get_session)):
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/", response_model=List[Campaign])
def list_campaigns(db: DBSession = Depends(get_session)):
    return db.exec(select(Campaign)).all()

@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: int, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"ok": True}

@router.post("/{campaign_id}/generate_summary")
def generate_campaign_summary(campaign_id: int, background_tasks: BackgroundTasks, db: DBSession = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    background_tasks.add_task(generate_campaign_summary_pipeline, campaign_id, engine)
    return {"message": "Campaign summary generation started"}

