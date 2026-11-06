from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True)
    password_hash: str | None = None  # Responsibility 7 login (Aye Myo Myat)
    role: str  # "applicant" or "recruiter"
    company_name: str | None = None  # recruiters only