# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    # Naive UTC, like the other tables: MySQL DATETIME and SQLite return naive values.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ApplicantProfile(SQLModel, table=True):
    """One profile per applicant.

    The education fields may be empty while the applicant is still filling in the
    onboarding form ("Save draft"). Only complete profiles are used for matching.
    """
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    university: str | None = None
    field_of_study: str | None = None
    year: int | None = None  # 1 to 5 (5 = graduated)
    gpa: float | None = None  # 0.00 to 4.00
    skills: str = ""  # comma separated, e.g. "Python,React,SQL"
    internships: int | None = None
    resume_location: str | None = None  # storage key of the resume PDF
    resume_name: str | None = None  # original file name, shown in the UI
    resume_size: int | None = None  # bytes
    resume_uploaded_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False)))
    # Reading the resume with an LLM runs in the background after the upload, so the applicant
    # never waits: "none" (no resume yet), "pending", "done" or "failed".
    parse_status: str = "none"
    # Issue #5 — the applicant's own privacy controls, set from Settings.
    # `hidden` takes them out of every place a profile is listed: the recruiter's ranked
    # results and Explore, and the other applicants' video feed. It does not delete anything,
    # and an invitation already sent still stands.
    hidden: bool = False
    # Companies this applicant does not want to be seen by, comma separated and compared on
    # the company name. Those recruiters do not get them in results, Explore or an invitation.
    blocked_companies: str = ""
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=False), nullable=False))
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=False), nullable=False))

    def blocks(self, company: str | None) -> bool:
        """Has this applicant blocked that company? Compared without case or spacing, so
        "Line Company" and "line  company" are the same block."""
        if not company or not self.blocked_companies:
            return False
        wanted = " ".join(company.split()).casefold()
        return any(" ".join(name.split()).casefold() == wanted
                   for name in self.blocked_companies.split(",") if name.strip())

    @property
    def details_complete(self) -> bool:
        """All the fields matching needs are filled in."""
        return None not in (self.university, self.field_of_study, self.year, self.gpa, self.internships)

    @property
    def onboarding_complete(self) -> bool:
        """Onboarding also needs the resume PDF."""
        return self.details_complete and self.resume_location is not None
