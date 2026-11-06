from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from app.config import SEED_DUMMY_DATA, STORAGE_DIR
from app.database import create_db_and_tables, engine
from app.routers import auth, feed, filters, invitations, matching, options, profiles, saved, videos
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    if SEED_DUMMY_DATA:
        with Session(engine) as session:
            seed_if_empty(session)
    yield


app = FastAPI(title="Cato API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    return {"status": "ok"}


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
