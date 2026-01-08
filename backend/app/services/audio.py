import os
import subprocess
import asyncio
from pathlib import Path
from typing import List, Tuple
from ..core.config import settings

def _compress_audio(input_path: str) -> str:
    """Compress/Convert audio using ffmpeg."""
    print(f"Compressing/Converting file: {input_path}")
    output_path = str(Path(input_path).with_suffix('.mp3'))
    
    if output_path == input_path:
        output_path = input_path.replace(".mp3", ".compressed.mp3")

    cmd = [
        settings.FFMPEG_PATH, "-y", "-i", input_path, 
        "-ac", "1", "-b:a", "32k", "-map", "a",
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

async def prepare_audio_files(audio_paths: List[str]) -> Tuple[List[str], List[str]]:
    """Converts files if necessary and returns list of paths to upload + temp files to clean."""
    final_paths = []
    temp_files = []

    for path in audio_paths:
        if not os.path.exists(path):
            print(f"WARNING: File not found: {path}")
            continue

        file_size = os.path.getsize(path)
        ext = os.path.splitext(path)[1].lower()
        
        # Convert if wav or > 1.8GB
        needs_conversion = (ext == ".wav") or (file_size > 1.8 * 1024 * 1024 * 1024)

        if needs_conversion:
            try:
                # We offload the blocking subprocess to a thread if possible, 
                # but for simplicity in this refactor we keep it synchronous or use asyncio.to_thread
                converted_path = await asyncio.to_thread(_compress_audio, path)
                final_paths.append(converted_path)
                temp_files.append(converted_path)
            except Exception as e:
                print(f"Conversion failed for {path}: {e}")
                # Fallback to original if conversion fails? Or just fail?
                # For now re-raise to be safe
                raise e
        else:
            final_paths.append(path)
            
    return final_paths, temp_files
