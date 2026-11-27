# Responsibility 6 — Aye Myo Myat (6837919)
"""A candidate a recruiter has set aside to come back to.

What the candidate IS — their field, year, GPA, skills, pitch — is read from the profile when
the page asks for it, so a bookmark never shows details a candidate has since changed.

The SEARCH is different. It is copied onto the row when the bookmark is made and never
changes after. A match score only means anything next to the filter that produced it, and
scoring against whatever filter happened to be current meant a candidate saved at 82 under a
Python search quietly read 31 once the recruiter moved on to a Design search — the same
bookmark, a different number, and nothing on the page explaining it. Worse, `meets_requirements`
would flip, so a saved candidate appeared to fail a search nobody had ever run on them.

One row per (recruiter, applicant): bookmarking twice returns the row that is already there.
"""
from sqlmodel import Field, SQLModel, UniqueConstraint


class Bookmark(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("recruiter_id", "applicant_id", name="one_bookmark_per_candidate"),)

    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id", index=True)
    applicant_id: int = Field(foreign_key="user.id", index=True)

    # The recruiter's search as it stood when they saved this candidate. The same five fields
    # recruiterfilter holds, copied rather than pointed at: a foreign key would make editing
    # the current search rewrite the history of every bookmark taken under the old one.
    # All optional — a candidate can be bookmarked from Explore, which has no filter at all.
    searched: bool = False  # was there a filter to copy? distinguishes "no search" from "any field"
    field_of_study: str | None = None
    min_year: int = 1
    min_gpa: float = 0.0
    min_internships: int = 0
    skills: str = ""  # comma separated, the same shape recruiterfilter uses
