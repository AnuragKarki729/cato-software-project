"""Development helpers. Remove once real login (Responsibility 7) is finished."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/dev", tags=["dev"])


@router.get("/users")
def list_dummy_users(session: Session = Depends(get_session)) -> list[UserOut]:
    """All users, so the client can pick one to act as."""
    return session.exec(select(User)).all()
