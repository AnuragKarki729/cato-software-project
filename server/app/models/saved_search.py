# Responsibility 6: Saved searches and bookmarks (optional)
# Owner: Aye Myo Myat (6837919)
from sqlmodel import Field, SQLModel


# Responsibility 6 (same filter fields as RecruiterFilter, plus a name)
class SavedSearch(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id")
    name: str
    field_of_study: str | None = None
    min_year: int = 1
    min_internships: int = 0
    skills: str = ""
    min_gpa: float = 0.0
