from typing import List, Optional, Any
import json
import strawberry
from strawberry.schema.config import StrawberryConfig
from sqlmodel import select
from fastapi import BackgroundTasks

# Imports from new structure
from ..models.models import Session as DBSession, Persona as DBPersona, Highlight as DBHighlight, Quote as DBQuote, Campaign as DBCampaign, Moment as DBMoment
from ..services.llm.generators import generate_campaign_summary_pipeline, refine_session_summary
from ..core.database import engine

# Input Types
@strawberry.input
class PersonaInput:
    name: str
    role: str
    description: Optional[str] = None
    voice_description: Optional[str] = None
    player_name: Optional[str] = None
    campaign_id: Optional[int] = None # Optional for updates
    gender: Optional[str] = None
    race: Optional[str] = None
    class_name: Optional[str] = None
    level: Optional[int] = None
    status: Optional[str] = "Alive"
    faction: Optional[str] = None
    alignment: Optional[str] = None
    aliases: Optional[List[str]] = None

@strawberry.input
class HighlightInput:
    text: str
    type: str # 'high' or 'low'
    persona_id: Optional[int] = None

@strawberry.input
class QuoteInput:
    text: str
    speaker_name: Optional[str] = None
    persona_id: Optional[int] = None

# Output Types
@strawberry.type
class HighlightType:
    id: int
    text: str
    type: str # 'high' or 'low'
    session_id: int
    persona_id: Optional[int]
    name: Optional[str]

    session_id: int
    persona_id: Optional[int]

@strawberry.type
class MomentType:
    id: int
    title: str
    description: str
    timestamp: Optional[str]
    type: str
    session_id: int

    @strawberry.field
    def session_name(self, info) -> str:
        db = info.context["db"]
        session = db.get(DBSession, self.session_id)
        return session.name if session else "Unknown Session"

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
    summary: Optional[str]
    player_name: Optional[str]
    campaign_id: int
    gender: Optional[str]
    race: Optional[str]
    class_name: Optional[str]
    level: Optional[int]
    status: Optional[str]
    faction: Optional[str]
    alignment: Optional[str]
    
    @strawberry.field
    def aliases(self) -> List[str]:
        import json
        if not hasattr(self, 'aliases') or not self.aliases:
            return []
        try:
            return json.loads(self.aliases)
        except:
            return []

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
    campaign_id: int

    @strawberry.field
    def highlights(self, info) -> List[HighlightType]:
        db = info.context["db"]
        return db.exec(select(DBHighlight).where(DBHighlight.session_id == self.id)).all()

    @strawberry.field
    def quotes(self, info) -> List[QuoteType]:
        db = info.context["db"]
        return db.exec(select(DBQuote).where(DBQuote.session_id == self.id)).all()

    @strawberry.field
    def personas(self, info) -> List[PersonaType]:
        db = info.context["db"]
        session = db.get(DBSession, self.id)
        if not session: return []
        return db.exec(select(DBPersona).where(DBPersona.campaign_id == session.campaign_id)).all()

@strawberry.type
class CampaignType:
    id: int
    name: str
    description: Optional[str]
    summary: Optional[str]
    created_at: str
    
    @strawberry.field
    def sessions(self, info) -> List[SessionType]:
        db = info.context["db"]
        return db.exec(select(DBSession).where(DBSession.campaign_id == self.id).order_by(DBSession.created_at.desc())).all()

    @strawberry.field
    def personas(self, info) -> List[PersonaType]:
        db = info.context["db"]
        return db.exec(select(DBPersona).where(DBPersona.campaign_id == self.id)).all()

    @strawberry.field
    def moments(self, info) -> List[MomentType]:
        db = info.context["db"]
        return db.exec(
            select(DBMoment)
            .join(DBSession)
            .where(DBSession.campaign_id == self.id)
            .order_by(DBSession.created_at.desc())
        ).all()

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

