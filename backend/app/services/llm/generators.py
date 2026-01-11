import os
import asyncio
import json
import difflib
from typing import List, Dict, Any

from google.genai import types
from sqlmodel import Session, select, col, delete

# Imports from our new structure
from ...models.models import Session as DBSessionEntry, Persona, Moment, Highlight, Quote, Campaign
from ...models.enums import ProcessingStatus
from ...core.config import settings
from ..audio import prepare_audio_files
from .client import client
from .schemas import SessionAnalysisSchema, CampaignSummarySchema, HighlightSchema
from .prompts import SYSTEM_PROMPT, construct_prompt_context, REFINE_SUMMARY_PROMPT
from .utils import clean_and_parse_json

async def _upload_and_wait_for_files(file_paths: List[str]) -> List[Any]:
    """Uploads files to Gemini and waits for them to be active."""
    if not client:
        raise Exception("Gemini Client not initialized")
    
    gemini_files = []
    for path in file_paths:
        mime_type = "audio/mpeg"
        if path.endswith(".wav"): mime_type = "audio/wav"
        elif path.endswith(".m4a"): mime_type = "audio/mp4"
        
        print(f"Uploading file: {path} ({mime_type})")
        # Ensure upload is non-blocking to the event loop
        g_file = await asyncio.to_thread(
            client.files.upload,
            file=path,
            config={'mime_type': mime_type}
        )
        print(f"Uploaded as: {g_file.uri}")
        gemini_files.append(g_file)

    print("Waiting for file processing...")
    for f in gemini_files:
        attempts = 0
        while True:
            attempts += 1
            if attempts > 120:
                raise Exception(f"Timeout waiting for file {f.name}")
            
            # Poll status
            current_file = await asyncio.to_thread(client.files.get, name=f.name)
            
            if current_file.state == "ACTIVE":
                break
            elif current_file.state == "FAILED":
                raise Exception(f"File {current_file.name} failed processing")
            
            await asyncio.sleep(5) # Non-blocking sleep
            
    print("...all files ready")
    return gemini_files

