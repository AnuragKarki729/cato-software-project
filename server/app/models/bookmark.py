# Responsibility 6: Saved searches and bookmarks (optional)
# Owner: Aye Myo Myat (6837919)
from sqlmodel import Field, SQLModel


# Responsibility 6
class Bookmark(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id")
    applicant_id: int = Field(foreign_key="user.id")
