import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
STORAGE_URL = os.getenv("STORAGE_URL")
CLOUDINARY_URL= os.getenv("CLOUDINARY_URL")

MAX_VIDEO_SECONDS = 20
MAX_EXTRA_VIDEOS = 5