def _save_analysis_to_db(session_id: int, data: Dict[str, Any], db: Session):
    """Parses the analysis dictionary and saves all entities to the database."""
    session_entry = db.get(DBSessionEntry, session_id)
    if not session_entry: return
    campaign_id = session_entry.campaign_id
    
    # 1. Personas (Upsert)
    for p_data in data.get("personas", []):
        name_query = p_data["name"]
        
        # Try exact match
        existing_persona = db.exec(select(Persona).where(col(Persona.name).ilike(name_query)).where(Persona.campaign_id == campaign_id)).first()
        
        if not existing_persona:
            # Fallback: Check local list for substring
            all_personas = db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()
            for cp in all_personas:
                if name_query.lower() in cp.name.lower() or cp.name.lower() in name_query.lower():
                    existing_persona = cp
                    break
                # Fuzzy
                ratio = difflib.SequenceMatcher(None, name_query.lower(), cp.name.lower()).ratio()
                if ratio > 0.83:
                    existing_persona = cp
                    print(f"Fuzzy match: {name_query} ~= {cp.name} ({ratio:.2f})")
                    break

            # Check aliases
            if not existing_persona:
                for cp in all_personas:
                    try:
                        aliases = json.loads(cp.aliases) if cp.aliases else []
                        if any(a.lower() == name_query.lower() for a in aliases):
                            existing_persona = cp
                            print(f"Alias match: {name_query} -> {cp.name}")
                            break
                    except: continue

        # Upsert properties
        voice_desc = p_data.get("voice_description")
        
        if existing_persona:
            if voice_desc: existing_persona.voice_description = voice_desc
            if p_data.get("player_name") and not existing_persona.player_name:
                existing_persona.player_name = p_data.get("player_name")
            
            # Update new fields if provided
            if p_data.get("gender"): existing_persona.gender = p_data.get("gender")
            if p_data.get("race"): existing_persona.race = p_data.get("race")
            if p_data.get("class_name"): existing_persona.class_name = p_data.get("class_name")
            if p_data.get("alignment"): existing_persona.alignment = p_data.get("alignment")
            if p_data.get("level"): existing_persona.level = p_data.get("level")
            if p_data.get("faction"): existing_persona.faction = p_data.get("faction")
            if p_data.get("status"): existing_persona.status = p_data.get("status")

            db.add(existing_persona)
            current_pid = existing_persona.id
        else:
            new_p = Persona(
                name=p_data["name"],
                role=p_data["role"],
                description=p_data["description"],
                voice_description=voice_desc,
                gender=p_data.get("gender"),
                race=p_data.get("race"),
                class_name=p_data.get("class_name"),
                alignment=p_data.get("alignment"),
                level=p_data.get("level"),
                status=p_data.get("status", "Alive"),
                faction=p_data.get("faction"),
                player_name=p_data.get("player_name"),
                session_id=session_id,
                campaign_id=campaign_id
            )
            db.add(new_p)
            db.commit()
            db.refresh(new_p)
            current_pid = new_p.id

        # Highlights
        for hl in p_data.get("highlights", []):
            content = hl
            if not isinstance(hl, str):
                content = hl.get("highlight") or hl.get("text") or str(hl)
            
            # Check for generic duplicate
            exists = db.exec(select(Highlight).where(Highlight.text == content).where(Highlight.session_id == session_id)).first()
            if not exists:
                name_val = p_data.get("name") # Use persona name
                db.add(Highlight(text=content, name=name_val, type="high", session_id=session_id, persona_id=current_pid, campaign_id=campaign_id))

        # Low Points
        for lp in p_data.get("low_points", []):
            content = lp
            if not isinstance(lp, str):
                content = lp.get("highlight") or lp.get("text") or str(lp)

            # Check for generic duplicate
            exists = db.exec(select(Highlight).where(Highlight.text == content).where(Highlight.session_id == session_id)).first()
            if not exists:
                name_val = p_data.get("name") # Use persona name
                db.add(Highlight(text=content, name=name_val, type="low", session_id=session_id, persona_id=current_pid, campaign_id=campaign_id))

    # 2. Quotes
    for q in data.get("memorable_quotes", []):
        q_text = q.get("quote", "") if isinstance(q, dict) else str(q)
        speaker = q.get("speaker", "Unknown") if isinstance(q, dict) else "Unknown"
        
        # Link to persona
        pid = None
        if speaker:
            pmatch = db.exec(select(Persona).where(col(Persona.name).ilike(speaker)).where(Persona.campaign_id == campaign_id)).first()
            if pmatch: pid = pmatch.id
            
        # Check duplicate
        exists = db.exec(select(Quote).where(Quote.text == q_text).where(Quote.session_id == session_id)).first()
        if not exists:
             db.add(Quote(text=q_text, speaker_name=speaker, session_id=session_id, persona_id=pid, campaign_id=campaign_id))

    # 3. Moments
    for m in data.get("moments", []):
        # Check duplicate by title/desc to avoid re-adding safe moments
        exists = db.exec(select(Moment).where(Moment.title == m["title"]).where(Moment.session_id == session_id)).first()
        if not exists:
            db.add(Moment(
                session_id=session_id,
                title=m["title"],
                description=m["description"],
                timestamp=m.get("timestamp")
            ))
    
    # 4. Session Highlights & Low Points (Top Level)
    for hl in data.get("highlights", []):
        content = hl if isinstance(hl, str) else hl.get("highlight", str(hl))
        name_val = hl.get("name") if isinstance(hl, dict) else None
        exists = db.exec(select(Highlight).where(Highlight.text == content).where(Highlight.session_id == session_id)).first()
        if not exists:
            db.add(Highlight(text=content, name=name_val, type="high", session_id=session_id, persona_id=None, campaign_id=campaign_id))

    for lp in data.get("low_points", []):
        content = lp if isinstance(lp, str) else lp.get("highlight", str(lp))
        name_val = lp.get("name") if isinstance(lp, dict) else None
        exists = db.exec(select(Highlight).where(Highlight.text == content).where(Highlight.session_id == session_id)).first()
        if not exists:
            db.add(Highlight(text=content, name=name_val, type="low", session_id=session_id, persona_id=None, campaign_id=campaign_id))

    # 5. Session Summary
    # The summary is upserted by the LLM itself returning a refined version.
    # We just overwrite with what the LLM returned.
    session_entry.summary = data.get("summary", "")
    session_entry.status = ProcessingStatus.COMPLETED
    
    db.add(session_entry)
    db.commit()
    
    # Auto-Index Session Summary
    if session_entry.summary:
        try:
            from .vector_store import VectorService
            service = VectorService(db)
            service.save_chunk(campaign_id, "session_summary", session_entry.id, f"Session {session_entry.name} Summary: {session_entry.summary}")
        except Exception as e:
            print(f"Failed to auto-index session summary: {e}")

