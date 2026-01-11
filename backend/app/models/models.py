from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from .enums import ProcessingStatus

# --- Base/Read Models to break circular dependencies ---


class HighlightRead(SQLModel):
    id: int
    text: str
    type: str # 'high' or 'low'
    session_id: int
    campaign_id: int

class QuoteRead(SQLModel):
    id: int
    text: str
    speaker_name: Optional[str]
    session_id: int
    campaign_id: int

class SessionAudioFile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    file_path: str
    session: "Session" = Relationship(back_populates="audio_files")

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
    status: ProcessingStatus = Field(default=ProcessingStatus.PENDING)  # pending, processing, completed, error
    error_message: Optional[str] = Field(default=None, description="Error details if status is error")
    
    campaign: Campaign = Relationship(back_populates="sessions")
    
    # Relationships
    audio_files: List["SessionAudioFile"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    moments: List["Moment"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    highlights: List["Highlight"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    quotes: List["Quote"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    
    summary: Optional[str] = Field(default=None, description="AI generated summary of the session")

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
    gender: Optional[str] = Field(default=None)
    race: Optional[str] = Field(default=None)
    class_name: Optional[str] = Field(default=None, description="Character class (e.g., Wizard, Fighter)")
    alignment: Optional[str] = Field(default=None)
    level: Optional[int] = Field(default=None)
    status: str = Field(default="Alive", description="Alive, Dead, Missing, etc.")
    status: str = Field(default="Alive", description="Alive, Dead, Missing, etc.")
    faction: Optional[str] = Field(default=None)
    aliases: Optional[str] = Field(default="[]", description="JSON list of aliases/nicknames")

    player_name: Optional[str] = Field(default=None, description="Name of the player running this character (if PC)")
    campaign_id: int = Field(foreign_key="campaign.id")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id") 
    summary: Optional[str] = None
    
class Persona(PersonaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    campaign: Campaign = Relationship(back_populates="personas")
    
    highlights: List["Highlight"] = Relationship(back_populates="persona")
    quotes: List["Quote"] = Relationship(back_populates="persona")

class PersonaRead(PersonaBase):
    id: int
    highlights: List[HighlightRead] = []
    quotes: List[QuoteRead] = []

class Highlight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    name: Optional[str] = Field(default=None, description="Display name for the highlight (e.g. character name)")
    type: str = Field(default="high") # 'high' or 'low'
    
    session_id: int = Field(foreign_key="session.id")
    persona_id: Optional[int] = Field(default=None, foreign_key="persona.id")
    campaign_id: int = Field(foreign_key="campaign.id")
    
    session: Session = Relationship(back_populates="highlights")
    persona: Optional[Persona] = Relationship(back_populates="highlights")
    campaign: Campaign = Relationship(back_populates="highlights")

class Quote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    speaker_name: Optional[str] = None # Captured if not linked to a persona
    
    session_id: int = Field(foreign_key="session.id")
    persona_id: Optional[int] = Field(default=None, foreign_key="persona.id")
    campaign_id: int = Field(foreign_key="campaign.id")
    
    session: Session = Relationship(back_populates="quotes")
    persona: Optional[Persona] = Relationship(back_populates="quotes")
    campaign: Campaign = Relationship(back_populates="quotes")
    
class Moment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    title: str
    description: str
    type: str = Field(default="highlight") # highlight, funny, fail, rule_cool
    
    session: Session = Relationship(back_populates="moments")

class VectorStore(SQLModel, table=True):
    """
    Store for text chunks and their vector embeddings.
    Used for local RAG (Retrieval Augmented Generation).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id", index=True)
    
    # Source metadata
    source_type: str = Field(index=True) # 'session_summary', 'persona', 'highlight', 'quote', 'moment'
    source_id: int # ID of the session/persona/etc
    
    # The actual content to retrieve
    text_content: str
    
    # The embedding vector (stored as JSON string of float list)
    embedding_json: str
    
    created_at: datetime = Field(default_factory=datetime.now)

