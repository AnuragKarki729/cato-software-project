# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
from pydantic import BaseModel


class FilterIn(BaseModel):
    field_of_study: str | None = None
    min_year: int = 1
    min_internships: int = 0
    skills: list[str] = []
    min_gpa: float = 0.0


class FilterOut(FilterIn):
    recruiter_id: int
