"""Responsibility 3 — Anurag Karki (6838852): the short-form video feed.

The feed shows pitch videos only, newest first, ten to a page. Applicants never see
their own pitch in it; recruiters see everyone's.
"""
import pytest
from sqlmodel import Session, select

from app.database import engine
from app.models import User
from app.services import storage_service
from tests.conftest import as_user

CLIP = b"\x00\x00\x00\x18ftypmp42 tiny fake mp4"


@pytest.fixture
def storage(monkeypatch):
    saved = []

    def save(data, folder, extension, filename=None, resource_type="video"):
        key = f"{folder}/{filename or len(saved)}.{extension}"
        saved.append(key)
        return key

    monkeypatch.setattr(storage_service, "save", save)
    monkeypatch.setattr(storage_service, "get_url", lambda key, resource_type="video": f"https://files.test/{key}")
    monkeypatch.setattr(storage_service, "delete", lambda key, resource_type="video": None)
    return saved


@pytest.fixture
def applicants(client, users):
    """Log in several seeded applicants so the feed has more than one person in it."""
    with Session(engine) as session:
        rows = session.exec(select(User).where(User.role == "applicant").order_by(User.id)).all()
        people = [{"id": u.id, "email": u.email, "name": u.name} for u in rows]
    for person in people:
        person["token"] = client.post("/api/auth/login", json={
            "email": person["email"], "password": "Test-password-123"}).json()["access_token"]
    return people


def upload(client, person, kind="pitch", title="About me", seconds=15):
    return client.post("/api/videos", files={"file": ("clip.mp4", CLIP, "video/mp4")},
                       data={"kind": kind, "duration_seconds": str(seconds), "title": title},
                       headers={"Authorization": f"Bearer {person['token']}"})


def test_the_feed_is_empty_before_anyone_uploads(client, users, storage):
    assert client.get("/api/feed", headers=as_user(users["recruiter"])).json() == []


def test_recruiters_see_every_pitch_with_the_applicants_name(client, users, applicants, storage):
    upload(client, applicants[0])
    upload(client, applicants[1])

    feed = client.get("/api/feed", headers=as_user(users["recruiter"])).json()
    assert len(feed) == 2
    assert {item["name"] for item in feed} == {applicants[0]["name"], applicants[1]["name"]}
    assert all(item["url"].startswith("https://files.test/") for item in feed)


def test_applicants_do_not_see_their_own_pitch(client, applicants, storage):
    upload(client, applicants[0])
    upload(client, applicants[1])

    feed = client.get("/api/feed", headers={"Authorization": f"Bearer {applicants[0]['token']}"}).json()
    assert [item["applicant_id"] for item in feed] == [applicants[1]["id"]]


def test_extra_videos_stay_out_of_the_feed(client, users, applicants, storage):
    upload(client, applicants[0], kind="extra", title="Free topic")

    assert client.get("/api/feed", headers=as_user(users["recruiter"])).json() == []

    upload(client, applicants[0], kind="pitch")
    feed = client.get("/api/feed", headers=as_user(users["recruiter"])).json()
    assert [item["kind"] for item in feed] == ["pitch"]


def test_the_newest_pitch_comes_first(client, users, applicants, storage):
    upload(client, applicants[0])
    upload(client, applicants[1])

    feed = client.get("/api/feed", headers=as_user(users["recruiter"])).json()
    assert feed[0]["applicant_id"] == applicants[1]["id"]


def test_the_feed_is_paged_ten_at_a_time(client, users, applicants, storage):
    assert len(applicants) > 10, "the seed data should hold more than one page of applicants"
    for person in applicants:
        upload(client, person)

    first = client.get("/api/feed?page=1", headers=as_user(users["recruiter"])).json()
    second = client.get("/api/feed?page=2", headers=as_user(users["recruiter"])).json()

    assert len(first) == 10
    assert len(second) == len(applicants) - 10
    assert {item["id"] for item in first}.isdisjoint({item["id"] for item in second})


def test_page_numbers_start_at_one(client, users, storage):
    assert client.get("/api/feed?page=0", headers=as_user(users["recruiter"])).status_code == 422


def test_the_feed_needs_a_login(client, storage):
    assert client.get("/api/feed").status_code == 401


def test_feed_items_carry_the_title_and_caption(client, users, applicants, storage):
    client.post("/api/videos", files={"file": ("clip.mp4", CLIP, "video/mp4")},
                data={"kind": "pitch", "duration_seconds": "12", "title": "Why this field",
                      "description": "Why I chose this."},
                headers={"Authorization": f"Bearer {applicants[0]['token']}"})

    item = client.get("/api/feed", headers=as_user(users["recruiter"])).json()[0]
    assert item["title"] == "Why this field"
    assert item["description"] == "Why I chose this."
