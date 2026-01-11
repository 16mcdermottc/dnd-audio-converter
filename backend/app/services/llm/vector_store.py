
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlmodel import Session, select
import ollama

from ...core.config import settings
from ...models.models import VectorStore, Campaign, Session as DBSession, Persona, Highlight, Quote, Moment

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self, db: Session):
        self.db = db
        self.model = settings.OLLAMA_MODEL

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text string using Ollama."""
        try:
            response = ollama.embeddings(model=self.model, prompt=text)
            return response['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Return empty list or raise? raising is better to catch failures
            raise e

    def save_chunk(self, campaign_id: int, source_type: str, source_id: int, text: str):
        """Generate embedding and save chunk to VectorStore."""
        if not text or len(text.strip()) < 10:
            return  # Skip empty or too short chunks

        embedding = self.generate_embedding(text)
        
        # Check if exists to update instead of duplicate
        existing = self.db.exec(
            select(VectorStore)
            .where(VectorStore.campaign_id == campaign_id)
            .where(VectorStore.source_type == source_type)
            .where(VectorStore.source_id == source_id)
            .where(VectorStore.text_content == text) # Simple dedup
        ).first()

        if existing:
            return

        vector_entry = VectorStore(
            campaign_id=campaign_id,
            source_type=source_type,
            source_id=source_id,
            text_content=text,
            embedding_json=json.dumps(embedding)
        )
        self.db.add(vector_entry)
        self.db.commit()

    def search(self, query: str, campaign_id: int, limit: int = 5) -> List[VectorStore]:
        """
        Semantic search for relevant chunks.
        Loads all campaign vectors (fine for small <10k chunks) and computes cosine similarity.
        """
        query_embedding = self.generate_embedding(query)
        q_vec = np.array(query_embedding)
        q_norm = np.linalg.norm(q_vec)

        # distinct selection to avoid massive memory usage if we had millions, 
        # but here we fetch all for the campaign.
        # OPTIMIZATION: In production, use pgvector or separate vector DB. 
        # For local < 1GB text, in-memory numpy is insanely fast.
        
        chunks = self.db.exec(
            select(VectorStore).where(VectorStore.campaign_id == campaign_id)
        ).all()

        if not chunks:
            return []

        scores = []
        for chunk in chunks:
            vec = np.array(json.loads(chunk.embedding_json))
            denom = (np.linalg.norm(vec) * q_norm)
            if denom == 0:
                similarity = 0
            else:
                similarity = np.dot(vec, q_vec) / denom
            scores.append((similarity, chunk))

        # Sort by similarity desc
        scores.sort(key=lambda x: x[0], reverse=True)
        
        return [s[1] for s in scores[:limit]]

    def reindex_campaign(self, campaign_id: int):
        """
        Clear and rebuild index for a campaign.
        Ideally run this as a background task.
        """
        # Delete existing
        existing = self.db.exec(select(VectorStore).where(VectorStore.campaign_id == campaign_id)).all()
        for e in existing:
            self.db.delete(e)
        self.db.commit()

        # Index Personas
        personas = self.db.exec(select(Persona).where(Persona.campaign_id == campaign_id)).all()
        for p in personas:
            # Create a rich text representation
            details = [f"Role: {p.role}"]
            if p.gender: details.append(f"Gender: {p.gender}")
            if p.race: details.append(f"Race: {p.race}")
            if p.class_name: details.append(f"Class: {p.class_name}")
            
            text = f"Character: {p.name}. {' | '.join(details)}. {p.description or ''} {p.summary or ''}"
            self.save_chunk(campaign_id, "persona", p.id, text)

        # Index Sessions
        sessions = self.db.exec(select(DBSession).where(DBSession.campaign_id == campaign_id)).all()
        for s in sessions:
            # Summary
            if s.summary:
                self.save_chunk(campaign_id, "session_summary", s.id, f"Session {s.name} Summary: {s.summary}")
            
            # Moments
            for m in s.moments:
                self.save_chunk(campaign_id, "moment", m.id, f"Moment in {s.name}: {m.title} - {m.description}")
            
            # Quotes
            for q in s.quotes:
                speaker = q.speaker_name or "Unknown"
                self.save_chunk(campaign_id, "quote", q.id, f"Quote in {s.name} by {speaker}: {q.text}")
                
            # Highlights
            for h in s.highlights:
                self.save_chunk(campaign_id, "highlight", h.id, f"Highlight in {s.name}: {h.text}")
                
        logger.info(f"Re-indexing complete for campaign {campaign_id}")

