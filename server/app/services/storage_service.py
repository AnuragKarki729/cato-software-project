"""Shared file storage for videos (Responsibility 1) and resumes (Responsibility 2).

Files are saved in a Docker volume (STORAGE_DIR). Cloudflare R2 can be added later
behind the same three functions without changing any router code.
"""
import uuid
from pathlib import Path

from app.config import STORAGE_DIR

FILES_URL_PREFIX = "/api/files"


def save(data: bytes, folder: str, extension: str) -> str:
    """Save bytes and return the storage key, e.g. "videos/3f2a....mp4"."""
    key = f"{folder}/{uuid.uuid4().hex}.{extension.lstrip('.')}"
    path = STORAGE_DIR / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def get_url(key: str) -> str:
    """Link the browser can use to view or play the file."""
    return f"{FILES_URL_PREFIX}/{key}"


def delete(key: str) -> None:
    path = _safe_path(key)
    path.unlink(missing_ok=True)


def _safe_path(key: str) -> Path:
    path = (STORAGE_DIR / key).resolve()
    if STORAGE_DIR.resolve() not in path.parents:
        raise ValueError("Invalid storage key")
    return path
