# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
"""Save, load and clear the recruiter's search filter.

GET    /api/filters/me   — load the saved filter (404 if none)
PUT    /api/filters/me   — create or update the saved filter
DELETE /api/filters/me   — clear the saved filter
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import RecruiterFilter, User
from app.schemas.filter import FilterIn, FilterOut
from app.services import vocabulary_service
from app.services.auth_service import get_current_recruiter

router = APIRouter(prefix="/filters", tags=["filters"])


def _canonical(session: Session, kind: str, label: str | None, message: str) -> str | None:
    """The vocabulary's own spelling of a term the recruiter picked.

    Profiles store the canonical label, so a filter has to store it as well or Responsibility 5
    would compare "react" against "React" and find nobody. `create=False`: recruiters search
    the vocabulary, they do not extend it, so a term nobody has is a mistake in the form.
    """
    found = vocabulary_service.resolve(session, kind, label, create=False)
    if label and found is None:
        raise HTTPException(status_code=422, detail=message)
    return found


def _skills_to_csv(skills: list[str]) -> str:
    return ",".join(skills)


def _skills_from_csv(csv: str) -> list[str]:
    return [s for s in csv.split(",") if s] if csv else []


def _to_out(rf: RecruiterFilter) -> FilterOut:
    return FilterOut(
        field_of_study=rf.field_of_study,
        min_year=rf.min_year,
        min_gpa=rf.min_gpa,
        min_internships=rf.min_internships,
        skills=_skills_from_csv(rf.skills),
    )


@router.get("/me", response_model=FilterOut)
def get_my_filter(user: User = Depends(get_current_recruiter),
                  session: Session = Depends(get_session)):
    rf = session.exec(
        select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)
    ).first()
    if rf is None:
        raise HTTPException(status_code=404, detail="No saved filter")
    return _to_out(rf)


@router.put("/me", response_model=FilterOut)
def save_my_filter(body: FilterIn,
                   user: User = Depends(get_current_recruiter),
                   session: Session = Depends(get_session)):
    rf = session.exec(
        select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)
    ).first()
    if rf is None:
        rf = RecruiterFilter(recruiter_id=user.id)
        session.add(rf)
    skills = [_canonical(session, vocabulary_service.SKILL, s, "Select skills from the list")
              for s in body.skills]
    rf.field_of_study = _canonical(session, vocabulary_service.FIELD_OF_STUDY, body.field_of_study,
                                   "Select a field of study from the list")
    rf.min_year = body.min_year
    rf.min_gpa = body.min_gpa
    rf.min_internships = body.min_internships
    rf.skills = _skills_to_csv(list(dict.fromkeys(skills)))
    session.commit()
    session.refresh(rf)
    return _to_out(rf)


@router.delete("/me", status_code=204)
def clear_my_filter(user: User = Depends(get_current_recruiter),
                    session: Session = Depends(get_session)):
    rf = session.exec(
        select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)
    ).first()
    if rf:
        session.delete(rf)
        session.commit()
