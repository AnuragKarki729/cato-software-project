# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Invitation(SQLModel, table=True):
    """One invitation from a recruiter to an applicant. One per pair."""
    id: int | None = Field(default=None, primary_key=True)
    recruiter_id: int = Field(foreign_key="user.id")
    applicant_id: int = Field(foreign_key="user.id")
    message: str = ""
    status: str = "pending"  # pending, accepted, declined, expired
    decline_reason: str | None = None
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=False), nullable=False))
    responded_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False), nullable=True))
    expires_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False), nullable=True))
    # Issue #4: when the applicant first opened their inbox with this invitation in it. A pending
    # invitation with this set is shown to the recruiter as "Viewed".
    viewed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False), nullable=True))
