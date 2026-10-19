"""Short-form video feed (Responsibility 3, optional)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.video import VideoOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=list[VideoOut])
def get_feed(page: int = 1, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # TODO: pitch videos 10 at a time; for recruiters, ordered by their match results.
    raise todo(3)
