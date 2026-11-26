# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
from pydantic import BaseModel


class InvitationCreate(BaseModel):
    applicant_id: int


class InvitationDecline(BaseModel):
    reason: str | None = None


class ReceivedInvitation(BaseModel):
    id: int
    company: str
    recruiter: str
    team: str | None = None
    message: str
    status: str
    date: str


class SentInvitation(BaseModel):
    id: int
    applicant_id: int
    name: str
    detail: str
    status: str
    date: str
    email: str | None = None
