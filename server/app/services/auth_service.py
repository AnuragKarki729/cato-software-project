# Responsibility 7: Sign up, log in and roles
# Owner: Aye Myo Myat (6837919)
"""Who is the current user?

TEMPORARY development login: the client sends the chosen dummy user's id in the
"X-User-Id" header, so every responsibility can be built before real login exists.
Responsibility 7 replaces get_current_user with real login checking.
"""
from fastapi import Depends, Header, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models import User


def get_current_user(x_user_id: int | None = Header(default=None), session: Session = Depends(get_session)) -> User:
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    user = session.get(User, x_user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


def get_current_applicant(user: User = Depends(get_current_user)) -> User:
    if user.role != "applicant":
        raise HTTPException(status_code=403, detail="Only applicants can do this")
    return user


def get_current_recruiter(user: User = Depends(get_current_user)) -> User:
    if user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can do this")
    return user
