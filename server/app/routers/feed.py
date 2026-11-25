from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, col, func, select

from app.database import get_session
from app.models import ApplicantProfile, User, Video
from app.schemas.video import ExploreCandidate, ExploreField, ExplorePage, FeedItem
from app.services import storage_service
from app.services.auth_service import get_current_user
from app.services.matching_service import split_skills
from app.routers.videos import as_video_out
from app.routers.profiles import RESUME_TYPE  # "raw": the Cloudinary resource type for PDFs

router = APIRouter(tags=["feed"])

EXPLORE_LIMIT = 5

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
    # Issue #5: a hidden applicant, or one who has blocked this recruiter's company, is left out.
    statement = statement.where(col(Video.applicant_id).not_in(_concealed_ids(session, user)))

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


# ---------- Explore candidates ----------
# A feed over every applicant who has a pitch, with no filters at all: browsing instead of
# searching. Showing everyone at once would be unkind to the server, so the page asks for a
# few candidates at a time and the row of fields of study narrows it.
#
# Both roles read it. A recruiter sees every candidate; an applicant sees the same feed with
# themselves left out, which is what /feed does for the plain video list. The client decides
# what may be done with a candidate — only the recruiter's page offers saving and inviting.


def _has_pitch():
    """Applicant ids with an elevator pitch. The explore feed is built around the video, so a
    candidate without one has nothing to show and is left out."""
    return select(Video.applicant_id).where(Video.kind == "pitch")


def _others(statement, column, user: User):
    """Leave an applicant out of their own feed. A recruiter is never in it to begin with."""
    return statement.where(col(column) != user.id) if user.role == "applicant" else statement


def _concealed_ids(session: Session, user: User) -> list[int]:
    """Applicant ids this viewer may NOT see (issue #5): anyone who has hidden themselves, and
    — for a recruiter — anyone who has blocked their company.

    A deny-list, not an allow-list: an applicant who has uploaded a pitch but has no profile
    row yet has nothing to hide behind, and listing only the ids found in applicantprofile
    would have quietly dropped them from the feed.

    The blocks are a comma-separated list of names, matched in Python rather than SQL: the
    lists are short, and a LIKE would find "Line" inside "Line Company".
    """
    company = user.company_name if user.role == "recruiter" else None
    return [p.user_id for p in session.exec(select(ApplicantProfile)).all()
            if p.hidden or (company and p.blocks(company))]


@router.get("/fields", response_model=list[ExploreField])
def explore_fields(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """The tabs for the explore page: every field of study that has a candidate, biggest first.

    Counted from the profiles rather than the vocabulary, so a field nobody studies is not
    offered as an empty tab.
    """
    counted = _others(
        select(ApplicantProfile.field_of_study, func.count(col(ApplicantProfile.user_id)))
        .where(col(ApplicantProfile.field_of_study).is_not(None))
        .where(col(ApplicantProfile.user_id).in_(_has_pitch()))
        .where(col(ApplicantProfile.user_id).not_in(_concealed_ids(session, user))),
        ApplicantProfile.user_id, user,
    )
    rows = session.exec(counted.group_by(col(ApplicantProfile.field_of_study))).all()
    rows = sorted(rows, key=lambda row: (-row[1], row[0]))
    return [ExploreField(field_of_study=field, candidates=count) for field, count in rows]


@router.get("/explore", response_model=ExplorePage)
def explore_candidates(
    field_of_study: str | None = Query(default=None, description="one tab; omit for every field"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=EXPLORE_LIMIT, ge=1, le=20),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """One page of candidates, newest pitch first, each with all of their videos.

    The videos come with the candidate because the page swipes sideways through them: a second
    request per card would make every swipe wait on the network.
    """
    # Newest pitch first, with the user id as a tiebreaker so paging never repeats or skips a
    # candidate. A scalar subquery keeps the ordering out of the page's own GROUP BY.
    newest_pitch = (
        select(func.max(Video.created_at))
        .where(col(Video.applicant_id) == col(User.id), Video.kind == "pitch")
        .scalar_subquery()
    )
    found = _others(
        select(User.id)
        .join(ApplicantProfile, col(ApplicantProfile.user_id) == col(User.id))
        .where(User.role == "applicant")
        .where(col(User.id).in_(_has_pitch()))
        .where(col(User.id).not_in(_concealed_ids(session, user))),
        User.id, user,
    )
    if field_of_study:
        found = found.where(ApplicantProfile.field_of_study == field_of_study)

    total = session.exec(select(func.count()).select_from(found.subquery())).one()
    ids = list(session.exec(found.order_by(newest_pitch.desc(), col(User.id).desc()).offset(offset).limit(limit)).all())
    if not ids:
        return ExplorePage(total=total, offset=offset, limit=limit, field_of_study=field_of_study, results=[])

    profiles = session.exec(
        select(User.id, User.name, ApplicantProfile)
        .join(ApplicantProfile, col(ApplicantProfile.user_id) == col(User.id))
        .where(col(User.id).in_(ids))
    ).all()
    by_id = {applicant_id: (name, profile) for applicant_id, name, profile in profiles}

    videos = session.exec(
        select(Video).where(col(Video.applicant_id).in_(ids)).order_by(col(Video.created_at).desc())
    ).all()
    clips: dict[int, list[Video]] = {}
    for video in videos:
        clips.setdefault(video.applicant_id, []).append(video)
    # Already newest first; a stable sort on the kind lifts the pitch to the front and leaves
    # the extras in that order, so swiping sideways starts on the elevator pitch.
    for owned in clips.values():
        owned.sort(key=lambda video: video.kind != "pitch")

    results = []
    for applicant_id in ids:  # the page keeps the order the database gave it
        name, profile = by_id[applicant_id]
        results.append(ExploreCandidate(
            applicant_id=applicant_id,
            name=name,
            field_of_study=profile.field_of_study,
            university=profile.university,
            year=profile.year,
            gpa=profile.gpa,
            internships=profile.internships,
            skills=split_skills(profile.skills),
            videos=[as_video_out(video) for video in clips.get(applicant_id, [])],
            resume_url=(storage_service.get_url(profile.resume_location, RESUME_TYPE)
                        if profile.resume_location else None),
            resume_name=profile.resume_name,
            resume_size=profile.resume_size,
        ))
    return ExplorePage(total=total, offset=offset, limit=limit, field_of_study=field_of_study, results=results)