async def process_session_pipeline(session_id: int, db_engine):
    """Main Async Pipeline"""
    print(f"Starting pipeline for session {session_id}", flush=True)
    
    audio_paths = []
    campaign_id = 0
    existing_summary = ""
    
    with Session(db_engine) as db:
        s = db.get(DBSessionEntry, session_id)
        if not s: return
        s.status = ProcessingStatus.PROCESSING
        
        # Capture existing summary to pass as context
        if s.summary:
            existing_summary = s.summary

        # Clear existing analysis data for this session to prevent duplication (Regeneration)
        # Using explicit fetch and delete loop for robustness
        highlights = db.exec(select(Highlight).where(Highlight.session_id == session_id)).all()
        for h in highlights: db.delete(h)
        
        moments = db.exec(select(Moment).where(Moment.session_id == session_id)).all()
        for m in moments: db.delete(m)
        
        quotes = db.exec(select(Quote).where(Quote.session_id == session_id)).all()
        for q in quotes: db.delete(q)
            
        db.add(s)
        db.commit()
        db.refresh(s)
        
        campaign_id = s.campaign_id
        try:
            audio_paths = json.loads(s.audio_file_paths)
        except:
            audio_paths = [s.audio_file_paths]

    temp_files_cleanup = []
    gemini_files = []

    try:
        # 1. Prepare
        final_paths, temp_files_cleanup = await prepare_audio_files(audio_paths)
        
        # 2. Upload
        gemini_files = await _upload_and_wait_for_files(final_paths)
        
        # 3. Build Prompt
        prompt_context = ""
        with Session(db_engine) as db:
            # Pass existing_summary here
            prompt_context = construct_prompt_context(db, campaign_id, existing_summary=existing_summary)
            
        system_instruction = "You are processing an audio/video file. " + SYSTEM_PROMPT + prompt_context
        
        # 4. Generate
        print("Sending prompt to Gemini...")
        models_to_try = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-pro-latest"]
        
        response_data = None
        
        for model in models_to_try:
            print(f"Trying model: {model}")
            try:
                parts = [types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type) for f in gemini_files]
                
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=[types.Content(role="user", parts=parts)],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=SessionAnalysisSchema
                    )
                )
                
                if response.parsed:
                    response_data = response.parsed.model_dump()
                else:
                    response_data = clean_and_parse_json(response.text)
                
                break # Success
            except Exception as e:
                print(f"Model {model} failed: {e}")
                await asyncio.sleep(5)
                continue
                
        if not response_data:
            raise Exception("All models failed.")
            
        # 5. Save
        with Session(db_engine) as db:
            _save_analysis_to_db(session_id, response_data, db)
            
        print(f"Session {session_id} completed successfully.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Pipeline Error: {e}")
        with Session(db_engine) as db:
            s = db.get(DBSessionEntry, session_id)
            if s:
                s.status = ProcessingStatus.ERROR
                s.error_message = str(e)
                db.add(s)
                db.commit()
    
    finally:
        # Cleanup
        if gemini_files:
            for gf in gemini_files:
                try: 
                    await asyncio.to_thread(client.files.delete, name=gf.name)
                except: pass
        
        if temp_files_cleanup:
            for tf in temp_files_cleanup:
                 try: os.remove(tf)
                 except: pass

