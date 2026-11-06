from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from app.config import SEED_DUMMY_DATA, STORAGE_DIR
from app.database import create_db_and_tables, engine
from app.routers import auth, feed, filters, invitations, matching, options, profiles, saved, videos
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


api.include_router(auth.router)
api.include_router(profiles.router)
api.include_router(videos.router)
api.include_router(feed.router)
api.include_router(filters.router)
api.include_router(matching.router)
api.include_router(invitations.router)
api.include_router(saved.router)
api.include_router(options.router)

app.include_router(api)

# Uploaded videos and resumes, served from the Docker volume.
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=STORAGE_DIR), name="files")
