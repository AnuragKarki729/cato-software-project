# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.services.options_service import FIELDS_OF_STUDY, INTERNSHIPS, MAX_SKILLS, SKILLS, UNIVERSITIES, YEARS


class ProfileDraftIn(BaseModel):
    """"Save draft": every field is optional, but whatever is sent must be valid."""
    university: str | None = None
    field_of_study: str | None = None
    year: int | None = None
    gpa: float | None = Field(default=None, ge=0, le=4, allow_inf_nan=False)
    skills: list[str] = Field(default_factory=list)
    internships: int | None = None

    @field_validator('university')
    @classmethod
    def valid_university(cls, value):
        if value is not None and value not in UNIVERSITIES:
            raise ValueError('Select a university from the list')
        return value

    @field_validator('field_of_study')
    @classmethod
    def valid_field(cls, value):
        if value is not None and value not in FIELDS_OF_STUDY:
            raise ValueError('Select a field of study from the list')
        return value

    @field_validator('year')
    @classmethod
    def valid_year(cls, value):
        if value is not None and value not in YEARS:
            raise ValueError('Select a year of study from the list')
        return value

    @field_validator('internships')
    @classmethod
    def valid_internships(cls, value):
        if value is not None and value not in INTERNSHIPS:
            raise ValueError('Select the number of internships from the list')
        return value

    @field_validator('gpa')
    @classmethod
    def two_decimals(cls, value):
        return None if value is None else round(value, 2)

    @field_validator('skills')
    @classmethod
    def valid_skills(cls, value):
        if any(skill not in SKILLS for skill in value):
            raise ValueError('Select skills from the list')
        value = list(dict.fromkeys(value))  # drop duplicates, keep order
        if len(value) > MAX_SKILLS:
            raise ValueError(f'Pick up to {MAX_SKILLS} skills')
        return value


class ProfileIn(ProfileDraftIn):
    """Saving the full profile: every field is required."""
    university: str
    field_of_study: str
    year: int
    gpa: float = Field(ge=0, le=4, allow_inf_nan=False)
    internships: int

    @field_validator('skills')
    @classmethod
    def at_least_one_skill(cls, value):
        if not value:
            raise ValueError('Pick at least one skill')
        return value


class ProfileOut(BaseModel):
    user_id: int
    name: str
    university: str | None = None
    field_of_study: str | None = None
    year: int | None = None
    gpa: float | None = None
    skills: list[str] = Field(default_factory=list)
    internships: int | None = None
    resume_url: str | None = None
    resume_name: str | None = None
    resume_size: int | None = None
    resume_uploaded_at: datetime | None = None
    details_complete: bool = False
    onboarding_complete: bool = False
    updated_at: datetime | None = None
