"""Saved searches and bookmarks (Responsibility 6, optional)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/saved", tags=["saved"])


@router.get("/searches")
def list_saved_searches(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.get("/bookmarks")
def list_bookmarks(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)
