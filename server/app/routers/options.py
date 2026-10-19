from fastapi import APIRouter

from app.services.options_service import get_options

router = APIRouter(prefix="/options", tags=["options"])


@router.get("")
def list_options():
    """Fixed options for the profile form and the filter form."""
    return get_options()
