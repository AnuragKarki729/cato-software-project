"""Invitations (Responsibility 8)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.invitation import InvitationIn, InvitationOut
from app.services.auth_service import get_current_applicant, get_current_recruiter

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("", response_model=InvitationOut)
def send_invitation(body: InvitationIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    # TODO: block duplicates, build the text with invitation_service.build_message.
    raise todo(8)


@router.get("/received", response_model=list[InvitationOut])
def received(user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    raise todo(8)


@router.get("/sent", response_model=list[InvitationOut])
def sent(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(8)
