# Responsibility 6 — Aye Myo Myat (6837919)
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, Bookmark, Invitation, RecruiterFilter, SavedSearch, User, Video
from app.schemas.filter import FilterOut
from app.schemas.saved import BookmarkIn, BookmarkOut, SavedSearchIn, SavedSearchOut
from app.services.auth_service import get_current_recruiter
from app.services.matching_service import match_score, passes_hard_filters, split_skills
from app.services.storage_service import get_url

router = APIRouter(prefix='/saved', tags=['saved'])


def search_out(item, profiles):
    # Reuse Responsibility 5's hard-filter logic; do not invent a count.
    return SavedSearchOut(**{**item.model_dump(), 'skills': split_skills(item.skills)},
                          match_count=sum(passes_hard_filters(profile, item) for profile in profiles))


def bookmark_out(item, session):
    applicant = session.get(User, item.applicant_id)
    profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == item.applicant_id)).first()
    current = session.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == item.recruiter_id)).first()
    pitch = session.exec(select(Video).where(Video.applicant_id == item.applicant_id, Video.kind == 'pitch')).first()
    invitation = session.exec(select(Invitation).where(Invitation.recruiter_id == item.recruiter_id,
                                                       Invitation.applicant_id == item.applicant_id)).first()
    skills = split_skills(profile.skills) if profile else []
    required = split_skills(current.skills) if current else []
    return BookmarkOut(**item.model_dump(), name=applicant.name,
                       field_of_study=profile.field_of_study if profile else None,
                       year=profile.year if profile else None,
                       gpa=profile.gpa if profile else None,
                       internships=profile.internships if profile else None,
                       skills=skills, matched_skills=[skill for skill in required if skill in skills],
                       required_skills_count=len(required),
                       match_score=match_score(profile, current) if profile and current else None,
                       meets_requirements=passes_hard_filters(profile, current) if profile and current else None,
                       pitch_url=get_url(pitch.file_location) if pitch else None,
                       pitch_duration=pitch.duration_seconds if pitch else None,
                       invited=invitation is not None)


def owned(model, item_id, user, session):
    item = session.get(model, item_id)
    if item is None or item.recruiter_id != user.id:
        raise HTTPException(status_code=404, detail='Saved item not found')
    return item


@router.get('/searches', response_model=list[SavedSearchOut])
def list_saved_searches(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    profiles = session.exec(select(ApplicantProfile)).all()
    return [search_out(item, profiles) for item in session.exec(select(SavedSearch).where(
        SavedSearch.recruiter_id == user.id).order_by(SavedSearch.id.desc())).all()]


@router.post('/searches', response_model=SavedSearchOut, status_code=201)
def create_saved_search(body: SavedSearchIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    item = SavedSearch(**{**body.model_dump(), 'skills': ','.join(body.skills)}, recruiter_id=user.id)
    session.add(item)
    session.commit()
    session.refresh(item)
    return search_out(item, session.exec(select(ApplicantProfile)).all())


@router.delete('/searches/{search_id}', status_code=204)
def delete_saved_search(search_id: int, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    session.delete(owned(SavedSearch, search_id, user, session))
    session.commit()


@router.post('/searches/{search_id}/run', response_model=FilterOut)
def run_saved_search(search_id: int, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    session.exec(select(User).where(User.id == user.id).with_for_update()).one()
    saved = owned(SavedSearch, search_id, user, session)
    current = session.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)).first()
    if current is None:
        current = RecruiterFilter(recruiter_id=user.id)
    for field in ('field_of_study', 'min_year', 'min_internships', 'skills', 'min_gpa'):
        setattr(current, field, getattr(saved, field))
    session.add(current)
    session.commit()
    session.refresh(current)
    return FilterOut(**{**current.model_dump(), 'skills': split_skills(current.skills)})


@router.get('/current-filter', response_model=FilterOut)
def current_filter(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    current = session.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)).first()
    if current is None:
        raise HTTPException(status_code=404, detail='Set your search filters on Find candidates first')
    return FilterOut(**{**current.model_dump(), 'skills': split_skills(current.skills)})


@router.get('/bookmarks', response_model=list[BookmarkOut])
def list_bookmarks(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    return [bookmark_out(item, session) for item in session.exec(select(Bookmark).where(
        Bookmark.recruiter_id == user.id).order_by(Bookmark.id.desc())).all()]


@router.post('/bookmarks', response_model=BookmarkOut, status_code=201)
def create_bookmark(body: BookmarkIn, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    # Serialize duplicate bookmark attempts for this recruiter on MySQL.
    session.exec(select(User).where(User.id == user.id).with_for_update()).one()
    applicant = session.get(User, body.applicant_id)
    if applicant is None or applicant.role != 'applicant':
        raise HTTPException(status_code=404, detail='Applicant not found')
    item = session.exec(select(Bookmark).where(Bookmark.recruiter_id == user.id,
                                             Bookmark.applicant_id == body.applicant_id).with_for_update()).first()
    if item is None:
        item = Bookmark(recruiter_id=user.id, applicant_id=body.applicant_id)
        session.add(item)
        session.commit()
        session.refresh(item)
    return bookmark_out(item, session)


@router.delete('/bookmarks/{bookmark_id}', status_code=204)
def delete_bookmark(bookmark_id: int, user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    session.delete(owned(Bookmark, bookmark_id, user, session))
    session.commit()
