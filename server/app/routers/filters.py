# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
"""Recruiter filter page (Responsibility 4)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.filter import FilterIn, FilterOut
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/filters", tags=["filters"])


@router.get("/me", response_model=FilterOut)
def get_my_filter(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(4)


@router.put("/me", response_model=FilterOut)
def save_my_filter(body: FilterIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    # TODO: create or update; check field_of_study and skills are in the fixed options.
    raise todo(4)
