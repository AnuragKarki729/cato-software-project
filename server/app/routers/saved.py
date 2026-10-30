# Responsibility 6: Saved searches and bookmarks (optional)
# Owner: Aye Myo Myat (6837919)
"""Saved searches and bookmarks (Responsibility 6, optional)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.saved import BookmarkIn, BookmarkOut, SavedSearchIn, SavedSearchOut
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/saved", tags=["saved"])


@router.get("/searches", response_model=list[SavedSearchOut])
def list_saved_searches(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.post("/searches", response_model=SavedSearchOut)
def create_saved_search(body: SavedSearchIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.delete("/searches/{search_id}", status_code=204)
def delete_saved_search(search_id: int, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.get("/bookmarks", response_model=list[BookmarkOut])
def list_bookmarks(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.post("/bookmarks", response_model=BookmarkOut)
def create_bookmark(body: BookmarkIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)


@router.delete("/bookmarks/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: int, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    raise todo(6)
