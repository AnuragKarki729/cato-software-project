from sqlmodel import Field, SQLModel


# Responsibility 4 (one current filter per recruiter)
class RecruiterFilter(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id", unique=True)
    field_of_study: str | None = None  # None = any field
    min_year: int = 1
    min_internships: int = 0
    skills: str = ""  # required skills, comma separated
    min_gpa: float = 0.0
