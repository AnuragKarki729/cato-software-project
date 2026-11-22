"""Responsibility 1 — Anurag Karki (6838852): video upload and video retrieval.

Covers the limits from the supervisor's change request #3: a 60 second maximum for every
video, at most MAX_EXTRA_VIDEOS extra videos, and a title from the fixed list.
"""
import pytest
from sqlmodel import Session, select

from app.config import MAX_EXTRA_VIDEOS, MAX_VIDEO_CAPTION, MAX_VIDEO_SECONDS
from app.database import engine
from app.models import User, Video
from app.services import storage_service
from app.services.options_service import VIDEO_TITLES
from tests.conftest import as_user

CLIP = b"\x00\x00\x00\x18ftypmp42 tiny fake mp4"


@pytest.fixture
def storage(monkeypatch):
    """Stand-in for Cloudinary: remembers what was saved and deleted."""
    calls = {"saved": [], "deleted": []}

    def save(data, folder, extension, filename=None, resource_type="video"):
        name = filename or f"file{len(calls['saved'])}"
        key = f"{folder}/{name}.{extension}"
        calls["saved"].append((key, resource_type, data))
        return key

    monkeypatch.setattr(storage_service, "save", save)
    monkeypatch.setattr(storage_service, "get_url", lambda key, resource_type="video": f"https://files.test/{key}")
    monkeypatch.setattr(storage_service, "delete", lambda key, resource_type="video": calls["deleted"].append(key))
    return calls


def upload(client, user, kind="pitch", seconds=15, title="About me", description=None,
           name="clip.mp4", content_type="video/mp4", content=CLIP):
    data = {"kind": kind, "duration_seconds": str(seconds), "title": title}
    if description is not None:
        data["description"] = description
    return client.post("/api/videos", files={"file": (name, content, content_type)},
                       data=data, headers=as_user(user))


# ---------------------------------------------------------------- uploading

def test_upload_a_pitch_with_a_title_and_caption(client, users, storage):
    response = upload(client, users["applicant"], description="  A little about me.  ")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["kind"] == "pitch"
    assert body["title"] == "About me"
    assert body["description"] == "A little about me."  # trimmed
    assert body["duration_seconds"] == 15
    assert body["url"].startswith("https://files.test/")
    assert storage["saved"], "the clip should have reached storage"


def test_a_caption_is_optional(client, users, storage):
    assert upload(client, users["applicant"], description="   ").json()["description"] is None
    assert upload(client, users["applicant"]).json()["description"] is None


def test_every_fixed_title_is_accepted(client, users, storage):
    for title in VIDEO_TITLES:
        assert upload(client, users["applicant"], title=title).json()["title"] == title


def test_a_title_outside_the_fixed_list_is_refused(client, users, storage):
    response = upload(client, users["applicant"], title="My holiday")
    assert response.status_code == 422
    assert "About me" in response.json()["detail"]


def test_videos_may_run_up_to_the_maximum(client, users, storage):
    assert upload(client, users["applicant"], seconds=MAX_VIDEO_SECONDS).status_code == 200


@pytest.mark.parametrize("seconds", [0, -3, MAX_VIDEO_SECONDS + 0.1, 600])
def test_videos_outside_the_allowed_length_are_refused(client, users, storage, seconds):
    response = upload(client, users["applicant"], seconds=seconds)
    assert response.status_code == 422
    assert str(MAX_VIDEO_SECONDS) in response.json()["detail"]


def test_a_long_caption_is_refused(client, users, storage):
    response = upload(client, users["applicant"], description="x" * (MAX_VIDEO_CAPTION + 1))
    assert response.status_code == 422
    assert storage["saved"] == []


@pytest.mark.parametrize("name, content_type", [
    ("notes.pdf", "application/pdf"),   # not a video at all
    ("clip.avi", "video/x-msvideo"),    # a video, but not a format we accept
])
def test_only_mp4_mov_and_webm_are_accepted(client, users, storage, name, content_type):
    assert upload(client, users["applicant"], name=name, content_type=content_type).status_code == 422
    assert storage["saved"] == []


