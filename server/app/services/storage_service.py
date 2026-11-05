# Responsibility 1: Video upload and video retrieval
# Owner: Anurag Karki (6838852)
"""Shared file storage for videos (Responsibility 1) and resumes (Responsibility 2).

Files go to Cloudinary when CLOUDINARY_URL is set in .env, otherwise to the Docker
volume (STORAGE_DIR). Routers only use save, get_url and delete, so they never
need to know which one is on.
"""
import uuid
from pathlib import Path

import cloudinary.uploader
import cloudinary.utils

from app.config import CLOUDINARY_URL, STORAGE_DIR

FILES_URL_PREFIX = "/api/files"


def save(data: bytes, folder: str, extension: str, filename: str | None = None) -> str:
    """Save bytes and return a storage key.

    ``filename`` is used for predictable files such as an applicant's one pitch
    video. Other uploads use a UUID so they do not overwrite each other.
    """
    name = filename or uuid.uuid4().hex
    key = f"{folder.strip('/')}/{name}.{extension.lstrip('.')}"
    if CLOUDINARY_URL:
        cloudinary.uploader.upload(data, public_id=_public_id(key), resource_type=_resource_type(key))
        return key
    path = STORAGE_DIR / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def get_url(key: str) -> str:
    """Link the browser can use to view or play the file."""
    if CLOUDINARY_URL:
        return cloudinary.utils.cloudinary_url(_public_id(key), resource_type=_resource_type(key), secure=True)[0] + _video_extension(key)
    return f"{FILES_URL_PREFIX}/{key}"


def delete(key: str) -> None:
    if CLOUDINARY_URL:
        cloudinary.uploader.destroy(_public_id(key), resource_type=_resource_type(key))
        return
    path = _safe_path(key)
    path.unlink(missing_ok=True)


def _resource_type(key: str) -> str:
    return "video" if key.rsplit(".", 1)[-1].lower() in {"mp4", "mov", "webm"} else "raw"


def _public_id(key: str) -> str:
    # Cloudinary keeps the extension in the id of raw files, but not of videos.
    return key.rsplit(".", 1)[0] if _resource_type(key) == "video" else key


def _video_extension(key: str) -> str:
    return "." + key.rsplit(".", 1)[1] if _resource_type(key) == "video" else ""


def _safe_path(key: str) -> Path:
    path = (STORAGE_DIR / key).resolve()
    if STORAGE_DIR.resolve() not in path.parents:
        raise ValueError("Invalid storage key")
    return path
