# Responsibility 7 — Aye Myo Myat (6837919)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, AuthSession, RegistrationConsent, User, Video
from app.schemas.user import LogInIn, SignUpIn, TokenOut, UserOut
from app.services.auth_service import (DUMMY_HASH, get_current_session, get_current_user,
                                      hash_password, issue_session, verify_password)

router = APIRouter(prefix='/auth', tags=['auth'])


def public_user(user, session):
    result = UserOut.model_validate(user)
    if user.role == 'applicant':
        profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id)).first()
        pitch = session.exec(select(Video).where(Video.applicant_id == user.id, Video.kind == 'pitch')).first()
        result.onboarding_step = 'profile' if not profile or not profile.resume_location else 'video' if not pitch else 'complete'
    return result


@router.post('/signup', response_model=UserOut, status_code=201)
def sign_up(body: SignUpIn, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == body.email)).first():
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    user = User(name=body.name, email=body.email, role=body.role,
                company_name=body.company_name, password_hash=hash_password(body.password))
    session.add(user)
    try:
        session.flush()
        if body.role == 'applicant':
            session.add(RegistrationConsent(user_id=user.id))
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    session.refresh(user)
    return public_user(user, session)


@router.post('/login', response_model=TokenOut)
def log_in(body: LogInIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    valid = verify_password(body.password, user.password_hash if user and user.password_hash else DUMMY_HASH)
    if not user or not user.password_hash or not valid:
        raise HTTPException(status_code=401, detail='Incorrect email or password')
    return TokenOut(access_token=issue_session(user, session), user=public_user(user, session))


@router.get('/me', response_model=UserOut)
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return public_user(user, session)


@router.post('/logout', status_code=204)
def log_out(login: AuthSession = Depends(get_current_session), session: Session = Depends(get_session)):
    session.delete(login)
    session.commit()
