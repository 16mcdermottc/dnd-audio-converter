"""
RAG (Retrieval-Augmented Generation) context builder for the librarian chat agent.
Fetches relevant campaign data to inject into chat prompts.
"""
from typing import Optional
from sqlmodel import Session, select
from ...models.models import Campaign, Session as DBSession, Persona, Highlight, Quote, Moment


def build_campaign_context(campaign_id: int, db: Session) -> str:
    """
    Build comprehensive context string from campaign data.
    Includes full campaign summary, all personas with details, all sessions with full summaries,
    all highlights, quotes, and moments.
    """
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        return "No campaign found."
    
    context_parts = []
    
    # Campaign overview
    context_parts.append(f"# Campaign: {campaign.name}")
    if campaign.description:
        context_parts.append(f"**Description:** {campaign.description}")
    # if campaign.summary:
    #     context_parts.append(f"\n**Campaign Summary:**\n{campaign.summary}")
    
    # =====================
    # ALL Characters/Personas
    # =====================
    personas = db.exec(
        select(Persona).where(Persona.campaign_id == campaign_id)
    ).all()
    
    if personas:
        context_parts.append("\n---\n## Characters & NPCs")
        
        # Group by role
        pcs = [p for p in personas if p.role == "PC"]
        npcs = [p for p in personas if p.role == "NPC"]
        # dms = [p for p in personas if p.role == "DM"]
        monsters = [p for p in personas if p.role == "Monster"]
        # others = [p for p in personas if p.role not in ("PC", "NPC", "DM", "Monster")]
        
        if pcs:
            context_parts.append("\n### Player Characters (PCs)")
            for persona in pcs:
                context_parts.append(_format_persona_detail(persona, db))
        
        if npcs:
            context_parts.append("\n### NPCs")
            for persona in npcs:
                context_parts.append(_format_persona_detail(persona, db))
        
        # if dms:
        #     context_parts.append("\n### Dungeon Masters")
        #     for persona in dms:
        #         context_parts.append(_format_persona_brief(persona))
        
        if monsters:
            context_parts.append("\n### Notable Monsters/Enemies")
            for persona in monsters:
                context_parts.append(_format_persona_brief(persona))
        
        # if others:
        #     context_parts.append("\n### Other Characters")
        #     for persona in others:
        #         context_parts.append(_format_persona_brief(persona))
    
    # =====================
    # ALL Sessions with FULL summaries
    # =====================
    sessions = db.exec(
        select(DBSession)
        .where(DBSession.campaign_id == campaign_id)
        .order_by(DBSession.created_at.asc())  # Chronological order
    ).all()
    
    if sessions:
        context_parts.append("\n---\n## Session History (Chronological)")
        for idx, session in enumerate(sessions, 1):
            context_parts.append(f"\n### Session {idx}: {session.name}")
            # context_parts.append(f"*Date: {session.created_at.strftime('%Y-%m-%d')}*")
            
            if session.summary:
                # Include FULL summary, no truncation
                context_parts.append(f"\n{session.summary}")
            
            # Session highlights
            session_highlights = db.exec(
                select(Highlight).where(Highlight.session_id == session.id)
            ).all()
            
            highs = [h for h in session_highlights if h.type == "high"]
            lows = [h for h in session_highlights if h.type == "low"]
            
            if highs:
                context_parts.append("\n**Highlights:**")
                for h in highs:
                    prefix = f"{h.name}: " if h.name else ""
                    context_parts.append(f"- {prefix}{h.text}")
            
            if lows:
                context_parts.append("\n**Setbacks:**")
                for h in lows:
                    prefix = f"{h.name}: " if h.name else ""
                    context_parts.append(f"- {prefix}{h.text}")
            
            # Session moments
            session_moments = db.exec(
                select(Moment).where(Moment.session_id == session.id)
            ).all()
            
            if session_moments:
                context_parts.append("\n**Key Moments:**")
                for m in session_moments:
                    context_parts.append(f"- **{m.title}**: {m.description}")
    
    # =====================
    # ALL Memorable Quotes
    # =====================
    all_quotes = db.exec(
        select(Quote).where(Quote.campaign_id == campaign_id)
    ).all()
    
    if all_quotes:
        context_parts.append("\n---\n## Memorable Quotes")
        for q in all_quotes:
            speaker = q.speaker_name or "Unknown"
            context_parts.append(f'- "{q.text}" — *{speaker}*')
    
    return "\n".join(context_parts)


