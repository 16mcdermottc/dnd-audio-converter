from pydantic import BaseModel, Field
from typing import List, Optional

class HighlightSchema(BaseModel):
    name: Optional[str] = Field(default=None, description="Name of the Character. If generic, leave blank.")
    highlight: str = Field(description="The specific highlight or achievement. Start this with an action or moment, not a name. (e.g., 'suplexed the ogre', 'defeated the dragon'.)")

class QuoteSchema(BaseModel):
    speaker: str = Field(description="Name of the speaker. Do not use 'Unknown' unless absolutely necessary. Infer from context.")
    quote: str = Field(description="The exact quote content. capture ONLY funny or genuinely memorable quotes.")
    reasoning: str = Field(description="Chain-of-thought: Why did you assign this speaker? What context cues (voice, name mention, topic) did you use?")

class PersonaSchema(BaseModel):
    name: str
    role: str = Field(description="PC, NPC, DM, or Monster")
    player_name: Optional[str] = Field(default=None, description="Real name of the player if PC")
    description: str = Field(description="Physical and personality description")
    voice_description: Optional[str] = Field(default=None, description="Detailed description of their voice and mannerisms.")
    gender: Optional[str] = Field(default=None, description="Gender identity if known/inferable")
    race: Optional[str] = Field(default=None, description="Race/Species (e.g., Human, Elf, Tiefling)")
    class_name: Optional[str] = Field(default=None, description="D&D Class (e.g., Wizard, Fighter, Rogue)")
    alignment: Optional[str] = Field(default=None, description="Estimated alignment (e.g., CN, LG)")
    level: Optional[int] = Field(default=None, description="Estimated level if mentioned")
    status: str = Field(default="Alive", description="Current status: Alive, Dead, Missing, Captured")
    faction: Optional[str] = Field(default=None, description="Associated faction or group")
    highlights: List[HighlightSchema] = Field(default_factory=list, description="Specific actions and personal moments unique to this character.")
    low_points: List[HighlightSchema] = Field(default_factory=list, description="Specific failures or embarrassments unique to this character.")

class MomentSchema(BaseModel):
    title: str
    description: str

class SessionAnalysisSchema(BaseModel):
    summary: str = Field(description="A detailed narrative summary (at least 1000 words).")
    highlights: List[HighlightSchema] = Field(description="Major plot events (e.g., 'The Dragon was defeated', 'The city gates opened'). EXCLUDE specific character actions (e.g., 'Grog cast Fireball').")
    low_points: List[HighlightSchema] = Field(description="Major group setbacks (e.g., 'The party was captured', 'The artifact was lost'). EXCLUDE specific character failures.")
    memorable_quotes: List[QuoteSchema] = Field(description="List of funny or memorable quotes.")
    personas: List[PersonaSchema] = Field(description="List of all characters identified.")
    moments: List[MomentSchema] = Field(description="Key epic or funny moments.")

class MVPSchema(BaseModel):
    name: str = Field(description="Name of the MVP character")
    reason: str = Field(description="Reason why they are the MVP")

class CampaignSummarySchema(BaseModel):
    tagline: str = Field(description="A catchy subtitle that captures the essence of this campaign (e.g., 'A tale of revenge against the dragon lords of Faerûn').")
    summary: str = Field(description="A comprehensive narrative summary of the campaign so far.")
    key_events: List[str] = Field(description="List of major plot beats and events.")
    ongoing_conflicts: List[str] = Field(description="List of unresolved conflicts or threats.")
    pc_highlights: List[HighlightSchema] = Field(description="Highlights for each Player Character.")
    mvp: MVPSchema = Field(description="The MVP of the campaign.")
