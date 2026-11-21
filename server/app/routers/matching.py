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
from app.services import matching_service, storage_service
from app.services.auth_service import get_current_recruiter
from app.services.options_service import FIELDS_OF_STUDY, MAX_SKILLS, SKILLS

router = APIRouter(prefix="/matching", tags=["matching"])

NO_FILTER = "Set your search filters on Find candidates first"


class FilterQuery:
    """The Find candidates form, sent as query parameters. Every value is optional."""

    def __init__(self,
                 field_of_study: str | None = Query(default=None, description="Empty = any field"),
                 min_year: int | None = Query(default=None, ge=1, le=5),
                 min_gpa: float | None = Query(default=None, ge=0, le=4),
                 min_internships: int | None = Query(default=None, ge=0, le=5),
                 skills: list[str] | None = Query(default=None)):
        if field_of_study and field_of_study not in FIELDS_OF_STUDY:
            raise HTTPException(status_code=422, detail="Select a field of study from the list")
        skills = list(dict.fromkeys(skills or []))
        if any(skill not in SKILLS for skill in skills):
            raise HTTPException(status_code=422, detail="Select skills from the list")
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


def ranked_profiles(session: Session, recruiter_filter: RecruiterFilter):
    profiles = session.exec(select(ApplicantProfile)).all()
    return matching_service.rank(profiles, recruiter_filter)


def to_result(profile: ApplicantProfile, recruiter_filter: RecruiterFilter, rank: int | None,
              names: dict[int, str], pitches: dict[int, Video]) -> MatchResult:
    parts = matching_service.score_breakdown(profile, recruiter_filter)
    pitch = pitches.get(profile.user_id)
    return MatchResult(
        applicant_id=profile.user_id,
        name=names[profile.user_id],
        university=profile.university,
        field_of_study=profile.field_of_study,
        year=profile.year,
        gpa=profile.gpa,
        internships=profile.internships,
        skills=matching_service.split_skills(profile.skills),
        matched_skills=parts.matched_skills,
        required_skills_count=len(parts.required_skills),
        match_score=matching_service.match_score(profile, recruiter_filter),
        breakdown=ScoreParts(skills=parts.skills, gpa=parts.gpa, internships=parts.internships),
        rank=rank,
        meets_requirements=rank is not None,
        pitch_url=storage_service.get_url(pitch.file_location) if pitch else None,
        pitch_duration=pitch.duration_seconds if pitch else None,
    )


def lookups(session: Session, user_ids: list[int]) -> tuple[dict[int, str], dict[int, Video]]:
    """Names and pitch videos for a page of results, in two queries."""
    if not user_ids:
        return {}, {}
    names = dict(session.exec(select(User.id, User.name).where(User.id.in_(user_ids))).all())
    pitches = {v.applicant_id: v for v in session.exec(
        select(Video).where(Video.kind == "pitch", Video.applicant_id.in_(user_ids))).all()}
    return names, pitches


@router.get("/results", response_model=RankedResults)
def ranked_results(offset: int = Query(default=0, ge=0), limit: int = Query(default=5, ge=1, le=50),
                   query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
                   session: Session = Depends(get_session)):
    """Load this recruiter's filter, drop applicants who fail a hard filter, score the rest
    with the project formula and return them best first, one page at a time."""
    recruiter_filter = current_filter(session, user, query)
    ranked = ranked_profiles(session, recruiter_filter)
    page = ranked[offset:offset + limit]
    names, pitches = lookups(session, [profile.user_id for profile, _ in page])
    results = [to_result(profile, recruiter_filter, offset + i + 1, names, pitches)
               for i, (profile, _) in enumerate(page)]
    return RankedResults(
        filter=CurrentFilter(field_of_study=recruiter_filter.field_of_study, min_year=recruiter_filter.min_year,
                             min_internships=recruiter_filter.min_internships,
                             skills=matching_service.split_skills(recruiter_filter.skills),
                             min_gpa=recruiter_filter.min_gpa),
        total=len(ranked), offset=offset, limit=limit, results=results,
    )


@router.get("/results/{applicant_id}", response_model=MatchResult)
def applicant_result(applicant_id: int, query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
                     session: Session = Depends(get_session)):
    """Shown on the candidate profile: the score breakdown and "#N for your search"."""
    recruiter_filter = current_filter(session, user, query)
    profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant_id)).first()
    if profile is None or not profile.details_complete:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    ranked = ranked_profiles(session, recruiter_filter)
    rank = next((i + 1 for i, (p, _) in enumerate(ranked) if p.user_id == applicant_id), None)
    names, pitches = lookups(session, [applicant_id])
    return to_result(profile, recruiter_filter, rank, names, pitches)


@router.get("/preview", response_model=FilterPreview)
def preview(query: FilterQuery = Depends(), user: User = Depends(get_current_recruiter),
            session: Session = Depends(get_session)):
    """Live preview on Find candidates: how many complete profiles are left after each must-have."""
    recruiter_filter = query.as_filter(user)
    profiles = [p for p in session.exec(select(ApplicantProfile)).all() if p.details_complete]
    in_field = [p for p in profiles if not recruiter_filter.field_of_study or p.field_of_study == recruiter_filter.field_of_study]
    in_year = [p for p in in_field if p.year >= recruiter_filter.min_year]
    passing = [p for p in in_year if matching_service.passes_hard_filters(p, recruiter_filter)]
    return FilterPreview(total=len(profiles), field=len(in_field), field_and_year=len(in_year), passing=len(passing))
