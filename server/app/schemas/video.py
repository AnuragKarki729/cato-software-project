from datetime import datetime

from pydantic import BaseModel


class VideoOut(BaseModel):
    id: int
    applicant_id: int
    kind: str
    duration_seconds: float
    title: str
    description: str | None = None
    url: str
    created_at: datetime


class FeedItem(VideoOut):
    name: str  # applicant's name


# ---------- Explore candidates (Responsibility 3, recruiter side) ----------
# The explore feed pages through every applicant who has a pitch, with no filters. One
# candidate is one card, so each row carries all of that candidate's videos and the few
# profile facts the card shows: without them the page would call /profiles/{id} per card.

class ExploreField(BaseModel):
    """One tab in the category row: a field of study and how many candidates are in it."""
    field_of_study: str
    candidates: int


class ExploreCandidate(BaseModel):
    applicant_id: int
    name: str
    field_of_study: str | None = None
    university: str | None = None
    year: int | None = None
    gpa: float | None = None
    internships: int | None = None
    skills: list[str] = []
    # The "Stands out for" pills on the About card, read off the resume.
    talking_points: list[str] = []
    videos: list[VideoOut] = []  # the pitch first, then the extras, newest first
    # The explore feed ends on the resume: one more step sideways past the last video shows
    # it. Recruiters may see it, which is the same rule GET /api/profiles/{id} applies.
    resume_url: str | None = None
    resume_name: str | None = None
    resume_size: int | None = None


class ExplorePage(BaseModel):
    total: int
    offset: int
    limit: int
    field_of_study: str | None = None  # None means every field
    results: list[ExploreCandidate] = []