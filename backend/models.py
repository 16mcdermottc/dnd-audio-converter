from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

# --- Base/Read Models to break circular dependencies ---

class HighlightRead(SQLModel):
    id: int
    text: str
    type: str
    session_id: int
    campaign_id: int

class QuoteRead(SQLModel):
    id: int
    text: str
    speaker_name: Optional[str]
    session_id: int
    campaign_id: int

# -------------------------------------------------------

class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    sessions: List["Session"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    personas: List["Persona"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    summary: Optional[str] = Field(default=None, description="AI generated summary of the campaign")
    
    highlights: List["Highlight"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    quotes: List["Quote"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id")
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    audio_file_paths: Optional[str] = Field(default=None, description="JSON list of file paths") 
    status: str = Field(default="pending")  # pending, processing, completed, error
    
    campaign: Campaign = Relationship(back_populates="sessions")
    moments: List["Moment"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    summary: Optional[str] = Field(default=None, description="AI generated summary of the session")

    # New Fields for Session-level Reference
    highlights: Optional[str] = Field(default=None, description="Key events/highlights of the session")
    low_points: Optional[str] = Field(default=None, description="Failures/low points of the session")
    memorable_quotes: Optional[str] = Field(default=None, description="Memorable quotes from the session")
    
    highlights_list: List["Highlight"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    quotes_list: List["Quote"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Transcript(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    speaker: str
    text: str
    timestamp: str 

# --- Persona Base Class ---
class PersonaBase(SQLModel):
    name: str
    role: str # PC, NPC, DM, Monster
    description: str
    voice_description: Optional[str] = Field(default=None)
    player_name: Optional[str] = Field(default=None, description="Name of the player running this character (if PC)")
    campaign_id: int = Field(foreign_key="campaign.id")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id") 
    summary: Optional[str] = None
    
    # New Fields for tracking character arc
    highlights: Optional[str] = Field(default=None, description="List of high points/achievements")
    low_points: Optional[str] = Field(default=None, description="List of low points/failures")
    memorable_quotes: Optional[str] = Field(default=None, description="List of memorable quotes")

class Persona(PersonaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    campaign: Campaign = Relationship(back_populates="personas")
    
    highlights_list: List["Highlight"] = Relationship(back_populates="persona")
    quotes_list: List["Quote"] = Relationship(back_populates="persona")

class PersonaRead(PersonaBase):
    id: int
    highlights_list: List[HighlightRead] = []
    quotes_list: List[QuoteRead] = []

class Highlight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    type: str = Field(default="high") # 'high' or 'low'
    
    session_id: int = Field(foreign_key="session.id")
    persona_id: Optional[int] = Field(default=None, foreign_key="persona.id")
    campaign_id: int = Field(foreign_key="campaign.id")
    
    session: Session = Relationship(back_populates="highlights_list")
    persona: Optional[Persona] = Relationship(back_populates="highlights_list")
    campaign: Campaign = Relationship(back_populates="highlights")

class Quote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    speaker_name: Optional[str] = None # Captured if not linked to a persona
    
    session_id: int = Field(foreign_key="session.id")
    persona_id: Optional[int] = Field(default=None, foreign_key="persona.id")
    campaign_id: int = Field(foreign_key="campaign.id")
    
    session: Session = Relationship(back_populates="quotes_list")
    persona: Optional[Persona] = Relationship(back_populates="quotes_list")
    campaign: Campaign = Relationship(back_populates="quotes")
    
class Moment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    title: str
    description: str
    timestamp: Optional[str] = None
    type: str = Field(default="highlight") # highlight, funny, fail, rule_cool
    
    session: Session = Relationship(back_populates="moments")
