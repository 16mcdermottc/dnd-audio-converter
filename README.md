# D&D Campaign Manager & AI Librarian

A powerful tool for Dungeon Masters and players to archive, analyze, and chat with their D&D campaigns. Accurate session logs, character personas, and voice descriptions are extracted from audio recordings using Google's Gemini AI, while a local RAG (Retrieval-Augmented Generation) system allows you to chat with your campaign history using **Ollama**.

## Features

### 🧠 Local AI Librarian (New!)
- **Chat with Your Campaign**: Ask specific questions ("Who did we meet in the tavern?", "What loot did Grog get?") and get grounded answers.
- **Vector RAG System**: Uses a local SQLite vector store to index everything—session summaries, character bios, quotes, and moments.
- **Infinite Context**: Intelligently retrieves only the relevant information, bypassing token limits.
- **Auto-Indexing**: Automatically updates the search index whenever you modify a character or generate a new session summary.
- **Local Privacy**: Runs entirely on your machine using **Ollama** (default model: `phi4`).

### 🏰 Campaign Management
- **Multi-Campaign Architecture**: Organize sessions and characters into distinct campaigns.
- **Dashboard**: Unified view of all your adventures.

### 📜 Session Archiving
- **Audio Upload**: Upload game session recordings (mp3, wav, m4a).
- **Text Import**: Import existing text summaries or logs.
- **Smart Upsert**: Intelligently merges new uploads into existing session summaries, refining the narrative rather than overwriting it.

### 🎭 Persona Management
- **One-Click Extraction**: AI automatically identifies NPCs and PCs from sessions.
- **Voice Profiles**: Captures detailed voice descriptions (accent, pitch, tone).
- **Auto-Indexing**: New characters are immediately searchable by the Chat Agent.
- **Deduplication**: Automatically detects and prevents duplicate characters and highlights.

### 🤖 AI Pipeline
- **Session Processing (Gemini)**: Automatically generates session summaries, key moments, and highlights.
- **Context-Aware**: Uses existing campaign data (Personas, previous summaries) to generate accurate and consistent updates.

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS 3.4
- **State/Data Fetching**: TanStack Query
- **UI Components**: Lucide React
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI
- **Database**: SQLModel (SQLite) + VectorStore (for RAG)
- **AI SDKs**: 
  - `google-genai` (Cloud Analysis)
  - `ollama` (Local Chat & Embeddings)
- **Dependency Management**: Poetry

---

## Prerequisites

1.  **Docker Desktop** (Recommended for easy setup)
2.  **Google Gemini API Key**: Get one at [aistudio.google.com](https://aistudio.google.com/).
3.  **Ollama**: Must be installed and running locally.
    *   Download from [ollama.com](https://ollama.com).
    *   Pull the required model: `ollama pull phi4`

---

## Quick Start (Docker)

1.  **Configure Environment**:
    Create a `.env` file in the `backend/` directory:
    ```env
    GEMINI_API_KEY=your_api_key_here
    OLLAMA_HOST=http://host.docker.internal:11434
    ```

2.  **Run with Docker Compose**:
    ```bash
    docker-compose up --build
    ```

3.  Access the application at: **http://localhost:5173**

---

## Manual Setup (Local Development)

If running locally (Windows/Mac/Linux), ensure **FFmpeg** is in your PATH.

### 1. Backend Setup

```bash
cd backend
poetry install
```

**Run the Backend:**
```bash
# Ensure Ollama is running first ('ollama serve' or desktop app)
poetry run uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd ../frontend
yarn install
```

**Run the Frontend:**
```bash
yarn dev
```

---

## Usage Guide

1.  **Create a Campaign**: Start a new adventure log.
2.  **Upload & Analyze**: Upload audio recordings. Gemini will transcribe and summarize them.
3.  **Chat with Ioun**: Click the chat bubble in the bottom-right.
    *   *First Time*: You may need to wait for the system to index existing sessions.
    *   *Ask Questions*: "What is the name of the dragon?", "Summarize the last session."
4.  **Refine**: Edit personas or summaries. The search index updates automatically!

## License
GNU GPL 3.0
