from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.config import MAX_EXTRA_VIDEOS, MAX_VIDEO_CAPTION, MAX_VIDEO_SECONDS, MAX_VIDEO_TITLE
from app.database import get_session
from app.models import User, Video
from app.schemas.video import VideoOut
from app.services import storage_service
from app.services.auth_service import get_current_applicant, get_current_user
from app.services.options_service import FREE_TOPIC, VIDEO_TITLES

router = APIRouter(tags=["videos"])
ALLOWED_EXTENSIONS = {"mp4", "mov", "webm"}

def as_video_out(video: Video) -> VideoOut:
    """Convert a Video model to a VideoOut schema."""
    return VideoOut(
        id=video.id,
        applicant_id=video.applicant_id,
        kind=video.kind,
        duration_seconds=video.duration_seconds,
        title=video.title,
        description=video.description,
        url=storage_service.get_url(video.file_location),
        created_at=video.created_at,
    )

@router.post("", response_model=VideoOut)
def upload_video(
    file: UploadFile = File(...),
    kind: str = Form(...),  # "pitch" or "extra"
    duration_seconds: float = Form(...),
    title: str = Form(FREE_TOPIC),  # a fixed title, or the applicant's own free-topic wording
    description: str | None = Form(None),  # the applicant's caption
    user: User = Depends(get_current_applicant),
    session: Session = Depends(get_session),
):
    if kind not in {"pitch", "extra"}:
        raise HTTPException(status_code=422, detail="Video kind must be 'pitch' or 'extra'")
    if duration_seconds <= 0 or duration_seconds > MAX_VIDEO_SECONDS:
        raise HTTPException(status_code=422, detail=f"Videos must be between 1 and {MAX_VIDEO_SECONDS} seconds")
    # Issue #3: the three structured titles stay fixed, because they are the questions a
    # recruiter is looking for an answer to. A "Free topic" video is the applicant's own, so
    # their own wording is allowed there and only the shape is checked — the same approach
    # the growing vocabularies take in schemas/profile.py. Blank falls back to "Free topic".
    title = " ".join((title or "").split()) or FREE_TOPIC
    if title not in VIDEO_TITLES and len(title) > MAX_VIDEO_TITLE:
        raise HTTPException(status_code=422, detail=f"Titles are limited to {MAX_VIDEO_TITLE} characters")
    caption = (description or "").strip() or None
    if caption and len(caption) > MAX_VIDEO_CAPTION:
        raise HTTPException(status_code=422, detail=f"Captions are limited to {MAX_VIDEO_CAPTION} characters")
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=422, detail="Please upload a video file")

    extension = (file.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Use an MP4, MOV, or WebM video")

    existing = session.exec(select(Video).where(Video.applicant_id == user.id)).all()
    if kind == "extra" and sum(v.kind == "extra" for v in existing) >= MAX_EXTRA_VIDEOS:
        raise HTTPException(status_code=409, detail=f"You can upload up to {MAX_EXTRA_VIDEOS} short videos")

    # Folder comes from the email, not the database id, so it survives a database wipe.
    home = storage_service.user_folder(user.email)
    folder = home if kind == "pitch" else f"{home}/shorts"
    key = storage_service.save(
        file.file.read(), folder, extension, filename="pitch" if kind == "pitch" else None
    )

    # A new pitch replaces the old one. Cloudinary overwrites the same public id,
    # so only the old database row needs to be replaced
    if kind == "pitch":
        for old in existing:
            if old.kind == "pitch":
                session.delete(old)

    video = Video(applicant_id=user.id, file_location=key, kind=kind, duration_seconds=duration_seconds,
                  title=title, description=caption)
    session.add(video)
    session.commit()
    session.refresh(video)
    return as_video_out(video)

@router.get("/applicant/{applicant_id}", response_model=list[VideoOut])
def list_videos(
    applicant_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    videos = session.exec(
        select(Video).where(Video.applicant_id == applicant_id).order_by(Video.created_at.desc())
    ).all()
    return [as_video_out(v) for v in videos]


@router.get("/{video_id}", response_model=VideoOut)
def get_video(
    video_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    video = session.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return as_video_out(video)

@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: int,
    user: User = Depends(get_current_applicant),
    session: Session = Depends(get_session),
):
    video = session.get(Video, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.applicant_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own videos")
    storage_service.delete(video.file_location)
    session.delete(video)
    session.commit()
