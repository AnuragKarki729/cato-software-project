from datetime import datetime

from pydantic import BaseModel


class InvitationIn(BaseModel):
    applicant_id: int


class InvitationOut(BaseModel):
    id: int
    recruiter_id: int
    applicant_id: int
    message: str
    sent_at: datetime
