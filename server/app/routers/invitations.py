# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
"""Send, receive, accept and decline invitations.

POST   /api/invitations                — recruiter sends an invitation
GET    /api/invitations/sent           — recruiter's sent invitations
GET    /api/invitations/received       — applicant's received invitations
POST   /api/invitations/{id}/accept    — applicant accepts
POST   /api/invitations/{id}/decline   — applicant declines (optional reason)

Statuses the recruiter sees (issue #4): pending ("Sent"), viewed, accepted, declined, expired.
"viewed" is not stored as a status: it is a pending invitation whose applicant has opened their
inbox since it arrived, so accepting and declining still only ever deal with "pending".
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, User
from app.models.invitation import Invitation
from app.schemas.invitation import (
    DEFAULT_DECLINE_REASON,
    InvitationCreate,
    InvitationDecline,
    ReceivedInvitation,
    SentInvitation,
)
from app.services.auth_service import get_current_applicant, get_current_recruiter

router = APIRouter(prefix="/invitations", tags=["invitations"])

EXPIRY_DAYS = 14


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _expire_if_needed(inv: Invitation) -> Invitation:
    if inv.status == "pending" and inv.expires_at and _utcnow() >= inv.expires_at:
        inv.status = "expired"
    return inv


def _shown_status(inv: Invitation) -> str:
    """What the recruiter sees: pending splits into "pending" (sent) and "viewed"."""
    return "viewed" if inv.status == "pending" and inv.viewed_at else inv.status


def _date_str(dt: datetime | None) -> str:
    return dt.strftime("%Y-%m-%d") if dt else ""


@router.post("", response_model=ReceivedInvitation, status_code=201)
def send_invitation(body: InvitationCreate,
                    user: User = Depends(get_current_recruiter),
                    session: Session = Depends(get_session)):
    applicant = session.exec(
        select(User).where(User.id == body.applicant_id, User.role == "applicant")
    ).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Issue #5: an applicant who is hidden, or who has blocked this company, cannot be invited.
    # The same 404 the rest of the app gives for them, so a recruiter cannot learn that someone
    # exists and has blocked them.
    profile = session.exec(
        select(ApplicantProfile).where(ApplicantProfile.user_id == body.applicant_id)
    ).first()
    if profile is None or profile.hidden or profile.blocks(user.company_name):
        raise HTTPException(status_code=404, detail="Applicant not found")

    company = user.company_name or "A company"
    message = f"{company} is interested in you and is sending this invitation to {applicant.name} about a job vacancy."

    existing = session.exec(
        select(Invitation).where(
            Invitation.recruiter_id == user.id,
            Invitation.applicant_id == body.applicant_id,
        )
    ).first()
    if existing:
        existing = _expire_if_needed(existing)
        # One live invitation at a time. A declined or expired one is finished, so asking
        # again is allowed and reuses the row — the applicant sees one invitation per company
        # rather than a list of repeats.
        if existing.status in {"pending", "accepted"}:
            raise HTTPException(status_code=409, detail="You have already invited this applicant")
        existing.message = message
        existing.status = "pending"
        existing.decline_reason = None
        existing.responded_at = None
        existing.viewed_at = None
        existing.created_at = _utcnow()
        existing.expires_at = _utcnow() + timedelta(days=EXPIRY_DAYS)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return ReceivedInvitation(
            id=existing.id, company=company, recruiter=user.name, team="",
            message=existing.message, status=existing.status, date=_date_str(existing.created_at),
        )

    inv = Invitation(
        recruiter_id=user.id,
        applicant_id=body.applicant_id,
        message=message,
        status="pending",
        expires_at=_utcnow() + timedelta(days=EXPIRY_DAYS),
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)

    return ReceivedInvitation(
        id=inv.id,
        company=company,
        recruiter=user.name,
        team="",
        message=inv.message,
        status=inv.status,
        date=_date_str(inv.created_at),
    )


@router.get("/sent", response_model=list[SentInvitation])
def sent_invitations(user: User = Depends(get_current_recruiter),
                     session: Session = Depends(get_session)):
    invitations = session.exec(
        select(Invitation).where(Invitation.recruiter_id == user.id)
        .order_by(Invitation.created_at.desc())
    ).all()

    results = []
    for inv in invitations:
        _expire_if_needed(inv)
        applicant = session.get(User, inv.applicant_id)
        profile = session.exec(
            select(ApplicantProfile).where(ApplicantProfile.user_id == inv.applicant_id)
        ).first()
        detail_parts = []
        if profile:
            if profile.field_of_study:
                detail_parts.append(profile.field_of_study)
            if profile.year:
                detail_parts.append(f"Year {profile.year}" if profile.year < 5 else "Graduated")
        email = applicant.email if inv.status == "accepted" else None
        results.append(SentInvitation(
            id=inv.id,
            applicant_id=inv.applicant_id,
            name=applicant.name if applicant else "Unknown",
            detail=" · ".join(detail_parts) if detail_parts else "",
            status=_shown_status(inv),
            date=_date_str(inv.created_at),
            email=email,
            decline_reason=inv.decline_reason if inv.status == "declined" else None,
        ))
    session.commit()
    return results


@router.get("/received", response_model=list[ReceivedInvitation])
def received_invitations(user: User = Depends(get_current_applicant),
                         session: Session = Depends(get_session)):
    invitations = session.exec(
        select(Invitation).where(Invitation.applicant_id == user.id)
        .order_by(Invitation.created_at.desc())
    ).all()

    results = []
    now = _utcnow()
    for inv in invitations:
        _expire_if_needed(inv)
        # Opening the inbox is what "viewed" means: the applicant has now seen it.
        if inv.status == "pending" and inv.viewed_at is None:
            inv.viewed_at = now
            session.add(inv)
        recruiter = session.get(User, inv.recruiter_id)
        company = recruiter.company_name or "A company" if recruiter else "Unknown"
        results.append(ReceivedInvitation(
            id=inv.id,
            company=company,
            recruiter=recruiter.name if recruiter else "Unknown",
            recruiter_email=recruiter.email if recruiter and inv.status == "accepted" else None,
            decline_reason=inv.decline_reason if inv.status == "declined" else None,
            team="",
            message=inv.message,
            status=inv.status,
            date=_date_str(inv.responded_at or inv.created_at),
        ))
    session.commit()
    return results


def _answer_invitation(invitation_id: int, user: User, session: Session) -> Invitation:
    inv = session.get(Invitation, invitation_id)
    if not inv or inv.applicant_id != user.id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    _expire_if_needed(inv)
    if inv.status != "pending":
        raise HTTPException(status_code=409, detail=f"Invitation is already {inv.status}")
    return inv


@router.post("/{invitation_id}/accept", response_model=ReceivedInvitation)
def accept_invitation(invitation_id: int,
                      user: User = Depends(get_current_applicant),
                      session: Session = Depends(get_session)):
    inv = _answer_invitation(invitation_id, user, session)
    inv.status = "accepted"
    inv.responded_at = _utcnow()
    session.commit()
    session.refresh(inv)

    recruiter = session.get(User, inv.recruiter_id)
    return ReceivedInvitation(
        id=inv.id,
        company=recruiter.company_name or "A company" if recruiter else "Unknown",
        recruiter=recruiter.name if recruiter else "Unknown",
        recruiter_email=recruiter.email if recruiter else None,
        team="",
        message=inv.message,
        status=inv.status,
        date=_date_str(inv.responded_at),
    )


@router.post("/{invitation_id}/decline", response_model=ReceivedInvitation)
def decline_invitation(invitation_id: int,
                       body: InvitationDecline = None,
                       user: User = Depends(get_current_applicant),
                       session: Session = Depends(get_session)):
    inv = _answer_invitation(invitation_id, user, session)
    inv.status = "declined"
    inv.responded_at = _utcnow()
    # Optional: blank (or no body at all) gets the polite default, so the recruiter always
    # reads a reason rather than nothing.
    reason = " ".join((body.reason or "").split()) if body else ""
    inv.decline_reason = reason or DEFAULT_DECLINE_REASON
    session.commit()
    session.refresh(inv)

    recruiter = session.get(User, inv.recruiter_id)
    return ReceivedInvitation(
        id=inv.id,
        company=recruiter.company_name or "A company" if recruiter else "Unknown",
        recruiter=recruiter.name if recruiter else "Unknown",
        team="",
        message=inv.message,
        status=inv.status,
        decline_reason=inv.decline_reason,
        date=_date_str(inv.responded_at),
    )
