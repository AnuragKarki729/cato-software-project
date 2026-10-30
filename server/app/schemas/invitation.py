# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
from datetime import datetime

from pydantic import BaseModel


class InvitationIn(BaseModel):
    applicant_id: int


class InvitationOut(BaseModel):
    id: int
    recruiter_id: int
    applicant_id: int
    applicant_name: str
    message: str
    sent_at: datetime
