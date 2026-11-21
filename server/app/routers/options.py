from fastapi import APIRouter

from app.services.options_service import get_options

router = APIRouter(prefix="/options", tags=["options"])


@router.get("")
def list_options():
    """Fixed options for the applicant profile form and the recruiter filter form."""
    return get_options()
