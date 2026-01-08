from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from ...core.database import get_session
from ...models.models import Moment

router = APIRouter(
    prefix="/moments",
    tags=["moments"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Moment])
def list_moments(
    campaign_id: Optional[int] = None, 
    session_id: Optional[int] = None,
    db: Session = Depends(get_session)
):
    query = select(Moment)
    if campaign_id:
        # Join session to filter by campaign
        # Assuming Moment -> Session -> Campaign
        pass # TODO: Check if Moment has direct campaign link or via session.
        # Moment has session_id. Session has campaign_id.
        from ...models.models import Session as DBSessionModel
        query = query.join(DBSessionModel).where(DBSessionModel.campaign_id == campaign_id)
        
    if session_id:
        query = query.where(Moment.session_id == session_id)
        
    return db.exec(query).all()

@router.get("/{moment_id}", response_model=Moment)
def get_moment(moment_id: int, db: Session = Depends(get_session)):
    moment = db.get(Moment, moment_id)
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    return moment

@router.put("/{moment_id}", response_model=Moment)
def update_moment(moment_id: int, moment_data: Moment, db: Session = Depends(get_session)):
    moment = db.get(Moment, moment_id)
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    
    moment.title = moment_data.title
    moment.description = moment_data.description
    moment.type = moment_data.type
    
    db.add(moment)
    db.commit()
    db.refresh(moment)
    return moment

@router.delete("/{moment_id}")
def delete_moment(moment_id: int, db: Session = Depends(get_session)):
    moment = db.get(Moment, moment_id)
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    db.delete(moment)
    db.commit()
    return {"ok": True}
