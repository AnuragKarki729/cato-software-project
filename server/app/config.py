"""App settings, read from environment variables (see .env.example)."""
import os
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://cato:cato@localhost:3306/cato")
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./data/uploads"))
SEED_DUMMY_DATA = os.getenv("SEED_DUMMY_DATA", "true").lower() == "true"

# Limits from the project document.
MAX_VIDEO_SECONDS = 30
MAX_EXTRA_VIDEOS = 5
