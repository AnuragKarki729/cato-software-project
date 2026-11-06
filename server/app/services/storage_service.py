import uuid

import cloudinary.uploader
import cloudinary.utils

import app.config


def save(data: bytes, folder: str, extension: str, filename: str | None = None) -> str:
    """Upload bytes to Cloudinary and return a storage key."""
    name = filename or uuid.uuid4().hex
    key = f"{folder.strip('/')}/{name}.{extension.lstrip('.')}"
    cloudinary.uploader.upload(data, public_id=_public_id(key), resource_type="video")
    return key


def get_url(key: str) -> str:
    """Link the browser can use to play the video."""
    url, _ = cloudinary.utils.cloudinary_url(_public_id(key), resource_type="video", secure=True)
    return url + "." + key.rsplit(".", 1)[1]


def delete(key: str) -> None:
    cloudinary.uploader.destroy(_public_id(key), resource_type="video")


def _public_id(key: str) -> str:
    return key.rsplit(".", 1)[0]