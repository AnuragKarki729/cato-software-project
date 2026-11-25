"""Responsibility 2 — Nusrat Begam (6638009): applicant profile and resume."""
import pytest
from sqlmodel import Session, select

from app.database import engine
from app.models import User
from app.services import storage_service
from tests.conftest import as_user

PDF = b"%PDF-1.4\n% tiny test file\n%%EOF"
PROFILE = {"university": "Mahidol University", "field_of_study": "Computer Science", "year": 4, "gpa": 3.62,
           "skills": ["Python", "SQL", "React", "Docker"], "internships": 2}


@pytest.fixture
def storage(monkeypatch):
    """Stand-in for Cloudinary: remembers what was saved and deleted."""
    calls = {"saved": [], "deleted": []}

    def save(data, folder, extension, filename=None, resource_type="video"):
        key = f"{folder}/file{len(calls['saved'])}.{extension}"
        calls["saved"].append((key, resource_type, data))
        return key

    monkeypatch.setattr(storage_service, "save", save)
    monkeypatch.setattr(storage_service, "get_url", lambda key, resource_type="video": f"https://files.test/{key}")
    monkeypatch.setattr(storage_service, "delete", lambda key, resource_type="video": calls["deleted"].append(key))
    return calls


@pytest.fixture
def nusrat(client, users):
    """The seeded applicant without a profile (so onboarding starts from scratch)."""
    with Session(engine) as s:
        user_id = s.exec(select(User).where(User.email == "nusrat@cato.test")).one().id
    token = client.post("/api/auth/login", json={"email": "nusrat@cato.test", "password": "Test-password-123"}).json()["access_token"]
    return {"id": user_id, "token": token}


def upload(client, user, content=PDF, name="Nusrat Resume.pdf", content_type="application/pdf"):
    return client.post("/api/profiles/me/resume", headers=as_user(user), files={"file": (name, content, content_type)})


def step(client, user):
    return client.get("/api/auth/me", headers=as_user(user)).json()["onboarding_step"]


def test_options(client):
    options = client.get("/api/options").json()
    assert "Python" in options["skills"] and "Machine learning" in options["skills"]
    assert "Mahidol University" in options["universities"]
    assert options["years"] == [1, 2, 3, 4, 5] and options["max_skills"] == 10


def test_full_onboarding_flow(client, nusrat, storage):
    assert client.get("/api/profiles/me", headers=as_user(nusrat)).status_code == 404
    assert step(client, nusrat) == "profile"

    saved = client.put("/api/profiles/me", headers=as_user(nusrat), json=PROFILE)
    assert saved.status_code == 200
    body = saved.json()
    assert body["skills"] == PROFILE["skills"] and body["gpa"] == 3.62 and body["name"] == "Nusrat Begam"
    assert body["details_complete"] is True and body["onboarding_complete"] is False
    assert step(client, nusrat) == "profile"  # the resume is still missing

    response = upload(client, nusrat)
    assert response.status_code == 201
    body = response.json()
    key, resource_type, data = storage["saved"][0]
    assert resource_type == "raw" and data == PDF and key.endswith(".pdf")
    assert body["resume_url"] == f"https://files.test/{key}"
    assert body["resume_name"] == "Nusrat Resume.pdf" and body["resume_size"] == len(PDF)
    assert body["onboarding_complete"] is True
    assert step(client, nusrat) == "video"  # next: the pitch video (Responsibility 1)

    again = client.get("/api/profiles/me", headers=as_user(nusrat)).json()
    assert again["university"] == "Mahidol University" and again["resume_url"] == body["resume_url"]


def test_save_draft_accepts_a_partly_filled_form(client, nusrat, storage):
    response = client.put("/api/profiles/me/draft", headers=as_user(nusrat),
                          json={"university": "Mahidol University", "skills": ["Python"]})
    assert response.status_code == 200
    body = response.json()
    assert body["university"] == "Mahidol University" and body["year"] is None
    assert body["details_complete"] is False
    # Whatever is sent must still be one of the fixed options.
    assert client.put("/api/profiles/me/draft", headers=as_user(nusrat), json={"year": 9}).status_code == 422


@pytest.mark.parametrize("changes", [
    {"year": 0}, {"year": 6},
    {"gpa": 4.01}, {"gpa": -1},
    {"internships": 9},
    {"skills": []},
    {"skills": ["Python", "SQL", "React", "Docker", "Java", "JavaScript", "TypeScript", "C++", "Node.js", "Git", "Linux"]},
    {"university": None},
])
def test_profile_refuses_values_outside_the_allowed_range(client, nusrat, changes):
    """Year, GPA, internships and the number of skills are still fixed ranges — unlike the
    university, field of study and skill NAMES, which are a growing vocabulary now."""
    assert client.put("/api/profiles/me", headers=as_user(nusrat), json={**PROFILE, **changes}).status_code == 422


