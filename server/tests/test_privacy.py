"""Issue #5 — the applicant's privacy settings.

Two controls, both on the Settings page and both the applicant's own:

  hidden            take me out of every list — the recruiter's ranked results and Explore,
                    and the other applicants' video feed
  blocked_companies these companies do not get me in results, Explore or an invitation

The rule being pinned down here is that hiding is not cosmetic: a recruiter who already knows
an applicant's id must not be able to reach them by asking for that id directly, which is why
the profile and the single-applicant score both answer 404 rather than leaving them out of a
list and serving them anywhere else.
"""
import pytest
from sqlmodel import Session, select

from app.database import engine
from app.models import User
from app.services import storage_service
from tests.conftest import as_user

CLIP = b"\x00\x00\x00\x18ftypmp42 tiny fake mp4"
PDF = b"%PDF-1.4 tiny fake resume"


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
def candidate(client, users):
    """A seeded applicant who has a complete profile and a pitch, so they show up everywhere
    before any of this is switched on."""
    with Session(engine) as session:
        row = session.exec(
            select(User).where(User.role == "applicant", User.email == "lin@cato.test")).first()
        person = {"id": row.id, "email": row.email, "name": row.name}
    person["token"] = client.post("/api/auth/login", json={
        "email": person["email"], "password": "Test-password-123"}).json()["access_token"]
    client.post("/api/videos", files={"file": ("clip.mp4", CLIP, "video/mp4")},
                data={"kind": "pitch", "duration_seconds": "15", "title": "About me"},
                headers=as_user(person))
    return person


@pytest.fixture
def rivals(client, users):
    """Two recruiters at DIFFERENT companies.

    The `users` fixture hands back the first two seeded recruiters and both of those work for
    "Cato", so blocking one would block the other and "somebody else can still see them" could
    never fail. A block is matched on the company, not the person.
    """
    with Session(engine) as session:
        rows = session.exec(select(User).where(User.role == "recruiter").order_by(User.id)).all()
        people = [{"id": u.id, "email": u.email, "company_name": u.company_name} for u in rows]
    first = people[0]
    other = next(p for p in people if p["company_name"] != first["company_name"])
    for person in (first, other):
        person["token"] = client.post("/api/auth/login", json={
            "email": person["email"], "password": "Test-password-123"}).json()["access_token"]
    return first, other


def hide(client, person, hidden=True, blocked=()):
    return client.put("/api/profiles/me/privacy", headers=as_user(person),
                      json={"hidden": hidden, "blocked_companies": list(blocked)})


def explore_ids(client, user):
    # limit is capped at 20 by the endpoint.
    return [r["applicant_id"] for r in
            client.get("/api/feed/explore?offset=0&limit=20", headers=as_user(user)).json()["results"]]


def feed_ids(client, user):
    return [item["applicant_id"] for item in client.get("/api/feed", headers=as_user(user)).json()]


# ---------- the setting itself ----------

def test_an_applicant_is_visible_until_they_say_otherwise(client, users, storage):
    body = client.get("/api/profiles/me", headers=as_user(users["applicant"])).json()
    assert body["hidden"] is False
    assert body["blocked_companies"] == []


def test_privacy_is_saved_and_read_back(client, users, storage):
    body = hide(client, users["applicant"], hidden=True, blocked=["Agoda", "Grab"]).json()
    assert body["hidden"] is True
    assert body["blocked_companies"] == ["Agoda", "Grab"]
    again = client.get("/api/profiles/me", headers=as_user(users["applicant"])).json()
    assert again["hidden"] is True
    assert again["blocked_companies"] == ["Agoda", "Grab"]


def test_blocked_companies_are_tidied_and_deduplicated(client, users, storage):
    body = hide(client, users["applicant"], hidden=False,
                blocked=["Agoda", "agoda", "  AGODA  ", "Grab", ""]).json()
    assert body["blocked_companies"] == ["Agoda", "Grab"]


def test_unhiding_puts_them_back(client, users, storage, candidate):
    hide(client, candidate, hidden=True)
    assert candidate["id"] not in explore_ids(client, users["recruiter"])
    hide(client, candidate, hidden=False)
    assert candidate["id"] in explore_ids(client, users["recruiter"])


def test_only_applicants_have_privacy_settings(client, users, storage):
    assert hide(client, users["recruiter"]).status_code == 403


# ---------- hidden: gone from every list ----------

def test_a_hidden_applicant_is_not_in_explore(client, users, storage, candidate):
    assert candidate["id"] in explore_ids(client, users["recruiter"])
    hide(client, candidate)
    assert candidate["id"] not in explore_ids(client, users["recruiter"])


