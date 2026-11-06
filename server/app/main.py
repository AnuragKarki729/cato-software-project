from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
import app.models  # registers the User and Video tables
from app.routers import videos, feed
from app.database import engine
from app.seed import seed_if_empty

app = FastAPI(title="Cato Recruitment Platform")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
SQLModel.metadata.create_all(engine)
seed_if_empty()

# Include routers
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(feed.router, prefix="/api/feed", tags=["feed"])

@app.get("/")
def read_root():
    return {"message": "Cato Recruitment API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}