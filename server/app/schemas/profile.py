# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
from pydantic import BaseModel


class ProfileIn(BaseModel):
    university: str
    field_of_study: str
    year: int
    gpa: float
    skills: list[str] = []
    internships: int = 0


class ProfileOut(ProfileIn):
    user_id: int
    resume_url: str | None = None
