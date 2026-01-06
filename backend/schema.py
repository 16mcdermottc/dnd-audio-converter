from typing import List, Optional
import strawberry
from strawberry.schema.config import StrawberryConfig
from sqlmodel import select
from .models import Session as DBSession, Persona as DBPersona, Highlight as DBHighlight, Quote as DBQuote, Campaign as DBCampaign
from fastapi import Depends
from .main import get_session

@strawberry.type
class HighlightType:
    id: int
    text: str
    type: str # 'high' or 'low'
    session_id: int
    persona_id: Optional[int]

@strawberry.type
class QuoteType:
    id: int
    text: str
    speaker_name: Optional[str]
    session_id: int
    persona_id: Optional[int]

@strawberry.type
class PersonaType:
    id: int
    name: str
    role: str
    description: Optional[str]
    voice_description: Optional[str]
    summary: Optional[str] # Direct mapping to model field
    player_name: Optional[str]

    @strawberry.field
    def highlights(self, info) -> List[HighlightType]:
        db = info.context["db"]
        return db.exec(select(DBHighlight).where(DBHighlight.persona_id == self.id)).all()

    @strawberry.field
    def quotes(self, info) -> List[QuoteType]:
        db = info.context["db"]
        return db.exec(select(DBQuote).where(DBQuote.persona_id == self.id)).all()

@strawberry.type
class SessionType:
    id: int
    name: str
    status: str
    summary: Optional[str]
    created_at: str

    @strawberry.field
    def highlights(self, info) -> List[HighlightType]:
        db = info.context["db"]
        return db.exec(select(DBHighlight).where(DBHighlight.session_id == self.id)).all()

    @strawberry.field
    def quotes(self, info) -> List[QuoteType]:
        db = info.context["db"]
        # Return ALL quotes for this session, regardless of persona assignment
        return db.exec(select(DBQuote).where(DBQuote.session_id == self.id)).all()

    @strawberry.field
    def personas(self, info) -> List[PersonaType]:
        # Personas that appeared in this session (optimized query might differ but this works)
        db = info.context["db"]
        # Simplified: all personas in campaign (or we could track per session participation later)
        # For now, let's return all personas in the campaign to be safe, 
        # or filtered if we had a many-to-many link.
        # Since DB structure links Persona -> Campaign mainy.
        # We can try to infer from highlights/quotes?
        # Let's just return campaign personas for now to avoid complexity.
        session = db.get(DBSession, self.id)
        return db.exec(select(DBPersona).where(DBPersona.campaign_id == session.campaign_id)).all()

@strawberry.type
class CampaignType:
    id: int
    name: str
    description: Optional[str]
    summary: Optional[str]
    
    @strawberry.field
    def sessions(self, info) -> List[SessionType]:
        db = info.context["db"]
        return db.exec(select(DBSession).where(DBSession.campaign_id == self.id).order_by(DBSession.created_at.desc())).all()

    @strawberry.field
    def personas(self, info) -> List[PersonaType]:
        db = info.context["db"]
        return db.exec(select(DBPersona).where(DBPersona.campaign_id == self.id)).all()

@strawberry.type
class Query:
    @strawberry.field
    def campaigns(self, info) -> List[CampaignType]:
        db = info.context["db"]
        return db.exec(select(DBCampaign)).all()

    @strawberry.field
    def campaign(self, info, id: int) -> Optional[CampaignType]:
        db = info.context["db"]
        return db.get(DBCampaign, id)
    
    @strawberry.field
    def session(self, info, id: int) -> Optional[SessionType]:
        db = info.context["db"]
        return db.get(DBSession, id)

    @strawberry.field
    def persona(self, info, id: int) -> Optional[PersonaType]:
        db = info.context["db"]
        return db.get(DBPersona, id)

schema = strawberry.Schema(
    query=Query,
    config=StrawberryConfig(auto_camel_case=False)
)
