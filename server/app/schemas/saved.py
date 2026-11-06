# Responsibility 6 — Aye Myo Myat (6837919)
from pydantic import BaseModel, Field, field_validator
from app.schemas.filter import FilterIn
from app.services.options_service import FIELDS_OF_STUDY, SKILLS


class SavedSearchIn(FilterIn):
    name: str = Field(min_length=1, max_length=100)
    min_year: int = Field(default=1, ge=1, le=5)
    min_internships: int = Field(default=0, ge=0, le=100)
    min_gpa: float = Field(default=0, ge=0, le=4, allow_inf_nan=False)
    skills: list[str] = Field(default_factory=list, max_length=len(SKILLS))

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Search name is required')
        return value

    @field_validator('field_of_study')
    @classmethod
    def valid_field(cls, value):
        if value is not None and value not in FIELDS_OF_STUDY:
            raise ValueError('Select a field of study from the available options')
        return value

    @field_validator('skills')
    @classmethod
    def valid_skills(cls, value):
        if any(skill not in SKILLS for skill in value):
            raise ValueError('Select skills from the available options')
        return list(dict.fromkeys(value))


class SavedSearchOut(SavedSearchIn):
    id: int
    recruiter_id: int
    match_count: int = 0


class BookmarkIn(BaseModel):
    applicant_id: int = Field(gt=0)


class BookmarkOut(BookmarkIn):
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