def test_kind_must_be_pitch_or_extra(client, users, storage):
    assert upload(client, users["applicant"], kind="reel").status_code == 422


def test_recruiters_cannot_upload(client, users, storage):
    assert upload(client, users["recruiter"]).status_code == 403


def test_signed_out_visitors_cannot_upload(client, storage):
    response = client.post("/api/videos", files={"file": ("clip.mp4", CLIP, "video/mp4")},
                           data={"kind": "pitch", "duration_seconds": "10", "title": "Free topic"})
    assert response.status_code == 401


# ---------------------------------------------------------------- the pitch is unique

def test_a_new_pitch_replaces_the_old_one(client, users, storage):
    first = upload(client, users["applicant"], title="About me").json()
    second = upload(client, users["applicant"], title="Why this field").json()

    listed = client.get(f"/api/videos/applicant/{users['applicant']['id']}", headers=as_user(users["applicant"])).json()
    pitches = [v for v in listed if v["kind"] == "pitch"]
    assert len(pitches) == 1
    assert pitches[0]["id"] == second["id"] != first["id"]
    assert pitches[0]["title"] == "Why this field"


# ---------------------------------------------------------------- extra videos

def test_extra_videos_are_capped(client, users, storage):
    for i in range(MAX_EXTRA_VIDEOS):
        assert upload(client, users["applicant"], kind="extra", title="Free topic",
                      description=f"clip {i}").status_code == 200

    response = upload(client, users["applicant"], kind="extra", title="Free topic")
    assert response.status_code == 409
    assert str(MAX_EXTRA_VIDEOS) in response.json()["detail"]


def test_the_pitch_does_not_count_towards_the_extra_limit(client, users, storage):
    upload(client, users["applicant"], kind="pitch")
    for _ in range(MAX_EXTRA_VIDEOS):
        assert upload(client, users["applicant"], kind="extra", title="Free topic").status_code == 200


def test_extra_videos_are_stored_apart_from_the_pitch(client, users, storage):
    upload(client, users["applicant"], kind="pitch")
    upload(client, users["applicant"], kind="extra", title="Free topic")
    folders = [key.rsplit("/", 1)[0] for key, _, _ in storage["saved"]]
    assert folders[1].endswith("/shorts")
    assert not folders[0].endswith("/shorts")


# ---------------------------------------------------------------- retrieval

def test_listing_an_applicants_videos(client, users, storage):
    upload(client, users["applicant"], kind="pitch", title="About me")
    upload(client, users["applicant"], kind="extra", title="Free topic", description="extra one")

    listed = client.get(f"/api/videos/applicant/{users['applicant']['id']}",
                        headers=as_user(users["applicant"])).json()
    assert {v["kind"] for v in listed} == {"pitch", "extra"}
    assert {v["title"] for v in listed} == {"About me", "Free topic"}


def test_recruiters_can_watch_an_applicants_videos(client, users, storage):
    video = upload(client, users["applicant"]).json()
    assert client.get(f"/api/videos/{video['id']}", headers=as_user(users["recruiter"])).status_code == 200


def test_a_missing_video_is_not_found(client, users, storage):
    assert client.get("/api/videos/9999", headers=as_user(users["applicant"])).status_code == 404


# ---------------------------------------------------------------- deleting

def test_deleting_your_own_video(client, users, storage):
    video = upload(client, users["applicant"], kind="extra", title="Free topic").json()

    assert client.delete(f"/api/videos/{video['id']}", headers=as_user(users["applicant"])).status_code == 204
    assert storage["deleted"], "the file should have been removed from storage too"
    with Session(engine) as session:
        assert session.get(Video, video["id"]) is None


def test_you_cannot_delete_someone_elses_video(client, users, storage):
    video = upload(client, users["applicant"]).json()

    with Session(engine) as session:
        other = session.exec(select(User).where(User.role == "applicant",
                                                User.id != users["applicant"]["id"])).first()
    token = client.post("/api/auth/login", json={"email": other.email,
                                                 "password": "Test-password-123"}).json()["access_token"]

    response = client.delete(f"/api/videos/{video['id']}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert storage["deleted"] == []
