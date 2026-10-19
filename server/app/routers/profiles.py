"""Applicant profile and resume (Responsibility 2)."""
from fastapi import APIRouter, Depends, UploadFile
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.profile import ProfileIn, ProfileOut
from app.services.auth_service import get_current_user, get_current_applicant

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileOut)
def get_my_profile(user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    raise todo(2)


@router.put("/me", response_model=ProfileOut)
def save_my_profile(body: ProfileIn, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    # TODO: create or update the profile; check field_of_study and skills are in the fixed options.
    raise todo(2)


@router.post("/me/resume", response_model=ProfileOut)
def upload_resume(file: UploadFile, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    # TODO: accept PDF only, save with storage_service.save(data, "resumes", "pdf").
    raise todo(2)


@router.get("/{applicant_id}", response_model=ProfileOut)
def get_profile(applicant_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Used by recruiters to view an applicant (read-only)."""
    raise todo(2)
