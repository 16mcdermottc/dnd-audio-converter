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
- **Batch Upload**: Queue multiple session files for processing.

### 🎭 Persona Management
- **One-Click Extraction**: AI automatically identifies NPCs and PCs from sessions.
- **Voice Profiles**: Captures detailed voice descriptions (accent, pitch, tone) from audio.
- **Upsert Logic**: Intelligently updates existing profiles instead of creating duplicates.
- **Manual Management**: Create, edit, and delete personas manually.

### 🤖 AI Pipeline
- **Powered by Gemini**: Uses Google's `gemini-flash-latest` for fast, cost-effective analysis (configurable).
- **Structured Output**: Returns JSON data for easy integration and display.

---

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Lucide Icons, React Markdown.
- **Backend**: FastAPI, GraphQL, Uvicorn, Python-Multipart, Aiofiles.
- **AI SDK**: `google-genai` (Official Google GenAI SDK).

---

## Prerequisites

- **Node.js** (v16+)
- **Python** (v3.10+)
- **Google Gemini API Key**: Get one at [aistudio.google.com](https://aistudio.google.com/).

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone git@github.com:16mcdermottc/dnd-audio-converter.git
cd dnd-audio-converter
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies.

```bash
cd backend
# Recommended: Create a virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

**Environment Configuration:**
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies.

```bash
cd ../frontend
npm install
```

---

## Running the Application

### Start the Backend
From the root directory:

```bash
# Run with auto-reload enabled (ensure venv is activated if used)
py -m uvicorn backend.main:app --reload --port 8000
```
*Note: The SQLite database `database.db` will be created in the root directory.*

### Start the Frontend
In a new terminal configuration (inside `frontend` directory):

```bash
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173`.

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
5.  **Manage Personas**: Review the "Personas" tab in your campaign to see all characters. You can edit their details or voice descriptions manually.

---

## License
GNU GPL 3.0