async def process_text_session_pipeline(session_id: int, db_engine):
    """Text Pipeline (Simplified)"""
    print(f"Starting TEXT pipeline for session {session_id}")
    
    response_data = None
    campaign_id = 0
    text_content = ""
    existing_summary = ""
    
    with Session(db_engine) as db:
        s = db.get(DBSessionEntry, session_id)
        if not s: return
        s.status = ProcessingStatus.PROCESSING
        
        if s.summary:
            existing_summary = s.summary
            
        # Clear existing analysis data for this session to prevent duplication (Regeneration)
        highlights = db.exec(select(Highlight).where(Highlight.session_id == session_id)).all()
        for h in highlights: db.delete(h)
        
        moments = db.exec(select(Moment).where(Moment.session_id == session_id)).all()
        for m in moments: db.delete(m)
        
        quotes = db.exec(select(Quote).where(Quote.session_id == session_id)).all()
        for q in quotes: db.delete(q)
            
        db.add(s)
        db.commit()
        campaign_id = s.campaign_id
        
        path = ""
        try:
             path = json.loads(s.audio_file_paths)[0]
        except:
             path = s.audio_file_paths
        
        with open(path, 'r', encoding='utf-8') as f:
            text_content = f.read()

    try:
        # Build Prompt
        prompt_context = ""
        with Session(db_engine) as db:
            prompt_context = construct_prompt_context(db, campaign_id, existing_summary=existing_summary)
            
        # Generate
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-flash-latest",
            contents=[SYSTEM_PROMPT + prompt_context, f"TRANSCRIPT:\n{text_content}"],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SessionAnalysisSchema
            )
        )
        
        if response.parsed:
            response_data = response.parsed.model_dump()
        else:
            response_data = clean_and_parse_json(response.text)
            
        with Session(db_engine) as db:
            _save_analysis_to_db(session_id, response_data, db)
            
    except Exception as e:
        print(f"Text Pipeline Error: {e}")
        with Session(db_engine) as db:
            s = db.get(DBSessionEntry, session_id)
            if s:
                s.status = ProcessingStatus.ERROR
                s.error_message = str(e)
                db.add(s)
                db.commit()

