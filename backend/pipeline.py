
import os
import time
import json
import subprocess
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from sqlmodel import Session, select, col
from .models import Session as DBSessionEntry, Transcript, Persona, Moment, Highlight, Quote, Campaign
import re
import difflib
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GENAI_API_KEY:
    client = genai.Client(api_key=GENAI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not found in .env")

def upload_to_gemini(path, mime_type="audio/mp3"):
    """Uploads the given file to Gemini."""
    if not client:
        raise Exception("Gemini Client not initialized")
        
    print(f"Uploading file: {path}")
    # The new SDK uses client.files.upload
    file_obj = client.files.upload(file=path, config={'mime_type': mime_type})
    print(f"Uploaded file '{file_obj.name}' as: {file_obj.uri}")
    return file_obj

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for f in files:
        attempts = 0
        while True:
            attempts += 1
            if attempts > 120: # 10 minutes timeout
                 raise Exception(f"Timeout waiting for file {f.name} to process")
            
            # Re-fetch file to check status
            current_file = client.files.get(name=f.name)
            if current_file.state == "ACTIVE":
                break
            elif current_file.state == "FAILED":
                raise Exception(f"File {current_file.name} failed to process")
            
            print(".", end="", flush=True)
            time.sleep(5)
    print("...all files ready")

# --- Pydantic Schemas for Structured Output ---

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
    highlights: List[str] = Field(default_factory=list, description="Character-specific achievements")
    low_points: List[str] = Field(default_factory=list, description="Character-specific failures")
    # We don't ask for quotes here to avoid duplication. We will infer 'Persona Quotes' from the main list by matching speaker names.

class MomentSchema(BaseModel):
    title: str
    description: str
    timestamp: Optional[str] = None

class SessionAnalysis(BaseModel):
    summary: str = Field(description="A detailed narrative summary (at least 1000 words).")
    highlights: List[str] = Field(description="General session highlights.")
    low_points: List[str] = Field(description="General session low points.")
    memorable_quotes: List[QuoteSchema] = Field(description="List of funny or memorable quotes.")
    personas: List[PersonaSchema] = Field(description="List of all characters identified.")
    moments: List[MomentSchema] = Field(description="Key epic or funny moments.")

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

### OUTPUT REQUIREMENTS
-   **Summary**: Comprehensive, at least 1000 words.
-   **Personas**: extract details for every character that speaks or is important.

"""


# Ensure ffmpeg is in the path for this process
if "H:\\ffmpeg\\bin" not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + "H:\\ffmpeg\\bin"

def compress_audio(input_path):
    """Compress/Convert audio using ffmpeg."""
    print(f"Compressing/Converting file: {input_path}")
    # Always output to .mp3 for consistency and compression
    # If input is already .mp3, we might re-encode if it's too large, but for now we assume this is called for wav or large files
    output_path = str(Path(input_path).with_suffix('.mp3'))
    
    # If output path is same as input (e.g. replacing), rename input temporarily? 
    # Actually, for safety, let's create a specific converted path if it conflicts or just overwrite if allowed.
    # To avoid overwriting source files (esp if local), we should probably write to a temp or upload dir if it's a local import.
    # But for simplicity, let's append .compressed.mp3 if we want to differentiate, or just .mp3 if we are converting types.
    
    if output_path == input_path:
        output_path = input_path.replace(".mp3", ".compressed.mp3")

    # Command: Convert to mono, 32k bitrate mp3
    cmd = [
        "ffmpeg", "-y", "-i", input_path, 
        "-ac", "1", "-b:a", "32k", "-map", "a",
        output_path
    ]
    
    import subprocess
    subprocess.run(cmd, check=True)
    return output_path

def clean_and_parse_json(text):
    """Cleans and parses JSON from LLM response."""
    if not text:
        raise ValueError("Empty response text")
    
    # Remove markdown code blocks
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    
    # Fix invalid escape sequences (e.g. \s instead of \\s or \\)
    # Matches backslash not followed by valid escape chars
    text = re.sub(r'\\(?![/bfnrtu"\\\\])', r'\\\\', text)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Attempt to recover JSON
        # 1. Check if it's wrapped in a list and we want a dict (or just extract the first object)
        # Find first {
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
             try:
                 candidate = text[start:end+1]
                 return json.loads(candidate)
             except:
                 pass
        
        # 2. Check if it's a list that needs unwrapping
        start_list = text.find('[')
        end_list = text.rfind(']')
        if start_list != -1 and end_list != -1:
            try:
                candidate = text[start_list:end_list+1]
                data = json.loads(candidate)
                if isinstance(data, list) and len(data) > 0:
                    return data[0] # Return first item
                return data
            except:
                pass
                
        raise

def process_session_pipeline(session_id: int, db_engine):
    """
    Main pipeline function to process a session.
    """
    print(f"Starting pipeline for session {session_id}", flush=True)
    
    with Session(db_engine) as db:
        session_entry = db.get(DBSessionEntry, session_id)
        if not session_entry:
            print(f"Session {session_id} not found")
            return
            
        try:
            session_entry.status = "processing"
            db.add(session_entry)
            db.commit()

            if not client:
                 raise Exception("Gemini Client not initialized")



            # 1. Prepare Files
            try:
                # Direct load for trusted DB content
                audio_paths = json.loads(session_entry.audio_file_paths)
            except:
                try:
                    audio_paths = clean_and_parse_json(session_entry.audio_file_paths)
                except:
                     audio_paths = [session_entry.audio_file_paths]

            final_paths_to_upload = []
            temp_files_to_cleanup = []

            for audio_path in audio_paths:
                if not os.path.exists(audio_path):
                    print(f"WARNING: File not found: {audio_path}")
                    continue

                file_size_bytes = os.path.getsize(audio_path)
                ext = os.path.splitext(audio_path)[1].lower()
                
                # Check if we need conversion
                # 1. It's a .wav file (always convert)
                # 2. It's too big (> 1.8GB)
                
                needs_conversion = (ext == ".wav") or (file_size_bytes > 1.8 * 1024 * 1024 * 1024)
                
                if needs_conversion:
                    print(f"File {audio_path} needs conversion (wav or large). Processing...")
                    try:
                        # We should output to the uploads directory to avoid cluttering user folders if local
                        # Get filename
                        filename = os.path.basename(audio_path)
                        safe_name = f"{os.path.splitext(filename)[0]}.mp3"
                        # Use a dedicated temp path or just uploads/
                        # Let's save alongside for now but maybe we should ensure it goes to uploads if it's a conversion result
                        # Actually, keeping it simple: use the compress_audio helper which puts it alongside or we can modify it.
                        
                        # Let's modify logic slightly: if we convert, we return the new path.
                        # Since `compress_audio` as currently defined above puts it alongside, let's stick to that for now, 
                        # but if it fails we catch it.
                        
                        converted_path = compress_audio(audio_path)
                        final_paths_to_upload.append(converted_path)
                        temp_files_to_cleanup.append(converted_path)
                    except Exception as e:
                        print(f"Conversion failed for {audio_path}: {e}")
                        # If it was a wav, we might fail upload if we don't convert? 
                        # Actually Gemini supports WAV, but user specifically asked to convert .wav to .mp3.
                        raise e
                else:
                    final_paths_to_upload.append(audio_path)

            gemini_files = []
            
            # 2. Upload to Gemini
            for upload_path in final_paths_to_upload:
                # Determine mime type roughly
                mime_type = "audio/mpeg"
                if upload_path.endswith(".wav"):
                    mime_type = "audio/wav"
                elif upload_path.endswith(".m4a"):
                     mime_type = "audio/mp4" 

                g_file = upload_to_gemini(upload_path, mime_type=mime_type)
                gemini_files.append(g_file)

            # Cleanup temporary converted files (only if we created them)
            # We do this AFTER upload
             
            # ... continue pipeline ...

            # 2. Wait for processing
            wait_for_files_active(gemini_files)
            
            # 3. Generate Content with Fallback
            print("Sending prompt to Gemini with multiple files...")
            
            # New SDK content structure

            # Define system_instruction before the loop
            video_prompt = "You are processing an audio/video file. " + SYSTEM_PROMPT
            
            # Fetch existing personas to guide the AI
            existing_personas = db.exec(select(Persona).where(Persona.campaign_id == session_entry.campaign_id)).all()
            
            pcs = [p for p in existing_personas if p.role == 'PC']
            npcs = [p for p in existing_personas if p.role != 'PC']
            
            def format_p(p):
                # Include voice and visual description to help ID
                desc = f"- {p.name}" 
                if p.voice_description:
                    desc += f" (Voice: {p.voice_description})"
                if p.description:
                    desc += f" [Desc: {p.description[:100]}...]" # Truncate long desc
                return desc

            prompt_context = ""
            if pcs:
                prompt_context += "\nKNOWN PLAYER CHARACTERS (PCs) - These are the MAIN speakers:\n" + "\n".join([format_p(p) for p in pcs])
            if npcs:
                prompt_context += "\n\nKNOWN NPCs:\n" + "\n".join([format_p(p) for p in npcs])

            system_instruction = video_prompt
            if prompt_context:
                system_instruction += f"""
\n\n### CONTEXT: EXISTING PERSONAS ###
{prompt_context}

CRITICAL INSTRUCTIONS FOR PERSONAS:
1. USE EXISTING PERSONAS: Compare speakers to the 'Known PCs' list first. If a name sounds phonetically similar (e.g. 'Emryl' vs 'Imryll', 'Brend' vs 'Brand'), it IS the existing character. MERGE THEM.
2. VOICE ID: Use the 'Voice' descriptions provided above to help identify who is speaking.
3. NEW CHARACTERS: Only create a NEW persona if the name and voice are distinctly different from everyone in the list.
4. ROLE: Mark new main characters as 'PC' and others as 'NPC'.
5. VOICE DESCRIPTION UPDATES: For known personas, ONLY return a 'voice_description' if one is not currently provided, OR if the provided description is significantly inaccurate based on the current audio.
"""
            
            # List of models to try in order of preference
            models_to_try = [
                "gemini-flash-latest", # Latest Flash
                "gemini-3-flash-preview", # New Flash
                "gemini-3-pro-preview",   # High Context (2M)
                "gemini-pro-latest"       # Stable Pro
            ]

            response = None
            
            for model_name in models_to_try:
                print(f"[Session {session_id}] Trying model: {model_name}")
                
                # Retry loop for specific model (handling 429s)
                # Large files (>1M tokens) require Pro models which have strict rate limits
                # We need to be very patient.
                max_retries = 9
                retry_delay = 30 # Start with 30 seconds wait
                
                for attempt in range(max_retries + 1):
                    try:
                        # Construct contents for the generate_content call
                        contents_parts = []
                        for gf in gemini_files:
                            contents_parts.append(
                                types.Part.from_uri(
                                    file_uri=gf.uri,
                                    mime_type=gf.mime_type
                                )
                            )
                        

                        response = client.models.generate_content(
                            model=model_name,
                            contents=[
                                types.Content(
                                    role="user",
                                    parts=contents_parts
                                )
                            ],
                            config=types.GenerateContentConfig(
                                system_instruction=system_instruction,
                                response_mime_type="application/json",
                                response_schema=SessionAnalysis
                            )
                        )
                        
                        # Validate JSON
                        try:
                            # With response_schema, response.parsed should be available/reliable
                            if response.parsed:
                                # Convert Pydantic model to dict
                                data = response.parsed.model_dump()
                            else:
                                # Fallback to manual parsing if parsed isn't populated (SDK version dependent)
                                data = clean_and_parse_json(response.text)
                            
                            print(f"[Session {session_id}] Success with model: {model_name}")
                            break 
                        except Exception as json_e:
                            print(f"[Session {session_id}] JSON Parse/Validation failed for {model_name}: {json_e}")
                            if attempt < max_retries:
                                continue 
                            else:
                                raise json_e 

                    except Exception as e:
                        if isinstance(e, ClientError):
                            if e.code == 429: 
                                if attempt < max_retries:
                                    print(f"[Session {session_id}] Rate limited on {model_name}. Retrying in {retry_delay}s...")
                                    time.sleep(retry_delay)
                                    retry_delay = min(retry_delay * 1.5, 300) 
                                    continue
                                else:
                                    print(f"[Session {session_id}] Rate limited. Moving to next model...")
                                    break 
                            
                            elif e.code == 404: 
                                print(f"[Session {session_id}] Model {model_name} not found. Skipping.")
                                break 
                            
                            elif e.code == 400: 
                                print(f"[Session {session_id}] Model {model_name} failed with 400. Trying next model...")
                                break 
                        
                        print(f"[Session {session_id}] Error with {model_name}: {e}") 
                        break 

                if response and 'data' in locals() and data:
                    break 
            
            if not response or 'data' not in locals() or not data:
                raise Exception(f"Failed to generate valid content with all attempted models: {models_to_try}")
            
            print("Received valid response from Gemini.")
            
            # 5. Save to DB
            # data is already parsed

            
            # 5. Save to DB
            save_content_to_db(session_id, data, db)
                
            # Helper to ensure data is string
            def format_field(data):
                if isinstance(data, list):
                    # Handle list of refs or strings
                    formatted = []
                    for item in data:
                        if isinstance(item, dict) and "quote" in item and "speaker" in item:
                            formatted.append(f"\"{item['quote']}\" - {item['speaker']}")
                        elif isinstance(item, str):
                            formatted.append(item)
                        else:
                            formatted.append(str(item))
                    return "\n".join(formatted)
                return str(data) if data else ""

            session_entry.status = "completed"
            session_entry.summary = data.get("summary", "No summary generated.")
            session_entry.highlights = format_field(data.get("highlights"))
            session_entry.low_points = format_field(data.get("low_points"))
            session_entry.memorable_quotes = "" # We now use relational table
            
            db.add(session_entry)
            db.commit()
            
            db.add(session_entry)
            db.commit()
            print(f"Session {session_id} processing completed.")

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error processing session {session_id}: {e}")
            session_entry.status = "error"
            db.add(session_entry)
            db.commit()
        
        finally:
            # Cleanup Gemini files to prevent quota exhaustion
            if 'gemini_files' in locals() and gemini_files:
                print("Cleaning up Gemini files...")
                for gf in gemini_files:
                    try:
                        client.files.delete(name=gf.name)
                        print(f"Deleted remote file: {gf.name}")
                    except Exception as e:
                        print(f"Failed to delete remote file {gf.name}: {e}")
            
            # Cleanup local temporary converted files
            if 'temp_files_to_cleanup' in locals() and temp_files_to_cleanup:
                print("Cleaning up temporary local files...")
                for tf in temp_files_to_cleanup:
                    try:
                        if os.path.exists(tf):
                            os.remove(tf)
                            print(f"Deleted local file: {tf}")
                    except Exception as e:
                         print(f"Failed to delete local file {tf}: {e}")

def save_content_to_db(session_id: int, data: dict, db):
    # Get campaign_id from session
    session_entry = db.get(DBSessionEntry, session_id)
    campaign_id = session_entry.campaign_id
    
    # Personas (Upsert Logic)
    for p_data in data.get("personas", []):
        # 1. Try to match by Exact Name (Case Insensitive)
        statement = select(Persona).where(col(Persona.name).ilike(p_data["name"])).where(Persona.campaign_id == campaign_id)
        existing_persona = db.exec(statement).first()
        
        # 2. If no match, try to match by checking if new name is a substring of existing names (e.g. "Gwen" -> "Gwendolyn")
        # This is expensive if there are many personas, but fine for a campaign
        if not existing_persona:
             all_campaign_personas = db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()
             for cp in all_campaign_personas:
                 # Check if "Gwen" is in "Gwendolyn" or vice versa
                 if p_data["name"].lower() in cp.name.lower() or cp.name.lower() in p_data["name"].lower():
                     existing_persona = cp
                     break
                 
                 # Fuzzy Match (Sequence Matcher)
                 # Ratio > 0.85 indicates a very strong similarity (e.g. "Aragorn" vs "Arragorn")
                 ratio = difflib.SequenceMatcher(None, p_data["name"].lower(), cp.name.lower()).ratio()
                 if ratio > 0.85:
                     print(f"Fuzzy match found: {p_data['name']} ~= {cp.name} ({ratio:.2f})")
                     existing_persona = cp
                     break

        voice_desc = p_data.get("voice_description")
        
        if existing_persona:
            if voice_desc:
                existing_persona.voice_description = voice_desc
            
            # Update player name if found and not set
            if p_data.get("player_name") and not existing_persona.player_name:
                existing_persona.player_name = p_data.get("player_name")
            
            db.add(existing_persona)
            current_persona_id = existing_persona.id
        else:
             new_persona = Persona(
                name=p_data["name"],
                role=p_data["role"],
                description=p_data["description"],
                voice_description=voice_desc,
                session_id=session_id,
                campaign_id=campaign_id,
                player_name=p_data.get("player_name")
            )
             db.add(new_persona)
             db.commit() # Need ID for foreign keys
             db.refresh(new_persona)
             current_persona_id = new_persona.id

        # Save Highlights (List of objects)
        highlights_data = p_data.get("highlights", [])
        if isinstance(highlights_data, list):
            for item in highlights_data:
                # Expecting string usually, but could be dict from AI
                content = str(item)
                if isinstance(item, dict) and "text" in item:
                     content = item["text"]
                
                new_hl = Highlight(
                    text=content,
                    type="high",
                    session_id=session_id,
                    persona_id=current_persona_id,
                    campaign_id=campaign_id
                )
                db.add(new_hl)

        # Save Low Points
        low_points_data = p_data.get("low_points", [])
        if isinstance(low_points_data, list):
             for item in low_points_data:
                content = str(item)
                new_lp = Highlight(
                    text=content,
                    type="low",
                    session_id=session_id,
                    persona_id=current_persona_id,
                    campaign_id=campaign_id
                )
                db.add(new_lp)
        


    # Save Main Session Quotes
    for q_data in data.get("memorable_quotes", []):
        # Handle dict (QuoteSchema)
        if isinstance(q_data, dict):
            quote_text = q_data.get("quote", "")
            speaker = q_data.get("speaker", "Unknown")
            reasoning = q_data.get("reasoning", "")
            
            # Find persona match
            persona_id = None
            if speaker:
                # Try simple match
                persona_match = db.exec(select(Persona).where(col(Persona.name).ilike(speaker)).where(Persona.campaign_id == campaign_id)).first()
                if persona_match:
                    persona_id = persona_match.id
            
            new_qt = Quote(
                text=quote_text,
                speaker_name=speaker,
                session_id=session_id,
                persona_id=persona_id,
                campaign_id=campaign_id
            )
            # We could store reasoning if we added a column, but for now we just use it for the AI's internal process
            db.add(new_qt)
            
    # Moments
    for m_data in data.get("moments", []):
        new_moment = Moment(
            session_id=session_id,
            title=m_data["title"],
            description=m_data["description"],
            timestamp=m_data["timestamp"]
        )
        db.add(new_moment)
    
    db.commit()

def process_text_session_pipeline(session_id: int, db_engine):
    print(f"Starting TEXT pipeline for session {session_id}")
    with Session(db_engine) as db:
        session_entry = db.get(DBSessionEntry, session_id)
        if not session_entry:
            return
            
        try:
            session_entry.status = "processing"
            db.add(session_entry)
            db.commit()

            if not client:
                 raise Exception("Gemini Client not initialized")

            # For text sessions, audio_file_paths contains the file path to the text content
            try:
                text_paths = json.loads(session_entry.audio_file_paths)
                text_path = text_paths[0]
            except:
                text_path = session_entry.audio_file_paths

            with open(text_path, 'r', encoding='utf-8') as f:
                text_content = f.read()

            # Generate Content with Fallback
            response = None
            models_to_try = [
                "gemini-flash-latest",
            ]
            
            for model_name in models_to_try:
                print(f"Trying model: {model_name}")
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[SYSTEM_PROMPT, f"Here is the text summary (or transcript) of the session:\n\n{text_content}"],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=SessionAnalysis
                        )
                    )
                    
                    # Validate JSON
                    try:
                        if response.parsed:
                           result_json = response.parsed.model_dump()
                        else:
                           result_json = clean_and_parse_json(response.text)
                        
                        if not isinstance(result_json, dict):
                            raise ValueError(f"Expected dictionary, got {type(result_json)}")
                        
                        print(f"Success with model: {model_name}")
                        break
                    except Exception as json_e:
                        print(f"JSON Parse/Validation failed for {model_name}: {json_e}")
                        # Next model
                        response = None
                        continue

                except ClientError as e:
                    if e.code == 429:
                        print(f"Rate limited on {model_name}. Trying next model...")
                        time.sleep(1)
                        continue
                    elif e.code == 404:
                         print(f"Model {model_name} not found. Skipping.")
                         continue
                    else:
                        print(f"Error with {model_name}: {e}")
                        continue
                        
            if not response or 'result_json' not in locals() or not result_json:
                 raise Exception(f"Failed to generate content with all attempted models: {models_to_try}")
            
            # Already parsed
            # try:
            #     result_json = clean_and_parse_json(response.text)
            # except json.JSONDecodeError as e:
            #     print(f"JSON Decode Error: {e}") 
            #     raise e
            save_content_to_db(session_id, result_json, db)
            
            # Helper to ensure data is string
            def format_field(data):
                if isinstance(data, list):
                    # Handle list of refs or strings
                    formatted = []
                    for item in data:
                        if isinstance(item, dict) and "quote" in item and "speaker" in item:
                            formatted.append(f"\"{item['quote']}\" - {item['speaker']}")
                        elif isinstance(item, str):
                            formatted.append(item)
                        else:
                            formatted.append(str(item))
                    return "\n".join(formatted)
                return str(data) if data else ""

            session_entry.status = "completed"
            session_entry.summary = result_json.get("summary", "No summary generated.")
            session_entry.highlights = format_field(result_json.get("highlights"))
            session_entry.low_points = format_field(result_json.get("low_points"))
            session_entry.memorable_quotes = "" # Use relational
            
            db.add(session_entry)
            db.commit()
            print(f"Session {session_id} processed successfully")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error processing session {session_id}: {e}")
            session_entry.status = "error"
            db.add(session_entry)
            db.commit()

def generate_campaign_summary_pipeline(campaign_id: int, db_engine):
    """
    Pipeline to generate a summary for an entire campaign based on sessions and personas.
    """
    print(f"Starting Campaign Summary pipeline for campaign {campaign_id}", flush=True)
    
    with Session(db_engine) as db:
        # Fetch Campaign
        from .models import Campaign
        campaign = db.get(Campaign, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found")
            return

        # Fetch Sessions (only completed ones with summaries)
        sessions = db.exec(select(DBSessionEntry).where(DBSessionEntry.campaign_id == campaign_id).order_by(DBSessionEntry.created_at)).all()
        
        # Fetch Personas
        personas = db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()

        # Prepare Context
        if not sessions:
            print("No sessions found for campaign summary.")
            return

        session_context = "SESSION SUMMARIES (Chronological):\n"
        for s in sessions:
            session_context += f"\n--- Session: {s.name} ---\n"
            if s.summary:
                session_context += f"Summary: {s.summary}\n"
            if s.highlights:
                session_context += f"Highlights:\n{s.highlights}\n"
            if s.memorable_quotes:
                session_context += f"Quotes:\n{s.memorable_quotes}\n"
        
        persona_context = "DRAMATIS PERSONAE:\n"
        for p in personas:
            persona_context += f"- {p.name} ({p.role}): {p.description or 'No desc'}"
            if p.summary:
                 persona_context += f" [Arc: {p.summary}]"
            persona_context += "\n"

        # Construct Prompt
        prompt = f"""
You are an expert D&D Campaign Historian. Your task is to write a comprehensive and engaging summary of the campaign so far.
Use the provided session summaries and character data to construct a narrative overview.

{session_context}

{persona_context}

INSTRUCTIONS:
1.  **Narrative Arc**: Identify the main plot threads and how they have developed across sessions.
2.  **Character Growth**: Mention key character moments or arcs if they are prominent.
3.  **Tone**: Keep the tone epic and engaging, suitable for a "Previously on..." recap.
3.  **Recap**: Ensure to name all the Player Characters (PCs) and their roles.
4.  **Structure**:
    -   **The Story So Far**: A cohesive narrative of every event encountered so far. Make this lengthy and detailed with multiple paragraphs.
    -   **Key Events**: Important events or milestones.
    -   **Ongoing Conflicts**: Ongoing conflicts or themes.
    -   **PC Highlights**: Best moment of the campaign for each Player Character (PC).
    -   **MVP (Most Valuable Persona)**: Subjectively pick a character who has been central to the plot so far based on the events and quickly justify why.

OUTPUT FORMAT (JSON):
{{
    "summary": "The narrative summary...",
    "events": ["Event 1", "Event 2"]
    "conflicts": ["Conflict 1", "Conflict 2"],
    "highlights": ["Highlight 1", "Highlight 2"],
    "mvp": "Most Valuable Persona"
}}
"""
        
        # Call Gemini
        if not client:
             print("Gemini Client not initialized")
             return

        model_name = "gemini-2.0-flash-exp"
        
        try:
            print(f"Generating campaign summary with {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            data = clean_and_parse_json(response.text)
            
            # Save to Campaign
            # Store formatted text in the summary field
            summary_text = data.get("summary", "")
            
            if data.get("events"):
                summary_text += "\n\n**Key Events:**\n" + "\n".join([f"- {e}" for e in data["events"]])
            
            if data.get("conflicts"):
                summary_text += "\n\n**Ongoing Conflicts:**\n" + "\n".join([f"- {c}" for c in data["conflicts"]])
            
            if data.get("highlights"):
                summary_text += "\n\n**PC Highlights:**\n" + "\n".join([f"- {h}" for h in data["highlights"]])
            
            if data.get("mvp"):
                summary_text += "\n\n**MVP:**\n" + data["mvp"]
            
            campaign.summary = summary_text
            db.add(campaign)
            db.commit()
            print(f"Campaign {campaign_id} summary updated.")

        except Exception as e:
            print(f"Error generating campaign summary: {e}")
            import traceback
            traceback.print_exc()
