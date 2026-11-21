"""Responsibility 5 — Nusrat Begum (6638009): candidate matching and ranked results."""
from datetime import datetime, timedelta

import pytest
from sqlmodel import Session, select

from app.database import engine
from app.models import ApplicantProfile, RecruiterFilter, User
from app.services import storage_service
from app.services.matching_service import match_score, passes_hard_filters, rank, score_breakdown, split_skills
from tests.conftest import as_user


def profile(**changes):
    values = dict(id=1, user_id=1, university="Mahidol University", field_of_study="Computer Science", year=4,
                  gpa=3.2, internships=1, skills="Python,React", created_at=datetime(2026, 1, 1))
    return ApplicantProfile(**{**values, **changes})


def search(**changes):
    values = dict(recruiter_id=1, field_of_study="Computer Science", min_year=1, min_internships=0,
                  skills="Python,React,SQL", min_gpa=0.0)
    return RecruiterFilter(**{**values, **changes})


# ---------- Step 2: the scoring formula ----------

def test_example_from_the_project_document():
    # Python and React of Python, React, SQL; GPA 3.2; 1 internship -> 40 + 16 + 6.7 = 62.7
    assert match_score(profile(), search()) == 62.7
    parts = score_breakdown(profile(), search())
    assert (parts.skills, parts.gpa, parts.internships) == (40.0, 16.0, 6.7)
    assert parts.matched_skills == ["Python", "React"] and parts.total == 62.7


def test_perfect_and_zero_scores():
    best = profile(skills="Python,React,SQL", gpa=4.0, internships=3)
    assert match_score(best, search()) == 100.0
    worst = profile(skills="Figma", gpa=0.0, internships=0)
    assert match_score(worst, search()) == 0.0


def test_no_required_skills_counts_the_full_sixty():
    assert match_score(profile(skills=""), search(skills="")) == 82.7  # 60 + 16 + 6.7


def test_internships_are_capped_at_three():
    assert match_score(profile(internships=3), search()) == match_score(profile(internships=5), search())
    assert score_breakdown(profile(internships=5), search()).internships == 20.0


def test_extra_skills_do_not_add_points():
    assert match_score(profile(skills="Python,React,Docker,AWS"), search()) == match_score(profile(), search())


def test_split_skills():
    assert split_skills(" Python, React ,,SQL ") == ["Python", "React", "SQL"]
    assert split_skills("") == [] and split_skills(None) == []


# ---------- Step 1: hard filters ----------

@pytest.mark.parametrize("changes, passes", [
    ({}, True),
    ({"field_of_study": "Business"}, False),
    ({"year": 2}, False),
    ({"gpa": 2.99}, False),
    ({"internships": 0}, False),
    ({"year": 3, "gpa": 3.0, "internships": 1}, True),  # exactly the minimum passes
])
def test_hard_filters(changes, passes):
    strict = search(min_year=3, min_gpa=3.0, min_internships=1)
    assert passes_hard_filters(profile(**changes), strict) is passes


def test_any_field_of_study_when_the_filter_has_none():
    assert passes_hard_filters(profile(field_of_study="Design"), search(field_of_study=None))


def test_incomplete_profiles_are_never_matched():
    assert not passes_hard_filters(profile(gpa=None), search())
    assert not passes_hard_filters(profile(university=None), search(field_of_study=None))


# ---------- Sorting ----------

def test_rank_sorts_by_score_and_drops_failing_profiles():
    high = profile(id=1, user_id=1, skills="Python,React,SQL", gpa=3.0)  # 60 + 15 + 6.7 = 81.7
    mid = profile(id=2, user_id=2, skills="Python,React", gpa=3.0)  # 40 + 15 + 6.7 = 61.7
    low = profile(id=3, user_id=3, skills="Python", gpa=3.0)  # 20 + 15 + 6.7 = 41.7
    failing = profile(id=4, user_id=4, field_of_study="Business")
    ranked = rank([low, failing, high, mid], search())
    assert [(p.id, s) for p, s in ranked] == [(1, 81.7), (2, 61.7), (3, 41.7)]


def test_equal_scores_go_to_the_higher_gpa():
    four_skills = search(skills="Python,React,SQL,Docker")
    strong_gpa = profile(id=1, user_id=1, skills="Python,React,SQL", gpa=4.0, internships=0)  # 45 + 20 + 0 = 65
    all_skills = profile(id=2, user_id=2, skills="Python,React,SQL,Docker", gpa=1.0, internships=0)  # 60 + 5 + 0 = 65
    ranked = rank([all_skills, strong_gpa], four_skills)
    assert [(p.id, s) for p, s in ranked] == [(1, 65.0), (2, 65.0)]


def test_equal_score_and_gpa_go_to_the_newest_profile():
    older = profile(id=1, user_id=1, created_at=datetime(2026, 1, 1))
    newer = profile(id=2, user_id=2, created_at=datetime(2026, 1, 1) + timedelta(days=3))
    assert [p.id for p, _ in rank([older, newer], search())] == [2, 1]


# ---------- API ----------

@pytest.fixture
def fake_storage(monkeypatch):
    monkeypatch.setattr(storage_service, "get_url", lambda key, resource_type="video": f"https://files.test/{key}")


def test_results_need_a_saved_filter(client, users):
    response = client.get("/api/matching/results", headers=as_user(users["recruiter"]))
    assert response.status_code == 404
    assert "filters" in response.json()["detail"]


def test_only_recruiters_can_see_results(client, users):
    assert client.get("/api/matching/results", headers=as_user(users["applicant"])).status_code == 403
    assert client.get("/api/matching/results").status_code == 401


