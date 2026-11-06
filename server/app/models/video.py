from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="user.id")
    file_location: str  # storage key, e.g. "v1_cato/users/3/pitch.mp4"
    kind: str  # "pitch" or "extra"
    duration_seconds: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))