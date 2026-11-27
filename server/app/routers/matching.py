# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begum (6638009)
"""Candidate matching and ranked results.

GET /api/matching/results                ranked applicants for the recruiter's current filter
GET /api/matching/results/{applicant_id} one applicant's score, breakdown and rank
GET /api/matching/preview                live counts for the Find candidates form

Each endpoint takes the filter as query parameters (field_of_study, min_year, min_gpa,
min_internships, skills=...). Without them it uses the recruiter's saved filter
(Responsibility 4's recruiterfilter table).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, RecruiterFilter, User, Video
from app.schemas.matching import CurrentFilter, FilterPreview, MatchResult, RankedResults, ScoreParts
from app.routers.profiles import RESUME_TYPE  # "raw": the Cloudinary resource type for PDFs
from app.routers.videos import as_video_out
from app.services import matching_service, storage_service, vocabulary_service
from app.services.auth_service import get_current_recruiter
from app.services.options_service import MAX_SKILLS

router = APIRouter(prefix="/matching", tags=["matching"])

NO_FILTER = "Set your search filters on Find candidates first"


class FilterQuery:
    """The Find candidates form, sent as query parameters. Every value is optional.

    Fields of study and skills are checked against the database vocabulary, which is the same
    list `/api/options` offers the form. They used to be checked against the fixed lists in
    `options_service`, but those are only the seed values now: anything an applicant picks or
    that is read off a resume joins the vocabulary, so a recruiter could be offered a skill
    and then told to "select skills from the list" for choosing it.

    `create=False` keeps the rule that recruiters search the vocabulary and do not extend it,
    and resolving rather than comparing means a filter stores the canonical spelling — which
    is what profiles store, so Responsibility 5 keeps comparing exact strings.
    """

    def __init__(self,
                 field_of_study: str | None = Query(default=None, description="Empty = any field"),
                 min_year: int | None = Query(default=None, ge=1, le=5),
                 min_gpa: float | None = Query(default=None, ge=0, le=4),
                 min_internships: int | None = Query(default=None, ge=0, le=5),
                 skills: list[str] | None = Query(default=None),
                 session: Session = Depends(get_session)):
        if field_of_study:
            field_of_study = vocabulary_service.resolve(
                session, vocabulary_service.FIELD_OF_STUDY, field_of_study, create=False)
            if field_of_study is None:
                raise HTTPException(status_code=422, detail="Select a field of study from the list")
        resolved = [vocabulary_service.resolve(session, vocabulary_service.SKILL, skill, create=False)
                    for skill in (skills or [])]
        if any(skill is None for skill in resolved):
            raise HTTPException(status_code=422, detail="Select skills from the list")
        skills = list(dict.fromkeys(resolved))
        if len(skills) > MAX_SKILLS:
            raise HTTPException(status_code=422, detail=f"Pick up to {MAX_SKILLS} skills")
        self.given = any(value is not None for value in (field_of_study, min_year, min_gpa, min_internships)) or bool(skills)
        self.values = dict(field_of_study=field_of_study or None, min_year=min_year or 1, min_gpa=min_gpa or 0.0,
                           min_internships=min_internships or 0, skills=",".join(skills))

    def as_filter(self, recruiter: User) -> RecruiterFilter:
        # Not added to the session: a one-off filter used only for this request.
        return RecruiterFilter(recruiter_id=recruiter.id, **self.values)


def current_filter(session: Session, recruiter: User, query: FilterQuery | None = None) -> RecruiterFilter:
    if query is not None and query.given:
        return query.as_filter(recruiter)
    recruiter_filter = session.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == recruiter.id)).first()
    if recruiter_filter is None:
        raise HTTPException(status_code=404, detail=NO_FILTER)
    return recruiter_filter


def visible_profiles(session: Session, recruiter: User):
    """Issue #5: a recruiter never sees an applicant who has hidden themselves or blocked
    their company — not in the ranked list, not in the counts the filter form previews."""
    return [p for p in session.exec(select(ApplicantProfile)).all()
            if not p.hidden and not p.blocks(recruiter.company_name)]


def ranked_profiles(session: Session, recruiter_filter: RecruiterFilter, recruiter: User):
    """Full matches best first, then the close matches: (profile, score, missed) triples."""
    return matching_service.rank_with_close(visible_profiles(session, recruiter), recruiter_filter)


def to_result(profile: ApplicantProfile, recruiter_filter: RecruiterFilter, rank: int | None,
              names: dict[int, str], clips: dict[int, list[Video]], missed: list[str] | None = None) -> MatchResult:
    missed = matching_service.missed_requirements(profile, recruiter_filter) if missed is None else missed
    parts = matching_service.score_breakdown(profile, recruiter_filter)
    owned = clips.get(profile.user_id, [])
    # The pitch is first (lookups sorts it there), so it is both the clip the page opens on
    # and the one the four pitch_* fields describe.
    pitch = owned[0] if owned and owned[0].kind == "pitch" else None
    return MatchResult(
        applicant_id=profile.user_id,
        name=names[profile.user_id],
        university=profile.university,
        field_of_study=profile.field_of_study,
        year=profile.year,
        gpa=profile.gpa,
        internships=profile.internships,
        skills=matching_service.split_skills(profile.skills),
        talking_points=[p for p in (profile.talking_points or "").split("\n") if p.strip()],
        matched_skills=parts.matched_skills,
        required_skills_count=len(parts.required_skills),
        match_score=matching_service.match_score(profile, recruiter_filter),
        breakdown=ScoreParts(skills=parts.skills, gpa=parts.gpa, internships=parts.internships),
        # "#N for your search" is for full matches only: a close match is shown, never ranked.
        rank=rank if not missed else None,
        meets_requirements=not missed,
        missed=missed,
        pitch_url=storage_service.get_url(pitch.file_location) if pitch else None,
        pitch_duration=pitch.duration_seconds if pitch else None,
        pitch_title=pitch.title if pitch else None,
        pitch_description=pitch.description if pitch else None,
        videos=[as_video_out(video) for video in owned],
        resume_url=(storage_service.get_url(profile.resume_location, RESUME_TYPE)
                    if profile.resume_location else None),
        resume_name=profile.resume_name,
        resume_size=profile.resume_size,
    )


def lookups(session: Session, user_ids: list[int]) -> tuple[dict[int, str], dict[int, list[Video]]]:
    """Names and every video for a page of results, in two queries.

    All of them, not just the pitch: the ranked feed swipes sideways through a candidate's
    videos the way Explore does, and a request per card would make every swipe wait on the
    network. Newest first, then a stable sort on the kind lifts the pitch to the front, so the
    page opens on the elevator pitch and the extras keep their order behind it.
    """
    if not user_ids:
        return {}, {}
    names = dict(session.exec(select(User.id, User.name).where(User.id.in_(user_ids))).all())
    clips: dict[int, list[Video]] = {}
    for video in session.exec(
            select(Video).where(Video.applicant_id.in_(user_ids)).order_by(Video.created_at.desc())).all():
        clips.setdefault(video.applicant_id, []).append(video)
    for owned in clips.values():
        owned.sort(key=lambda video: video.kind != "pitch")
    return names, clips


@router.get("/results", response_model=RankedResults)
def ranked_results(offset: int = Query(default=0, ge=0), limit: int = Query(default=5, ge=1, le=50),
                   query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
                   session: Session = Depends(get_session)):
    """Load this recruiter's filter and return, best first and a page at a time: everyone who
    meets every must-have (scored with the project formula), then the close matches, who miss
    some must-haves but meet at least one. Each close match says what it misses."""
    recruiter_filter = current_filter(session, user, query)
    ranked = ranked_profiles(session, recruiter_filter, user)
    full_total = sum(1 for _, _, missed in ranked if not missed)
    page = ranked[offset:offset + limit]
    names, clips = lookups(session, [profile.user_id for profile, _, _ in page])
    results = [to_result(profile, recruiter_filter, offset + i + 1, names, clips, missed)
               for i, (profile, _, missed) in enumerate(page)]
    return RankedResults(
        filter=CurrentFilter(field_of_study=recruiter_filter.field_of_study, min_year=recruiter_filter.min_year,
                             min_internships=recruiter_filter.min_internships,
                             skills=matching_service.split_skills(recruiter_filter.skills),
                             min_gpa=recruiter_filter.min_gpa),
        total=len(ranked), full_total=full_total, close_total=len(ranked) - full_total,
        offset=offset, limit=limit, results=results,
    )


@router.get("/results/{applicant_id}", response_model=MatchResult)
def applicant_result(applicant_id: int, query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
                     session: Session = Depends(get_session)):
    """Shown on the candidate profile: the score breakdown and "#N for your search"."""
    recruiter_filter = current_filter(session, user, query)
    profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant_id)).first()
    if profile is None or not profile.details_complete:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    # Issue #5: leaving them out of the list but still scoring them by id would be a way round
    # the setting, so this is the same 404.
    if profile.hidden or profile.blocks(user.company_name):
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    ranked = ranked_profiles(session, recruiter_filter, user)
    rank = next((i + 1 for i, (p, _, missed) in enumerate(ranked) if p.user_id == applicant_id and not missed), None)
    names, clips = lookups(session, [applicant_id])
    return to_result(profile, recruiter_filter, rank, names, clips)


@router.get("/preview", response_model=FilterPreview)
def preview(query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
            session: Session = Depends(get_session)):
    """Live preview on Find candidates: how many complete profiles are left after each must-have."""
    recruiter_filter = query.as_filter(user)
    profiles = [p for p in visible_profiles(session, user) if p.details_complete]
    in_field = [p for p in profiles if not recruiter_filter.field_of_study or p.field_of_study == recruiter_filter.field_of_study]
    in_year = [p for p in in_field if p.year >= recruiter_filter.min_year]
    passing = [p for p in in_year if matching_service.passes_hard_filters(p, recruiter_filter)]
    return FilterPreview(total=len(profiles), field=len(in_field), field_and_year=len(in_year), passing=len(passing))
