"""
Chat router for the local D&D librarian agent powered by Ollama.
Provides endpoints for chatting with the campaign librarian.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session

from ...core.database import get_session
from ...services.llm.ollama_client import (
    chat_with_librarian,
    stream_librarian_response,
    check_ollama_status
)
from ...services.llm.vector_store import VectorService


router = APIRouter(prefix="/api/chat", tags=["chat"])


# --- Request/Response Models ---

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    campaign_id: int # Required now for RAG
    session_id: Optional[int] = None
    persona_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    context_sources: List[str]


class OllamaStatusResponse(BaseModel):
    status: str
    host: str
    configured_model: str
    available_models: Optional[List[str]] = None
    error: Optional[str] = None


# --- Endpoints ---

@router.get("/status", response_model=OllamaStatusResponse)
def get_chat_status():
    """Check if Ollama is running and available."""
    status = check_ollama_status()
    return OllamaStatusResponse(**status)


@router.post("/index/{campaign_id}")
async def index_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session)
):
    """Trigger background re-indexing of campaign data for RAG."""
    # TODO: This blocks for now because vector generation is slow. 
    # Ideally should be truly async but SQLite + Threading is tricky.
    # For now, we'll run it synchronously to ensure it finishes before they chat.
    # In production, move to Celery/ARQ.
    
    try:
        service = VectorService(db)
        service.reindex_campaign(campaign_id)
        return {"status": "success", "message": f"Campaign {campaign_id} indexed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/librarian", response_model=ChatResponse)
def chat_librarian(
    request: ChatRequest,
    db: Session = Depends(get_session)
):
    """
    Chat with the D&D campaign librarian using Vector RAG.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")
        
    last_user_message = request.messages[-1].content
    
    # 1. Retrieve relevant context via Vector Search
    vector_service = VectorService(db)
    # Search using the last message
    # TODO: Could summarize strictly the last few turns for a better query
    results = vector_service.search(last_user_message, request.campaign_id, limit=8)
    
    # 2. Build Context String
    context_parts = []
    sources = []
    
    if not results:
        # Fallback to basic context if index is empty (or user hasn't indexed yet)
        context_parts.append("No specific archives found. Answering based on general campaign knowledge if available.")
    else:
        context_parts.append(f"Found {len(results)} relevant entries in the archives across sessions and characters:")
        for r in results:
            context_parts.append(f"---\n{r.text_content}")
            sources.append(f"{r.source_type}:{r.source_id}")
            
    final_context = "\n".join(context_parts)
    
    # Track what context sources were used
    context_sources = sources
    
    # Convert messages to dict format
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    try:
        response = chat_with_librarian(messages=messages, context=final_context)
        return ChatResponse(response=response, context_sources=context_sources)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/librarian/stream")
async def stream_librarian(
    request: ChatRequest,
    db: Session = Depends(get_session)
):
    """
    Stream a chat response from the D&D campaign librarian.
    """
    last_user_message = request.messages[-1].content
    
    # 1. Retrieve relevant context
    vector_service = VectorService(db)
    results = vector_service.search(last_user_message, request.campaign_id, limit=8)
    
    context_parts = []
    if results:
        for r in results:
            context_parts.append(f"---\n{r.text_content}")
    
    final_context = "\n".join(context_parts)
    
    # Convert messages to dict format
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    async def generate():
        async for chunk in stream_librarian_response(messages=messages, context=final_context):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/context/{campaign_id}")
def get_context_preview(
    campaign_id: int,
    query: Optional[str] = "Who is the main villain?",
    db: Session = Depends(get_session)
):
    """
    Debug endpoint to view what the Vector RAG would retrieve for a query.
    """
    service = VectorService(db)
    results = service.search(query, campaign_id, limit=10)
    
    return {
        "campaign_id": campaign_id,
        "query": query,
        "results": [{"text": r.text_content, "score": "N/A"} for r in results]
    }
