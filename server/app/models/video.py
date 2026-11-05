# Responsibility 1: Video upload and video retrieval
# Owner: Anurag Karki (6838852)
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


# Responsibility 1
class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="user.id")
    file_location: str  # storage key of the video file
    kind: str  # "pitch" or "extra"
    duration_seconds: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
