# Responsibility 6 — Aye Myo Myat (6837919)
"""A recruiter's named search, kept so they can run it again.

The same five fields as `recruiterfilter` plus a name. They are stored rather than pointed at
that table because the two mean different things: `recruiterfilter` is the one search a
recruiter is looking at right now, and running a saved search copies itself over it
(`POST /saved/searches/{id}/run`). A foreign key would make editing the current filter quietly
rewrite the saved one.
"""
from sqlmodel import Field, SQLModel


class SavedSearch(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id", index=True)
    name: str = Field(max_length=100)
    field_of_study: str | None = None
    min_year: int = 1
    min_gpa: float = 0.0
    min_internships: int = 0
    skills: str = ""  # comma separated, the same shape recruiterfilter uses
