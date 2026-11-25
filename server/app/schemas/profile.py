# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.services.options_service import INTERNSHIPS, MAX_SKILLS, YEARS

# University, field of study and skills are growing vocabularies, so they are no longer
# checked against a frozen list here: a resume naming a university outside the original
# eight was rejected with "Select a university from the list" even though it had been read
# correctly. The router resolves each value through vocabulary_service, which decides the
# canonical spelling and adds genuinely new terms. These validators only check shape.
MAX_TERM = 120


class ProfileDraftIn(BaseModel):
    """"Save draft": every field is optional, but whatever is sent must be valid."""
    university: str | None = None
    field_of_study: str | None = None
    year: int | None = None
    gpa: float | None = Field(default=None, ge=0, le=4, allow_inf_nan=False)
    skills: list[str] = Field(default_factory=list)
    internships: int | None = None

    @field_validator('university', 'field_of_study')
    @classmethod
    def valid_term(cls, value):
        """A vocabulary term: any reasonable text. The router resolves it to a canonical label."""
        if value is None:
            return None
        text = ' '.join(str(value).split())
        if not text:
            return None
        if len(text) > MAX_TERM:
            raise ValueError(f'Keep this under {MAX_TERM} characters')
        return text

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
        """Skills are a growing vocabulary too, so only the shape is checked here."""
        cleaned = []
        for skill in value:
            text = ' '.join(str(skill).split())
            if not text:
                continue
            if len(text) > MAX_TERM:
                raise ValueError(f'Keep each skill under {MAX_TERM} characters')
            cleaned.append(text)
        cleaned = list(dict.fromkeys(cleaned))  # drop duplicates, keep order
        if len(cleaned) > MAX_SKILLS:
            raise ValueError(f'Pick up to {MAX_SKILLS} skills')
        return cleaned


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
    # "none", "pending", "done" or "failed": how the background read of the resume went.
    parse_status: str = "none"
    details_complete: bool = False
    onboarding_complete: bool = False
    updated_at: datetime | None = None
    # Issue #5 — privacy, shown on Settings. Only ever read by the applicant themselves:
    # GET /profiles/{id} serves the recruiter's view and leaves both of these out.
    hidden: bool = False
    blocked_companies: list[str] = Field(default_factory=list)


class PrivacyIn(BaseModel):
    """The Settings page: who may see this applicant.

    Separate from ProfileIn because it is not part of onboarding and has nothing to do with
    whether a profile counts as complete — an applicant edits it long after they are set up.
    """
    hidden: bool = False
    blocked_companies: list[str] = Field(default_factory=list)

    @field_validator("blocked_companies")
    @classmethod
    def tidy(cls, value):
        # Deduplicated without case or spacing, so "Agoda" and "agoda " are one block, and
        # capped so the column cannot be filled up.
        seen, kept = set(), []
        for name in value:
            name = " ".join((name or "").split())
            key = name.casefold()
            if name and key not in seen:
                seen.add(key)
                kept.append(name[:120])
        return kept[:50]
