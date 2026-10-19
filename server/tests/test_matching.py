"""Responsibility 5: the matching formula from the project document."""
from app.models import ApplicantProfile, RecruiterFilter
from app.services.matching_service import match_score, passes_hard_filters


def make_profile(**changes):
    profile = ApplicantProfile(user_id=1, university="U", field_of_study="Computer Science",
                               year=3, gpa=3.2, skills="Python,React", internships=1)
    for key, value in changes.items():
        setattr(profile, key, value)
    return profile


def make_filter(**changes):
    f = RecruiterFilter(recruiter_id=1, skills="Python,React,SQL")
    for key, value in changes.items():
        setattr(f, key, value)
    return f


def test_document_example_scores_62_7():
    assert match_score(make_profile(), make_filter()) == 62.7


def test_no_required_skills_gives_full_skill_points():
    assert match_score(make_profile(gpa=4.0, internships=3), make_filter(skills="")) == 100


def test_hard_filters():
    f = make_filter(field_of_study="Computer Science", min_year=3, min_gpa=3.0, min_internships=1)
    assert passes_hard_filters(make_profile(), f)
    assert not passes_hard_filters(make_profile(field_of_study="Design"), f)
    assert not passes_hard_filters(make_profile(year=2), f)
    assert not passes_hard_filters(make_profile(gpa=2.9), f)
    assert not passes_hard_filters(make_profile(internships=0), f)
