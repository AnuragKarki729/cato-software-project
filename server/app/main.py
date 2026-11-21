from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
import app.models  # registers every table (User, Video, AuthSession, RegistrationConsent, ApplicantProfile, RecruiterFilter)
from app.routers import auth, videos, feed, options, profiles, matching
from app.database import engine
from app.seed import seed_demo_profiles, seed_if_empty

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
seed_demo_profiles()

# Include routers
app.include_router(auth.router, prefix="/api")  # auth router already has prefix /auth
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(feed.router, prefix="/api/feed", tags=["feed"])
app.include_router(options.router, prefix="/api")  # fixed options for the profile and filter forms
app.include_router(profiles.router, prefix="/api")  # Responsibility 2
app.include_router(matching.router, prefix="/api")  # Responsibility 5
# saved.router (Responsibility 6) still waits for the filter endpoints, bookmarks and invitations (Responsibilities 4, 6, 8).

@app.get("/")
def read_root():
    return {"message": "Cato Recruitment API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
