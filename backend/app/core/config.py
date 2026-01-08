from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///database.db"
    GEMINI_API_KEY: str
    UPLOAD_DIR: str = "uploads"
    FFMPEG_PATH: str = "ffmpeg"  # Default to system 'ffmpeg' (e.g. in Docker)

    class Config:
        # Look for .env in current dir, or in backend/ (for when running from root)
        # We might need to adjust this depending on where the app is run from now.
        # Assuming running from backend/ still.
        env_file = [".env", "backend/.env"]
        env_file_encoding = "utf-8"
        extra = "ignore" 

settings = Settings()
