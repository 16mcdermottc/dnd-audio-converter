# D&D Campaign Manager & AI Archivist

A powerful tool for Dungeon Masters and players to archive, analyze, and manage their D&D campaigns. Accurate session logs, character personas, and voice descriptions are automatically extracted from audio recordings or text summaries using Google's Gemini AI.

## Features

### 🏰 Campaign Management
- **Multi-Campaign Architecture**: Organize sessions and characters into distinct campaigns.
- **Dashboard**: Unified view of all your adventures.

### 📜 Session Archiving
- **Audio Upload**: Upload game session recordings (mp3, wav, m4a).
- **Text Import**: Import existing text summaries or logs.
- **AI Processing**: Automatically generates summaries and key moments.
- **Smart Upsert**: Intelligently merges new uploads into existing session summaries, refining the narrative rather than overwriting it.
- **Batch Upload**: Queue multiple session files for processing.

### 🎭 Persona Management
- **One-Click Extraction**: AI automatically identifies NPCs and PCs from sessions.
- **Voice Profiles**: Captures detailed voice descriptions (accent, pitch, tone) from audio.
- **Manual Management**: Create, edit, and delete personas manually.
- **Deduplication**: Automatically detects and prevents duplicate characters and highlights.

### 🤖 AI Pipeline
- **Powered by Gemini**: Uses Google's `gemini-flash-latest` (configurable) for fast, cost-effective analysis.
- **Context-Aware**: Uses existing campaign data (Personas, previous summaries) to generate accurate and consistent updates.
- **Structured Output**: Returns JSON data for easy integration.

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS 3.4
- **State/Data Fetching**: TanStack Query
- **Routing**: React Router DOM 6
- **Icons**: Lucide React
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI
- **Database**: SQLModel (SQLite/PostgreSQL compatible) via AsyncPG/AIOSQLite
- **AI SDK**: `google-genai` (Official Google GenAI SDK)
- **GraphQL**: Strawberry GraphQL
- **Dependency Management**: Poetry

### Infrastructure
- **Containerization**: Docker, Docker Compose

---

## Prerequisites

- **Docker Desktop** (Recommended)
- **Google Gemini API Key**: Get one at [aistudio.google.com](https://aistudio.google.com/).

---

## Quick Start (Docker) - Recommended

The easiest way to run the application is with Docker. This ensures FFmpeg and all system dependencies are correctly installed.

### 1. Configure Environment
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### 2. Run with Docker Compose
From the root directory:
```bash
docker-compose up --build
```

Access the application at: **http://localhost:5173**

---

## Manual Setup (Local Development)

If you prefer to run locally without Docker, you must install FFmpeg manually.

### Prerequisites (Manual)
- **Python** (v3.11+)
- **Node.js** (v18+)
- **FFmpeg**: Must be added to your system PATH.
- **Poetry**: Python dependency manager.

### 1. Backend Setup
Navigate to the backend directory and install dependencies using Poetry.

```bash
cd backend
poetry install
```

**Run the Backend:**
```bash
poetry run uvicorn app.main:app --reload --port 8000
```
*Note: The SQLite database `database.db` will be created in the root directory.*

### 2. Frontend Setup
Navigate to the frontend directory.

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

1.  **Create a Campaign**: Start by creating a new campaign from the home page.
2.  **Upload a Session**:
    *   Go to your campaign.
    *   Click "Upload Session".
    *   Choose **Audio** (for recordings) or **Text** (for logs).
    *   Select your file(s) and click Upload.
3.  **Monitor Progress**: The session status will update from `uploaded` -> `processing` -> `completed` (or `error`).
4.  **View Results**: Click on a completed session to see moments and extracted personas.
5.  **Refine**: Upload additional files to the same session to refine the summary using "Smart Upsert".
6.  **Manage Personas**: Review the "Personas" tab in your campaign to see all characters. You can edit their details or voice descriptions manually.

---

## License
GNU GPL 3.0