def test_a_hidden_applicant_is_not_in_another_applicants_feed(client, users, storage, candidate):
    assert candidate["id"] in feed_ids(client, users["applicant"])
    hide(client, candidate)
    assert candidate["id"] not in feed_ids(client, users["applicant"])


def test_a_hidden_applicant_is_not_in_ranked_results(client, users, storage, candidate):
    search = "?field_of_study=Computer Science&min_year=1&min_gpa=0&min_internships=0"
    before = client.get(f"/api/matching/results{search}", headers=as_user(users["recruiter"])).json()
    assert candidate["id"] in [r["applicant_id"] for r in before["results"]]
    hide(client, candidate)
    after = client.get(f"/api/matching/results{search}", headers=as_user(users["recruiter"])).json()
    assert candidate["id"] not in [r["applicant_id"] for r in after["results"]]


def test_a_hidden_applicant_cannot_be_reached_by_id(client, users, storage, candidate):
    """The point of the setting: leaving them out of the lists is no good if the profile is
    still served to anyone who knows the id."""
    hide(client, candidate)
    assert client.get(f"/api/profiles/{candidate['id']}", headers=as_user(users["recruiter"])).status_code == 404
    assert client.get(f"/api/profiles/{candidate['id']}", headers=as_user(users["applicant"])).status_code == 404
    assert client.get(f"/api/matching/results/{candidate['id']}",
                      headers=as_user(users["recruiter"])).status_code == 404


def test_a_hidden_applicant_still_sees_their_own_profile(client, users, storage, candidate):
    """Otherwise they could not reach Settings to turn it off again."""
    hide(client, candidate)
    assert client.get("/api/profiles/me", headers=as_user(candidate)).status_code == 200
    mine = client.get(f"/api/profiles/{candidate['id']}", headers=as_user(candidate))
    assert mine.status_code == 200
    assert mine.json()["hidden"] is True


def test_a_hidden_applicant_cannot_be_invited(client, users, storage, candidate):
    hide(client, candidate)
    r = client.post("/api/invitations", json={"applicant_id": candidate["id"]},
                    headers=as_user(users["recruiter"]))
    assert r.status_code == 404


# ---------- blocked companies: gone for that company only ----------

def test_a_blocked_company_does_not_see_them_but_others_still_do(client, users, storage, candidate, rivals):
    blocked, other = rivals
    hide(client, candidate, hidden=False, blocked=[blocked["company_name"]])
    assert candidate["id"] not in explore_ids(client, blocked)
    assert candidate["id"] in explore_ids(client, other)


def test_a_block_ignores_case_and_spacing(client, users, storage, candidate, rivals):
    blocked, _ = rivals
    hide(client, candidate, hidden=False, blocked=[f"  {blocked['company_name'].lower()}  "])
    assert candidate["id"] not in explore_ids(client, blocked)


def test_a_blocked_company_cannot_open_the_profile_or_score_them(client, users, storage, candidate, rivals):
    blocked, other = rivals
    hide(client, candidate, hidden=False, blocked=[blocked["company_name"]])
    assert client.get(f"/api/profiles/{candidate['id']}", headers=as_user(blocked)).status_code == 404
    assert client.get(f"/api/matching/results/{candidate['id']}", headers=as_user(blocked)).status_code == 404
    assert client.get(f"/api/profiles/{candidate['id']}", headers=as_user(other)).status_code == 200


def test_a_blocked_company_cannot_invite_them(client, users, storage, candidate, rivals):
    blocked, other = rivals
    hide(client, candidate, hidden=False, blocked=[blocked["company_name"]])
    assert client.post("/api/invitations", json={"applicant_id": candidate["id"]},
                       headers=as_user(blocked)).status_code == 404
    assert client.post("/api/invitations", json={"applicant_id": candidate["id"]},
                       headers=as_user(other)).status_code == 201


def test_a_block_does_not_hide_them_from_other_applicants(client, users, storage, candidate):
    """Blocking is about a company, so the applicant feed is unaffected."""
    hide(client, candidate, hidden=False, blocked=[users["recruiter"]["company_name"]])
    assert candidate["id"] in feed_ids(client, users["applicant"])


# ---------- nobody else is told ----------

def test_privacy_settings_are_not_shown_to_anyone_else(client, users, storage, candidate):
    hide(client, candidate, hidden=False, blocked=["Agoda"])
    seen = client.get(f"/api/profiles/{candidate['id']}", headers=as_user(users["recruiter"])).json()
    assert seen["hidden"] is False
    assert seen["blocked_companies"] == []
