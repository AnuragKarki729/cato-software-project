# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begum (6638009)
"""Candidate matching and ranked results.

GET /api/matching/results                ranked applicants for the recruiter's current filter
GET /api/matching/results/{applicant_id} one applicant's score, breakdown and rank
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, RecruiterFilter, User, Video
from app.schemas.matching import CurrentFilter, MatchResult, RankedResults, ScoreParts
from app.services import matching_service, storage_service
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/matching", tags=["matching"])

NO_FILTER = "Set your search filters on Find candidates first"


def current_filter(session: Session, recruiter: User) -> RecruiterFilter:
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
                   user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    """Load this recruiter's filter, drop applicants who fail a hard filter, score the rest
    with the project formula and return them best first, one page at a time."""
    recruiter_filter = current_filter(session, user)
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
def applicant_result(applicant_id: int, user: User = Depends(get_current_recruiter),
                     session: Session = Depends(get_session)):
    """Shown on the candidate profile: the score breakdown and "#N for your search"."""
    recruiter_filter = current_filter(session, user)
    profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant_id)).first()
    if profile is None or not profile.details_complete:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    ranked = ranked_profiles(session, recruiter_filter)
    rank = next((i + 1 for i, (p, _) in enumerate(ranked) if p.user_id == applicant_id), None)
    names, pitches = lookups(session, [applicant_id])
    return to_result(profile, recruiter_filter, rank, names, pitches)
