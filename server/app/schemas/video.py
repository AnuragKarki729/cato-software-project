from datetime import datetime

from pydantic import BaseModel


class VideoOut(BaseModel):
    id: int
    applicant_id: int
    kind: str
    duration_seconds: float
    url: str
    created_at: datetime


class FeedItem(VideoOut):
    name: str  # applicant's name