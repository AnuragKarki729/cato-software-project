# Responsibility 6: Saved searches and bookmarks (optional)
# Owner: Aye Myo Myat (6837919)
from pydantic import BaseModel

from app.schemas.filter import FilterIn


class SavedSearchIn(FilterIn):
    name: str


class SavedSearchOut(SavedSearchIn):
    id: int
    recruiter_id: int


class BookmarkIn(BaseModel):
    applicant_id: int


class BookmarkOut(BookmarkIn):
    id: int
    recruiter_id: int
