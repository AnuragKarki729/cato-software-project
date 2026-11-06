# Responsibility 7 — Aye Myo Myat (6837919)
# Additive table: no migration or changes to the shared User table.
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class RegistrationConsent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='user.id', unique=True)
    scope: str = 'share_profile_and_videos_with_recruiters'
    notice_version: str = 'signup-v1'
    accepted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
                                  sa_column=Column(DateTime(timezone=False), nullable=False))
