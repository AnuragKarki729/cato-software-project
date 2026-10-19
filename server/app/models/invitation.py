from datetime import datetime

from sqlmodel import Field, SQLModel


# Responsibility 8
class Invitation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id")
    applicant_id: int = Field(foreign_key="user.id")
    message: str
    sent_at: datetime = Field(default_factory=datetime.now)
