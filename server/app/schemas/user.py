# Responsibility 7: Sign up, log in and roles
# Owner: Aye Myo Myat (6837919)
from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    company_name: str | None = None


class SignUpIn(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "applicant" or "recruiter"
    company_name: str | None = None  # required for recruiters


class LogInIn(BaseModel):
    email: str
    password: str
