import re
import json
from typing import Dict, Any

def clean_and_parse_json(text: str) -> Dict[str, Any]:
    """Cleans and parses JSON from LLM response (Fallback method)."""
    if not text:
        raise ValueError("Empty response text")
    
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\\(?![/bfnrtu"\\\\])', r'\\\\', text)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Simple recovery strategies could go here
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                return json.loads(text[start:end+1])
            except:
                pass
        raise
