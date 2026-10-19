"""Sign up, log in and roles (Responsibility 7)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.user import LogInIn, SignUpIn, UserOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut)
def sign_up(body: SignUpIn, session: Session = Depends(get_session)):
    # TODO: reject duplicate emails, require company_name for recruiters, hash the password.
    raise todo(7)


@router.post("/login")
def log_in(body: LogInIn, session: Session = Depends(get_session)):
    # TODO: check the password and return a login token.
    raise todo(7)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
