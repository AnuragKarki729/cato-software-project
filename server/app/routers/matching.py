# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begam (6638009)
"""Candidate matching and ranked results (Responsibility 5)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.matching import MatchResult
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/results", response_model=list[MatchResult])
def ranked_results(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    # TODO: load this recruiter's filter, load all applicant profiles,
    # use matching_service.match_score(...) for each profile that passes_hard_filters(...),
    # sort highest first and return MatchResult items.
    raise todo(5)
