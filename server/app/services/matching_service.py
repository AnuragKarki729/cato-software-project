"""Candidate matching (Responsibility 5), from the project document.

Step 1 - Hard filters: drop applicants whose field of study does not match, whose year
is below the minimum year, whose GPA is below the minimum GPA, or who have fewer
internships than the minimum.

Step 2 - Match score (0 to 100):
    60 x (required skills the applicant has / total required skills)
  + 20 x (applicant GPA / 4.0)
  + 20 x (min(internships, 3) / 3)
If the recruiter requires no skills, the skills part counts as the full 60.
"""
from app.models import ApplicantProfile, RecruiterFilter


def split_skills(skills: str) -> list[str]:
    return [s.strip() for s in skills.split(",") if s.strip()]


def passes_hard_filters(profile: ApplicantProfile, f: RecruiterFilter) -> bool:
    if f.field_of_study and profile.field_of_study != f.field_of_study:
        return False
    if profile.year < f.min_year:
        return False
    if profile.gpa < f.min_gpa:
        return False
    if profile.internships < f.min_internships:
        return False
    return True


def match_score(profile: ApplicantProfile, f: RecruiterFilter) -> float:
    required = split_skills(f.skills)
    has = split_skills(profile.skills)
    if required:
        skills_part = len([s for s in required if s in has]) / len(required)
    else:
        skills_part = 1
    score = 60 * skills_part + 20 * (profile.gpa / 4.0) + 20 * (min(profile.internships, 3) / 3)
    return round(score, 1)
