"""Shared storage module used by Responsibilities 1 and 2."""
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
