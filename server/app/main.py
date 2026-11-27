from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
import app.models  # registers every table (User, Video, AuthSession, RegistrationConsent, ApplicantProfile, RecruiterFilter)
from app.routers import auth, videos, feed, options, profiles, matching, filters, invitations
from app.database import add_missing_columns, engine
from app.seed import seed_demo_profiles, seed_if_empty, seed_vocabulary
from app import seed_snapshot

app = FastAPI(title="Cato Recruitment Platform")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables, then patch in any column added to a table that already exists —
# create_all does not do that, and the database outlives `docker compose down`. See
# database.ADDED_COLUMNS.
SQLModel.metadata.create_all(engine)
add_missing_columns()
# SEED_DATA=true: an empty database starts from the shared snapshot (seed_snapshot.py), so
# everyone has the same accounts and videos. The seeds below then find nothing to add.
if seed_snapshot.enabled():
    seed_snapshot.load_if_empty()
seed_if_empty()
seed_vocabulary()  # universities and fields of study, which then grow
seed_demo_profiles()

# Include routers
app.include_router(auth.router, prefix="/api")  # auth router already has prefix /auth
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(feed.router, prefix="/api/feed", tags=["feed"])
app.include_router(options.router, prefix="/api")  # fixed options for the profile and filter forms
app.include_router(profiles.router, prefix="/api")  # Responsibility 2
app.include_router(matching.router, prefix="/api")  # Responsibility 5
app.include_router(filters.router, prefix="/api")  # Responsibility 4
app.include_router(invitations.router, prefix="/api")  # Responsibility 8

@app.get("/")
def read_root():
    return {"message": "Cato Recruitment API"}


# Under /api like everything else, so one proxy rule covers the whole API: the client sends
# /api to the server (VITE_API_TARGET) and a bare /health would not have been reachable
# through it. The root one is kept for anything already pointed at it.
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok"}