@strawberry.type
class Mutation:
    # --- Campaign ---
    @strawberry.mutation
    def create_campaign(self, info, name: str, description: Optional[str] = None) -> CampaignType:
        db = info.context["db"]
        campaign = DBCampaign(name=name, description=description)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign

    @strawberry.mutation
    def delete_campaign(self, info, id: int) -> bool:
        db = info.context["db"]
        campaign = db.get(DBCampaign, id)
        if not campaign: return False
        db.delete(campaign)
        db.commit()
        return True

    @strawberry.mutation
    def generate_campaign_summary(self, info, id: int) -> bool:
        bg_tasks = info.context.get("background_tasks")
        # We need engine as well, or just let services/llm/generators handle connection via a fresh session?
        # generators.py functions take `db_engine`.
        db_engine = info.context.get("engine")
        
        if bg_tasks and db_engine:
             bg_tasks.add_task(generate_campaign_summary_pipeline, id, db_engine)
             return True
        return False

    # --- Session ---
    @strawberry.mutation
    def delete_session(self, info, id: int) -> bool:
        db = info.context["db"]
        session = db.get(DBSession, id)
        if not session: return False
        db.delete(session)
        db.commit()
        return True

    @strawberry.mutation
    def update_session(self, info, id: int, name: Optional[str] = None, summary: Optional[str] = None) -> Optional[SessionType]:
        db = info.context["db"]
        session = db.get(DBSession, id)
        if not session: return None
        
        if name is not None: session.name = name
        if summary is not None: session.summary = summary
        
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @strawberry.mutation
    async def refine_session_summary(self, info, id: int) -> Optional[str]:
        db_engine = info.context.get("engine")
        if not db_engine: return None
        return await refine_session_summary(id, db_engine)
    
    # --- Persona ---
    @strawberry.mutation
    def create_persona(self, info, input: PersonaInput) -> PersonaType:
        db = info.context["db"]
        if not input.campaign_id:
            raise Exception("campaign_id required for creation")
        
        persona = DBPersona(
            name=input.name,
            role=input.role,
            description=input.description or "",
            voice_description=input.voice_description,
            player_name=input.player_name,
            campaign_id=input.campaign_id,
            # New fields
            gender=input.gender,
            race=input.race,
            class_name=input.class_name,
            level=input.level,
            status=input.status or "Alive",
            faction=input.faction,
            alignment=input.alignment,
            aliases=json.dumps(input.aliases) if input.aliases else "[]"
        )
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return persona

    @strawberry.mutation
    def update_persona(self, info, id: int, input: PersonaInput) -> Optional[PersonaType]:
        db = info.context["db"]
        persona = db.get(DBPersona, id)
        if not persona: return None
        
        persona.name = input.name
        persona.role = input.role
        if input.description is not None: persona.description = input.description
        if input.voice_description is not None: persona.voice_description = input.voice_description
        if input.player_name is not None: persona.player_name = input.player_name
        
        # New fields
        if input.gender is not None: persona.gender = input.gender
        if input.race is not None: persona.race = input.race
        if input.class_name is not None: persona.class_name = input.class_name
        if input.level is not None: persona.level = input.level
        if input.status is not None: persona.status = input.status
        if input.faction is not None: persona.faction = input.faction
        if input.alignment is not None: persona.alignment = input.alignment
        if input.aliases is not None: persona.aliases = json.dumps(input.aliases)
        
        db.add(persona)
        db.commit()
        db.refresh(persona)
        return persona

    @strawberry.mutation
    def delete_persona(self, info, id: int) -> bool:
        db = info.context["db"]
        persona = db.get(DBPersona, id)
        if not persona: return False
        db.delete(persona)
        db.commit()
        return True

    @strawberry.mutation
    def merge_personas(self, info, target_id: int, source_id: int) -> Optional[PersonaType]:
        db = info.context["db"]
        target = db.get(DBPersona, target_id)
        source = db.get(DBPersona, source_id)
        if not target or not source: return None
        
        # 1. Reassign Highlights
        source_hls = db.exec(select(DBHighlight).where(DBHighlight.persona_id == source.id)).all()
        for hl in source_hls:
            hl.persona_id = target.id
            db.add(hl)
            
        # 2. Reassign Quotes
        source_qts = db.exec(select(DBQuote).where(DBQuote.persona_id == source.id)).all()
        for qt in source_qts:
            qt.persona_id = target.id
            db.add(qt)

        # 3. Merge Strings (Simple Append)
        def append_text(orig, new):
            if not new or new == "None": return orig
            if not orig: return new
            return f"{orig}\n{new}"

        if source.voice_description and not target.voice_description:
            target.voice_description = source.voice_description
        
        if source.summary:
             target.summary = append_text(target.summary, f"[Merged from {source.name}] {source.summary}")
        
        db.add(target)
        db.delete(source)
        db.commit()
        db.refresh(target)
        return target

    # --- Highlights & Quotes ---
    @strawberry.mutation
    def update_highlight(self, info, id: int, input: HighlightInput) -> Optional[HighlightType]:
        db = info.context["db"]
        hl = db.get(DBHighlight, id)
        if not hl: return None
        
        hl.text = input.text
        hl.type = input.type
        if input.persona_id is not None: 
             hl.persona_id = input.persona_id
        
        db.add(hl)
        db.commit()
        db.refresh(hl)
        return hl

    @strawberry.mutation
    def delete_highlight(self, info, id: int) -> bool:
        db = info.context["db"]
        hl = db.get(DBHighlight, id)
        if not hl: return False
        db.delete(hl)
        db.commit()
        return True

    @strawberry.mutation
    def update_quote(self, info, id: int, input: QuoteInput) -> Optional[QuoteType]:
        db = info.context["db"]
        qt = db.get(DBQuote, id)
        if not qt: return None
        
        qt.text = input.text
        if input.speaker_name is not None: qt.speaker_name = input.speaker_name
        if input.persona_id is not None: qt.persona_id = input.persona_id
        
        db.add(qt)
        db.commit()
        db.refresh(qt)
        return qt

    @strawberry.mutation
    def delete_quote(self, info, id: int) -> bool:
        db = info.context["db"]
        qt = db.get(DBQuote, id)
        if not qt: return False
        db.delete(qt)
        db.commit()
        return True

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    config=StrawberryConfig(auto_camel_case=False)
)
