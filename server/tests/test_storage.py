"""Shared storage module used by Responsibilities 1 and 2."""
import cloudinary
import pytest

from app.services import storage_service


def test_save_url_and_delete():
    key = storage_service.save(b"hello", "videos", "mp4")
    assert key.startswith("videos/") and key.endswith(".mp4")
    assert storage_service.get_url(key) == f"/api/files/{key}"
    path = storage_service.STORAGE_DIR / key
    assert path.read_bytes() == b"hello"
    storage_service.delete(key)
    assert not path.exists()


def test_saved_file_is_served(client):
    key = storage_service.save(b"pdf-bytes", "resumes", "pdf")
    assert client.get(storage_service.get_url(key)).content == b"pdf-bytes"


def test_delete_rejects_paths_outside_storage():
    with pytest.raises(ValueError):
        storage_service.delete("../outside.txt")


def test_cloudinary_links(monkeypatch):
    cloudinary.config(cloud_name="demo")
    monkeypatch.setattr(storage_service, "CLOUDINARY_URL", "on")
    video = storage_service.get_url("videos/abc.mp4")
    resume = storage_service.get_url("resumes/abc.pdf")
    assert video == "https://res.cloudinary.com/demo/video/upload/v1/videos/abc.mp4"
    assert resume == "https://res.cloudinary.com/demo/raw/upload/v1/resumes/abc.pdf"
