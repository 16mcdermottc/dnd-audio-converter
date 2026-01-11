"""
Ollama client for local LLM chat capabilities.
Provides a D&D campaign librarian chat agent.
"""
from typing import List, Dict, Any, Optional, AsyncGenerator
import ollama
from ...core.config import settings


LIBRARIAN_SYSTEM_PROMPT = """You are Ioun, the Knowing Mistress, speaking to adventurers about their campaign:

=== START CAMPAIGN DATA ===
{context}
=== END CAMPAIGN DATA ===

Your distinct purpose is to answer questions about these specific chronicles.
1. Search the CAMPAIGN DATA above for the answer.
2. If the answer is found, speak it plainly in your wise voice ("The records show...", "It is written that...").
3. Use the RECENT CONVERSATION history to know who "he", "she", or "it" refers to.
4. If the answer is NOT in the chronicles, you must say: "That knowledge is not in my archives." and stop.
5. Do not make up facts. Do not speak about D&D rules in general. Only the story above.
6. CRITICAL: Do NOT use your internal training data to answer questions about D&D rules, lore, or characters not mentioned in the CHRONICLES.
7. If a user asks "who is X" and X is not in the CHRONICLES, say you do not know.

Be helpful, wise, and accurate, but most importantly, not too long-winded."""


def get_ollama_client() -> ollama.Client:
    """Get an Ollama client configured with the host from settings."""
    return ollama.Client(host=settings.OLLAMA_HOST)


def build_librarian_prompt(context: str) -> str:
    """Build the system prompt with injected campaign context."""
    return LIBRARIAN_SYSTEM_PROMPT.format(context=context)


def chat_with_librarian(
    messages: List[Dict[str, str]],
    context: str = "",
    model: Optional[str] = None
) -> str:
    """
    Send a chat request to the local Ollama librarian.
    
    Args:
        messages: List of message dicts with 'role' and 'content' keys
        context: RAG context to inject into the system prompt
        model: Override model (uses settings.OLLAMA_MODEL by default)
    
    Returns:
        The assistant's response content
    """
    client = get_ollama_client()
    model = model or settings.OLLAMA_MODEL
    
    # EXPLICITLY inject history into context if available
    # Mistral sometimes ignores separate message history when RAG context is huge
    history_text = ""
    if len(messages) > 1:
        # Get last 3 turns (excluding the current user message)
        recent_msgs = messages[:-1][-6:] 
        history_text = "\n\nRECENT CONVERSATION:\n" + "\n".join([f"{m['role'].upper()}: {m['content']}" for m in recent_msgs])
    
    # Build system message with context AND history
    final_context = context + history_text
    print(f"DEBUG: Constructing prompt with Context Length: {len(final_context)} chars")
    
    system_message = {
        "role": "system",
        "content": build_librarian_prompt(final_context)
    }
    
    # Prepend system message to conversation
    full_messages = [system_message] + messages
    
    # SYSTEM HACK: Append a persona reminder to the very last user message
    # This forces the model to pay attention to the persona even if the context is long
    if full_messages and full_messages[-1]['role'] == 'user':
        full_messages[-1]['content'] += "\n\n(Remember: Speak as Ioun, goddess of knowledge. Be wise and mystical.)"
    
    print(f"DEBUG: Full messages payload size: {sum(len(m['content']) for m in full_messages)} chars")
    
    try:
        response = client.chat(
            model=model,
            messages=full_messages,
            options={
                "num_ctx": settings.OLLAMA_CONTEXT_WINDOW
            }
        )
        return response['message']['content']
    except Exception as e:
        raise RuntimeError(f"Ollama chat failed: {str(e)}")


async def stream_librarian_response(
    messages: List[Dict[str, str]],
    context: str = "",
    model: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Stream a chat response from the local Ollama librarian.
    
    Yields chunks of the response as they arrive.
    """
    client = get_ollama_client()
    model = model or settings.OLLAMA_MODEL
    
    # EXPLICITLY inject history into context for streaming too
    history_text = ""
    if len(messages) > 1:
        recent_msgs = messages[:-1][-6:] 
        history_text = "\n\nRECENT CONVERSATION:\n" + "\n".join([f"{m['role'].upper()}: {m['content']}" for m in recent_msgs])
    
    system_message = {
        "role": "system",
        "content": build_librarian_prompt(context + history_text)
    }
    
    full_messages = [system_message] + messages
    
    # SYSTEM HACK: Append a persona reminder to the very last user message
    if full_messages and full_messages[-1]['role'] == 'user':
        full_messages[-1]['content'] += "\n\n(Remember: Speak as Ioun, goddess of knowledge. Be wise and mystical.)"
    
    try:
        stream = client.chat(
            model=model,
            messages=full_messages,
            stream=True,
            options={
                "num_ctx": settings.OLLAMA_CONTEXT_WINDOW
            }
        )
        
        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                yield chunk['message']['content']
    except Exception as e:
        yield f"\n[Error: {str(e)}]"


def check_ollama_status() -> Dict[str, Any]:
    """Check if Ollama is running and return status info."""
    try:
        client = get_ollama_client()
        models_response = client.list()
        
        # Handle different Ollama SDK response formats
        available_models = []
        if hasattr(models_response, 'models'):
            # Newer SDK uses object attributes
            available_models = [m.model for m in models_response.models]
        elif isinstance(models_response, dict) and 'models' in models_response:
            # Older SDK uses dict
            for m in models_response['models']:
                if isinstance(m, dict):
                    available_models.append(m.get('name', m.get('model', 'unknown')))
                else:
                    available_models.append(str(m))
        
        return {
            "status": "online",
            "host": settings.OLLAMA_HOST,
            "configured_model": settings.OLLAMA_MODEL,
            "available_models": available_models
        }
    except Exception as e:
        return {
            "status": "offline",
            "host": settings.OLLAMA_HOST,
            "configured_model": settings.OLLAMA_MODEL,
            "error": str(e)
        }