def test_ranked_results_for_the_demo_filter(client, users, fake_storage):
    recruiter = users["other_recruiter"]  # Siwakorn has the seeded demo filter
    body = client.get("/api/matching/results?limit=50", headers=as_user(recruiter)).json()
    assert body["filter"] == {"field_of_study": "Computer Science", "min_year": 3, "min_internships": 1,
                              "skills": ["Python", "SQL", "React", "Docker"], "min_gpa": 3.0}
    results = body["results"]
    assert body["total"] == len(results) > 0
    scores = [r["match_score"] for r in results]
    assert scores == sorted(scores, reverse=True)
    assert [r["rank"] for r in results] == list(range(1, len(results) + 1))
    for r in results:  # every result passes the hard filters
        assert r["field_of_study"] == "Computer Science" and r["year"] >= 3 and r["gpa"] >= 3.0 and r["internships"] >= 1
        assert r["meets_requirements"] is True
        assert "email" not in r
    names = [r["name"] for r in results]
    assert "Sara Ahmed" not in names  # Business
    assert "Arif Rahman" not in names  # year 2, no internships
    top = results[0]
    assert top["name"] == "Mei Chen" and top["matched_skills"] == ["Python", "SQL", "React", "Docker"]
    assert top["breakdown"] == {"skills": 60.0, "gpa": 17.8, "internships": 13.3}


def test_results_are_paginated(client, users, fake_storage):
    headers = as_user(users["other_recruiter"])
    everyone = client.get("/api/matching/results?limit=50", headers=headers).json()["results"]
    first = client.get("/api/matching/results?offset=0&limit=2", headers=headers).json()
    second = client.get("/api/matching/results?offset=2&limit=2", headers=headers).json()
    assert [r["applicant_id"] for r in first["results"] + second["results"]] == [r["applicant_id"] for r in everyone[:4]]
    assert second["results"][0]["rank"] == 3
    assert client.get("/api/matching/results?limit=0", headers=headers).status_code == 422


def test_drafts_are_left_out_of_results(client, users, fake_storage):
    headers = as_user(users["other_recruiter"])
    before = client.get("/api/matching/results?limit=50", headers=headers).json()["total"]
    with Session(engine) as s:
        lin = s.exec(select(User).where(User.email == "lin@cato.test")).one()
        draft = s.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == lin.id)).one()
        draft.gpa = None
        s.add(draft); s.commit()
    assert client.get("/api/matching/results?limit=50", headers=headers).json()["total"] == before - 1


def test_single_applicant_result(client, users, fake_storage):
    headers = as_user(users["other_recruiter"])
    everyone = client.get("/api/matching/results?limit=50", headers=headers).json()["results"]
    second = everyone[1]
    one = client.get(f"/api/matching/results/{second['applicant_id']}", headers=headers).json()
    assert one["rank"] == 2 and one["match_score"] == second["match_score"]
    with Session(engine) as s:
        sara = s.exec(select(User).where(User.email == "sara@cato.test")).one().id
    failing = client.get(f"/api/matching/results/{sara}", headers=headers).json()
    assert failing["rank"] is None and failing["meets_requirements"] is False
    assert client.get("/api/matching/results/999999", headers=headers).status_code == 404


# ---------- Filters sent from the Find candidates form ----------

FORM = "field_of_study=Computer+Science&min_year=3&min_gpa=3&min_internships=1&skills=Python&skills=SQL&skills=React&skills=Docker"


def test_form_filters_work_without_a_saved_filter(client, users, fake_storage):
    headers = as_user(users["recruiter"])  # Aye has no saved filter
    assert client.get("/api/matching/results", headers=headers).status_code == 404
    body = client.get(f"/api/matching/results?limit=50&{FORM}", headers=headers).json()
    saved = client.get("/api/matching/results?limit=50", headers=as_user(users["other_recruiter"])).json()
    assert body["filter"] == saved["filter"]  # same values as Siwakorn's demo filter
    assert [r["applicant_id"] for r in body["results"]] == [r["applicant_id"] for r in saved["results"]]


def test_form_filters_override_the_saved_filter(client, users, fake_storage):
    headers = as_user(users["other_recruiter"])
    body = client.get("/api/matching/results?limit=50&field_of_study=Business", headers=headers).json()
    assert body["filter"]["field_of_study"] == "Business" and body["filter"]["skills"] == []
    assert [r["name"] for r in body["results"]] == ["Sara Ahmed"]
    one = client.get(f"/api/matching/results/{body['results'][0]['applicant_id']}?field_of_study=Business", headers=headers).json()
    assert one["rank"] == 1


@pytest.mark.parametrize("query", ["field_of_study=Astrology", "skills=Cooking", "min_year=9", "min_gpa=5"])
def test_form_filters_use_fixed_options(client, users, query):
    assert client.get(f"/api/matching/results?{query}", headers=as_user(users["recruiter"])).status_code == 422


def test_live_preview_counts(client, users):
    headers = as_user(users["recruiter"])
    everyone = client.get("/api/matching/preview", headers=headers).json()
    assert everyone["total"] == everyone["field"] == everyone["field_and_year"] == everyone["passing"] == 9
    counts = client.get(f"/api/matching/preview?{FORM}", headers=headers).json()
    # 9 complete profiles -> 7 in Computer Science -> 6 in year 3+ -> 6 with GPA 3.00+ and 1+ internship
    assert counts == {"total": 9, "field": 7, "field_and_year": 6, "passing": 6}
    assert client.get("/api/matching/preview", headers=as_user(users["applicant"])).status_code == 403
