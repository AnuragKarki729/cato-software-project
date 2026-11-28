# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
from pydantic import BaseModel, Field

# Declining asks for a reason, optional. Left blank, this is what the recruiter reads.
DEFAULT_DECLINE_REASON = "I don't think I fit well into this role."
MAX_DECLINE_REASON = 200


class InvitationCreate(BaseModel):
    applicant_id: int


class InvitationDecline(BaseModel):
    reason: str | None = Field(default=None, max_length=MAX_DECLINE_REASON)


class ReceivedInvitation(BaseModel):
    id: int
    company: str
    recruiter: str
    # Released once the applicant accepts, the same rule as their email on the recruiter's
    # side: accepting is when both sides can contact each other.
    recruiter_email: str | None = None
    decline_reason: str | None = None  # the applicant's own reason, once they declined
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
    # Why they said no: their words, or the default when they gave none. Declined only.
    decline_reason: str | None = None