@pytest.mark.parametrize("changes, kind, term", [
    ({"university": "Hogwarts"}, "universities", "Hogwarts"),
    ({"field_of_study": "Astrology"}, "fields_of_study", "Astrology"),
    ({"skills": ["Cooking"]}, "skills", "Cooking"),
])
def test_a_term_nobody_has_used_before_is_accepted_and_becomes_an_option(client, nusrat, changes, kind, term):
    """These three used to be refused against the fixed lists in options_service.

    They are a database vocabulary now (vocabulary_service): a real resume named a university
    outside the seeded eight and the value went invisible in the dropdown, so anything an
    applicant picks or that is read off their resume joins the list for the next person. The
    seeded values are a starting point, not the whole world.
    """
    assert client.put("/api/profiles/me", headers=as_user(nusrat), json={**PROFILE, **changes}).status_code == 200
    assert term in client.get("/api/options").json()[kind]


def test_profile_cleans_up_input(client, nusrat):
    body = client.put("/api/profiles/me", headers=as_user(nusrat),
                      json={**PROFILE, "gpa": 3.456, "skills": ["SQL", "Python", "SQL"]}).json()
    assert body["gpa"] == 3.46 and body["skills"] == ["SQL", "Python"]


@pytest.mark.parametrize("content, name, content_type, status", [
    (b"hello", "notes.txt", "text/plain", 422),  # not a PDF at all
    (b"not really a pdf", "fake.pdf", "application/pdf", 422),  # PDF name, wrong contents
    (PDF + b"0" * (5 * 1024 * 1024), "huge.pdf", "application/pdf", 413),  # over 5 MB
])
def test_resume_must_be_a_small_pdf(client, nusrat, storage, content, name, content_type, status):
    assert upload(client, nusrat, content, name, content_type).status_code == status
    assert storage["saved"] == []


def test_replacing_and_deleting_the_resume(client, nusrat, storage):
    first = upload(client, nusrat).json()
    second = upload(client, nusrat, name="New CV.pdf").json()
    assert second["resume_name"] == "New CV.pdf" and second["resume_url"] != first["resume_url"]
    assert storage["deleted"] == [storage["saved"][0][0]]  # the old file is removed

    removed = client.delete("/api/profiles/me/resume", headers=as_user(nusrat))
    assert removed.status_code == 200 and removed.json()["resume_url"] is None
    assert storage["deleted"][-1] == storage["saved"][1][0]
    assert client.delete("/api/profiles/me/resume", headers=as_user(nusrat)).status_code == 404


def test_only_applicants_edit_profiles(client, users):
    headers = as_user(users["recruiter"])
    assert client.put("/api/profiles/me", headers=headers, json=PROFILE).status_code == 403
    assert client.get("/api/profiles/me", headers=headers).status_code == 403
    assert client.put("/api/profiles/me", json=PROFILE).status_code == 401


def test_who_can_view_a_profile(client, users, nusrat, storage):
    applicant = users["applicant"]  # Anurag has a seeded profile
    # Recruiters can view applicants, without their email.
    viewed = client.get(f"/api/profiles/{applicant['id']}", headers=as_user(users["recruiter"]))
    assert viewed.status_code == 200
    assert viewed.json()["name"] == "Anurag Karki" and "email" not in viewed.json()
    # Applicants can preview themselves, and see other applicants' details in the video feed,
    # but never another applicant's resume.
    assert client.get(f"/api/profiles/{applicant['id']}", headers=as_user(applicant)).status_code == 200
    upload(client, nusrat)
    seen = client.get(f"/api/profiles/{nusrat['id']}", headers=as_user(applicant)).json()
    assert seen["name"] == "Nusrat Begam" and seen["resume_url"] is None and "email" not in seen
    assert client.get(f"/api/profiles/{nusrat['id']}", headers=as_user(users["recruiter"])).json()["resume_url"]
    # Recruiters and missing profiles are not applicant profiles.
    assert client.get(f"/api/profiles/{users['recruiter']['id']}", headers=as_user(users["recruiter"])).status_code == 404
    assert client.get("/api/profiles/999999", headers=as_user(users["recruiter"])).status_code == 404
