from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Video
from app.schemas.video import FeedItem
from app.services.auth_service import get_current_user
from app.routers.videos import as_video_out

router = APIRouter(tags=["feed"])

@router.get("", response_model=list[FeedItem])
def get_feed(
    page: int = Query(default=1, ge=1),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get the feed of pitch videos, newest first.
    
    Returns 10 videos per page, newest first.
    Each item includes the applicant's name.
    """
    # Calculate offset for pagination
    offset = (page - 1) * 10
    
    # Build the query with join and filtering
    statement = (
        select(Video, User.name)
        .join(User, Video.applicant_id == User.id)
        .where(Video.kind == "pitch")
    )

    # Applicants do not see their own videos; recruiters see everyone's.
    if user.role == "applicant":
        statement = statement.where(Video.applicant_id != user.id)

    statement = statement.order_by(Video.created_at.desc()).offset(offset).limit(10)

    # Execute query
    results = session.exec(statement).all()
    
    # Convert to FeedItem objects
    feed_items = []
    for video, name in results:
        video_out = as_video_out(video)
        feed_item = FeedItem(**video_out.model_dump(), name=name)
        feed_items.append(feed_item)
    
    return feed_items
