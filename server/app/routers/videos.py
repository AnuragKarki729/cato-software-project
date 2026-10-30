# Responsibility 1: Video upload and video retrieval
# Owner: Anurag Karki (6838852)
"""Video upload and video retrieval (Responsibility 1)."""
from fastapi import APIRouter, Depends, Form, UploadFile
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.routers._todo import todo
from app.schemas.video import VideoOut
from app.services.auth_service import get_current_user, get_current_applicant

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("", response_model=VideoOut)
def upload_video(
    file: UploadFile,
    kind: str = Form(...),  # "pitch" or "extra"
    duration_seconds: float = Form(...),
    user: User = Depends(get_current_applicant),
    session: Session = Depends(get_session),
):
    # TODO: check type and size, max 30 seconds (config.MAX_VIDEO_SECONDS),
    # one pitch video, max 5 extra videos (config.MAX_EXTRA_VIDEOS), then storage_service.save.
    raise todo(1)


@router.get("/applicant/{applicant_id}", response_model=list[VideoOut])
def list_videos(applicant_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    raise todo(1)


@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # TODO: return one video with its link from storage_service.get_url.
    raise todo(1)


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: int, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    raise todo(1)
