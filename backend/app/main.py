from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
import uvicorn

from .core.config import settings
from .core.database import create_db_and_tables, get_session, Session as DBSession, engine
from .graphql.schema import schema

# Import Routers
from .api.routers import campaigns, sessions, personas, highlights, uploads, moments, chat

# Initialize DB (Optional, or use a lifespan event)
create_db_and_tables()

app = FastAPI(title="D&D Campaign Audio Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins/devices
    allow_credentials=False, # Credentials not currently used/required
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers for GraphQL Context
async def get_context(db: DBSession = Depends(get_session)):
    return {"db": db}

def get_graphql_context(background_tasks: BackgroundTasks, db: DBSession = Depends(get_session)):
    return {
        "db": db, 
        "background_tasks": background_tasks,
        "engine": engine
    }

graphql_app = GraphQLRouter(schema, context_getter=get_graphql_context)
app.include_router(graphql_app, prefix="/graphql")

# API Routers
app.include_router(campaigns.router)
app.include_router(sessions.router)
app.include_router(personas.router)
app.include_router(highlights.router)
app.include_router(moments.router)
app.include_router(uploads.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"message": "D&D Audio Manager API is running (Modular)"}

if __name__ == "__main__":
    # Increase timeouts for large file uploads
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        timeout_keep_alive=300, # 5 minutes
        limit_concurrency=100
    )
