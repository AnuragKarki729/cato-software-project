# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
from sqlmodel import Field, SQLModel


# Responsibility 2
class ApplicantProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    university: str
    field_of_study: str
    year: int  # 1 to 5 (5 = graduated)
    gpa: float  # 0.0 to 4.0
    skills: str = ""  # comma separated, e.g. "Python,React,SQL"
    internships: int = 0
    resume_location: str | None = None  # storage key of the resume PDF