def _format_persona_detail(persona: Persona, db: Session) -> str:
    """Format a persona with full details for PCs and important NPCs."""
    lines = []
    
    # Name and basic info
    header_parts = [f"**{persona.name}**"]
    if persona.race:
        header_parts.append(persona.race)
    if persona.class_name:
        header_parts.append(persona.class_name)
    if persona.level:
        header_parts.append(f"Level {persona.level}")
    
    lines.append(" | ".join(header_parts))
    
    if persona.player_name:
        lines.append(f"  - *Played by: {persona.player_name}*")
    
    if persona.alignment:
        lines.append(f"  - Alignment: {persona.alignment}")
    
    if persona.status and persona.status != "Alive":
        lines.append(f"  - Status: **{persona.status}**")
    
    if persona.faction:
        lines.append(f"  - Faction: {persona.faction}")
    
    if persona.description:
        lines.append(f"  - {persona.description}")
    
    if persona.voice_description:
        lines.append(f"  - Voice/Mannerisms: {persona.voice_description}")
    
    if persona.summary:
        lines.append(f"  - Story: {persona.summary}")
    
    # Character-specific highlights
    highlights = db.exec(
        select(Highlight).where(Highlight.persona_id == persona.id)
    ).all()
    
    if highlights:
        highs = [h for h in highlights if h.type == "high"]
        lows = [h for h in highlights if h.type == "low"]
        
        if highs:
            lines.append("  - Notable Achievements:")
            for h in highs[:5]:  # Limit to top 5 per character
                lines.append(f"    - {h.text}")
        
        if lows:
            lines.append("  - Notable Failures:")
            for h in lows[:3]:  # Limit to top 3
                lines.append(f"    - {h.text}")
    
    # Character-specific quotes
    quotes = db.exec(
        select(Quote).where(Quote.persona_id == persona.id)
    ).all()
    
    if quotes:
        lines.append("  - Memorable Quotes:")
        for q in quotes[:3]:  # Top 3 quotes per character
            lines.append(f'    - "{q.text}"')
    
    return "\n".join(lines)


def _format_persona_brief(persona: Persona) -> str:
    """Format a persona briefly for DMs, monsters, and minor characters."""
    parts = [f"- **{persona.name}**"]
    
    if persona.race:
        parts.append(f"({persona.race})")
    
    if persona.description:
        desc = persona.description[:150] + "..." if len(persona.description) > 150 else persona.description
        parts.append(f"- {desc}")
    
    if persona.status and persona.status != "Alive":
        parts.append(f"[{persona.status}]")
    
    return " ".join(parts)


def build_session_context(session_id: int, db: Session) -> str:
    """
    Build context string from a specific session.
    Includes full summary, highlights, quotes, and moments.
    """
    session = db.get(DBSession, session_id)
    if not session:
        return "No session found."
    
    context_parts = []
    
    # Session overview
    context_parts.append(f"## Session: {session.name}")
    context_parts.append(f"*Date: {session.created_at.strftime('%Y-%m-%d')}*")
    
    if session.summary:
        context_parts.append(f"\n**Full Summary:**\n{session.summary}")
    
    # Highlights
    highlights = db.exec(
        select(Highlight).where(Highlight.session_id == session_id)
    ).all()
    
    if highlights:
        highs = [h for h in highlights if h.type == "high"]
        lows = [h for h in highlights if h.type == "low"]
        
        if highs:
            context_parts.append("\n### Highlights")
            for h in highs:
                prefix = f"{h.name}: " if h.name else ""
                context_parts.append(f"- {prefix}{h.text}")
        
        if lows:
            context_parts.append("\n### Low Points")
            for h in lows:
                prefix = f"{h.name}: " if h.name else ""
                context_parts.append(f"- {prefix}{h.text}")
    
    # Memorable quotes
    quotes = db.exec(
        select(Quote).where(Quote.session_id == session_id)
    ).all()
    
    if quotes:
        context_parts.append("\n### Memorable Quotes")
        for q in quotes:
            speaker = q.speaker_name or "Unknown"
            context_parts.append(f'- "{q.text}" — *{speaker}*')
    
    # Moments
    moments = db.exec(
        select(Moment).where(Moment.session_id == session_id)
    ).all()
    
    if moments:
        context_parts.append("\n### Key Moments")
        for m in moments:
            context_parts.append(f"- **{m.title}**: {m.description}")
    
    return "\n".join(context_parts)


