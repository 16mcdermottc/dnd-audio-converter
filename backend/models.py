from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    sessions: List["Session"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    personas: List["Persona"] = Relationship(back_populates="campaign", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    summary: Optional[str] = Field(default=None, description="AI generated summary of the campaign")

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

class Transcript(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    speaker: str
    text: str
    timestamp: str 
    
class Persona(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id")
    name: str
    role: str # PC, NPC, DM, Monster
    description: str
    voice_description: Optional[str] = Field(default=None)
    player_name: Optional[str] = Field(default=None, description="Name of the player running this character (if PC)")
    
    campaign: Campaign = Relationship(back_populates="personas")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id") 
    summary: Optional[str] = None
    
    # New Fields for tracking character arc
    highlights: Optional[str] = Field(default=None, description="List of high points/achievements")
    low_points: Optional[str] = Field(default=None, description="List of low points/failures")
    memorable_quotes: Optional[str] = Field(default=None, description="List of memorable quotes")
    
class Moment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    title: str
    description: str
    timestamp: Optional[str] = None
    type: str = Field(default="highlight") # highlight, funny, fail, rule_cool
    
    session: Session = Relationship(back_populates="moments")
