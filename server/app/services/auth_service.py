from fastapi import Depends, Header, HTTPException
from sqlmodel import Session
from app.database import get_session
from app.models import User


def get_current_user(x_user_id: int | None = Header(default=None), session: Session = Depends(get_session)) -> User:
    """Get the current user based on the X-User-Id header."""
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    user = session.get(User, x_user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


def get_current_applicant(user: User = Depends(get_current_user)) -> User:
    """Get the current applicant user."""
    if user.role != "applicant":
        raise HTTPException(status_code=403, detail="Only applicants can do this")
    return user


def get_current_recruiter(user: User = Depends(get_current_user)) -> User:
    """Get the current recruiter user."""
    if user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can do this")
    return user