from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.services.options_service import get_options

router = APIRouter(prefix="/options", tags=["options"])


@router.get("")
def list_options(session: Session = Depends(get_session)):
    """Options for the applicant profile form and the recruiter filter form.

    Universities and fields of study come from the database and grow as applicants add
    terms; the rest are fixed.
    """
    return get_options(session)
