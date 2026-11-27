# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begum (6638009)
"""Candidate matching, exactly as written in the project document.

Step 1 - Hard filters: drop applicants whose field of study does not match, whose year
is below the minimum year, whose GPA is below the minimum GPA, or who have fewer
internships than the minimum.

Step 2 - Match score (0 to 100):
    60 x (required skills the applicant has / total required skills)
  + 20 x (applicant GPA / 4.0)
  + 20 x (min(internships, 3) / 3)
If the recruiter requires no skills, the skills part counts as the full 60.

Example from the document: required Python, React and SQL; the applicant has Python and
React, a 3.2 GPA and 1 internship -> 40 + 16 + 6.7 = 62.7.

Ties are broken by the higher GPA, then by the newest profile.

Close matches (rank_with_close): when few or none pass step 1, the recruiter still sees who
came closest. A close match misses one or more of the must-haves the recruiter actually set
but meets at least one of them; they come after every full match, most must-haves met first,
then by score. A must-have left at its default (any field, year 1, GPA 0, no internships) is
not "set", so meeting it proves nothing and does not count.
"""
from dataclasses import dataclass

SKILLS_WEIGHT = 60
GPA_WEIGHT = 20
INTERNSHIPS_WEIGHT = 20
MAX_GPA = 4.0
MAX_COUNTED_INTERNSHIPS = 3


def split_skills(skills: str | None) -> list[str]:
    """Skills are stored as one comma separated string: "Python,React" -> ["Python", "React"]."""
    return [s.strip() for s in (skills or "").split(",") if s.strip()]


@dataclass
class Breakdown:
    skills: float  # out of 60
    gpa: float  # out of 20
    internships: float  # out of 20
    matched_skills: list[str]
    required_skills: list[str]

    @property
    def total(self) -> float:
        return round(self.skills + self.gpa + self.internships, 1)


def passes_hard_filters(profile, recruiter_filter) -> bool:
    """Step 1. `profile` is an ApplicantProfile, `recruiter_filter` a RecruiterFilter."""
    if not profile.details_complete:
        return False
    if recruiter_filter.field_of_study and profile.field_of_study != recruiter_filter.field_of_study:
        return False
    if profile.year < recruiter_filter.min_year:
        return False
    if profile.gpa < recruiter_filter.min_gpa:
        return False
    if profile.internships < recruiter_filter.min_internships:
        return False
    return True


def requirement_checks(profile, recruiter_filter) -> list[tuple[str, bool]]:
    """(must-have, met?) for each must-have the recruiter actually set. Needs a complete profile."""
    f = recruiter_filter
    checks = []
    if f.field_of_study:
        checks.append(("Field of study", profile.field_of_study == f.field_of_study))
    if (f.min_year or 1) > 1:
        checks.append(("Year of study", profile.year >= f.min_year))
    if (f.min_gpa or 0) > 0:
        checks.append(("GPA", profile.gpa >= f.min_gpa))
    if (f.min_internships or 0) > 0:
        checks.append(("Internships", profile.internships >= f.min_internships))
    return checks


def missed_requirements(profile, recruiter_filter) -> list[str]:
    """The set must-haves this applicant does not meet: [] for a full match."""
    return [name for name, met in requirement_checks(profile, recruiter_filter) if not met]


def score_breakdown(profile, recruiter_filter) -> Breakdown:
    """Step 2, part by part, so the candidate page can show where the score comes from."""
    required = split_skills(recruiter_filter.skills)
    has = set(split_skills(profile.skills))
    matched = [skill for skill in required if skill in has]
    skills_part = len(matched) / len(required) if required else 1
    return Breakdown(
        skills=round(SKILLS_WEIGHT * skills_part, 1),
        gpa=round(GPA_WEIGHT * (profile.gpa / MAX_GPA), 1),
        internships=round(INTERNSHIPS_WEIGHT * (min(profile.internships, MAX_COUNTED_INTERNSHIPS) / MAX_COUNTED_INTERNSHIPS), 1),
        matched_skills=matched,
        required_skills=required,
    )


def match_score(profile, recruiter_filter) -> float:
    """Match score from 0 to 100, rounded to one decimal."""
    required = split_skills(recruiter_filter.skills)
    has = set(split_skills(profile.skills))
    skills_part = len([s for s in required if s in has]) / len(required) if required else 1
    score = (SKILLS_WEIGHT * skills_part
             + GPA_WEIGHT * (profile.gpa / MAX_GPA)
             + INTERNSHIPS_WEIGHT * (min(profile.internships, MAX_COUNTED_INTERNSHIPS) / MAX_COUNTED_INTERNSHIPS))
    return round(score, 1)


def rank(profiles, recruiter_filter) -> list[tuple[object, float]]:
    """Hard-filter the profiles, score the rest and sort them best first.

    Returns (profile, score) pairs. Ties go to the higher GPA, then the newest profile.
    """
    scored = [(p, match_score(p, recruiter_filter)) for p in profiles if passes_hard_filters(p, recruiter_filter)]
    scored.sort(key=lambda pair: (pair[1], pair[0].gpa, pair[0].created_at, pair[0].id or 0), reverse=True)
    return scored


def rank_with_close(profiles, recruiter_filter) -> list[tuple[object, float, list[str]]]:
    """rank(), then the close matches after it. Returns (profile, score, missed) triples;
    missed is [] for a full match and names the must-haves a close match falls short on."""
    full = [(p, score, []) for p, score in rank(profiles, recruiter_filter)]
    close = []
    for p in profiles:
        if not p.details_complete:
            continue
        checks = requirement_checks(p, recruiter_filter)
        met = sum(ok for _, ok in checks)
        if met and met < len(checks):  # misses something, but meets at least one must-have
            close.append((p, match_score(p, recruiter_filter), [name for name, ok in checks if not ok], met))
    close.sort(key=lambda item: (item[3], item[1], item[0].gpa, item[0].created_at, item[0].id or 0), reverse=True)
    return full + [(p, score, missed) for p, score, missed, _ in close]
