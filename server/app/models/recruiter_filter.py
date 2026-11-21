# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
# Table contract from the project template. Added by Responsibility 5 (Nusrat Begam), whose
# matching reads it; the filter page and its save/load endpoints are still Responsibility 4.
from sqlmodel import Field, SQLModel


class RecruiterFilter(SQLModel, table=True):
    """The recruiter's current search: one row per recruiter."""
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id", unique=True)
    field_of_study: str | None = None  # None = any field
    min_year: int = 1
    min_internships: int = 0
    skills: str = ""  # required skills, comma separated
    min_gpa: float = 0.0
