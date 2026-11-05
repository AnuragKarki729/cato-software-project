# Responsibility 1: Video upload and video retrieval
# Owner: Anurag Karki (6838852)
"""Video upload and video retrieval (Responsibility 1)."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.config import CLOUDINARY_URL, MAX_EXTRA_VIDEOS, MAX_VIDEO_SECONDS
from app.database import get_session
from app.models import User, Video
from app.schemas.video import VideoOut
from app.services.auth_service import get_current_user, get_current_applicant
from app.services import storage_service

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_EXTENSIONS = {"mp4", "mov", "webm"}


def as_video_out(video: Video) -> VideoOut:
    return VideoOut(
        id=video.id,
        applicant_id=video.applicant_id,
        kind=video.kind,
        duration_seconds=video.duration_seconds,
        url=storage_service.get_url(video.file_location),
        created_at=video.created_at,
    )


@router.post("", response_model=VideoOut)
def upload_video(
    file: UploadFile = File(...),
    kind: str = Form(...),  # "pitch" or "extra"
    duration_seconds: float = Form(...),
    user: User = Depends(get_current_applicant),
    session: Session = Depends(get_session),
):
    if kind not in {"pitch", "extra"}:
        raise HTTPException(status_code=422, detail="Video kind must be 'pitch' or 'extra'")
    if duration_seconds <= 0 or duration_seconds > MAX_VIDEO_SECONDS:
        raise HTTPException(status_code=422, detail=f"Videos must be between 1 and {MAX_VIDEO_SECONDS} seconds")
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=422, detail="Please upload a video file")

    extension = (file.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Use an MP4, MOV, or WebM video")

    existing = session.exec(select(Video).where(Video.applicant_id == user.id)).all()
    if kind == "extra" and sum(video.kind == "extra" for video in existing) >= MAX_EXTRA_VIDEOS:
        raise HTTPException(status_code=409, detail=f"You can upload up to {MAX_EXTRA_VIDEOS} short videos")

    folder = f"v1_cato/users/{user.id}" if kind == "pitch" else f"v1_cato/users/{user.id}/shorts"
    key = storage_service.save(file.file.read(), folder, extension, filename="pitch" if kind == "pitch" else None)
    old_pitch = next((video for video in existing if video.kind == "pitch"), None)
    if kind == "pitch" and old_pitch is not None:
        # Cloudinary overwrites the stable pitch public ID. Local storage may need
        # an old file with a different extension removed separately.
        if not CLOUDINARY_URL and old_pitch.file_location != key:
            storage_service.delete(old_pitch.file_location)
        session.delete(old_pitch)
    video = Video(applicant_id=user.id, file_location=key, kind=kind, duration_seconds=duration_seconds)
    session.add(video)
    session.commit()
    session.refresh(video)
    return as_video_out(video)


@router.get("/applicant/{applicant_id}", response_model=list[VideoOut])
def list_videos(applicant_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    videos = session.exec(
        select(Video).where(Video.applicant_id == applicant_id).order_by(Video.created_at.desc())
    ).all()
    return [as_video_out(video) for video in videos]


@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    video = session.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return as_video_out(video)


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: int, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    video = session.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.applicant_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own videos")
    storage_service.delete(video.file_location)
    session.delete(video)
    session.commit()