async def generate_campaign_summary_pipeline(campaign_id: int, db_engine):
    """
    Pipeline to generate a summary for an entire campaign based on sessions and personas.
    """
    print(f"Starting Campaign Summary pipeline for campaign {campaign_id}", flush=True)
    
    session_context = ""
    persona_context = ""
    
    with Session(db_engine) as db:
        # Fetch Campaign
        campaign = db.get(Campaign, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found")
            return

        # Fetch Sessions (only completed ones with summaries)
        sessions = db.exec(select(DBSessionEntry).where(DBSessionEntry.campaign_id == campaign_id).order_by(DBSessionEntry.created_at)).all()
        
        # Fetch Personas
        personas = db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()

        if not sessions:
            print("No sessions found for campaign summary.")
            return

        session_context = "SESSION SUMMARIES (Chronological):\n"
        for s in sessions:
            session_context += f"\n--- Session: {s.name} ---\n"
            if s.summary: session_context += f"Summary: {s.summary}\n"
            
            highs = [h.text for h in s.highlights if h.type == 'high']
            if highs: session_context += "Highlights:\n" + "\n".join(['- ' + t for t in highs]) + "\n"
            
            lows = [h.text for h in s.highlights if h.type == 'low']
            if lows: session_context += "Low Points:\n" + "\n".join(['- ' + t for t in lows]) + "\n"
        
        persona_context = "DRAMATIS PERSONAE:\n"
        for p in personas:
            persona_context += f"- {p.name} ({p.role}): {p.description or 'No desc'}"
            if p.summary: persona_context += f" [Arc: {p.summary}]"
            persona_context += "\n"

    # Construct Prompt
    prompt = f"""
You are an expert D&D Campaign Historian. Your task is to write a comprehensive and engaging summary of the campaign so far.
Use the provided session summaries and character data to construct a narrative overview.

{session_context}

{persona_context}

INSTRUCTIONS:
1.  **Tagline**: Write a short, catchy subtitle that captures the essence of this campaign.
2.  **Narrative Arc**: Identify the main plot threads and how they have developed across sessions.
3.  **Character Growth**: Mention key character moments or arcs if they are prominent.
4.  **Tone**: Keep the tone epic and engaging, suitable for a "Previously on..." recap.
5.  **Recap**: Ensure to name all the Player Characters (PCs) and their roles.
6.  **Structure**:
    -   **The Story So Far**: A cohesive narrative of every event encountered so far. Make this lengthy and detailed with multiple paragraphs.
    -   **Key Events**: Important events or milestones.
    -   **Ongoing Conflicts**: Ongoing conflicts or themes.
    -   **PC Highlights**: Best moment of the campaign for each Player Character (PC).
    -   **MVP (Most Valuable Persona)**: Subjectively pick a character who has been central to the plot so far based on the events and quickly justify why.

"""

    try:
        if not client: raise Exception("Gemini Client not initialized")
        
        print("Sending Campaign Config prompt to Gemini...")
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-flash-latest", # Fast model is fine for text summarization
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CampaignSummarySchema
            )
        )
        
        data = {}
        if response.parsed:
             # If parsed successfully by the SDK
             data = response.parsed.model_dump()
        else:
             # Fallback
             data = clean_and_parse_json(response.text)
        
        with Session(db_engine) as db:
            c = db.get(Campaign, campaign_id)
            if c:
                c.description = data.get('tagline', '')
                
                # Format structured data into Markdown
                md_output = f"# The Story So Far\n{data.get('summary', '')}\n\n"
                
                if data.get('key_events'):
                    md_output += "## Key Events\n" + "\n".join([f"- {e}" for e in data['key_events']]) + "\n\n"
                    
                if data.get('ongoing_conflicts'):
                    md_output += "## Ongoing Conflicts\n" + "\n".join([f"- {c}" for c in data['ongoing_conflicts']]) + "\n\n"
                    
                if data.get('pc_highlights'):
                    md_output += "## PC Highlights\n"
                    for h in data['pc_highlights']:
                        # Handle both dict and object (pydantic dump)
                        name = h.get('name') if isinstance(h, dict) else h.name
                        text = h.get('highlight') if isinstance(h, dict) else h.highlight
                        md_output += f"- **{name}**: {text}\n"
                    md_output += "\n"
                    
                if data.get('mvp'):
                    mvp = data['mvp']
                    name = mvp.get('name') if isinstance(mvp, dict) else mvp.name
                    reason = mvp.get('reason') if isinstance(mvp, dict) else mvp.reason
                    md_output += f"## MVP: {name}\n{reason}\n"

                c.summary = md_output
                db.add(c)
                db.commit()
                print(f"Campaign {campaign_id} summary updated.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Campaign Summary Failed: {e}")

async def refine_session_summary(session_id: int, db_engine) -> str:
    """
    Refines the session summary using Gemini and known personas.
    Returns the new summary string.
    """
    print(f"Refining summary for session {session_id}")
    
    current_summary = ""
    campaign_id = 0
    
    with Session(db_engine) as db:
        s = db.get(DBSessionEntry, session_id)
        if not s or not s.summary: return ""
        current_summary = s.summary
        campaign_id = s.campaign_id

        # Build Prompt
        prompt_context = construct_prompt_context(db, campaign_id)
        
    full_prompt = f"""
{REFINE_SUMMARY_PROMPT}

{prompt_context}

### CURRENT SUMMARY TO REFINE:
{current_summary}
"""

    if not client: raise Exception("Gemini Client not initialized")
    
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-flash-latest",
        contents=[full_prompt],
        config=types.GenerateContentConfig(
            response_mime_type="text/plain"
        )
    )
    
    new_summary = response.text.strip()
    
    # Save back to DB
    with Session(db_engine) as db:
        s = db.get(DBSessionEntry, session_id)
        if s:
            s.summary = new_summary
            db.add(s)
            db.commit()
            
    return new_summary
