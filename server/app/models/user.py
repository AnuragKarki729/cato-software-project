# Responsibility 7: Sign up, log in and roles
# Owner: Aye Myo Myat (6837919)
from sqlmodel import Field, SQLModel


# Responsibility 7
class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True)
    password_hash: str | None = None
    role: str  # "applicant" or "recruiter"
    company_name: str | None = None  # recruiters only
