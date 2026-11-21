import uuid

import cloudinary.uploader
import cloudinary.utils

import app.config

# resource_type is "video" for videos (Responsibility 1) and "raw" for resume PDFs
# (Responsibility 2). Raw files keep their extension in the Cloudinary public id, so the
# browser receives them as application/pdf and can show them inline.


def save(data: bytes, folder: str, extension: str, filename: str | None = None,
         resource_type: str = "video") -> str:
    """Upload bytes to Cloudinary and return a storage key."""
    name = filename or uuid.uuid4().hex
    key = f"{folder.strip('/')}/{name}.{extension.lstrip('.')}"
    cloudinary.uploader.upload(data, public_id=_public_id(key, resource_type), resource_type=resource_type)
    return key


def get_url(key: str, resource_type: str = "video") -> str:
    """Link the browser can use to play the video or open the file."""
    url, _ = cloudinary.utils.cloudinary_url(_public_id(key, resource_type), resource_type=resource_type, secure=True)
    if resource_type == "raw":
        return url
    return url + "." + key.rsplit(".", 1)[1]


def delete(key: str, resource_type: str = "video") -> None:
    cloudinary.uploader.destroy(_public_id(key, resource_type), resource_type=resource_type)


def _public_id(key: str, resource_type: str = "video") -> str:
    if resource_type == "raw":
        return key
    return key.rsplit(".", 1)[0]
