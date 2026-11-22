import hashlib
import uuid

import cloudinary.uploader
import cloudinary.utils

import app.config

# resource_type is "video" for videos (Responsibility 1) and "raw" for resume PDFs
# (Responsibility 2). Raw files keep their extension in the Cloudinary public id, so the
# browser receives them as application/pdf and can show them inline.


def user_folder(email: str) -> str:
    """The Cloudinary folder for one person, stable for as long as their email is.

    Not the database id: that is a MySQL auto-increment, so every `docker compose down -v`
    reseeds the same people with new ids and strands their old folder. Hashing the email
    instead keeps one person in one folder across any number of database wipes.

    The email itself is never put in the path. Cloudinary URLs are public and recruiters are
    given them, so a readable address would hand out the applicant's email with every video.
    STORAGE_SALT keeps the digest from being reproducible by guessing the email alone.
    """
    digest = hashlib.sha256(f"{app.config.STORAGE_SALT}{email.strip().lower()}".encode()).hexdigest()
    return f"v1_cato/users/{digest[:16]}"


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