def build_persona_context(persona_id: int, db: Session) -> str:
    """
    Build context string for a specific character/persona.
    Includes all character details, highlights, and quotes.
    """
    persona = db.get(Persona, persona_id)
    if not persona:
        return "No character found."
    
    context_parts = []
    
    # Character overview
    context_parts.append(f"## Character: {persona.name}")
    context_parts.append(f"**Role:** {persona.role}")
    
    if persona.race or persona.class_name:
        details = []
        if persona.race:
            details.append(persona.race)
        if persona.class_name:
            details.append(persona.class_name)
        if persona.level:
            details.append(f"Level {persona.level}")
        context_parts.append(f"**Class/Race:** {' '.join(details)}")
    
    if persona.player_name:
        context_parts.append(f"**Player:** {persona.player_name}")
    
    if persona.alignment:
        context_parts.append(f"**Alignment:** {persona.alignment}")
    
    if persona.status:
        context_parts.append(f"**Status:** {persona.status}")
    
    if persona.faction:
        context_parts.append(f"**Faction:** {persona.faction}")
    
    if persona.description:
        context_parts.append(f"\n**Description:** {persona.description}")
    
    if persona.voice_description:
        context_parts.append(f"**Voice/Mannerisms:** {persona.voice_description}")
    
    if persona.summary:
        context_parts.append(f"\n**Character Story:** {persona.summary}")
    
    # ALL character highlights
    highlights = db.exec(
        select(Highlight).where(Highlight.persona_id == persona_id)
    ).all()
    
    if highlights:
        highs = [h for h in highlights if h.type == "high"]
        lows = [h for h in highlights if h.type == "low"]
        
        if highs:
            context_parts.append("\n### Achievements & Highlights")
            for h in highs:
                context_parts.append(f"- {h.text}")
        
        if lows:
            context_parts.append("\n### Failures & Low Points")
            for h in lows:
                context_parts.append(f"- {h.text}")
    
    # ALL character quotes
    quotes = db.exec(
        select(Quote).where(Quote.persona_id == persona_id)
    ).all()
    
    if quotes:
        context_parts.append("\n### Memorable Quotes")
        for q in quotes:
            context_parts.append(f'- "{q.text}"')
    
    return "\n".join(context_parts)


def build_full_context(
    db: Session,
    campaign_id: Optional[int] = None,
    session_id: Optional[int] = None,
    persona_id: Optional[int] = None
) -> str:
    """
    Build comprehensive context based on provided IDs.
    Campaign context is always the primary, richest source.
    Additional session/persona context can be layered on top.
    """
    context_parts = []
    
    # Campaign context is the richest - includes everything
    if campaign_id:
        context_parts.append(build_campaign_context(campaign_id, db))
    
    # Add specific session detail if requested (useful for "tell me about session X")
    if session_id:
        context_parts.append(build_session_context(session_id, db))
    
    # Add specific persona detail if requested
    if persona_id:
        context_parts.append(build_persona_context(persona_id, db))
    
    if not context_parts:
        return "No campaign context available. Ask general D&D questions or specify a campaign."
    
    return "\n\n---\n\n".join(context_parts)
