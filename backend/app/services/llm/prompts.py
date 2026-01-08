from sqlmodel import Session, select
from ...models.models import Persona

SYSTEM_PROMPT = """
You are an expert D&D Campaign Archivist. Your goal is to process a game session and extract structured data.

CRITICAL INSTRUCTION: You MUST process the audio/text from the very beginning to the very end.

### SPEAKER IDENTIFICATION PROTOCOL
1.  **Context Clues**: Listen for other players saying names (e.g., "Good job, Grog!").
2.  **Voice Consistency**: Track distinct voices. If a deep rasping voice is established as "The King", ensure all subsequent lines with that voice are attributed to "The King".
3.  **Ambiguity**: If you are unsure, explain your reasoning in the `reasoning` field of the quote before making a best guess. DO NOT output "Unknown Speaker" if a reasonable guess can be made from context.
4.  **Double Check**: Before finalizing a speaker, ask yourself: "Does this make sense for this character? Is this their voice?"

### QUOTE SELECTION CRITERIA
-   **Funny**: Quotes that caused laughter at the table.
-   **Memorable**: Epic one-liners, crucial plot revelations, or emotional turning points.
-   **Strict Filter**: Do NOT transcribe mundane table talk (e.g., "Pass the chips", "What do I roll?"). logic.

### UPSERT / REFINEMENT PROTOCOL
If an 'EXISTING SUMMARY' is provided in the context:
-   **Do NOT discard it**.
-   **Integrate**: Merge the new information from the current audio/text into the existing summary.
-   **Correct**: If the new information contradicts or corrects the old, update the summary to reflect the truth.
-   **Enhance**: If the new information adds detail to events already mentioned, weave it in.
-   **Ignore**: If the new information is redundant (already covered), you may skip repeating it, but ensure the final summary effectively covers the session.
-   **Goal**: The output 'summary' should be the single source of truth for the entire session, combining old and new data.

### HIGHLIGHT CATEGORIZATION PROTOCOL (CRITICAL)
-   **Session Highlights**: These are MACRO-level plot events that affect the entire party or the world.
    *   *YES*: "The party defeated the Dragon King." / "The entrance to the Lost City was found."
    *   *NO*: "Grog rolled a nat 20 to hit." / "Vex stole a sweetroll." (These are Persona Highlights)
-   **Persona Highlights**: These are MICRO-level character moments, cool moves, emotional beats, or failures specific to one person.
    *   *YES*: "Grog suplexed the ogre." / "Keyleth successfully inspired the crowd."
    *   *NO*: "The party leveled up." (This is a Session Highlight)

### OUTPUT REQUIREMENTS
-   **Summary**: Comprehensive, at least 1000 words. Refine/Update the existing summary if provided.
-   **Personas**: extract details for every character that speaks or is important.
"""

def construct_prompt_context(db: Session, campaign_id: int, existing_summary: str = "") -> str:
    """Fetches existing personas and builds the context string for the prompt."""
    existing_personas = db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()
    
    pcs = [p for p in existing_personas if p.role == 'PC']
    npcs = [p for p in existing_personas if p.role != 'PC']
    
    def format_pc(p):
        # Format: * [PC] Name (Level X Class) [Race] [Gender] [Played by: PlayerName]
        line = f"* [PC] {p.name}"
        
        details = []
        if p.level and p.class_name: details.append(f"Level {p.level} {p.class_name}")
        elif p.class_name: details.append(p.class_name)
        
        if details: line += f" ({', '.join(details)})"
        
        if p.race: line += f" [{p.race}]"
        if p.gender: line += f" [Gender: {p.gender}]"
        
        if p.player_name:
            line += f" [Played by: {p.player_name}]"
            
        if p.voice_description:
            line += f" -- Voice: {p.voice_description}"
            
        import json
        try:
            aliases = json.loads(p.aliases) if p.aliases else []
            if aliases:
                line += f" [Aliases: {', '.join(aliases)}]"
        except:
            pass

        return line

    def format_npc(p):
        # Format: - Name (Role - Faction) [Race] [Gender] -- Voice: ... -- Desc: ...
        line = f"- {p.name}"
        
        roles = []
        if p.role and p.role != 'NPC': roles.append(p.role)
        if p.faction: roles.append(p.faction)
        
        if roles: line += f" ({' - '.join(roles)})"
        
        if p.race: line += f" [{p.race}]"
        if p.gender: line += f" [Gender: {p.gender}]"
        
        if p.voice_description:
            line += f" -- Voice: {p.voice_description}"
            
            line += f" -- Desc: {p.description[:100]}..."

        import json
        try:
            aliases = json.loads(p.aliases) if p.aliases else []
            if aliases:
                line += f" [Aliases: {', '.join(aliases)}]"
        except:
            pass
            
        return line

    prompt_context = ""
    if pcs:
        prompt_context += "\nKNOWN PLAYER CHARACTERS (PCs):\n" + "\n".join([format_pc(p) for p in pcs])
    if npcs:
        prompt_context += "\n\nKNOWN NPCs:\n" + "\n".join([format_npc(p) for p in npcs])

    context_instruction = ""
    if prompt_context:
        context_instruction = f"""
\n\n### CONTEXT: EXISTING PERSONAS ###
{prompt_context}
"""

    if existing_summary:
        context_instruction += f"""
\n\n### CONTEXT: EXISTING SUMMARY ###
The following is the CURRENT summary of this session. You are updating it with new information.
{existing_summary}
"""

    if prompt_context:
        context_instruction += """
CRITICAL SPEAKER IDENTIFICATION INSTRUCTIONS:
1.  **PLAYER-CHARACTER MATCHING**:
    -   If you hear a player named "Steve" (or referred to as "Steve"), attribute their in-character speech to the character marked `[Played by: Steve]`.
    -   Players often speak out of character. Distinguish between "Table Talk" (ignore or summarize lightly) and "In-Character Speech" (attribute to Persona).

2.  **GENDER/VOICE CUES**:
    -   **CRITICAL**: You MUST use the `[Gender: ...]` tag to ensure you use the correct pronouns (he/him, she/her, they/them) for every character.
    -   Use the `Voice: ...` description to match distinct character voices.

3.  **CONTINUITY**:
    -   Use the existing persona list to identify characters. Do not create duplicates (e.g., if "Grog" exists, don't create "Grog Strongjaw" as a new entry, merge them).
    -   Only extract 'voice_description' if you find *new* information that adds to the existing description.
"""
    return context_instruction
    return context_instruction

REFINE_SUMMARY_PROMPT = """
You are an expert editor for D&D session summaries. 
Your task is to refine the provided session summary text.

INSTRUCTIONS:
1.  **Correct Names**: Use the provided list of "Known Personas" to correct the spelling of any character names found in the text.
2.  **Fix Grammar/Flow**: Improve the flow and grammar of the text without removing details. DO NOT highlight or embolden any text.
3.  **Standardize**: Ensure characters are referred to consistent with their Persona entries. Once a full name is used, feel free to use the nickname or first name.
4.  **Preserve**: Do not hallucinate new events. Only polish what is there.
"""
