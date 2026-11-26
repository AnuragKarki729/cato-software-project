# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
from pydantic import BaseModel, Field, field_validator


class FilterIn(BaseModel):
    """Body for PUT /api/filters/me."""
    field_of_study: str | None = None
    min_year: int = Field(default=1, ge=1, le=5)
    min_gpa: float = Field(default=0.0, ge=0, le=4)
    min_internships: int = Field(default=0, ge=0, le=5)
    skills: list[str] = Field(default_factory=list)

    @field_validator("skills")
    @classmethod
    def cap_skills(cls, v):
        return list(dict.fromkeys(v))[:10]


class FilterOut(BaseModel):
    field_of_study: str | None = None
    min_year: int = 1
    min_gpa: float = 0.0
    min_internships: int = 0
    skills: list[str] = Field(default_factory=list)
