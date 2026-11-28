# Responsibility 6 — Aye Myo Myat (6837919)
from pydantic import BaseModel, Field, field_validator
from app.schemas.filter import FilterIn
from app.services.options_service import MAX_SKILLS


class SavedSearchIn(FilterIn):
    """A saved search is the filter form plus a name.

    The shape is checked here; whether a field of study or a skill actually exists is checked
    in the router, against the database vocabulary. It cannot be done here because a Pydantic
    validator has no session, and it must not be done against options_service's seed lists:
    those are only the starting values now, and a recruiter picking a term the form offered
    them would be told to "select from the list". The same split as routers/filters.py.
    """
    name: str = Field(min_length=1, max_length=100)
    min_year: int = Field(default=1, ge=1, le=5)
    min_internships: int = Field(default=0, ge=0, le=100)
    min_gpa: float = Field(default=0, ge=0, le=4, allow_inf_nan=False)
    skills: list[str] = Field(default_factory=list, max_length=MAX_SKILLS)

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Search name is required')
        return value

    @field_validator('skills')
    @classmethod
    def no_repeats(cls, value):
        return list(dict.fromkeys(value))


class SavedSearchOut(SavedSearchIn):
    id: int
    recruiter_id: int
    match_count: int = 0


class BookmarkIn(BaseModel):
    applicant_id: int = Field(gt=0)


class BookmarkOut(BookmarkIn):
    """What the Saved page shows about a bookmarked candidate.

    The plain fields are the candidate as they are NOW, read from their profile. The
    `searched_*` ones are the recruiter's search as it was when they saved them, which is
    also what `match_score` and `meets_requirements` are worked out against — a score and the
    filter beside it have to be the same search or the number means nothing.
    """
    id: int
    recruiter_id: int
    name: str
    field_of_study: str | None = None
    year: int | None = None
    gpa: float | None = None
    internships: int | None = None
    skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    required_skills_count: int = 0
    match_score: float | None = None
    meets_requirements: bool | None = None
    pitch_url: str | None = None
    pitch_duration: float | None = None
    invited: bool = False

    # False when the candidate was bookmarked from Explore, which has no filter: there is no
    # search to show and no score to go with it.
    searched: bool = False
    searched_field_of_study: str | None = None
    searched_min_year: int | None = None
    searched_min_gpa: float | None = None
    searched_min_internships: int | None = None
    searched_skills: list[str] = Field(default_factory=list)
