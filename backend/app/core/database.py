from sqlmodel import SQLModel, create_engine, Session
from .config import settings

# Database Setup
sqlite_url = settings.DATABASE_URL
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    # Import models here to ensure they are registered with SQLModel.metadata
    from ..models import models 
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
